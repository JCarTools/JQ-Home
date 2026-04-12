'use strict';

// ── Климат: пресеты ────────────────────────────────────────
// Пресет = { id, name, emoji, values: { [climateId]: level } }
// level: 0 = выкл, 1-3 = уровень

const PRESET_EMOJIS = ['❄️','🔥','🌬️','☀️','🌙','🌧️','⛄','🏖️','🚗','💨'];

const DEFAULT_PRESETS = [
  {
    id: 'preset-winter',
    name: 'Зима',
    emoji: '❄️',
    values: { 'cl-seat-l': 2, 'cl-seat-r': 0, 'cl-wind': 1, 'cl-vent-l': 0, 'cl-vent-r': 0, 'cl-rear': 1, 'cl-wheel': 1 }
  },
  {
    id: 'preset-summer',
    name: 'Лето',
    emoji: '🏖️',
    values: { 'cl-seat-l': 0, 'cl-seat-r': 0, 'cl-wind': 0, 'cl-vent-l': 2, 'cl-vent-r': 0, 'cl-rear': 0, 'cl-wheel': 0 }
  },
  {
    id: 'preset-off',
    name: 'Выкл всё',
    emoji: '💨',
    values: {}
  },
];

function getPresets() {
  return loadLS('climate_presets') || DEFAULT_PRESETS;
}

function savePresets(presets) {
  saveLS('climate_presets', presets);
}

// Применить пресет — отправить команды и обновить UI карточки
function applyPreset(preset) {
  // Сначала сбрасываем всё
  ALL_CLIMATE.forEach(item => {
    if (item.off) run(item.off);
  });

  // Применяем значения пресета
  const vals = preset.values || {};
  Object.entries(vals).forEach(([id, level]) => {
    if (!level) return;
    const item = ALL_CLIMATE.find(c => c.id === id);
    if (!item) return;
    const cmd = item.max > 1 ? `${item.on}_${level}` : item.on;
    run(cmd);
  });

  // Обновляем climateState и UI кнопок
  document.querySelectorAll('.cl-btn').forEach(btn => {
    const id = btn.id;
    const level = vals[id] || 0;
    climateState[id] = level;
    btn.querySelectorAll('.cl-dot').forEach(d => d.classList.toggle('on', parseInt(d.dataset.lv) <= level));
    btn.classList.toggle('active', level > 0);
  });

  Sounds.play('select');
  showPresetToast(preset);
}

function showPresetToast(preset) {
  const existing = document.getElementById('preset-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'preset-toast';
  toast.className = 'preset-toast';
  toast.innerHTML = `<span class="preset-toast-emoji">${preset.emoji}</span><span>Пресет <b>${preset.name}</b> применён</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 350);
  }, 2200);
}

// ── Рендер полоски пресетов в карточке климата ─────────────
function renderPresetStrip() {
  const strip = el('climate-preset-strip');
  if (!strip) return;
  const presets = getPresets();
  strip.innerHTML = '';

  presets.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-chip';
    btn.dataset.id = preset.id;
    btn.innerHTML = `<span class="preset-chip-emoji">${preset.emoji}</span><span class="preset-chip-name">${preset.name}</span>`;
    btn.addEventListener('click', () => { applyPreset(preset); Sounds.play('tap'); });

    // Долгий тап = контекстное меню (редактировать / удалить)
    let pressTimer = null;
    const startPress = () => { pressTimer = setTimeout(() => { navigator.vibrate?.(40); showPresetContextMenu(btn, preset); }, 600); };
    const cancelPress = () => clearTimeout(pressTimer);
    btn.addEventListener('touchstart',  startPress, { passive: true });
    btn.addEventListener('touchend',    cancelPress);
    btn.addEventListener('touchcancel', cancelPress);
    btn.addEventListener('mousedown',   startPress);
    btn.addEventListener('mouseup',     cancelPress);
    btn.addEventListener('mouseleave',  cancelPress);

    strip.appendChild(btn);
  });

  // Кнопка добавить
  const addBtn = document.createElement('button');
  addBtn.className = 'preset-chip preset-chip-add';
  addBtn.innerHTML = `<span style="font-size:20px;line-height:1">＋</span>`;
  addBtn.addEventListener('click', () => openPresetEditor(null));
  strip.appendChild(addBtn);
}

function showPresetContextMenu(chipEl, preset) {
  Sounds.play('select');
  const existing = document.getElementById('preset-ctx-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'preset-ctx-menu';
  menu.className = 'preset-ctx-menu';

  const rect = chipEl.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.bottom + 8) + 'px';

  menu.innerHTML = `
    <div class="preset-ctx-title">${preset.emoji} ${preset.name}</div>
    <button class="preset-ctx-btn" data-action="edit">✏️ Редактировать</button>
    <button class="preset-ctx-btn preset-ctx-btn-danger" data-action="delete">🗑️ Удалить</button>
  `;
  document.body.appendChild(menu);
  requestAnimationFrame(() => menu.classList.add('visible'));

  function closeMenu() { menu.classList.remove('visible'); setTimeout(() => menu.remove(), 200); Sounds.play('close'); }

  menu.querySelector('[data-action="edit"]').addEventListener('click', () => { closeMenu(); openPresetEditor(preset); });
  menu.querySelector('[data-action="delete"]').addEventListener('click', () => { closeMenu(); confirmDeletePreset(preset); });
  setTimeout(() => document.addEventListener('pointerdown', e => { if (!menu.contains(e.target)) closeMenu(); }, { once: true }), 50);
}

// ── Редактор пресета ───────────────────────────────────────
let editingPreset = null; // null = новый, иначе объект пресета

function openPresetEditor(preset) {
  Sounds.play('open');
  editingPreset = preset ? JSON.parse(JSON.stringify(preset)) : {
    id: 'preset-' + Date.now(),
    name: '',
    emoji: '🔥',
    values: {}
  };

  // Заполняем поля
  el('preset-editor-name').value = editingPreset.name;
  renderEmojiPicker();
  renderPresetEditorControls();
  el('preset-editor-delete').style.display = preset ? '' : 'none';
  el('preset-editor-title').textContent = preset ? 'Редактировать пресет' : 'Новый пресет';
  el('preset-editor').classList.add('open');
}

function renderEmojiPicker() {
  const picker = el('preset-emoji-picker');
  picker.innerHTML = '';
  PRESET_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn' + (editingPreset.emoji === emoji ? ' active' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      editingPreset.emoji = emoji;
      picker.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('active', b.textContent === emoji));
      Sounds.play('tap');
    });
    picker.appendChild(btn);
  });
}

function renderPresetEditorControls() {
  const grid = el('preset-editor-controls');
  grid.innerHTML = '';

  ALL_CLIMATE.forEach(item => {
    const currentLevel = editingPreset.values[item.id] || 0;

    const row = document.createElement('div');
    row.className = 'preset-ctrl-row';

    const icon = document.createElement('div');
    icon.className = 'preset-ctrl-icon';
    icon.innerHTML = `<img src="${item.icon}">`;

    const label = document.createElement('div');
    label.className = 'preset-ctrl-label';
    label.textContent = item.label.replace(/\n/g, ' ');

    const levels = document.createElement('div');
    levels.className = 'preset-ctrl-levels';

    // Кнопка "выкл"
    const offBtn = document.createElement('button');
    offBtn.className = 'preset-lvl-btn' + (currentLevel === 0 ? ' active' : '');
    offBtn.textContent = 'Выкл';
    offBtn.addEventListener('click', () => {
      editingPreset.values[item.id] = 0;
      updateLevelButtons(levels, 0, item.max);
      Sounds.play('tap');
    });
    levels.appendChild(offBtn);

    // Кнопки уровней
    for (let i = 1; i <= item.max; i++) {
      const lvlBtn = document.createElement('button');
      lvlBtn.className = 'preset-lvl-btn' + (currentLevel === i ? ' active' : '');
      lvlBtn.dataset.lv = i;
      lvlBtn.textContent = item.max > 1 ? i : 'Вкл';
      lvlBtn.addEventListener('click', () => {
        editingPreset.values[item.id] = i;
        updateLevelButtons(levels, i, item.max);
        Sounds.play('tap');
      });
      levels.appendChild(lvlBtn);
    }

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(levels);
    grid.appendChild(row);
  });
}

function updateLevelButtons(container, activeLevel, max) {
  container.querySelectorAll('.preset-lvl-btn').forEach(btn => {
    const lv = btn.dataset.lv ? parseInt(btn.dataset.lv) : 0;
    btn.classList.toggle('active', lv === activeLevel);
  });
}

function savePresetFromEditor() {
  const name = el('preset-editor-name').value.trim();
  if (!name) {
    el('preset-editor-name').focus();
    el('preset-editor-name').classList.add('input-error');
    setTimeout(() => el('preset-editor-name').classList.remove('input-error'), 800);
    return;
  }
  editingPreset.name = name;

  const presets = getPresets();
  const idx = presets.findIndex(p => p.id === editingPreset.id);
  if (idx >= 0) presets[idx] = editingPreset;
  else presets.push(editingPreset);

  savePresets(presets);
  renderPresetStrip();
  closePresetEditor();
  Sounds.play('drop');
}

function deletePresetFromEditor() {
  if (!editingPreset) return;
  const presets = getPresets().filter(p => p.id !== editingPreset.id);
  savePresets(presets);
  renderPresetStrip();
  closePresetEditor();
  Sounds.play('close');
}

function closePresetEditor() {
  Sounds.play('close');
  el('preset-editor').classList.remove('open');
  editingPreset = null;
}

// Долгий тап на чипе = контекстное меню
function confirmDeletePreset(preset) {
  Sounds.play('open');
  const overlay = document.createElement('div');
  overlay.className = 'preset-confirm-overlay';
  overlay.innerHTML = `
    <div class="preset-confirm-box">
      <div class="preset-confirm-emoji">${preset.emoji}</div>
      <div class="preset-confirm-text">Удалить пресет<br><b>${preset.name}</b>?</div>
      <div class="preset-confirm-btns">
        <button class="preset-confirm-cancel">Отмена</button>
        <button class="preset-confirm-ok">Удалить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  overlay.querySelector('.preset-confirm-cancel').addEventListener('click', () => {
    Sounds.play('close');
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
  });
  overlay.querySelector('.preset-confirm-ok').addEventListener('click', () => {
    const presets = getPresets().filter(p => p.id !== preset.id);
    savePresets(presets);
    renderPresetStrip();
    Sounds.play('close');
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
  });
  overlay.addEventListener('pointerdown', e => {
    if (e.target === overlay) overlay.querySelector('.preset-confirm-cancel').click();
  });
}

// ── Init ───────────────────────────────────────────────────
el('preset-editor-save')?.addEventListener('click', savePresetFromEditor);
el('preset-editor-delete')?.addEventListener('click', deletePresetFromEditor);
el('preset-editor-close')?.addEventListener('click', closePresetEditor);

renderPresetStrip();

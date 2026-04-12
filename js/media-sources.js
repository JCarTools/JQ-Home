'use strict';

// ── Медиа-источники ────────────────────────────────────────
// Источники определяются по package из musicInfo
// Кастомные источники можно добавить через редактор

const DEFAULT_SOURCES = [
  { id: 'src-bt',     label: 'Bluetooth', icon: '🎵', pkg: 'com.android.bluetooth',        color: '#0055b3' },
  { id: 'src-radio',  label: 'Радио',     icon: '📻', pkg: 'com.desaysv.radio',             color: '#b02020' },
  { id: 'src-usb',    label: 'USB',       icon: '💿', pkg: 'com.desaysv.usbplayer',         color: '#1c7c3a' },
  { id: 'src-ymusic', label: 'Яндекс',   icon: '🎧', pkg: 'ru.yandex.music',               color: '#c45f00' },
  { id: 'src-vk',     label: 'VK Music',  icon: '🎶', pkg: 'com.vkontakte.android',         color: '#0077ff' },
  { id: 'src-spotify',label: 'Spotify',   icon: '🟢', pkg: 'com.spotify.music',             color: '#1db954' },
];

function getSources() {
  return loadLS('media_sources') || DEFAULT_SOURCES;
}
function saveSources(list) {
  saveLS('media_sources', list);
}

// Текущий активный источник (определяется по package из musicInfo)
let currentSourcePkg = '';

window._setMediaSourcePkg = function(pkg) {
  currentSourcePkg = pkg || '';
  renderMediaCard();
};

// ── Рендер карточки ───────────────────────────────────────
function renderMediaCard() {
  const grid = document.querySelector('#card-media .media-grid');
  if (!grid) return;
  const sources = getSources();
  grid.innerHTML = '';

  sources.forEach(src => {
    const btn = document.createElement('div');
    const isActive = currentSourcePkg && src.pkg && currentSourcePkg.includes(src.pkg.split('.').pop());
    btn.className = 'media-src-btn' + (isActive ? ' active' : '');
    btn.innerHTML = `
      <div class="media-src-icon" style="background:${src.color}">${src.icon}</div>
      <div class="media-src-label">${src.label}</div>
      ${isActive ? '<div class="media-src-playing">▶</div>' : ''}`;
    btn.addEventListener('click', () => {
      Sounds.play('tap');
      runApp(src.pkg);
    });
    // Долгий тап = редактировать
    let t = null;
    btn.addEventListener('touchstart', () => { t = setTimeout(() => openSourceEditor(src), 600); }, { passive: true });
    btn.addEventListener('touchend',   () => clearTimeout(t));
    btn.addEventListener('mousedown',  () => { t = setTimeout(() => openSourceEditor(src), 600); });
    btn.addEventListener('mouseup',    () => clearTimeout(t));
    btn.addEventListener('mouseleave', () => clearTimeout(t));
    grid.appendChild(btn);
  });

  // Кнопка добавить
  const addBtn = document.createElement('div');
  addBtn.className = 'media-src-btn media-src-add';
  addBtn.innerHTML = `<div class="media-src-icon" style="background:var(--btn-border)">＋</div><div class="media-src-label">Добавить</div>`;
  addBtn.addEventListener('click', () => openSourceEditor(null));
  grid.appendChild(addBtn);
}

// ── Редактор источника ────────────────────────────────────
function openSourceEditor(src) {
  Sounds.play('open');
  const isNew = !src;
  const overlay = document.createElement('div');
  overlay.className = 'contact-editor-overlay'; // переиспользуем стиль

  overlay.innerHTML = `
    <div class="contact-editor-box">
      <div class="contact-editor-header">
        <span class="contact-editor-title">${isNew ? 'Новый источник' : 'Редактировать'}</span>
        <button class="drawer-close contact-editor-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="contact-editor-fields">
        <input class="contact-input" id="se-label" type="text" placeholder="Название (напр. Радио)" value="${src?.label || ''}" maxlength="16">
        <input class="contact-input" id="se-pkg"   type="text" placeholder="Package (напр. com.app.name)" value="${src?.pkg || ''}">
        <input class="contact-input" id="se-icon"  type="text" placeholder="Эмодзи иконка" value="${src?.icon || '🎵'}" maxlength="4">
      </div>
      <div class="contact-editor-footer">
        ${!isNew ? '<button class="contact-btn-delete">Удалить</button>' : ''}
        <button class="contact-btn-save">Сохранить</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
    Sounds.play('close');
  }

  overlay.querySelector('.contact-editor-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('.contact-btn-save').addEventListener('click', () => {
    const label = overlay.querySelector('#se-label').value.trim();
    const pkg   = overlay.querySelector('#se-pkg').value.trim();
    const icon  = overlay.querySelector('#se-icon').value.trim() || '🎵';
    if (!label || !pkg) return;

    const sources = getSources();
    if (isNew) {
      sources.push({ id: 'src-' + Date.now(), label, pkg, icon, color: '#555' });
    } else {
      const idx = sources.findIndex(s => s.id === src.id);
      if (idx >= 0) sources[idx] = { ...sources[idx], label, pkg, icon };
    }
    saveSources(sources);
    renderMediaCard();
    close();
    Sounds.play('drop');
  });

  overlay.querySelector('.contact-btn-delete')?.addEventListener('click', () => {
    const sources = getSources().filter(s => s.id !== src.id);
    saveSources(sources);
    renderMediaCard();
    close();
  });
}

// ── Init ──────────────────────────────────────────────────
renderMediaCard();

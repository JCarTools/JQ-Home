'use strict';

// ── Все доступные функции климата ──────────────────────────
const ALL_CLIMATE = [
  { id: 'cl-seat-l',   label: 'Подогрев\nводителя',       icon: 'icons/Seat heated_left.svg',         on: 'heat_seat_l',       off: 'heat_seat_l_0',        max: 3 },
  { id: 'cl-seat-r',   label: 'Подогрев\nпассажира',      icon: 'icons/Seat heated_right.svg',        on: 'heat_seat_r',       off: 'heat_seat_r_0',        max: 3 },
  { id: 'cl-wind',     label: 'Обогрев\nлобового',        icon: 'icons/Windshield defroster.svg',     on: 'heat_windshield_on',off: 'heat_windshield_off',  max: 1 },
  { id: 'cl-vent-l',   label: 'Вентиляция\nводителя',     icon: 'icons/Seat vent_left.svg',           on: 'vent_seat_l',       off: 'vent_seat_l_0',        max: 3 },
  { id: 'cl-vent-r',   label: 'Вентиляция\nпассажира',    icon: 'icons/Seat vent_right.svg',          on: 'vent_seat_r',       off: 'vent_seat_r_0',        max: 3 },
  { id: 'cl-rear',     label: 'Обогрев\nзаднего',         icon: 'icons/Rare windshield defroster.svg',on: 'heat_rearwindow_on',off: 'heat_rearwindow_off',  max: 1 },
  { id: 'cl-wheel',    label: 'Подогрев\nруля',           icon: 'icons/Steering wheel heat.svg',      on: 'heat_wheel_on',     off: 'heat_wheel_off',       max: 1 },
  { id: 'cl-zad-l',    label: 'Обогрев\nзад. лево',       icon: 'icons/Seat heated_left.svg',         on: 'heat_zad_seat_l',   off: 'heat_zad_seat_l_0',    max: 3 },
  { id: 'cl-zad-r',    label: 'Обогрев\nзад. право',      icon: 'icons/Seat heated_right.svg',        on: 'heat_zad_seat_r',   off: 'heat_zad_seat_r_off',  max: 3 },
  { id: 'cl-driver1',  label: 'Память\nводитель 1',       icon: 'icons/Driver.svg',                   on: 'voditel_seat_1',    off: '',                     max: 1 },
  { id: 'cl-driver2',  label: 'Память\nводитель 2',       icon: 'icons/Driver.svg',                   on: 'voditel_seat_2',    off: '',                     max: 1 },
  { id: 'cl-driver3',  label: 'Память\nводитель 3',       icon: 'icons/Driver.svg',                   on: 'voditel_seat_3',    off: '',                     max: 1 },
];

// Дефолтный набор (первые 6)
const DEFAULT_CLIMATE = ['cl-seat-l','cl-seat-r','cl-wind','cl-vent-l','cl-vent-r','cl-rear'];
const MAX_CLIMATE = 6;

// ── Все доступные приложения карточки ──────────────────────
const ALL_APPS = [
  { id: 'app-phone',  label: 'Телефон',    icon: 'icons/Phone.svg',  pkg: 'com.desaysv.bluetooth.phone', color: '#1c7c3a' },
  { id: 'app-navi',   label: 'Навигатор',  icon: 'icons/Navi.svg',   pkg: 'ru.yandex.yandexnavi',        color: '#c45f00' },
  { id: 'app-music',  label: 'Музыка',     icon: 'icons/Music.svg',  pkg: 'ru.yandex.music',             color: '#b02020' },
  { id: 'app-camera', label: 'Камера',     icon: 'icons/Camera.svg', pkg: 'com.lion.gallery',            color: '#0055b3' },
];
const DEFAULT_APPS = ['app-phone','app-navi','app-music','app-camera'];
const MAX_APPS = 4;

// ── Загрузка/сохранение конфигов ───────────────────────────
function getClimateConfig() { return loadLS('climate_config') || DEFAULT_CLIMATE; }
function saveClimateConfig(ids) { saveLS('climate_config', ids); }
function getAppsConfig() { return loadLS('apps_config') || DEFAULT_APPS; }
function saveAppsConfig(ids) { saveLS('apps_config', ids); }

// ── Рендер карточки климата ────────────────────────────────
function renderClimateCard() {
  const grid = document.querySelector('#card-climate .climate-grid');
  const selected = getClimateConfig();
  grid.innerHTML = '';
  selected.forEach(id => {
    const item = ALL_CLIMATE.find(c => c.id === id);
    if (!item) return;
    const dots = item.max > 1
      ? Array.from({length: item.max}, (_, i) => `<div class="cl-dot" data-lv="${i+1}"></div>`).join('')
      : '<div class="cl-dot" data-lv="1"></div>';
    const btn = document.createElement('div');
    btn.className = 'cl-btn';
    btn.id = item.id;
    btn.dataset.on  = item.on;
    btn.dataset.off = item.off;
    btn.dataset.max = item.max;
    btn.innerHTML = `
      <div class="cl-icon"><img src="${item.icon}"></div>
      <div class="cl-label">${item.label.replace(/\n/g, '<br>')}</div>
      <div class="cl-dots">${dots}</div>`;
    grid.appendChild(btn);
  });
  // Переподключаем обработчики климата
  if (typeof rebindClimate === 'function') rebindClimate();
}

// ── Рендер карточки приложений ─────────────────────────────
function renderAppsCard() {
  const grid = document.querySelector('#card-apps .apps-grid');
  const selected = getAppsConfig();
  grid.innerHTML = '';
  selected.forEach(id => {
    const item = ALL_APPS.find(a => a.id === id);
    if (!item) return;
    const btn = document.createElement('div');
    btn.className = 'app-btn';
    btn.dataset.pkg = item.pkg;
    btn.innerHTML = `
      <div class="app-icon" style="background:${item.color}"><img src="${item.icon}"></div>
      <div class="app-name">${item.label}</div>`;
    grid.appendChild(btn);
  });
  // Переподключаем обработчики приложений
  if (typeof rebindApps === 'function') rebindApps();
}

// ── Шторка климата ─────────────────────────────────────────
function openClimateEditor() {
  Sounds.play('open');
  const drawer = el('climate-editor');
  const grid   = el('climate-all-grid');
  const selected = getClimateConfig();
  grid.innerHTML = '';

  ALL_CLIMATE.forEach(item => {
    const isSelected = selected.includes(item.id);
    const div = document.createElement('div');
    div.className = 'editor-item' + (isSelected ? ' selected' : '');
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="editor-item-icon"><img src="${item.icon}"></div>
      <div class="editor-item-label">${item.label.replace(/\n/g, '<br>')}</div>
      ${item.max > 1 ? `<div class="editor-item-badge">${item.max} ур.</div>` : ''}`;

    div.addEventListener('click', () => {
      const cur = getClimateConfig();
      if (div.classList.contains('selected')) {
        const next = cur.filter(i => i !== item.id);
        saveClimateConfig(next);
        div.classList.remove('selected');
      } else {
        if (cur.length >= MAX_CLIMATE) return;
        const next = [...cur, item.id];
        saveClimateConfig(next);
        div.classList.add('selected');
      }
      // Блокируем лишние если достигли лимита
      updateClimateEditorLimits();
      renderClimateCard();
      Sounds.play('tap');
    });
    grid.appendChild(div);
  });

  updateClimateEditorLimits();
  drawer.classList.add('open');
}

function updateClimateEditorLimits() {
  const cur = getClimateConfig();
  el('climate-all-grid').querySelectorAll('.editor-item').forEach(div => {
    const isSelected = cur.includes(div.dataset.id);
    div.classList.toggle('disabled', !isSelected && cur.length >= MAX_CLIMATE);
  });
}

el('btn-edit-climate').addEventListener('click', openClimateEditor);
el('climate-editor-close').addEventListener('click', () => { Sounds.play('close'); el('climate-editor').classList.remove('open'); });

// ── Шторка приложений ──────────────────────────────────────
function openAppsEditor() {
  Sounds.play('open');
  const drawer = el('apps-editor');
  const grid   = el('apps-editor-grid');
  const selected = getAppsConfig();
  grid.innerHTML = '';

  ALL_APPS.forEach(item => {
    const isSelected = selected.includes(item.id);
    const btn = document.createElement('div');
    btn.className = 'app-btn' + (isSelected ? ' app-editor-selected' : '');
    btn.dataset.id = item.id;
    btn.innerHTML = `
      <div class="app-icon" style="background:${item.color}"><img src="${item.icon}"></div>
      <div class="app-name">${item.label}${item.beta ? ' <span style="font-size:10px;color:var(--accent);vertical-align:super">β</span>' : ''}</div>`;

    btn.addEventListener('click', () => {
      const cur = getAppsConfig();
      if (cur.includes(item.id)) {
        saveAppsConfig(cur.filter(i => i !== item.id));
        btn.classList.remove('app-editor-selected');
      } else {
        if (cur.length >= MAX_APPS) return;
        saveAppsConfig([...cur, item.id]);
        btn.classList.add('app-editor-selected');
      }
      renderAppsCard();
      Sounds.play('tap');
    });
    grid.appendChild(btn);
  });

  drawer.classList.add('open');
}

el('btn-edit-apps').addEventListener('click', openAppsEditor);
el('apps-editor-close').addEventListener('click', () => { Sounds.play('close'); el('apps-editor').classList.remove('open'); });

// ── Init ───────────────────────────────────────────────────
renderClimateCard();
renderAppsCard();

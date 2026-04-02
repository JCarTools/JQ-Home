'use strict';

const TOKEN = "SECURE_TOKEN_2025";
document.addEventListener("contextmenu", e => e.preventDefault());

const el     = id => document.getElementById(id);
const set    = (id, v) => { const e = el(id); if (e) e.textContent = v; };
const run    = cmd => { try { window.androidApi?.runEnum?.(TOKEN, cmd); } catch(e) {} };
const runApp = pkg => { try { window.androidApi?.runApp?.(TOKEN, pkg); } catch(e) {} };
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
const loadLS = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };

// ── Акцент ─────────────────────────────────────────────────
const ACCENTS = ['#294EF1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];
let accent = loadLS('lite_accent') || '#06b6d4';

function applyAccent(color) {
  accent = color;
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  document.body.style.setProperty('--accent', color);
  document.body.style.setProperty('--accent-20', `rgba(${r},${g},${b},0.2)`);
  document.body.style.setProperty('--accent-30', `rgba(${r},${g},${b},0.3)`);
  document.body.style.setProperty('--accent-50', `rgba(${r},${g},${b},0.5)`);
  document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.color === color));
  // Обновляем QR коды под акцент
  const hex = color.slice(1);
  const qrUsdt = document.getElementById('qr-usdt');
  const qrCard = document.getElementById('qr-card');
  if (qrUsdt) qrUsdt.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=tron:TB6fJPUeVvPvp1nD7zZhj7HZCAAbzA5cjy&bgcolor=1a1c24&color=${hex}&margin=10`;
  if (qrCard) qrCard.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=2204321101306272&bgcolor=1a1c24&color=${hex}&margin=10`;
  saveLS('lite_accent', color);
}

(function initAccent() {
  const container = el('accent-btns');
  ACCENTS.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'accent-dot'; dot.dataset.color = color;
    dot.style.background = color;
    dot.addEventListener('click', () => applyAccent(color));
    container.appendChild(dot);
  });
  applyAccent(accent);
})();

// ── Обои (CSS анимации) ────────────────────────────────────
const savedWp = loadLS('lite_wallpaper');
if (savedWp) el('bg').style.backgroundImage = `url(${savedWp})`;

window.setWallpaper = function(base64) {
  el('bg').style.backgroundImage = `url(data:image/jpeg;base64,${base64})`;
  saveLS('lite_wallpaper', `data:image/jpeg;base64,${base64}`);
};

function showWallpaperPicker() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px)';

  const anims = BgAnimations.ANIMS;
  const current = loadLS('lite_bg_anim') || 'aurora';
  const items = Object.entries(anims).map(([key, val]) => `
    <div data-key="${key}" style="width:160px;height:100px;border-radius:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,0.06);border:2px solid ${key===current?'var(--accent)':'rgba(255,255,255,0.1)'};transition:border-color 0.2s">
      <span style="font-size:28px">${val.icon}</span>
      <span style="font-size:13px;color:rgba(255,255,255,0.8)">${val.name}</span>
    </div>`).join('');

  overlay.innerHTML = `
    <div style="background:#1a1c24;border-radius:24px;padding:32px;display:flex;flex-direction:column;gap:20px;max-width:600px;width:90%">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:20px;font-weight:300">Анимированные обои</div>
        <button id="wp-close" style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">${items}</div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('#wp-close').onclick = () => document.body.removeChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });
  overlay.querySelectorAll('[data-key]').forEach(item => {
    item.addEventListener('click', () => {
      BgAnimations.set(item.dataset.key);
      document.body.removeChild(overlay);
    });
  });
}


// ── Часы ───────────────────────────────────────────────────
const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
function updateClock() {
  const n = new Date();
  set("clock", String(n.getHours()).padStart(2,"0") + ":" + String(n.getMinutes()).padStart(2,"0"));
  set("date", n.getDate() + " " + MONTHS[n.getMonth()]);
}
setInterval(updateClock, 10000);
updateClock();

// ── Плеер ──────────────────────────────────────────────────
let isPlaying = false;
let trackDuration = 0, trackPosition = 0, positionTimestamp = 0;
let progressTimer = null;

function setProgress(pos, dur) {
  const pct = dur > 0 ? Math.min(pos / dur * 100, 100) : 0;
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct.toFixed(1) + '%';
  const fmt = ms => { const s = Math.max(0, Math.floor(ms/1000)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  set('time-cur', fmt(pos));
  set('time-dur', fmt(dur));
}

function startProgressTick() {
  stopProgressTick();
  progressTimer = setInterval(() => {
    if (!isPlaying || trackDuration <= 0) return;
    const pos = Math.min(trackPosition + (Date.now() - positionTimestamp), trackDuration);
    setProgress(pos, trackDuration);
  }, 1000);
}

function stopProgressTick() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function setPlayState(playing) {
  isPlaying = playing;
  el("icon-play").style.display  = playing ? "none"  : "block";
  el("icon-pause").style.display = playing ? "block" : "none";
  if (playing) startProgressTick(); else stopProgressTick();
}

el("btn-prev").addEventListener("click", () => run("MEDIA_PREV"));
el("btn-next").addEventListener("click", () => run("MEDIA_NEXT"));
el("btn-play").addEventListener("click", () => { run(isPlaying ? "MEDIA_PAUSE" : "MEDIA_PLAY"); setPlayState(!isPlaying); });

// ── Редактор климата ───────────────────────────────────────
const ALL_CLIMATE = [
  { id:'cl-seat-l',  label:'Подогрев\nводителя',   icon:'icons/Seat heated_left.svg',         on:'heat_seat_l',       off:'heat_seat_l_0',        max:3 },
  { id:'cl-seat-r',  label:'Подогрев\nпассажира',  icon:'icons/Seat heated_right.svg',        on:'heat_seat_r',       off:'heat_seat_r_0',        max:3 },
  { id:'cl-wind',    label:'Обогрев\nлобового',    icon:'icons/Windshield defroster.svg',     on:'heat_windshield_on',off:'heat_windshield_off',  max:1 },
  { id:'cl-rear',    label:'Обогрев\nзаднего',     icon:'icons/Rare windshield defroster.svg',on:'heat_rearwindow_on',off:'heat_rearwindow_off',  max:1 },
  { id:'cl-vent-l',  label:'Вентиляция\nводителя', icon:'icons/Seat vent_left.svg',           on:'vent_seat_l',       off:'vent_seat_l_0',        max:3 },
  { id:'cl-vent-r',  label:'Вентиляция\nпассажира',icon:'icons/Seat vent_right.svg',          on:'vent_seat_r',       off:'vent_seat_r_0',        max:3 },
  { id:'cl-wheel',   label:'Подогрев\nруля',       icon:'icons/Steering wheel heat.svg',      on:'heat_wheel_on',     off:'heat_wheel_off',       max:1 },
  { id:'cl-zad-l',   label:'Обогрев\nзад. лево',   icon:'icons/Seat heated_left.svg',         on:'heat_zad_seat_l',   off:'heat_zad_seat_l_0',    max:3 },
  { id:'cl-zad-r',   label:'Обогрев\nзад. право',  icon:'icons/Seat heated_right.svg',        on:'heat_zad_seat_r',   off:'heat_zad_seat_r_off',  max:3 },
  { id:'cl-driver1', label:'Память\nводитель 1',   icon:'icons/Driver.svg',                   on:'voditel_seat_1',    off:'',                     max:1 },
  { id:'cl-driver2', label:'Память\nводитель 2',   icon:'icons/Driver.svg',                   on:'voditel_seat_2',    off:'',                     max:1 },
  { id:'cl-driver3', label:'Память\nводитель 3',   icon:'icons/Driver.svg',                   on:'voditel_seat_3',    off:'',                     max:1 },
];
const MAX_CLIMATE_SLOTS = 7;
const DEFAULT_CLIMATE_IDS = ['cl-seat-l','cl-seat-r','cl-wind','cl-rear','cl-vent-l','cl-vent-r','cl-wheel'];

function getClimateConfig() { return loadLS('lite_climate_cfg') || DEFAULT_CLIMATE_IDS; }
function saveClimateConfig(ids) { saveLS('lite_climate_cfg', ids); }

function openClimateEditor() {
  const selected = getClimateConfig();
  const grid = el('climate-all-grid');
  grid.innerHTML = '';
  ALL_CLIMATE.forEach(item => {
    const isSel = selected.includes(item.id);
    const div = document.createElement('div');
    div.className = 'editor-item' + (isSel ? ' selected' : '');
    div.dataset.id = item.id;
    div.innerHTML = `<div class="editor-item-icon"><img src="${item.icon}"></div>
      <div class="editor-item-label">${item.label.replace(/\n/g,'<br>')}</div>
      ${item.max > 1 ? `<div class="editor-item-badge">${item.max} ур.</div>` : ''}`;
    div.addEventListener('click', () => {
      const cur = getClimateConfig();
      if (div.classList.contains('selected')) {
        saveClimateConfig(cur.filter(i => i !== item.id));
        div.classList.remove('selected');
      } else {
        if (cur.length >= MAX_CLIMATE_SLOTS) return;
        saveClimateConfig([...cur, item.id]);
        div.classList.add('selected');
      }
      updateEditorLimits();
      buildClimate();
    });
    grid.appendChild(div);
  });
  updateEditorLimits();
  el('climate-editor').classList.add('open');
}

function updateEditorLimits() {
  const cur = getClimateConfig();
  el('climate-all-grid').querySelectorAll('.editor-item').forEach(d => {
    d.classList.toggle('disabled', !d.classList.contains('selected') && cur.length >= MAX_CLIMATE_SLOTS);
  });
}

el('climate-editor-close').addEventListener('click', () => el('climate-editor').classList.remove('open'));
const climateState = {};

function buildClimate() {
  const grid = el('climate-grid');
  grid.innerHTML = '';
  const selected = getClimateConfig();
  selected.forEach(id => {
    const item = ALL_CLIMATE.find(c => c.id === id);
    if (!item) return;
    const dots = Array.from({length: item.max}, (_,i) => `<div class="cl-dot" data-lv="${i+1}"></div>`).join('');
    const btn = document.createElement('div');
    btn.className = 'cl-btn'; btn.id = item.id;
    btn.dataset.on = item.on; btn.dataset.off = item.off; btn.dataset.max = item.max;
    btn.innerHTML = `<div class="cl-icon"><img src="${item.icon}"></div><div class="cl-label">${item.label.replace(/\n/g,'<br>')}</div><div class="cl-dots">${dots}</div>`;

    btn.addEventListener('click', () => {
      const max = parseInt(btn.dataset.max)||1;
      const next = ((climateState[item.id]||0)+1)%(max+1);
      climateState[item.id] = next;
      btn.querySelectorAll('.cl-dot').forEach(d => d.classList.toggle('on', parseInt(d.dataset.lv) <= next));
      btn.classList.toggle('active', next > 0);
      run(next === 0 ? btn.dataset.off : (max > 1 ? btn.dataset.on+'_'+next : btn.dataset.on));
    });

    if (item.max > 1) {
      let lt;
      const sl = () => { lt = setTimeout(() => { if ((climateState[item.id]||0) > 0) { climateState[item.id]=0; btn.querySelectorAll('.cl-dot').forEach(d=>d.classList.remove('on')); btn.classList.remove('active'); run(btn.dataset.off); btn.blur(); btn.classList.add('force-release'); setTimeout(()=>btn.classList.remove('force-release'),50); } }, 600); };
      const cl = () => clearTimeout(lt);
      btn.addEventListener('touchstart',sl,{passive:true}); btn.addEventListener('touchend',cl); btn.addEventListener('touchcancel',cl);
      btn.addEventListener('mousedown',sl); btn.addEventListener('mouseup',cl); btn.addEventListener('mouseleave',cl);
    }
    grid.appendChild(btn);
  });

  // Кнопка редактирования
  const editBtn = document.createElement('div');
  editBtn.className = 'edit-slot';
  editBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg><span>Изменить</span>`;
  editBtn.addEventListener('click', openClimateEditor);
  grid.appendChild(editBtn);
}
buildClimate();

// ── Мои приложения ─────────────────────────────────────────
const MY_SLOTS = 7;
let pickerSlot = null;

function buildMyApps() {
  const grid = el('my-grid');
  grid.innerHTML = '';
  for (let i = 1; i <= MY_SLOTS; i++) {
    const saved = loadLS('lite_my_'+i);
    const slot = document.createElement('div');
    slot.className = 'my-slot'; slot.dataset.slot = i;
    if (saved) {
      slot.innerHTML = `<div class="my-slot-icon"><img src="data:image/png;base64,${saved.icon}" alt="${saved.name}"></div><div class="my-slot-name">${saved.name}</div>`;
    } else {
      slot.innerHTML = `<div class="my-slot-icon"><img class="plus-icon" src="icons/Plus.svg"></div><div class="my-slot-name">Добавить</div>`;
    }

    let pressTimer = null, didLong = false;
    const startPress = () => { didLong=false; pressTimer=setTimeout(()=>{ didLong=true; if(saved){localStorage.removeItem('lite_my_'+i); buildMyApps();} }, 700); };
    const cancelPress = () => clearTimeout(pressTimer);
    slot.addEventListener('touchstart', startPress, {passive:true});
    slot.addEventListener('touchend', cancelPress);
    slot.addEventListener('touchcancel', cancelPress);
    slot.addEventListener('mousedown', startPress);
    slot.addEventListener('mouseup', cancelPress);
    slot.addEventListener('mouseleave', cancelPress);
    slot.addEventListener('click', () => {
      if (didLong) { didLong=false; return; }
      if (saved) { runApp(saved.pkg); return; }
      pickerSlot = i;
      openDrawer(true);
    });
    grid.appendChild(slot);
  }

  // Кнопка редактирования
  const editBtn = document.createElement('div');
  editBtn.className = 'edit-slot';
  editBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg><span>Изменить</span>`;
  editBtn.addEventListener('click', () => { pickerSlot = MY_SLOTS + 1; openDrawer(true); });
  grid.appendChild(editBtn);
}
buildMyApps();

// ── Шторка приложений ──────────────────────────────────────
function openDrawer(forPicker = false) {
  const grid = el('apps-grid');
  el('apps-drawer').classList.add('open');
  grid.innerHTML = `<div class="apps-empty">Загрузка...</div>`;
  setTimeout(() => {
    try {
      const apps = JSON.parse(window.androidApi?.getUserApps?.(TOKEN) || '[]');
      if (!apps.length) { grid.innerHTML = `<div class="apps-empty">Нет приложений</div>`; return; }
      grid.innerHTML = '';
      apps.forEach(app => {
        const item = document.createElement('div');
        item.className = 'app-item';
        item.innerHTML = `<img src="data:image/png;base64,${app.icon}" onerror="this.style.display='none'"><span>${app.name}</span>`;
        item.addEventListener('click', () => {
          if (forPicker && pickerSlot) {
            saveLS('lite_my_'+pickerSlot, {pkg:app.package, name:app.name, icon:app.icon});
            pickerSlot = null;
            buildMyApps();
          } else {
            runApp(app.package);
          }
          closeDrawer();
        });
        grid.appendChild(item);
      });
    } catch(e) { grid.innerHTML = `<div class="apps-empty">Ошибка</div>`; }
  }, 60);
}

function closeDrawer() { el('apps-drawer').classList.remove('open'); pickerSlot = null; }
el('btn-all-apps').addEventListener('click', () => { pickerSlot=null; openDrawer(false); });
el('drawer-close').addEventListener('click', closeDrawer);

// ── Настройки ──────────────────────────────────────────────
el('btn-settings').addEventListener('click', () => el('settings-panel').classList.add('open'));
el('settings-close').addEventListener('click', () => el('settings-panel').classList.remove('open'));
el('btn-donate').addEventListener('click', () => { el('settings-panel').classList.remove('open'); el('donate-drawer').classList.add('open'); });
el('donate-close').addEventListener('click', () => el('donate-drawer').classList.remove('open'));

// ── Сворачивание карточек ──────────────────────────────────
const collapseState = loadLS('lite_collapse') || { climate: false, apps: false };
const speedCollapse = loadLS('lite_speed_collapse') || { climate: true, apps: true };

function setCollapsed(id, collapsed) {
  collapseState[id] = collapsed;
  const body = el('body-' + id);
  const btn  = el('collapse-' + id);
  const card = el('card-' + id);
  body.classList.toggle('collapsed', collapsed);
  card.classList.toggle('collapsed', collapsed);
  btn.textContent = collapsed ? '+' : '−';
  saveLS('lite_collapse', collapseState);
}

setCollapsed('climate', collapseState.climate);
setCollapsed('apps',    collapseState.apps);

el('collapse-climate').addEventListener('click', () => setCollapsed('climate', !collapseState.climate));
el('collapse-apps').addEventListener('click',    () => setCollapsed('apps',    !collapseState.apps));

// Настройки скоростного режима
el('speed-collapse-climate').checked = speedCollapse.climate;
el('speed-collapse-apps').checked    = speedCollapse.apps;
el('speed-collapse-climate').addEventListener('change', e => { speedCollapse.climate = e.target.checked; saveLS('lite_speed_collapse', speedCollapse); });
el('speed-collapse-apps').addEventListener('change',    e => { speedCollapse.apps    = e.target.checked; saveLS('lite_speed_collapse', speedCollapse); });

// Скорость
window.onAndroidEvent = function(type, data) {
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch(e) { return; } }
  if (!data) return;

  switch (type) {
    case 'speed': {
      const v = parseFloat(data.value) || 0;
      if (v >= 20) {
        if (speedCollapse.climate) setCollapsed('climate', true);
        if (speedCollapse.apps)    setCollapsed('apps',    true);
      }
      break;
    }
    case 'musicInfo': {
      const title = data.SongName || '', artist = data.SongArtist || '', hasTrack = !!(title||artist);
      set('track-title', hasTrack ? title : 'Не воспроизводится');
      set('track-artist', hasTrack ? artist : '—');
      const art = el('album-art');
      if (data.SongAlbumPicture) { art.src = 'data:image/png;base64,'+data.SongAlbumPicture; art.classList.remove('empty'); }
      else { art.src = 'img/Artist.png'; art.classList.toggle('empty', !hasTrack); }
      const pos = parseFloat(data.Trpos||0), dur = parseFloat(data.Trdur||0);
      trackDuration = dur; trackPosition = pos; positionTimestamp = Date.now();
      setProgress(pos, dur);
      const playing = data.isPlaying===true||data.isPlaying==='true'||data.isPlaying===1;
      if (playing !== isPlaying) setPlayState(playing);
      break;
    }
    case 'wallpaper':
      if (data.base64) window.setWallpaper(data.base64);
      break;
  }
};

try { window.androidApi?.onJsReady?.(TOKEN); } catch(e) {}

// ── Карта ──────────────────────────────────────────────────
const YMAPS_KEY = 'ecd9c541-a423-4a20-87a4-17d6996aa2ea';
let mapInstance = null;
let mapLoaded   = false;
let mapVisible  = false;
let mapMinimized = false;
let userPlacemark = null;

const mapWindow  = el('map-window');
const mapPill    = el('map-pill');
const mapLoading = el('map-loading');

// Перетаскивание окна
(function initDrag() {
  const bar = el('map-titlebar');
  let dragging = false, ox = 0, oy = 0;

  bar.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = mapWindow.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    mapWindow.style.transform = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    mapWindow.style.left = (e.clientX - ox) + 'px';
    mapWindow.style.top  = (e.clientY - oy) + 'px';
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  // Touch drag
  bar.addEventListener('touchstart', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = mapWindow.getBoundingClientRect();
    ox = e.touches[0].clientX - r.left;
    oy = e.touches[0].clientY - r.top;
    mapWindow.style.transform = 'none';
  }, {passive: true});
  document.addEventListener('touchmove', e => {
    if (!dragging) return;
    mapWindow.style.left = (e.touches[0].clientX - ox) + 'px';
    mapWindow.style.top  = (e.touches[0].clientY - oy) + 'px';
  }, {passive: true});
  document.addEventListener('touchend', () => { dragging = false; });
})();

function loadYmaps() {
  if (mapLoaded || document.getElementById('ymaps-script')) return;
  const s = document.createElement('script');
  s.id  = 'ymaps-script';
  s.src = `https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_KEY}&lang=ru_RU`;
  s.onload = () => {
    ymaps.ready(() => {
      mapLoaded = true;
      mapInstance = new ymaps.Map('ymap', {
        center: [55.7558, 37.6173],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector']
      }, {
        suppressMapOpenBlock: true
      });

      // Тёмная тема через стили тайлов
      mapInstance.options.set('theme', 'dark');

      mapLoading.classList.add('hidden');

      // Автодополнение адреса — собственный дропдаун
      initSuggest();

      // Попытка геолокации сразу
      locateUser();
    });
  };
  s.onerror = () => {
    mapLoading.innerHTML = '<div style="color:rgba(255,100,100,0.8);font-size:14px;text-align:center;padding:20px">Не удалось загрузить карту.<br>Проверьте подключение к интернету.</div>';
  };
  document.head.appendChild(s);
}

function locateUser() {
  if (!mapInstance) return;
  navigator.geolocation?.getCurrentPosition(pos => {
    const coords = [pos.coords.latitude, pos.coords.longitude];
    mapInstance.setCenter(coords, 15, { duration: 500 });

    if (userPlacemark) {
      userPlacemark.geometry.setCoordinates(coords);
    } else {
      userPlacemark = new ymaps.Placemark(coords, {}, {
        preset: 'islands#circleDotIcon',
        iconColor: getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#06b6d4'
      });
      mapInstance.geoObjects.add(userPlacemark);
    }
  }, () => {
    // Геолокация недоступна — остаёмся на Москве
  }, { timeout: 8000 });
}

function openMap() {
  mapVisible  = true;
  mapMinimized = false;
  mapWindow.classList.add('visible');
  mapPill.classList.remove('visible');
  // Сбрасываем позицию к центру при первом открытии
  if (!mapWindow.style.left) {
    mapWindow.style.left = '50%';
    mapWindow.style.top  = '100px';
    mapWindow.style.transform = 'translateX(-50%)';
  }
  if (!mapLoaded) loadYmaps();
}

function closeMap() {
  mapVisible   = false;
  mapMinimized = false;
  mapWindow.classList.remove('visible');
  mapPill.classList.remove('visible');
}

function minimizeMap() {
  mapMinimized = true;
  mapWindow.classList.remove('visible');
  mapPill.classList.add('visible');
}

el('btn-map')?.addEventListener('click', () => mapVisible ? closeMap() : openMap());
el('map-close')?.addEventListener('click', closeMap);
el('map-minimize')?.addEventListener('click', minimizeMap);
el('map-pill')?.addEventListener('click', openMap);
el('map-locate')?.addEventListener('click', locateUser);

// ── Маршрут ────────────────────────────────────────────────
let activeRoute = null;
let userCoords  = null;

const routeInput = el('map-route-input');
const routeInfo  = el('map-route-info');
const routeClear = el('map-route-clear');
const routeGo    = el('map-route-go');

// Собственный дропдаун подсказок
function initSuggest() {
  // Создаём дропдаун
  const dropdown = document.createElement('div');
  dropdown.id = 'map-suggest-list';
  dropdown.style.cssText = `
    position:absolute; left:0; right:0; top:100%;
    background:rgba(14,16,24,0.98); backdrop-filter:blur(20px);
    border:1px solid rgba(255,255,255,0.1); border-top:none;
    border-radius:0 0 12px 12px; z-index:9999;
    overflow:hidden; display:none; flex-direction:column;
  `;
  // Вставляем в обёртку инпута
  const wrap = el('map-route-input-wrap');
  wrap.style.position = 'relative';
  wrap.style.flexWrap = 'wrap';
  wrap.appendChild(dropdown);

  let suggestTimer = null;

  routeInput.addEventListener('input', () => {
    const val = routeInput.value.trim();
    routeClear.style.display = val ? 'block' : 'none';
    clearTimeout(suggestTimer);
    if (val.length < 2) { dropdown.style.display = 'none'; return; }

    suggestTimer = setTimeout(() => {
      // Прямой запрос к Suggest API — работает с любым JS API ключом
      const url = `https://suggest-maps.yandex.ru/suggest-geo?part=${encodeURIComponent(val)}&n=6&lang=ru&format=json&callback=_ymSuggest`;

      // JSONP запрос
      const cbName = '_ymSuggest_' + Date.now();
      const script = document.createElement('script');
      script.src = `https://suggest-maps.yandex.ru/suggest-geo?part=${encodeURIComponent(val)}&n=6&lang=ru_RU&format=json&callback=${cbName}&apikey=${YMAPS_KEY}`;

      window[cbName] = (data) => {
        delete window[cbName];
        script.remove();
        const items = (data && data[1]) ? data[1].map(i => i[0]) : [];
        if (items.length) renderSuggest(items);
        else {
          // Fallback через ymaps.geocode
          ymaps.geocode(val, { results: 6 }).then(res => {
            const found = res.geoObjects.toArray().map(o => o.getAddressLine()).filter(Boolean);
            found.length ? renderSuggest(found) : (dropdown.style.display = 'none');
          }).catch(() => { dropdown.style.display = 'none'; });
        }
      };

      script.onerror = () => {
        delete window[cbName];
        script.remove();
        // Fallback через ymaps.geocode
        ymaps.geocode(val, { results: 6 }).then(res => {
          const found = res.geoObjects.toArray().map(o => o.getAddressLine()).filter(Boolean);
          found.length ? renderSuggest(found) : (dropdown.style.display = 'none');
        }).catch(() => { dropdown.style.display = 'none'; });
      };

      document.head.appendChild(script);
    }, 350);

    function renderSuggest(items) {
      dropdown.innerHTML = '';
      items.forEach(text => {
        const row = document.createElement('div');
        row.textContent = text;
        row.style.cssText = `
          padding:10px 14px; font-size:13px; color:rgba(255,255,255,0.85);
          cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.05);
          transition:background 0.15s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        `;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,0.07)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        const pick = (e) => {
          e.preventDefault();
          routeInput.value = text;
          routeClear.style.display = 'block';
          dropdown.style.display = 'none';
          buildRoute();
        };
        row.addEventListener('mousedown', pick);
        row.addEventListener('touchend', pick);
        dropdown.appendChild(row);
      });
      dropdown.style.display = 'flex';
    }
  });

  // Скрываем при потере фокуса
  routeInput.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });
  routeInput.addEventListener('focus', () => {
    if (routeInput.value.trim().length >= 2) dropdown.style.display = 'flex';
  });
}

// Показываем кнопку очистки при вводе
routeInput.addEventListener('input', () => {
  routeClear.style.display = routeInput.value ? 'block' : 'none';
});

routeClear.addEventListener('click', () => {
  routeInput.value = '';
  routeClear.style.display = 'none';
  clearRoute();
});

function clearRoute() {
  if (activeRoute && mapInstance) {
    mapInstance.geoObjects.remove(activeRoute);
    activeRoute = null;
  }
  routeInfo.textContent = '';
}

function buildRoute() {
  const dest = routeInput.value.trim();
  if (!dest || !mapInstance) return;

  routeGo.disabled = true;
  routeGo.textContent = '...';
  routeInfo.textContent = '';
  routeInfo.style.color = '';
  clearRoute();

  // Шаг 1: геокодируем адрес назначения
  ymaps.geocode(dest, { results: 1 }).then(res => {
    const geoObj = res.geoObjects.get(0);
    if (!geoObj) throw new Error('geocode_empty');

    const destCoords = geoObj.geometry.getCoordinates();

    // Шаг 2: получаем точку отправления
    const getFrom = userCoords
      ? Promise.resolve(userCoords)
      : new Promise(resolve => {
          navigator.geolocation?.getCurrentPosition(
            p => { userCoords = [p.coords.latitude, p.coords.longitude]; resolve(userCoords); },
            () => resolve(null),
            { timeout: 5000 }
          );
        });

    return getFrom.then(from => {
      // Если нет геолокации — строим маршрут только к точке (центрируем карту)
      if (!from) {
        mapInstance.setCenter(destCoords, 14, { duration: 600 });
        const pm = new ymaps.Placemark(destCoords, { balloonContent: dest }, {
          preset: 'islands#redDotIcon'
        });
        mapInstance.geoObjects.add(pm);
        activeRoute = pm;
        routeInfo.textContent = 'Геолокация недоступна';
        routeInfo.style.color = 'rgba(255,200,100,0.9)';
        routeGo.disabled = false;
        routeGo.textContent = 'Маршрут';
        return;
      }

      // Строим маршрут между двумя координатами
      return ymaps.route([from, destCoords], {
        routingMode: 'auto',
        mapStateAutoApply: true
      }).then(route => {
        activeRoute = route;
        mapInstance.geoObjects.add(route);

        // Цвет маршрута под акцент
        const accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        const hex = accentColor.replace('#', '');
        route.getPaths().each(path => {
          path.options.set({ strokeColor: hex, strokeWidth: 5, strokeOpacity: 0.9 });
        });

        // Подписи точек
        route.getWayPoints().get(0).options.set({ preset: 'islands#greenCircleDotIcon' });
        route.getWayPoints().get(1).options.set({ preset: 'islands#redCircleDotIcon' });

        const dist = route.getHumanLength();
        const time = route.getHumanTime();
        routeInfo.textContent = `${dist} · ${time}`;
        routeInfo.style.color = '';

        routeGo.disabled = false;
        routeGo.textContent = 'Маршрут';
      });
    });

  }).catch(err => {
    console.warn('Route error:', err);
    routeInfo.textContent = 'Адрес не найден';
    routeInfo.style.color = 'rgba(255,100,100,0.8)';
    setTimeout(() => { routeInfo.textContent = ''; routeInfo.style.color = ''; }, 3000);
    routeGo.disabled = false;
    routeGo.textContent = 'Маршрут';
  });
}

routeGo.addEventListener('click', buildRoute);
routeInput.addEventListener('keydown', e => { if (e.key === 'Enter') buildRoute(); });

// Обновляем координаты пользователя при геолокации
const _origLocate = locateUser;
locateUser = function() {
  _origLocate();
  navigator.geolocation?.getCurrentPosition(
    p => { userCoords = [p.coords.latitude, p.coords.longitude]; },
    () => {}, { timeout: 8000 }
  );
};

// ── Голосовое управление климатом ─────────────────────────
function climateVoiceSet(id, levelHint) {
  const btn = document.getElementById(id);
  if (!btn) return `Функция недоступна`;

  const max = parseInt(btn.dataset.max) || 1;

  // Определяем уровень из подсказки
  let target = 1;
  if (levelHint) {
    const s = String(levelHint).toLowerCase();
    if (s.includes('2') || s.includes('втор')) target = Math.min(2, max);
    else if (s.includes('3') || s.includes('трет')) target = Math.min(3, max);
    else target = 1;
  }

  // Кликаем нужное количество раз чтобы попасть на нужный уровень
  const cur = climateState[id] || 0;
  // Сбрасываем если уже включено
  if (cur > 0) {
    // Кликаем до 0
    let clicks = (max + 1) - cur;
    for (let i = 0; i < clicks; i++) btn.click();
  }
  // Теперь кликаем до target
  for (let i = 0; i < target; i++) btn.click();

  const names = {
    'cl-seat-l': 'Подогрев водителя',
    'cl-seat-r': 'Подогрев пассажира',
    'cl-vent-l': 'Вентиляция водителя',
    'cl-vent-r': 'Вентиляция пассажира',
    'cl-wind':   'Обогрев лобового',
    'cl-rear':   'Обогрев заднего',
    'cl-wheel':  'Подогрев руля',
    'cl-zad-l':  'Подогрев зад. лево',
    'cl-zad-r':  'Подогрев зад. право',
  };
  const name = names[id] || id;
  return max > 1 ? `${name}: уровень ${target}` : `${name}: включён`;
}

function climateVoiceOff(id) {
  const btn = document.getElementById(id);
  if (!btn || !(climateState[id] > 0)) return 'Уже выключено';
  // Кликаем до сброса
  const cur = climateState[id] || 0;
  const max = parseInt(btn.dataset.max) || 1;
  const clicks = (max + 1) - cur;
  for (let i = 0; i < clicks; i++) btn.click();
  const names = { 'cl-seat-l':'Подогрев водителя','cl-seat-r':'Подогрев пассажира','cl-vent-l':'Вентиляция водителя','cl-vent-r':'Вентиляция пассажира','cl-wind':'Обогрев лобового','cl-rear':'Обогрев заднего','cl-wheel':'Подогрев руля','cl-zad-l':'Подогрев зад. лево','cl-zad-r':'Подогрев зад. право' };
  return `${names[id] || id}: выключен`;
}

// ── Голосовое управление ───────────────────────────────────
const VoiceControl = (() => {
  const overlay      = el('voice-overlay');
  const statusEl     = el('voice-status');
  const transcriptEl = el('voice-transcript');
  const resultEl     = el('voice-result');
  const btnVoice     = el('btn-voice');
  const btnCancel    = el('voice-cancel');

  // Режимы: 'off' | 'wake' (фоновое ожидание) | 'command' (слушаем команду)
  let mode      = 'off';
  let recWake   = null;  // распознаватель wake word
  let recCmd    = null;  // распознаватель команды
  let wakeEnabled = loadLS('lite_wake_enabled') || false;
  let wakeWord    = loadLS('lite_wake_word')    || 'поехали';

  const COMMANDS = [
    // ── Плеер ──────────────────────────────────────────────
    { rx: /следующ|дальше/i,                   fn: () => { run('MEDIA_NEXT');  return 'Следующий трек'; } },
    { rx: /предыдущ|назад/i,                   fn: () => { run('MEDIA_PREV');  return 'Предыдущий трек'; } },
    { rx: /пауза|стоп|останови/i,              fn: () => { run('MEDIA_PAUSE'); setPlayState(false); return 'Пауза'; } },
    { rx: /играй|воспроизвед|продолжи|музык/i, fn: () => { run('MEDIA_PLAY');  setPlayState(true);  return 'Воспроизведение'; } },

    // ── Карта (отключена) ───────────────────────────────────

    // ── Карточки ────────────────────────────────────────────
    { rx: /сверни климат/i,                    fn: () => { setCollapsed('climate', true);  return 'Климат свёрнут'; } },
    { rx: /разверни климат/i,                  fn: () => { setCollapsed('climate', false); return 'Климат развёрнут'; } },
    { rx: /сверни приложени/i,                 fn: () => { setCollapsed('apps', true);     return 'Приложения свёрнуты'; } },
    { rx: /разверни приложени/i,               fn: () => { setCollapsed('apps', false);    return 'Приложения развёрнуты'; } },
    { rx: /сверни всё|сверни все/i,            fn: () => { setCollapsed('climate', true); setCollapsed('apps', true); return 'Всё свёрнуто'; } },

    // ── Настройки ───────────────────────────────────────────
    { rx: /настройк/i,                         fn: () => { el('settings-panel').classList.add('open'); return 'Открываю настройки'; } },
    { rx: /закрой настройк/i,                  fn: () => { el('settings-panel').classList.remove('open'); return 'Настройки закрыты'; } },

    // ── Климат: выключить всё ───────────────────────────────
    { rx: /климат выключ|выключи климат|всё выключ/i,
      fn: () => {
        document.querySelectorAll('.cl-btn.active').forEach(b => b.click());
        return 'Климат выключен';
      }
    },

    // ── Климат: подогрев сиденья водителя ──────────────────
    // "включи подогрев водителя [на] [первый/второй/третий/1/2/3] уровень"
    { rx: /подогрев\s+(?:сиден[ья]+\s+)?водител[яь](?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-seat-l', m[1])
    },
    // "выключи подогрев водителя"
    { rx: /выключи\s+подогрев\s+(?:сиден[ья]+\s+)?водител[яь]/i,
      fn: () => climateVoiceOff('cl-seat-l')
    },

    // ── Климат: подогрев сиденья пассажира ─────────────────
    { rx: /подогрев\s+(?:сиден[ья]+\s+)?пассажир(?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-seat-r', m[1])
    },
    { rx: /выключи\s+подогрев\s+(?:сиден[ья]+\s+)?пассажир/i,
      fn: () => climateVoiceOff('cl-seat-r')
    },

    // ── Климат: вентиляция водителя ────────────────────────
    { rx: /вентиляц[ия]+\s+(?:сиден[ья]+\s+)?водител[яь](?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-vent-l', m[1])
    },
    { rx: /выключи\s+вентиляц[ия]+\s+(?:сиден[ья]+\s+)?водител[яь]/i,
      fn: () => climateVoiceOff('cl-vent-l')
    },

    // ── Климат: вентиляция пассажира ───────────────────────
    { rx: /вентиляц[ия]+\s+(?:сиден[ья]+\s+)?пассажир(?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-vent-r', m[1])
    },
    { rx: /выключи\s+вентиляц[ия]+\s+(?:сиден[ья]+\s+)?пассажир/i,
      fn: () => climateVoiceOff('cl-vent-r')
    },

    // ── Климат: обогрев лобового стекла ────────────────────
    { rx: /обогрев\s+лобов|лобов\w+\s+стекл/i,
      fn: () => climateVoiceSet('cl-wind', null)
    },
    { rx: /выключи\s+(?:обогрев\s+)?лобов/i,
      fn: () => climateVoiceOff('cl-wind')
    },

    // ── Климат: обогрев заднего стекла ─────────────────────
    { rx: /обогрев\s+задн|задн\w+\s+стекл/i,
      fn: () => climateVoiceSet('cl-rear', null)
    },
    { rx: /выключи\s+(?:обогрев\s+)?задн\w+\s+стекл/i,
      fn: () => climateVoiceOff('cl-rear')
    },

    // ── Климат: подогрев руля ───────────────────────────────
    { rx: /подогрев\s+рул[яь]|рул[яь]\s+подогр/i,
      fn: () => climateVoiceSet('cl-wheel', null)
    },
    { rx: /выключи\s+(?:подогрев\s+)?рул[яь]/i,
      fn: () => climateVoiceOff('cl-wheel')
    },

    // ── Климат: подогрев задних сидений ────────────────────
    { rx: /подогрев\s+задн\w+\s+(?:лев|водител)(?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-zad-l', m[1])
    },
    { rx: /подогрев\s+задн\w+\s+(?:прав|пассажир)(?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => climateVoiceSet('cl-zad-r', m[1])
    },
    { rx: /подогрев\s+задн(?:.*?(\d|перв|втор|трет))?/i,
      fn: (m) => {
        climateVoiceSet('cl-zad-l', m[1]);
        climateVoiceSet('cl-zad-r', m[1]);
        return 'Задние сиденья: подогрев';
      }
    },
    // ── AI (отключён) ───────────────────────────────────────
  ];

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ── Звук активации ───────────────────────────────────────
  let _audioCtx = null;

  // Создаём AudioContext при ЛЮБОМ первом взаимодействии со страницей
  function ensureAudioCtx() {
    if (_audioCtx) {
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      return;
    }
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }

  ['click','touchstart','keydown'].forEach(evt =>
    document.addEventListener(evt, ensureAudioCtx, { once: false, passive: true })
  );

  function getAudioCtx() {
    ensureAudioCtx();
    return _audioCtx;
  }

  function playTone(freq, startDelay, duration, volume = 0.2) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + startDelay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.015);
      gain.gain.linearRampToValueAtTime(0, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch(e) {}
  }

  function playActivationSound() {
    playTone(440, 0,    0.09, 0.18);
    playTone(660, 0.11, 0.09, 0.18);
  }

  function playDoneSound() {
    playTone(660, 0,    0.07, 0.15);
    playTone(440, 0.09, 0.09, 0.12);
  }

  function makeRec(continuous, onResult, onEnd) {
    if (!SpeechRecognition) return null;
    const r = new SpeechRecognition();
    r.lang = 'ru-RU';
    r.continuous = continuous;
    r.interimResults = true;
    r.maxAlternatives = 2;
    r.onresult = onResult;
    r.onerror  = (e) => {
      if (e.error === 'no-speech') {
        // Перезапускаем в wake режиме, в command — сообщаем
        onEnd('no-speech');
      } else if (e.error !== 'aborted') {
        onEnd(e.error);
      }
    };
    r.onend    = () => onEnd(null);
    return r;
  }

  // ── Wake word режим ──────────────────────────────────────
  function startWakeMode() {
    if (!SpeechRecognition || !wakeEnabled) return;
    if (mode === 'command') return; // не перебиваем команду
    mode = 'wake';

    recWake = makeRec(false, (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const text = e.results[i][0].transcript.toLowerCase().trim();
        console.log('[wake] heard:', text);

        // Проверяем — хотя бы одно слово из wake word есть в тексте
        const words = wakeWord.toLowerCase().split(/\s+/);
        const hit   = words.some(w => w.length > 2 && text.includes(w));
        if (hit) {
          stopWakeMode();
          startCommandMode(true);
          return;
        }
      }
    }, (err) => {
      // Перезапускаем цикл если не было ошибки доступа и режим не сменился
      if (mode === 'wake' && err !== 'not-allowed' && err !== 'service-not-allowed') {
        setTimeout(startWakeMode, 300);
      }
    });

    try { recWake.start(); } catch(e) {
      if (mode === 'wake') setTimeout(startWakeMode, 1000);
    }
  }

  function stopWakeMode() {
    try { recWake?.stop(); recWake?.abort(); } catch(e) {}
    recWake = null;
  }

  // ── Command режим ────────────────────────────────────────
  function startCommandMode(fromWake = false) {
    mode = 'command';
    playActivationSound();
    overlay.classList.add('active');
    btnVoice.classList.add('listening');
    statusEl.textContent = fromWake ? `"${wakeWord}" — слушаю команду` : 'Слушаю...';
    transcriptEl.textContent = '';
    resultEl.textContent = '';

    recCmd = makeRec(false, (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      transcriptEl.textContent = final || interim;
      if (interim) statusEl.textContent = 'Слышу...';
      if (final) { statusEl.textContent = 'Выполняю...'; processCommand(final.trim()); }
    }, (err) => {
      if (err === 'no-speech') {
        statusEl.textContent = 'Говорите громче или ближе к микрофону';
        setTimeout(stopCommandMode, 2000);
      } else if (!resultEl.textContent) {
        statusEl.textContent = 'Не распознано';
        setTimeout(stopCommandMode, 1200);
      } else {
        setTimeout(stopCommandMode, 1800);
      }
    });

    try { recCmd.start(); } catch(e) {
      statusEl.textContent = 'Нет доступа к микрофону';
      setTimeout(stopCommandMode, 2000);
    }
  }

  function stopCommandMode() {
    mode = wakeEnabled ? 'wake' : 'off';
    overlay.classList.remove('active');
    btnVoice.classList.remove('listening');
    try { recCmd?.stop(); recCmd?.abort(); } catch(e) {}
    recCmd = null;
    // Возобновляем wake mode
    if (wakeEnabled) setTimeout(startWakeMode, 400);
  }

  function processCommand(text) {
    for (const cmd of COMMANDS) {
      const m = text.match(cmd.rx);
      if (m) {
        playDoneSound();
        resultEl.textContent = cmd.fn(m) || '✓';
        return;
      }
    }
    resultEl.textContent = 'Команда не распознана';
    resultEl.style.color = 'rgba(255,150,100,0.9)';
    setTimeout(() => { resultEl.style.color = ''; }, 2000);
  }

  // ── Публичные методы ─────────────────────────────────────
  function toggleManual() {
    if (mode === 'command') { stopCommandMode(); }
    else if (mode === 'wake') { stopWakeMode(); startCommandMode(false); }
    else { startCommandMode(false); }
  }

  function setWakeEnabled(val) {
    wakeEnabled = val;
    saveLS('lite_wake_enabled', val);
    if (val && mode === 'off') startWakeMode();
    else if (!val && mode === 'wake') { stopWakeMode(); mode = 'off'; }
    updateWakeIndicator();
  }

  function setWakeWord(word) {
    wakeWord = word.trim().toLowerCase();
    saveLS('lite_wake_word', wakeWord);
    if (mode === 'wake') { stopWakeMode(); startWakeMode(); }
  }

  function updateWakeIndicator() {
    if (wakeEnabled) {
      btnVoice.classList.add('wake-active');
      btnVoice.title = `Скажи "${wakeWord}"`;
    } else {
      btnVoice.classList.remove('wake-active');
      btnVoice.title = 'Голосовое управление';
    }
  }

  if (!SpeechRecognition) {
    btnVoice.style.opacity = '0.4';
    btnVoice.title = 'Недоступно в этом WebView';
  } else {
    btnVoice?.addEventListener('click', toggleManual);
    btnCancel?.addEventListener('click', () => { if (mode === 'command') stopCommandMode(); });
    updateWakeIndicator();
    if (wakeEnabled) startWakeMode();
  }

  return { setWakeEnabled, setWakeWord, getWakeWord: () => wakeWord, isWakeEnabled: () => wakeEnabled };
})();

// ── Настройки wake word ────────────────────────────────────
(function initWakeSettings() {
  const toggle = el('wake-enabled');
  const input  = el('wake-word-input');
  const row    = el('wake-word-row');
  if (!toggle || !input) return;

  toggle.checked  = VoiceControl.isWakeEnabled();
  input.value     = VoiceControl.getWakeWord();
  row.style.opacity = toggle.checked ? '1' : '0.4';

  toggle.addEventListener('change', e => {
    VoiceControl.setWakeEnabled(e.target.checked);
    row.style.opacity = e.target.checked ? '1' : '0.4';
  });

  let wakeTimer;
  input.addEventListener('input', () => {
    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
      if (input.value.trim()) VoiceControl.setWakeWord(input.value);
    }, 800);
  });
})();

// ── AI Ассистент (Groq) ────────────────────────────────────
const AIChat = (() => {
  const GROQ_KEY = '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';
  const MODEL    = 'llama-3.3-70b-versatile';
  const SYSTEM   = `Ты голосовой ассистент в автомобиле Jaecoo J7. Отвечай кратко и по делу — водитель за рулём. Максимум 2-3 предложения если не просят подробнее. Говори по-русски. Можешь помочь с маршрутами, советами по вождению, погодой, общими вопросами.`;

  const win      = el('ai-window');
  const pill     = el('ai-pill');
  const messages = el('ai-messages');
  const input    = el('ai-input');
  const sendBtn  = el('ai-send');
  const voiceBtn = el('ai-voice-btn');

  let history  = [];
  let visible  = false;
  let aiRec    = null;
  let aiListening = false;
  let ttsEnabled = loadLS('ai_tts') !== false; // по умолчанию включено

  // ── TTS ───────────────────────────────────────────────────
  let ttsAudio = null;

  function speak(text) {
    if (!ttsEnabled) return;
    // Останавливаем предыдущее
    if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }

    // Разбиваем на части по 200 символов (лимит Google TTS)
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      // Режем по предложениям
      let cut = 200;
      if (remaining.length > 200) {
        const dot = remaining.lastIndexOf('.', 200);
        const comma = remaining.lastIndexOf(',', 200);
        cut = dot > 100 ? dot + 1 : comma > 100 ? comma + 1 : 200;
      }
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }

    let idx = 0;
    function playNext() {
      if (idx >= chunks.length || !ttsEnabled) return;
      const chunk = chunks[idx++];
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ru&client=tw-ob`;
      ttsAudio = new Audio(url);
      ttsAudio.volume = 1.0;
      ttsAudio.onended = playNext;
      ttsAudio.onerror = () => {
        // Fallback на браузерный TTS если Google недоступен
        const utt = new SpeechSynthesisUtterance(chunk);
        utt.lang = 'ru-RU'; utt.rate = 1.0;
        utt.onend = playNext;
        window.speechSynthesis?.speak(utt);
      };
      ttsAudio.play().catch(() => {
        // Autoplay заблокирован — fallback
        const utt = new SpeechSynthesisUtterance(chunk);
        utt.lang = 'ru-RU';
        window.speechSynthesis?.speak(utt);
      });
    }
    playNext();
  }

  function stopSpeech() {
    if (ttsAudio) { ttsAudio.pause(); ttsAudio.src = ''; ttsAudio = null; }
    window.speechSynthesis?.cancel();
  }

  // Перетаскивание
  (function() {
    const bar = el('ai-titlebar');
    let drag = false, ox = 0, oy = 0;
    bar.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      drag = true;
      const r = win.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top;
      win.style.right = 'auto';
    });
    document.addEventListener('mousemove', e => {
      if (!drag) return;
      win.style.left = (e.clientX - ox) + 'px';
      win.style.top  = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => { drag = false; });
  })();

  function open() {
    visible = true;
    win.classList.add('visible');
    pill.classList.remove('visible');
    if (!win.style.left) { win.style.right = '24px'; win.style.left = 'auto'; }
    if (history.length === 0) addMsg('assistant', 'Привет! Чем могу помочь?');
    setTimeout(() => input.focus(), 100);
  }

  function close() {
    visible = false;
    win.classList.remove('visible');
    pill.classList.remove('visible');
  }

  function minimize() {
    win.classList.remove('visible');
    pill.classList.add('visible');
  }

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `ai-msg ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ai-msg typing';
    div.innerHTML = '<div class="ai-typing-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  async function send(text) {
    if (!text.trim()) return;
    input.value = '';
    sendBtn.disabled = true;

    addMsg('user', text);
    history.push({ role: 'user', content: text });

    const typing = showTyping();

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            ...history.slice(-10)  // последние 10 сообщений
          ],
          max_tokens: 300,
          temperature: 0.7
        })
      });

      const data = await res.json();
      typing.remove();

      if (data.choices?.[0]?.message?.content) {
        const reply = data.choices[0].message.content.trim();
        history.push({ role: 'assistant', content: reply });
        addMsg('assistant', reply);
        speak(reply);
      } else {
        addMsg('assistant', 'Ошибка: ' + (data.error?.message || 'нет ответа'));
      }
    } catch(e) {
      typing.remove();
      addMsg('assistant', 'Нет соединения с сервером.');
    }

    sendBtn.disabled = false;
    input.focus();
  }

  // Голосовой ввод в чат
  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (aiListening) {
      aiListening = false;
      voiceBtn.classList.remove('listening');
      try { aiRec?.stop(); } catch(e) {}
      return;
    }

    aiRec = new SR();
    aiRec.lang = 'ru-RU';
    aiRec.interimResults = false;
    aiRec.onresult = e => {
      const text = e.results[0][0].transcript;
      input.value = text;
      send(text);
    };
    aiRec.onend = () => {
      aiListening = false;
      voiceBtn.classList.remove('listening');
    };
    aiRec.onerror = () => {
      aiListening = false;
      voiceBtn.classList.remove('listening');
    };

    aiListening = true;
    voiceBtn.classList.add('listening');
    try { aiRec.start(); } catch(e) {}
  }

  // Голосовая команда "спроси ..." из VoiceControl
  window.aiAsk = (text) => {
    open();
    setTimeout(() => send(text), 300);
  };

  // Кнопка TTS в заголовке
  const ttsBtn = el('ai-tts-btn');
  function updateTtsBtn() {
    if (!ttsBtn) return;
    ttsBtn.style.color    = ttsEnabled ? 'var(--accent)' : 'rgba(255,255,255,0.3)';
    ttsBtn.style.borderColor = ttsEnabled ? 'var(--accent-50)' : '';
    ttsBtn.title = ttsEnabled ? 'Голос: вкл' : 'Голос: выкл';
  }
  updateTtsBtn();
  ttsBtn?.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    saveLS('ai_tts', ttsEnabled);
    if (!ttsEnabled) window.speechSynthesis?.cancel();
    updateTtsBtn();
  });

  el('btn-ai')?.addEventListener('click', () => visible ? close() : open());
  el('ai-close')?.addEventListener('click', () => { stopSpeech(); close(); });
  el('ai-minimize')?.addEventListener('click', minimize);
  el('ai-pill')?.addEventListener('click', open);
  sendBtn?.addEventListener('click', () => send(input.value));
  voiceBtn?.addEventListener('click', toggleVoice);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });

  return { open, close, send, speak, stopSpeech };
})();

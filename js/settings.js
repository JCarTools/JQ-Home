'use strict';

// ── Настройки ──────────────────────────────────────────────
applyTheme(cfg.theme);
initAccentPicker();

el('toggle-speed-mode').checked = cfg.speedMode;
el('toggle-speed-mode').addEventListener('change', e => { Sounds.play('toggle'); cfg.speedMode = e.target.checked; if (!cfg.speedMode) document.body.classList.remove('speed-mode'); saveCfg(); });

el('toggle-weather').checked = cfg.weather;
el('toggle-weather').addEventListener('change', e => { Sounds.play('toggle'); cfg.weather = e.target.checked; el('weather-widget').style.visibility = cfg.weather ? '' : 'hidden'; saveCfg(); });
el('weather-widget').style.visibility = cfg.weather ? '' : 'hidden';

el('toggle-visualizer').checked = cfg.visualizer;
el('toggle-visualizer').addEventListener('change', e => { Sounds.play('toggle'); cfg.visualizer = e.target.checked; if (!cfg.visualizer) Visualizer?.stop(); else if (isPlaying) Visualizer?.start(); saveCfg(); });

el('toggle-parallax').checked = cfg.parallax;
el('toggle-parallax').addEventListener('change', e => { Sounds.play('toggle'); cfg.parallax = e.target.checked; if (!cfg.parallax) el('bg').style.transform = ''; saveCfg(); });

// Звуки
function updateSoundOptions() {
  el('sound-options').classList.toggle('disabled', !cfg.sounds);
}

el('toggle-sounds').checked = cfg.sounds;
updateSoundOptions();
el('toggle-sounds').addEventListener('change', e => {
  cfg.sounds = e.target.checked;
  updateSoundOptions();
  saveCfg();
  if (cfg.sounds) Sounds.play('toggle');
});

// Кастомный слайдер громкости
(function() {
  const slider = el('sound-volume-slider');
  const fill   = el('slider-fill');
  const thumb  = el('slider-thumb');
  const dotsEl = slider.querySelector('.slider-dots');
  const STEPS  = 10;

  // Создаём точки
  for (let i = 0; i < STEPS; i++) {
    const dot = document.createElement('div');
    dot.className = 'slider-dot';
    dotsEl.appendChild(dot);
  }

  function updateUI(val) {
    const pct = ((val - 1) / (STEPS - 1)) * 100;
    fill.style.width  = pct + '%';
    thumb.style.left  = `calc(${pct}% )`;
    // Подсвечиваем активные точки
    dotsEl.querySelectorAll('.slider-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i < val);
    });
  }

  function setVal(val) {
    val = Math.max(1, Math.min(STEPS, Math.round(val)));
    cfg.soundVolume = val / STEPS;
    updateUI(val);
  }

  function getValFromEvent(e) {
    const rect = slider.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    return Math.round((x / rect.width) * (STEPS - 1)) + 1;
  }

  let dragging = false;
  slider.addEventListener('mousedown',  e => { dragging = true; setVal(getValFromEvent(e)); });
  slider.addEventListener('touchstart', e => { dragging = true; setVal(getValFromEvent(e)); }, { passive: true });
  document.addEventListener('mousemove', e => { if (dragging) { const v = getValFromEvent(e); if (v !== Math.round((cfg.soundVolume||0.7)*STEPS)) { cfg.soundVolume = v/STEPS; updateUI(v); } } });
  document.addEventListener('touchmove', e => { if (dragging) { const v = getValFromEvent(e); if (v !== Math.round((cfg.soundVolume||0.7)*STEPS)) { cfg.soundVolume = v/STEPS; updateUI(v); } } }, { passive: true });
  document.addEventListener('mouseup',   () => { if (dragging) { dragging = false; saveCfg(); Sounds.play('tap'); } });
  document.addEventListener('touchend',  () => { if (dragging) { dragging = false; saveCfg(); Sounds.play('tap'); } });

  // Инициализация
  updateUI(Math.round((cfg.soundVolume || 0.7) * STEPS));
})();

function applySoundStyle(style) {
  cfg.soundStyle = style;
  ['sound-minimal','sound-standard','sound-futuristic'].forEach(id => el(id)?.classList.toggle('active', id === 'sound-'+style));
  saveCfg();
  Sounds.play('tap');
}
applySoundStyle(cfg.soundStyle);
el('sound-minimal').addEventListener('click',    () => applySoundStyle('minimal'));
el('sound-standard').addEventListener('click',   () => applySoundStyle('standard'));
el('sound-futuristic').addEventListener('click', () => applySoundStyle('futuristic'));

el('theme-black').addEventListener('click', () => applyTheme('black'));
el('theme-white').addEventListener('click', () => applyTheme('white'));
el('theme-auto').addEventListener('click',  () => applyTheme('auto'));
el('theme-sun').addEventListener('click',   () => { applyTheme('sun'); const c = loadLS('weather_coords'); if (c) fetchSunTimes(c.lat, c.lon); });

el('btn-wallpaper').addEventListener('click', () => showBuiltinWallpaperPicker());
el('btn-settings').addEventListener('click',  () => { Sounds.play('open'); el('settings-panel').classList.add('open'); });
el('settings-close').addEventListener('click',() => { Sounds.play('close'); el('settings-panel').classList.remove('open'); });

// Боковые кнопки (landscape) — те же действия
el('btn-settings-side')?.addEventListener('click',   () => { Sounds.play('open'); el('settings-panel').classList.add('open'); });
el('btn-all-apps-side')?.addEventListener('click',   () => { pickerSlot = null; openDrawer(false); });
el('btn-add-screen-side')?.addEventListener('click', () => window.addScreen?.());
el('btn-edit-screens-side')?.addEventListener('click', () => {
  if (typeof editMode !== 'undefined') {
    editMode ? exitEditMode?.() : enterEditMode?.();
  }
});
el('btn-volume-side')?.addEventListener('click', () => {
  el('btn-volume')?.click();
});

// ── Громкость ──────────────────────────────────────────────
(function() {
  const btn    = el('btn-volume');
  const popup  = el('volume-popup');
  const label  = el('volume-val-label');
  const track  = el('volume-track');
  const fill   = el('volume-fill');
  const thumb  = el('volume-thumb');
  const minus  = el('vol-minus');
  const plus   = el('vol-plus');
  if (!btn || !popup) return;

  let vol = loadLS('system_volume') ?? 50;
  let hideTimer = null;

  function resetHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%,-50%) scale(0.95)';
      setTimeout(() => { popup.style.display = 'none'; }, 200);
    }, 3000);
  }

  function updateDots() {
    if (!dotsEl) return;
    dotsEl.querySelectorAll('.vol-dot').forEach((d, i) => {
      d.classList.toggle('passed', (i + 1) * 5 <= vol);
    });
  }

  function setVol(v, send = true) {
    vol = Math.max(0, Math.min(100, Math.round(v)));
    // Позиция thumb с учётом радиуса (20px) чтобы не выходил за края
    const thumbR = 20;
    const trackW = track.offsetWidth || 1;
    const usable = trackW - thumbR * 2;
    const px = thumbR + (vol / 100) * usable;
    const pct = (px / trackW * 100).toFixed(2) + '%';

    fill.style.width  = (vol / 100 * 100) + '%';
    thumb.style.left  = pct;
    label.textContent = vol + '%';
    saveLS('system_volume', vol);
    if (send) try { window.androidApi?.setvol?.(TOKEN, vol); } catch(e) {}
    resetHideTimer();
    updateDots();
  }

  // Генерируем точки делений
  const dotsEl = el('vol-dots');
  if (dotsEl) {
    for (let i = 0; i < 20; i++) {
      const d = document.createElement('div');
      d.className = 'vol-dot';
      dotsEl.appendChild(d);
    }
  }

  setVol(vol, false);

  // Кнопки ±5
  minus.addEventListener('click', () => { setVol(vol - 5); Sounds.play('tap'); });
  plus.addEventListener('click',  () => { setVol(vol + 5); Sounds.play('tap'); });

  // Тап/свайп по треку
  function volFromEvent(e) {
    const rect = track.getBoundingClientRect();
    const thumbR = 20;
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const usable = rect.width - thumbR * 2;
    return Math.round(Math.max(0, Math.min(1, (x - thumbR) / usable)) * 100);
  }
  let dragging = false;
  track.addEventListener('touchstart', e => { dragging = true; setVol(volFromEvent(e)); }, { passive: true });
  track.addEventListener('touchmove',  e => { if (dragging) setVol(volFromEvent(e)); }, { passive: true });
  track.addEventListener('touchend',   () => { dragging = false; Sounds.play('tap'); });
  track.addEventListener('mousedown',  e => { dragging = true; setVol(volFromEvent(e)); });
  document.addEventListener('mousemove', e => { if (dragging) setVol(volFromEvent(e)); });
  document.addEventListener('mouseup',   () => { if (dragging) { dragging = false; Sounds.play('tap'); } });

  // Открыть/закрыть
  btn.addEventListener('click', () => {
    const isOpen = popup.style.display !== 'none';
    if (isOpen) {
      popup.style.display = 'none';
    } else {
      popup.style.display = 'block';
      popup.style.opacity = '0';
      popup.style.transform = 'translate(-50%,-50%) scale(0.95)';
      popup.style.transition = 'opacity 0.2s, transform 0.2s';
      requestAnimationFrame(() => {
        popup.style.opacity = '1';
        popup.style.transform = 'translate(-50%,-50%) scale(1)';
        // Пересчитываем позицию thumb теперь когда трек имеет размер
        setVol(vol, false);
      });
      Sounds.play('open');
      resetHideTimer();
    }
  });
  document.addEventListener('click', e => {
    if (popup.style.display !== 'none' && !popup.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popup.style.display = 'none';
      clearTimeout(hideTimer);
    }
  });
})();

// ── Карточка 1 (legacy — оставляем для совместимости) ──────
function applyCard1(mode) { cfg.card1 = mode; saveCfg(); }
applyCard1(cfg.card1 || 'apps');
el('card1-apps')?.addEventListener('click', () => applyCard1('apps'));
el('card1-navi')?.addEventListener('click', () => applyCard1('navi'));
el('card1-radar')?.addEventListener('click', () => applyCard1('radar'));

// ── Шторка приложений ──────────────────────────────────────
let pickerSlot = null;

function openDrawer(forPicker = false) {
  Sounds.play('open');
  el("drawer-title-text").textContent = forPicker ? "Выберите приложение" : "Приложения";
  const grid = el("apps-grid");
  el("apps-drawer").classList.add("open");
  grid.innerHTML = `<div class="apps-empty">Загрузка...</div>`;
  setTimeout(() => {
    try {
      let apps = JSON.parse(window.androidApi?.getUserApps?.(TOKEN) || "[]");
      if (!apps.length) { grid.innerHTML = `<div class="apps-empty">Нет приложений</div>`; return; }
      grid.innerHTML = "";
      apps.forEach(app => {
        const item = document.createElement("div");
        item.className = "app-item";
        item.innerHTML = `<img src="data:image/png;base64,${app.icon}" alt="${app.name}" onerror="this.style.display='none'"><span>${app.name}</span>`;
        item.addEventListener("click", () => {
          if (forPicker && pickerSlot) { saveLS("my_"+pickerSlot.id,{pkg:app.package,name:app.name,icon:app.icon}); applyMySlot(pickerSlot.el,{pkg:app.package,name:app.name,icon:app.icon}); pickerSlot=null; }
          else runApp(app.package);
          closeDrawer();
        });
        grid.appendChild(item);
      });
    } catch(e) { grid.innerHTML = `<div class="apps-empty">Ошибка загрузки</div>`; }
  }, 60);
}

function closeDrawer() { Sounds.play('close'); el("apps-drawer").classList.remove("open"); pickerSlot = null; }
el("btn-all-apps").addEventListener("click", () => { pickerSlot = null; openDrawer(false); });
el("drawer-close").addEventListener("click", closeDrawer);
(function() {
  let sy = 0; const d = el("apps-drawer");
  d.addEventListener("touchstart", e => { sy = e.touches[0].clientY; }, { passive: true });
  d.addEventListener("touchend",   e => { if (e.changedTouches[0].clientY - sy > 80) closeDrawer(); });
})();

// ── Мои приложения ─────────────────────────────────────────
function applyMySlot(slotEl, data) {
  slotEl.querySelector(".my-slot-icon").innerHTML = `<img src="data:image/png;base64,${data.icon}" alt="${data.name}">`;
  slotEl.querySelector(".my-slot-name").textContent = data.name;
}
function clearMySlot(slotEl, id) {
  localStorage.removeItem("my_"+id);
  slotEl.querySelector(".my-slot-icon").innerHTML = `<img class="plus-icon" src="icons/Plus.svg">`;
  slotEl.querySelector(".my-slot-name").textContent = "Добавить";
}
function showSlotMenu(slotEl, id) {
  if (!loadLS("my_"+id)) { pickerSlot = {id, el: slotEl}; openDrawer(true); return; }
  const menu = document.createElement("div");
  menu.style.cssText = "position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)";
  menu.innerHTML = `<div style="background:#1a1c24;border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:12px;min-width:260px">
    <div style="font-size:18px;font-weight:500;margin-bottom:4px">Слот приложения</div>
    <button id="menu-reassign" style="padding:14px;border-radius:12px;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:15px;cursor:pointer">Переназначить</button>
    <button id="menu-delete" style="padding:14px;border-radius:12px;background:rgba(255,60,60,0.2);border:1px solid rgba(255,60,60,0.3);color:#ff6060;font-size:15px;cursor:pointer">Удалить</button>
    <button id="menu-cancel" style="padding:14px;border-radius:12px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-size:15px;cursor:pointer">Отмена</button></div>`;
  document.body.appendChild(menu);
  menu.querySelector("#menu-reassign").onclick = () => { document.body.removeChild(menu); pickerSlot={id,el:slotEl}; openDrawer(true); };
  menu.querySelector("#menu-delete").onclick   = () => { document.body.removeChild(menu); clearMySlot(slotEl,id); };
  menu.querySelector("#menu-cancel").onclick   = () => document.body.removeChild(menu);
  menu.addEventListener("click", e => { if (e.target===menu) document.body.removeChild(menu); });
}

function initMySlots() {
  document.querySelectorAll(".my-slot").forEach(slot => {
    const id = slot.dataset.slot;
    const saved = loadLS("my_"+id);
    if (saved) applyMySlot(slot, saved);
    let pressTimer = null, didLong = false;
    const startPress = () => { didLong=false; pressTimer=setTimeout(()=>{didLong=true;showSlotMenu(slot,id);},700); };
    const cancelPress = () => clearTimeout(pressTimer);
    slot.addEventListener("touchstart", startPress, {passive:true});
    slot.addEventListener("touchend",   cancelPress);
    slot.addEventListener("touchcancel",cancelPress);
    slot.addEventListener("mousedown",  startPress);
    slot.addEventListener("mouseup",    cancelPress);
    slot.addEventListener("mouseleave", cancelPress);
    slot.addEventListener("click", () => { if(didLong){didLong=false;return;} const s=loadLS("my_"+id); if(s?.pkg){runApp(s.pkg);return;} pickerSlot={id,el:slot}; openDrawer(true); });
  });
}

// ── Приложения ─────────────────────────────────────────────
function rebindApps() {
  document.querySelectorAll("#card-apps .app-btn, #card-navi .app-btn").forEach(btn => {
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener("click", () => {
      const pkg = fresh.dataset.pkg;
      if (pkg) runApp(pkg);
    });
  });
}
rebindApps();

// ── Климат ─────────────────────────────────────────────────
const climateState = {};

function rebindClimate() {
  document.querySelectorAll(".cl-btn").forEach(btn => {
    // Убираем старые обработчики клонированием
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    const id = fresh.id, max = parseInt(fresh.dataset.max)||1;
    fresh.addEventListener("click", () => { const next=((climateState[id]||0)+1)%(max+1); setClimate(fresh,next); });
    if (max > 1) {
      let lt;
      const sl = () => { lt=setTimeout(()=>{ if((climateState[id]||0)>0){setClimate(fresh,0);navigator.vibrate?.(40);fresh.blur();fresh.classList.add('force-release');setTimeout(()=>fresh.classList.remove('force-release'),50);}},600); };
      const cl = () => clearTimeout(lt);
      fresh.addEventListener("touchstart",sl,{passive:true}); fresh.addEventListener("touchend",cl); fresh.addEventListener("touchcancel",cl);
      fresh.addEventListener("mousedown",sl); fresh.addEventListener("mouseup",cl); fresh.addEventListener("mouseleave",cl);
    }
  });
}
rebindClimate();
function setClimate(btn, level) {
  const id=btn.id, max=parseInt(btn.dataset.max)||1;
  climateState[id]=level;
  btn.querySelectorAll(".cl-dot").forEach(d=>d.classList.toggle("on",parseInt(d.dataset.lv)<=level));
  btn.classList.toggle("active",level>0);
  run(level===0?btn.dataset.off:(max>1?btn.dataset.on+"_"+level:btn.dataset.on));
}

// Перестановка карточек перенесена в js/screens.js

// ── Яркость ────────────────────────────────────────────────
(function initBrightness() {
  const slider = el('brightness-slider');
  const fill   = el('brightness-fill');
  const thumb  = el('brightness-thumb');
  const valEl  = el('brightness-val');
  if (!slider) return;

  let brightness = loadLS('brightness') ?? 50;

  function applyBrightness(val) {
    brightness = Math.max(0, Math.min(100, Math.round(val)));
    const pct = (brightness / 100 * 100).toFixed(1) + '%';
    fill.style.width  = pct;
    thumb.style.left  = pct;
    valEl.textContent = brightness + '%';
    saveLS('brightness', brightness);
    // setBright API: 0=светлая, 100=тёмная
    const inverted = 100 - brightness;
    try { window.androidApi?.setBright?.(TOKEN, inverted); } catch(e) {}
    // JS яркость через filter на body
    const bVal = 0.3 + (brightness / 100) * 0.7; // 0.3 (тёмно) → 1.0 (ярко)
    document.body.style.filter = brightness < 100 ? `brightness(${bVal.toFixed(2)})` : '';
  }

  // Инициализация
  applyBrightness(brightness);

  // Drag
  let dragging = false;
  function getVal(clientX) {
    const rect = slider.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round((clientX - rect.left) / rect.width * 100)));
  }

  slider.addEventListener('mousedown', e => { dragging = true; applyBrightness(getVal(e.clientX)); });
  document.addEventListener('mousemove', e => { if (dragging) applyBrightness(getVal(e.clientX)); });
  document.addEventListener('mouseup', () => { dragging = false; });

  slider.addEventListener('touchstart', e => { dragging = true; applyBrightness(getVal(e.touches[0].clientX)); }, {passive:true});
  document.addEventListener('touchmove', e => { if (dragging) applyBrightness(getVal(e.touches[0].clientX)); }, {passive:true});
  document.addEventListener('touchend', () => { dragging = false; });
})();

// Трекинг последних событий перенесён в events.js

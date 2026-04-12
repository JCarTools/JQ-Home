'use strict';

const TOKEN = "SECURE_TOKEN_2025";
document.addEventListener("contextmenu", e => e.preventDefault());

const el     = id  => document.getElementById(id);
const set    = (id, val) => { const e = el(id); if (e) e.textContent = val; };
const run    = cmd => { try { window.androidApi?.runEnum?.(TOKEN, cmd); } catch(e) {} };
const runApp = pkg => { try { window.androidApi?.runApp?.(TOKEN, pkg); } catch(e) {} };
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
const loadLS = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e) { return null; } };
const fmt    = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s/60) + ":" + String(s%60).padStart(2,"0"); };

// ── Конфиг ─────────────────────────────────────────────────
const cfg = Object.assign(
  { theme: 'black', speedMode: true, weather: true, accent: '#294EF1', visualizer: true, card1: 'apps', parallax: true, sounds: true, soundStyle: 'standard', soundVolume: 0.7, rightWidget: 'none' },
  loadLS('launcher_cfg') || {}
);
function saveCfg() { saveLS('launcher_cfg', cfg); }

// ── Акцент ─────────────────────────────────────────────────
const ACCENTS = [
  { color: '#294EF1' }, { color: '#10b981' }, { color: '#f59e0b' },
  { color: '#ef4444' }, { color: '#8b5cf6' }, { color: '#ec4899' },
  { color: '#06b6d4' }, { color: '#f97316' },
];

function applyAccent(color) {
  cfg.accent = color;
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  document.body.style.setProperty('--accent', color);
  document.body.style.setProperty('--accent-20', `rgba(${r},${g},${b},0.2)`);
  document.body.style.setProperty('--accent-40', `rgba(${r},${g},${b},0.4)`);
  document.body.style.setProperty('--accent-50', `rgba(${r},${g},${b},0.5)`);
  document.querySelectorAll('.accent-dot').forEach(d => d.classList.toggle('active', d.dataset.color === color));
  // Обновляем filter иконок навигации
  const f = getNaivFilterForAccent(color);
  const img = document.getElementById('navi-arrow-img');
  if (img) img.style.filter = f;
  saveCfg();
}

// Вычисляем CSS filter для перекраски чёрного SVG в нужный цвет
function getNaivFilterForAccent(color) {
  const c = color || cfg.accent || '#294EF1';
  const r = parseInt(c.slice(1,3),16)/255;
  const g = parseInt(c.slice(3,5),16)/255;
  const b = parseInt(c.slice(5,7),16)/255;
  // invert(1) делает белым, затем sepia+saturate+hue-rotate подкрашивает
  // Упрощённый подход: invert + multiply через brightness/sepia
  const h = rgbToHue(r, g, b);
  return `invert(1) sepia(1) saturate(4) hue-rotate(${h - 30}deg)`;
}

function rgbToHue(r, g, b) {
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h = 0;
  if (max === r) h = ((g-b)/(max-min)) * 60;
  else if (max === g) h = (2 + (b-r)/(max-min)) * 60;
  else h = (4 + (r-g)/(max-min)) * 60;
  return ((h % 360) + 360) % 360;
}

function initAccentPicker() {
  const container = el('accent-btns');
  ACCENTS.forEach(({ color }) => {
    const dot = document.createElement('div');
    dot.className = 'accent-dot';
    dot.dataset.color = color;
    dot.style.background = color;
    dot.addEventListener('click', () => applyAccent(color));
    container.appendChild(dot);
  });
  applyAccent(cfg.accent);
}

// ── Тема ───────────────────────────────────────────────────
function getSystemTheme() { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'black' : 'white'; }

function getSunTheme() {
  const cache = loadLS('sun_cache'), now = new Date();
  if (cache && cache.date === now.toDateString())
    return (now >= new Date(cache.sunrise) && now < new Date(cache.sunset)) ? 'white' : 'black';
  return (now.getHours() >= 6 && now.getHours() < 20) ? 'white' : 'black';
}

function fetchSunTimes(lat, lon) {
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset&timezone=auto&forecast_days=1`)
    .then(r => r.json()).then(data => {
      saveLS('sun_cache', { date: new Date().toDateString(), sunrise: data.daily.sunrise[0], sunset: data.daily.sunset[0] });
      if (cfg.theme === 'sun') applyTheme('sun');
    }).catch(() => {});
}

function applyTheme(t) {
  cfg.theme = t;
  const eff = t === 'auto' ? getSystemTheme() : t === 'sun' ? getSunTheme() : t;
  document.body.classList.toggle('theme-white', eff === 'white');
  document.body.classList.toggle('theme-black', eff === 'black');
  ['theme-black','theme-white','theme-auto','theme-sun'].forEach(id => el(id)?.classList.toggle('active', id === 'theme-'+t));
  saveCfg();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (cfg.theme === 'auto') applyTheme('auto'); });
setInterval(() => { if (cfg.theme === 'sun') applyTheme('sun'); }, 60000);

// ── Часы ───────────────────────────────────────────────────
const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
function updateClock() {
  const n = new Date();
  set("clock", String(n.getHours()).padStart(2,"0") + ":" + String(n.getMinutes()).padStart(2,"0"));
  set("date", n.getDate() + " " + MONTHS[n.getMonth()]);
}
setInterval(updateClock, 10000);
updateClock();

// ── Скорость ───────────────────────────────────────────────
let speedHideTimer = null;
function showSpeed(v) {
  set("speed-val", Math.round(v));
  el("speed-pill").classList.toggle("visible", v > 3);
  clearTimeout(speedHideTimer);
  if (v > 3) speedHideTimer = setTimeout(() => el("speed-pill").classList.remove("visible"), 5000);
  if (cfg.speedMode) document.body.classList.toggle("speed-mode", v >= 20);
  set("radar-speed-val", Math.round(v));
}

// ── Parallax ───────────────────────────────────────────────
(function() {
  const bg = el('bg');
  let tiltX = 0, tiltY = 0, curX = 0, curY = 0;
  const DEPTH = 18, SMOOTH = 0.06;
  function tick() {
    if (!cfg.parallax) { bg.style.transform = ''; requestAnimationFrame(tick); return; }
    curX += (tiltX - curX) * SMOOTH;
    curY += (tiltY - curY) * SMOOTH;
    bg.style.transform = `translate(${curX}px, ${curY}px)`;
    requestAnimationFrame(tick);
  }
  if (window.DeviceMotionEvent) {
    window.addEventListener('deviceorientation', e => {
      if (!cfg.parallax) return;
      tiltX = -(Math.max(-30, Math.min(30, e.gamma || 0)) / 30) * DEPTH;
      tiltY = -(Math.max(-30, Math.min(30, (e.beta || 0) - 45)) / 30) * DEPTH;
    }, { passive: true });
  }
  requestAnimationFrame(tick);
})();

// ── Обои ───────────────────────────────────────────────────
window.setWallpaper = function(base64) {
  el('bg').style.backgroundImage = `url(data:image/jpeg;base64,${base64})`;
  saveLS('wallpaper_b64', base64);
};
const savedWp = loadLS('wallpaper_b64');
if (savedWp) el('bg').style.backgroundImage = `url(data:image/jpeg;base64,${savedWp})`;

function showBuiltinWallpaperPicker() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:400;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(16px)';

  overlay.innerHTML = `
    <div style="background:#1a1c24;border-radius:24px;padding:28px;display:flex;flex-direction:column;gap:16px;width:760px;max-height:80vh">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <div style="font-size:22px;font-weight:500">Выбрать обои</div>
        <div style="display:flex;gap:10px;align-items:center">
          <label id="wp-from-pc" style="padding:8px 16px;border-radius:10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:13px;cursor:pointer;white-space:nowrap">
            📁 С компьютера
            <input type="file" accept="image/*" style="display:none" id="wp-file-input">
          </label>
          <button id="wp-cancel" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.08);border:none;color:#fff;font-size:20px;cursor:pointer">✕</button>
        </div>
      </div>
      <div id="wp-status" style="font-size:14px;color:rgba(255,255,255,0.4);text-align:center;padding:8px 0">Загрузка файлов...</div>
      <div id="wp-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;overflow-y:auto;max-height:55vh"></div>
    </div>`;

  document.body.appendChild(overlay);

  const grid   = overlay.querySelector('#wp-grid');
  const status = overlay.querySelector('#wp-status');

  function addItem(src, isUrl, label) {
    const item = document.createElement('div');
    item.style.cssText = 'cursor:pointer;border-radius:14px;overflow:hidden;aspect-ratio:16/9;position:relative;background:rgba(255,255,255,0.05);border:2px solid transparent;transition:border-color 0.2s';
    item.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
      <div style="position:absolute;bottom:0;left:0;right:0;padding:6px 8px;background:linear-gradient(transparent,rgba(0,0,0,0.6));font-size:11px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>`;
    item.addEventListener('mouseenter', () => item.style.borderColor = 'var(--accent)');
    item.addEventListener('mouseleave', () => item.style.borderColor = 'transparent');
    item.addEventListener('click', () => {
      if (isUrl) {
        el('bg').style.backgroundImage = `url(${src})`;
        localStorage.removeItem('wallpaper_b64');
        saveLS('wallpaper_path', src); // сохраняем путь для профилей
      } else {
        // src уже base64 data URL
        el('bg').style.backgroundImage = `url(${src})`;
        saveLS('wallpaper_b64', src.replace('data:image/jpeg;base64,','').replace('data:image/png;base64,',''));
      }
      document.body.removeChild(overlay);
    });
    grid.appendChild(item);
  }

  // Встроенные обои всегда первыми
  ['img/Bg.jpg','img/Bg-2.jpg'].forEach(src => addItem(src, true, src.split('/').pop()));

  // Пробуем загрузить файлы с устройства
  try {
    const raw = window.androidApi?.getFileList?.(TOKEN);
    if (raw) {
      let files;
      try { files = JSON.parse(raw); } catch(e) { status.textContent = 'Ошибка парсинга списка: '+e.message; files = []; }

      // Нормализуем — файлы могут быть строками или объектами {name, path, ...}
      const normalize = f => {
        if (typeof f === 'string') return f;
        // Судя по диагностике: {name, size, date}
        return f.name || f.path || f.fileName || f.file || String(f);
      };

      const allPaths = files.map(normalize);

      // Фильтруем изображения
      const images = allPaths.filter(f => /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f));
      const toShow = images.length > 0 ? images : allPaths;

      if (toShow.length > 0) {
        status.textContent = `Найдено ${toShow.length} файлов${images.length !== files.length ? ' (всего: '+files.length+')' : ''}`;
        toShow.slice(0, 30).forEach(name => {
          const item = document.createElement('div');
          item.style.cssText = 'cursor:pointer;border-radius:14px;overflow:hidden;aspect-ratio:16/9;position:relative;background:rgba(255,255,255,0.05);border:2px solid transparent;transition:border-color 0.2s;display:flex;align-items:center;justify-content:center';
          item.innerHTML = `<div style="font-size:11px;color:rgba(255,255,255,0.4);text-align:center;padding:8px">${(name||'').split('/').pop()}</div>`;
          item.addEventListener('mouseenter', () => item.style.borderColor = 'var(--accent)');
          item.addEventListener('mouseleave', () => item.style.borderColor = 'transparent');
          item.addEventListener('click', () => {
            try {
              const b64 = window.androidApi?.getFile?.(TOKEN, name);
              if (b64) {
                const ext = (name||'').split('.').pop().toLowerCase();
                const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                const dataUrl = `data:${mime};base64,${b64}`;
                el('bg').style.backgroundImage = `url(${dataUrl})`;
                saveLS('wallpaper_b64', b64);
                saveLS('wallpaper_path', name); // путь для профилей
                document.body.removeChild(overlay);
              } else {
                item.innerHTML = '<div style="font-size:11px;color:#ef4444;padding:8px">Не удалось загрузить</div>';
              }
            } catch(e) { item.innerHTML = '<div style="font-size:11px;color:#ef4444;padding:8px">'+e.message+'</div>'; }
          });
          // Ленивая загрузка превью — через очередь чтобы не блокировать UI
          const obs = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            obs.disconnect();
            setTimeout(() => {
              try {
                const b64 = window.androidApi?.getFile?.(TOKEN, name);
                if (b64) {
                  const ext = (name||'').split('.').pop().toLowerCase();
                  const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
                  const img = document.createElement('img');
                  img.src = `data:${mime};base64,${b64}`;
                  img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;inset:0';
                  img.onload = () => {
                    item.querySelector('div')?.remove(); // убираем текст-заглушку
                    item.appendChild(img);
                  };
                }
              } catch(e) {}
            }, 0);
          }, { rootMargin: '100px' });
          obs.observe(item);
          grid.appendChild(item);
        });
      } else {
        status.textContent = `Файлов не найдено (getFileList вернул ${files.length} записей)`;
        // Показываем первые 3 записи для отладки
        if (files.length > 0) {
          const dbg = document.createElement('div');
          dbg.style.cssText = 'grid-column:1/-1;font-size:11px;color:rgba(255,255,255,0.3);padding:8px 0;word-break:break-all';
          dbg.textContent = 'Примеры: ' + files.slice(0,3).join(' | ');
          grid.appendChild(dbg);
        }
      }
    } else {
      status.textContent = 'getFileList вернул null — API недоступен';
    }
  } catch(e) {
    status.textContent = 'Ошибка: ' + e.message;
  }

  overlay.querySelector('#wp-cancel').addEventListener('click', () => document.body.removeChild(overlay));
  overlay.addEventListener('click', e => { if (e.target === overlay) document.body.removeChild(overlay); });

  // Выбор с компьютера
  overlay.querySelector('#wp-file-input').addEventListener('change', function() {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      el('bg').style.backgroundImage = `url(${dataUrl})`;
      // Сохраняем base64 без префикса
      const b64 = dataUrl.split(',')[1];
      if (b64) saveLS('wallpaper_b64', b64);
      document.body.removeChild(overlay);
    };
    reader.readAsDataURL(file);
  });
}

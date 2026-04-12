'use strict';

// ── Компас ─────────────────────────────────────────────────
const Compass = (() => {
  let heading = 0;       // текущий курс (градусы)
  let altitude = null;   // высота (метры)
  let speed    = 0;      // скорость км/ч (из Android events)
  let animId   = null;
  let displayHeading = 0; // плавное значение для анимации

  const DIRS = ['С','СВ','В','ЮВ','Ю','ЮЗ','З','СЗ'];

  function getDir(deg) {
    return DIRS[Math.round(deg / 45) % 8];
  }

  // ── Рендер canvas ─────────────────────────────────────────
  function draw() {
    const canvas = el('compass-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(cx, cy) - 4;

    ctx.clearRect(0, 0, W, H);

    // Плавная интерполяция угла
    let diff = heading - displayHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    displayHeading += diff * 0.12;

    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#294EF1';
    const textColor = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#fff';
    const dimColor  = getComputedStyle(document.body).getPropertyValue('--text-dim').trim() || 'rgba(255,255,255,0.3)';

    // Внешний круг
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Деления
    for (let i = 0; i < 72; i++) {
      const angle = (i * 5 - displayHeading) * Math.PI / 180;
      const isMajor = i % 9 === 0; // каждые 45°
      const len = isMajor ? 10 : 5;
      const r1 = R - 2, r2 = R - 2 - len;
      ctx.beginPath();
      ctx.moveTo(cx + r1 * Math.sin(angle), cy - r1 * Math.cos(angle));
      ctx.lineTo(cx + r2 * Math.sin(angle), cy - r2 * Math.cos(angle));
      ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();
    }

    // Буквы сторон света
    const cardinals = [
      { label: 'С', deg: 0 },
      { label: 'В', deg: 90 },
      { label: 'Ю', deg: 180 },
      { label: 'З', deg: 270 },
    ];
    ctx.font = `bold ${Math.round(R * 0.18)}px Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    cardinals.forEach(({ label, deg }) => {
      const angle = (deg - displayHeading) * Math.PI / 180;
      const r = R - 22;
      const x = cx + r * Math.sin(angle);
      const y = cy - r * Math.cos(angle);
      ctx.fillStyle = label === 'С' ? accent : 'rgba(255,255,255,0.7)';
      ctx.fillText(label, x, y);
    });

    // Стрелка — всегда вверх (указывает на Север)
    const arrowLen = R * 0.38;
    // Красная (север)
    ctx.beginPath();
    ctx.moveTo(cx, cy - arrowLen);
    ctx.lineTo(cx - 6, cy + 4);
    ctx.lineTo(cx + 6, cy + 4);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
    // Белая (юг)
    ctx.beginPath();
    ctx.moveTo(cx, cy + arrowLen);
    ctx.lineTo(cx - 6, cy - 4);
    ctx.lineTo(cx + 6, cy - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    // Центральная точка
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    animId = requestAnimationFrame(draw);
  }

  // ── Обновление данных ──────────────────────────────────────
  function updateHeading(deg) {
    heading = ((deg % 360) + 360) % 360;
    updateInfo();
  }

  function updateAltitude(alt) {
    altitude = alt;
    updateInfo();
  }

  function updateSpeed(v) {
    speed = v;
    updateInfo();
  }

  function updateInfo() {
    const degEl = el('compass-deg');
    const dirEl = el('compass-dir');
    const altEl = el('compass-alt');
    const spdEl = el('compass-spd');
    if (degEl) degEl.textContent = Math.round(heading) + '°';
    if (dirEl) dirEl.textContent = getDir(heading);
    if (altEl) altEl.textContent = altitude != null ? Math.round(altitude) + ' м' : '—';
    if (spdEl) spdEl.textContent = Math.round(speed) + ' км/ч';
  }

  // ── DeviceOrientation ──────────────────────────────────────
  function initOrientation() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientationabsolute', e => {
        if (e.absolute && e.alpha != null) updateHeading(360 - e.alpha);
      }, { passive: true });
      // Fallback для не-absolute
      window.addEventListener('deviceorientation', e => {
        if (e.webkitCompassHeading != null) updateHeading(e.webkitCompassHeading);
        else if (e.alpha != null) updateHeading(360 - e.alpha);
      }, { passive: true });
    }
  }

  // ── GPS высота ─────────────────────────────────────────────
  function initGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(pos => {
        if (pos.coords.altitude != null) updateAltitude(pos.coords.altitude);
        if (pos.coords.speed != null) updateSpeed(pos.coords.speed * 3.6);
      }, null, { enableHighAccuracy: true, maximumAge: 2000 });
    }
  }

  function start() {
    const canvas = el('compass-canvas');
    if (!canvas) return;
    // Размер canvas
    const size = canvas.parentElement.offsetWidth || 200;
    canvas.width  = size;
    canvas.height = size;
    if (!animId) draw();
    initOrientation();
    initGPS();
  }

  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  return { start, stop, updateHeading, updateAltitude, updateSpeed };
})();

// Запускаем когда карточка появляется в DOM
const _compassObserver = new MutationObserver(() => {
  const card = el('card-compass');
  if (card && card.offsetParent !== null) {
    Compass.start();
  }
});
_compassObserver.observe(document.body, { childList: true, subtree: true });

// Обновляем скорость из Android events
window._compassUpdateSpeed = v => Compass.updateSpeed(v);

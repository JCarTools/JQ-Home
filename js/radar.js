'use strict';

// ── Радар ──────────────────────────────────────────────────
const RadarWidget = (() => {
  const canvas = el('radar-canvas');
  const ctx    = canvas.getContext('2d');
  let animId   = null;
  const objects = [];
  const MAX_DIST = 1500;
  const RINGS    = [500, 1000, 1500];

  function resize() {
    const s = canvas.parentElement.offsetWidth || 300;
    canvas.width  = s;
    canvas.height = Math.floor(s / 2) + 20;
  }

  function draw() {
    resize();
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H - 10, R = W / 2 - 4;
    const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#294EF1';

    // Фон полукруга
    const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    bgGrad.addColorStop(0.7, 'rgba(255,255,255,0.02)');
    bgGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0, false); ctx.lineTo(cx, cy); ctx.closePath();
    ctx.fillStyle = bgGrad; ctx.fill();

    // Дуги
    RINGS.forEach((d, i) => {
      const r = (d / MAX_DIST) * R; if (r > R) return;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0);
      ctx.strokeStyle = `rgba(255,255,255,${0.28 + i * 0.1})`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `${Math.max(10, W * 0.03)}px Roboto, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(d >= 1000 ? (d/1000)+'км' : d+'м', cx, cy - r + 14);
    });

    // Радиальные линии
    for (let a = 0; a <= 180; a += 30) {
      const rad = (180 + a) * Math.PI / 180;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * Math.cos(rad), cy + R * Math.sin(rad));
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Мигание
    const blinkOn = Math.floor(Date.now() / 500) % 2 === 0;
    let nearest = null;

    objects.forEach(obj => {
      const r   = Math.min((obj.dist / MAX_DIST) * R, R - 10);
      const rad = (180 + obj.bearing) * Math.PI / 180;
      const ox  = cx + r * Math.cos(rad), oy = cy + r * Math.sin(rad);
      if (ox < 10 || ox > W - 10 || oy > cy - 2) return;
      if (!nearest || obj.dist < nearest.dist) nearest = obj;

      ctx.beginPath(); ctx.arc(ox, oy, blinkOn ? 10 : 7, 0, Math.PI * 2);
      ctx.fillStyle = accent + (blinkOn ? '44' : '22'); ctx.fill();
      ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2);
      ctx.fillStyle = accent; ctx.fill();
    });

    // Знак скорости ближайшей
    const sign = el('radar-nearest-sign');
    if (nearest && nearest.limit) {
      sign.style.display = 'flex';
      el('radar-nearest-limit').textContent = nearest.limit;
    } else { sign.style.display = 'none'; }

    // Нижняя линия
    const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
    lineGrad.addColorStop(0, 'rgba(255,255,255,0)'); lineGrad.addColorStop(0.15, 'rgba(255,255,255,0.7)');
    lineGrad.addColorStop(0.5, 'rgba(255,255,255,1)'); lineGrad.addColorStop(0.85, 'rgba(255,255,255,0.7)');
    lineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy);
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 2; ctx.stroke();

    // Стрелка навигатора — крупная, акцентная
    ctx.fillStyle = accent;
    ctx.save();
    ctx.translate(cx, cy);
    // Классическая стрелка навигатора (треугольник с хвостом)
    ctx.beginPath();
    ctx.moveTo(0, -28);          // острие вверх
    ctx.lineTo(-14, 8);          // левый угол
    ctx.lineTo(-5, 4);           // левый вырез
    ctx.lineTo(-5, 14);          // левый хвост
    ctx.lineTo(5, 14);           // правый хвост
    ctx.lineTo(5, 4);            // правый вырез
    ctx.lineTo(14, 8);           // правый угол
    ctx.closePath();
    ctx.fill();
    // Свечение
    ctx.shadowColor = accent; ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Свечение
    const ar = parseInt(accent.slice(1,3),16), ag = parseInt(accent.slice(3,5),16), ab = parseInt(accent.slice(5,7),16);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    glow.addColorStop(0, `rgba(${ar},${ag},${ab},0.3)`); glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
    ctx.fillStyle = glow; ctx.fillRect(cx-40, cy-40, 80, 45);
  }

  function loop() { draw(); animId = requestAnimationFrame(loop); }

  function start() {
    if (!animId) loop();
    if (objects.length) {
      const n = objects.reduce((a, b) => a.dist < b.dist ? a : b);
      el('radar-nearest').textContent = n.dist >= 1000 ? (n.dist/1000).toFixed(1)+' км' : n.dist+' м';
      el('radar-limit').textContent   = n.limit ? n.limit+' км/ч' : '—';
      el('radar-count').textContent   = objects.length;
    }
  }

  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function setNearest(obj) {
    // Обновляем первый объект реальными данными
    if (obj) { objects[0] = { dist: obj.dist, bearing: 0, limit: obj.limit }; }
  }

  return { start, stop, setNearest };
})();

// ── Переключатель антирадара ──────────────────────────────
let radarEnabled = loadLS('radar_enabled') !== false; // по умолчанию включён

function applyRadarEnabled() {
  const toggle = el('radar-toggle');
  const overlay = el('radar-disabled-overlay');
  if (toggle) toggle.checked = radarEnabled;
  if (overlay) overlay.style.display = radarEnabled ? 'none' : 'flex';
  if (radarEnabled) {
    RadarWidget.start();
  } else {
    RadarWidget.stop();
  }
}

el('radar-toggle')?.addEventListener('change', e => {
  radarEnabled = e.target.checked;
  saveLS('radar_enabled', radarEnabled);
  applyRadarEnabled();
  Sounds.play('toggle');
});

applyRadarEnabled();

window._radarActive = false;
function setRadarActive(active) {
  window._radarActive = active;
  if (radarEnabled && active) RadarWidget.start();
  else if (!active) RadarWidget.stop();
}


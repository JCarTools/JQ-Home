'use strict';

// ── Калькулятор расхода ────────────────────────────────────
function calcFuel() {
  const km     = parseFloat(el('fuel-km')?.value)    || 0;
  const liters = parseFloat(el('fuel-liters')?.value) || 0;
  const price  = parseFloat(el('fuel-price')?.value)  || 0;
  if (km > 0 && liters > 0) {
    const per100 = (liters / km * 100).toFixed(1);
    const cost   = price > 0 ? (liters * price).toFixed(0) + ' ₽' : '—';
    const perKm  = price > 0 ? (liters * price / km).toFixed(1) + ' ₽' : '—';
    el('fuel-per100').textContent = per100;
    el('fuel-cost').textContent   = cost;
    el('fuel-per-km').textContent = perKm;
  } else {
    el('fuel-per100').textContent = '—';
    el('fuel-cost').textContent   = '—';
    el('fuel-per-km').textContent = '—';
  }
}
['fuel-km','fuel-liters','fuel-price'].forEach(id => el(id)?.addEventListener('input', calcFuel));

// ── Таймер поездки ─────────────────────────────────────────
let tripStartTime  = null;
let tripDistance   = 0;
let tripSpeedSum   = 0;
let tripSpeedCount = 0;
let tripTimer      = null;
let tripActive     = false;

function startTrip() {
  if (tripActive) return;
  tripActive    = true;
  tripStartTime = Date.now();
  tripTimer = setInterval(updateTripUI, 1000);
}

function updateTripUI() {
  if (!tripStartTime) return;
  const elapsed = Date.now() - tripStartTime;
  const s = Math.floor(elapsed / 1000);
  const m = Math.floor(s / 60), sec = s % 60;
  const h = Math.floor(m / 60), min = m % 60;
  const timeStr = h > 0
    ? `${h}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${min}:${String(sec).padStart(2,'0')}`;
  if (el('trip-time')) el('trip-time').textContent = timeStr;
  if (el('trip-dist')) el('trip-dist').textContent = tripDistance.toFixed(1);
  if (el('trip-avg'))  el('trip-avg').textContent  = tripSpeedCount > 0 ? Math.round(tripSpeedSum / tripSpeedCount) : '0';
}

function updateTripSpeed(v) {
  if (v > 3) {
    startTrip();
    tripDistance   += v / 3600;
    tripSpeedSum   += v;
    tripSpeedCount += 1;
  }
}

function resetTrip() {
  clearInterval(tripTimer); tripTimer = null;
  tripActive = false; tripStartTime = null;
  tripDistance = 0; tripSpeedSum = 0; tripSpeedCount = 0;
  if (el('trip-time')) el('trip-time').textContent = '0:00';
  if (el('trip-dist')) el('trip-dist').textContent = '0.0';
  if (el('trip-avg'))  el('trip-avg').textContent  = '0';
  if (tripDistance > 0.1) saveToLog();
}

el('trip-reset')?.addEventListener('click', () => { resetTrip(); Sounds.play('tap'); });

// ── Журнал поездок ─────────────────────────────────────────
function saveToLog() {
  const log = loadLS('trip_log') || [];
  log.unshift({
    date: new Date().toLocaleDateString('ru', { day:'2-digit', month:'2-digit' }),
    time: new Date().toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit' }),
    dist: tripDistance.toFixed(1),
    avg:  tripSpeedCount > 0 ? Math.round(tripSpeedSum / tripSpeedCount) : 0,
    dur:  tripStartTime ? Math.floor((Date.now() - tripStartTime) / 60000) : 0,
  });
  if (log.length > 50) log.pop();
  saveLS('trip_log', log);
  renderLog();
}

function renderLog() {
  const list   = el('trip-log-list');
  const btnAll = el('btn-log-all');
  if (!list) return;
  const log = loadLS('trip_log') || [];
  if (!log.length) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:14px;text-align:center;padding:20px">Нет поездок</div>';
    if (btnAll) btnAll.style.display = 'none';
    return;
  }
  list.innerHTML = log.slice(0, 2).map(e => `
    <div class="rw-log-item">
      <div class="rw-log-date">${e.date} ${e.time}</div>
      <div class="rw-log-stats">${e.dist} км · ${e.avg} км/ч · ${e.dur} мин</div>
    </div>`).join('');
  if (btnAll) btnAll.style.display = log.length > 2 ? '' : 'none';
}

function openLogDrawer() {
  Sounds.play('open');
  const log  = loadLS('trip_log') || [];
  const full = el('trip-log-full');
  if (!full) return;
  full.innerHTML = log.map(e => `
    <div class="rw-log-item">
      <div class="rw-log-date">${e.date} ${e.time}</div>
      <div class="rw-log-stats">${e.dist} км · ${e.avg} км/ч · ${e.dur} мин</div>
    </div>`).join('');
  el('trip-log-drawer').classList.add('open');
}

el('btn-log-all')?.addEventListener('click', openLogDrawer);
el('trip-log-close')?.addEventListener('click', () => { Sounds.play('close'); el('trip-log-drawer').classList.remove('open'); });

renderLog();

// Экспортируем для events.js
window._updateTripSpeed = updateTripSpeed;

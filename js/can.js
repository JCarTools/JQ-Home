'use strict';

// ── CAN-данные автомобиля ──────────────────────────────────
// Получаем через onAndroidEvent type='can'
// Возможный формат data:
// { rpm, coolant, fuel, voltage, oilTemp, oilPressure, speed, odometer }
// Все поля опциональны — показываем что есть

const canData = {
  rpm:         null,  // обороты двигателя
  coolant:     null,  // температура охлаждающей жидкости °C
  fuel:        null,  // уровень топлива %
  voltage:     null,  // напряжение бортсети В
  oilTemp:     null,  // температура масла °C
  oilPressure: null,  // давление масла
  odometer:    null,  // одометр км
  outsideTemp: null,  // температура за бортом °C
};

// ── Приём из Android ──────────────────────────────────────
window._onCanData = function(data) {
  if (!data) return;
  let updated = false;
  Object.keys(canData).forEach(key => {
    if (data[key] != null) { canData[key] = data[key]; updated = true; }
  });
  if (updated) renderCanCard();
};

// ── Рендер карточки ───────────────────────────────────────
function renderCanCard() {
  const grid = el('can-grid');
  if (!grid) return;

  const items = [
    { key: 'rpm',         label: 'Обороты',    unit: 'об/мин', icon: '⚙️',  warn: v => v > 6000 },
    { key: 'coolant',     label: 'Охлаждение', unit: '°C',     icon: '🌡️',  warn: v => v > 100  },
    { key: 'fuel',        label: 'Топливо',    unit: '%',      icon: '⛽',  warn: v => v < 15   },
    { key: 'voltage',     label: 'Бортсеть',   unit: 'В',      icon: '🔋',  warn: v => v < 11.5 },
    { key: 'oilTemp',     label: 'Масло',      unit: '°C',     icon: '🛢️',  warn: v => v > 130  },
    { key: 'oilPressure', label: 'Давл. масла',unit: 'бар',    icon: '📊',  warn: v => v < 1    },
    { key: 'odometer',    label: 'Одометр',    unit: 'км',     icon: '🛣️',  warn: () => false   },
    { key: 'outsideTemp', label: 'За бортом',  unit: '°C',     icon: '🌤️',  warn: v => v < 3    },
  ];

  grid.innerHTML = '';
  items.forEach(item => {
    const val = canData[item.key];
    const hasData = val != null;
    const isWarn = hasData && item.warn(val);

    const cell = document.createElement('div');
    cell.className = 'can-cell' + (isWarn ? ' can-warn' : '') + (!hasData ? ' can-no-data' : '');
    cell.innerHTML = `
      <div class="can-icon">${item.icon}</div>
      <div class="can-val">${hasData ? formatCanVal(item.key, val) : '—'}</div>
      <div class="can-unit">${hasData ? item.unit : ''}</div>
      <div class="can-label">${item.label}</div>`;
    grid.appendChild(cell);
  });

  // Показываем статус подключения
  const hasAny = Object.values(canData).some(v => v != null);
  const status = el('can-status');
  if (status) {
    status.textContent = hasAny ? '' : 'Нет данных от CAN';
    status.style.display = hasAny ? 'none' : '';
  }
}

function formatCanVal(key, val) {
  if (key === 'rpm')         return Math.round(val).toLocaleString('ru');
  if (key === 'voltage')     return parseFloat(val).toFixed(1);
  if (key === 'oilPressure') return parseFloat(val).toFixed(1);
  if (key === 'odometer')    return Math.round(val).toLocaleString('ru');
  return Math.round(val);
}

// ── Обработка hud-событий — некоторые ГУ шлют данные там ──
window._onHudCanExtras = function(data) {
  // Некоторые ГУ DesaySV передают доп. данные в hud
  let updated = false;
  if (data.outsideTemp != null) { canData.outsideTemp = data.outsideTemp; updated = true; }
  if (data.fuelLevel    != null) { canData.fuel        = data.fuelLevel;   updated = true; }
  if (data.voltage      != null) { canData.voltage     = data.voltage;     updated = true; }
  if (data.coolantTemp  != null) { canData.coolant     = data.coolantTemp; updated = true; }
  if (updated) renderCanCard();
};

// ── Init ──────────────────────────────────────────────────
renderCanCard();

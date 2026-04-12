'use strict';

// ── Навигация ──────────────────────────────────────────────
const TURN_ICONS = {
  2:  'icons/navi/turn_2_left.svg',
  3:  'icons/navi/turn_3_right.svg',
  4:  'icons/navi/turn_4_fork_left.svg',
  5:  'icons/navi/turn_5_fork_right.svg',
  6:  'icons/navi/turn_6_hard_left.svg',
  7:  'icons/navi/turn_7_hard_right.svg',
  8:  'icons/navi/turn_8_uturn_left.svg',
  9:  'icons/navi/turn_9_straight.svg',
  14: 'icons/navi/turn_14_radar.svg',
  15: 'icons/navi/turn_15_finish.svg',
  19: 'icons/navi/turn_19_uturn_right.svg',
  24: 'icons/navi/turn_24_roundabout.svg',
  49: 'icons/navi/turn_49_straight.svg',
  55: 'icons/navi/turn_55_roundabout_exit.svg',
};

function handleNaviData(data) {
  const active = !!data.naviOn;
  el('navi-active').style.display   = active ? '' : 'none';
  el('navi-inactive').style.display = active ? 'none' : '';

  if (active) {
    const iconSrc = TURN_ICONS[data.turnType] || TURN_ICONS[9];
    const turnDist = parseInt(data.turnDist) || 0;
    const arrowEl  = el('navi-arrow');
    const isFinish = data.turnType === 15;

    // Обновляем иконку манёвра
    const imgEl = document.getElementById('navi-arrow-img');
    if (imgEl) {
      imgEl.src = iconSrc;
      // Применяем CSS filter для перекраски в акцентный цвет
      imgEl.style.filter = getNaivFilterForAccent();
    }

    el('navi-finish-row').style.display = isFinish ? '' : 'none';
    el('navi-eta-row').style.display    = isFinish ? 'none' : '';

    if (isFinish) {
      el('navi-route-fill').style.width = '100%';
      el('navi-car').style.transition   = 'none';
      el('navi-car').style.left         = 'calc(100% - 20px)';
      return;
    }

    el('navi-distance').textContent = turnDist >= 1000 ? (turnDist/1000).toFixed(1)+' км' : turnDist+' м';
    el('navi-street').textContent   = data.nextRoad || '—';
    const remainNum = parseFloat((data.remainDist || '0').toString().replace(/[^\d.]/g, '')) || 0;
    el('navi-remain').textContent   = remainNum >= 1000 ? (remainNum/1000).toFixed(1)+' км' : remainNum+' м';

    const speedSign = el('navi-speed-sign');
    if (data.speedLimit && data.speedLimit > 0) {
      speedSign.style.display = 'flex';
      el('navi-speed-limit').textContent = data.speedLimit;
      el('navi-eta').textContent = data.speedLimit + ' км/ч';
    } else {
      speedSign.style.display = 'none';
      el('navi-eta').textContent = '—';
    }

    if (turnDist < 150) arrowEl.classList.add('pulse');
    else                arrowEl.classList.remove('pulse');

    const remain = parseFloat((data.remainDist || '').replace(/[^\d.]/g, '')) || 0;
    if (!window._naviMaxRemain || remain > window._naviMaxRemain) window._naviMaxRemain = remain;
    const pct = window._naviMaxRemain > 0 ? Math.max(0, Math.min(100, (1 - remain/window._naviMaxRemain)*100)) : 0;
    el('navi-route-fill').style.width = pct + '%';
    el('navi-car').style.left = `calc(${pct}% - 10px)`;
  } else {
    window._naviMaxRemain = 0;
    el('navi-route-fill').style.width = '0%';
    el('navi-car').style.transition = '';
    el('navi-car').style.left = '0%';
    el('navi-finish-row').style.display = 'none';
    el('navi-eta-row').style.display    = '';
    el('navi-arrow').classList.remove('pulse');
  }
}

// Кнопка завершения маршрута
el('btn-navi-finish').addEventListener('click', () => handleNaviData({ naviOn: false }));



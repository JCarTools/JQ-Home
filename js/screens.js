'use strict';

// ════════════════════════════════════════════════════════════
// SCREENS — мультиэкранный менеджер виджетов
// Виджеты: 'apps' | 'navi' | 'radar' | 'climate' | 'my' | 'player'
// Макс. 4 виджета на экран, макс. 5 экранов
// ════════════════════════════════════════════════════════════

const WIDGET_META = {
  apps:     { label: 'Приложения',       icon: 'icons/Apps.svg'    },
  navi:     { label: 'Навигация',        icon: 'icons/Navi.svg'    },
  radar:    { label: 'Антирадар',        icon: 'icons/Navi.svg'    },
  climate:  { label: 'Климат',           icon: 'icons/Setting.svg' },
  my:       { label: 'Мои приложения',   icon: 'icons/Plus.svg'    },
  player:   { label: 'Плеер',            icon: 'icons/Play.svg'    },
  contacts: { label: 'Быстрые контакты', icon: 'icons/Phone.svg'   },
  compass:  { label: 'Компас',           icon: 'icons/Navi.svg'    },
  notes:    { label: 'Заметки',          icon: 'icons/Plus.svg'    },
  profiles: { label: 'Профили',          icon: 'icons/Driver.svg'  },
};

const MAX_WIDGETS_PER_SCREEN = 4; // portrait
function getMaxWidgets() {
  return window.matchMedia('(orientation: landscape)').matches ? 3 : 4;
}
const MAX_SCREENS = 5;

const LAYOUT_VERSION = 2; // увеличь при несовместимых изменениях

const DEFAULT_LAYOUT = [
  { id: 'screen-0', widgets: ['apps', 'climate', 'my'] },
];
const DEFAULT_HIDDEN = ['navi', 'radar', 'player'];

// Загружаем с валидацией версии и лимитов
function loadLayout() {
  const saved = loadLS('screens_layout');
  const ver   = loadLS('screens_layout_ver');
  if (!saved || ver !== LAYOUT_VERSION) {
    saveLS('screens_layout_ver', LAYOUT_VERSION);
    return DEFAULT_LAYOUT;
  }
  // Обрезаем виджеты сверх лимита
  return saved.map(s => ({
    ...s,
    widgets: (s.widgets || []).slice(0, getMaxWidgets())
  }));
}

let screensLayout = loadLayout();
let screensHidden = loadLS('screens_hidden') || DEFAULT_HIDDEN;
let currentScreen = 0;
let editMode      = false;

const WIDGET_CARDS = {
  apps:     () => el('card-apps'),
  navi:     () => el('card-navi'),
  radar:    () => el('card-radar'),
  climate:  () => el('card-climate'),
  my:       () => el('card-my'),
  player:   () => el('card-player'),
  contacts: () => el('card-contacts'),
  compass:  () => el('card-compass'),
  notes:    () => el('card-notes'),
  profiles: () => el('card-profiles'),
};

function saveLayout() {
  saveLS('screens_layout', screensLayout);
  saveLS('screens_hidden', screensHidden);
}

// ── Рендер ────────────────────────────────────────────────
function renderScreens() {
  const viewport = el('screens-viewport');

  // Все карточки убираем в пул
  const pool = el('widget-pool');
  Object.values(WIDGET_CARDS).forEach(fn => {
    const card = fn();
    if (card) { card.style.display = 'none'; pool.appendChild(card); }
  });

  viewport.innerHTML = '';

  screensLayout.forEach((screen, idx) => {
    const screenEl = document.createElement('div');
    screenEl.className = 'screen';
    if (idx !== currentScreen) screenEl.classList.add('screen-offscreen');
    screenEl.dataset.idx = idx;

    const row = document.createElement('div');
    row.className = 'cards-row';

    // Занятые слоты — реальные карточки
    screen.widgets.forEach(wid => {
      const card = WIDGET_CARDS[wid]?.();
      if (!card) return;
      card.style.display = '';
      row.appendChild(card);
    });

    // Пустые слоты — заполняем до MAX
    const emptyCount = getMaxWidgets() - screen.widgets.length;
    for (let i = 0; i < emptyCount; i++) {
      const addSlot = document.createElement('div');
      addSlot.className = 'screen-add-slot';
      addSlot.innerHTML = `<span class="screen-add-icon">＋</span><span class="screen-add-label">Добавить</span>`;
      addSlot.addEventListener('click', () => {
        if (selectedWidget) {
          // Переносим выбранную карточку сюда
          const { wid: selWid, screenIdx: selScreen } = selectedWidget;
          clearSelection();
          if (selScreen === idx) {
            // Внутри экрана — просто перемещаем в конец
            const w = screensLayout[idx].widgets;
            w.splice(w.indexOf(selWid), 1);
            w.push(selWid);
            saveLayout();
            // Переставляем в DOM
            const card = WIDGET_CARDS[selWid]?.();
            if (card) addSlot.parentNode.insertBefore(card, addSlot);
          } else {
            moveWidgetToScreen(selWid, selScreen, idx);
          }
        } else {
          openWidgetPicker(idx);
        }
      });
      row.appendChild(addSlot);
    }

    screenEl.appendChild(row);
    viewport.appendChild(screenEl);
  });

  renderDots();
  if (editMode) renderEditOverlays();
}

// ── Точки ─────────────────────────────────────────────────
function renderDots() {
  const dots = el('screen-dots');
  dots.innerHTML = '';
  if (screensLayout.length <= 1) return;
  screensLayout.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'screen-dot' + (idx === currentScreen ? ' active' : '');
    dot.addEventListener('click', () => goToScreen(idx));
    dots.appendChild(dot);
  });
}

// ── Навигация ─────────────────────────────────────────────
function goToScreen(idx, animate = true) {
  const maxIdx = screensLayout.length - 1;
  idx = Math.max(0, Math.min(idx, maxIdx));
  const prev = currentScreen;
  currentScreen = idx;

  el('screens-viewport').querySelectorAll('.screen').forEach((s, i) => {
    if (i === idx) {
      s.classList.remove('screen-offscreen');
      if (animate && i !== prev) {
        s.style.animation = 'screenFadeIn 0.3s ease';
        s.addEventListener('animationend', () => s.style.animation = '', { once: true });
      }
    } else {
      s.classList.add('screen-offscreen');
    }
  });

  renderDots();
}

// ── Свайп ─────────────────────────────────────────────────
function bindViewportSwipe() {
  const zones = [el('middle'), el('screens-wrap'), el('bottom-bar'), el('screen-dots-row')].filter(Boolean);
  let startX = 0, startY = 0, tracking = false;

  const onStart = e => {
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    tracking = true;
  };
  const onEnd = e => {
    if (!tracking) return;
    tracking = false;
    const ex = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const ey = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const dx = ex - startX;
    const dy = ey - startY;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    // Горизонталь — смена экранов
    if (adx > ady && adx > 40) {
      if (dx < 0 && currentScreen < screensLayout.length - 1) goToScreen(currentScreen + 1);
      else if (dx > 0 && currentScreen > 0) goToScreen(currentScreen - 1);
      return;
    }

    // Вертикаль только на #middle
    if (ady > adx && ady > 60 && e.target?.closest?.('#middle')) {
      if (dy > 0) {
        // Свайп вниз → все приложения
        Sounds.play('open');
        el('btn-all-apps')?.click();
      } else {
        // Свайп вверх → настройки
        Sounds.play('open');
        el('btn-settings')?.click();
      }
    }
  };

  zones.forEach(zone => {
    zone.addEventListener('touchstart', onStart, { passive: true });
    zone.addEventListener('touchend',   onEnd);
    zone.addEventListener('mousedown',  onStart);
    zone.addEventListener('mouseup',    onEnd);
  });
}

// ── Добавить экран ────────────────────────────────────────
function addScreen() {
  if (screensLayout.length >= MAX_SCREENS) return;
  screensLayout.push({ id: 'screen-' + Date.now(), widgets: [] });
  saveLayout();
  renderScreens();
  goToScreen(screensLayout.length - 1);
  Sounds.play('open');
}

// ── Удалить экран ─────────────────────────────────────────
function removeScreen(idx) {
  if (screensLayout.length <= 1) return;
  // Виджеты переносим на экран 0
  screensLayout[idx].widgets.forEach(wid => {
    if (!screensLayout[0].widgets.includes(wid) && screensLayout[0].widgets.length < getMaxWidgets())
      screensLayout[0].widgets.push(wid);
    else
      screensHidden.push(wid);
  });
  screensLayout.splice(idx, 1);
  currentScreen = Math.min(currentScreen, screensLayout.length - 1);
  saveLayout();
  renderScreens();
  Sounds.play('close');
}

// ── Пикер виджетов ────────────────────────────────────────
function openWidgetPicker(screenIdx) {
  Sounds.play('open');
  const allPlaced = screensLayout.flatMap(s => s.widgets);
  const available = Object.keys(WIDGET_META).filter(wid => !allPlaced.includes(wid));

  const overlay = document.createElement('div');
  overlay.className = 'widget-picker-overlay';
  overlay.innerHTML = `
    <div class="widget-picker-box">
      <div class="widget-picker-header">
        <span class="widget-picker-title">Добавить виджет</span>
        <button class="drawer-close widget-picker-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div class="widget-picker-grid"></div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  const grid = overlay.querySelector('.widget-picker-grid');
  if (!available.length) {
    grid.innerHTML = `<div class="widget-picker-empty">Все виджеты уже размещены</div>`;
  } else {
    available.forEach(wid => {
      const meta = WIDGET_META[wid];
      const item = document.createElement('div');
      item.className = 'widget-picker-item';
      item.innerHTML = `<div class="widget-picker-icon"><img src="${meta.icon}"></div><div class="widget-picker-label">${meta.label}</div>`;
      item.addEventListener('click', () => { addWidgetToScreen(wid, screenIdx); close(); });
      grid.appendChild(item);
    });
  }

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
    Sounds.play('close');
  }
  overlay.querySelector('.widget-picker-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ── Добавить виджет ───────────────────────────────────────
function addWidgetToScreen(wid, screenIdx) {
  if (screensLayout[screenIdx].widgets.length >= getMaxWidgets()) return;
  screensHidden = screensHidden.filter(h => h !== wid);
  screensLayout.forEach(s => { s.widgets = s.widgets.filter(w => w !== wid); });
  screensLayout[screenIdx].widgets.push(wid);
  saveLayout();
  renderScreens();
  goToScreen(screenIdx, false);
}

// ── Убрать виджет ─────────────────────────────────────────
function removeWidgetFromScreen(wid, screenIdx) {
  screensLayout[screenIdx].widgets = screensLayout[screenIdx].widgets.filter(w => w !== wid);
  screensHidden.push(wid);
  saveLayout();

  // Убираем карточку из DOM и добавляем пустой слот
  const card = WIDGET_CARDS[wid]?.();
  if (card) {
    const row = card.parentNode;
    const pool = el('widget-pool');
    card.style.display = 'none';
    pool.appendChild(card);

    // Добавляем пустой слот на место
    const addSlot = document.createElement('div');
    addSlot.className = 'screen-add-slot';
    addSlot.innerHTML = `<span class="screen-add-icon">＋</span><span class="screen-add-label">Добавить</span>`;
    addSlot.addEventListener('click', () => {
      if (selectedWidget) {
        const { wid: selWid, screenIdx: selScreen } = selectedWidget;
        clearSelection();
        if (selScreen === screenIdx) {
          const w = screensLayout[screenIdx].widgets;
          w.splice(w.indexOf(selWid), 1);
          w.push(selWid);
          saveLayout();
          const selCard = WIDGET_CARDS[selWid]?.();
          if (selCard) addSlot.parentNode.insertBefore(selCard, addSlot);
        } else {
          moveWidgetToScreen(selWid, selScreen, screenIdx);
        }
      } else {
        openWidgetPicker(screenIdx);
      }
    });
    row?.appendChild(addSlot);
  }
}

// ── Переместить виджет ────────────────────────────────────
function moveWidgetToScreen(wid, fromIdx, toIdx) {
  if (screensLayout[toIdx].widgets.length >= getMaxWidgets()) return;
  screensLayout[fromIdx].widgets = screensLayout[fromIdx].widgets.filter(w => w !== wid);
  screensLayout[toIdx].widgets.push(wid);
  saveLayout();
  renderScreens();
  goToScreen(toIdx);
  Sounds.play('drop');
}

// ── Режим редактирования ──────────────────────────────────
function enterEditMode() {
  if (editMode) return;
  editMode = true;
  document.body.classList.add('screens-edit-mode');
  el('btn-edit-screens')?.classList.add('active');
  el('btn-edit-screens-side')?.classList.add('active');
  renderEditOverlays();
  el('edit-mode-bar').classList.add('visible');
  Sounds.play('select');
  navigator.vibrate?.(60);
}

function exitEditMode() {
  if (!editMode) return;
  editMode = false;
  document.body.classList.remove('screens-edit-mode');
  el('btn-edit-screens')?.classList.remove('active');
  el('btn-edit-screens-side')?.classList.remove('active');
  document.querySelectorAll('.widget-edit-overlay').forEach(o => o.remove());
  el('edit-mode-bar').classList.remove('visible');
  Sounds.play('close');
}

function renderEditOverlays() {
  document.querySelectorAll('.widget-edit-overlay').forEach(o => o.remove());
  clearSelection();

  screensLayout.forEach((screen, sIdx) => {
    screen.widgets.forEach(wid => {
      const card = WIDGET_CARDS[wid]?.();
      if (!card) return;

      const overlay = document.createElement('div');
      overlay.className = 'widget-edit-overlay';

      const hideBtn = document.createElement('button');
      hideBtn.className = 'widget-edit-btn widget-edit-hide';
      hideBtn.textContent = '✕';
      hideBtn.addEventListener('click', e => { e.stopPropagation(); removeWidgetFromScreen(wid, sIdx); });
      overlay.appendChild(hideBtn);

      card.appendChild(overlay);
      bindCardSelect(card, wid, sIdx);
    });
  });
}

// ── Выбор карточки: удержание → выбрана, тап на другую → переставить ──
let selectedWidget = null;

function bindCardSelect(card, wid, screenIdx) {
  let pressTimer = null;
  let didSelect = false; // флаг: удержание сработало

  const onDown = () => {
    didSelect = false;
    pressTimer = setTimeout(() => {
      pressTimer = null;
      didSelect = true;
      // Если уже выбрана другая — переставляем
      if (selectedWidget && (selectedWidget.wid !== wid || selectedWidget.screenIdx !== screenIdx)) {
        const { wid: selWid, screenIdx: selScreen } = selectedWidget;
        clearSelection();
        if (selScreen === screenIdx) swapWidgets(selScreen, selWid, wid);
        else moveWidgetToScreen(selWid, selScreen, screenIdx);
        return;
      }
      // Выбираем эту
      if (selectedWidget?.wid === wid) { clearSelection(); return; }
      selectedWidget = { wid, screenIdx, card };
      card.classList.add('card-selected');
      Sounds.play('select');
      navigator.vibrate?.(40);
    }, 400);
  };
  const onUp = () => { clearTimeout(pressTimer); pressTimer = null; };

  card.addEventListener('touchstart', onDown, { passive: true });
  card.addEventListener('touchend',   onUp);
  card.addEventListener('touchcancel',onUp);
  card.addEventListener('mousedown',  onDown);
  card.addEventListener('mouseup',    onUp);
  card.addEventListener('mouseleave', onUp);

  // Обычный тап = переместить выбранную сюда
  // Игнорируем если только что сработало удержание (didSelect)
  card.addEventListener('click', e => {
    if (didSelect) { didSelect = false; return; } // удержание уже обработано
    if (!selectedWidget) return;
    if (e.target.closest('.widget-edit-btn')) return;
    const { wid: selWid, screenIdx: selScreen } = selectedWidget;
    if (selWid === wid && selScreen === screenIdx) { clearSelection(); return; }
    clearSelection();
    if (selScreen === screenIdx) swapWidgets(selScreen, selWid, wid);
    else moveWidgetToScreen(selWid, selScreen, screenIdx);
  });
}

function clearSelection() {
  if (selectedWidget) {
    selectedWidget.card.classList.remove('card-selected');
    selectedWidget = null;
  }
}

function swapWidgets(screenIdx, widA, widB) {
  const w = screensLayout[screenIdx].widgets;
  const iA = w.indexOf(widA), iB = w.indexOf(widB);
  if (iA < 0 || iB < 0) return;
  [w[iA], w[iB]] = [w[iB], w[iA]];
  saveLayout();

  // Переставляем карточки в DOM без полного ре-рендера
  const cardA = WIDGET_CARDS[widA]?.();
  const cardB = WIDGET_CARDS[widB]?.();
  if (cardA && cardB) {
    const row = cardA.parentNode;
    const nextA = cardA.nextSibling;
    const nextB = cardB.nextSibling;
    if (nextA === cardB) {
      row.insertBefore(cardB, cardA);
    } else if (nextB === cardA) {
      row.insertBefore(cardA, cardB);
    } else {
      if (nextA) row.insertBefore(cardB, nextA); else row.appendChild(cardB);
      if (nextB) row.insertBefore(cardA, nextB); else row.appendChild(cardA);
    }
  }

  Sounds.play('drop');
}

// ── Кнопка редактирования экранов ────────────────────────
el('btn-add-screen')?.addEventListener('click', () => addScreen());
el('btn-edit-screens')?.addEventListener('click', () => {
  editMode ? exitEditMode() : enterEditMode();
});

el('btn-delete-screen')?.addEventListener('click', () => removeScreen(currentScreen));
el('btn-exit-edit')?.addEventListener('click', exitEditMode);

// ── Init ──────────────────────────────────────────────────
renderScreens();
bindViewportSwipe();

// При смене ориентации — перерендер (лимит виджетов меняется)
window.matchMedia('(orientation: landscape)').addEventListener('change', () => {
  renderScreens();
});

// Подсказка жестов — показываем один раз при первом запуске
if (!loadLS('gesture_hint_shown')) {
  setTimeout(() => {
    const hint = el('gesture-hint');
    if (hint) {
      hint.classList.add('visible');
      setTimeout(() => {
        hint.classList.remove('visible');
        saveLS('gesture_hint_shown', true);
      }, 4000);
    }
  }, 2000);
}

'use strict';

// ── Уведомления ────────────────────────────────────────────
// Получаем через onAndroidEvent type='notification'
// Формат data: { pkg, title, text, icon(base64), time }
// Если API не поддерживает — показываем заглушку

const MAX_NOTIFS = 20;
let notifications = loadLS('notif_cache') || [];

function saveNotifs() { saveLS('notif_cache', notifications.slice(0, MAX_NOTIFS)); }

// ── Приём из Android ──────────────────────────────────────
window._onNotification = function(data) {
  if (!data?.title && !data?.text) return;
  const notif = {
    id:    Date.now(),
    pkg:   data.pkg   || '',
    title: data.title || '',
    text:  data.text  || '',
    icon:  data.icon  || null,
    time:  data.time  || Date.now(),
    read:  false,
  };
  // Дедупликация — не добавляем одинаковые подряд
  const last = notifications[0];
  if (last && last.pkg === notif.pkg && last.title === notif.title && last.text === notif.text) return;

  notifications.unshift(notif);
  if (notifications.length > MAX_NOTIFS) notifications.pop();
  saveNotifs();
  renderNotifCard();
  // Мигаем счётчиком
  updateNotifBadge();
};

// ── Счётчик непрочитанных ─────────────────────────────────
function unreadCount() { return notifications.filter(n => !n.read).length; }

function updateNotifBadge() {
  const badge = el('notif-badge');
  const count = unreadCount();
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : count;
  badge.style.display = count > 0 ? '' : 'none';
}

// ── Рендер карточки ───────────────────────────────────────
function renderNotifCard() {
  const list = el('notif-list');
  if (!list) return;
  const recent = notifications.slice(0, 4);

  if (!recent.length) {
    list.innerHTML = `<div class="notif-empty">Нет уведомлений</div>`;
    return;
  }

  list.innerHTML = '';
  recent.forEach(n => {
    const item = document.createElement('div');
    item.className = 'notif-item' + (n.read ? ' read' : '');
    const timeStr = formatNotifTime(n.time);
    item.innerHTML = `
      <div class="notif-icon-wrap">
        ${n.icon
          ? `<img class="notif-icon" src="data:image/png;base64,${n.icon}" alt="">`
          : `<div class="notif-icon-placeholder">${appInitial(n.pkg)}</div>`}
        ${!n.read ? '<div class="notif-dot"></div>' : ''}
      </div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-text">${n.text}</div>
      </div>
      <div class="notif-time">${timeStr}</div>`;
    item.addEventListener('click', () => {
      n.read = true;
      saveNotifs();
      updateNotifBadge();
      renderNotifCard();
      if (n.pkg) runApp(n.pkg);
    });
    list.appendChild(item);
  });

  updateNotifBadge();
}

// ── Шторка всех уведомлений ───────────────────────────────
function openNotifDrawer() {
  Sounds.play('open');
  // Помечаем все как прочитанные
  notifications.forEach(n => n.read = true);
  saveNotifs();
  updateNotifBadge();
  renderNotifCard();

  const list = el('notif-drawer-list');
  if (!list) return;
  list.innerHTML = '';

  if (!notifications.length) {
    list.innerHTML = `<div class="notif-empty" style="padding:32px;text-align:center">Нет уведомлений</div>`;
  } else {
    notifications.forEach(n => {
      const item = document.createElement('div');
      item.className = 'note-drawer-item'; // переиспользуем стиль
      const timeStr = new Date(n.time).toLocaleString('ru', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px">
          ${n.icon
            ? `<img style="width:36px;height:36px;border-radius:10px" src="data:image/png;base64,${n.icon}" alt="">`
            : `<div style="width:36px;height:36px;border-radius:10px;background:var(--accent-20);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:var(--accent)">${appInitial(n.pkg)}</div>`}
          <div style="flex:1;min-width:0">
            <div class="note-drawer-text" style="font-size:16px">${n.title}</div>
            <div style="font-size:14px;color:var(--overlay-text-sub);margin-top:2px">${n.text}</div>
          </div>
          <div style="font-size:12px;color:var(--overlay-text-sub);flex-shrink:0">${timeStr}</div>
        </div>`;
      item.addEventListener('click', () => { if (n.pkg) runApp(n.pkg); });
      list.appendChild(item);
    });
  }

  // Кнопка очистить
  const clearBtn = el('notif-clear-btn');
  if (clearBtn) clearBtn.style.display = notifications.length ? '' : 'none';

  el('notif-drawer').classList.add('open');
}

// ── Вспомогательные ───────────────────────────────────────
function appInitial(pkg) {
  if (!pkg) return '?';
  const parts = pkg.split('.');
  return (parts[parts.length - 1] || parts[0] || '?')[0].toUpperCase();
}

function formatNotifTime(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' });
}

// ── Обработчики ───────────────────────────────────────────
el('notif-open-btn')?.addEventListener('click', openNotifDrawer);
el('notif-drawer-close')?.addEventListener('click', () => {
  Sounds.play('close');
  el('notif-drawer').classList.remove('open');
});
el('notif-clear-btn')?.addEventListener('click', () => {
  notifications = [];
  saveNotifs();
  updateNotifBadge();
  renderNotifCard();
  el('notif-drawer-list').innerHTML = `<div class="notif-empty" style="padding:32px;text-align:center">Нет уведомлений</div>`;
  el('notif-clear-btn').style.display = 'none';
  Sounds.play('close');
});

// ── Init ──────────────────────────────────────────────────
renderNotifCard();
updateNotifBadge();

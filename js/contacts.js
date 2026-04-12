'use strict';

// ── Быстрые контакты ───────────────────────────────────────
// Хранение: localStorage 'quick_contacts' → [{name, phone, color, initials}]

const CONTACT_COLORS = ['#1c7c3a','#c45f00','#b02020','#0055b3','#8b5cf6','#ec4899'];

function getContacts() {
  return loadLS('quick_contacts') || [];
}
function saveContacts(list) {
  saveLS('quick_contacts', list);
}

// ── Рендер карточки ───────────────────────────────────────
function renderContactsCard() {
  const grid = document.querySelector('#card-contacts .contacts-grid');
  if (!grid) return;
  const contacts = getContacts();
  grid.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const c = contacts[i];
    const slot = document.createElement('div');
    slot.className = 'contact-slot' + (c ? '' : ' contact-slot-empty');
    slot.dataset.idx = i;

    if (c) {
      slot.innerHTML = `
        <div class="contact-avatar" style="background:${c.color}">${c.initials}</div>
        <div class="contact-name">${c.name}</div>`;

      let longPressed = false, t = null;
      const startPress = () => {
        longPressed = false;
        t = setTimeout(() => { longPressed = true; openContactEditor(i); }, 600);
      };
      const cancelPress = () => clearTimeout(t);

      slot.addEventListener('touchstart', startPress, { passive: true });
      slot.addEventListener('touchend',   cancelPress);
      slot.addEventListener('touchcancel',cancelPress);
      slot.addEventListener('mousedown',  startPress);
      slot.addEventListener('mouseup',    cancelPress);
      slot.addEventListener('mouseleave', cancelPress);
      slot.addEventListener('click', () => { if (!longPressed) callContact(c); });
    } else {
      slot.innerHTML = `
        <div class="contact-avatar contact-avatar-add"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg></div>
        <div class="contact-name">Добавить</div>`;
      slot.addEventListener('click', () => openContactEditor(i));
    }
    grid.appendChild(slot);
  }
}

function callContact(c) {
  Sounds.play('tap');
  const phone = c.phone.replace(/\D/g, '');

  // Способ 1: runEnum с командой звонка (если ГУ поддерживает)
  try { run('CALL_' + phone); } catch(e) {}

  // Способ 2: запустить приложение телефона
  try { runApp('com.desaysv.bluetooth.phone'); } catch(e) {}

  // Способ 3: tel: URI
  try { window.location.href = 'tel:' + phone; } catch(e) {}

  // Копируем номер в буфер — пользователь может вставить вручную
  try { navigator.clipboard?.writeText(c.phone); } catch(e) {}

  // Показываем номер на экране как подсказку
  const toast = document.createElement('div');
  toast.className = 'preset-toast';
  toast.innerHTML = `<span class="preset-toast-emoji">📞</span><span>${c.name}: <b>${c.phone}</b></span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 350); }, 4000);
}

// ── Редактор контакта ─────────────────────────────────────
let editingContactIdx = null;

function openContactEditor(idx) {
  Sounds.play('open');
  editingContactIdx = idx;
  const contacts = getContacts();
  const c = contacts[idx] || {};

  const overlay = document.createElement('div');
  overlay.className = 'contact-editor-overlay';
  overlay.innerHTML = `
    <div class="contact-editor-box">
      <div class="contact-editor-header">
        <span class="contact-editor-title">${c.name ? 'Редактировать' : 'Новый контакт'}</span>
        <button class="drawer-close contact-editor-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>

      <div class="contact-editor-preview">
        <div class="contact-avatar contact-avatar-lg" id="ce-avatar" style="background:${c.color || CONTACT_COLORS[idx % CONTACT_COLORS.length]}">${c.initials || '?'}</div>
      </div>

      <div class="contact-editor-colors" id="ce-colors"></div>

      <div class="contact-editor-fields">
        <input class="contact-input" id="ce-name"  type="text"  placeholder="Имя" value="${c.name  || ''}" maxlength="20">
        <input class="contact-input" id="ce-phone" type="tel"   placeholder="Номер телефона" value="${c.phone || ''}" inputmode="tel">
      </div>

      <div class="contact-editor-footer">
        ${c.name ? '<button class="contact-btn-delete">Удалить</button>' : ''}
        <button class="contact-btn-save">Сохранить</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Цвета
  let selectedColor = c.color || CONTACT_COLORS[idx % CONTACT_COLORS.length];
  const colorsEl = overlay.querySelector('#ce-colors');
  CONTACT_COLORS.forEach(color => {
    const dot = document.createElement('div');
    dot.className = 'contact-color-dot' + (color === selectedColor ? ' active' : '');
    dot.style.background = color;
    dot.addEventListener('click', () => {
      selectedColor = color;
      colorsEl.querySelectorAll('.contact-color-dot').forEach(d => d.classList.toggle('active', d.style.background === color || d.style.backgroundColor === color));
      overlay.querySelector('#ce-avatar').style.background = color;
      Sounds.play('tap');
    });
    colorsEl.appendChild(dot);
  });

  // Обновляем инициалы при вводе имени
  overlay.querySelector('#ce-name').addEventListener('input', e => {
    const initials = getInitials(e.target.value);
    overlay.querySelector('#ce-avatar').textContent = initials || '?';
  });

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
    Sounds.play('close');
  }

  overlay.querySelector('.contact-editor-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('.contact-btn-save').addEventListener('click', () => {
    const name  = overlay.querySelector('#ce-name').value.trim();
    const phone = overlay.querySelector('#ce-phone').value.trim();
    if (!name || !phone) return;
    const list = getContacts();
    while (list.length <= idx) list.push(null);
    list[idx] = { name, phone, color: selectedColor, initials: getInitials(name) };
    saveContacts(list.filter(Boolean));
    renderContactsCard();
    close();
    Sounds.play('drop');
  });

  overlay.querySelector('.contact-btn-delete')?.addEventListener('click', () => {
    const list = getContacts();
    list.splice(idx, 1);
    saveContacts(list);
    renderContactsCard();
    close();
    Sounds.play('close');
  });
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

// ── Init ──────────────────────────────────────────────────
renderContactsCard();

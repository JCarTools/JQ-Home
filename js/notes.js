'use strict';

// ── Заметки ────────────────────────────────────────────────
// Хранение: localStorage 'quick_notes' → [{id, text, ts}]
// Максимум 10 заметок

const MAX_NOTES = 10;

function getNotes() { return loadLS('quick_notes') || []; }
function saveNotes(list) { saveLS('quick_notes', list); }

function renderNotesCard() {
  const wrap = el('notes-list');
  if (!wrap) return;
  const notes = getNotes();
  wrap.innerHTML = '';

  if (!notes.length) {
    wrap.innerHTML = `<div class="notes-empty">Нет заметок</div>`;
  } else {
    notes.slice(0, 3).forEach(note => {
      const item = document.createElement('div');
      item.className = 'note-item';
      item.innerHTML = `
        <div class="note-text">${note.text}</div>
        <button class="note-del" data-id="${note.id}">✕</button>`;
      item.querySelector('.note-del').addEventListener('click', e => {
        e.stopPropagation();
        deleteNote(note.id);
        Sounds.play('close');
      });
      item.addEventListener('click', () => openNotesDrawer());
      wrap.appendChild(item);
    });
    if (notes.length > 3) {
      const more = document.createElement('div');
      more.className = 'notes-more';
      more.textContent = `Ещё ${notes.length - 3}...`;
      more.addEventListener('click', openNotesDrawer);
      wrap.appendChild(more);
    }
  }
}

function deleteNote(id) {
  saveNotes(getNotes().filter(n => n.id !== id));
  renderNotesCard();
  renderNotesDrawer();
}

// ── Шторка всех заметок ───────────────────────────────────
function openNotesDrawer() {
  Sounds.play('open');
  renderNotesDrawer();
  el('notes-drawer').classList.add('open');
}

function renderNotesDrawer() {
  const list = el('notes-drawer-list');
  if (!list) return;
  const notes = getNotes();
  list.innerHTML = '';

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = 'note-drawer-item';
    const d = new Date(note.ts);
    const dateStr = d.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' })
                  + ' ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
      <div class="note-drawer-text">${note.text}</div>
      <div class="note-drawer-meta">
        <span class="note-drawer-date">${dateStr}</span>
        <button class="note-del-drawer" data-id="${note.id}">🗑️</button>
      </div>`;
    item.querySelector('.note-del-drawer').addEventListener('click', () => {
      deleteNote(note.id);
      Sounds.play('close');
    });
    list.appendChild(item);
  });

  if (!notes.length) {
    list.innerHTML = `<div class="notes-empty" style="padding:32px;text-align:center">Нет заметок</div>`;
  }
}

// ── Добавить заметку ──────────────────────────────────────
function addNote(text) {
  text = text.trim();
  if (!text) return;
  const notes = getNotes();
  notes.unshift({ id: Date.now(), text, ts: Date.now() });
  if (notes.length > MAX_NOTES) notes.pop();
  saveNotes(notes);
  renderNotesCard();
  renderNotesDrawer();
  Sounds.play('drop');
}

// ── Обработчики ───────────────────────────────────────────
el('notes-add-btn')?.addEventListener('click', () => {
  const input = el('notes-input');
  if (input?.value.trim()) { addNote(input.value); input.value = ''; }
});

el('notes-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    addNote(e.target.value);
    e.target.value = '';
  }
});

el('notes-open-btn')?.addEventListener('click', openNotesDrawer);
el('notes-drawer-close')?.addEventListener('click', () => {
  Sounds.play('close');
  el('notes-drawer').classList.remove('open');
});

// ── Init ──────────────────────────────────────────────────
renderNotesCard();

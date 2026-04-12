'use strict';

// ── Профили водителя ───────────────────────────────────────
// Профиль сохраняет снимок всех настроек и восстанавливает их

const MAX_PROFILES = 5;
const PROFILE_EMOJIS = ['🧑','👩','👨','🧔','👴','👵'];

function getProfiles() { return loadLS('driver_profiles') || []; }
function saveProfiles(list) { saveLS('driver_profiles', list); }
function getActiveProfileId() { return loadLS('active_profile_id'); }
function setActiveProfileId(id) { saveLS('active_profile_id', id); }

// ── Снимок текущего состояния ─────────────────────────────
function captureSnapshot() {
  return {
    cfg:            loadLS('launcher_cfg'),
    screens_layout: loadLS('screens_layout'),
    screens_hidden: loadLS('screens_hidden'),
    climate_config: loadLS('climate_config'),
    apps_config:    loadLS('apps_config'),
    climate_presets:loadLS('climate_presets'),
    quick_contacts: loadLS('quick_contacts'),
    media_sources:  loadLS('media_sources'),
    wallpaper_path: loadLS('wallpaper_path'), // только путь, не base64
    card_order:     loadLS('card_order'),
  };
}

// ── Восстановление снимка ─────────────────────────────────
function applySnapshot(snap) {
  if (!snap) return;
  Object.entries(snap).forEach(([key, val]) => {
    if (val !== null && val !== undefined) saveLS(key, val);
  });

  const cfg = snap.cfg;
  if (cfg) {
    if (cfg.theme)  applyTheme(cfg.theme);
    if (cfg.accent) applyAccent(cfg.accent);
  }

  // Восстанавливаем обои по пути
  if (snap.wallpaper_path) {
    const path = snap.wallpaper_path;
    if (path.startsWith('img/')) {
      // Встроенные обои
      el('bg').style.backgroundImage = `url(${path})`;
      localStorage.removeItem('wallpaper_b64');
    } else {
      // Файл с устройства — пробуем загрузить через API
      try {
        const b64 = window.androidApi?.getFile?.(TOKEN, path);
        if (b64) {
          const ext = path.split('.').pop().toLowerCase();
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          el('bg').style.backgroundImage = `url(data:${mime};base64,${b64})`;
          saveLS('wallpaper_b64', b64);
        }
      } catch(e) {}
    }
  }

  if (typeof renderClimateCard  === 'function') renderClimateCard();
  if (typeof renderContactsCard === 'function') renderContactsCard();
  if (typeof renderMediaCard    === 'function') renderMediaCard();
  if (typeof renderPresetStrip  === 'function') renderPresetStrip();
  window._reloadScreensLayout?.();
}

// ── Рендер карточки профилей ──────────────────────────────
function renderProfilesCard() {
  const wrap = el('profiles-list');
  if (!wrap) return;
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  wrap.innerHTML = '';

  profiles.forEach(p => {
    const btn = document.createElement('div');
    btn.className = 'profile-btn' + (p.id === activeId ? ' active' : '');
    btn.innerHTML = `
      <div class="profile-emoji">${p.emoji}</div>
      <div class="profile-name">${p.name}</div>
      ${p.id === activeId ? '<div class="profile-active-dot"></div>' : ''}`;

    btn.addEventListener('click', () => activateProfile(p.id));

    let t = null;
    btn.addEventListener('touchstart', () => { t = setTimeout(() => openProfileEditor(p), 600); }, { passive: true });
    btn.addEventListener('touchend',   () => clearTimeout(t));
    btn.addEventListener('mousedown',  () => { t = setTimeout(() => openProfileEditor(p), 600); });
    btn.addEventListener('mouseup',    () => clearTimeout(t));
    btn.addEventListener('mouseleave', () => clearTimeout(t));

    wrap.appendChild(btn);
  });

  // Кнопка добавить
  if (profiles.length < MAX_PROFILES) {
    const addBtn = document.createElement('div');
    addBtn.className = 'profile-btn profile-btn-add';
    addBtn.innerHTML = `<div class="profile-emoji" style="opacity:0.4">＋</div><div class="profile-name">Добавить</div>`;
    addBtn.addEventListener('click', () => openProfileEditor(null));
    wrap.appendChild(addBtn);
  }
}

// ── Активировать профиль ──────────────────────────────────
function activateProfile(id) {
  const profiles = getProfiles();
  const p = profiles.find(p => p.id === id);
  if (!p) return;

  setActiveProfileId(id);
  applySnapshot(p.snapshot);
  renderProfilesCard();
  Sounds.play('select');
  navigator.vibrate?.(40);

  // Тост
  const toast = document.createElement('div');
  toast.className = 'preset-toast';
  toast.innerHTML = `<span class="preset-toast-emoji">${p.emoji}</span><span>Профиль <b>${p.name}</b></span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 350); }, 2000);
}

// ── Редактор профиля ──────────────────────────────────────
function openProfileEditor(profile) {
  Sounds.play('open');
  const isNew = !profile;

  const overlay = document.createElement('div');
  overlay.className = 'contact-editor-overlay';
  overlay.innerHTML = `
    <div class="contact-editor-box">
      <div class="contact-editor-header">
        <span class="contact-editor-title">${isNew ? 'Новый профиль' : 'Редактировать'}</span>
        <button class="drawer-close contact-editor-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>

      <div class="preset-emoji-picker" id="profile-emoji-picker-${Date.now()}"></div>

      <div class="contact-editor-fields">
        <input class="contact-input profile-name-field" type="text"
          placeholder="Имя водителя" value="${profile?.name || ''}" maxlength="20">
      </div>

      <div class="profile-editor-hint">
        Профиль сохранит текущие настройки: тему, обои, экраны, климат, контакты
      </div>

      <div class="contact-editor-footer">
        ${!isNew ? '<button class="contact-btn-delete profile-delete-btn">Удалить</button>' : ''}
        <button class="contact-btn-save profile-save-btn">${isNew ? 'Создать' : 'Обновить'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  // Эмодзи
  let selectedEmoji = profile?.emoji || PROFILE_EMOJIS[0];
  const picker = overlay.querySelector('.preset-emoji-picker');
  PROFILE_EMOJIS.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn' + (emoji === selectedEmoji ? ' active' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      selectedEmoji = emoji;
      picker.querySelectorAll('.emoji-btn').forEach(b => b.classList.toggle('active', b.textContent === emoji));
      Sounds.play('tap');
    });
    picker.appendChild(btn);
  });

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 250);
    Sounds.play('close');
  }

  overlay.querySelector('.contact-editor-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('.profile-save-btn').addEventListener('click', e => {
    e.stopPropagation();
    const nameInput = overlay.querySelector('.profile-name-field');
    const name = nameInput?.value?.trim();
    if (!name) {
      nameInput?.classList.add('input-error');
      setTimeout(() => nameInput?.classList.remove('input-error'), 800);
      return;
    }

    try {
      const profiles = getProfiles();
      if (isNew) {
        const newProfile = {
          id: 'profile-' + Date.now(),
          name,
          emoji: selectedEmoji,
          snapshot: captureSnapshot()
        };
        profiles.push(newProfile);
        saveProfiles(profiles);
        setActiveProfileId(newProfile.id);
      } else {
        const idx = profiles.findIndex(p => p.id === profile.id);
        if (idx >= 0) {
          profiles[idx] = { ...profiles[idx], name, emoji: selectedEmoji, snapshot: captureSnapshot() };
          saveProfiles(profiles);
        }
      }
      renderProfilesCard();
      close();
      Sounds.play('drop');
    } catch(err) {
      console.error('Profile save error:', err);
      // Показываем ошибку прямо в кнопке
      const btn = overlay.querySelector('.profile-save-btn');
      if (btn) { btn.textContent = 'Ошибка: ' + err.message; btn.style.background = '#ef4444'; }
    }
  });

  overlay.querySelector('.profile-delete-btn')?.addEventListener('click', e => {
    e.stopPropagation();
    const profiles = getProfiles().filter(p => p.id !== profile.id);
    saveProfiles(profiles);
    if (getActiveProfileId() === profile.id) setActiveProfileId(null);
    renderProfilesCard();
    close();
    Sounds.play('close');
  });
}

// ── Хук для screens.js — перезагрузить layout ─────────────
window._reloadScreensLayout = function() {
  if (typeof loadLayout === 'function') {
    screensLayout = loadLayout();
    screensHidden = loadLS('screens_hidden') || DEFAULT_HIDDEN;
    renderScreens();
  }
};

// ── Init ──────────────────────────────────────────────────
renderProfilesCard();

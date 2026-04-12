'use strict';

// ── Звуки (Web Audio API) ──────────────────────────────────
const Sounds = (() => {
  let actx = null;
  function ac() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); return actx; }

  // Базовый генератор тона
  function tone(freq, endFreq, dur, type, vol, delay = 0) {
    try {
      const ctx = ac();
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
      // Усиливаем в 4 раза — для автомобильной акустики
      const adjustedVol = Math.min(1.0, vol * 4.0 * (cfg.soundVolume || 0.7));
      gain.gain.setValueAtTime(adjustedVol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
    } catch(e) {}
  }

  // ── Стили ──────────────────────────────────────────────
  const STYLES = {

    // Минимал — тихие, короткие, нейтральные
    minimal: {
      tap:    () => tone(600, 400, 0.04, 'sine', 0.05),
      toggle: () => tone(500, 500, 0.03, 'sine', 0.04),
      open:   () => tone(400, 600, 0.1,  'sine', 0.05),
      close:  () => tone(600, 400, 0.08, 'sine', 0.05),
      select: () => tone(700, 900, 0.08, 'sine', 0.06),
      drop:   () => tone(900, 600, 0.08, 'sine', 0.06),
      radar:  () => { tone(800, 800, 0.06, 'sine', 0.08); tone(800, 800, 0.06, 'sine', 0.08, 0.1); },
    },

    // Стандарт — сбалансированные, приятные
    standard: {
      tap:    () => tone(800, 400, 0.06, 'sine', 0.08),
      toggle: () => tone(600, 600, 0.05, 'square', 0.04),
      open:   () => tone(300, 600, 0.18, 'sine', 0.07),
      close:  () => tone(600, 300, 0.15, 'sine', 0.07),
      select: () => { tone(500, 900, 0.12, 'sine', 0.1); },
      drop:   () => { tone(900, 500, 0.1, 'sine', 0.1); },
      radar:  () => { tone(880, 880, 0.08, 'sine', 0.12); tone(1100, 1100, 0.08, 'sine', 0.12, 0.12); },
    },

    // Футуристик — электронные, с эффектами
    futuristic: {
      tap: () => {
        tone(1200, 600, 0.05, 'sawtooth', 0.04);
        tone(600,  300, 0.05, 'sine',     0.03, 0.04);
      },
      toggle: () => {
        tone(400, 1200, 0.08, 'square', 0.05);
      },
      open: () => {
        tone(200, 800,  0.15, 'sawtooth', 0.06);
        tone(800, 1200, 0.1,  'sine',     0.04, 0.12);
      },
      close: () => {
        tone(1200, 200, 0.15, 'sawtooth', 0.06);
      },
      select: () => {
        tone(400,  1600, 0.1,  'sawtooth', 0.07);
        tone(1600, 800,  0.08, 'sine',     0.04, 0.08);
      },
      drop: () => {
        tone(1600, 400, 0.12, 'sawtooth', 0.07);
        tone(400,  800, 0.06, 'sine',     0.04, 0.1);
      },
      radar: () => {
        tone(1000, 1000, 0.06, 'square', 0.1);
        tone(1000, 1000, 0.06, 'square', 0.1, 0.1);
        tone(1400, 1400, 0.08, 'square', 0.1, 0.22);
      },
    },
  };

  function play(type) {
    if (!cfg.sounds) return;
    const style = STYLES[cfg.soundStyle] || STYLES.standard;
    const fn = style[type];
    if (fn) fn();
  }

  return { play };
})();

// Разблокируем AudioContext первым тапом
document.addEventListener('touchstart', () => {
  try { new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
}, { once: true, passive: true });

function addTapSound(selector, sound = 'tap') {
  document.querySelectorAll(selector).forEach(el => {
    el.addEventListener('click', () => Sounds.play(sound));
  });
}

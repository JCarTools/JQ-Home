'use strict';

// ── Анимированные обои ─────────────────────────────────────
const BgAnimations = (() => {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let animId   = null;
  let current  = null;
  let t        = 0;

  function resize() {
    canvas.width  = window.innerWidth  + 60;
    canvas.height = window.innerHeight + 60;
  }
  window.addEventListener('resize', resize);
  resize();

  function getAccent() {
    const c = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#294EF1';
    const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
    // Светлее и темнее
    const light = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)}`;
    const dark  = `rgba(${Math.max(r-60,0)},${Math.max(g-60,0)},${Math.max(b-60,0)}`;
    const base  = `rgba(${r},${g},${b}`;
    return { r, g, b, base, light, dark };
  }

  // Фон из акцента
  function fillBg(a) {
    const W = canvas.width, H = canvas.height;
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, `${a.dark},1)`);
    bg.addColorStop(0.5, `${a.base},0.7)`);
    bg.addColorStop(1, `${a.dark},1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 1. Северное сияние ──────────────────────────────────
  // Горизонтальные полосы тумана, медленно перетекающие по небу
  function aurora() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);

    // Чёрное небо
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, W, H);

    // Звёзды — мелкие, много
    for (let i = 0; i < 120; i++) {
      const sx = ((i * 173.1 + 7) % W);
      const sy = ((i * 91.7 + 3) % (H * 0.7));
      const sa = 0.2 + 0.6 * Math.abs(Math.sin(t * 0.3 + i * 0.8));
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6 + (i % 4) * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${sa})`;
      ctx.fill();
    }

    // Несколько широких горизонтальных лент авроры
    const bands = [
      { yFrac: 0.30, hFrac: 0.18, speed: 0.07, phase: 0 },
      { yFrac: 0.42, hFrac: 0.12, speed: 0.05, phase: 1.5 },
      { yFrac: 0.52, hFrac: 0.20, speed: 0.09, phase: 3.0 },
      { yFrac: 0.62, hFrac: 0.10, speed: 0.06, phase: 4.5 },
    ];

    bands.forEach((b, bi) => {
      // Каждая лента — набор вертикальных полос с синусоидальной яркостью
      const segments = 80;
      for (let s = 0; s < segments; s++) {
        const xFrac = s / segments;
        const x = xFrac * W;
        const segW = W / segments + 1;

        // Яркость сегмента — волна по горизонтали + время
        const bright = Math.max(0,
          Math.sin(xFrac * Math.PI * 6 + t * b.speed + b.phase) *
          Math.sin(xFrac * Math.PI * 2.3 - t * b.speed * 0.7 + b.phase * 0.5)
        );

        const centerY = b.yFrac * H + Math.sin(t * b.speed * 0.5 + xFrac * 4 + b.phase) * H * 0.025;
        const halfH   = b.hFrac * H * (0.5 + 0.5 * bright);

        const col = bi % 2 === 0 ? a.light : a.base;
        const grad = ctx.createLinearGradient(0, centerY - halfH, 0, centerY + halfH);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, `${col},${bright * 0.5})`);
        grad.addColorStop(0.5, `${col},${bright * 0.85})`);
        grad.addColorStop(0.7, `${col},${bright * 0.5})`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(x, centerY - halfH, segW, halfH * 2);
      }
    });

    // Горизонт — слабое свечение снизу
    const horiz = ctx.createLinearGradient(0, H * 0.75, 0, H);
    horiz.addColorStop(0, 'transparent');
    horiz.addColorStop(1, `${a.dark},0.5)`);
    ctx.fillStyle = horiz;
    ctx.fillRect(0, 0, W, H);
  }

  // ── 2. Частицы ──────────────────────────────────────────
  const particles = Array.from({length: 100}, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0004,
    vy: (Math.random() - 0.5) * 0.0004,
    r: Math.random() * 4 + 1,
    a: Math.random()
  }));

  function particlesBg() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);
    fillBg(a);

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      const alpha = 0.6 + 0.4 * Math.sin(t * 0.8 + p.a * 6);
      // Чередуем светлые и базовые
      const col = p.a > 0.5 ? a.light : a.base;
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `${col},${alpha})`;
      ctx.fill();
    });

    ctx.lineWidth = 1.2;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i+1; j < particles.length; j++) {
        const dx = (particles[i].x - particles[j].x) * W;
        const dy = (particles[i].y - particles[j].y) * H;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 90) {
          ctx.globalAlpha = (1 - d/90) * 0.6;
          ctx.strokeStyle = `${a.light},1)`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x*W, particles[i].y*H);
          ctx.lineTo(particles[j].x*W, particles[j].y*H);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── 3. Волны ────────────────────────────────────────────
  // Глубокие океанские волны с пеной и отражением
  function waves() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);

    // Тёмный фон — глубина
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, `rgba(0,0,0,1)`);
    bg.addColorStop(0.3, `${a.dark},1)`);
    bg.addColorStop(1, `rgba(0,0,0,1)`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const waveCount = 7;
    for (let i = waveCount - 1; i >= 0; i--) {
      const progress = i / (waveCount - 1); // 0 = дальняя, 1 = ближняя
      const baseY = H * (0.25 + progress * 0.55);
      const amp   = 30 + progress * 80;
      const freq  = 0.003 + (1 - progress) * 0.004;
      const speed = 0.4 + progress * 0.8;
      const phase = t * speed + i * 1.1;

      // Цвет: дальние темнее, ближние ярче
      const brightness = 0.2 + progress * 0.8;
      const col = progress > 0.6 ? a.light : progress > 0.3 ? a.base : a.dark;

      // Строим форму волны
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) {
        const y = baseY
          + Math.sin(x * freq + phase) * amp
          + Math.sin(x * freq * 2.3 + phase * 0.7) * amp * 0.3
          + Math.sin(x * freq * 0.5 + phase * 1.4) * amp * 0.2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();

      const wGrad = ctx.createLinearGradient(0, baseY - amp, 0, H);
      wGrad.addColorStop(0, `${col},${0.15 + progress * 0.5})`);
      wGrad.addColorStop(0.4, `${col},${0.3 + progress * 0.4})`);
      wGrad.addColorStop(1, `rgba(0,0,0,0.8)`);
      ctx.fillStyle = wGrad;
      ctx.fill();

      // Гребень волны — светлая линия
      if (progress > 0.3) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 3) {
          const y = baseY
            + Math.sin(x * freq + phase) * amp
            + Math.sin(x * freq * 2.3 + phase * 0.7) * amp * 0.3
            + Math.sin(x * freq * 0.5 + phase * 1.4) * amp * 0.2;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `${a.light},${0.3 + progress * 0.5})`;
        ctx.lineWidth = 1 + progress * 2;
        ctx.stroke();

        // Пена — белые точки на гребне
        if (progress > 0.6) {
          for (let x = 0; x < W; x += 40 + Math.random() * 60) {
            const y = baseY
              + Math.sin(x * freq + phase) * amp
              + Math.sin(x * freq * 2.3 + phase * 0.7) * amp * 0.3;
            const foamAlpha = 0.4 + 0.4 * Math.sin(t * 3 + x * 0.1);
            ctx.beginPath();
            ctx.arc(x, y, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${foamAlpha})`;
            ctx.fill();
          }
        }
      }
    }

    // Блики на поверхности
    for (let i = 0; i < 8; i++) {
      const bx = W * ((i * 0.137 + t * 0.02) % 1);
      const by = H * (0.4 + 0.3 * ((i * 0.23) % 1));
      const br = ctx.createRadialGradient(bx, by, 0, bx, by, 60 + i * 15);
      br.addColorStop(0, `${a.light},0.2)`);
      br.addColorStop(1, 'transparent');
      ctx.fillStyle = br;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── 4. Змейки ───────────────────────────────────────────
  // Несколько светящихся змей ползут по экрану как в Snake
  const SNAKE_COUNT = 8;
  const snakes = Array.from({length: SNAKE_COUNT}, (_, si) => {
    const len = 18 + Math.floor(Math.random() * 22);
    const startX = Math.random();
    const startY = Math.random();
    const body = Array.from({length: len}, (_, i) => ({
      x: startX - i * 0.015,
      y: startY
    }));
    return {
      body,
      dir: Math.random() * Math.PI * 2,
      turnSpeed: (Math.random() - 0.5) * 0.06,
      speed: 0.0015 + Math.random() * 0.002,
      phase: si * (Math.PI * 2 / SNAKE_COUNT),
      width: 6 + Math.random() * 8
    };
  });

  function snakesBg() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);

    // Тёмный фон с лёгкой сеткой
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, W, H);

    // Тонкая сетка
    ctx.strokeStyle = `${a.dark},0.25)`;
    ctx.lineWidth = 0.5;
    const grid = 60;
    for (let x = 0; x < W; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    snakes.forEach((snake, si) => {
      // Плавный поворот с синусоидой
      snake.dir += snake.turnSpeed * Math.sin(t * 0.4 + snake.phase);
      // Иногда резкий поворот
      if (Math.random() < 0.005) snake.turnSpeed = (Math.random() - 0.5) * 0.08;

      // Новая голова
      const head = snake.body[0];
      const newX = head.x + Math.cos(snake.dir) * snake.speed;
      const newY = head.y + Math.sin(snake.dir) * snake.speed;

      // Отражение от стен
      if (newX < 0 || newX > 1) snake.dir = Math.PI - snake.dir;
      if (newY < 0 || newY > 1) snake.dir = -snake.dir;

      snake.body.unshift({
        x: Math.max(0, Math.min(1, newX)),
        y: Math.max(0, Math.min(1, newY))
      });
      snake.body.pop();

      // Рисуем тело — от хвоста к голове
      const col = si % 3 === 0 ? a.light : si % 3 === 1 ? a.base : a.dark;
      const len = snake.body.length;

      for (let i = len - 1; i >= 1; i--) {
        const fade = 1 - i / len;
        const segW = snake.width * fade;
        if (segW < 0.5) continue;

        const x1 = snake.body[i].x * W;
        const y1 = snake.body[i].y * H;
        const x2 = snake.body[i - 1].x * W;
        const y2 = snake.body[i - 1].y * H;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = i < 3
          ? `rgba(255,255,255,${fade * 0.9})`
          : `${col},${fade * 0.85})`;
        ctx.lineWidth = segW;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Голова — яркая точка с ореолом
      const hx = snake.body[0].x * W;
      const hy = snake.body[0].y * H;
      const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, snake.width * 2.5);
      glow.addColorStop(0, `rgba(255,255,255,0.9)`);
      glow.addColorStop(0.3, `${a.light},0.6)`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(hx - snake.width * 2.5, hy - snake.width * 2.5, snake.width * 5, snake.width * 5);
    });
  }

  // ── 5. Звёздное небо ────────────────────────────────────
  const stars = Array.from({length: 200}, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 2.5 + 0.5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 2
  }));

  function starfield() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);
    fillBg(a);

    stars.forEach(s => {
      const alpha = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    // Две туманности
    [[W*0.25, H*0.3, W*0.5], [W*0.75, H*0.65, W*0.4]].forEach(([nx, ny, nr]) => {
      const neb = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      neb.addColorStop(0, `${a.light},0.35)`);
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
    });
  }

  // ── 6. Матрица ──────────────────────────────────────────
  // Цифровой дождь с длинными хвостами и свечением
  const matrixCols = [];
  (function initMatrix() {
    const cols = Math.floor((window.innerWidth + 60) / 16);
    for (let i = 0; i < cols; i++) {
      matrixCols[i] = {
        y: Math.random() * -600,
        speed: 1.5 + Math.random() * 3.5,
        len: 8 + Math.floor(Math.random() * 20),
        chars: Array.from({length: 30}, () => Math.floor(Math.random() * 36))
      };
    }
  })();

  const matrixCharset = '0123456789ABCDEF日月火水木金土';

  function matrix() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();

    // Полупрозрачный фон — создаёт эффект затухания
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, W, H);

    const colW = 16;
    ctx.font = 'bold 14px monospace';

    matrixCols.forEach((col, i) => {
      const x = i * colW + 2;

      // Рисуем хвост — символы с затуханием
      for (let j = col.len; j >= 0; j--) {
        const charY = col.y - j * colW;
        if (charY < 0 || charY > H) continue;

        const charIdx = (col.chars[j % col.chars.length] + Math.floor(t * 2 + j)) % matrixCharset.length;
        const char = matrixCharset[charIdx];

        if (j === 0) {
          // Голова — белая с ореолом
          ctx.shadowColor = `${a.light},1)`;
          ctx.shadowBlur = 12;
          ctx.fillStyle = `rgba(255,255,255,0.95)`;
        } else {
          // Хвост — акцентный цвет с затуханием
          const fade = 1 - j / col.len;
          ctx.shadowBlur = 0;
          ctx.fillStyle = j < 3
            ? `${a.light},${fade * 0.9})`
            : `${a.base},${fade * 0.7})`;
        }
        ctx.fillText(char, x, charY);
      }

      ctx.shadowBlur = 0;
      col.y += col.speed;
      if (col.y - col.len * colW > H) {
        col.y = -colW * 2;
        col.speed = 1.5 + Math.random() * 3.5;
        col.len = 8 + Math.floor(Math.random() * 20);
      }
    });
  }

  // ── 7. Геометрия ────────────────────────────────────────
  const hexes = Array.from({length: 18}, (_, i) => ({
    x: Math.random(), y: Math.random(),
    size: 40 + Math.random() * 80,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.008,
    phase: Math.random() * Math.PI * 2
  }));

  function hexagon(cx, cy, size, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = rot + (Math.PI / 3) * i;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function geometry() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);
    fillBg(a);

    hexes.forEach((h, i) => {
      h.rot += h.rotSpeed;
      const pulse = 0.3 + 0.3 * Math.sin(t * 0.7 + h.phase);
      const col = i % 3 === 0 ? a.light : i % 3 === 1 ? a.base : a.dark;

      // Заливка
      hexagon(h.x * W, h.y * H, h.size, h.rot);
      ctx.fillStyle = `${col},${pulse * 0.25})`;
      ctx.fill();

      // Обводка
      hexagon(h.x * W, h.y * H, h.size, h.rot);
      ctx.strokeStyle = `${col},${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Внутренний шестиугольник
      hexagon(h.x * W, h.y * H, h.size * 0.55, h.rot + Math.PI / 6);
      ctx.strokeStyle = `${a.light},${pulse * 0.6})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // ── 8. Плазма ───────────────────────────────────────────
  function plasma() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    ctx.clearRect(0, 0, W, H);

    // Рисуем через offscreen пиксели — упрощённая версия через градиенты
    const step = 60;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        const v = Math.sin(x * 0.008 + t * 0.8)
                + Math.sin(y * 0.006 + t * 0.6)
                + Math.sin((x + y) * 0.005 + t * 0.5)
                + Math.sin(Math.sqrt(
                    Math.pow(x - W * (0.5 + 0.3 * Math.sin(t * 0.4)), 2) +
                    Math.pow(y - H * (0.5 + 0.3 * Math.cos(t * 0.3)), 2)
                  ) * 0.01);
        const norm = (v + 4) / 8;
        const alpha = 0.55 + 0.35 * norm;
        const col = norm > 0.6 ? a.light : norm > 0.35 ? a.base : a.dark;
        ctx.fillStyle = `${col},${alpha})`;
        ctx.fillRect(x, y, step + 2, step + 2);
      }
    }

    // Поверх — тонкий шум из кругов
    for (let i = 0; i < 6; i++) {
      const cx = W * (0.2 + 0.6 * ((i * 0.37 + t * 0.05) % 1));
      const cy = H * (0.2 + 0.6 * ((i * 0.61 + t * 0.04) % 1));
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      gr.addColorStop(0, `${a.light},0.18)`);
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ── 9. Матрица (фильм) ──────────────────────────────────
  // Вертикальные потоки цифр 0-9, как в заставке фильма
  const filmCols = [];
  (function initFilmMatrix() {
    const colW = 22;
    const cols = Math.ceil((window.innerWidth + 60) / colW);
    for (let i = 0; i < cols; i++) {
      filmCols[i] = {
        y: Math.random() * -(window.innerHeight * 1.5),
        speed: 2 + Math.random() * 4,
        len: 12 + Math.floor(Math.random() * 25),
        glitch: Math.random() < 0.15,  // некоторые колонки "глючат"
        glitchTimer: 0
      };
    }
  })();

  function filmMatrix() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    const colW = 22;

    // Затухающий след — ключ к эффекту
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 18px "Courier New", monospace';

    filmCols.forEach((col, i) => {
      const x = i * colW;

      // Глитч — случайное смещение колонки
      if (col.glitch) {
        col.glitchTimer--;
        if (col.glitchTimer <= 0) {
          col.glitch = Math.random() < 0.1;
          col.glitchTimer = 5 + Math.floor(Math.random() * 20);
        }
      }

      const len = col.len;
      for (let j = 0; j <= len; j++) {
        const charY = col.y - j * colW;
        if (charY < -colW || charY > H + colW) continue;

        // Только цифры 0-9 как в фильме
        const digit = String((Math.floor(t * 8 + i * 3.7 + j * 1.3)) % 10);

        if (j === 0) {
          // Голова — белая, яркая
          ctx.shadowColor = `${a.light},1)`;
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(255,255,255,1)';
        } else if (j === 1) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = `${a.light},0.8)`;
          ctx.fillStyle = `${a.light},0.95)`;
        } else {
          // Хвост — акцент с затуханием
          const fade = Math.pow(1 - j / len, 1.4);
          ctx.shadowBlur = 0;
          ctx.fillStyle = `${a.base},${fade * 0.9})`;
        }

        ctx.fillText(digit, x + (col.glitch && col.glitchTimer > 0 ? (Math.random() - 0.5) * 8 : 0), charY);
      }

      ctx.shadowBlur = 0;
      col.y += col.speed;

      if (col.y - len * colW > H) {
        col.y = -colW * (2 + Math.random() * 8);
        col.speed = 2 + Math.random() * 4;
        col.len = 12 + Math.floor(Math.random() * 25);
        col.glitch = Math.random() < 0.15;
        col.glitchTimer = 0;
      }
    });
  }

  // ── 10. Туннель ─────────────────────────────────────────
  // Гиперпространственный прыжок — звёзды летят на зрителя
  const hyperStars = Array.from({length: 300}, () => ({
    angle: Math.random() * Math.PI * 2,
    dist: Math.random(),
    speed: 0.003 + Math.random() * 0.008,
    width: 0.5 + Math.random() * 1.5,
    bright: 0.4 + Math.random() * 0.6
  }));

  function tunnel() {
    const W = canvas.width, H = canvas.height;
    const a = getAccent();
    const cx = W * 0.5, cy = H * 0.45;

    ctx.clearRect(0, 0, W, H);

    // Тёмный фон с центральным свечением
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, W, H);

    const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.4);
    centerGlow.addColorStop(0, `${a.base},0.15)`);
    centerGlow.addColorStop(0.5, `${a.dark},0.08)`);
    centerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGlow;
    ctx.fillRect(0, 0, W, H);

    // Звёзды летят из центра
    hyperStars.forEach(s => {
      s.dist += s.speed * (0.5 + s.dist * 2); // ускорение по мере удаления
      if (s.dist > 1) {
        s.dist = 0.01 + Math.random() * 0.05;
        s.angle = Math.random() * Math.PI * 2;
        s.speed = 0.003 + Math.random() * 0.008;
      }

      const maxR = Math.sqrt(cx * cx + cy * cy) * 1.2;
      const r = s.dist * maxR;
      const prevR = Math.max(0, (s.dist - s.speed * 3) * maxR);

      const x2 = cx + Math.cos(s.angle) * r;
      const y2 = cy + Math.sin(s.angle) * r;
      const x1 = cx + Math.cos(s.angle) * prevR;
      const y1 = cy + Math.sin(s.angle) * prevR;

      const alpha = s.bright * Math.min(s.dist * 3, 1);
      const streakLen = Math.max(1, r - prevR);

      // Цвет: ближние к центру — акцент, дальние — белые
      const col = s.dist < 0.3
        ? `${a.light},${alpha})`
        : s.dist < 0.6
          ? `rgba(${Math.min(a.r + 100, 255)},${Math.min(a.g + 100, 255)},${Math.min(a.b + 100, 255)},${alpha})`
          : `rgba(255,255,255,${alpha})`;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, col);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width * (0.5 + s.dist * 2);
      ctx.stroke();
    });

    // Концентрические кольца — ощущение скорости
    for (let i = 0; i < 5; i++) {
      const phase = (t * 1.5 + i * 0.2) % 1;
      const r = phase * Math.max(W, H) * 0.7;
      const alpha = (1 - phase) * 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `${a.base},${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Яркая точка в центре
    const dot = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    dot.addColorStop(0, `${a.light},0.8)`);
    dot.addColorStop(0.5, `${a.base},0.3)`);
    dot.addColorStop(1, 'transparent');
    ctx.fillStyle = dot;
    ctx.fillRect(cx - 30, cy - 30, 60, 60);
  }

  const ANIMS = {
    aurora:    { fn: aurora,      name: 'Северное сияние', icon: '🌌' },
    particles: { fn: particlesBg, name: 'Частицы',         icon: '✨' },
    waves:     { fn: waves,       name: 'Волны',           icon: '🌊' },
    snakes:    { fn: snakesBg,    name: 'Змейки',          icon: '🐍' },
    stars:     { fn: starfield,   name: 'Звёзды',          icon: '🌠' },
    matrix:    { fn: matrix,      name: 'Матрица',         icon: '💻' },
    geometry:  { fn: geometry,    name: 'Геометрия',       icon: '⬡'  },
    plasma:    { fn: plasma,      name: 'Плазма',          icon: '🔮' },
    film:      { fn: filmMatrix,  name: 'Цифры',           icon: '0️⃣' },
    tunnel:    { fn: tunnel,      name: 'Гиперпрыжок',     icon: '🚀' },
  };

  function loop() {
    t += 0.016;
    if (current && ANIMS[current]) ANIMS[current].fn();
    animId = requestAnimationFrame(loop);
  }

  function set(name) {
    current = name;
    try { localStorage.setItem('lite_bg_anim', name); } catch(e) {}
    if (!animId) loop();
  }

  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    current = null;
  }

  // Восстанавливаем при старте — вызывается из app.js после инициализации
  function init() {
    let saved = null;
    try { saved = localStorage.getItem('lite_bg_anim'); } catch(e) {}
    set(saved || 'stars');
  }

  return { set, stop, init, ANIMS };
})();

// Запускаем после загрузки
BgAnimations.init();

// Инициализируем сетку выбора в настройках
(function() {
  const grid = document.getElementById('bg-anim-grid');
  if (!grid) return;
  function render() {
    const current = localStorage.getItem('lite_bg_anim') || 'aurora';
    grid.innerHTML = '';
    Object.entries(BgAnimations.ANIMS).forEach(([key, val]) => {
      const btn = document.createElement('button');
      const isActive = key === current;
      btn.style.cssText = `padding:10px 16px;border-radius:12px;border:2px solid ${isActive?'var(--accent)':'rgba(255,255,255,0.1)'};background:${isActive?'var(--accent-20)':'rgba(255,255,255,0.05)'};color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px`;
      btn.innerHTML = `<span>${val.icon}</span><span>${val.name}</span>`;
      btn.addEventListener('click', () => { BgAnimations.set(key); render(); });
      grid.appendChild(btn);
    });
  }
  render();
})();

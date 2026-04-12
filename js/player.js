'use strict';

// ── Плеер ──────────────────────────────────────────────────
let isPlaying = false, trackDuration = 0, trackPosition = 0, positionTimestamp = 0, progressTimer = null;
let _pendingPlayState = null; // ожидаем подтверждения от Android
let _pendingTimer = null;

function setPlayState(playing) {
  isPlaying = playing;
  _pendingPlayState = null;
  el("icon-play").style.display  = playing ? "none"  : "block";
  el("icon-pause").style.display = playing ? "block" : "none";
  const p2 = el("icon-play2"), p2p = el("icon-pause2");
  if (p2)  p2.style.display  = playing ? "none"  : "block";
  if (p2p) p2p.style.display = playing ? "block" : "none";
  playing ? startProgressTick() : stopProgressTick();
  if (playing && cfg.visualizer) Visualizer?.start();
  else Visualizer?.stop();
}

function onPlayBtnClick() {
  const cmd = isPlaying ? "MEDIA_PAUSE" : "MEDIA_PLAY";
  const expected = !isPlaying;
  run(cmd);
  // Оптимистично обновляем UI сразу
  setPlayState(expected);
  // Если Android не подтвердит за 5 сек — не откатываем (доверяем следующему musicInfo)
  clearTimeout(_pendingTimer);
  _pendingPlayState = expected;
  _pendingTimer = setTimeout(() => { _pendingPlayState = null; }, 5000);
}

function startProgressTick() {
  stopProgressTick();
  progressTimer = setInterval(() => {
    if (!isPlaying || trackDuration <= 0) return;
    const pos = Math.min(trackPosition + (Date.now() - positionTimestamp), trackDuration);
    el("progress-fill").style.transition = "width 1s linear";
    el("progress-fill").style.width = (pos / trackDuration * 100) + "%";
    set("time-cur", fmt(pos));
  }, 1000);
}

function stopProgressTick() { if (progressTimer) { clearInterval(progressTimer); progressTimer = null; } }

function updateProgressUI(pos, dur) {
  const pct = dur > 0 ? Math.min(pos / dur * 100, 100) : 0;
  ["progress-fill","progress-fill2"].forEach(id => { const e = el(id); if (!e) return; e.style.transition = "none"; e.style.width = pct + "%"; });
  set("time-cur", fmt(pos)); set("time-dur", fmt(dur));
  set("time-cur2", fmt(pos)); set("time-dur2", fmt(dur));
}

el("btn-prev").addEventListener("click", () => run("MEDIA_BLACK"));
el("btn-next").addEventListener("click", () => run("MEDIA_NEXT"));
el("btn-play").addEventListener("click",  onPlayBtnClick);
el("btn-prev2")?.addEventListener("click", () => run("MEDIA_BLACK"));
el("btn-next2")?.addEventListener("click", () => run("MEDIA_NEXT"));
el("btn-play2")?.addEventListener("click", onPlayBtnClick);

el("progress-bar").addEventListener("click", e => {
  if (trackDuration <= 0) return;
  const pos = Math.floor((e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width * trackDuration);
  run("MEDIA_SEEK_" + pos); trackPosition = pos; positionTimestamp = Date.now(); updateProgressUI(pos, trackDuration);
});

(function() {
  let sx = 0, sy = 0;
  const p = el("player");
  p.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  p.addEventListener("touchend", e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 60 && Math.abs(e.changedTouches[0].clientY - sy) < 40) run(dx < 0 ? "MEDIA_NEXT" : "MEDIA_BLACK"); });
  p.addEventListener("mousedown", e => { sx = e.clientX; });
  p.addEventListener("mouseup",   e => { if (Math.abs(e.clientX - sx) > 80) run(e.clientX - sx < 0 ? "MEDIA_NEXT" : "MEDIA_BLACK"); });
})();

// ── Визуализатор ───────────────────────────────────────────
const Visualizer = (() => {
  function activeCanvas() { const c2 = el('visualizer2'); return (c2 && c2.offsetParent !== null) ? c2 : el('visualizer'); }
  let animId = null, fakePhase = 0, spikeAmp = 0, spikePos = 0.5, nextSpike = 0;

  function resizeCanvas(c) { const w = c.parentElement?.getBoundingClientRect().width || 800; c.width = Math.max(100, Math.floor(w)); c.height = 96; }

  function triggerSpike() { spikeAmp = 0.45 + Math.random()*0.45; spikePos = 0.15 + Math.random()*0.7; nextSpike = Date.now() + 380 + Math.random()*480; }

  function waveY(x, amp, freq, phase, W, H) {
    const base = Math.sin(x/W*Math.PI*2*freq+phase)*0.55 + Math.sin(x/W*Math.PI*2*freq*1.8+phase*1.3)*0.28 + Math.sin(x/W*Math.PI*2*freq*0.4+phase*0.6)*0.17;
    const spike = spikeAmp * Math.exp(-((x/W - spikePos)**2) / 0.012);
    return H/2 - ((amp + spike*0.35)*base + spike)*H;
  }

  function drawFrame() {
    const c = activeCanvas(); if (!c) return;
    if (c.width < 10) resizeCanvas(c);
    const ctx = c.getContext('2d'), W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    let color = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#294EF1';
    fakePhase += 0.028; spikeAmp *= 0.87;
    if (Date.now() > nextSpike) triggerSpike();
    const layers = [{amp:0.20,freq:1.8,phase:fakePhase,alpha:0.28},{amp:0.14,freq:3.1,phase:fakePhase*1.4,alpha:0.20},{amp:0.10,freq:1.1,phase:fakePhase*0.5,alpha:0.15}];
    layers.forEach(({amp,freq,phase,alpha}) => {
      const grad = ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,color); grad.addColorStop(1,'transparent');
      ctx.fillStyle = grad; ctx.globalAlpha = alpha; ctx.beginPath();
      for (let x = 0; x <= W; x += 2) { const y = waveY(x,amp,freq,phase,W,H); x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
    });
    ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) { const y = waveY(x,0.20,1.8,fakePhase,W,H); x===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }
    ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }

  function loop() { drawFrame(); animId = requestAnimationFrame(loop); }
  function start() { const c = activeCanvas(); resizeCanvas(c); [el('visualizer'),el('visualizer2')].forEach(cv => cv && cv.classList.add('active')); if (!animId) loop(); }
  function stop() { if (animId) { cancelAnimationFrame(animId); animId = null; } [el('visualizer'),el('visualizer2')].forEach(cv => { if (!cv) return; cv.classList.remove('active'); cv.getContext('2d').clearRect(0,0,cv.width,cv.height); }); }
  return { start, stop };
})();

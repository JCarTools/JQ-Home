'use strict';

// ── Android → JS ───────────────────────────────────────────
window._lastAndroidEvent = null;
window._androidEventLog = [];

window.onAndroidEvent = function(type, data) {
  // Логируем для диагностики
  window._lastAndroidEvent = { type, ts: Date.now() };
  window._androidEventLog.unshift({ type, ts: Date.now() });
  if (window._androidEventLog.length > 20) window._androidEventLog.pop();

  if (typeof data === "string") { try { data = JSON.parse(data); } catch(e) { data = { value: data }; } }
  if (data == null) data = {};

  switch (type) {
    case "speed":
      showSpeed(parseFloat(data.value) || 0);
      window._updateTripSpeed?.(parseFloat(data.value) || 0);
      window._compassUpdateSpeed?.(parseFloat(data.value) || 0);
      window._lastSpeed = parseFloat(data.value) || 0;
      break;

    case "musicInfo": {
      const title = data.SongName || "", artist = data.SongArtist || "", hasTrack = !!(title||artist);
      window._lastTrack = hasTrack ? `${title} — ${artist}` : null;

      const prevTitle = el("track-title")?.textContent;
      const newTitle  = hasTrack ? title : "Нет воспроизведения";

      set("track-title",   newTitle);
      set("track-artist",  hasTrack ? artist : "—");
      set("track-title2",  newTitle);
      set("track-artist2", hasTrack ? artist : "—");
      set("player-source",  data.package || "");
      set("player-source2", data.package || "");
      window._setMediaSourcePkg?.(data.package || '');

      // Обложка — только если изменилась
      const art = el("album-art"), art2 = el("album-art2");
      const newPic = data.SongAlbumPicture || '';
      if (art && art._lastPic !== newPic) {
        art._lastPic = newPic;
        if (newPic) {
          const src = "data:image/png;base64," + newPic;
          art.src = src; art.classList.remove("empty");
          if (art2) { art2.src = src; art2.classList.remove("empty"); }
        } else {
          art.src = "img/Artist.png"; art.classList.toggle("empty", !hasTrack);
          if (art2) { art2.src = "img/Artist.png"; art2.classList.toggle("empty", !hasTrack); }
        }
      }

      const pos = parseFloat(data.Trpos || 0);
      const dur = parseFloat(data.Trdur || 1);

      // Прогресс — обновляем при смене трека или большом расхождении
      const trackChanged = prevTitle !== newTitle || Math.abs(dur - trackDuration) > 1000;
      const drift = positionTimestamp > 0 ? Math.abs(pos - (trackPosition + (Date.now() - positionTimestamp))) : 99999;

      if (trackChanged || drift > 3000) {
        trackDuration = dur; trackPosition = pos; positionTimestamp = Date.now();
        updateProgressUI(pos, dur);
      } else {
        trackDuration = dur;
      }

      // isPlaying — берём из данных если есть, иначе считаем что играет если есть трек
      const playingRaw = data.isPlaying;
      if (playingRaw !== undefined && playingRaw !== null) {
        const playing = playingRaw === true || playingRaw === "true" || playingRaw === 1;
        setPlayState(playing);
      } else if (hasTrack && !isPlaying) {
        // Яндекс не шлёт isPlaying — считаем что играет если пришёл трек
        setPlayState(true);
      }
      break;
    }

    case "weather":
      if (data.temp != null) el('w-temp').textContent = (data.temp>0?'+':'')+data.temp+'°';
      break;

    case "theme":
      if (data.mode==='dark')  applyTheme('black');
      if (data.mode==='light') applyTheme('white');
      break;

    case "wallpaper":
      if (data.base64) window.setWallpaper(data.base64);
      break;

    case "GPSSignalQuality":
      window._gpsSignal = data.updateSignalQuality;
      break;

    case "gps":
    case "location": {
      const lat=parseFloat(data.lat||data.latitude), lon=parseFloat(data.lon||data.longitude);
      if (!isNaN(lat)&&!isNaN(lon)) {
        saveLS('weather_coords',{lat,lon});
        fetchWeather(lat,lon);
        if(cfg.theme==='sun') fetchSunTimes(lat,lon);
        window._lastLocation = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      }
      // Скорость из GPS (м/с → км/ч)
      if (data.speed != null) {
        const gpsSpeed = parseFloat(data.speed) * 3.6;
        showSpeed(gpsSpeed);
        window._updateTripSpeed?.(gpsSpeed);
      }
      // Направление движения (heading) — для компаса если нужен
      if (data.heading != null) {
        window._gpsHeading = parseFloat(data.heading);
      }
      break;
    }

    case "hud": {
      window._onHudCanExtras?.(data);
      if (data.hudSenderType === 'ARAD') {
        if (data.aradarOn) {
          setRadarActive?.(true);
          const dist = data.remainDist || 0;
          if (dist < 200) Sounds.play('radar');
          el('radar-nearest').textContent = dist<1000 ? dist+' м' : (dist/1000).toFixed(1)+' км';
          el('radar-limit').textContent   = data.speedLimit ? data.speedLimit+' км/ч' : '—';
          RadarWidget.setNearest({ dist, bearing: 0, limit: data.speedLimit, urgent: data.turnDist < 80 });
        } else {
          setRadarActive?.(false);
        }
        break;
      }
      handleNaviData(data);
      break;
    }
  }
};

// ── Init ───────────────────────────────────────────────────
initMySlots();
initWeather();

// Звуки кнопок
addTapSound('.app-btn');
addTapSound('.cl-btn', 'tap');
addTapSound('.my-slot', 'tap');
addTapSound('.right-btn', 'tap');
addTapSound('.ctrl-btn', 'tap');
addTapSound('.theme-btn', 'tap');
addTapSound('.accent-dot', 'tap');

try { window.androidApi?.onJsReady?.(TOKEN); } catch(e) {}

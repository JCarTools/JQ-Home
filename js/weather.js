'use strict';

const WMO_ICON = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',96:'⛈️',99:'⛈️'};
const WMO_DESC = {0:'Ясно',1:'Преимущественно ясно',2:'Переменная облачность',3:'Пасмурно',45:'Туман',48:'Туман с инеем',51:'Лёгкая морось',53:'Морось',55:'Сильная морось',61:'Небольшой дождь',63:'Дождь',65:'Сильный дождь',71:'Небольшой снег',73:'Снег',75:'Сильный снег',80:'Ливень',81:'Сильный ливень',82:'Шквальный ливень',95:'Гроза',96:'Гроза с градом',99:'Сильная гроза'};

let weatherOpen = false;
el('weather-widget').addEventListener('click', () => { weatherOpen = !weatherOpen; el('weather-widget').classList.toggle('open', weatherOpen); });

function renderForecast(hourly) {
  const now = new Date(), container = el('forecast-hours');
  container.innerHTML = '';
  let count = 0;
  for (let i = 0; i < hourly.time.length && count < 6; i++) {
    const t = new Date(hourly.time[i]);
    if (t <= now) continue;
    const item = document.createElement('div');
    item.className = 'forecast-item';
    const rain = hourly.precipitation_probability[i];
    item.innerHTML = `<div class="forecast-time">${String(t.getHours()).padStart(2,'0')}:00</div><div class="forecast-icon">${WMO_ICON[hourly.weathercode[i]]||'🌡️'}</div><div class="forecast-temp">${Math.round(hourly.temperature_2m[i])>0?'+':''}${Math.round(hourly.temperature_2m[i])}°</div>${rain>0?`<div class="forecast-rain">💧${rain}%</div>`:''}`;
    container.appendChild(item);
    count++;
  }
}

function fetchWeather(lat, lon) {
  window._weatherLog = []; // сбрасываем лог
  const logEntry = (msg, ok) => { window._weatherLog.push({msg, ok, ts: Date.now()}); };

  logEntry(`Запрос: lat=${lat?.toFixed(4)}, lon=${lon?.toFixed(4)}`, true);

  // Сначала пробуем через fetch
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m&hourly=temperature_2m,weathercode,precipitation_probability&wind_speed_unit=ms&timezone=auto&forecast_days=1`)
    .then(r => { if (!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(data => {
      logEntry('fetch: успех', true);
      const c = data.current;
      const temp = Math.round(c.temperature_2m), feel = Math.round(c.apparent_temperature), code = c.weathercode, wind = Math.round(c.windspeed_10m), hum = c.relativehumidity_2m;
      el('w-icon').textContent = WMO_ICON[code]||'🌡️';
      el('w-temp').textContent = (temp>0?'+':'')+temp+'°';
      el('w-desc').textContent = WMO_DESC[code]||'';
      el('w-feels').textContent = `Ощущается ${feel>0?'+':''}${feel}°`;
      el('w-wind').textContent  = `💨 ${wind} м/с`;
      el('w-humidity').textContent = `💧 ${hum}%`;
      renderForecast(data.hourly);
      saveLS('weather_cache', { temp, feel, code, wind, hum, ts: Date.now(), hourly: data.hourly });
    })
    .catch(e => {
      logEntry('fetch ошибка: '+e.name+': '+e.message, false);
      // Fallback: пробуем через XMLHttpRequest
      logEntry('XHR fallback...', true);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m&wind_speed_unit=ms&timezone=auto&forecast_days=1`);
      xhr.timeout = 10000;
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          logEntry('XHR: успех HTTP '+xhr.status, true);
          const c = data.current;
          const temp = Math.round(c.temperature_2m), feel = Math.round(c.apparent_temperature), code = c.weathercode, wind = Math.round(c.windspeed_10m), hum = c.relativehumidity_2m || 0;
          el('w-icon').textContent = WMO_ICON[code]||'🌡️';
          el('w-temp').textContent = (temp>0?'+':'')+temp+'°';
          el('w-desc').textContent = WMO_DESC[code]||'';
          el('w-feels').textContent = `Ощущается ${feel>0?'+':''}${feel}°`;
          el('w-wind').textContent  = `💨 ${wind} м/с`;
          el('w-humidity').textContent = `💧 ${hum}%`;
          saveLS('weather_cache', { temp, feel, code, wind, hum, ts: Date.now() });
        } catch(e2) { logEntry('XHR parse ошибка: '+e2.message, false); }
      };
      xhr.onerror   = () => logEntry('XHR сетевая ошибка', false);
      xhr.ontimeout = () => logEntry('XHR таймаут', false);
      xhr.send();
    });
}

function fetchLocationByIP(callback) {
  fetch('https://ipapi.co/json/').then(r => r.json()).then(data => {
    const lat = parseFloat(data.latitude), lon = parseFloat(data.longitude);
    if (!isNaN(lat) && !isNaN(lon)) { saveLS('weather_coords', { lat, lon }); callback(lat, lon); if (cfg.theme === 'sun') fetchSunTimes(lat, lon); }
  }).catch(() => {});
}

function initWeather() {
  const cache = loadLS('weather_cache');
  if (cache) {
    el('w-icon').textContent = WMO_ICON[cache.code]||'🌡️';
    el('w-temp').textContent = (cache.temp>0?'+':'')+cache.temp+'°';
    el('w-desc').textContent = WMO_DESC[cache.code]||'';
    el('w-feels').textContent = `Ощущается ${cache.feel>0?'+':''}${cache.feel}°`;
    el('w-wind').textContent  = `💨 ${cache.wind} м/с`;
    el('w-humidity').textContent = `💧 ${cache.hum}%`;
    if (cache.hourly) renderForecast(cache.hourly);
  }

  const doFetch = (lat, lon) => {
    fetchWeather(lat, lon);
    setInterval(() => fetchWeather(lat, lon), 30*60*1000);
  };

  // Если уже есть сохранённые координаты — сразу грузим
  const saved = loadLS('weather_coords');
  if (saved) {
    doFetch(saved.lat, saved.lon);
    return;
  }

  // На ГУ координаты придут через onAndroidEvent('location') — ждём
  // На ПК пробуем geolocation → IP fallback
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const {latitude:lat, longitude:lon} = pos.coords;
        saveLS('weather_coords', {lat, lon});
        doFetch(lat, lon);
        if (cfg.theme === 'sun') fetchSunTimes(lat, lon);
      },
      () => fetchLocationByIP(doFetch),
      { timeout: 5000, maximumAge: 60*60*1000 }
    );
  } else {
    fetchLocationByIP(doFetch);
  }
}

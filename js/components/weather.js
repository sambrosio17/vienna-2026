// Weather from Open-Meteo (free, no key): 16-day forecast for Vienna + current weather where I am.
import { D } from '../core/data.js';
import { S } from '../core/state.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { ago } from '../core/format.js';
import { QS, PREVIEW, EMBEDDED } from '../core/config.js';
import { emit } from '../core/bus.js';

export let wx = store.get('vie26-wx', null);
let busy = false;

export function wxInfo(c) {
  if (c === 0) return ['sun', 'Sereno'];
  if (c === 1) return ['sun', 'Poco nuvoloso'];
  if (c === 2) return ['partly', 'Parzialmente nuvoloso'];
  if (c === 3) return ['cloud', 'Coperto'];
  if (c === 45 || c === 48) return ['fog', 'Nebbia'];
  if (c >= 51 && c <= 57) return ['rain', 'Pioggerella'];
  if (c === 66 || c === 67) return ['rain', 'Pioggia gelata'];
  if (c >= 61 && c <= 65) return ['rain', 'Pioggia'];
  if (c >= 71 && c <= 77) return ['snow', 'Neve'];
  if (c >= 80 && c <= 82) return ['rain', 'Rovesci'];
  if (c === 85 || c === 86) return ['snow', 'Rovesci di neve'];
  if (c >= 95) return ['storm', 'Temporale'];
  return ['cloud', 'Variabile'];
}

export function wxIcon(kind) {
  const cl = '<path d="M7 18h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7 11a3.5 3.5 0 0 0 0 7z"/>';
  const small = cl.replace('18h10', '15h10').replace('a3.5 3.5 0 0 0 0 7z', 'a3.5 3.5 0 0 0 0 4z');
  const p = {
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    partly: '<circle cx="9" cy="8.5" r="3.2"/><path d="M9 2.8v1.4M3.3 8.5h1.4M4.9 4.4l1 1M13.1 4.4l-1 1"/><path d="M9 19h9a3.4 3.4 0 0 0 .5-6.77A4.7 4.7 0 0 0 9.4 12.5 3 3 0 0 0 9 19z"/>',
    cloud: cl,
    fog: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    moon: '<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10z"/>',
    rain: small + '<path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
    snow: small + '<path d="M9 19.5h.01M12.5 21h.01M16 19.5h.01"/>',
    storm: small + '<path d="M12.5 15l-2 3.5h3l-2 3.5"/>'
  }[kind] || cl;
  return `<svg class="wx-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

const wxUrl = (lat, lng, daily) => `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m${daily ? '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16' : ''}&timezone=Europe%2FVienna`;

async function weatherPos(ask) {
  if (S.myPos && Date.now() - S.myPos.t < 20 * 60000) return S.myPos;
  if (!('geolocation' in navigator) || EMBEDDED) return null;
  let granted = false;
  try { granted = (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch (e) { /* no Permissions API */ }
  if (!granted && !ask) return null;
  return new Promise(ok => navigator.geolocation.getCurrentPosition(
    p => ok({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: Date.now() }),
    () => ok(null), { timeout: 10000, maximumAge: 600000 }));
}

export async function loadWeather(force, ask) {
  if (PREVIEW && QS.get('fx')) { // fake current weather matching the previewed effect
    const m = { rain: [63, 6, 1], snow: [73, -1, 1], storm: [95, 9, 1], fog: [45, 2, 1], clouds: [3, 4, 1], sun: [0, 7, 1], stars: [0, -2, 0] }[QS.get('fx')] || [2, 4, 1];
    wx = { t: Date.now(), daily: (wx && wx.daily) || {}, cur: { temp: m[1], feel: m[1] - 3, code: m[0], wind: 8, day: m[2], here: false, t: Date.now() } };
    update(); return;
  }
  if (EMBEDDED || busy) return;
  if (!force && wx && Date.now() - wx.t < 30 * 60000) { update(); return; }
  busy = true;
  try {
    const { lat, lng } = D.trip.city;
    const v = await fetch(wxUrl(lat, lng, true)).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const daily = {};
    v.daily.time.forEach((d, i) => { daily[d] = { code: v.daily.weather_code[i], max: v.daily.temperature_2m_max[i], min: v.daily.temperature_2m_min[i], pp: v.daily.precipitation_probability_max[i] }; });
    let src = v.current, here = false;
    const pos = await weatherPos(ask);
    if (pos) { try { const p = await fetch(wxUrl(pos.lat, pos.lng, false)).then(r => r.json()); if (p.current) { src = p.current; here = true; } } catch (e) { /* keep Vienna */ } }
    wx = { t: Date.now(), daily, cur: { temp: src.temperature_2m, feel: src.apparent_temperature, code: src.weather_code, wind: src.wind_speed_10m, day: src.is_day, here, t: Date.now() } };
    store.set('vie26-wx', wx);
  } catch (e) { /* offline: keep the last saved weather */ }
  busy = false; update();
}

// Current conditions next to the clock
function update() {
  const b = $('wxnow');
  if (wx && wx.cur) {
    let [k, l] = wxInfo(wx.cur.code);
    const old = Date.now() - wx.cur.t > 3 * 3600000;
    if (wx.cur.day === 0 && (k === 'sun' || k === 'partly')) { k = 'moon'; if (l === 'Sereno') l = 'Sereno, notte'; }
    b.innerHTML = `${wxIcon(k)}<b>${Math.round(wx.cur.temp)}°</b> ${l} <span>· ${wx.cur.here ? 'dove sei' : 'Vienna'}${old ? ' · ' + ago(wx.cur.t) : ''}</span>`;
    b.title = wx.cur.here ? 'Meteo attuale nella tua posizione' : 'Tocca per il meteo nella tua posizione';
    b.hidden = false;
  }
  emit('wx');
}

// Small forecast on each day tab (typical late-November values until the forecast reaches that day)
export function wxTabHtml(d) {
  if (!wx || !wx.daily) return '';
  const f = wx.daily[d.date], t = D.trip.typicalWeather;
  if (!f) return `<span class="dwx" title="Media del periodo: la previsione arriva circa 15 giorni prima">≈${t.max}°/${t.min}°</span>`;
  const [k, l] = wxInfo(f.code);
  return `<span class="dwx" title="${l}">${wxIcon(k)}${Math.round(f.max)}°/${Math.round(f.min)}°</span>`;
}

export function wxDayHtml(d, live) {
  if (EMBEDDED) return '';
  const f = wx && wx.daily && wx.daily[d.date], t = D.trip.typicalWeather;
  let h = '<div class="wxday">';
  if (f) {
    const [k, l] = wxInfo(f.code);
    h += `${wxIcon(k)}<span class="wxd"><span><b>${Math.round(f.max)}°</b> / ${Math.round(f.min)}° · ${l}</span><span>Previsione per Vienna${f.pp != null ? ` · pioggia ${f.pp}%` : ''}</span></span>`;
  } else h += `${wxIcon('cloud')}<span class="wxd"><span><b>${t.max}°</b> / ${t.min}° · media del periodo</span><span>La previsione arriva circa 15 giorni prima</span></span>`;
  if (live && wx && wx.cur) {
    h += `<span class="wxlive"><span style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--now)">Adesso</span><span><b>${Math.round(wx.cur.temp)}°</b></span><span style="color:var(--muted);font-size:12px">percepiti ${Math.round(wx.cur.feel)}°</span></span>`;
  }
  return h + '</div>';
}

export function init() {
  $('wxnow').addEventListener('click', () => { toast('Aggiorno il meteo…'); loadWeather(true, true); });
  setInterval(() => loadWeather(false), 15 * 60000);
  addEventListener('online', () => loadWeather(true));
  if (wx) update();
  loadWeather(false);
}

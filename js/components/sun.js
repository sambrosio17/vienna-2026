// Sunrise and sunset, computed on the phone (works offline).
import { D } from '../core/data.js';
import { fmtMin, dur } from '../core/time.js';
import { SUNRISE, SUNSET } from '../core/icons.js';
import { TZ } from '../core/config.js';

const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

// NOAA-style sunrise equation; returns minutes after midnight, Vienna time
export function sunTimes(date, lat = D.trip.city.lat, lng = D.trip.city.lng) {
  const rad = Math.PI / 180, J0 = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), 12) / 864e5 + 2440587.5;
  const n = Math.round(J0 - 2451545 - 0.0009 + (-lng) / 360);
  const Js = 2451545 + 0.0009 + (-lng) / 360 + n;
  const M = (357.5291 + 0.98560028 * (Js - 2451545)) % 360;
  const C = 1.9148 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 0.0003 * Math.sin(3 * M * rad);
  const L = (M + C + 180 + 102.9372) % 360;
  const Jt = Js + 0.0053 * Math.sin(M * rad) - 0.0069 * Math.sin(2 * L * rad);
  const dec = Math.asin(Math.sin(L * rad) * Math.sin(23.4397 * rad));
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec))) / rad;
  const vm = J => { const [h, m] = hm.format(new Date((J - 2440587.5) * 864e5)).split(':'); return +h * 60 + +m; };
  return { rise: vm(Jt - w / 360), set: vm(Jt + w / 360) };
}

export function sunHtml(d, live, nowM) {
  const s = sunTimes(d.date);
  let left = '';
  if (live) left = nowM < s.rise ? 'Alba tra ' + dur(s.rise - nowM) : nowM < s.set ? 'Buio tra ' + dur(s.set - nowM) : 'Già buio';
  return `<div class="sunrow" aria-label="Alba e tramonto"><span>${SUNRISE}Alba <b>${fmtMin(s.rise)}</b></span><span>${SUNSET}Tramonto <b>${fmtMin(s.set)}</b></span><span>${dur(s.set - s.rise)} di luce</span>${left ? `<span class="sunleft">${left}</span>` : ''}</div>`;
}

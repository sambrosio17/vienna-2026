// Vienna time, with an optional fake "now" for preview mode.
import { QS, PREVIEW, TZ } from './config.js';

let offset = 0;
if (PREVIEW) {
  const at = QS.get('at');
  if (at && !isNaN(Date.parse(at + ':00+01:00'))) offset = Date.parse(at + ':00+01:00') - Date.now();
}
export const nowDate = () => new Date(Date.now() + offset);

const partsFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export function viennaNow() {
  const p = partsFmt.formatToParts(nowDate());
  const g = t => p.find(x => x.type === t).value;
  const h = +g('hour') % 24, mi = +g('minute');
  return { date: `${g('year')}-${g('month')}-${g('day')}`, h, mi, s: +g('second'), min: h * 60 + mi };
}

export const pad = n => String(n).padStart(2, '0');
export const fmtMin = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const toMin = t => /^\d\d:\d\d$/.test(t) ? (+t.slice(0, 2)) * 60 + +t.slice(3) : null;
export const dur = m => m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)} min` : `${m} min`;

// Calendar dates ("2026-11-24") formatted in Italian
export const dayDate = date => new Date(date + 'T12:00:00');
export const fmtDate = (date, opts) => new Intl.DateTimeFormat('it-IT', opts).format(dayDate(date));
export const fmtNow = opts => new Intl.DateTimeFormat('it-IT', { timeZone: TZ, ...opts }).format(nowDate());

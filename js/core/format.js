export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const fmtDist = m => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';

export function ago(t) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'adesso';
  const m = Math.round(s / 60); if (m < 60) return m + ' min fa';
  const h = Math.round(m / 60); if (h < 24) return h + ' h fa';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(t);
}

// Countdown to departure: the number of days left on the app icon (badge), on the browser tab icon,
// and once a day as a notification (data/countdown.json). With the app closed the service worker
// does the same through Periodic Background Sync, where the phone supports it (Chrome on Android).
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { viennaNow } from '../core/time.js';
import { PREVIEW } from '../core/config.js';
import { on } from '../core/bus.js';

const SYNC_TAG = 'vie26-countdown';
const STATE_CACHE = 'vienna26-state';      // shared with sw.js: the date of the last countdown notification
const LAST_KEY = 'countdown-last';
const FROM_HOUR = 8;                        // no notifications before 8:00 Vienna time

let enabled = store.get('vie26-countdown', false);

// Days from today (Vienna) to the first day of the trip: 0 on departure day, negative after.
export function daysLeft() {
  const [y, m, d] = viennaNow().date.split('-').map(Number), [sy, sm, sd] = D.trip.start.split('-').map(Number);
  return Math.round((Date.UTC(sy, sm - 1, sd) - Date.UTC(y, m - 1, d)) / 864e5);
}

export function message(n) {
  const c = D.countdown;
  const title = n === 0 ? c.titleToday : n === 1 ? c.titleOne : c.title.replace('{n}', n);
  return { title, body: n === 0 ? c.today : c.messages[n] || c.default };
}

// ---- App icon badge (installed app: iPhone, Android launchers that show numbers, Windows/macOS)
function badge(n) {
  if (!('setAppBadge' in navigator)) return;
  (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

// ---- Browser tab icon with the number drawn on it
let baseImg = null;
function favicon(n) {
  const link = document.querySelector('link[rel="icon"]'); if (!link) return;
  if (!link.dataset.orig) link.dataset.orig = link.getAttribute('href');
  if (n <= 0) { link.href = link.dataset.orig; return; }
  const draw = () => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(baseImg, 0, 0, 64, 64);
    const txt = String(n), r = txt.length > 1 ? 19 : 16;
    g.fillStyle = '#d6332b'; g.beginPath(); g.arc(64 - r, 64 - r, r, 0, Math.PI * 2); g.fill();
    g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    g.fillStyle = '#fff'; g.font = `bold ${txt.length > 1 ? 22 : 24}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 64 - r, 64 - r + 1);
    link.type = 'image/png'; link.href = c.toDataURL('image/png');
  };
  if (baseImg && baseImg.complete) return draw();
  baseImg = new Image(); baseImg.onload = draw; baseImg.src = link.dataset.orig;
}

// ---- Daily notification, at most one a day, shared with the service worker
const lastUrl = () => new URL(LAST_KEY, location.href).href;
async function lastSent() {
  try { const r = await (await caches.open(STATE_CACHE)).match(lastUrl()); return r ? r.text() : ''; } catch (e) { return ''; }
}
async function markSent(date) {
  try { await (await caches.open(STATE_CACHE)).put(lastUrl(), new Response(date)); } catch (e) { /* storage blocked */ }
}

async function notifyToday(force = false) {
  const n = daysLeft(), now = viennaNow();
  if (n < 0 || PREVIEW) return;
  if (!force && (!enabled || now.h < FROM_HOUR || (await lastSent()) === now.date)) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const { title, body } = message(n);
  await markSent(now.date);
  const opts = { body, tag: 'vie26-countdown', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: n === 0 ? '#adesso' : './' } };
  try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, opts); }
  catch (e) { try { new Notification(title, opts); } catch (e2) { toast(title); } }
}

// Periodic Background Sync: lets the service worker update the badge and notify with the app closed.
async function registerSync(on) {
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return false;
    if (!on) { await reg.periodicSync.unregister(SYNC_TAG); return true; }
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state !== 'granted') return false;
    await reg.periodicSync.register(SYNC_TAG, { minInterval: 12 * 60 * 60 * 1000 });
    return true;
  } catch (e) { return false; }
}

function update() {
  const n = daysLeft();
  badge(n); favicon(n);
  render(n);
  notifyToday();
}

function render(n = daysLeft()) {
  const sw = $('cd-on'); if (!sw) return;
  sw.checked = enabled && 'Notification' in window && Notification.permission === 'granted';
  const when = n > 1 ? `Mancano ${n} giorni.` : n === 1 ? 'Si parte domani.' : n === 0 ? 'Si parte oggi.' : 'Viaggio iniziato.';
  $('cd-sub').textContent = `${when} Un messaggio al giorno dalle 8 e il numero sull’icona dell’app installata.`;
}

export function init() {
  const sw = $('cd-on');
  sw && sw.addEventListener('change', async e => {
    if (!e.target.checked) { enabled = false; store.set('vie26-countdown', false); registerSync(false); render(); return; }
    if (!('Notification' in window)) {
      e.target.checked = false;
      toast(/iPhone|iPad/.test(navigator.userAgent) ? 'Su iPhone funziona solo con l’app installata nella schermata Home' : 'Questo browser non supporta le notifiche');
      return;
    }
    if (await Notification.requestPermission() !== 'granted') { e.target.checked = false; toast('Notifiche non consentite: si attivano dalle impostazioni del telefono'); return; }
    enabled = true; store.set('vie26-countdown', true);
    const bg = await registerSync(true);
    badge(daysLeft()); render();
    await notifyToday(true);
    toast(bg ? 'Conto alla rovescia attivo, anche ad app chiusa' : 'Conto alla rovescia attivo: il messaggio arriva quando apri l’app');
  });
  if (enabled) registerSync(true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
  let lastDate = '';
  on('minute', () => { const d = viennaNow().date; if (d !== lastDate || viennaNow().h === FROM_HOUR) { lastDate = d; update(); } });
  update();
}

// for testing from the console / preview
export const _test = { daysLeft, message, notifyToday, enable: v => { enabled = v; } };

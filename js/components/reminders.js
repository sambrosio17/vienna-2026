// Entry reminders (data/reminders.json): notifications while the app is open, plus a calendar file with alarms
// that works with the app closed.
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { viennaNow, fmtMin, toMin, fmtDate } from '../core/time.js';
import { on } from '../core/bus.js';

let enabled = store.get('vie26-remind', false);
const fired = new Set(store.get('vie26-remfired', []));

// Each reminder joined with its stop in the programme
function list() {
  return D.reminders.map(r => {
    const day = D.days.find(x => x.date === r.date), it = day && day.items.find(x => !x.leg && x.t === r.time);
    return it && { date: r.date, it, lead: r.before, early: r.early || 0, key: r.date + ' ' + r.time };
  }).filter(Boolean);
}

function text(r) {
  const what = r.it.kind === 'base' && /Aeroporto/.test(r.it.name)
    ? 'Volo alle 17:40: essere in aeroporto alle 16:00'
    : `Ingresso alle ${r.it.t}${r.early ? `, arrivare ${r.early} minuti prima` : ''}`;
  return { title: `Tra ${r.lead} min: ${r.it.name}`, body: what + (r.it.ticket ? '. Tocca per il biglietto.' : '.') };
}

async function notify(r) {
  const { title, body } = text(r), url = r.it.ticket ? '#biglietto-' + r.it.ticket : '#adesso';
  toast(title);
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, tag: 'vie26-' + r.key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url }, requireInteraction: true };
  try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, opts); }
  catch (e) { try { new Notification(title, opts); } catch (e2) { /* nothing else to try */ } }
}

function check() {
  if (!enabled) return;
  const n = viennaNow();
  list().forEach(r => {
    if (n.date === r.date && n.min >= r.it.m - r.lead && n.min < r.it.m && !fired.has(r.key)) {
      fired.add(r.key); store.set('vie26-remfired', [...fired]); notify(r);
    }
  });
}

function render() {
  const sw = $('rem-on'); if (!sw) return;
  sw.checked = enabled && (!('Notification' in window) || Notification.permission === 'granted');
  const n = viennaNow(), nx = list().find(r => r.date > n.date || (r.date === n.date && r.it.m > n.min));
  $('rem-sub').textContent = (nx ? `Prossimo: ${nx.it.name}, ${fmtDate(nx.date, { day: 'numeric', month: 'short' })} alle ${fmtMin(nx.it.m - nx.lead)}. ` : '')
    + 'Arrivano solo con l’app aperta o appena chiusa: per avvisi sicuri aggiungili al calendario.';
}

function ics() {
  const z = (date, min) => new Date(`${date}T${fmtMin(min)}:00+01:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const escI = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ev = list().map(r => {
    const { title, body } = text(r), end = r.it.end ? toMin(r.it.end) : r.it.m + 60;
    return ['BEGIN:VEVENT', `UID:vienna26-${r.key.replace(/\W/g, '')}@sambrosio17.github.io`, `DTSTAMP:${stamp}`, `DTSTART:${z(r.date, r.it.m)}`, `DTEND:${z(r.date, end)}`,
      `SUMMARY:${escI(r.it.name)}`, `DESCRIPTION:${escI(body.replace(' Tocca per il biglietto.', ' Biglietto nell’app Vienna 2026.'))}`, `LOCATION:${escI(r.it.place)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escI(title)}`, `TRIGGER:-PT${r.lead}M`, 'END:VALARM', 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vienna 2026//IT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

export function init() {
  $('rem-on').addEventListener('change', async e => {
    if (!e.target.checked) { enabled = false; store.set('vie26-remind', false); render(); return; }
    if (!('Notification' in window)) {
      e.target.checked = false;
      toast(/iPhone|iPad/.test(navigator.userAgent) ? 'Su iPhone le notifiche funzionano solo con l’app installata nella schermata Home' : 'Questo browser non supporta le notifiche: usa il calendario');
      return;
    }
    if (await Notification.requestPermission() !== 'granted') { e.target.checked = false; toast('Notifiche non consentite: si attivano dalle impostazioni del telefono'); return; }
    enabled = true; store.set('vie26-remind', true); render();
    try { const reg = await navigator.serviceWorker.ready; reg.showNotification('Promemoria attivi', { body: 'Ti avviso 30 minuti prima degli ingressi a orario.', icon: 'icons/icon-192.png', tag: 'vie26-test' }); }
    catch (err) { toast('Promemoria attivi'); }
  });
  $('rem-ics').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([ics()], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = 'vienna-2026-promemoria.ics'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000); toast('Apri il file per aggiungere i promemoria al calendario');
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  on('minute', () => { check(); render(); });
  render();
}

// for testing from the console / preview
export const _test = { list, check, ics, enable: v => { enabled = v; } };

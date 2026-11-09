// Tickets: list by day, unlock with the trip password, full-screen viewer.
// The site only holds encrypted .enc files; with the password the app decrypts them into a local cache
// that the service worker serves offline at tickets/<file>.
import { D, ticketById, stopForTicket } from '../core/data.js';
import { $, toast } from '../core/dom.js';
import { esc } from '../core/format.js';
import { fmtDate } from '../core/time.js';
import { TICKET } from '../core/icons.js';
import { showView } from './router.js';
import { goToStop } from './programme.js';

const CACHE = 'vienna26-tickets';
const fileUrl = f => new URL('tickets/' + f, location.href).href;
export let ready = false;
let busy = false, error = '', openedInApp = false, wakeLock = null;
const blobs = {};

const allFiles = () => [...new Set(D.tickets.flatMap(t => [...t.pages.map(p => p.file), ...t.pdfs.map(p => p.file)]))];

export async function check() {
  try {
    const c = await caches.open(CACHE);
    ready = (await Promise.all(allFiles().map(f => c.match(fileUrl(f))))).every(Boolean);
  } catch (e) { ready = false; }
  return ready;
}

async function unlock(pass) {
  const b64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  const meta = await (await fetch('tickets-enc/meta.json', { cache: 'no-cache' })).json();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(meta.salt), iterations: meta.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const dec = buf => crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
  try { await dec(b64(meta.check)); } catch (e) { throw new Error('pass'); }
  const c = await caches.open(CACHE);
  for (const f of allFiles()) {
    const enc = new Uint8Array(await (await fetch('tickets-enc/' + f + '.enc')).arrayBuffer());
    const type = f.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
    await c.put(fileUrl(f), new Response(new Blob([await dec(enc)], { type }), { headers: { 'Content-Type': type } }));
  }
}

async function lock() {
  await caches.delete(CACHE);
  Object.values(blobs).forEach(u => URL.revokeObjectURL(u)); for (const k in blobs) delete blobs[k];
  ready = false; render();
}

// Object URL of a decrypted file (works even when the service worker is not in control yet)
async function src(f) {
  if (blobs[f]) return blobs[f];
  const r = await (await caches.open(CACHE)).match(fileUrl(f)); if (!r) return '';
  return blobs[f] = URL.createObjectURL(await r.blob());
}

export function focusUnlock() {
  showView('biglietti');
  requestAnimationFrame(() => { const i = $('tkpass'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } });
}

// Button shown on a stop of the programme
export function tkButton(id) {
  const t = ticketById(id); if (!t) return '';
  const bad = t.status !== 'ok';
  return `<button class="tkbtn${bad ? ' bad' : ''}" type="button" data-tk="${id}">${TICKET}${bad ? 'Solo ricevuta' : 'Biglietto'} <span>· ${esc(t.who)}</span></button>`;
}

function lockHtml() {
  return `<section class="tklock" id="tklock"><h3>Biglietti protetti</h3>
    <p>I biglietti sono cifrati. Inserisci la password del viaggio una volta sola: poi restano su questo telefono e si aprono anche offline.</p>
    <form id="tkform" autocomplete="off"><input id="tkpass" type="password" placeholder="Password del viaggio" aria-label="Password del viaggio" autocapitalize="off" autocorrect="off" spellcheck="false">
    <button type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Sblocco…' : 'Sblocca'}</button></form>
    ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}</section>`;
}

function ticketHtml(t) {
  const ok = t.status === 'ok', stop = stopForTicket(t.id);
  const pdfs = t.pdfs.map(p => `<a class="smallbtn" href="tickets/${p.file}" data-tkpdf="${p.file}" target="_blank" rel="noopener">${t.pdfs.length > 1 ? 'PDF ' + esc(p.label) : esc(p.label)}</a>`).join('');
  return `<article class="tk"><div class="tk-body">
      <span class="tk-status${ok ? '' : ' bad'}">${ok ? 'Valido' : 'Manca il voucher'}</span>
      <div class="tk-time">${esc(t.time)}</div><h4>${esc(t.name)}</h4>
      <p class="tk-who">${esc(t.who)}</p><p class="tk-note">${esc(t.note)}</p>
      ${t.warn ? `<div class="warn">${esc(t.warn)}</div>` : ''}
      <p class="tk-ref">${esc(t.ref)}</p></div>
    <div class="tk-stub">
      ${t.pages.length ? `<button class="smallbtn call" type="button" data-show="${t.id}">Mostra${t.pages.length > 1 ? ' (' + t.pages.length + ')' : ''}</button>` : ''}
      ${pdfs}
      ${stop ? `<button class="smallbtn" type="button" data-stop="${stop.id}">Nel programma</button>` : ''}
    </div></article>`;
}

export function render() {
  const byDate = {};
  D.tickets.forEach(t => (byDate[t.date] ||= []).push(t));
  let h = ready ? '' : lockHtml();
  Object.keys(byDate).sort().forEach(date => {
    h += `<div class="group"><h3>${esc(fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h3><div class="tkgrid">${byDate[date].map(ticketHtml).join('')}</div></div>`;
  });
  h += `<div class="group"><h3>Da completare</h3><div class="list">${D.missing.map(m => `<div class="item"><span class="lab">${esc(m.name)}</span><span class="sub">${esc(m.note)}</span></div>`).join('')}</div></div>`;
  if (ready) h += `<p class="tkrelock">Biglietti salvati su questo telefono · <button type="button" id="tkrelock">Toglili</button></p>`;
  $('tickets').innerHTML = h;
}

// Open a ticket from the programme or the list (goes through the URL so "back" closes it)
export function openTicket(id) {
  const t = ticketById(id); if (!t) return;
  if (!t.pages.length) { location.hash = '#biglietti'; return; }
  if (!ready) { location.hash = '#biglietti'; focusUnlock(); return; }
  openedInApp = true; location.hash = '#biglietto-' + id;
}

export function showViewer(t) {
  $('vw-title').textContent = t.name;
  $('vw-sub').textContent = `${fmtDate(t.date, { day: 'numeric', month: 'long' })} · ${t.time} · ${t.who}`;
  const jump = t.pages.length > 1 ? `<nav class="vw-jump">${t.pages.map((p, i) => `<a href="#vw-${t.id}-${i}" data-jump="vw-${t.id}-${i}">${esc(p.label)}</a>`).join('')}</nav>` : '';
  $('vw-pages').innerHTML = jump + `<p class="vw-hint">Tocca il biglietto per ingrandire il codice.</p>`
    + t.pages.map((p, i) => `<figure class="vw-page" id="vw-${t.id}-${i}" style="margin:0">${t.pages.length > 1 ? `<b>${esc(p.label)}</b>` : ''}<div class="scroller"><img data-tksrc="${p.file}" alt="${esc(t.name)}, ${esc(p.label)}" loading="${i ? 'lazy' : 'eager'}"></div></figure>`).join('')
    + `<p class="vw-pdf">${esc(t.ref)}</p>`;
  document.querySelectorAll('#vw-pages img[data-tksrc]').forEach(async img => { img.src = await src(img.dataset.tksrc); });
  $('viewer').hidden = false; document.body.classList.add('noscroll');
  $('vw-pages').scrollTop = 0;
  try { navigator.wakeLock && navigator.wakeLock.request('screen').then(l => wakeLock = l).catch(() => {}); } catch (e) { /* no wake lock */ }
}

export function hideViewer() {
  const v = $('viewer'); if (v.hidden) return;
  v.hidden = true; document.body.classList.remove('noscroll');
  try { wakeLock && wakeLock.release(); } catch (e) { /* already released */ }
  wakeLock = null;
}

// Route #biglietto-<id>
export function showFromHash(id) {
  const t = ticketById(id); if (!t || !t.pages.length) return false;
  showView('biglietti');
  if (ready) showViewer(t); else { hideViewer(); focusUnlock(); }
  return true;
}

export function init() {
  document.addEventListener('submit', async e => {
    if (e.target.id !== 'tkform') return; e.preventDefault();
    const pass = $('tkpass').value; if (!pass || busy) return;
    busy = true; error = ''; render();
    try { await unlock(pass); await check(); busy = false; render(); toast('Biglietti sbloccati su questo telefono'); }
    catch (err) { busy = false; error = err.message === 'pass' ? 'Password sbagliata.' : 'Non riesco a scaricare i biglietti: la prima volta serve la connessione.'; render(); focusUnlock(); }
  });
  document.addEventListener('click', async e => {
    if (e.target.closest('#tkrelock')) { if (confirm('Togliere i biglietti da questo telefono? Per rivederli servirà di nuovo la password.')) lock(); return; }
    const a = e.target.closest('a[data-tkpdf]'); if (!a) return;
    if (!ready) { e.preventDefault(); focusUnlock(); return; }
    if (!(navigator.serviceWorker && navigator.serviceWorker.controller)) { e.preventDefault(); const u = await src(a.dataset.tkpdf); if (u) window.open(u, '_blank'); }
  });
  $('tickets').addEventListener('click', e => {
    const s = e.target.closest('[data-show]'); if (s) { openTicket(s.dataset.show); return; }
    const p = e.target.closest('[data-stop]'); if (p) goToStop(p.dataset.stop);
  });
  $('vw-pages').addEventListener('click', e => {
    const img = e.target.closest('.vw-page img');
    if (img) { // tap to zoom on the code, keeping the tapped point centred
      const f = img.closest('.vw-page'), sc = img.parentElement, r = img.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      f.classList.toggle('zoom');
      if (f.classList.contains('zoom')) requestAnimationFrame(() => {
        sc.scrollLeft = fx * img.offsetWidth - sc.clientWidth / 2;
        const pg = $('vw-pages'); pg.scrollTop += img.getBoundingClientRect().top + fy * img.offsetHeight - pg.clientHeight / 2 - pg.getBoundingClientRect().top;
      });
      return;
    }
    const a = e.target.closest('[data-jump]'); if (!a) return; e.preventDefault();
    $(a.dataset.jump).scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  $('vw-close').addEventListener('click', () => { if (openedInApp) { openedInApp = false; history.back(); } else location.hash = '#biglietti'; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('viewer').hidden) $('vw-close').click(); });
  render();
  check().then(ok => { if (ok) { render(); if (/^#biglietto-/.test(location.hash)) showFromHash(location.hash.slice(11)); } });
}

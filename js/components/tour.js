// Interactive guide: highlights one element at a time with a short explanation (steps in data/tour.json).
import { D } from '../core/data.js';
import { S, setDay } from '../core/state.js';
import { store } from '../core/store.js';
import { $ } from '../core/dom.js';
import { emit } from '../core/bus.js';

let i = 0, startDay = 0;
const open = () => !$('tour').hidden;

export function startTour() { i = 0; startDay = S.cur; $('tour').hidden = false; showStep(); }

function end() {
  $('tour').hidden = true; store.set('vie26-toured', true);
  if (S.cur !== startDay) setDay(startDay);
}

function showStep() {
  const s = D.tour[i], want = s.day != null ? s.day : startDay;
  const switching = S.view !== s.view;
  if (switching) { S.cur = want; location.hash = '#giorno-' + (want + 1); }
  else if (S.cur !== want) setDay(want);
  if (S.filter !== 'all') { S.filter = 'all'; store.set('vie26-filter', 'all'); emit('programme'); }
  const go = () => {
    const el = document.querySelector(s.sel);
    if (!el) { if (i < D.tour.length - 1) { i++; showStep(); } else end(); return; }
    const fixed = el.closest('.dock,.bar,header');
    if (!fixed) el.scrollIntoView({ block: 'center' }); else if (el.closest('header')) window.scrollTo({ top: 0 });
    // setTimeout rather than rAF: works even when the tab is in the background
    setTimeout(() => place(el, s), 90);
  };
  setTimeout(go, switching ? 120 : 0);
}

function place(el, s) {
  const r = el.getBoundingClientRect(), pad = 6, spot = $('tour-spot'), card = $('tour-card');
  Object.assign(spot.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
  $('tour-step').textContent = `${i + 1} di ${D.tour.length}`;
  $('tour-title').textContent = s.title;
  $('tour-text').textContent = s.text;
  $('tour-prev').style.visibility = i ? 'visible' : 'hidden';
  $('tour-next').textContent = i === D.tour.length - 1 ? 'Fine' : 'Avanti';
  const cw = Math.min(340, innerWidth - 24); card.style.width = cw + 'px';
  const ch = card.offsetHeight, below = r.bottom + pad + 12, above = r.top - pad - 12 - ch;
  const top = (r.top + r.height / 2 < innerHeight / 2 || above < 12) ? Math.min(below, innerHeight - ch - 12) : above;
  card.style.top = Math.max(12, top) + 'px';
  card.style.left = Math.max(12, Math.min(innerWidth - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
  $('tour-next').focus({ preventScroll: true });
}

export function init() {
  $('tour-next').addEventListener('click', () => { if (i < D.tour.length - 1) { i++; showStep(); } else end(); });
  $('tour-prev').addEventListener('click', () => { if (i > 0) { i--; showStep(); } });
  $('tour-skip').addEventListener('click', end);
  addEventListener('resize', () => { if (open()) showStep(); });
  document.addEventListener('keydown', e => {
    if (!open()) return;
    if (e.key === 'Escape') end();
    if (e.key === 'ArrowRight') $('tour-next').click();
    if (e.key === 'ArrowLeft') $('tour-prev').click();
  });
}

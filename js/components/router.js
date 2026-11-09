// Sections and URL hashes: #giorno-N, #adesso, #biglietti, #biglietto-ID, #mappa, #giochi, #utili, #info
import { S } from '../core/state.js';
import { tripIndex } from '../core/data.js';
import { $ } from '../core/dom.js';
import { emit } from '../core/bus.js';
import { render as renderProgramme, scrollToNow } from './programme.js';
import { showFromHash, hideViewer } from './tickets.js';
import { show as showMap } from './map.js';
import { renderMenu, isPlaying } from './games/index.js';

// Position of each section in the dock (the indicator slides under it); info and giochi are not in the dock
const DOCK = { programma: 0, biglietti: 1, mappa: 3, utili: 4 };

export function showView(v) {
  S.view = v;
  document.querySelectorAll('.view').forEach(el => el.hidden = el.dataset.view !== v);
  document.querySelectorAll('[data-prog]').forEach(el => el.hidden = v !== 'programma');
  document.querySelectorAll('.dock [data-go]').forEach(b => b.dataset.go === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  const ind = $('indicator');
  ind.style.opacity = v in DOCK ? 1 : 0;
  if (v in DOCK) ind.style.transform = `translateX(${DOCK[v] * 100}%)`;
  if (v === 'mappa') showMap();
}

// Today's day (if we are travelling), scrolled to the "now" line
function goNow(smooth) {
  const ti = tripIndex(); if (ti >= 0) S.cur = ti;
  history.replaceState(null, '', '#giorno-' + (S.cur + 1));
  renderProgramme(); showView('programma');
  requestAnimationFrame(() => scrollToNow(smooth));
}

export function route() {
  const h = location.hash;
  const tm = h.match(/^#biglietto-([a-z]+)$/);
  if (tm && showFromHash(tm[1])) return;
  hideViewer();
  if (h === '#biglietti' || h === '#utili' || h === '#mappa' || h === '#info') return showView(h.slice(1));
  if (h === '#giochi') { if (S.view !== 'giochi' && !isPlaying()) renderMenu(); return showView('giochi'); }
  if (h === '#adesso') return goNow(false);
  const m = h.match(/^#giorno-(\d+)$/);
  const ti = tripIndex();
  S.cur = m ? Math.max(0, +m[1] - 1) : ti >= 0 ? ti : S.cur;
  emit('day'); showView('programma');
}

export function initialDay() {
  const m = location.hash.match(/^#giorno-(\d+)$/);
  if (m) return Math.max(0, +m[1] - 1);
  const i = tripIndex(); return i >= 0 ? i : 0;
}

export function init() {
  document.querySelector('.dock').addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const go = b.dataset.go;
    if (go === 'adesso') { goNow(true); return; }
    const target = go === 'programma' ? '#giorno-' + (S.cur + 1) : '#' + go;
    if (location.hash !== target) location.hash = target; else showView(go);
    window.scrollTo({ top: 0 });
  });
  addEventListener('hashchange', route);
}

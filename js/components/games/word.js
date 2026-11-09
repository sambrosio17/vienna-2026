// Secret word: guess a Viennese word letter by letter before the Ferris wheel gondolas go dark (data/games/words.json)
import { D } from '../../core/data.js';
import { store } from '../../core/store.js';
import { esc } from '../../core/format.js';
import { board, topBar } from './common.js';

const GONDOLAS = 8;
let s = null;

function wheel(on) {
  let svg = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="60" cy="52" r="38" stroke-width="4"/>';
  for (let i = 0; i < GONDOLAS; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / GONDOLAS, x = 60 + Math.cos(a) * 38, y = 52 + Math.sin(a) * 38;
    svg += `<path d="M60 52L${x.toFixed(1)} ${y.toFixed(1)}" stroke-width="1.5"/><circle class="${i < on ? '' : 'off'}" cx="${x.toFixed(1)}" cy="${(y + 6).toFixed(1)}" r="7" fill="currentColor" stroke="none"/>`;
  }
  return svg + '<path d="M60 52L40 108M60 52l20 56M28 108h64" stroke-width="4"/><circle cx="60" cy="52" r="5" fill="var(--now)" stroke="none"/></svg>';
}

function newWord(keepStreak) {
  const prev = s;
  const pool = D.words.filter(w => !prev || w.word !== prev.w);
  const { word, hint } = pool[Math.floor(Math.random() * pool.length)];
  s = { w: word, h: hint, got: new Set(), miss: new Set(), streak: keepStreak && prev ? prev.streak : 0 };
  render();
}

function render() {
  const left = GONDOLAS - s.miss.size, won = [...s.w].every(c => s.got.has(c)), lost = left <= 0;
  if (won && !s.counted) { s.counted = true; s.streak++; if (s.streak > store.get('vie26-g-word', 0)) store.set('vie26-g-word', s.streak); }
  if (lost && !s.counted) { s.counted = true; s.streak = 0; }
  let h = topBar('Parola segreta', `<span>Cabine accese <b>${left}</b>/${GONDOLAS}</span><span>Serie <b>${s.streak}</b></span>`);
  h += `<div class="qcard"><div class="hwheel" aria-hidden="true">${wheel(left)}</div>
    <div class="hword" aria-label="Parola da indovinare">${[...s.w].map(c => `<span>${won || lost || s.got.has(c) ? c : ''}</span>`).join('')}</div>
    <p class="hhint">${esc(s.h)}</p>`;
  if (won || lost) h += `<div class="gend" style="padding:8px 0 0"><p>${won ? 'Indovinata!' : 'La parola era <b>' + s.w + '</b>.'}</p><button class="smallbtn call" type="button" data-g="wnext">Nuova parola</button></div>`;
  else h += `<div class="kbd">${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c => `<button type="button" data-k="${c}" class="${s.got.has(c) ? 'hit' : s.miss.has(c) ? 'miss' : ''}" ${s.got.has(c) || s.miss.has(c) ? 'disabled' : ''}>${c}</button>`).join('')}</div>`;
  board().innerHTML = h + '</div>';
}

function guess(c) { if (!s || s.counted) return; (s.w.includes(c) ? s.got : s.miss).add(c); render(); }

export default {
  id: 'word', name: 'Parola segreta', color: '#a3322b', letter: 'W',
  desc: 'Indovina la parola viennese lettera per lettera prima che si spengano le cabine della ruota.',
  best: () => { const b = store.get('vie26-g-word', 0); return b ? `Serie migliore: ${b}` : 'Mai giocato'; },
  start() { s = null; newWord(false); },
  click(e) {
    if (e.target.closest('[data-g="wnext"]')) { newWord(true); return true; }
    const k = e.target.closest('[data-k]'); if (k) { guess(k.dataset.k); return true; }
    return false;
  },
  key(e) { if (/^[a-z]$/i.test(e.key) && !e.metaKey && !e.ctrlKey) guess(e.key.toUpperCase()); }
};

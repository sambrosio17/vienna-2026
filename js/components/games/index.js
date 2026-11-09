// Games section (all offline). To add a game: create a module like quiz.js and list it here.
import { S } from '../../core/state.js';
import { esc } from '../../core/format.js';
import { board } from './common.js';
import quiz from './quiz.js';
import memory from './memory.js';
import word from './word.js';

const GAMES = [quiz, memory, word];
let active = null;

export function renderMenu() {
  if (active && active.stop) active.stop();
  active = null;
  board().innerHTML = `<div class="viewhead"><h2>Giochi</h2><p>Per l’aereo e per le attese. Funzionano senza connessione.</p></div>
    <div class="gcards">${GAMES.map(g => `<button class="gcard" type="button" data-g="${g.id}"><span class="gi" style="background:${g.color}">${g.letter}</span><b>${esc(g.name)}</b><span>${esc(g.desc)}</span><em>${esc(g.best())}</em></button>`).join('')}</div>`;
}
export const isPlaying = () => !!active;

export function init() {
  board().addEventListener('click', e => {
    if (active && active.click(e)) return;
    const g = e.target.closest('[data-g]'); if (!g) return;
    if (g.dataset.g === 'menu') { renderMenu(); window.scrollTo({ top: 0 }); return; }
    const game = GAMES.find(x => x.id === g.dataset.g);
    if (game) { if (active && active.stop) active.stop(); active = game; game.start(); window.scrollTo({ top: 0 }); }
  });
  document.addEventListener('keydown', e => { if (S.view === 'giochi' && active && active.key) active.key(e); });
  renderMenu();
}

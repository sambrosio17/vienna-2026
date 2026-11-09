// German memory: match German words with their Italian translation (data/games/memory.json)
import { D } from '../../core/data.js';
import { store } from '../../core/store.js';
import { esc } from '../../core/format.js';
import { WHEEL } from '../../core/icons.js';
import { board, shuffle, topBar } from './common.js';

const PAIRS = 8;
let s = null;

function render() {
  const won = s.done.size === PAIRS;
  let h = topBar('Memory del tedesco', `<span>Mosse <b>${s.moves}</b></span><span>Coppie <b>${s.done.size}</b>/${PAIRS}</span>`);
  if (won) {
    const best = store.get('vie26-g-memo', null), record = best == null || s.moves < best;
    if (record) store.set('vie26-g-memo', s.moves);
    h += `<div class="qcard gend"><div class="big">${s.moves}</div><p>mosse per trovare tutte le coppie.${record ? ' Nuovo record!' : ''}</p><button class="smallbtn call" type="button" data-g="memo">Gioca ancora</button></div>`;
  }
  h += `<div class="mgrid">${s.cards.map((c, i) => {
    const up = s.open.includes(i), ok = s.done.has(c.p);
    return `<button class="mcard${up ? ' up' : ''}${ok ? ' ok' : ''}" type="button" data-mc="${i}" aria-label="${up || ok ? esc(c.t) : 'Carta coperta'}" ${ok ? 'disabled' : ''}><span class="in"><span class="f">${WHEEL}</span><span class="b"><span><small>${c.l}</small>${esc(c.t)}</span></span></span></button>`;
  }).join('')}</div>`;
  board().innerHTML = h;
}

function flip(i) {
  if (s.lock || s.open.includes(i) || s.done.has(s.cards[i].p)) return;
  s.open.push(i);
  if (s.open.length === 2) {
    s.moves++;
    const [a, b] = s.open;
    if (s.cards[a].p === s.cards[b].p) { s.done.add(s.cards[a].p); s.open = []; render(); return; }
    const game = s; s.lock = true; render();
    setTimeout(() => { game.open = []; game.lock = false; if (s === game) render(); }, 900);
    return;
  }
  render();
}

export default {
  id: 'memo', name: 'Memory del tedesco', color: '#2f7d4f', letter: 'Ä',
  desc: 'Abbina la parola tedesca alla traduzione: 8 coppie da trovare con meno mosse possibile.',
  best: () => { const b = store.get('vie26-g-memo', null); return b != null ? `Record: ${b} mosse` : 'Mai giocato'; },
  start() {
    const pairs = shuffle(D.memory).slice(0, PAIRS);
    s = { cards: shuffle(pairs.flatMap((p, i) => [{ p: i, t: p.de, l: 'Tedesco' }, { p: i, t: p.it, l: 'Italiano' }])), open: [], done: new Set(), moves: 0, lock: false };
    render();
  },
  click(e) { const mc = e.target.closest('[data-mc]'); if (!mc) return false; flip(+mc.dataset.mc); return true; },
  stop() { s = null; }
};

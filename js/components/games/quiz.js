// Quiz on Vienna: 10 random questions from data/games/quiz.json
import { D } from '../../core/data.js';
import { store } from '../../core/store.js';
import { esc } from '../../core/format.js';
import { board, shuffle, topBar } from './common.js';

const ROUNDS = 10;
let s = null;

function render() {
  if (s.i >= s.qs.length) {
    const best = store.get('vie26-g-quiz', 0); if (s.score > best) store.set('vie26-g-quiz', s.score);
    const msg = s.score >= 9 ? 'Siete pronti per fare da guida!' : s.score >= 6 ? 'Ottimo, Vienna non ha segreti.' : 'Qualcosa lo scoprirete di persona.';
    board().innerHTML = topBar('Quiz su Vienna') + `<div class="qcard gend"><div class="big">${s.score}/${ROUNDS}</div><p>${msg}${s.score > best ? ' Nuovo record!' : ''}</p><button class="smallbtn call" type="button" data-g="quiz">Gioca ancora</button></div>`;
    return;
  }
  const q = s.qs[s.i];
  board().innerHTML = topBar('Quiz su Vienna', `<span>Domanda <b>${s.i + 1}</b>/${ROUNDS}</span><span>Punti <b>${s.score}</b></span>`) +
    `<div class="qcard"><div class="qprog"><i style="width:${s.i * 100 / ROUNDS}%"></i></div><h3>${esc(q.q)}</h3>
    <div class="qopts">${q.opts.map(([t, ok], i) => `<button class="qopt${s.ans != null ? (ok ? ' right' : (i === s.ans ? ' wrong' : '')) : ''}" type="button" data-qa="${i}" ${s.ans != null ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
    ${s.ans != null ? `<p class="qexp">${q.opts[s.ans][1] ? 'Giusto! ' : 'Non proprio. '}${esc(q.exp)}</p><button class="smallbtn call" type="button" data-g="qnext" style="justify-self:end">${s.i === ROUNDS - 1 ? 'Risultato' : 'Avanti'}</button>` : ''}</div>`;
}

export default {
  id: 'quiz', name: 'Quiz su Vienna', color: '#b8891c', letter: '?',
  desc: '10 domande su storia, arte e cucina, con la spiegazione dopo ogni risposta.',
  best: () => { const b = store.get('vie26-g-quiz', null); return b != null ? `Record: ${b}/${ROUNDS}` : 'Mai giocato'; },
  start() {
    s = { qs: shuffle(D.quiz).slice(0, ROUNDS).map(q => ({ q: q.question, opts: shuffle(q.options.map((t, i) => [t, i === q.answer])), exp: q.explain })), i: 0, score: 0, ans: null };
    render();
  },
  click(e) {
    const qa = e.target.closest('[data-qa]');
    if (qa && s.ans == null) { s.ans = +qa.dataset.qa; if (s.qs[s.i].opts[s.ans][1]) s.score++; render(); return true; }
    const g = e.target.closest('[data-g="qnext"]');
    if (g) { s.i++; s.ans = null; render(); return true; }
    return false;
  }
};

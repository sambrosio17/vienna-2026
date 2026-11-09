// Programme: day tabs, filters and the timeline of the selected day.
import { D, stops, tripIndex } from '../core/data.js';
import { S, setDay, setFilter, toggleDone, resetDone } from '../core/state.js';
import { $, reducedMotion } from '../core/dom.js';
import { esc } from '../core/format.js';
import { viennaNow, fmtMin, fmtDate, dayDate } from '../core/time.js';
import { PIN, CHECK, GAMEPAD } from '../core/icons.js';
import { mapUrl, routeUrl } from '../core/links.js';
import { on } from '../core/bus.js';
import { wxTabHtml, wxDayHtml } from './weather.js';
import { sunHtml } from './sun.js';
import { nextStopHtml, walkTag } from './nextStop.js';
import { tkButton, openTicket } from './tickets.js';
import { showView } from './router.js';

const KIND = { base: 'Base', visita: 'Visita', mercatino: 'Mercatino', cibo: 'Cibo', passeggio: 'Passeggiata', passaggio: 'Di passaggio' };
const TAG = { free: ['free', 'Gratis'], nobook: ['', 'Senza prenotazione'], book: ['book', 'Prenotazione'], opt: ['opt', 'Opzionale'] };
const FILTERS = [['all', 'Tutto'], ['visita', 'Visite'], ['mercatino', 'Mercatini'], ['cibo', 'Cibo']];
export const kindLabel = k => KIND[k];

export function renderTabs() {
  const ti = tripIndex();
  $('tabs').innerHTML = D.days.map((d, i) => {
    const st = stops(d), pct = Math.round(st.filter(x => S.done.has(x.id)).length / st.length * 100);
    const dt = dayDate(d.date);
    return `<button class="daytab" role="tab" id="tab-${i}" aria-selected="${i === S.cur}" aria-controls="day" data-i="${i}">
      ${i === ti ? '<span class="today">Oggi</span>' : ''}
      <span class="dw">${fmtDate(d.date, { weekday: 'short' })}</span><span class="dn">${dt.getDate()} nov</span>
      ${wxTabHtml(d)}
      <span class="prog" aria-hidden="true"><i style="width:${pct}%"></i></span></button>`;
  }).join('');
  $('filters').innerHTML = FILTERS.map(([k, l]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${S.filter === k}">${l}</button>`).join('');
}

function legHtml(it, past) {
  return `<li class="leg${past ? ' past' : ''}${S.filter !== 'all' ? ' hidden' : ''}"><div class="time">${esc(it.t)}</div><div class="dot"><i></i></div>
    <div class="ticket"><div class="lines">${it.lines.map(l => `<span class="ln ${l.type}">${esc(l.label)}</span>`).join('')}<span class="dur">${esc(it.dur)}</span></div><div>${esc(it.text)}</div></div></li>`;
}

function stopHtml(it, past, isNow) {
  const isDone = S.done.has(it.id), hide = S.filter !== 'all' && it.kind !== S.filter;
  const tags = (it.tags || []).map(t => `<span class="tag ${TAG[t][0]}">${TAG[t][1]}</span>`).join('')
    + (it.dist ? `<span class="tag">${esc(it.dist)}</span>` : '') + walkTag(it);
  return `<li id="s-${it.id}" class="row k-${it.kind}${isDone ? ' done' : ''}${isNow ? ' now' : ''}${past ? ' past' : ''}${hide ? ' hidden' : ''}">
    <div class="time">${esc(it.t)}${it.end ? `<span class="e">${esc(it.end)}</span>` : ''}</div><div class="dot"><i></i></div>
    <div class="card">
      <div><div class="kind">${isNow ? '<span class="nowtag">In corso · </span>' : ''}${KIND[it.kind]}</div><h3>${esc(it.name)}</h3></div>
      <div class="actions">
        <a class="iconbtn" href="${mapUrl(it.place)}" target="_blank" rel="noopener" aria-label="Apri ${esc(it.name)} in Google Maps">${PIN}</a>
        <button class="iconbtn check" type="button" data-id="${it.id}" aria-pressed="${isDone}" aria-label="Segna ${esc(it.name)} come fatta">${CHECK}</button>
      </div>
      ${it.note ? `<p>${esc(it.note)}</p>` : ''}
      ${it.way ? `<div class="waypoints">${it.way.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${it.ticket ? tkButton(it.ticket) : ''}
      ${it.games ? `<a class="tkbtn" href="#giochi" style="text-decoration:none">${GAMEPAD}Giochi per il volo <span>· funzionano offline</span></a>` : ''}
      ${it.warn ? `<div class="warn">${esc(it.warn)}</div>` : ''}
    </div></li>`;
}

export function renderDay() {
  const d = D.days[S.cur], n = viennaNow(), live = n.date === d.date, nowM = n.min;
  const st = stops(d), count = k => st.filter(s => s.kind === k).length;
  // current stop = last stop already started (only on the real day)
  let curId = null; if (live) st.forEach(s => { if (s.m <= nowM) curId = s.id; });
  // the "now" line goes before the first item starting after now
  let nowIdx = d.items.findIndex(it => it.m > nowM); if (nowIdx < 0) nowIdx = d.items.length;
  const first = st[0].m, lastStop = st[st.length - 1].m, span = Math.max(1, lastStop - first);
  const pct = Math.min(100, Math.max(0, (nowM - first) / span * 100));

  let h = `<div class="dayhead">
    <div class="eyebrow">Giorno ${S.cur + 1} · ${fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
    <h2>${esc(d.title)}</h2><p>${esc(d.intro)}</p>
    <div class="dayfoot"><span><b>${count('visita')}</b>visite</span><span><b>${count('mercatino')}</b>mercatini</span>
      <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><a class="routebtn" style="margin-left:0" href="#mappa">${PIN} Mappa</a><a class="routebtn" style="margin-left:0" href="${routeUrl(d)}" target="_blank" rel="noopener">Google Maps ↗</a></span></div>
    ${wxDayHtml(d, live)}
    ${sunHtml(d, live, nowM)}
    <div class="daybar" aria-label="Momento della giornata">
      <div class="track"><span class="fill" style="width:${pct}%"></span></div>
      <div class="lbl"><span>${fmtMin(first)}</span><b>${live ? 'Adesso' : 'Ora attuale'} ${fmtMin(nowM)}</b><span>${fmtMin(lastStop)}</span></div>
    </div>
    ${live ? nextStopHtml(d, nowM) : ''}
  </div><ol class="tl">`;

  const nowLine = `<li class="nowline${live ? '' : ' preview'}" id="nowline" aria-label="Ora attuale ${fmtMin(nowM)}">
    <span class="t">${fmtMin(nowM)}</span><span class="d"><i></i></span>
    <span class="l"><span>${live ? 'Adesso' : 'Ora attuale · da vedere il ' + dayDate(d.date).getDate() + ' nov'}</span></span></li>`;

  d.items.forEach((it, i) => {
    if (i === nowIdx) h += nowLine;
    const past = live && it.m < nowM && it.id !== curId;
    h += it.leg ? legHtml(it, past) : stopHtml(it, past, it.id === curId);
  });
  if (nowIdx === d.items.length) h += nowLine;
  const main = $('day');
  main.innerHTML = h + '</ol>';
  main.setAttribute('aria-labelledby', 'tab-' + S.cur); main.setAttribute('role', 'tabpanel');
}

export function render() { renderTabs(); renderDay(); }

export function scrollToNow(smooth) {
  const el = $('nowline'); if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
}

// Jump from elsewhere (tickets) to a stop in the programme, and make it flash
export function goToStop(id) {
  S.filter = 'all';
  setDay(+id.slice(1, id.indexOf('-')) - 1, 'push');
  showView('programma');
  requestAnimationFrame(() => {
    const el = $('s-' + id); if (!el) return;
    el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1700);
  });
}

export function init() {
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('.daytab'); if (!b) return;
    setDay(+b.dataset.i);
    const bar = document.querySelector('.bar');
    if (bar.getBoundingClientRect().top <= 0) window.scrollTo({ top: $('day').offsetTop - bar.offsetHeight - 8 });
  });
  $('filters').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setFilter(b.dataset.f); });
  $('day').addEventListener('click', e => {
    const t = e.target.closest('.tkbtn[data-tk]'); if (t) { openTicket(t.dataset.tk); return; }
    const b = e.target.closest('.check'); if (b) toggleDone(b.dataset.id);
  });
  $('resetbox').addEventListener('click', e => {
    const box = $('resetbox');
    if (e.target.id === 'reset') { box.innerHTML = '<div class="confirm">Azzerare tutte le tappe spuntate? <button type="button" id="yes">Azzera</button><button type="button" id="no">Annulla</button></div>'; return; }
    if (e.target.id === 'yes') resetDone();
    if (e.target.id === 'yes' || e.target.id === 'no') box.innerHTML = '<button class="reset" id="reset" type="button">Azzera le tappe spuntate</button>';
  });
  ['programme', 'day', 'minute', 'wx'].forEach(ev => on(ev, render));
}

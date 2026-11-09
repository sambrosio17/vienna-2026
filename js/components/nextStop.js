// "How do I get there": walking time from my position to each stop, and a card for the next stop
// with directions and a warning when a timed entry is at risk.
import { D, placeOf } from '../core/data.js';
import { S } from '../core/state.js';
import { toast } from '../core/dom.js';
import { esc, fmtDist } from '../core/format.js';
import { dur } from '../core/time.js';
import { distM } from '../core/geo.js';
import { WALK, BUS } from '../core/icons.js';
import { dirUrl } from '../core/links.js';
import { on, emit } from '../core/bus.js';
import { startWatch } from './position.js';

const posNow = () => S.myPos && Date.now() - S.myPos.t < 10 * 60000 ? S.myPos : null;
const nearCity = p => p && distM(p, D.trip.city) < 30000;

function walkInfo(it) {
  const p = posNow(), c = placeOf(it.place);
  if (!nearCity(p) || !c) return null;
  const m = distM(p, c);
  return { m, min: Math.max(1, Math.round(m * 1.3 / 75)) }; // streets are ~30% longer than a straight line, ~4.5 km/h
}

export function walkTag(it) {
  const w = walkInfo(it); if (!w) return '';
  return `<a class="tag walk" href="${dirUrl(it.place, 'walking')}" target="_blank" rel="noopener" aria-label="Indicazioni a piedi per ${esc(it.name)}">${WALK}${fmtDist(w.m)} · ${w.min} min</a>`;
}

export function nextStopHtml(d, nowM) {
  const next = d.items.find(it => !it.leg && it.m > nowM && placeOf(it.place)); if (!next) return '';
  const r = D.reminders.find(x => x.date === d.date && x.time === next.t), early = r ? r.early || 0 : 0;
  const left = next.m - nowM, need = left - early, p = posNow(), w = walkInfo(next);
  let meta, warn = '';
  if (w) {
    meta = `A piedi <b>${fmtDist(w.m)}</b> · circa <b>${w.min} min</b>`;
    if (r && w.min > need) warn = `A piedi servono circa ${w.min} minuti e all’ingresso ne mancano ${Math.max(0, need)}: l’orario è vincolante, prendete i mezzi o un taxi.`;
    else if (r && w.min + 10 > need) warn = `Conviene partire adesso: a piedi servono circa ${w.min} minuti.`;
  } else if (p) meta = `Sei a ${fmtDist(distM(p, D.trip.city))} da ${esc(D.trip.city.name)}.`;
  else meta = `<button type="button" class="smallbtn" data-locate>Usa la mia posizione</button> per vedere quanto manca a piedi.`;
  if (!warn && r && !w && need <= 45) warn = `Ingresso a orario vincolante: mancano ${dur(Math.max(0, need))}.`;
  return `<section class="gocard" aria-label="Come arrivare alla prossima tappa">
    <div class="gohd"><span>Prossima tappa · tra ${dur(left)}</span><b>${esc(next.name)}</b></div>
    <div class="gomt">Alle ${esc(next.t)}${early ? ` · arrivare ${early} min prima` : ''}. ${meta}</div>
    ${warn ? `<div class="warn">${esc(warn)}</div>` : ''}
    <div class="godir"><a class="pri" href="${dirUrl(next.place, 'walking')}" target="_blank" rel="noopener">${WALK}A piedi</a><a href="${dirUrl(next.place, 'transit')}" target="_blank" rel="noopener">${BUS}Con i mezzi</a></div>
  </section>`;
}

// Redraw the programme when I moved at least 40 m, or once a minute
let lastRender = null;
function posChanged() {
  const p = posNow(); if (!p) return;
  if (lastRender && distM(lastRender, p) < 40 && Date.now() - lastRender.t < 60000) return;
  lastRender = { ...p, t: Date.now() }; emit('programme');
}

export function init() {
  document.addEventListener('click', e => { if (e.target.closest('[data-locate]')) { toast('Cerco la tua posizione…'); startWatch(); } });
  on('pos', posChanged);
}

// "Cose utili": built from data/utili.json. Sections are lists, facts or phrases; "slot" sections are
// placeholders filled by other components (profile, bookings, theme picker, settings, games banner).
import { D } from '../core/data.js';
import { $, toast } from '../core/dom.js';
import { esc } from '../core/format.js';
import { WHEEL } from '../core/icons.js';
import { mapUrl } from '../core/links.js';
import { settingsHtml } from './settings.js';

const digits = n => n.replace(/[^\d+]/g, '');

function itemHtml(it) {
  if (it.url || it.place) {
    const href = it.url || mapUrl(it.place);
    return `<a class="item" href="${esc(href)}" target="_blank" rel="noopener"><span class="lab">${esc(it.label)}</span><span class="sub">${esc(it.sub || '')}</span><span class="go">↗</span></a>`;
  }
  if (it.number && it.inline) {
    const nums = [it.number, it.also].filter(Boolean).map(n => `<span class="num" style="font-size:13px">${esc(n)}</span>`).join(' · ');
    return `<div class="item"><span class="lab">${esc(it.label)}</span><span class="sub">${esc(it.sub)} · ${nums}</span><span class="acts"><button class="smallbtn" type="button" data-copy="${digits(it.number)}">Copia</button></span></div>`;
  }
  if (it.number) {
    const act = it.call ? `<a class="smallbtn call" href="tel:${digits(it.number)}">Chiama</a>` : `<button class="smallbtn" type="button" data-copy="${digits(it.number)}">Copia</button>`;
    return `<div class="item${it.big ? ' big' : ''}"><span class="lab">${esc(it.label)}</span><span class="sub">${esc(it.sub)}</span><span class="acts"><span class="num">${esc(it.number)}</span>${act}</span></div>`;
  }
  return `<div class="item"><span class="lab">${esc(it.label)}</span><span class="sub">${esc(it.sub || '')}</span></div>`;
}

const SLOTS = {
  games: () => `<a class="gamebanner" href="#giochi"><span class="gb-art" aria-hidden="true">${WHEEL}</span>
    <span><b>Giochi per il viaggio</b><span>Quiz su Vienna, memory del tedesco e parola segreta. Funzionano anche in aereo.</span></span><span class="go">›</span></a>`,
  profile: s => group(s.title, '<div class="list" id="profile"></div>'),
  bookings: s => group(s.title, '<div class="list" id="bookings"></div>'),
  skins: s => group(s.title, '<div class="skins" role="radiogroup" aria-label="Tema dell’app" id="skins-utili"></div>'),
  settings: s => group(s.title, settingsHtml())
};
const group = (title, body) => `<div class="group"><h3>${esc(title)}</h3>${body}</div>`;

function sectionHtml(s) {
  if (s.slot) return SLOTS[s.slot](s);
  let body = '';
  if (s.type === 'list') body = `<div class="list">${s.items.map(itemHtml).join('')}</div>`;
  if (s.type === 'facts') body = `<div class="facts">${s.items.map(f => `<div class="fact"><b>${esc(f.title)}</b>${esc(f.text)}</div>`).join('')}</div>`;
  if (s.type === 'phrases') body = `<dl class="phr">${s.items.map(p => `<dt>${esc(p.de)}</dt><dd>${esc(p.it)}</dd>`).join('')}</dl>`;
  if (s.note) body += `<p class="note">${esc(s.note)}</p>`;
  return group(s.title, body);
}

export function render() {
  $('utili-intro').textContent = D.utili.intro;
  $('utili').innerHTML = D.utili.sections.map(sectionHtml).join('');
}

export function init() {
  // Copy a phone number (falls back to selecting it)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const v = b.dataset.copy;
    const fallback = () => {
      const n = b.closest('.item').querySelector('.num');
      if (n) { const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Numero selezionato: ' + v);
    };
    try { navigator.clipboard.writeText(v).then(() => toast('Copiato: ' + v), fallback); } catch (err) { fallback(); }
  });
}

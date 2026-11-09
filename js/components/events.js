// Nearby events from the City of Vienna "Wien erleben" calendar.
// The city server sends a duplicated CORS header, so a GitHub Action copies the feed to events.json every 6 hours.
import { D, mapStops, placeOf, inCentre } from '../core/data.js';
import { S } from '../core/state.js';
import { store } from '../core/store.js';
import { $ } from '../core/dom.js';
import { esc, fmtDist } from '../core/format.js';
import { fmtDate } from '../core/time.js';
import { distM } from '../core/geo.js';
import { EVENTS_URL } from '../core/config.js';
import { on } from '../core/bus.js';
import { map, focusMarker } from './map.js';

let list = null, shown = 12, layer = null, markers = {}, loading = false;

export async function load(force) {
  const c = store.get('vie26-ev', null);
  if (c && c.list) { list = c.list; render(); }
  if (loading || (!force && c && Date.now() - c.t < 6 * 36e5)) return;
  loading = true; if (!list) render();
  try {
    const j = await (await fetch(EVENTS_URL, { cache: 'no-cache' })).json();
    list = j.list || [];
    store.set('vie26-ev', { t: Date.now(), list });
  } catch (e) {
    if (!list) { loading = false; $('evlist').innerHTML = '<li><p>Non riesco a scaricare gli eventi. Serve la connessione la prima volta.</p></li>'; return; }
  }
  loading = false; render();
}

// Distances are measured from me when I am in Vienna, otherwise from the middle of the day's stops
function origin() {
  const city = D.trip.city;
  if (S.myPos && distM(S.myPos, city) < 30000) return { p: S.myPos, l: 'da dove sei' };
  const pts = mapStops(S.cur).map(s => placeOf(s.place)).filter(inCentre);
  if (!pts.length) return { p: city, l: 'dal centro' };
  return {
    p: { lat: pts.reduce((a, c) => a + c.lat, 0) / pts.length, lng: pts.reduce((a, c) => a + c.lng, 0) / pts.length },
    l: 'dalle tappe del ' + fmtDate(D.days[S.cur].date, { day: 'numeric', month: 'long' })
  };
}

function filtered() {
  const o = origin(), q = ($('ev-q').value || '').trim().toLowerCase();
  return { o, items: (list || []).filter(e => !q || (e.t + ' ' + e.d).toLowerCase().includes(q)).map(e => ({ ...e, dist: distM(o.p, e) })).sort((a, b) => a.dist - b.dist) };
}

function render() {
  const ul = $('evlist');
  if (!list) { ul.innerHTML = '<li><p>Carico gli eventi…</p></li>'; return; }
  const { o, items } = filtered(); $('evfrom').textContent = o.l;
  const vis = items.slice(0, shown);
  ul.innerHTML = vis.length
    ? vis.map(e => `<li><button class="evt" type="button" data-ev="${esc(e.id)}"><span>${esc(e.t)}</span><i>${fmtDist(e.dist)}</i></button>${e.d ? `<p>${esc(e.d)}</p>` : ''}<a href="${esc(e.u)}" target="_blank" rel="noopener">Date e dettagli ↗</a></li>`).join('')
    : '<li><p>Nessun evento trovato.</p></li>';
  $('ev-more').hidden = items.length <= shown;
  draw(vis);
}

function draw(vis) {
  if (!map || !window.L) return;
  if (!layer) layer = L.layerGroup();
  layer.clearLayers(); markers = {};
  const on = $('ev-show').checked; $('evlegend').hidden = !on;
  if (!on) { map.removeLayer(layer); return; }
  layer.addTo(map);
  (vis || filtered().items.slice(0, shown)).forEach(e => {
    markers[e.id] = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: '', html: '<span class="evdot"></span>', iconSize: [14, 14], iconAnchor: [7, 7] }), title: e.t })
      .bindPopup(`<b>${esc(e.t)}</b><br><a href="${esc(e.u)}" target="_blank" rel="noopener">Date e dettagli</a>`).addTo(layer);
  });
}

export function init() {
  $('ev-q').addEventListener('input', () => { shown = 12; render(); });
  $('ev-more').addEventListener('click', () => { shown += 12; render(); });
  $('ev-show').addEventListener('change', () => draw());
  $('evlist').addEventListener('click', e => {
    const b = e.target.closest('[data-ev]'); if (!b) return;
    const ev = (list || []).find(x => x.id === b.dataset.ev); if (!ev || !map) return;
    const sw = $('ev-show'); if (!sw.checked) { sw.checked = true; draw(); }
    const mk = markers[ev.id]; if (mk) focusMarker(mk);
  });
  on('day', () => { if (list) render(); });
  on('map:show', () => load());
}

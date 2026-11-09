// Map (Leaflet + OpenStreetMap): numbered stops of the day, my position, list of stops.
import { D, mapStops, placeOf, inCentre } from '../core/data.js';
import { S, setDay } from '../core/state.js';
import { $, loadScript, loadCss } from '../core/dom.js';
import { esc } from '../core/format.js';
import { viennaNow, fmtDate, dayDate } from '../core/time.js';
import { EMBEDDED, LIBS } from '../core/config.js';
import { mapUrl } from '../core/links.js';
import { on, emit } from '../core/bus.js';
import { kindLabel } from './programme.js';
import { startWatch } from './position.js';
import { myPhoto } from './profile.js';

export let map = null;
let mapDay = null, poiLayer = null, poiMarkers = {}, meMarker = null, meCircle = null;

export function mapMsg(t) { const m = $('mapmsg'); if (!t) { m.hidden = true; return; } m.textContent = t; m.hidden = false; }

// Fly to a marker and bring the map into view
export function focusMarker(mk) {
  map.flyTo(mk.getLatLng(), 17, { duration: .6 }); mk.openPopup();
  document.querySelector('.mapwrap').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export async function show() {
  renderTabs(); renderPoiList();
  if (EMBEDDED) {
    $('map').innerHTML = '<div class="mapfallback">La mappa, la tua posizione e quella degli altri funzionano nell’app installata sul telefono.</div>';
    document.querySelector('.mapbtns').hidden = true; return;
  }
  if (!map) {
    try { loadCss(LIBS.leafletCss); await loadScript(LIBS.leafletJs); }
    catch (e) { mapMsg('Non riesco a caricare la mappa. Serve la connessione la prima volta che la apri.'); return; }
    const c = D.trip.city;
    map = L.map('map', { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], 14);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    poiLayer = L.layerGroup().addTo(map);
    drawDay(true); refreshMe();
    emit('map:ready'); // travellers and events add their layers
  } else drawDay(mapDay !== S.cur);
  setTimeout(() => map.invalidateSize(), 50);
  startWatch();
  emit('map:show');
}

function drawDay(fit) {
  if (!map) return; mapDay = S.cur; poiLayer.clearLayers(); poiMarkers = {};
  const st = mapStops(S.cur), seen = {}, line = [];
  const n = viennaNow(); let curId = null;
  if (n.date === D.days[S.cur].date) st.forEach(s => { if (s.m <= n.min) curId = s.id; });
  st.forEach((s, i) => {
    const c = placeOf(s.place); line.push([c.lat, c.lng]);
    const key = c.lat + ',' + c.lng, off = seen[key] = (seen[key] || 0) + 1; // nudge repeated points (home)
    const pos = off > 1 ? [c.lat + 0.00012 * (off - 1), c.lng + 0.00012 * (off - 1)] : [c.lat, c.lng];
    const icon = L.divIcon({ className: '', html: `<span class="pin k-${s.kind}${s.id === curId ? ' cur' : ''}"><b>${i + 1}</b></span>`, iconSize: [26, 26], iconAnchor: [4, 26], popupAnchor: [9, -24] });
    poiMarkers[s.id] = L.marker(pos, { icon, title: s.name })
      .bindPopup(`<b>${i + 1}. ${esc(s.name)}</b>${esc(s.t)}${s.end ? '–' + esc(s.end) : ''} · ${kindLabel(s.kind)}<br><a href="${mapUrl(s.place)}" target="_blank" rel="noopener">Apri in Google Maps</a>${s.ticket ? ` · <a href="#biglietto-${s.ticket}">Biglietto</a>` : ''}`)
      .addTo(poiLayer);
  });
  L.polyline(line, { color: '#b8891c', weight: 3, opacity: .7, dashArray: '6 8' }).addTo(poiLayer);
  if (fit) fitDay();
}

function fitDay() {
  if (!map) return;
  const pts = mapStops(S.cur).map(s => placeOf(s.place)).filter(inCentre).map(p => [p.lat, p.lng]);
  if (pts.length) map.fitBounds(pts, { paddingTopLeft: [30, 30], paddingBottomRight: [96, 30], maxZoom: 16 });
}

function renderTabs() {
  $('maptabs').innerHTML = D.days.map((d, i) => `<button class="daytab" type="button" data-md="${i}" aria-pressed="${i === S.cur}" ${i === S.cur ? 'aria-selected="true"' : ''}><span class="dw">${fmtDate(d.date, { weekday: 'short' })}</span><span class="dn">${dayDate(d.date).getDate()} nov</span></button>`).join('');
}
function renderPoiList() {
  $('poilist').innerHTML = mapStops(S.cur).map((s, i) => `<li class="k-${s.kind}"><button type="button" data-poi="${s.id}"><span class="n">${i + 1}</span><span class="tm">${esc(s.t)}</span><span>${esc(s.name)}</span></button></li>`).join('');
}

const meIcon = () => myPhoto
  ? L.divIcon({ className: '', html: `<span class="medot ph" style="background-image:url(${myPhoto})"></span>`, iconSize: [34, 34], iconAnchor: [17, 17] })
  : L.divIcon({ className: '', html: '<span class="medot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });

function refreshMe() {
  const p = S.myPos; if (!map || !p) return;
  const ll = [p.lat, p.lng];
  if (!meMarker) {
    meMarker = L.marker(ll, { icon: meIcon(), zIndexOffset: 1000, title: 'Tu' }).bindPopup('<b>Sei qui</b>').addTo(map);
    meCircle = L.circle(ll, { radius: p.acc, color: '#1f6fe0', weight: 1, fillOpacity: .08 }).addTo(map); mapMsg('');
  } else { meMarker.setLatLng(ll).setIcon(meIcon()); meCircle.setLatLng(ll).setRadius(p.acc); }
}

export function init() {
  $('maptabs').addEventListener('click', e => {
    const b = e.target.closest('[data-md]'); if (!b) return;
    setDay(+b.dataset.md, 'none'); renderTabs(); renderPoiList(); drawDay(true);
  });
  $('poilist').addEventListener('click', e => {
    const b = e.target.closest('[data-poi]'); if (!b || !map) return;
    const mk = poiMarkers[b.dataset.poi]; if (mk) focusMarker(mk);
  });
  $('btn-fit').addEventListener('click', fitDay);
  $('btn-locate').addEventListener('click', () => {
    startWatch();
    if (S.myPos && map) map.flyTo([S.myPos.lat, S.myPos.lng], 17, { duration: .6 }); else mapMsg('Sto cercando la tua posizione…');
  });
  on('pos', refreshMe);
  on('profile', () => { if (meMarker) refreshMe(); });
}

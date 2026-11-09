// Where the other travellers are: positions and avatars, AES-GCM encrypted, through a public MQTT broker.
// Positions update only while the app is open.
import { S } from '../core/state.js';
import { store } from '../core/store.js';
import { $, loadScript } from '../core/dom.js';
import { esc, fmtDist, ago } from '../core/format.js';
import { distM } from '../core/geo.js';
import { EMBEDDED, GROUP, LIBS } from '../core/config.js';
import { dirToPoint } from '../core/links.js';
import { on } from '../core/bus.js';
import { map, mapMsg, focusMarker } from './map.js';
import { meName, sharing, myId, myPhotoS, avatarHtml } from './profile.js';

const TOPIC = `viaggi/${GROUP.id}/pos/`, TOPIC_AV = `viaggi/${GROUP.id}/av/`;
const dev = store.get('vie26-dev', '') || (() => { const d = Math.random().toString(36).slice(2, 8); store.set('vie26-dev', d); return d; })();
export const deviceId = dev;

let mq = null, aesKey = null, lastPub = null, layer = null, markers = {};
let people = store.get('vie26-people', {});
let avatars = store.get('vie26-avatars', {});

async function getKey() {
  if (aesKey) return aesKey;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(GROUP.secret + GROUP.id));
  return aesKey = await crypto.subtle.importKey('raw', h, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(o) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await getKey(), new TextEncoder().encode(JSON.stringify(o))));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return out;
}
async function decrypt(b) {
  b = new Uint8Array(b);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, await getKey(), b.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}

function setNet(ok, txt) { const s = $('netstate'); s.textContent = txt; s.classList.toggle('on', ok); }

export async function connect() {
  if (mq || EMBEDDED || !window.crypto || !crypto.subtle) return;
  try { await loadScript(LIBS.mqtt); } catch (e) { setNet(false, 'Offline'); return; }
  setNet(false, 'Collegamento…');
  mq = mqtt.connect(GROUP.broker, { clientId: 'v26_' + dev + '_' + Math.random().toString(16).slice(2, 6), clean: true, reconnectPeriod: 6000, connectTimeout: 15000, keepalive: 45 });
  mq.on('connect', () => { setNet(true, 'Collegato'); mq.subscribe([TOPIC + '+', TOPIC_AV + '+'], { qos: 0 }); lastPub = null; publish(); publishAvatar(); });
  mq.on('reconnect', () => setNet(false, 'Ricollegamento…'));
  mq.on('offline', () => setNet(false, 'Offline'));
  mq.on('error', () => setNet(false, 'Errore di rete'));
  mq.on('message', async (topic, payload) => {
    if (topic.startsWith(TOPIC_AV)) {
      const id = topic.slice(TOPIC_AV.length);
      if (!payload || !payload.length) delete avatars[id];
      else { try { const a = await decrypt(payload); if (typeof a.img === 'string' && a.img.startsWith('data:image/')) avatars[id] = a.img; } catch (e) { return; } }
      store.set('vie26-avatars', avatars); refresh(); return;
    }
    const id = topic.slice(TOPIC.length);
    if (!payload || !payload.length) delete people[id];
    else { try { const p = await decrypt(payload); if (typeof p.lat === 'number') people[id] = p; } catch (e) { return; } }
    store.set('vie26-people', people); refresh();
  });
}

// Send my position when I moved 20 m or a minute passed
export function publish(force) {
  const p = S.myPos;
  if (!sharing || !meName || !p || !mq || !mq.connected) return;
  const moved = lastPub ? distM(lastPub, p) : Infinity, age = lastPub ? Date.now() - lastPub.t : Infinity;
  if (!force && moved < 20 && age < 60000) return;
  const msg = { n: meName, lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5), acc: p.acc, t: Date.now() };
  encrypt(msg).then(b => { mq.publish(TOPIC + myId(), b, { retain: true, qos: 0 }); lastPub = { ...msg }; });
}
export const republish = () => { lastPub = null; publish(true); };

export async function publishAvatar() {
  if (!sharing || !meName || !mq || !mq.connected) return;
  const id = myId();
  if (!myPhotoS) { mq.publish(TOPIC_AV + id, new Uint8Array(0), { retain: true }); return; }
  mq.publish(TOPIC_AV + id, await encrypt({ n: meName, img: myPhotoS }), { retain: true, qos: 0 });
}

// Remove my retained position and avatar from the broker
export function clearMine(id) {
  if (mq && mq.connected && id) {
    mq.publish(TOPIC + id, new Uint8Array(0), { retain: true, qos: 0 });
    mq.publish(TOPIC_AV + id, new Uint8Array(0), { retain: true, qos: 0 });
  }
}

const others = () => Object.entries(people).filter(([id]) => id !== myId());

function renderList() {
  const el = $('people');
  const list = others().sort((a, b) => b[1].t - a[1].t);
  if (!list.length) { el.innerHTML = `<div class="person"><span class="pp" style="--c:#8a97a3">?</span><span class="lab">Nessuno sta condividendo</span><span class="sub">Quando un altro viaggiatore attiva la condivisione, compare qui e sulla mappa.</span></div>`; return; }
  el.innerHTML = list.map(([id, p]) => {
    const d = S.myPos ? ' · a ' + fmtDist(distM(S.myPos, p)) : '';
    const stale = Date.now() - p.t > 30 * 60000;
    return `<div class="person">${avatarHtml(p.n, avatars[id], stale ? 'stale' : '')}
      <span class="lab">${esc(p.n)}</span><span class="sub">Aggiornata ${ago(p.t)}${d}</span>
      <span class="acts"><button class="smallbtn" type="button" data-findp="${esc(id)}">Mappa</button><a class="smallbtn" href="${dirToPoint(p.lat, p.lng)}" target="_blank" rel="noopener">Raggiungi</a></span></div>`;
  }).join('');
}

function draw() {
  if (!map) return;
  if (!layer) layer = L.layerGroup().addTo(map);
  layer.clearLayers(); markers = {};
  others().forEach(([id, p]) => {
    const stale = Date.now() - p.t > 30 * 60000;
    markers[id] = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: avatarHtml(p.n, avatars[id], stale ? 'stale' : ''), iconSize: [34, 34], iconAnchor: [17, 17] }), zIndexOffset: 900, title: p.n })
      .bindPopup(`<b>${esc(p.n)}</b>Aggiornata ${ago(p.t)}<br><a href="${dirToPoint(p.lat, p.lng)}" target="_blank" rel="noopener">Raggiungi a piedi</a>`)
      .addTo(layer);
  });
}

function refresh() { renderList(); draw(); }

export function init() {
  $('people').addEventListener('click', e => {
    const b = e.target.closest('[data-findp]'); if (!b || !map) return;
    const mk = markers[b.dataset.findp]; if (mk) focusMarker(mk);
  });
  $('btn-group').addEventListener('click', () => {
    if (!map) return;
    const pts = Object.values(people).map(p => [p.lat, p.lng]); if (S.myPos) pts.push([S.myPos.lat, S.myPos.lng]);
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 }); else mapMsg('Nessun viaggiatore sta condividendo la posizione.');
  });
  on('pos', () => { renderList(); publish(); });
  on('map:ready', draw);
  on('map:show', connect);
  on('profile', refresh);
  setInterval(() => { refresh(); publish(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') republish(); });
  renderList();
  if (sharing && meName && !EMBEDDED) connect();
}

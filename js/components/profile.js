// My profile: who I am, my photo, whether I share my position.
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { esc } from '../core/format.js';
import { EMBEDDED } from '../core/config.js';
import { PERSON } from '../core/icons.js';
import { emit } from '../core/bus.js';
import { startWatch } from './position.js';
import { connect, publishAvatar, clearMine, republish, deviceId } from './travelers.js';
import { openOnboarding } from './onboarding.js';
import { startTour } from './tour.js';

export let meName = store.get('vie26-name', '');
export let sharing = store.get('vie26-share', false);
export let myPhoto = store.get('vie26-photo', '');
export let myPhotoS = store.get('vie26-photo-s', '');

export const myId = () => meName ? meName.toLowerCase() + '-' + deviceId : null;
export const colorOf = n => (D.trip.travelers.find(t => t.name === n) || { color: '#5b6b7a' }).color;

export function avatarHtml(name, img, cls, extra) {
  const st = `--c:${colorOf(name)};${img ? `background-image:url(${img});background-size:cover;background-position:center;color:transparent;` : ''}${extra || ''}`;
  return `<span class="pp ${cls || ''}" style="${st}">${esc((name || '?')[0])}</span>`;
}

export function setMyName(n) {
  const old = myId(); meName = n; store.set('vie26-name', n);
  if (sharing && old && old !== myId()) clearMine(old);
  if (!meName && sharing) setSharing(false, true);
  $('me-name').value = n;
  republish(); publishAvatar(); render(); emit('profile');
}

export function setSharing(on, quiet) {
  if (on && !meName) { toast('Prima scegli chi sei'); $('me-share').checked = false; return false; }
  if (on && EMBEDDED) { $('me-share').checked = false; return false; }
  sharing = on; store.set('vie26-share', on); $('me-share').checked = on;
  if (on) { startWatch(); connect(); republish(); publishAvatar(); if (!quiet) toast('Condivisione attiva'); }
  else { clearMine(myId()); if (!quiet) toast('Condivisione disattivata'); }
  render(); return true;
}

export function setPhoto(big, small) {
  myPhoto = big || ''; myPhotoS = small || '';
  if (!store.set('vie26-photo', myPhoto) || !store.set('vie26-photo-s', myPhotoS)) toast('Non riesco a salvare la foto su questo dispositivo');
  publishAvatar(); render(); emit('profile');
}

// Square crop: 320 px for me, 96 px for the others
export async function processPhoto(file) {
  const url = URL.createObjectURL(file); const img = new Image(); img.src = url; await img.decode();
  const s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
  const mk = size => { const c = document.createElement('canvas'); c.width = c.height = size; c.getContext('2d').drawImage(img, sx, sy, s, s, 0, 0, size, size); return c.toDataURL('image/jpeg', .82); };
  const out = [mk(320), mk(96)]; URL.revokeObjectURL(url); return out;
}

export function render() {
  const b = $('me-btn');
  b.innerHTML = meName || myPhoto ? avatarHtml(meName || '?', myPhoto, 'mini') : PERSON;
  b.setAttribute('aria-label', meName ? `Profilo di ${meName}` : 'Configura il profilo');
  const p = $('profile'); if (!p) return;
  p.innerHTML = `<div class="person">${avatarHtml(meName || '?', myPhoto, '')}
    <span class="lab">${meName ? esc(meName) : 'Profilo non configurato'}</span>
    <span class="sub">${EMBEDDED ? 'Posizione disponibile nell’app installata' : sharing ? 'Stai condividendo la posizione' : 'Posizione non condivisa'}</span>
    <span class="acts"><button class="smallbtn" type="button" id="prof-edit">Modifica</button></span></div>
    <button class="item" type="button" id="prof-tour" style="width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);font:inherit;color:inherit;cursor:pointer"><span class="lab">Guida dell’app</span><span class="sub">Un giro di un minuto tra le funzioni principali</span><span class="go">›</span></button>`;
}

export function init() {
  $('me-btn').addEventListener('click', () => { location.hash = '#utili'; setTimeout(() => $('profile').scrollIntoView({ block: 'center' }), 60); });
  document.addEventListener('click', e => {
    if (e.target.closest('#prof-edit')) openOnboarding(1);
    if (e.target.closest('#prof-tour')) startTour();
  });
  // "Who are you" and the sharing switch in the map section
  const sel = $('me-name'), sw = $('me-share');
  sel.insertAdjacentHTML('beforeend', D.trip.travelers.map(t => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join(''));
  sel.value = meName; sw.checked = sharing && !!meName;
  if (EMBEDDED) { sel.disabled = true; sw.disabled = true; $('share-note').textContent = 'La condivisione della posizione funziona nell’app installata sul telefono.'; }
  sel.addEventListener('change', () => setMyName(sel.value));
  sw.addEventListener('change', () => setSharing(sw.checked));
  if (sharing && meName && !EMBEDDED) startWatch();
  render();
}

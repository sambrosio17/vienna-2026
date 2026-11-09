// My GPS position. Starts on demand, or right away when the permission was already granted.
import { S } from '../core/state.js';
import { EMBEDDED } from '../core/config.js';
import { emit } from '../core/bus.js';
import { mapMsg } from './map.js';

let watchId = null;

export function startWatch() {
  if (watchId !== null || EMBEDDED) return;
  if (!('geolocation' in navigator)) { mapMsg('Questo dispositivo non fornisce la posizione.'); return; }
  watchId = navigator.geolocation.watchPosition(p => {
    S.myPos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), t: Date.now() };
    emit('pos');
  }, err => {
    watchId = null;
    mapMsg(err.code === 1 ? 'Posizione non consentita: abilitala nelle impostazioni del browser per questa app.' : 'Posizione non disponibile al momento.');
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
}

export function init() {
  try {
    navigator.permissions && navigator.permissions.query({ name: 'geolocation' })
      .then(s => { if (s.state === 'granted') startWatch(); }).catch(() => {});
  } catch (e) { /* no Permissions API */ }
}

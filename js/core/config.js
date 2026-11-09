// App-wide settings that are not trip data.
export const QS = new URLSearchParams(location.search);
// Preview mode (?preview=1&skin=punsch&fx=rain&at=2026-11-26T14:32): shows a theme/weather/time without saving anything
export const PREVIEW = QS.has('preview');
// Inside an iframe (e.g. claude.ai): no map tiles, no location
export const EMBEDDED = window.self !== window.top;
export const TZ = 'Europe/Vienna';

export const LIBS = {
  leafletJs: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  leafletCss: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  mqtt: 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js'
};

// Location sharing between travellers: encrypted messages on a public MQTT broker.
// Change id and secret to reset the group (old copies of the app will no longer see new positions).
export const GROUP = {
  id: 'w26-q8Zt4Lk2Rv',
  secret: 'vienna26·Nestroygasse7·7xK2pQ9mVb4cTz8L',
  broker: 'wss://broker.hivemq.com:8884/mqtt'
};

// Same-origin copy of the City of Vienna events feed, refreshed by a GitHub Action.
export const EVENTS_URL = 'events.json';

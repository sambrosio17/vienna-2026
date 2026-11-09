// Vienna 2026 — service worker per l'uso offline.
// Cambia VERSION a ogni pubblicazione di una nuova versione dei file.
const VERSION = 'vienna26-v13';
const TICKETS = "vienna26-tickets";      // biglietti decifrati sul telefono con la password
const TILES = 'vienna26-tiles';          // mappe già viste, tenute tra un aggiornamento e l'altro
const MAX_TILES = 1500;
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js'
];
const TICKET_FILES = [
  'schoenbrunn-1.jpg', 'schoenbrunn.pdf',
  'biblioteca-1.jpg', 'biblioteca.pdf',
  'belvedere-1.jpg', 'belvedere-2.jpg', 'belvedere-3.jpg', 'belvedere-4.jpg', 'belvedere.pdf',
  'sisi-1.jpg', 'sisi.pdf',
  'karlskirche-ricevuta.pdf',
  'khm-luisa-1.jpg', 'khm-giuseppe-1.jpg', 'khm-salvatore-1.jpg', 'khm-antonietta-1.jpg',
  'khm-luisa.pdf', 'khm-giuseppe.pdf', 'khm-salvatore.pdf', 'khm-antonietta.pdf'
];
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './tickets-enc/meta.json',
  ...TICKET_FILES.map(f => './tickets-enc/' + f + '.enc')
];
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500;6..96,700&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Nunito+Sans:wght@400;600;700;800&display=swap";

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(CORE);
    // Font: best effort, l'app funziona comunque con i font di sistema.
    try {
      const res = await fetch(FONT_CSS);
      if (res.ok) {
        await cache.put(FONT_CSS, res.clone());
        const css = await res.text();
        const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map(m => m[1]);
        await Promise.all(urls.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && cache.put(u, r)).catch(() => {})));
      }
    } catch (e) { /* offline durante l'installazione: i font arriveranno al prossimo uso online */ }
    // Librerie della mappa e della condivisione posizione: best effort.
    await Promise.all(LIBS.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && cache.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION && k !== TILES && k !== TICKETS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font Google: prima la cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreVary: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      } catch (e) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  // Librerie da CDN: prima la cache.
  if (LIBS.includes(req.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req.url, res.clone());
      return res;
    })());
    return;
  }

  // Tasselli OpenStreetMap: salviamo quelli già visti, così la mappa resta visibile offline.
  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) {
          await cache.put(req, res.clone());
          const keys = await cache.keys();
          if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => cache.delete(k)));
        }
        return res;
      } catch (e) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Biglietti: solo dalla copia decifrata sul telefono, mai dalla rete.
  if (url.pathname.includes('/tickets/')) {
    event.respondWith((async () => (await (await caches.open(TICKETS)).match(url.href)) ||
      new Response('Biglietti bloccati: apri la sezione Biglietti e inserisci la password.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))());
    return;
  }

  // File dell'app: prima la rete (per avere gli aggiornamenti), poi la cache se offline.
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      // Con segnale debole non aspettiamo più di 4 secondi prima di usare la copia offline.
      const res = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
      ]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await cache.match('./index.html')) || (await cache.match('./'));
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});

// Promemoria: toccando la notifica si apre (o si porta in primo piano) l'app sul biglietto.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if ('focus' in w) { await w.focus(); if ('navigate' in w) await w.navigate(target); return; } }
    await self.clients.openWindow(target);
  })());
});

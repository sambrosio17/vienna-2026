// Scarica il calendario "Wien erleben" della città di Vienna e lo salva in events.json.
// Il server della città manda un header CORS doppio, quindi il browser non può leggerlo direttamente:
// lo copiamo nel sito (stessa origine) con una GitHub Action.
import fs from 'node:fs';
const res = await fetch('https://www.wien.gv.at/veranstaltungen.json', { headers: { 'User-Agent': 'vienna-2026-trip-app (GitHub Actions)' } });
if (!res.ok) throw new Error('HTTP ' + res.status);
const j = await res.json();
const ent = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
const dec = s => String(s || '').replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ent[e.toLowerCase()] ?? m));
const list = (j.features || [])
  .filter(f => f.geometry && Array.isArray(f.geometry.coordinates))
  .map(f => ({ id: f.properties.id, t: dec(f.properties.title).trim(), d: dec(f.properties.description).trim(),
    u: f.properties.url, lat: +f.geometry.coordinates[1].toFixed(5), lng: +f.geometry.coordinates[0].toFixed(5) }))
  .sort((a, b) => a.id.localeCompare(b.id));
if (list.length < 20) throw new Error('Too few events: ' + list.length);
const out = JSON.stringify({ source: 'https://www.wien.gv.at/veranstaltungen/', list });
const prev = fs.existsSync('events.json') ? JSON.parse(fs.readFileSync('events.json', 'utf8')) : null;
if (prev && JSON.stringify(prev.list) === JSON.stringify(list)) { console.log('unchanged', list.length); process.exit(0); }
fs.writeFileSync('events.json', JSON.stringify({ updated: new Date().toISOString(), source: 'https://www.wien.gv.at/veranstaltungen/', list }));
console.log('saved', list.length, 'events');

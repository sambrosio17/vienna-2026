// Themes (data/skins.json). The chosen one is applied before first paint by an inline script in index.html.
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { QS } from '../core/config.js';
import { emit } from '../core/bus.js';

let skin = 'imperiale';

export function skinCards() {
  return D.skins.map(s => `<button class="skin" type="button" role="radio" aria-checked="${s.id === skin}" data-skin="${s.id}">
    <span class="sw" style="background:${s.bg};color:${s.fg}"><b style="font-family:${s.font};${s.id === 'imperiale' ? 'color:#16222e' : ''}">Wien</b><i style="background:${s.acc};width:${s.id === 'tabellone' ? '60%' : '40%'}"></i></span>
    <span class="nm">${s.name}</span></button>`).join('');
}

export function applySkin(id) {
  skin = id; store.set('vie26-skin', id); document.documentElement.dataset.skin = id;
  const s = D.skins.find(x => x.id === id);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
    const dark = (m.getAttribute('media') || '').includes('dark');
    m.setAttribute('content', s.barDark && dark ? s.barDark : s.bar);
  });
  document.querySelectorAll('.skins .skin').forEach(b => b.setAttribute('aria-checked', b.dataset.skin === id));
  emit('skin');
}

export function init() {
  skin = QS.get('skin') || store.get('vie26-skin', 'imperiale');
  if (!D.skins.some(s => s.id === skin)) skin = 'imperiale';
  const box = $('skins-utili'); if (box) box.innerHTML = skinCards();
  document.addEventListener('click', e => {
    const b = e.target.closest('.skin[data-skin]'); if (!b) return;
    applySkin(b.dataset.skin); toast('Tema: ' + D.skins.find(s => s.id === b.dataset.skin).name);
  });
  applySkin(skin);
}

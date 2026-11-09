// Bookings checklist (data/bookings.json); ticks are saved on this phone.
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $ } from '../core/dom.js';
import { esc } from '../core/format.js';

let booked = new Set(store.get('vie26-booked', ['schb', 'onb', 'belv', 'sisi', 'karl', 'khm']));

function render() {
  $('bookings').innerHTML = D.bookings.map(b => `<div class="chk">
    <input type="checkbox" id="bk-${b.id}" data-bk="${b.id}"${booked.has(b.id) ? ' checked' : ''}>
    <label for="bk-${b.id}">${esc(b.name)}</label><span class="sub">${esc(b.note)}${booked.has(b.id) ? ' · fatto' : ''}</span>
    <a class="smallbtn" href="${esc(b.url)}" target="_blank" rel="noopener">Sito ↗</a></div>`).join('');
}

export function init() {
  $('bookings').addEventListener('change', e => {
    const id = e.target.dataset.bk; if (!id) return;
    e.target.checked ? booked.add(id) : booked.delete(id);
    store.set('vie26-booked', [...booked]); render();
  });
  render();
}

// Title, accommodation link and the live Vienna clock.
import { D, tripIndex } from '../core/data.js';
import { $ } from '../core/dom.js';
import { esc } from '../core/format.js';
import { viennaNow, pad, fmtNow } from '../core/time.js';
import { mapUrl } from '../core/links.js';
import { emit } from '../core/bus.js';

let lastMin = -1;

function tripLabel() {
  const n = viennaNow(), [y, mo, d] = n.date.split('-').map(Number);
  const [sy, sm, sd] = D.trip.start.split('-').map(Number);
  const diff = Math.round((Date.UTC(sy, sm - 1, sd) - Date.UTC(y, mo - 1, d)) / 864e5);
  const di = tripIndex();
  if (di >= 0) return `Giorno ${di + 1} di ${D.days.length}`;
  if (diff > 0) return `Si parte tra ${diff} ${diff === 1 ? 'giorno' : 'giorni'}`;
  return 'Viaggio concluso';
}

// Runs every second; announces each new minute so the programme can move the "now" line
function tick() {
  const n = viennaNow();
  $('cdate').textContent = fmtNow({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('ctime').innerHTML = `${pad(n.h)}:${pad(n.mi)}<small>:${pad(n.s)}</small>`;
  if (n.min !== lastMin) {
    lastMin = n.min;
    $('ctrip').textContent = 'Ora di Vienna · ' + tripLabel();
    emit('minute');
  }
}

export function init() {
  const t = D.trip, [name, rest] = [t.home.name, t.home.address.replace(t.home.name + ', ', '')];
  $('eyebrow').textContent = t.subtitle;
  $('home').innerHTML = `Alloggio · <b>${esc(name)}, ${esc(rest)}</b>`;
  $('home').href = mapUrl(t.home.address);
  tick();
  setInterval(tick, 1000);
}

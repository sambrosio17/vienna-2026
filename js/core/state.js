// Shared UI state. Components read it directly and change it through these helpers, which emit events.
import { store } from './store.js';
import { emit } from './bus.js';

export const S = {
  cur: 0,                                         // selected day index
  view: 'programma',                              // visible section
  filter: store.get('vie26-filter', 'all'),       // timeline filter
  done: new Set(store.get('vie26-done', [])),     // stops ticked as done
  myPos: null                                     // {lat, lng, acc, t} from the GPS
};

export function setDay(i, hashMode = 'replace') {
  S.cur = i;
  const h = '#giorno-' + (i + 1);
  if (hashMode === 'push') history.pushState(null, '', h);
  else if (hashMode === 'replace') history.replaceState(null, '', h);
  emit('day');
}
export function setFilter(f) { S.filter = f; store.set('vie26-filter', f); emit('programme'); }
export function toggleDone(id) {
  S.done.has(id) ? S.done.delete(id) : S.done.add(id);
  store.set('vie26-done', [...S.done]); emit('programme');
}
export function resetDone() { S.done = new Set(); store.set('vie26-done', []); emit('programme'); }

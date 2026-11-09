// Entry point: load the data, then start every component.
import { loadData, tripIndex } from './core/data.js';
import { S } from './core/state.js';
import { $ } from './core/dom.js';
import * as header from './components/header.js';
import * as utili from './components/utili.js';
import * as skins from './components/skins.js';
import * as programme from './components/programme.js';
import * as tickets from './components/tickets.js';
import * as bookings from './components/bookings.js';
import * as profile from './components/profile.js';
import * as map from './components/map.js';
import * as position from './components/position.js';
import * as travelers from './components/travelers.js';
import * as events from './components/events.js';
import * as nextStop from './components/nextStop.js';
import * as reminders from './components/reminders.js';
import * as weather from './components/weather.js';
import * as fx from './components/fx.js';
import * as games from './components/games/index.js';
import * as onboarding from './components/onboarding.js';
import * as tour from './components/tour.js';
import * as install from './components/install.js';
import * as router from './components/router.js';

async function start() {
  try { await loadData(); }
  catch (e) {
    $('day').innerHTML = '<div class="dayhead"><h2>Non riesco a caricare il programma</h2><p>Serve la connessione la prima volta che apri l’app. Riprova tra poco.</p></div>';
    console.error(e); return;
  }
  S.cur = router.initialDay();
  utili.render();            // creates the slots used by profile, bookings, skins and settings
  [header, skins, programme, tickets, bookings, profile, map, position, travelers, events, nextStop,
    reminders, weather, fx, games, onboarding, tour, install, router].forEach(c => c.init());
  router.route();
  if (S.view === 'programma' && tripIndex() >= 0) requestAnimationFrame(() => programme.scrollToNow(false));
  utili.init();
}

start();

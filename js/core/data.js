// Loads the trip data from data/*.json and adds the derived fields the components need.
import { toMin, viennaNow } from './time.js';

const FILES = {
  trip: 'data/trip.json',
  days: 'data/days.json',
  places: 'data/places.json',
  tickets: 'data/tickets.json',
  bookings: 'data/bookings.json',
  reminders: 'data/reminders.json',
  utili: 'data/utili.json',
  skins: 'data/skins.json',
  tour: 'data/tour.json',
  quiz: 'data/games/quiz.json',
  memory: 'data/games/memory.json',
  words: 'data/games/words.json',
  countdown: 'data/countdown.json'
};

// D.trip, D.days, D.places, D.tickets, D.missing, D.bookings, D.reminders, D.utili, D.skins, D.tour, D.quiz, D.memory, D.words
export const D = {};

export async function loadData() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, url]) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return [key, await res.json()];
  }));
  Object.assign(D, Object.fromEntries(entries));
  D.missing = D.tickets.missing;
  D.tickets = D.tickets.tickets;
  // Every item gets an id and its start in minutes. Times that are not hh:mm inherit the previous one; "fine" goes 30 min later.
  D.days.forEach((day, di) => {
    let last = 0;
    day.items.forEach((it, i) => {
      it.id = `d${di + 1}-${i}`;
      const m = toMin(it.t);
      it.m = m != null ? m : it.t === 'fine' ? last + 30 : last;
      last = it.m;
    });
  });
}

export const placeOf = q => D.places[q] || null;
export const ticketById = id => D.tickets.find(t => t.id === id);
export const stops = day => day.items.filter(it => !it.leg);
export const mapStops = di => stops(D.days[di]).filter(it => placeOf(it.place));
export function stopForTicket(id) {
  for (const d of D.days) for (const it of d.items) if (it.ticket === id) return it;
  return null;
}
export const tripIndex = () => D.days.findIndex(d => d.date === viennaNow().date);
// Stops far outside the centre (airport, Lego store) are left out when fitting the map
export const inCentre = p => p.lat > 48.15 && p.lng < 16.5;

// Google Maps links
import { D, placeOf } from './data.js';

export const mapUrl = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);

export function dirUrl(place, mode) {
  const p = placeOf(place);
  return 'https://www.google.com/maps/dir/?api=1&destination=' + (p ? p.lat + ',' + p.lng : encodeURIComponent(place)) + '&travelmode=' + mode;
}
export const dirToPoint = (lat, lng) => `https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${lat},${lng}`;

// Walking route of the day: from home through the stops (Google allows up to 9 waypoints)
export function routeUrl(day) {
  const pts = [];
  day.items.forEach(it => { if (!it.leg && it.kind !== 'base' && !pts.includes(it.place)) pts.push(it.place); });
  const dst = pts[pts.length - 1], w = pts.slice(0, -1).slice(0, 9);
  return 'https://www.google.com/maps/dir/?api=1&travelmode=walking&origin=' + encodeURIComponent(D.trip.home.address)
    + '&destination=' + encodeURIComponent(dst) + (w.length ? '&waypoints=' + encodeURIComponent(w.join('|')) : '');
}

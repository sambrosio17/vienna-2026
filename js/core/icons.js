// Inline SVG icons used in several components.
const svg = (body, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const PIN = svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>');
export const CHECK = svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.4);
export const TICKET = svg('<path d="M3.5 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5z"/><path d="M14.5 6.5v2M14.5 11v2M14.5 15.5v2"/>', 1.8);
export const GAMEPAD = svg('<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10.5v4M6 12.5h4M15.5 11.5h.01M17.5 13.5h.01"/>', 1.8);
export const WALK = svg('<circle cx="13" cy="4" r="2"/><path d="M9 21l2-6 3 3v3M7 12l3-4 4 2 2 3M10 8l-1 5"/>');
export const BUS = svg('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l1.5-4M16 21l-1.5-4"/><circle cx="8.5" cy="14" r=".5"/><circle cx="15.5" cy="14" r=".5"/>');
export const PERSON = svg('<circle cx="12" cy="9" r="3.5"/><path d="M5 19.5c1.4-3.2 4-4.5 7-4.5s5.6 1.3 7 4.5"/>', 1.8);
export const SUNRISE = svg('<path d="M5 18a7 7 0 0 1 14 0"/><path d="M2 18h20M12 4v3M4.9 8.9l1.6 1.6M19.1 8.9l-1.6 1.6"/>');
export const SUNSET = svg('<path d="M5 18a7 7 0 0 1 14 0"/><path d="M2 18h20M12 7V3M9.5 5.5 12 8l2.5-2.5"/>');

// Ferris wheel (Riesenrad), used in onboarding, memory cards and the games banner
export const WHEEL = (() => {
  let s = '<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="60" cy="52" r="38" stroke-width="5"/><circle cx="60" cy="52" r="31" stroke-width="1.5"/>';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, x = 60 + Math.cos(a) * 38, y = 52 + Math.sin(a) * 38;
    s += `<path d="M60 52L${x.toFixed(1)} ${y.toFixed(1)}" stroke-width="1.5"/><circle cx="${x.toFixed(1)}" cy="${(y + 4.5).toFixed(1)}" r="3.6" fill="currentColor" stroke="none"/>`;
  }
  return s + '<path d="M60 52L40 104M60 52l20 52M30 104h60" stroke-width="4"/><circle cx="60" cy="52" r="6" fill="var(--now)" stroke="none"/></svg>';
})();

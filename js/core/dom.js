export const $ = id => document.getElementById(id);

let toastTimer;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 1800);
}

export const loadScript = src => new Promise((ok, ko) => {
  if ([...document.scripts].some(s => s.src === src)) return ok();
  const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
});

export function loadCss(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

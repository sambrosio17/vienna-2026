// Install prompt, offline badge and service worker registration.
import { $ } from '../core/dom.js';

export function init() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const lab = $('inst-lab'), sub = $('inst-sub'), btn = $('inst-btn');
  if (standalone) { lab.textContent = 'App installata'; sub.textContent = 'Stai usando Vienna 2026 come app: funziona anche senza connessione.'; }
  else if (isIOS) sub.textContent = 'In Safari tocca Condividi (il quadrato con la freccia), poi "Aggiungi alla schermata Home".';
  else sub.textContent = 'Tocca Installa, oppure apri il menu del browser e scegli "Installa app" o "Aggiungi a schermata Home".';
  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; btn.hidden = false; });
  btn.addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; btn.hidden = true; });
  addEventListener('appinstalled', () => { lab.textContent = 'App installata'; sub.textContent = 'Trovi Vienna 2026 nella schermata Home.'; btn.hidden = true; });

  // Offline badge next to the clock
  const badge = document.createElement('span'); badge.className = 'offline'; badge.textContent = 'Offline';
  const setNet = () => { badge.hidden = navigator.onLine; };
  $('ctrip').after(badge); setNet();
  addEventListener('online', setNet); addEventListener('offline', setNet);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      $('off-sub').textContent = 'Pronta per l’uso offline: programma, numeri e note restano disponibili senza rete. Le mappe e i siti esterni richiedono la connessione.';
    }).catch(() => {});
  }
}

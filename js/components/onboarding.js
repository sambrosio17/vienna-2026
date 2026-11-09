// First-run setup: welcome, who are you, photo, location sharing, theme.
import { D } from '../core/data.js';
import { store } from '../core/store.js';
import { $, toast } from '../core/dom.js';
import { esc } from '../core/format.js';
import { EMBEDDED, PREVIEW } from '../core/config.js';
import { WHEEL } from '../core/icons.js';
import { meName, sharing, myPhoto, avatarHtml, setMyName, setSharing, setPhoto, processPhoto } from './profile.js';
import { skinCards } from './skins.js';
import { startTour } from './tour.js';

const STEPS = 5;
let step = 0;

export function openOnboarding(s) { step = s || 0; $('onboard').hidden = false; document.body.classList.add('noscroll'); render(); }
function close() { $('onboard').hidden = true; document.body.classList.remove('noscroll'); store.set('vie26-onboarded', true); }

function render() {
  const t = D.trip;
  $('ob-dots').innerHTML = Array.from({ length: STEPS }, (_, i) => `<i class="${i === step ? 'on' : i < step ? 'done' : ''}"></i>`).join('');
  $('ob-back').style.visibility = step > 0 ? 'visible' : 'hidden';
  const views = [
    () => `<div class="ob-hero"><div class="ob-wheel" aria-hidden="true">${WHEEL}</div>
      <div class="eyebrow">${esc(t.subtitle.split(' · ')[0])}</div><h2>Benvenuti a <span>${esc(t.city.name)}</span></h2>
      <p>Il programma del viaggio, i biglietti, la mappa e il gruppo in un’unica app. Due minuti per configurarla.</p></div>
      <div class="ob-actions"><button class="ob-primary" type="button" data-ob="next">Iniziamo</button></div>`,
    () => `<h2>Chi sei?</h2><p>Serve per mostrarti agli altri sulla mappa.</p>
      <div class="ob-who" role="radiogroup" aria-label="Scegli il tuo nome">${t.travelers.map(({ name: n }) => `<button type="button" role="radio" aria-checked="${meName === n}" data-who="${esc(n)}">${avatarHtml(n, meName === n ? myPhoto : '', 'big')}<span>${esc(n)}</span></button>`).join('')}</div>
      <div class="ob-actions"><button class="ob-primary" type="button" data-ob="next" ${meName ? '' : 'disabled'}>Avanti</button></div>`,
    () => `<h2>La tua foto</h2><p>Gli altri ti riconosceranno sulla mappa. Resta solo nell’app del gruppo.</p>
      <div class="ob-photo">${avatarHtml(meName || '?', myPhoto, 'huge')}</div>
      <input type="file" id="ob-file" accept="image/*" hidden>
      <div class="ob-actions">
        <button class="ob-primary" type="button" data-ob="pick">${myPhoto ? 'Cambia foto' : 'Scatta o scegli una foto'}</button>
        ${myPhoto ? '<button class="ob-ghost" type="button" data-ob="rmphoto">Togli la foto</button>' : ''}
        <button class="ob-ghost" type="button" data-ob="next">${myPhoto ? 'Avanti' : 'Più tardi'}</button></div>`,
    () => `<h2>Condividi la posizione</h2><p>Mentre l’app è aperta gli altri vedono dove sei, e tu vedi loro. I dati viaggiano cifrati.</p>
      <div class="ob-card"><label class="switch" for="ob-share"><input type="checkbox" id="ob-share" role="switch" ${sharing ? 'checked' : ''} ${EMBEDDED ? 'disabled' : ''}>Condividi la mia posizione</label>
      <p class="note">${EMBEDDED ? 'Disponibile solo nell’app installata sul telefono.' : 'Il telefono ti chiederà il permesso. Puoi cambiare idea quando vuoi dalla Mappa o dal profilo.'}</p></div>
      <div class="ob-actions"><button class="ob-primary" type="button" data-ob="next">Avanti</button></div>`,
    () => `<div class="ob-hero">${avatarHtml(meName || '?', myPhoto, 'huge')}<h2>Tutto pronto${meName ? ', ' + esc(meName) : ''}!</h2>
      <p>Scegli lo stile che preferisci: puoi cambiarlo quando vuoi da Utili.</p></div>
      <div class="skins" role="radiogroup" aria-label="Tema dell’app">${skinCards()}</div>
      <p style="margin:0;color:var(--muted);font-size:14.5px">Vuoi un giro veloce dell’app? Ti mostro dove trovare ogni cosa.</p>
      <div class="ob-actions"><button class="ob-primary" type="button" data-ob="tour">Fai il giro guidato</button>
      <button class="ob-ghost" type="button" data-ob="finish">Inizia subito</button></div>`
  ];
  const el = $('ob-body');
  el.innerHTML = views[step]();
  const f = el.querySelector('h2,button'); if (f && f.focus) f.setAttribute('tabindex', '-1');
}

export function init() {
  $('onboard').addEventListener('click', e => {
    const w = e.target.closest('[data-who]'); if (w) { setMyName(w.dataset.who); render(); return; }
    const a = e.target.closest('[data-ob]'); if (!a) return;
    const act = a.dataset.ob;
    if (act === 'next') { step = Math.min(STEPS - 1, step + 1); render(); }
    if (act === 'pick') $('ob-file').click();
    if (act === 'rmphoto') { setPhoto('', ''); render(); }
    if (act === 'finish') close();
    if (act === 'tour') { close(); startTour(); }
  });
  $('onboard').addEventListener('change', async e => {
    if (e.target.id === 'ob-file' && e.target.files[0]) {
      try { const [b, s] = await processPhoto(e.target.files[0]); setPhoto(b, s); render(); } catch (err) { toast('Questa immagine non si apre: provane un’altra'); }
    }
    if (e.target.id === 'ob-share') setSharing(e.target.checked, true);
  });
  $('ob-back').addEventListener('click', () => { step = Math.max(0, step - 1); render(); });
  $('ob-skip').addEventListener('click', close);
  if (!EMBEDDED && !PREVIEW && !store.get('vie26-onboarded', false)) openOnboarding(0);
}

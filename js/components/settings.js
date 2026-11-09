// App settings block in "Utili": weather effects, reminders, link to legend and install info.
// The controls are wired by fx.js and reminders.js and countdown.js.
const FX_OPTIONS = [['auto', 'Come il meteo'], ['rain', 'Pioggia'], ['snow', 'Neve'], ['storm', 'Temporale'], ['fog', 'Nebbia'], ['clouds', 'Nuvole'], ['sun', 'Sole'], ['stars', 'Stelle'], ['off', 'Spenti']];

export function settingsHtml() {
  return `<div class="list">
    <div class="item"><label class="lab" for="fx-mode">Effetti meteo</label><span class="sub">Ora: <span id="fx-state">–</span></span>
      <span class="acts"><select id="fx-mode">${FX_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></span></div>
    <div class="item"><label class="lab" for="cd-on">Conto alla rovescia</label><span class="sub" id="cd-sub">Un messaggio al giorno fino alla partenza.</span>
      <span class="acts"><label class="switch"><input type="checkbox" id="cd-on" role="switch"></label></span></div>
    <div class="item"><label class="lab" for="rem-on">Promemoria ingressi</label><span class="sub" id="rem-sub">Notifica 30 minuti prima degli orari vincolanti.</span>
      <span class="acts"><label class="switch"><input type="checkbox" id="rem-on" role="switch"></label></span></div>
    <div class="item"><span class="lab">Promemoria nel calendario</span><span class="sub">Funzionano anche con l’app chiusa: Parlamento, Schönbrunn, Belvedere, Sissi, Kunsthistorisches e aeroporto, con avviso 30 minuti prima.</span>
      <span class="acts"><button class="smallbtn" type="button" id="rem-ics">Aggiungi</button></span></div>
    <a class="item" href="#info"><span class="lab">Linee, legenda e installazione</span><span class="sub">Colori delle linee, installare l’app, azzerare le tappe spuntate</span><span class="go">›</span></a>
  </div>`;
}

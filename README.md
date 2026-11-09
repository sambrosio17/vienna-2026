# Vienna 2026 — app installabile (PWA)

Programma del viaggio a Vienna (24–27 novembre 2026) come app per il telefono, utilizzabile anche offline.

## Struttura

Nessun build: HTML, CSS e moduli JavaScript nativi (ES modules), serviti così come sono da GitHub Pages.

| Percorso | A cosa serve |
|---|---|
| `index.html` | Solo la struttura della pagina: contenitori delle sezioni, menu in basso, finestre (configurazione, guida, biglietto) |
| `data/` | **Tutti i contenuti**, in JSON (vedi sotto) |
| `css/` | Stili divisi per area, caricati in quest'ordine: `base`, `header`, `programme`, `dock`, `views`, `tickets`, `map`, `onboarding`, `weather`, `games`, `responsive`, `skins` |
| `js/main.js` | Punto di partenza: carica i dati e avvia i componenti |
| `js/core/` | Parti condivise: dati (`data.js`), stato (`state.js`), eventi tra componenti (`bus.js`), ora di Vienna (`time.js`), salvataggio sul telefono (`store.js`), link a Google Maps, icone, impostazioni (`config.js`) |
| `js/components/` | Un file per funzione: `programme`, `nextStop`, `sun`, `weather`, `fx`, `tickets`, `map`, `position`, `travelers`, `events`, `profile`, `onboarding`, `tour`, `skins`, `reminders`, `bookings`, `utili`, `settings`, `header`, `install`, `router` |
| `js/components/games/` | Un file per gioco (`quiz`, `memory`, `word`) più il menu (`index.js`) |
| `sw.js` | Service worker per l'uso offline |
| `scripts/` | `precache.mjs` (aggiorna l'elenco dei file offline), `update-events.mjs` (usato dalla GitHub Action) |
| `tickets-enc/`, `events.json`, `icons/`, `manifest.webmanifest` | Biglietti cifrati, eventi di Vienna, icone, installazione |

### I dati (`data/`)

| File | Contenuto |
|---|---|
| `trip.json` | Titolo, date, città, alloggio, viaggiatori con il loro colore, meteo tipico |
| `days.json` | Il programma: giorni, tappe (`place` rimanda a `places.json`, `ticket` a `tickets.json`) e spostamenti (`leg`) |
| `places.json` | Coordinate di ogni luogo |
| `tickets.json` | Biglietti (pagine e PDF) e biglietti mancanti |
| `reminders.json` | Ingressi a orario: minuti di preavviso (`before`) e anticipo consigliato (`early`) |
| `bookings.json` | Checklist delle prenotazioni |
| `utili.json` | Sezioni di "Cose utili": elenchi, consigli, frasi; le voci `slot` sono riempite dall'app (profilo, prenotazioni, tema, impostazioni) |
| `skins.json`, `tour.json` | Temi e passi della guida |
| `games/*.json` | Domande del quiz, parole del memory, parole segrete |

Per cambiare un orario, aggiungere una tappa o un numero utile basta modificare il JSON. Per aggiungere una funzione si crea un componente in `js/components/` con una funzione `init()` e lo si aggiunge in `js/main.js`; i componenti si parlano con gli eventi di `bus.js` (`day`, `programme`, `minute`, `pos`, `wx`, `profile`, `skin`, `map:show`).

**Dopo ogni modifica** esegui `node scripts/precache.mjs`: aggiorna l'elenco dei file salvati per l'uso offline e la versione del service worker, così i telefoni scaricano la nuova versione.

## Biglietti cifrati

La cartella `tickets-enc/` contiene i biglietti **cifrati** (AES-GCM 256, chiave derivata dalla password con PBKDF2-SHA256, 600.000 iterazioni). Senza la password del viaggio sono illeggibili, anche se il repository è pubblico. La password non è salvata da nessuna parte nel repository.

- Nella sezione Biglietti l'app chiede la password una volta sola, decifra i file e li salva sul telefono: da lì in poi si aprono anche offline.
- "Toglili", in fondo alla sezione Biglietti, cancella i biglietti decifrati da quel telefono.
- Per aggiungere o cambiare biglietti: rimetti gli originali nella cartella locale `biglietti-originali/` (fuori dal repository) e cifrali di nuovo con lo script `encrypt-tickets.mjs` (`TICKET_PASS=... node encrypt-tickets.mjs <originali> tickets-enc`), poi esegui `node scripts/precache.mjs`.
- Dopo il viaggio conviene cancellare il repository.

## Primo avvio e guida

Alla prima apertura l'app chiede chi sei (Salvatore, Luisa, Giuseppe, Antonietta), una foto facoltativa e se condividere la posizione, poi propone un giro guidato. Tutto si può cambiare in seguito dal profilo: icona in alto a destra oppure Utili → Il tuo profilo, dove si riapre anche la guida.

La foto resta salvata sul telefono. Agli altri arriva una versione piccola e cifrata solo mentre condividi la posizione, e viene cancellata dal broker quando smetti di condividere.

## Temi

Ognuno sceglie sul proprio telefono tra tre temi: **Notte imperiale** (l'originale, che segue il tema chiaro o scuro del telefono), **Tabellone** (scuro, stile tabellone delle partenze) e **Punsch** (chiaro e caldo, schede arrotondate). Si sceglie alla fine della configurazione iniziale o da Utili → Tema dell'app.

## Meteo e giochi

- **Meteo**: previsioni giornaliere per Vienna da Open-Meteo, gratuito e senza chiave. Arrivano circa 15 giorni prima; fino ad allora ogni giorno mostra la media del periodo. Accanto all'orologio c'è il meteo attuale: nella tua posizione se l'hai consentita (tocca la riga per chiederla), altrimenti a Vienna. Offline resta l'ultimo dato salvato.
- **Effetti meteo**: l'app riflette il tempo attuale con pioggia, neve, temporale con lampi, nebbia, nuvole, sole o stelle di notte. Si spengono, o si provano uno per uno, da Utili → App → Effetti meteo. Con "riduci movimento" attivo sul telefono restano spenti in automatico.
- **Giochi**: quiz su Vienna, memory del tedesco e parola segreta, tutti offline. Si aprono da Utili o dalle tappe in aeroporto.

## Come ci arrivo e promemoria

- **Come ci arrivo**: nel giorno in corso, sotto la barra della giornata, c'è la prossima tappa con distanza e tempo a piedi dalla tua posizione e i pulsanti per le indicazioni di Google Maps, a piedi o con i mezzi. Ogni tappa mostra anche la sua distanza a piedi; toccandola si aprono le indicazioni.
- **Rischio ritardo**: per gli ingressi a orario vincolante (Parlamento, Schönbrunn, Belvedere, Sissi, Kunsthistorisches) e per l'aeroporto, l'app avvisa se a piedi non si arriva in tempo.
- **Promemoria** (Utili → App): notifica 30 minuti prima di ogni ingresso a orario (40 per il Belvedere). Una web app senza server può mandarle solo mentre è aperta o appena chiusa; su iPhone servono iOS 16.4+ e l'app installata nella schermata Home.
- **Promemoria nel calendario** (Utili → App → Aggiungi): scarica un file `.ics` con le sei scadenze e un avviso 30 minuti prima. È il modo affidabile, perché suona anche con l'app chiusa.

## Alba, tramonto ed eventi

- **Alba e tramonto**: calcolati sul telefono per ogni giorno (funzionano offline). Nel giorno in corso l'app dice anche quanto manca al buio.
- **Eventi vicini** (sezione Mappa): dal calendario ufficiale della città, [Wien erleben](https://www.wien.gv.at/veranstaltungen/), ordinati per distanza da te (se sei a Vienna) o dalle tappe del giorno. Si possono cercare e mostrare sulla mappa.
- Il server della città manda un header CORS doppio e il browser non può leggerlo direttamente. Per questo la GitHub Action `Aggiorna eventi di Vienna` (`.github/workflows/events.yml`) scarica il feed ogni 6 ore e lo salva in `events.json`. Si può lanciare a mano da *Actions → Aggiorna eventi di Vienna → Run workflow*.
- Il feed non riporta le date in forma strutturata: date e orari sono sulla pagina di ogni evento.

## Mappa e posizione degli altri

- **Mappa**: tappe numerate per ogni giorno, percorso tratteggiato e la tua posizione (punto blu). Usa le mappe OpenStreetMap; le zone già viste restano disponibili offline.
- **Viaggiatori**: ognuno sceglie il proprio nome e attiva "Condividi la mia posizione". Le posizioni passano dal broker MQTT pubblico `broker.hivemq.com`, **cifrate con AES-GCM**: il broker vede solo dati illeggibili, solo chi ha l'app può decifrarli.
- **Limite delle web app**: la posizione si aggiorna solo mentre l'app è aperta. Con l'app chiusa gli altri vedono l'ultima posizione inviata e da quanto tempo.
- **Resettare il gruppo**: cambia `GROUP_ID` e `GROUP_SECRET` in `index.html` (cerca `GROUP_SECRET`). Le vecchie copie dell'app non vedranno più le nuove posizioni.
- Il broker pubblico è gratuito e senza garanzie: se un giorno non risponde, l'etichetta in alto a destra della sezione mostra "Offline" e il resto dell'app continua a funzionare.

## Pubblicarla

Una PWA si installa solo da un indirizzo **HTTPS**: basta un hosting statico gratuito. Bisogna caricare tutta la cartella così com'è.

- **Netlify Drop**: vai su https://app.netlify.com/drop e trascina la cartella `vienna-2026-pwa`.
- **GitHub Pages**: carica i file in un repository e attiva Pages in *Settings → Pages*.
- **Cloudflare Pages** o **Vercel**: nuovo progetto statico con questa cartella come radice.

## Installarla sul telefono

- **iPhone (Safari)**: apri il link, tocca *Condividi* → *Aggiungi alla schermata Home*.
- **Android (Chrome)**: apri il link e tocca *Installa* (nella sezione Info o nel menu del browser).

Dopo la prima apertura con connessione l'app funziona anche offline. Le mappe di Google e i siti esterni richiedono comunque la rete.

## Aggiornarla

Dopo aver modificato i file esegui `node scripts/precache.mjs`, poi `git push`: GitHub Pages pubblica da solo e i telefoni prendono la nuova versione alla prima apertura con rete.

Le tappe spuntate e le prenotazioni segnate sono salvate solo sul telefono.

## Provarla in locale

```bash
npx http-server@14.1.1 vienna-2026-pwa -p 8642 -c-1
```

Poi apri http://localhost:8642.

# Vienna 2026 — app installabile (PWA)

Programma del viaggio a Vienna (24–27 novembre 2026) come app per il telefono, utilizzabile anche offline.

## File

| File | A cosa serve |
|---|---|
| `index.html` | L'app: programma, orologio, sezione Utili, menu in basso |
| `manifest.webmanifest` | Nome, icone e colori per l'installazione |
| `sw.js` | Service worker: salva l'app e i font sul telefono per l'uso offline |
| `icons/` | Icone dell'app (192, 512, maskable, Apple) |

## Biglietti cifrati

La cartella `tickets-enc/` contiene i biglietti **cifrati** (AES-GCM 256, chiave derivata dalla password con PBKDF2-SHA256, 600.000 iterazioni). Senza la password del viaggio sono illeggibili, anche se il repository è pubblico. La password non è salvata da nessuna parte nel repository.

- Nella sezione Biglietti l'app chiede la password una volta sola, decifra i file e li salva sul telefono: da lì in poi si aprono anche offline.
- "Toglili", in fondo alla sezione Biglietti, cancella i biglietti decifrati da quel telefono.
- Per aggiungere o cambiare biglietti: rimetti gli originali nella cartella locale `biglietti-originali/` (fuori dal repository) e cifrali di nuovo con lo script `encrypt-tickets.mjs` (`TICKET_PASS=... node encrypt-tickets.mjs <originali> tickets-enc`), poi cambia `VERSION` in `sw.js`.
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

Dopo aver modificato i file, cambia `VERSION` in `sw.js` (es. `vienna26-v2`) e ricarica la cartella sull'hosting. I telefoni prendono la nuova versione alla prima apertura con rete.

Le tappe spuntate e le prenotazioni segnate sono salvate solo sul telefono.

## Provarla in locale

```bash
npx http-server@14.1.1 vienna-2026-pwa -p 8642 -c-1
```

Poi apri http://localhost:8642.

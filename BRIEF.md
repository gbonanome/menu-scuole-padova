# Brief per Claude Code — **Menu Scuole Padova**

> Salva questo file nella cartella `menu-scuole-padova` come `BRIEF.md`, insieme a `data/scuole-padova.json` e `data/calendario-scolastico-2026-27.json`. Poi in Claude Code scrivi: "Leggi BRIEF.md e parti dalla Fase 0".

---

## Il progetto

**Menu Scuole Padova** (repo `menu-scuole-padova`) è un progetto **open source, non ufficiale e anonimo**, non legato a una persona o a una famiglia. Rende facile consultare il menu delle mense scolastiche del Comune di Padova, gestite da Dussmann.

Fonte unica dei menu: https://www.scuoledussmann.it/padova

## Priorità (in ordine)

1. **Un feed `.ics` per ogni tipo di menu**, pubblicato su GitHub Pages e sottoscrivibile da Google Calendar, Apple Calendar e Outlook.
2. **Aggiornamento automatico degli eventi.** Quando esce una variazione, l'evento di quel giorno nel feed viene modificato. **Questo è l'obiettivo principale.**
3. **Una pagina web** per chi non usa il feed: si sceglie la scuola e si vede il menu in una griglia a calendario, partendo da oggi e scorrendo avanti e indietro.
4. **Ultima priorità, task separato e opzionale:** un canale di notifica delle variazioni. Non va progettato né implementato finché i punti 1–3 non sono in produzione e stabili.

## Cosa sappiamo della fonte

### Menu (PDF)
- PDF pubblici nella sezione `#menu`, sotto `https://www.scuoledussmann.it/upload/editorpagine/`. I nomi file contengono un ID casuale (es. `03-menu-autunnale-prim-second-veicolato-2026-27-4204670.pdf`) e cambiano a ogni pubblicazione: **gli URL vanno sempre ricavati facendo scraping della pagina**, mai scritti a mano. Alcuni link sono vecchi (riportano "2025-26") e altri mancano.
- **Categorie:** il servizio può essere *veicolato* o *cucina interna*. Gli ordini sono asilo nido, nido integrato, infanzia, primaria e secondaria, più la Primaria Lambruschini che ha menu propri.
- **Stagioni:** estivo (settembre – metà ottobre), autunnale (metà ottobre – fine novembre), invernale (dicembre – febbraio), primaverile (marzo – aprile), di nuovo estivo (maggio – giugno). La cucina interna ha solo due stagioni, tranne la Lambruschini.
- **Struttura:** il ciclo è di **4 settimane**. Ogni riga ha il numero di settimana (1–4) e più intervalli di date ("Dal 12.10.26 al 16.10.26", a volte "Dal … / Al …" su due righe, con anno a 2 o 4 cifre). Le colonne vanno da lunedì a venerdì. I piatti non hanno etichette: primo, secondo, contorno, pane, frutta o dolce; l'infanzia ha anche la "Merenda mattino". In testa c'è il periodo di validità (es. "In vigore dal 12.10.2026 al 27.11.2026 con partenza dal lunedì della 3° settimana").
- **Particolarità:**
  - l'estrazione del testo può restituire l'ordine di lettura scombinato;
  - i nomi dei piatti vanno a capo su più righe;
  - ci sono marcatori di nota attaccati ai nomi (`*`, `1`);
  - le note in testata spostano piatti su date specifiche (es. "1. Polpettone 29.10.2026. Polpette 26.11.2026.");
  - le alternative sono scritte con "/" o "Oppure";
  - gli apostrofi sono tipografici.

### Variazioni (notizie)
- Si trovano nella sezione `#notizie`, che è un carosello. Ogni voce ha titolo (es. "VARIAZIONE MENU' 20/11"), data ("Pubblicato il: 06-11-2026") e un'immagine.
- **Il contenuto è testo e si recupera facilmente.** Quando si clicca su una notizia, la pagina fa una **GET con l'id del post** e riceve il contenuto del pannello che si apre. Non serve leggere le immagini né usare un LLM.
- Primo compito della Fase 0: **individuare l'endpoint esatto** (con gli strumenti del browser o leggendo il JS della pagina), il formato della risposta (HTML o JSON) e il modo per ricavare gli id dei post dalla pagina principale.
- Va capito anche **a quali menu si applica una variazione**: tutti, solo veicolato, solo un ordine di scuola? Leggi le variazioni reali e proponi delle regole. Se il testo è ambiguo, la variazione si applica ai feed più probabili e va segnalata nella PR o nella issue.

### Elenco scuole → feed (bozza già pronta)
- Il file **`data/scuole-padova.json`** associa ogni scuola al suo feed. È ricavato dal capitolato di gara del Comune (All. B "Descrizione tecnica Lotto", iscritti a dicembre 2024) e ogni voce ha un campo `confidenza` (alta, media o bassa).
- **Nido integrato:** è una sezione di nido (dai 14 mesi) dentro l'edificio di una scuola dell'infanzia, con un menu dedicato. Sono 5: Il Girasole, Il Mago di Oz, La Coccinella c/o La Giraffa, Il Colibrì c/o Peter Pan, Bambini del Mediterraneo.
- Punti da verificare, segnalati nel file:
  - le 3 scuole dell'infanzia con cuochi comunali (Munari/Miró, Sant'Osvaldo, San Lorenzo): usano il menu Dussmann "infanzia cucina interna"?
  - la Lambruschini;
  - il nido Girotondo (veicolato).
- La pagina web usa questo file per far cercare **il nome della propria scuola** invece di chiedere "veicolato o cucina interna?", che le famiglie spesso non sanno. Il risultato porta al feed giusto. Se la scuola ha il campo `avviso` (oggi Munari/Miró, Sant'Osvaldo, San Lorenzo da Brindisi, Lambruschini, Girotondo nido e infanzia), il testo va mostrato nella pagina accanto alla scuola, quando la si seleziona. Serve anche un modo per segnalare errori (link a una issue precompilata). Non serve risolvere ora queste incertezze: l'avviso basta.

### Calendario scolastico (bozza già pronta)
- Il file **`data/calendario-scolastico-2026-27.json`** contiene inizio e fine dell'anno (fine diversa per primo ciclo e infanzia), festività e sospensioni secondo la delibera della Regione Veneto (DGR 239/2026 modificata dalla DGR 712/2026).
- Nei giorni di festività o sospensione **non si genera l'evento del menu** (eventualmente si mostra un giorno "chiuso" nella pagina). Dopo la fine dell'anno scolastico non si generano eventi, separatamente per primo ciclo e infanzia.
- Da completare: il **calendario dei nidi comunali**, che decide il Comune e non la Regione (cercalo su padovanet.it), e il Santo Patrono.

## Vincoli tecnici
- **JavaScript / Node.js** (LTS attuale), ES modules, il minimo di dipendenze possibile. Pagina in **vanilla JS + CSS**, senza build step se possibile.
- Hosting gratuito: **GitHub Actions + GitHub Pages**, nessun server e **nessuna chiave API a pagamento** (salvo che tu mi dimostri che serve davvero).
- Pipeline: `scrape → parse → JSON normalizzato versionato nel repo (fonte di verità) → build di .ics + JSON per la pagina`.
- **Una persona controlla i nuovi menu stagionali.** Quando esce un nuovo PDF, il workflow apre una **Pull Request** con il JSON estratto e un riepilogo leggibile, in modo che io possa controllare a colpo d'occhio, per esempio settimana per settimana, cosa è cambiato. Le **variazioni** si pubblicano in automatico se superano i controlli di coerenza; altrimenti si apre una PR o una issue.
- Parsing PDF deterministico con `pdfjs-dist`, usando le coordinate x/y per ricostruire la griglia. Se in Fase 0 trovi che non basta, fermati e proponimi alternative.
- In README e pagina: progetto **non ufficiale**, nessun legame con Dussmann o con il Comune, link alla fonte, nessun logo o marchio, fa fede sempre il menu ufficiale, diete speciali e allergeni esclusi. Licenza: proponimi tu (MIT per il codice?).

## Design degli eventi (.ics) — proposta da validare
- Un **evento per l'intera giornata** (`DTSTART;VALUE=DATE`) per ogni giorno di scuola.
- **UID stabile e deterministico** (`<feed>-<YYYYMMDD>@<host pages>`). Ogni modifica incrementa `SEQUENCE` e aggiorna `LAST-MODIFIED` e `DTSTAMP`, così i client sostituiscono l'evento invece di duplicarlo.
- **Titolo** breve, leggibile nella vista mese: `🍽 Spaghetti al pomodoro · Caciotta`. Se c'è una variazione: `⚠️ VARIATO · …`.
- **Descrizione:** portate in ordine, settimana del ciclo (es. "Settimana 2 di 4"), stagione e link al PDF. Se c'è una variazione: il testo della variazione, il menu originale barrato o indicato come "era: …", e il link alla fonte.
- `TRANSP:TRANSPARENT`, `X-WR-CALNAME` ("Menu Scuole Padova · Primaria veicolato"), `X-WR-TIMEZONE:Europe/Rome`, `REFRESH-INTERVAL;VALUE=DURATION:PT6H`, `X-PUBLISHED-TTL:PT6H`.
- Niente `VALARM`: nei calendari sottoscritti vengono spesso ignorati.
- Spiega nel README quanto spesso Google e Apple aggiornano i feed sottoscritti, così le aspettative sono chiare: Google può metterci fino a 24 ore o più.

## Pagina web — proposta da validare
- Mobile first.
- Ricerca della **propria scuola** (da `scuole-padova.json`) oppure scelta diretta del feed. La scelta resta nell'hash dell'URL (`#primaria-secondaria-veicolato`) ed è salvata in `localStorage` (con try/catch).
- **Oggi in evidenza**, poi la settimana corrente da lunedì a venerdì; frecce per la settimana precedente e successiva e un pulsante "Oggi". Su desktop si possono mostrare più settimane.
- Giorni variati ben visibili, con il dettaglio. Festività e sospensioni indicate con il loro nome ("Vacanze di Natale").
- Pulsante **"Aggiungi al calendario"** con link `webcal://`, URL da copiare e brevi istruzioni per iPhone, Android/Google e Outlook.
- Footer con la dichiarazione "non ufficiale", la data dell'ultimo aggiornamento e il link alla fonte.
- Accessibilità WCAG AA, `lang="it"`, navigazione da tastiera.
- Design sobrio e caldo, non istituzionale. **Proponimi 2 direzioni visive** prima di implementare.

## Modo di lavorare — IMPORTANTE

Lavora **per fasi**. Alla fine di ogni fase **fermati**, mostrami cosa hai fatto e cosa proponi, e aspetta la mia conferma. Prima di scrivere codice fammi le domande che ti servono e dammi consigli su come procedere.

### Fase 0 — Ricognizione e piano (senza codice di prodotto)
1. Esamina il sito dal vivo e trova **l'endpoint delle notizie**: URL, parametri, formato della risposta e come si ottengono gli id. Salva in `fixtures/` 2–3 risposte reali.
2. Scarica 4–5 PDF rappresentativi in `fixtures/`: veicolato primaria, infanzia veicolato, nido cucina interna, nido integrato, Lambruschini. Prova l'estrazione con `pdfjs-dist` e mostrami i problemi che trovi.
3. Controlla `data/scuole-padova.json` incrociandolo con l'elenco dei PDF: ogni feed ha un PDF? Ogni PDF ha un feed? Proponimi l'**elenco definitivo dei feed** con gli slug.
4. Proponimi:
   - lo **schema JSON** normalizzato (menu stagionali, giorni, variazioni, provenienza, hash della fonte);
   - le regole per applicare le variazioni;
   - la struttura del repo;
   - il cron (orari in UTC).
5. Domande aperte per me: account o organizzazione GitHub, dominio personalizzato sì o no, licenza, calendario dei nidi.

### Fase 1 — Scaffolding e GitHub
- Inizializza nella cartella `menu-scuole-padova`: `package.json`, `.gitignore`, `.editorconfig`, README in italiano (cos'è, come iscriversi, dichiarazione "non ufficiale", come segnalare errori), LICENSE, cartelle `src/`, `data/`, `public/`, `fixtures/`, `test/`.
- Crea il repo pubblico `menu-scuole-padova` con `gh`, attiva Pages tramite Actions, fai commit piccoli e descrittivi.

### Fase 2 — Scraper e parser
- `src/scrape.js`: estrae l'elenco dei PDF (classificati per servizio, ordine, stagione e anno) e l'elenco delle notizie con il loro contenuto, recuperato tramite l'endpoint. Lo stato va in `data/state.json` (hash e id già processati).
- `src/parse-menu.js`: PDF → JSON normalizzato.
- `src/parse-variation.js`: testo della notizia → variazione strutturata (date, feed coinvolti, piatti sostituiti, testo originale).
- **Controlli di coerenza**, che bloccano la pubblicazione se falliscono:
  - ogni giorno di scuola nel periodo di validità (esclusi quelli del calendario scolastico) ha esattamente un menu;
  - nessuna portata è vuota;
  - il ciclo di 4 settimane è coerente con le date;
  - ogni variazione cade in un giorno coperto e corrisponde ad almeno un feed.

### Fase 3 — Build
- `src/build-ics.js`: CRLF, righe spezzate a 75 ottetti, escape di `,;\`, UID stabili.
- `src/build-site.js`: JSON per la pagina, indice dei feed e indice delle scuole.
- Pagina in `public/`.

### Fase 4 — Automazione
- `update.yml`: cron giornaliero, nei giorni feriali anche a metà giornata, più `workflow_dispatch`. Flusso: scrape → parse → validazione → PR (menu) oppure commit diretto (variazioni valide) → build → deploy.
- Se lo scraping o il parsing falliscono (sito cambiato), si **apre una issue** invece di fallire in silenzio.
- Prevedi una contromisura alla regola di GitHub che disattiva i workflow programmati nei repo pubblici dopo 60 giorni senza attività (estate).

### Fase 5 — Test
- `node:test` su fixture reali: snapshot del JSON e degli `.ics`.
- Rileggi ogni `.ics` con un parser indipendente (es. `node-ical`): UID univoci, nessun evento in festività o sospensione, date corrette. Dammi il link a un validatore online.
- Test di una variazione simulata: titolo e descrizione cambiano, lo UID resta lo stesso e SEQUENCE aumenta.

### Fase 6 — Validazione del design (con me)
- **Eventi:** preparami un feed di prova e le istruzioni per iscrivermi da iPhone e da Google Calendar. Controlliamo insieme come appaiono titolo e descrizione nelle viste giorno e mese.
- **Pagina:** screenshot a 375px, 768px e 1280px, in tema chiaro e scuro, con un giorno variato e uno di vacanza; controllo con axe. Poi chiedimi un parere.
- Itera finché non approvo, poi pubblica e dammi:
  - URL della pagina;
  - URL dei feed;
  - un breve testo da girare agli altri genitori.

### Fase 7 (opzionale, solo dopo la messa in produzione) — Notifiche
Solo quando te lo chiedo: proponimi opzioni aperte e senza account (feed RSS/Atom delle variazioni, topic ntfy.sh, `.ics` con le sole variazioni), con costi e manutenzione di ciascuna.

## Definizione di "fatto"
- I feed sono pubblici e validi, e una variazione reale modifica l'evento giusto entro poche ore dalla pubblicazione.
- La pagina funziona da telefono, si trova la propria scuola per nome, parte da oggi e si naviga per settimane.
- Ogni errore di scraping o di parsing produce una issue o una PR, mai un silenzio.
- Il README spiega come intervenire a ogni cambio di stagione (rivedere e approvare la PR) e a ogni inizio d'anno (aggiornare il calendario scolastico ed eventualmente l'elenco delle scuole).

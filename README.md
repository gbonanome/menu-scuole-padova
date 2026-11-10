# Menu Scuole Padova

Il menu delle mense scolastiche del Comune di Padova nel tuo calendario, con le variazioni aggiornate in automatico.

> **Progetto open source, non ufficiale.** Non ha alcun legame con Dussmann Service né con il Comune di Padova. Non usa loghi o marchi di terzi. **Fa sempre fede il menu ufficiale**: <https://www.scuoledussmann.it/padova>. Diete speciali e allergeni non sono inclusi.

## Cos'è

- Un **feed `.ics`** per ogni tipo di menu (nido, nido integrato, infanzia, primaria e secondaria, primaria Lambruschini; veicolato o cucina interna), da sottoscrivere in Google Calendar, Apple Calendar o Outlook.
- Quando esce una variazione, l'evento di quel giorno viene **modificato** nel feed.
- Una **pagina web** dove cerchi la tua scuola e vedi il menu a calendario. Puoi salvare fino a **3 scuole** (per chi ha più figli) e passare dall'una all'altra con un tocco; l'indirizzo le ricorda tutte, per esempio `?scuola=montegrappa|la-coccinella#montegrappa`, così funziona anche come icona sulla schermata Home.

## Come iscriversi

**Pagina web:** <https://gbonanome.github.io/menu-scuole-padova/>: cerca la scuola, vedi il menu e trovi il pulsante *Aggiungi al calendario* (le istruzioni per iPhone, Android e Outlook sono nelle *Impostazioni* della pagina).

| Menu | Feed (.ics) | Google Calendar | iPhone / Mac (apri in Safari) |
|---|---|---|---|
| Nido veicolato | [nido-veicolato.ics](https://gbonanome.github.io/menu-scuole-padova/feed/nido-veicolato.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Fnido-veicolato.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/nido-veicolato.ics` |
| Nido cucina interna | [nido-cucina-interna.ics](https://gbonanome.github.io/menu-scuole-padova/feed/nido-cucina-interna.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Fnido-cucina-interna.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/nido-cucina-interna.ics` |
| Nido integrato | [nido-integrato-cucina-interna.ics](https://gbonanome.github.io/menu-scuole-padova/feed/nido-integrato-cucina-interna.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Fnido-integrato-cucina-interna.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/nido-integrato-cucina-interna.ics` |
| Infanzia veicolato | [infanzia-veicolato.ics](https://gbonanome.github.io/menu-scuole-padova/feed/infanzia-veicolato.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Finfanzia-veicolato.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/infanzia-veicolato.ics` |
| Infanzia cucina interna | [infanzia-cucina-interna.ics](https://gbonanome.github.io/menu-scuole-padova/feed/infanzia-cucina-interna.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Finfanzia-cucina-interna.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/infanzia-cucina-interna.ics` |
| Primaria e secondaria veicolato | [primaria-secondaria-veicolato.ics](https://gbonanome.github.io/menu-scuole-padova/feed/primaria-secondaria-veicolato.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Fprimaria-secondaria-veicolato.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/primaria-secondaria-veicolato.ics` |
| Primaria Lambruschini | [primaria-lambruschini.ics](https://gbonanome.github.io/menu-scuole-padova/feed/primaria-lambruschini.ics) | [Aggiungi](https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fgbonanome.github.io%2Fmenu-scuole-padova%2Ffeed%2Fprimaria-lambruschini.ics) | `webcal://gbonanome.github.io/menu-scuole-padova/feed/primaria-lambruschini.ics` |

- **iPhone e Mac:** copia l'indirizzo `webcal://…` e aprilo in Safari, poi conferma con *Iscriviti*. GitHub non rende cliccabili i link `webcal`, ma il pulsante sulla pagina web fa la stessa cosa. Per ricevere l'avviso delle 7:00 nei giorni variati, nelle impostazioni del calendario disattiva *Rimuovi avvisi*.
- **Google Calendar:** apri il link *Aggiungi* da computer, con l'account Google giusto, e conferma. In alternativa: *Altri calendari → + → Da URL* e incolla l'indirizzo del feed.
- **Outlook:** *Aggiungi calendario → Sottoscrivi dal Web* e incolla l'indirizzo del feed.

Non sai quale menu usa la tua scuola? Cercala sulla [pagina web](https://gbonanome.github.io/menu-scuole-padova/).

Sul tempo di aggiornamento: i feed vengono rigenerati più volte al giorno, ma **sono i client a decidere quando rileggerli**. Apple Calendar di solito entro poche ore; Google Calendar può impiegare 24 ore o più; Outlook alcune ore.

## Come segnalare errori

Apri una issue: <https://github.com/gbonanome/menu-scuole-padova/issues>. Se una scuola è associata al menu sbagliato, indica nome della scuola e menu corretto.

## Per chi mantiene il progetto

### Come funziona l'aggiornamento automatico

Il workflow [`update.yml`](.github/workflows/update.yml) gira ogni giorno alle 05:15 UTC e, nei giorni feriali, anche alle 10:15 e alle 14:15 UTC (in Italia +1 ora d'inverno, +2 d'estate). Si può lanciare a mano da *Actions → Aggiornamento menu → Run workflow*.

1. Legge la pagina di Dussmann, scarica i PDF dei menu nuovi o cambiati (gli URL cambiano a ogni pubblicazione) e le notizie.
2. **Variazioni**: vengono pubblicate subito. Se il testo è ambiguo (confidenza non alta) il giorno mostra comunque l'avviso, e si apre una issue `variazione-da-verificare`.
3. **Menu nuovi o modificati**: non vanno direttamente online. Il workflow apre (o aggiorna) la Pull Request **"Nuovo menu da rivedere"** con la griglia settimana per settimana e le celle cambiate. Va confrontata con il PDF e poi unita: al merge feed e pagina si aggiornano.
4. Costruisce feed `.ics` e pagina e li pubblica su GitHub Pages.
5. Se lo scraping o il parsing falliscono (sito cambiato, PDF in un formato nuovo) si apre la issue **"Aggiornamento automatico non riuscito"**, che si chiude da sola quando tutto torna a posto. I dati già pubblicati restano invariati.

Comandi utili in locale: `npm run update` (scraping), `npm run build` (genera `dist/`), `npm run piatti` (traduzioni mancanti), `npm run serve` (anteprima su http://localhost:8080), `npm test`.

### Test

`npm test` esegue i test con `node:test`. Il cuore è [`test/pipeline.test.js`](test/pipeline.test.js): rifà tutto il percorso (scraping → parsing → validazione → build) sulle fixture reali in `fixtures/`, con data fissa, e confronta il risultato con gli snapshot in `test/snapshots/` (menu JSON, variazioni, feed `.ics`). Ogni `.ics` viene riletto con un parser indipendente ([ical.js](https://github.com/kewisch/ical.js)) per controllare UID univoci, eventi di giornata intera e nessun evento in festività o sospensioni. C'è anche una variazione simulata, dalla notizia all'evento: stesso UID, `SEQUENCE` aumentata, titolo e descrizione aggiornati, nessun altro evento toccato.

Se cambi il parser o la build di proposito, rigenera gli snapshot con `UPDATE_SNAPSHOTS=1 npm test` e controlla il diff prima del commit. Per aggiungere un caso nuovo (un PDF o una notizia), salvalo in `fixtures/` e rigenera gli snapshot.

Validatore online dei feed: <https://icalendar.org/validator.html?url=https://gbonanome.github.io/menu-scuole-padova/feed/primaria-secondaria-veicolato.ics>

Impostazione richiesta nel repository: *Settings → Actions → General → Workflow permissions* → "Allow GitHub Actions to create and approve pull requests" (serve per aprire la PR dei menu).

### A ogni cambio di stagione

Arriva la PR "Nuovo menu da rivedere": controllala con il PDF e fai il merge. Se chiudi la PR senza merge il menu non viene pubblicato; per riproporlo, togli il suo PDF da `data/state.json`.

### Traduzioni dei nomi dei piatti

La pagina mostra i piatti anche in inglese, rumeno, cinese, bengalese, albanese, arabo e urdu. Le traduzioni stanno in `data/traduzioni/piatti-<lingua>.json` (`en`, `ro`, `zh`, `bn`, `sq`, `ar`, `ur`): un oggetto `{ "nome italiano esatto": "traduzione" }`, con le chiavi in ordine alfabetico. La build copia in `dist/data/piatti-<lingua>.json` solo i piatti dei menu in uso; un piatto senza traduzione si vede in italiano, quindi niente si blocca.

- `npm run piatti` elenca, lingua per lingua, i piatti senza traduzione e le voci non più usate. La PR "Nuovo menu da rivedere" riporta in fondo i piatti nuovi ancora da tradurre.
- Per un piatto nuovo aggiungi la voce in tutti e sette i file, al suo posto in ordine alfabetico, copiando il nome italiano esattamente com'è nel menu (apostrofi tipografici, asterischi, maiuscole); per una correzione basta il file di quella lingua. Poi `npm test`: controlla che i file siano validi e in ordine, e che i piatti delle fixture siano tutti tradotti.
- I dubbi da far rivedere a madrelingua sono in [`data/traduzioni/NOTE.md`](data/traduzioni/NOTE.md).

### A ogni inizio d'anno scolastico

- Aggiungi `data/calendario-scolastico-AAAA-AA.json` (Regione) e `data/calendario-nidi-AAAA-AA.json` (Comune).
- Controlla `data/scuole-padova.json` (scuole e tipo di menu).
- I PDF dell'anno precedente vengono ignorati automaticamente: le date di inizio e fine di ogni menu sono quelle scritte nei PDF (l'inizio della mensa non coincide con l'inizio della scuola).

### Estate e workflow programmati

GitHub disattiva i workflow programmati dei repository pubblici dopo 60 giorni senza attività. Il workflow lo previene da solo (riattivazione via API a ogni esecuzione e, se serve, un commit vuoto ogni 50 giorni). Se comunque risultasse disattivato, riattivalo da *Actions → Aggiornamento menu → Enable workflow*.

### Versioni e changelog

Le modifiche al codice e alla pagina sono raccolte in [CHANGELOG.md](CHANGELOG.md); la versione in uso compare in fondo alla pagina. Gli aggiornamenti automatici di menu e variazioni sono dati e non cambiano versione.

1. Mentre lavori, annota le modifiche nella sezione *Non ancora rilasciato* del CHANGELOG.
2. Per rilasciare, rinomina la sezione con la nuova versione e la data, aggiorna i link in fondo al file e fai il commit.
3. `npm version minor` (oppure `patch` per le sole correzioni, `major` se cambiano gli indirizzi dei feed o gli UID): aggiorna `package.json`, fa il commit e crea il tag.
4. `git push --follow-tags`: il workflow [`release.yml`](.github/workflows/release.yml) crea la release su GitHub con le note del CHANGELOG.

## Licenza

Codice sotto licenza [MIT](LICENSE). I font [Figtree](https://github.com/erikdkennedy/figtree) e [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) sono distribuiti con licenza SIL Open Font License 1.1 e sono ospitati insieme alla pagina (nessuna richiesta a servizi esterni). I contenuti dei menu appartengono ai rispettivi autori; il progetto ne riporta una rielaborazione con link alla fonte.

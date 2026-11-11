# Changelog

Le modifiche al progetto, versione per versione. Il formato segue [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/) e i numeri di versione seguono [Semantic Versioning](https://semver.org/lang/it/):

- **maggiore** (2.0.0): cambia qualcosa che rompe le iscrizioni esistenti, per esempio l'indirizzo di un feed o gli UID degli eventi;
- **minore** (1.2.0): una funzione nuova;
- **correzione** (1.1.1): un errore sistemato, senza funzioni nuove.

Gli aggiornamenti automatici dei menu e delle variazioni sono dati, non versioni: non compaiono qui.

## [Non ancora rilasciato]

### Corretto
- Nel riquadro del menu di oggi (e del prossimo giorno con mensa) non compare più la scritta "null" sopra i piatti nei giorni senza variazioni.

## [1.2.2] - 2026-11-10

### Modificato
- Sul telefono la barra in basso resta visibile anche con il calendario del mese o le impostazioni aperti: la voce attiva è evidenziata, un secondo tocco chiude il pannello e si passa dall'uno all'altro senza chiuderlo prima. *Oggi* chiude tutto.

### Corretto
- In cima ai pannelli *Impostazioni* e *Vista mensile* gli angoli arrotondati non mostrano più un bordo dritto, e all'apertura delle impostazioni non compare più una riga verde (il focus va sul titolo).

## [1.2.1] - 2026-11-10

### Modificato
- Sul telefono il calendario del mese si apre con il titolo "Vista mensile" e il pulsante *Chiudi*, come il pannello *Impostazioni*.

## [1.2.0] - 2026-11-10

### Aggiunto
- Base per tradurre la pagina: i testi passano da `public/i18n.js` (italiano incluso) e le altre lingue da `public/lingue/<codice>.json`, tradotti in inglese, rumeno, cinese, bengalese, albanese, arabo e urdu (traduzioni non ancora riviste da madrelingua; i dubbi sono in `data/traduzioni/NOTE.md`). La lingua si sceglie nel pannello *Impostazioni* (o con `?lingua=<codice>` nell'indirizzo); quella salvata sul dispositivo vince sull'indirizzo e il default resta sempre l'italiano. In italiano la pagina non cambia.
- Nelle altre lingue i nomi dei piatti arrivano da `data/piatti-<codice>.json` (se manca una voce resta il nome italiano) e sotto il testo degli avvisi, che resta in italiano, c'è il link per tradurlo con Google Traduttore.
- Arabo e urdu da destra a sinistra: il foglio di stile usa proprietà logiche e le frecce della settimana si girano.
- Pannello *Impostazioni*: la lingua della pagina (italiano, inglese, rumeno, cinese, bengalese, albanese, arabo, urdu), le istruzioni per il calendario con l'indirizzo della scuola aperta e il pulsante *Copia*, quelle per la schermata Home, *Segnala un errore* e la nota sul progetto. Su telefono si apre come un foglio dal basso, da 700px come pannello laterale; si chiude con Esc, toccando fuori o con *Chiudi*, e non cambia l'indirizzo.
- Su telefono una barra fissa in basso con *Oggi* (torna alla settimana corrente e al vassoio), *Mese* e *Impostazioni*. Oggi e Mese compaiono quando c'è una scuola scelta.
- Pulsante *Condividi* sotto *Aggiungi al calendario*: condivide il link alla scuola aperta (con la lingua, se non è l'italiano) oppure lo copia negli appunti.
- Dizionario dei nomi dei piatti in inglese, rumeno, cinese, bengalese, albanese, arabo e urdu (`data/traduzioni/`), con i soli piatti in uso pubblicati in `data/piatti-<lingua>.json` per la pagina. `npm run piatti` elenca le traduzioni mancanti; la PR "Nuovo menu da rivedere" segnala i piatti nuovi ancora da tradurre.
- Calendario del mese, per saltare a una data e vedere a colpo d'occhio i giorni con variazioni, senza mensa o con il menu non ancora pubblicato. Solo lunedì–venerdì, oggi in giallo e la settimana mostrata evidenziata; toccando un giorno si passa alla sua settimana, e il mese segue le frecce della settimana e "Oggi". Da 900px è sempre visibile accanto al vassoio; tra 700 e 899px si apre dal titolo della settimana; sul telefono si apre dalla voce Mese della barra in basso, come foglio dal basso. Si usa anche da tastiera (frecce tra i giorni) ed è tradotto.

### Modificato
- I giorni con una variazione non hanno più lo sfondo rosso: bastano il riquadro "Variazione" e il bollino "variato" sul piatto.
- Le istruzioni per il calendario e per la schermata Home sono passate dalla pagina al pannello *Impostazioni*: sotto *Aggiungi al calendario* resta la riga "Come funziona? Istruzioni nelle impostazioni". Da 700px *Impostazioni* è in testata; su telefono in testata non c'è nessuna icona.
- Sotto i 700px il pulsante *Oggi* accanto alle frecce della settimana lascia il posto a quello della barra in basso.
- Su tablet e computer il vassoio di oggi (o del prossimo giorno di mensa) compare in alto, disposto in orizzontale: a sinistra il giorno, a destra il piatto principale grande e gli altri scomparti accanto. Sotto restano la navigazione e la settimana su 5 colonne. Da 900px accanto al vassoio c'è il calendario del mese.
- Su tablet e computer i riquadri delle variazioni del vassoio stanno sotto data e scomparti, a tutta larghezza (affiancati se sono due), invece di allungare la colonna di sinistra; il titolo del vassoio dice anche il mese ("Oggi martedì 10 novembre"). Sul telefono non cambia nulla.
- La riga "Oggi, …: niente mensa." sopra la settimana compare solo quando non c'è il vassoio, cioè quando nei prossimi 14 giorni non c'è mensa.

### Rimosso
- Il pulsante "?" in testata e il suo riquadro: la nota sul progetto è nel pannello *Impostazioni* (e resta nel piede).
- I due riquadri a scomparsa "Altri modi e istruzioni" e "Metti la pagina sulla schermata Home" in fondo alla pagina: il contenuto è nel pannello.

## [1.1.1] - 2026-11-08

### Modificato
- In testata l'icona accanto al nome, che è leggermente più grande.
- Il piatto variato non è più in grassetto: lo segnala il bollino "variato" (il grassetto resta solo sul primo piatto).

### Corretto
- Le variazioni che scambiano due piatti tra due giorni ("…e viceversa…") ora cambiano il menu dei giorni coinvolti, ciascuno con la sua data. Prima restava solo il testo dell'avviso: il 12/11 risultava ancora l'halibut invece dei filettini di merluzzo.

## [1.1.0] - 2026-11-08

### Aggiunto
- Fino a 3 scuole salvate, con una barra di pillole in cima per passare dall'una all'altra. L'indirizzo le ricorda tutte, per esempio `?scuola=montegrappa|la-coccinella#montegrappa`.
- Icona dedicata con la scritta "Menu scuole", manifest e istruzioni per mettere la pagina sulla schermata Home di iPhone e Android.
- Quando oggi non c'è mensa, la pagina lo dice con la data e il motivo (weekend, chiusura, menu non ancora pubblicato).
- Fascia gialla quando la data è simulata con `?oggi=`, con il link per tornare alla data reale.
- Versione della pagina nel piede, con il link a questo changelog.


### Modificato
- I dettagli della scuola (nome completo, menu, "Cambia scuola", "Rimuovi") si aprono toccando la pillola della scuola attiva, segnata da una matita.
- In testata un "?" porta alla nota "non ufficiale" in fondo alla pagina; su desktop apre un riquadro con la nota.
- "Segnala un errore" e la nota sull'abbinamento scuola-menu sono passati nel piede.
- Tolto il testo sotto il pulsante "Aggiungi al calendario"; più spazio sopra la nota in fondo.

### Corretto
- Su iPhone la pagina non si ingrandisce più toccando i campi di ricerca (causava lo scroll orizzontale).
- Safari non abbina più la pagina nuova al foglio di stile vecchio: CSS e JS hanno l'impronta del contenuto nell'indirizzo.
- L'icona sulla schermata Home apre la scuola che era aperta quando è stata creata, e poi l'ultima scuola vista nell'app.

## [1.0.0] - 2026-11-08

Prima versione pubblica.

### Aggiunto
- Un feed `.ics` per ogni tipo di menu (7 in tutto), con un evento di giornata intera per ogni giorno di mensa e nessun evento nei giorni di chiusura.
- Lettura automatica dei PDF dei menu di Dussmann (solo anno scolastico in corso) e delle notizie di variazione, più volte al giorno.
- Variazioni applicate agli eventi: piatti sostituiti con "(era: …)", menu sostitutivi degli scioperi, testo dell'avviso sempre incluso. Promemoria alle 7:00 solo nei giorni variati.
- UID stabili e SEQUENCE che aumenta solo quando un evento cambia davvero.
- Pagina web: ricerca della scuola, menu di oggi, settimane navigabili, variazioni in evidenza, iscrizione al calendario.
- Calendari scolastici 2026-27 (regionale e dei nidi comunali), con Sant'Antonio e San Francesco.
- Workflow GitHub: PR da rivedere per i nuovi menu stagionali, issue per errori e variazioni incerte, pubblicazione su GitHub Pages.
- Test su fixture reali, snapshot dei feed e rilettura con un parser indipendente.

[Non ancora rilasciato]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.2.2...HEAD
[1.2.2]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/gbonanome/menu-scuole-padova/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/gbonanome/menu-scuole-padova/releases/tag/v1.0.0

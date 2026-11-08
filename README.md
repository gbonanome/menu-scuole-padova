# Menu Scuole Padova

Il menu delle mense scolastiche del Comune di Padova nel tuo calendario, con le variazioni aggiornate in automatico.

> **Progetto open source, non ufficiale.** Non ha alcun legame con Dussmann Service né con il Comune di Padova. Non usa loghi o marchi di terzi. **Fa sempre fede il menu ufficiale**: <https://www.scuoledussmann.it/padova>. Diete speciali e allergeni non sono inclusi.

## Cos'è

- Un **feed `.ics`** per ogni tipo di menu (nido, nido integrato, infanzia, primaria e secondaria, primaria Lambruschini; veicolato o cucina interna), da sottoscrivere in Google Calendar, Apple Calendar o Outlook.
- Quando esce una variazione, l'evento di quel giorno viene **modificato** nel feed.
- Una **pagina web** dove cerchi la tua scuola e vedi il menu a calendario.

## Come iscriversi

> Gli indirizzi dei feed e della pagina saranno qui dopo la pubblicazione (Fase 6).

Sul tempo di aggiornamento: i feed vengono rigenerati più volte al giorno, ma **sono i client a decidere quando rileggerli**. Apple Calendar di solito entro poche ore; Google Calendar può impiegare 24 ore o più; Outlook alcune ore.

## Come segnalare errori

Apri una issue: <https://github.com/gbonanome/menu-scuole-padova/issues>. Se una scuola è associata al menu sbagliato, indica nome della scuola e menu corretto.

## Per chi mantiene il progetto

- A ogni **cambio di stagione** il workflow apre una Pull Request con il menu estratto dal nuovo PDF: va rivista e approvata.
- A ogni **inizio d'anno** vanno aggiornati `data/calendario-scolastico-*.json` e, se serve, `data/scuole-padova.json`.
- Le date di inizio e fine di ogni menu sono quelle scritte nei PDF di Dussmann (l'inizio della mensa non coincide con l'inizio della scuola).

## Licenza

Codice sotto licenza [MIT](LICENSE). I contenuti dei menu appartengono ai rispettivi autori; il progetto ne riporta una rielaborazione con link alla fonte.

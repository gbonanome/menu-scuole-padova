// Mini mese: griglia lunedì–venerdì, stati dei giorni, limiti e mese da mostrare (funzioni pure di public/mese.js).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { impostaLingua, meseEAnno } from '../public/i18n.js';
import { dateNelTesto, grigliaMese, inizioScoperto, limitiMesi, lunediDi, meseDaMostrare, meseDi, spostaFeriale, spostaMese, statoGiorno, ultimaSettimana } from '../public/mese.js';

afterEach(() => impostaLingua('it'));

test('novembre 2026: inizia lunedì 2, finisce lunedì 30', () => {
  const righe = grigliaMese('2026-11');
  assert.equal(righe.length, 5);
  assert.deepEqual(righe[0], { lunedi: '2026-11-02', giorni: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'] });
  assert.deepEqual(righe[4], { lunedi: '2026-11-30', giorni: ['2026-11-30', null, null, null, null] });
  assert.equal(righe.flatMap((r) => r.giorni).filter(Boolean).length, 21);
});

test('febbraio: 2027 inizia di lunedì (4 righe piene), 2028 è bisestile', () => {
  const f27 = grigliaMese('2027-02');
  assert.equal(f27.length, 4);
  assert.equal(f27[0].giorni[0], '2027-02-01');
  assert.equal(f27[3].giorni[4], '2027-02-26');
  const f28 = grigliaMese('2028-02'); // martedì 1 – martedì 29
  assert.deepEqual(f28[0].giorni, [null, '2028-02-01', '2028-02-02', '2028-02-03', '2028-02-04']);
  assert.equal(f28[0].lunedi, '2028-01-31');
  assert.deepEqual(f28.at(-1).giorni, ['2028-02-28', '2028-02-29', null, null, null]);
});

test('mese che inizia di sabato: la prima riga è il lunedì 3, nessuna riga vuota', () => {
  const righe = grigliaMese('2026-08');
  assert.equal(righe[0].lunedi, '2026-08-03');
  assert.equal(righe[0].giorni[0], '2026-08-03');
  assert.deepEqual(righe.at(-1).giorni, ['2026-08-31', null, null, null, null]);
  // maggio 2027: sabato 1, finisce lunedì 31
  assert.equal(grigliaMese('2027-05')[0].lunedi, '2027-05-03');
  // gennaio 2027: venerdì 1, la prima riga ha solo il venerdì
  assert.deepEqual(grigliaMese('2027-01')[0].giorni, [null, null, null, null, '2027-01-01']);
});

test('stati dei giorni', () => {
  assert.equal(statoGiorno({ stato: 'menu', variazioni: [] }), 'menu');
  assert.equal(statoGiorno({ stato: 'menu' }), 'menu');
  assert.equal(statoGiorno({ stato: 'menu', variazioni: [{ testo: '…' }] }), 'variato');
  assert.equal(statoGiorno({ stato: 'chiuso', motivo: 'Immacolata' }), 'chiuso');
  assert.equal(statoGiorno({ stato: 'non-pubblicato' }), 'non-pubblicato');
  assert.equal(statoGiorno(undefined), null);
  assert.equal(statoGiorno({ stato: 'boh' }), null);
});

test('mesi: spostamento, limiti, mese da mostrare', () => {
  assert.equal(spostaMese('2026-12', 1), '2027-01');
  assert.equal(spostaMese('2027-01', -1), '2026-12');
  assert.equal(meseDi('2026-11-10'), '2026-11');
  assert.deepEqual(limitiMesi(['2026-09-14', '2027-06-08', '2026-11-27'], { dal: '2026-09-14', al: '2026-11-27' }), { primo: '2026-09', ultimo: '2027-06' });
  assert.deepEqual(limitiMesi([], { dal: '2026-09-01', al: '2026-12-22' }), { primo: '2026-09', ultimo: '2026-12' });
  assert.equal(limitiMesi([], null), null);
  // a cavallo di due mesi resta il mese mostrato; altrimenti quello di oggi o del lunedì
  assert.equal(meseDaMostrare('2026-12', '2026-11-30', '2026-11-10'), '2026-12');
  assert.equal(meseDaMostrare('2026-11', '2026-11-30', '2026-11-10'), '2026-11');
  assert.equal(meseDaMostrare(null, '2026-11-30', '2026-12-02'), '2026-12');
  assert.equal(meseDaMostrare(null, '2026-11-30', '2026-11-10'), '2026-11');
  assert.equal(meseDaMostrare('2027-01', '2026-11-09', '2026-11-10'), '2026-11');
});

// Dopo l'ultimo menu pubblicato il menu non è ancora uscito: da lì in poi un solo avviso e niente navigazione oltre.
const giorniDi = (voci) => new Map(voci.map(([data, stato]) => [data, { data, stato }]));

test('periodo scoperto: inizia al primo giorno di scuola senza menu dopo l\'ultimo menu pubblicato', () => {
  const giorni = giorniDi([
    ['2026-11-26', 'menu'],
    ['2026-11-27', 'menu'],
    ['2026-11-30', 'non-pubblicato'],
    ['2026-12-01', 'non-pubblicato'],
    ['2026-12-07', 'chiuso'],
    ['2026-12-09', 'non-pubblicato']
  ]);
  assert.equal(inizioScoperto(giorni, { dal: '2026-09-14', al: '2026-11-27' }), '2026-11-30');
  // chiusure subito dopo l'ultimo menu (vacanze): l'avviso parte dal primo giorno di scuola
  const natale = giorniDi([['2026-12-23', 'menu'], ['2026-12-24', 'chiuso'], ['2027-01-07', 'non-pubblicato']]);
  assert.equal(inizioScoperto(natale, { dal: '2026-12-01', al: '2026-12-23' }), '2027-01-07');
});

test('periodo scoperto: i buchi tra due menu già pubblicati non contano, e senza menu non c\'è avviso', () => {
  const buco = giorniDi([['2026-11-27', 'menu'], ['2026-11-30', 'non-pubblicato'], ['2026-12-01', 'menu'], ['2026-12-02', 'menu']]);
  assert.equal(inizioScoperto(buco, { dal: '2026-09-14', al: '2026-12-02' }), null);
  assert.equal(inizioScoperto(giorniDi([['2027-06-08', 'menu']]), { dal: '2026-09-14', al: '2027-06-08' }), null);
  assert.equal(inizioScoperto(giorniDi([['2026-11-30', 'non-pubblicato']]), null), null);
});

test('ultima settimana raggiungibile: quella dell\'avviso, o quella di oggi se è più avanti', () => {
  assert.equal(lunediDi('2026-11-28'), '2026-11-30'); // sabato: la settimana dopo
  assert.equal(lunediDi('2026-12-03'), '2026-11-30');
  assert.equal(ultimaSettimana('2026-11-30', '2026-11-25'), '2026-11-30');
  assert.equal(ultimaSettimana('2026-12-03', '2026-11-25'), '2026-11-30');
  assert.equal(ultimaSettimana('2027-03-15', '2027-04-14'), '2027-04-12');
  assert.equal(ultimaSettimana(null, '2026-11-25'), null);
  // il mese: non oltre quello dell'avviso (o di oggi)
  const date = ['2026-09-14', '2026-11-27', '2026-11-30', '2027-06-08'];
  assert.deepEqual(limitiMesi(date, { dal: '2026-09-14', al: '2026-11-27' }, '2026-11-30'), { primo: '2026-09', ultimo: '2026-11' });
  assert.deepEqual(limitiMesi(date, { dal: '2026-09-14', al: '2026-11-27' }, '2027-04-14'), { primo: '2026-09', ultimo: '2027-04' });
  assert.deepEqual(limitiMesi(date, { dal: '2026-09-14', al: '2026-11-27' }, null), { primo: '2026-09', ultimo: '2027-06' });
});

test('frecce tra i giorni feriali', () => {
  assert.equal(spostaFeriale('2026-11-13', 1), '2026-11-16');
  assert.equal(spostaFeriale('2026-11-16', -1), '2026-11-13');
  assert.equal(spostaFeriale('2026-11-10', 5), '2026-11-17');
  assert.equal(spostaFeriale('2026-11-02', -5), '2026-10-26');
});

test('titolo del mese: italiano dalle tabelle, inglese da Intl', () => {
  assert.equal(meseEAnno('2026-11-01'), 'novembre 2026');
  impostaLingua('en', {});
  assert.equal(meseEAnno('2026-11-01'), 'November 2026');
});

test('date negli avvisi: con anno, senza anno, col nome del mese, "lunedì 7"; i numeri da soli no', () => {
  const trova = (testo, pubblicata) => dateNelTesto(testo, pubblicata).map((x) => [testo.slice(x.inizio, x.fine), x.data]);
  assert.deepEqual(trova('l’inversione del secondo piatto tra mercoledì 25/11/2026 e mercoledì 02/12/2026.', '2026-11-18'), [
    ['mercoledì 25/11/2026', '2026-11-25'],
    ['mercoledì 02/12/2026', '2026-12-02']
  ]);
  assert.deepEqual(trova('- mercoledì 9 verrà somministrato il menù di lunedì 7 (3° settimana invernale), giovedì invariato', '2026-11-17'), [
    ['mercoledì 9', '2026-12-09'],
    ['lunedì 7', '2026-12-07']
  ]);
  assert.deepEqual(trova('domani 10/11, il 5 e 17 novembre, frutta 100%, 20.11.26', '2026-11-09'), [
    ['10/11', '2026-11-10'],
    ['17 novembre', '2026-11-17'],
    ['20.11.26', '2026-11-20']
  ]);
  // pubblicata a dicembre, "12 gennaio" è dell'anno dopo
  assert.deepEqual(trova('lunedì 12 gennaio', '2026-12-18'), [['lunedì 12 gennaio', '2027-01-12']]);
  assert.deepEqual(trova('31/02 e 45/11', '2026-11-18'), []);
});

// Mini mese: griglia lunedì–venerdì, stati dei giorni, limiti e mese da mostrare (funzioni pure di public/mese.js).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { impostaLingua, meseEAnno } from '../public/i18n.js';
import { grigliaMese, limitiMesi, meseDaMostrare, meseDi, spostaFeriale, spostaMese, statoGiorno } from '../public/mese.js';

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

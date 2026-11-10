// Traduzioni della pagina: l'italiano deve restare identico a prima, le chiavi devono tornare.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  IT,
  LINGUE,
  PREFISSO_DATI,
  dataConAnno,
  dataLunga,
  dataLungaConAnno,
  etichettaSettimana,
  giornoBreve,
  giornoEMese,
  giornoENumero,
  impostaLingua,
  linguaIniziale,
  linkTraduzione,
  meseEAnno,
  nomeGiorno,
  nomeMese,
  numeroGiorno,
  piatto,
  t,
  tDato,
  testoCambioStagione,
  testoCiclo,
  testoGiornoVuoto,
  testoOggi
} from '../public/i18n.js';
import { FEED_INFO } from '../src/model.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leggi = (p) => readFileSync(path.join(RADICE, p), 'utf8');
const APP = leggi('public/app.js');
const I18N = leggi('public/i18n.js');
const MESE = leggi('public/mese.js');
const HTML = leggi('public/index.html');
const EN = JSON.parse(leggi('public/lingue/en.json'));

afterEach(() => impostaLingua('it'));

test('date in italiano come prima', () => {
  assert.equal(dataLunga('2026-11-08'), 'domenica 8 novembre');
  assert.equal(dataLunga('2026-11-09'), 'lunedì 9 novembre');
  assert.equal(dataLungaConAnno('2026-11-10'), 'martedì 10 novembre 2026');
  assert.equal(giornoEMese('2026-11-06'), '6 novembre');
  assert.equal(dataConAnno('2026-11-10'), '10 novembre 2026');
  assert.equal(giornoENumero('2026-11-10'), 'martedì 10');
  assert.equal(numeroGiorno('2026-11-09'), '9');
  const settimana = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'];
  assert.deepEqual(settimana.map(giornoBreve), ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']);
  assert.equal(nomeMese('2027-01-04'), 'gennaio');
  assert.equal(meseEAnno('2026-11-10'), 'novembre 2026');
});

test('settimana: stesso mese, due mesi, due anni', () => {
  assert.equal(etichettaSettimana('2026-11-09'), '9–13 novembre');
  assert.equal(etichettaSettimana('2026-11-30'), '30 novembre – 4 dicembre');
  assert.equal(etichettaSettimana('2026-12-28'), '28 dicembre – 1 gennaio');
});

test('Intl in italiano dà gli stessi nomi delle tabelle (ma non le stesse composizioni)', () => {
  // Le tabelle restano per l'italiano: formatRange scrive "09–13 novembre", e non tutti i dispositivi hanno i dati ICU.
  for (let i = 0; i < 7; i++) {
    const s = `2026-11-${String(8 + i).padStart(2, '0')}`;
    const d = new Date(2026, 10, 8 + i);
    assert.equal(nomeGiorno(s), new Intl.DateTimeFormat('it', { weekday: 'long' }).format(d));
    assert.equal(giornoBreve(s), new Intl.DateTimeFormat('it', { weekday: 'short' }).format(d));
  }
  for (let m = 0; m < 12; m++) {
    const s = `2026-${String(m + 1).padStart(2, '0')}-01`;
    assert.equal(nomeMese(s), new Intl.DateTimeFormat('it', { month: 'long' }).format(new Date(2026, m, 1)));
  }
});

test('testi di chiusura e giorni senza menu come prima', () => {
  const chiuso = { stato: 'chiuso', motivo: 'Immacolata Concezione' };
  assert.equal(testoOggi({ data: '2026-12-08', giorno: chiuso, nido: false, dal: '2026-09-01' }), 'Oggi, martedì 8 dicembre: scuola chiusa (Immacolata Concezione).');
  assert.equal(testoOggi({ data: '2026-12-08', giorno: chiuso, nido: true }), 'Oggi, martedì 8 dicembre: nido chiuso (Immacolata Concezione).');
  assert.equal(testoOggi({ data: '2026-11-30', giorno: { stato: 'non-pubblicato' }, nido: true }), 'Oggi, lunedì 30 novembre: menu non ancora pubblicato.');
  assert.equal(testoOggi({ data: '2026-09-02', nido: false, dal: '2026-09-14' }), 'Oggi, mercoledì 2 settembre: la mensa non è ancora iniziata.');
  assert.equal(testoOggi({ data: '2026-11-08', nido: false, dal: '2026-09-14' }), 'Oggi, domenica 8 novembre: niente mensa.');
  assert.equal(testoOggi({ data: '2026-11-08', nido: false }), 'Oggi, domenica 8 novembre: niente mensa.');

  assert.equal(testoGiornoVuoto({ data: '2026-12-07', giorno: { stato: 'chiuso', motivo: 'Ponte dell\'Immacolata' }, nido: false }), 'Scuola chiusa · Ponte dell\'Immacolata');
  assert.equal(testoGiornoVuoto({ data: '2026-12-07', giorno: { stato: 'chiuso', motivo: 'Chiusura' }, nido: true }), 'Nido chiuso · Chiusura');
  assert.equal(testoGiornoVuoto({ data: '2026-12-09', giorno: { stato: 'non-pubblicato' }, nido: false }), 'Menu non ancora pubblicato');
  assert.equal(testoGiornoVuoto({ data: '2026-09-02', nido: false, dal: '2026-09-14' }), 'Mensa non ancora iniziata');
  assert.equal(testoGiornoVuoto({ data: '2026-11-08', nido: false, dal: '2026-09-14' }), 'Nessun menu');

  assert.equal(testoCiclo({ stagione: 'autunnale', settimana: 3, settimane: 4 }), 'Menu autunnale · settimana 3 di 4');
  assert.equal(testoCiclo({ stagione: 'boh', settimana: 1, settimane: 5 }), 'Menu · settimana 1 di 5');
  assert.equal(testoCambioStagione({ stagione: 'invernale' }), 'Da qui: Menu invernale');
  assert.equal(testoCambioStagione({ stagione: 'boh' }), 'Da qui: boh');
});

/** Chiavi usate nel codice: t('…') in app.js, i18n.js e mese.js, data-t* in index.html. */
function chiaviUsate() {
  const usate = new Set();
  for (const js of [APP, I18N, MESE]) for (const m of js.matchAll(/\bt\(\s*(?:[^'()]*\?\s*)?'([^']+)'(?:\s*:\s*'([^']+)')?/g)) for (const k of m.slice(1)) if (k) usate.add(k);
  for (const m of HTML.matchAll(/\sdata-t(?:-[a-z-]+)?="([^"]+)"/g)) if (!m[0].startsWith(' data-t-valori')) usate.add(m[1]);
  return usate;
}

test('ogni chiave usata esiste in italiano, e ogni chiave italiana è usata', () => {
  const usate = chiaviUsate();
  assert.ok(usate.size > 50, `poche chiavi trovate: ${usate.size}`);
  for (const k of usate) assert.ok(k in IT, `chiave senza testo italiano: ${k}`);
  for (const k of Object.keys(IT)) assert.ok(usate.has(k), `chiave italiana mai usata: ${k}`);
});

const senzaTag = (s) => s.replace(/<\/?(?:em|a)\b[^>]*>/g, '');
const tag = (s) => [...s.matchAll(/<(\/?(?:em|a))\b[^>]*>/g)].map((m) => m[1]).join(',');
const spazi = (s) => s.replace(/\s+/g, ' ').trim();

test('index.html: il testo italiano nel markup coincide con il dizionario', () => {
  let controllati = 0;
  for (const m of HTML.matchAll(/<(\w+)(\s[^>]*?)?>/g)) {
    const attr = Object.fromEntries([...(m[2] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const valori = attr['data-t-valori']?.split('|') ?? [];
    for (const [nome, chiave] of Object.entries(attr)) {
      if (!nome.startsWith('data-t') || nome === 'data-t-valori') continue;
      const atteso = t(chiave, ...valori);
      if (nome === 'data-t') {
        const fine = HTML.indexOf(`</${m[1]}>`, m.index);
        const interno = HTML.slice(m.index + m[0].length, fine);
        assert.equal(spazi(senzaTag(interno)), senzaTag(atteso), chiave);
        assert.equal(tag(interno), tag(atteso), `${chiave}: elementi interni diversi`);
      } else {
        const bersaglio = nome.slice('data-t-'.length);
        assert.equal(attr[bersaglio], atteso, `${chiave} (${bersaglio})`);
      }
      controllati++;
    }
  }
  assert.ok(controllati > 30, `pochi testi controllati: ${controllati}`);
});

/** Chiavi facoltative dei dati ammesse nei file delle lingue. */
function chiaviDati() {
  const scuole = JSON.parse(leggi('data/scuole-padova.json'));
  const k = new Set();
  for (const o of new Set(scuole.scuole.map((s) => s.ordine))) k.add(`${PREFISSO_DATI}ordine.${o}`);
  for (const slug of Object.keys(FEED_INFO)) {
    k.add(`${PREFISSO_DATI}feed.${slug}`);
    k.add(`${PREFISSO_DATI}feed.${slug}.breve`);
  }
  return k;
}

test('en.json: completo, nessuna chiave sconosciuta, stessi segnaposto ed elementi', () => {
  const dati = chiaviDati();
  for (const [k, v] of Object.entries(EN)) {
    assert.equal(typeof v, 'string', k);
    assert.ok(k in IT || dati.has(k), `chiave sconosciuta in en.json: ${k}`);
    if (!(k in IT)) continue;
    const segnaposto = (s) => [...s.matchAll(/\{\d+\}/g)].map((x) => x[0]).sort().join();
    assert.equal(segnaposto(v), segnaposto(IT[k]), `${k}: segnaposto diversi`);
    assert.equal(tag(v), tag(IT[k]), `${k}: elementi <em>/<a> diversi`);
  }
  for (const k of Object.keys(IT)) assert.ok(k in EN, `manca in en.json: ${k}`);
});

test('lingua scelta: testi, piatti e dati con ritorno all\'italiano', () => {
  impostaLingua('en', { oppure: 'or', ciclo: '{0} · week {1} of {2}', 'stagione.autunnale': 'Autumn menu', 'dati.ordine.primaria': 'primary' }, { 'Pane': 'Bread' });
  assert.equal(t('oppure'), 'or');
  assert.equal(t('variato'), 'variato'); // manca: italiano
  assert.equal(testoCiclo({ stagione: 'autunnale', settimana: 3, settimane: 4 }), 'Autumn menu · week 3 of 4');
  assert.equal(piatto('Pane'), 'Bread');
  assert.equal(piatto('Frutta fresca'), 'Frutta fresca');
  assert.equal(tDato('ordine.primaria', 'primaria'), 'primary');
  assert.equal(tDato('ordine.infanzia', 'infanzia'), 'infanzia');
  assert.match(dataLunga('2026-11-09'), /November/);
  impostaLingua('it', { oppure: 'or' }, { Pane: 'Bread' });
  assert.equal(t('oppure'), 'oppure');
  assert.equal(piatto('Pane'), 'Pane');
  assert.equal(tDato('ordine.primaria', 'primaria'), 'primaria');
  impostaLingua('xx', { oppure: 'or' });
  assert.equal(t('oppure'), 'oppure');
});

test('lingua iniziale: salvata › indirizzo › italiano', () => {
  assert.equal(linguaIniziale(null, null), 'it');
  assert.equal(linguaIniziale(null, 'en'), 'en');
  assert.equal(linguaIniziale('ro', 'en'), 'ro');
  assert.equal(linguaIniziale('it', 'en'), 'it');
  assert.equal(linguaIniziale('xx', 'en'), 'en');
  assert.equal(linguaIniziale(null, 'EN'), 'it');
  assert.deepEqual(LINGUE, ['it', 'en', 'ro', 'zh', 'bn', 'sq', 'ar', 'ur']);
});

test('link a Google Traduttore: zh-CN e testo troncato', () => {
  assert.equal(linkTraduzione('Pasta al ragù', 'en'), 'https://translate.google.com/?sl=it&tl=en&text=Pasta%20al%20rag%C3%B9&op=translate');
  assert.match(linkTraduzione('ciao', 'zh'), /tl=zh-CN&/);
  const lungo = linkTraduzione('a'.repeat(5000), 'en');
  const testo = decodeURIComponent(new URL(lungo).searchParams.get('text'));
  assert.equal(testo.length, 1801);
  assert.ok(testo.endsWith('…'));
});

// Contratto tra build e pagina (src/contratto.js): un dato valido passa, ogni violazione viene nominata.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verificaContratto } from '../src/contratto.js';

/** Dati minimi validi: un feed con un giorno per stato, una variazione, una scuola. */
function validi() {
  const giorni = [
    {
      data: '2026-11-09',
      stato: 'menu',
      settimana: 2,
      settimane: 4,
      stagione: 'autunnale',
      piatti: ['Pasta al pomodoro', 'Frutta'],
      originali: ['Pasta al pesto', 'Frutta'],
      variazioni: [{ id: 'post_1', pubblicata: '2026-11-06', testo: 'Lunedì 9 la pasta sarà al pomodoro.' }]
    },
    { data: '2026-11-10', stato: 'chiuso', motivo: 'Festa del patrono' },
    { data: '2026-11-11', stato: 'non-pubblicato' }
  ];
  return {
    meta: { generato: '2026-11-08T12:00:00Z' },
    feeds: [{ slug: 'nido-veicolato', nome: 'Nido veicolato', breve: 'Nido veicolato', ordine: 'nido', ics: 'feed/nido-veicolato.ics', copertura: { dal: '2026-11-09', al: '2026-11-09' } }],
    scuole: [{ nome: 'Il Trenino', ordine: 'nido', feed: 'nido-veicolato', ic: 'IC 1' }],
    giorni: new Map([['nido-veicolato', { giorni, copertura: { dal: '2026-11-09', al: '2026-11-09' } }]])
  };
}
const giornoDi = (d, data) => d.giorni.get('nido-veicolato').giorni.find((g) => g.data === data);

/** Applica `cambia` ai dati validi e controlla che ci sia esattamente una violazione che contiene `atteso`. */
function violazione(cambia, atteso) {
  const d = validi();
  cambia(d);
  const errori = verificaContratto(d);
  assert.equal(errori.length, 1, `attesa una violazione, trovate: ${JSON.stringify(errori, null, 1)}`);
  assert.match(errori[0], atteso);
}

test('contratto: i dati validi passano', () => {
  assert.deepEqual(verificaContratto(validi()), []);
});

test('contratto: i campi facoltativi possono mancare', () => {
  const d = validi();
  delete d.scuole[0].ic;
  const g = giornoDi(d, '2026-11-09');
  delete g.originali;
  g.variazioni = [];
  d.feeds.push({ ...d.feeds[0], slug: 'nido-cucina-interna', ics: 'feed/nido-cucina-interna.ics', copertura: null });
  d.giorni.set('nido-cucina-interna', { giorni: [], copertura: null });
  assert.deepEqual(verificaContratto(d), []);
});

test('contratto: giorni', () => {
  violazione((d) => delete giornoDi(d, '2026-11-10').motivo, /2026-11-10: giorno chiuso senza motivo \(trovato undefined\)/);
  violazione((d) => (giornoDi(d, '2026-11-10').motivo = null), /giorno chiuso senza motivo \(trovato null\)/);
  violazione((d) => (giornoDi(d, '2026-11-11').stato = 'sospeso'), /stato deve essere uno tra menu, chiuso, non-pubblicato \(trovato "sospeso"\)/);
  violazione((d) => (giornoDi(d, '2026-11-09').stagione = ''), /stagione mancante/);
  violazione((d) => delete giornoDi(d, '2026-11-09').settimane, /settimana e settimane/);
  violazione((d) => (giornoDi(d, '2026-11-09').settimana = 5), /1 ≤ settimana ≤ settimane/);
  violazione((d) => (giornoDi(d, '2026-11-09').piatti = []), /piatti deve essere un elenco non vuoto/);
  violazione((d) => (giornoDi(d, '2026-11-09').piatti = ['Pasta', null]), /piatti deve essere un elenco non vuoto di testi/);
  violazione((d) => (giornoDi(d, '2026-11-09').originali = ['Pasta al pesto']), /originali e piatti di lunghezza diversa/);
  violazione((d) => delete giornoDi(d, '2026-11-09').variazioni, /variazioni deve essere un elenco/);
  violazione((d) => (giornoDi(d, '2026-11-10').data = '2026-11-31'), /data non valida/);
  violazione((d) => (giornoDi(d, '2026-11-10').data = '2026-11-09'), /date non in ordine o ripetute/);
});

test('contratto: con menu sostitutivo originali e piatti possono avere lunghezze diverse', () => {
  const d = validi();
  Object.assign(giornoDi(d, '2026-11-09'), { menuSostituito: true, originali: ['Pasta al pesto', 'Pollo', 'Frutta'] });
  assert.deepEqual(verificaContratto(d), []);
});

test('contratto: variazioni', () => {
  violazione((d) => delete giornoDi(d, '2026-11-09').variazioni[0].pubblicata, /variazione post_1: pubblicata non è una data/);
  violazione((d) => (giornoDi(d, '2026-11-09').variazioni[0].pubblicata = '6 novembre'), /pubblicata non è una data/);
  violazione((d) => (giornoDi(d, '2026-11-09').variazioni[0].testo = '  '), /testo dell'avviso mancante/);
});

test('contratto: feeds.json', () => {
  violazione((d) => delete d.meta.generato, /feeds\.json: generato/);
  violazione((d) => (d.meta.generato = 'ieri'), /feeds\.json: generato/);
  violazione((d) => delete d.feeds[0].ics, /feed nido-veicolato: ics mancante/);
  violazione((d) => (d.feeds[0].breve = null), /breve mancante/);
  violazione((d) => (d.feeds[0].copertura = { dal: '2026-11-09' }), /copertura deve essere null o/);
  violazione((d) => d.giorni.delete('nido-veicolato'), /manca data\/nido-veicolato\.json/);
  violazione((d) => (d.giorni.get('nido-veicolato').copertura = null), /ha giorni con il menu ma copertura null/);
  violazione((d) => d.feeds.push({ ...d.feeds[0] }), /slug ripetuto/);
});

test('contratto: scuole.json', () => {
  violazione((d) => (d.scuole[0].feed = 'nido-inesistente'), /"Il Trenino": feed che non esiste in feeds\.json/);
  violazione((d) => delete d.scuole[0].ordine, /ordine mancante/);
  violazione((d) => (d.scuole[0].avviso = ''), /avviso, se c'è, non può essere vuoto/);
  violazione((d) => (d.scuole = []), /scuole\.json: deve essere un elenco non vuoto/);
});

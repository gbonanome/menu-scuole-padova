import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { escapeTesto, piegaRiga, costruisciIcs, titoloEvento } from '../src/build-ics.js';
import { costruisciModello, piattiPerTitolo } from '../src/model.js';
import { caricaCalendario, statoGiorno } from '../src/lib/calendario.js';
import { caricaMenus } from '../src/lib/applica.js';

const cal = caricaCalendario('2026-27');
const modello = async () => {
  const menus = await caricaMenus(new URL('../data/menus', import.meta.url).pathname, '2026-27');
  const variazioni = JSON.parse(await readFile(new URL('../data/variations.json', import.meta.url), 'utf8'));
  return costruisciModello({ menus, variazioni, cal }).feeds;
};

test('escape dei valori TEXT', () => {
  assert.equal(escapeTesto('a,b;c\\d\ne'), 'a\\,b\\;c\\\\d\\ne');
});

test('piegatura a 75 ottetti senza spezzare caratteri multibyte', () => {
  const riga = `SUMMARY:${'🍽 Crema di verdura con risoni · Polpettone all’olio · '.repeat(4)}`;
  const piegata = piegaRiga(riga);
  for (const r of piegata.split('\r\n')) assert.ok(Buffer.byteLength(r, 'utf8') <= 75, r);
  assert.equal(piegata.replace(/\r\n /g, ''), riga);
});

test('titolo: salta pane, frutta e verdura generica', () => {
  assert.deepEqual(piattiPerTitolo(['Verdura cruda', 'Mezze penne al ragù', 'Verdura cotta', 'oppure', 'Crema']), ['Mezze penne al ragù']);
});

test('calendario dei nidi: inizio e chiusure del Comune', () => {
  assert.equal(statoGiorno(cal, 'nido-veicolato', '2026-12-07').scuola, false);
  assert.equal(statoGiorno(cal, 'nido-cucina-interna', '2027-06-30').scuola, true);
  assert.equal(statoGiorno(cal, 'primaria-secondaria-veicolato', '2027-06-09').scuola, false);
});

test('modello: variazioni reali applicate ai feed giusti', async () => {
  const feeds = await modello();
  const giorno = (f, d) => feeds.get(f).giorni.find((g) => g.data === d);
  // 10/11: piatto sostituito, con l'originale conservato
  const g10 = giorno('primaria-secondaria-veicolato', '2026-11-10');
  assert.equal(g10.piatti[0], 'Crema di ceci bio');
  assert.match(g10.originali[0], /lenticchie rosse/);
  // 04/11: lo yogurt c'è solo nel menu delle primarie -> la variazione non tocca l'infanzia
  assert.equal(giorno('primaria-secondaria-veicolato', '2026-11-04').variazioni.length, 1);
  assert.equal(giorno('infanzia-veicolato', '2026-11-04').variazioni.length, 0);
  // 20/11 (sciopero): menu sostitutivo per primarie e infanzie, nido "invariato"
  const g20 = giorno('primaria-secondaria-veicolato', '2026-11-20');
  assert.ok(g20.menuSostituito);
  assert.deepEqual(g20.piatti, ['Pasta al pomodoro', 'Tonno all’olio', 'Fagiolini all’olio', 'Cracker', 'Frullato']);
  assert.equal(giorno('nido-veicolato', '2026-11-20').variazioni.length, 0);
  // chiusure con il loro nome
  assert.deepEqual(giorno('nido-cucina-interna', '2026-12-28'), { data: '2026-12-28', stato: 'chiuso', motivo: 'Vacanze di Natale' });
});

test('ics: UID stabile, SEQUENCE che aumenta solo se cambia il contenuto', async () => {
  const feeds = await modello();
  const giorni = feeds.get('primaria-secondaria-veicolato').giorni;
  const stato = {};
  const a = costruisciIcs('primaria-secondaria-veicolato', giorni, stato, { ora: '2026-11-08T10:00:00Z' });
  const b = costruisciIcs('primaria-secondaria-veicolato', giorni, stato, { ora: '2026-11-08T16:00:00Z' });
  assert.equal(a, b, 'senza cambiamenti l’output è identico');
  assert.ok(!/\r?\n(?<!\r\n)/.test(a.replace(/\r\n/g, '')), 'solo CRLF');
  const uid = 'primaria-secondaria-veicolato-20261119@gbonanome.github.io';
  const modificati = giorni.map((g) => (g.data === '2026-11-19' ? { ...g, piatti: ['Pizza', ...g.piatti.slice(1)], variazioni: [{ id: 'x', titolo: 'VARIAZIONE', pubblicata: '2026-11-18', testo: 'Pizza al posto della minestra', ambito: 'confermato' }] } : g));
  const c = costruisciIcs('primaria-secondaria-veicolato', modificati, stato, { ora: '2026-11-18T12:00:00Z' });
  const ev = c.replace(/\r\n /g, '').split('BEGIN:VEVENT').find((e) => e.includes(uid));
  assert.match(ev, /SEQUENCE:1/);
  assert.match(ev, /LAST-MODIFIED:20261118T120000Z/);
  assert.match(ev, /SUMMARY:⚠️ VARIATO · Pizza/);
  assert.equal((c.match(new RegExp(uid, 'g')) ?? []).length, 1);
  assert.ok(!c.includes('20261208@'), 'nessun evento nei giorni di festa');
});

test('titoloEvento', () => {
  assert.equal(titoloEvento({ piatti: ['Spaghetti al pomodoro', 'Caciotta', 'Pane'], variazioni: [] }), '🍽 Spaghetti al pomodoro · Caciotta');
});

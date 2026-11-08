import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMenuPdf, righeInPiatti, eccezioniDaNota, parseValidita } from '../src/parse-menu.js';
import { validaMenu } from '../src/validate.js';
import { caricaCalendario } from '../src/lib/calendario.js';
import { giorniDaIntervalli, giorniDaRegola } from '../src/lib/expand.js';
import { estraiDate, estraiSostituzioni, parseVariazione } from '../src/parse-variation.js';
import { estraiLinkPdf, estraiNotizie } from '../src/scrape.js';

const pdf = (n) => readFile(new URL(`../fixtures/pdf/${n}`, import.meta.url));
const cal = caricaCalendario();

test('righeInPiatti ricompone i nomi andati a capo e le alternative', () => {
  assert.deepEqual(righeInPiatti(['Filettini di merluzzo panati con fettina di', 'limone', 'Pane']), ['Filettini di merluzzo panati con fettina di limone', 'Pane']);
  assert.deepEqual(righeInPiatti(['Pizza', 'Oppure', 'Crema di ceci']), ['Pizza', 'oppure', 'Crema di ceci']);
});

test('eccezioniDaNota: formati diversi', () => {
  assert.deepEqual(eccezioniDaNota('Polpettone 29.10.2026. Polpette 26.11.2026.').map((e) => [e.data, e.piatto]), [['2026-10-29', 'Polpettone'], ['2026-11-26', 'Polpette']]);
  assert.deepEqual(eccezioniDaNota('Polpettone: 29.10.26 – polpette 26.11.2026').map((e) => e.piatto), ['Polpettone', 'Polpette']);
  assert.deepEqual(eccezioniDaNota('08.01.26 e 09.01.26: crema di cavolfiori; 05.02.26: crema di porri').map((e) => [e.data, e.piatto]), [['2026-01-08', 'Crema di cavolfiori'], ['2026-01-09', 'Crema di cavolfiori'], ['2026-02-05', 'Crema di porri']]);
});

test('parseValidita: periodi multipli e rientro', () => {
  const r = parseValidita('In vigore dal 01.09.2026 al 09.10.2026 con inizio da martedì della 1° settimana e dal 15.03.2027 al 30.06.2027 con inizio da lunedì della 3° settimana');
  assert.equal(r.validita.length, 2);
  assert.deepEqual(r.validita[1], { dal: '2027-03-15', al: '2027-06-30', giorno: 'lun', settimana: 3 });
  const w = parseValidita('In vigore dal 12.10.2026 al 12.03.2027 con partenza dal lunedì della 3° settimana. Rientro dalle festività natalizie 07.01.2027 con ripartenza dal giovedì della 1° settimana.');
  assert.deepEqual(w.riavvii, [{ data: '2027-01-07', giorno: 'gio', settimana: 1 }]);
});

test('primaria veicolato autunnale: griglia, date e nota', async () => {
  const m = await parseMenuPdf(await pdf('03-menu-autunnale-prim-second-veicolato-2026-27-4204670.pdf'));
  assert.equal(m.feed, 'primaria-secondaria-veicolato');
  assert.equal(m.stagione, 'autunnale');
  assert.equal(m.annoScolastico, '2026-27');
  assert.equal(Object.keys(m.settimane).length, 4);
  assert.deepEqual(m.settimane['1'].lun, ['Spaghetti al pomodoro', 'Caciotta', 'Bieta all’olio', 'Pane', 'Frutta fresca']);
  assert.ok(m.settimane['1'].gio[1].endsWith('¹'));
  assert.equal(m.intervalli.length, 7);
  assert.deepEqual(validaMenu(m, cal).errori, []);
});

test('veicolato: date della tabella e regola in testata concordano', async () => {
  const m = await parseMenuPdf(await pdf('03-menu-autunnale-prim-second-veicolato-2026-27-4204670.pdf'));
  const tab = giorniDaIntervalli(m);
  const reg = giorniDaRegola(m);
  assert.equal(tab.get('2026-10-12'), 3);
  assert.equal(tab.get('2026-10-26'), 1);
  for (const [d, w] of tab) assert.equal(reg.get(d), w, d);
});

test('cucina interna: giorni dedotti dalla regola, con ripartenza dopo Natale', async () => {
  const m = await parseMenuPdf(await pdf('menu-asilo-nido-cucina-interna-2026-27-invernale-8012642.pdf'));
  const g = giorniDaRegola(m);
  assert.equal(g.get('2026-10-12'), 3);
  assert.equal(g.get('2027-01-07'), 1);
  assert.equal(g.get('2027-01-08'), 1);
  assert.equal(g.get('2027-01-11'), 2);
  assert.deepEqual(validaMenu(m, cal).errori, []);
});

test('tutti i PDF 2026-27 in fixtures passano la validazione', async () => {
  const { readdir } = await import('node:fs/promises');
  const nomi = (await readdir(new URL('../fixtures/pdf/', import.meta.url))).filter((n) => /2026-27|^ok|^0\d-/.test(n));
  assert.ok(nomi.length >= 14);
  for (const n of nomi) {
    const m = await parseMenuPdf(await pdf(n));
    assert.deepEqual(validaMenu(m, cal).errori, [], n);
  }
});

test('estraiDate: formati e "domani"', () => {
  assert.deepEqual(estraiDate('5 e 17 novembre', '2026-10-30'), ['2026-11-05', '2026-11-17']);
  assert.deepEqual(estraiDate('05/10, 06/10 e 09/10', '2026-09-29'), ['2026-10-05', '2026-10-06', '2026-10-09']);
  assert.deepEqual(estraiDate('Domani al posto del frullato', '2026-10-21'), ['2026-10-22']);
  assert.deepEqual(estraiDate('recupero del pane del 16/09/2026; il 7 ottobre', '2026-09-28'), ['2026-10-07']);
});

test('estraiSostituzioni: solo pattern chiari', () => {
  assert.deepEqual(estraiSostituzioni('verrà servita crema di ceci bio al posto della crema di lenticchie rosse decorticate bio.'), [{ da: 'crema di lenticchie rosse decorticate bio', a: 'crema di ceci bio' }]);
  assert.deepEqual(estraiSostituzioni('verrà servito come contorno carote julienne e mais (invece di radicchio variegato bio e mais).'), [{ da: 'radicchio variegato bio e mais', a: 'carote julienne e mais' }]);
  assert.deepEqual(estraiSostituzioni('i pomodori verranno sostituiti rispettivamente con cappuccio e carote'), []);
});

test('variazione per ordine di scuola (sciopero 20/11)', async () => {
  const testo = (await readFile(new URL('../fixtures/notizie/post_78825.html', import.meta.url), 'utf8'));
  const { htmlInTesto } = await import('../src/lib/html.js');
  const corpo = testo.slice(testo.indexOf('</h2>') + 5).replace(/<div class="contimgnews">[\s\S]*$/, '');
  const v = parseVariazione({ id: 'post_78825', titolo: "VARIAZIONE MENU' 20/11", pubblicata: '2026-11-06', testo: htmlInTesto(corpo) });
  assert.deepEqual(v.date, ['2026-11-20']);
  assert.deepEqual(v.parti.map((p) => p.feed), [['nido-veicolato'], ['infanzia-veicolato'], ['primaria-secondaria-veicolato', 'primaria-lambruschini']]);
});

test('scrape: link PDF e notizie dalla pagina reale salvata', async () => {
  const html = await readFile(new URL('../fixtures/padova.html', import.meta.url), 'utf8');
  const link = estraiLinkPdf(html);
  assert.ok(link.length >= 20);
  assert.ok(link.every((l) => l.url.startsWith('https://www.scuoledussmann.it/upload/editorpagine/') && !/modul/i.test(l.url)));
  const n = estraiNotizie(html);
  assert.deepEqual(n.map((x) => x.id), ['post_78825', 'post_52042', 'post_27615']);
  assert.equal(n[0].pubblicata, '2026-11-06');
});

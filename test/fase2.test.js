import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMenuPdf, righeInPiatti, eccezioniDaNota, parseValidita } from '../src/parse-menu.js';
import { validaMenu } from '../src/validate.js';
import { caricaCalendario } from '../src/lib/calendario.js';
import { giorniDaIntervalli, giorniDaRegola } from '../src/lib/expand.js';
import { estraiDate, estraiScambio, estraiSostituzioni, estraiSostituzioniGiorno, parseVariazione } from '../src/parse-variation.js';
import { estraiLinkPdf, estraiNotizie } from '../src/scrape.js';

const pdf = (n) => readFile(new URL(`../fixtures/pdf/${n}`, import.meta.url));
const cal = caricaCalendario();

test('righeInPiatti ricompone i nomi andati a capo e le alternative', () => {
  assert.deepEqual(righeInPiatti(['Filettini di merluzzo panati con fettina di', 'limone', 'Pane']), ['Filettini di merluzzo panati con fettina di limone', 'Pane']);
  assert.deepEqual(righeInPiatti(['Pizza', 'Oppure', 'Crema di ceci']), ['Pizza', 'oppure', 'Crema di ceci']);
});

test('righeInPiatti: il rimando alla nota resta in fondo al piatto anche se nel PDF sta a metà', () => {
  assert.deepEqual(righeInPiatti(['Crema di verdura (cavolfiori o porri)¹', 'con risoni', 'Pane']), ['Crema di verdura (cavolfiori o porri) con risoni¹', 'Pane']);
  assert.deepEqual(righeInPiatti(['Polpettone/Polpette di pollo e tacchino¹', 'in umido']), ['Polpettone/Polpette di pollo e tacchino in umido¹']);
});

test('eccezioniDaNota: coppie di date e piatti unite da "+"', () => {
  const nota = 'Creme e riso alternati secondo rotazione. 23.12.26: Crema di porri. 08.01.27: Riso al cavolfiore. 03.02.27 + 05.02.27: crema al cavolfiore + riso ai piselli. 03.03.27 + 05.03.27: crema di porri + riso al cavolfiore';
  assert.deepEqual(eccezioniDaNota(nota).map((e) => [e.data, e.piatto]), [
    ['2026-12-23', 'Crema di porri'],
    ['2027-01-08', 'Riso al cavolfiore'],
    ['2027-02-03', 'Crema al cavolfiore'],
    ['2027-02-05', 'Riso ai piselli'],
    ['2027-03-03', 'Crema di porri'],
    ['2027-03-05', 'Riso al cavolfiore']
  ]);
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

// I veicolati invernali 2026-27 sono usciti da una stampante virtuale: pagina ruotata di 90° (/Rotate),
// numeri delle note in una casella a parte e rimandi scritti "(1)" in piccolo.
test('PDF con la pagina ruotata: primaria veicolato invernale', async () => {
  const m = await parseMenuPdf(await pdf('3-primaria-e-secondaria-invernale-7845237.pdf'));
  assert.equal(m.feed, 'primaria-secondaria-veicolato');
  assert.equal(m.stagione, 'invernale');
  assert.equal(m.annoScolastico, '2026-27');
  assert.deepEqual(m.validita, [{ dal: '2026-11-30', al: '2027-03-12', giorno: 'lun', settimana: 2 }]);
  assert.deepEqual(m.riavvii, [{ data: '2027-01-07', giorno: 'gio', settimana: 1 }]);
  assert.deepEqual(m.settimane['2'].lun, ['Crema di verdure con orzo', 'Fesa di tacchino⁴', 'Insalata mista', 'Pane semintegrale', 'Frutta fresca']);
  assert.deepEqual(m.settimane['1'].mer.slice(0, 3), [
    'Crema di verdura con stagione (cavolfiori o porri a rotazione) con risoni¹',
    'Bocconcini di tacchino dorati al forno',
    'Patate al forno/all’olio²'
  ]);
  assert.deepEqual(m.settimane['3'].mar, ['Farfalle panna e speck', 'Insalata e cavolfiori gratinati', 'oppure', 'Pizza margherita al trancio*', 'Insalata e carote julienne', 'Pane', 'Frutta fresca']);
  assert.equal(Object.keys(m.note).length, 6);
  assert.match(m.note['6'], /^Caciotta 16\.12\.26/);
  assert.deepEqual(m.avvertenze, ['* In tali giornate prevedere il 15% di pasta in bianco in aggiunta al menù.']);
  const r = validaMenu(m, cal);
  assert.deepEqual(r.errori, []);
  assert.deepEqual(r.avvisi.filter((a) => /^Nota/.test(a) && !/letta come/.test(a)), []);
  const tab = giorniDaIntervalli(m);
  const reg = giorniDaRegola(m);
  for (const [d, w] of tab) assert.equal(reg.get(d), w, d);
});

test('refusi nell’anno di una data: corretti se con l’anno accanto la data rientra nel periodo, e segnalati', async () => {
  const m = await parseMenuPdf(await pdf('3-primaria-e-secondaria-invernale-7845237.pdf'));
  // nel PDF: "Dal 01.02.27 al 05.02.26" e "Fesa di tacchino il 30.11.27"
  assert.ok(m.intervalli.some((i) => i.settimana === 1 && i.dal === '2027-02-01' && i.al === '2027-02-05'));
  assert.ok(m.eccezioni.some((e) => e.nota === 4 && e.data === '2026-11-30' && e.piatto === 'Fesa di tacchino'));
  assert.equal(m.correzioni.length, 2);
  assert.equal(validaMenu(m, cal).avvisi.filter((a) => /letta come/.test(a)).length, 2);
  const senza = await parseMenuPdf(await pdf('3-infanzia-veicolata-invernale-2026-2027-2980730.pdf'));
  assert.equal(senza.correzioni, undefined);
});

test('nota che sceglie tra due menu separati da "oppure": nessuna sostituzione di piatti', async () => {
  const m = await parseMenuPdf(await pdf('3-asilo-nido-veicolata-invernale-4420110.pdf'));
  assert.deepEqual(m.settimane['3'].mar.slice(0, 4), ['Stortini al pomodoro³', 'Uova sode ed Insalata/Carote al burro', 'oppure', 'Pizza margherita* al trancio³']);
  assert.match(m.note['3'], /^Menù pizza: 16\.02\.27/);
  assert.deepEqual(m.eccezioni.filter((e) => e.nota === 3), []);
  assert.ok(m.eccezioni.some((e) => e.nota === 4 && e.data === '2027-02-17' && e.piatto === 'Crema di verdure con crostini'));
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

test('scambio di piatti tra due giorni ("viceversa"): ogni sostituzione con la sua data', () => {
  const testo =
    'si comunica che i filettini di merluzzo gratinati al limone previsti per tutti i veicolati per mercoledì 28/10 verranno somministrati giovedì 12/11 e che viceversa l’halibut gratinato previsto per quel giorno verrà somministrato il 28/10.';
  assert.deepEqual(estraiScambio(testo, '2026-10-21'), [
    { da: 'halibut gratinato', a: 'filettini di merluzzo gratinati al limone', date: ['2026-11-12'] },
    { da: 'filettini di merluzzo gratinati al limone', a: 'halibut gratinato', date: ['2026-10-28'] }
  ]);
  // pubblicata dopo il primo giorno: resta valida solo la parte futura
  assert.deepEqual(
    parseVariazione({ id: 'x', titolo: 'VARIAZIONE MENU', pubblicata: '2026-10-29', testo }).sostituzioni.map((s) => s.date[0]),
    ['2026-11-12']
  );
  // spostamento senza "viceversa": non si sa cosa lo sostituisce, nessuna sostituzione strutturata
  assert.deepEqual(estraiScambio('la pasta prevista per lunedì 3/11 verrà servita martedì 4/11.', '2026-10-21'), []);
});

test('variazione per ordine di scuola (sciopero 20/11)', async () => {
  const testo = (await readFile(new URL('../fixtures/notizie/post_78825.html', import.meta.url), 'utf8'));
  const { htmlInTesto } = await import('../src/lib/html.js');
  const corpo = testo.slice(testo.indexOf('</h2>') + 5).replace(/<div class="contimgnews">[\s\S]*$/, '');
  const v = parseVariazione({ id: 'post_78825', titolo: "VARIAZIONE MENU' 20/11", pubblicata: '2026-11-06', testo: htmlInTesto(corpo) });
  // la parentesi "(il frullato di <giorno> verrà sostituito da frutta fresca)" aggiunge il giorno, per il solo ordine che la cita
  assert.deepEqual(v.date, ['2026-11-17', '2026-11-19', '2026-11-20']);
  assert.deepEqual(v.parti.map((p) => p.feed), [['nido-veicolato'], ['infanzia-veicolato'], ['primaria-secondaria-veicolato', 'primaria-lambruschini']]);
  assert.deepEqual(v.parti.map((p) => p.dataMenu ?? null), [null, '2026-11-20', '2026-11-20']);
  assert.deepEqual(v.sostituzioni, [
    { da: 'frullato', a: 'frutta fresca', date: ['2026-11-19'], feed: ['infanzia-veicolato'] },
    { da: 'frullato', a: 'frutta fresca', date: ['2026-11-17'], feed: ['primaria-secondaria-veicolato', 'primaria-lambruschini'] }
  ]);
  assert.equal(v.confidenza, 'media');

  // applicazione: il menu dello sciopero solo il 20, la frutta al posto del frullato solo nell'ordine giusto
  const { risolviVariazioni, caricaMenus } = await import('../src/lib/applica.js');
  const menus = await caricaMenus(new URL('../data/menus', import.meta.url).pathname, '2026-27');
  const { applicazioni } = risolviVariazioni([v], menus, cal);
  const di = (feed, data) => applicazioni.filter((a) => a.feed === feed && a.data === data);
  assert.deepEqual(di('primaria-secondaria-veicolato', '2026-11-17').map((a) => [a.sostituzioni, a.menu ?? null]), [[[{ da: 'frullato', a: 'frutta fresca' }], null]]);
  assert.deepEqual(di('infanzia-veicolato', '2026-11-17'), []);
  assert.deepEqual(di('infanzia-veicolato', '2026-11-19').map((a) => a.sostituzioni), [[{ da: 'frullato', a: 'frutta fresca' }]]);
  assert.deepEqual(di('primaria-secondaria-veicolato', '2026-11-19'), []);
  assert.ok(di('primaria-secondaria-veicolato', '2026-11-20')[0].menu.includes('Cracker'));
  assert.equal(applicazioni.filter((a) => a.feed === 'nido-veicolato').length, 0);
});

test('estraiSostituzioniGiorno: giorno indicato solo col nome', () => {
  assert.deepEqual(estraiSostituzioniGiorno('frullato (il frullato di martedì verrà sostituito da frutta fresca)', '2026-11-20'), [
    { da: 'frullato', a: 'frutta fresca', date: ['2026-11-17'] }
  ]);
  assert.deepEqual(estraiSostituzioniGiorno('lo yogurt previsto per giovedì sarà sostituito con frutta fresca', '2026-11-16'), [
    { da: 'yogurt', a: 'frutta fresca', date: ['2026-11-19'] }
  ]);
  // spostamento, non sostituzione: nessun risultato
  assert.deepEqual(estraiSostituzioniGiorno('la frutta prevista viene spostata al martedì al posto del frullato', '2026-10-16'), []);
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

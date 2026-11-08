// Test end-to-end sulle fixture reali: scrape -> parse -> validazione -> build.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import ICAL from 'ical.js';
import { pipeline, snapshot, ORA } from './helpers.js';
import { aggiorna } from '../src/update.js';
import { build } from '../src/build-site.js';
import { caricaCalendario, fineAnno, statoGiorno } from '../src/lib/calendario.js';
import { addDays, giornoSettimana } from '../src/lib/dates.js';
import { FEED_INFO } from '../src/model.js';

const cal = caricaCalendario('2026-27');
let P;
before(async () => {
  P = await pipeline();
});

const leggiIcs = async (out, feed) => readFile(path.join(out, 'feed', `${feed}.ics`), 'utf8');
const eventi = (testo) => {
  const comp = new ICAL.Component(ICAL.parse(testo));
  return { comp, eventi: comp.getAllSubcomponents('vevent').map((v) => new ICAL.Event(v)) };
};
const dataDi = (ev) => ev.startDate.toString().slice(0, 10);

// ---------- pipeline ----------

test('pipeline: nessun errore, 14 menu 2026-27, PDF vecchi ignorati', () => {
  assert.deepEqual(P.rep.errori, []);
  assert.equal(P.rep.menuNuovi.length, 14);
  assert.equal(P.rep.pdfIgnorati.length, 8);
  assert.ok(P.rep.pdfIgnorati.every((p) => p.includes('2025-26')));
  assert.equal(P.rep.variazioniNuove.length, 13);
  assert.deepEqual(P.problemi.filter((p) => p.livello === 'errore'), []);
});

test('pipeline: un secondo giro senza novità non cambia niente', async () => {
  const rep2 = await aggiorna({ get: P.get, oggi: '2026-11-08', dati: P.dati });
  assert.deepEqual([rep2.menuNuovi, rep2.menuModificati, rep2.variazioniNuove, rep2.errori], [[], [], [], []]);
});

// ---------- snapshot ----------

test('snapshot: JSON dei menu', async (t) => {
  const dir = path.join(P.dati, 'menus');
  for (const feed of (await readdir(dir)).sort()) {
    for (const f of (await readdir(path.join(dir, feed))).sort()) {
      await snapshot(t.assert ?? assert, `menus/${feed}/${f}`, await readFile(path.join(dir, feed, f), 'utf8'));
    }
  }
});

test('snapshot: variazioni', async () => {
  await snapshot(assert, 'variations.json', await readFile(path.join(P.dati, 'variations.json'), 'utf8'));
});

test('snapshot: feed .ics e indice dei feed', async () => {
  for (const feed of Object.keys(FEED_INFO)) await snapshot(assert, `ics/${feed}.ics`, await leggiIcs(P.out, feed));
  await snapshot(assert, 'site/feeds.json', await readFile(path.join(P.out, 'data', 'feeds.json'), 'utf8'));
});

// ---------- rilettura con un parser indipendente (ical.js) ----------

for (const feed of Object.keys(FEED_INFO)) {
  test(`ical.js: ${feed} è valido e coerente con il calendario scolastico`, async () => {
    const testo = await leggiIcs(P.out, feed);
    assert.ok(!/[^\r]\n/.test(testo), 'solo terminatori CRLF');
    for (const riga of testo.split('\r\n')) assert.ok(Buffer.byteLength(riga) <= 75, `riga oltre 75 ottetti: ${riga}`);

    const { comp, eventi: evs } = eventi(testo);
    assert.equal(comp.getFirstPropertyValue('version'), '2.0');
    assert.match(comp.getFirstPropertyValue('x-wr-calname'), /^Menu Scuole Padova · /);
    assert.equal(comp.getFirstPropertyValue('x-wr-timezone'), 'Europe/Rome');
    assert.ok(testo.includes('REFRESH-INTERVAL;VALUE=DURATION:PT6H'));

    const giorniMenu = P.feeds.get(feed).giorni.filter((g) => g.stato === 'menu');
    assert.equal(evs.length, giorniMenu.length, 'un evento per ogni giorno di mensa');
    assert.ok(evs.length > 0);

    const uids = new Set();
    for (const ev of evs) {
      const d = dataDi(ev);
      assert.ok(!uids.has(ev.uid), `UID duplicato ${ev.uid}`);
      uids.add(ev.uid);
      assert.equal(ev.uid, `${feed}-${d.replace(/-/g, '')}@gbonanome.github.io`);
      assert.ok(ev.startDate.isDate, 'evento di giornata intera');
      assert.equal(ev.endDate.toString().slice(0, 10), addDays(d, 1));
      assert.ok(['lun', 'mar', 'mer', 'gio', 'ven'].includes(giornoSettimana(d)), `${d} cade nel fine settimana`);
      const st = statoGiorno(cal, feed, d);
      assert.ok(st.scuola, `${d}: evento in un giorno non scolastico (${st.motivo})`);
      assert.ok(d <= fineAnno(cal, feed));
      assert.ok(ev.summary.startsWith('🍽 ') || ev.summary.startsWith('⚠️ VARIATO · '), ev.summary);
      assert.ok(ev.description.includes('fa sempre fede il menu ufficiale'));
      assert.equal(ev.sequence, 0);
      assert.equal(ev.component.getFirstPropertyValue('transp'), 'TRANSPARENT');
    }
  });
}

test('ical.js: le date di festa e sospensione non hanno eventi', async () => {
  const testo = await leggiIcs(P.out, 'nido-cucina-interna');
  const date = new Set(eventi(testo).eventi.map(dataDi));
  for (const d of ['2026-12-07', '2026-12-08', '2026-12-24', '2027-01-05', '2027-01-06', '2027-02-09', '2027-03-29', '2027-04-30']) {
    assert.ok(!date.has(d), d);
  }
  assert.ok(date.has('2027-01-07'), 'il rientro dopo Natale ha il menu');
});

test('ical.js: la descrizione riletta coincide con quella scritta (escape e piegatura reversibili)', async () => {
  const testo = await leggiIcs(P.out, 'primaria-secondaria-veicolato');
  const ev = eventi(testo).eventi.find((e) => dataDi(e) === '2026-11-10');
  assert.equal(ev.summary, '⚠️ VARIATO · Crema di ceci bio · Tortino di uova, patate e formaggio');
  assert.ok(ev.description.startsWith('• Crema di ceci bio (era: Crema di lenticchie rosse decorticate con midolline)\n• Tortino di uova, patate e formaggio\n'));
});

// ---------- variazione simulata, dalla notizia all'evento ----------

test('variazione simulata: stesso UID, SEQUENCE +1, titolo e descrizione aggiornati, nient’altro cambia', async () => {
  const prima = {};
  for (const feed of Object.keys(FEED_INFO)) prima[feed] = await leggiIcs(P.out, feed);

  // Una nuova notizia compare nel carosello della pagina, con il suo pannello di dettaglio.
  const ID = 'post_99999';
  const articolo = `<article class="notizia" id="news0" ><input class="newsid" type="hidden" name="newsid" value="${ID}"><div class="notizia2"><h1>VARIAZIONE MENU 19/11</h1><div class="notiziadata">Pubblicato il: 12-11-2026</div></div></article>`;
  const dettaglio = `<div class="newsinterno"><div class="data"> 12-11-2026</div><h2>VARIAZIONE MENU 19/11</h2><hr><p>Gentili genitori,</p><p>informiamo che gioved&igrave; 19/11/2026 verr&agrave; servita pizza margherita al posto della minestra in brodo vegetale con risoni.</p><hr></div>`;
  const get = async (url, cond) => {
    if (url.endsWith('/padova')) {
      const html = (await P.get(url)).body.toString('utf8');
      return { body: Buffer.from(html.replace('<article class="notizia" id="news1"', `${articolo}<article class="notizia" id="news1"`)) };
    }
    if (url.includes(`notizia.php?id=${ID}`)) return { body: Buffer.from(dettaglio) };
    return P.get(url, cond);
  };
  const rep = await aggiorna({ get, oggi: '2026-11-12', dati: P.dati });
  assert.deepEqual(rep.variazioniNuove, [`${ID} VARIAZIONE MENU 19/11 (media)`]);
  const ORA2 = '2026-11-12T14:15:00Z';
  await build({ ora: ORA2, out: P.out, anno: '2026-27', dati: P.dati });

  for (const feed of Object.keys(FEED_INFO)) {
    const dopo = await leggiIcs(P.out, feed);
    const a = eventi(prima[feed]).eventi;
    const b = eventi(dopo).eventi;
    assert.equal(b.length, a.length, `${feed}: stesso numero di eventi`);
    const evPrima = a.find((e) => dataDi(e) === '2026-11-19');
    const evDopo = b.find((e) => dataDi(e) === '2026-11-19');
    const serviva = evPrima?.description.includes('Minestra in brodo vegetale con risoni');
    if (serviva) {
      assert.equal(evDopo.uid, evPrima.uid, `${feed}: UID invariato`);
      assert.equal(evDopo.sequence, evPrima.sequence + 1, `${feed}: SEQUENCE aumentata`);
      assert.equal(evDopo.component.getFirstPropertyValue('last-modified').toString(), '2026-11-12T14:15:00Z');
      assert.match(evDopo.summary, /^⚠️ VARIATO · Pizza margherita/);
      assert.match(evDopo.description, /• Pizza margherita \(era: Minestra in brodo vegetale con risoni\)/);
      assert.match(evDopo.description, /VARIAZIONE \(pubblicata il 12\/11\/2026\): VARIAZIONE MENU 19\/11/);
    } else if (evPrima) {
      assert.equal(evDopo.sequence, evPrima.sequence, `${feed}: il 19/11 non serviva la minestra, evento invariato`);
      assert.equal(evDopo.summary, evPrima.summary);
    }
    // tutti gli altri eventi sono identici, byte per byte
    const altri = (t) => t.split('BEGIN:VEVENT').filter((e) => !e.includes('-20261119@'));
    assert.deepEqual(altri(dopo), altri(prima[feed]), `${feed}: nessun altro evento cambiato`);
  }
  // la variazione riguarda almeno un feed
  assert.ok(Object.keys(FEED_INFO).some((f) => prima[f].includes('-20261119@') && eventi(prima[f]).eventi.find((e) => dataDi(e) === '2026-11-19')?.description.includes('Minestra in brodo vegetale con risoni')));
  void ORA;
});

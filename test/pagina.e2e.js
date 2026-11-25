// Smoke test della pagina in un browser vero (Playwright + Chromium), sulla build delle fixture.
// Non è in `npm test` perché serve un browser: si lancia con `npm run test:pagina`
// (la prima volta, fuori da questo container: `npx playwright install chromium`).
//
// Per ogni giorno tipico (menu senza variazioni, con variazione, menu sostitutivo, non pubblicato, chiuso,
// fine settimana) in più lingue e larghezze controlla che nessun testo visibile o attributo contenga
// "null", "undefined", "NaN" o un segnaposto {n} rimasto; poi che un menu non caricato mostri l'errore.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { pipeline } from './helpers.js';

const FEED = 'infanzia-veicolato';
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

let server;
let base;
let browser;
let giorni;

before(async () => {
  const P = await pipeline();
  giorni = new Map(P.feeds.get(FEED).giorni.map((g) => [g.data, g]));
  server = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.join(P.out, p.endsWith('/') ? `${p}index.html` : p);
    if (!file.startsWith(P.out)) return res.writeHead(403).end();
    try {
      res.writeHead(200, { 'content-type': TIPI[path.extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
});

/** Apre la pagina con la scuola, la lingua e la data simulata, e aspetta che il menu sia disegnato. */
async function apri({ oggi, lingua = 'it', larghezza = 1100, blocca = false }) {
  const pagina = await browser.newPage({ viewport: { width: larghezza, height: 900 } });
  const errori = [];
  pagina.on('pageerror', (e) => errori.push(e.message));
  if (blocca) await pagina.route(`**/data/${FEED}.json`, (r) => r.abort());
  const lang = lingua === 'it' ? '' : `&lingua=${lingua}`;
  await pagina.goto(`${base}?scuola=${FEED}${lang}${oggi ? `&oggi=${oggi}` : ''}#${FEED}`);
  await pagina.waitForFunction(() => document.querySelector('#giorni article') || document.querySelector('#oggi-box.errore-menu'));
  return { pagina, errori };
}

/**
 * Testi della pagina che una persona può leggere o sentire: ogni nodo di testo e ogni attributo accessibile
 * o link, uno per uno. Non document.body.textContent: incolla i testi vicini ("…di 4nullStortini…") e lì
 * \bnull\b non trova più il confine di parola. Proprio il bug del vassoio passava così.
 */
const testiDellaPagina = (pagina) =>
  pagina.evaluate(() => {
    const testi = [document.title];
    const giro = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (giro.nextNode()) testi.push(giro.currentNode.nodeValue);
    const attributi = ['aria-label', 'title', 'placeholder', 'alt', 'href'];
    for (const e of document.querySelectorAll('*')) for (const a of attributi) if (e.hasAttribute(a)) testi.push(e.getAttribute(a));
    return testi;
  });

const SOSPETTO = /\b(?:null|undefined|NaN)\b|\{\d+\}/;

async function nienteDiSospetto(pagina, dove) {
  for (const testo of await testiDellaPagina(pagina)) {
    const m = testo.match(SOSPETTO);
    assert.equal(m, null, `${dove}: "${m?.[0]}" in …${testo.slice(Math.max(0, m?.index - 60), m?.index + 40)}…`);
  }
}

const SCENARI = [
  { oggi: '2026-11-11', cosa: 'menu senza variazioni' },
  { oggi: '2026-11-10', cosa: 'variazione con piatti sostituiti' },
  { oggi: '2026-11-20', cosa: 'menu sostitutivo' },
  { oggi: '2026-11-30', cosa: 'menu non pubblicato' },
  { oggi: '2026-12-07', cosa: 'giorno chiuso (ponte)' },
  { oggi: '2026-11-08', cosa: 'domenica: si mostra il prossimo giorno' }
];

test('le fixture hanno i giorni che gli scenari dichiarano', () => {
  assert.equal(giorni.get('2026-11-11').stato, 'menu');
  assert.deepEqual(giorni.get('2026-11-11').variazioni, []);
  assert.ok(giorni.get('2026-11-10').variazioni.length && giorni.get('2026-11-10').originali);
  assert.ok(giorni.get('2026-11-20').menuSostituito);
  assert.equal(giorni.get('2026-11-30').stato, 'non-pubblicato');
  assert.equal(giorni.get('2026-12-07').stato, 'chiuso');
  assert.equal(giorni.get('2026-11-08'), undefined); // domenica
});

for (const [lingua, larghezza] of [['it', 1100], ['it', 390], ['en', 1100], ['ar', 390]]) {
  test(`nessun null, undefined, NaN o {n} nella pagina (${lingua}, ${larghezza}px)`, async () => {
    for (const { oggi, cosa } of SCENARI) {
      const { pagina, errori } = await apri({ oggi, lingua, larghezza });
      try {
        await nienteDiSospetto(pagina, `${oggi} ${cosa}`);
        assert.deepEqual(errori, [], `${oggi} ${cosa}: errori JavaScript`);
      } finally {
        await pagina.close();
      }
    }
  });
}

test('vassoio di oggi: solo data, ciclo, variazioni (se ci sono) e piatti', async () => {
  for (const [oggi, attesi] of [
    ['2026-11-11', ['P', 'P', 'UL']],
    ['2026-11-10', ['P', 'P', 'DIV', 'UL']]
  ]) {
    const { pagina } = await apri({ oggi });
    try {
      const figli = await pagina.$eval('#oggi-box', (e) => [...e.childNodes].map((n) => (n.nodeType === Node.TEXT_NODE ? `testo:${n.textContent}` : n.tagName)));
      assert.deepEqual(figli, attesi, oggi);
    } finally {
      await pagina.close();
    }
  }
});

test('giorno chiuso e menu non pubblicato: il motivo, non un giorno vuoto', async () => {
  const { pagina } = await apri({ oggi: '2026-12-07' });
  try {
    assert.match(await pagina.$eval('#giorni', (e) => e.innerText), /Ponte dell.Immacolata/);
  } finally {
    await pagina.close();
  }
});

// Nelle fixture l'ultimo menu dell'infanzia veicolata finisce venerdì 27 novembre: dal 30 il menu non è ancora uscito.
test('menu non ancora uscito: avviso con ultimo controllo e link, oggi e nella settimana', async () => {
  const { pagina, errori } = await apri({ oggi: '2026-11-30' });
  try {
    const vassoio = await pagina.$eval('#oggi-box', (e) => e.innerText);
    assert.match(vassoio, /Il menu di oggi non è ancora uscito sul sito di Dussmann\./);
    assert.match(vassoio, /Viene aggiunto automaticamente appena viene pubblicato\. Ultimo controllo: 8 novembre alle 13\.00\./);
    const settimana = await pagina.$$eval('#giorni article', (a) => a.map((e) => ({ classe: e.className, testo: e.innerText })));
    // un solo riquadro al posto dei cinque giorni vuoti
    assert.equal(settimana.length, 1);
    assert.match(settimana[0].classe, /scoperto/);
    assert.match(settimana[0].testo, /Il menu dal 30 novembre non è ancora uscito sul sito di Dussmann\./);
    assert.equal(await pagina.$eval('#oggi-box .sc-link a', (a) => a.href), 'https://www.scuoledussmann.it/padova');
    // l'avviso intero è già nel riquadro di oggi: nella settimana solo il titolo
    assert.equal(await pagina.$('#giorni .sc-link'), null);
    assert.equal(await pagina.$eval('#succ', (b) => b.disabled), true);
    assert.deepEqual(errori, []);
  } finally {
    await pagina.close();
  }
});

test('menu non ancora uscito: si arriva alla settimana dell\'avviso e non oltre; nel mese una sola nota', async () => {
  const { pagina } = await apri({ oggi: '2026-11-25' });
  try {
    assert.equal(await pagina.$eval('#succ', (b) => b.disabled), false);
    await pagina.click('#succ');
    await pagina.waitForSelector('#giorni article.scoperto');
    assert.equal(await pagina.$eval('#succ', (b) => b.disabled), true);
    assert.equal(await pagina.$eval('#titolo-settimana', (e) => e.innerText), '30 novembre – 4 dicembre');
    // il mese: novembre con la nota, dicembre non si raggiunge
    const mese = await pagina.$eval('#mese', (e) => ({ nota: e.querySelector('.mm-nota')?.innerText, avanti: e.querySelector('.mm-freccia[data-verso="succ"]').disabled }));
    assert.match(mese.nota, /Dal 30 novembre il menu non è ancora uscito sul sito di Dussmann\. Sito ufficiale/);
    assert.equal(mese.avanti, true);
    assert.equal(await pagina.$$eval('#mese .mm-scoperto', (b) => b.length), 1);
    // la settimana prima, con il menu, non ha l'avviso
    await pagina.click('#prec');
    await pagina.waitForFunction(() => !document.querySelector('#giorni article.scoperto'));
    assert.equal(await pagina.$$eval('#giorni article', (a) => a.length), 5);
  } finally {
    await pagina.close();
  }
});

test('menu non ancora uscito, settimana con giorni di chiusura: le chiusure restano, l\'avviso è uno', async () => {
  const { pagina } = await apri({ oggi: '2026-12-07' });
  try {
    const giorni = await pagina.$$eval('#giorni article', (a) => a.map((e) => e.className));
    assert.deepEqual(giorni.map((c) => (c.includes('scoperto') ? 'scoperto' : c.includes('closed') ? 'chiuso' : c)), ['chiuso', 'chiuso', 'scoperto']);
  } finally {
    await pagina.close();
  }
});

test('menu non caricato: errore con Riprova, nessun "niente mensa" né giorni vuoti', async () => {
  for (const lingua of ['it', 'en']) {
    const { pagina, errori } = await apri({ oggi: '2026-11-11', lingua, blocca: true });
    try {
      const box = await pagina.$eval('#oggi-box', (e) => ({ visibile: !e.hidden, testo: e.innerText }));
      assert.ok(box.visibile);
      assert.match(box.testo, lingua === 'it' ? /Impossibile caricare il menu/ : /could not be loaded/);
      assert.equal(await pagina.$eval('#settimana', (e) => e.hidden), true);
      assert.equal(await pagina.$eval('#oggi-riga', (e) => e.hidden), true);
      assert.ok(await pagina.$('#riprova-menu'));
      await nienteDiSospetto(pagina, `errore di caricamento (${lingua})`);
      assert.deepEqual(errori, []);
    } finally {
      await pagina.close();
    }
  }
});

test('menu non caricato, poi Riprova con la rete tornata: compare il menu', async () => {
  const pagina = await browser.newPage({ viewport: { width: 390, height: 900 } });
  let blocca = true;
  await pagina.route(`**/data/${FEED}.json`, (r) => (blocca ? r.abort() : r.continue()));
  try {
    await pagina.goto(`${base}?scuola=${FEED}&oggi=2026-11-11#${FEED}`);
    await pagina.waitForSelector('#riprova-menu');
    blocca = false;
    await pagina.click('#riprova-menu');
    await pagina.waitForSelector('#giorni article');
    assert.equal(await pagina.$eval('#oggi-box', (e) => e.classList.contains('errore-menu')), false);
    assert.equal(await pagina.$eval('#settimana', (e) => e.hidden), false);
    assert.match(await pagina.$eval('#oggi-box', (e) => e.innerText), /Oggi/);
  } finally {
    await pagina.close();
  }
});

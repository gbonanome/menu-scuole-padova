// Build completa in dist/: feed .ics, JSON per la pagina (indice feed, indice scuole, giorni per feed,
// nomi dei piatti tradotti) e file statici.
// Uso: node src/build-site.js [--ora 2026-11-08T12:00:00Z] [--out dist] [--anno 2026-27]
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaCalendario } from './lib/calendario.js';
import { caricaMenus } from './lib/applica.js';
import { annoScolasticoDi } from './lib/dates.js';
import { FEED_INFO, FONTE, costruisciModello } from './model.js';
import { BASE_URL, costruisciIcs } from './build-ics.js';
import { DIR_TRADUZIONI, LINGUE, caricaTraduzioni, piattiDeiFeed, vociUsate } from './piatti.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * CSS e JS con l'impronta del contenuto nell'indirizzo (style.css?v=…): GitHub Pages li lascia in cache
 * e Safari (soprattutto dalla schermata Home) altrimenti abbina la pagina nuova al foglio di stile vecchio.
 */
async function versionaRisorse(out) {
  const impronta = async (nome) => createHash('sha256').update(await readFile(path.join(out, nome))).digest('hex').slice(0, 10);
  // Lo stesso per i moduli importati da app.js: prima si cambia chi importa, poi se ne calcola l'impronta.
  // mese.js importa anche lui i18n.js, con la stessa impronta: un indirizzo diverso darebbe un secondo
  // modulo i18n.js, con la sua lingua.
  const versiona = async (chi, moduli) => {
    const file = path.join(out, chi);
    let js = await readFile(file, 'utf8');
    for (const m of moduli) {
      const importa = `from './${m}'`;
      if (!js.includes(importa)) throw new Error(`${chi}: manca ${importa}`);
      js = js.replace(importa, `from './${m}?v=${await impronta(m)}'`);
    }
    await writeFile(file, js);
  };
  await versiona('mese.js', ['i18n.js']);
  await versiona('app.js', ['i18n.js', 'mese.js']);
  const file = path.join(out, 'index.html');
  let html = await readFile(file, 'utf8');
  for (const [attr, nome] of [['href', 'style.css'], ['src', 'app.js'], ['href', 'manifest.webmanifest']]) {
    const v = await impronta(nome);
    const prima = `${attr}="${nome}"`;
    if (!html.includes(prima)) throw new Error(`index.html: manca ${prima}`);
    html = html.replace(prima, `${attr}="${nome}?v=${v}"`);
  }
  // Versione da package.json, mostrata nel piede con il link al changelog.
  const { version } = JSON.parse(await readFile(path.join(RADICE, 'package.json'), 'utf8'));
  html = html.replaceAll('__VERSIONE__', version);
  await writeFile(file, html);
}
const leggiJson = async (p, def) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch (e) {
    if (def !== undefined) return def;
    throw e;
  }
};
const scrivi = async (p, s) => {
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, s);
};
const ordina = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

export async function build({ ora, out, anno, dati = path.join(RADICE, 'data'), pubblico = path.join(RADICE, 'public'), traduzioni = DIR_TRADUZIONI }) {
  const cal = caricaCalendario(anno, dati);
  const menus = await caricaMenus(path.join(dati, 'menus'), anno);
  const variazioni = await leggiJson(path.join(dati, 'variations.json'), []);
  const scuole = await leggiJson(path.join(dati, 'scuole-padova.json'));
  const statoIcsPath = path.join(dati, 'ics-state.json');
  const statoIcs = await leggiJson(statoIcsPath, {});

  const { feeds, problemi } = costruisciModello({ menus, variazioni, cal });

  await rm(out, { recursive: true, force: true });
  await cp(pubblico, out, { recursive: true, filter: (src) => !src.endsWith('.gitkeep') });
  await versionaRisorse(out);

  const indice = [];
  for (const [feed, { giorni, copertura }] of feeds) {
    await scrivi(path.join(out, 'feed', `${feed}.ics`), costruisciIcs(feed, giorni, statoIcs, { ora }));
    await scrivi(path.join(out, 'data', `${feed}.json`), `${JSON.stringify({ feed, copertura, giorni })}\n`);
    indice.push({
      slug: feed,
      nome: scuole.feeds?.[feed] ?? FEED_INFO[feed].breve,
      breve: FEED_INFO[feed].breve,
      ordine: FEED_INFO[feed].ordine,
      ics: `feed/${feed}.ics`,
      copertura,
      variati: giorni.filter((g) => g.variazioni?.length).length
    });
  }
  const meta = { generato: ora, annoScolastico: anno, fonte: FONTE, baseUrl: BASE_URL };
  await scrivi(path.join(out, 'data', 'feeds.json'), `${JSON.stringify({ ...meta, feeds: indice }, null, 2)}\n`);
  const indiceScuole = scuole.scuole.map((s) => ({
    nome: s.nome,
    ordine: s.ordine,
    ...(s.ic ? { ic: s.ic } : {}),
    feed: s.feed,
    confidenza: s.confidenza,
    ...(s.avviso ? { avviso: s.avviso } : {})
  }));
  await scrivi(path.join(out, 'data', 'scuole.json'), `${JSON.stringify(indiceScuole, null, 2)}\n`);
  // Nomi dei piatti tradotti: solo quelli usati nei feed. Un piatto senza traduzione resta in italiano.
  const piatti = piattiDeiFeed(feeds.values());
  const dizionari = await caricaTraduzioni(traduzioni);
  for (const codice of LINGUE) {
    await scrivi(path.join(out, 'data', `piatti-${codice}.json`), `${JSON.stringify(vociUsate(piatti, dizionari[codice]))}\n`);
  }
  await writeFile(path.join(out, '.nojekyll'), '');

  await scrivi(statoIcsPath, `${JSON.stringify(ordina(statoIcs), null, 1)}\n`);
  return { feeds, problemi, indice };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const ora = arg('--ora') ?? new Date().toISOString();
  const anno = arg('--anno') ?? annoScolasticoDi(ora.slice(0, 10));
  const out = path.resolve(arg('--out') ?? path.join(RADICE, 'dist'));
  const { indice, problemi } = await build({ ora, out, anno });
  for (const f of indice) console.log(`${f.slug.padEnd(32)} ${f.copertura ? `${f.copertura.dal} → ${f.copertura.al}` : 'nessun menu'}  variati: ${f.variati}`);
  for (const p of problemi) console.log(`[${p.livello}] ${p.id}: ${p.msg}`);
  if (arg('--problemi')) await writeFile(arg('--problemi'), `${JSON.stringify(problemi, null, 2)}\n`);
  console.log(`Build in ${out}`);
}

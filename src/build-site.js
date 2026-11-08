// Build completa in dist/: feed .ics, JSON per la pagina (indice feed, indice scuole, giorni per feed) e file statici.
// Uso: node src/build-site.js [--ora 2026-11-08T12:00:00Z] [--out dist] [--anno 2026-27]
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaCalendario } from './lib/calendario.js';
import { caricaMenus } from './lib/applica.js';
import { annoScolasticoDi } from './lib/dates.js';
import { FEED_INFO, FONTE, costruisciModello } from './model.js';
import { BASE_URL, costruisciIcs } from './build-ics.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

export async function build({ ora, out, anno, dati = path.join(RADICE, 'data'), pubblico = path.join(RADICE, 'public') }) {
  const cal = caricaCalendario(anno, dati);
  const menus = await caricaMenus(path.join(dati, 'menus'), anno);
  const variazioni = await leggiJson(path.join(dati, 'variations.json'), []);
  const scuole = await leggiJson(path.join(dati, 'scuole-padova.json'));
  const statoScrape = await leggiJson(path.join(dati, 'state.json'), {});
  const statoIcsPath = path.join(dati, 'ics-state.json');
  const statoIcs = await leggiJson(statoIcsPath, {});

  const { feeds, problemi } = costruisciModello({ menus, variazioni, cal });

  await rm(out, { recursive: true, force: true });
  await cp(pubblico, out, { recursive: true, filter: (src) => !src.endsWith('.gitkeep') });

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
  const meta = { generato: ora, ultimaVerificaFonte: statoScrape.aggiornato ?? null, annoScolastico: anno, fonte: FONTE, baseUrl: BASE_URL };
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
  console.log(`Build in ${out}`);
}

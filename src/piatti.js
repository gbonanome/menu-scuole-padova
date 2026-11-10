// Dizionario dei nomi dei piatti nelle altre lingue della pagina.
// Le traduzioni stanno in data/traduzioni/piatti-<codice>.json: { "<nome italiano esatto>": "<traduzione>" }.
// La build copia in dist/data/piatti-<codice>.json solo le voci dei piatti usati; un piatto senza
// traduzione resta in italiano sulla pagina, quindi niente qui fa fallire build o workflow.
// Uso: node src/piatti.js [--anno 2026-27]   (elenca, lingua per lingua, piatti mancanti e voci non più usate)
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caricaCalendario } from './lib/calendario.js';
import { caricaMenus } from './lib/applica.js';
import { annoScolasticoDi, toIso } from './lib/dates.js';
import { giorniDelMenu, piattiDelGiorno } from './lib/expand.js';
import { costruisciModello } from './model.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR_TRADUZIONI = path.join(RADICE, 'data', 'traduzioni');

/** Codici delle lingue (zh = cinese semplificato). */
export const LINGUE = ['en', 'ro', 'zh', 'bn', 'sq', 'ar', 'ur'];

/** "oppure" separa il menu alternativo: non è un piatto. */
const NON_PIATTO = 'oppure';

const ordinati = (insieme) => [...insieme].filter((p) => p && p !== NON_PIATTO).sort((a, b) => a.localeCompare(b, 'it'));

/**
 * Tutti i nomi distinti dei piatti nei giorni dei feed, come compaiono in dist/data/<feed>.json:
 * piatti del giorno, piatti originali delle variazioni e piatti spostati dalle note.
 * @param {Iterable<{giorni:object[]}>} feeds i valori della mappa di costruisciModello
 */
export function piattiDeiFeed(feeds) {
  const tutti = new Set();
  for (const { giorni } of feeds) {
    for (const g of giorni) for (const p of [...(g.piatti ?? []), ...(g.originali ?? []), ...(g.daNota ?? [])]) tutti.add(p);
  }
  return ordinati(tutti);
}

/** I nomi dei piatti di un singolo menu (data/menus/...), giorno per giorno, già senza i rimandi alle note. */
export function piattiDelMenu(menu) {
  const tutti = new Set();
  for (const [data, settimana] of giorniDelMenu(menu)) for (const p of piattiDelGiorno(menu, data, settimana).piatti) tutti.add(p);
  return ordinati(tutti);
}

/**
 * Un dizionario per lingua. Se un file manca o non si legge, quella lingua resta vuota (piatti in italiano):
 * le traduzioni non devono mai fermare la build dei feed. Il test controlla che i file siano validi.
 * @returns {Promise<Record<string, Record<string,string>>>}
 */
export async function caricaTraduzioni(dir = DIR_TRADUZIONI) {
  const out = {};
  for (const codice of LINGUE) {
    const file = path.join(dir, `piatti-${codice}.json`);
    out[codice] = {};
    let testo;
    try {
      testo = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    try {
      const diz = JSON.parse(testo);
      if (diz && typeof diz === 'object' && !Array.isArray(diz)) out[codice] = diz;
      else console.warn(`${file}: non è un oggetto, ignorato`);
    } catch (e) {
      console.warn(`${file}: JSON non valido, ignorato (${e.message})`);
    }
  }
  return out;
}

/** Solo le voci dei piatti usati, con una traduzione non vuota, in ordine alfabetico. */
export function vociUsate(piatti, dizionario) {
  const out = {};
  for (const p of piatti) if (typeof dizionario[p] === 'string' && dizionario[p].trim()) out[p] = dizionario[p];
  return out;
}

/** Per ogni lingua: piatti senza traduzione e voci del dizionario non più usate. */
export function confronta(piatti, traduzioni) {
  const usati = new Set(piatti);
  const out = {};
  for (const codice of LINGUE) {
    const diz = traduzioni[codice] ?? {};
    out[codice] = {
      mancanti: piatti.filter((p) => !(typeof diz[p] === 'string' && diz[p].trim())),
      inutilizzate: Object.keys(diz).filter((k) => !usati.has(k)).sort((a, b) => a.localeCompare(b, 'it'))
    };
  }
  return out;
}

/**
 * Sezione Markdown per la PR "Nuovo menu da rivedere": piatti dei menu nuovi senza traduzione.
 * Stringa vuota se sono tutti tradotti. Solo informativa: il piatto si vede in italiano finché manca.
 */
export function sezioneTraduzioniMancanti(piatti, traduzioni) {
  const mancantiPer = confronta(ordinati(new Set(piatti)), traduzioni);
  const tutti = ordinati(new Set(LINGUE.flatMap((l) => mancantiPer[l].mancanti)));
  if (!tutti.length) return '';
  const r = [
    '## Traduzioni dei piatti',
    '',
    `${tutti.length === 1 ? 'Un piatto di questi menu non ha' : `${tutti.length} piatti di questi menu non hanno`} ancora la traduzione in tutte le lingue: sulla pagina si vedranno in italiano finché non si aggiungono in \`data/traduzioni/piatti-<lingua>.json\` (anche dopo il merge). Elenco completo con \`npm run piatti\`.`,
    '',
    `| ${LINGUE.join(' | ')} |`,
    `|${LINGUE.map(() => '---').join('|')}|`,
    `| ${LINGUE.map((l) => mancantiPer[l].mancanti.length).join(' | ')} |`,
    '',
    '<details><summary>Piatti senza traduzione</summary>',
    '',
    ...tutti.map((p) => {
      const lingue = LINGUE.filter((l) => mancantiPer[l].mancanti.includes(p));
      return `- ${p.replace(/([*_`|<>\\])/g, '\\$1')}${lingue.length < LINGUE.length ? ` (${lingue.join(', ')})` : ''}`;
    }),
    '',
    '</details>'
  ];
  return r.join('\n');
}

/** I piatti usati nei feed a partire da data/, con la stessa logica della build. */
export async function piattiDaDati({ anno, dati = path.join(RADICE, 'data') }) {
  const cal = caricaCalendario(anno, dati);
  const menus = await caricaMenus(path.join(dati, 'menus'), anno);
  let variazioni = [];
  try {
    variazioni = JSON.parse(await readFile(path.join(dati, 'variations.json'), 'utf8'));
  } catch {}
  const { feeds } = costruisciModello({ menus, variazioni, cal });
  return piattiDeiFeed(feeds.values());
}

// ---- CLI ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--anno');
  const anno = i > 0 ? process.argv[i + 1] : annoScolasticoDi(toIso(new Date()));
  const piatti = await piattiDaDati({ anno });
  const traduzioni = await caricaTraduzioni();
  const esito = confronta(piatti, traduzioni);
  console.log(`Piatti nei menu ${anno}: ${piatti.length}`);
  for (const codice of LINGUE) {
    const { mancanti, inutilizzate } = esito[codice];
    console.log(`\n[${codice}] tradotti ${piatti.length - mancanti.length}/${piatti.length}, mancanti ${mancanti.length}, non più usati ${inutilizzate.length}`);
    for (const p of mancanti) console.log(`  manca: ${p}`);
    for (const p of inutilizzate) console.log(`  non usato: ${p}`);
  }
}

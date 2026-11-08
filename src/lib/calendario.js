import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIORNI_LAVORO, giornoSettimana } from './dates.js';

const DATI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');

/** Il calendario che vale per un feed: i nidi seguono il Comune, gli altri la Regione. */
export function ordineDi(feed) {
  if (feed.startsWith('nido')) return 'nido';
  if (feed.startsWith('infanzia')) return 'infanzia';
  return 'primo_ciclo';
}

/**
 * Carica i calendari di un anno scolastico:
 * - `calendario-scolastico-<anno>.json` (Regione: primo ciclo e infanzia)
 * - `calendario-nidi-<anno>.json` (Comune: nidi), se presente.
 * @returns {{anno:string, regionale:object, nidi:object|null}}
 */
export function caricaCalendario(anno = '2026-27', dir = DATI) {
  const leggi = (nome) => JSON.parse(readFileSync(path.join(dir, nome), 'utf8'));
  const file = readdirSync(dir);
  const regionale = leggi(`calendario-scolastico-${anno}.json`);
  const nidi = file.includes(`calendario-nidi-${anno}.json`) ? leggi(`calendario-nidi-${anno}.json`) : null;
  return { anno, regionale, nidi };
}

function calendarioPer(cal, feed) {
  const ordine = ordineDi(feed);
  if (ordine === 'nido' && cal.nidi) return { c: cal.nidi, periodo: cal.nidi.periodi.nido, provvisorio: false };
  if (ordine === 'nido') return { c: cal.regionale, periodo: cal.regionale.periodi.infanzia, provvisorio: true };
  return { c: cal.regionale, periodo: cal.regionale.periodi[ordine], provvisorio: false };
}

/**
 * Stato di una data per un feed. Le date d'inizio del servizio mensa vengono dai PDF,
 * quindi qui si controllano solo festività, sospensioni e fine dell'anno.
 * @returns {{scuola:boolean, motivo?:string, provvisorio?:boolean}}
 */
export function statoGiorno(cal, feed, iso) {
  if (!GIORNI_LAVORO.includes(giornoSettimana(iso))) return { scuola: false, motivo: 'Fine settimana' };
  const { c, periodo, provvisorio } = calendarioPer(cal, feed);
  const festa = c.festivita.find((f) => f.data === iso);
  if (festa) return { scuola: false, motivo: festa.nome };
  const susp = c.sospensioni.find((s) => iso >= s.dal && iso <= s.al);
  if (susp) return { scuola: false, motivo: susp.nome };
  if (iso > periodo.fine) return { scuola: false, motivo: 'Anno scolastico concluso' };
  return provvisorio ? { scuola: true, provvisorio } : { scuola: true };
}

/** Ultimo giorno dell'anno per un feed. */
export function fineAnno(cal, feed) {
  return calendarioPer(cal, feed).periodo.fine;
}

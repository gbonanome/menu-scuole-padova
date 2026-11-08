import { readFileSync } from 'node:fs';
import { GIORNI_LAVORO, giornoSettimana } from './dates.js';

export function caricaCalendario(path = new URL('../../data/calendario-scolastico-2026-27.json', import.meta.url)) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Il calendario che vale per un feed: i nidi dipendono dal Comune, gli altri dalla Regione. */
export function ordineDi(feed) {
  if (feed.startsWith('nido')) return 'nido';
  if (feed.startsWith('infanzia')) return 'infanzia';
  return 'primo_ciclo';
}

/**
 * Stato di una data per un feed.
 * @returns {{scuola:boolean, motivo?:string, nota?:string}}
 */
export function statoGiorno(cal, feed, iso) {
  if (!GIORNI_LAVORO.includes(giornoSettimana(iso))) return { scuola: false, motivo: 'Fine settimana' };
  const festa = cal.festivita.find((f) => f.data === iso);
  if (festa) return { scuola: false, motivo: festa.nome };
  const ordine = ordineDi(feed);
  // I nidi comunali hanno un calendario proprio (non ancora disponibile): per ora si usa
  // quello regionale delle sospensioni, con fine anno alla fine di luglio.
  const periodo = cal.periodi[ordine] ?? cal.periodi.infanzia;
  const susp = cal.sospensioni.find((s) => iso >= s.dal && iso <= s.al);
  if (susp) return { scuola: false, motivo: susp.nome };
  if (iso > periodo.fine) return { scuola: false, motivo: 'Anno scolastico concluso' };
  return { scuola: true, ...(cal.periodi[ordine] ? {} : { nota: 'calendario nidi non disponibile' }) };
}

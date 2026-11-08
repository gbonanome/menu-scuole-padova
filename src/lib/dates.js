// Utilità per date ISO (YYYY-MM-DD) calcolate in UTC, senza dipendenze.

export const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
export const GIORNI_LAVORO = ['lun', 'mar', 'mer', 'gio', 'ven'];
const NOMI_GIORNO = { lunedi: 'lun', martedi: 'mar', mercoledi: 'mer', giovedi: 'gio', venerdi: 'ven' };

export function giornoDaNome(nome) {
  const k = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return NOMI_GIORNO[k] ?? null;
}

export function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function giornoSettimana(iso) {
  return GIORNI[toDate(iso).getUTCDay()];
}

export function lunediDi(iso) {
  const dow = toDate(iso).getUTCDay();
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function diffGiorni(a, b) {
  return Math.round((toDate(a) - toDate(b)) / 86400000);
}

/** "26.10.26" | "26.10.2026" -> "2026-10-26" */
export function parseDataPunti(s) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(s);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function tutteLeDate(s) {
  return [...s.matchAll(/\d{1,2}\.\d{1,2}\.\d{2,4}/g)].map((m) => parseDataPunti(m[0]));
}

export function* intervallo(dal, al) {
  for (let d = dal; d <= al; d = addDays(d, 1)) yield d;
}

/** Anno scolastico (es. "2026-27") a cui appartiene una data: l'anno inizia ad agosto. */
export function annoScolasticoDi(iso) {
  const y = Number(iso.slice(0, 4));
  const start = Number(iso.slice(5, 7)) >= 8 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

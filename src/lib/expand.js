// Dal menu normalizzato ai singoli giorni: ogni giorno -> settimana del ciclo e piatti.
import { GIORNI_LAVORO, addDays, diffGiorni, giornoSettimana, intervallo, lunediDi } from './dates.js';

const APICI = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const APICE_RE = new RegExp(`[${APICI}]+$`);
const numeroDaApice = (s) => Number([...s].map((c) => APICI.indexOf(c)).join(''));

export function numeroSettimane(menu) {
  return Object.keys(menu.settimane).length;
}

/** Giorni dedotti dalle date scritte nella tabella (veicolati). */
export function giorniDaIntervalli(menu) {
  const out = new Map();
  for (const iv of menu.intervalli) {
    for (const d of intervallo(iv.dal, iv.al)) {
      if (GIORNI_LAVORO.includes(giornoSettimana(d))) out.set(d, iv.settimana);
    }
  }
  return out;
}

/** Giorni dedotti dalla regola "in vigore dal..al... con partenza dal <giorno> della N settimana". */
export function giorniDaRegola(menu) {
  const n = numeroSettimane(menu);
  const out = new Map();
  for (const v of menu.validita) {
    if (!v.settimana) continue;
    for (const d of intervallo(v.dal, v.al)) {
      if (!GIORNI_LAVORO.includes(giornoSettimana(d))) continue;
      const base = menu.riavvii.filter((r) => r.data <= d && r.data >= v.dal && r.data <= v.al).at(-1) ?? { data: v.dal, settimana: v.settimana };
      const idx = diffGiorni(lunediDi(d), lunediDi(base.data)) / 7;
      out.set(d, ((((base.settimana - 1 + idx) % n) + n) % n) + 1);
    }
  }
  return out;
}

export function giorniDelMenu(menu) {
  const daTabella = menu.intervalli.length > 0;
  return daTabella ? giorniDaIntervalli(menu) : giorniDaRegola(menu);
}

/** Toglie i rimandi alle note ("¹") dal testo di un piatto. */
export function senzaApice(p) {
  return p.replace(APICE_RE, '');
}

/**
 * Piatti di una data: applica le eccezioni delle note di testata (es. "Polpettone 29.10.2026").
 * @returns {{piatti:string[], daNota:string[]}}
 */
export function piattiDelGiorno(menu, data, settimana) {
  const giorno = giornoSettimana(data);
  const lista = menu.settimane[String(settimana)]?.[giorno] ?? [];
  const daNota = [];
  const piatti = lista.map((p) => {
    const m = APICE_RE.exec(p);
    if (!m) return p;
    const ecc = menu.eccezioni.find((e) => e.nota === numeroDaApice(m[0]) && e.data === data);
    if (ecc) {
      daNota.push(ecc.piatto);
      return ecc.piatto;
    }
    return senzaApice(p);
  });
  return { piatti, daNota };
}

export { addDays };

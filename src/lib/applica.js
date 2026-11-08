// Collega le variazioni ai giorni dei menu: quali feed e quali giorni riguardano davvero.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { giornoSettimana } from './dates.js';
import { giorniDelMenu, piattiDelGiorno } from './expand.js';
import { statoGiorno } from './calendario.js';

export async function caricaMenus(dirMenus, anno) {
  const out = [];
  for (const feed of await readdir(dirMenus).catch(() => [])) {
    for (const f of await readdir(path.join(dirMenus, feed))) {
      if (!f.endsWith('.json') || (anno && !f.startsWith(anno))) continue;
      out.push(JSON.parse(await readFile(path.join(dirMenus, feed, f), 'utf8')));
    }
  }
  return out;
}

/** feed -> data -> { menu, settimana, piatti } (solo giorni di scuola). */
export function giorniPerFeed(menus, cal) {
  const out = new Map();
  for (const m of menus) {
    const giorni = out.get(m.feed) ?? new Map();
    for (const [data, settimana] of giorniDelMenu(m)) {
      if (!statoGiorno(cal, m.feed, data).scuola) continue;
      const { piatti } = piattiDelGiorno(m, data, settimana);
      giorni.set(data, { menu: m, settimana, piatti });
    }
    out.set(m.feed, giorni);
  }
  return out;
}

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'"().,/*]/g, ' ').replace(/\s+/g, ' ').trim();

/** Il piatto `da` compare tra i piatti del giorno? (confronto tollerante su parole) */
export function piattoPresente(da, piatti) {
  const parole = norm(da).split(' ').filter((w) => w.length > 2 && !['bio', 'con', 'del', 'dei', 'della', 'delle'].includes(w));
  if (!parole.length) return false;
  return piatti.some((p) => {
    const np = norm(p);
    return parole.every((w) => np.includes(w.length > 5 ? w.slice(0, -1) : w));
  });
}

/**
 * @returns {{applicazioni:{data:string,feed:string,id:string,testo:string,ambito:'confermato'|'ipotizzato',sostituzioni:{da:string,a:string}[]}[],
 *            problemi:{id:string,livello:'errore'|'avviso',msg:string}[]}}
 */
export function risolviVariazioni(variazioni, menus, cal) {
  const giorni = giorniPerFeed(menus, cal);
  const applicazioni = [];
  const problemi = [];
  for (const v of variazioni) {
    const trovate = [];
    for (const data of v.date) {
      const sostData = v.sostituzioni.filter((s) => s.date.includes(data));
      const candidati = [];
      for (const parte of v.parti) {
        for (const feed of parte.feed) {
          const g = giorni.get(feed)?.get(data);
          if (g) candidati.push({ feed, g, parte });
        }
      }
      if (!candidati.length) {
        problemi.push({ id: v.id, livello: 'avviso', msg: `${data} (${giornoSettimana(data)}): nessun menu in quel giorno per i feed indicati` });
        continue;
      }
      // Se la variazione dice quale piatto cambia, vale solo per i feed che quel giorno lo servono.
      const conferma = sostData.length ? candidati.filter((c) => sostData.some((s) => piattoPresente(s.da, c.g.piatti))) : [];
      const usati = conferma.length ? conferma : candidati;
      for (const c of usati) {
        trovate.push({
          data,
          feed: c.feed,
          id: v.id,
          titolo: v.titolo,
          testo: c.parte.testo,
          ambito: conferma.length ? 'confermato' : 'ipotizzato',
          sostituzioni: conferma.length ? sostData.filter((s) => piattoPresente(s.da, c.g.piatti)).map(({ da, a }) => ({ da, a })) : []
        });
      }
      if (sostData.length && !conferma.length) {
        problemi.push({ id: v.id, livello: 'avviso', msg: `${data}: "${sostData[0].da}" non compare nei menu di quel giorno; applicata ai feed indicati dal testo` });
      }
    }
    if (!trovate.length) problemi.push({ id: v.id, livello: 'errore', msg: `"${v.titolo}": nessun giorno di menu corrisponde (date: ${v.date.join(', ') || 'nessuna'})` });
    applicazioni.push(...trovate);
  }
  return { applicazioni, problemi };
}

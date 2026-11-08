// Modello comune a feed .ics e pagina: per ogni feed, l'elenco dei giorni con menu, chiusure e variazioni.
import { GIORNI_LAVORO, giornoSettimana, intervallo } from './lib/dates.js';
import { fineAnno, statoGiorno } from './lib/calendario.js';
import { giorniDelMenu, numeroSettimane, piattiDelGiorno } from './lib/expand.js';
import { piattoPresente, risolviVariazioni } from './lib/applica.js';

export const FEED_INFO = {
  'nido-veicolato': { breve: 'Nido veicolato', ordine: 'nido' },
  'nido-cucina-interna': { breve: 'Nido cucina interna', ordine: 'nido' },
  'nido-integrato-cucina-interna': { breve: 'Nido integrato', ordine: 'nido' },
  'infanzia-veicolato': { breve: 'Infanzia veicolato', ordine: 'infanzia' },
  'infanzia-cucina-interna': { breve: 'Infanzia cucina interna', ordine: 'infanzia' },
  'primaria-secondaria-veicolato': { breve: 'Primaria e secondaria veicolato', ordine: 'primaria' },
  'primaria-lambruschini': { breve: 'Primaria Lambruschini', ordine: 'primaria' }
};

export const FONTE = 'https://www.scuoledussmann.it/padova';
export const FONTE_NOTIZIE = 'https://www.scuoledussmann.it/padova#notizie';

const NON_IN_TITOLO = /^(pane|frutta|verdura (?:cruda|cotta)|bis di verdura|yogurt|merenda|oppure$)/i;

/** Titolo breve: le prime due portate "importanti" (salta pane, frutta, verdura generica). */
export function piattiPerTitolo(piatti) {
  const fino = piatti.includes('oppure') ? piatti.slice(0, piatti.indexOf('oppure')) : piatti;
  const scelti = fino.filter((p) => !NON_IN_TITOLO.test(p));
  return (scelti.length ? scelti : fino).slice(0, 2);
}

/** Toglie saluti e formule di cortesia dal testo di una notizia. */
export function testoEssenziale(testo) {
  return testo
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r && !/^(gentili (genitori|famiglie)|cordiali saluti|saluti|ci scusiamo|dussmann service)\b/i.test(r))
    .join('\n');
}

const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * @returns {Map<string, {feed:string, giorni:object[], copertura:{dal:string,al:string}|null}>}
 */
export function costruisciModello({ menus, variazioni, cal }) {
  const { applicazioni, problemi } = risolviVariazioni(variazioni, menus, cal);
  const perVariazione = new Map(variazioni.map((v) => [v.id, v]));
  const out = new Map();

  for (const feed of Object.keys(FEED_INFO)) {
    const propri = menus.filter((m) => m.feed === feed).sort((a, b) => a.validita[0].dal.localeCompare(b.validita[0].dal));
    const giorniMenu = new Map();
    for (const menu of propri) {
      for (const [data, settimana] of giorniDelMenu(menu)) {
        if (giorniMenu.has(data)) continue;
        giorniMenu.set(data, { menu, settimana });
      }
    }
    const date = [...giorniMenu.keys()].sort();
    if (!date.length) {
      out.set(feed, { feed, giorni: [], copertura: null });
      continue;
    }
    const fine = fineAnno(cal, feed);
    const giorni = [];
    for (const data of intervallo(date[0], fine > date.at(-1) ? fine : date.at(-1))) {
      if (!GIORNI_LAVORO.includes(giornoSettimana(data))) continue;
      const st = statoGiorno(cal, feed, data);
      if (!st.scuola) {
        if (st.motivo !== 'Anno scolastico concluso') giorni.push({ data, stato: 'chiuso', motivo: st.motivo });
        continue;
      }
      const gm = giorniMenu.get(data);
      if (!gm) {
        giorni.push({ data, stato: 'non-pubblicato' });
        continue;
      }
      const { menu, settimana } = gm;
      const { piatti: base, daNota } = piattiDelGiorno(menu, data, settimana);
      let piatti = [...base];
      const vari = applicazioni.filter((a) => a.feed === feed && a.data === data);
      const sostituiti = [];
      let menuSostituito = false;
      for (const a of vari) {
        if (a.menu) {
          piatti = [...a.menu];
          menuSostituito = true;
          continue;
        }
        for (const s of a.sostituzioni) {
          // tutte le occorrenze (anche nel menu alternativo dopo "oppure")
          piatti = piatti.map((p) => {
            if (p === 'oppure' || !piattoPresente(s.da, [p])) return p;
            sostituiti.push(p);
            return maiuscola(s.a);
          });
        }
      }
      giorni.push({
        data,
        stato: 'menu',
        settimana,
        settimane: numeroSettimane(menu),
        stagione: menu.stagione,
        annoScolastico: menu.annoScolastico,
        piatti,
        ...(sostituiti.length || menuSostituito ? { originali: base } : {}),
        ...(menuSostituito ? { menuSostituito } : {}),
        ...(daNota.length ? { daNota } : {}),
        variazioni: vari.map((a) => {
          const v = perVariazione.get(a.id);
          return { id: a.id, titolo: v.titolo, pubblicata: v.pubblicata, testo: testoEssenziale(a.testo), ambito: a.ambito, confidenza: v.confidenza };
        }),
        pdf: menu.fonte?.url ?? null
      });
    }
    out.set(feed, { feed, giorni, copertura: { dal: date[0], al: date.at(-1) } });
  }
  return { feeds: out, problemi };
}

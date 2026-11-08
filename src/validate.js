// Controlli di coerenza. Gli `errori` bloccano la pubblicazione, gli `avvisi` finiscono nella PR/issue.
import { GIORNI_LAVORO, intervallo, giornoSettimana } from './lib/dates.js';
import { statoGiorno } from './lib/calendario.js';
import { giorniDaIntervalli, giorniDaRegola, giorniDelMenu, numeroSettimane } from './lib/expand.js';

export const FEED = [
  'nido-veicolato',
  'nido-cucina-interna',
  'nido-integrato-cucina-interna',
  'infanzia-veicolato',
  'infanzia-cucina-interna',
  'primaria-secondaria-veicolato',
  'primaria-lambruschini'
];

export function validaMenu(menu, cal) {
  const errori = [];
  const avvisi = [];

  if (!FEED.includes(menu.feed)) errori.push(`Feed non riconosciuto dal titolo: "${menu.titolo}"`);
  if (!menu.stagione) errori.push(`Stagione non riconosciuta dal titolo: "${menu.titolo}"`);

  // 1. Griglia completa: ogni settimana ha 5 giorni e nessuna portata vuota.
  const n = numeroSettimane(menu);
  if (n !== 4) avvisi.push(`Il ciclo ha ${n} settimane (attese 4)`);
  for (const [w, giorni] of Object.entries(menu.settimane)) {
    for (const g of GIORNI_LAVORO) {
      const piatti = giorni[g];
      if (!piatti?.length) {
        errori.push(`Settimana ${w} ${g}: cella vuota`);
        continue;
      }
      if (piatti.some((p) => !p.trim())) errori.push(`Settimana ${w} ${g}: portata vuota`);
      if (piatti.length < 3) avvisi.push(`Settimana ${w} ${g}: solo ${piatti.length} portate`);
      for (const p of piatti) {
        if (p.length > 110) avvisi.push(`Settimana ${w} ${g}: piatto molto lungo, forse mal ricomposto: "${p.slice(0, 60)}…"`);
        if (/^[a-zà-ÿ]/.test(p) && p !== 'oppure') avvisi.push(`Settimana ${w} ${g}: piatto che inizia in minuscolo: "${p}"`);
      }
    }
  }

  // 2. Ciclo coerente con le date: la regola della testata e le date della tabella devono concordare.
  const daTab = giorniDaIntervalli(menu);
  const daReg = giorniDaRegola(menu);
  if (daTab.size && daReg.size) {
    for (const [d, w] of daTab) {
      if (daReg.has(d) && daReg.get(d) !== w) errori.push(`${d}: la tabella dice settimana ${w}, la regola in testata ${daReg.get(d)}`);
    }
  }
  const giorni = giorniDelMenu(menu);
  if (!giorni.size) errori.push('Nessun giorno ricavato dal menu');
  for (const [d, w] of giorni) {
    if (!menu.settimane[String(w)]) errori.push(`${d}: settimana ${w} inesistente`);
  }

  // 3. Ogni giorno di scuola nel periodo di validità ha un menu (esclusi festività e sospensioni).
  for (const v of menu.validita) {
    for (const d of intervallo(v.dal, v.al)) {
      const st = statoGiorno(cal, menu.feed, d);
      if (st.scuola && !giorni.has(d)) errori.push(`${d} (${giornoSettimana(d)}): giorno di scuola senza menu`);
    }
  }
  // ... e viceversa: un menu in un giorno di festa non viene generato, ma lo segnaliamo se la tabella lo prevede.
  // (solo per i menu con date esplicite: per quelli a regola i giorni di festa sono attesi)
  for (const d of daTab.keys()) {
    const st = statoGiorno(cal, menu.feed, d);
    if (!st.scuola) avvisi.push(`${d}: il menu prevede un giorno non scolastico (${st.motivo}); non verrà generato`);
  }

  // 4. Eccezioni delle note: devono cadere su un giorno con quel rimando.
  for (const e of menu.eccezioni) {
    const w = giorni.get(e.data);
    if (!w) {
      avvisi.push(`Nota ${e.nota}: la data ${e.data} non è un giorno del menu`);
      continue;
    }
    const lista = menu.settimane[String(w)]?.[giornoSettimana(e.data)] ?? [];
    if (!lista.some((p) => p.includes(['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'][e.nota]))) {
      avvisi.push(`Nota ${e.nota} (${e.data}, "${e.piatto}"): nessun piatto con questo rimando in settimana ${w} ${giornoSettimana(e.data)}`);
    }
  }

  return { errori, avvisi };
}

/** I giorni di più menu dello stesso feed non devono sovrapporsi con settimane diverse. */
export function validaFeed(menus) {
  const errori = [];
  const visti = new Map();
  for (const m of menus) {
    for (const [d] of giorniDelMenu(m)) {
      if (visti.has(d)) errori.push(`${m.feed} ${d}: coperto da due menu (${visti.get(d)} e ${m.stagione})`);
      else visti.set(d, m.stagione);
    }
  }
  return errori;
}

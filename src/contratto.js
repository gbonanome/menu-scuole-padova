// Contratto tra la build e la pagina: cosa public/app.js può dare per garantito nei JSON di dist/data/.
// La build lo verifica prima di scrivere (build-site.js): se un dato non lo rispetta la build si ferma e la
// pagina non viene pubblicata, invece di mostrare "null", "{0}", "NaN" o un giorno sbagliato.
//
// Campi facoltativi per scelta (la pagina li gestisce caso per caso): ic e avviso delle scuole, copertura di
// un feed ancora senza menu, originali/menuSostituito/daNota/pdf dei giorni, titolo/ambito/confidenza delle variazioni.

export const STATI = ['menu', 'chiuso', 'non-pubblicato'];

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const eData = (s) => typeof s === 'string' && DATA.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const eTesto = (s) => typeof s === 'string' && s.trim() !== '';
const eIntero = (n, min = 1) => Number.isInteger(n) && n >= min;
const mostra = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));

/**
 * @param {{meta:object, feeds:object[], scuole:object[], giorni:Map<string, {giorni:object[], copertura:object|null}>}} dati
 *   meta e feeds come in feeds.json, scuole come in scuole.json, giorni come in data/<feed>.json
 * @returns {string[]} le violazioni, vuoto se il contratto è rispettato
 */
export function verificaContratto({ meta, feeds, scuole, giorni }) {
  const errori = [];
  const no = (dove, cosa, valore) => errori.push(`${dove}: ${cosa} (trovato ${mostra(valore)})`);

  // feeds.json
  if (!eTesto(meta?.generato) || Number.isNaN(Date.parse(meta.generato))) no('feeds.json', 'generato deve essere una data e ora ISO', meta?.generato);
  if (!Array.isArray(feeds) || !feeds.length) no('feeds.json', 'feeds deve essere un elenco non vuoto', feeds);
  const slugs = new Set();
  for (const [i, f] of (Array.isArray(feeds) ? feeds : []).entries()) {
    const dove = `feeds.json feed ${f?.slug ?? `#${i}`}`;
    if (!eTesto(f?.slug)) no(dove, 'slug mancante', f?.slug);
    else if (slugs.has(f.slug)) no(dove, 'slug ripetuto', f.slug);
    else slugs.add(f.slug);
    for (const k of ['nome', 'breve', 'ordine', 'ics']) if (!eTesto(f?.[k])) no(dove, `${k} mancante`, f?.[k]);
    if (f?.copertura !== null && !(eData(f?.copertura?.dal) && eData(f?.copertura?.al) && f.copertura.dal <= f.copertura.al)) {
      no(dove, 'copertura deve essere null o {dal, al} con dal ≤ al', f?.copertura);
    }
    if (!giorni.has(f?.slug)) no(dove, `manca data/${f?.slug}.json`, undefined);
  }

  // scuole.json
  if (!Array.isArray(scuole) || !scuole.length) no('scuole.json', 'deve essere un elenco non vuoto', scuole);
  for (const [i, s] of (Array.isArray(scuole) ? scuole : []).entries()) {
    const dove = `scuole.json ${eTesto(s?.nome) ? `"${s.nome}"` : `#${i}`}`;
    for (const k of ['nome', 'ordine', 'feed']) if (!eTesto(s?.[k])) no(dove, `${k} mancante`, s?.[k]);
    if (eTesto(s?.feed) && !slugs.has(s.feed)) no(dove, 'feed che non esiste in feeds.json', s.feed);
    for (const k of ['ic', 'avviso']) if (k in (s ?? {}) && !eTesto(s[k])) no(dove, `${k}, se c'è, non può essere vuoto`, s[k]);
  }

  // data/<feed>.json
  for (const [feed, { giorni: elenco, copertura }] of giorni) {
    const file = `data/${feed}.json`;
    if (!Array.isArray(elenco)) {
      no(file, 'giorni deve essere un elenco', elenco);
      continue;
    }
    let prec = '';
    for (const g of elenco) {
      const dove = `${file} ${g?.data ?? '?'}`;
      if (!eData(g?.data)) no(dove, 'data non valida', g?.data);
      else if (g.data <= prec) no(dove, 'date non in ordine o ripetute', g.data);
      else prec = g.data;
      if (!STATI.includes(g?.stato)) {
        no(dove, `stato deve essere uno tra ${STATI.join(', ')}`, g?.stato);
        continue;
      }
      if (g.stato === 'chiuso' && !eTesto(g.motivo)) no(dove, 'giorno chiuso senza motivo', g.motivo);
      if (g.stato !== 'menu') continue;
      if (!eTesto(g.stagione)) no(dove, 'stagione mancante', g.stagione);
      if (!eIntero(g.settimana) || !eIntero(g.settimane) || g.settimana > g.settimane) no(dove, 'settimana e settimane devono essere interi con 1 ≤ settimana ≤ settimane', [g.settimana, g.settimane]);
      const piattiValidi = Array.isArray(g.piatti) && g.piatti.length > 0 && g.piatti.every(eTesto);
      if (!piattiValidi) no(dove, 'piatti deve essere un elenco non vuoto di testi', g.piatti);
      if ('originali' in g) {
        if (!Array.isArray(g.originali) || !g.originali.every(eTesto)) no(dove, 'originali deve essere un elenco di testi', g.originali);
        // Senza menu sostitutivo la pagina confronta piatti e originali posizione per posizione.
        else if (piattiValidi && !g.menuSostituito && g.originali.length !== g.piatti.length) no(dove, 'originali e piatti di lunghezza diversa', [g.originali.length, g.piatti.length]);
      }
      if (!Array.isArray(g.variazioni)) {
        no(dove, 'variazioni deve essere un elenco (anche vuoto)', g.variazioni);
        continue;
      }
      for (const v of g.variazioni) {
        if (!eData(v?.pubblicata)) no(`${dove} variazione ${v?.id ?? '?'}`, 'pubblicata non è una data', v?.pubblicata);
        if (!eTesto(v?.testo)) no(`${dove} variazione ${v?.id ?? '?'}`, 'testo dell\'avviso mancante', v?.testo);
      }
    }
    if (elenco.some((g) => g?.stato === 'menu') && !copertura) no(file, 'ha giorni con il menu ma copertura null', copertura);
  }
  return errori;
}

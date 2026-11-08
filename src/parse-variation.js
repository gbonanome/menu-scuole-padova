// Testo di una notizia di variazione -> variazione strutturata.
// Deterministico, senza LLM: estrae date, feed coinvolti e (solo se il pattern è chiaro) il piatto sostituito.
import { addDays, giornoSettimana, lunediDi, toIso } from './lib/dates.js';

const MESI = { gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6, luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12 };
const MESI_RE = Object.keys(MESI).join('|');

const VEICOLATI = ['nido-veicolato', 'infanzia-veicolato', 'primaria-secondaria-veicolato', 'primaria-lambruschini'];
const CUCINA_INTERNA = ['nido-cucina-interna', 'nido-integrato-cucina-interna', 'infanzia-cucina-interna'];

function risolviAnno(giorno, mese, pubblicata) {
  const y = Number(pubblicata.slice(0, 4));
  const cand = (yy) => `${yy}-${String(mese).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
  const iso = cand(y);
  // una data molto prima della pubblicazione si riferisce all'anno dopo (es. pubblicata a dicembre, "12 gennaio")
  return iso < addDays(pubblicata, -60) ? cand(y + 1) : iso;
}

function dataValida(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && toIso(d) === iso;
}

/** Tutte le date citate nel testo (anche "5 e 17 novembre", "05/10, 06/10 e 09/10", "domani"). */
export function estraiDate(testo, pubblicata) {
  const t = testo.toLowerCase();
  const trovate = new Set();
  const aggiungi = (g, m, a) => {
    const anno = a ? (a < 100 ? 2000 + a : a) : null;
    const iso = anno ? `${anno}-${String(m).padStart(2, '0')}-${String(g).padStart(2, '0')}` : risolviAnno(g, m, pubblicata);
    if (m >= 1 && m <= 12 && dataValida(iso)) trovate.add(iso);
  };
  // 20/11/2026, 20/11/26, 20/11, 20.11.2026
  for (const m of t.matchAll(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/g)) aggiungi(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null);
  // "15 e 16 ottobre", "5, 6 e 9 ottobre 2026", "23 settembre 2026"
  const re = new RegExp(`((?:\\d{1,2}\\s*(?:,|e|ed)\\s*)*\\d{1,2})\\s+(${MESI_RE})(?:\\s+(\\d{4}))?`, 'g');
  for (const m of t.matchAll(re)) {
    for (const g of m[1].split(/\s*(?:,|e|ed)\s*/)) aggiungi(Number(g), MESI[m[2]], m[3] ? Number(m[3]) : null);
  }
  // "domani": giorno dopo la pubblicazione (lavorativo)
  if (/\bdomani\b/.test(t)) {
    let d = addDays(pubblicata, 1);
    while (['sab', 'dom'].includes(giornoSettimana(d))) d = addDays(d, 1);
    trovate.add(d);
  }
  if (/\boggi\b/.test(t)) trovate.add(pubblicata);
  // Le date precedenti alla pubblicazione sono richiami a fatti passati, non giorni da variare.
  return [...trovate].filter((d) => d >= pubblicata).sort();
}

/** Feed citati in una riga di testo, o null se la riga non nomina nessun ordine di scuola. */
export function feedCitati(riga) {
  const t = riga.toLowerCase();
  const feed = new Set();
  let esplicito = false;
  const nidoIntegrato = /nid[oi] integrat/.test(t);
  const cucinaInterna = /cucina interna|cuochi/.test(t);
  if (nidoIntegrato) {
    feed.add('nido-integrato-cucina-interna');
    esplicito = true;
  }
  if (/\bnid[oi]\b/.test(t) && !nidoIntegrato) {
    feed.add(cucinaInterna ? 'nido-cucina-interna' : 'nido-veicolato');
    esplicito = true;
  }
  if (/infanzi[ae]/.test(t)) {
    feed.add(cucinaInterna ? 'infanzia-cucina-interna' : 'infanzia-veicolato');
    esplicito = true;
  }
  if (/primari[ae]|secondari[ae]/.test(t)) {
    feed.add('primaria-secondaria-veicolato');
    feed.add('primaria-lambruschini');
    esplicito = true;
  }
  if (/lambruschini/.test(t)) {
    feed.add('primaria-lambruschini');
    esplicito = true;
  }
  if (!esplicito && cucinaInterna) {
    CUCINA_INTERNA.forEach((f) => feed.add(f));
    esplicito = true;
  }
  if (!esplicito && /veicolat/.test(t)) {
    VEICOLATI.forEach((f) => feed.add(f));
    esplicito = true;
  }
  return esplicito ? [...feed] : null;
}

const ART = '(?:il|lo|la|l[’\']|i|gli|le|dell[’\']|del|della|dello|dei|degli|delle|un|una)?\\s*';

/** Sostituzioni dal pattern chiaro "X al posto di Y" / "Y sostituit* con X" / "X (invece di Y)". */
export function estraiSostituzioni(frase) {
  const f = frase.replace(/\s+/g, ' ').trim();
  const out = [];
  if (/\brispettivamente\b/i.test(f)) return out; // più sostituzioni abbinate a più date: troppo ambiguo
  const pulisci = (s) => s.replace(/^[\s,:;-]+|[\s,.:;)-]+$/g, '').replace(/^(?:si comunica che|informiamo che|vi comunichiamo che)\s+/i, '').replace(/^(?:(?:il|lo|la|i|gli|le)\s+|l[’'])/i, '').replace(/\s+previst[oaie]\b.*$/i, '').trim();
  let m = /(?:verr[àa]|verranno|sar[àa]|saranno)\s+(?:servit[oaie]|somministrat[oaie]|proposto|proposta)\s+(?:come\s+\w+\s+)?(.+?)\s+\(?(?:al posto|in sostituzione|invece)\s+(?:d[ie]l?l?[oaie]?[’']?\s*|d[ie]\s+)?(.+)$/i.exec(f);
  if (m) out.push({ da: pulisci(m[2]), a: pulisci(m[1]) });
  else if ((m = /(?:al posto|invece)\s+d\S*\s+(.+?)\s+previst\S*\s+(?:per\s+\S+\s+)?(?:verr[àa]|verranno|sar[àa]|saranno)\s+(?:servit|somministrat)\S*\s+(.+)$/i.exec(f))) out.push({ da: pulisci(m[1]), a: pulisci(m[2]) });
  else if ((m = /(?:domani\s+)?al posto d\S*\s+(.+?)\s+previst\S*(?:\s+per\s+.+?)?\s+(?:verr[àa]|verranno|sar[àa])\s+(?:servit|somministrat)\S*\s+(.+)$/i.exec(f))) out.push({ da: pulisci(m[1]), a: pulisci(m[2]) });
  else if ((m = /(.+?)\s+previst\S*.*?\s+(?:verr[àa]|verranno|saranno)\s+sostituit\S*\s+(?:rispettivamente\s+)?con\s+(.+)$/i.exec(f))) out.push({ da: pulisci(m[1]), a: pulisci(m[2]) });
  return out.filter((s) => s.da && s.a && s.da.length < 90 && s.a.length < 90);
}

const NOMI_GIORNI = { lunedì: 1, martedì: 2, mercoledì: 3, giovedì: 4, venerdì: 5 };

/** Giorni scritti solo come nome ("- Mercoledì:") nella settimana di una data già citata. */
export function giorniSenzaData(righe, date) {
  if (!date.length) return [];
  const lun = lunediDi(date[0]);
  const out = [];
  for (const r of righe) {
    if (/invariat|\d{1,2}[\/.]\d{1,2}|\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/i.test(r)) continue;
    const m = /^[-•]?\s*(lunedì|martedì|mercoledì|giovedì|venerdì)(?![\p{L}])\s*:?/iu.exec(r);
    if (m) out.push(addDays(lun, NOMI_GIORNI[m[1].toLowerCase()] - 1));
  }
  return out;
}

/**
 * @param {{id:string,titolo:string,pubblicata:string,testo:string}} notizia
 */
export function parseVariazione({ id, titolo, pubblicata, testo }) {
  const righe = testo.split('\n').map((r) => r.trim()).filter(Boolean);
  const righe0 = righe;
  let date = estraiDate(`${titolo}\n${testo}`, pubblicata);
  const deduce = giorniSenzaData(righe0, date).filter((d) => !date.includes(d) && d >= pubblicata);

  // Ambito: righe con un ordine di scuola nominato (elenchi per ordine) oppure l'intero testo.
  const perRiga = righe.map((r) => ({ r, feed: feedCitati(r.replace(/^[-•]\s*/, '').split(/[:(]/)[0]) }));
  const specifiche = perRiga.filter((x) => x.feed && /^[-•]|^[A-ZÀ-Ý][^.]{0,60}:/.test(x.r));
  const motivi = [];
  let parti;
  if (specifiche.length >= 2) {
    const comuni = perRiga.filter((x) => !specifiche.includes(x)).map((x) => x.r);
    parti = specifiche.map((x) => ({ feed: x.feed, testo: [...comuni, x.r.replace(/^[-•]\s*/, '')].join('\n') }));
    motivi.push('testo diviso per ordine di scuola');
  } else {
    const feed = feedCitati(`${titolo}\n${testo}`);
    parti = [{ feed: feed ?? VEICOLATI, testo: righe.join('\n') }];
    if (!feed) motivi.push('nessun ordine di scuola nominato: applicata a tutti i veicolati');
  }

  if (deduce.length) {
    date = [...date, ...deduce].sort();
    motivi.push(`giorni indicati solo col nome, riferiti alla settimana del ${lunediDi(date[0])}`);
  }

  const sostituzioni = [];
  for (const riga of righe) {
    for (const frase of riga.split(/(?<=[.;])\s+/)) {
      const d = estraiDate(frase, pubblicata);
      for (const s of estraiSostituzioni(frase)) sostituzioni.push({ ...s, date: d.length ? d : date.length === 1 ? date : [] });
    }
  }

  let confidenza = deduce.length ? 'media' : 'alta';
  if (!date.length) {
    confidenza = 'bassa';
    motivi.push('nessuna data riconosciuta');
  } else if (motivi.some((m) => m.startsWith('nessun ordine'))) confidenza = sostituzioni.length ? 'media' : 'bassa';
  if (sostituzioni.some((s) => !s.date.length)) {
    confidenza = 'bassa';
    motivi.push('sostituzione senza data certa');
  }

  return { id, titolo, pubblicata, testo, date, parti, sostituzioni, confidenza, motivi };
}

// PDF di un menu Dussmann (una pagina, tabella settimane x giorni) -> JSON normalizzato.
// Parsing deterministico con le coordinate x/y del testo (pdfjs-dist).
import { estraiPagina, righe } from './lib/pdf-text.js';
import { GIORNI_LAVORO, giornoDaNome, parseDataPunti, tutteLeDate } from './lib/dates.js';
import { annoScolasticoDi } from './lib/dates.js';

const SUPERSCRIPT = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const apice = (n) => String(n).replace(/\d/g, (d) => SUPERSCRIPT[d]);

const CONNETTIVI_FINALI = /(?:\b(?:di|con|e|ed|o|al|alla|allo|ai|agli|alle|all’|all'|in|a|del|della|dei|delle|da|per|su)|[,/(\-–])$/i;

export class ParseError extends Error {}

/** Classifica il menu dal titolo (non dal nome del file, che cambia a ogni pubblicazione). */
export function classifica(titolo) {
  const t = titolo.toLowerCase();
  let feed = null;
  if (t.includes('lambruschini')) feed = 'primaria-lambruschini';
  else if (t.includes('nido integrato')) feed = 'nido-integrato-cucina-interna';
  else if (/\bnido\b/.test(t) && t.includes('cucina interna')) feed = 'nido-cucina-interna';
  else if (/\bnido\b/.test(t)) feed = 'nido-veicolato';
  else if (t.includes('infanzi') && t.includes('cucina interna')) feed = 'infanzia-cucina-interna';
  else if (t.includes('infanzi')) feed = 'infanzia-veicolato';
  else if (t.includes('primaria')) feed = 'primaria-secondaria-veicolato';
  const stagione = /(estiv|autunnal|invernal|primaveril)/.exec(t)?.[1];
  const stagioni = { estiv: 'estivo', autunnal: 'autunnale', invernal: 'invernale', primaveril: 'primaverile' };
  return { feed, stagione: stagione ? stagioni[stagione] : null };
}

function assegnaColonna(cx, colonne) {
  // colonne: [{giorno, da, a}]
  for (const c of colonne) if (cx >= c.da && cx < c.a) return c.giorno;
  return null;
}

/** Spezza le righe di una cella in piatti, ricomponendo i nomi andati a capo. */
export function righeInPiatti(linee) {
  const piatti = [];
  for (const riga of linee) {
    const t = riga.trim();
    if (!t) continue;
    if (/^oppure$/i.test(t)) {
      piatti.push('oppure');
      continue;
    }
    const prec = piatti.at(-1);
    const continuazione =
      prec && prec !== 'oppure' && (/^[a-zà-ÿ(]/.test(t) || CONNETTIVI_FINALI.test(prec.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+$/, '')));
    if (continuazione) piatti[piatti.length - 1] = `${prec} ${t}`.replace(/\s+/g, ' ');
    else piatti.push(t);
  }
  return piatti.map((p) => p.replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '('));
}

/** Estrae "In vigore dal ... al ... con partenza dal <giorno> della N settimana" (anche più periodi). */
export function parseValidita(testo) {
  const validita = [];
  const re =
    /dal\s+(\d{1,2}\.\d{1,2}\.\d{2,4})\s+al\s+(\d{1,2}\.\d{1,2}\.\d{2,4})(?:\s*(?:\([^)]*\)\s*)?con\s+(?:partenza|inizio)\s+(?:dal|da)\s+(\p{L}+)\s+della\s+(\d)\s*[°ªa]?\s*settimana)?/giu;
  for (const m of testo.matchAll(re)) {
    validita.push({
      dal: parseDataPunti(m[1]),
      al: parseDataPunti(m[2]),
      giorno: m[3] ? giornoDaNome(m[3]) : null,
      settimana: m[4] ? Number(m[4]) : null
    });
  }
  const riavvii = [];
  const rr = /Rientro[^.]*?(\d{1,2}\.\d{1,2}\.\d{2,4})\s+con\s+ripartenza\s+dal\s+(\p{L}+)\s+della\s+(\d)\s*[°ªa]?\s*settimana/giu;
  for (const m of testo.matchAll(rr)) {
    riavvii.push({ data: parseDataPunti(m[1]), giorno: giornoDaNome(m[2]), settimana: Number(m[3]) });
  }
  return { validita, riavvii };
}

/**
 * Interpreta una nota di testata (es. "Polpettone 29.10.2026. Polpette 26.11.2026.")
 * come elenco di eccezioni {data, piatto}. Le parti senza date sono lasciate nel testo della nota.
 */
export function eccezioniDaNota(testo) {
  const placeholder = testo.replace(/\d{1,2}\.\d{1,2}\.\d{2,4}/g, (d) => `§${parseDataPunti(d)}§`);
  const segmenti = placeholder.split(/(?<=§)\s*[.;]\s+(?=\S)|(?<=§)\s+[–-]\s+(?=\p{L})|(?<=[^§0-9])\.\s+(?=[A-ZÀ-Ý0-9§])|;\s+/u);
  const out = [];
  for (const segRaw of segmenti) {
    const seg = segRaw.trim().replace(/[.;]$/, '');
    const date = [...seg.matchAll(/§(\d{4}-\d{2}-\d{2})§/g)].map((m) => m[1]);
    if (!date.length) continue;
    let piatto;
    if (/^§/.test(seg)) piatto = seg.replace(/^(?:§[^§]*§\s*(?:e|,|-|–)?\s*)+:?\s*/u, '');
    else piatto = seg.split('§')[0];
    piatto = piatto.replace(/\s+(?:il|del|nei giorni|in data|alternativamente)\s*:?$/iu, '').replace(/[\s:–-]+$/u, '').replace(/^[\s:–-]+/u, '').trim();
    if (!piatto) continue;
    for (const data of date) out.push({ data, piatto: piatto.charAt(0).toUpperCase() + piatto.slice(1) });
  }
  return out;
}

function tagliPerLacune(tab, etichette, sinistra) {
  const piatti = tab.filter((i) => i.x + i.w / 2 >= sinistra);
  const ys = [...new Set(piatti.map((i) => Math.round(i.y * 2) / 2))].sort((a, b) => b - a);
  const taglio = [Infinity];
  for (let k = 0; k < etichette.length - 1; k++) {
    const yAlta = etichette[k].y + 15;
    const yBassa = etichette[k + 1].y - 15;
    let best = null;
    for (let j = 0; j < ys.length - 1; j++) {
      const a = ys[j];
      const b = ys[j + 1];
      if (a <= yAlta && b >= yBassa && (!best || a - b > best.gap)) best = { gap: a - b, mid: (a + b) / 2 };
    }
    if (!best) throw new ParseError(`Impossibile separare le settimane ${etichette[k].str} e ${etichette[k + 1].str}`);
    taglio.push(best.mid);
  }
  taglio.push(-Infinity);
  return taglio;
}

export async function parseMenuPdf(buffer, meta = {}) {
  const { items, rects } = await estraiPagina(buffer);
  const tutte = righe(items);

  const hdr = items.find((i) => i.str === 'Settimana');
  if (!hdr) throw new ParseError('Intestazione "Settimana" non trovata');
  const hy = hdr.y;
  const giorniHdr = items
    .filter((i) => Math.abs(i.y - hy) < 2 && giornoDaNome(i.str))
    .map((i) => ({ giorno: giornoDaNome(i.str), c: i.x + i.w / 2 }))
    .sort((a, b) => a.c - b.c);
  if (giorniHdr.length !== 5) throw new ParseError(`Trovati ${giorniHdr.length} giorni in intestazione, attesi 5`);
  const passo = (giorniHdr[4].c - giorniHdr[0].c) / 4;
  const bordi = [giorniHdr[0].c - passo / 2, ...giorniHdr.slice(0, 4).map((g, i) => (g.c + giorniHdr[i + 1].c) / 2), giorniHdr[4].c + passo / 2];
  const colonne = giorniHdr.map((g, i) => ({ giorno: g.giorno, da: bordi[i], a: bordi[i + 1] }));
  const sinistra = bordi[0];

  // --- testata ---
  const zonaAlta = tutte.filter((r) => r.y > hy + 2);
  const pulite = zonaAlta
    .map((r) => ({ ...r, items: r.items.filter((i) => !/^Comune di Padova$/.test(i.str)) }))
    .filter((r) => r.items.length)
    .map((r) => ({ ...r, text: r.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim() }));
  const idxVigore = pulite.findIndex((r) => /^In vigore/i.test(r.text));
  if (idxVigore < 0) throw new ParseError('Riga "In vigore dal ..." non trovata');
  const titolo = pulite.slice(0, idxVigore).map((r) => r.text).join(' · ');
  const note = {};
  const avvertenze = [];
  const blocchiVigore = [];
  let notaCorrente = null;
  for (const r of pulite.slice(idxVigore)) {
    const n = /^(\d+)\.\s*(.*)$/.exec(r.text);
    if (n) {
      notaCorrente = n[1];
      note[notaCorrente] = n[2];
    } else if (/^\*/.test(r.text)) {
      avvertenze.push(r.text);
      notaCorrente = null;
    } else if (/^(In vigore|Rientro)/i.test(r.text)) {
      blocchiVigore.push(r.text);
      notaCorrente = null;
    } else if (notaCorrente) {
      note[notaCorrente] = `${note[notaCorrente]} ${r.text}`.trim();
    } else if (blocchiVigore.length) {
      blocchiVigore[blocchiVigore.length - 1] += ` ${r.text}`;
    } else {
      avvertenze.push(r.text);
    }
  }
  const { validita, riavvii } = parseValidita(blocchiVigore.join(' '));
  if (!validita.length) throw new ParseError('Periodo di validità non riconosciuto');

  // --- tabella ---
  const fine = tutte.find((r) => /^L[’']elenco degli allergeni/.test(r.text));
  const yFondo = fine ? fine.y + 1 : -Infinity;
  const tab = items.filter((i) => i.y < hy - 2 && i.y > yFondo);
  const etichette = tab
    .filter((i) => i.x < sinistra - 20 && /^[1-9]$/.test(i.str) && i.h > 6)
    .sort((a, b) => b.y - a.y);
  if (!etichette.length) throw new ParseError('Nessun numero di settimana trovato');
  // Righe di settimana: prima i rettangoli di ritaglio delle celle, altrimenti le lacune verticali del testo.
  const celle = rects.filter((r) => r.y1 < hy && r.y1 - r.y0 > 40 && r.x1 - r.x0 > 100 && r.x1 - r.x0 < 250 && r.x0 >= sinistra - 5);
  const bande = [...new Map(celle.map((r) => [Math.round(r.y0), r])).values()].sort((a, b) => b.y1 - a.y1);
  let taglio;
  if (bande.length === etichette.length) {
    taglio = [Infinity, ...bande.slice(0, -1).map((b, k) => (b.y0 + bande[k + 1].y1) / 2), -Infinity];
  } else {
    taglio = tagliPerLacune(tab, etichette, sinistra);
  }

  const settimane = {};
  const intervalli = [];
  etichette.forEach((et, k) => {
    const alto = taglio[k];
    const basso = taglio[k + 1];
    const dentro = tab.filter((i) => i.y < alto && i.y >= basso && i !== et);
    // date nella colonna di sinistra
    const testoDate = righe(dentro.filter((i) => i.x + i.w / 2 < sinistra)).map((r) => r.text).join(' ');
    const date = tutteLeDate(testoDate);
    for (let d = 0; d + 1 < date.length; d += 2) intervalli.push({ settimana: Number(et.str), dal: date[d], al: date[d + 1] });
    if (date.length % 2) throw new ParseError(`Settimana ${et.str}: numero dispari di date (${testoDate})`);
    // celle
    const giorni = {};
    for (const col of colonne) {
      const cella = dentro.filter((i) => i.x + i.w / 2 >= sinistra && assegnaColonna(i.x + i.w / 2, colonne) === col.giorno);
      const marcatori = cella.filter((i) => /^\d$/.test(i.str) && i.h < 6);
      const testo = cella.filter((i) => !marcatori.includes(i));
      const linee = righe(testo);
      for (const m of marcatori) {
        const target = linee.filter((l) => l.y <= m.y + 1 && m.y - l.y < 9).sort((a, b) => b.y - a.y)[0];
        if (target) target.text += apice(m.str);
      }
      giorni[col.giorno] = righeInPiatti(linee.map((l) => l.text));
    }
    settimane[et.str] = giorni;
  });

  // Alcuni PDF scrivono il rimando alla nota come "(1)" invece che in apice.
  for (const sett of Object.values(settimane)) {
    for (const [g, lista] of Object.entries(sett)) {
      sett[g] = lista.map((p) => p.replace(/\s*\((\d)\)/g, (m, n) => (note[n] ? apice(n) : m)).replace(/\s+/g, ' '));
    }
  }

  const annoRif = validita[0].dal;
  const { feed, stagione } = classifica(titolo);
  const eccezioni = Object.entries(note).flatMap(([nota, testo]) =>
    eccezioniDaNota(testo).map((e) => ({ nota: Number(nota), ...e }))
  );

  return {
    feed,
    stagione,
    annoScolastico: annoScolasticoDi(annoRif),
    titolo,
    validita,
    riavvii,
    intervalli,
    settimane,
    note,
    eccezioni,
    avvertenze,
    fonte: { ...meta }
  };
}

export { GIORNI_LAVORO };

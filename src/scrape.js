// Scraping di https://www.scuoledussmann.it/padova: elenco PDF dei menu e notizie di variazione.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeEntities, htmlInTesto } from './lib/html.js';

export const BASE = 'https://www.scuoledussmann.it';
export const PAGINA = `${BASE}/padova`;
const UA = 'menu-scuole-padova (progetto open source non ufficiale; https://github.com/gbonanome/menu-scuole-padova)';

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const dormi = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetcher di rete con pochi tentativi e pausa tra le richieste (siamo ospiti di un sito altrui).
 * `condizioni` = { etag, lastModified } per richieste condizionali; una 304 restituisce { notModified: true }.
 */
export function fetcherRete({ pausaMs = 400, tentativi = 3 } = {}) {
  return async function get(url, condizioni = {}) {
    let ultimo;
    for (let t = 1; t <= tentativi; t++) {
      try {
        await dormi(pausaMs);
        const headers = { 'user-agent': UA };
        if (condizioni.etag) headers['if-none-match'] = condizioni.etag;
        if (condizioni.lastModified) headers['if-modified-since'] = condizioni.lastModified;
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
        if (res.status === 304) return { notModified: true };
        if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
        return {
          body: Buffer.from(await res.arrayBuffer()),
          etag: res.headers.get('etag') ?? undefined,
          lastModified: res.headers.get('last-modified') ?? undefined
        };
      } catch (e) {
        ultimo = e;
        await dormi(1000 * t);
      }
    }
    throw ultimo;
  };
}

/** Fetcher che legge da una cartella di fixture (test e sviluppo offline). */
export function fetcherFixture(dir) {
  return async function get(url) {
    const u = new URL(url);
    let file;
    if (u.pathname === '/padova') file = 'padova.html';
    else if (u.pathname.endsWith('.pdf')) file = path.join('pdf', path.basename(u.pathname));
    else if (u.pathname.endsWith('anteprimanotizia.php')) file = path.join('notizie', `anteprima-num${u.searchParams.get('num')}.html`);
    else if (u.pathname.endsWith('notizia.php')) file = path.join('notizie', `${u.searchParams.get('id')}.html`);
    else throw new Error(`Nessuna fixture per ${url}`);
    try {
      return { body: await readFile(path.join(dir, file)) };
    } catch {
      // le anteprime oltre l'ultima fixture equivalgono a "fine elenco"
      if (file.includes('anteprima')) return { body: Buffer.from('') };
      throw new Error(`Fixture mancante: ${file}`);
    }
  };
}

/** Link ai PDF dei menu nella pagina (esclusa la modulistica). Gli URL cambiano a ogni pubblicazione. */
export function estraiLinkPdf(html) {
  const out = new Map();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeEntities(m[1]);
    if (/modul/i.test(href)) continue;
    const url = new URL(href, `${BASE}/`).href;
    if (!out.has(url)) out.set(url, htmlInTesto(m[2]));
  }
  return [...out].map(([url, testoLink]) => ({ url, testoLink }));
}

const dataIt = (s) => {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/** Anteprime delle notizie (carosello): id, titolo, data di pubblicazione. */
export function estraiNotizie(html) {
  const out = [];
  for (const m of html.matchAll(/<article class="notizia"[\s\S]*?<\/article>/g)) {
    const id = /name="newsid" value="(post_\d+)"/.exec(m[0])?.[1];
    const titolo = /<h1>([\s\S]*?)<\/h1>/.exec(m[0])?.[1];
    const data = /Pubblicato il:\s*([\d-]+)/.exec(m[0])?.[1];
    if (id && titolo && data) out.push({ id, titolo: htmlInTesto(titolo), pubblicata: dataIt(data) });
  }
  return out;
}

/**
 * Elenco notizie dalla pagina principale e dalle pagine successive del carosello
 * (`anteprimanotizia.php?num=N` restituisce le 3 notizie fino alla N-esima), fino a `dal`.
 */
export async function elencoNotizie(get, htmlPagina, { dal, maxPagine = 15 } = {}) {
  const tutte = estraiNotizie(htmlPagina);
  for (let num = 6, i = 0; i < maxPagine; num += 3, i++) {
    if (tutte.length && tutte.at(-1).pubblicata < dal) break;
    const { body } = await get(`${BASE}/azioni/anteprimanotizia.php?num=${num}&appalto=2`);
    const nuove = estraiNotizie(body.toString('utf8'));
    if (!nuove.length) break;
    tutte.push(...nuove.filter((n) => !tutte.some((t) => t.id === n.id)));
  }
  return tutte.filter((n) => n.pubblicata >= dal);
}

/** Contenuto di una notizia: GET azioni/notizia.php?id=post_XXXXX (frammento HTML). */
export async function contenutoNotizia(get, id) {
  const { body } = await get(`${BASE}/azioni/notizia.php?id=${id}`);
  const html = body.toString('utf8');
  const titolo = /<h2>([\s\S]*?)<\/h2>/.exec(html)?.[1];
  const data = /<div class="data">\s*([\d-]+)/.exec(html)?.[1];
  if (!titolo || !data) throw new Error(`Formato imprevisto per la notizia ${id}`);
  const corpo = html.slice(html.indexOf('</h2>') + 5).replace(/<div class="contimgnews">[\s\S]*$/, '');
  return { id, titolo: htmlInTesto(titolo), pubblicata: dataIt(data), testo: htmlInTesto(corpo) };
}

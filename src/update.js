// Orchestratore: scrape -> parse -> validazione -> dati versionati (data/) + report.
// Uso: node src/update.js [--offline fixtures] [--oggi YYYY-MM-DD] [--dry] [--report file.json]
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { annoScolasticoDi, toIso } from './lib/dates.js';
import { caricaCalendario } from './lib/calendario.js';
import { parseMenuPdf } from './parse-menu.js';
import { parseVariazione } from './parse-variation.js';
import { validaMenu } from './validate.js';
import { PAGINA, contenutoNotizia, elencoNotizie, estraiLinkPdf, fetcherFixture, fetcherRete, sha256 } from './scrape.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATI = path.join(RADICE, 'data');

const leggiJson = async (p, def) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return def;
  }
};
const scriviJson = async (p, obj) => {
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, `${JSON.stringify(obj, null, 2)}\n`);
};
const confrontabile = (m) => JSON.stringify({ ...m, fonte: undefined });

export async function aggiorna({ get, oggi, dry = false, dati = DATI }) {
  const anno = annoScolasticoDi(oggi);
  const cal = caricaCalendario();
  const statoPath = path.join(dati, 'state.json');
  const stato = await leggiJson(statoPath, { pdf: {}, notizie: {} });
  stato.pdf ??= {};
  stato.notizie ??= {};
  const rep = { oggi, annoScolastico: anno, menuNuovi: [], menuModificati: [], pdfIgnorati: [], errori: [], avvisi: [], variazioniNuove: [], variazioniDaVerificare: [] };

  // ---- pagina principale ----
  const pagina = (await get(PAGINA)).body.toString('utf8');

  // ---- PDF dei menu ----
  const link = estraiLinkPdf(pagina);
  if (link.length < 4) rep.errori.push(`Trovati solo ${link.length} link a PDF nella pagina: il sito è cambiato?`);
  const perChiave = new Map();
  for (const { url } of link) {
    const noto = stato.pdf[url];
    try {
      const r = await get(url, noto ? { etag: noto.etag, lastModified: noto.lastModified } : {});
      if (r.notModified) continue;
      const hash = sha256(r.body);
      if (noto && noto.sha256 === hash) continue; // invariato
      const menu = await parseMenuPdf(r.body, { url, sha256: hash, scaricatoIl: oggi });
      stato.pdf[url] = { sha256: hash, etag: r.etag, lastModified: r.lastModified, feed: menu.feed, stagione: menu.stagione, annoScolastico: menu.annoScolastico, visto: noto?.visto ?? oggi };
      if (menu.annoScolastico !== anno) {
        rep.pdfIgnorati.push(`${url.split('/').pop()}: anno scolastico ${menu.annoScolastico}, atteso ${anno}`);
        stato.pdf[url].ignorato = `anno ${menu.annoScolastico}`;
        continue;
      }
      const { errori, avvisi } = validaMenu(menu, cal);
      const nome = `${menu.feed}/${menu.annoScolastico}-${menu.stagione}`;
      rep.avvisi.push(...avvisi.map((a) => `${nome}: ${a}`));
      if (errori.length) {
        rep.errori.push(...errori.map((e) => `${nome}: ${e}`));
        delete stato.pdf[url]; // sarà ritentato al prossimo giro
        continue;
      }
      if (perChiave.has(nome)) {
        rep.errori.push(`${nome}: due PDF diversi per lo stesso menu (${perChiave.get(nome)} e ${url})`);
        continue;
      }
      perChiave.set(nome, url);
      const file = path.join(dati, 'menus', menu.feed, `${menu.annoScolastico}-${menu.stagione}.json`);
      const prec = await leggiJson(file, null);
      if (!prec) rep.menuNuovi.push(nome);
      else if (confrontabile(prec) !== confrontabile(menu)) rep.menuModificati.push(nome);
      else continue;
      if (!dry) await scriviJson(file, menu);
    } catch (e) {
      rep.errori.push(`PDF ${url.split('/').pop()}: ${e.message}`);
      delete stato.pdf[url];
    }
  }

  // ---- notizie ----
  const dal = `${anno.slice(0, 4)}-08-15`;
  const recenti = toIso(new Date(Date.parse(`${oggi}T00:00:00Z`) - 21 * 86400000));
  const elenco = await elencoNotizie(get, pagina, { dal });
  for (const n of elenco) {
    const noto = stato.notizie[n.id];
    if (noto && n.pubblicata < recenti) continue; // vecchia e già vista
    try {
      const cont = await contenutoNotizia(get, n.id);
      const hash = sha256(Buffer.from(`${cont.titolo}\n${cont.testo}`));
      if (noto?.sha256 === hash) continue;
      const file = path.join(dati, 'notizie', `${n.id}.json`);
      if (!dry) await scriviJson(file, { ...cont, sha256: hash });
      stato.notizie[n.id] = { titolo: cont.titolo, pubblicata: cont.pubblicata, sha256: hash };
      const v = parseVariazione(cont);
      const eVar = /variazion/i.test(cont.titolo);
      if (eVar) {
        (noto ? rep.avvisi : rep.variazioniNuove).push(noto ? `Notizia modificata: ${n.id} ${cont.titolo}` : `${n.id} ${cont.titolo} (${v.confidenza})`);
        if (v.confidenza !== 'alta') rep.variazioniDaVerificare.push(`${n.id} ${cont.titolo}: ${v.confidenza}${v.motivi.length ? ` – ${v.motivi.join('; ')}` : ''}`);
      }
    } catch (e) {
      rep.errori.push(`Notizia ${n.id}: ${e.message}`);
    }
  }

  // variations.json è derivato dalle notizie grezze (funzione pura, sempre rigenerabile)
  const dirN = path.join(dati, 'notizie');
  const variazioni = [];
  for (const f of (await readdir(dirN).catch(() => [])).sort()) {
    const cont = await leggiJson(path.join(dirN, f), null);
    if (cont && /variazion/i.test(cont.titolo)) variazioni.push(parseVariazione(cont));
  }
  variazioni.sort((a, b) => a.pubblicata.localeCompare(b.pubblicata) || a.id.localeCompare(b.id));

  if (!dry) {
    await scriviJson(statoPath, stato);
    await scriviJson(path.join(dati, 'variations.json'), variazioni);
  }
  return rep;
}

// ---- CLI ----
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (n) => {
    const i = process.argv.indexOf(n);
    return i > 0 ? process.argv[i + 1] : undefined;
  };
  const offline = arg('--offline');
  const get = offline ? fetcherFixture(path.resolve(offline)) : fetcherRete();
  const oggi = arg('--oggi') ?? toIso(new Date());
  const rep = await aggiorna({ get, oggi, dry: process.argv.includes('--dry'), dati: arg('--dati') ? path.resolve(arg('--dati')) : DATI });
  const out = JSON.stringify(rep, null, 2);
  if (arg('--report')) await writeFile(arg('--report'), `${out}\n`);
  console.log(out);
  process.exitCode = rep.errori.length ? 2 : 0;
}

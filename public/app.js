// Menu Scuole Padova — pagina statica, vanilla JS, nessuna dipendenza. Direzione visiva B "Vassoio".
import {
  CHIAVE_LINGUA,
  LINGUE,
  applicaTesti,
  caricaLingua,
  daIso,
  dataConAnno,
  dataLunga,
  dataLungaConAnno,
  etichettaSettimana,
  giornoBreve,
  giornoEMese,
  giornoENumero,
  iso,
  linguaAttiva,
  linguaIniziale,
  linkTraduzione,
  nomeGiorno,
  numeroGiorno,
  piatto,
  piuGiorni,
  t,
  tDato,
  testoCambioStagione,
  testoCiclo,
  testoGiornoVuoto,
  testoOggi as testoOggiDi
} from './i18n.js';
import { disegnaMese, giornoAttivo, limitiMesi, meseDaMostrare } from './mese.js';

const REPO = 'https://github.com/gbonanome/menu-scuole-padova';
const FONTE_NOTIZIE = 'https://www.scuoledussmann.it/padova#notizie';
const CHIAVE = 'menu-scuole-padova:scelta';

const $ = (sel) => document.querySelector(sel);
const stato = {
  feeds: [],
  scuole: [],
  meta: null,
  feed: null,
  scuola: null,
  giorni: new Map(),
  copertura: null,
  lunedi: null,
  mese: null,
  scelte: [],
  attiva: null,
  modo: 'aggiungi',
  carica: 0,
  dettagli: false
};

// ---------- utilità ----------
function el(tag, attrs = {}, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of figli.flat(Infinity)) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}

// Date e testi composti sono in i18n.js: in italiano restano identici, nelle altre lingue passano da Intl.
/** Lunedì della settimana; sabato e domenica portano alla settimana dopo. */
function lunediDi(s) {
  const g = daIso(s).getDay();
  if (g === 6) return piuGiorni(s, 2);
  if (g === 0) return piuGiorni(s, 1);
  return piuGiorni(s, 1 - g);
}
// ?oggi=AAAA-MM-GG mostra la pagina come se fosse quel giorno (utile per prove e screenshot).
const OGGI_PROVA = /^\d{4}-\d{2}-\d{2}$/.test(new URLSearchParams(location.search).get('oggi') ?? '') ? new URLSearchParams(location.search).get('oggi') : null;
const oggi = () => OGGI_PROVA ?? iso(new Date());
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'.]/g, ' ').replace(/\s+/g, ' ').trim();
// Nomi dei menu e ordini di scuola vengono dai dati, in italiano: si traducono solo se la lingua ha la chiave.
const nomeFeed = (f) => tDato(`feed.${f.slug}`, f.nome);
const breveFeed = (f) => tDato(`feed.${f.slug}.breve`, f.breve);
const nomeOrdine = (o) => tDato(`ordine.${o}`, o);

const salva = (v) => {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(v));
  } catch {}
};
const leggi = () => {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE) ?? 'null');
  } catch {
    return null;
  }
};

async function json(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

// ---------- scelta della scuola ----------
function mostraRisultati(q) {
  const ul = $('#risultati');
  ul.replaceChildren();
  const nq = norm(q);
  if (nq.length < 2) return;
  const trovate = stato.scuole.filter((s) => norm(s.nome).includes(nq)).slice(0, 10);
  if (!trovate.length) {
    ul.append(el('li', { class: 'vuoto' }, t('scelta.nessuna')));
    return;
  }
  for (const s of trovate) {
    const f = stato.feeds.find((x) => x.slug === s.feed);
    ul.append(
      el(
        'li',
        {},
        el(
          'button',
          { type: 'button', onclick: () => scegliVoce(voceDiScuola(s)) },
          el('span', { class: 'nome' }, s.nome),
          el('span', { class: 'dettaglio' }, `${nomeOrdine(s.ordine)}${s.ic ? ` · ${t('scelta.ic', s.ic)}` : ''} · ${f ? breveFeed(f) : s.feed}`)
        )
      )
    );
  }
}

// La segnalazione va al manutentore su GitHub: resta in italiano in ogni lingua (nomi di scuole e menu
// come nei dati), con la lingua della pagina in fondo se non è l'italiano.
function linkSegnalazione() {
  const s = stato.scuola;
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!s && !f) return `${REPO}/issues/new`;
  const titolo = s ? `Scuola ${s.nome}: menu da verificare` : `Menu ${f?.breve}: segnalazione`;
  const corpo = [
    s ? `Scuola: ${s.nome} (${s.ordine})` : '',
    `Menu mostrato: ${f?.breve} (${stato.feed})`,
    '',
    'Cosa non torna? (es. la scuola usa un altro menu, un giorno è sbagliato…)',
    '',
    ...(linguaAttiva() === 'it' ? [] : [`Lingua della pagina: ${linguaAttiva()}`])
  ].join('\n');
  return `${REPO}/issues/new?title=${encodeURIComponent(titolo)}&body=${encodeURIComponent(corpo)}`;
}

function mostraPicker(aperto, modo = stato.modo) {
  stato.modo = modo;
  $('#scelta').hidden = !aperto;
  $('#cambia').setAttribute('aria-expanded', String(aperto && modo === 'cambia'));
  mostraTitoloScelta();
  $('#annulla').hidden = !stato.attiva;
  $('#risultati').replaceChildren();
  $('#cerca-scuola').value = '';
  $('#scegli-feed').value = '';
  if (aperto && stato.attiva) $('#cerca-scuola').focus();
}

function mostraTitoloScelta() {
  $('#titolo-scelta').textContent = !stato.attiva
    ? t('scelta.titolo')
    : stato.modo === 'cambia'
      ? t('scelta.titolo.cambia', etichetta(stato.attiva))
      : t('scelta.titolo.aggiungi');
}

function mostraScuola() {
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) return;
  const s = stato.scuola;
  $('#scuola-nome').textContent = s ? s.nome : nomeFeed(f);
  $('#scuola-feed').textContent = s ? nomeFeed(f) : t('scuola.dallelenco');
  const note = [];
  if (s?.avviso) note.push(el('p', { class: 'avviso', role: 'note' }, s.avviso));
  $('#scuola-note').replaceChildren(...note);
  $('#link-segnala').href = linkSegnalazione();
  mostraPannello();
  const salvata = stato.scelte.some((v) => v.id === stato.attiva?.id);
  $('#rimuovi').hidden = !salvata;
  // Il riquadro si apre toccando la pillola della scuola attiva; resta aperto se la scuola non è tra le salvate.
  $('#scuola').hidden = salvata && !stato.dettagli;
  document.querySelector('.chip[aria-controls="scuola"]')?.setAttribute('aria-expanded', String(!$('#scuola').hidden));
}

// ---------- scuole salvate (fino a 3) ----------
// Ogni scelta ha un id breve e leggibile: lo slug del nome della scuola, oppure lo slug del menu
// se è stato scelto dall'elenco. L'indirizzo le contiene tutte: ?scuola=montegrappa|la-coccinella#montegrappa
const MAX_SCUOLE = 3;
const slug = (t) =>
  norm(t)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const nomeBreve = (nome) => nome.replace(/\s*\(.*\)\s*$/, '');

function assegnaId() {
  const base = (s) => slug(nomeBreve(s.nome));
  const conta = {};
  for (const s of stato.scuole) conta[base(s)] = (conta[base(s)] ?? 0) + 1;
  const usati = new Set(stato.feeds.map((f) => f.slug));
  for (const s of stato.scuole) {
    let id = base(s);
    if (conta[id] > 1 || usati.has(id)) id = `${id}-${slug(s.ordine)}`;
    if (usati.has(id)) id = `${id}-${s.feed}`;
    const radice = id;
    for (let n = 2; usati.has(id); n++) id = `${radice}-${n}`;
    usati.add(id);
    s.id = id;
  }
}

const voceDiScuola = (s) => ({ id: s.id, feed: s.feed, scuola: s });
const voceDiFeed = (feed) => ({ id: feed, feed, scuola: null });

/** Da un id (o da un vecchio nome completo) alla scelta corrispondente. */
function risolvi(testo) {
  const k = slug(testo ?? '');
  if (!k) return null;
  const s = stato.scuole.find((x) => x.id === k) ?? stato.scuole.find((x) => slug(x.nome) === k);
  if (s) return voceDiScuola(s);
  return stato.feeds.some((f) => f.slug === k) ? voceDiFeed(k) : null;
}

function etichetta(v) {
  const f = stato.feeds.find((x) => x.slug === v.feed);
  const base = v.scuola ? nomeBreve(v.scuola.nome) : f ? breveFeed(f) : v.feed;
  const doppia = stato.scelte.some((x) => x.id !== v.id && (x.scuola ? nomeBreve(x.scuola.nome) : null) === base);
  return doppia && v.scuola ? `${base} · ${nomeOrdine(v.scuola.ordine)}` : base;
}

function salvaScelte() {
  salva({ scelte: stato.scelte.map((v) => v.id), attiva: stato.attiva?.id ?? null });
  aggiornaIndirizzo();
}

/**
 * Le scuole vanno anche nell'indirizzo: l'icona sulla schermata Home di iPhone non vede quanto salvato in Safari.
 * Così la lingua: ?lingua= dice quella mostrata (assente se italiano), e l'icona aggiunta da qui la ricorda.
 * Gli altri parametri (per esempio ?oggi=) restano come sono; dopo # solo la scuola aperta.
 */
function aggiornaIndirizzo() {
  const p = new URLSearchParams(location.search);
  p.delete('scuola');
  p.delete('lingua');
  if (linguaAttiva() !== 'it') p.set('lingua', linguaAttiva());
  const ids = stato.scelte.map((v) => v.id).join('|');
  const query = [ids ? `scuola=${ids}` : '', p.toString()].filter(Boolean).join('&');
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${stato.attiva ? `#${stato.attiva.id}` : ''}`);
  aggiornaManifest();
}

// L'icona sulla schermata Home parte da start_url del manifest: lo teniamo uguale all'indirizzo attuale
// (scuole salvate e scuola aperta), altrimenti iPhone userebbe l'indirizzo con cui la pagina era stata caricata.
let manifestBase = null;
async function caricaManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return;
  try {
    manifestBase = { url: link.href, dati: await json(link.href) };
  } catch (e) {
    console.error(e);
  }
}
function aggiornaManifest() {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link || !manifestBase) return;
  const abs = (u) => new URL(u, manifestBase.url).href;
  const m = {
    ...manifestBase.dati,
    id: abs(manifestBase.dati.id ?? './'),
    scope: abs(manifestBase.dati.scope ?? './'),
    start_url: location.href,
    icons: (manifestBase.dati.icons ?? []).map((i) => ({ ...i, src: abs(i.src) }))
  };
  link.href = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(JSON.stringify(m))}`;
}

/** Matita accanto al nome della scuola attiva: fa capire che la pillola si può toccare. */
function iconaModifica() {
  const span = el('span', { class: 'matita', 'aria-hidden': 'true' });
  span.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';
  return span;
}

function mostraSwitcher() {
  const nav = $('#scuole-salvate');
  if (!stato.scelte.length) {
    nav.replaceChildren();
    nav.hidden = true;
    return;
  }
  nav.replaceChildren(
    ...[
      ...stato.scelte.map((v) =>
        v.id === stato.attiva?.id
          ? el(
              'button',
              {
                type: 'button',
                class: 'chip',
                'aria-pressed': 'true',
                'aria-controls': 'scuola',
                'aria-expanded': String(stato.dettagli),
                title: t('scuole.dettagli'),
                onclick: () => {
                  stato.dettagli = !stato.dettagli;
                  mostraScuola();
                }
              },
              etichetta(v),
              iconaModifica()
            )
          : el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => attiva(v) }, etichetta(v))
      ),
      stato.scelte.length < MAX_SCUOLE
        ? el(
            'button',
            {
              type: 'button',
              class: 'chip aggiungi',
              'aria-label': t('scuole.aggiungi.aria'),
              'aria-controls': 'scelta',
              onclick: () => mostraPicker(true, 'aggiungi')
            },
            t('scuole.aggiungi')
          )
        : null
    ].filter(Boolean)
  );
  nav.hidden = false;
}

/** Una scuola scelta dalla ricerca o dall'elenco dei menu. */
function scegliVoce(voce) {
  if (!voce) return;
  const gia = stato.scelte.find((v) => v.id === voce.id);
  if (gia) return attiva(gia);
  const i = stato.scelte.findIndex((v) => v.id === stato.attiva?.id);
  if (stato.modo === 'cambia' && i >= 0) stato.scelte[i] = voce;
  else if (stato.scelte.length < MAX_SCUOLE) stato.scelte.push(voce);
  else stato.scelte[i >= 0 ? i : stato.scelte.length - 1] = voce;
  attiva(voce);
}

function rimuovi() {
  stato.scelte = stato.scelte.filter((v) => v.id !== stato.attiva?.id);
  if (stato.scelte.length) return attiva(stato.scelte[0]);
  stato.attiva = stato.feed = stato.scuola = null;
  chiudiMese();
  for (const id of ['#scuola', '#oggi-box', '#mese', '#oggi-riga', '#settimana', '#iscriviti']) $(id).hidden = true;
  salvaScelte();
  mostraSwitcher();
  mostraBarra();
  mostraPannello();
  $('#link-segnala').href = linkSegnalazione();
  mostraPicker(true, 'aggiungi');
}

async function attiva(voce) {
  stato.dettagli = false;
  stato.attiva = voce;
  stato.feed = voce.feed;
  stato.scuola = voce.scuola;
  salvaScelte();
  mostraSwitcher();
  mostraBarra();
  mostraPicker(false);
  mostraScuola();
  mostraIscrizione();
  const n = ++stato.carica;
  let giorni = new Map();
  let copertura = null;
  try {
    const dati = await json(`data/${voce.feed}.json`);
    giorni = new Map(dati.giorni.map((g) => [g.data, g]));
    copertura = dati.copertura;
  } catch (e) {
    console.error(e);
  }
  if (n !== stato.carica) return; // nel frattempo è stata scelta un'altra scuola
  stato.giorni = giorni;
  stato.copertura = copertura;
  stato.lunedi = lunediDi(oggi());
  stato.mese = null;
  mostraOggi();
  mostraRigaOggi();
  mostraSettimana();
}

// ---------- piatti e variazioni ----------
const eVariato = (g, i) => g.originali && !g.menuSostituito && g.originali[i] !== g.piatti[i];

/** Attributi per un testo lasciato in italiano in una pagina in un'altra lingua (anche da destra a sinistra). */
const testoItaliano = () => (linguaAttiva() === 'it' ? {} : { lang: 'it', dir: 'ltr' });

/**
 * Riquadri "Variazione" di un giorno: cosa si serve, al posto di cosa, e il testo dell'avviso.
 * Il testo dell'avviso resta in italiano: nelle altre lingue sotto c'è il link a Google Traduttore.
 */
function riquadriVariazione(g) {
  if (!g.variazioni?.length) return [];
  const cambi = [];
  g.piatti.forEach((p, i) => {
    if (eVariato(g, i) && !cambi.some((c) => c.nuovo === p && c.vecchio === g.originali[i])) cambi.push({ nuovo: p, vecchio: g.originali[i] });
  });
  return g.variazioni.map((v, k) => {
    const strutturata = k === 0 && (cambi.length || g.menuSostituito);
    const pubblicata = t('variazione.pubblicata', giornoEMese(v.pubblicata));
    return el(
      'div',
      { class: 'vbox', role: 'note' },
      el('span', { class: 'vt' }, t('variazione.titolo')),
      strutturata && g.menuSostituito
        ? [
            el('span', { class: 'vnew' }, t('variazione.sostitutivo')),
            el('span', { class: 'vold' }, t('variazione.alposto', g.originali.filter((p) => p !== 'oppure').map(piatto).join(', ')))
          ]
        : null,
      strutturata && !g.menuSostituito
        ? cambi.map((c) => [el('span', { class: 'vnew' }, piatto(c.nuovo)), el('span', { class: 'vold' }, t('variazione.alposto', piatto(c.vecchio)))])
        : null,
      !strutturata ? el('span', { class: 'vnew' }, t('variazione.generica')) : null,
      el('span', { class: 'vsrc' }, pubblicata, ' · ', el('a', { href: FONTE_NOTIZIE }, t('variazione.fonte'))),
      el('details', { open: !strutturata }, el('summary', {}, t('variazione.testo')), el('p', { class: 'vtesto', ...testoItaliano() }, v.testo)),
      linguaAttiva() !== 'it' && v.testo
        ? el('span', { class: 'vsrc' }, el('a', { href: linkTraduzione(v.testo), target: '_blank', rel: 'noopener' }, t('variazione.traduci')))
        : null
    );
  });
}

// Il piatto "principale" (in evidenza) è il primo che non sia pane, frutta o verdura generica.
const GENERICO = /^(pane|frutta|verdura (?:cruda|cotta)|bis di verdura|yogurt)/i;
const indicePrincipale = (piatti) =>
  Math.max(
    0,
    piatti.findIndex((p) => p !== 'oppure' && !GENERICO.test(p))
  );

function elencoPiatti(g, classe, conScomparti) {
  const principale = indicePrincipale(g.piatti);
  return el(
    'ul',
    { class: classe },
    g.piatti.map((p, i) => {
      if (p === 'oppure') return el('li', { class: 'oppure' }, t('oppure'));
      const testo = conScomparti ? el('span', { class: 'dish' }, piatto(p)) : piatto(p);
      const classi = [i === principale ? 'principale' : '', eVariato(g, i) ? 'changed' : ''].join(' ').trim();
      return el('li', { class: classi || null }, testo);
    })
  );
}

// ---------- oggi (vassoio, a tutte le larghezze) ----------
function mostraOggi() {
  const box = $('#oggi-box');
  const dataOggi = oggi();
  const g = stato.giorni.get(dataOggi);
  if (g?.stato === 'menu') {
    // "Oggi martedì 10"; da 700px anche il mese ("Oggi martedì 10 novembre"). Nelle altre lingue la data è già intera.
    const giorno = giornoENumero(dataOggi);
    const intera = dataLunga(dataOggi);
    const mese = intera.startsWith(giorno) ? intera.slice(giorno.length) : '';
    box.replaceChildren(
      el('p', { class: 'when' }, el('mark', {}, t('oggi')), ` ${giorno}`, mese ? el('span', { class: 'solo-largo' }, mese) : null),
      el('p', { class: 'meta' }, testoCiclo(g)),
      variazioniVassoio(g),
      elencoPiatti(g, 'tray', true)
    );
    box.setAttribute('aria-label', t('oggi.aria'));
    box.hidden = false;
    return;
  }
  // Oggi niente mensa: lo dice con la data di oggi, poi mostra il prossimo giorno con il menu (entro due settimane).
  let prossimo = null;
  for (let i = 1; i <= 14 && !prossimo; i++) {
    const d = piuGiorni(dataOggi, i);
    if (stato.giorni.get(d)?.stato === 'menu') prossimo = d;
  }
  if (!prossimo) {
    box.hidden = true;
    return;
  }
  const gp = stato.giorni.get(prossimo);
  box.replaceChildren(
    el('p', { class: 'oggi-nota' }, testoOggi()),
    el(
      'p',
      { class: 'when' },
      el('mark', {}, prossimo === piuGiorni(dataOggi, 1) ? t('domani') : maiuscola(nomeGiorno(prossimo))),
      ` ${giornoEMese(prossimo)}`
    ),
    el('p', { class: 'meta' }, testoCiclo(gp)),
    variazioniVassoio(gp),
    elencoPiatti(gp, 'tray', true)
  );
  box.setAttribute('aria-label', t('oggi.prossimo.aria'));
  box.hidden = false;
}

/** Riquadri di variazione del vassoio, insieme: da 700px vanno sotto data e scomparti, a tutta larghezza. */
function variazioniVassoio(g) {
  const riquadri = riquadriVariazione(g);
  return riquadri.length ? el('div', { class: 'vboxes' }, riquadri) : null;
}

const maiuscola = (s) => s.replace(/^./, (c) => c.toUpperCase());

/** Dati per i testi di un giorno senza menu (testoOggi e testoGiornoVuoto in i18n.js). */
const giornoSenzaMenu = (data) => ({ data, giorno: stato.giorni.get(data), nido: !!stato.feed?.startsWith('nido'), dal: stato.copertura?.dal });

/** "Oggi, domenica 8 novembre: niente mensa." con il motivo quando c'è. */
const testoOggi = () => testoOggiDi(giornoSenzaMenu(oggi()));

/** Riga sopra la settimana quando oggi non c'è mensa e manca anche il vassoio (nessun menu nei prossimi 14 giorni). */
function mostraRigaOggi() {
  const riga = $('#oggi-riga');
  const dataOggi = oggi();
  if (stato.giorni.get(dataOggi)?.stato === 'menu' || !$('#oggi-box').hidden) {
    riga.hidden = true;
    return;
  }
  const lun = lunediDi(dataOggi);
  const extra = lun > dataOggi ? ` ${t('oggi.prossimasettimana')}` : '';
  riga.textContent = testoOggi() + extra;
  riga.hidden = false;
}

// ---------- settimana ----------
function cardGiorno(data, precedente) {
  const g = stato.giorni.get(data);
  const eOggi = data === oggi();
  const intestazione = el('h3', { class: 'dname' }, numeroGiorno(data), el('small', {}, eOggi ? t('giorno.oggi') : giornoBreve(data)));
  const etichetta = eOggi ? t('giorno.oggi.aria', dataLunga(data)) : dataLunga(data);
  if (!g || g.stato !== 'menu') {
    const testo = testoGiornoVuoto(giornoSenzaMenu(data));
    return el(
      'article',
      { class: `day ${g?.stato === 'chiuso' ? 'closed' : 'empty'}${eOggi ? ' is-today' : ''}`, 'aria-label': etichetta, 'aria-current': eOggi ? 'date' : null },
      intestazione,
      el('p', { class: 'reason' }, testo)
    );
  }
  const cambioStagione = precedente?.stato === 'menu' && precedente.stagione !== g.stagione;
  return el(
    'article',
    { class: `day${eOggi ? ' is-today' : ''}${g.variazioni.length ? ' varied' : ''}`, 'aria-label': etichetta, 'aria-current': eOggi ? 'date' : null },
    intestazione,
    cambioStagione ? el('p', { class: 'season' }, testoCambioStagione(g)) : null,
    ...riquadriVariazione(g),
    elencoPiatti(g, null, false),
    el('p', { class: 'ciclo' }, testoCiclo(g))
  );
}

function mostraSettimana(fuocoMese = null) {
  $('#settimana').hidden = false;
  const cont = $('#giorni');
  cont.replaceChildren();
  let prec = stato.giorni.get(piuGiorni(stato.lunedi, -3));
  for (let i = 0; i < 5; i++) {
    const d = piuGiorni(stato.lunedi, i);
    cont.append(cardGiorno(d, prec));
    prec = stato.giorni.get(d) ?? prec;
  }
  mostraTitoloSettimana();
  $('#oggi').disabled = stato.lunedi === lunediDi(oggi());
  // Il mese segue la settimana (frecce, "Oggi", scelta di un giorno, cambio di scuola o di lingua).
  stato.mese = meseDaMostrare(stato.mese, stato.lunedi, oggi());
  mostraMese(fuocoMese);
}

// ---------- mini mese ----------
// Un solo componente (mese.js), in un contenitore diverso per larghezza:
// da 900px sempre visibile accanto al vassoio (#mese); 700–899px in un riquadro sotto la navigazione,
// aperto dal titolo della settimana (#mese-pop); sotto i 700px in un foglio dal basso (#mese-foglio),
// aperto dalla voce Mese della barra in basso ([data-azione="mese"]).
const LARGO = matchMedia('(min-width: 900px)');
const MEDIO = matchMedia('(min-width: 700px) and (max-width: 899.98px)');
const quadroMese = el('div', { id: 'mini-mese', class: 'mini-mese' });
const bottoneMese = el(
  'button',
  { type: 'button', class: 'apri-mese', 'aria-expanded': 'false', 'aria-controls': 'mese-pop' },
  el('span', {}),
  el('span', { class: 'freccina', 'aria-hidden': 'true' }, '▾')
);

/** Titolo della settimana: tra 700 e 899px è il pulsante che apre il mese, altrimenti testo. */
function mostraTitoloSettimana() {
  const h2 = $('#titolo-settimana');
  const testo = etichettaSettimana(stato.lunedi);
  if (!MEDIO.matches) {
    h2.textContent = testo;
    return;
  }
  bottoneMese.firstChild.textContent = testo;
  bottoneMese.title = t('mese.apri');
  if (bottoneMese.parentNode !== h2) h2.replaceChildren(bottoneMese);
}

function mostraMese(fuoco = null) {
  if (!stato.lunedi || !stato.mese) return;
  disegnaMese(quadroMese, {
    mese: stato.mese,
    giorni: stato.giorni,
    oggi: oggi(),
    lunedi: stato.lunedi,
    limiti: limitiMesi(stato.giorni.keys(), stato.copertura),
    fuoco,
    suGiorno: scegliGiorno,
    suMese: (m, f) => {
      stato.mese = m;
      mostraMese(f);
    }
  });
  $('#mese').hidden = false;
  if (LARGO.matches && quadroMese.parentNode !== $('#mese')) $('#mese').append(quadroMese);
}

const popAperto = () => !$('#mese-pop').hidden;
const scorri = (e) => e.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });

/** Un giorno scelto nel mese: la sua settimana. Da 900px il mese resta aperto, altrimenti si chiude e si va alla settimana. */
function scegliGiorno(d) {
  const pop = popAperto();
  const foglio = $('#mese-foglio').open;
  stato.lunedi = lunediDi(d);
  mostraSettimana(LARGO.matches ? d : null);
  if (pop) {
    chiudiPopMese();
    bottoneMese.focus({ preventScroll: true });
  }
  if (foglio) {
    $('#mese-foglio').close();
    $('#settimana').focus({ preventScroll: true });
  }
  if (pop || foglio) scorri($('#settimana'));
}

function apriPopMese() {
  stato.mese = meseDaMostrare(stato.mese, stato.lunedi, oggi());
  $('#mese-pop').append(quadroMese);
  mostraMese();
  $('#mese-pop').hidden = false;
  bottoneMese.setAttribute('aria-expanded', 'true');
  giornoAttivo(quadroMese)?.focus();
}

function chiudiPopMese() {
  $('#mese-pop').hidden = true;
  bottoneMese.setAttribute('aria-expanded', 'false');
}

/** Apertura dalla barra in basso (o da qualsiasi [data-azione="mese"]): il contenitore dipende dalla larghezza. */
function apriMese() {
  if (!stato.lunedi) return;
  if (LARGO.matches) {
    scorri($('#mese'));
    giornoAttivo(quadroMese)?.focus({ preventScroll: true });
    return;
  }
  if (MEDIO.matches) return popAperto() ? chiudiPopMese() : apriPopMese();
  // Secondo tocco su "Mese" nella barra: chiude il foglio
  if ($('#mese-foglio').open) return $('#mese-foglio').close();
  stato.mese = meseDaMostrare(stato.mese, stato.lunedi, oggi());
  $('#mese-foglio-corpo').append(quadroMese);
  mostraMese();
  apriFoglio($('#mese-foglio'));
  giornoAttivo(quadroMese)?.focus();
}

function chiudiMese() {
  chiudiPopMese();
  if ($('#mese-foglio').open) $('#mese-foglio').close();
}

function collegaMese() {
  const foglio = $('#mese-foglio');
  bottoneMese.addEventListener('click', () => (popAperto() ? chiudiPopMese() : apriPopMese()));
  // Delegazione: la voce Mese della barra può arrivare dopo.
  document.addEventListener('click', (e) => {
    // Un clic su frecce o giorni ridisegna il mese: l'elemento toccato non è più nella pagina, ma non era "fuori".
    if (!e.target.isConnected) return;
    if (e.target.closest?.('[data-azione="mese"]')) {
      e.preventDefault();
      apriMese();
      return;
    }
    if (popAperto() && !$('#mese-pop').contains(e.target) && !bottoneMese.contains(e.target)) chiudiPopMese();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popAperto()) {
      chiudiPopMese();
      bottoneMese.focus();
    }
  });
  $('#chiudi-mese').addEventListener('click', () => foglio.close());
  // Tocco sullo sfondo del foglio: il clic arriva al <dialog> stesso, non al contenuto.
  foglio.addEventListener('click', (e) => {
    if (e.target === foglio) foglio.close();
  });
  const cambiaLarghezza = () => {
    chiudiMese();
    if (!stato.lunedi) return;
    mostraTitoloSettimana();
    if (LARGO.matches) mostraMese();
  };
  LARGO.addEventListener('change', cambiaLarghezza);
  MEDIO.addEventListener('change', cambiaLarghezza);
}

function sposta(settimane) {
  stato.lunedi = settimane === 0 ? lunediDi(oggi()) : piuGiorni(stato.lunedi, 7 * settimane);
  mostraSettimana();
}

// ---------- iscrizione al calendario e condivisione ----------
function mostraIscrizione() {
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) return;
  const https = new URL(f.ics, location.href).href;
  $('#link-webcal').href = https.replace(/^https?:/, 'webcal:');
  $('#link-webcal').textContent = stato.scelte.length > 1 ? t('cal.titolo.scuola', etichetta(stato.attiva)) : t('cal.titolo');
  $('#iscriviti').hidden = false;
}

/** Negli appunti; se il browser non lo permette, con il vecchio execCommand da un campo di testo. */
async function copiaTesto(testo, campo) {
  try {
    await navigator.clipboard.writeText(testo);
    return true;
  } catch {
    const c = campo ?? document.body.appendChild(el('textarea', { readonly: true, class: 'visually-hidden' }, testo));
    c.select();
    const ok = document.execCommand?.('copy') ?? false;
    if (!campo) c.remove();
    return ok;
  }
}

async function copia() {
  const input = $('#url-feed');
  await copiaTesto(input.value, input);
  $('#copiato').textContent = t('cal.copiato');
}

/**
 * Link alla pagina con la sola scuola aperta (più la lingua, se non è l'italiano): chi lo apre la trova
 * accanto alle sue scuole salvate. Niente ?oggi=, che serve solo alle prove.
 */
function linkCondivisione() {
  const v = stato.attiva;
  const p = new URLSearchParams({ scuola: v.id });
  if (linguaAttiva() !== 'it') p.set('lingua', linguaAttiva());
  return new URL(`${location.pathname}?${p}#${v.id}`, location.href).href;
}

let timerCondiviso = null;
async function condividi() {
  if (!stato.attiva) return;
  const url = linkCondivisione();
  const titolo = t('condividi.titolo', etichetta(stato.attiva));
  if (navigator.share) {
    try {
      await navigator.share({ title: titolo, text: titolo, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // chiuso senza condividere
    }
  }
  if (!(await copiaTesto(url))) return;
  const riga = $('#condiviso');
  riga.textContent = t('condividi.copiato');
  clearTimeout(timerCondiviso);
  timerCondiviso = setTimeout(() => (riga.textContent = ''), 4000);
}

// ---------- barra in basso (sotto i 700px) ----------
/** Oggi e Mese servono solo con una scuola scelta; Impostazioni c'è sempre. */
function mostraBarra() {
  $('#barra-oggi').hidden = !stato.attiva;
  $('#barra-mese').hidden = !stato.attiva;
}

const movimento = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/** Torna alla settimana corrente e porta in vista il vassoio di oggi (o la settimana, se il vassoio non c'è). */
function tornaAOggi() {
  chiudiFogli();
  if (!stato.lunedi) return;
  sposta(0);
  const meta = [$('#oggi-box'), $('#oggi-riga'), $('#settimana')].find((e) => !e.hidden);
  meta?.scrollIntoView({ behavior: movimento(), block: 'start' });
}

// ---------- fogli sopra la barra (sotto i 700px) ----------
// Sul telefono mese e impostazioni si aprono sopra la barra in basso, che resta visibile e usabile per
// passare dall'uno all'altro o tornare a Oggi. Per questo il <dialog> non è modale: un velo copre la pagina
// e la pagina diventa inerte, la barra no. Da 700px la barra non c'è e i pannelli restano modali.
const TELEFONO = matchMedia('(max-width: 699.98px)');
const fogli = () => [$('#mese-foglio'), $('#impostazioni')];

function apriFoglio(d) {
  if (!TELEFONO.matches) {
    if (!d.open) d.showModal();
    return;
  }
  for (const altro of fogli()) if (altro !== d && altro.open) altro.close();
  d.classList.add('sopra-barra');
  if (!d.open) d.show();
  aggiornaVelo();
}

function chiudiFogli() {
  for (const d of fogli()) if (d.open) d.close();
}

function aggiornaVelo() {
  const aperto = fogli().some((d) => d.open && d.classList.contains('sopra-barra'));
  $('#velo').hidden = !aperto;
  for (const figlio of $('.pagina').children) if (figlio.tagName !== 'DIALOG') figlio.inert = aperto;
  $('#barra-mese').setAttribute('aria-expanded', String($('#mese-foglio').open));
}

function preparaFogli() {
  for (const d of fogli()) {
    d.addEventListener('close', () => {
      d.classList.remove('sopra-barra');
      aggiornaVelo();
    });
  }
  $('#velo').addEventListener('click', chiudiFogli);
  // Un <dialog> non modale non si chiude da solo con Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#velo').hidden) {
      e.preventDefault();
      chiudiFogli();
    }
  });
  TELEFONO.addEventListener('change', chiudiFogli);
}

// ---------- pannello impostazioni ----------
// Un <dialog> modale: Esc lo chiude da solo, il tocco fuori e "Chiudi" lo chiudono qui. Alla chiusura il
// focus torna al pulsante che l'ha aperto. Non scrive nulla nell'indirizzo.
const PAROLA_LINGUA = { it: 'Lingua', en: 'Language', ro: 'Limba', zh: '语言' };
let apertoDa = null;

/** "Lingua · Language · Limba · 语言", con la parola della lingua attiva per prima. */
function titoloLingua() {
  const prima = t('impostazioni.lingua');
  const altre = Object.entries(PAROLA_LINGUA).filter(([, parola]) => parola !== prima);
  $('#titolo-lingua').replaceChildren(prima, ...altre.flatMap(([codice, parola]) => [' · ', el('span', { lang: codice, dir: 'ltr' }, parola)]));
}

/** Testi del pannello che dipendono dalla scuola aperta e dalla lingua. */
function mostraPannello() {
  titoloLingua();
  for (const b of document.querySelectorAll('[data-lingua]')) b.setAttribute('aria-pressed', String(b.dataset.lingua === linguaAttiva()));
  const f = stato.attiva && stato.feeds.find((x) => x.slug === stato.attiva.feed);
  $('#cal-nessuna').hidden = !!f;
  $('#cal-feed').hidden = !f;
  if (f) {
    $('#url-feed').value = new URL(f.ics, location.href).href;
    $('#etichetta-feed').textContent = t('cal.indirizzo', etichetta(stato.attiva));
  }
  $('#pannello-segnala').href = linkSegnalazione();
}

function apriImpostazioni(sezione) {
  const d = $('#impostazioni');
  apertoDa = document.activeElement;
  mostraPannello();
  apriFoglio(d);
  for (const b of document.querySelectorAll('[aria-controls="impostazioni"][aria-expanded]')) b.setAttribute('aria-expanded', 'true');
  if (sezione) {
    sezione.scrollIntoView({ block: 'start' });
    sezione.focus({ preventScroll: true });
  } else d.querySelector('.pannello-dentro').scrollTop = 0;
}

function preparaImpostazioni() {
  const d = $('#impostazioni');
  $('#apri-impostazioni').addEventListener('click', () => apriImpostazioni());
  // Nella barra la voce fa da interruttore: un secondo tocco chiude il pannello
  $('#barra-impostazioni').addEventListener('click', () => (d.open ? d.close() : apriImpostazioni()));
  $('#istruzioni').addEventListener('click', () => apriImpostazioni($('#titolo-calendario')));
  $('#chiudi-impostazioni').addEventListener('click', () => d.close());
  // Il dialog non ha margini interni: un clic che ha come bersaglio il dialog stesso è sullo sfondo.
  d.addEventListener('click', (e) => e.target === d && d.close());
  d.addEventListener('close', () => {
    if (d.open) return; // già riaperto
    for (const b of document.querySelectorAll('[aria-controls="impostazioni"][aria-expanded]')) b.setAttribute('aria-expanded', 'false');
    $('#copiato').textContent = '';
    // Se si è passati al mese dalla barra il focus resta lì
    if (!$('#mese-foglio').open && apertoDa?.isConnected && !apertoDa.closest('[hidden]')) apertoDa.focus();
    apertoDa = null;
  });
  for (const b of document.querySelectorAll('[data-lingua]')) b.addEventListener('click', () => cambiaLingua(b.dataset.lingua));
  $('#copia').addEventListener('click', copia);
}

// ---------- lingua ----------
// Precedenza: lingua salvata su questo dispositivo › ?lingua= nell'indirizzo › italiano. La salvata vince, così un
// link condiviso non cambia lingua a chi ne ha già scelta una; l'icona sulla schermata Home di iPhone parte con lo
// storage vuoto, e lì vale l'indirizzo. Mai la lingua del browser: il default è sempre l'italiano.
function linguaSalvata() {
  try {
    return localStorage.getItem(CHIAVE_LINGUA);
  } catch {
    return null;
  }
}

/** Cambia la lingua della pagina: la salva, la mette nell'indirizzo (e nel manifest) e ridisegna tutto. */
export async function cambiaLingua(codice) {
  const lingua = LINGUE.includes(codice) ? codice : 'it';
  try {
    localStorage.setItem(CHIAVE_LINGUA, lingua);
  } catch {}
  await caricaLingua(lingua);
  aggiornaIndirizzo();
  ridisegna();
}

/** Tutti i testi della pagina nella lingua attiva, senza toccare scelte, ricerca in corso e settimana mostrata. */
function ridisegna() {
  applicaTesti();
  mostraProva();
  mostraAggiornato();
  for (const o of $('#scegli-feed').options) {
    const f = stato.feeds.find((x) => x.slug === o.value);
    if (f) o.textContent = nomeFeed(f);
  }
  mostraTitoloScelta();
  mostraRisultati($('#cerca-scuola').value);
  $('#copiato').textContent = '';
  $('#condiviso').textContent = '';
  mostraPannello();
  if (!stato.attiva) return;
  mostraSwitcher();
  mostraScuola();
  mostraIscrizione();
  if (!stato.lunedi) return; // menu ancora in arrivo: lo disegna attiva()
  mostraOggi();
  mostraRigaOggi();
  mostraSettimana();
}

/** Fascia gialla con la data simulata da ?oggi=. */
function mostraProva() {
  if (!OGGI_PROVA) return;
  const fascia = el(
    'p',
    { class: 'prova', role: 'note' },
    t('prova.testo', dataLungaConAnno(OGGI_PROVA)),
    ' ',
    el(
      'a',
      {
        href: location.pathname,
        onclick: (e) => {
          e.preventDefault();
          const u = new URL(location.href);
          u.searchParams.delete('oggi');
          location.href = u.href;
        }
      },
      t('prova.torna')
    )
  );
  const vecchia = $('.prova');
  if (vecchia) vecchia.replaceWith(fascia);
  else $('.top').after(fascia);
}

function mostraAggiornato() {
  if (!stato.meta) return;
  $('#aggiornato').textContent = t('piede.aggiornato', dataConAnno(iso(new Date(stato.meta.generato))));
}

// ---------- avvio ----------
async function avvia() {
  const dati = Promise.all([json('data/feeds.json'), json('data/scuole.json'), caricaManifest()]);
  dati.catch(() => {}); // l'errore si gestisce sotto, dopo la lingua
  await caricaLingua(linguaIniziale(linguaSalvata(), new URLSearchParams(location.search).get('lingua')));
  applicaTesti();
  mostraProva();
  preparaImpostazioni();
  preparaFogli();
  mostraPannello();
  try {
    const [indice, scuole] = await dati;
    stato.feeds = indice.feeds;
    stato.meta = indice;
    stato.scuole = scuole;
    assegnaId();
  } catch (e) {
    $('#scelta').append(el('p', { class: 'avviso' }, t('errore.dati')));
    console.error(e);
    return;
  }
  const sel = $('#scegli-feed');
  for (const f of stato.feeds) sel.append(el('option', { value: f.slug }, nomeFeed(f)));
  sel.addEventListener('change', () => sel.value && scegliVoce(voceDiFeed(sel.value)));
  $('#cerca-scuola').addEventListener('input', (e) => mostraRisultati(e.target.value));
  $('#cambia').addEventListener('click', () => mostraPicker($('#scelta').hidden || stato.modo !== 'cambia', 'cambia'));
  $('#annulla').addEventListener('click', () => mostraPicker(false));
  $('#rimuovi').addEventListener('click', rimuovi);
  $('#prec').addEventListener('click', () => sposta(-1));
  $('#succ').addEventListener('click', () => sposta(1));
  $('#oggi').addEventListener('click', () => sposta(0));
  $('#barra-oggi').addEventListener('click', tornaAOggi);
  $('#condividi').addEventListener('click', condividi);
  collegaMese();
  window.addEventListener('hashchange', () => {
    const v = daHash();
    if (v && v.id !== stato.attiva?.id) attiva(v);
  });

  mostraAggiornato();

  // Scuole salvate: prima quelle di questo dispositivo, poi quelle dell'indirizzo (icona sulla Home, link condiviso).
  const salvato = leggi();
  // Vecchio formato salvato: { feed, scuola: nome completo }.
  const vecchia = salvato?.feed ? (stato.scuole.find((x) => x.nome === salvato.scuola && x.feed === salvato.feed)?.id ?? salvato.feed) : null;
  const daStorage = salvato?.scelte ?? (vecchia ? [vecchia] : []);
  const daUrl = (new URLSearchParams(location.search).get('scuola') ?? '').split('|');
  const viste = new Set();
  for (const id of [...daStorage, ...daUrl]) {
    const v = risolvi(id);
    if (v && !viste.has(v.id) && stato.scelte.length < MAX_SCUOLE) {
      viste.add(v.id);
      stato.scelte.push(v);
    }
  }
  const h = daHash();
  if (h && !stato.scelte.some((v) => v.id === h.id) && stato.scelte.length < MAX_SCUOLE) stato.scelte.push(h);
  // Aperta dall'icona sulla schermata Home: l'indirizzo è sempre quello dell'installazione, quindi conta
  // l'ultima scuola vista nell'app (se c'è). Nel browser invece vince l'indirizzo (link condivisi, eventi).
  const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ultima = stato.scelte.find((v) => v.id === salvato?.attiva);
  const att = (app && ultima) || h || ultima || stato.scelte[0];
  if (att) attiva(att);
  else mostraPicker(true, 'aggiungi');
}

/** La scuola indicata dopo # (id di una scuola, oppure un menu: in quel caso preferisce una scuola salvata con quel menu). */
function daHash() {
  const v = risolvi(decodeURIComponent(location.hash.slice(1)));
  if (!v) return null;
  return stato.scelte.find((x) => x.id === v.id) ?? (v.scuola ? v : (stato.scelte.find((x) => x.feed === v.feed) ?? v));
}

avvia();

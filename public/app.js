// Menu Scuole Padova — pagina statica, vanilla JS, nessuna dipendenza. Direzione visiva B "Vassoio".
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

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const piuGiorni = (s, n) => {
  const d = daIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const numGiorno = (s) => Number(s.slice(8, 10));
const mese = (s) => MESI[Number(s.slice(5, 7)) - 1];
const nomeGiorno = (s) => GIORNI[daIso(s).getDay()];
const dataLunga = (s) => `${nomeGiorno(s)} ${numGiorno(s)} ${mese(s)}`;
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
const STAGIONE = { estivo: 'Menu estivo', autunnale: 'Menu autunnale', invernale: 'Menu invernale', primaverile: 'Menu primaverile' };

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
    ul.append(el('li', { class: 'vuoto' }, 'Nessuna scuola trovata. Prova a scegliere direttamente il menu qui sotto.'));
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
          el('span', { class: 'dettaglio' }, `${s.ordine}${s.ic ? ` · ${s.ic} IC` : ''} · ${f?.breve ?? s.feed}`)
        )
      )
    );
  }
}

function linkSegnalazione() {
  const s = stato.scuola;
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  const titolo = s ? `Scuola ${s.nome}: menu da verificare` : `Menu ${f?.breve}: segnalazione`;
  const corpo = [
    s ? `Scuola: ${s.nome} (${s.ordine})` : '',
    `Menu mostrato: ${f?.breve} (${stato.feed})`,
    '',
    'Cosa non torna? (es. la scuola usa un altro menu, un giorno è sbagliato…)',
    ''
  ].join('\n');
  return `${REPO}/issues/new?title=${encodeURIComponent(titolo)}&body=${encodeURIComponent(corpo)}`;
}

function mostraPicker(aperto, modo = stato.modo) {
  stato.modo = modo;
  $('#scelta').hidden = !aperto;
  $('#cambia').setAttribute('aria-expanded', String(aperto && modo === 'cambia'));
  $('#titolo-scelta').textContent = !stato.attiva
    ? 'Che cosa si mangia oggi a scuola?'
    : modo === 'cambia'
      ? `Cambia ${etichetta(stato.attiva)} con…`
      : 'Aggiungi una scuola';
  $('#annulla').hidden = !stato.attiva;
  $('#risultati').replaceChildren();
  $('#cerca-scuola').value = '';
  $('#scegli-feed').value = '';
  if (aperto && stato.attiva) $('#cerca-scuola').focus();
}

function mostraScuola() {
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) return;
  const s = stato.scuola;
  $('#scuola-nome').textContent = s ? s.nome : f.nome;
  $('#scuola-feed').textContent = s ? f.nome : 'Menu scelto dall’elenco';
  const note = [];
  if (s?.avviso) note.push(el('p', { class: 'avviso', role: 'note' }, s.avviso));
  $('#scuola-note').replaceChildren(...note);
  $('#link-segnala').href = linkSegnalazione();
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
  const base = v.scuola ? nomeBreve(v.scuola.nome) : (stato.feeds.find((f) => f.slug === v.feed)?.breve ?? v.feed);
  const doppia = stato.scelte.some((x) => x.id !== v.id && (x.scuola ? nomeBreve(x.scuola.nome) : null) === base);
  return doppia && v.scuola ? `${base} · ${v.scuola.ordine}` : base;
}

function salvaScelte() {
  salva({ scelte: stato.scelte.map((v) => v.id), attiva: stato.attiva?.id ?? null });
  // Le scuole vanno anche nell'indirizzo: l'icona sulla schermata Home di iPhone non vede quanto salvato in Safari.
  const p = new URLSearchParams(location.search);
  p.delete('scuola');
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
                title: 'Dettagli, cambia o rimuovi',
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
              'aria-label': 'Aggiungi scuola',
              'aria-controls': 'scelta',
              onclick: () => mostraPicker(true, 'aggiungi')
            },
            '＋ Aggiungi'
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
  for (const id of ['#scuola', '#oggi-box', '#oggi-riga', '#settimana', '#iscriviti']) $(id).hidden = true;
  salvaScelte();
  mostraSwitcher();
  mostraPicker(true, 'aggiungi');
}

async function attiva(voce) {
  stato.dettagli = false;
  stato.attiva = voce;
  stato.feed = voce.feed;
  stato.scuola = voce.scuola;
  salvaScelte();
  mostraSwitcher();
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
  mostraOggi();
  mostraRigaOggi();
  mostraSettimana();
}

// ---------- piatti e variazioni ----------
const eVariato = (g, i) => g.originali && !g.menuSostituito && g.originali[i] !== g.piatti[i];

/** Riquadri "Variazione" di un giorno: cosa si serve, al posto di cosa, e il testo dell'avviso. */
function riquadriVariazione(g) {
  if (!g.variazioni?.length) return [];
  const cambi = [];
  g.piatti.forEach((p, i) => {
    if (eVariato(g, i) && !cambi.some((c) => c.nuovo === p && c.vecchio === g.originali[i])) cambi.push({ nuovo: p, vecchio: g.originali[i] });
  });
  return g.variazioni.map((v, k) => {
    const strutturata = k === 0 && (cambi.length || g.menuSostituito);
    const pubblicata = `Avviso pubblicato da Dussmann il ${numGiorno(v.pubblicata)} ${mese(v.pubblicata)}`;
    return el(
      'div',
      { class: 'vbox', role: 'note' },
      el('span', { class: 'vt' }, 'Variazione'),
      strutturata && g.menuSostituito
        ? [
            el('span', { class: 'vnew' }, 'Menu sostitutivo'),
            el('span', { class: 'vold' }, `al posto di: ${g.originali.filter((p) => p !== 'oppure').join(', ')}`)
          ]
        : null,
      strutturata && !g.menuSostituito
        ? cambi.map((c) => [el('span', { class: 'vnew' }, c.nuovo), el('span', { class: 'vold' }, `al posto di: ${c.vecchio}`)])
        : null,
      !strutturata ? el('span', { class: 'vnew' }, 'Il menu di questo giorno potrebbe essere diverso: leggi l’avviso.') : null,
      el('span', { class: 'vsrc' }, pubblicata, ' · ', el('a', { href: FONTE_NOTIZIE }, 'fonte')),
      el('details', { open: !strutturata }, el('summary', {}, 'Testo dell’avviso'), el('p', { class: 'vtesto' }, v.testo))
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
      if (p === 'oppure') return el('li', { class: 'oppure' }, 'oppure');
      const testo = conScomparti ? el('span', { class: 'dish' }, p) : p;
      const classi = [i === principale ? 'principale' : '', eVariato(g, i) ? 'changed' : ''].join(' ').trim();
      return el('li', { class: classi || null }, testo);
    })
  );
}

// ---------- oggi (vassoio, solo su telefono) ----------
function mostraOggi() {
  const box = $('#oggi-box');
  const t = oggi();
  const g = stato.giorni.get(t);
  if (g?.stato === 'menu') {
    box.replaceChildren(
      el('p', { class: 'when' }, el('mark', {}, 'Oggi'), ` ${nomeGiorno(t)} ${numGiorno(t)}`),
      el('p', { class: 'meta' }, `${STAGIONE[g.stagione] ?? 'Menu'} · settimana ${g.settimana} di ${g.settimane}`),
      ...riquadriVariazione(g),
      elencoPiatti(g, 'tray', true)
    );
    box.hidden = false;
    return;
  }
  // Oggi niente mensa: lo dice con la data di oggi, poi mostra il prossimo giorno con il menu (entro due settimane).
  let prossimo = null;
  for (let i = 1; i <= 14 && !prossimo; i++) {
    const d = piuGiorni(t, i);
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
      el('mark', {}, prossimo === piuGiorni(t, 1) ? 'Domani' : maiuscola(nomeGiorno(prossimo))),
      ` ${numGiorno(prossimo)} ${mese(prossimo)}`
    ),
    el('p', { class: 'meta' }, `${STAGIONE[gp.stagione] ?? 'Menu'} · settimana ${gp.settimana} di ${gp.settimane}`),
    ...riquadriVariazione(gp),
    elencoPiatti(gp, 'tray', true)
  );
  box.setAttribute('aria-label', 'Prossimo menu');
  box.hidden = false;
}

const maiuscola = (s) => s.replace(/^./, (c) => c.toUpperCase());

/** "Oggi, domenica 8 novembre: niente mensa." con il motivo quando c'è. */
function testoOggi() {
  const t = oggi();
  const g = stato.giorni.get(t);
  const nido = stato.feed?.startsWith('nido');
  let motivo;
  if (g?.stato === 'chiuso') motivo = `${nido ? 'nido chiuso' : 'scuola chiusa'} (${g.motivo})`;
  else if (g?.stato === 'non-pubblicato') motivo = 'menu non ancora pubblicato';
  else if (stato.copertura && t < stato.copertura.dal) motivo = 'la mensa non è ancora iniziata';
  else motivo = 'niente mensa';
  return `Oggi, ${dataLunga(t)}: ${motivo}.`;
}

/** Riga sopra la settimana quando oggi non c'è mensa (su telefono la dice già il vassoio). */
function mostraRigaOggi() {
  const riga = $('#oggi-riga');
  const t = oggi();
  if (stato.giorni.get(t)?.stato === 'menu') {
    riga.hidden = true;
    return;
  }
  const lun = lunediDi(t);
  const extra = lun > t ? ` Ecco la prossima settimana.` : '';
  riga.textContent = testoOggi() + extra;
  riga.classList.toggle('solo-largo', !$('#oggi-box').hidden);
  riga.hidden = false;
}

// ---------- settimana ----------
function cardGiorno(data, precedente) {
  const g = stato.giorni.get(data);
  const eOggi = data === oggi();
  const intestazione = el('h3', { class: 'dname' }, String(numGiorno(data)), el('small', {}, eOggi ? 'oggi' : nomeGiorno(data).slice(0, 3)));
  const etichetta = `${dataLunga(data)}${eOggi ? ', oggi' : ''}`;
  if (!g || g.stato !== 'menu') {
    let testo;
    if (g?.stato === 'chiuso') testo = `${stato.feed.startsWith('nido') ? 'Nido chiuso' : 'Scuola chiusa'} · ${g.motivo}`;
    else if (g?.stato === 'non-pubblicato') testo = 'Menu non ancora pubblicato';
    else if (stato.copertura && data < stato.copertura.dal) testo = 'Mensa non ancora iniziata';
    else testo = 'Nessun menu';
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
    cambioStagione ? el('p', { class: 'season' }, `Da qui: ${STAGIONE[g.stagione] ?? g.stagione}`) : null,
    ...riquadriVariazione(g),
    elencoPiatti(g, null, false),
    el('p', { class: 'ciclo' }, `${STAGIONE[g.stagione] ?? 'Menu'} · settimana ${g.settimana} di ${g.settimane}`)
  );
}

function etichettaSettimana(lun) {
  const ven = piuGiorni(lun, 4);
  return mese(lun) === mese(ven) ? `${numGiorno(lun)}–${numGiorno(ven)} ${mese(ven)}` : `${numGiorno(lun)} ${mese(lun)} – ${numGiorno(ven)} ${mese(ven)}`;
}

function mostraSettimana() {
  $('#settimana').hidden = false;
  const cont = $('#giorni');
  cont.replaceChildren();
  let prec = stato.giorni.get(piuGiorni(stato.lunedi, -3));
  for (let i = 0; i < 5; i++) {
    const d = piuGiorni(stato.lunedi, i);
    cont.append(cardGiorno(d, prec));
    prec = stato.giorni.get(d) ?? prec;
  }
  $('#titolo-settimana').textContent = etichettaSettimana(stato.lunedi);
  $('#oggi').disabled = stato.lunedi === lunediDi(oggi());
}

function sposta(settimane) {
  stato.lunedi = settimane === 0 ? lunediDi(oggi()) : piuGiorni(stato.lunedi, 7 * settimane);
  mostraSettimana();
}

// ---------- iscrizione al calendario ----------
function mostraIscrizione() {
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) return;
  const https = new URL(f.ics, location.href).href;
  $('#url-feed').value = https;
  $('#link-webcal').href = https.replace(/^https?:/, 'webcal:');
  $('#link-webcal').textContent = stato.scelte.length > 1 ? `Aggiungi al calendario: ${etichetta(stato.attiva)}` : 'Aggiungi al calendario';
  $('#iscriviti').hidden = false;
}

async function copia() {
  const input = $('#url-feed');
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand?.('copy');
  }
  $('#copiato').textContent = 'Indirizzo copiato.';
}

// ---------- avvio ----------
async function avvia() {
  if (OGGI_PROVA) {
    $('.top').after(
      el(
        'p',
        { class: 'prova', role: 'note' },
        `Data simulata: la pagina fa come se oggi fosse ${dataLunga(OGGI_PROVA)} ${OGGI_PROVA.slice(0, 4)}. `,
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
          'Torna alla data reale'
        )
      )
    );
  }
  try {
    const [indice, scuole] = await Promise.all([json('data/feeds.json'), json('data/scuole.json'), caricaManifest()]);
    stato.feeds = indice.feeds;
    stato.meta = indice;
    stato.scuole = scuole;
    assegnaId();
  } catch (e) {
    $('#scelta').append(el('p', { class: 'avviso' }, 'Impossibile caricare i dati. Riprova più tardi.'));
    console.error(e);
    return;
  }
  const sel = $('#scegli-feed');
  for (const f of stato.feeds) sel.append(el('option', { value: f.slug }, f.nome));
  sel.addEventListener('change', () => sel.value && scegliVoce(voceDiFeed(sel.value)));
  $('#cerca-scuola').addEventListener('input', (e) => mostraRisultati(e.target.value));
  $('#cambia').addEventListener('click', () => mostraPicker($('#scelta').hidden || stato.modo !== 'cambia', 'cambia'));
  $('#annulla').addEventListener('click', () => mostraPicker(false));
  $('#rimuovi').addEventListener('click', rimuovi);
  $('#prec').addEventListener('click', () => sposta(-1));
  $('#succ').addEventListener('click', () => sposta(1));
  $('#oggi').addEventListener('click', () => sposta(0));
  $('#copia').addEventListener('click', copia);
  // "?" in testata: porta alla nota in fondo senza toccare l'indirizzo (dopo # c'è la scuola scelta).
  $('#info').addEventListener('click', (e) => {
    e.preventDefault();
    $('#nota').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('#nota').focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', () => {
    const v = daHash();
    if (v && v.id !== stato.attiva?.id) attiva(v);
  });

  const m = stato.meta;
  const quando = iso(new Date(m.generato));
  $('#aggiornato').textContent = `Ultimo controllo della fonte: ${numGiorno(quando)} ${mese(quando)} ${quando.slice(0, 4)}.`;

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

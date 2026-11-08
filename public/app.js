// Menu Scuole Padova — pagina statica, vanilla JS, nessuna dipendenza. Direzione visiva B "Vassoio".
const REPO = 'https://github.com/gbonanome/menu-scuole-padova';
const FONTE_NOTIZIE = 'https://www.scuoledussmann.it/padova#notizie';
const CHIAVE = 'menu-scuole-padova:scelta';

const $ = (sel) => document.querySelector(sel);
const stato = { feeds: [], scuole: [], meta: null, feed: null, scuola: null, giorni: new Map(), copertura: null, lunedi: null };

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
          { type: 'button', onclick: () => scegli(s.feed, s) },
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
  const corpo = [s ? `Scuola: ${s.nome} (${s.ordine})` : '', `Menu mostrato: ${f?.breve} (${stato.feed})`, '', 'Cosa non torna? (es. la scuola usa un altro menu, un giorno è sbagliato…)', ''].join('\n');
  return `${REPO}/issues/new?title=${encodeURIComponent(titolo)}&body=${encodeURIComponent(corpo)}`;
}

function mostraPicker(aperto) {
  $('#scelta').hidden = !aperto;
  $('#cambia').setAttribute('aria-expanded', String(aperto));
  if (aperto && stato.feed) $('#cerca-scuola').focus();
}

function mostraScuola() {
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) return;
  const s = stato.scuola;
  $('#scuola-nome').textContent = s ? s.nome : f.nome;
  $('#scuola-feed').textContent = s ? f.nome : 'Menu scelto dall’elenco';
  const note = [];
  if (s?.avviso) note.push(el('p', { class: 'avviso', role: 'note' }, s.avviso));
  else if (s && s.confidenza !== 'alta') note.push(el('p', {}, 'L’abbinamento tra scuola e menu è ricavato dai documenti del Comune.'));
  note.push(el('p', { class: 'segnala' }, el('a', { href: linkSegnalazione() }, 'Segnala un errore')));
  $('#scuola-note').replaceChildren(...note);
  $('#scuola').hidden = false;
}

async function scegli(feed, scuola = null, { aggiornaHash = true } = {}) {
  if (!stato.feeds.some((f) => f.slug === feed)) return;
  stato.feed = feed;
  stato.scuola = scuola;
  salva({ feed, scuola: scuola?.nome ?? null });
  if (aggiornaHash && location.hash !== `#${feed}`) history.replaceState(null, '', `#${feed}`);
  $('#scegli-feed').value = feed;
  $('#risultati').replaceChildren();
  $('#cerca-scuola').value = '';
  mostraPicker(false);
  mostraScuola();
  mostraIscrizione();
  try {
    const dati = await json(`data/${feed}.json`);
    stato.giorni = new Map(dati.giorni.map((g) => [g.data, g]));
    stato.copertura = dati.copertura;
  } catch (e) {
    stato.giorni = new Map();
    stato.copertura = null;
    console.error(e);
  }
  stato.lunedi = lunediDi(oggi());
  mostraOggi();
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
      strutturata && g.menuSostituito ? [el('span', { class: 'vnew' }, 'Menu sostitutivo'), el('span', { class: 'vold' }, `al posto di: ${g.originali.filter((p) => p !== 'oppure').join(', ')}`)] : null,
      strutturata && !g.menuSostituito ? cambi.map((c) => [el('span', { class: 'vnew' }, c.nuovo), el('span', { class: 'vold' }, `al posto di: ${c.vecchio}`)]) : null,
      !strutturata ? el('span', { class: 'vnew' }, 'Il menu di questo giorno potrebbe essere diverso: leggi l’avviso.') : null,
      el('span', { class: 'vsrc' }, pubblicata, ' · ', el('a', { href: FONTE_NOTIZIE }, 'fonte')),
      el('details', { open: !strutturata }, el('summary', {}, 'Testo dell’avviso'), el('p', { class: 'vtesto' }, v.testo))
    );
  });
}

// Il piatto "principale" (in evidenza) è il primo che non sia pane, frutta o verdura generica.
const GENERICO = /^(pane|frutta|verdura (?:cruda|cotta)|bis di verdura|yogurt)/i;
const indicePrincipale = (piatti) => Math.max(0, piatti.findIndex((p) => p !== 'oppure' && !GENERICO.test(p)));

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
  // Oggi niente mensa: mostra il prossimo giorno con il menu (entro due settimane).
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
  const motivo = g?.stato === 'chiuso' ? `Oggi scuola chiusa (${g.motivo}).` : 'Oggi niente mensa.';
  box.replaceChildren(
    el('p', { class: 'when' }, el('mark', {}, prossimo === piuGiorni(t, 1) ? 'Domani' : nomeGiorno(prossimo).replace(/^./, (c) => c.toUpperCase())), ` ${numGiorno(prossimo)} ${mese(prossimo)}`),
    el('p', { class: 'meta' }, `${motivo} ${STAGIONE[gp.stagione] ?? 'Menu'} · settimana ${gp.settimana} di ${gp.settimane}`),
    ...riquadriVariazione(gp),
    elencoPiatti(gp, 'tray', true)
  );
  box.setAttribute('aria-label', 'Prossimo menu');
  box.hidden = false;
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
    return el('article', { class: `day ${g?.stato === 'chiuso' ? 'closed' : 'empty'}${eOggi ? ' is-today' : ''}`, 'aria-label': etichetta, 'aria-current': eOggi ? 'date' : null }, intestazione, el('p', { class: 'reason' }, testo));
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
  try {
    const [indice, scuole] = await Promise.all([json('data/feeds.json'), json('data/scuole.json')]);
    stato.feeds = indice.feeds;
    stato.meta = indice;
    stato.scuole = scuole;
  } catch (e) {
    $('#scelta').append(el('p', { class: 'avviso' }, 'Impossibile caricare i dati. Riprova più tardi.'));
    console.error(e);
    return;
  }
  const sel = $('#scegli-feed');
  for (const f of stato.feeds) sel.append(el('option', { value: f.slug }, f.nome));
  sel.addEventListener('change', () => sel.value && scegli(sel.value));
  $('#cerca-scuola').addEventListener('input', (e) => mostraRisultati(e.target.value));
  $('#cambia').addEventListener('click', () => mostraPicker($('#scelta').hidden));
  $('#prec').addEventListener('click', () => sposta(-1));
  $('#succ').addEventListener('click', () => sposta(1));
  $('#oggi').addEventListener('click', () => sposta(0));
  $('#copia').addEventListener('click', copia);
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (h && h !== stato.feed) scegli(h, null, { aggiornaHash: false });
  });

  const m = stato.meta;
  const quando = iso(new Date(m.generato));
  $('#aggiornato').textContent = `Ultimo controllo della fonte: ${numGiorno(quando)} ${mese(quando)} ${quando.slice(0, 4)}.`;

  const h = location.hash.slice(1);
  const salvato = leggi();
  const trova = (feed) => (salvato?.feed === feed ? stato.scuole.find((s) => s.nome === salvato.scuola && s.feed === feed) ?? null : null);
  if (h && stato.feeds.some((f) => f.slug === h)) scegli(h, trova(h), { aggiornaHash: false });
  else if (salvato?.feed && stato.feeds.some((f) => f.slug === salvato.feed)) scegli(salvato.feed, trova(salvato.feed));
}

avvia();

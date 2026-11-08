// Menu Scuole Padova — pagina statica, vanilla JS, nessuna dipendenza.
const REPO = 'https://github.com/gbonanome/menu-scuole-padova';
const CHIAVE = 'menu-scuole-padova:scelta';

const $ = (sel) => document.querySelector(sel);
const stato = { feeds: [], scuole: [], meta: null, feed: null, scuola: null, giorni: new Map(), lunedi: null };

// ---------- utilità ----------
function el(tag, attrs = {}, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const f of figli.flat()) if (f != null && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}

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
function lunediDi(s) {
  const d = daIso(s);
  const g = d.getDay(); // 0 domenica
  if (g === 6) d.setDate(d.getDate() + 2); // sabato -> lunedì dopo
  else if (g === 0) d.setDate(d.getDate() + 1); // domenica -> lunedì dopo
  else d.setDate(d.getDate() - (g - 1));
  return iso(d);
}
const oggi = () => iso(new Date());
const fmtGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' });
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'.]/g, ' ').replace(/\s+/g, ' ').trim();

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
      el('li', {}, el('button', { type: 'button', onclick: () => scegli(s.feed, s) }, el('span', { class: 'nome' }, s.nome), el('span', { class: 'dettaglio' }, `${s.ordine}${s.ic ? ` · ${s.ic} IC` : ''} · ${f?.breve ?? s.feed}`)))
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

function mostraSelezione() {
  const box = $('#selezione');
  const f = stato.feeds.find((x) => x.slug === stato.feed);
  if (!f) {
    box.hidden = true;
    return;
  }
  const s = stato.scuola;
  box.replaceChildren(
    ...[
    el('p', { class: 'scelto' }, s ? el('strong', {}, s.nome) : null, s ? ' · ' : null, `Menu: ${f.nome}`),
    s?.avviso ? el('p', { class: 'avviso', role: 'note' }, s.avviso) : null,
    s && !s.avviso && s.confidenza !== 'alta' ? el('p', { class: 'nota' }, 'L’abbinamento tra scuola e menu è ricavato dai documenti del Comune: se non corrisponde, segnalacelo.') : null,
    el('p', { class: 'nota' }, el('a', { href: linkSegnalazione() }, 'Segnala un errore'))
    ].filter(Boolean)
  );
  box.hidden = false;
}

async function scegli(feed, scuola = null, { aggiornaHash = true } = {}) {
  if (!stato.feeds.some((f) => f.slug === feed)) return;
  stato.feed = feed;
  stato.scuola = scuola;
  salva({ feed, scuola: scuola?.nome ?? null });
  if (aggiornaHash && location.hash !== `#${feed}`) history.replaceState(null, '', `#${feed}`);
  $('#scegli-feed').value = feed;
  $('#risultati').replaceChildren();
  $('#cerca-scuola').value = scuola?.nome ?? '';
  mostraSelezione();
  mostraIscrizione();
  try {
    const dati = await json(`data/${feed}.json`);
    stato.giorni = new Map(dati.giorni.map((g) => [g.data, g]));
    stato.copertura = dati.copertura;
  } catch (e) {
    stato.giorni = new Map();
    console.error(e);
  }
  stato.lunedi ??= lunediDi(oggi());
  mostraSettimane();
}

// ---------- settimane ----------
const quanteSettimane = () => (matchMedia('(min-width: 60rem)').matches ? 2 : 1);

function cardGiorno(data) {
  const g = stato.giorni.get(data);
  const eOggi = data === oggi();
  const titolo = el('h3', {}, el('span', { class: 'data' }, fmtGiorno.format(daIso(data))), eOggi ? el('span', { class: 'etichetta-oggi' }, 'oggi') : null);
  const attr = { class: 'giorno', 'aria-current': eOggi ? 'date' : null };
  if (!g) {
    const fuori = stato.copertura && data < stato.copertura.dal;
    return el('article', { ...attr, class: 'giorno vuoto' }, titolo, el('p', {}, fuori ? 'Prima dell’inizio del servizio' : 'Nessun menu'));
  }
  if (g.stato === 'chiuso') return el('article', { ...attr, class: 'giorno chiuso' }, titolo, el('p', {}, g.motivo));
  if (g.stato === 'non-pubblicato') return el('article', { ...attr, class: 'giorno vuoto' }, titolo, el('p', {}, 'Menu non ancora pubblicato'));
  const variato = g.variazioni.length > 0;
  const lista = el('ul', { class: 'piatti' });
  g.piatti.forEach((p, i) => {
    if (p === 'oppure') lista.append(el('li', { class: 'oppure' }, 'oppure'));
    else {
      const era = g.originali && !g.menuSostituito && g.originali[i] !== p ? g.originali[i] : null;
      lista.append(el('li', {}, p, era ? el('span', { class: 'era' }, ' al posto di ', el('del', {}, era)) : null));
    }
  });
  return el(
    'article',
    { ...attr, class: `giorno${variato ? ' variato' : ''}` },
    titolo,
    variato ? el('p', { class: 'badge' }, '⚠️ Menu variato') : null,
    lista,
    g.menuSostituito ? el('p', { class: 'era' }, 'Previsto prima: ', el('del', {}, g.originali.filter((p) => p !== 'oppure').join(', '))) : null,
    ...g.variazioni.map((v) =>
      el('details', { class: 'dettaglio-variazione' }, el('summary', {}, v.titolo), el('p', { class: 'testo-variazione' }, v.testo), el('p', { class: 'nota' }, `Pubblicata il ${fmtBreve.format(daIso(v.pubblicata))} · `, el('a', { href: 'https://www.scuoledussmann.it/padova#notizie' }, 'fonte')))
    ),
    el('p', { class: 'nota settimana-ciclo' }, `Settimana ${g.settimana} di ${g.settimane} · menu ${g.stagione}`)
  );
}

function mostraSettimane() {
  $('#settimana').hidden = false;
  const n = quanteSettimane();
  const cont = $('#giorni');
  cont.replaceChildren();
  for (let w = 0; w < n; w++) {
    const lun = piuGiorni(stato.lunedi, 7 * w);
    const sett = el('div', { class: 'blocco-settimana' });
    for (let i = 0; i < 5; i++) sett.append(cardGiorno(piuGiorni(lun, i)));
    cont.append(sett);
  }
  const ven = piuGiorni(stato.lunedi, 7 * (n - 1) + 4);
  $('#titolo-settimana').textContent = `Dal ${fmtBreve.format(daIso(stato.lunedi))} al ${fmtBreve.format(daIso(ven))}`;
  $('#oggi').disabled = stato.lunedi === lunediDi(oggi());
}

function sposta(settimane) {
  stato.lunedi = settimane === 0 ? lunediDi(oggi()) : piuGiorni(stato.lunedi, 7 * settimane);
  mostraSettimane();
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
    $('#selezione').hidden = false;
    $('#selezione').textContent = 'Impossibile caricare i dati. Riprova più tardi.';
    console.error(e);
    return;
  }
  const sel = $('#scegli-feed');
  for (const f of stato.feeds) sel.append(el('option', { value: f.slug }, f.nome));
  sel.addEventListener('change', () => sel.value && scegli(sel.value));
  $('#cerca-scuola').addEventListener('input', (e) => mostraRisultati(e.target.value));
  $('#prec').addEventListener('click', () => sposta(-quanteSettimane()));
  $('#succ').addEventListener('click', () => sposta(quanteSettimane()));
  $('#oggi').addEventListener('click', () => sposta(0));
  $('#copia').addEventListener('click', copia);
  matchMedia('(min-width: 60rem)').addEventListener('change', () => stato.feed && mostraSettimane());
  window.addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (h && h !== stato.feed) scegli(h, null, { aggiornaHash: false });
  });

  const m = stato.meta;
  const quando = m.ultimaVerificaFonte ? daIso(m.ultimaVerificaFonte) : new Date(m.generato);
  $('#aggiornato').textContent = `Ultimo aggiornamento: ${fmtBreve.format(quando)} ${quando.getFullYear()}.`;

  const h = location.hash.slice(1);
  const salvato = leggi();
  if (h && stato.feeds.some((f) => f.slug === h)) {
    const scuola = salvato?.feed === h ? stato.scuole.find((s) => s.nome === salvato.scuola && s.feed === h) : null;
    scegli(h, scuola ?? null, { aggiornaHash: false });
  } else if (salvato?.feed) {
    scegli(salvato.feed, stato.scuole.find((s) => s.nome === salvato.scuola && s.feed === salvato.feed) ?? null);
  }
}

avvia();

// Mini mese: un navigatore, non una vista. Serve a saltare a una data e a vedere dove ci sono variazioni
// e giorni senza mensa. Un solo componente, montato in contenitori diversi secondo la larghezza (lo decide app.js).
// Le funzioni sulle date sono pure e si provano in Node (test/mese.test.js); disegnaMese() costruisce il DOM.
import { daIso, dataLunga, eRtl, giornoBreve, iso, meseEAnno, nomeGiorno, numeroGiorno, piuGiorni, t } from './i18n.js';

/** "2026-11" da "2026-11-10" */
export const meseDi = (s) => s.slice(0, 7);

/** Il mese n mesi prima o dopo: spostaMese('2026-12', 1) = '2027-01' */
export function spostaMese(mese, n) {
  const [a, m] = mese.split('-').map(Number);
  return meseDi(iso(new Date(a, m - 1 + n, 1)));
}

/**
 * Griglia del mese, solo lunedì–venerdì: una riga per ogni settimana con almeno un giorno feriale nel mese.
 * I giorni fuori mese (prima e ultima riga) sono null.
 * @returns {{lunedi:string, giorni:(string|null)[]}[]}
 */
export function grigliaMese(mese) {
  const primo = `${mese}-01`;
  const g = daIso(primo).getDay();
  // Lunedì della riga con il primo giorno feriale: se il mese inizia di sabato o domenica, quello dopo.
  let lunedi = piuGiorni(primo, g === 0 ? 1 : g === 6 ? 2 : 1 - g);
  const righe = [];
  while (meseDi(lunedi) <= mese) {
    const giorni = [0, 1, 2, 3, 4].map((i) => piuGiorni(lunedi, i)).map((d) => (meseDi(d) === mese ? d : null));
    if (giorni.some(Boolean)) righe.push({ lunedi, giorni });
    lunedi = piuGiorni(lunedi, 7);
  }
  return righe;
}

/** Stato di un giorno nel mini mese: menu, variato, non-pubblicato, chiuso, oppure null (nessun dato). */
export function statoGiorno(g) {
  if (!g) return null;
  if (g.stato === 'menu') return g.variazioni?.length ? 'variato' : 'menu';
  if (g.stato === 'chiuso' || g.stato === 'non-pubblicato') return g.stato;
  return null;
}

/**
 * Primo e ultimo mese navigabili: il periodo coperto dal menu (copertura) e i giorni presenti nei dati
 * (chiusure e menu non ancora pubblicati arrivano fino alla fine dell'anno scolastico). Null se non c'è nulla.
 */
export function limitiMesi(date, copertura) {
  let primo = copertura?.dal ?? null;
  let ultimo = copertura?.al ?? null;
  for (const d of date) {
    if (!primo || d < primo) primo = d;
    if (!ultimo || d > ultimo) ultimo = d;
  }
  return primo ? { primo: meseDi(primo), ultimo: meseDi(ultimo) } : null;
}

/**
 * Il mese da mostrare per una settimana: resta quello attuale se la settimana vi ha almeno un giorno
 * (così scegliendo il 2 dicembre nella settimana 30 novembre – 4 dicembre si resta su dicembre),
 * altrimenti il mese di oggi se la settimana contiene oggi, altrimenti quello del lunedì.
 */
export function meseDaMostrare(attuale, lunedi, oggi) {
  const giorni = [0, 1, 2, 3, 4].map((i) => piuGiorni(lunedi, i));
  if (attuale && giorni.some((d) => meseDi(d) === attuale)) return attuale;
  return meseDi(giorni.includes(oggi) ? oggi : lunedi);
}

/** Sposta di n giorni feriali (sabato e domenica si saltano): dal venerdì +1 è il lunedì dopo. */
export function spostaFeriale(d, n) {
  let s = d;
  for (let passo = Math.sign(n), resto = Math.abs(n); resto > 0; ) {
    s = piuGiorni(s, passo);
    const g = daIso(s).getDay();
    if (g !== 0 && g !== 6) resto--;
  }
  return s;
}

// ---------- DOM ----------
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

const maiuscola = (s) => s.replace(/^./, (c) => c.toUpperCase());

/** Parola per lo stato di un giorno, nell'etichetta del pulsante e nella legenda. */
const testoStato = (s) =>
  ({ menu: t('mese.menu'), variato: t('mese.variazione'), 'non-pubblicato': t('mese.nonpubblicato'), chiuso: t('mese.chiuso') })[s];

/** "giovedì 12 novembre, variazione"; per oggi "martedì 10 novembre, oggi, variazione". */
function etichettaGiorno(d, stato, eOggi) {
  return [eOggi ? t('giorno.oggi.aria', dataLunga(d)) : dataLunga(d), stato ? testoStato(stato) : null].filter(Boolean).join(', ');
}

/**
 * Disegna il mini mese dentro radice (sempre lo stesso elemento, spostato da un contenitore all'altro).
 * @param {HTMLElement} radice
 * @param {{mese:string, giorni:Map<string,object>, oggi:string, lunedi:string, limiti:{primo:string,ultimo:string}|null,
 *   fuoco?:string|null, suGiorno:(d:string)=>void, suMese:(mese:string, fuoco?:string)=>void}} o
 *   fuoco: un giorno, oppure 'prec'/'succ', da riprendere dopo il ridisegno.
 */
export function disegnaMese(radice, o) {
  const { mese, giorni, oggi, lunedi, limiti } = o;
  const righe = grigliaMese(mese);
  const dentro = (m) => !limiti || (m >= limiti.primo && m <= limiti.ultimo);
  const prec = spostaMese(mese, -1);
  const succ = spostaMese(mese, 1);
  const tutti = righe.flatMap((r) => r.giorni).filter(Boolean);
  // Un solo giorno raggiungibile con Tab (le frecce muovono tra gli altri): quello chiesto, oggi, la settimana mostrata, il primo.
  const tabulabile = [o.fuoco, oggi, ...[0, 1, 2, 3, 4].map((i) => piuGiorni(lunedi, i)), tutti[0]].find((d) => tutti.includes(d));
  const idTitolo = `${radice.id || 'mini-mese'}-titolo`;
  const settimanaDi = (d) => d >= lunedi && d <= piuGiorni(lunedi, 4);

  const freccia = (verso, m, chiave) =>
    el(
      'button',
      {
        type: 'button',
        class: 'mm-freccia',
        'data-verso': verso,
        'aria-label': chiave,
        disabled: !dentro(m),
        onclick: () => o.suMese(m, verso)
      },
      verso === 'prec' ? '‹' : '›'
    );

  // Intestazioni lun–ven dalla settimana del 2 novembre 2026 (un lunedì qualsiasi va bene).
  const intestazioni = [0, 1, 2, 3, 4].map((i) => {
    const d = piuGiorni('2026-11-02', i);
    return el('th', { scope: 'col', abbr: nomeGiorno(d) }, giornoBreve(d));
  });

  const corpo = el(
    'tbody',
    {},
    righe.map((r) =>
      el(
        'tr',
        { class: r.lunedi === lunedi ? 'mostrata' : null },
        r.giorni.map((d) => {
          if (!d) return el('td', {});
          const stato = statoGiorno(giorni.get(d));
          const eOggi = d === oggi;
          return el(
            'td',
            {},
            el(
              'button',
              {
                type: 'button',
                class: ['mm-giorno', stato ? `mm-${stato}` : 'mm-vuoto', eOggi ? 'mm-oggi' : '', settimanaDi(d) ? 'mm-settimana' : ''].join(' ').trim(),
                'data-data': d,
                'aria-label': etichettaGiorno(d, stato, eOggi),
                'aria-current': eOggi ? 'date' : null,
                tabindex: d === tabulabile ? '0' : '-1',
                onclick: () => o.suGiorno(d)
              },
              el('span', { class: 'mm-numero' }, numeroGiorno(d)),
              el('span', { class: 'mm-segno', 'aria-hidden': 'true' })
            )
          );
        })
      )
    )
  );

  // Frecce tra i giorni; in un mese vicino si passa al mese e si riprende il fuoco lì.
  const tasti = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 5, ArrowUp: -5 };
  corpo.addEventListener('keydown', (e) => {
    const d = e.target.closest?.('[data-data]')?.dataset.data;
    let passi = tasti[e.key];
    if (!d || !passi) return;
    if (eRtl() && Math.abs(passi) === 1) passi = -passi;
    e.preventDefault();
    const nuovo = spostaFeriale(d, passi);
    if (meseDi(nuovo) === mese) {
      const b = corpo.querySelector(`[data-data="${nuovo}"]`);
      for (const x of corpo.querySelectorAll('[tabindex="0"]')) x.tabIndex = -1;
      b.tabIndex = 0;
      b.focus();
    } else if (dentro(meseDi(nuovo))) o.suMese(meseDi(nuovo), nuovo);
  });

  const segno = (classe) => el('span', { class: `mm-giorno ${classe}`, 'aria-hidden': 'true' }, el('span', { class: 'mm-segno' }));
  radice.classList.add('mini-mese');
  radice.replaceChildren(
    el(
      'div',
      { class: 'mm-testa' },
      freccia('prec', prec, t('mese.prec')),
      el('p', { class: 'mm-titolo', id: idTitolo, 'aria-live': 'polite' }, maiuscola(meseEAnno(`${mese}-01`))),
      freccia('succ', succ, t('mese.succ'))
    ),
    el('table', { class: 'mm-griglia', 'aria-labelledby': idTitolo }, el('thead', {}, el('tr', {}, intestazioni)), corpo),
    el(
      'ul',
      { class: 'mm-legenda', 'aria-label': t('mese.legenda') },
      ['menu', 'variato', 'non-pubblicato', 'chiuso'].map((s) => el('li', {}, segno(`mm-${s}`), testoStato(s)))
    )
  );

  if (o.fuoco === 'prec' || o.fuoco === 'succ') {
    const b = radice.querySelector(`.mm-freccia[data-verso="${o.fuoco}"]`);
    (b.disabled ? radice.querySelector('.mm-freccia:not(:disabled)') ?? radice.querySelector('[data-data][tabindex="0"]') : b)?.focus();
  } else if (o.fuoco) radice.querySelector(`[data-data="${o.fuoco}"]`)?.focus();
}

/** Il giorno raggiungibile con Tab, per portarci il fuoco quando il mese si apre. */
export const giornoAttivo = (radice) => radice.querySelector('[data-data][tabindex="0"]');

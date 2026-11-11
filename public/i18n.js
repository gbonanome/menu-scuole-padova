// Traduzioni della pagina. L'italiano è qui dentro (nessuna richiesta in più); le altre lingue sono in
// lingue/<codice>.json e i nomi dei piatti in data/piatti-<codice>.json, caricati solo quando servono.
// Una chiave che manca nella lingua scelta si mostra in italiano. Nessuna funzione qui tocca la pagina,
// tranne applicaTesti(): il resto si prova in Node (test/i18n.test.js).

export const LINGUE = ['it', 'en', 'ro', 'zh', 'bn', 'sq', 'ar', 'ur'];
export const CHIAVE_LINGUA = 'menu-scuole-padova:lingua';
const RTL = new Set(['ar', 'ur']);

/**
 * Testi italiani. {0}, {1}… sono i segnaposto. Nei testi delle istruzioni <em>…</em> e <a>…</a> indicano
 * gli elementi già presenti nel markup, nello stesso ordine: la traduzione ne cambia solo il testo.
 */
export const IT = {
  // pagina (index.html)
  'pagina.titolo': 'Menu Scuole Padova · il menu della mensa nel tuo calendario',
  'pagina.descrizione': 'Il menu delle mense scolastiche del Comune di Padova, con le variazioni aggiornate. Progetto non ufficiale.',
  salta: 'Vai al contenuto',
  'errore.dati': 'Impossibile caricare i dati. Riprova più tardi.',
  'errore.menu': 'Impossibile caricare il menu. Controlla la connessione e riprova.',
  'errore.riprova': 'Riprova',

  // scuole salvate e scuola scelta
  'scuole.aria': 'Le tue scuole',
  'scuole.dettagli': 'Dettagli, cambia o rimuovi',
  'scuole.aggiungi': '＋ Aggiungi',
  'scuole.aggiungi.aria': 'Aggiungi scuola',
  'scuola.aria': 'Scuola scelta',
  'scuola.cambia': 'Cambia scuola',
  'scuola.rimuovi': 'Rimuovi',
  'scuola.dallelenco': 'Menu scelto dall’elenco',

  // ricerca
  'scelta.titolo': 'Che cosa si mangia oggi a scuola?',
  'scelta.titolo.cambia': 'Cambia {0} con…',
  'scelta.titolo.aggiungi': 'Aggiungi una scuola',
  'scelta.intro': 'Cerca la tua scuola o il tuo nido: vedi il menu della mensa giorno per giorno, con le variazioni comunicate da Dussmann, e puoi aggiungerlo al tuo calendario.',
  'scelta.etichetta': 'Nome della scuola o del nido',
  'scelta.esempio': 'es. Montegrappa, Il Trenino…',
  'scelta.aiuto': 'Scrivi almeno 2 lettere.',
  'scelta.risultati': 'Scuole trovate',
  'scelta.nessuna': 'Nessuna scuola trovata. Prova a scegliere direttamente il menu qui sotto.',
  'scelta.ic': '{0} IC',
  'scelta.menu': 'Non trovi la scuola? Scegli direttamente il menu',
  'scelta.menu.vuoto': '— scegli il menu —',
  'scelta.annulla': 'Annulla',

  // oggi e settimana
  oggi: 'Oggi',
  domani: 'Domani',
  'oggi.aria': 'Menu di oggi',
  'oggi.prossimo.aria': 'Prossimo menu',
  'oggi.frase': 'Oggi, {0}: {1}.',
  'oggi.chiuso.nido': 'nido chiuso ({0})',
  'oggi.chiuso.scuola': 'scuola chiusa ({0})',
  'oggi.nonpubblicato': 'menu non ancora pubblicato',
  'oggi.noniniziata': 'la mensa non è ancora iniziata',
  'oggi.niente': 'niente mensa',
  'oggi.prossimasettimana': 'Ecco la prossima settimana.',
  ciclo: '{0} · settimana {1} di {2}',
  'stagione.estivo': 'Menu estivo',
  'stagione.autunnale': 'Menu autunnale',
  'stagione.invernale': 'Menu invernale',
  'stagione.primaverile': 'Menu primaverile',
  'stagione.altra': 'Menu',
  'settimana.aria': 'Menu della settimana',
  'settimana.prec': 'Settimana precedente',
  'settimana.succ': 'Settimana successiva',
  'giorno.oggi': 'oggi',
  'giorno.oggi.aria': '{0}, oggi',
  'giorno.chiuso.nido': 'Nido chiuso · {0}',
  'giorno.chiuso.scuola': 'Scuola chiusa · {0}',
  'giorno.nonpubblicato': 'Menu non ancora pubblicato',
  'giorno.noniniziata': 'Mensa non ancora iniziata',
  'giorno.nessuno': 'Nessun menu',
  'giorno.daqui': 'Da qui: {0}',

  // mini mese (navigatore delle date)
  'mese.aria': 'Calendario del mese',
  'mese.apri': 'Scegli una data dal calendario',
  'mese.titolo': 'Vista mensile',
  'mese.chiudi': 'Chiudi',
  'mese.prec': 'Mese precedente',
  'mese.succ': 'Mese successivo',
  'mese.legenda': 'Legenda',
  'mese.menu': 'menu',
  'mese.variazione': 'variazione',
  'mese.nonpubblicato': 'menu non pubblicato',
  'mese.chiuso': 'chiuso',

  // piatti e variazioni
  oppure: 'oppure',
  variato: 'variato',
  'variazione.titolo': 'Variazione',
  'variazione.pubblicata': 'Avviso pubblicato da Dussmann il {0}',
  'variazione.sostitutivo': 'Menu sostitutivo',
  'variazione.alposto': 'al posto di: {0}',
  'variazione.generica': 'Il menu di questo giorno potrebbe essere diverso: leggi l’avviso.',
  'variazione.fonte': 'fonte',
  'variazione.testo': 'Testo dell’avviso',
  'variazione.traduci': 'Traduci',

  // calendario e schermata Home
  'cal.titolo': 'Aggiungi al calendario',
  'cal.titolo.scuola': 'Aggiungi al calendario: {0}',
  'cal.istruzioni': 'Come funziona? Istruzioni nelle impostazioni',
  condividi: 'Condividi',
  'condividi.titolo': 'Il menu della mensa: {0}',
  'condividi.copiato': 'Link copiato.',
  'cal.indirizzo': 'Indirizzo del calendario: {0}',
  'cal.copia': 'Copia',
  'cal.copiato': 'Indirizzo copiato.',
  'cal.iphone': 'iPhone e iPad',
  'cal.iphone.testo':
    'Tocca <em>Aggiungi al calendario</em> e conferma con <em>Iscriviti</em>. In alternativa: Impostazioni → Calendario → Account → Aggiungi account → Altro → Aggiungi calendario sottoscritto, e incolla l\'indirizzo. Per ricevere l\'avviso delle 7:00 nei giorni variati, nelle impostazioni del calendario sottoscritto disattiva <em>Rimuovi avvisi</em>.',
  'cal.android': 'Android e Google Calendar',
  'cal.android.testo':
    'Da computer apri Google Calendar → <em>Altri calendari</em> → <em>+</em> → <em>Da URL</em> e incolla l\'indirizzo. Sul telefono, nell\'app Google Calendar, attiva la sincronizzazione del nuovo calendario. Google aggiorna i calendari sottoscritti con calma: una variazione può comparire anche dopo 24 ore. Google non mostra gli avvisi dei calendari sottoscritti: nelle impostazioni del calendario lascia le notifiche disattivate, così non ricevi un avviso ogni giorno.',
  'cal.outlook.testo': 'In Outlook web: <em>Aggiungi calendario</em> → <em>Sottoscrivi dal Web</em>, incolla l\'indirizzo e salva.',
  'home.titolo': 'La pagina sulla schermata Home',
  'home.intro': 'Un\'icona sul telefono che apre direttamente il menu della tua scuola. Prima scegli la scuola, poi:',
  'home.iphone.testo':
    'In Safari tocca il pulsante <em>Condividi</em> (il quadrato con la freccia verso l\'alto), poi <em>Aggiungi alla schermata Home</em> e conferma con <em>Aggiungi</em>.',
  'home.android.testo': 'In Chrome tocca il menu <em>⋮</em> in alto a destra, poi <em>Aggiungi a schermata Home</em> (o <em>Installa app</em>) e conferma.',

  // barra in basso e pannello impostazioni
  'barra.aria': 'Scorciatoie',
  'barra.mese': 'Mese',
  impostazioni: 'Impostazioni',
  'impostazioni.chiudi': 'Chiudi',
  'impostazioni.lingua': 'Lingua',
  'impostazioni.calendario': 'Il menu nel tuo calendario',
  'impostazioni.calendario.scegli': 'Scegli prima una scuola: qui trovi poi l’indirizzo del suo calendario.',
  'impostazioni.segnala':
    'Un giorno sbagliato, una scuola con il menu sbagliato? <a>Apri una segnalazione su GitHub</a>, già compilata con la scuola scelta.',
  'impostazioni.progetto': 'Il progetto',

  // piede e data simulata
  'piede.nota':
    'Progetto non ufficiale, senza legami con Dussmann Service o con il Comune di Padova. Fa sempre fede il menu ufficiale su <a>scuoledussmann.it/padova</a>. Diete speciali e allergeni esclusi. L’abbinamento tra scuola e menu è ricavato dai documenti del Comune.',
  'piede.aggiornato': 'Ultimo controllo della fonte: {0}.',
  'piede.segnala': 'Segnala un errore',
  'piede.codice': 'Codice sorgente',
  'piede.versione': 'Versione {0}',
  'prova.testo': 'Data simulata: la pagina fa come se oggi fosse {0}.',
  'prova.torna': 'Torna alla data reale'
};

/**
 * Chiavi facoltative per i dati (tipi di menu, ordini di scuola): in italiano vale sempre il testo dei dati,
 * nelle altre lingue la traduzione se c'è. Forme: dati.feed.<slug>, dati.feed.<slug>.breve, dati.ordine.<ordine>.
 */
export const PREFISSO_DATI = 'dati.';

let lingua = 'it';
/** Lingua per Intl: se il browser non ha i dati di quella lingua (succede per esempio con l'albanese)
 *  meglio l'inglese che le date nella lingua del sistema, spesso l'italiano. */
const localeDate = () => (Intl.DateTimeFormat.supportedLocalesOf(lingua).length ? lingua : 'en');
/** Numeri nella scrittura della lingua (per esempio le cifre bengalesi); in italiano come prima. */
const numero = (n) => (it() || !Intl.NumberFormat.supportedLocalesOf(lingua).length ? n : new Intl.NumberFormat(lingua).format(n));
let dizionario = {};
let piatti = {};

export const linguaAttiva = () => lingua;
export const eRtl = (codice = lingua) => RTL.has(codice);

/** Imposta lingua e testi già caricati (usata da caricaLingua e dai test). */
export function impostaLingua(codice, testi = {}, nomiPiatti = {}) {
  lingua = LINGUE.includes(codice) ? codice : 'it';
  dizionario = lingua === 'it' ? {} : testi;
  piatti = lingua === 'it' ? {} : nomiPiatti;
}

const sostituisci = (testo, valori) => testo.replace(/\{(\d+)\}/g, (m, n) => (valori[n] !== undefined ? String(valori[n]) : m));

/** Testo dell'interfaccia nella lingua scelta; se manca, in italiano. */
export function t(chiave, ...valori) {
  const testo = dizionario[chiave] ?? IT[chiave];
  if (testo === undefined) {
    console.warn(`i18n: chiave sconosciuta ${chiave}`);
    return chiave;
  }
  return sostituisci(testo, valori);
}

/** Testo che viene dai dati (in italiano): tradotto solo se la lingua scelta ha la chiave. */
export const tDato = (chiave, italiano) => (lingua === 'it' ? italiano : (dizionario[PREFISSO_DATI + chiave] ?? italiano));

/** Nome di un piatto nella lingua scelta; se manca la traduzione resta quello italiano. */
export const piatto = (nome) => (lingua === 'it' ? nome : (piatti[nome] ?? nome));

/** Lingua all'avvio: quella salvata sul dispositivo, poi ?lingua= nell'indirizzo, poi italiano. Mai quella del browser. */
export function linguaIniziale(salvata, daIndirizzo) {
  for (const c of [salvata, daIndirizzo]) if (LINGUE.includes(c)) return c;
  return 'it';
}

/** Carica testi e piatti di una lingua. Se i testi non arrivano resta l'italiano; se mancano i piatti, nomi italiani. */
export async function caricaLingua(codice) {
  if (!LINGUE.includes(codice) || codice === 'it') return impostaLingua('it');
  const leggi = async (url) => {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.json();
  };
  const [testi, nomi] = await Promise.allSettled([leggi(`lingue/${codice}.json`), leggi(`data/piatti-${codice}.json`)]);
  if (testi.status === 'rejected') {
    console.error(testi.reason);
    return impostaLingua('it');
  }
  const soloTesti = (o) => Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => typeof v === 'string'));
  impostaLingua(codice, soloTesti(testi.value), nomi.status === 'fulfilled' ? soloTesti(nomi.value) : {});
}

/** Link a Google Traduttore per il testo libero degli avvisi (resta in italiano). */
export function linkTraduzione(testo, codice = lingua) {
  const MAX = 1800; // l'indirizzo intero deve restare corto: i caratteri accentati diventano %XX
  const breve = testo.length > MAX ? `${testo.slice(0, MAX)}…` : testo;
  const tl = codice === 'zh' ? 'zh-CN' : codice;
  return `https://translate.google.com/?sl=it&tl=${tl}&text=${encodeURIComponent(breve)}&op=translate`;
}

// ---------- date ----------
// In italiano tabelle e formati espliciti: il risultato è identico a prima su ogni dispositivo
// (Intl dà gli stessi nomi, ma per esempio formatRange scrive "09–13 novembre"). Nelle altre lingue Intl.
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const daIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const piuGiorni = (s, n) => {
  const d = daIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
export const numGiorno = (s) => Number(s.slice(8, 10));
const anno = (s) => s.slice(0, 4);
const formato = (s, opzioni) => new Intl.DateTimeFormat(localeDate(), opzioni).format(daIso(s));
const it = () => lingua === 'it';

/** "lunedì" */
export const nomeGiorno = (s) => (it() ? GIORNI[daIso(s).getDay()] : formato(s, { weekday: 'long' }));
/** "lun", nell'intestazione dei giorni */
export const giornoBreve = (s) => (it() ? nomeGiorno(s).slice(0, 3) : formato(s, { weekday: 'short' }));
/** "novembre" */
export const nomeMese = (s) => (it() ? MESI[Number(s.slice(5, 7)) - 1] : formato(s, { month: 'long' }));
/** "9", il numero grande nell'intestazione dei giorni */
export const numeroGiorno = (s) => (it() ? String(numGiorno(s)) : formato(s, { day: 'numeric' }));
/** "novembre 2026", nell'intestazione del mini mese */
export const meseEAnno = (s) => (it() ? `${nomeMese(s)} ${anno(s)}` : formato(s, { month: 'long', year: 'numeric' }));
/** "lunedì 9 novembre" */
export const dataLunga = (s) => (it() ? `${nomeGiorno(s)} ${numGiorno(s)} ${nomeMese(s)}` : formato(s, { weekday: 'long', day: 'numeric', month: 'long' }));
/** "lunedì 9 novembre 2026" */
export const dataLungaConAnno = (s) => (it() ? `${dataLunga(s)} ${anno(s)}` : formato(s, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
/** "9 novembre" */
export const giornoEMese = (s) => (it() ? `${numGiorno(s)} ${nomeMese(s)}` : formato(s, { day: 'numeric', month: 'long' }));
/** "9 novembre 2026" */
export const dataConAnno = (s) => (it() ? `${giornoEMese(s)} ${anno(s)}` : formato(s, { day: 'numeric', month: 'long', year: 'numeric' }));
/** "lunedì 9" accanto a "Oggi" nel vassoio (nelle altre lingue la data lunga: "9 Monday" non si legge bene). */
export const giornoENumero = (s) => (it() ? `${nomeGiorno(s)} ${numGiorno(s)}` : dataLunga(s));

/** "9–13 novembre", oppure "30 novembre – 4 dicembre" a cavallo di due mesi. */
export function etichettaSettimana(lun) {
  const ven = piuGiorni(lun, 4);
  if (it()) {
    return nomeMese(lun) === nomeMese(ven) ? `${numGiorno(lun)}–${numGiorno(ven)} ${nomeMese(ven)}` : `${numGiorno(lun)} ${nomeMese(lun)} – ${numGiorno(ven)} ${nomeMese(ven)}`;
  }
  const f = new Intl.DateTimeFormat(localeDate(), { day: 'numeric', month: 'long' });
  return f.formatRange ? f.formatRange(daIso(lun), daIso(ven)) : `${f.format(daIso(lun))} – ${f.format(daIso(ven))}`;
}

// ---------- testi composti (puri, provati nei test) ----------
const nomeStagione = (s) =>
  ({ estivo: t('stagione.estivo'), autunnale: t('stagione.autunnale'), invernale: t('stagione.invernale'), primaverile: t('stagione.primaverile') })[s];

/** "Menu autunnale · settimana 3 di 4" */
export const testoCiclo = (g) => t('ciclo', nomeStagione(g.stagione) ?? t('stagione.altra'), numero(g.settimana), numero(g.settimane));
/** "Da qui: Menu invernale" quando cambia la stagione */
export const testoCambioStagione = (g) => t('giorno.daqui', nomeStagione(g.stagione) ?? g.stagione);

/**
 * "Oggi, domenica 8 novembre: niente mensa." con il motivo quando c'è.
 * @param {{data:string, giorno?:object, nido:boolean, dal?:string}} p dal = primo giorno con il menu
 */
export function testoOggi({ data, giorno, nido, dal }) {
  let motivo;
  if (giorno?.stato === 'chiuso') motivo = t(nido ? 'oggi.chiuso.nido' : 'oggi.chiuso.scuola', giorno.motivo);
  else if (giorno?.stato === 'non-pubblicato') motivo = t('oggi.nonpubblicato');
  else if (dal && data < dal) motivo = t('oggi.noniniziata');
  else motivo = t('oggi.niente');
  return t('oggi.frase', dataLunga(data), motivo);
}

/** Testo di un giorno senza menu nella settimana. Stessi parametri di testoOggi. */
export function testoGiornoVuoto({ data, giorno, nido, dal }) {
  if (giorno?.stato === 'chiuso') return t(nido ? 'giorno.chiuso.nido' : 'giorno.chiuso.scuola', giorno.motivo);
  if (giorno?.stato === 'non-pubblicato') return t('giorno.nonpubblicato');
  if (dal && data < dal) return t('giorno.noniniziata');
  return t('giorno.nessuno');
}

// ---------- testi statici di index.html ----------
// Il markup resta in italiano (si legge anche senza JS). Gli attributi data-t="chiave" (testo dell'elemento),
// data-t-aria-label, data-t-placeholder, data-t-title, data-t-content indicano la chiave; data-t-valori="a|b"
// riempie i segnaposto. In italiano non si tocca nulla, finché non si torna da un'altra lingua.
let testiTradotti = false;

/** Mette il testo in un elemento; <em>…</em> e <a>…</a> riusano, in ordine, gli elementi già presenti. */
function riempi(elemento, testo) {
  const presenti = { em: [...elemento.querySelectorAll(':scope > em')], a: [...elemento.querySelectorAll(':scope > a')] };
  const pezzi = [];
  let ultimo = 0;
  for (const m of testo.matchAll(/<(em|a)>(.*?)<\/\1>/g)) {
    pezzi.push(testo.slice(ultimo, m.index));
    const originale = presenti[m[1]].shift();
    const nodo = originale ? originale.cloneNode(false) : m[1] === 'em' ? document.createElement('em') : null;
    if (nodo) {
      nodo.textContent = m[2];
      pezzi.push(nodo);
    } else pezzi.push(m[2]);
    ultimo = m.index + m[0].length;
  }
  pezzi.push(testo.slice(ultimo));
  elemento.replaceChildren(...pezzi.filter((p) => p !== ''));
}

/** Aggiorna lang, dir e i testi statici della pagina secondo la lingua attiva. */
export function applicaTesti(radice = document) {
  const html = radice.documentElement;
  html.lang = lingua;
  if (eRtl()) html.dir = 'rtl';
  else html.removeAttribute('dir');
  // Il bollino "variato" è nel CSS (::after): il testo arriva da una variabile.
  if (lingua === 'it') {
    html.style.removeProperty('--t-variato');
    if (!html.getAttribute('style')) html.removeAttribute('style');
  } else html.style.setProperty('--t-variato', JSON.stringify(t('variato')));
  if (lingua === 'it' && !testiTradotti) return;
  testiTradotti = true;
  for (const e of radice.querySelectorAll('[data-t], [data-t-aria-label], [data-t-placeholder], [data-t-title], [data-t-content]')) {
    const valori = e.dataset.tValori?.split('|') ?? [];
    for (const { name, value } of [...e.attributes]) {
      if (name === 'data-t') riempi(e, t(value, ...valori));
      else if (name.startsWith('data-t-') && name !== 'data-t-valori') e.setAttribute(name.slice(7), t(value, ...valori));
    }
  }
}

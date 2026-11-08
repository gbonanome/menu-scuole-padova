// Feed iCalendar (RFC 5545) per ogni menu: un evento di giornata intera per ogni giorno di mensa.
// UID stabili; SEQUENCE e LAST-MODIFIED cambiano solo quando cambia il contenuto (stato in data/ics-state.json).
import { createHash } from 'node:crypto';
import { addDays } from './lib/dates.js';
import { FEED_INFO, FONTE, FONTE_NOTIZIE, piattiPerTitolo } from './model.js';

export const HOST = 'gbonanome.github.io';
export const BASE_URL = 'https://gbonanome.github.io/menu-scuole-padova/';

/** Escape dei valori TEXT: backslash, punto e virgola, virgola, a capo. */
export function escapeTesto(s) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Spezza una riga a 75 ottetti (UTF-8) senza tagliare i caratteri multibyte; le continuazioni iniziano con uno spazio. */
export function piegaRiga(riga) {
  if (Buffer.byteLength(riga, 'utf8') <= 75) return riga;
  const parti = [];
  let corrente = '';
  let byte = 0;
  let limite = 75;
  for (const ch of riga) {
    const b = Buffer.byteLength(ch, 'utf8');
    if (byte + b > limite) {
      parti.push(corrente);
      corrente = '';
      byte = 0;
      limite = 74; // lo spazio iniziale della continuazione conta
    }
    corrente += ch;
    byte += b;
  }
  parti.push(corrente);
  return parti.join('\r\n ');
}

const dataIcs = (iso) => iso.replace(/-/g, '');
const istanteIcs = (isoTs) => isoTs.replace(/[-:]/g, '').replace(/\.\d+/, '').replace(/(\d{8}T\d{6}).*$/, '$1Z');
const dataIt = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export function titoloEvento(g) {
  const base = piattiPerTitolo(g.piatti).join(' · ');
  return g.variazioni.length ? `⚠️ VARIATO · ${base}` : `🍽 ${base}`;
}

export function descrizioneEvento(g, feed, { baseUrl = BASE_URL } = {}) {
  const righe = [];
  g.piatti.forEach((p, i) => {
    if (p === 'oppure') righe.push('— oppure —');
    else if (g.originali && !g.menuSostituito && g.originali[i] !== p) righe.push(`• ${p} (era: ${g.originali[i]})`);
    else righe.push(`• ${p}`);
  });
  if (g.menuSostituito) righe.push('', `Menu previsto prima della variazione: ${g.originali.filter((p) => p !== 'oppure').join(', ')}`);
  righe.push('', `Settimana ${g.settimana} di ${g.settimane} · Menu ${g.stagione} ${g.annoScolastico}`);
  for (const v of g.variazioni) {
    righe.push('', `⚠️ VARIAZIONE (pubblicata il ${dataIt(v.pubblicata)}): ${v.titolo}`, v.testo, `Fonte: ${FONTE_NOTIZIE}`);
  }
  righe.push('');
  if (g.pdf) righe.push(`Menu ufficiale (PDF): ${g.pdf}`);
  righe.push(`Tutto il menu: ${baseUrl}#${feed}`);
  return righe.join('\n');
}

/**
 * @param {string} feed
 * @param {object[]} giorni  dal modello (solo quelli con stato "menu" diventano eventi)
 * @param {Record<string,{h:string,seq:number,mod:string}>} stato  aggiornato sul posto
 * @param {{ora:string, host?:string, baseUrl?:string}} opz  ora = istante ISO della build
 */
export function costruisciIcs(feed, giorni, stato, { ora, host = HOST, baseUrl = BASE_URL }) {
  const nome = `Menu Scuole Padova · ${FEED_INFO[feed].breve}`;
  const righe = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Menu Scuole Padova//menu-scuole-padova//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeTesto(nome)}`,
    `X-WR-CALDESC:${escapeTesto(`Menu della mensa scolastica (${FEED_INFO[feed].breve}), Comune di Padova. Progetto non ufficiale: fa fede il menu pubblicato su ${FONTE}`)}`,
    'X-WR-TIMEZONE:Europe/Rome',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H'
  ];
  for (const g of giorni) {
    if (g.stato !== 'menu') continue;
    const uid = `${feed}-${dataIcs(g.data)}@${host}`;
    const summary = titoloEvento(g);
    const description = descrizioneEvento(g, feed, { baseUrl });
    const h = createHash('sha256').update(`${summary}\n${description}`).digest('hex').slice(0, 16);
    const prec = stato[uid];
    if (!prec) stato[uid] = { h, seq: 0, mod: ora };
    else if (prec.h !== h) stato[uid] = { h, seq: prec.seq + 1, mod: ora };
    const { seq, mod } = stato[uid];
    righe.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${istanteIcs(mod)}`,
      `LAST-MODIFIED:${istanteIcs(mod)}`,
      `SEQUENCE:${seq}`,
      `DTSTART;VALUE=DATE:${dataIcs(g.data)}`,
      `DTEND;VALUE=DATE:${dataIcs(addDays(g.data, 1))}`,
      `SUMMARY:${escapeTesto(summary)}`,
      `DESCRIPTION:${escapeTesto(description)}`,
      `URL:${baseUrl}#${feed}`,
      'TRANSP:TRANSPARENT',
      'STATUS:CONFIRMED',
      // Promemoria solo nei giorni variati: alle 7:00 del giorno stesso (gli altri giorni nessun avviso).
      ...(g.variazioni.length
        ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeTesto(summary)}`, 'TRIGGER;RELATED=START:PT7H', 'END:VALARM']
        : []),
      'END:VEVENT'
    );
  }
  righe.push('END:VCALENDAR');
  return `${righe.map(piegaRiga).join('\r\n')}\r\n`;
}

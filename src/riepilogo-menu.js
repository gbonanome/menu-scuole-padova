// Riepilogo in Markdown di un menu estratto, per la Pull Request di revisione.
// Mostra settimana per settimana la griglia lunedì-venerdì e, se il menu esisteva già, le celle cambiate.
import { GIORNI_LAVORO } from './lib/dates.js';
import { giorniDelMenu } from './lib/expand.js';

const NOMI = { lun: 'Lun', mar: 'Mar', mer: 'Mer', gio: 'Gio', ven: 'Ven' };
const it = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const cella = (piatti = []) => piatti.map((p) => (p === 'oppure' ? '_oppure_' : p.replace(/\|/g, '\\|'))).join('<br>');

export function riepilogoMenu(menu, prec = null, avvisi = []) {
  const r = [];
  r.push(`## ${menu.feed} · ${menu.stagione} ${menu.annoScolastico} ${prec ? '(modificato)' : '(nuovo)'}`);
  r.push('');
  r.push(`**Titolo nel PDF:** ${menu.titolo}  `);
  if (menu.fonte?.url) r.push(`**PDF:** ${menu.fonte.url}  `);
  for (const v of menu.validita) {
    r.push(`**In vigore:** dal ${it(v.dal)} al ${it(v.al)}${v.settimana ? `, partenza ${v.giorno ?? ''} della settimana ${v.settimana}` : ''}  `);
  }
  for (const x of menu.riavvii) r.push(`**Ripartenza:** ${it(x.data)} dal ${x.giorno} della settimana ${x.settimana}  `);
  const giorni = giorniDelMenu(menu);
  const date = [...giorni.keys()].sort();
  if (date.length) r.push(`**Giorni con menu:** ${date.length}, dal ${it(date[0])} al ${it(date.at(-1))} (prima di togliere festività e sospensioni)`);
  r.push('');

  if (Object.keys(menu.note).length || menu.avvertenze.length) {
    r.push('**Note in testata**');
    for (const [n, t] of Object.entries(menu.note)) r.push(`- ${n}. ${t}`);
    for (const a of menu.avvertenze) r.push(`- ${a}`);
    r.push('');
  }
  if (menu.eccezioni.length) {
    r.push('**Piatti su date specifiche (dalle note)**: ' + menu.eccezioni.map((e) => `${it(e.data)} → ${e.piatto} (nota ${e.nota})`).join('; '));
    r.push('');
  }
  if (avvisi.length) {
    r.push('<details><summary>Avvisi dei controlli automatici (' + avvisi.length + ')</summary>', '');
    for (const a of avvisi) r.push(`- ${a}`);
    r.push('', '</details>', '');
  }

  const cambiate = [];
  for (const [w, sett] of Object.entries(menu.settimane)) {
    const dateSett = menu.intervalli.filter((i) => String(i.settimana) === w).map((i) => `${it(i.dal).slice(0, 5)}–${it(i.al).slice(0, 5)}`);
    r.push(`### Settimana ${w}${dateSett.length ? ` · ${dateSett.join(', ')}` : ''}`);
    r.push('');
    r.push(`| ${GIORNI_LAVORO.map((g) => NOMI[g]).join(' | ')} |`);
    r.push(`|${GIORNI_LAVORO.map(() => '---').join('|')}|`);
    r.push(
      `| ${GIORNI_LAVORO.map((g) => {
        const vecchio = prec?.settimane?.[w]?.[g];
        const diverso = prec && JSON.stringify(vecchio) !== JSON.stringify(sett[g]);
        if (diverso) cambiate.push({ w, g, prima: vecchio ?? [], dopo: sett[g] });
        return diverso ? `🔸 ${cella(sett[g])}` : cella(sett[g]);
      }).join(' | ')} |`
    );
    r.push('');
  }
  if (prec) {
    r.push(cambiate.length ? `**Celle cambiate rispetto alla versione precedente:** ${cambiate.length} (segnate con 🔸)` : '**Nessuna cella cambiata** (cambiano solo date, note o fonte).');
    for (const c of cambiate) r.push(`- Settimana ${c.w} ${NOMI[c.g]}: ~~${c.prima.join(', ')}~~ → ${c.dopo.join(', ')}`);
    r.push('');
  }
  return r.join('\n');
}

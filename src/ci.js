// Passi del workflow che parlano con GitHub tramite `gh` (issue e Pull Request).
// Uso:
//   node src/ci.js segnala --report report.json --problemi problemi.json
//   node src/ci.js corpo-pr --report report.json > corpo.md
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { riepilogoMenu } from './riepilogo-menu.js';
import { validaMenu } from './validate.js';
import { caricaCalendario } from './lib/calendario.js';

const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUN_URL = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : null;
const ETICHETTE = {
  'errore-aggiornamento': ['d73a4a', 'Lo scraping o il parsing automatico è fallito'],
  'variazione-da-verificare': ['fbca04', 'Variazione pubblicata con confidenza non alta'],
  'nuovo-menu': ['0e8a16', 'Nuovo menu stagionale da rivedere']
};

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const leggiJson = async (p, def) => {
  try {
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return def;
  }
};
const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};

function assicuraEtichette() {
  for (const [nome, [colore, descr]] of Object.entries(ETICHETTE)) gh('label', 'create', nome, '--color', colore, '--description', descr, '--force');
}

/** Issue con una chiave nel titolo: se esiste (anche chiusa) non ne crea un'altra. */
function issue({ chiave, titolo, corpo, etichetta, soloSeNuova = false }) {
  const trovate = JSON.parse(gh('issue', 'list', '--state', 'all', '--label', etichetta, '--search', `"${chiave}" in:title`, '--json', 'number,state,body', '--limit', '5'));
  const aperta = trovate.find((i) => i.state === 'OPEN');
  if (aperta) {
    if (!soloSeNuova && aperta.body.trim() !== corpo.trim()) gh('issue', 'edit', String(aperta.number), '--body', corpo);
    return aperta.number;
  }
  if (trovate.length && soloSeNuova) return null;
  const url = gh('issue', 'create', '--title', titolo, '--body', corpo, '--label', etichetta).trim();
  console.log(`Issue creata: ${url}`);
  return url;
}

async function segnala() {
  const rep = await leggiJson(arg('--report'), null);
  const esito = arg('--esito') ?? 'success';
  if (rep && esito !== 'success') rep.errori.push(`Il workflow non è terminato correttamente (esito: ${esito}). Controlla il log dell'esecuzione.`);
  const problemi = await leggiJson(arg('--problemi'), []);
  const variazioni = await leggiJson(path.join(RADICE, 'data/variations.json'), []);
  assicuraEtichette();

  // 1. Errori di scraping/parsing: una sola issue aperta, aggiornata; chiusa quando tutto torna a posto.
  const chiave = 'Aggiornamento automatico non riuscito';
  if (!rep) {
    issue({ chiave, titolo: `⚠️ ${chiave}`, etichetta: 'errore-aggiornamento', corpo: `Il passo di aggiornamento non ha prodotto un report: probabilmente è andato in errore.\n\n${RUN_URL ? `Esecuzione: ${RUN_URL}` : ''}` });
  } else if (rep.errori.length) {
    const corpo = [
      'Il workflow ha trovato errori durante scraping o parsing. I dati già pubblicati restano invariati finché il problema non è risolto.',
      '',
      ...rep.errori.map((e) => `- ${e}`),
      '',
      'Possibili cause: il sito di Dussmann è cambiato, un PDF ha un formato nuovo, la pagina non era raggiungibile.',
      RUN_URL ? `\nUltima esecuzione: ${RUN_URL}` : ''
    ].join('\n');
    issue({ chiave, titolo: `⚠️ ${chiave}`, etichetta: 'errore-aggiornamento', corpo });
  } else {
    const aperte = JSON.parse(gh('issue', 'list', '--state', 'open', '--label', 'errore-aggiornamento', '--json', 'number'));
    for (const i of aperte) {
      gh('issue', 'close', String(i.number), '--comment', `Risolto: l'ultimo aggiornamento è andato a buon fine${RUN_URL ? ` (${RUN_URL})` : ''}.`);
    }
  }

  // 2. Variazioni da verificare: una issue per variazione, mai ripetuta (anche se chiusa).
  const daVerificare = new Map();
  for (const v of variazioni) if (v.confidenza !== 'alta' && rep?.variazioniNuove?.some((x) => x.startsWith(v.id))) daVerificare.set(v.id, []);
  for (const p of problemi) if (p.livello === 'errore') daVerificare.set(p.id, [...(daVerificare.get(p.id) ?? []), p.msg]);
  for (const [id, msg] of daVerificare) {
    const v = variazioni.find((x) => x.id === id);
    if (!v) continue;
    const corpo = [
      `La variazione **${v.titolo}** (pubblicata il ${v.pubblicata}) è stata pubblicata nei feed come testo, ma va controllata.`,
      '',
      `- Confidenza: **${v.confidenza}**${v.motivi.length ? ` (${v.motivi.join('; ')})` : ''}`,
      `- Date riconosciute: ${v.date.join(', ') || 'nessuna'}`,
      `- Feed indicati dal testo: ${[...new Set(v.parti.flatMap((p) => p.feed))].join(', ')}`,
      v.sostituzioni.length ? `- Sostituzioni riconosciute: ${v.sostituzioni.map((s) => `${s.da} → ${s.a}`).join('; ')}` : '- Nessuna sostituzione di piatto riconosciuta: il menu resta quello del PDF, con il testo dell\'avviso.',
      ...msg.map((m) => `- ⚠️ ${m}`),
      '',
      '<details><summary>Testo della notizia</summary>',
      '',
      v.testo,
      '',
      '</details>',
      '',
      'Se serve una correzione, modifica `src/parse-variation.js` (e aggiungi un test) oppure chiudi la issue se va bene così.'
    ].join('\n');
    issue({ chiave: id, titolo: `Variazione da verificare: ${v.titolo} (${id})`, etichetta: 'variazione-da-verificare', corpo, soloSeNuova: true });
  }
}

async function corpoPr() {
  const rep = await leggiJson(arg('--report'), {});
  const cal = caricaCalendario(rep.annoScolastico ?? '2026-27');
  // Tutti i menu cambiati nel branch della PR rispetto a main (anche quelli arrivati in giri precedenti).
  const nomi = execFileSync('git', ['diff', '--name-only', 'origin/main', 'HEAD', '--', 'data/menus'], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/^data\/menus\//, '').replace(/\.json$/, ''));
  const parti = [
    'Il workflow ha trovato un menu nuovo o modificato sul sito di Dussmann. Controlla la griglia settimana per settimana con il PDF: quando fai il merge, i feed e la pagina si aggiornano.',
    '',
    '- Se qualcosa non torna nel parsing, correggi il JSON direttamente in questa PR (o il parser) prima del merge.',
    "- Se chiudi la PR senza merge il menu non viene pubblicato. Per riproporlo, togli il suo PDF da `data/state.json`.",
    ''
  ];
  for (const nome of nomi) {
    const file = path.join(RADICE, 'data/menus', `${nome}.json`);
    const menu = await leggiJson(file, null);
    if (!menu) continue;
    let prec = null;
    try {
      prec = JSON.parse(execFileSync('git', ['show', `origin/main:data/menus/${nome}.json`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    } catch {}
    parti.push(riepilogoMenu(menu, prec, validaMenu(menu, cal).avvisi));
  }
  if (rep.pdfIgnorati?.length) parti.push('', '<details><summary>PDF ignorati</summary>', '', ...rep.pdfIgnorati.map((p) => `- ${p}`), '', '</details>');
  parti.push('', '---', '_PR aperta automaticamente dal workflow di aggiornamento._');
  // GitHub limita il corpo delle PR a 65 536 caratteri
  let corpo = parti.join('\n');
  if (corpo.length > 64000) corpo = `${corpo.slice(0, 63000)}\n\n_(riepilogo troncato: troppo lungo per una PR)_`;
  process.stdout.write(corpo);
}

const comandi = { segnala, 'corpo-pr': corpoPr };
const cmd = comandi[process.argv[2]];
if (!cmd) {
  console.error(`Comandi: ${Object.keys(comandi).join(', ')}`);
  process.exit(1);
}
await cmd();

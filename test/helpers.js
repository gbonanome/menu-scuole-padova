// Strumenti comuni ai test: pipeline completa offline sulle fixture e snapshot su file.
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aggiorna } from '../src/update.js';
import { build } from '../src/build-site.js';
import { fetcherFixture } from '../src/scrape.js';

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OGGI = '2026-11-08';
export const ORA = '2026-11-08T12:00:00Z';

/**
 * scrape (dalle fixture) -> parse -> validazione -> build, in una cartella temporanea.
 * Le date sono fisse: il risultato è deterministico.
 */
export async function pipeline() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'menu-scuole-'));
  const dati = path.join(tmp, 'data');
  await mkdir(dati, { recursive: true });
  for (const f of await readdir(path.join(RADICE, 'data'))) {
    if (/^calendario-.*\.json$|^scuole-padova\.json$/.test(f)) await cp(path.join(RADICE, 'data', f), path.join(dati, f));
  }
  const get = fetcherFixture(path.join(RADICE, 'fixtures'));
  const rep = await aggiorna({ get, oggi: OGGI, dati });
  const out = path.join(tmp, 'dist');
  const { feeds, problemi } = await build({ ora: ORA, out, anno: '2026-27', dati });
  return { tmp, dati, out, get, rep, feeds, problemi };
}

const DIR_SNAP = path.join(RADICE, 'test', 'snapshots');

/**
 * Confronta `contenuto` con test/snapshots/<nome>.
 * Con UPDATE_SNAPSHOTS=1 (o se lo snapshot manca, fuori dalla CI) lo riscrive.
 */
export async function snapshot(assert, nome, contenuto) {
  const file = path.join(DIR_SNAP, nome);
  let atteso = null;
  try {
    atteso = await readFile(file, 'utf8');
  } catch {}
  if (process.env.UPDATE_SNAPSHOTS || (atteso === null && !process.env.CI)) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contenuto);
    return;
  }
  assert.ok(atteso !== null, `Snapshot mancante: ${nome} (rigenera con UPDATE_SNAPSHOTS=1 npm test)`);
  assert.equal(contenuto, atteso, `Snapshot diverso: ${nome}. Se il cambiamento è voluto: UPDATE_SNAPSHOTS=1 npm test`);
}

// Dizionario dei nomi dei piatti: file sorgente validi, build con i soli piatti usati, copertura sulle fixture.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from './helpers.js';
import { DIR_TRADUZIONI, LINGUE, caricaTraduzioni, confronta, piattiDeiFeed, piattiDelMenu, sezioneTraduzioniMancanti } from '../src/piatti.js';

let P;
let usati;
before(async () => {
  P = await pipeline();
  usati = piattiDeiFeed(P.feeds.values());
});

test('traduzioni: un file per lingua, JSON valido con sole stringhe non vuote e chiavi in ordine', async () => {
  for (const codice of LINGUE) {
    const file = path.join(DIR_TRADUZIONI, `piatti-${codice}.json`);
    const diz = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(typeof diz, 'object', file);
    assert.ok(diz && !Array.isArray(diz), `${file}: deve essere un oggetto`);
    const vuote = Object.entries(diz).filter(([, v]) => typeof v !== 'string' || !v.trim());
    assert.deepEqual(vuote, [], `${file}: voci vuote o non stringa`);
    const chiavi = Object.keys(diz);
    assert.deepEqual(chiavi, [...chiavi].sort((a, b) => a.localeCompare(b, 'it')), `${file}: chiavi non in ordine alfabetico`);
    assert.ok(!chiavi.some((k) => /^\s*oppure\s*$/i.test(k)), `${file}: "oppure" non è un piatto`);
  }
});

test('traduzioni: asterischi, rimandi e percentuali del nome italiano restano nella traduzione', async () => {
  const traduzioni = await caricaTraduzioni();
  for (const codice of LINGUE) {
    for (const [it, tr] of Object.entries(traduzioni[codice])) {
      for (const segno of ['*', '¹', '%']) assert.equal(tr.split(segno).length, it.split(segno).length, `${codice}: "${segno}" in ${it} → ${tr}`);
    }
  }
});

test('build: piatti-<lingua>.json con i soli piatti usati, identici al dizionario', async () => {
  const traduzioni = await caricaTraduzioni();
  const file = (await readdir(path.join(P.out, 'data'))).filter((f) => f.startsWith('piatti-')).sort();
  assert.deepEqual(file, LINGUE.map((c) => `piatti-${c}.json`).sort());
  const insieme = new Set(usati);
  assert.ok(!insieme.has('oppure'));
  for (const codice of LINGUE) {
    const pub = JSON.parse(await readFile(path.join(P.out, 'data', `piatti-${codice}.json`), 'utf8'));
    const nonUsati = Object.keys(pub).filter((k) => !insieme.has(k));
    assert.deepEqual(nonUsati, [], `${codice}: voci di piatti non usati`);
    for (const [k, v] of Object.entries(pub)) assert.equal(v, traduzioni[codice][k]);
  }
});

test('copertura sulle fixture: 100% in tutte le lingue', async () => {
  assert.ok(usati.length > 300, `piatti trovati: ${usati.length}`);
  const esito = confronta(usati, await caricaTraduzioni());
  const mancanti = LINGUE.filter((c) => esito[c].mancanti.length).map((c) => `[${c}] ${esito[c].mancanti.join(' | ')}`);
  assert.deepEqual(mancanti, [], `Piatti senza traduzione:\n${mancanti.join('\n')}`);
});

test('piatti: comprende i piatti originali delle variazioni e i piatti spostati dalle note', () => {
  const giorni = [...P.feeds.values()].flatMap((f) => f.giorni);
  const originali = giorni.flatMap((g) => g.originali ?? []);
  const daNota = giorni.flatMap((g) => g.daNota ?? []);
  assert.ok(originali.length && daNota.length);
  for (const p of [...originali, ...daNota]) if (p !== 'oppure') assert.ok(usati.includes(p), p);
});

test('PR dei menu: nessuna sezione se i piatti dei menu sono tutti tradotti', async () => {
  const traduzioni = await caricaTraduzioni();
  const dir = path.join(P.dati, 'menus');
  const piatti = [];
  for (const feed of await readdir(dir)) {
    for (const f of await readdir(path.join(dir, feed))) piatti.push(...piattiDelMenu(JSON.parse(await readFile(path.join(dir, feed, f), 'utf8'))));
  }
  assert.ok(piatti.length && !piatti.some((p) => /[¹²³⁴⁵⁶⁷⁸⁹⁰]$/.test(p)), 'senza rimandi alle note');
  assert.equal(sezioneTraduzioniMancanti(piatti, traduzioni), '');
});

test('PR dei menu: sezione con il conteggio per lingua e i nomi italiani dei piatti nuovi', () => {
  const traduzioni = Object.fromEntries(LINGUE.map((c) => [c, { Pane: 'x' }]));
  traduzioni.en['Gnocchi al ragù*'] = 'Gnocchi with ragù*';
  const s = sezioneTraduzioniMancanti(['Pane', 'oppure', 'Gnocchi al ragù*', 'Torta di carote', 'Torta di carote'], traduzioni);
  assert.match(s, /^## Traduzioni dei piatti/);
  assert.match(s, /2 piatti di questi menu/);
  assert.match(s, new RegExp(`\\| ${LINGUE.join(' \\| ')} \\|`));
  assert.match(s, new RegExp(`\\| ${LINGUE.map((c) => (c === 'en' ? 1 : 2)).join(' \\| ')} \\|`));
  assert.match(s, /^- Torta di carote$/m);
  assert.match(s, /^- Gnocchi al ragù\\\* \(ro, zh, bn, sq, ar, ur\)$/m, 'asterisco protetto, lingue mancanti indicate');
  assert.ok(!/^- (Pane|oppure)/m.test(s));
});

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * Estrae gli elementi di testo della prima pagina con posizione.
 * @returns {Promise<{str:string,x:number,y:number,w:number,h:number}[]>}
 */
export async function estraiTesto(buffer) {
  return (await estraiPagina(buffer)).items;
}

/**
 * Come estraiTesto, ma restituisce anche i rettangoli di ritaglio (clip) della pagina:
 * in questi PDF coincidono con le celle della tabella.
 */
export async function estraiPagina(buffer) {
  const loading = getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    verbosity: 0
  });
  const doc = await loading.promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const items = tc.items
    .filter((i) => i.str.trim() !== '')
    .map((i) => ({
      str: i.str.replace(/\s+/g, ' ').trim(),
      x: i.transform[4],
      y: i.transform[5],
      w: i.width,
      h: i.height
    }));
  const ol = await page.getOperatorList();
  const rects = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    if (ol.fnArray[i] !== OPS.constructPath) continue;
    const v = Object.values(ol.argsArray[i][1][0] ?? {});
    const xs = [];
    const ys = [];
    for (let k = 0; k < v.length; ) {
      if (v[k] === 4) k += 1;
      else {
        xs.push(v[k + 1]);
        ys.push(v[k + 2]);
        k += 3;
      }
    }
    if (xs.length) rects.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
  }
  await loading.destroy();
  return { items, rects };
}

/** Raggruppa per riga (stessa y entro tolleranza), dall'alto in basso. */
export function righe(items, tol = 1.6) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out = [];
  for (const it of sorted) {
    const last = out.at(-1);
    if (last && Math.abs(last.y - it.y) <= tol) last.items.push(it);
    else out.push({ y: it.y, items: [it] });
  }
  for (const r of out) {
    r.items.sort((a, b) => a.x - b.x);
    r.text = r.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
  }
  return out;
}

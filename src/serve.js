// Server statico minimo per provare dist/ in locale: node src/serve.js [porta]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ics': 'text/calendar; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const porta = Number(process.argv[2] ?? 8080);

createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/^\/menu-scuole-padova/, ''));
  const file = path.join(DIST, p.endsWith('/') ? `${p}index.html` : p);
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TIPI[path.extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('Non trovato');
  }
}).listen(porta, () => console.log(`http://localhost:${porta}/`));

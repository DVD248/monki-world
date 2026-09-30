import http from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import { createApi, readJson } from './lib/api.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.MONKI_DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
await mkdir(DATA, { recursive: true });

// Only ever called with an id the API has already checked is 24 hex characters.
async function load(id) {
  try { return JSON.parse(await readFile(path.join(DATA, `${id}.json`), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}
async function save(room) {
  const file = path.join(DATA, `${room.id}.json`), temp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(temp, JSON.stringify(room), { mode: 0o600 });
  await rename(temp, file);
}
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function localAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${PORT}`);
}
const api = createApi({ load, save, addresses: localAddresses });

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      const [status, data] = await api({ method: req.method, pathname: url.pathname, headers: req.headers, ip: req.socket.remoteAddress, body: () => readJson(req) });
      return send(res, status, data);
    }
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'Invalid path' }); }
    const isShared = pathname.startsWith('/shared/');
    const base = path.join(ROOT, isShared ? 'shared' : 'public');
    const relative = isShared ? pathname.slice(8) : pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep) || relative.startsWith('.') || relative.includes('/.')) return send(res, 403, { error: 'Not available' });
    let bytes;
    try { bytes = await readFile(file); } catch { return send(res, 404, { error: 'Not found' }); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (error) { send(res, error.status || 400, { error: error.status ? error.message : 'Could not save that. Please try again.' }); }
});
server.listen(PORT, HOST, () => {
  console.log(`\n  MONKI WORLD\n  Open http://localhost:${PORT}\n  On the same Wi-Fi: ${localAddresses().join(' or ')}\n  World files: ${DATA}\n`);
});

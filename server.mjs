import http from 'node:http';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import os from 'node:os';
import { createWorld, applyOperation, visibleWorld, PEOPLE, other } from './shared/world.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.MONKI_DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const token = () => randomBytes(24).toString('hex');
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const locks = new Map();
const limits = new Map();
await mkdir(DATA, { recursive: true });

async function exclusive(id, work) {
  const previous = locks.get(id) || Promise.resolve();
  const next = previous.catch(() => {}).then(work);
  locks.set(id, next);
  try { return await next; } finally { if (locks.get(id) === next) locks.delete(id); }
}
async function load(id) {
  if (!/^[a-f0-9]{24}$/.test(id || '')) throw Object.assign(new Error('World not found'), { status: 404 });
  try { return JSON.parse(await readFile(path.join(DATA, `${id}.json`), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') throw Object.assign(new Error('World not found'), { status: 404 }); throw e; }
}
async function save(room) {
  const file = path.join(DATA, `${room.id}.json`), temp = `${file}.${token().slice(0, 8)}.tmp`;
  await writeFile(temp, JSON.stringify(room), { mode: 0o600 });
  await rename(temp, file);
}
function auth(req, room) {
  const value = (req.headers.authorization || '').replace(/^Bearer /, '');
  const actor = PEOPLE.find(p => equal(room.members[p], value));
  if (!actor) throw Object.assign(new Error('This world needs its invitation link'), { status: 401 });
  return actor;
}
async function body(req) {
  // Decoded once at the end: a character split across two chunks otherwise arrives broken.
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256000) throw Object.assign(new Error('Too large'), { status: 413 });
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(data || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function localAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => `http://${n.address}:${PORT}`);
}
function rateLimit(req) {
  const key = req.socket.remoteAddress, now = Date.now();
  let entry = limits.get(key);
  if (!entry || now - entry.at > 60000) { entry = { at: now, n: 0 }; limits.set(key, entry); }
  // Room for both phones behind one address (a hosted server reached from home), each polling
  // every few seconds and sending bursts of touches. At 180, one phone poking for a minute was cut off.
  if (++entry.n > 600) throw Object.assign(new Error('A little too fast. Try again in a minute.'), { status: 429 });
  if (limits.size > 2000) for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      rateLimit(req);
      if (req.method === 'POST') {
        if (!req.headers['content-type']?.includes('application/json')) return send(res, 415, { error: 'JSON required' });
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(res, 403, { error: 'Different origin' });
      }
      if (url.pathname === '/api/health') return send(res, 200, { ok: true, addresses: localAddresses() });
      if (url.pathname === '/api/rooms' && req.method === 'POST') {
        const data = await body(req);
        if (!PEOPLE.includes(data.actor)) return send(res, 400, { error: 'Choose David or Julia' });
        const id = randomBytes(12).toString('hex'), memberToken = token(), invite = token();
        const room = { id, members: { [data.actor]: memberToken }, invitation: { token: invite, actor: other(data.actor), claimed: false }, state: createWorld(id) };
        await save(room);
        return send(res, 201, { room: id, token: memberToken, actor: data.actor, invite, world: visibleWorld(room.state, data.actor) });
      }
      if (url.pathname === '/api/join' && req.method === 'POST') {
        const data = await body(req);
        return await exclusive(data.room, async () => {
          const room = await load(data.room);
          if (!equal(room.invitation.token, data.invite)) return send(res, 403, { error: 'This invitation does not match' });
          const actor = room.invitation.actor;
          // Reopening the same private invite restores the same seat on a second device.
          room.members[actor] ||= token(); room.invitation.claimed = true;
          await save(room);
          return send(res, 200, { room: room.id, actor, token: room.members[actor], world: visibleWorld(room.state, actor) });
        });
      }
      if (url.pathname === '/api/world') {
        const id = req.headers['x-monki-room'];
        return await exclusive(id, async () => {
          const room = await load(id), actor = auth(req, room);
          if (req.method === 'POST') {
            const data = await body(req);
            if (!Array.isArray(data.operations) || data.operations.length > 100) return send(res, 400, { error: 'Invalid operations' });
            const rejected = [];
            for (const op of data.operations) {
              try { room.state = applyOperation(room.state, { ...op, actor }); }
              // op?.id: a null in the list is refused on its own, not with the whole batch.
              catch (e) { rejected.push({ id: op?.id, error: e.message }); }
            }
            await save(room);
            return send(res, 200, { world: visibleWorld(room.state, actor), rejected, paired: room.invitation.claimed });
          }
          if (req.method === 'GET') return send(res, 200, { actor, world: visibleWorld(room.state, actor), paired: room.invitation.claimed, invite: actor !== room.invitation.actor ? room.invitation.token : undefined });
          return send(res, 405, { error: 'Method not allowed' });
        });
      }
      return send(res, 404, { error: 'Not found' });
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

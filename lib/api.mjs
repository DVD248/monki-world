// The shared-world API, whatever runs it: server.mjs keeps worlds as files on the Mac,
// worker/index.mjs keeps them in Cloudflare storage. Both hand every /api/ request to this one
// copy, so the rules for invitations, seats and operations cannot drift between the two.
import { createWorld, applyOperation, visibleWorld, prepareWorld, PEOPLE, other } from '../shared/world.js';

const ROOM = /^[a-f0-9]{24}$/, KEY = /^[a-f0-9]{48}$/;
const hex = bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');
const token = () => hex(24);
const fail = (status, message) => Object.assign(new Error(message), { status });
// Constant time for equal lengths. Node's timingSafeEqual does not exist on Cloudflare.
const equal = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/** Reads a JSON request body from a Node request or a fetch body stream. */
export async function readJson(stream) {
  // Decoded once at the end: a character split across two chunks otherwise arrives broken.
  const chunks = []; let size = 0;
  for await (const chunk of stream || []) {
    size += chunk.length;
    if (size > 256000) throw fail(413, 'Too large');
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(size); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  const data = new TextDecoder().decode(bytes);
  try { return JSON.parse(data || '{}'); } catch { throw fail(400, 'Invalid JSON'); }
}

/**
 * load(id) resolves to the saved room or null; save(room) stores it. Returns
 * handle({ method, pathname, headers, ip, body }) → [status, data], where headers has
 * lowercase names and body() resolves to the parsed JSON request body.
 */
export function createApi({ load, save, addresses = () => [] }) {
  const locks = new Map();
  const limits = new Map();

  async function exclusive(id, work) {
    const previous = locks.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(work);
    locks.set(id, next);
    try { return await next; } finally { if (locks.get(id) === next) locks.delete(id); }
  }
  async function find(id) {
    const room = ROOM.test(id || '') ? await load(id) : null;
    if (!room) throw fail(404, 'World not found');
    return room;
  }
  function auth(headers, room) {
    const value = (headers.authorization || '').replace(/^Bearer /, '');
    const actor = PEOPLE.find(p => equal(room.members[p], value));
    if (!actor) throw fail(401, 'This world needs its invitation link');
    return actor;
  }
  function rateLimit(ip) {
    const now = Date.now();
    let entry = limits.get(ip);
    if (!entry || now - entry.at > 60000) { entry = { at: now, n: 0 }; limits.set(ip, entry); }
    // Room for both phones behind one address (a hosted server reached from home), each polling
    // every few seconds and sending bursts of touches. At 180, one phone poking for a minute was cut off.
    if (++entry.n > 600) throw fail(429, 'A little too fast. Try again in a minute.');
    if (limits.size > 2000) for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
  }
  // A world file brought over from another server (see scripts/upload-world.mjs), kept exactly as
  // it was so both seats and the invitation still work. Never replaces a world that is already here.
  function imported(data) {
    const room = data?.room, members = room?.members, invitation = room?.invitation;
    const valid = room && ROOM.test(room.id || '') && members && typeof members === 'object'
      && Object.keys(members).length > 0 && Object.entries(members).every(([p, k]) => PEOPLE.includes(p) && KEY.test(k || ''))
      && invitation && KEY.test(invitation.token || '') && PEOPLE.includes(invitation.actor) && typeof invitation.claimed === 'boolean'
      && room.state && typeof room.state === 'object';
    if (!valid) throw fail(400, 'That is not a world file');
    try { prepareWorld(room.state); } catch { throw fail(400, 'That world file is damaged'); }
    return { id: room.id, members: { ...members }, invitation: { token: invitation.token, actor: invitation.actor, claimed: invitation.claimed }, state: room.state };
  }

  async function route({ method, pathname, headers, body }) {
    if (method === 'POST') {
      if (!headers['content-type']?.includes('application/json')) return [415, { error: 'JSON required' }];
      if (headers.origin && new URL(headers.origin).host !== headers.host) return [403, { error: 'Different origin' }];
    }
    if (pathname === '/api/health') return [200, { ok: true, addresses: addresses() }];
    if (pathname === '/api/rooms' && method === 'POST') {
      const data = await body();
      if (!PEOPLE.includes(data.actor)) return [400, { error: 'Choose David or Julia' }];
      const id = hex(12), memberToken = token(), invite = token();
      const room = { id, members: { [data.actor]: memberToken }, invitation: { token: invite, actor: other(data.actor), claimed: false }, state: createWorld(id) };
      await save(room);
      return [201, { room: id, token: memberToken, actor: data.actor, invite, world: visibleWorld(room.state, data.actor) }];
    }
    if (pathname === '/api/join' && method === 'POST') {
      const data = await body();
      return exclusive(data.room, async () => {
        const room = await find(data.room);
        if (!equal(room.invitation.token, data.invite)) return [403, { error: 'This invitation does not match' }];
        const actor = room.invitation.actor;
        // Reopening the same private invite restores the same seat on a second device.
        room.members[actor] ||= token(); room.invitation.claimed = true;
        await save(room);
        return [200, { room: room.id, actor, token: room.members[actor], world: visibleWorld(room.state, actor) }];
      });
    }
    if (pathname === '/api/import' && method === 'POST') {
      const room = imported(await body());
      return exclusive(room.id, async () => {
        if (await load(room.id)) return [409, { error: 'That world is already here' }];
        await save(room);
        return [201, { room: room.id, people: Object.keys(room.members) }];
      });
    }
    if (pathname === '/api/world') {
      const id = headers['x-monki-room'];
      return exclusive(id, async () => {
        const room = await find(id), actor = auth(headers, room);
        if (method === 'POST') {
          const data = await body();
          if (!Array.isArray(data.operations) || data.operations.length > 100) return [400, { error: 'Invalid operations' }];
          const rejected = [];
          for (const op of data.operations) {
            try { room.state = applyOperation(room.state, { ...op, actor }); }
            // op?.id: a null in the list is refused on its own, not with the whole batch.
            catch (e) { rejected.push({ id: op?.id, error: e.message }); }
          }
          await save(room);
          return [200, { world: visibleWorld(room.state, actor), rejected, paired: room.invitation.claimed }];
        }
        if (method === 'GET') return [200, { actor, world: visibleWorld(room.state, actor), paired: room.invitation.claimed, invite: actor !== room.invitation.actor ? room.invitation.token : undefined }];
        return [405, { error: 'Method not allowed' }];
      });
    }
    return [404, { error: 'Not found' }];
  }

  return async function handle(request) {
    try {
      rateLimit(request.ip || '');
      return await route(request);
    } catch (error) {
      return [error.status || 400, { error: error.status ? error.message : 'Could not save that. Please try again.' }];
    }
  };
}

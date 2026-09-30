// Monki World on Cloudflare: the game's files are served as static assets (dist/, built by
// scripts/build.mjs) and every /api/ request goes to one Durable Object, the online counterpart
// of server.mjs. Its storage outlives restarts and deploys, the way data/ does on the Mac.
import { DurableObject } from 'cloudflare:workers';
import { createApi, readJson } from '../lib/api.mjs';

const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };

export class Worlds extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // One object holds every world. Requests reach it one at a time, as they reach the single
    // server.mjs process, and two people come nowhere near what one object can take.
    this.api = createApi({
      load: async id => (await ctx.storage.get(`room:${id}`)) ?? null,
      save: room => ctx.storage.put(`room:${room.id}`, room),
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    const headers = { ...Object.fromEntries(request.headers), host: url.host };
    const [status, data] = await this.api({ method: request.method, pathname: url.pathname, headers, ip: request.headers.get('cf-connecting-ip'), body: () => readJson(request.body) });
    return Response.json(data, { status, headers: HEADERS });
  }
}

export default {
  fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return env.WORLDS.get(env.WORLDS.idFromName('monki-world')).fetch(request);
    return env.ASSETS.fetch(request);
  },
};

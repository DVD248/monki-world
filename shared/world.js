export const VERSION = 2;
export const PEOPLE = ['david', 'julia'];
export const ACTORS = ['david', 'julia', 'monki', 'sernik', 'galgan'];
export const RESIDENTS = ['monki', 'sernik', 'galgan'];
export const NAMES = { david: 'David', julia: 'Julia', monki: 'Monki', sernik: 'Sernik', galgan: 'Galgan' };
export const ITEMS = {
  potato: { name: 'Potato', wearable: true }, cone: { name: 'Traffic cone', wearable: true },
  bow: { name: 'Bow', wearable: true }, glasses: { name: 'Sunglasses', wearable: true },
  crown: { name: 'Crown', wearable: true }, flower: { name: 'Flower', wearable: true },
  sock: { name: 'Sock', wearable: true }, frog: { name: 'Frog', wearable: true },
  icecream: { name: 'Ice cream' }, fish: { name: 'Fish' }, balloon: { name: 'Balloon' },
  duck: { name: 'Duck', wearable: true }, mushroom: { name: 'Mushroom' }, moon: { name: 'Moon', wearable: true },
  star: { name: 'Star', wearable: true }, key: { name: 'Key' }, plant: { name: 'Plant' },
  lamp: { name: 'Lamp' }, couch: { name: 'Sofa' }, bowl: { name: 'Bowl' }, present: { name: 'Present' },
  frame: { name: 'Drawing' }, radio: { name: 'Radio' }, fridge: { name: 'Fridge' },
};
const FOOD = ['icecream', 'fish', 'mushroom', 'potato'];
const HEAVY = ['couch', 'lamp', 'plant', 'bowl', 'radio', 'fridge'];

/** Each resident wants a few specific things and has a favourite way of being a problem.
 * Behaviour is the sum of small preferences, so time away produces recognisable
 * nonsense ("of course Sernik took it") instead of random noise. */
export const TENDENCIES = {
  monki:  { verbs: { stack: 4, climb: 3, wear: 3, steal: 2, sleep: 1 }, loves: ['potato', 'balloon', 'moon', 'star'], hates: ['fish'] },
  sernik: { verbs: { steal: 5, eat: 4, nest: 3, sleep: 2, wear: 1 },    loves: ['icecream', 'fish', 'mushroom', 'bowl'], hates: ['frog'] },
  galgan: { verbs: { drag: 5, sleep: 5, dig: 4, guard: 2, steal: 1 },   loves: ['sock', 'couch'], hates: ['balloon'] },
};

/** Seven gestures. Everything else about a situation is composed around them at
 * runtime, so the catalogue is combinations rather than a list someone has to write. */
export const GESTURES = {
  tap:     { goal: [11, 16], items: ['balloon', 'star', 'flower', 'duck', 'fish', 'frog', 'mushroom'], aftermath: ['balloons', 'stars', 'flowers'] },
  catch:   { goal: [9, 14],  items: ['sock', 'potato', 'star', 'fish', 'icecream', 'duck', 'mushroom'], aftermath: ['mess', 'crumbs', 'stars'] },
  aim:     { goal: [6, 10],  items: ['icecream', 'duck', 'sock', 'potato', 'fish'], aftermath: ['crumbs', 'mess', 'duck'] },
  sweep:   { goal: [14, 20], items: ['fish', 'star', 'potato', 'frog', 'mushroom'], aftermath: ['wet', 'crumbs', 'frog'] },
  balance: { goal: [8, 12],  items: ['potato', 'icecream', 'couch', 'fish', 'moon'], aftermath: ['tower', 'crumbs'] },
  hold:    { goal: [3, 4],   items: ['moon', 'couch', 'balloon', 'flower'], aftermath: ['moon', 'sofa', 'balloons'] },
  find:    { goal: [4, 6],   items: ['frog', 'sock', 'cone', 'key', 'potato', 'crown'], aftermath: ['frog', 'mess', 'hat'] },
};
const VERB_GESTURE = { steal: 'find', eat: 'catch', drag: 'hold', dig: 'sweep', stack: 'balance', climb: 'tap', nest: 'sweep', sleep: 'tap', wear: 'find', guard: 'aim' };

/** Set pieces. Deliberately scarce: these are the ones worth texting about. */
export const INCIDENTS = [
  { id: 'balloons', actor: 'monki', kind: 'tap', item: 'balloon', reward: 'bow', aftermath: 'balloons', goal: 12 },
  { id: 'moon', actor: 'monki', kind: 'hold', item: 'moon', reward: 'star', aftermath: 'moon', goal: 3, rare: true },
  { id: 'flood', actor: 'sernik', kind: 'catch', item: 'duck', reward: 'fish', aftermath: 'flood', goal: 14, rare: true },
  { id: 'invasion', actor: 'galgan', kind: 'sweep', item: 'frog', reward: 'frog', aftermath: 'frog', goal: 20, rare: true },
  { id: 'lostmoon', actor: 'monki', kind: 'find', item: 'moon', reward: 'moon', aftermath: 'moon', goal: 5, rare: true },
  { id: 'fireflies', actor: 'galgan', kind: 'tap', item: 'star', reward: 'star', aftermath: 'stars', goal: 14, night: true, rare: true },
  { id: 'sofa', actor: 'galgan', kind: 'hold', item: 'couch', reward: 'lamp', aftermath: 'sofa', goal: 3, rare: true },
  { id: 'tower', actor: 'monki', kind: 'balance', item: 'potato', reward: 'potato', aftermath: 'tower', goal: 10, rare: true },
  { id: 'icecream', actor: 'sernik', kind: 'aim', item: 'icecream', reward: 'cone', aftermath: 'crumbs', goal: 8, rare: true },
];
export const MODIFIERS = ['plain', 'bouncy', 'tiny', 'windy', 'sleepy', 'giant'];
const TICK = 22 * 60000;   // the unit of unsupervised time
const MAX_TICKS = 30;      // a week away is eventful, not infinite

const clone = value => structuredClone(value);
export function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function random(seed) { let a = hash(seed); return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const other = actor => actor === 'david' ? 'julia' : 'david';
const pick = (list, rng) => list[Math.floor(rng() * list.length)];
function weighted(map, rng) { const total = Object.values(map).reduce((a, b) => a + b, 0); let r = rng() * total; for (const [k, v] of Object.entries(map)) { r -= v; if (r <= 0) return k; } return Object.keys(map)[0]; }

export function createWorld(seed = 'monki', now = Date.now()) {
  const state = {
    version: VERSION, seed, revision: 0, created: now, updated: now, lastVisit: now,
    completed: 0, serial: 0, recent: [], unlocked: ['house'], inventory: ['potato', 'cone', 'bow', 'glasses', 'flower'],
    actors: {
      david: { x: 106, y: 244, room: 'house', hat: null, mood: 'idle', pokes: 0 },
      julia: { x: 292, y: 234, room: 'house', hat: null, mood: 'idle', pokes: 0 },
      monki: { x: 220, y: 200, room: 'house', hat: null, mood: 'idle', pokes: 0 },
      sernik: { x: 306, y: 284, room: 'house', hat: null, mood: 'idle', pokes: 0 },
      galgan: { x: 155, y: 291, room: 'house', hat: null, mood: 'sleep', pokes: 0 },
    },
    objects: [
      { id: 'couch', type: 'couch', room: 'house', x: 118, y: 181 },
      { id: 'plant', type: 'plant', room: 'house', x: 56, y: 199 },
      { id: 'lamp', type: 'lamp', room: 'house', x: 197, y: 181 },
      { id: 'bowl', type: 'bowl', room: 'house', x: 326, y: 297 },
      { id: 'potato', type: 'potato', room: 'house', x: 261, y: 287 },
      { id: 'radio', type: 'radio', room: 'house', x: 336, y: 194 },
    ],
    traces: [], log: [], gifts: [], drawing: [], chaos: {}, choices: { round: 0, picks: {}, revealed: [] },
    secrets: [], fridgeAt: null, incident: null, nextAt: now, applied: [],
    digs: 0, stacks: 0, hidden: {}, stuck: {},
  };
  state.incident = makeIncident(state, now, 'balloons');
  return state;
}

/** Older saves predate the resident behaviour fields; fill them in rather than crash. */
function normalize(state) {
  state.digs ??= 0; state.stacks ??= 0; state.hidden ??= {}; state.stuck ??= {};
  state.recent ??= []; state.secrets ??= []; state.traces ??= []; state.log ??= [];
  return state;
}

function frame(state, def, rng, now) {
  const room = state.unlocked.includes(def.room) ? def.room : pick(state.unlocked, rng);
  return { ...def, uid: `${state.seed}-${state.serial}`, seed: hash(`${state.seed}:${state.serial}:${def.id}`), room,
    modifier: state.serial === 0 ? 'plain' : pick(MODIFIERS, rng), born: now };
}

/** Compose a situation from who is around, what they are like, and what is lying about.
 * The same seven mechanics keep producing incidents nobody wrote down. */
function compose(state, rng) {
  const actor = pick([...RESIDENTS, ...RESIDENTS, 'david', 'julia'], rng);
  const tendency = TENDENCIES[actor];
  const kind = tendency ? VERB_GESTURE[weighted(tendency.verbs, rng)] : pick(Object.keys(GESTURES), rng);
  const gesture = GESTURES[kind];
  // Prefer something this character cares about, then something already in the room.
  const nearby = state.objects.filter(o => gesture.items.includes(o.type)).map(o => o.type);
  const liked = tendency ? [...tendency.loves, ...tendency.hates].filter(i => gesture.items.includes(i)) : [];
  const pool = [...gesture.items, ...nearby, ...liked, ...liked];
  const item = pick(pool, rng);
  const missing = Object.keys(ITEMS).filter(i => !state.inventory.includes(i) && !['present', 'frame', 'fridge', 'radio', 'bowl', 'lamp', 'plant', 'couch'].includes(i));
  const reward = missing.length && rng() < 0.75 ? pick(missing, rng) : pick(liked.length ? liked : gesture.items, rng);
  const aftermath = pick(gesture.aftermath, rng);
  const [low, high] = gesture.goal;
  return { id: `${actor}-${kind}-${item}`, actor, kind, item, reward, aftermath, goal: low + Math.floor(rng() * (high - low + 1)) };
}

export function makeIncident(state, now, forcedId) {
  const rng = random(`${state.seed}:${state.serial}:${state.created}`);
  const hour = new Date(now).getHours();
  if (forcedId) return frame(state, INCIDENTS.find(e => e.id === forcedId) || INCIDENTS[0], rng, now);
  // Set pieces stay genuinely rare, so finding one is worth a message.
  if (rng() < 0.05) {
    const eligible = INCIDENTS.filter(e => !state.recent.includes(e.id) && (!e.night || hour < 7 || hour > 19));
    if (eligible.length) return frame(state, pick(eligible, rng), rng, now);
  }
  let composed = compose(state, rng);
  for (let i = 0; i < 6 && state.recent.includes(composed.id); i++) composed = compose(state, rng);
  return frame(state, composed, rng, now);
}

function log(state, who, action, target, now, extra = {}) {
  state.log.unshift({ id: `${state.revision}:${state.log.length}:${now}`, who, action, target, at: now, ...extra });
  state.log = state.log.slice(0, 48);
}
function discover(state, item) { if (ITEMS[item] && !state.inventory.includes(item)) state.inventory.push(item); }
function trace(state, type, room, x, y, now) {
  state.traces.push({ type, room, x, y, at: now });
  state.traces = state.traces.slice(-28);
}

/** What each resident actually does when nobody is watching. Every behaviour leaves
 * something physical behind; repeated over days they accumulate into an event. */
const BEHAVIOUR = {
  // Galgan moves the sofa a few pixels at a time. Over a week it becomes a journey.
  drag(state, actor, rng) {
    const a = state.actors[actor];
    const heavy = state.objects.filter(o => o.room === a.room && HEAVY.includes(o.type) && o.type !== 'fridge');
    if (!heavy.length) return null;
    const o = heavy.sort((x, y) => Math.hypot(x.x - a.x, x.y - a.y) - Math.hypot(y.x - a.x, y.y - a.y))[0];
    o.dragDir ??= rng() < 0.5 ? -1 : 1;
    o.x = clamp(o.x + o.dragDir * (16 + Math.floor(rng() * 18)), 35, 365);
    o.y = clamp(o.y + Math.round((rng() - 0.4) * 12), 171, 314);
    o.lastBy = actor; a.x = clamp(o.x - o.dragDir * 26, 35, 365); a.y = o.y; a.mood = 'idle';
    // Pushed against a wall for long enough and it simply ends up somewhere else.
    if ((o.x <= 38 || o.x >= 362) && o.room === 'house' && state.unlocked.includes('garden')) {
      o.room = 'garden'; o.x = 150 + Math.floor(rng() * 120); o.y = 250; o.dragDir = -o.dragDir;
      return ['out', o.type];
    }
    return ['move', o.type];
  },
  // Holes accumulate. Eventually one of them goes somewhere.
  dig(state, actor, rng, now) {
    const a = state.actors[actor];
    state.digs++;
    trace(state, 'hole', a.room, clamp(a.x + Math.round((rng() - 0.5) * 50), 40, 360), a.y, now);
    if (a.room === 'house' && state.digs >= 2 && !state.unlocked.includes('garden')) state.unlocked.push('garden');
    if (a.room === 'garden' && state.digs >= 7 && !state.unlocked.includes('cellar')) { state.unlocked.push('cellar'); discover(state, 'key'); }
    return ['dig', 'hole'];
  },
  // Monki piles things up. A tall enough pile in the garden is a way onto the roof.
  stack(state, actor, rng, now) {
    const a = state.actors[actor];
    state.stacks++;
    trace(state, 'tower', a.room, a.x, a.y, now);
    if (a.room === 'garden' && state.stacks >= 3 && !state.unlocked.includes('roof')) state.unlocked.push('roof');
    return ['move', 'potato'];
  },
  climb(state, actor, rng) {
    const a = state.actors[actor];
    const up = state.unlocked.includes('roof') && rng() < 0.6 ? 'roof' : state.unlocked.includes('garden') ? 'garden' : 'house';
    a.room = up; a.x = 80 + Math.floor(rng() * 240); a.y = 200 + Math.floor(rng() * 90); a.mood = 'idle';
    return ['move', up === 'roof' ? 'moon' : 'plant'];
  },
  steal(state, actor, rng) {
    const a = state.actors[actor], t = TENDENCIES[actor];
    const wanted = state.objects.filter(o => o.room === a.room && (t.loves.includes(o.type) || rng() < 0.2));
    if (!wanted.length) return null;
    const o = pick(wanted, rng);
    o.x = clamp(a.x + (rng() < 0.5 ? -24 : 24), 35, 365); o.y = clamp(a.y + 6, 171, 314);
    o.lastBy = actor; o.stolenBy = actor;
    return ['take', o.type];
  },
  eat(state, actor, rng, now) {
    const a = state.actors[actor];
    const food = state.objects.filter(o => o.room === a.room && FOOD.includes(o.type) && o.id.startsWith('placed-'));
    if (food.length) {
      const o = pick(food, rng);
      state.objects = state.objects.filter(x => x !== o);
      trace(state, 'crumbs', a.room, o.x, o.y, now); a.mood = 'happy';
      return ['eat', o.type];
    }
    trace(state, 'crumbs', a.room, clamp(a.x + 14, 40, 360), a.y, now); a.mood = 'happy';
    return ['eat', 'bowl'];
  },
  nest(state, actor, rng) {
    const a = state.actors[actor];
    const soft = state.objects.filter(o => o.room === a.room && ['couch', 'bowl', 'plant'].includes(o.type));
    const o = soft.length ? pick(soft, rng) : null;
    if (o) { a.x = o.x; a.y = clamp(o.y + 2, 171, 314); }
    a.mood = 'sleep';
    return ['sleep', o?.type || 'bowl'];
  },
  sleep(state, actor, rng) {
    const a = state.actors[actor];
    a.mood = 'sleep'; a.x = clamp(a.x + Math.round((rng() - 0.5) * 44), 40, 360);
    return ['sleep', actor];
  },
  wear(state, actor, rng) {
    const t = TENDENCIES[actor];
    const hats = state.inventory.filter(i => ITEMS[i]?.wearable && (t.loves.includes(i) || rng() < 0.25));
    if (!hats.length) return null;
    const hat = pick(hats, rng);
    state.actors[actor].hat = hat;
    return ['wear', actor, { item: hat }];
  },
  // Only after a long absence. A structure appears where nothing was asked for.
  monument(state, actor, rng, now) {
    const room = pick(state.unlocked, rng);
    const a = state.actors[actor];
    a.room = room; a.x = 200; a.y = 250; a.mood = 'idle';
    const id = `monument-${state.digs + state.stacks}`;
    if (!state.objects.some(o => o.id === id)) {
      state.objects.push({ id, type: pick(['couch', 'potato', 'lamp', 'plant'], rng), room, x: 60 + Math.floor(rng() * 280), y: 200 + Math.floor(rng() * 90), lastBy: actor, movedAt: now });
    }
    for (let i = 0; i < 3; i++) trace(state, 'tower', room, 70 + Math.floor(rng() * 260), 210 + Math.floor(rng() * 80), now);
    state.stacks += 2;
    if (room === 'garden' && state.stacks >= 3 && !state.unlocked.includes('roof')) state.unlocked.push('roof');
    return ['build', 'tower', {}, actor];
  },
  guard(state, actor, rng) {
    const a = state.actors[actor];
    const recent = [...state.objects].filter(o => o.lastBy).sort((x, y) => (y.movedAt || 0) - (x.movedAt || 0))[0];
    if (recent) { a.room = recent.room; a.x = recent.x; a.y = clamp(recent.y + 3, 171, 314); }
    a.mood = 'idle';
    return ['guard', recent?.type || 'couch'];
  },
};

/** Time away is simulated in small steps, so four days produce a chain of events
 * rather than the same single nudge six hours produces. Nothing here punishes leaving. */
function ambient(state, now) {
  const away = now - state.lastVisit;
  if (away < 60_000) return;
  // Sub-linear, so an afternoon is a few things and a week is a great many more.
  const ticks = clamp(Math.round(3.2 * Math.log2(1 + away / TICK)), 1, MAX_TICKS);
  const rng = random(`${state.seed}:away:${Math.floor(state.lastVisit / 60000)}`);
  for (let i = 0; i < ticks; i++) {
    const actor = pick(RESIDENTS, rng);
    const verb = weighted(TENDENCIES[actor].verbs, rng);
    const done = BEHAVIOUR[verb]?.(state, actor, rng, now);
    if (done) log(state, actor, done[0], done[1], now - (ticks - i) * TICK, done[2]);
  }
  // Left completely alone for days, somebody starts a project. Nobody explains it.
  if (away > 2 * 86400000) {
    const done = BEHAVIOUR.monument(state, pick(RESIDENTS, rng), rng, now);
    if (done) log(state, done[3], done[0], done[1], now - TICK, done[2]);
  }
  if (!state.incident && now >= state.nextAt) state.incident = makeIncident(state, now);
  if (state.fridgeAt && now - state.fridgeAt >= 3 * 86400000 && !state.secrets.includes('cold-potato')) {
    state.secrets.push('cold-potato'); discover(state, 'frog');
    if (!state.unlocked.includes('cellar')) state.unlocked.push('cellar');
    trace(state, 'frog', 'house', 286, 185, now);
    log(state, 'potato', 'grow', 'frog', now);
  }
  state.lastVisit = now;
}

/** Pure shared reducer: clients queue small operations; the server applies them serially.
 * No full-state uploads, so one partner cannot overwrite the other's newer actions. */
export function applyOperation(input, operation, now = Date.now()) {
  if (!operation || typeof operation.id !== 'string' || operation.id.length > 96 || !PEOPLE.includes(operation.actor)) throw new Error('Invalid operation');
  if (input.applied.includes(operation.id)) return input;
  const state = normalize(clone(input)), op = operation, actor = op.actor;
  const target = (ACTORS.includes(op.target) ? state.actors[op.target] : null) || state.objects.find(o => o.id === op.target);
  switch (op.type) {
    case 'visit': ambient(state, now); break;
    case 'poke': {
      const a = ACTORS.includes(op.target) ? state.actors[op.target] : null; if (!a) throw new Error('Unknown character');
      a.pokes++; a.mood = a.pokes % 5 === 0 ? 'annoyed' : a.pokes % 3 === 0 ? 'sleep' : 'happy'; a.lastBy = actor;
      if (op.target === 'monki' && a.pokes === 20) { a.hat = 'crown'; discover(state, 'crown'); state.secrets.push('monki-king'); }
      if (op.target === 'galgan' && a.pokes === 40 && !state.secrets.includes('galgan-awake')) { state.secrets.push('galgan-awake'); a.mood = 'annoyed'; discover(state, 'sock'); }
      if (a.pokes % 3 === 0) log(state, actor, 'poke', op.target, now, { count: a.pokes });
      break;
    }
    case 'move':
      if (!target || !Number.isFinite(op.x) || !Number.isFinite(op.y) || !state.unlocked.includes(op.room)) throw new Error('Invalid move');
      target.x = clamp(op.x, 35, 365); target.y = clamp(op.y, 171, 314); target.room = op.room; target.lastBy = actor; target.movedAt = now;
      log(state, actor, 'move', target.type || op.target, now); break;
    case 'wear': {
      const a = ACTORS.includes(op.target) ? state.actors[op.target] : null;
      if (!a || (op.item !== null && (!state.inventory.includes(op.item) || !ITEMS[op.item]?.wearable))) throw new Error('Invalid hat');
      // A hat someone stuck on you stays on for a day. Mild inconvenience as affection.
      if (op.item === null && state.stuck[op.target] > now) throw new Error('It is stuck');
      a.hat = op.item; a.lastBy = actor; a.mood = 'idle';
      log(state, actor, 'wear', op.target, now, { item: op.item });
      const d = state.actors.david.hat, j = state.actors.julia.hat;
      if (d && d === j && !state.secrets.includes(`twins-${d}`)) { state.secrets.push(`twins-${d}`); discover(state, 'star'); trace(state, 'stars', 'house', 210, 239, now); }
      break;
    }
    case 'place': {
      if (!state.inventory.includes(op.item) || !state.unlocked.includes(op.room)) throw new Error('Unknown object');
      const existing = state.objects.find(o => o.id === `placed-${op.item}`);
      if (existing) { existing.room = op.room; existing.x = 200; existing.y = 270; existing.lastBy = actor; existing.movedAt = now; }
      else state.objects.push({ id: `placed-${op.item}`, type: op.item, x: 200, y: 270, room: op.room, lastBy: actor, movedAt: now });
      log(state, actor, 'place', op.item, now); break;
    }
    case 'gift':
      if (!state.inventory.includes(op.item) || state.gifts.filter(g => !g.opened && g.from === actor).length >= 3) throw new Error('Choose an object, or wait for a gift to be opened');
      state.gifts.push({ id: op.id, from: actor, to: other(actor), item: op.item, at: now, opened: false });
      state.gifts = state.gifts.slice(-30); log(state, actor, 'gift', 'present', now); break;
    case 'openGift': {
      const gift = state.gifts.find(g => g.id === op.target && g.to === actor && !g.opened);
      if (!gift) throw new Error('This gift is for your partner');
      gift.opened = true; discover(state, gift.item);
      const id = `gift-${gift.item}`; const obj = state.objects.find(o => o.id === id);
      // The recipient's optimistic view has a sealed gift; the server reveals it.
      if (!obj && gift.item) state.objects.push({ id, type: gift.item, room: 'house', x: 227, y: 278, lastBy: gift.from });
      log(state, actor, 'open', gift.item, now); break;
    }
    case 'draw':
      if (!Array.isArray(op.lines) || op.lines.length > 120 || op.lines.reduce((n,l)=>n+(Array.isArray(l)?l.length:0),0)>4000 || op.lines.some(l => !Array.isArray(l) || l.length > 300 || l.some(p => !Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 1)))) throw new Error('Invalid drawing');
      state.drawing = clone(op.lines); state.drawingBy = actor; log(state, actor, 'draw', 'frame', now); break;
    case 'chaos':
      if (!['bouncy', 'tiny', 'windy', 'giant'].includes(op.modifier)) throw new Error('Invalid surprise');
      state.chaos[other(actor)] = { modifier: op.modifier, from: actor };
      log(state, actor, 'chaos', 'present', now); break;
    // Hide something of theirs. They have to find it again.
    case 'hide': {
      const o = state.objects.find(o => o.id === op.target);
      if (!o) throw new Error('Nothing to hide');
      state.hidden[o.id] = { from: actor, at: now };
      o.room = pick(state.unlocked, random(`${op.id}`)); o.x = 40 + Math.floor(random(op.id)() * 320); o.y = 180 + Math.floor(random(`${op.id}y`)() * 130);
      log(state, actor, 'hide', o.type, now); break;
    }
    case 'found': {
      if (!state.hidden[op.target]) break;
      delete state.hidden[op.target];
      const o = state.objects.find(o => o.id === op.target);
      log(state, actor, 'find', o?.type || 'potato', now); break;
    }
    // A hat the other person cannot take off until tomorrow.
    case 'stick':
      if (!PEOPLE.includes(op.target) && !RESIDENTS.includes(op.target)) throw new Error('Unknown character');
      if (!state.inventory.includes(op.item) || !ITEMS[op.item]?.wearable) throw new Error('Invalid hat');
      state.actors[op.target].hat = op.item; state.stuck[op.target] = now + 86400000;
      log(state, actor, 'wear', op.target, now, { item: op.item }); break;
    case 'pick': {
      if (op.round !== state.choices.round || !Number.isInteger(op.choice) || op.choice < 0 || op.choice > 4 || state.choices.picks[actor] !== undefined) throw new Error('Already picked');
      state.choices.picks[actor] = op.choice;
      if (PEOPLE.every(p => state.choices.picks[p] !== undefined)) {
        const match = state.choices.picks.david === state.choices.picks.julia;
        state.choices.revealed.unshift({ ...state.choices.picks, match, round: state.choices.round, at: now });
        state.choices.revealed = state.choices.revealed.slice(0, 8);
        if (match) { discover(state, 'frog'); state.actors.monki.hat = 'frog'; }
        log(state, 'david', match ? 'match' : 'mismatch', 'julia', now);
      }
      break;
    }
    case 'nextPick':
      if (PEOPLE.every(p => state.choices.picks[p] !== undefined)) { state.choices.round++; state.choices.picks = {}; } break;
    case 'fridge':
      if (!state.inventory.includes('potato')) throw new Error('No potato');
      if (!state.fridgeAt) { state.fridgeAt = now; trace(state, 'potato', 'house', 292, 173, now); log(state, actor, 'place', 'potato', now); } break;
    case 'resolve': {
      const event = state.incident;
      if (!event || op.target !== event.uid) break; // Another phone may have finished it first.
      if (!Number.isFinite(op.score) || op.score < 0 || op.score > 1000) throw new Error('Invalid result');
      const score = Math.round(op.score);
      state.completed++; state.serial++; state.recent.push(event.id); state.recent = state.recent.slice(-24);
      discover(state, event.reward);
      state.actors[event.actor].mood = score >= event.goal ? 'happy' : 'sleep';
      state.actors[event.actor].room = event.room;
      trace(state, event.aftermath, event.room, state.actors[event.actor].x, state.actors[event.actor].y, now);
      if (event.aftermath === 'hat') state.actors[event.actor].hat = event.reward;
      if (event.aftermath === 'sofa') { const sofa = state.objects.find(o => o.id === 'couch'); if (sofa) { sofa.x = 280; sofa.room = event.room; sofa.lastBy = event.actor; } }
      log(state, actor, 'play', event.actor, now, { item: event.item, count: score });
      delete state.chaos[actor];
      // The next thing turns up on its own schedule, not on a clock you can learn.
      state.incident = null;
      state.nextAt = now + 45_000 + Math.floor(random(`${state.seed}:gap:${state.serial}`)() * 20 * 60000);
      break;
    }
    default: throw new Error('Unknown operation');
  }
  state.revision++; state.updated = now; state.applied = [...state.applied.slice(-511), op.id];
  return state;
}

// Do not reveal the partner's choice until both have chosen, even in API responses.
export function visibleWorld(state, actor) {
  const result = normalize(clone(state));
  if (!PEOPLE.every(p => result.choices.picks[p] !== undefined)) {
    const partner = other(actor); result.choices.partnerReady = result.choices.picks[partner] !== undefined;
    delete result.choices.picks[partner];
  }
  for (const gift of result.gifts) if (gift.to === actor && !gift.opened) delete gift.item;
  return result;
}

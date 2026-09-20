export const VERSION = 1;
export const PEOPLE = ['david', 'julia'];
export const ACTORS = ['david', 'julia', 'monki', 'sernik', 'galgan'];
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

// A situation has a cause, a reusable gesture, and a persistent consequence.
// Small mechanics are combined with actor, object, weather and partner modifiers.
export const INCIDENTS = [
  { id: 'balloons', actor: 'monki', kind: 'tap', item: 'balloon', reward: 'bow', aftermath: 'balloons', hint: 'Pop', goal: 12 },
  { id: 'icecream', actor: 'sernik', kind: 'aim', item: 'icecream', reward: 'cone', aftermath: 'crumbs', hint: 'Throw', goal: 8 },
  { id: 'shelf', actor: 'galgan', kind: 'catch', item: 'sock', reward: 'sock', aftermath: 'mess', hint: 'Catch', goal: 10 },
  { id: 'puddle', actor: 'sernik', kind: 'sweep', item: 'fish', reward: 'duck', aftermath: 'wet', hint: 'Wipe', goal: 16 },
  { id: 'tower', actor: 'monki', kind: 'balance', item: 'potato', reward: 'potato', aftermath: 'tower', hint: 'Balance', goal: 10 },
  { id: 'frog', actor: 'galgan', kind: 'find', item: 'frog', reward: 'frog', aftermath: 'frog', hint: 'Find', goal: 5 },
  { id: 'moon', actor: 'monki', kind: 'hold', item: 'moon', reward: 'star', aftermath: 'moon', hint: 'Hold · release', goal: 3 },
  { id: 'laundry', actor: 'julia', kind: 'catch', item: 'sock', reward: 'glasses', aftermath: 'mess', hint: 'Catch', goal: 12 },
  { id: 'flies', actor: 'galgan', kind: 'tap', item: 'star', reward: 'flower', aftermath: 'sleep', hint: 'Tap', goal: 15 },
  { id: 'potatoes', actor: 'sernik', kind: 'catch', item: 'potato', reward: 'potato', aftermath: 'crumbs', hint: 'Catch', goal: 10 },
  { id: 'cloud', actor: 'monki', kind: 'sweep', item: 'star', reward: 'balloon', aftermath: 'wet', hint: 'Wipe', goal: 18 },
  { id: 'ducks', actor: 'david', kind: 'aim', item: 'duck', reward: 'duck', aftermath: 'duck', hint: 'Throw', goal: 8 },
  { id: 'hat', actor: 'galgan', kind: 'find', item: 'cone', reward: 'crown', aftermath: 'hat', hint: 'Find', goal: 5 },
  { id: 'flowers', actor: 'julia', kind: 'tap', item: 'flower', reward: 'plant', aftermath: 'flowers', hint: 'Tap', goal: 14 },
  { id: 'fish', actor: 'sernik', kind: 'catch', item: 'fish', reward: 'fish', aftermath: 'fish', hint: 'Catch', goal: 11 },
  { id: 'sofa', actor: 'galgan', kind: 'hold', item: 'couch', reward: 'lamp', aftermath: 'sofa', hint: 'Hold · release', goal: 3 },
  { id: 'bigcone', actor: 'david', kind: 'balance', item: 'icecream', reward: 'icecream', aftermath: 'crumbs', hint: 'Balance', goal: 10 },
  { id: 'stars', actor: 'julia', kind: 'catch', item: 'star', reward: 'moon', aftermath: 'stars', hint: 'Catch', goal: 12 },
  { id: 'socks', actor: 'sernik', kind: 'find', item: 'sock', reward: 'sock', aftermath: 'mess', hint: 'Find', goal: 5 },
  { id: 'bubble', actor: 'monki', kind: 'tap', item: 'duck', reward: 'fish', aftermath: 'wet', hint: 'Pop', goal: 13 },
  { id: 'soup', actor: 'galgan', kind: 'sweep', item: 'potato', reward: 'mushroom', aftermath: 'crumbs', hint: 'Wipe', goal: 16 },
  { id: 'plant', actor: 'julia', kind: 'hold', item: 'flower', reward: 'flower', aftermath: 'flowers', hint: 'Hold · release', goal: 3 },
  { id: 'shoes', actor: 'david', kind: 'aim', item: 'sock', reward: 'bow', aftermath: 'mess', hint: 'Throw', goal: 8 },
  { id: 'tinysofa', actor: 'monki', kind: 'balance', item: 'couch', reward: 'couch', aftermath: 'tower', hint: 'Balance', goal: 10 },
  { id: 'fireflies', actor: 'galgan', kind: 'tap', item: 'star', reward: 'star', aftermath: 'stars', hint: 'Tap', goal: 14, night: true },
  { id: 'flood', actor: 'sernik', kind: 'catch', item: 'duck', reward: 'fish', aftermath: 'flood', hint: 'Catch', goal: 14, rare: true },
  { id: 'lostmoon', actor: 'monki', kind: 'find', item: 'moon', reward: 'moon', aftermath: 'moon', hint: 'Find', goal: 5, rare: true },
  { id: 'invasion', actor: 'galgan', kind: 'sweep', item: 'frog', reward: 'frog', aftermath: 'frog', hint: 'Wipe', goal: 20, rare: true },
];
export const MODIFIERS = ['plain', 'bouncy', 'tiny', 'windy', 'sleepy', 'giant'];
const clone = value => structuredClone(value);
export function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function random(seed) { let a = hash(seed); return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const other = actor => actor === 'david' ? 'julia' : 'david';

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
  };
  state.incident = makeIncident(state, now, 'balloons');
  return state;
}

export function makeIncident(state, now, forcedId) {
  const rng = random(`${state.seed}:${state.serial}:${Math.floor(now / 1800000)}`);
  const hour = new Date(now).getHours();
  const eligible = INCIDENTS.filter(e => !state.recent.includes(e.id) && (!e.night || hour < 7 || hour > 19) && (!e.rare || rng() < 0.09));
  const definition = forcedId ? INCIDENTS.find(e => e.id === forcedId) : eligible[Math.floor(rng() * eligible.length)];
  const def = definition || INCIDENTS[0];
  const room = state.unlocked[Math.floor(rng() * state.unlocked.length)];
  return { ...def, uid: `${state.seed}-${state.serial}`, seed: hash(`${state.seed}:${state.serial}`), room, modifier: state.serial === 0 ? 'plain' : MODIFIERS[Math.floor(rng() * MODIFIERS.length)], born: now };
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
function ambient(state, now) {
  if (now - state.lastVisit < 60_000) return;
  const rng = random(`${state.seed}:visit:${Math.floor(now / 300000)}`);
  const actor = ['monki', 'sernik', 'galgan'][Math.floor(rng() * 3)];
  const a = state.actors[actor];
  a.x = 55 + Math.floor(rng() * 280); a.y = 205 + Math.floor(rng() * 90);
  a.mood = rng() < 0.5 ? 'sleep' : 'idle';
  if (now - state.lastVisit > 6 * 3600000) {
    a.hat = ['cone', 'potato', 'bow'][Math.floor(rng() * 3)];
    discover(state, a.hat);
    const object = state.objects.find(o => o.type === (actor === 'galgan' ? 'couch' : 'lamp'));
    if (object) { object.x = 65 + Math.floor(rng() * 250); object.lastBy = actor; }
    log(state, actor, 'move', object?.type || 'potato', now);
  }
  if (!state.incident && now >= state.nextAt) state.incident = makeIncident(state, now);
  if (state.fridgeAt && now - state.fridgeAt >= 3 * 86400000 && !state.secrets.includes('cold-potato')) {
    state.secrets.push('cold-potato'); discover(state, 'frog'); state.unlocked.push('cellar');
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
  const state = clone(input), op = operation, actor = op.actor;
  const target = (ACTORS.includes(op.target) ? state.actors[op.target] : null) || state.objects.find(o => o.id === op.target);
  switch (op.type) {
    case 'visit': ambient(state, now); break;
    case 'poke': {
      const a = ACTORS.includes(op.target) ? state.actors[op.target] : null; if (!a) throw new Error('Unknown character');
      a.pokes++; a.mood = a.pokes % 5 === 0 ? 'annoyed' : a.pokes % 3 === 0 ? 'sleep' : 'happy'; a.lastBy = actor;
      if (op.target === 'monki' && a.pokes === 20) { a.hat = 'crown'; discover(state, 'crown'); state.secrets.push('monki-king'); }
      if (a.pokes % 3 === 0) log(state, actor, 'poke', op.target, now, { count: a.pokes });
      break;
    }
    case 'move':
      if (!target || !Number.isFinite(op.x) || !Number.isFinite(op.y) || !state.unlocked.includes(op.room)) throw new Error('Invalid move');
      target.x = clamp(op.x, 35, 365); target.y = clamp(op.y, 171, 314); target.room = op.room; target.lastBy = actor;
      log(state, actor, 'move', target.type || op.target, now); break;
    case 'wear': {
      const a = ACTORS.includes(op.target) ? state.actors[op.target] : null;
      if (!a || (op.item !== null && (!state.inventory.includes(op.item) || !ITEMS[op.item]?.wearable))) throw new Error('Invalid hat');
      a.hat = op.item; a.lastBy = actor; a.mood = 'idle';
      log(state, actor, 'wear', op.target, now, { item: op.item });
      const d = state.actors.david.hat, j = state.actors.julia.hat;
      if (d && d === j && !state.secrets.includes(`twins-${d}`)) { state.secrets.push(`twins-${d}`); discover(state, 'star'); trace(state, 'stars', 'house', 210, 239, now); }
      break;
    }
    case 'place': {
      if (!state.inventory.includes(op.item) || !state.unlocked.includes(op.room)) throw new Error('Unknown object');
      const existing = state.objects.find(o => o.id === `placed-${op.item}`);
      if (existing) { existing.room = op.room; existing.x = 200; existing.y = 270; existing.lastBy = actor; }
      else state.objects.push({ id: `placed-${op.item}`, type: op.item, x: 200, y: 270, room: op.room, lastBy: actor });
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
      state.completed++; state.serial++; state.recent.push(event.id); state.recent = state.recent.slice(-8);
      discover(state, event.reward);
      state.actors[event.actor].mood = score >= event.goal ? 'happy' : 'sleep';
      state.actors[event.actor].room = event.room;
      trace(state, event.aftermath, event.room, state.actors[event.actor].x, state.actors[event.actor].y, now);
      if (event.aftermath === 'hat') state.actors[event.actor].hat = event.reward;
      if (event.aftermath === 'sofa') { const sofa = state.objects.find(o => o.id === 'couch'); sofa.x = 280; sofa.room = event.room; sofa.lastBy = event.actor; }
      if (state.completed >= 3 && !state.unlocked.includes('garden')) { state.unlocked.push('garden'); discover(state, 'key'); log(state, 'sernik', 'open', 'key', now); }
      if (state.completed >= 8 && !state.unlocked.includes('roof')) { state.unlocked.push('roof'); discover(state, 'moon'); log(state, 'monki', 'open', 'moon', now); }
      log(state, actor, 'play', event.actor, now, { item: event.item, count: score });
      delete state.chaos[actor];
      state.incident = null; state.nextAt = now + 35_000;
      break;
    }
    default: throw new Error('Unknown operation');
  }
  state.revision++; state.updated = now; state.applied = [...state.applied.slice(-511), op.id];
  return state;
}

// Do not reveal the partner's choice until both have chosen, even in API responses.
export function visibleWorld(state, actor) {
  const result = clone(state);
  if (!PEOPLE.every(p => result.choices.picks[p] !== undefined)) {
    const partner = other(actor); result.choices.partnerReady = result.choices.picks[partner] !== undefined;
    delete result.choices.picks[partner];
  }
  for (const gift of result.gifts) if (gift.to === actor && !gift.opened) delete gift.item;
  return result;
}

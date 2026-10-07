#!/usr/bin/env node
// An exhaustive, deterministic audit of the world engine.
//
// It drives every operation the game can produce, checks the world's invariants
// after every single one, and collects findings instead of stopping at the first,
// because the point is to see the whole list at once.
//
//   node scripts/audit.mjs            full audit
//   node scripts/audit.mjs --quick    skip the long-horizon and fuzz passes
//   node scripts/audit.mjs --json     machine-readable report

import {createWorld,applyOperation,visibleWorld,prepareWorld,waitingFor,favourite,moveEveryoneIn,present,atTheDoor,
        ITEMS,ACTORS,PEOPLE,RESIDENTS,PETS,AWAY,MODIFIERS,other,random} from '../shared/world.js';
import {ADVENTURES,VARIATIONS,CHAPTER_GAP,adventureFor,featuredStepFor} from '../shared/adventures.js';
import {DISCOVERIES,REACTIONS,DAY,plantStage,pendingMail} from '../shared/life.js';
import {PLACE_STORIES,placeStory,WEATHER,weatherFor} from '../shared/places.js';
import {FRIDGE_INGREDIENTS,fridgeRecipe} from '../shared/fridge.js';
import {FURNITURE,FINISHES,DECOR_STYLES,decorAvailable} from '../shared/decor.js';

const flags=new Set(process.argv.slice(2));
const QUICK=flags.has('--quick'),JSON_OUT=flags.has('--json');

/* ── findings ─────────────────────────────────────────────────────────────── */

const findings=[];
const seen=new Set();
function note(severity,area,message,detail){
  const key=`${area}|${message}`;                 // one finding per distinct defect,
  if(seen.has(key))return;                        // not one per occurrence
  seen.add(key);
  findings.push({severity,area,message,detail});
}
const coverage=new Map();  // op type -> {ok, rejected, reasons:Set}
function mark(type,outcome,reason){
  const c=coverage.get(type)||{ok:0,rejected:0,reasons:new Set()};
  if(outcome==='ok')c.ok++; else {c.rejected++; if(reason)c.reasons.add(reason);}
  coverage.set(type,c);
}

/* ── invariants ───────────────────────────────────────────────────────────── */

const X=[35,365],Y=[171,314];
const inRange=(v,[lo,hi])=>Number.isFinite(v)&&v>=lo&&v<=hi;

function walk(value,path,fn,depth=0){
  if(depth>12)return;
  if(typeof value==='number'){fn(value,path);return;}
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,`${path}[${i}]`,fn,depth+1));return;}
  if(value&&typeof value==='object')for(const [k,v]of Object.entries(value))walk(v,`${path}.${k}`,fn,depth+1);
}

/** Everything that must be true of the world no matter what just happened. */
function checkWorld(state,context){
  const at=what=>`${what} (after ${context})`;

  // 1. Nothing is NaN or Infinity, anywhere.
  walk(state,'state',(n,path)=>{
    if(Number.isNaN(n))note('high','numbers',`NaN reached the saved world at ${path.replace(/\[\d+\]/g,'[]')}`,at(path));
    else if(!Number.isFinite(n))note('high','numbers',`Infinity reached the saved world at ${path.replace(/\[\d+\]/g,'[]')}`,at(path));
  });

  // 2. The world survives the trip through the network and localStorage.
  let round;
  try{round=JSON.parse(JSON.stringify(state));}
  catch(e){note('high','serialisation','The world cannot be turned into JSON',`${e.message} — ${context}`);return;}
  if(JSON.stringify(round)!==JSON.stringify(state))
    note('high','serialisation','The world changes when it is saved and reloaded',at('JSON round-trip'));

  // 3. People and residents stay inside the room.
  for(const id of ACTORS){
    const a=state.actors[id];
    if(!a){note('high','actors',`${id} disappeared from the world`,at(id));continue;}
    if(!inRange(a.x,X)||!inRange(a.y,Y))
      note('medium','actors',`A character can be moved outside the drawable room`,at(`${id} at ${a.x},${a.y}`));
    // Somebody who has not moved in yet is nowhere, with nothing on.
    const away=RESIDENTS.includes(id)&&!state.cast?.includes(id);
    if(away&&(a.room!==AWAY||a.hat))note('high','arrivals',`A resident who has not moved in is in a room or dressed`,at(`${id} in ${a.room} wearing ${a.hat}`));
    if(!away&&!state.unlocked.includes(a.room))
      note('high','actors',`A character is standing in a room that is not unlocked`,at(`${id} in ${a.room}`));
    if(a.hat!==null&&a.hat!==undefined){
      if(!ITEMS[a.hat])note('high','hats',`Someone is wearing an item that does not exist`,at(`${id} wears ${a.hat}`));
      else{
        if(!ITEMS[a.hat].wearable)note('low','hats',`Something not marked wearable ends up on a head`,at(`${id} wears ${a.hat}`));
        if(!state.inventory.includes(a.hat))note('medium','hats',`Someone wears an item that is not in the inventory`,at(`${id} wears ${a.hat}`));
      }
    }
    if(!Number.isInteger(a.pokes)||a.pokes<0)note('medium','actors',`Poke count is not a whole number`,at(`${id}=${a.pokes}`));
  }

  if(!Array.isArray(state.cast)||!state.cast.includes('monki')||state.cast.some(id=>!RESIDENTS.includes(id))||new Set(state.cast).size!==state.cast.length)
    note('high','arrivals',`Who lives here is not a list of residents with Monki in it`,at(JSON.stringify(state.cast)));

  // 4. Objects are real, unique, in an open room, and reachable.
  const ids=new Set();
  for(const o of state.objects){
    if(ids.has(o.id))note('high','objects',`Two objects share one id, so only one can ever be touched`,at(o.id));
    ids.add(o.id);
    if(!ITEMS[o.type]&&!FURNITURE[o.type])note('medium','objects',`An object has a type with no item or furniture definition`,at(`${o.id}:${o.type}`));
    if(!state.unlocked.includes(o.room))note('high','objects',`An object is in a room that is not unlocked`,at(`${o.id} in ${o.room}`));
    if(!inRange(o.x,X)||!inRange(o.y,Y))
      note('medium','objects',`An object can end up outside the drawable room`,at(`${o.id} at ${o.x},${o.y}`));
  }

  // 5. The inventory is a set of real items.
  if(new Set(state.inventory).size!==state.inventory.length)
    note('medium','inventory',`The same item appears twice in the inventory`,at('inventory'));
  for(const i of state.inventory)if(!ITEMS[i])note('medium','inventory',`An item was discovered that does not exist`,at(i));

  // 6. Gifts and letters agree with each other.
  for(const g of state.gifts){
    if(!PEOPLE.includes(g.from)||!PEOPLE.includes(g.to))note('high','gifts',`A gift has no valid sender or recipient`,at(g.id));
    if(g.from===g.to)note('medium','gifts',`Someone was given a gift by themselves`,at(g.id));
    const letter=state.life?.mail?.find(m=>m.giftId===g.id);
    if(g.opened&&letter&&!letter.opened)note('medium','mail',`An opened gift still shows as unopened in the mailbox`,at(g.id));
  }
  for(const p of PEOPLE){
    const waiting=state.gifts.filter(g=>g.from===p&&!g.opened).length;
    if(waiting>3)note('medium','gifts',`More than three unopened gifts queued from one person`,at(`${p}=${waiting}`));
  }
  for(const m of state.life?.mail||[]){
    if(m.reaction&&!m.opened)note('medium','mail',`A letter got a reaction before it was opened`,at(m.id));
    if(m.reaction&&!REACTIONS.includes(m.reaction))note('medium','mail',`An unknown reaction was stored`,at(String(m.reaction)));
  }

  // 7. Bonds only ever go up, and only for residents.
  for(const p of PEOPLE)for(const [id,n]of Object.entries(state.bond[p]||{})){
    if(!RESIDENTS.includes(id))note('low','bond',`A bond was recorded with someone who is not a resident`,at(`${p}->${id}`));
    if(!(n>=0))note('medium','bond',`A bond went negative or became not-a-number`,at(`${p}->${id}=${n}`));
  }

  // 8. Nothing grows without a ceiling. A save that grows forever eventually
  //    stops fitting in localStorage and the game dies silently on her phone.
  const caps={log:48,traces:8,changes:40,applied:512,moments:300,secrets:64,chains:16,'life.mail':400,'life.postcards':300,'life.collection':120,storedObjects:80,objects:200,recent:24};
  for(const [path,cap]of Object.entries(caps)){
    const arr=path.split('.').reduce((v,k)=>v?.[k],state);
    if(Array.isArray(arr)&&arr.length>cap)
      note('medium','growth',`${path} has no working ceiling and will grow until the save breaks`,at(`${path}=${arr.length} > ${cap}`));
  }

  // 9. Bookkeeping.
  if(!Number.isInteger(state.revision)||state.revision<0)note('high','bookkeeping',`Revision is not a counting number`,at(state.revision));
  for(const r of state.unlocked)if(!['house','garden','roof','cellar'].includes(r))note('medium','rooms',`An unknown room was unlocked`,at(r));
  if(new Set(state.unlocked).size!==state.unlocked.length)note('low','rooms',`A room is unlocked twice`,at('unlocked'));
  const stage=plantStage(state);
  if(state.life?.plant&&(stage<0||stage>4))note('medium','plant',`The growing patch left its range of stages`,at(String(stage)));
  const batch=state.fridgeBox?.batch;
  if(batch){
    if(!PEOPLE.includes(batch.by)||(batch.for!==null&&batch.for!==other(batch.by)))note('high','fridge','A freezer experiment has an invalid owner or recipient',at(batch.id));
    try{if(fridgeRecipe(batch.ingredients)!==batch.result)note('high','fridge','The freezer result does not match its ingredients',at(batch.id));}catch{note('high','fridge','An invalid recipe reached the freezer',at(batch.id));}
  }
}

/* ── valid operation generators, one per operation the game can produce ───── */

let serial=0;
const id=()=>`audit-${serial++}`;
const one=(arr,rng)=>arr.length?arr[Math.floor(rng()*arr.length)]:null;
const wearables=s=>s.inventory.filter(i=>ITEMS[i]?.wearable);
/** Mostly whoever lives here; one time in ten anybody, so a refusal for someone not yet moved in is tested too. */
const someone=(s,rng,list=ACTORS)=>one(rng()<.1?list:list.filter(id=>present(s).includes(id)),rng)||one(list,rng);

const GENERATORS={
  visit:(s,a,now,rng)=>({hour:Math.floor(rng()*24)}),
  seen:()=>({}),
  answer:(s,a)=>{const entry=s.log.find(e=>e.who!==a&&PEOPLE.includes(e.who)&&!e.answered);return entry?{target:entry.id,line:'A small reply.'}:null;},
  received:()=>({}),
  inviteAdventure:(s,a,now,rng)=>({chapter:one(ADVENTURES,rng).id}),
  adventureComplete:(s,a,now)=>{const c=adventureFor(s,a,now);return c.ready?{chapter:c.id,index:c.index}:null;},
  toyResult:(s,a,now,rng)=>({toy:one(['paper','bubbles'],rng),room:one(s.unlocked,rng),target:one([...ACTORS,null],rng),x:35+rng()*330,y:171+rng()*143}),
  toy:(s,a,now,rng)=>({toy:one(['paper','bubbles'],rng)}),
  tidy:()=>({}),
  styleRoom:(s,a,now,rng)=>{const room=one(s.unlocked,rng),surface=one(Object.keys(DECOR_STYLES[room]),rng),choices=DECOR_STYLES[room][surface].filter(c=>decorAvailable(s,'style',c.id,room,surface));return{room,surface,choice:one(choices,rng).id};},
  setDecorVisible:(s,a,now,rng)=>{const item=one(s.decor,rng);return item?{item,visible:rng()<.5}:null;},
  buyFurniture:(s,a,now,rng)=>({item:one(Object.keys(FURNITURE).filter(id=>decorAvailable(s,'furniture',id)),rng),finish:one(Object.keys(FINISHES).filter(id=>decorAvailable(s,'finish',id)),rng),room:one(s.unlocked,rng),x:35+rng()*330,y:171+rng()*143}),
  storeFurniture:(s,a,now,rng)=>{const object=one(s.objects.filter(o=>FURNITURE[o.type]),rng);return object?{target:object.id}:null;},
  refinishFurniture:(s,a,now,rng)=>{const object=one([...s.objects,...s.catalog.storage].filter(o=>FURNITURE[o.type]),rng);return object?{target:object.id,finish:one(Object.keys(FINISHES).filter(id=>decorAvailable(s,'finish',id)),rng)}:null;},
  placeFurniture:(s,a,now,rng)=>{const object=one(s.catalog.storage,rng);return object?{target:object.id,room:one(s.unlocked,rng),x:35+rng()*330,y:171+rng()*143}:null;},
  sellFurniture:(s,a,now,rng)=>{const object=one([...s.objects,...s.catalog.storage].filter(o=>FURNITURE[o.type]),rng);return object?{target:object.id}:null;},
  sendTo:(s,a,now,rng)=>{const o=one(s.objects,rng);return o?{target:o.id,room:one(s.unlocked,rng),x:35+rng()*330,y:171+rng()*143}:null;},
  poke:(s,a,now,rng)=>({target:someone(s,rng)}),
  pet:(s,a,now,rng)=>({target:someone(s,rng,PETS)}),
  welcome:s=>{const id=atTheDoor(s);return id?{target:id}:null;},
  move:(s,a,now,rng)=>{const t=rng()<.5?someone(s,rng):one([...ACTORS,...s.objects.map(o=>o.id)],rng);return{target:t,x:35+rng()*330,y:171+rng()*143,room:one(s.unlocked,rng)};},
  wear:(s,a,now,rng)=>{const t=someone(s,rng);if((s.stuck[t]||0)>now)return null;return{target:t,item:rng()<.15?null:one(wearables(s),rng)};},
  place:(s,a,now,rng)=>({item:one(s.inventory,rng),room:one(s.unlocked,rng)}),
  gift:(s,a,now,rng)=>s.gifts.filter(g=>!g.opened&&g.from===a).length>=3?null:{item:one(s.inventory,rng)},
  openGift:(s,a)=>{const g=s.gifts.find(g=>g.to===a&&!g.opened);return g?{target:g.id}:null;},
  draw:(s,a,now,rng)=>({lines:[[[rng(),rng()],[rng(),rng()],[rng(),rng()]]]}),
  chaos:(s,a,now,rng)=>({modifier:one(['bouncy','tiny','windy','giant'],rng)}),
  hide:(s,a,now,rng)=>{const o=one(s.objects.filter(o=>!s.hidden[o.id]),rng);return o?{target:o.id}:null;},
  found:s=>{const k=Object.keys(s.hidden)[0];return k?{target:k}:null;},
  stick:(s,a,now,rng)=>{const w=wearables(s);return w.length?{target:someone(s,rng,[...PEOPLE,...RESIDENTS]),item:one(w,rng)}:null;},
  pick:(s,a,now,rng)=>s.choices.picks[a]!==undefined?null:{round:s.choices.round,choice:Math.floor(rng()*5)},
  nextPick:s=>PEOPLE.every(p=>s.choices.picks[p]!==undefined)?{}:null,
  fridge:s=>s.inventory.includes('potato')&&!s.fridgeAt?{}:null,
  fridgeMix:(s,a,now,rng)=>{if(s.fridgeBox.batch)return null;const first=one(FRIDGE_INGREDIENTS,rng);return{ingredients:[first,one(FRIDGE_INGREDIENTS.filter(i=>i!==first),rng)]};},
  fridgeLeave:(s,a)=>{const b=s.fridgeBox.batch;return b?.by===a&&!b.for?{batch:b.id}:null;},
  fridgeTake:(s,a,now)=>{const b=s.fridgeBox.batch;return b&&(!b.for||b.for===a)?{batch:b.id,wear:!(s.stuck[a]>now)}:null;},
  resolve:(s,a,now,rng)=>s.incident?{target:s.incident.uid,score:Math.floor(rng()*40)}:null,
  placeComplete:(s,a,now,rng)=>{
    const open=Object.keys(PLACE_STORIES).filter(p=>s.unlocked.includes(p==='sky'?'roof':'garden'));
    if(!open.length)return null;const place=one(open,rng);return{place,round:placeStory(s,place).round};
  },
  collectFind:(s,a)=>{const f=s.life?.finds?.[a];return f?{target:f.id}:null;},
  plantSeed:(s,a,now,rng)=>s.life?.plant?null:{seed:one(['sun','moon','wild'],rng)},
  pickBloom:(s,a,now)=>s.life?.plant&&!s.life.plant.picked&&plantStage(s,now)>=4?{}:null,
  replant:s=>s.life?.plant?.picked?{}:null,
  walkWith:(s,a,now,rng)=>({room:one(s.unlocked,rng)}),
  postcard:(s,a,now,rng)=>({portrait:someone(s,rng),hat:rng()<.3?null:one(wearables(s),rng),scene:one(['house','garden','night'],rng),pose:one(['idle','happy','sleep'],rng),send:rng()<.5}),
  openLetter:(s,a)=>{const m=s.life?.mail?.find(m=>m.to===a&&!m.opened&&m.kind!=='gift');return m?{target:m.id}:null;},
  reactLetter:(s,a,now,rng)=>{const m=s.life?.mail?.find(m=>m.to===a&&m.opened&&!m.reaction);return m?{target:m.id,reaction:one(REACTIONS,rng)}:null;},
  readReaction:(s,a)=>{const m=s.life?.mail?.find(m=>m.from===a&&m.reaction&&!m.reactionSeen);return m?{target:m.id}:null;},
  // A run in the arcade: mostly a little better than last time, sometimes worse.
  arcadeBest:(s,a,now,rng)=>{const game=one(['jump','drop'],rng),best=s.arcade?.[a]?.[game]||0;return{game,score:Math.max(0,best+Math.floor(rng()*60)-15)};},
};
const OP_TYPES=Object.keys(GENERATORS);

/** Apply one operation and check the world afterwards. Returns the new state. */
function step(state,type,actor,now,rng,{checked=true}={}){
  const body=GENERATORS[type](state,actor,now,rng);
  if(body===null){mark(type,'skip');return state;}
  const op={id:id(),type,actor,...body};
  let next;
  try{next=applyOperation(state,op,now);}
  catch(e){
    if(e.constructor!==Error)
      note('high','crashes',`A ${type} operation throws ${e.constructor.name} instead of a clean rejection`,`${e.message}`);
    mark(type,'rejected',e.message);
    return state;
  }
  mark(type,'ok');
  if(checked)checkWorld(next,`${type} by ${actor}`);
  return next;
}

/* ── passes ───────────────────────────────────────────────────────────────── */

const NOW=Date.UTC(2026,0,5,9,0,0);

function passEveryOperation(){
  // Drive each operation type deliberately, in an order that lets the ones with
  // preconditions actually run: unlock rooms and grow a plant first.
  const rng=random('every-operation');
  let s=createWorld('audit',NOW),now=NOW;
  const both=(type,t)=>{for(const a of PEOPLE){s=step(s,type,a,t,rng);}};

  both('visit',now);
  // Two adventures unlock the garden and give the journeys somewhere to go.
  // …and let in whoever knocks after them: Galgan, Sernik, then Kot.
  for(let i=0;i<4;i++){now+=CHAPTER_GAP+1000;both('visit',now);both('inviteAdventure',now);both('adventureComplete',now);both('welcome',now);}
  both('plantSeed',now);
  for(const type of OP_TYPES){
    // Two passes: the second catches operations whose precondition the first created.
    for(let r=0;r<2;r++)both(type,now);
    now+=60000;
  }
  // The plant needs eight days to reach a bloom that can be picked and replanted.
  now+=9*DAY; both('visit',now); both('pickBloom',now); both('replant',now); both('plantSeed',now);
  // Mail has to be sent before it can be opened, reacted to and read back.
  both('draw',now); both('postcard',now); now+=1000;
  both('openLetter',now); both('reactLetter',now); both('readReaction',now); both('received',now);
  // Gifts, hiding, and the paired pick each need the partner to act in turn.
  both('gift',now); both('openGift',now); both('hide',now); both('found',now);
  both('pick',now); both('nextPick',now);
  for(let i=0;i<40;i++)s=step(s,'poke',PEOPLE[i%2],now+i,rng);   // the poke secrets
  both('placeComplete',now); both('collectFind',now);
  // Finishing an adventure clears the standing incident; a later visit makes a new one.
  now+=30*60000; both('visit',now); both('resolve',now);

  const never=OP_TYPES.filter(t=>!(coverage.get(t)?.ok));
  for(const t of never)
    note('high','coverage',`The ${t} operation was never accepted once, so nothing tests it`,
         [...(coverage.get(t)?.reasons||['no valid context was reachable'])].join(' / '));
  return s;
}

function passDeterminism(){
  // Both phones apply operations on their own. If the same operations produce two
  // different worlds, the two of you stop seeing the same room.
  const build=()=>{
    const rng=random('determinism');
    let s=createWorld('audit',NOW),now=NOW,n=0;
    serial=0;                                     // identical op ids on both runs
    for(let i=0;i<220;i++){
      const type=OP_TYPES[i%OP_TYPES.length],actor=PEOPLE[i%2];
      s=step(s,type,actor,now,rng,{checked:false});
      if(++n%12===0)now+=CHAPTER_GAP+1000;
    }
    return s;
  };
  const a=build(),b=build();
  if(JSON.stringify(a)!==JSON.stringify(b)){
    const where=[];
    for(const k of Object.keys(a))if(JSON.stringify(a[k])!==JSON.stringify(b[k]))where.push(k);
    note('high','determinism',
      `The same operations produce two different worlds, so two phones will drift apart`,
      `differs in: ${where.join(', ')}`);
  }
}

function passIdempotency(){
  // The offline queue resends operations. A resend must change nothing.
  const rng=random('idempotency');
  let s=createWorld('audit',NOW);
  s=applyOperation(s,{id:'fixed-1',type:'poke',actor:'julia',target:'monki'},NOW);
  const again=applyOperation(s,{id:'fixed-1',type:'poke',actor:'julia',target:'monki'},NOW+5000);
  if(JSON.stringify(again)!==JSON.stringify(s))
    note('high','idempotency','Re-sending a queued operation applies it twice',`revision ${s.revision} -> ${again.revision}`);

  // Current phones use a per-session sequence. Even a very old queued retry
  // must stay recognizable after the bounded list for legacy IDs rolls over.
  let t=createWorld('audit',NOW);
  const client='f'.repeat(24);
  const first={id:`m2:${client}:1`,type:'poke',actor:'david',target:'monki'};
  t=applyOperation(t,first,NOW);
  for(let i=2;i<=600;i++)t=applyOperation(t,{id:`m2:${client}:${i}`,type:'seen',actor:'david'},NOW+i);
  const replay=applyOperation(t,first,NOW+9e5);
  if(replay.actors.monki.pokes!==t.actors.monki.pokes)
    note('high','idempotency','A delayed phone retry applied after 600 newer operations',
      'the compact session replay clock did not retain the earlier sequence');
}

function passClientServerAgreement(){
  // The phone applies an operation optimistically; the server applies the same one
  // to its own copy. Those two results have to match, or the screen jumps.
  const rng=random('agreement');
  let client=createWorld('audit',NOW),server=createWorld('audit',NOW),now=NOW;
  for(let i=0;i<120;i++){
    const type=OP_TYPES[i%OP_TYPES.length],actor=PEOPLE[i%2];
    const body=GENERATORS[type](client,actor,now,rng);
    if(body===null)continue;
    const op={id:id(),type,actor,...body};
    let c,s;
    try{c=applyOperation(client,op,now);}catch{continue;}
    try{s=applyOperation(server,op,now);}
    catch(e){note('high','agreement',`The phone accepts a ${type} the server refuses, so the screen will snap back`,e.message);continue;}
    if(JSON.stringify(c)!==JSON.stringify(s)){
      const where=Object.keys(c).filter(k=>JSON.stringify(c[k])!==JSON.stringify(s[k]));
      note('high','agreement',`A ${type} lands differently on the phone and on the server, so the screen will jump`,`first divergence, in: ${where.join(', ')}`);
      return;                                   // everything after this differs for the same reason
    }
    client=c;server=s;
    if(i%10===9)now+=CHAPTER_GAP+1000;
  }
}

function passMalformed(){
  // Anything can arrive over the wire. Nothing may crash the reducer or half-apply.
  const cases=[];
  for(const type of OP_TYPES)for(const junk of [
    {},{target:'nobody'},{target:null},{item:'not-an-item'},{item:null},{room:'basement'},
    {x:NaN,y:NaN},{x:Infinity,y:-Infinity},{x:'12',y:'12'},{index:-1},{round:-5},{choice:99},
    {score:-1},{score:1e9},{lines:'nope'},{lines:[[[2,2]]]},{toy:'ball'},{toy:'chainsaw'},
    {modifier:'sleepy'},{seed:'poison'},{reaction:'rage'},{place:'moon'},{chapter:'nope'},
    {portrait:'nobody'},{scene:'void'},{pose:'vogue'},{hour:99},{hat:'not-an-item'},
  ])cases.push({type,...junk});
  cases.push({type:'unknown-operation'},{type:''},{type:null});

  const base=(()=>{let s=createWorld('audit',NOW);
    for(let i=0;i<3;i++){const t=NOW+(i+1)*(CHAPTER_GAP+1000);
      for(const a of PEOPLE){s=applyOperation(s,{id:id(),type:'visit',actor:a},t);
        const c=adventureFor(s,a,t);if(c.ready)s=applyOperation(s,{id:id(),type:'adventureComplete',actor:a,chapter:c.id,index:c.index},t);}}
    return s;})();
  const frozen=JSON.stringify(base);

  for(const body of cases)for(const actor of [...PEOPLE,'monki',null,'',123]){
    const op={id:id(),actor,...body};
    let next;
    try{next=applyOperation(base,op,NOW+DAY);}
    catch(e){
      if(e.constructor!==Error)
        note('high','crashes',`A malformed ${body.type} operation throws ${e.constructor.name}, which the server turns into a 500`,
             `${e.message} — op ${JSON.stringify(body).slice(0,90)}`);
      continue;
    }
    if(JSON.stringify(base)!==frozen)
      note('high','purity',`A rejected ${body.type} operation mutated the world it was given`,JSON.stringify(body).slice(0,90));
    checkWorld(next,`malformed ${body.type}`);
  }

  // The reducer must never be handed a state it then edits in place.
  const before=JSON.stringify(base);
  applyOperation(base,{id:id(),type:'tidy',actor:'julia'},NOW+DAY);
  if(JSON.stringify(base)!==before)note('high','purity','Applying an operation edits the state it was given instead of a copy','tidy');
}

function passAdventuresAndPlaces(){
  // Every authored chapter has to be reachable and survive being completed.
  let s=createWorld('audit',NOW),now=NOW;
  const played=[];
  for(let i=0;i<ADVENTURES.length+4;i++){
    now+=CHAPTER_GAP+1000;
    for(const a of PEOPLE){
      s=applyOperation(s,{id:id(),type:'visit',actor:a},now);
      const c=adventureFor(s,a,now);
      if(!c.ready)continue;
      // A chapter a day: the second attempt on the same day must be refused.
      const first=applyOperation(s,{id:id(),type:'adventureComplete',actor:a,chapter:c.id,index:c.index},now);
      const twice=applyOperation(first,{id:id(),type:'adventureComplete',actor:a,chapter:adventureFor(first,a,now).id,index:adventureFor(first,a,now).index},now);
      if(twice.journeys[a].index!==first.journeys[a].index)
        note('high','pacing','Two adventures can be finished in the same day',`${a} reached ${twice.journeys[a].index}`);
      s=first;played.push(c.id);
      checkWorld(s,`adventure ${c.id}`);
    }
  }
  for(const c of ADVENTURES)if(!played.includes(c.id))
    note('medium','adventures',`The chapter "${c.title}" is never reachable by playing normally`,c.id);
  if(!s.unlocked.includes('garden'))note('high','adventures','The garden never unlocks',`after ${played.length} chapters`);
  if(!s.unlocked.includes('roof'))note('medium','adventures','The roof never unlocks by playing the adventures in order',`after ${played.length} chapters`);

  // Every outdoor story, every round, through the real reducer.
  for(const [place,pool]of Object.entries(PLACE_STORIES)){
    let t=s;
    for(let round=0;round<pool.length*2;round++){
      const story=placeStory(t,place);
      if(!story){note('high','places',`placeStory returned nothing for ${place}`,`round ${round}`);break;}
      for(const key of ['actor','reward','steps','title'])
        if(story[key]===undefined)note('medium','places',`An outdoor story is missing its ${key}`,`${place} round ${round}`);
      if(!ACTORS.includes(story.actor))note('medium','places',`An outdoor story stars somebody who is not in the game`,`${place}:${story.actor}`);
      if(!ITEMS[story.reward])note('medium','places',`An outdoor story rewards an item that does not exist`,`${place}:${story.reward}`);
      for(const st of story.steps)if(!ITEMS[st.item]&&!ACTORS.includes(st.item))
        note('low','places',`An outdoor step uses a prop with no sprite`,`${place}:${st.kind}:${st.item}`);
      try{t=applyOperation(t,{id:id(),type:'placeComplete',actor:PEOPLE[round%2],place,round:story.round},NOW+DAY*(round+1));}
      catch(e){note('medium','places',`An outdoor story cannot be completed`,`${place} round ${round}: ${e.message}`);break;}
      checkWorld(t,`place ${place} round ${round}`);
    }
  }

  // Finishing a chapter puts its reward straight onto someone's head. A reward that
  // is not a hat goes on and can never go back on once it is taken off.
  for(const c of ADVENTURES){
    if(!ITEMS[c.reward])note('high','adventures',`A chapter rewards an item that does not exist`,`${c.id}:${c.reward}`);
    else if(!ITEMS[c.reward].wearable)note('medium','adventures',`A chapter puts something that is not a hat on ${c.actor}'s head`,`${c.id}:${c.reward}`);
    if(c.souvenir&&!ITEMS[c.souvenir])note('medium','adventures',`A chapter leaves a souvenir with no sprite`,`${c.id}:${c.souvenir}`);
    if(!ACTORS.includes(c.actor))note('high','adventures',`A chapter stars somebody who is not in the game`,`${c.id}:${c.actor}`);
  }

  // Count the featured interaction people actually get in normal play, not all
  // three authored test-lab segments as if they were mandatory homework.
  {
    const steps=ADVENTURES.map(c=>c.steps[featuredStepFor(c)]),tally={};
    for(const s of steps)tally[s.kind]=(tally[s.kind]||0)+1;
    for(const [kind,n] of Object.entries(tally))
      if(n/steps.length>0.15)note('medium','variety',
        `The "${kind}" game is ${Math.round(n/steps.length*100)}% of normal adventures`,
        `${n} of ${steps.length} featured interactions`);
  }

  // Discoveries must all be collectable and all their items must exist.
  for(const d of DISCOVERIES){
    if(!ITEMS[d.item])note('medium','discoveries',`A discovery gives an item that does not exist`,`${d.id}:${d.item}`);
    if(!ACTORS.includes(d.actor))note('medium','discoveries',`A discovery stars somebody who is not in the game`,`${d.id}:${d.actor}`);
    if(d.setup&&!ITEMS[d.setup.item])note('medium','discoveries',`A discovery waits for an item that does not exist`,`${d.id}`);
  }
}

function passWeather(){
  // Weather is derived from the seed and the clock, so both phones must agree.
  const s=createWorld('audit',NOW);
  for(let h=0;h<24*14;h++){
    const t=NOW+h*3600000,w=weatherFor(s,t);
    if(!WEATHER.includes(w))note('high','weather',`An unknown weather was produced`,String(w));
    if(weatherFor(s,t)!==w)note('high','weather','Weather is not stable for the same moment',String(t));
  }
  const spread=new Set();
  for(let h=0;h<24*60;h++)spread.add(weatherFor(s,NOW+h*3600000));
  if(spread.size<WEATHER.length)
    note('low','weather',`Only ${spread.size} of ${WEATHER.length} kinds of weather ever occur`,[...spread].join(', '));
}

function passLongHorizon(){
  // Four months of two people actually using it. This is the pass that catches
  // saves that grow forever and loops that quietly stop producing anything.
  const rng=random('long-horizon');
  let s=createWorld('audit',NOW),now=NOW;
  let finds=0,chapters=0,letters=0;
  for(let day=0;day<120;day++){
    for(const hour of [8,13,21]){
      now=NOW+day*DAY+hour*3600000;
      for(const a of PEOPLE){
        s=step(s,'visit',a,now,rng,{checked:false});
        // Leave the three setup objects where their discoveries are waiting for them.
        if(day%10===0&&a==='julia')for(const d of DISCOVERIES)if(d.setup&&s.inventory.includes(d.setup.item)&&s.unlocked.includes(d.setup.room))
          {try{s=applyOperation(s,{id:id(),type:'place',actor:a,item:d.setup.item,room:d.setup.room},now);}catch{}}
        const before=s.life.collection.length;
        s=step(s,'collectFind',a,now,rng,{checked:false});
        if(s.life.collection.length>before)finds++;
        const c=adventureFor(s,a,now);
        if(c.ready){const n=step(s,'adventureComplete',a,now,rng,{checked:false});if(n!==s)chapters++;s=n;}
        for(const t of ['poke','wear','move','draw','postcard','gift','openGift','openLetter','reactLetter','readReaction','toyResult','place','sendTo','hide','found','walkWith','plantSeed','pickBloom','replant','placeComplete','received','seen','resolve'])
          s=step(s,t,a,now,rng,{checked:false});
        if(day%10===9&&hour===21)s=step(s,'tidy',a,now,rng,{checked:false});   // a tidy-up now and then, not every visit
      }
    }
    if(day%15===0)checkWorld(s,`day ${day}`);
  }
  checkWorld(s,'day 120');
  letters=s.life.mail.length;
  const size=JSON.stringify(s).length;
  if(size>2_000_000)note('high','growth',`After four months the save is ${(size/1e6).toFixed(1)} MB, past what phone storage will hold`,`${size} bytes`);
  else if(size>400_000)note('medium','growth',`After four months the save is ${Math.round(size/1024)} KB and still climbing`,`${size} bytes`);
  if(finds<DISCOVERIES.length)
    note('medium','retention',`Only ${finds} of ${DISCOVERIES.length} discoveries turn up in four months of daily play`,'the collection stops filling');
  if(chapters<ADVENTURES.length)
    note('low','retention',`Only ${chapters} of ${ADVENTURES.length} chapters get played in four months`,'per person, at one a day');
  return {size,finds,chapters,letters,state:s};
}

function passFuzz(){
  // Random operations, random order, random shapes, with the invariants checked
  // after every single one. Seeded, so a failure can be replayed exactly.
  for(let run=0;run<24;run++){
    const seed=`fuzz-${run}`,rng=random(seed);
    let s=createWorld(seed,NOW),now=NOW;
    for(let i=0;i<260;i++){
      const type=OP_TYPES[Math.floor(rng()*OP_TYPES.length)],actor=PEOPLE[Math.floor(rng()*2)];
      const before=JSON.stringify(s);
      try{s=step(s,type,actor,now,rng);}
      catch(e){note('high','crashes',`The fuzzer crashed the reducer with ${type}`,`${seed} step ${i}: ${e.message}`);break;}
      if(JSON.stringify(s)!==before&&s.revision===JSON.parse(before).revision)
        note('medium','bookkeeping','The world changed without the revision moving, so other phones will not refetch',`${type}`);
      now+=Math.floor(rng()*4*3600000);
    }
    checkWorld(s,`fuzz ${seed}`);
  }
}

function passPrivacy(){
  // What the server sends each of you must not contain the other's secrets.
  let s=createWorld('audit',NOW);
  s=applyOperation(s,{id:id(),type:'pick',actor:'julia',round:0,choice:3},NOW);
  const forDavid=visibleWorld(s,'david');
  if(forDavid.choices.picks.julia!==undefined)
    note('high','privacy',`Julia's pick is visible to David before he has chosen`,`choice ${forDavid.choices.picks.julia}`);
  if(forDavid.choices.partnerReady!==true)
    note('low','privacy','The "your person has already chosen" hint is missing','choices.partnerReady');

  s=applyOperation(s,{id:id(),type:'gift',actor:'julia',item:'cone'},NOW+1000);
  const gift=visibleWorld(s,'david').gifts.find(g=>g.to==='david');
  if(gift?.item!==undefined)note('high','privacy',`A sealed gift's contents are sent to the person who has not opened it`,String(gift.item));
  const senderView=visibleWorld(s,'julia').gifts.find(g=>g.from==='julia');
  if(senderView?.item===undefined)note('low','privacy','The sender cannot see what they sent','gifts');

  // A visible world must still be a legal world.
  checkWorld(prepareWorld(forDavid),'visibleWorld');

  // Sanity on the two helpers the UI trusts.
  let t=moveEveryoneIn(createWorld('audit',NOW));
  for(let i=0;i<4;i++)t=applyOperation(t,{id:id(),type:'poke',actor:'julia',target:'sernik'},NOW+i);
  if(favourite(t,'julia')!=='sernik')note('medium','bond',`Four pokes do not make a favourite`,String(favourite(t,'julia')));
  if(favourite(t,'david')!==null)note('medium','bond',`Julia's pokes changed David's favourite`,String(favourite(t,'david')));
  t=applyOperation(t,{id:id(),type:'draw',actor:'julia',lines:[[[.1,.1],[.9,.9]]]},NOW+9000);
  if(!waitingFor(t,'david').some(w=>w.kind==='drawing'))note('high','mail','A drawing never reaches the person it was drawn for','waitingFor');
  if(waitingFor(t,'julia').some(w=>w.kind==='drawing'))note('medium','mail','A drawing is handed back to the person who drew it','waitingFor');
}

function passMigration(){
  // Her phone may still hold a version 1 or 2 save. It has to open, not crash.
  const legacy={
    version:1,seed:'old',revision:9,created:NOW,updated:NOW,lastVisit:NOW,completed:2,serial:2,
    recent:[],unlocked:['house','garden'],inventory:['cone','ball','potato'],
    actors:Object.fromEntries(ACTORS.map(a=>[a,{x:200,y:250,room:'house',hat:null,mood:'idle',pokes:0}])),
    objects:[{id:'couch',type:'couch',room:'house',x:118,y:181},{id:'many-potato-0',type:'potato',room:'house',x:90,y:260},{id:'old-ball',type:'ball',room:'house',x:150,y:270}],
    traces:[{type:'paper',room:'house',x:1,y:1,at:NOW},{type:'tower',room:'house',x:2,y:2,at:NOW}],
    log:[],gifts:[{id:'g1',from:'julia',to:'david',item:'cone',at:NOW,opened:false}],
    drawing:[[[.2,.2],[.8,.8]]],drawingBy:'julia',drawingAt:NOW,chaos:{},choices:{round:0,picks:{},revealed:[]},
    secrets:[],fridgeAt:null,incident:null,nextAt:NOW,applied:[],decor:['ball','cone'],
  };
  let opened;
  try{opened=prepareWorld(legacy);}
  catch(e){note('high','migration',`An old save cannot be opened at all, so her world is lost`,e.message);return;}
  checkWorld(opened,'a version 1 save');
  if(opened.version!==3)note('medium','migration','An old save is not brought up to the current version',`version ${opened.version}`);
  if(opened.inventory.includes('ball'))note('low','migration','The retired ball is still in an old inventory','inventory');
  if(opened.traces.some(t=>t.type==='paper'))note('low','migration','The retired paper trail survives migration','traces');
  if(!opened.life)note('high','migration','An old save opens without a mailbox or collection','life');
  if(!opened.life.mail.some(m=>m.kind==='gift'))note('medium','migration','A gift in an old save never appears in the new mailbox','life.mail');
  if(!opened.life.mail.some(m=>m.kind==='drawing'))note('medium','migration','A drawing in an old save never appears in the new mailbox','life.mail');
  // And it must still accept operations afterwards.
  try{checkWorld(applyOperation(opened,{id:id(),type:'poke',actor:'david',target:'monki'},NOW+DAY),'an old save after one poke');}
  catch(e){note('high','migration','An old save opens but cannot be played',e.message);}
}

async function passReachability(){
  const {readFile,readdir}=await import('node:fs/promises');
  const dir=new URL('../public/',import.meta.url);
  const files=(await readdir(dir)).filter(f=>f.endsWith('.js'));
  const sent=new Set();
  for(const f of files){
    const text=await readFile(new URL(f,dir),'utf8');
    for(const m of text.matchAll(/\b(?:operate|\.op)\(\s*['"]([a-zA-Z]+)['"]/g))sent.add(m[1]);
  }
  // Two UI calls choose their operation name at runtime; the static text scan
  // cannot see either branch. The other three are accepted for old queued saves.
  sent.add('buyFurniture');sent.add('placeFurniture');
  const legacy=new Set(['toy','sendTo','resolve']);
  for(const type of OP_TYPES){
    if(sent.has(type)||legacy.has(type))continue;
    note('medium','reachability',`The ${type} operation exists and is tested, but nothing in the interface can send it`,
      'dead path: either wire it up or take it out');
  }
  for(const type of sent)if(!OP_TYPES.includes(type))
    note('high','reachability',`The interface sends a ${type} operation the audit does not know about`,'the audit is out of date, or the reducer will reject it');
  return sent;
}

function passSetupDiscoveries(){
  // Three of the twelve discoveries only appear after you leave a specific object
  // in a specific room for two days. That path has to actually work.
  const setups=DISCOVERIES.filter(d=>d.setup);
  for(const d of setups){
    let s=createWorld(`setup-${d.id}`,NOW),now=NOW;
    // Far enough in that every room is open and the paper toy has been used once.
    for(let i=0;i<8;i++){now+=CHAPTER_GAP+1000;
      for(const a of PEOPLE){s=applyOperation(s,{id:id(),type:'visit',actor:a},now);
        const c=adventureFor(s,a,now);if(c.ready)s=applyOperation(s,{id:id(),type:'adventureComplete',actor:a,chapter:c.id,index:c.index},now);
        const f=s.life.finds[a];if(f)s=applyOperation(s,{id:id(),type:'collectFind',actor:a,target:f.id},now);}}
    s=applyOperation(s,{id:id(),type:'toyResult',actor:'julia',toy:'paper',room:'house',target:'sernik'},now);
    if(!s.unlocked.includes(d.setup.room)){
      note('medium','discoveries',`The room a discovery needs is not open by the time it could appear`,`${d.id} needs ${d.setup.room}`);continue;
    }
    if(!s.inventory.includes(d.setup.item)){
      note('medium','discoveries',`A discovery waits for an item she does not own yet`,`${d.id} needs ${d.setup.item}`);continue;
    }
    s=applyOperation(s,{id:id(),type:'place',actor:'julia',item:d.setup.item,room:d.setup.room},now);
    if(s.life.setups[d.id]===undefined){note('high','discoveries',`Leaving the right thing in the right room does not start the wait`,d.id);continue;}
    // Wait the stated number of days, then look.
    now+=d.setup.days*DAY+3600000;
    s=applyOperation(s,{id:id(),type:'visit',actor:'julia'},now);
    const find=s.life.finds.julia;
    if(find?.discovery!==d.id){
      note('medium','discoveries',`The waited-for discovery never arrives; an ordinary one takes its place`,
        `${d.id} — got ${find?.discovery||'nothing'} after ${d.setup.days} days`);continue;
    }
    s=applyOperation(s,{id:id(),type:'collectFind',actor:'julia',target:find.id},now);
    if(!s.life.collection.some(c=>c.discovery===d.id))note('high','discoveries',`A discovery cannot be collected`,d.id);
    if(!s.inventory.includes(d.item))note('medium','discoveries',`Collecting a discovery does not hand over its hat`,`${d.id}:${d.item}`);
    checkWorld(s,`setup discovery ${d.id}`);
  }
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const started=Date.now();
passEveryOperation();
passDeterminism();
passIdempotency();
passClientServerAgreement();
passMalformed();
passAdventuresAndPlaces();
passWeather();
passPrivacy();
passMigration();
passSetupDiscoveries();
await passReachability();
const long=QUICK?null:passLongHorizon();
if(!QUICK)passFuzz();
const elapsed=Date.now()-started;

const order={high:0,medium:1,low:2};
findings.sort((a,b)=>order[a.severity]-order[b.severity]||a.area.localeCompare(b.area));

if(JSON_OUT){
  console.log(JSON.stringify({findings,coverage:Object.fromEntries([...coverage].map(([k,v])=>[k,{ok:v.ok,rejected:v.rejected}])),elapsed,save:long?.size},null,2));
}else{
  const applied=[...coverage.values()].reduce((n,c)=>n+c.ok,0);
  console.log(`\nMonki World engine audit — ${OP_TYPES.length} operations, ${applied} applied, ${elapsed}ms\n`);
  const missing=OP_TYPES.filter(t=>!(coverage.get(t)?.ok));
  console.log(missing.length?`  never exercised: ${missing.join(', ')}\n`:'  every operation was exercised at least once\n');
  if(long)console.log(`  four months of daily use: ${Math.round(long.size/1024)} KB save, ${long.finds} discoveries, ${long.chapters} chapters, ${long.letters} letters kept\n`);
  if(!findings.length)console.log('  No findings.\n');
  for(const f of findings){
    const tag={high:'HIGH  ',medium:'MEDIUM',low:'LOW   '}[f.severity];
    console.log(`  ${tag} [${f.area}] ${f.message}`);
    if(f.detail)console.log(`         ${f.detail}`);
  }
  const high=findings.filter(f=>f.severity==='high').length;
  console.log(`\n  ${findings.length} findings — ${high} high, ${findings.filter(f=>f.severity==='medium').length} medium, ${findings.filter(f=>f.severity==='low').length} low\n`);
}
process.exit(findings.some(f=>f.severity==='high')?1:0);

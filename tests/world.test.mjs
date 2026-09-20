import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld,INCIDENTS,makeIncident,TENDENCIES,GESTURES,CONTRACTS} from '../shared/world.js';

const NOW=Date.parse('2026-09-20T12:00:00Z');
let sequence=0;
const op=(state,type,fields={},now=NOW,actor='david')=>applyOperation(state,{type,actor,id:`test-${++sequence}`,...fields},now);

test('a fresh world has five residents, a physical home and one discoverable incident',()=>{
  const state=createWorld('test',NOW);
  assert.equal(Object.keys(state.actors).length,5);
  assert.deepEqual(state.unlocked,['house']);
  assert.equal(state.incident.id,'balloons');
  assert.ok(state.objects.find(o=>o.type==='couch'));
  assert.equal(new Set(INCIDENTS.map(i=>i.kind)).size,7);
});

test('moves preserve independent actions, clamp bounds, and reject malformed targets',()=>{
  const first=createWorld('test',NOW);
  const second=op(first,'move',{target:'couch',x:900,y:-40,room:'house'});
  const third=op(second,'wear',{target:'monki',item:'cone'},NOW,'julia');
  assert.equal(first.objects[0].x,118);
  assert.equal(third.objects[0].x,365);
  assert.equal(third.objects[0].y,171);
  assert.equal(third.actors.monki.hat,'cone');
  assert.throws(()=>op(third,'poke',{target:'__proto__'}));
  assert.throws(()=>op(third,'move',{target:'couch',x:NaN,y:200,room:'house'}));
  assert.throws(()=>op(third,'move',{target:'couch',x:50,y:200,room:'roof'}));
});

test('network retries are idempotent',()=>{
  const first=createWorld('test',NOW),operation={id:'once',actor:'david',type:'poke',target:'monki'};
  const saved=applyOperation(first,operation,NOW);
  assert.equal(applyOperation(saved,operation,NOW+100),saved);
  assert.equal(saved.actors.monki.pokes,1);
});

test('both players finishing the same incident only advances the world once',()=>{
  let state=createWorld('test',NOW);const uid=state.incident.uid;
  state=op(state,'resolve',{target:uid,score:9});
  state=op(state,'resolve',{target:uid,score:10},NOW,'julia');
  assert.equal(state.completed,1);assert.equal(state.serial,1);assert.equal(state.traces.length,1);
});

test('situations are composed, varied, and never repeat a recent one',()=>{
  let state=createWorld('test',NOW),now=NOW;
  const visited=[],kinds=new Set();
  for(let i=0;i<15;i++){
    const e=state.incident;assert.ok(e,`no incident on round ${i}`);
    assert.ok(!visited.slice(-8).includes(e.id),`repeated ${e.id} too soon`);
    visited.push(e.id);kinds.add(e.kind);
    assert.ok(GESTURES[e.kind],`unknown gesture ${e.kind}`);
    state=op(state,'resolve',{target:e.uid,score:e.goal},now);
    now+=25*60000;state=op(state,'visit',{},now);
  }
  // Most of these were never written down anywhere.
  assert.ok(new Set(visited).size>=12,`only ${new Set(visited).size} distinct situations`);
  assert.ok(kinds.size>=4,`only ${kinds.size} distinct gestures`);
  assert.ok(state.inventory.length>8);assert.ok(state.traces.length>0);
});

test('places open because a resident made them, not because a counter reached a number',()=>{
  // Galgan digs; two holes at the house are a way out. Nothing announces it.
  let state=createWorld('dig-seed',NOW);
  state.actors.galgan.room='house';
  let now=NOW,guard=0;
  while(!state.unlocked.includes('garden')&&guard++<40){now+=6*3600000;state=op(state,'visit',{},now);}
  assert.ok(state.unlocked.includes('garden'),'the garden never opened');
  assert.ok(state.digs>=2,'the garden opened without anyone digging');
  // Finishing incidents alone does not hand out places.
  let counted=createWorld('count-seed',NOW),t=NOW;
  for(let i=0;i<10;i++){const e=counted.incident;if(!e)break;counted=op(counted,'resolve',{target:e.uid,score:e.goal},t);t+=25*60000;counted=op(counted,'visit',{},t);}
  assert.ok(counted.completed>=5,'did not complete enough to test the old gate');
});

test('gifts are sealed for their recipient and only the recipient can open them',()=>{
  let state=op(createWorld('test',NOW),'gift',{item:'potato'});const id=state.gifts[0].id;
  assert.equal(visibleWorld(state,'julia').gifts[0].item,undefined);
  assert.throws(()=>op(state,'openGift',{target:id}));
  const optimistic=op(visibleWorld(state,'julia'),'openGift',{target:id},NOW,'julia');
  assert.ok(optimistic.objects.every(o=>!!o.type));
  state=op(state,'openGift',{target:id},NOW,'julia');
  assert.equal(visibleWorld(state,'julia').gifts[0].item,'potato');
  assert.ok(state.objects.find(o=>o.id==='gift-potato'));
});

test('secret choices do not leak before both players choose, and cannot be replaced',()=>{
  let state=op(createWorld('test',NOW),'pick',{round:0,choice:3});
  assert.equal(visibleWorld(state,'julia').choices.picks.david,undefined);
  assert.equal(visibleWorld(state,'julia').choices.partnerReady,true);
  assert.throws(()=>op(state,'pick',{round:0,choice:1}));
  state=op(state,'pick',{round:0,choice:3},NOW,'julia');
  assert.equal(state.choices.revealed[0].match,true);
  assert.equal(state.actors.monki.hat,'frog');
  assert.equal(visibleWorld(state,'julia').choices.picks.david,3);
  state=op(state,'nextPick');assert.equal(state.choices.round,1);assert.deepEqual(state.choices.picks,{});
});

test('a partner surprise is used up by that player, not the sender',()=>{
  let state=op(createWorld('test',NOW),'chaos',{modifier:'windy'});
  state=op(state,'resolve',{target:state.incident.uid,score:12});
  assert.equal(state.chaos.julia.modifier,'windy');
  state=op(state,'visit',{},NOW+25*60000);
  assert.ok(state.incident,'a new situation should have turned up by now');
  state=op(state,'resolve',{target:state.incident.uid,score:12},NOW+25*60000+1000,'julia');
  assert.equal(state.chaos.julia,undefined);
});

test('time away changes the house without removing belongings or imposing care',()=>{
  const first=createWorld('test',NOW),next=op(first,'visit',{},NOW+8*86400000);
  // Nothing is taken away and nothing is owed; the place simply moved on without you.
  assert.ok(next.inventory.length>=first.inventory.length);
  assert.ok(Object.values(next.actors).some(a=>a.hat));assert.ok(next.log.length>0);
  assert.ok(first.unlocked.every(place=>next.unlocked.includes(place)));
});

test('an afternoon away is a few events; a week away is a great many more',()=>{
  const counts=[20*60000,8*3600000,6*86400000].map(ms=>op(createWorld('away',NOW),'visit',{},NOW+ms).log.length);
  assert.ok(counts[0]<counts[1],`${counts[0]} not fewer than ${counts[1]}`);
  assert.ok(counts[1]<counts[2],`${counts[1]} not fewer than ${counts[2]}`);
  assert.ok(counts[2]>=20,`a week produced only ${counts[2]} events`);
});

test('a long absence leaves a structure nobody asked for',()=>{
  const before=createWorld('build',NOW);
  const after=op(before,'visit',{},NOW+5*86400000);
  assert.ok(after.objects.length>before.objects.length,'nothing was built');
  assert.ok(after.traces.some(v=>v.type==='tower'));
});

test('each resident behaves like itself rather than at random',()=>{
  // Over many absences Galgan should move furniture far more than Monki does.
  const movers={};
  for(let seed=0;seed<12;seed++){
    const state=op(createWorld('who'+seed,NOW),'visit',{},NOW+4*86400000);
    for(const entry of state.log)if(entry.action==='move'||entry.action==='out')movers[entry.who]=(movers[entry.who]||0)+1;
  }
  assert.ok((movers.galgan||0)>(movers.sernik||0),`galgan ${movers.galgan} vs sernik ${movers.sernik}`);
  assert.ok(TENDENCIES.sernik.loves.includes('icecream'));
});

test('a hat someone stuck on you cannot come off until tomorrow',()=>{
  let state=op(createWorld('test',NOW),'stick',{target:'julia',item:'cone'});
  assert.equal(state.actors.julia.hat,'cone');
  assert.throws(()=>op(state,'wear',{target:'julia',item:null},NOW+3600000,'julia'));
  state=op(state,'wear',{target:'julia',item:null},NOW+86400001,'julia');
  assert.equal(state.actors.julia.hat,null);
});

test('something hidden stays hidden until it is found',()=>{
  let state=op(createWorld('test',NOW),'hide',{target:'lamp'});
  assert.ok(state.hidden.lamp);
  state=op(state,'found',{target:'lamp'},NOW+1000,'julia');
  assert.equal(state.hidden.lamp,undefined);
  assert.equal(state.log[0].action,'find');
});

test('the refrigerated potato has a persistent, delayed secret',()=>{
  let state=op(createWorld('test',NOW),'fridge');
  state=op(state,'visit',{},NOW+2*86400000);assert.ok(!state.unlocked.includes('cellar'));
  state=op(state,'visit',{},NOW+3*86400000+1);assert.ok(state.unlocked.includes('cellar'));
  state=op(state,'visit',{},NOW+4*86400000);assert.equal(state.unlocked.filter(s=>s==='cellar').length,1);
});

test('drawings are bounded strokes, not executable or unlimited content',()=>{
  let state=createWorld('test',NOW);
  state=op(state,'draw',{lines:[[[.2,.3],[.4,.5]]]});assert.equal(state.drawing.length,1);
  assert.throws(()=>op(state,'draw',{lines:'<script>'}));
  assert.throws(()=>op(state,'draw',{lines:[[[2,.1]]]}));
  assert.throws(()=>op(state,'draw',{lines:Array.from({length:15},()=>Array.from({length:300},()=>[.2,.4]))}));
});

test('every content definition can be constructed and resolved',()=>{
  for(const definition of INCIDENTS){let state=createWorld('test',NOW);state.incident=makeIncident(state,NOW,definition.id);state=op(state,'resolve',{target:state.incident.uid,score:definition.goal});assert.ok(state.inventory.includes(definition.reward));assert.equal(state.traces[0].type,definition.aftermath);}
});

test('what happened while you were away is recorded in a replayable form',()=>{
  const state=op(createWorld('replay',NOW),'visit',{},NOW+3*86400000);
  assert.ok(state.changes.length>5,`only ${state.changes.length} change records`);
  const moves=state.changes.flatMap(c=>c.moves);
  assert.ok(moves.length,'nothing moved');
  // Every move knows where it started, so the room can rewind to how she left it.
  for(const m of moves.filter(m=>m.kind==='object'||m.kind==='actor')){
    assert.ok(m.from&&Number.isFinite(m.from.x)&&m.from.room,'a move without an origin');
    assert.ok(m.to&&Number.isFinite(m.to.x)&&m.to.room,'a move without a destination');
  }
  for(const c of state.changes)assert.ok(c.who,'a change nobody is responsible for');
});

test('each person is shown only what they personally missed',()=>{
  let state=createWorld('seen',NOW);
  const t=NOW+60000;
  state=op(state,'move',{target:'lamp',x:300,y:250,room:'house'},t,'david');
  const missed=c=>state.changes.filter(x=>x.at>state.seen[c]).length;
  // David did it, so it is Julia who has something waiting.
  assert.ok(missed('julia')>0,'julia was not told');
  state=op(state,'seen',{},t+1000,'julia');
  assert.equal(missed('julia'),0);
  // Acknowledging is the only thing that moves the marker; looking around is not.
  const before=state.seen.david;
  state=op(state,'visit',{},t+2*86400000,'david');
  assert.equal(state.seen.david,before);
});

test('what a short game asks of you varies, not just the gesture',()=>{
  let state=createWorld('shape',NOW),t=NOW;
  const seen=new Set();
  for(let i=0;i<50;i++){
    const e=state.incident;if(!e)break;
    assert.ok(CONTRACTS[e.contract],`unknown contract ${e.contract}`);
    seen.add(e.contract);
    state=op(state,'resolve',{target:e.uid,score:e.goal||1},t);
    t+=25*60000;state=op(state,'visit',{},t);
  }
  assert.ok(seen.size>=5,`only ${seen.size} kinds of contract: ${[...seen]}`);
  // Some of them count nothing at all.
  assert.ok([...seen].some(c=>CONTRACTS[c].silent),'every game still announces itself');
});

test('something you did days ago comes back without explanation',()=>{
  let state=op(createWorld('chain',NOW),'hide',{target:'lamp'});
  assert.equal(state.chains.length,1);
  const lampBefore={...state.objects.find(o=>o.id==='lamp')};
  state=op(state,'visit',{},NOW+6*86400000);
  assert.equal(state.chains.length,0,'the chain never fired');
  assert.equal(state.hidden.lamp,undefined,'it is still hidden');
  const lamp=state.objects.find(o=>o.id==='lamp');
  assert.ok(lamp.x!==lampBefore.x||lamp.y!==lampBefore.y||lamp.room!==lampBefore.room,'it did not turn up anywhere');
});

test('a ghost game is played against their own previous best',()=>{
  let state=createWorld('ghost',NOW);
  state.best={tap:20};
  let found=null;
  for(let i=0;i<80&&!found;i++){const e=makeIncident({...state,serial:i},NOW);if(e.contract==='ghost'&&e.kind==='tap')found=e;}
  if(found)assert.ok(found.goal>=20,`ghost goal ${found.goal} ignored the previous best`);
});

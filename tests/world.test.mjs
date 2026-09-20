import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld,INCIDENTS,makeIncident} from '../shared/world.js';

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

test('new places emerge, without repeatedly selecting a recent situation',()=>{
  let state=createWorld('test',NOW),now=NOW;
  const visited=[];
  for(let i=0;i<15;i++){
    const e=state.incident;assert.ok(e);assert.ok(!visited.slice(-8).includes(e.id));visited.push(e.id);
    state=op(state,'resolve',{target:e.uid,score:e.goal},now);
    now+=61000;state=op(state,'visit',{},now);
  }
  assert.ok(state.unlocked.includes('garden'));assert.ok(state.unlocked.includes('roof'));
  assert.ok(state.inventory.length>8);assert.ok(state.traces.length>0);
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
  state=op(state,'visit',{},NOW+61000);
  state=op(state,'resolve',{target:state.incident.uid,score:12},NOW+62000,'julia');
  assert.equal(state.chaos.julia,undefined);
});

test('time away changes the house without removing belongings or imposing care',()=>{
  const first=createWorld('test',NOW),next=op(first,'visit',{},NOW+8*86400000);
  assert.deepEqual(next.unlocked,first.unlocked);assert.ok(next.inventory.length>=first.inventory.length);
  assert.ok(Object.values(next.actors).some(a=>a.hat));assert.ok(next.log.length>0);
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

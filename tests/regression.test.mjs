// Defects the audits found once. Each of these is here so it cannot come back.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,prepareWorld,ITEMS,PEOPLE,RESIDENTS} from '../shared/world.js';
import {ADVENTURES,CHAPTER_GAP,adventureFor} from '../shared/adventures.js';
import {DISCOVERIES,DAY} from '../shared/life.js';
import {fullHouse} from './house.mjs';

const NOW=Date.UTC(2026,0,5,9,0,0);
let n=0;const id=()=>`regression-${n++}`;

test('the same operations produce the same world on both phones', () => {
  // schedule() used Math.random(), which gave each device a different future.
  const run=()=>{
    n=0;
    let s=fullHouse('same','x'&&NOW);
    s=applyOperation(s,{id:id(),type:'hide',actor:'julia',target:'lamp'},NOW);
    s=applyOperation(s,{id:id(),type:'wear',actor:'julia',target:'julia',item:'cone'},NOW+1000);
    s=applyOperation(s,{id:id(),type:'wear',actor:'david',target:'david',item:'cone'},NOW+2000);
    return s;
  };
  assert.deepEqual(run(),run());
  assert.ok(run().chains.length,'the hidden thing should still be scheduled to turn up');
});

test('a bond is only ever recorded with a resident', () => {
  let s=fullHouse('bond',NOW);
  s=applyOperation(s,{id:id(),type:'toyResult',actor:'julia',toy:'bubbles',room:'house',target:'david'},NOW);
  assert.equal(s.bond.julia.david,undefined,'playing at your person is not a bond with them');
  s=applyOperation(s,{id:id(),type:'toyResult',actor:'julia',toy:'bubbles',room:'house',target:'monki'},NOW+1);
  assert.equal(s.bond.julia.monki,1);
});

test('everything a chapter puts on a head is a hat you then own', () => {
  for(const chapter of ADVENTURES)
    assert.ok(ITEMS[chapter.reward]?.wearable,`${chapter.id} rewards ${chapter.reward}, which is not wearable`);
  // The ice cream Sernik ends up wearing has to be in the inventory too.
  let s=fullHouse('hats',NOW),now=NOW;
  for(let i=0;i<ADVENTURES.length;i++){
    now+=CHAPTER_GAP+1000;
    s=applyOperation(s,{id:id(),type:'visit',actor:'julia'},now);
    const c=adventureFor(s,'julia',now);
    if(!c.ready)continue;
    s=applyOperation(s,{id:id(),type:'adventureComplete',actor:'julia',chapter:c.id,index:c.index},now);
  }
  for(const [who,a] of Object.entries(s.actors))
    if(a.hat)assert.ok(s.inventory.includes(a.hat),`${who} wears ${a.hat} but it is not in the inventory`);
});

test('playing with the toilet paper is how you come to own a roll', () => {
  // Without this the paper-moth discovery could never be set up at all.
  let s=fullHouse('paper',NOW);
  assert.ok(!s.inventory.includes('paper'));
  s=applyOperation(s,{id:id(),type:'toyResult',actor:'julia',toy:'paper',room:'house',target:'sernik'},NOW);
  assert.ok(s.inventory.includes('paper'));
});

test('every discovery that waits for a setup can actually be finished', () => {
  for(const d of DISCOVERIES.filter(d=>d.setup)){
    let s=fullHouse(`setup-${d.id}`,NOW),now=NOW;
    for(let i=0;i<8;i++){
      now+=CHAPTER_GAP+1000;
      s=applyOperation(s,{id:id(),type:'visit',actor:'julia'},now);
      const c=adventureFor(s,'julia',now);
      if(c.ready)s=applyOperation(s,{id:id(),type:'adventureComplete',actor:'julia',chapter:c.id,index:c.index},now);
      const f=s.life.finds.julia;
      if(f)s=applyOperation(s,{id:id(),type:'collectFind',actor:'julia',target:f.id},now);
    }
    s=applyOperation(s,{id:id(),type:'toyResult',actor:'julia',toy:'paper',room:'house',target:'sernik'},now);
    assert.ok(s.unlocked.includes(d.setup.room),`${d.id} needs ${d.setup.room} to be open`);
    assert.ok(s.inventory.includes(d.setup.item),`${d.id} needs her to own a ${d.setup.item}`);
    s=applyOperation(s,{id:id(),type:'place',actor:'julia',item:d.setup.item,room:d.setup.room},now);
    assert.notEqual(s.life.setups[d.id],undefined,`${d.id} did not start waiting`);
    now+=d.setup.days*DAY+3600000;
    s=applyOperation(s,{id:id(),type:'visit',actor:'julia'},now);
    assert.equal(s.life.finds.julia?.discovery,d.id,`${d.id} never turned up`);
  }
});

test('something your person hid can be found again', () => {
  let s=fullHouse('hide',NOW);
  s=applyOperation(s,{id:id(),type:'hide',actor:'julia',target:'lamp'},NOW);
  assert.ok(s.hidden.lamp,'it should be hidden');
  s=applyOperation(s,{id:id(),type:'found',actor:'david',target:'lamp'},NOW+60000);
  assert.equal(s.hidden.lamp,undefined,'finding it clears it');
});

test('an incident never leaves a mark that draws nothing', () => {
  // 'hat' and 'sofa' are visible as state changes; a trace for them was invisible
  // and still used one of the eight slots a room keeps.
  let s=fullHouse('marks',NOW);
  s.incident={...s.incident,aftermath:'hat',reward:'cone',actor:'monki',room:'house',kind:'tap',goal:1};
  const after=applyOperation(s,{id:id(),type:'resolve',actor:'julia',target:s.incident.uid,score:5},NOW);
  assert.ok(!after.traces.some(t=>['hat','sofa'].includes(t.type)));
});

test('a save from an older version still opens and can be played', () => {
  const legacy={version:1,seed:'old',revision:2,created:NOW,updated:NOW,lastVisit:NOW,completed:0,serial:0,
    recent:[],unlocked:['house'],inventory:['cone','ball'],
    actors:Object.fromEntries(['david','julia','monki','sernik','galgan'].map(a=>[a,{x:200,y:250,room:'house',hat:null,mood:'idle',pokes:0}])),
    objects:[{id:'couch',type:'couch',room:'house',x:118,y:181},{id:'old-ball',type:'ball',room:'house',x:150,y:270}],
    traces:[{type:'paper',room:'house',x:1,y:1,at:NOW}],log:[],gifts:[],drawing:[],chaos:{},
    choices:{round:0,picks:{},revealed:[]},secrets:[],fridgeAt:null,incident:null,nextAt:NOW,applied:[],decor:['ball']};
  const opened=prepareWorld(legacy);
  assert.equal(opened.version,3);
  assert.ok(!opened.inventory.includes('ball'));
  assert.ok(opened.life,'an old save gets a mailbox and a collection');
  const played=applyOperation(opened,{id:id(),type:'poke',actor:'david',target:'monki'},NOW+DAY);
  assert.equal(played.actors.monki.pokes,1);
});

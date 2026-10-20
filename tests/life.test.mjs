import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld,prepareWorld,ITEMS} from '../shared/world.js';
import {DAY,plantStage,routines,ageSandbox,FRESH,freshSpot} from '../shared/life.js';
import {PLACE_STORIES,placeStory,weatherFor,WEATHER} from '../shared/places.js';
import {difficultyFor} from '../shared/adventures.js';
import {fullHouse} from './house.mjs';
const now=1900000000000;let serial=0;
const op=(s,type,fields={},actor='david',at=now)=>applyOperation(s,{id:`life-${serial++}`,type,actor,...fields},at);
const world=()=>{const s=fullHouse('life',now);s.unlocked=['house','garden','roof'];s.journeys.david.index=1;return s;};
test('a daft situation lasts a day, is replaced when untouched, and is never owed',()=>{
  let s=op(world(),'visit');const f=s.life.finds.david;assert.ok(f?.fresh);
  // Still the same one a few hours later.
  s=op(s,'visit',{},'david',now+10*3600000);assert.deepEqual(s.life.finds.david,f);
  // Untouched, it is simply over by the next time: one new one, never a pile.
  s=op(s,'visit',{},'david',now+120*DAY);const g=s.life.finds.david;assert.ok(g?.fresh);assert.notEqual(g.fresh,f.fresh);
  s=op(s,'collectFind',{target:g.id},'david',now+120*DAY);assert.equal(s.life.collection.length,1);
  s=op(s,'collectFind',{target:g.id},'david',now+120*DAY);assert.equal(s.life.collection.length,1);
  s=op(s,'visit',{},'david',now+120*DAY);assert.equal(s.life.finds.david,undefined);
  s=op(s,'visit',{},'david',now+121*DAY);assert.ok(s.life.finds.david);
});
test('no daft situation comes round twice for the same person in an autumn',()=>{
  // Every one this house can show (the radio and plant ones wait for a radio and a plant).
  // The sofa stays home here: a day it spends in the garden rightly skips the sofa ones.
  let s=world(),seen=[];const here=f=>!['radio','plant'].includes(f.spot)||s.objects.some(o=>o.type===f.spot&&o.room==='house');
  const possible=FRESH.filter(here).length;
  for(let d=0;d<possible;d++){for(const o of s.objects)o.room='house';s=op(s,'visit',{},'david',now+d*DAY);const f=s.life.finds.david;assert.ok(f?.fresh);seen.push(f.fresh);}
  assert.equal(new Set(seen).size,possible);
});
test('a daft situation is in the house for both of them, not only on its owner\'s phone',()=>{
  let s=world();s.actors.galgan.hat='bow';
  s=op(s,'visit');const f=s.life.finds.david,sit=FRESH.find(x=>x.id===f.fresh);
  assert.equal(s.actors[sit.actor].hat,sit.item);assert.ok(s.inventory.includes(sit.item));
  assert.equal(visibleWorld(s,'julia').actors[sit.actor].hat,sit.item,'her phone downloads the same thing');
  s=op(s,'collectFind',{target:f.id});assert.equal(s.actors[sit.actor].hat,f.was.hat,'the poke gives back what it had on');
});
test('their two situations are never on the same resident',()=>{
  let s=world();s.journeys.julia.index=1;
  for(let d=0;d<40;d++){s=op(s,'visit',{},'david',now+d*DAY);s=op(s,'visit',{},'julia',now+d*DAY+DAY/24);
    const a=s.life.finds.david,b=s.life.finds.julia;if(a?.fresh&&b?.fresh)assert.notEqual(a.actor,b.actor,`day ${d}`);}
});
test('a situation nobody touched gives back what the resident had on',()=>{
  let s=world();s=op(s,'visit');const f=s.life.finds.david,sit=FRESH.find(x=>x.id===f.fresh);
  s=op(s,'visit',{},'david',now+DAY);const g=s.life.finds.david;assert.notEqual(g.fresh,f.fresh);
  if(g.actor!==sit.actor)assert.equal(s.actors[sit.actor].hat,f.was.hat);
});
test('no daft situation names furniture the house does not have yet',()=>{
  // A new house has a sofa, a lamp and a bowl; the radio and the plant arrive later.
  const needs=f=>['radio','plant'].includes(f.spot);
  let s=world();s.objects=s.objects.filter(o=>!['radio','plant'].includes(o.type));
  const seen=[];for(let d=0;d<FRESH.length;d++){s=op(s,'visit',{},'david',now+d*DAY);const f=s.life.finds.david;if(f?.fresh)seen.push(FRESH.find(x=>x.id===f.fresh));}
  assert.ok(seen.length>20);assert.ok(!seen.some(needs),seen.filter(needs).map(f=>f.title).join(', '));
  // A radio somebody bought and put down counts as the radio.
  s=world();s.objects=s.objects.filter(o=>!['radio','plant'].includes(o.type));s.objects.push({id:'furn-x',type:'radio',room:'house',x:300,y:200});
  assert.deepEqual(freshSpot(s,{spot:'radio'}),{x:300,y:178});
});
test('a situation beside moved furniture stays inside the playable room',()=>{
  const s=world();
  for(const type of ['plant','radio'])s.objects.push({id:type,type,room:'house',x:365,y:171});
  for(const object of s.objects){object.x=365;object.y=171;}
  for(const spot of ['couch','bowl','lamp','radio','plant']){
    const p=freshSpot(s,{spot});
    assert.ok(p.x>=35&&p.x<=365&&p.y>=171&&p.y<=314,`${spot}: ${JSON.stringify(p)}`);
  }
});
test('rare visitors require their setup to remain for two days',()=>{
  let s=world();s.inventory.push('paper');s=op(s,'place',{item:'paper',room:'garden'});
  // Keep routine simulation out of this setup test.
  s.lastVisit=now+DAY;s=op(s,'visit',{},'david',now+DAY);assert.notEqual(s.life.finds.david.discovery,'paper-moth');
  s=op(s,'collectFind',{target:s.life.finds.david.id},'david',now+DAY);
  s.lastVisit=now+2*DAY;s=op(s,'visit',{},'david',now+2*DAY);assert.equal(s.life.finds.david.discovery,'paper-moth');
  s=op(s,'sendTo',{target:'placed-paper',room:'house'},'david',now+2*DAY);assert.equal(s.life.setups['paper-moth'],undefined);
});
test('each player owns their pending find; the discovered collection is shared',()=>{
  let s=world();s.journeys.julia.index=1;s=op(s,'visit');s=op(s,'visit',{},'julia');const first=s.life.finds.david.id;
  s=op(s,'collectFind',{target:first},'julia');assert.ok(s.life.finds.david);assert.ok(s.life.finds.julia);
  s=op(s,'collectFind',{target:first});assert.equal(s.life.collection.length,1);assert.equal(s.life.finds.david,undefined);
});
test('seeds grow without care, never expire, and can only be picked once',()=>{
  for(const seed of ['sun','moon','wild']){
    let s=op(world(),'plantSeed',{seed});assert.equal(plantStage(s,now),0);assert.equal(plantStage(s,now+4*DAY),2);
    assert.throws(()=>op(s,'plantSeed',{seed}));assert.throws(()=>op(s,'replant'));
    s=op(s,'pickBloom');assert.equal(s.life.plant.picked,false);
    s=op(s,'pickBloom',{},'julia',now+120*DAY);assert.equal(s.life.plant.picked,true);
    const count=s.log.length;s=op(s,'pickBloom',{},'david',now+121*DAY);assert.equal(s.log.length,count);
    s=op(s,'replant');assert.equal(s.life.plant,null);
  }
});
test('a drawing is a bounded snapshot, not overwritten by the next drawing',()=>{
  let s=op(world(),'draw',{lines:[[[.1,.2],[.5,.4]]]});const id=s.life.mail[0].id;
  s=op(s,'draw',{lines:[[[.2,.3],[.8,.8]]]});assert.deepEqual(s.life.mail[1].lines,[[[.1,.2],[.5,.4]]]);
  assert.throws(()=>op(s,'openLetter',{target:id}));s=op(s,'openLetter',{target:id},'julia');
  assert.equal(s.life.mail[1].opened,true);assert.equal(s.life.mail[0].opened,false);
});
test('recipient reacts once; only the sender can acknowledge it',()=>{
  let s=op(world(),'draw',{lines:[[[0,0],[1,1]]]});const id=s.life.mail[0].id;
  assert.throws(()=>op(s,'reactLetter',{target:id,reaction:'laugh'},'julia'));
  s=op(s,'openLetter',{target:id},'julia');s=op(s,'reactLetter',{target:id,reaction:'laugh'},'julia');
  s=op(s,'reactLetter',{target:id,reaction:'love'},'julia');assert.equal(s.life.mail[0].reaction,'laugh');
  assert.throws(()=>op(s,'readReaction',{target:id},'julia'));s=op(s,'readReaction',{target:id});assert.equal(s.life.mail[0].reactionSeen,true);
});
test('gift envelopes never expose the sealed contents',()=>{
  let s=op(world(),'gift',{item:'potato'});const id=s.gifts[0].id;
  const visible=visibleWorld(s,'julia');assert.equal(visible.gifts[0].item,undefined);assert.equal(visible.life.mail[0].item,undefined);
  s=op(s,'openGift',{target:id},'julia');assert.equal(s.life.mail[0].opened,true);
});
test('postcards freeze outfit and scene; drafts validate and mailbox is bounded',()=>{
  let s=op(world(),'postcard',{portrait:'monki',hat:'bow',pose:'happy',scene:'night',send:true});
  s=op(s,'wear',{target:'monki',item:'cone'});assert.equal(s.life.postcards[0].hat,'bow');assert.equal(s.life.mail[0].hat,'bow');
  assert.throws(()=>op(s,'postcard',{portrait:'nobody',hat:null,pose:'happy',scene:'night'}));
  for(let i=1;i<12;i++)s=op(s,'draw',{lines:[[[0,0],[1,1]]]});
  assert.throws(()=>op(s,'postcard',{portrait:'monki',hat:'bow',pose:'happy',scene:'night',send:true}));assert.equal(s.life.postcards.length,1);
});
test('old saves retain their drawings, gifts and progress through migration',()=>{
  const s=world();delete s.life;s.drawing=[[[0,0],[1,1]]];s.drawingBy='julia';s.drawingAt=now+100;
  const next=prepareWorld(s);assert.ok(next.life);assert.equal(s.life,undefined);assert.equal(next.life.mail.length,1);assert.equal(next.journeys.david.index,1);
});
test('routines do not override a fresh manual move; bonded pets follow only on request',()=>{
  let s=world();s.actors.monki={...s.actors.monki,room:'garden',x:55,y:200,movedAt:now};routines(s,now+1000,23);assert.equal(s.actors.monki.room,'garden');
  s.bond.david.sernik=10;s=op(s,'walkWith',{room:'roof'});assert.equal(s.actors.sernik.room,'roof');
  assert.throws(()=>op(s,'walkWith',{room:'moon'}));
});
test('entering a room does not cover a dog already standing at the doorway',()=>{
  let s=world();s.actors.galgan={...s.actors.galgan,room:'garden',x:260,y:280};
  s=op(s,'walkWith',{room:'garden'},'julia');
  assert.ok(Math.hypot(s.actors.julia.x-260,s.actors.julia.y-280)>=43);
  assert.deepEqual({x:s.actors.galgan.x,y:s.actors.galgan.y},{x:260,y:280});
});
test('all four places rotate three stories and retain a shared, idempotent aftermath',()=>{
  for(const place of Object.keys(PLACE_STORIES)){let s=world();const stories=new Set();for(let i=0;i<7;i++){const c=placeStory(s,place);stories.add(c.id);assert.equal(c.steps.length,3);assert.ok(ITEMS[c.reward]);s=op(s,'placeComplete',{place,round:c.round});assert.ok(s.inventory.includes(c.reward));const again=op(s,'placeComplete',{place,round:c.round});assert.equal(again.life.places[place].count,i+1);}assert.equal(stories.size,3);}
  assert.throws(()=>op(fullHouse('new',now),'placeComplete',{place:'sky',round:0}));
});
test('weather is shared and predictable for a time block, with all five possibilities',()=>{
  const s=world(),kinds=new Set();for(let i=0;i<100;i++){const at=now+i*10800000;const w=weatherFor(s,at);assert.ok(WEATHER.includes(w));assert.equal(w,weatherFor(structuredClone(s),at));kinds.add(w);}assert.equal(kinds.size,5);
  const summer=Date.UTC(2030,6,1),winter=Date.UTC(2030,11,1);
  assert.ok(Array.from({length:160},(_,i)=>weatherFor(s,summer+i*10800000)).every(w=>w!=='snow'));
  assert.ok(Array.from({length:160},(_,i)=>weatherFor(s,winter+i*10800000)).includes('snow'));
});
test('difficulty grows gently and caps instead of becoming an endless grind',()=>{
  assert.equal(difficultyFor({index:0}),0);assert.equal(difficultyFor({index:2}),0);assert.ok(difficultyFor({index:10})>0);assert.ok(difficultyFor({index:10})<difficultyFor({index:30}));assert.equal(difficultyFor({index:140}),1);
});
test('simulated time ages plants, setups and delayed events together',()=>{
  let s=op(world(),'plantSeed',{seed:'wild'});s.life.setups['paper-moth']=now;s.chains=[{kind:'returns',at:now+3*DAY,data:{}}];s.journeys.david.lastAt=now;
  ageSandbox(s,7);assert.equal(plantStage(s,now),3);assert.equal(s.life.setups['paper-moth'],now-7*DAY);assert.equal(s.chains[0].at,now-4*DAY);assert.equal(s.journeys.david.lastAt,now-7*DAY);
});
test('an unopened gift survives newer opened gifts without becoming lost mail',()=>{
  let s=op(world(),'gift',{item:'cone'},'david');const waiting=s.gifts[0].id;
  for(let i=0;i<35;i++){s=op(s,'gift',{item:'bow'},'julia');const id=s.gifts.find(g=>g.from==='julia'&&!g.opened).id;s=op(s,'openGift',{target:id},'david');}
  assert.ok(s.gifts.some(g=>g.id===waiting&&!g.opened));s=op(s,'openGift',{target:waiting},'julia');assert.ok(s.life.mail.find(m=>m.giftId===waiting).opened);
});
test('walking into the garden puts you and your dog in front of the pond and the bed, not in them',()=>{
  // The pond and the growing bed both end above y 300.
  for(const actor of ['david','julia']){let s=world();s.bond[actor].sernik=10;s.actors.sernik.movedAt=0;
    s=op(s,'walkWith',{room:'garden'},actor);
    for(const id of [actor,'sernik']){const a=s.actors[id];assert.equal(a.room,'garden');assert.ok(a.y>=300,`${id} stands at y ${a.y}`);}
  }
});
test('the one in a daily situation stays as staged through time away and a walk',()=>{
  for(let n=0;n<30;n++){
    let s=fullHouse(`staged-${n}`,now);s.unlocked=['house','garden','roof'];s.journeys.david.index=1;
    s=op(s,'visit');const sit=FRESH.find(x=>x.id===s.life.finds.david.fresh),a=s.actors[sit.actor],staged={room:a.room,x:a.x,y:a.y,hat:a.hat};
    s.bond.david[sit.actor]=30;
    s=op(s,'walkWith',{room:'garden'},'david',now+3600000);
    s=op(s,'visit',{},'julia',now+3*3600000);
    const b=s.actors[sit.actor];assert.deepEqual({room:b.room,x:b.x,y:b.y,hat:b.hat},staged,`world ${n}: ${sit.id}`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,prepareWorld,atTheDoor,present,residentsHere,ARRIVALS,RESIDENTS,AWAY,journeyIndex} from '../shared/world.js';
import {adventureFor,CHAPTER_GAP} from '../shared/adventures.js';
import {advanceLife,routines,FRESH} from '../shared/life.js';
import {placeStory} from '../shared/places.js';
import {fullHouse} from './house.mjs';

const NOW=Date.parse('2026-10-01T09:00:00Z');
let n=0;
const op=(s,type,fields={},actor='david',at=NOW)=>applyOperation(s,{type,actor,id:`arrive-${++n}`,...fields},at);
/** Finishes the next scheduled adventure, a day after the last one. */
function adventure(s,actor='david'){
  const at=Math.max(NOW,(s.journeys.david.lastAt||0)+CHAPTER_GAP),c=adventureFor(s,actor,at);
  assert.ok(c.ready,`adventure ${c.index} is ready`);
  return op(s,'adventureComplete',{chapter:c.id,index:c.index},actor,at);
}

test('a new house starts with Monki; the others knock one at a time as the adventures go on',()=>{
  let s=createWorld('arrivals',NOW);
  assert.deepEqual(residentsHere(s),['monki']);
  assert.deepEqual(present(s),['david','julia','monki']);
  for(const id of ['sernik','galgan','kot'])assert.equal(s.actors[id].room,AWAY,`${id} is not in any room yet`);
  assert.equal(atTheDoor(s),null,'nobody knocks on the first day');
  s=adventure(s);
  assert.equal(atTheDoor(s),'galgan','Galgan knocks after the first adventure, the day before his own');
  assert.equal(adventureFor(s,'david').actor,'galgan');
  s=op(s,'welcome',{target:'galgan'},'julia');
  assert.deepEqual(residentsHere(s),['monki','galgan']);
  assert.equal(s.actors.galgan.room,'house');
  assert.equal(s.log[0].action,'arrive');assert.equal(s.log[0].who,'julia');assert.equal(s.log[0].target,'galgan');
  // David's phone opens the same door a moment later: nothing happens twice.
  const again=op(s,'welcome',{target:'galgan'});
  assert.deepEqual(residentsHere(again),['monki','galgan']);assert.equal(again.log.filter(e=>e.action==='arrive').length,1);
  assert.equal(atTheDoor(s),null);
  s=adventure(s);assert.equal(atTheDoor(s),'sernik');s=op(s,'welcome',{target:'sernik'});
  s=adventure(s);assert.equal(atTheDoor(s),null,'nobody new after the third');
  s=adventure(s);assert.equal(atTheDoor(s),'kot','Kot knocks after the fourth');
  assert.throws(()=>op(s,'welcome',{target:'sernik'})&&op(s,'poke',{target:'kot'}),/does not live here yet/);
  s=op(s,'welcome',{target:'kot'});
  assert.deepEqual(residentsHere(s),RESIDENTS);
  assert.equal(atTheDoor(s),null);
});

test('several due at once come in one at a time, in order',()=>{
  let s=createWorld('unopened',NOW);
  // As far as the fifth adventure with nobody let in (played on a phone that never showed the door).
  s.journeys.david.index=s.journeys.julia.index=5;
  assert.equal(journeyIndex(s),5);
  const order=[];
  while(atTheDoor(s)){const id=atTheDoor(s);order.push(id);s=op(s,'welcome',{target:id});}
  assert.deepEqual(order,['galgan','sernik','kot']);
});

test('a story about someone still at the door lets them in as it finishes',()=>{
  let s=createWorld('story-door',NOW);
  s=adventure(s);
  assert.equal(atTheDoor(s),'galgan');
  s=adventure(s);// the boat, with Galgan never let in
  assert.ok(residentsHere(s).includes('galgan'));assert.equal(s.actors.galgan.hat,'duck');
});

test('nobody who has not moved in can be poked, moved, dressed, petted, played with or invited',()=>{
  const s=createWorld('absent',NOW);
  for(const [type,fields] of [['poke',{target:'sernik'}],['move',{target:'galgan',x:200,y:250,room:'house'}],['wear',{target:'kot',item:'bow'}],['pet',{target:'galgan'}],['stick',{target:'sernik',item:'bow'}],['toy',{toy:'paper'}],['postcard',{portrait:'kot',hat:null,scene:'house',pose:'idle',send:false}],['inviteAdventure',{chapter:'laundry'}]])
    assert.throws(()=>op(s,type,fields),/does not live here yet|Invalid postcard/,type);
  // A present goes on someone who lives here.
  let g=op(s,'gift',{item:'bow'},'julia');
  g=op(g,'openGift',{target:g.gifts[0].id,wearer:'galgan'});
  assert.equal(g.gifts[0].wornBy,'monki');
});

test('an existing house keeps everyone, and Kot knocks after its next adventure',()=>{
  const old=fullHouse('legacy',NOW);
  delete old.cast;delete old.arrivals;delete old.actors.kot;
  for(let i=0;i<7;i++){old.journeys.david.index=7;old.journeys.julia.index=7;}
  old.journeys.david.lastAt=old.journeys.julia.lastAt=NOW-CHAPTER_GAP;
  old.actors.sernik.hat='crown';
  let s=prepareWorld(old);
  assert.deepEqual(residentsHere(s),['monki','sernik','galgan']);
  assert.equal(s.actors.sernik.hat,'crown','nobody loses what they had on');
  assert.equal(s.actors.kot.room,AWAY);
  assert.equal(atTheDoor(s),null,'not straight away');
  s=adventure(s);
  assert.equal(atTheDoor(s),'kot');
  s=op(s,'welcome',{target:'kot'});
  assert.deepEqual(residentsHere(s),RESIDENTS);
  assert.equal(s.actors.kot.room,'house');
});

test('daily situations, routines, behaviour and garden stories leave out whoever has not moved in',()=>{
  let s=createWorld('only-some',NOW);
  s=adventure(s);s=op(s,'welcome',{target:'galgan'});
  s.unlocked.push('garden');
  for(let day=0;day<60;day++){
    const at=NOW+day*86400000;
    for(const who of ['david','julia']){advanceLife(s,who,at);const f=s.life.finds[who];if(f?.fresh){assert.ok(['monki','galgan'].includes(f.actor),`${f.fresh} is about someone who lives here`);s=op(s,'collectFind',{target:f.id},who,at+1000);}}
    routines(s,at+3600000*(day%24),day%24,{});
    s=op(s,'visit',{hour:day%24},'david',at+5*3600000);
    for(const id of ['sernik','kot'])assert.equal(s.actors[id].room,AWAY,`${id} stays away on day ${day}`);
  }
  for(const place of ['pool','farm','hut'])for(let round=0;round<3;round++){
    s.life.places[place]={count:round};assert.ok(['monki','galgan','david','julia'].includes(placeStory(s,place).actor),`${place} ${round}`);
  }
  assert.ok(FRESH.some(f=>f.actor==='kot'),'Kot has situations of its own once moved in');
});

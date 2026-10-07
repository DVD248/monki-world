// Found in the 27 Sep 2026 bug sweep: what an opened present, a fetch and a tidy leave in the world.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld,prepareWorld,RESIDENTS} from '../shared/world.js';
import {fullHouse} from './house.mjs';

const NOW=Date.UTC(2026,8,27,18,0,0);
let n=0;const op=(s,type,fields={},actor='david',at=NOW)=>applyOperation(s,{id:`presents-${n++}`,type,actor,...fields},at);
const floor=s=>s.objects.filter(o=>o.id.startsWith('gift-')).map(o=>o.type);

test('a present opened onto a dog is on the dog, not also on the floor', () => {
  let s=op(fullHouse('present-worn',NOW),'gift',{item:'bow'});
  s=op(s,'openGift',{target:s.gifts[0].id,wearer:'galgan'},'julia');
  assert.equal(s.actors.galgan.hat,'bow');
  assert.equal(s.gifts[0].wornBy,'galgan');
  assert.deepEqual(floor(s),[],'one present stays one present');
  // His news says who has it, as the separate wear used to.
  assert.ok(s.log.some(l=>l.action==='wear'&&l.who==='julia'&&l.target==='galgan'&&l.item==='bow'));
  assert.ok(s.log.some(l=>l.action==='open'&&l.who==='julia'));
});

test('the dog in today\'s situation is passed over for the present', () => {
  let s=fullHouse('present-busy',NOW);
  s.life.finds.david={id:'find-x',fresh:'g-teacup',actor:'galgan',at:NOW,was:{hat:null}};
  s=op(s,'gift',{item:'bow'});
  s=op(s,'openGift',{target:s.gifts[0].id,wearer:'galgan'},'julia');
  assert.notEqual(s.gifts[0].wornBy,'galgan');
  assert.ok(RESIDENTS.includes(s.gifts[0].wornBy));
  assert.equal(s.actors[s.gifts[0].wornBy].hat,'bow');
});

test('something not to wear, or a present opened in the mailbox, is put down in the room', () => {
  let s=fullHouse('present-floor',NOW);
  s.inventory.push('key');
  s=op(s,'gift',{item:'key'});
  s=op(s,'openGift',{target:s.gifts[0].id,wearer:'galgan'},'julia');
  assert.equal(s.gifts[0].wornBy,undefined);
  assert.deepEqual(floor(s),['key']);
  s=op(s,'gift',{item:'flower'});
  s=op(s,'openGift',{target:s.gifts.find(g=>!g.opened).id},'julia');
  assert.deepEqual(floor(s).sort(),['flower','key']);
});

test('the recipient\'s sealed copy opens without guessing what is inside', () => {
  let s=op(fullHouse('present-sealed',NOW),'gift',{item:'bow'});
  const sealed=op(visibleWorld(s,'julia'),'openGift',{target:s.gifts[0].id,wearer:'galgan'},'julia');
  assert.equal(sealed.actors.galgan.hat,null);assert.deepEqual(floor(sealed),[]);
});

test('Sernik goes back to his own spot after fetching, on both phones', () => {
  let s=fullHouse('fetch',NOW);
  const before={...s.actors.sernik};
  s=op(s,'toyResult',{toy:'paper',target:'sernik',room:'house'});
  assert.deepEqual([s.actors.sernik.x,s.actors.sernik.y,s.actors.sernik.room],[before.x,before.y,before.room]);
  assert.equal(s.actors.sernik.mood,'happy');assert.equal(s.bond.david.sernik,1);
  // A visitor from the garden is not pulled into the house either.
  s.unlocked.push('garden');s.actors.sernik.room='garden';
  s=op(s,'toyResult',{toy:'paper',target:'sernik',room:'house'});
  assert.equal(s.actors.sernik.room,'garden');
});

test('tidying one room leaves the others as they are', () => {
  let s=fullHouse('tidy-room',NOW);s.unlocked.push('garden');
  // Paper left in the garden for the moth, a potato on the house floor, the sofa dragged outside.
  s=op(s,'place',{item:'potato',room:'house'});
  s.inventory.push('paper');s=op(s,'place',{item:'paper',room:'garden'});
  s=op(s,'move',{target:'couch',x:250,y:280,room:'garden'});
  s.traces.push({type:'hole',room:'garden',x:100,y:250,at:NOW},{type:'crumbs',room:'house',x:100,y:250,at:NOW});
  s=op(s,'tidy',{room:'house'});
  assert.ok(!s.objects.some(o=>o.id==='placed-potato'),'the house is tidied');
  assert.ok(s.objects.some(o=>o.id==='placed-paper'&&o.room==='garden'),'the garden is not');
  assert.ok(s.life.setups['paper-moth']!==undefined,'the moth is still coming');
  const couch=s.objects.find(o=>o.id==='couch');assert.deepEqual([couch.room,couch.x,couch.y],['house',118,181],'the sofa comes home to the room it belongs in');
  assert.deepEqual(s.traces.map(t=>t.room),['garden']);
  assert.throws(()=>op(s,'tidy',{room:'roof'}));
  // Without a room (an older phone), everything is tidied as before.
  s=op(s,'tidy');assert.ok(!s.objects.some(o=>o.id==='placed-paper'));assert.equal(s.traces.length,0);
});

test('every log entry has its own id, even with the log full and two entries from one operation', () => {
  let s=fullHouse('log-ids',NOW);
  for(let i=0;i<60;i++)s=op(s,'poke',{target:'monki'},'julia',NOW+i*1000);
  s=op(s,'gift',{item:'bow'},'david',NOW+70000);
  s=op(s,'openGift',{target:s.gifts[0].id,wearer:'galgan'},'julia',NOW+80000);
  const ids=s.log.map(e=>e.id);assert.equal(new Set(ids).size,ids.length);
  // "Ha!" lands on the entry it was meant for.
  const wear=s.log.find(e=>e.action==='wear'&&e.who==='julia');
  s=op(s,'answer',{target:wear.id,line:'x'},'david',NOW+90000);
  assert.ok(s.log.find(e=>e.id===wear.id).answered);assert.ok(!s.log.find(e=>e.action==='open'&&e.who==='julia').answered);
});

test('an old save gets every decorating surface and keeps what someone is wearing', () => {
  const old=fullHouse('old-decor',NOW);
  delete old.catalog.styles.house.trim;delete old.catalog.styles.house.view;delete old.catalog.styles.garden.backdrop;
  old.actors.sernik.hat='icecream';old.inventory=old.inventory.filter(i=>i!=='icecream');
  old.actors.monki.hat='retired-hat';
  const s=prepareWorld(old);
  assert.equal(s.catalog.styles.house.trim,'natural');assert.equal(s.catalog.styles.house.view,'hills');assert.equal(s.catalog.styles.garden.backdrop,'hills');
  assert.ok(s.inventory.includes('icecream'),'the ice cream Sernik has on is one of your things');
  assert.equal(s.actors.monki.hat,null,'a hat the game no longer knows comes off');
  // So a postcard of him in it is not refused.
  assert.doesNotThrow(()=>op(s,'postcard',{portrait:'sernik',hat:'icecream',scene:'house',pose:'happy',send:false}));
});

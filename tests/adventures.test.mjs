import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld} from '../shared/world.js';
import {ADVENTURES,adventureFor,CHAPTER_GAP} from '../shared/adventures.js';
let n=0;
const now=1900000000000;
const op=(s,type,fields={},actor='david',at=now)=>applyOperation(s,{id:`adventure-test-${n++}`,type,actor,...fields},at);

test('all six stories have visible goals and a cause, action and aftermath',()=>{
  const gestures=new Set();
  for(const c of ADVENTURES){assert.equal(c.steps.length,3);assert.ok(c.title&&c.ending&&c.detail);for(const s of c.steps){assert.ok(s.title&&s.hint&&s.goal>0);gestures.add(s.kind);}}
  assert.equal(gestures.size,8);
});
test('each player has their own adventures; objects and moments are shared',()=>{
  let s=createWorld('stories',now);
  // One a day, so the six chapters take six days rather than one sitting.
  for(let i=0;i<6;i++){
    const day=now+i*CHAPTER_GAP,c=adventureFor(s,'david',day);
    assert.ok(c.ready,`chapter ${i} should be ready on day ${i}`);
    s=op(s,'adventureComplete',{chapter:c.id,index:c.index},'david',day);
    assert.equal(s.journeys.david.index,i+1);assert.ok(s.inventory.includes(c.reward));assert.ok(s.decor.includes(c.souvenir));
    // Trying again the same day does nothing at all.
    const sameDay=op(s,'adventureComplete',{chapter:adventureFor(s,'david',day).id,index:i+1},'david',day);
    assert.equal(sameDay.journeys.david.index,i+1);
  }
  // After the last one there is no seventh chapter and it does not loop round.
  assert.ok(adventureFor(s,'david',now+99*CHAPTER_GAP).done);
  assert.equal(s.journeys.julia.index,0);assert.equal(s.moments.length,6);assert.ok(s.unlocked.includes('roof'));
  s=op(s,'adventureComplete',{chapter:'up',index:0},'julia');assert.equal(s.moments.length,7);assert.equal(s.decor.filter(i=>i==='ball').length,1);
  assert.equal(visibleWorld(s,'julia').moments[0].who,'julia');
});
test('stale completions cannot advance the story twice; unknown chapters are rejected',()=>{
  let s=createWorld('retry',now);const operation={id:'complete-one',type:'adventureComplete',actor:'david',chapter:'up',index:0};
  s=applyOperation(s,operation,now);assert.equal(applyOperation(s,operation,now),s);
  s=op(s,'adventureComplete',{chapter:'up',index:0});assert.equal(s.journeys.david.index,1);assert.equal(s.moments.length,1);
  assert.throws(()=>op(s,'adventureComplete',{chapter:'wrong',index:1}));
});
test('old generated clutter is archived without losing placed items or drawings',()=>{
  const s=createWorld('old',now);s.version=2;s.objects.push({id:'many-old',type:'potato',x:80,y:200,room:'house'},{id:'mine',type:'flower',x:90,y:260,room:'house'});s.traces.push({type:'tower',room:'house',x:200,y:220});s.chains.push({kind:'multiply',at:now+10,data:{item:'potato'}});s.drawing=[[[.1,.2],[.5,.4]]];s.actors.monki.hat='bow';
  const next=visibleWorld(s,'david');assert.equal(s.version,2);assert.equal(next.version,3);assert.ok(next.storedObjects.some(o=>o.id==='many-old'));assert.ok(next.objects.some(o=>o.id==='mine'));assert.ok(!next.objects.some(o=>o.id==='many-old'));assert.equal(next.chains.length,0);assert.equal(next.actors.monki.hat,'bow');assert.deepEqual(next.drawing,s.drawing);
});
test('toys and tidying leave useful shared evidence, without losing furniture',()=>{
  let s=createWorld('play',now);s=op(s,'toy',{toy:'paper'});assert.equal(s.log[0].item,'paper');assert.equal(s.actors.sernik.mood,'happy');assert.throws(()=>op(s,'toy',{toy:'bad'}));
  // Saves written before the ball became toilet paper still work.
  const legacy=op(createWorld('legacy',now),'toy',{toy:'ball'});assert.equal(legacy.log[0].item,'paper');
  // Playing with someone is a way of bonding with them, like petting is.
  assert.equal(s.bond.david.sernik,1);
  s=op(s,'place',{item:'potato',room:'house'});s=op(s,'tidy');assert.ok(s.objects.every(o=>o.type!=='potato'));assert.ok(s.storedObjects.some(o=>o.type==='potato'));assert.ok(s.objects.some(o=>o.id==='couch'));assert.ok(s.inventory.includes('potato'));
});
test('opening a gift no longer schedules multiplication',()=>{
  let s=op(createWorld('gifts',now),'gift',{item:'potato'});s=op(s,'openGift',{target:s.gifts[0].id},'julia');assert.ok(!s.chains.some(c=>c.kind==='multiply'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,visibleWorld} from '../shared/world.js';
import {ADVENTURES,adventureFor,featuredStepFor,CHAPTER_GAP,TOTAL_EPISODES,VARIATIONS} from '../shared/adventures.js';
let n=0;
const now=1900000000000;
const op=(s,type,fields={},actor='david',at=now)=>applyOperation(s,{id:`adventure-test-${n++}`,type,actor,...fields},at);

test('24 stories have visible goals across 14 mechanics',()=>{
  const gestures=new Set();
  for(const c of ADVENTURES){assert.equal(c.steps.length,3);assert.ok(c.title&&c.ending&&c.detail);for(const s of c.steps){assert.ok(s.title&&s.hint&&s.goal>0);gestures.add(s.kind);}}
  assert.equal(gestures.size,14);assert.equal(ADVENTURES.length,24);assert.equal(TOTAL_EPISODES,144);
});
test('the featured interaction is a playable action, not a dressing chore',()=>{
  for(const chapter of ADVENTURES){const step=chapter.steps[featuredStepFor(chapter)];assert.ok(step);assert.notEqual(step.kind,'dress',chapter.id);}
});
test('a finished adventure advances the shared world for both players',()=>{
  let s=createWorld('stories',now);
  // One a day, so the six chapters take six days rather than one sitting.
  for(let i=0;i<6;i++){
    const day=now+i*CHAPTER_GAP,c=adventureFor(s,'david',day);
    assert.ok(c.ready,`chapter ${i} should be ready on day ${i}`);
    s=op(s,'adventureComplete',{chapter:c.id,index:c.index},'david',day);
    assert.equal(s.journeys.david.index,i+1);assert.equal(s.journeys.julia.index,i+1);assert.ok(s.inventory.includes(c.reward));assert.ok(s.decor.includes(c.souvenir));
    // Trying again the same day does nothing at all.
    const sameDay=op(s,'adventureComplete',{chapter:adventureFor(s,'david',day).id,index:i+1},'david',day);
    assert.equal(sameDay.journeys.david.index,i+1);
  }
  assert.equal(adventureFor(s,'david',now+99*CHAPTER_GAP).id,'paper-parade');
  assert.equal(adventureFor(s,'julia',now+99*CHAPTER_GAP).id,'paper-parade');
  assert.equal(s.moments.length,6);assert.ok(s.unlocked.includes('roof'));
  s=op(s,'adventureComplete',{chapter:'up',index:0},'julia');assert.equal(s.moments.length,6);
  assert.equal(s.decor.filter(i=>i==='ball').length,0);
  assert.equal(visibleWorld(s,'julia').moments[0].who,'david');
});
test('older two-counter saves keep the furthest chapter and both seats agree',()=>{
  const old=createWorld('old-journeys',now);
  old.journeys.david={index:4,lastAt:now};old.journeys.julia={index:2,lastAt:now-CHAPTER_GAP};
  const restored=visibleWorld(old,'julia');
  assert.equal(restored.journeys.david.index,4);
  assert.equal(restored.journeys.julia.index,4);
  assert.equal(adventureFor(restored,'julia',now+CHAPTER_GAP).index,4);
  assert.equal(adventureFor(restored,'david',now+CHAPTER_GAP).id,adventureFor(restored,'julia',now+CHAPTER_GAP).id);
});
test('the full season has six explained variations and a finite, honest ending',()=>{
  let s=createWorld('season',now);const seen=new Set();
  for(let i=0;i<TOTAL_EPISODES;i++){const at=now+i*CHAPTER_GAP,c=adventureFor(s,'david',at);assert.ok(c.ready);assert.ok(Number.isFinite(c.edition));seen.add(c.variant);s=op(s,'adventureComplete',{chapter:c.id,index:c.index},'david',at);}
  assert.deepEqual([...seen],VARIATIONS);assert.equal(s.moments.length,144);assert.ok(adventureFor(s,'david',now+200*CHAPTER_GAP).done);
});
test('partner invitations survive offline completions and never skip the opening',()=>{
  let s=op(createWorld('invites',now),'inviteAdventure',{chapter:'pizza'},'julia');assert.equal(adventureFor(s,'david',now).id,'up');
  s=op(s,'adventureComplete',{chapter:'up',index:0});assert.equal(adventureFor(s,'david',now+CHAPTER_GAP).id,'pizza');
  s=op(s,'inviteAdventure',{chapter:'snow'},'julia');
  s=op(s,'adventureComplete',{chapter:'pizza',index:1},'david',now+CHAPTER_GAP);assert.equal(s.journeys.david.index,2);assert.equal(s.adventureInvites.david.chapter,'snow');
  s=op(s,'adventureComplete',{chapter:'snow',index:2},'david',now+CHAPTER_GAP*2);assert.equal(s.adventureInvites.david,undefined);
});
test('toilet paper and bubble discoveries are bounded shared aftermath',()=>{
  let s=createWorld('toy-results',now);for(const target of ['david','julia','monki','sernik','galgan'])s=op(s,'toyResult',{toy:'bubbles',target,room:'house'});
  assert.ok(s.inventory.includes('star'));assert.equal(s.toyDiscoveries.bubbles.length,5);assert.equal(s.traces.filter(t=>t.type==='soap').length,1);
  s=op(s,'toyResult',{toy:'paper',target:'sernik',room:'house'});assert.ok(!s.traces.some(t=>t.type==='paper'));assert.equal(s.bond.david.sernik,2);assert.throws(()=>op(s,'toyResult',{toy:'bad',room:'house'}));
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

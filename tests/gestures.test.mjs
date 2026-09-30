import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
// Match the server's /shared routing without editing source imports or relying
// on a stale dist build. Every file in this fixture is a disposable copy.
const dir=await mkdtemp(join(tmpdir(),'monki-gestures-'));
after(()=>rm(dir,{recursive:true,force:true}));
await cp(new URL('../public/',import.meta.url),dir,{recursive:true});
await cp(new URL('../shared/',import.meta.url),join(dir,'shared'),{recursive:true});
await cp(new URL('../package.json',import.meta.url),join(dir,'package.json'));
const {Scene}=await import(pathToFileURL(join(dir,'scene.js')));
const {RoomToys,BUBBLE_RADIUS,MAX_BUBBLE_RADIUS,bubbleSize}=await import(pathToFileURL(join(dir,'room-toys.js')));
const {Tidying}=await import(pathToFileURL(join(dir,'tidying.js')));
const {createWorld,prepareWorld,applyOperation}=await import(pathToFileURL(join(dir,'shared/world.js')));

function fixture(id='sernik'){
  const calls=[],scene=Object.create(Scene.prototype);
  scene.animations={};
  Object.assign(scene,{canvas:{width:400,height:400,setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:400,height:400})},ox:0,oy:0,state:{actors:{[id]:{x:100,y:250}},objects:[]},hitboxes:[{id,x:69,y:208,w:62,h:46,movable:true}],petEffects:{},room:'house',moving:null,callbacks:{onPet:id=>calls.push(['pet',id]),onMove:p=>calls.push(['move',p]),onTap:id=>calls.push(['tap',id]),onHold:id=>calls.push(['hold',id])}});
  const event=(x,y=230)=>({clientX:x,clientY:y,button:0,pointerId:1,preventDefault(){}});
  return {scene,calls,event};
}

test('room strokes pet both dogs without moving or opening their options',()=>{
  for(const id of ['sernik','galgan']){
    const {scene,calls,event}=fixture(id);scene.pointerDown(event(100));
    for(let i=0;i<5;i++){scene.pointerMove(event(119));scene.pointerMove(event(100));}
    assert.equal(scene.moving,null);assert.equal(scene.petEffects[id].power,1);
    assert.deepEqual(calls,[],'Do not save a pet before intent is settled');
    scene.pointerUp(event(100));assert.deepEqual(calls,[['pet',id]]);
  }
});
test('pulling away can turn any provisional stroke into a drag, independent of speed',()=>{
  for(const elapsed of [0,100,500,2000]){
    const {scene,calls,event}=fixture();scene.pointerDown(event(100));scene.down.time-=elapsed;
    scene.pointerMove(event(115));assert.equal(scene.down.petting,true);
    scene.pointerMove(event(138));assert.equal(scene.down.petting,false);
    scene.pointerMove(event(180,260));scene.pointerUp(event(180,260));
    assert.deepEqual(calls,[['move',{id:'sernik',x:180,y:280}]]);assert.equal(scene.petEffects.sernik,undefined);
  }
});
test('a stroke across the whole body is still petting, not distance from the starting finger',()=>{
  const {scene,calls,event}=fixture();scene.pointerDown(event(74));
  for(let i=0;i<3;i++){scene.pointerMove(event(126));scene.pointerMove(event(74));}
  assert.equal(scene.moving,null);scene.pointerUp(event(74));assert.deepEqual(calls,[['pet','sernik']]);
});
test('once picked up, dogs can be set down nearby without becoming petting again',()=>{
  const {scene,calls,event}=fixture();scene.pointerDown(event(110));scene.pointerMove(event(165));scene.pointerMove(event(120));scene.pointerUp(event(120));
  assert.deepEqual(calls,[['move',{id:'sernik',x:110,y:250}]],'Keep the original grab offset');
});
test('a tap still pokes, a stationary hold opens options, and other residents drag immediately',()=>{
  const tap=fixture();tap.scene.pointerDown(tap.event(100));tap.scene.pointerUp(tap.event(100));assert.deepEqual(tap.calls,[['tap','sernik']]);
  const hold=fixture();hold.scene.pointerDown(hold.event(100));hold.scene.down.time-=600;hold.scene.pointerUp(hold.event(100));assert.deepEqual(hold.calls,[['hold','sernik']]);
  const other=fixture('monki');other.scene.pointerDown(other.event(100));other.scene.pointerMove(other.event(110));other.scene.pointerUp(other.event(110));assert.equal(other.calls[0][0],'move');
});
test('tap bubbles stay small and pop on residents; only enclosing bubbles capture them',()=>{
  const actors=Object.fromEntries(['david','julia','monki','galgan'].map(id=>[id,{room:'garden',x:0,y:0}]));actors.sernik={room:'house',x:200,y:287};
  const scene={room:'house',override:{},callbacks:{},react(){},state:{actors}};
  const toys=new RoomToys(scene);for(let i=0;i<30;i++)toys.blow();
  assert.equal(toys.bubbles.length,18);assert.ok(toys.bubbles.every(b=>b.r===BUBBLE_RADIUS));
  assert.ok(new Set(toys.bubbles.map(b=>b.vx)).size>1);
  toys.start('bubbles');toys.bubbles=[{x:200,y:263,r:12,vx:0,vy:0,age:1,actor:null}];toys.update(100);
  assert.equal(toys.bubbles.length,0);assert.deepEqual(scene.override,{});
  toys.bubbles=[{x:200,y:263,r:MAX_BUBBLE_RADIUS,vx:0,vy:0,age:1,actor:null}];toys.update(116);
  assert.equal(toys.bubbles[0].actor,'sernik');assert.equal(toys.bubbles[0].r,MAX_BUBBLE_RADIUS);
  toys.update(132);assert.ok(scene.override.sernik);toys.clear();assert.deepEqual(scene.override,{});
});
test('a bubble leaves the wand with a brief puff and then floats, rather than flying like a dart',()=>{
  const state=createWorld('bubble-motion');for(const actor of Object.values(state.actors))actor.room='garden';
  const toys=new RoomToys({room:'house',sy:1,override:{},callbacks:{},state});
  toys.start('bubbles');toys.placeWand({x:200,y:270});
  toys.blow({dx:0,dy:-1,r:12,strength:0});const small=toys.bubbles.at(-1),smallStart=small.y;
  assert.ok(small.vy<0);assert.ok(Math.abs(small.vx)<1);
  toys.blow({dx:80,dy:-80,r:48,strength:120});const large=toys.bubbles.at(-1);
  assert.ok(large.vx>small.vx+20);assert.ok(large.r>small.r);
  toys.update(100);for(let time=116;time<2200;time+=16)toys.update(time);
  assert.ok(small.y<smallStart-10);assert.ok(Math.abs(small.x-200)<25);
  assert.ok(Math.abs(large.vx)<75,'The launch impulse should dissipate');
});
test('a quick wand flick launches farther than a slow pull to the same point',()=>{
  const toys=new RoomToys({room:'house',sy:2,override:{},callbacks:{},state:createWorld('bubble-flick')});
  toys.start('bubbles');toys.placeWand({x:200,y:260});
  const start={x:200,y:252},end={x:280,y:202};
  toys.input('down',start,1000);toys.input('move',end,1080);toys.input('up',end,1090);const quick=toys.bubbles.at(-1);
  toys.input('down',start,2000);toys.input('move',end,3900);toys.input('up',end,4000);const slow=toys.bubbles.at(-1);
  assert.equal(quick.r,slow.r);assert.ok(quick.vx>slow.vx+5,`${quick.vx} vs ${slow.vx}`);
});
test('the placed wand stays put; taps blow small, aiming grows bubbles, cancellation restores it',()=>{
  const toys=new RoomToys({room:'house',sy:2,override:{},callbacks:{},state:createWorld('placed-wand')});
  toys.start('bubbles');toys.beginAim({x:200,y:289});toys.input('up',{x:90,y:265});
  assert.deepEqual(toys.wand,{x:90,y:265});assert.equal(toys.bubbles.length,0);
  toys.input('down',{x:90,y:259});toys.input('up',{x:90,y:259});assert.equal(toys.bubbles[0].r,12);
  toys.input('down',{x:90,y:259});toys.input('move',{x:90,y:180});toys.input('up',{x:90,y:180});
  assert.ok(toys.bubbles[1].r>45);assert.deepEqual(toys.wand,{x:90,y:265});
  assert.equal(bubbleSize(0),12);assert.equal(bubbleSize(999),52);assert.ok(bubbleSize(40)<bubbleSize(80));
  toys.beginAim({x:120,y:220});assert.equal(toys.wand,null);toys.cancelAim();assert.deepEqual(toys.wand,{x:90,y:265});
});
test('an automatic chain pop cannot strand the next resident in a dead bubble',()=>{
  const scene={room:'house',override:{},callbacks:{},react(){},state:createWorld('bubble-chain')},toys=new RoomToys(scene);
  toys.start('bubbles');toys.bubbles=[{x:100,y:200,r:27,age:14.1,actor:'julia'},{x:109,y:204,r:27,age:1,actor:'david'}];
  toys.own('julia',{x:100,y:216,room:'house'});toys.own('david',{x:109,y:220,room:'house'});
  toys.last=100;toys.update(116);
  assert.equal(toys.bubbles.length,0);assert.equal(toys.owned.size,0);assert.deepEqual(scene.override,{});
});
test('clearing toys cannot erase an override belonging to a newer animation',()=>{
  const scene={room:'house',override:{},callbacks:{},state:createWorld('bubble-owner')},toys=new RoomToys(scene);
  toys.own('julia',{x:1,y:2,room:'house'});const newer={x:70,y:200,room:'house'};scene.override.julia=newer;toys.clear();
  assert.equal(scene.override.julia,newer);
});
test('fetch waits for landing and physical arrival, then returns the roll and its guest dog',()=>{
  const state=createWorld('fetch-guest');state.actors.sernik.room='garden';
  let results=0,returned=false;
  const scene={room:'house',ox:80,override:{},callbacks:{onToyResult(){results++;},onToyDock(mode,away){if(mode==='paper'&&!away)returned=true;}},state},toys=new RoomToys(scene);
  toys.start('paper');toys.beginAim(toys.origin,0);toys.input('move',{x:80,y:220},300);toys.input('up',{x:80,y:220},420);
  const shot=toys.shots[0];assert.ok(shot.dogFrom.x>480);
  let picked=false,departing=false;for(let t=100;t<15100&&toys.shots.length;t+=16){toys.update(t);
    if(shot.carried&&!picked){picked=true;assert.equal(shot.motion,'rest');assert.equal(shot.z,0);assert.ok(Math.hypot(shot.fetch.x-shot.gx,shot.fetch.y-shot.gy)<30);}
    if(!picked)assert.equal(results,0);
    if(shot.done&&scene.override.sernik?.x>480)departing=true;
  }
  assert.ok(picked&&departing&&returned);assert.equal(results,1);assert.equal(toys.shots.length,0);assert.equal(scene.override.sernik,undefined);assert.equal(state.actors.sernik.room,'garden');
});
test('a fetch can be put away during flight, pickup, return or the walk home',()=>{
  for(const phase of ['chase','pickup','return','home']){
    const state=createWorld('fetch-interruption'),scene={room:'house',override:{},callbacks:{},state},toys=new RoomToys(scene);
    toys.start('paper');toys.beginAim(toys.origin,0);toys.input('move',{x:100,y:250},100);toys.input('up',{x:80,y:240},120);
    let found=false;for(let t=100;t<15100&&toys.shots.length;t+=16){toys.update(t);if(toys.shots[0]?.fetch.phase===phase){found=true;break;}}
    assert.ok(found,phase);toys.clear();assert.equal(toys.shots.length,0);assert.equal(scene.override.sernik,undefined);
  }
});
test('cleanup helpers return to their saved room and spot; guests walk fully out before release',()=>{
  const before=createWorld('cleanup-guests');before.actors.monki.room='roof';before.actors.galgan.room='garden';
  const after=applyOperation(before,{id:'tidy-guests',actor:'david',type:'tidy'});let stops=0;
  const scene={room:'house',ox:80,override:{},state:after,callbacks:{onTidyEnd(){stops++;}}},tidy=new Tidying(scene,before);
  tidy.update(tidy.started+tidy.duration*.4);assert.equal(scene.override.monki.room,'house');
  tidy.update(tidy.started+tidy.duration*.999);assert.ok(scene.override.monki.x<-100);assert.ok(scene.override.galgan.x<-100);
  assert.ok(Math.abs(scene.override.julia.x-after.actors.julia.x)<1);
  tidy.update(tidy.started+tidy.duration+1);assert.deepEqual(scene.override,{});assert.deepEqual(after.actors,before.actors);tidy.stop();assert.equal(stops,1);
});
test('old piles are separated once, deterministically, without moving furniture or losing progress',()=>{
  const old=createWorld('stacked');for(const a of Object.values(old.actors)){a.x=200;a.y=250;}
  const repaired=prepareWorld(old),actors=Object.values(repaired.actors);
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)assert.ok(Math.hypot(actors[i].x-actors[j].x,actors[i].y-actors[j].y)>=4);
  assert.deepEqual(prepareWorld(repaired),repaired);assert.deepEqual(prepareWorld(old),repaired);assert.deepEqual(old.objects,repaired.objects);
  const a=repaired.actors.david,placed=applyOperation(repaired,{id:'place-on-david',actor:'julia',type:'move',target:'julia',x:a.x,y:a.y,room:'house'});
  assert.deepEqual(placed.actors.david,a);assert.notDeepEqual([placed.actors.julia.x,placed.actors.julia.y],[a.x,a.y]);
});
test('intentional close arrangements survive reloads and unrelated actions',()=>{
  const s=createWorld('cuddles');s.actors.david.x=200;s.actors.david.y=250;s.actors.julia.x=210;s.actors.julia.y=250;
  const restored=prepareWorld(s);assert.deepEqual(restored.actors,s.actors);
  const next=applyOperation(restored,{id:'unrelated-poke',actor:'david',type:'poke',target:'monki'});
  assert.deepEqual(next.actors.david,s.actors.david);assert.deepEqual(next.actors.julia,s.actors.julia);
});

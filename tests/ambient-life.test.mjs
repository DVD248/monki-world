import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../shared/world.js';
import {AmbientLife,ambientScenes} from '../public/ambient-life.js';
import {fullHouse} from './house.mjs';

const world=()=>fullHouse('ambient-test',1900000000000);
const fakeScene=state=>({state,room:'house',toys:{mode:null},replaying:false,tidying:null,decorEditing:false,down:null});

test('available live scenes use real residents and vary with place',()=>{
  const state=world(),home=ambientScenes(state,'house');
  assert.ok(home.length>=10);
  assert.ok(home.some(s=>s.id==='sock-dispute'));
  assert.ok(home.some(s=>s.id==='bowl-committee'));
  assert.ok(home.some(s=>s.id==='awkward-passing'));
  assert.ok(home.some(s=>s.id==='monki-copies-julia'));
  assert.ok(home.some(s=>s.id==='monki-entertains-nobody'));
  assert.ok(home.some(s=>s.id==='sernik-blocks-julia'));
  assert.ok(!home.some(s=>s.id==='dog-parade'||s.id==='quiet-exchange'));
  state.objects.push({id:'radio',type:'radio',room:'house',x:336,y:194});
  assert.ok(ambientScenes(state,'house').some(s=>s.id==='private-concert'));
  state.objects=state.objects.filter(o=>o.type!=='bowl');
  assert.ok(!ambientScenes(state,'house').some(s=>s.id==='bowl-committee'));
  for(const s of home)for(const id of s.roles)assert.equal(state.actors[id].room,'house');
  state.actors.david.room='roof';
  assert.ok(!ambientScenes(state,'roof').some(s=>s.id==='sock-dispute'));
  for(const room of ['garden','roof','cellar']){
    state.actors.david.room=room;
    assert.equal(ambientScenes(state,room).length,0,`${room} should stay quiet when David is alone with nothing to react to`);
  }
});

test('ambient choreography moves and returns without mutating shared world',()=>{
  const state=world(),snapshot=structuredClone(state),life=new AmbientLife({rng:()=>0});
  assert.equal(life.force('monki-entertains-nobody',state,'house',1000),true);
  const start=life.poseFor('monki',1000),middle=life.poseFor('monki',3700),end=life.poseFor('monki',8000);
  assert.equal(start.x,state.actors.monki.x);
  assert.ok(Math.hypot(middle.x-start.x,middle.y-start.y)>5);
  assert.equal(end.x,start.x);
  assert.deepEqual(state,snapshot);
  assert.equal(life.force('not-a-scene',state,'house',9000),false);
});

test('room changes, decorating and player touches take priority over ambient scenes',()=>{
  const original=globalThis.document;globalThis.document={querySelector:()=>({open:false})};
  try{
    const state=world(),scene=fakeScene(state),life=new AmbientLife({rng:()=>0});life.reset(0,'house');
    life.noteTap('galgan',1000);life.update(1700,scene);
    assert.equal(life.active.id,'monki-checks-galgan');
    scene.down={hit:{id:'galgan'}};const before=life.poseFor('galgan',2600).x;life.update(2600,scene);life.update(3000,scene);
    assert.equal(life.poseFor('galgan',3000).x,before);
    scene.down=null;scene.decorEditing=true;life.update(3100,scene);assert.equal(life.active,null);
    scene.decorEditing=false;scene.room='garden';life.update(3200,scene);assert.equal(life.room,'garden');
  }finally{globalThis.document=original;}
});

test('incidents are spaced out, room switches cannot force extras, and scenes avoid repeats',()=>{
  const original=globalThis.document;globalThis.document={querySelector:()=>({open:false})};
  try{
    const state=world(),scene=fakeScene(state),life=new AmbientLife({rng:()=>0});life.reset(0,'house');
    life.update(17999,scene);assert.equal(life.active,null);
    life.update(18000,scene);const first=life.active.id;assert.ok(first);
    life.update(25000,scene);assert.equal(life.active,null);
    scene.room='garden';life.update(26000,scene);
    scene.room='house';life.update(27000,scene);
    life.update(60000,scene);assert.equal(life.active,null,'a room switch must not create a second incident early');
    life.update(63000,scene);assert.ok(life.active);assert.notEqual(life.active.id,first);
    scene.reduced=true;life.update(63100,scene);assert.equal(life.active,null);
  }finally{globalThis.document=original;}
});

test('repeated pokes provoke a bounded, characteristic response',()=>{
  const original=globalThis.document;globalThis.document={querySelector:()=>({open:false})};
  try{
    const state=world(),scene=fakeScene(state),life=new AmbientLife({rng:()=>0});life.reset(0,'house');life.nextAt=Infinity;
    life.noteTap('sernik',1000,3);life.update(1700,scene);
    assert.equal(life.active.id,'sernik-avoids-the-finger');
    assert.equal(life.active.effect,'paw');
    assert.equal(life.poseFor('sernik',1700+life.active.ms).x,state.actors.sernik.x);
    life.update(6000,scene);life.noteTap('sernik',6500,4);life.update(7200,scene);
    assert.notEqual(life.active?.id,'sernik-avoids-the-finger','The same gag has a cooldown');
  }finally{globalThis.document=original;}
});

test('residents notice a newly placed piece or changed room after editing closes',()=>{
  const original=globalThis.document;globalThis.document={querySelector:()=>({open:false})};
  try{
    const state=world(),scene=fakeScene(state),life=new AmbientLife({rng:()=>0});
    life.update(0,scene);
    state.objects.push({id:'furn-new',type:'plant',room:'house',x:245,y:250});
    scene.decorEditing=true;life.update(1000,scene);life.update(2100,scene);
    assert.equal(life.active,null,'The resident waits while the editor is in use');
    scene.decorEditing=false;life.update(2200,scene);
    assert.equal(life.active.id,'monki-notices-plant');
    life.update(7000,scene);assert.equal(life.active,null);
    state.catalog.styles.house.wall='butter';life.update(7100,scene);
    life.update(8200,scene);assert.equal(life.active.id,'monki-notices-new-room');
    assert.equal(state.actors.monki.x,220,'The reaction does not permanently move a resident');
  }finally{globalThis.document=original;}
});

test('every sandbox scene has a valid moving pose and returns its cast',()=>{
  const state=world(),life=new AmbientLife({rng:()=>0});
  for(const room of ['house','garden','roof','cellar']){
    for(const actor of Object.values(state.actors))actor.room=room;
    for(const spec of ambientScenes(state,room)){
      assert.ok(life.force(spec.id,state,room,1000),spec.id);
      for(const id of spec.roles){
        const midway=life.poseFor(id,1000+spec.ms/2),returned=life.poseFor(id,1000+spec.ms);
        assert.ok(Number.isFinite(midway.x)&&Number.isFinite(midway.y),spec.id);
        assert.equal(returned.x,state.actors[id].x,spec.id);
        assert.equal(returned.y,state.actors[id].y,spec.id);
      }
    }
  }
});

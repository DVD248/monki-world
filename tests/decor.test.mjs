import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,applyOperation,prepareWorld,visibleWorld} from '../shared/world.js';
import {FURNITURE,FINISHES,DECOR_STYLES,DEFAULT_DECOR,decorOption,decorAvailable,decorRewardsAt,decorNewSince} from '../shared/decor.js';

let serial=0;const at=1900000000000;
const op=(state,type,fields={},actor='david')=>applyOperation(state,{id:`decor-${serial++}`,actor,type,...fields},at);
const world=()=>{const state=createWorld('decor-test',at);state.unlocked=['house','garden','roof','cellar'];state.completed=144;return state;};

test('a new home is spare, then adventures reveal furniture and colour without charging',()=>{
  let state=createWorld('fresh-decor',at);
  assert.deepEqual(state.objects.map(o=>o.type),['couch','lamp','bowl']);
  assert.equal(decorAvailable(state,'furniture','plant'),false);
  assert.equal(decorAvailable(state,'style','butter','house','wall'),false);
  assert.throws(()=>op(state,'buyFurniture',{item:'plant',finish:'oak',room:'house'}));
  assert.throws(()=>op(state,'styleRoom',{room:'house',surface:'wall',choice:'butter'}));
  state=op(state,'adventureComplete',{chapter:'up',index:0});
  assert.equal(decorAvailable(state,'furniture','plant'),true);
  assert.equal(decorAvailable(state,'style','butter','house','wall'),true);
  assert.equal(decorAvailable(state,'furniture','radio'),false);
  state=op(state,'buyFurniture',{item:'plant',finish:'oak',room:'house'});
  state=op(state,'styleRoom',{room:'house',surface:'wall',choice:'butter'});
  assert.equal(state.catalog.styles.house.wall,'butter');
});

test('every first-pass adventure reveals at least one decoration',()=>{
  for(let level=1;level<=24;level++){
    const reward=decorRewardsAt(level);
    assert.ok(reward.furniture||reward.finish||reward.styles.length,`Adventure ${level} has no decorating unlock`);
  }
});

test('later adventure passes reveal additional surfaces without relocking earlier choices',()=>{
  const state=createWorld('late-decor',at);
  state.completed=24;
  assert.equal(decorAvailable(state,'style','copper','roof','tile'),false);
  assert.equal(decorNewSince(state,24),false);
  state.completed=25;
  assert.equal(decorNewSince(state,24),false,'No NEW marker for a pass with no decoration reward');
  state.completed=28;
  assert.equal(decorAvailable(state,'style','copper','roof','tile'),true);
  assert.equal(decorNewSince(state,24),true);
  assert.equal(decorRewardsAt(28).styles.some(style=>style.room==='roof'&&style.id==='copper'),true);
  assert.equal(decorNewSince(state,28),false);
  state.completed=144;
  assert.equal(decorAvailable(state,'style','terracotta','cellar','wall'),true);
  assert.equal(decorAvailable(state,'style','butter','house','wall'),true);
});

test('catalog has broad, distinct furniture and environment choices',()=>{
  const season=world();
  assert.ok(Object.keys(FURNITURE).length>=20);
  for(const id of Object.keys(FURNITURE))assert.equal(decorAvailable(season,'furniture',id),true,`${id} must be earnable`);
  for(const id of Object.keys(FINISHES))assert.equal(decorAvailable(season,'finish',id),true,`${id} finish must be earnable`);
  assert.ok(Object.keys(FINISHES).length>=6);
  for(const [room,surfaces] of Object.entries(DECOR_STYLES)){
    assert.ok(Object.keys(surfaces).length>=2,room);
    for(const [surface,options] of Object.entries(surfaces)){
      assert.ok(options.length>=5,`${room}.${surface}`);
      assert.equal(new Set(options.map(option=>option.id)).size,options.length);
      assert.equal(DEFAULT_DECOR[room][surface],options[0].id);
      for(const option of options)assert.equal(decorAvailable(season,'style',option.id,room,surface),true,`${room}.${surface}.${option.id} must be earnable`);
    }
  }
});

test('room surfaces are shared, validated and survive old-save migration',()=>{
  let state=world();delete state.catalog;state=prepareWorld(state);
  assert.equal(decorOption(state,'house','wall').id,'sage');
  state=op(state,'styleRoom',{room:'house',surface:'wall',choice:'plum'});
  state=op(state,'styleRoom',{room:'roof',surface:'tile',choice:'slate'},'julia');
  assert.equal(visibleWorld(state,'julia').catalog.styles.house.wall,'plum');
  assert.equal(visibleWorld(state,'david').catalog.styles.roof.tile,'slate');
  assert.throws(()=>op(state,'styleRoom',{room:'house',surface:'wall',choice:'not-a-color'}));
  assert.throws(()=>op(state,'styleRoom',{room:'roof',surface:'wall',choice:'plum'}));
});

test('an existing low-progress room keeps its already chosen furniture and colours',()=>{
  const previous=createWorld('old-decor',at);delete previous.catalog.legacyOwned;
  previous.catalog.styles.house.wall='plum';
  previous.objects.push({id:'old-armchair',type:'armchair',finish:'blue',room:'house',x:240,y:260});
  let state=prepareWorld(previous);
  assert.equal(decorAvailable(state,'style','plum','house','wall'),true);
  assert.equal(decorAvailable(state,'furniture','armchair'),true);
  assert.equal(decorAvailable(state,'finish','blue'),true);
  assert.equal(decorAvailable(state,'furniture','shelf'),false);
  state=op(state,'styleRoom',{room:'house',surface:'wall',choice:'sage'});
  state=op(state,'styleRoom',{room:'house',surface:'wall',choice:'plum'});
  assert.equal(state.catalog.styles.house.wall,'plum');
});

test('a purchased piece can be moved, refinished, stored, returned and removed',()=>{
  let state=world();state=op(state,'buyFurniture',{item:'armchair',finish:'moss',room:'house'});
  const chair=state.objects.find(object=>object.type==='armchair');assert.ok(chair.id.startsWith('furn-'));
  state=op(state,'move',{target:chair.id,x:114,y:253,room:'garden'},'julia');
  state=op(state,'refinishFurniture',{target:chair.id,finish:'plum'},'julia');
  state=op(state,'storeFurniture',{target:chair.id});
  assert.equal(state.objects.some(object=>object.id===chair.id),false);
  assert.equal(state.catalog.storage[0].finish,'plum');
  state=op(state,'placeFurniture',{target:chair.id,room:'roof'},'julia');
  assert.equal(state.objects.find(object=>object.id===chair.id).room,'roof');
  state=op(state,'sellFurniture',{target:chair.id});
  assert.equal(state.objects.some(object=>object.id===chair.id),false);
  assert.throws(()=>op(state,'placeFurniture',{target:chair.id,room:'house'}));
});

test('tidying preserves bought layouts; removed original furniture can be bought back',()=>{
  let state=world();state=op(state,'buyFurniture',{item:'shelf',finish:'blue',room:'garden'});
  const shelf=state.objects.find(object=>object.type==='shelf');
  state=op(state,'move',{target:shelf.id,x:120,y:260,room:'garden',decor:true});
  state=op(state,'sellFurniture',{target:'couch'});
  state=op(state,'tidy');
  assert.deepEqual(state.objects.find(object=>object.id===shelf.id),{...shelf,x:120,y:260,room:'garden',lastBy:'david',movedAt:at,home:{room:'garden',x:120,y:260}});
  assert.equal(state.objects.some(object=>object.id==='couch'),false);
  state=op(state,'buyFurniture',{item:'couch',finish:'rose',room:'house'});
  assert.equal(state.objects.some(object=>object.type==='couch'),true);
});

test('tidy puts every piece back where it was decorated, not where a dog left it',()=>{
  let state=world();const where=id=>{const o=state.objects.find(o=>o.id===id);return [o.room,o.x,o.y];};
  // Arranged in Decorate: the starter sofa goes out to the garden, a new stool by the window.
  state=op(state,'move',{target:'couch',x:150,y:280,room:'garden',decor:true});
  state=op(state,'buyFurniture',{item:'stool',finish:'oak',room:'house',x:250,y:260});
  const stool=state.objects.find(o=>o.type==='stool').id;
  state=op(state,'storeFurniture',{target:'lamp'});state=op(state,'placeFurniture',{target:'lamp',room:'house',x:300,y:200});
  // Then the day happens: pieces get dragged about outside Decorate.
  for(const [target,x,y,room] of [['couch',60,300,'house'],[stool,90,190,'garden'],['lamp',40,300,'house'],['bowl',120,240,'house']])state=op(state,'move',{target,x,y,room},'julia');
  state=op(state,'tidy');
  assert.deepEqual(where('couch'),['garden',150,280]);
  assert.deepEqual(where(stool),['house',250,260]);
  assert.deepEqual(where('lamp'),['house',300,200]);
  assert.deepEqual(where('bowl'),['house',326,297],'a piece nobody arranged goes back to its original spot');
});

test('an older save keeps what a person arranged when Tidy first learns about Decorate',()=>{
  const old=world();delete old.catalog.arranged;
  Object.assign(old.objects.find(o=>o.id==='bowl'),{x:284,y:257,lastBy:'david'});
  Object.assign(old.objects.find(o=>o.id==='lamp'),{x:216,y:181,lastBy:'galgan'});
  const state=op(old,'tidy');
  const bowl=state.objects.find(o=>o.id==='bowl'),lamp=state.objects.find(o=>o.id==='lamp');
  assert.deepEqual([bowl.x,bowl.y],[284,257],'where David put the bowl is where it lives');
  assert.deepEqual([lamp.x,lamp.y],[197,181],'Galgan\'s dragging is tidied away');
});

test('invalid purchases and stale storage actions cannot corrupt the world',()=>{
  const state=world();
  assert.throws(()=>op(state,'buyFurniture',{item:'unknown',finish:'oak',room:'house'}));
  assert.throws(()=>op(state,'buyFurniture',{item:'chair',finish:'neon',room:'house'}));
  assert.throws(()=>op(state,'storeFurniture',{target:'missing'}));
  const one=op(state,'buyFurniture',{item:'stool',finish:'oak',room:'house'});
  const same=applyOperation(one,{id:one.applied.at(-1),actor:'julia',type:'buyFurniture',item:'stool',finish:'oak',room:'house'},at);
  assert.equal(same.objects.length,one.objects.length);
});

test('live placement uses the touched spot and rejects invalid coordinates',()=>{
  let state=world();state=op(state,'buyFurniture',{item:'bench',finish:'blue',room:'garden',x:119,y:277});
  const bench=state.objects.find(object=>object.type==='bench');
  assert.deepEqual([bench.x,bench.y],[119,277]);
  assert.throws(()=>op(state,'buyFurniture',{item:'bench',finish:'blue',room:'garden',x:'oops',y:250}));
  state=op(state,'storeFurniture',{target:bench.id});
  assert.throws(()=>op(state,'placeFurniture',{target:bench.id,room:'garden',x:'oops',y:250}));
  state=op(state,'placeFurniture',{target:bench.id,room:'garden',x:283,y:289});
  assert.deepEqual([state.objects.find(object=>object.id===bench.id).x,state.objects.find(object=>object.id===bench.id).y],[283,289]);
});

test('room keepsakes can be put away and restored without losing the adventure',()=>{
  let state=world();state.decor.push('kite');
  state=op(state,'setDecorVisible',{item:'kite',visible:false},'julia');
  assert.ok(state.catalog.hiddenDecor.includes('kite'));
  assert.ok(visibleWorld(state,'david').catalog.hiddenDecor.includes('kite'));
  assert.ok(state.decor.includes('kite'));
  state=op(state,'setDecorVisible',{item:'kite',visible:true});
  assert.deepEqual(state.catalog.hiddenDecor,[]);
  assert.throws(()=>op(state,'setDecorVisible',{item:'not-owned',visible:false}));
});

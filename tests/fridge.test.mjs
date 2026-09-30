import test from 'node:test';
import assert from 'node:assert/strict';
import {FRIDGE_INGREDIENTS,fridgeRecipe} from '../shared/fridge.js';
import {createWorld,prepareWorld,applyOperation,ITEMS} from '../shared/world.js';
const now=Date.parse('2026-09-22T12:00:00Z');let serial=0;
const op=(s,type,fields={},actor='david')=>applyOperation(s,{id:`fridge-${serial++}`,actor,type,...fields},now);
test('six distinct freezer recipes are order independent and wearable',()=>{
  const results=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=FRIDGE_INGREDIENTS[i],b=FRIDGE_INGREDIENTS[j],r=fridgeRecipe([a,b]);assert.equal(fridgeRecipe([b,a]),r);assert.ok(ITEMS[r]?.wearable);results.push(r);}
  assert.equal(new Set(results).size,6);
  for(const invalid of [null,[],['potato'],['potato','potato'],['potato','crown'],['potato','fish','carrot']])assert.throws(()=>fridgeRecipe(invalid));
});
test('freezer migrates old saves without losing anything',()=>{
  const s=createWorld('old-freezer',now);delete s.fridgeBox;const upgraded=prepareWorld(s);
  assert.deepEqual(upgraded.fridgeBox,{batch:null,made:0});delete upgraded.fridgeBox;assert.deepEqual(upgraded,s);
});
test('a batch is persistent, cannot be overwritten, and cannot be collected twice',()=>{
  const s=createWorld('freezer',now),operation={id:'mix-once',actor:'david',type:'fridgeMix',ingredients:['icecream','potato']};
  const mixed=applyOperation(s,operation,now);assert.equal(s.fridgeBox.batch,null);assert.equal(mixed.fridgeBox.batch.result,'snowflake');
  assert.deepEqual(applyOperation(mixed,operation,now),mixed);assert.equal(mixed.fridgeBox.made,1);
  assert.throws(()=>op(mixed,'fridgeMix',{ingredients:['carrot','fish']}));assert.throws(()=>op(mixed,'fridgeTake',{batch:'wrong'}));
  const collected=op(mixed,'fridgeTake',{batch:'mix-once',wear:true});assert.equal(collected.actors.david.hat,'snowflake');assert.ok(collected.inventory.includes('snowflake'));assert.equal(collected.fridgeBox.batch,null);
  assert.throws(()=>op(collected,'fridgeTake',{batch:'mix-once'}));
});
test('only the maker can reserve a batch and only its recipient can take it',()=>{
  let s=op(createWorld('gift-freezer',now),'fridgeMix',{ingredients:['carrot','fish']});const batch=s.fridgeBox.batch.id;
  assert.throws(()=>op(s,'fridgeLeave',{batch},'julia'));s=op(s,'fridgeLeave',{batch});assert.equal(s.fridgeBox.batch.for,'julia');
  assert.throws(()=>op(s,'fridgeTake',{batch}));s=op(s,'fridgeTake',{batch,wear:true},'julia');assert.equal(s.actors.julia.hat,'shell');assert.equal(s.fridgeBox.batch,null);
});
test('taking a freezer result respects a stuck hat but taking without wearing still works',()=>{
  let s=op(createWorld('stuck-freezer',now),'fridgeMix',{ingredients:['carrot','potato']});const batch=s.fridgeBox.batch.id;s.stuck.david=now+10000;
  assert.throws(()=>op(s,'fridgeTake',{batch,wear:true}));s=op(s,'fridgeTake',{batch,wear:false});assert.ok(s.inventory.includes('pizza'));assert.equal(s.actors.david.hat,null);
});

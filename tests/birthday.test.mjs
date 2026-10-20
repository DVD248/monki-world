import test from 'node:test';
import assert from 'node:assert/strict';
import {applyOperation,prepareWorld,birthdayWaiting,birthdayFor,BIRTHDAY_LETTER,residentsHere,AWAY} from '../shared/world.js';
import {fullHouse} from './house.mjs';

const NOW=Date.parse('2026-10-20T08:00:00Z'),DAY=86400000;
let n=0;
const op=(s,type,fields={},actor='david',at=NOW)=>applyOperation(s,{type,actor,id:`bday-${++n}`,...fields},at);
const house=()=>{const s=fullHouse('birthday',NOW);s.cast=s.cast.filter(id=>id!=='kot');Object.assign(s.actors.kot,{room:AWAY});return prepareWorld(s);};

test('a birthday surprise waits for the other one, from the day chosen, and only until it is opened',()=>{
  let s=house();
  assert.equal(birthdayWaiting(s,'julia',NOW),false,'nothing until somebody leaves one');
  s=op(s,'birthdaySet',{age:21,message:'Line one.\r\nLine two.',signature:'',showFrom:NOW+DAY});
  const b=birthdayFor(s,'julia');
  assert.deepEqual({for:b.for,from:b.from,age:b.age,message:b.message,signature:b.signature},{for:'julia',from:'david',age:21,message:'Line one.\nLine two.',signature:'David'});
  assert.equal(s.log.some(e=>e.action==='birthday'),false,'a surprise is not news on her card');
  assert.equal(birthdayWaiting(s,'julia',NOW),false,'not before the day');
  assert.equal(birthdayWaiting(s,'julia',NOW+DAY),true,'on the day');
  assert.equal(birthdayWaiting(s,'david',NOW+DAY),false,'never for the one who left it');
  // He can rewrite it, or take it back, until she opens it.
  s=op(s,'birthdaySet',{age:21,message:'Better words.',signature:'Love, D.'},'david',NOW+1000);
  assert.equal(birthdayFor(s,'julia').message,'Better words.');assert.equal(birthdayFor(s,'julia').signature,'Love, D.');
  assert.throws(()=>op(s,'birthdayClear',{},'julia'),/no surprise of yours/);
  assert.equal(birthdayFor(op(s,'birthdayClear',{}),'julia'),null);
});

test('opening it leaves the cake in the house, brings Kot as the last guest, and tells the one who left it',()=>{
  let s=op(house(),'birthdaySet',{age:21,message:'Happy birthday.'});
  assert.ok(!residentsHere(s).includes('kot'));
  s=op(s,'birthdaySeen',{},'julia',NOW+5000);
  assert.equal(birthdayFor(s,'julia').seenAt,NOW+5000);assert.equal(birthdayWaiting(s,'julia',NOW+6000),false);
  assert.ok(s.decor.includes('cake')&&s.inventory.includes('cake'),'the cake stays');
  assert.ok(residentsHere(s).includes('kot'),'Kot came for the party');
  assert.equal(s.log[0].action,'birthday');assert.equal(s.log[0].who,'julia');assert.equal(s.log[0].target,'david');
  // Once is once: opening it again (her other phone) changes nothing, and it cannot be rewritten now.
  const again=op(s,'birthdaySeen',{},'julia',NOW+9000);assert.equal(birthdayFor(again,'julia').seenAt,NOW+5000);assert.equal(again.log.filter(e=>e.action==='birthday').length,1);
  assert.throws(()=>op(s,'birthdaySet',{age:21,message:'Again'}),/opened it already/);
  // Only the one it is for can open it.
  const other=op(house(),'birthdaySet',{age:21,message:'Hi'});assert.equal(birthdayFor(op(other,'birthdaySeen',{},'david'),'julia').seenAt,null);
});

test('a birthday letter has an age, some words and a sensible length',()=>{
  const s=house();
  assert.throws(()=>op(s,'birthdaySet',{age:21,message:'   '}),/few words/);
  assert.throws(()=>op(s,'birthdaySet',{age:0,message:'Hi'}),/How old/);
  assert.throws(()=>op(s,'birthdaySet',{age:21.5,message:'Hi'}),/How old/);
  assert.throws(()=>op(s,'birthdaySet',{age:21,message:'x'.repeat(BIRTHDAY_LETTER+1)}),/long letter/);
  assert.equal(birthdayFor(op(s,'birthdaySet',{age:21,message:'x'.repeat(BIRTHDAY_LETTER),signature:'y'.repeat(200)}),'julia').signature.length,60);
  // Older saves simply have none.
  const old=structuredClone(s);delete old.birthdays;assert.deepEqual(prepareWorld(old).birthdays,{});
});

test('one each: neither can see, spoil or overwrite the surprise waiting for them',()=>{
  let s=op(house(),'birthdaySet',{age:21,message:'For Julia.'},'david');
  s=op(s,'birthdaySet',{age:24,message:'For David.'},'julia');
  assert.equal(birthdayFor(s,'julia').message,'For Julia.');assert.equal(birthdayFor(s,'david').message,'For David.');
  assert.equal(birthdayWaiting(s,'julia',NOW),true);assert.equal(birthdayWaiting(s,'david',NOW),true);
  // Taking hers back is his to do, and does not touch his.
  assert.throws(()=>op(s,'birthdayClear',{},'david')&&op(op(s,'birthdayClear',{},'david'),'birthdayClear',{},'david'),/no surprise of yours/);
  assert.equal(birthdayFor(op(s,'birthdayClear',{},'julia'),'julia').message,'For Julia.');
});

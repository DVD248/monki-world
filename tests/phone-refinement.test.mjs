import test from 'node:test';
import assert from 'node:assert/strict';
import {centralTime,ambienceAt} from '../shared/ambience.js';
import {matchFaces} from '../shared/adventures.js';
import {createWorld,applyOperation} from '../shared/world.js';
import {fullHouse} from './house.mjs';

const NOW=Date.parse('2026-09-21T10:00:00Z');let sequence=0;
const op=(s,type,fields={},now=NOW)=>applyOperation(s,{id:`phone-${sequence++}`,actor:'david',type,...fields},now);

test('Central European clock follows CET, CEST, and the exact DST transitions',()=>{
  assert.equal(centralTime(Date.parse('2026-01-15T12:05:00Z')).label,'13:05 CET');
  assert.equal(centralTime(Date.parse('2026-07-15T12:05:00Z')).label,'14:05 CEST');
  assert.equal(centralTime(Date.parse('2026-03-29T00:59:00Z')).label,'01:59 CET');
  assert.equal(centralTime(Date.parse('2026-03-29T01:00:00Z')).label,'03:00 CEST');
  assert.equal(centralTime(Date.parse('2026-10-25T00:59:00Z')).label,'02:59 CEST');
  assert.equal(centralTime(Date.parse('2026-10-25T01:00:00Z')).label,'02:00 CET');
  assert.equal(centralTime(Date.parse('2026-01-15T23:00:00Z')).hour,0);
});

test('light shifts smoothly across every minute and the sun moves through the day',()=>{
  for(const date of ['2026-01-15','2026-06-15','2026-09-21']){
    const start=Date.parse(date+'T00:00:00Z');let previous=ambienceAt(start);
    for(let i=1;i<1440;i++){const current=ambienceAt(start+i*60000);assert.ok(Math.abs(current.light-previous.light)<.02);assert.ok(current.light>=0&&current.light<=1);previous=current;}
  }
  assert.equal(ambienceAt(NOW,0).period,'night');assert.equal(ambienceAt(NOW,13).period,'midday');
  assert.ok(ambienceAt(NOW,9).sun.x<ambienceAt(NOW,17).sun.x);
  assert.notEqual(ambienceAt(NOW,0).sky,ambienceAt(NOW,13).sky);
});

test('memory cards always have distinct visual pairs, including socks and flowers',()=>{
  for(const primary of ['sock','flower','potato','duck','star','shell','fish'])for(const count of [3,4]){
    const faces=matchFaces(primary,count);assert.equal(faces.length,count);assert.equal(new Set(faces).size,count);assert.equal(faces[0],primary);
  }
});

test('tidy restores displaced furniture and stores loose things without losing gifts or drawings',()=>{
  let s=fullHouse('tidy-phone',NOW);s.unlocked.push('garden');
  s=op(s,'move',{target:'couch',x:300,y:290,room:'garden'});
  s=op(s,'place',{item:'potato',room:'house',x:70,y:290});
  s=op(s,'gift',{item:'cone'});s=op(s,'draw',{lines:[[[.1,.1],[.9,.9]]]});
  const gifts=structuredClone(s.gifts),drawing=structuredClone(s.drawing),mail=structuredClone(s.life.mail);
  s=op(s,'tidy');
  assert.deepEqual(s.objects.map(o=>o.id).sort(),['bowl','couch','lamp']);
  const couch=s.objects.find(o=>o.id==='couch');assert.deepEqual([couch.room,couch.x,couch.y],['house',118,181]);
  assert.ok(s.storedObjects.some(o=>o.type==='potato'));assert.ok(s.inventory.includes('potato'));assert.equal(s.traces.length,0);
  assert.deepEqual(s.gifts,gifts);assert.deepEqual(s.drawing,drawing);assert.deepEqual(s.life.mail,mail);
});

test('petting both dogs is persistent, gentle and throttled without annoyance',()=>{
  for(const target of ['sernik','galgan']){
    let s=fullHouse('pet-phone',NOW);s.actors[target].mood='sleep';
    s=op(s,'pet',{target});const bond=s.bond.david[target];
    assert.equal(s.actors[target].mood,'happy');assert.equal(s.actors[target].pokes,0);assert.equal(s.actors[target].petAt,NOW);
    s=op(s,'pet',{target},NOW+100);assert.equal(s.bond.david[target],bond);
    s=op(s,'pet',{target},NOW+2000);assert.equal(s.bond.david[target],bond+1);
    assert.equal(s.log.filter(l=>l.action==='pet').length,1);
  }
  assert.throws(()=>op(fullHouse('pet-phone',NOW),'pet',{target:'monki'}));
});

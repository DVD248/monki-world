#!/usr/bin/env node
// Gestures in the room, and the audit's ability to aim at them.
//
// Two things broke silently and are pinned here:
//   1. A chapter invitation is drawn over its star. Stroking that dog opened the
//      chapter instead of petting him — the gentlest thing in the game became a
//      door into the one that feels most like homework.
//   2. The room changed how it maps a finger to the floor, and the Julia audit kept
//      the old mapping, so every canvas tap it made landed somewhere else.

import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {AFFORDANCES} from './play.mjs';
import {createWorld,applyOperation} from '../shared/world.js';
import {ADVENTURES} from '../shared/adventures.js';

const data=await mkdtemp(path.join(os.tmpdir(),'monki-gestures-'));
const port=36000+Math.floor(Math.random()*4000),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),
  env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(60);}
const systemChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(systemChrome)?systemChrome:puppeteer.executablePath()),
  headless:true,args:['--no-sandbox']});

async function room({dog,chapterReady}){
  const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let w=createWorld('gestures',Date.now());
  w=applyOperation(w,{id:'g0',type:'visit',actor:'julia'},Date.now());
  const chapter=ADVENTURES.findIndex(c=>c.actor===dog);
  assert.ok(chapter>=0,`no chapter stars ${dog}`);
  const where=ADVENTURES[chapter].room;
  if(!w.unlocked.includes(where))w.unlocked.push(where);
  w.journeys.julia={index:chapter,lastAt:chapterReady?0:Date.now()};
  w.actors[dog]={...w.actors[dog],room:where,x:260,y:280,mood:'idle'};
  await page.evaluateOnNewDocument(v=>{try{localStorage.setItem('monki-world-v1',v);}catch{}},
    JSON.stringify({actor:'julia',world:w,pending:[]}));
  await page.goto(base+'/',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const {Scene}=await import('./scene.js');const d=Scene.prototype.draw;
    Scene.prototype.draw=function(t){window.__scene=this;return d.call(this,t);};});
  await delay(700);await page.evaluate(()=>document.querySelector('dialog[open]')?.close());await delay(300);
  if(where!=='house'){
    await page.evaluate(r=>[...document.querySelectorAll('#locations button')]
      .find(b=>new RegExp(r,'i').test(b.getAttribute('aria-label')||''))?.click(),where);
    await delay(600);
  }
  const target=(await page.evaluate(AFFORDANCES)).find(o=>o.id==='rub_'+dog);
  assert.ok(target,`the audit does not offer ${dog} at all`);
  return {page,target,errors};
}
const stroke=async(page,t)=>{await page.mouse.move(t.px,t.py);await page.mouse.down();
  const hit=await page.evaluate(()=>window.__scene.down?.hit?.id||null);
  for(let k=0;k<7;k++)await page.mouse.move(t.px+(k%2?9:-9),t.py,{steps:4});
  const beforeUp=await page.evaluate(()=>({moving:window.__scene.moving?.id||null,petting:window.__scene.down?.petting||false,travel:window.__scene.down?.travel||0}));
  await page.mouse.up();await delay(600);return{hit,beforeUp};};
const result=page=>page.evaluate(d=>({
  petted:JSON.parse(localStorage.getItem('monki-world-v1')).world.log.some(l=>l.action==='pet'),
  opened:document.querySelector('dialog[open]')?.id||null,aimErrors:window.__aimError||0,
  room:window.__scene.room,active:window.__scene.ambient?.active?.id||null,
  dogPositions:Object.fromEntries(['sernik','galgan'].map(id=>[id,window.__scene.position(id)]))}));

let failed=null;
try{
  for(const dog of ['sernik','galgan']){
    // The audit must hit what it aims at, or its every canvas result is fiction.
    {const {page,target,errors}=await room({dog,chapterReady:false});
     const landed=await page.evaluate(({px,py})=>window.__scene.at({clientX:px,clientY:py}),target);
     const expected=await page.evaluate(d=>{const a=window.__scene.state.actors[d];return {x:a.x,y:a.y-19};},dog);
     assert.ok(Math.abs(landed.x-expected.x)<=2&&Math.abs(landed.y-expected.y)<=2,
       `audit aims at ${JSON.stringify(expected)} but lands at ${JSON.stringify(landed)} — play.mjs at() no longer inverts scene.at()`);
     const strokeState=await stroke(page,target);const r=await result(page);
     assert.equal(r.aimErrors,0,'the audit reported aiming errors');
     assert.ok(r.petted,`stroking ${dog} on an ordinary day does not pet him: ${JSON.stringify({target,strokeState,...r})}`);
     assert.deepEqual(errors,[]);await page.close();}

    // His chapter is waiting: a stroke still reaches the dog…
    {const {page,target,errors}=await room({dog,chapterReady:true});
     await stroke(page,target);const r=await result(page);
     assert.ok(r.petted,`with his chapter waiting, stroking ${dog} does not pet him`);
     assert.equal(r.opened,null,`with his chapter waiting, stroking ${dog} opened "${r.opened}" instead`);
     assert.deepEqual(errors,[]);await page.close();}

    // …and a plain tap still opens the chapter, so it stays discoverable.
    {const {page,target,errors}=await room({dog,chapterReady:true});
     await page.mouse.click(target.px,target.py);await delay(700);const r=await result(page);
     assert.equal(r.opened,'microgame',`a tap on ${dog} with his chapter waiting no longer opens it`);
     assert.deepEqual(errors,[]);await page.close();}
  }
  console.log('PASS: the audit aims true; both dogs pet on an ordinary day and with their chapter waiting; a tap still opens the chapter.');
}catch(e){failed=e;}
finally{
  await Promise.race([browser.close().catch(()=>{}),delay(4000)]);
  if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');
  server.kill();await delay(120);
  if(path.basename(data).startsWith('monki-gestures-'))await rm(data,{recursive:true,force:true});
}
// Something in the page keeps the event loop alive after the browser closes; say
// the result and leave rather than hang a whole check run.
if(failed){console.error(failed.message);process.exit(1);}
process.exit(0);

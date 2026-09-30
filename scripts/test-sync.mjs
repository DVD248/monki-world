#!/usr/bin/env node
// Are David's phone and Julia's phone looking at the same world?
//
// Both phones open at once, as on FaceTime, then apart on later days. After every action:
//   1. the server's truth, as each of them is allowed to see it (/api/world),
//   2. what each phone has saved after syncing,
//   3. what each phone actually draws (the scene's own state),
// are compared. The server keeps exactly two things from each of them on purpose: the
// other's frog before both have picked, and what is inside an unopened present. Any other
// difference fails, and so does a page error.
//
//   npm run test:sync
import {createRequire} from 'node:module';
import {fork} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=fileURLToPath(new URL('..',import.meta.url)).replace(/\/$/,''),require=createRequire(ROOT+'/package.json'),puppeteer=require('puppeteer');
const {playStep}=await import(pathToFileURL(ROOT+'/scripts/play.mjs').href);
const GAME=ROOT;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const HOUR=3600000,DAY=24*HOUR;
let now=Date.UTC(2026,8,24,17,0);
const data=await mkdtemp(path.join(os.tmpdir(),'monki-sync-')),port=48000+Math.floor(Math.random()*900),base=`http://127.0.0.1:${port}`;
const srv=fork(path.join(GAME,'server.mjs'),[],{cwd:GAME,execArgv:['--import',pathToFileURL(ROOT+'/scripts/couple/clock-preload.mjs').href],
  env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:['ignore','ignore','inherit','ipc']});
const clock=t=>new Promise(r=>{const on=m=>{if(m?.clock===t){srv.off('message',on);r();}};srv.on('message',on);srv.send({clock:t});});
await clock(now);
for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await wait(60);}
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await puppeteer.launch({headless:true,args:['--no-sandbox'],...(process.env.BROWSER_BIN||(await import('node:fs')).existsSync(chrome)?{executablePath:process.env.BROWSER_BIN||chrome}:{})});
const ctx={david:await browser.createBrowserContext({downloadBehavior:{policy:'deny'}}),julia:await browser.createBrowserContext({downloadBehavior:{policy:'deny'}})};
const pages={},saved={},errors=[],results=[];
const KEY='monki-world-v1';

async function open(who,hash=''){
  const p=await ctx[who].newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:1});await p.emulateTimezone('Europe/Warsaw');
  p.on('pageerror',e=>errors.push(`${who}: ${e.message.slice(0,200)}`));
  await p.evaluateOnNewDocument(t=>{const R=Date,off=t-R.now();class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off);}static now(){return R.now()+off;}}globalThis.Date=D;},now);
  if(saved[who])await p.evaluateOnNewDocument((k,v)=>{if(!localStorage.getItem(k))localStorage.setItem(k,v);},KEY,saved[who]);
  await p.goto(base+'/'+hash,{waitUntil:'networkidle0'});
  await p.evaluate(async()=>{const {Scene}=await import('./scene.js');const d=Scene.prototype.draw;Scene.prototype.draw=function(t){window.__scene=this;return d.call(this,t);};
    const {AdventurePlayer}=await import('./adventure-player.js');const e=AdventurePlayer.prototype.enter;AdventurePlayer.prototype.enter=function(...a){window.__game=this;return e.apply(this,a);};});
  await wait(900);pages[who]=p;return p;
}
/** Put it down: the app goes to the background first, as it does on a phone, then closes. */
async function close(who){const p=pages[who];await settle([who]);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await wait(200);saved[who]=await p.evaluate(k=>localStorage.getItem(k),KEY);await p.close();delete pages[who];}
const later=async ms=>{now+=ms;await clock(now);};
const local=who=>pages[who].evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),KEY);
/** Push and pull until each open phone has nothing waiting and holds the server's revision. */
async function settle(who=Object.keys(pages)){
  for(let round=0;round<40;round++){
    for(const w of who)await pages[w].evaluate(()=>window.dispatchEvent(new Event('online')));
    await wait(350);
    let done=true;
    for(const w of who){const l=await local(w);if(!l?.room){done=false;continue;}
      const s=await server(w,l);if(l.pending.length||l.world.revision!==s.revision)done=false;}
    if(done){await wait(300);return true;}
  }
  return false;
}
async function server(who,l){l??=await local(who);const r=await fetch(base+'/api/world',{headers:{Authorization:`Bearer ${l.token}`,'X-Monki-Room':l.room}});return (await r.json()).world;}
// ── comparing ──
function diff(a,b,at='',out=[]){
  if(out.length>30)return out;
  if(a===b)return out;
  if(typeof a!=='object'||typeof b!=='object'||a===null||b===null){if(JSON.stringify(a)!==JSON.stringify(b))out.push(`${at||'.'}: ${JSON.stringify(a)?.slice(0,80)} ≠ ${JSON.stringify(b)?.slice(0,80)}`);return out;}
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],at?`${at}.${k}`:k,out);
  return out;
}
/** The two people's views of one world differ only in what is kept from each on purpose. */
function sharedPart(w){const x=structuredClone(w);if(x.choices){x.choices.picks={};delete x.choices.partnerReady;}for(const g of x.gifts||[])if(!g.opened)delete g.item;return x;}
async function drawn(who){return pages[who].evaluate(()=>{const s=window.__scene;if(!s?.state)return null;
  return {room:s.room,actors:Object.fromEntries(Object.entries(s.state.actors).map(([id,a])=>[id,{room:a.room,x:Math.round(a.x),y:Math.round(a.y),hat:a.hat||null,mood:a.mood}])),
    objects:Object.fromEntries(s.state.objects.map(o=>[o.id,{room:o.room,x:Math.round(o.x),y:Math.round(o.y)}])),incident:s.state.incident?.id||null,
    finds:s.state.life?.finds||{},traces:s.state.traces.map(t=>`${t.type}@${t.room}`).sort()};});}
async function check(label){
  const open=Object.keys(pages);let synced,L,S;
  // A phone's own once-a-minute "visit" can land on the server between settling and
  // reading, leaving the other phone one revision behind for a moment. Read again then;
  // a real difference is still there on the third look.
  for(let look=0;look<3;look++){
    synced=await settle(open);L={};S={};
    for(const w of open){L[w]=(await local(w)).world;S[w]=await server(w);}
    if(open.every(w=>L[w].revision===S[w].revision)&&new Set(open.map(w=>L[w].revision)).size===1)break;
  }
  const problems=[],notes=[];
  if(!synced)problems.push('a phone never finished syncing');
  for(const w of open){const d=diff(L[w],S[w]);if(d.length)problems.push(`${w}'s phone ≠ server: ${d.slice(0,4).join(' | ')}`);}
  if(open.length===2){
    const d=diff(sharedPart(L.david),sharedPart(L.julia));
    if(d.length)problems.push(`David's world ≠ Julia's world: ${d.slice(0,5).join(' | ')}`);
    // What each phone draws: the same world, apart from overlays each phone adds for its own person.
    const D={david:await drawn('david'),julia:await drawn('julia')};
    for(const id of Object.keys(D.david.actors)){
      const a=D.david.actors[id],b=D.julia.actors[id];
      const why=[];
      for(const [who,f] of Object.entries({david:D.david.finds.david,julia:D.julia.finds.julia}))if(f?.fresh&&f.actor===id)why.push(`${who}'s own daily situation is drawn on ${who}'s phone only`);
      const differs=['room','x','y','hat','mood'].filter(k=>a[k]!==b[k]);
      if(differs.length)problems.push(`${id} drawn differently (${differs.map(k=>`${k}: David ${a[k]} / Julia ${b[k]}`).join(', ')})${why.length?' — '+why.join('; '):''}`);
    }
    for(const id of Object.keys(D.david.objects)){const a=D.david.objects[id],b=D.julia.objects[id];if(!b||a.room!==b.room||a.x!==b.x||a.y!==b.y)problems.push(`object ${id} drawn differently: David ${JSON.stringify(a)} / Julia ${JSON.stringify(b)}`);}
    if(JSON.stringify(D.david.traces)!==JSON.stringify(D.julia.traces))problems.push(`marks differ: ${D.david.traces} / ${D.julia.traces}`);
  }
  results.push({label,problems,notes});
  console.log(`${problems.length?'✗':'✓'} ${label}${problems.length?'':notes.length?'  (by design: '+notes.length+')':''}`);
  for(const p of problems)console.log('    ✗ '+p);
  for(const n of notes)console.log('    · '+n);
}
// ── doing things, through the same entry points the screen uses ──
const cb=(who,name,...args)=>pages[who].evaluate((n,a)=>window.__scene.callbacks[n](...a),name,args);
const press=(who,text)=>pages[who].evaluate(t=>{const b=[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')].find(b=>b.textContent.trim()===t&&!b.disabled);b?.click();return !!b;},text);
const card=who=>pages[who].evaluate(()=>({title:document.getElementById('story-title').textContent,button:document.getElementById('start-adventure').textContent,tip:document.getElementById('scene-tip').classList.contains('visible')?document.getElementById('scene-tip').textContent:''}));
const closeSheet=who=>pages[who].evaluate(()=>document.querySelector('dialog[open]')?.close());
const say=(...a)=>console.log('  ',...a);

try{
  console.log('\nTwo phones, one world\n');
  // Day one: he sets it up and leaves her sunglasses; she comes in from the link.
  const d=await open('david');
  await d.evaluate(()=>[...document.querySelectorAll('.person-choice')].find(b=>b.textContent.trim()==='David').click());await wait(1200);
  say('David left a present before inviting:',await press('david','Sunglasses'));await wait(600);
  const seat=await local('david');
  const j=await open('julia',`#join=${seat.room}.${seat.invite}`);await press('julia','Enter the world');await wait(1500);
  say('Julia\'s first screen:',await j.evaluate(()=>document.querySelector('#sheet-body h2')?.textContent));
  await check('both phones open right after she joins');
  await press('julia','Open David’s present');await wait(1800);
  say('after opening it:',await j.evaluate(()=>document.querySelector('#sheet-body h2')?.textContent));
  await press('julia','Look around');await wait(500);
  await check('she opened his present and Galgan put it on');
  const dg=(await drawn('david')).actors.galgan.hat;say('Galgan\'s hat on David\'s phone:',dg);

  // Together, on FaceTime: each does things; the other should see them.
  await cb('julia','onPet','galgan');await check('Julia pets Galgan');
  const couch=(await local('david')).world.objects.find(o=>o.id==='couch');
  await cb('david','onMove',{id:'couch',x:couch.x+60,y:couch.y+20},'house');await check('David drags the sofa');
  for(let i=0;i<5;i++){await cb('david','onTap','sernik',{x:0,y:0});await wait(120);}await check('David pesters Sernik until he wanders off');
  await pages.julia.evaluate(()=>document.getElementById('open-tools')?.click());await wait(200);
  await pages.julia.evaluate(()=>[...document.querySelectorAll('#residents button')].find(b=>b.title==='Monki')?.click());await wait(500);
  say('Julia opened Monki\'s panel:',await pages.julia.evaluate(()=>document.querySelector('#sheet-body h2')?.textContent));
  const hatPicked=await pages.julia.evaluate(()=>{const b=document.querySelector('#sheet-body .item-grid button');const l=b?.getAttribute('aria-label');b?.click();return l;});await wait(500);
  say('she chose:',hatPicked);await check('Julia puts a hat on Monki');
  await pages.david.evaluate(()=>document.getElementById('draw').click());await wait(400);
  await pages.david.evaluate(()=>{const c=document.querySelector('#sheet-body canvas.draw-pad'),r=c.getBoundingClientRect();const ev=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{clientX:r.left+x,clientY:r.top+y,pointerId:1,bubbles:true}));ev('pointerdown',40,40);for(let i=0;i<12;i++)ev('pointermove',40+i*15,40+i*8);ev('pointerup',220,136);});
  await press('david','Hang it up');await wait(400);await check('David hangs a drawing for her');
  say('Julia\'s card now:',JSON.stringify(await card('julia')));
  await pages.julia.evaluate(()=>document.getElementById('start-adventure').click());await wait(700);
  say('Julia opened:',await pages.julia.evaluate(()=>document.querySelector('#sheet-body h2')?.textContent));
  const reacted=await pages.julia.evaluate(()=>{const b=document.querySelector('#sheet-body .reactions button');b?.click();return b?.getAttribute('aria-label');});await wait(500);await closeSheet('julia');
  say('she reacted:',reacted);await check('Julia opens the drawing and reacts');
  say('David\'s card now:',JSON.stringify(await card('david')));
  // The frog, together.
  for(const who of ['david','julia']){await pages[who].evaluate(()=>document.getElementById('open-tools')?.click());await wait(150);
    await pages[who].evaluate(()=>document.getElementById('together')?.click());await wait(400);await press(who,'Pick a frog together');await wait(400);
    await pages[who].evaluate(i=>document.querySelectorAll('#sheet-body .frog-pick')[i]?.click(),who==='david'?1:1);await wait(400);await closeSheet(who);}
  await check('both pick a frog');
  const frogs=await pages.julia.evaluate(()=>{const c=JSON.parse(localStorage.getItem('monki-world-v1')).world.choices;return JSON.stringify(c.revealed.at(-1)||c);});say('frog result on her phone:',frogs);
  // The story: he plays it through; her phone should move on too (the progress is shared).
  say('before: her card',JSON.stringify(await card('julia')),'· his card',JSON.stringify(await card('david')));
  await cb('david','onIncident');await wait(700);
  for(let k=0;k<3;k++){const r=await pages.david.evaluate(playStep('through'));if(['chapter','stalled','no game'].includes(r.done))break;await wait(300);}
  await wait(1500);
  await check('David plays the story to the end');
  say('after: her card',JSON.stringify(await card('julia')),'· his card',JSON.stringify(await card('david')));
  // Tidy on her side.
  await pages.julia.evaluate(()=>document.getElementById('tidy-room').click());await wait(6500);await check('Julia tidies the room');
  // Offline: she does things on the bus with no signal; they arrive when she is back.
  await pages.julia.setOfflineMode(true);
  await cb('julia','onPet','sernik');const monki=(await local('julia')).world.actors.monki;
  await cb('julia','onMove',{id:'monki',x:120,y:300},'house');await wait(600);
  const waiting=(await local('julia')).pending.length;say('offline, waiting on her phone:',waiting,'changes');
  await pages.julia.setOfflineMode(false);await check('Julia\'s offline changes arrive when she is back online');
  await close('julia');await close('david');

  // Next day, both at once (a call): each has a daily situation of their own.
  await later(21*HOUR);
  await open('julia');await open('david');await wait(800);
  say('day 1 together · her card',JSON.stringify(await card('julia')),'· his card',JSON.stringify(await card('david')));
  await check('day 1: both open at once, each with a daily situation');
  const hers=(await local('julia')).world.life.finds.julia;
  if(hers?.fresh){
    const a=(await local('david')).world.actors[hers.actor];
    await cb('david','onMove',{id:hers.actor,x:300,y:295},'house');
    await check(`day 1: David moves ${hers.actor}, the one in Julia's situation`);
    for(let k=0;k<3&&(await card('julia')).button!=='Poke';k++){say('Julia first answers:',JSON.stringify(await card('julia')));await pages.julia.evaluate(()=>document.getElementById('start-adventure').click());await wait(700);}
    say('Julia\'s situation:',JSON.stringify(await card('julia')),'· on David\'s phone that one is wearing',(await drawn('david')).actors[hers.actor].hat);
    await pages.julia.evaluate(()=>document.getElementById('start-adventure').click());await wait(900);
    say('after her poke:',JSON.stringify(await card('julia')),'· on David\'s phone it now wears',(await drawn('david')).actors[hers.actor].hat);
    await check('day 1: Julia pokes her situation');
  }
  await close('julia');await close('david');
  for(const [k,first] of [[2,'david'],[3,'julia']]){
    await later(21*HOUR);
    const second=first==='julia'?'david':'julia';
    await open(first);await wait(700);say(`day ${k}, ${first} opens it:`,JSON.stringify(await card(first)));
    const c=await card(first);
    if(c.button==='Ha!'||c.button==='♡'){await pages[first].evaluate(()=>document.getElementById('start-adventure').click());await wait(600);say(`${first} answers → card now`,JSON.stringify(await card(first)));}
    await open(second);await wait(700);say(`day ${k}, ${second} opens it too:`,JSON.stringify(await card(second)));
    {const f=(await local(second)).world.life.finds[second];const fresh=f?.fresh&&now-f.at<2*HOUR;
     results.push({label:`day ${k}: ${second}, opening right after ${first}, has today's situation`,problems:f?.fresh&&!fresh?[`${second}'s situation is from ${Math.round((now-f.at)/HOUR)}h ago`]:[],notes:[]});
     console.log(`${f?.fresh&&!fresh?'✗':'✓'} day ${k}: ${second}, opening right after ${first}, has today's situation${f?.fresh&&!fresh?` — it is from ${Math.round((now-f.at)/HOUR)}h ago`:''}`);}
    await check(`day ${k}: both open`);
    await close(first);await close(second);
  }
}catch(e){console.log('\nSTOPPED:',e.stack?.split('\n').slice(0,3).join(' '));errors.push('stopped: '+e.message);}
finally{
  await browser.close();srv.kill();await rm(data,{recursive:true,force:true});
  const bad=results.filter(r=>r.problems.length);
  console.log(`\n${results.length} checks · ${bad.length} with problems · ${results.reduce((n,r)=>n+r.notes.length,0)} differences by design`);
  if(errors.length)console.log('PAGE ERRORS:\n  '+[...new Set(errors)].join('\n  '));
  process.exitCode=bad.length||errors.length||results.length<19?1:0;
  // Something of the browser's can keep Node alive after a full pass (it once sat there for
  // ten minutes). Give the report time to flush, then leave with the verdict above.
  setTimeout(()=>process.exit(),2000).unref();
}

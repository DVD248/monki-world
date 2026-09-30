import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const data=await mkdtemp(path.join(os.tmpdir(),'monki-refinement-')),port=57000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser,page;const errors=[];
async function shot(name){await page.screenshot({path:path.join(output,`v12-${name}.png`)});}
async function at(p){return page.evaluate(p=>window.sc.screenPoint(p),p);}
async function buttonPoint(id){return page.$eval(id,e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});}
async function dragStart(from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});}
async function micro(p){return page.$eval('#micro',(c,p)=>{const r=c.getBoundingClientRect();return{x:r.left+p.x*r.width/400,y:r.top+p.y*r.height/430};},p);}
try{
  for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(60);}
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
  page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844,deviceScaleFactor:2});await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const {Scene}=await import('./scene.js');const draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.sc=this;return draw.call(this,t);};const {AdventurePlayer}=await import('./adventure-player.js');const enter=AdventurePlayer.prototype.enter;AdventurePlayer.prototype.enter=function(...args){window.game=this;return enter.apply(this,args);};});await delay(80);await page.click('#close-sheet');
  assert.equal(await page.$('#help-room'),null);
  assert.ok(await page.evaluate(()=>sc.canvas.width===780&&Math.abs(sc.canvas.height-1688)<=1));
  // Pokes remain pokes; named portraits in the drawer open options.
  const sy=await page.evaluate(()=>sc.sy);
  let dog=await page.evaluate(()=>sc.state.actors.sernik),p=await at({x:dog.x+10,y:dog.y-12/sy});
  await page.mouse.click(p.x,p.y);assert.equal(await page.$eval('#sheet',e=>e.open),false);
  assert.equal(await page.$('#resident-options'),null);await page.click('#open-tools');await shot('residents-drawer');
  await page.click('[aria-label="Sernik"]');assert.equal(await page.$eval('#sheet',e=>e.open),true);await page.click('#close-sheet');
  // The roll follows the finger, leaves an empty slot, and is deposited back there.
  const start=await buttonPoint('#play-ball'),end=await at({x:86,y:238});await dragStart(start,end);
  assert.equal(await page.$eval('#play-ball',e=>e.classList.contains('toy-away')),true);
  assert.ok(await page.evaluate(()=>!!sc.toys.pointer));await shot('paper-in-hand');
  await page.mouse.up();assert.ok(await page.evaluate(()=>sc.toys.shots.length===1));
  assert.ok(await page.evaluate(()=>Math.abs(sc.toys.shots[0].origin.x-sc.toys.shots[0].home.x)>20));
  await delay(2400);await shot('paper-returning');
  await page.waitForFunction(()=>!window.sc.toys.shots.length);
  assert.equal(await page.$eval('#play-ball',e=>e.classList.contains('toy-away')),false);
  assert.equal(await page.evaluate(()=>sc.override.sernik),undefined);await page.click('#put-away-toy');
  // The wand remains where it was placed; small taps and large aimed shots differ.
  await dragStart(await buttonPoint('#play-bubbles'),await at({x:260,y:235}));await shot('wand-in-hand');
  assert.equal(await page.$eval('#play-bubbles',e=>e.classList.contains('toy-away')),true);await page.mouse.up();
  assert.ok(await page.evaluate(()=>!!sc.toys.wand));assert.equal(await page.$eval('#play-bubbles',e=>e.classList.contains('toy-away')),true);
  for(let i=0;i<7;i++)await page.click('#play-bubbles');assert.ok(await page.evaluate(()=>sc.toys.bubbles.every(b=>b.r===12)));await shot('small-bubbles');
  const wand=await page.evaluate(()=>sc.toys.wand);await dragStart(await at({x:wand.x,y:wand.y-12/sy}),await at({x:wand.x,y:wand.y-185/sy}));await shot('aimed-large-bubble');await page.mouse.up();
  assert.ok(await page.evaluate(()=>sc.toys.bubbles.some(b=>b.r>45)));assert.deepEqual(await page.evaluate(()=>sc.toys.wand),wand);await page.click('#put-away-toy');
  assert.equal(await page.$eval('#play-bubbles',e=>e.classList.contains('toy-away')),false);
  // Sleeping and belly-up poses are visibly distinct; hats stay attached.
  await page.evaluate(()=>{for(const id of ['sernik','galgan']){sc.state.actors[id].mood='sleep';sc.state.actors[id].hat='beret';sc.state.actors[id].petAt=0;delete sc.petEffects[id];}});await delay(80);await shot('sleeping-dogs');
  await page.evaluate(()=>{for(const id of ['sernik','galgan'])sc.petEffects[id]={at:performance.now(),power:1};});await delay(80);await shot('belly-dogs');
  assert.ok(await page.evaluate(async()=>{const {character}=await import('./art.js'),a=document.createElement('canvas'),b=document.createElement('canvas');a.width=b.width=180;a.height=b.height=140;character(a.getContext('2d'),'sernik',80,100,{mood:'sleep',hat:'beret'});character(b.getContext('2d'),'sernik',80,100,{pet:1,hat:'beret'});return a.toDataURL()!==b.toDataURL();}));
  // Light transform must track the same moving lamp, not the saved location.
  await page.evaluate(async()=>{const {ambienceAt}=await import('./shared/ambience.js');sc.timeOverride=0;sc.ambience=ambienceAt(Date.now(),0);sc.night=true;const original=sc.c.createRadialGradient.bind(sc.c);sc.c.createRadialGradient=(...args)=>{window.glowX=sc.c.getTransform().e;return original(...args);};});await delay(1100);
  const lamp=await page.evaluate(()=>{const h=sc.hitboxes.find(h=>h.id==='lamp');return{x:h.x+4,y:h.y+h.h/2};});
  await dragStart(await at(lamp),await at({x:85,y:265}));assert.equal(await page.evaluate(()=>sc.moving?.id),'lamp');await delay(100);await shot('dragged-lamp');
  assert.ok(await page.evaluate(()=>Math.abs(glowX-(sc.moving.x+sc.ox)*sc.resolution)<1));await page.mouse.up();
  assert.equal(await page.evaluate(()=>sc.animations.lamp.kind),'land');
  const david=await page.evaluate(()=>sc.state.actors.david);await dragStart(await at({x:david.x,y:david.y-16/sy}),await at({x:190,y:260}));assert.equal(await page.evaluate(()=>sc.moving?.id),'david');await shot('carried-resident');await page.mouse.up();
  await page.click('#tidy-room');await delay(900);await shot('tidy-dust');await delay(1150);await shot('tidy-finish');await page.waitForFunction(()=>!sc.tidying);
  await page.click('[aria-label="Garden"]');
  for(const weather of ['clear','rain','snow','wind','cloudy']){await page.evaluate(async w=>{const {ambienceAt}=await import('./shared/ambience.js');sc.timeOverride=12;sc.ambience=ambienceAt(Date.now(),12);sc.night=false;sc.weatherOverride=w;},weather);await delay(weather==='clear'?1100:150);await shot('garden-'+weather);}
  // Rain reaches the lower half of a tall viewport, and changes between frames.
  assert.ok(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=sc.width;canvas.height=sc.height;const c=canvas.getContext('2d');sc.weather='rain';c.translate(sc.ox,sc.oy);c.scale(1,sc.sy);sc.weatherFront(c,1);const a=canvas.toDataURL(),d=c.getImageData(0,sc.height*.55,sc.width,sc.height*.2).data;let ink=0;for(let i=3;i<d.length;i+=4)if(d[i])ink++;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.translate(sc.ox,sc.oy);c.scale(1,sc.sy);sc.weatherFront(c,1.3);return ink>40&&a!==canvas.toDataURL();}));
  // Throwing at the empty side visibly misses; landing in the opening visibly scores.
  await page.click('#test-open');await page.select('#test-pace','0');await page.click('[data-test-chapter="paper-parade"][data-test-step="0"]');
  await dragStart(await micro({x:85,y:345}),await micro({x:55,y:190}));await shot('basket-aim');await page.mouse.up();
  await page.waitForFunction(()=>game.throwFeedback?.hit===false);assert.equal(await page.evaluate(()=>game.hits),0);assert.equal(await page.evaluate(()=>game.misses),1);await shot('basket-miss');
  await dragStart(await micro({x:85,y:345}),await micro(await page.evaluate(()=>game.aimTarget())));await page.mouse.up();
  await page.waitForFunction(()=>game.throwFeedback?.hit===true);assert.equal(await page.evaluate(()=>game.hits),1);await shot('basket-hit');await page.click('#leave-game');
  assert.deepEqual(errors,[]);console.log('PASS: display-resolution canvas; physical paper pickup/fetch; placed wand with small taps and large aimed bubbles; accessible poke/menu split; distinct dog poses; moving lamp light; carry/drop and cleanup animation; garden/full-viewport weather; visible basket miss and hit feedback.');
}catch(e){if(page)await shot('failure');throw e;}
finally{if(browser){await Promise.race([browser.close().catch(()=>{}),delay(2500)]);if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');await browser.disconnect();}server.kill();await delay(100);await rm(data,{recursive:true,force:true});}
process.exit(0);

import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const data=await mkdtemp(path.join(os.tmpdir(),'monki-flow-')),port=44000+Math.floor(Math.random()*5000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
const browsers=[],errors=[];let page;
const systemChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const launch=()=>puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(systemChrome)?systemChrome:puppeteer.executablePath()),headless:true,args:['--no-sandbox']});
async function clickText(p,text){const handle=await p.evaluateHandle(text=>[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);const b=handle.asElement();if(!b)throw Error('Missing button: '+text);await b.click();await handle.dispose();}
async function pressSheet(p,text){await p.evaluate(text=>{const b=[...document.querySelectorAll('#sheet[open] button')].find(b=>b.textContent.trim()===text&&!b.disabled);if(!b)throw Error('Missing button: '+text);b.click();},text);}
async function pressEditor(p,text){await p.evaluate(text=>{const b=[...document.querySelectorAll('#decor-editor button')].find(b=>b.textContent.trim()===text&&!b.disabled);if(!b)throw Error('Missing editor button: '+text);b.click();},text);}
async function point(p,selector,x,y){return p.$eval(selector,(c,{x,y,world})=>{c.scrollIntoView({block:'center'});if(world){x+=window.__scene.ox;y=(y-22)*(window.__scene.sy||1)+window.__scene.oy;}const r=c.getBoundingClientRect();return{x:r.left+x/(world?window.__scene.width:c.id==='micro'?400:c.width)*r.width,y:r.top+y/(world?window.__scene.height:c.id==='micro'?430:c.height)*r.height};},{x,y,world:selector==='#world'});}
async function clickCanvas(p,selector,x,y){const at=await point(p,selector,x,y);await p.mouse.click(at.x,at.y);}
async function drag(p,selector,a,b,hold=70){const from=await point(p,selector,a.x,a.y),to=await point(p,selector,b.x,b.y);await p.mouse.move(from.x,from.y);await p.mouse.down();await delay(hold);await p.mouse.move(to.x,to.y,{steps:10});await p.mouse.up();}
async function dockDrag(p,selector,b,hold=70){const from=await p.$eval(selector,e=>{const r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}),to=await point(p,'#world',b.x,b.y);await p.mouse.move(from.x,from.y);await p.mouse.down();await delay(hold);await p.mouse.move(to.x,to.y,{steps:10});await p.mouse.up();}
async function hooks(p){await p.evaluate(async()=>{const {AdventurePlayer}=await import('./adventure-player.js');const enter=AdventurePlayer.prototype.enter;AdventurePlayer.prototype.enter=function(...a){window.__game=this;return enter.apply(this,a);};const {Scene}=await import('./scene.js');const draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.__scene=this;return draw.call(this,t);};});await delay(80);}
const local=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-v1')));
const shot=filename=>page.screenshot({path:path.join(output,filename),fullPage:true});
async function fixture(name){await page.click('#test-open');await page.evaluate(()=>{document.querySelectorAll('#sheet-body details').forEach(d=>d.open=true);});await clickText(page,name);}
async function tool(p,selector){await p.click('#open-tools');await p.click(selector);}
try{
  for(let i=0;i<70;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(80);}
  browsers.push(await launch(),await launch());page=await browsers[0].newPage();const partner=await browsers[1].newPage();
  for(const p of [page,partner]){await p.setViewport({width:390,height:844,deviceScaleFactor:2});p.on('pageerror',e=>errors.push(e.message));}
  await page.goto(base,{waitUntil:'networkidle0'});await hooks(page);await clickText(page,'Julia');
  assert.equal(await page.$eval('#microgame',e=>e.open),false,'choosing a seat should open the room, not a task');
  // Before the link goes out: one thing for David to find first. Skippable.
  assert.equal(await page.$eval('#sheet-body h2',e=>e.textContent),'Something for David to find.');await clickText(page,'Later');
  // The first story waits until he is in, so his first look is never "More later".
  assert.equal(await page.$eval('#story-title',e=>e.textContent),'The first one waits for David.');
  assert.equal(await page.$eval('#start-adventure',e=>e.textContent),'Invite David');
  const invited=await local(page);
  await partner.goto(`${base}/#join=${invited.room}.${invited.invite}`,{waitUntil:'networkidle0'});await clickText(partner,'Enter the world');await partner.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1'))?.actor==='david');
  await partner.waitForFunction(()=>document.querySelector('#sheet-body h2')?.textContent==='Julia made this for you.',{timeout:5000});
  assert.equal(await partner.$eval('#sheet-body p',e=>e.textContent),'Sernik, Galgan and Monki live here now.','his first look says who made it and whose dogs these are');
  assert.equal(await partner.$eval('#story-title',e=>e.textContent),'Monki is leaving.','his first look has the story in it');
  // Coming back later through the same link in the chat is simply coming back: no "Come in",
  // no first visit again, the same seat, and the link is not left in the address bar.
  const seat=(await local(partner)).token;await partner.evaluate(()=>document.getElementById('sheet').close());
  await partner.goto('about:blank');await partner.goto(`${base}/#join=${invited.room}.${invited.invite}`,{waitUntil:'networkidle0'});await delay(700);
  assert.equal(await partner.evaluate(()=>document.getElementById('sheet').open?document.querySelector('#sheet-body h2')?.textContent:null),null,'reopening the invitation should open the world');
  assert.equal(await partner.evaluate(()=>location.hash),'');assert.equal((await local(partner)).token,seat);
  await page.reload({waitUntil:'networkidle0'});await hooks(page);
  assert.equal(await page.$eval('#story-title',e=>e.textContent),'Monki is leaving.');
  await shot('monki-room-first.png');
  await page.click('#start-adventure');await page.waitForFunction(()=>window.__game?.step===0);
  await page.click('#pause-game');const frozen=await page.evaluate(()=>window.__game.time);await delay(150);assert.equal(await page.evaluate(()=>window.__game.time),frozen);await page.click('#resume-game');
  await page.click('#leave-game');await page.reload({waitUntil:'networkidle0'});await hooks(page);
  assert.equal(await page.$eval('#start-adventure',e=>e.textContent),'Play');
  assert.equal((await local(page)).world.journeys.julia.index,0,'leaving an encounter creates no progress debt');
  await page.click('#start-adventure');
  for(let i=0;i<3;i++){const e=await page.evaluate(()=>window.__game.entities.find(e=>e.alive));await clickCanvas(page,'#micro',e.x,e.y);await delay(90);}
  await page.waitForFunction(()=>!document.querySelector('#microgame').open);
  assert.equal(await page.$eval('#sheet',e=>e.open),false,'an ending should return directly to the shared room');
  await shot('monki-room-after-incident.png');
  await page.waitForFunction(()=>window.__scene.hitboxes.some(h=>h.action==='onMoment'));
  {const point=await page.evaluate(()=>{const h=window.__scene.hitboxes.find(h=>h.action==='onMoment');return window.__scene.screenPoint({x:h.x+h.w/2,y:h.y+h.h/2});});await page.mouse.click(point.x,point.y);}
  assert.equal(await page.$eval('#sheet-body h2',e=>e.textContent),'That happened.');await page.click('#close-sheet');
  let saved=await local(page);assert.equal(saved.world.journeys.julia.index,1);assert.equal(saved.world.journeys.david.index,1);
  assert.equal(saved.world.actors.monki.hat,'cone');assert.ok(saved.world.unlocked.includes('garden'));
  assert.ok(await page.$('#open-tools.new-decor'),'The player who finished the adventure can find her new decor');
  // Already in: he sees her finished story arrive, not a second copy of it.
  await partner.waitForFunction(()=>document.getElementById('story-title').textContent==='The house is yours.',{timeout:9000});
  await partner.waitForFunction(()=>document.querySelector('#open-tools.new-decor'),{timeout:9000});
  assert.equal(await partner.$eval('#microgame',e=>e.open),false);
  assert.equal((await local(partner)).world.journeys.david.index,1,'the partner must not replay Monki’s resolved balloons');
  // Decorating is the same shared room, not a browser-only theme. Two phones
  // receive both a changed wall and a newly purchased piece through the API.
  await tool(page,'#decorate');await pressEditor(page,'Surfaces');await page.click('[aria-label="Walls: Butter"]');await pressEditor(page,'Done');
  assert.equal(await page.$('#open-tools.new-decor'),null,'Julia has seen her unlock');
  assert.ok(await partner.$('#open-tools.new-decor'),'David still has his own unseen unlock');
  await page.evaluate(()=>document.querySelector('[aria-label="Garden"]').click());await tool(page,'#decorate');await page.click('[aria-label="Place House plant"]');
  const chairSpot=await page.evaluate(()=>window.__scene.screenPoint({x:188,y:270}));await page.mouse.click(chairSpot.x,chairSpot.y);await pressEditor(page,'Done');await page.evaluate(()=>document.querySelector('[aria-label="Home"]').click());
  await partner.waitForFunction(()=>{const world=JSON.parse(localStorage.getItem('monki-world-v1'))?.world;return world?.catalog?.styles?.house?.wall==='butter'&&world.objects.some(object=>object.type==='plant'&&object.room==='garden');},{timeout:9000});
  await page.click('#play-ball');assert.equal(await page.evaluate(()=>window.__scene.toys.shots.length),0);
  await dockDrag(page,'#play-ball',{x:70,y:232});await delay(650);assert.equal(await page.evaluate(()=>window.__scene.toys.shots.length),1);await shot('monki-paper-fetch.png');
  await page.waitForFunction(()=>window.__scene.toys.shots.length===0);assert.equal(await page.evaluate(()=>window.__scene.override.sernik),undefined);saved=await local(page);assert.ok(saved.world.log.some(l=>l.action==='toy'&&l.item==='paper'));assert.ok(!saved.world.traces.some(t=>t.type==='paper'));
  await page.click('#play-bubbles');const a=await page.evaluate(()=>window.__scene.state.actors.monki),sy=await page.evaluate(()=>window.__scene.sy);await dockDrag(page,'#play-bubbles',{x:a.x,y:a.y+100/sy+22});
  const wand=await page.evaluate(()=>window.__scene.toys.wand);await drag(page,'#world',{x:wand.x,y:wand.y-12/sy+22},{x:wand.x,y:wand.y-185/sy+22});
  await page.waitForFunction(()=>window.__scene.toys.bubbles.some(b=>b.actor),{timeout:7000});await shot('monki-bubble-capture.png');const bubble=await page.evaluate(()=>window.__scene.toys.bubbles.find(b=>b.actor));await clickCanvas(page,'#world',bubble.x,bubble.y+22);
  await partner.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.traces.some(t=>t.type==='soap'));
  await page.click('#put-away-toy');
  // Two phones see the same freezer batch, reservation and wearable result.
  await page.click('#open-tools');await clickText(page,'Open the fridge');
  assert.equal(await page.$eval('.fridge-interior .primary-button',b=>b.disabled),true);
  for(const [width,height]of [[320,568],[844,390],[390,844]]){await page.setViewport({width,height,deviceScaleFactor:2});assert.ok(await page.$eval('#sheet',s=>s.scrollWidth<=s.clientWidth&&s.getBoundingClientRect().bottom<=innerHeight));assert.ok(await page.$eval('.fridge-ingredient',b=>b.getBoundingClientRect().height>=44));}
  await page.click('.fridge-ingredient[aria-label="Ice cream"]');await page.click('.fridge-ingredient[aria-label="Potato"]');await shot('v12-freezer-ingredients.png');
  await clickText(page,'Freeze');await page.waitForFunction(()=>!!document.querySelector('.fridge-recipe canvas[width="80"]'));
  await clickText(page,'Leave for David');await shot('v12-freezer-gift.png');await page.click('#close-sheet');
  await partner.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.fridgeBox?.batch?.for==='david');
  if(await partner.$eval('#sheet',s=>s.open))await partner.click('#close-sheet');await partner.click('#open-tools');await clickText(partner,'Open the fridge');await clickText(partner,'Try it on');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.actors.david.hat==='snowflake');assert.equal((await local(page)).world.fridgeBox.batch,null);
  // A real finger scribble, not a manufactured operation.
  await tool(page,'#draw');await drag(page,'.draw-pad',{x:55,y:150},{x:245,y:55});await clickText(page,'Hang it up');
  await partner.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.life.mail.some(m=>m.kind==='drawing'));await tool(partner,'#last-trace');await clickText(partner,'Julia drew you something');await partner.click('[aria-label="React laugh"]');
  await page.waitForFunction(()=>document.querySelector('#story-title').textContent==='David laughed at your drawing.');await page.click('#start-adventure');await shot('monki-mailbox-reaction.png');await page.click('#close-sheet');
  // Outfit, saved postcard, recipient, and reaction travel through the real API.
  await tool(page,'#wardrobe');await clickText(page,'Make a postcard');await page.select('select[aria-label="Where"]','night');await page.select('select[aria-label="Hat"]','bow');await shot('monki-postcard-editor.png');
  const downloadSession=await page.createCDPSession();await downloadSession.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:output,eventsEnabled:true});let downloaded=false;downloadSession.on('Browser.downloadWillBegin',()=>{downloaded=true;});
  await clickText(page,'Save picture to this device');await delay(350);assert.ok(downloaded,'PNG download should start');await downloadSession.detach();
  await clickText(page,'Leave for David');await partner.click('#close-sheet');await partner.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.life.mail.some(m=>m.kind==='postcard'));await partner.click('#start-adventure');assert.ok(await partner.$('.postcard-art'));await partner.click('[aria-label="React love"]');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world.life.mail.some(m=>m.kind==='postcard'&&m.reaction==='love'));
  // A fresh sandbox cannot send anything to the real room or alter its save.
  const realBefore=await page.evaluate(()=>localStorage.getItem('monki-world-v1')),apiWrites=[];
  await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});await hooks(page);page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/api/'))apiWrites.push(r.url());});await page.click('#close-sheet');
  await page.click('[aria-label="Garden"]');await shot('monki-garden.png');
  for(const w of ['rain','snow','wind','cloudy','clear']){await fixture(`Weather: ${w}`);assert.equal(await page.evaluate(()=>window.__scene.weatherOverride),w);await delay(90);}
  await fixture('Weather: rain');await shot('monki-garden-rain.png');await page.click('[aria-label="Roof"]');await fixture('Weather: clear');await shot('monki-roof.png');
  // Pixel regression: outside the roof polygon must not contain brown tile seams.
  const leak=await page.evaluate(()=>{const sc=window.__scene,c=sc.c,p=c.getImageData((sc.ox+350)*sc.resolution,(sc.oy+157*sc.sy)*sc.resolution,1,1).data;return [...p].slice(0,3).join(',')==='165,136,106';});assert.equal(leak,false);
  await page.click('#open-tools');await clickText(page,'Look through the telescope');await clickText(page,'Play');await page.waitForFunction(()=>window.__game.spec.kind==='trail');
  for(let i=0;i<6;i++){const p=await page.evaluate(()=>window.__game.path[window.__game.hits]);await clickCanvas(page,'#micro',p.x,p.y);}
  await page.waitForFunction(()=>window.__game.step===1);
  for(let i=0;i<2;i++){const p=await point(page,'#micro',200,320);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.waitForFunction(()=>window.__game.charge>=.67);await page.mouse.up();await delay(130);}
  await page.waitForFunction(()=>window.__game.step===2);await drag(page,'#micro',{x:80,y:343},{x:225,y:188});
  await page.waitForFunction(()=>!document.querySelector('#microgame').open);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world.life.places.sky.count),1);
  for(const id of ['beret-dog','chef','radio-head','rain-dog','sleepy','bath','party','pirate','sprout','paper-moth','garden-bee','moon-cap']){await fixture(`Discovery: ${id}`);await page.click('#start-adventure');for(let i=0;i<3;i++)await clickText(page,'Poke');await clickText(page,'Keep it');}
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world.life.collection.length),12);
  await fixture('Growing patch: stage 4');await page.click('#start-adventure');await clickText(page,'Pick it');assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world.life.plant.picked));await page.click('#close-sheet');
  await page.click('[aria-label="Garden"]');for(const name of ['Pond','Little house','Growing patch']){await page.click('#open-tools');await clickText(page,name);assert.ok(await page.$('#sheet[open]'));await page.click('#close-sheet');}
  await page.setViewport({width:320,height:568});await tool(page,'#surprise');await clickText(page,'Toilet paper');await shot('monki-paper-preview.png');
  assert.ok(await page.$eval('#sheet',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight;}));
  await page.click('#close-sheet');await page.click('#test-open');await shot('monki-test-lab-v5.png');
  await clickText(page,'Play normal short encounter');assert.equal(await page.evaluate(()=>window.__game.singleStep),true);await page.click('#leave-game');await page.click('#test-open');
  await page.select('#test-pace','1');await page.click('[data-test-chapter="pizza"][data-test-step="2"]');assert.equal(await page.evaluate(()=>window.__game.difficulty),1);await shot('monki-later-throw.png');
  assert.ok(await page.$eval('#microgame',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<=innerHeight;}));
  assert.equal(await page.evaluate(()=>localStorage.getItem('monki-world-v1')),realBefore);assert.deepEqual(apiWrites,[]);assert.deepEqual(errors,[]);
  console.log('PASS: room-first onboarding, pause/resume/reload without chapter debt, one-step encounter, shared progress and decor across two phones, fetch return, aimed bubble capture, shared freezer mixing/reservation/wearing, two-player drawings/postcards/reactions, PNG download, 12 discoveries, plant bloom, weather, outdoor entry, roof clipping, 320px/landscape fridge, sandbox isolation.');
}catch(e){if(page)await page.screenshot({path:path.join(output,'monki-flow-failure.png'),fullPage:true});throw e;}
finally{for(const b of browsers){await Promise.race([b.close().catch(()=>{}),delay(2500)]);if(b.process()?.exitCode===null)b.process().kill('SIGTERM');await b.disconnect();}server.kill();await delay(100);if(path.basename(data).startsWith('monki-flow-'))await rm(data,{recursive:true,force:true});}
// Some Chrome builds retain a pipe after closing a download-enabled browser.
// All assertions and cleanup above have finished; do not leave the CLI hanging.
process.exit(0);

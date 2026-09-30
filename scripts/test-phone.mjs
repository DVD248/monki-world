import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const data=await mkdtemp(path.join(os.tmpdir(),'monki-phone-'));
const port=56000+Math.floor(Math.random()*4000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser,page;const errors=[];
async function clickText(text){const h=await page.evaluateHandle(text=>[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')].find(b=>b.textContent.trim()===text&&!b.disabled),text);assert.ok(h.asElement(),'Missing '+text);await h.asElement().click();await h.dispose();}
async function point(selector,x,y){return page.$eval(selector,(c,{x,y,world})=>{c.scrollIntoView({block:'center'});if(world){x+=window.__scene.ox;y=(y-22)*(window.__scene.sy||1)+window.__scene.oy;}const r=c.getBoundingClientRect();return{x:r.left+x/(world?window.__scene.width:c.id==='micro'?400:c.width)*r.width,y:r.top+y/(world?window.__scene.height:c.id==='micro'?430:c.height)*r.height};},{x,y,world:selector==='#world'});}
async function drag(selector,a,b,hold=30){const from=await point(selector,a.x,a.y),to=await point(selector,b.x,b.y);await page.mouse.move(from.x,from.y);await page.mouse.down();await delay(hold);await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();}
async function dockDrag(selector,b,hold=30){const r=await page.$eval(selector,b=>{const r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};}),to=await point('#world',b.x,b.y);await page.mouse.move(r.x,r.y);await page.mouse.down();await delay(hold);await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();}
async function fixture(label){await page.click('#test-open');await page.evaluate(()=>document.querySelectorAll('#sheet-body details').forEach(d=>d.open=true));await clickText(label);}
async function tool(selector){await page.click('#open-tools');await page.waitForFunction(()=>document.querySelector('#open-tools').getAttribute('aria-expanded')==='true');await page.click(selector);}
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world);
const shot=name=>page.screenshot({path:path.join(output,name),fullPage:false});
try{
  let healthy=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){healthy=true;break;}}catch{}await delay(60);}assert.ok(healthy);
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(chrome)?chrome:puppeteer.executablePath()),headless:true,args:['--no-sandbox']});
  page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.emulateTimezone('America/Los_Angeles');await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const {Scene}=await import('./scene.js');const draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.__scene=this;return draw.call(this,t);};const {AdventurePlayer}=await import('./adventure-player.js');const enter=AdventurePlayer.prototype.enter;AdventurePlayer.prototype.enter=function(...a){window.__game=this;return enter.apply(this,a);};});await delay(80);await page.click('#close-sheet');
  assert.ok(await page.evaluate(async()=>{const {centralTime}=await import('./shared/ambience.js');return [centralTime().label,centralTime(Date.now()-1100).label].includes(document.querySelector('#world-clock').textContent);}),'Clock must ignore device time zone');

  // Press again to put it away, or use the explicit exit while a throw is in flight.
  await page.click('#play-ball');assert.equal(await page.$eval('#play-ball',b=>b.getAttribute('aria-pressed')),'true');
  await page.click('#play-ball');assert.equal(await page.evaluate(()=>window.__scene.toys.mode),null);
  await page.click('#play-ball');await dockDrag('#play-ball',{x:70,y:230});await delay(350);
  assert.ok(await page.evaluate(()=>window.__scene.toys.shots.length));await page.click('#put-away-toy');
  assert.ok(await page.evaluate(()=>!window.__scene.toys.mode&&!window.__scene.toys.shots.length&&!window.__scene.override.sernik));
  await page.click('#play-bubbles');const monki=await page.evaluate(()=>window.__scene.state.actors.monki);
  const bubbleSy=await page.evaluate(()=>window.__scene.sy);
  await dockDrag('#play-bubbles',{x:monki.x,y:monki.y+100/bubbleSy+22});
  const placedWand=await page.evaluate(()=>window.__scene.toys.wand);
  await drag('#world',{x:placedWand.x,y:placedWand.y-12/bubbleSy+22},{x:placedWand.x,y:placedWand.y-185/bubbleSy+22});
  await page.waitForFunction(()=>window.__scene.toys.bubbles.some(b=>b.actor),{timeout:7000});await page.click('#put-away-toy');
  assert.ok(await page.evaluate(()=>!window.__scene.toys.bubbles.length&&!Object.keys(window.__scene.override).length));
  // Tidy also clears active toys and moves real, displaced furniture back home.
  await drag('#world',{x:118,y:185},{x:290,y:295},450);assert.notEqual((await state()).objects.find(o=>o.id==='couch').x,118);
  await page.click('#play-bubbles');await page.click('#tidy-room');assert.equal((await state()).objects.find(o=>o.id==='couch').x,118);assert.equal(await page.evaluate(()=>window.__scene.toys.mode),null);
  assert.ok(await page.evaluate(()=>!!window.__scene.tidying));await delay(750);await shot('monki-tidying-v7.png');await page.waitForFunction(()=>!window.__scene.tidying);assert.equal(await page.$eval('#tidy-room',b=>b.disabled),false);
  // Helpers borrowed from other locations go back; cleanup never changes their saved home.
  await fixture('Cleanup: visiting helpers');const homes=(await state()).actors;
  await page.click('#tidy-room');await delay(1200);
  assert.equal(await page.evaluate(()=>window.__scene.override.galgan.room),'house');
  await shot('monki-cleanup-guests.png');await page.waitForFunction(()=>!window.__scene.tidying);
  assert.deepEqual((await state()).actors,homes);assert.ok(await page.evaluate(()=>!Object.keys(window.__scene.override).length));
  await fixture('Residents: repair a piled-up save');
  const repaired=Object.values((await state()).actors);
  for(let i=0;i<repaired.length;i++)for(let j=i+1;j<repaired.length;j++)assert.ok(Math.hypot(repaired[i].x-repaired[j].x,repaired[i].y-repaired[j].y)>=4);
  // Restore the natural sandbox arrangement for the spatial gesture tests.
  await page.click('#test-open');await clickText('Fresh sandbox');await page.click('#close-sheet');
  // These assertions use saved coordinates on purpose. Live-walking pickup is
  // tested separately in test-ambient; keep the static gesture fixture still.
  await page.evaluate(()=>{const life=window.__scene.ambient;life.reset();life.nextAt=Infinity;});

  for(const dog of ['Sernik','Galgan']){
    await tool(`[aria-label="${dog}"]`);await clickText('Pet');
    const from=await point('.pet-pad',115,170),to=await point('.pet-pad',235,170);
    await page.mouse.move(from.x,from.y);await page.mouse.down();
    for(let i=0;i<4;i++){await page.mouse.move(to.x,to.y,{steps:14});await page.mouse.move(from.x,from.y,{steps:14});}
    await shot(`monki-pet-${dog.toLowerCase()}.png`);await page.mouse.up();
    assert.ok((await state()).actors[dog.toLowerCase()].petAt);await page.click('#close-sheet');
  }
  // Pet in the actual room. A local stroke does not move the dog or open a sheet.
  for(const dog of ['sernik','galgan']){
    let a=(await state()).actors[dog];await delay(1100);
    const from=await point('#world',a.x,a.y+5),to=await point('#world',a.x+19,a.y+5);
    await page.mouse.move(from.x,from.y);await page.mouse.down();
    for(let i=0;i<5;i++){await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.move(from.x,from.y,{steps:8});}
    assert.ok(await page.evaluate(d=>window.__scene.petEffects[d]?.power>.72,dog),'Stroke should relax the dog');
    await shot(`monki-room-pet-${dog}.png`);await page.mouse.up();
    let next=(await state()).actors[dog];assert.ok(next.petAt>a.petAt);assert.equal(next.x,a.x);assert.equal(next.y,a.y);assert.equal(await page.$eval('#sheet',s=>s.open),false);
    // Begin with a stroke, then pull away: no permanent pet/drag mode lock.
    const petAt=next.petAt;await delay(1100);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await delay(450);
    const targetX=a.x+(a.x>200?-70:70),end=await point('#world',targetX,a.y+30);await page.mouse.move(end.x,end.y,{steps:14});await page.mouse.up();
    next=(await state()).actors[dog];assert.ok(Math.abs(next.x-targetX)<2,`${dog}: ${next.x} != ${targetX}`);assert.equal(next.petAt,petAt,'A pull-away must not commit the provisional pet');
    await drag('#world',{x:next.x,y:next.y+5},{x:a.x,y:a.y+5});
  }
  // Trusted touch events follow the same path as a finger, not just mouse input.
  {
    const touch=await page.createCDPSession(),a=(await state()).actors.galgan;
    const start=await point('#world',a.x,a.y+5),near=await point('#world',a.x+18,a.y+5);
    const send=(type,p)=>touch.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{...p,id:0}]:[]});
    await delay(1100);await send('touchStart',start);
    for(let i=0;i<5;i++){await send('touchMove',near);await send('touchMove',start);}
    await send('touchEnd');let next=(await state()).actors.galgan;
    assert.ok(next.petAt>a.petAt,'Finger strokes should pet');assert.equal(next.x,a.x);
    const petAt=next.petAt,end=await point('#world',a.x+75,a.y+5);
    await send('touchStart',start);await send('touchMove',near);await send('touchMove',end);await send('touchEnd');
    next=(await state()).actors.galgan;assert.ok(Math.abs(next.x-a.x-75)<2,'Finger pull should move');assert.equal(next.petAt,petAt);
    await touch.detach();await drag('#world',{x:next.x,y:next.y+5},{x:a.x,y:a.y+5});
  }

  // Tall hats stay on-screen in all of the petting poses too.
  await tool('[aria-label="Sernik"]');await page.click('[aria-label="Wear Umbrella"]');
  await tool('[aria-label="Sernik"]');await clickText('Pet');await shot('monki-pet-tall-hat.png');await page.click('#close-sheet');

  await page.click('[aria-label="Garden"]');await fixture('Weather: clear');
  for(const time of ['Dawn','Midday','Dusk','Night']){await fixture(`Time: ${time}`);await page.$eval('#world',c=>c.scrollIntoView({block:'center'}));await delay(80);await shot(`monki-garden-${time.toLowerCase()}.png`);}
  await fixture('Time: Midday');await page.click('[aria-label="Roof"]');await page.$eval('#world',c=>c.scrollIntoView({block:'center'}));await shot('monki-roof-grounded.png');
  // Eight cards: one wrong pair closes, then every distinct pair can be completed.
  await page.click('#test-open');await page.select('#test-pace','1');await page.click('[data-test-chapter="pond-post"][data-test-step="2"]');
  assert.equal(await page.evaluate(()=>window.__game.cards.length),8);
  async function card(i){const p=await page.evaluate(i=>window.__game.cardAt(i),i),at=await point('#micro',p.x,p.y);await page.mouse.click(at.x,at.y);}
  const wrong=await page.evaluate(()=>window.__game.cards.findIndex(c=>c.value!==window.__game.cards[0].value));await card(0);await card(wrong);
  await page.waitForFunction(()=>window.__game.matchWait<=0);assert.equal(await page.evaluate(()=>window.__game.cards.filter(c=>c.open).length),0);
  await shot('monki-eight-card-match.png');
  for(let value=0;value<4;value++){const indices=await page.evaluate(v=>window.__game.cards.flatMap((c,i)=>c.value===v?[i]:[]),value);for(const i of indices)await card(i);}
  assert.equal(await page.evaluate(()=>window.__game.hits),4);await page.click('#leave-game');
  await page.click('[aria-label="Home"]');
  // Fast real taps anywhere on the wand button must never act as pops.
  await page.click('#play-bubbles');await dockDrag('#play-bubbles',{x:45,y:220});
  await page.evaluate(()=>{window.__pops=0;const toys=window.__scene.toys,pop=toys.pop.bind(toys);toys.pop=b=>{window.__pops++;return pop(b);};});
  for(let i=0;i<8;i++)await page.click('#play-bubbles');
  assert.ok(await page.evaluate(()=>window.__scene.toys.bubbles.length>=8));assert.equal(await page.evaluate(()=>window.__pops),0);
  await page.click('#put-away-toy');await page.click('#play-bubbles');await dockDrag('#play-bubbles',{x:45,y:220});
  const wand=await page.evaluate(()=>window.__scene.screenPoint({x:window.__scene.toys.wand.x,y:window.__scene.toys.wand.y-12/window.__scene.sy}));for(let i=0;i<7;i++)await page.mouse.click(wand.x,wand.y);
  assert.ok(await page.evaluate(()=>window.__scene.toys.bubbles.length>=7));assert.equal(await page.evaluate(()=>window.__pops),0);
  assert.equal(await page.evaluate(()=>new Set(window.__scene.toys.bubbles.map(b=>b.r)).size),1,'Random directions must not randomize size');
  assert.ok(await page.evaluate(()=>new Set(window.__scene.toys.bubbles.map(b=>b.vx.toFixed(1))).size>1),'Directions should vary');
  await shot('monki-bubble-spam-v7.png');await page.click('#put-away-toy');
  assert.equal(await page.$eval('body',e=>getComputedStyle(e).userSelect),'none');
  await page.click('#test-open');assert.equal(await page.$eval('input[type="search"]',e=>getComputedStyle(e).userSelect),'text');await page.click('#close-sheet');
  // Actual audio graph and trusted tap unlock, with a feature-detected session API.
  await page.evaluate(async()=>{localStorage.setItem('monki-sound','false');localStorage.removeItem('monki-sound-v2');const {Sounds}=await import('./audio.js');window.__audioTest=new Sounds();Object.defineProperty(navigator,'audioSession',{configurable:true,value:{type:'auto'}});});
  const touch=await page.createCDPSession();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:20,y:200}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>window.__audioTest.context?.state==='running');assert.ok(await page.evaluate(()=>window.__audioTest.enabled));assert.equal(await page.evaluate(()=>navigator.audioSession.type),'playback');
  const amplitude=await page.evaluate(async()=>{const s=window.__audioTest,a=s.context.createAnalyser();a.fftSize=2048;s.master.connect(a);s.play('win');await new Promise(r=>setTimeout(r,70));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);a.disconnect();return Math.max(...data.map(Math.abs));});assert.ok(amplitude>.001,'Audio must generate non-silent samples');
  await page.waitForFunction(()=>window.__audioTest.petBuffers.pet&&window.__audioTest.petBuffers['pet-long']);
  const petAmplitude=await page.evaluate(async()=>{const s=window.__audioTest,a=s.context.createAnalyser();a.fftSize=2048;s.master.connect(a);s.play('pet');await new Promise(r=>setTimeout(r,110));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);a.disconnect();return Math.max(...data.map(Math.abs));});assert.ok(petAmplitude>.005,'The short petting clip must play through the mobile audio graph');
  await new Promise(r=>setTimeout(r,250));
  const strokeAmplitude=await page.evaluate(async()=>{const s=window.__audioTest,a=s.context.createAnalyser();a.fftSize=2048;s.master.connect(a);s.play('pet-long');await new Promise(r=>setTimeout(r,160));const data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);a.disconnect();return Math.max(...data.map(Math.abs));});assert.ok(strokeAmplitude>.005,'The long petting clip must play through the mobile audio graph');
  await page.evaluate(()=>window.__audioTest.toggle());assert.equal(await page.evaluate(()=>window.__audioTest.master.gain.value),0);
  assert.equal(await page.evaluate(async()=>{const {Sounds}=await import('./audio.js');return new Sounds().enabled;}),false,'A newly chosen mute should persist');
  await page.evaluate(()=>window.__audioTest.toggle());await touch.detach();
  // The world never overflows the phone, and the navigation remains within thumb reach.
  for(const [width,height]of [[390,844],[320,568],[844,390]]){
    await page.setViewport({width,height});
    if(!await page.$eval('[aria-label="Home"]',b=>b.classList.contains('active')))await page.click('[aria-label="Home"]');
    await page.evaluate(()=>scrollTo(0,0));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px horizontal overflow`);
    assert.ok(await page.$eval('#world',c=>{const r=c.getBoundingClientRect();return r.left===0&&r.top===0&&r.width===innerWidth&&Math.abs(r.height-innerHeight)<2;}),'World must fill the phone, not a card');
    if(width===844)assert.ok(await page.$eval('#world',c=>c.getBoundingClientRect().top<160),'Landscape world should not sit below a screenful of headers');
    assert.equal(await page.$eval('#room-tools',n=>n.matches(':popover-open')),false);
    assert.ok(await page.$eval('.toy-bar',n=>{const r=n.getBoundingClientRect();return r.bottom<=innerHeight&&r.bottom>=innerHeight-25&&r.top>0;}));
    assert.equal(await page.$eval('.story-card',n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
    assert.ok(await page.$eval('.play-button',n=>{const r=n.getBoundingClientRect();return parseFloat(getComputedStyle(n).fontSize)>=16&&r.height>=44;}),'Readable, finger-sized primary action');
    assert.ok(await page.$eval('.toy-bar>button',n=>parseFloat(getComputedStyle(n).fontSize)>=14));
    assert.equal(await page.evaluate(()=>window.__scene.actorScale),1.4);
    if(width<height)assert.ok(await page.evaluate(()=>window.__scene.sy>1),'Portrait scene uses the available depth');
    await shot(`monki-phone-${width}.png`);
    await page.click('#open-tools');await shot(`monki-menu-${width}.png`);
    assert.ok(await page.$eval('#room-tools',s=>{const r=s.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=0;}));
    await page.keyboard.press('Escape');await page.waitForFunction(()=>document.querySelector('#open-tools').getAttribute('aria-expanded')==='false');
    assert.equal(await page.$('#help-room'),null);
    assert.ok(await page.$eval('#world',c=>c.width>=c.getBoundingClientRect().width*devicePixelRatio-1),'World renders at display resolution');
    await tool('[aria-label="Galgan"]');await clickText('Pet');
    assert.ok(await page.$eval('#sheet',s=>{const r=s.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=0;}));await page.click('#close-sheet');
    await tool('#together');
    assert.ok(await page.$eval('#sheet-body',body=>{
      const cards=[...body.querySelectorAll('.person-action')],links=body.querySelector('.person-links'),lastCard=cards[3]?.getBoundingClientRect(),firstLink=links?.getBoundingClientRect();
      return cards.length===4&&cards.every(card=>card.scrollWidth<=card.clientWidth+1)&&firstLink.top-lastCard.bottom>=12&&
        [...links.querySelectorAll('button')].every(button=>button.getBoundingClientRect().height>=48);
    }),'Julia actions and follow-ups need readable space');
    await shot(`monki-person-${width}.png`);
    await clickText('Leave a present');
    assert.ok(await page.$eval('#sheet-body .item-grid',grid=>{
      const cells=[...grid.querySelectorAll('button')];
      return cells.length>0&&cells.every(cell=>cell.getBoundingClientRect().width>=69&&cell.querySelector('span').scrollWidth<=cell.querySelector('span').clientWidth+1);
    }),'Item labels must fit without breaking or spilling out');
    await shot(`monki-collection-${width}.png`);
    await clickText('Potato');
    assert.ok(await page.$eval('.item-actions',row=>{const [a,b]=row.querySelectorAll('button'),r=row.getBoundingClientRect(),x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.abs(x.width-y.width)<2&&x.left>=r.left&&y.right<=r.right&&y.left-x.right>=8;}),'Item actions should share the row evenly');
    await page.click('#close-sheet');
    await tool('#draw');
    assert.ok(await page.$eval('#sheet-body .button-row',row=>{const buttons=[...row.querySelectorAll('button')].map(b=>b.getBoundingClientRect()),r=row.getBoundingClientRect();return buttons.length===3&&buttons.every(b=>b.height>=44&&Math.abs(b.top-buttons[0].top)<1)&&Math.abs(buttons[0].left-r.left)<1&&Math.abs(buttons[2].right-r.right)<1;}),'Drawing actions should form one balanced, reachable row');
    await shot(`monki-drawing-${width}.png`);await page.click('#close-sheet');
  }
  // Older engines without the popover API still get the same accessible controls.
  const fallback=await browser.newPage();fallback.on('pageerror',e=>errors.push(e.message));await fallback.setViewport({width:390,height:844});
  await fallback.evaluateOnNewDocument(()=>Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value:undefined}));
  await fallback.goto(base+'/?test=1',{waitUntil:'networkidle0'});await fallback.click('#close-sheet');
  assert.equal(await fallback.$eval('#room-tools',e=>e.hidden),true);await fallback.click('#open-tools');assert.equal(await fallback.$eval('#room-tools',e=>e.hidden),false);
  await fallback.click('#wardrobe');assert.equal(await fallback.$eval('#sheet',e=>e.open),true);assert.equal(await fallback.$eval('#room-tools',e=>e.hidden),true);await fallback.click('#close-sheet');
  await fallback.click('#open-tools');await fallback.keyboard.press('Escape');assert.equal(await fallback.$eval('#room-tools',e=>e.hidden),true);
  await fallback.click('#open-tools');await fallback.mouse.click(30,200);assert.equal(await fallback.$eval('#room-tools',e=>e.hidden),true);await fallback.close();
  assert.deepEqual(errors,[]);console.log('PASS: Central European clock on US-zone device; toy cleanup, animated tidy; both petting pads AND room strokes, stroke-to-drag conversion, tall hat; 8-card match; fixed-size random-direction bubbles; audio; minimal edge-to-edge 390/320/landscape layouts, native menu and no-popover fallback.');
}catch(e){if(page)await shot('monki-phone-failure.png');throw e;}
finally{if(browser){await Promise.race([browser.close().catch(()=>{}),delay(2500)]);if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');await browser.disconnect();}server.kill();await delay(100);if(path.basename(data).startsWith('monki-phone-'))await rm(data,{recursive:true,force:true});}
// All assertions and cleanup completed; Chrome's audio/touch transport may retain a pipe.
process.exit(0);

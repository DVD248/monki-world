import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const data=await mkdtemp(path.join(os.tmpdir(),'monki-paper-')),port=58000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser,page,cdp;const errors=[];
async function touch(type,p){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:p?[{x:p.x,y:p.y,radiusX:7,radiusY:7,force:1,id:1}]:[]});}
async function at(p){return page.evaluate(p=>sc.screenPoint(p),p);}
async function gesture({duration=90,hold=0,left=false}={}){
  const start=await page.$eval('#play-ball',b=>{const r=b.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
  const stage=await at({x:left?260:150,y:245}),end=await at({x:210,y:245});
  await touch('touchStart',start);
  for(let i=1;i<=9;i++){await delay(18);await touch('touchMove',{x:start.x+(stage.x-start.x)*i/9,y:start.y+(stage.y-start.y)*i/9});}
  await delay(150);
  for(let i=1;i<=6;i++){await delay(duration/6);await touch('touchMove',{x:stage.x+(end.x-stage.x)*i/6,y:stage.y});}
  if(hold)await delay(hold);
  const hand=await page.evaluate(()=>({x:sc.toys.pointer.x,y:sc.toys.pointer.y}));await touch('touchEnd');
  const initial=await page.evaluate(()=>{const s=sc.toys.shots[0];return{origin:s.origin,vx:s.vx,vy:s.vy};});
  // Touch moves can be coalesced until pointerup; release must use its final
  // coordinate, not the preceding painted frame's finger position.
  assert.ok(Math.abs(initial.origin.x-210)<.1);assert.ok(Math.abs(initial.origin.y-hand.y)<.1);assert.equal(await page.$eval('#play-ball',b=>b.classList.contains('toy-away')),true);
  await page.screenshot({path:path.join(output,`v13-paper-${hold?'drop':left?'left':duration>200?'slow':'fast'}.png`)});
  await page.waitForFunction(()=>sc.toys.shots[0]?.motion==='rest');
  const landed=await page.evaluate(()=>{const s=sc.toys.shots[0];return{x:s.gx,y:s.gy,bounces:s.bounces};});
  await page.waitForFunction(()=>sc.toys.shots[0]?.carried);assert.equal(await page.evaluate(()=>sc.toys.shots[0].z),0);
  if(!hold&&duration<200&&!left){await page.screenshot({path:path.join(output,'v13-paper-pickup.png')});await page.waitForFunction(()=>sc.toys.shots[0]?.fetch.phase==='return');await delay(350);await page.screenshot({path:path.join(output,'v13-paper-return.png')});}
  await page.waitForFunction(()=>!sc.toys.shots.length,{timeout:15000});
  assert.equal(await page.evaluate(()=>sc.override.sernik),undefined);assert.equal(await page.$eval('#play-ball',b=>b.classList.contains('toy-away')),false);
  return{...initial,landed,travel:landed.x-initial.origin.x};
}
try{
  for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(60);}
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
  page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});await page.evaluate(async()=>{const{Scene}=await import('./scene.js'),draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.sc=this;return draw.call(this,t);};});await delay(80);await page.click('#close-sheet');cdp=await page.createCDPSession();
  const slow=await gesture({duration:540}),fast=await gesture({duration:72}),drop=await gesture({duration:72,hold:180}),left=await gesture({duration:85,left:true});
  assert.ok(fast.vx>slow.vx*1.7);assert.ok(fast.travel>slow.travel+25);assert.equal(drop.vx,0);assert.equal(drop.vy,0);assert.ok(Math.abs(drop.travel)<.01);assert.ok(left.vx<0&&left.travel<0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,slow,fast,drop,left,errors},null,2));
}catch(e){if(page)await page.screenshot({path:path.join(output,'v13-paper-failure.png')});throw e;}
finally{if(cdp)await cdp.detach().catch(()=>{});if(browser){await Promise.race([browser.close().catch(()=>{}),delay(2500)]);if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');await browser.disconnect();}server.kill();await delay(100);await rm(data,{recursive:true,force:true});}
process.exit(0);

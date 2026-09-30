import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const data=await mkdtemp(path.join(os.tmpdir(),'monki-ambient-'));
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const port=57000+Math.floor(Math.random()*1500),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser,page;const errors=[];
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world);
const force=async(room,id)=>{
  if(!await page.$eval('#sheet',e=>e.open))await page.click('#test-open');
  await page.evaluate(({room,id})=>{const label=`${room} · ${id.replaceAll('-',' ')}`,detail=[...document.querySelectorAll('details')].find(d=>[...d.querySelectorAll('button')].some(b=>b.textContent===label));if(!detail)throw Error(`Missing ${label}`);detail.open=true;const button=[...detail.querySelectorAll('button')].find(b=>b.textContent===label);button.click();},{room,id});
  await page.waitForFunction(id=>window.ambientScene?.ambient.active?.id===id,{timeout:3000},id);
};
try{
  for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(60);}
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(chrome)?chrome:puppeteer.executablePath()),headless:true,args:['--no-sandbox']});
  page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});
  await page.evaluate(()=>{const key='monki-world-sandbox-v1',save=JSON.parse(localStorage.getItem(key));save.world.objects.push({id:'concert-radio',type:'radio',room:'house',x:335,y:194});localStorage.setItem(key,JSON.stringify(save));});
  await page.reload({waitUntil:'networkidle0'});
  await page.evaluate(async()=>{const {Scene}=await import('./scene.js'),draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.ambientScene=this;return draw.call(this,t);};});await delay(50);
  const previews=[['house','sock-dispute'],['house','private-concert'],['house','monki-sneaks'],['house','bowl-committee'],['house','awkward-passing'],['house','galgan-tests-sofa'],['house','monki-copies-julia'],['house','monki-entertains-nobody'],['house','sernik-blocks-julia'],['garden','sernik-pond'],['roof','wrong-telescope'],['cellar','potato-audience']];
  for(const [room,id] of previews){await force(room,id);const before=await state();await page.evaluate(()=>{const a=window.ambientScene.ambient.active;a.at=performance.now()-a.ms*.5;});await delay(100);assert.equal(await page.evaluate(()=>window.ambientScene.ambient.active?.id),id,`${room} · ${id} should stay active for its preview`);await page.screenshot({path:path.join(output,`${room}-${id}.png`),fullPage:false});assert.deepEqual((await state()).actors,before.actors,'An ambient scene must not move the shared cast');}
  await force('house','sock-dispute');await page.click('#open-tools');await page.click('#decorate');await delay(100);assert.equal(await page.evaluate(()=>window.ambientScene.ambient.active),null,'Decorating must interrupt the scene');
  await page.click('#decor-editor .decor-done');
  await page.evaluate(()=>{const a=window.ambientScene.ambient;a.rng=()=>0;a.reset(performance.now(),'house');a.noteTap('galgan',performance.now());});
  await page.waitForFunction(()=>window.ambientScene.ambient.active?.id==='monki-checks-galgan',{timeout:3000});
  await page.evaluate(()=>{const a=window.ambientScene.ambient;a.rng=()=>0;a.reset(performance.now(),'house');a.nextAt=performance.now()+50;});
  await page.waitForFunction(()=>window.ambientScene.ambient.active,{timeout:3000});
  const cadence=await page.evaluate(async()=>{const scene=window.ambientScene,life=scene.ambient,{ambientScenes}=await import('./ambient-life.js');return{lastSceneAt:life.lastSceneAt,nextAt:life.nextAt,valid:ambientScenes(scene.state,scene.room).some(s=>s.id===life.active.id)};});
  assert.ok(cadence.valid,'The natural activity must be a contextual scene, not wandering');
  assert.ok(cadence.nextAt-cadence.lastSceneAt>=45000,'A natural incident cannot immediately repeat');
  await force('house','bowl-committee');await delay(650);
  const beforePokes=(await state()).actors.sernik.pokes,point=await page.evaluate(()=>{const scene=window.ambientScene,p=scene.position('sernik');return scene.screenPoint({x:p.x,y:p.y-20/scene.sy});});
  await page.mouse.click(point.x,point.y);
  await page.waitForFunction(before=>JSON.parse(localStorage.getItem('monki-world-sandbox-v1')).world.actors.sernik.pokes>before,{timeout:3000},beforePokes);
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${previews.length} contextual live scenes across rooms, restrained natural timing, sandbox previews, no shared-state drift, editor interruption and touch response. Screenshots: ${output}`);
}finally{await browser?.close();server.kill();await delay(100);await rm(data,{recursive:true,force:true});}

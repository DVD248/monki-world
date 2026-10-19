import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// The birthday surprise on two phones, as it will happen: he writes it before inviting her and
// previews it; she comes in from the link to the dark room, turns the lights on, blows out the
// candles, reads the letter, meets Kot at the door, and only then gets the usual welcome; the
// cake it leaves plays it again; his card says she opened it; and it never plays twice.
const data=await mkdtemp(path.join(os.tmpdir(),'monki-birthday-'));
const port=53000+Math.floor(Math.random()*4000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser;const errors=[];
const LETTER='Happy birthday, Julia.\n\nThis little house is for you.\nEvery bit of it.';

const HOOKS=async()=>{const {Scene}=await import('./scene.js');const draw=Scene.prototype.draw;Scene.prototype.draw=function(t){window.__scene=this;return draw.call(this,t);};};
async function open(context,url){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.goto(url,{waitUntil:'networkidle0'});await page.evaluate(HOOKS);return page;
}
const clickText=async(page,text)=>{const ok=await page.evaluate(t=>{const b=[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(t)&&!b.disabled&&b.getClientRects().length);b?.click();return !!b;},text);assert.ok(ok,'Missing button '+text);};
const world=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-v1')).world);
const partyOpen=page=>page.evaluate(()=>document.querySelector('#birthday').open);
/** A finger on the party, at its own coordinates (400 × 600). */
async function tap(page,x,y){const r=await page.$eval('#birthday-canvas',c=>{const r=c.getBoundingClientRect();return {l:r.left,t:r.top,w:r.width,h:r.height};});await page.mouse.click(r.l+x*r.w/400,r.t+y*r.h/600);}
const shot=(page,name)=>page.screenshot({path:path.join(output,name)});

try{
  let healthy=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){healthy=true;break;}}catch{}await delay(60);}assert.ok(healthy);
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(chrome)?chrome:puppeteer.executablePath()),headless:true,args:['--no-sandbox']});

  // ---- David sets it up before the link goes out, from the sheet that comes before inviting.
  const davidContext=await browser.createBrowserContext();let david=await open(davidContext,base+'/');
  await david.waitForFunction(()=>document.querySelector('#sheet').open);await clickText(david,'David');
  await david.waitForFunction(()=>document.querySelector('#sheet-body h2')?.textContent==='Something for Julia to find.');
  await clickText(david,'Is it Julia’s birthday?');
  assert.equal(await david.$eval('#sheet-body h2',e=>e.textContent),'A birthday surprise for Julia.');
  assert.equal(await david.$eval('.birthday-form input[type=number]',e=>e.value),'21');
  await david.type('.birthday-form textarea',LETTER);
  // Previewed first: the same party, marked as a preview, that he can close at any point.
  await clickText(david,'Preview');await david.waitForFunction(()=>document.querySelector('#birthday').open);
  assert.equal(await david.$eval('#birthday-close',b=>b.hidden),false,'a preview can be closed');
  await delay(900);await tap(david,200,300);await delay(500);await shot(david,'birthday-preview.png');
  await david.click('#birthday-close');await david.waitForFunction(()=>!document.querySelector('#birthday').open&&document.querySelector('#sheet').open);
  assert.equal(await david.$eval('.birthday-form textarea',e=>e.value),LETTER,'the letter is still there after the preview');
  assert.deepEqual((await world(david)).birthdays,{},'a preview leaves nothing');
  await clickText(david,'Leave it for Julia');
  let w=await world(david);const b=w.birthdays.julia;assert.equal(b.from,'david');assert.equal(b.message,LETTER);assert.equal(b.signature,'Love, David');assert.equal(b.age,21);
  await david.waitForFunction(()=>{const l=JSON.parse(localStorage.getItem('monki-world-v1'));return l.room&&!l.pending.length;},{timeout:10000});
  const seat=await david.evaluate(()=>JSON.parse(localStorage.getItem('monki-world-v1')));
  assert.equal(await partyOpen(david),false,'never for the one who left it');

  // ---- Julia, from the link: the party is the first thing she sees.
  const juliaContext=await browser.createBrowserContext();let julia=await open(juliaContext,`${base}/#join=${seat.room}.${seat.invite}`);
  await julia.waitForFunction(()=>[...document.querySelectorAll('dialog[open] button')].some(b=>/enter the world/i.test(b.textContent)));
  await clickText(julia,'Enter the world');
  await julia.waitForFunction(()=>document.querySelector('#birthday').open,{timeout:10000});
  assert.equal(await julia.$eval('#birthday-close',b=>b.hidden),true,'the real one has no close button');
  await julia.keyboard.press('Escape');await delay(200);assert.ok(await partyOpen(julia),'and Escape does not skip it before the letter');
  await delay(900);await shot(julia,'birthday-dark.png');
  // The lights; then, once everybody has jumped out, the wish.
  await tap(julia,200,300);await delay(3000);await shot(julia,'birthday-wish.png');
  for(let i=0;i<14;i++){await tap(julia,110+(i*29)%190,480);await delay(120);}
  await delay(5200);await shot(julia,'birthday-envelope.png');
  await tap(julia,200,300);await julia.waitForFunction(()=>!document.querySelector('#birthday-letter').hidden,{timeout:4000});
  assert.equal(await julia.$eval('.birthday-to',e=>e.textContent),'For Julia, on your 21st birthday');
  assert.deepEqual(await julia.$$eval('.birthday-text p',ps=>ps.map(p=>p.innerHTML)),['Happy birthday, Julia.','This little house is for you.<br>Every bit of it.']);
  assert.equal(await julia.$eval('.birthday-from',e=>e.textContent),'Love, David');
  await shot(julia,'birthday-letter.png');
  w=await world(julia);assert.ok(w.birthdays.julia.seenAt,'opened once the letter is');assert.ok(w.cast.includes('kot'));assert.ok(w.decor.includes('cake'));
  assert.equal(await julia.$eval('#birthday-next',b=>b.textContent),'One more thing…');
  await julia.click('#birthday-next');await delay(3400);await shot(julia,'birthday-kot.png');
  await tap(julia,200,300);await julia.waitForFunction(()=>!document.querySelector('#birthday').open,{timeout:4000});
  // Then the welcome, as it always was.
  await julia.waitForFunction(()=>document.querySelector('#sheet-body h2')?.textContent==='David made this for you.',{timeout:5000});
  await clickText(julia,'Look around');await delay(600);
  assert.ok((await julia.$$eval('#residents .resident',b=>b.map(x=>x.title))).includes('Kot'));
  // Her own page for one for him gives nothing away about hers: an empty letter, for him.
  await julia.click('#open-tools');await delay(200);await julia.click('#together');await delay(300);
  await clickText(julia,'A birthday surprise for David');
  assert.equal(await julia.$eval('#sheet-body h2',e=>e.textContent),'A birthday surprise for David.');
  assert.equal(await julia.$eval('.birthday-form textarea',e=>e.value),'');
  assert.ok(!/waiting for you|Happy birthday, Julia/.test(await julia.$eval('#sheet-body',e=>e.textContent)));
  await julia.click('#close-sheet');await delay(200);
  // The cake in the room plays it again, closable this time.
  const cake=await julia.evaluate(()=>{const h=window.__scene.hitboxes.find(h=>h.id==='decor:cake');return h&&window.__scene.screenPoint({x:h.x+h.w/2,y:h.y+h.h/2});});
  assert.ok(cake,'the cake is in the room');await julia.mouse.click(cake.x,cake.y);
  await julia.waitForFunction(()=>document.querySelector('#birthday').open);assert.equal(await julia.$eval('#birthday-close',b=>b.hidden),false);
  await julia.click('#birthday-close');await julia.waitForFunction(()=>!document.querySelector('#birthday').open);
  await julia.waitForFunction(()=>!JSON.parse(localStorage.getItem('monki-world-v1')).pending.length,{timeout:10000});
  await julia.close();

  // ---- His card: she opened it, with a heart to send back; his page now says when.
  await david.close();david=await open(davidContext,base+'/');
  await david.waitForFunction(()=>document.querySelector('#story-title').textContent==='Julia opened the birthday surprise.',{timeout:10000});
  assert.equal(await david.$eval('#start-adventure',e=>e.textContent),'♡');
  await shot(david,'birthday-his-card.png');

  // ---- And it never plays twice.
  julia=await open(juliaContext,base+'/');await delay(2500);
  assert.equal(await partyOpen(julia),false,'once opened, the next opening is an ordinary one');

  assert.deepEqual(errors,[]);
  console.log('PASS: written and previewed before inviting (nothing saved by a preview), never shown to the one who wrote it, the first thing she sees from the link with no way to skip it before the letter, lights, 21 candles blown out, the letter as written, Kot at the door, then the usual welcome; her own page for one for him gives nothing away; the cake replays it; his card says she opened it; it never plays twice.');
}finally{
  await browser?.close();server.kill();await rm(data,{recursive:true,force:true});
}

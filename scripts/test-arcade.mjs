import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

// The arcade in a real browser: the way in, every game with a real finger, the result
// panel, bests that survive leaving at any moment, and a best reaching the other phone.
const data=await mkdtemp(path.join(os.tmpdir(),'monki-arcade-'));
const port=52000+Math.floor(Math.random()*4000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser;const errors=[];

/** Keeps hold of the running game and the store, whichever page made them. */
const HOOKS=async()=>{
  const {ArcadeGame}=await import('./arcade.js');const loop=ArcadeGame.prototype.loop;
  ArcadeGame.prototype.loop=function(t){window.__game=this;return loop.call(this,t);};
  const {Store}=await import('./store.js');const save=Store.prototype.save;
  Store.prototype.save=function(...a){window.__store=this;return save.apply(this,a);};
  Object.defineProperty(Store.prototype,'state',{configurable:true,get(){window.__store=this;return this.local?.world;}});
  const {Scene}=await import('./scene.js');const draw=Scene.prototype.draw;
  Scene.prototype.draw=function(t){window.__scene=this;return draw.call(this,t);};
};
async function open(context,url){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.goto(url,{waitUntil:'networkidle0'});await page.evaluate(HOOKS);return page;
}
async function clickText(page,text){
  const h=await page.evaluateHandle(text=>[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(text)&&!b.disabled&&b.getClientRects().length),text);
  assert.ok(h.asElement(),'Missing button '+text);await h.asElement().click();
}
async function openArcade(page){
  await page.click('#open-tools');await page.waitForFunction(()=>document.querySelector('#open-tools').getAttribute('aria-expanded')==='true');
  await clickText(page,'Play a game');await page.waitForFunction(()=>document.querySelector('#sheet').open&&document.querySelectorAll('.arcade-card').length===12);
}
async function play(page,title){
  await page.evaluate(title=>[...document.querySelectorAll('.arcade-card')].find(b=>b.textContent.includes(title)).click(),title);
  await fresh(page);
}
/** Waits for the new run: the one that has just started, not the one before it. */
const fresh=page=>page.waitForFunction(()=>document.querySelector('#arcade').open&&document.querySelector('#arcade-over').hidden&&window.__game&&!window.__game.stopped&&!window.__game.logic.over&&window.__game.time>.1);
/** A finger on the canvas, at canvas coordinates (400 × 600). */
async function finger(page,x,y=520,down=true){
  const r=await page.$eval('#arcade-canvas',c=>{const r=c.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};});
  const px=r.left+x*r.width/400,py=r.top+y*r.height/600;
  await page.mouse.move(px,py);if(down)await page.mouse.down();
}
const game=(page,fn,arg)=>page.evaluate(fn,arg);
const world=page=>page.evaluate(()=>window.__store.local.world);
/** Plays Food Drop with the in-page finger until `n` snacks are eaten. */
async function eat(page,n){
  await page.evaluate(()=>{clearInterval(window.__steer);window.__steer=setInterval(()=>{const g=window.__game;if(!g||g.game!=='drop'||g.logic.over)return;const L=g.logic;g.touched=true;
    const f=L.items.filter(i=>i.state==='fall').sort((a,b)=>a.land-b.land),next=f.find(i=>!i.bad);let t=next?next.lx:L.x;
    const frog=f.find(i=>i.bad&&i.land-L.time<.3&&Math.abs(i.lx-t)<48);if(frog)t=frog.lx+(t<frog.lx?-55:55);g.target=t;},16);});
  await page.waitForFunction(n=>window.__game.logic.score>=n,{timeout:90000},n);
  await page.evaluate(()=>clearInterval(window.__steer));
}
/** Ends the current run the way the rules do, and waits for the result panel. */
async function end(page,{wait=true}={}){
  await game(page,()=>{const L=window.__game.logic;if(L.lives!==undefined)L.lives=0;L.state='over';L.emit('over',L.x??L.monki?.x??200,L.y??L.monki?.y??532);});
  if(wait)await page.waitForFunction(()=>!document.querySelector('#arcade-over').hidden);
}
/** "Again", once the result has had its moment (a tap straight away is ignored). */
async function again(page){await delay(500);await clickText(page,'Again');await fresh(page);}
const panel=page=>page.evaluate(()=>({score:document.querySelector('#arcade-score').textContent,line:document.querySelector('#arcade-line').textContent,sub:document.querySelector('#arcade-sub').textContent}));
const shot=(page,name)=>page.screenshot({path:path.join(output,name)});

try{
  let healthy=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){healthy=true;break;}}catch{}await delay(60);}assert.ok(healthy);
  const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||(existsSync(chrome)?chrome:puppeteer.executablePath()),headless:true,args:['--no-sandbox']});

  // ---- In the sandbox, as David.
  const sandbox=await browser.createBrowserContext(),page=await open(sandbox,base+'/?test=1');
  await page.waitForFunction(()=>document.querySelector('#sheet').open);await page.click('#close-sheet');
  assert.ok(await page.evaluate(()=>window.__scene.hitboxes.some(h=>h.action==='onArcade')),'the cabinet can be touched');
  await openArcade(page);
  assert.deepEqual(await page.$$eval('.arcade-card small',s=>s.map(x=>x.textContent)),Array(12).fill('Not played yet'));

  // Food Drop with a real finger: the first snack lands where the finger put Sernik.
  await play(page,'Food Drop');
  await page.waitForFunction(()=>window.__game.logic.items.some(i=>!i.bad));
  const lx=await game(page,()=>window.__game.logic.items.filter(i=>!i.bad).sort((a,b)=>a.land-b.land)[0].lx);
  await finger(page,lx);await page.waitForFunction(()=>window.__game.logic.eaten>=1||window.__game.logic.items.some(i=>i.state==='floor'),{timeout:15000});
  await page.mouse.up();
  assert.equal(await game(page,()=>window.__game.logic.eaten),1,'a finger on the canvas moves Sernik under the snack');
  assert.equal(await game(page,()=>window.__game.logic.lives),3);
  await eat(page,4);await game(page,()=>{window.__game.logic.score=16;});
  await end(page);
  await clickText(page,'Again');await delay(150);
  assert.equal(await page.$eval('#arcade-over',e=>e.hidden),false,'a tap as the result appears does not start again');
  let p=await panel(page);assert.equal(p.score,'16');assert.equal(p.line,'That’s one to beat.');
  assert.equal((await world(page)).arcade.david.drop,16,'the first run is kept as the best');
  assert.ok((await world(page)).log.some(e=>e.action==='arcade'&&e.game==='drop'&&e.count===16));
  await shot(page,'arcade-drop-over.png');

  // Again: the line across is your best, and a near miss says how near.
  await again(page);
  assert.equal(await game(page,()=>window.__game.best),16);
  await game(page,()=>{window.__game.logic.score=13;});await end(page);
  p=await panel(page);assert.equal(p.line,'3 snacks short of your best.');

  // Leaving at once after a best keeps it (the panel was still on its way).
  await again(page);
  await game(page,()=>{window.__game.logic.score=21;});await end(page,{wait:false});await page.click('#arcade-leave');
  await delay(300);assert.equal((await world(page)).arcade.david.drop,21,'a best is kept when leaving straight after it');

  // Leaving in the middle of a run with a new best keeps it too.
  await openArcade(page);await play(page,'Food Drop');
  await game(page,()=>{window.__game.logic.score=25;});await page.click('#arcade-leave');
  await delay(300);assert.equal((await world(page)).arcade.david.drop,25,'a best is kept when leaving mid-run');
  assert.equal(await page.evaluate(()=>document.querySelector('#arcade').open),false);

  // Their best is read when the run ends, not when it started.
  await openArcade(page);await play(page,'Food Drop');
  await page.evaluate(()=>{window.__store.local.world.arcade.julia={drop:28};});
  await game(page,()=>{window.__game.logic.score=30;});await end(page);
  p=await panel(page);assert.equal(p.line,'New best, and past Julia.');

  // Pause and resume.
  await again(page);
  await page.click('#arcade-pause');assert.equal(await page.$eval('#arcade-resume',b=>b.hidden),false);
  const frozen=await game(page,()=>window.__game.logic.time);await delay(300);
  assert.equal(await game(page,()=>window.__game.logic.time),frozen,'nothing moves while paused');
  await page.click('#arcade-resume');await delay(300);assert.ok(await game(page,()=>window.__game.logic.time)>frozen);
  // The house holds still under the game, and carries on after it.
  await page.evaluate(()=>{const c=window.__scene.c,fill=c.fillRect;window.__houseDraws=0;c.fillRect=function(...a){window.__houseDraws++;return fill.apply(this,a);};});
  await delay(300);assert.equal(await page.evaluate(()=>window.__houseDraws),0,'the house is not redrawn under the game');
  await page.click('#arcade-leave');await delay(300);
  assert.ok(await page.evaluate(()=>window.__houseDraws>0),'the house carries on afterwards');

  // Sky Jump: Monki bounces, follows a finger, and falls out at the bottom.
  await openArcade(page);await play(page,'Sky Jump');
  await page.waitForFunction(()=>window.__game.logic.monki.vy<0);await page.waitForFunction(()=>window.__game.logic.monki.vy>0);
  await finger(page,40);await delay(700);
  assert.ok(await game(page,()=>window.__game.logic.monki.x)<120,'Monki follows the finger');await page.mouse.up();
  // A thumb slides instead: down anywhere, and he moves by as far as it goes (a little more), not to it.
  {const r=await page.$eval('#arcade-canvas',c=>{const r=c.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};});
    const at=x=>r.left+x*r.width/400,y=r.top+560*r.height/600,before=await game(page,()=>window.__game.logic.monki.x);
    await page.touchscreen.touchStart(at(250),y);await delay(150);
    assert.ok(Math.abs(await game(page,()=>window.__game.logic.monki.x)-before)<25,'a thumb going down does not pull him over to it');
    for(let k=1;k<=6;k++){await page.touchscreen.touchMove(at(250+k*20),y);await delay(30);}await delay(500);
    const after=await game(page,()=>window.__game.logic.monki.x);await page.touchscreen.touchEnd();
    assert.ok(after-before>150&&after<=388,`slid 120 to the right, Monki went ${Math.round(after-before)} from ${Math.round(before)}`);}
  // After the end the clouds and pigeons keep moving, and the panel follows.
  await end(page,{wait:false});const c1=await game(page,()=>window.__game.clock());await delay(250);
  assert.ok(await game(page,()=>window.__game.clock())>c1,'the sky keeps moving after a fall');
  await page.waitForFunction(()=>!document.querySelector('#arcade-over').hidden);
  p=await panel(page);assert.match(p.score,/^\d+ m$/);
  await shot(page,'arcade-jump-over.png');
  await page.click('#arcade-leave');

  // The later games, each played with a real finger the way it asks for: hold, tap, aim or
  // slide. Each one moves for it, ends on the result panel, and offers the next game along.
  const later=[
    ['Hill Drive','Jet Monki',async()=>{await finger(page,340,520);await delay(1200);await page.mouse.up();
      return game(page,()=>window.__game.logic.state==='play'&&window.__game.logic.x-window.__game.logic.startX>20);}],
    ['Jet Monki','Cliff Jump',async()=>{await finger(page,200,300);await page.mouse.up();await delay(80);
      return game(page,()=>window.__game.logic.state==='play'&&window.__game.logic.flapAt>=0);}],
    ['Cliff Jump','Water Hop',async()=>{await finger(page,200,300);await delay(350);await page.mouse.up();await delay(400);
      return game(page,()=>window.__game.logic.x!==60);}],
    ['Water Hop','Fall Down',async()=>{
      const aim=await page.evaluate(async()=>{const {HOP,padX}=await import('/shared/arcade-hop.js');const L=window.__game.logic,row=L.rowAt(1),y=HOP.base-(HOP.row-L.cam);
        if(row.kind==='bank')return {x:L.x,y};const pads=row.pads.map(p=>padX(row,p,L.time)).filter(x=>x>40&&x<360).sort((a,b)=>Math.abs(a-L.x)-Math.abs(b-L.x));return {x:pads[0],y};});
      await finger(page,aim.x,aim.y);await page.mouse.up();await delay(400);
      return game(page,()=>window.__game.logic.row===1&&!window.__game.logic.over);}],
    ['Fall Down','Match Tap',async()=>{await finger(page,50,300);await delay(700);await page.mouse.up();
      return game(page,()=>window.__game.logic.x<120);}],
    ['Match Tap','Pancake Stack',async()=>{
      await page.waitForFunction(()=>window.__game.logic.resting);
      const cell=await page.evaluate(async()=>{const {MatchRun,MATCH}=await import('/shared/arcade-match.js');const L=window.__game.logic;
        for(let c=0;c<MATCH.cols;c++)for(let r=0;r<MATCH.rows;r++)if(L.group(c,r).length>=MATCH.min)return MatchRun.centre(c,r);});
      await finger(page,cell.x,cell.y);await page.mouse.up();await delay(120);
      return game(page,()=>window.__game.logic.score>=3&&window.__game.logic.state==='play');}],
    // A tap when the pancake is roughly over the plate drops it there.
    ['Pancake Stack','Candle Cake',async()=>{
      await page.waitForFunction(()=>{const L=window.__game.logic;return Math.abs(L.slider.x-L.top.x)<30;},{timeout:10000});
      await finger(page,200,300);await page.mouse.up();await delay(200);
      return game(page,()=>window.__game.logic.score===1&&window.__game.logic.top.w>100);}],
    // The first cake is bare: any tap puts a candle in.
    ['Candle Cake',"Galgan's Parade",async()=>{await finger(page,200,420);await page.mouse.up();await delay(400);
      return game(page,()=>window.__game.logic.score===1&&window.__game.logic.items.some(it=>it.kind==='candle'));}],
    // A drag upwards turns Galgan up and sets him off.
    ["Galgan's Parade",'Snack Merge',async()=>{await finger(page,200,420);for(let i=1;i<=6;i++){await finger(page,200,420-i*12,false);await delay(16);}await page.mouse.up();await delay(500);
      return game(page,()=>{const L=window.__game.logic;return L.state==='play'&&L.dir==='up'&&L.head.r<12;});}],
    // A drag sideways slides the tray (the other way, if everything was already over there).
    ['Snack Merge','Sky Jump',async()=>{
      const drag=async dx=>{await finger(page,200,330);for(let i=1;i<=6;i++){await finger(page,200+dx*i/6,330,false);await delay(16);}await page.mouse.up();await delay(300);};
      await drag(130);if(!await game(page,()=>window.__game.logic.moves>0))await drag(-130);
      return game(page,()=>window.__game.logic.moves===1);}],
  ];
  for(const [title,next,act] of later){
    await openArcade(page);await play(page,title);
    assert.ok(await act(),`${title} answers a finger`);
    await end(page);p=await panel(page);
    assert.match(p.score,title==='Hill Drive'?/^\d+ m$/:/^\d+$/,`${title} shows a result`);
    assert.equal(await page.$eval('#arcade-other',b=>b.textContent),`Try ${next}`);
    await shot(page,`arcade-${title.toLowerCase().replace(' ','-')}-over.png`);
    await page.click('#arcade-leave');
  }
  assert.ok((await world(page)).arcade.david.drive>0,'a Hill Drive best is kept');
  assert.ok((await world(page)).arcade.david.match>=3,'a Match Tap best is kept');

  // ---- Two phones: David's best is the first thing Julia sees, and her laugh comes back.
  const davidContext=await browser.createBrowserContext(),david=await open(davidContext,base+'/');
  await page.close();
  await david.waitForFunction(()=>document.querySelector('#sheet').open);await clickText(david,'David');
  await david.waitForFunction(()=>window.__store?.local?.invite);await david.evaluate(()=>{const b=[...document.querySelectorAll('#sheet button')].find(b=>/later/i.test(b.textContent));b?.click();});
  const invite=await david.evaluate(()=>`#join=${window.__store.local.room}.${window.__store.local.invite}`);
  const juliaContext=await browser.createBrowserContext();let julia=await open(juliaContext,base+'/'+invite);
  await julia.waitForFunction(()=>[...document.querySelectorAll('dialog[open] button')].some(b=>/enter the world/i.test(b.textContent)));
  await clickText(julia,'Enter the world');await julia.waitForFunction(()=>window.__store?.local?.actor==='julia');await julia.close();
  await david.evaluate(()=>document.querySelector('#sheet').open&&document.querySelector('#close-sheet').click());
  await openArcade(david);await play(david,'Sky Jump');
  await david.waitForFunction(()=>window.__store.paired,{timeout:10000});
  await game(david,()=>{const L=window.__game.logic;L.high=Math.max(L.high,48*20);});await end(david);
  assert.equal((await panel(david)).sub,'Julia will see it.');
  await david.waitForFunction(()=>!window.__store.local.pending.length&&window.__store.online,{timeout:10000});
  // Closed, as a phone put down is: what arrives while you look is not news later.
  await david.close();
  julia=await open(juliaContext,base+'/');
  await julia.waitForFunction(()=>document.querySelector('#story-title').textContent.includes('Sky Jump'),{timeout:10000});
  assert.equal(await julia.$eval('#story-title',e=>e.textContent),'David got Monki 48 metres up in Sky Jump.');
  assert.equal(await julia.$eval('#start-adventure',e=>e.textContent),'Ha!');
  await julia.click('#start-adventure');await julia.waitForFunction(()=>!window.__store.local.pending.length,{timeout:10000});
  await openArcade(julia);
  assert.equal(await julia.$eval('.arcade-card small',s=>s.textContent),'Not played yet · David 48 m');
  await play(julia,'Sky Jump');assert.deepEqual(await game(julia,()=>window.__game.rival),{id:'david',name:'David',best:48});
  await shot(julia,'arcade-julia-rival.png');await julia.close();
  const back=await open(davidContext,base+'/');
  await back.waitForFunction(()=>document.querySelector('#story-title').textContent.includes('laughed'),{timeout:10000});
  assert.equal(await back.$eval('#story-title',e=>e.textContent),'Julia laughed: you got Monki 48 metres up in Sky Jump.');

  assert.deepEqual(errors,[]);
  console.log('PASS: cabinet and menu entry with all twelve games, Food Drop by finger, result panel and near misses, bests kept when leaving at any moment, their best read at the end, pause, the house resting under the game, Sky Jump by finger, the sky moving after a fall, Hill Drive, Jet Monki, Cliff Jump, Water Hop, Fall Down, Match Tap, Pancake Stack, Candle Cake, Galgan\'s Parade and Snack Merge each by finger to a result, and a best reaching the other phone with a laugh back.');
}finally{
  await browser?.close();server.kill();await rm(data,{recursive:true,force:true});
}

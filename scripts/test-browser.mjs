import puppeteer from 'puppeteer';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const data=await mkdtemp(path.join(os.tmpdir(),'monki-browser-'));
const port=33000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let healthy=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){healthy=true;break;}}catch{}await delay(50);}
if(!healthy){server.kill();throw new Error('Test server failed to start');}
const systemChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath=process.env.BROWSER_BIN||(existsSync(systemChrome)?systemChrome:puppeteer.executablePath());
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox']});
const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});
 const result=await page.evaluate(async()=>{
   const {AdventurePlayer}=await import('./adventure-player.js');const {ADVENTURES,VARIATIONS}=await import('./shared/adventures.js');
   const {PLACE_STORIES,placeStory}=await import('./shared/places.js');const {createWorld}=await import('./shared/world.js');
   const stories=[...ADVENTURES];for(const [place,entries]of Object.entries(PLACE_STORIES))for(let n=0;n<entries.length;n++){const s=createWorld('test');s.life.places[place]={count:n};stories.push(placeStory(s,place));}
   const canvas=document.createElement('canvas');canvas.width=400;canvas.height=430;document.body.append(canvas);
   const reports=[];
   for(const difficulty of [0,1])for(const variant of VARIATIONS)for(const chapter of stories)for(let step=0;step<3;step++){
     const g=new AdventurePlayer(canvas,{...chapter,difficulty,variant,edition:VARIATIONS.indexOf(variant)},{startStep:step,onStep:()=>{},onDone:()=>{},sound:()=>{}});cancelAnimationFrame(g.frame);
     if(g.spec.kind==='match'){const counts={};for(const card of g.cards){const face=g.matchItems[card.value];counts[face]=(counts[face]||0)+1;}if(Object.keys(counts).length!==g.pairCount||Object.values(counts).some(n=>n!==2))throw Error('Duplicate visual pairs: '+chapter.id);}
     const click=(x,y)=>{g.pointer.x=x;g.pointer.y=y;g.act('down');g.act('up');};
     let ticks=0;while(g.phase==='play'&&ticks++<2500){
       const bubble=g.obscurers.find(b=>b.alive);if(bubble){click(bubble.x,bubble.y);continue;}
       switch(g.spec.kind){
         case 'pop':{const e=g.entities.find(e=>e.alive);if(e)click(e.x,e.y);break;}
         case 'wipe':{const e=g.entities.find(e=>e.alive);if(e)click(e.x,e.y);break;}
         case 'dress':g.pointer={x:80,y:343,down:false};g.act('down');g.pointer.x=225;g.pointer.y=188;g.act('up');break;
         case 'feed':if(!g.throwShot){g.pointer={x:85,y:345,down:false};g.act('down');g.pointer.x=g.dogX();g.pointer.y=246;g.act('up');}break;
         case 'catch':{const e=g.entities.filter(e=>e.alive).sort((a,b)=>b.y-a.y)[0];if(e)g.pointer.x=e.decoy?(e.x>200?45:355):e.x;break;}
         case 'pull':if(!g.pointer.down)g.act('down');else if(g.charge>.65)g.act('up');break;
         case 'find':if(g.findPhase==='choose')click(82+g.findOrder.indexOf(g.findTarget)*118,280);break;
         case 'steer':{const e=[...g.entities].sort((a,b)=>b.y-a.y)[0];g.pointer.x=e?.x>200?50:350;break;}
         case 'aim':if(!g.throwShot){g.pointer={x:85,y:345,down:false};g.act('down');Object.assign(g.pointer,g.aimTarget());g.act('up');}break;
         case 'stack':if(Math.abs(g.stackX()-200)<30)click(200,300);break;
         case 'trail':{const e=g.path[g.hits];if(e)click(e.x,e.y);break;}
         case 'sort':g.pointer={x:200,y:198,down:false};g.act('down');g.pointer.x=g.sortRight?300:100;g.pointer.y=325;g.act('up');break;
         case 'sequence':if(!g.sequenceShow)click(82+g.sequence[g.sequenceAt]*118,270);break;
         case 'match':if(g.matchWait<=0){let i;if(g.firstCard!==null)i=g.cards.findIndex((c,i)=>i!==g.firstCard&&!c.done&&!c.open&&c.value===g.cards[g.firstCard].value);else i=g.cards.findIndex(c=>!c.done&&!c.open);if(i>=0){const p=g.cardAt(i);click(p.x,p.y);}}break;
       }
       if(g.phase==='play')g.update(.04);
     }
     g.draw();reports.push({id:chapter.id,variant,difficulty,step,kind:g.spec.kind,hits:g.hits,goal:g.spec.goal,ticks,passed:g.phase==='payoff'});
     if(g.phase==='payoff'&&step===2){let done=0;g.onDone=()=>done++;g.update(.43);if(done!==1)throw Error('Slow or missing test completion: '+chapter.id);}
     g.stop();
   }
   canvas.remove();return reports;
 });
 const failed=result.filter(r=>!r.passed);console.log(JSON.stringify({segments:result.length,mechanics:[...new Set(result.map(r=>r.kind))],failed,errors},null,2));assert.equal(failed.length,0);assert.deepEqual(errors,[]);
 const syncRace=await page.evaluate(async()=>{
   const {Store}=await import('./store.js');
   const store=new Store();store.solo('david');store.local.room='test-room';store.local.token='test-token';
   const baseWorld=structuredClone(store.state),replies=[];
   store.request=()=>new Promise(resolve=>replies.push(resolve));
   const finished=store.sync();
   const operation=store.op('poke',{target:'monki'});
   replies.shift()({world:baseWorld,paired:false});
   for(let i=0;i<20&&!replies.length;i++)await new Promise(resolve=>setTimeout(resolve,0));
   const drained=!!replies.length;
   if(drained){
     const {applyOperation}=await import('./shared/world.js');
     replies.shift()({world:applyOperation(baseWorld,operation),paired:false});
     await finished;
   }
   const result={drained,pending:store.local.pending.length,pokes:store.state.actors.monki.pokes};
   store.dispose();return result;
 });
 assert.deepEqual(syncRace,{drained:true,pending:0,pokes:1},'An action made during an active sync must reach the server before sync resolves');
 }finally{
  await Promise.race([browser.close(),delay(5000)]);if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');
  server.kill();await delay(150);if(path.basename(data).startsWith('monki-browser-'))await rm(data,{recursive:true,force:true});
}

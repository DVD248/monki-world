#!/usr/bin/env node
// A visual audit: art, icons, traces, rooms, layout, type and reach.
//
// Everything the engine can produce gets drawn and looked at. Anything that comes
// out blank, or identical to the placeholder box, or off the side of a small
// phone, is a finding. Like the engine audit, it collects the whole list.
//
//   node scripts/audit-ui.mjs           full audit
//   node scripts/audit-ui.mjs --shots   also write screenshots of every screen

import puppeteer from 'puppeteer';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const flags=new Set(process.argv.slice(2));
const SHOTS=flags.has('--shots'),JSON_OUT=flags.has('--json');

const findings=[],seen=new Set();
function note(severity,area,message,detail){
  const key=`${area}|${message}`;if(seen.has(key))return;seen.add(key);
  findings.push({severity,area,message,detail});
}
const add=list=>{for(const f of list||[])note(f.severity,f.area,f.message,f.detail);};

/* ── a server and a phone ─────────────────────────────────────────────────── */

const data=await mkdtemp(path.join(os.tmpdir(),'monki-ui-'));
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');
if(SHOTS)await mkdir(output,{recursive:true});
const port=51000+Math.floor(Math.random()*5000),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),
  env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let healthy=false;
for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok){healthy=true;break;}}catch{}await delay(60);}
if(!healthy){server.kill();throw new Error('Test server failed to start');}

const systemChrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await puppeteer.launch({
  executablePath:process.env.BROWSER_BIN||(existsSync(systemChrome)?systemChrome:puppeteer.executablePath()),
  headless:true,args:['--no-sandbox','--force-device-scale-factor=1']});
const page=await browser.newPage();
page.on('pageerror',e=>note('high','errors',`The page threw an uncaught error`,e.message.slice(0,160)));
page.on('console',m=>{if(m.type()==='error')note('high','errors',`A console error was logged`,m.text().slice(0,160));});
page.on('requestfailed',r=>note('medium','errors',`A request failed to load`,`${r.url().replace(base,'')} — ${r.failure()?.errorText}`));

const shot=async name=>{if(SHOTS)await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});};
const clickText=async text=>{
  const handle=await page.evaluateHandle(t=>[...(document.querySelector('dialog[open]')||document).querySelectorAll('button')]
    .find(b=>b.textContent.trim()===t&&!b.disabled),text);
  const el=handle.asElement();if(el)await el.click();await handle.dispose();return !!el;};

try{

await page.setViewport({width:390,height:844,deviceScaleFactor:1});
await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});
await page.evaluate(()=>document.getElementById('close-sheet')?.click());
await delay(250);

await page.evaluate(async()=>{
  const {Scene}=await import('./scene.js');
  const draw=Scene.prototype.draw;
  Scene.prototype.draw=function(t){window.__auditScene=this;return draw.call(this,t);};
});
await delay(200);

/* ── art: every sprite the game can ask for ───────────────────────────────── */

add(await page.evaluate(async()=>{
  const out=[];const say=(severity,area,message,detail)=>out.push({severity,area,message,detail});
  const {spriteCanvas,icon}=await import('./art.js');
  const {ITEMS,ACTORS,NAMES}=await import('./shared/world.js');
  const {DISCOVERIES}=await import('./shared/life.js');
  const {PLACE_STORIES}=await import('./shared/places.js');
  const {ADVENTURES}=await import('./shared/adventures.js');

  const fingerprint=canvas=>{
    const d=canvas.getContext('2d',{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height).data;
    let h=2166136261,ink=0,minX=canvas.width,maxX=0,minY=canvas.height,maxY=0;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4;
      h=Math.imul(h^d[i],16777619);h=Math.imul(h^d[i+1],16777619);h=Math.imul(h^d[i+2],16777619);h=Math.imul(h^d[i+3],16777619);
      if(d[i+3]>8){ink++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    }
    return {hash:h>>>0,ink,w:maxX-minX+1,h:maxY-minY+1};
  };
  // Anything that renders exactly like a nonsense id is drawing the placeholder box.
  const placeholder=fingerprint(spriteCanvas('there-is-no-such-thing',72)).hash;

  // Every id the game can be asked to draw, gathered from everywhere it comes from.
  const wanted=new Set([...ACTORS,...Object.keys(ITEMS),
    ...DISCOVERIES.map(d=>d.item),...DISCOVERIES.map(d=>d.setup?.item).filter(Boolean),
    ...ADVENTURES.flatMap(c=>[c.item,c.reward,c.souvenir]),
    ...ADVENTURES.flatMap(c=>c.steps.map(s=>s.item)),
    ...Object.values(PLACE_STORIES).flat().flatMap(s=>[s.item,s.reward,...s.steps.map(x=>x.item)])].filter(Boolean));

  const byHash=new Map();
  for(const id of wanted){
    let print;
    try{print=fingerprint(spriteCanvas(id,72));}
    catch(e){say('high','art',`Drawing an item crashes`,`${id}: ${e.message}`);continue;}
    if(print.hash===placeholder){say('medium','art',`"${id}" has no artwork and draws the placeholder box`,ITEMS[id]?.name||id);continue;}
    if(print.ink<12){say('medium','art',`"${id}" draws almost nothing`,`${print.ink} pixels`);continue;}
    if(print.w<8||print.h<8)say('low','art',`"${id}" is drawn too small to read on a phone`,`${print.w}x${print.h}`);
    const twin=byHash.get(print.hash);
    if(twin&&twin!==id)say('low','art',`Two different things are drawn identically`,`${twin} and ${id}`);
    byHash.set(print.hash,id);
  }

  // Characters have to read differently in each mood, and wear any hat.
  for(const who of ACTORS){
    const moods=['idle','happy','sleep','annoyed'],prints=new Map();
    for(const mood of moods){
      const p=fingerprint(spriteCanvas(who,72,{mood}));
      if(p.ink<40){say('high','art',`${NAMES[who]} barely draws when ${mood}`,`${p.ink} pixels`);continue;}
      const same=prints.get(p.hash);
      if(same)say('low','art',`${NAMES[who]} looks exactly the same ${same} and ${mood}`,who);
      prints.set(p.hash,mood);
    }
    const bare=fingerprint(spriteCanvas(who,72,{hat:null})).hash;
    for(const hat of Object.keys(ITEMS).filter(i=>ITEMS[i].wearable)){
      let p;try{p=fingerprint(spriteCanvas(who,72,{hat}));}
      catch(e){say('high','art',`Putting a hat on someone crashes`,`${who}+${hat}: ${e.message}`);continue;}
      if(p.hash===bare)say('medium','art',`A hat makes no visible difference when worn`,`${hat} on ${who}`);
    }
  }

  // An icon name with no path silently renders a star, so every tab looks the same.
  const fallback=icon('no-such-icon');
  for(const name of ['house','garden','roof','cellar','pause','sound','mute','settings','close',
                     'lock','sun','moon','users','hand','gift','draw','move','hat','play','link','shuffle','eye','check'])
    if(icon(name)===fallback)say('medium','art',`The "${name}" icon has no artwork and falls back to a star`,'icon()');
  return out;
}));

/* ── traces: the marks left behind ────────────────────────────────────────── */

add(await page.evaluate(async()=>{
  const out=[];const say=(s,a,m,d)=>out.push({severity:s,area:a,message:m,detail:d});
  const {Scene}=await import('./scene.js');
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=430;document.body.append(canvas);
  const scene=Object.create(Scene.prototype);
  scene.sparkle=Scene.prototype.sparkle.bind(scene);
  const c=canvas.getContext('2d',{willReadFrequently:true});
  // Every kind of mark the engine is able to leave in a room.
  // Everything trace() is called with, plus every aftermath an incident can leave.
  const kinds=['crumbs','mess','wet','flood','flowers','fish','frog','duck','stars','tower','moon','hole',
               'balloons','soap','potato'];
  for(const type of kinds){
    c.clearRect(0,0,400,430);
    try{scene.trace(c,{type,room:'house',x:200,y:250,at:0},1.2);}
    catch(e){say('high','traces',`Drawing a "${type}" mark crashes`,e.message);continue;}
    const d=c.getImageData(0,0,400,430).data;let ink=0;
    for(let i=3;i<d.length;i+=4)if(d[i]>8)ink++;
    if(ink<6)say('medium','traces',`The "${type}" mark is invisible, but still takes one of the eight slots a room keeps`,
                  'a mark that draws nothing can push a visible one out');
  }
  canvas.remove();return out;
}));

/* ── rooms: every place, every weather, day and night ─────────────────────── */

add(await page.evaluate(async()=>{
  const out=[];const say=(s,a,m,d)=>out.push({severity:s,area:a,message:m,detail:d});
  const {WEATHER}=await import('./shared/places.js');
  const scene=window.__auditScene;
  if(!scene)return [{severity:'high',area:'rooms',message:'The room could not be reached for inspection',detail:'window.__auditScene'}];
  if(!scene.state)return [{severity:'high',area:'rooms',message:'The room has no world to draw',detail:'scene.state'}];
  const canvas=scene.canvas,c=canvas.getContext('2d',{willReadFrequently:true});
  const raf=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;   // draw once, not forever
  try{
  for(const room of ['house','garden','roof','cellar'])for(const weather of WEATHER)for(const night of [false,true]){
    scene.room=room;scene.weatherOverride=weather;scene.night=night;
    c.clearRect(0,0,canvas.width,canvas.height);
    try{scene.draw(performance.now());}
    catch(e){say('high','rooms',`Drawing a room crashes`,`${room}/${weather}${night?'/night':''}: ${e.message}`);continue;}
    const d=c.getImageData(0,0,canvas.width,canvas.height).data;
    let painted=0,dark=0;
    for(let i=0;i<d.length;i+=4){if(d[i+3]>8){painted++;if(d[i]+d[i+1]+d[i+2]<90)dark++;}}
    const total=d.length/4;
    if(painted/total<0.9)say('high','rooms',`A room leaves part of the screen unpainted`,
      `${room}/${weather}${night?'/night':''} — ${Math.round(painted/total*100)}% covered`);
    if(dark/Math.max(painted,1)>0.85)say('medium','rooms',`A room is almost entirely black`,
      `${room}/${weather}${night?'/night':''}`);
  }
  }finally{window.requestAnimationFrame=raf;}
  scene.weatherOverride=null;scene.night=false;scene.room='house';
  scene.draw(performance.now());
  return out;
}));

/* ── layout: five phones, every screen ────────────────────────────────────── */

const MEASURE=`(()=>{
  const out=[],w=innerWidth,h=innerHeight;
  const label=el=>el.id?'#'+el.id:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,32)||el.tagName.toLowerCase();
  if(document.documentElement.scrollWidth>w+1)
    out.push({severity:'high',area:'layout',message:'The page scrolls sideways',detail:w+'px wide, content '+document.documentElement.scrollWidth+'px'});
  const root=document.querySelector('dialog[open]')||document.body;
  for(const el of root.querySelectorAll('*')){
    const style=getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
    const r=el.getBoundingClientRect();
    if(!r.width||!r.height)continue;
    if(r.left<-1||r.right>w+1)
      out.push({severity:'high',area:'layout',message:'Something sits off the side of the screen',detail:label(el)+' at '+Math.round(r.left)+'..'+Math.round(r.right)+' on a '+w+'px screen'});
    if(r.top<-1&&style.position!=='fixed'&&scrollY<1)
      out.push({severity:'medium',area:'layout',message:'Something is cut off the top of the screen',detail:label(el)});
    if(el.matches('button,a,select,input,[role=button]')&&(r.width<30||r.height<30))
      out.push({severity:'medium',area:'layout',message:'A control is too small to hit with a thumb',detail:label(el)+' is '+Math.round(r.width)+'x'+Math.round(r.height)+'px'});
    if(el.children.length===0&&el.textContent.trim()&&el.scrollWidth>el.clientWidth+2&&style.overflow!=='visible'&&!style.textOverflow.includes('ellipsis'))
      out.push({severity:'medium',area:'layout',message:'Text is cut off inside its box',detail:label(el)});
  }
  // A container that is filled on every render but never shown is work nobody sees.
  for(const el of document.querySelectorAll('#pocket,#residents,#locations,#place-actions'))
    if(el.children.length&&!el.getBoundingClientRect().height&&!el.closest('[popover]'))
      out.push({severity:'low',area:'layout',message:'A row is filled in on every redraw but is never visible',detail:'#'+el.id+' holds '+el.children.length+' items and is 0px tall'});
  const open=document.querySelector('dialog[open],:popover-open');
  if(open){
    const r=open.getBoundingClientRect();
    if(r.height>h+1||r.width>w+1||r.top<-1||r.left<-1)
      out.push({severity:'high',area:'layout',message:'A panel does not fit on the screen',detail:'#'+open.id+' is '+Math.round(r.width)+'x'+Math.round(r.height)+' on '+w+'x'+h});
    if(open.scrollHeight>open.clientHeight+2&&getComputedStyle(open).overflowY==='hidden')
      out.push({severity:'high',area:'layout',message:'A panel is taller than its box and cannot be scrolled',detail:'#'+open.id});
  }
  for(const b of root.querySelectorAll('button')){
    const r=b.getBoundingClientRect();if(!r.width||!r.height)continue;
    const name=(b.textContent||'').trim()||b.getAttribute('aria-label')||b.getAttribute('title');
    if(!name)out.push({severity:'medium',area:'reach',message:'A button has no name a screen reader can say',detail:'#'+(b.id||b.className)});
  }
  return out;
})()`;

// Controls that open a panel, and are measured with that panel open.
const SCREENS=[
  ['room',null],['tools','#open-tools'],['wardrobe','#wardrobe'],['surprise','#surprise'],
  ['draw','#draw'],['settings','#settings'],['together','#together'],
  ['history','#history'],['trace','#last-trace'],
];
// Controls that do something in the room instead, and are judged on that.
const ACTIONS=[
  ['tidy','#tidy-room',()=>!!window.__auditScene.tidying&&document.getElementById('tidy-room').getAttribute('aria-busy')==='true'],
  ['paper','#play-ball',()=>!!window.__auditScene?.toys?.mode],
  ['bubbles','#play-bubbles',()=>!!window.__auditScene?.toys?.mode],
];

for(const [w,h,name] of [[320,568,'320'],[360,640,'360'],[375,667,'375'],[390,844,'390'],[430,932,'430'],[768,1024,'tablet']]){
  await page.setViewport({width:w,height:h,deviceScaleFactor:1});
  await page.reload({waitUntil:'networkidle0'});
  await page.evaluate(()=>{const scene=document.getElementById('world');window.__auditScene=null;document.getElementById('close-sheet')?.click();});
  await delay(300);
  for(const [screen,selector] of SCREENS){
    if(selector){
      const exists=await page.$(selector);
      if(!exists){note('medium','reach',`A control the audit expects is missing`,selector);continue;}
      if(await page.$eval(selector,el=>!!el.closest('[popover]')))await page.click('#open-tools');
      await page.click(selector).catch(()=>{});
      await delay(220);
    }
    const measured=await page.evaluate(MEASURE);
    add(measured.map(f=>({...f,detail:`${f.detail} — ${screen} at ${name}px`})));
    if(SHOTS)await shot(`${name}-${screen}`);
    await page.evaluate(()=>{document.querySelector('dialog[open]')?.close();document.querySelector(':popover-open')?.hidePopover();});
    await delay(120);
  }
  // Every room tab, at this width.
  for(const place of ['house','garden','roof','cellar']){
    const ok=await page.evaluate(p=>{const b=[...document.querySelectorAll('#locations button')].find(b=>b.getAttribute('aria-label')?.toLowerCase().startsWith(p==='cellar'?'?':p.slice(0,4)));if(b){b.click();return true;}return false;},place);
    if(!ok)continue;
    await delay(220);
    add((await page.evaluate(MEASURE)).map(f=>({...f,detail:`${f.detail} — ${place} at ${name}px`})));
    if(SHOTS)await shot(`${name}-room-${place}`);
  }
}

/* ── type: characters a phone may not have a glyph for ────────────────────── */

await page.setViewport({width:390,height:844,deviceScaleFactor:1});
await page.reload({waitUntil:'networkidle0'});
await page.evaluate(async()=>{
  const {Scene}=await import('./scene.js');
  const draw=Scene.prototype.draw;
  Scene.prototype.draw=function(t){window.__auditScene=this;return draw.call(this,t);};
  document.getElementById('close-sheet')?.click();
});
await delay(300);

add(await page.evaluate(()=>{
  const out=[];
  // Latin-1, plus the handful of marks that every phone genuinely has.
  const safe=new Set([...`·—–…’‘“”♡✓×→←°%&@#`]);
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const offenders=new Map();
  for(let n=walk.nextNode();n;n=walk.nextNode()){
    if(!n.parentElement||getComputedStyle(n.parentElement).display==='none')continue;
    for(const ch of n.textContent)
      if(ch.codePointAt(0)>0x7e&&!safe.has(ch)&&ch.codePointAt(0)>0xff)
        offenders.set(ch,(offenders.get(ch)||'')+(n.textContent.trim().slice(0,28)));
  }
  for(const [ch,where] of offenders)
    out.push({severity:'medium',area:'type',
      message:`The character "${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase()}) may show as an empty box on her phone`,
      detail:where.slice(0,60)});
  return out;
}));

/* ── contrast: can she read it ────────────────────────────────────────────── */

add(await page.evaluate(()=>{
  const out=[];
  const parse=v=>{const m=v.match(/[\d.]+/g);return m?m.slice(0,3).map(Number):null;};
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(r)+.7152*f(g)+.0722*f(b);};
  const behind=el=>{
    for(let n=el;n&&n!==document.documentElement;n=n.parentElement){
      const bg=parse(getComputedStyle(n).backgroundColor);
      const alpha=getComputedStyle(n).backgroundColor.match(/[\d.]+\)$/);
      if(bg&&(!alpha||Number(alpha[0].slice(0,-1))>.5))return bg;
    }
    return [255,255,255];
  };
  const worst=new Map();
  for(const el of document.body.querySelectorAll('*')){
    if(el.children.length||!el.textContent.trim())continue;
    const style=getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
    const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    const fg=parse(style.color);if(!fg)continue;
    const a=lum(fg),b=lum(behind(el));
    const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    const size=parseFloat(style.fontSize),bold=Number(style.fontWeight)>=600;
    const need=(size>=24||(size>=18.66&&bold))?3:4.5;
    if(ratio<need){
      const key=el.id||el.className||el.tagName;
      if(!worst.has(key)||worst.get(key).ratio>ratio)worst.set(key,{ratio,need,size,text:el.textContent.trim().slice(0,30)});
    }
  }
  for(const [key,v] of worst)
    out.push({severity:v.ratio<3?'medium':'low',area:'contrast',
      message:`"${key}" is faint against what is behind it — ${v.ratio.toFixed(1)}:1, wants ${v.need}:1`,
      detail:`${Math.round(v.size)}px — "${v.text}"`});
  return out;
}));

/* ── reach: can every screen be opened and shut again ─────────────────────── */

for(const [screen,selector] of SCREENS){
  if(!selector)continue;
  await page.evaluate(()=>{document.querySelector('dialog[open]')?.close();document.querySelector(':popover-open')?.hidePopover();});await delay(100);
  if(await page.$eval(selector,el=>!!el.closest('[popover]')))await page.click('#open-tools');
  await page.click(selector).catch(()=>{});await delay(260);
  const opened=await page.evaluate(()=>!!document.querySelector('dialog[open],:popover-open'));
  if(!opened){note('medium','reach',`Tapping ${screen} opens nothing`,selector);continue;}
  const closed=await page.evaluate(()=>{const p=document.querySelector(':popover-open');if(p){p.querySelector('[popovertargetaction="hide"]').click();return true;}const d=document.querySelector('dialog[open]');const b=document.getElementById('close-sheet');if(b&&d?.contains(b)){b.click();return true;}d?.close();return true;});
  await delay(200);
  if(await page.evaluate(()=>!!document.querySelector('dialog[open],:popover-open')))
    note('medium','reach',`The ${screen} panel cannot be closed`,selector);
}

for(const [name,selector,check] of ACTIONS){
  await page.evaluate(()=>document.querySelector('dialog[open]')?.close());await delay(120);
  if(!await page.$(selector)){note('medium','reach',`A control the audit expects is missing`,selector);continue;}
  // Tidying deliberately owns the toys for its short choreography.
  await page.waitForFunction(selector=>!document.querySelector(selector).disabled,{timeout:4000},selector);
  await page.click(selector).catch(()=>{});await delay(300);
  if(!await page.evaluate(check))note('medium','reach',`Tapping ${name} does nothing you can see`,selector);
}

}finally{
  await Promise.race([browser.close().catch(()=>{}),delay(4000)]);
  if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');
  server.kill();await delay(150);
  if(!SHOTS&&path.basename(data).startsWith('monki-ui-'))await rm(data,{recursive:true,force:true});
}

const order={high:0,medium:1,low:2};
findings.sort((a,b)=>order[a.severity]-order[b.severity]||a.area.localeCompare(b.area));
if(JSON_OUT)console.log(JSON.stringify(findings,null,2));
else{
  console.log(`\nMonki World visual audit — art, icons, traces, rooms, layout at six widths, type, contrast, reach\n`);
  if(!findings.length)console.log('  No findings.\n');
  for(const f of findings){
    console.log(`  ${{high:'HIGH  ',medium:'MEDIUM',low:'LOW   '}[f.severity]} [${f.area}] ${f.message}`);
    if(f.detail)console.log(`         ${f.detail}`);
  }
  const n=s=>findings.filter(f=>f.severity===s).length;
  console.log(`\n  ${findings.length} findings — ${n('high')} high, ${n('medium')} medium, ${n('low')} low\n`);
  if(SHOTS)console.log(`  screenshots: ${output}\n`);
}
process.exit(findings.some(f=>f.severity==='high')?1:0);

import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const data=await mkdtemp(path.join(os.tmpdir(),'monki-accessories-')),port=54000+Math.floor(Math.random()*2000),base=`http://127.0.0.1:${port}`;
const output=process.env.MONKI_ARTIFACT_DIR||path.join(data,'screens');await mkdir(output,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:data},stdio:'ignore'});
let browser;const errors=[];
try{
  for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await delay(60);}
  browser=await puppeteer.launch({executablePath:process.env.BROWSER_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1180,height:1500,deviceScaleFactor:1});await page.goto(base+'/?test=1',{waitUntil:'networkidle0'});await page.click('#close-sheet');
  const result=await page.evaluate(async()=>{
    const{character,headProfile}=await import('./art.js'),{ITEMS,ACTORS}=await import('./shared/world.js');
    const failures=[],canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d',{willReadFrequently:true});
    const pixels=()=>c.getImageData(0,0,256,256).data;
    const mask=color=>{const data=pixels(),points=[];for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;if(data[i]===color[0]&&data[i+1]===color[1]&&data[i+2]===color[2]&&data[i+3]>240)points.push({x,y});}return points;};
    const draw=(id,options)=>{c.clearRect(0,0,256,256);character(c,id,128,190,{scale:2,shadow:false,...options});};
    const poses=[{}, {mood:'sleep'}, {pet:1}, {carried:true,frame:3}];let renders=0;
    for(const id of ACTORS)for(const [hat,definition]of Object.entries(ITEMS).filter(([,d])=>d.wearable))for(const pose of poses)for(const flip of [false,true]){
      draw(id,{hat,...pose,flip});renders++;const data=pixels();let ink=0,edge=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(data[(y*256+x)*4+3]){ink++;if(x<2||x>253||y<2||y>253)edge++;}
      if(!ink||edge)failures.push(`${id}/${hat}/${JSON.stringify(pose)} clipped or empty`);
    }
    for(const id of ACTORS)for(const pose of poses.slice(0,3))for(const flip of [false,true]){
      const dog=['sernik','galgan','kot'].includes(id),kind=dog&&pose.pet?'belly':dog&&pose.mood==='sleep'?'sleep':'standing',h=headProfile(id,kind);
      const eyeX=128+(flip?-1:1)*h.x*2,eyeY=190+h.eyeY*2;
      for(const [hat,color]of [['glasses',[61,72,64]],['headphones',[168,124,100]]]){
        draw(id,{hat,...pose,flip});const points=mask(color),cx=points.reduce((n,p)=>n+p.x,0)/points.length,cy=points.reduce((n,p)=>n+p.y,0)/points.length;
        if(!points.length||Math.abs(cx-eyeX)>5||Math.abs(cy-eyeY)>7)failures.push(`${id}/${kind}/${hat}/${flip}: accessory not attached to eyes/ears (${cx},${cy} vs ${eyeX},${eyeY})`);
      }
      const eyesVisible=()=>{const data=pixels();let count=0;for(let y=Math.floor(eyeY-3);y<=Math.ceil(eyeY+3);y++)for(let x=Math.floor(eyeX-19);x<=Math.ceil(eyeX+19);x++){const i=(y*256+x)*4;if(data[i+3]>240&&((data[i]===48&&data[i+1]===57&&data[i+2]===50)||(data[i]===69&&data[i+1]===70&&data[i+2]===55)))count++;}return count;};
      draw(id,{...pose,flip});const bareEyes=eyesVisible();
      for(const hat of ['helmet','beret','chefhat','towel','flowercrown']){draw(id,{hat,...pose,flip});if(eyesVisible()<bareEyes*.8)failures.push(`${id}/${kind}/${hat}/${flip}: hat obscures the eyes`);}
    }
    const columns=[['David','david',{}],['Julia','julia',{}],['Monki','monki',{}],['Sernik','sernik',{}],['Galgan','galgan',{}],['Sleeping','sernik',{mood:'sleep'}],['Sleeping','galgan',{mood:'sleep'}],['Belly up','sernik',{pet:1}],['Belly up','galgan',{pet:1}],['Kot','kot',{}],['Kot asleep','kot',{mood:'sleep'}]];
    const hats=['glasses','headphones','bow','flower','helmet','beret','towel','flowercrown'];
    const atlas=document.createElement('canvas');atlas.id='accessory-atlas';atlas.width=1180;atlas.height=1460;Object.assign(atlas.style,{position:'fixed',inset:'0',zIndex:10000,width:'1180px',height:'1460px'});document.body.append(atlas);const a=atlas.getContext('2d');a.fillStyle='#eef0df';a.fillRect(0,0,1180,1460);
    a.font='15px sans-serif';a.textAlign='center';a.fillStyle='#334d42';for(let j=0;j<columns.length;j++)a.fillText(columns[j][0],100+j*100,25);
    for(let i=0;i<hats.length;i++){a.textAlign='left';a.fillStyle='#334d42';a.fillText(ITEMS[hats[i]].name,12,65+i*178);a.strokeStyle='#c4cebb';a.beginPath();a.moveTo(0,42+i*178);a.lineTo(1180,42+i*178);a.stroke();for(let j=0;j<columns.length;j++){const[,id,pose]=columns[j];character(a,id,100+j*100,185+i*178,{hat:hats[i],scale:2.45,...pose});}}
    return{renders,failures};
  });
  await page.$eval('#accessory-atlas',e=>e.scrollIntoView());await page.screenshot({path:path.join(output,'v13-accessory-fitting.png'),clip:{x:0,y:0,width:1180,height:1460}});
  console.log(JSON.stringify({...result,errors},null,2));assert.deepEqual(result.failures,[]);assert.deepEqual(errors,[]);
}finally{if(browser){await Promise.race([browser.close().catch(()=>{}),delay(2500)]);if(browser.process()?.exitCode===null)browser.process().kill('SIGTERM');await browser.disconnect();}server.kill();await delay(100);await rm(data,{recursive:true,force:true});}
process.exit(0);

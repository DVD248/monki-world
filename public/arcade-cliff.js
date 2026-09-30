import {character,rect,poly,ellipse} from './art.js';
import {CliffRun,CLIFF,CLIFF_ZONES} from './shared/arcade-cliff.js';
import {W,H,along,noise,clamp,mix,stars} from './arcade-kit.js';

// Cliff Jump: rocks standing in the sea off the end of the garden, through an evening and a
// night, out to a lighthouse. Each rock has a flower in the middle, which is where a
// Perfect lands.
const SKY=[[0,'#cfe6ea'],[40,'#b9d7e0'],[80,'#e7b98f'],[130,'#2e3558'],[200,'#141829']];
const HAZE=[[0,'#eef3e2'],[40,'#e3eee9'],[80,'#f3d8b4'],[130,'#4a5078'],[200,'#1f2440']];
const SEA=[[0,'#7fb3bf'],[80,'#8fa9b8'],[130,'#3a4f6a'],[200,'#26334a']];
const STONE=[[0,'#a39684'],[40,'#9a8d7d'],[130,'#5f5a60'],[200,'#4a4652']];
const TOPS=[[0,'#8fae72'],[40,'#a3b77f'],[80,'#b8a46a'],[130,'#5d6e58'],[200,'#4a5a4c']];
const sy=h=>CLIFF.water-h;

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time;
  // The view drifts after Sernik and settles with him on the left, the next rock in sight.
  const dt=Math.min(.05,t-(g.camT??t));g.camT=t;
  const want=L.x-110+(L.state==='air'?40:0);g.camX=(g.camX??want)+(want-(g.camX??want))*Math.min(1,dt*3.2);
  const cam=g.camX,grad=c.createLinearGradient(0,0,0,CLIFF.water);grad.addColorStop(0,along(SKY,s));grad.addColorStop(1,along(HAZE,s));c.fillStyle=grad;c.fillRect(0,0,W,CLIFF.water);
  stars(c,rect,t,clamp((s-100)/40,0,1),{drift:cam*.05,bottom:320});
  if(s>=80&&s<130){ellipse(c,300,CLIFF.water-40,38,38,'#f3c98a');}
  // Clouds and gulls in the open sky above the rocks.
  if(s<130){c.globalAlpha=.55;for(let k=Math.floor(cam*.1/210)-1;k<Math.floor(cam*.1/210)+3;k++){const x=k*210-cam*.1+(t*4)%210,y=60+noise(k)*110,w=60+noise(k+1)*50;ellipse(c,x,y,w/2,12,'#ffffff');ellipse(c,x-w*.18,y-9,w*.24,11,'#ffffff');}c.globalAlpha=1;
    c.strokeStyle=mix(along(SKY,s),'#3a4038',.55);c.lineWidth=1.5;for(let i=0;i<3;i++){const x=((noise(i)*W+t*(14+i*5)-cam*.3)%(W+40)+W+40)%(W+40)-20,y=90+noise(i+8)*120+Math.sin(t+i)*6,f=Math.sin(t*5+i)*3;c.beginPath();c.moveTo(x-7,y-f);c.lineTo(x,y);c.lineTo(x+7,y-f);c.stroke();}}
  // Far islands, then the lighthouse once it is near.
  const far=mix(along(HAZE,s),along(STONE,s),.35);
  for(let k=Math.floor(cam*.2/160)-1;k<Math.floor(cam*.2/160)+4;k++){const x=k*160-cam*.2,h=30+noise(k)*50;ellipse(c,x+60,CLIFF.water,60+noise(k+2)*40,h,far);}
  if(s>=170){const lx=W-60-(cam*.15)%40,top=CLIFF.water-150;rect(c,lx,top,22,150,'#e9e4d8');for(let y=top+20;y<CLIFF.water;y+=40)rect(c,lx,y,22,12,'#c96b5a');rect(c,lx-4,top-18,30,18,'#3a3f48');rect(c,lx+2,top-14,18,10,'#fbe4a4');
    const sweep=Math.sin(t*1.3);c.globalAlpha=.18;poly(c,[[lx+11,top-9],[lx+11+sweep*260,top-50],[lx+11+sweep*260,top+30]],'#fbe4a4');c.globalAlpha=1;}
  const sea=along(SEA,s);rect(c,0,CLIFF.water,W,H-CLIFF.water,sea);
  const stone=along(STONE,s),dark=mix(stone,'#000000',.25),top=along(TOPS,s);
  for(const rock of L.rocks){
    const x=rock.x-cam;if(x>W+20||x+rock.w<-20)continue;const y=sy(rock.h);
    rect(c,x+3,y+6,rock.w-6,H-y,stone);rect(c,x,y+4,rock.w,H-y,stone);rect(c,x+rock.w-8,y+8,8,H-y,dark);
    for(let k=0;k<rock.h/28;k++){const ky=y+22+k*28+noise(rock.id+k)*10;if(ky<CLIFF.water)rect(c,x+4+noise(rock.id*3+k)*(rock.w-18),ky,10,3,dark);}
    rect(c,x-2,y,rock.w+4,7,top);rect(c,x,y+7,rock.w,2,mix(top,'#000000',.2));
    // The middle of the rock: a small flower, where a Perfect lands.
    const m=x+rock.w/2;rect(c,m-1,y-6,2,6,'#5d7a4a');rect(c,m-3,y-9,6,4,rock===L.on||rock===L.from?'#f3e3a0':'#e8b4a8');
  }
  // Waves over the feet of the rocks.
  for(let x=-((t*18+cam*.5)%32);x<W;x+=32){rect(c,x,CLIFF.water+2,18,2,mix(sea,'#ffffff',.3));rect(c,x+14,CLIFF.water+14,12,2,mix(sea,'#ffffff',.18));}
  sernik(g,c,L,t,cam);
  if(L.state==='charge'){const x=L.x-cam,y=sy(L.y)-44;rect(c,x-22,y,44,6,'rgba(38,48,36,.4)');rect(c,x-21,y+1,42*L.charge,4,L.charge>=1?'#d8847a':'#e4c87a');}
}
function sernik(g,c,L,t,cam){
  const x=L.x-cam,y=sy(L.y),squash=L.state==='charge'?L.charge*(g.reduced?.4:1):clamp(1-(t-(g.landShown??-9))*6,0,1)*.6;
  c.save();c.translate(x,Math.min(y,CLIFF.water+30));
  if(L.state==='air'&&!g.reduced)c.rotate(clamp(-L.vy/1600,-.35,.35));
  if(L.state==='fall')c.rotate(Math.min(1.2,(t-(g.fallShown??t))*3));
  c.scale(1+squash*.14,1-squash*.26);
  character(c,'sernik',0,0,{scale:1.35,mood:L.state==='fall'||L.over?'annoyed':L.state==='air'?'happy':'idle',frame:L.state==='air'?t*10:t*2,running:L.state==='air',hat:g.hat,shadow:L.state==='stand'||L.state==='charge'});
  c.restore();
}
function event(g,e){
  const s=g.sound,L=g.logic,x=e.x-(g.camX??0),y=sy(e.y);
  switch(e.type){
    case 'crouch':s('charge');break;
    case 'leap':s('boing',.8+e.charge*.4);g.burst(x,y,4,{colors:['#d9c9a3','#b39b75'],speed:50,up:20,g:200,size:3,life:.35});break;
    case 'land':g.landShown=g.time;s('land');g.burst(x,y,5,{colors:['#d9c9a3','#b39b75'],speed:60,up:30,g:200,size:3,life:.4});
      if(e.perfect){s('best',1+Math.min(.3,e.streak*.08));g.say(e.streak>1?`Perfect ×${e.streak}  +${e.points}`:'Perfect! +2',x,y-70,{color:'#e4c87a',size:20,life:1.1});g.burst(x,y-4,14,{colors:['#e4c87a','#fbe4a4','#e8b4a8'],speed:130,up:70,size:3,life:.7});}
      else s('point');break;
    case 'same':s('land');g.say('Same rock',x,y-60,{size:14});break;
    case 'bump':g.fallShown=g.time;s('bonk');g.shake=4;g.say('Oof',x,y-50,{size:16});break;
    case 'splash':s('splash');g.shake=3;g.burst(x,CLIFF.water,18,{colors:['#dcecef','#a9cfd8','#ffffff'],speed:170,up:160,g:600,size:4,life:.9});break;
  }
}
function card(c,{hat}={}){
  const grad=c.createLinearGradient(0,0,0,70);grad.addColorStop(0,'#cfe6ea');grad.addColorStop(1,'#eef3e2');c.fillStyle=grad;c.fillRect(0,0,120,70);
  rect(c,0,70,120,20,'#7fb3bf');for(let x=4;x<120;x+=22)rect(c,x,74,12,2,'#b3d3da');
  for(const [x,w,y] of [[6,30,52],[80,26,40]]){rect(c,x,y+3,w,90,'#a39684');rect(c,x-1,y,w+2,5,'#8fae72');}
  rect(c,92,34,2,6,'#5d7a4a');rect(c,90,32,6,3,'#e8b4a8');
  c.strokeStyle='rgba(255,255,255,.7)';c.setLineDash([2,4]);c.beginPath();c.moveTo(24,50);c.quadraticCurveTo(52,4,92,36);c.stroke();c.setLineDash([]);
  c.save();c.translate(58,30);c.rotate(.15);character(c,'sernik',0,0,{scale:.95,mood:'happy',running:true,frame:1,shadow:false,hat});c.restore();
}
export default {Logic:CliffRun,zones:CLIFF_ZONES,draw,event,card,camera:g=>({x:g.camX??0,y:0}),reset:g=>{g.camX=null;g.camT=null;g.landShown=-9;g.fallShown=null;}};

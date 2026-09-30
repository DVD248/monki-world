import {character,item,rect,poly,ellipse} from './art.js';
import {JetRun,JET,JET_ZONES,gapY} from './shared/arcade-jet.js';
import {W,H,along,noise,clamp,stars} from './arcade-kit.js';

// Jet Monki: over the garden and the roofs in the afternoon, into a storm, and on into the
// night, with the chimneys lit and the clouds gone dark.
const TOP=[[0,'#bcd9e0'],[25,'#a9b8bd'],[50,'#e7b98f'],[85,'#2e3558'],[130,'#141829']];
const LOW=[[0,'#e6f0dc'],[25,'#cdd6d2'],[50,'#f3d8b4'],[85,'#4a5078'],[130,'#1f2440']];
const CLOUD=[[0,'#9aa3a8'],[25,'#7d878d'],[50,'#9a8f96'],[85,'#454b66'],[130,'#343850']];
const BRICK=[[0,'#b0654a'],[50,'#b86a4c'],[85,'#7a4a44'],[130,'#5c3d3e']];

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock(),dist=L.dist;
  const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,along(TOP,s));grad.addColorStop(1,along(LOW,s));c.fillStyle=grad;c.fillRect(0,0,W,H);
  stars(c,rect,t,clamp((s-70)/25,0,1),{drift:dist*.05,bottom:420});
  if(s>=110){const my=90;ellipse(c,318,my,24,24,'#f1ead0');ellipse(c,310,my-6,5,4,'#ddd4b4');}
  // Far away: soft clouds, then the rooftops of the town, sliding slower than the chimneys.
  c.globalAlpha=clamp(1-(s-60)/40,.15,.5);
  for(let k=Math.floor(dist*.12/190)-1;k<Math.floor(dist*.12/190)+4;k++){const x=k*190-dist*.12,y=70+noise(k)*160,w=70+noise(k+3)*60;ellipse(c,x,y,w/2,13,'#ffffff');ellipse(c,x-w*.15,y-9,w*.25,12,'#ffffff');}
  c.globalAlpha=1;
  const town=along(LOW,s),roofs=mixDark(town,.22),windows=s>=70?'#f3dc8e':mixDark(town,.3);
  for(let k=Math.floor(dist*.35/70)-1;k<Math.floor(dist*.35/70)+8;k++){
    const x=k*70-dist*.35,h=40+noise(k)*50,top=JET.ground-h;
    rect(c,x,top,62,h,roofs);poly(c,[[x-4,top],[x+31,top-18-noise(k+2)*10],[x+66,top]],roofs);
    if(noise(k+4)>.35)rect(c,x+14,top+12,9,11,windows);if(noise(k+6)>.45)rect(c,x+38,top+14,9,11,windows);
  }
  for(const col of L.columns){const x=col.x-dist;if(x<-60||x>W+60)continue;const gy=gapY(col,vt);cloud(c,x,gy-col.gap/2,s,t,col.id);chimney(c,x,gy+col.gap/2,s,col.id);}
  // The roofs he flies over: close, and moving at his own speed.
  rect(c,0,JET.ground,W,H-JET.ground,s>=85?'#4a3b3c':'#9c5a43');
  for(let x=-(dist%24);x<W;x+=24){rect(c,x,JET.ground+4,20,6,s>=85?'#5a4748':'#b56d51');rect(c,x+12,JET.ground+16,20,6,s>=85?'#5a4748':'#b56d51');}
  rect(c,0,JET.ground,W,3,s>=85?'#2f2628':'#7c4433');
  monki(g,c,L,t);
}
const mixDark=(hex,k)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*(1-k)).toString(16).padStart(2,'0')).join('');
/** A storm cloud hanging to `bottom`. Its lowest bumps are exactly where it can be touched;
 * the puffs at its sides bulge a little past that, so a near miss looks like one. */
function cloud(c,x,bottom,s,t,id){
  const body=along(CLOUD,s),shade=mixDark(body,.2),light=mixDark(body,-.14),w=JET.col,l=x-w/2;
  rect(c,l,-4,w,bottom-8,body);
  for(let y=bottom-30,k=0;y>-30;y-=24,k++){const wob=noise(id*7+k)*6;ellipse(c,l+3-wob*.5,y,9+wob,13,body);ellipse(c,l+w-3+wob*.5,y+10,9+noise(id*3+k)*6,13,body);}
  for(let i=0;i<4;i++)ellipse(c,l+8+i*(w-16)/3,bottom-11,12,11,body);
  rect(c,l+4,bottom-19,w-8,4,shade);for(let i=0;i<4;i++)ellipse(c,l+8+i*(w-16)/3,bottom-6,7,4,shade);
  for(let y=bottom-60,k=0;y>-20;y-=46,k++)ellipse(c,l+18+noise(id+k)*14,y,11,7,light);
  // In the storm, now and then, one lights up from inside. Nothing comes out of it.
  if(s>=25&&s<85&&noise(id)>.6&&Math.sin(t*1.7+id)>.985){c.globalAlpha=.35;rect(c,l,-4,w,bottom-8,'#fbf3cf');c.globalAlpha=1;}
}
function chimney(c,x,top,s,id){
  const brick=along(BRICK,s),mortar=mixDark(brick,.25),l=x-JET.col/2;
  rect(c,l,top+12,JET.col,JET.ground-top,brick);
  for(let y=top+18,row=0;y<JET.ground;y+=10,row++){rect(c,l,y,JET.col,1,mortar);for(let bx=l+(row%2?8:18);bx<l+JET.col;bx+=20)rect(c,bx,y-9,1,9,mortar);}
  rect(c,l-5,top,JET.col+10,13,mixDark(brick,.3));rect(c,l-5,top,JET.col+10,3,mixDark(brick,-.15));
  rect(c,l+JET.col-9,top+13,4,JET.ground-top-13,mixDark(brick,.12));
  if(s>=85&&noise(id+1)>.5)rect(c,x-6,top+40,12,14,'#f3dc8e');
}
function monki(g,c,L,t){
  const after=g.overAt===null?0:g.time-g.overAt,falling=L.over;
  let y=L.y,angle=L.state==='ready'?Math.sin(t*4)*.06:clamp(L.vy/900,-.35,.6);
  if(falling){y=Math.min(JET.ground-JET.hitH,L.y+JET.gravity*after*after/2+L.vy*after*.2);angle=Math.min(Math.PI*.9,.6+after*6);}
  c.save();c.translate(JET.x,y);c.rotate(g.reduced?angle*.4:angle);
  const flame=!falling&&(L.state==='ready'||t-(g.flapShown??-1)<.18);
  // The rocket on his back, and a flame out of the bottom of it when he pushes.
  if(flame){const f=6+Math.sin(t*50)*3;poly(c,[[-21,13],[-9,13],[-15,13+f+10]],'#f3a95a');poly(c,[[-18,13],[-12,13],[-15,13+f+3]],'#fbe4a4');}
  item(c,'rocket',-15,14,{scale:.62});
  character(c,'monki',2,17,{scale:1.05,mood:falling?'annoyed':'happy',frame:t*4,hat:g.hat,shadow:false});
  c.restore();
}
function event(g,e){
  const s=g.sound;
  switch(e.type){
    case 'flap':s('jet');g.flapShown=g.time;g.burst(JET.x-15,e.y+30,4,{colors:['#e9e4d8','#d6d0c2'],speed:40,up:-60,g:-30,size:4,life:.45});break;
    case 'pass':s('point',1+Math.min(.6,(e.score%10)*.06));if(e.score%10===0){s('best',.9);g.say(`${e.score}!`,W/2,H*.34,{color:'#e4c87a',size:26,life:1.1});}break;
    case 'crash':s('bonk');setTimeout(()=>{if(!g.stopped)s('fall');},120);g.shake=6;g.flash=.35;
      g.burst(JET.x,e.y,12,{colors:e.what==='cloud'?['#9aa3a8','#d9dde0']:['#b0654a','#8c4f3a','#e9e4d8'],speed:150,up:40,size:4,life:.8});
      g.say(e.what==='cloud'?'Into the cloud':e.what==='chimney'?'Bonk':'Down he comes',JET.x+40,e.y-30,{size:16});break;
  }
}
function card(c,{hat}={}){
  const grad=c.createLinearGradient(0,0,0,90);grad.addColorStop(0,'#bcd9e0');grad.addColorStop(1,'#e6f0dc');c.fillStyle=grad;c.fillRect(0,0,120,90);
  rect(c,0,80,120,10,'#9c5a43');
  rect(c,88,52,26,30,'#b0654a');rect(c,85,48,32,7,'#8c4f3a');for(let y=60;y<80;y+=7)rect(c,88,y,26,1,'#8c4f3a');
  rect(c,88,0,28,14,'#9aa3a8');for(let i=0;i<3;i++)ellipse(c,93+i*9,14,6,5,'#9aa3a8');
  c.save();c.translate(46,50);c.rotate(-.2);poly(c,[[-17,11],[-7,11],[-12,24]],'#f3a95a');item(c,'rocket',-12,12,{scale:.5});
  character(c,'monki',0,15,{scale:.9,mood:'happy',shadow:false,hat});c.restore();
  for(let i=0;i<3;i++)ellipse(c,24-i*8,64+i*5,4-i,4-i,'#e9e4d8');
}
export default {Logic:JetRun,zones:JET_ZONES,draw,event,card,camera:g=>({x:g.logic.dist,y:0}),reset:g=>{g.flapShown=-1;}};

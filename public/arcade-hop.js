import {character,rect,poly,ellipse} from './art.js';
import {HopRun,HOP,HOP_ZONES,padX,padUnder,padSoon,padReach} from './shared/arcade-hop.js';
import {W,H,along,noise,clamp,mix} from './arcade-kit.js';

// Water Hop: seen from above, a pond at the bottom of the garden that becomes a stream, a
// river, a river at dusk and at night, and at last the sea. Galgan stands up in it the way
// he stands everywhere, and the banks are where to catch a breath.
const WATER=[[0,'#8fc1c4'],[20,'#86b8c6'],[50,'#6fa2b8'],[90,'#c29a8a'],[140,'#2f3f5e'],[200,'#26405a']];
const GRASS=[[0,'#9eb67b'],[90,'#a7a36e'],[140,'#4f6448'],[200,'#b9a98a']];
const LILY=[[0,'#7ea860'],[90,'#86a15a'],[140,'#4f7a4a']];
const sy=(L,row)=>HOP.base-(row*HOP.row-L.cam);

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock(),water=along(WATER,s),light=mix(water,'#ffffff',.28),grass=along(GRASS,s),lily=along(LILY,s);
  rect(c,0,0,W,H,water);
  for(const row of L.rows){
    const y=sy(L,row.n);if(y<-HOP.row||y>H+HOP.row)continue;
    if(row.kind==='bank'){bank(c,y,grass,row.n,s);continue;}
    // The current: short bright strokes drifting the row's way.
    for(let i=0;i<6;i++){const x=((noise(row.n*7+i)*W+row.dir*row.speed*vt*.8)%(W+40)+W+40)%(W+40)-20;rect(c,x,y-18+noise(row.n+i)*36,14,2,light);}
  }
  for(const row of L.rows){
    const y=sy(L,row.n);if(y<-HOP.row||y>H+HOP.row||row.kind==='bank')continue;
    // A ring round each pad a hop would reach right now: the wait is for one of these.
    const near=!L.hop&&!L.over&&Math.abs(row.n-L.row)<=1&&row.n>=L.base;
    for(const pad of row.pads){const x=padX(row,pad,vt);if(x+pad.w/2<-10||x-pad.w/2>W+10)continue;
      if(row.kind==='log')log(c,x,y,pad.w,row.dir);else lilyPad(c,x,y,pad,row,vt,lily,water);
      if(near&&pad!==L.on&&!padUnder(row,pad,vt)&&padReach(row,pad,L.x,vt))ring(c,x,y,pad,row,t);}
  }
  galgan(g,c,L,t);
  // Falling behind the rising view: the bottom edge warns first.
  const low=clamp((sy(L,L.row)-(H-110))/80,0,1);
  if(low>0&&!L.over){c.globalAlpha=low*(.3+.2*Math.sin(t*12));rect(c,0,H-26,W,26,'#d8847a');c.globalAlpha=1;}
  if(s>=140)for(let i=0;i<10;i++){const x=(noise(i)*W+Math.sin(t*.7+i)*30+W)%W,y=(noise(i+4)*H+Math.cos(t*.5+i)*20+H)%H;c.globalAlpha=.5+.5*Math.sin(t*3+i);rect(c,x,y,2,2,'#f3e7a0');}
  c.globalAlpha=1;
}
function bank(c,y,grass,n,s){
  rect(c,0,y-HOP.row/2,W,HOP.row,grass);rect(c,0,y-HOP.row/2,W,3,mix(grass,'#000000',.15));rect(c,0,y+HOP.row/2-3,W,3,mix(grass,'#000000',.15));
  for(let i=0;i<9;i++){const x=noise(n*11+i)*W,fy=y-20+noise(n*5+i)*40;if(noise(n+i*3)>.5)rect(c,x,fy,3,3,noise(i+n)>.5?'#f3e3a0':'#e8b4a8');else{rect(c,x,fy,2,7,mix(grass,'#000000',.2));rect(c,x+3,fy+2,2,5,mix(grass,'#000000',.2));}}
  if(s>=200)for(let i=0;i<4;i++)ellipse(c,noise(n*3+i)*W,y+noise(n+i)*20-10,6,4,'#e9e0cf');
}
function log(c,x,y,w,dir){
  const l=x-w/2;rect(c,l+3,y-11,w-6,24,'#8a6446');rect(c,l,y-8,w,18,'#8a6446');rect(c,l+3,y-11,w-6,4,'#a67c57');rect(c,l+3,y+9,w-6,4,'#6e4f37');
  for(let k=l+14;k<l+w-10;k+=22)rect(c,k,y-6,10,2,'#6e4f37');
  ellipse(c,dir>0?l+w-3:l+3,y+1,5,10,'#c9a274');ellipse(c,dir>0?l+w-3:l+3,y+1,2,5,'#a67c57');
}
function lilyPad(c,x,y,pad,row,vt,lily,water){
  const under=padUnder(row,pad,vt);
  // A diving pad shivers for the whole warning before it sinks (harder as it gets closer),
  // and shows through the water while it is down.
  const soon=padSoon(row,pad,vt),close=soon&&padUnder(row,pad,vt+HOP.warn/2);
  const shake=soon?Math.sin(vt*40)*(close?2.5:1.5):0,r=pad.w/2;
  if(under){c.globalAlpha=.22;ellipse(c,x,y,r,r*.62,lily);c.globalAlpha=1;for(let i=0;i<2;i++)rect(c,x-6+i*10,y-4-((vt*20+i*7)%10),2,2,mix(water,'#ffffff',.5));return;}
  const col=pad.omega?mix(lily,'#c9d98a',.45):lily;
  ellipse(c,x+shake,y+2,r,r*.62,mix(col,'#000000',.2));ellipse(c,x+shake,y,r,r*.62,col);
  poly(c,[[x+shake,y],[x+shake+r*.9,y-r*.2],[x+shake+r*.9,y+r*.25]],mix(col,'#000000',.12));
  rect(c,x+shake-r*.5,y-r*.28,r*.4,2,mix(col,'#ffffff',.25));
  if(noise(pad.x0)>.72){rect(c,x-r*.35,y-6,6,4,'#f3c9d0');rect(c,x-r*.35+1,y-8,4,2,'#fbe4ea');}
}
function ring(c,x,y,pad,row,t){
  c.globalAlpha=.55+.25*Math.sin(t*6);c.strokeStyle='#fffdf3';c.lineWidth=2;c.beginPath();
  if(row.kind==='log'){const l=x-pad.w/2-4;c.roundRect?c.roundRect(l,y-15,pad.w+8,30,10):c.rect(l,y-15,pad.w+8,30);}
  else c.ellipse(x,y,pad.w/2+4,pad.w*.31+4,0,0,Math.PI*2);
  c.stroke();c.globalAlpha=1;
}
function galgan(g,c,L,t){
  const after=g.overAt===null?0:g.time-g.overAt;let x=L.x,y=L.hop?null:sy(L,L.row),lift=0,scale=1.3;
  if(L.hop){const k=clamp((L.time-L.hop.at)/HOP.hop,0,1),a=sy(L,L.hop.from.row),b=sy(L,L.hop.to);y=a+(b-a)*k;lift=Math.sin(k*Math.PI)*24;scale=1.3+Math.sin(k*Math.PI)*.18;}
  if(L.over){c.save();c.beginPath();c.rect(0,0,W,y+4-Math.min(30,after*60));c.clip();}
  ellipse(c,x,y+4,12-lift*.2,4,'rgba(30,50,60,.28)');
  character(c,'galgan',x,y+4-lift+(L.over?Math.min(30,after*60):0),{scale,flip:L.hop?L.hop.x<L.hop.from.x:false,mood:L.over?'annoyed':L.hop?'happy':'idle',frame:t*2,hat:g.hat,shadow:false});
  if(L.over)c.restore();
}
function event(g,e){
  const s=g.sound,L=g.logic,y=HOP.base-(e.y-L.cam);
  switch(e.type){
    case 'hop':s('boing',.9);break;
    case 'land':s(e.log?'wood':'land');g.burst(e.x,y+2,4,{colors:['#dcecef','#ffffff'],speed:40,up:0,g:0,size:3,life:.3});break;
    case 'up':if(e.score%10===0){s('best',.9);g.say(`${e.score}!`,W/2,H*.3,{color:'#e4c87a',size:24,life:1});}else s('point',1+Math.min(.5,(e.score%10)*.05));break;
    case 'splash':s('splash');g.shake=3;g.burst(e.x,y,16,{colors:['#dcecef','#a9cfd8','#ffffff'],speed:150,up:120,g:500,size:4,life:.8});
      g.say(e.how==='carried'?'Swept off the side':e.how==='dive'?'The pad went under':e.how==='behind'?'Left behind':'Splash',e.x,y-50,{size:16});break;
  }
}
function card(c,{hat}={}){
  rect(c,0,0,120,90,'#8fc1c4');rect(c,0,74,120,16,'#9eb67b');
  for(let i=0;i<5;i++)rect(c,8+i*24,14+(i%2)*30,12,2,'#b9dcdf');
  for(const [x,y,r] of [[28,56,14],[74,40,12],[100,22,11],[40,18,10]]){ellipse(c,x,y+1,r,r*.62,'#5f8248');ellipse(c,x,y,r,r*.62,'#7ea860');}
  c.save();c.translate(58,40);character(c,'galgan',0,0,{scale:.95,mood:'happy',shadow:false,hat});c.restore();
  ellipse(c,58,48,8,3,'rgba(30,50,60,.3)');
}
export default {Logic:HopRun,zones:HOP_ZONES,draw,event,card,camera:g=>({x:0,y:-g.logic.cam})};

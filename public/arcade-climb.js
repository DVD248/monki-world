import {character,item,rect,poly,ellipse} from './art.js';
import {ClimbRun,CLIMB,CLIMB_ZONES} from './shared/arcade-climb.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Kot Climb: up the scratching post in the living room, through the ceiling and the attic, out
// over the roof and into the sky, with the shelves coming down on either side. Kot holds on to
// whichever side was tapped; the bar along the top is how long Kot can hang on.
const KY=470,POST=40,ARM=44,SHELF=92;
const TOP=[[0,'#e9dcc3'],[60,'#e2d3b6'],[75,'#8a6e52'],[115,'#9cc6d6'],[180,'#bcdbe8'],[260,'#2e3558'],[400,'#141829']];
const LOW=[[0,'#f3e9d6'],[60,'#efe2c9'],[75,'#a3876a'],[115,'#d8ecef'],[180,'#e9f2f0'],[260,'#4a5078'],[400,'#1f2440']];
const WOOD=[{board:'#a47a52',top:'#c09468',edge:'#7e5b3c'},{board:'#b98d63',top:'#d3a87a',edge:'#8d6845'},{board:'#8f6a48',top:'#a9805a',edge:'#6c4d33'}];

/** Where step k is on the screen, with the climb eased so a hop does not jolt the picture. */
const sy=(g,k)=>KY-(k-g.shown)*CLIMB.step;

function backdrop(g,c,s,t){
  const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,along(TOP,s));grad.addColorStop(1,along(LOW,s));c.fillStyle=grad;c.fillRect(0,0,W,H);
  stars(c,rect,t,clamp((s-240)/30,0,1),{bottom:H});
  if(s>=380){ellipse(c,318,90,24,24,'#f1ead0');ellipse(c,310,84,5,4,'#ddd4b4');}
  const scroll=g.shown*CLIMB.step;
  // Indoors: wallpaper stripes and the odd picture on the wall going by.
  const indoor=clamp(1-(s-62)/10,0,1);
  if(indoor>0){
    c.globalAlpha=indoor*.5;for(let x=8;x<W;x+=34)rect(c,x,0,10,H,'#e6d6b8');c.globalAlpha=indoor;
    for(let k=Math.floor(scroll/260)-1;k<Math.floor(scroll/260)+4;k++){const y=KY-(k*260-scroll)-120,x=noise(k)>.5?44:300;if(y<-60||y>H+60)continue;
      rect(c,x,y,56,44,'#9b8466');rect(c,x+3,y+3,50,38,noise(k+2)>.5?'#cfe0c8':'#e7d2bd');rect(c,x+12,y+20,10,14,'#9eb67b');rect(c,x+28,y+14,14,20,'#d6a082');}
    c.globalAlpha=1;
  }
  // The ceiling and the attic beams, around step 70.
  const ceil=sy(g,66);if(ceil>-40&&ceil<H+60){rect(c,0,ceil-14,W,22,'#c8b796');rect(c,0,ceil+6,W,4,'#a99876');}
  const attic=clamp(1-Math.abs(s-92)/26,0,1);
  if(attic>0){c.globalAlpha=attic;for(let k=Math.floor(scroll/120)-1;k<Math.floor(scroll/120)+7;k++){const y=KY-(k*120-scroll);rect(c,0,y,W,10,'#6f5640');rect(c,0,y,W,3,'#8a6c50');}c.globalAlpha=1;}
  // The roof Kot came out through, then clouds going by.
  const roof=sy(g,118);if(roof>-60&&roof<H+80){rect(c,0,roof,W,H,'#9c5a43');for(let x=0;x<W;x+=24){rect(c,x,roof+4,20,6,'#b56d51');rect(c,x+12,roof+16,20,6,'#b56d51');}rect(c,0,roof,W,3,'#7c4433');}
  const sky=clamp((s-115)/20,0,1)*clamp(1-(s-250)/40,.2,1);
  if(sky>0){c.globalAlpha=sky*.85;for(let k=Math.floor(scroll*.5/170)-1;k<Math.floor(scroll*.5/170)+5;k++){const y=KY-(k*170-scroll*.5),x=noise(k)*480-40,w=70+noise(k+3)*70;if(y<-40||y>H+40)continue;ellipse(c,x,y,w/2,12,'#ffffff');ellipse(c,x-w*.15,y-9,w*.25,11,'#ffffff');ellipse(c,x+w*.2,y-6,w*.2,9,'#ffffff');}c.globalAlpha=1;}
}
/** The sisal post, wound all the way up. */
function post(g,c,s){
  const scroll=g.shown*CLIMB.step,l=W/2-POST/2,rope=s>=260?'#8d8270':'#d8c49a',line=s>=260?'#6f6656':'#bfa878';
  rect(c,l,0,POST,H,rope);rect(c,l,0,4,H,mix(rope,'#ffffff',.25));rect(c,l+POST-5,0,5,H,line);
  for(let y=(scroll%6)-6;y<H;y+=6)rect(c,l+2,y,POST-4,1,line);
  // The base, while it is still in sight.
  const base=sy(g,0)+30;if(base<H+40){rect(c,W/2-70,base,140,14,'#a47a52');rect(c,W/2-70,base,140,4,'#c09468');rect(c,-10,base+14,W+20,H,'#b9926a');}
}
function shelf(g,c,k,row,t){
  const y=sy(g,k);if(y<-80||y>H+60)return;
  const side=row.side,x0=side<0?W/2-POST/2-SHELF:W/2+POST/2,w=WOOD[row.look||0],hit=g.hitRow===k,wob=hit?Math.sin((g.time-g.hitAt)*40)*Math.max(0,1-(g.time-g.hitAt)*2)*3:0;
  c.save();c.translate(0,wob);
  rect(c,x0,y-6,SHELF,10,w.board);rect(c,x0,y-6,SHELF,3,w.top);rect(c,x0,y+3,SHELF,2,w.edge);
  const bx=side<0?x0+SHELF-16:x0+6;poly(c,[[bx,y+4],[bx+10,y+4],[side<0?bx+10:bx,y+20]],w.edge);
  // Whatever is on it, unless it has just been knocked off.
  if(!(hit&&g.fell)){
    const px=x0+SHELF/2+(side<0?-8:8);
    if(row.prop==='resident'&&row.who)character(c,row.who,px,y-5,{scale:.72,mood:'sleep',flip:side>0,shadow:false,frame:t});
    else item(c,row.prop,px,y-5,{scale:row.prop==='lamp'||row.prop==='plant'?.55:.75});
  }
  c.restore();
}
function kot(g,c,L,t){
  const vt=g.clock(),since=vt-(g.hopAt??-9),hop=clamp(since/.11,0,1),from=g.fromSide??L.side;
  let x=W/2+L.side*ARM,y=KY-4,rot=0,mood=L.energy<.25?'annoyed':'happy';
  if(hop<1){x=W/2+(from+(L.side-from)*hop)*ARM;y-=Math.sin(hop*Math.PI)*(from!==L.side?22:12);}
  const after=g.overAt===null?0:g.time-g.overAt;
  if(L.over){
    if(g.endKind==='bonk'){x+=L.side*after*140;y+=after*after*900-after*160;rot=L.side*after*9;mood='annoyed';}
    else{y+=after*after*700;mood='annoyed';}
  }
  if(y>H+80)return;
  c.save();c.translate(x,y);c.rotate(rot);
  // Holding on facing the post: on the left Kot faces right, on the right the other way.
  character(c,'kot',0,14,{scale:1.55,flip:L.side>0,mood,running:hop<1&&!L.over,frame:vt*10,hat:g.hat,shadow:false});
  c.restore();
}
function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock();
  backdrop(g,c,s,t);post(g,c,s);
  const lo=Math.max(1,Math.floor(g.shown-2)),hi=Math.min(L.rows.length-1,Math.ceil(g.shown+10));
  for(let k=lo;k<=hi;k++)if(L.rows[k].side)shelf(g,c,k,L.rows[k],vt);
  // A prop knocked off falls past.
  if(g.fell){const f=g.fell,a=g.time-f.at;if(a<2){const fx=f.x+f.dir*a*120,fy=f.y+a*a*900-a*120;if(row(f))item(c,f.prop,fx,fy,{scale:.75});}}
  kot(g,c,L,t);
  // Before the first hop: which halves do what.
  if(!L.started&&!L.over){
    const a=.55+Math.sin(t*4)*.25;c.globalAlpha=a;
    poly(c,[[60,520],[86,500],[86,540]],'#fffdf3');poly(c,[[340,520],[314,500],[314,540]],'#fffdf3');c.globalAlpha=1;
    g.text(c,'Tap a side',W/2,565,16,'#fffdf3','center');
  }
}
const row=f=>f.prop&&f.prop!=='resident';
function event(g,e){
  const s=g.sound,x=W/2+e.x*ARM;
  switch(e.type){
    case 'climb':
      g.fromSide=e.swapped?-e.x:e.x;g.hopAt=g.clock();
      s('tick',1+Math.min(.6,(g.logic.score%20)/40));if(e.swapped)s('whoosh',1.6);
      if(e.y%50===0){s('point',1.2);g.say(`${e.y} m`,x,KY-60,{color:'#fbe4a4',size:18,life:.8});}
      break;
    case 'bonk':{
      g.endKind='bonk';g.hitRow=e.y;g.hitAt=g.time;
      const y=sy(g,e.y),side=e.x;
      if(e.prop&&e.prop!=='resident')g.fell={prop:e.prop,x:W/2+side*(POST/2+SHELF/2),y:y-5,dir:side,at:g.time};
      s('bonk');s('kot');g.shake=6;g.flash=.3;g.burst(x,KY-30,10,{colors:['#f3eee2','#cf8a48','#3b3833'],speed:140,up:40,size:3,life:.6});
      g.say(e.who?`Not on ${e.who[0].toUpperCase()+e.who.slice(1)}`:'Bonk',x,KY-70,{size:18});
      break;
    }
    case 'slip':g.endKind='slip';s('fall');s('kot',.8);g.say('Kot let go',W/2,KY-80,{size:18});break;
  }
}
function hud(g,c){
  const L=g.logic,e=L.energy,x=150,y=20,w=230,h=14,low=e<.25&&!L.over&&L.started,blink=low&&Math.sin(g.time*14)>0;
  g.pill(c,x-6,y-6,w+12,h+12);
  rect(c,x,y,w,h,'rgba(40,40,36,.45)');
  const col=e>.5?'#9eb67b':e>.25?'#e4c87a':'#d8847a';rect(c,x,y,Math.round(w*e),h,blink?'#f3c0b0':col);rect(c,x,y,Math.round(w*e),3,mix(col,'#ffffff',.35));
  // A paw at the end of the bar.
  ellipse(c,x+8,y+h/2,4,4,'#fffdf3');for(let i=-1;i<=1;i++)ellipse(c,x+8+i*4,y+1,1.6,1.6,'#fffdf3');
}
function card(c,{hat}={}){
  const grad=c.createLinearGradient(0,0,0,90);grad.addColorStop(0,'#e9dcc3');grad.addColorStop(1,'#f3e9d6');c.fillStyle=grad;c.fillRect(0,0,120,90);
  for(let x=4;x<120;x+=17)rect(c,x,0,5,90,'#e6d6b8');
  rect(c,52,0,16,90,'#d8c49a');for(let y=2;y<90;y+=4)rect(c,53,y,14,1,'#bfa878');
  rect(c,16,24,36,5,'#a47a52');rect(c,16,24,36,2,'#c09468');item(c,'teacup',30,24,{scale:.42});
  rect(c,68,56,36,5,'#b98d63');rect(c,68,56,36,2,'#d3a87a');item(c,'plant',88,56,{scale:.3});
  character(c,'kot',44,66,{scale:.82,mood:'happy',shadow:false,hat});
  rect(c,10,82,100,3,'#9eb67b');rect(c,10,82,Math.round(100*.7),3,'#e4c87a');
}
export default {Logic:ClimbRun,zones:CLIMB_ZONES,draw,event,hud,card,
  // Follows the climb, eased: a fast run of hops is a smooth climb, not a judder.
  camera:g=>{const L=g.logic,dt=Math.min(.05,g.time-(g.camT??g.time));g.camT=g.time;
    if(g.overAt===null)g.shown=(g.shown??L.score)+(L.score-(g.shown??L.score))*Math.min(1,dt*18);return {x:0,y:-g.shown*CLIMB.step};},
  reset:g=>{g.shown=g.logic?.score??0;g.camT=null;g.hopAt=null;g.fromSide=null;g.hitRow=null;g.hitAt=0;g.fell=null;g.endKind=null;}};

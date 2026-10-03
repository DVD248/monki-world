import {character,item,rect,poly,ellipse} from './art.js';
import {FallRun,FALL,FALL_ZONES,fallRun,fallDifficulty} from './shared/arcade-fall.js';
import {W,H,along,noise,clamp,mix} from './arcade-kit.js';

// Fall Down: through the cellar floor, under the house, past the roots and the caves, to
// crystals and the dark. The walls and the ledges change with the depth.
const WALL=[[0,'#8a6c50'],[25,'#6e5846'],[60,'#5a4a3e'],[110,'#4a4a52'],[170,'#302a45'],[250,'#1c1a26']];
const LEDGE=[[0,'#b58a5c'],[25,'#8c6a4a'],[60,'#7b6247'],[110,'#8a8a92'],[170,'#6d5d93'],[250,'#5f5588']];
const EDGE=[[0,'#d3a874'],[25,'#8fae72'],[60,'#9eb67b'],[110,'#a9a9b0'],[170,'#a998d6'],[250,'#9f93d2']];

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,travel=L.travel,wall=along(WALL,s),dark=mix(wall,'#000000',.25);
  rect(c,0,0,W,H,wall);
  // The wall scrolls up with the floors, a little slower, so it feels deep.
  const off=travel*.6;
  if(s<25)for(let k=Math.floor(off/40)-1;k<Math.floor(off/40)+17;k++){const y=k*40-off;rect(c,0,y,W,2,dark);for(let x=noise(k)*60;x<W;x+=90+noise(k+x)*40)rect(c,x,y,2,40,dark);}
  else for(let k=Math.floor(off/60)-1;k<Math.floor(off/60)+12;k++){const y=k*60-off;for(let i=0;i<3;i++){const x=noise(k*5+i)*W,r=4+noise(k*3+i)*9;ellipse(c,x,y+noise(k+i)*50,r,r*.7,dark);}
    if(s>=60&&s<110&&noise(k+7)>.5){c.strokeStyle=mix(wall,'#c9a46e',.35);c.lineWidth=3;c.beginPath();const rx=noise(k+2)*W;c.moveTo(rx,y);c.quadraticCurveTo(rx+20,y+30,rx-10,y+60);c.stroke();}
    if(s>=170&&noise(k+9)>.55){const cx=noise(k+4)*W,cy=y+20,glow=.5+.5*Math.sin(t*2+k);c.globalAlpha=.3+.4*glow;poly(c,[[cx,cy-14],[cx+6,cy],[cx,cy+6],[cx-6,cy]],'#c9b8ff');c.globalAlpha=1;}}
  const ledge=along(LEDGE,s),edge=along(EDGE,s),under=mix(ledge,'#000000',.3);
  for(const f of L.floors){
    if(f.y<-20||f.y>H+10)continue;const a=f.hole-f.w/2,b=f.hole+f.w/2;
    for(const [l,r] of [[0,a],[b,W]]){if(r-l<1)continue;
      rect(c,l,f.y,r-l,FALL.thick,ledge);rect(c,l,f.y,r-l,3,edge);rect(c,l,f.y+FALL.thick-3,r-l,3,under);
      for(let x=l+10+noise(f.id)*20;x<r-6;x+=38)rect(c,x,f.y+5,2,5,under);}
    // Where the hole is, the ends of the ledge are rounded off so it reads as a way down.
    rect(c,a-3,f.y+2,3,FALL.thick-4,ledge);rect(c,b,f.y+2,3,FALL.thick-4,ledge);
  }
  monki(g,c,L,t);
  roots(c,s,t,L);
  // Dust off his heels when he runs flat out: the deeper, the quicker that is.
  if(L.standing&&!L.over&&!g.reduced&&Math.abs(L.vx)>fallRun(fallDifficulty(L.score))*.8&&t-(g.dustAt??-9)>.07){g.dustAt=t;g.burst(L.x-Math.sign(L.vx)*9,L.y-2,1,{colors:[mix(along(EDGE,s),'#ffffff',.3),along(LEDGE,s)],speed:30,up:25,g:80,size:3,life:.32});}
}
/** The top: roots and rock hanging down. His head in them ends the run. */
function roots(c,s,t,L){
  const near=clamp(1-(L.y-FALL.body-FALL.top)/90,0,1),band=mix(along(WALL,s),'#000000',.45);
  rect(c,0,0,W,FALL.top-8,band);
  for(let x=0;x<W;x+=16){const h=8+noise(x)*10;poly(c,[[x,FALL.top-9],[x+16,FALL.top-9],[x+8,FALL.top-9+h]],band);}
  if(near>0&&!L.over){c.globalAlpha=near*(.35+.25*Math.sin(t*14));rect(c,0,0,W,FALL.top+6,'#d8847a');c.globalAlpha=1;}
}
function monki(g,c,L,t){
  const after=g.overAt===null?0:g.time-g.overAt,squash=clamp(1-(t-(g.landShown??-9))*6,0,1)*(g.reduced?.4:1);
  const x=L.x,y=L.over?L.y+Math.min(40,after*120):L.y;
  c.save();c.translate(x,y);c.scale(1+squash*.18,1-squash*.2);
  const danger=L.y-FALL.body-FALL.top<60;
  character(c,'monki',0,0,{scale:1.05,flip:L.face<0,mood:L.over?'annoyed':danger?'annoyed':!L.standing?'happy':'idle',frame:Math.abs(L.vx)>60?t*9:t*2,hat:g.hat,shadow:!!L.standing});
  c.restore();
}
function event(g,e){
  const s=g.sound;
  switch(e.type){
    case 'land':g.landShown=g.time;s('land');if(e.hard)g.burst(e.x,e.y,5,{colors:['#d9c9a3','#b39b75'],speed:60,up:30,g:200,size:3,life:.4});break;
    case 'pass':s('point',1+Math.min(.6,(e.score%10)*.06));if(e.score%25===0){s('best',.9);g.say(`${e.score} down!`,W/2,H*.4,{color:'#e4c87a',size:24,life:1.2});}break;
    case 'over':s('bonk');setTimeout(()=>{if(!g.stopped)s('fall');},100);g.shake=6;g.flash=.3;g.burst(e.x,FALL.top+4,10,{colors:['#7b6247','#9eb67b','#5a4a3e'],speed:120,up:-30,g:400,size:4,life:.8});g.say('Ow, the roots',e.x,FALL.top+70,{size:16});break;
  }
}
function card(c,{hat}={}){
  rect(c,0,0,120,90,'#8a6c50');for(let y=8;y<90;y+=18)rect(c,0,y,120,1,'#6e5846');
  rect(c,0,0,120,10,'#4a3a2e');for(let x=0;x<120;x+=10)poly(c,[[x,10],[x+10,10],[x+5,16]],'#4a3a2e');
  for(const [y,hole] of [[46,70],[76,32]]){rect(c,0,y,hole-16,7,'#b58a5c');rect(c,hole+16,y,120-hole-16,7,'#b58a5c');rect(c,0,y,hole-16,2,'#d3a874');rect(c,hole+16,y,120-hole-16,2,'#d3a874');}
  character(c,'monki',70,48,{scale:.85,mood:'happy',shadow:false,hat});
  for(let i=0;i<3;i++)rect(c,64+i*6,24-i*4,2,5,'#d3c3a1');
}
export default {Logic:FallRun,zones:FALL_ZONES,draw,event,card,camera:g=>({x:0,y:g.logic.travel}),reset:g=>{g.landShown=-9;}};

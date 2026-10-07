import {character,rect,ellipse} from './art.js';
import {StackRun,STACK,STACK_ZONES} from './shared/arcade-stack.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Pancake Stack: breakfast on the garden table, Sernik and Galgan on the grass waiting for
// whatever falls off. The tower climbs out of the morning into the clouds, past the birds and
// into the night; when it finally topples, the picture pulls back to show all of it.
const TOP=[[0,'#bcdbe4'],[35,'#c6e2ee'],[60,'#dbe9f1'],[100,'#efc9a0'],[150,'#2e3558'],[200,'#141829']];
const LOW=[[0,'#e8f1dc'],[35,'#eef4e6'],[60,'#f4f6f2'],[100,'#f6dcb8'],[150,'#4a5078'],[200,'#1f2440']];
// Golden, toasted, blueberry, chocolate chip: the batter is the same, the pan is not.
const LOOKS=[{top:'#ecbd7c',side:'#d4964f',edge:'#b0733a',dots:null},{top:'#e3ad6a',side:'#c7873f',edge:'#a2672f',dots:null},
  {top:'#ecbd7c',side:'#d4964f',edge:'#b0733a',dots:'#5b5b8f'},{top:'#efc283',side:'#d89b55',edge:'#b4773e',dots:'#5a3a2a'}];
const GROUND=590,FLOOR=-50,SYRUP='#b8642a',BUTTER='#f6e08a';
const DOGS=[{id:'sernik',x:62,face:1},{id:'galgan',x:338,face:-1}];

const sy=(g,h)=>STACK.base-(h-(g.shown??0));
function pancake(c,x,y,w,look,{glow=0,butter=false,syrup=0,t=0}={}){
  // y is the bottom of the pancake on the screen. Soft at the ends, golden on top, a crisp
  // brown rim underneath, and the little bubbles a pancake gets in the pan.
  const L=LOOKS[look]||LOOKS[0],l=x-w/2,h=STACK.layer,r=Math.min(6,w/4);
  rect(c,l+r,y-h+1,w-r*2,h-1,L.side);rect(c,l+r*.5,y-h+3,w-r,h-5,L.side);rect(c,l,y-h+6,w,h-10,L.side);
  rect(c,l+r+1,y-h+1,w-r*2-2,4,L.top);rect(c,l+r*.5+1,y-h+3,w-r-2,3,L.top);
  rect(c,l+r,y-3,w-r*2,2,L.edge);rect(c,l+r*.5,y-5,w-r,2,mix(L.side,L.edge,.5));
  rect(c,l+r+4,y-h+2,Math.max(0,w*.28),1,mix(L.top,'#ffffff',.4));
  for(let i=0;i<Math.floor(w/26);i++){const bx=l+r+6+((i*41+look*17)%Math.max(1,w-r*2-12));rect(c,bx,y-h+3+(i%2),2,1,mix(L.top,L.side,.6));}
  if(L.dots)for(let i=0;i<Math.floor(w/22);i++){const dx=l+r+4+((i*37+look*13)%Math.max(1,w-r*2-8));rect(c,dx,y-h+5+((i*5)%5),3,2,L.dots);}
  if(syrup>0){
    rect(c,l+6,y-h,w-12,3,SYRUP);
    for(let i=0;i<3;i++){const dx=l+12+i*(w-24)/2,drip=3+((i*7)%5)+Math.sin(t*1.5+i)*1.2;rect(c,dx,y-h+2,3,drip*syrup,SYRUP);}
  }
  if(butter){rect(c,x-7,y-h-4,14,5,BUTTER);rect(c,x-7,y-h-4,14,2,mix(BUTTER,'#ffffff',.4));}
  if(glow>0){c.globalAlpha=glow;c.strokeStyle='#fbe4a4';c.lineWidth=2;c.strokeRect(l-2,y-h-1,w+4,h+2);c.globalAlpha=1;}
}
function table(c,y){
  // The garden table the plate stands on, and the grass round it.
  // Wide and deep, so the grass still fills the frame when the end pulls the picture back.
  rect(c,-W,y+34,W*3,H*2,'#9eb67b');rect(c,-W,y+34,W*3,3,'#82995e');
  for(let i=0;i<14;i++){const x=noise(i)*W,yy=y+44+noise(i+5)*16;rect(c,x,yy,2,4,'#87a064');rect(c,x+3,yy+1,2,3,'#87a064');}
  rect(c,80,y+6,10,40,'#8b6646');rect(c,310,y+6,10,40,'#8b6646');
  rect(c,58,y-2,284,10,'#a47a52');rect(c,58,y-2,284,3,'#c09468');rect(c,58,y+7,284,2,'#7e5b3c');
}
function plate(c,x,y,w){ellipse(c,x,y+3,w/2+4,7,'rgba(60,70,55,.18)');rect(c,x-w/2,y-4,w,6,'#f4f1e6');rect(c,x-w/2+8,y+2,w-16,3,'#dcd8c8');rect(c,x-w/2+4,y-5,w-8,2,'#ffffff');}

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock();
  const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,along(TOP,s));grad.addColorStop(1,along(LOW,s));c.fillStyle=grad;c.fillRect(0,0,W,H);
  stars(c,rect,t,clamp((s-130)/30,0,1),{bottom:H});
  // Far hills and the clouds slide by slower than the tower climbs.
  // The end: pull back until the whole tower fits, the table and the dogs at the bottom.
  const after=g.overAt===null?0:g.time-g.overAt,top=StackRun.height(L.top.n),k=clamp((after-.7)/1.1,0,1),e=k*k*(3-2*k);
  const fit=Math.min(1,(GROUND-120)/(GROUND-STACK.base+top+30));
  g.shown=e>0?(g.endCam??g.camY)*(1-e):g.camY;
  const cam=g.shown,far=cam*.25;
  if(s>=150){ellipse(c,318,90+cam*.02,24,24,'#f1ead0');ellipse(c,310,84+cam*.02,5,4,'#ddd4b4');}
  c.globalAlpha=clamp(1-(s-140)/30,0,1)*.7;
  for(let k=Math.floor(far/160)-1;k<Math.floor(far/160)+5;k++){const y=H-(k*160-far)-120,x=noise(k)*480-40,w=70+noise(k+3)*70;if(y<-40||y>H+40)continue;ellipse(c,x,y,w/2,12,'#ffffff');ellipse(c,x-w*.15,y-9,w*.25,11,'#ffffff');ellipse(c,x+w*.2,y-6,w*.2,9,'#ffffff');}
  c.globalAlpha=1;
  const hills=GROUND-34+cam*.3;
  if(hills<H+80){ellipse(c,70,hills+40,150,60,'#b9cf9a');ellipse(c,330,hills+50,170,64,'#aec68c');}
  if(s>=100&&s<160)for(let i=0;i<5;i++){const x=(noise(i)*W+t*(14+i*4))%(W+40)-20,y=120+noise(i+30)*200,f=Math.sin(t*6+i)*2;c.strokeStyle='rgba(70,70,70,.45)';c.lineWidth=1.5;c.beginPath();c.moveTo(x-5,y-f);c.lineTo(x,y);c.lineTo(x+5,y-f);c.stroke();}

  c.save();
  if(e>0){const z=1+(fit-1)*e;c.translate(W/2,GROUND);c.scale(z,z);c.translate(-W/2,-GROUND);}
  const ground=sy(g,0);
  if(ground<H+60)table(c,ground+4);
  // Only the pancakes that can be seen are drawn: a long run is a lot of breakfast.
  const lo=Math.max(0,Math.floor((cam-80)/STACK.layer)),hi=Math.min(L.layers.length-1,Math.ceil((cam+STACK.base+40)/STACK.layer)+1);
  for(let i=e>0?0:lo;i<=(e>0?L.layers.length-1:hi);i++){
    const layer=L.layers[i];
    if(layer.plate){plate(c,layer.x,sy(g,0),layer.w+40);continue;}
    const y=sy(g,StackRun.height(layer.n-1));
    const isTop=i===L.layers.length-1,fresh=isTop?clamp(1-(vt-(g.placedAt??-9))/.18,0,1):0;
    c.save();if(fresh>0&&!g.reduced){c.translate(layer.x,y);c.scale(1+fresh*.05,1-fresh*.12);c.translate(-layer.x,-y);}
    pancake(c,layer.x,y,layer.w,layer.look,{glow:isTop?clamp(1-(vt-(g.glowAt??-9))/.6,0,1):0,butter:isTop&&g.butter,syrup:isTop?clamp((vt-(g.placedAt??0))/.5,0,1):0,t:vt});
    c.restore();
  }
  // The one sliding, and its shadow on the pancake below, so it can be lined up by eye.
  if(!L.over){
    const sl=L.slider,y=sy(g,StackRun.height(sl.n-1)),below=L.top,ol=Math.max(sl.x-sl.w/2,below.x-below.w/2),or=Math.min(sl.x+sl.w/2,below.x+below.w/2);
    if(or>ol){c.globalAlpha=.18;rect(c,ol,y+1,or-ol,4,'#5a3a1e');c.globalAlpha=1;}
    const hover=14+(g.reduced?0:Math.sin(vt*5)*1.5);
    pancake(c,sl.x,y-hover,sl.w,sl.look);
  }
  pieces(g,c);
  for(const d of g.dogs)dog(g,c,d,ground);
  c.restore();
}
/** The bits that fall: trimmings, and at the end the whole last pancake. The dogs catch what
 * comes their way while the bottom is in sight. */
function pieces(g,c){
  const now=g.time,dt=Math.min(.05,now-(g.pieceT??now));g.pieceT=now;
  for(const p of g.pieces){
    if(!p.caught){p.vy-=1100*dt;p.h+=p.vy*dt;p.x+=p.vx*dt;p.rot+=p.vr*dt;}
    const ground=sy(g,0);
    // Down where the dogs are: the nearest one has it.
    if(!p.caught&&p.h<FLOOR+30&&ground<H+40){const d=g.dogs.reduce((a,b)=>Math.abs(b.x-p.x)<Math.abs(a.x-p.x)?b:a);p.caught=now;d.jump=now;d.eating=now;g.sound('chomp',1+Math.random()*.1);g.burst(d.x,ground+20,6,{colors:['#e8c58c','#f1dfb6','#cf7759'],speed:80,up:40,size:3});if(p.whole)g.say(`${d.id==='galgan'?'Galgan':'Sernik'} got the lot`,d.x,ground-30,{size:15});}
    if(!p.caught&&p.h<FLOOR&&!p.heard){p.heard=true;if(ground>=H+40)g.sound('chomp',.9);}
    if(p.caught)continue;
    const y=sy(g,p.h);if(y>H+80)continue;
    c.save();c.translate(p.x,y-STACK.layer/2);c.rotate(p.rot);pancake(c,0,STACK.layer/2,p.w,p.look);c.restore();
  }
  g.pieces=g.pieces.filter(p=>!p.caught&&sy(g,p.h)<H+90&&p.h>FLOOR-400);
}
function dog(g,c,d,ground){
  const t=g.time,j=clamp((t-(d.jump??-9))/.45,0,1),hop=j>0&&j<1?Math.sin(j*Math.PI)*34:0,y=ground+52-hop;
  if(y>H+60)return;
  const eating=t-(d.eating??-9)<.35,over=g.logic.over&&g.overAt!==null&&t-g.overAt>.4;
  character(c,d.id,d.x,y,{scale:d.id==='galgan'?1.5:1.35,flip:d.face<0,mood:eating?'happy':over?'happy':'idle',frame:eating?t*12:t*2,hat:d.id==='galgan'?g.hat:null,shadow:!hop});
}
function event(g,e){
  const s=g.sound,y=sy(g,e.y);
  switch(e.type){
    case 'place':
      g.placedAt=g.clock();g.butter=false;
      if(e.perfect){
        s('point',1+Math.min(1,(e.streak-1)*.09));g.glowAt=g.clock();g.butter=true;
        g.burst(e.x-e.w/2,y-8,4,{colors:['#fbe4a4','#fffdf3'],speed:70,up:20,size:3,life:.4});g.burst(e.x+e.w/2,y-8,4,{colors:['#fbe4a4','#fffdf3'],speed:70,up:20,size:3,life:.4});
        g.say(e.streak>1?`Perfect ×${e.streak}`:'Perfect',e.x,y-34,{color:'#fbe4a4',size:e.streak>4?22:18,life:.8});
        if(e.grew){s('best',1.1);g.say('Bigger!',e.x,y-58,{color:'#cfe3b8',size:15,life:.8});}
      }else s('drop',1.1);
      break;
    case 'trim':g.pieces.push({x:e.x,h:e.y-STACK.layer,w:e.w,look:e.look,vx:e.side*(50+e.w*1.2),vy:120,rot:0,vr:e.side*(3+Math.random()*2)});s('poof',1.2);break;
    case 'miss':
      g.pieces.push({x:e.x,h:e.y-STACK.layer+14,w:e.w,look:e.look,vx:e.dir*90,vy:160,rot:0,vr:e.dir*4,whole:true});
      s('splat');g.shake=4;g.say('Whoops',e.x,y-30,{size:20,life:1.2});break;
  }
}
function hud(g,c){
  const L=g.logic;
  if(L.streak>=2&&!L.over)g.text(c,`PERFECT ×${L.streak}`,W-16,40,14,'#fbe4a4','right');
}
function card(c,{hat}={}){
  const grad=c.createLinearGradient(0,0,0,90);grad.addColorStop(0,'#bcdbe4');grad.addColorStop(1,'#e8f1dc');c.fillStyle=grad;c.fillRect(0,0,120,90);
  rect(c,0,78,120,12,'#9eb67b');rect(c,14,70,92,4,'#a47a52');rect(c,22,74,4,8,'#8b6646');rect(c,94,74,4,8,'#8b6646');
  rect(c,30,66,60,4,'#f4f1e6');
  const looks=[0,2,1,3,0,2];
  looks.forEach((look,i)=>{const L=LOOKS[look],w=48-i*2+(i%2?3:0),x=60+(i%2?2:-1);rect(c,x-w/2,58-i*7,w,6,L.side);rect(c,x-w/2+2,58-i*7,w-4,2,L.top);rect(c,x-w/2+1,63-i*7,w-2,1,L.edge);});
  // The next one sliding in, and syrup running down the top of the stack.
  rect(c,74,8,40,6,'#d4964f');rect(c,76,8,36,2,'#ecbd7c');for(let i=0;i<3;i++)rect(c,66-i*6,10,3,1,'rgba(90,90,90,.5)');
  rect(c,46,23,26,2,SYRUP);rect(c,49,24,2,4,SYRUP);rect(c,66,24,2,3,SYRUP);
  character(c,'galgan',104,86,{scale:.9,flip:true,mood:'happy',shadow:false,hat});
}
export default {Logic:StackRun,zones:STACK_ZONES,draw,event,hud,card,
  // The view follows the top of the tower, eased so a new pancake does not jolt it.
  camera:g=>{const L=g.logic,want=Math.max(0,StackRun.height(L.slider.n)-240),dt=Math.min(.05,g.time-(g.camT??g.time));g.camT=g.time;
    if(g.overAt===null)g.camY=(g.camY??want)+(want-(g.camY??want))*Math.min(1,dt*5);else g.endCam??=g.camY;return {x:0,y:-(g.shown??g.camY??0)};},
  reset:g=>{g.camY=0;g.shown=0;g.endCam=null;g.camT=null;g.pieces=[];g.placedAt=null;g.glowAt=null;g.butter=false;g.pieceT=null;
    // Sernik catches on the left once he lives here; until then it is Kot, or Monki.
    const left=['sernik','kot','monki'].find(id=>g.cast.includes(id))||'monki';g.dogs=DOGS.map(d=>({...d,id:d.id==='sernik'?left:d.id}));}};

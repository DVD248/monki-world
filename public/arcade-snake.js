import {character,item,rect,poly,ellipse} from './art.js';
import {SnakeRun,SNAKE,SNAKE_ZONES} from './shared/arcade-snake.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Galgan's Parade: the lawn seen from above, inside the picket fence, and Galgan trotting round
// it as himself, with a line of ducklings waddling behind him. Every treat brings one more; they
// keep to his footsteps, square for square, and peep when a new one joins. The lawn goes from
// morning to night.
const LAWN=[[0,['#a9c98a','#9dbf7e']],[10,['#b3cf8c','#a6c480']],[25,['#a3c486','#97b97b']],[45,['#c9c183','#bdb577']],[70,['#4f6a58','#475f4f']],[100,['#3a4f4d','#334644']]];
const SKY=[[0,'#bcd9e0'],[25,'#c6e0e8'],[45,'#efc59a'],[70,'#2e3558'],[100,'#141829']];
const DUCK='#f3d36b',DUCK_LIT='#fbe7a0',DUCK_DARK='#d9b24c',BEAK='#e2924a',EYE='#3a3428';
const lawnAt=s=>{let pick=LAWN[0][1];for(const [from,c] of LAWN)if(s>=from)pick=c;return pick;};

function board(g,c,s,t){
  const [a,b]=lawnAt(s),{x0,y0,cell,cols,rows}=SNAKE;
  for(let col=0;col<cols;col++)for(let r=0;r<rows;r++)rect(c,x0+col*cell,y0+r*cell,cell,cell,(col+r)%2?a:b);
  // Flowers and cabbages in the corners, from the flower beds and the vegetable patch on.
  if(s>=10)for(const [col,r] of [[0,0],[cols-1,0],[0,rows-1],[cols-1,rows-1]]){const x=x0+col*cell+cell/2,y=y0+r*cell+cell/2;c.globalAlpha=.55;if(s<25)for(let i=0;i<4;i++)ellipse(c,x+Math.cos(i*1.6)*5,y+Math.sin(i*1.6)*5,3,3,['#e8a0a0','#f3d27a','#d5b0e6'][i%3]);else ellipse(c,x,y,7,6,'#8fb57a');c.globalAlpha=1;}
  // The picket fence all the way round.
  const fx=x0-7,fy=y0-7,fw=cols*cell+14,fh=rows*cell+14,wood=s>=70?'#8a7f6a':'#e9dfc6',shade=s>=70?'#6c6352':'#cbbf9f';
  rect(c,fx,fy,fw,5,wood);rect(c,fx,fy+fh-5,fw,5,wood);rect(c,fx,fy,5,fh,wood);rect(c,fx+fw-5,fy,5,fh,wood);
  for(let x=fx;x<fx+fw;x+=16){rect(c,x,fy-4,4,9,wood);rect(c,x,fy+fh-5,4,9,shade);}
  for(let y=fy;y<fy+fh;y+=16){rect(c,fx-2,y,9,4,wood);rect(c,fx+fw-7,y,9,4,wood);}
}
/** Where one of the parade is drawn: on its way from the square it was on to the one it is on. */
function spot(L,i,k){
  const now=L.body[i],was=L.prev[i]||now,{x:ax,y:ay}=SnakeRun.centre(was.c,was.r),{x:bx,y:by}=SnakeRun.centre(now.c,now.r);
  return {x:ax+(bx-ax)*k,y:ay+(by-ay)*k,dx:Math.sign(bx-ax)};
}
/** A duckling, side on, feet at y, facing right unless `left`. A waddle, a bob, a wing. */
function duckling(c,x,y,left,step,{scale=1,pop=1,peep=false,sit=false}={}){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale((left?-1:1)*scale*pop,scale*pop);
  ellipse(c,0,0,6,2,'rgba(40,60,30,.22)');
  const lift=sit?0:Math.abs(Math.sin(step))*1.5,tilt=sit?0:Math.sin(step)*.12;
  if(!sit){const f=Math.sin(step)>0;rect(c,f?-3:-1,-2,3,2,BEAK);rect(c,f?1:3,-2,3,2,BEAK);}
  c.translate(0,-lift);c.rotate(tilt);
  ellipse(c,-1,-6,6.5,5,DUCK);ellipse(c,-2,-8,4,2.5,DUCK_LIT);ellipse(c,-2.5,-5.5,3.5,2.5,DUCK_DARK);
  rect(c,-8,-8,3,2,DUCK);
  ellipse(c,4,-12,4,4,DUCK);rect(c,2,-15,3,2,DUCK_LIT);
  rect(c,7,-12,4,2,BEAK);if(peep)rect(c,7,-10,3,1,BEAK);
  rect(c,4,-13,2,2,EYE);
  c.restore();
}
function parade(g,c,L,t){
  const k=L.state==='play'?clamp(L.acc*L.speed,0,1):L.over?1:0,n=L.body.length,dead=L.over&&g.overAt!==null;
  const pts=[];for(let i=0;i<n;i++)pts.push(spot(L,i,k));
  // One more in the line than last time: a duckling has just joined.
  if(g.len!=null&&n>g.len&&!L.over){g.lastJoin=t;g.sound('peep',1+Math.min(.4,(n-4)*.01));}g.len=n;
  // Each keeps facing the way it last went sideways, so going up and down they do not flicker.
  g.faces=g.faces||[];for(let i=0;i<n;i++){if(pts[i].dx)g.faces[i]=pts[i].dx<0;else if(g.faces[i]===undefined)g.faces[i]=i?g.faces[i-1]??false:false;}
  const moving=L.state==='play',walk=t*12;
  // Back to front, so whoever is lower on the lawn stands in front.
  const order=[...pts.keys()].sort((a,b)=>pts[a].y-pts[b].y||b-a);
  for(const i of order){
    const p=pts[i];
    if(i===0){
      character(c,'galgan',p.x,p.y+10,{scale:.8,flip:g.faces[0],mood:dead?'annoyed':t-(g.ateAt??-9)<.4?'happy':'idle',frame:moving?t*8:t*2,running:moving,hat:g.hat,shadow:true});
      if(dead)for(let j=0;j<3;j++){const a=t*4+j*2.1;item(c,'star',p.x+Math.cos(a)*12,p.y-14+Math.sin(a)*4,{scale:.32,shadow:false});}
      continue;
    }
    // A new duckling pops in at the back of the line.
    const fresh=i===n-1&&t-(g.lastJoin??-9)<.3,pop=fresh?.4+.6*clamp((t-g.lastJoin)/.3,0,1):1;
    duckling(c,p.x,p.y+8,g.faces[i],walk+i*1.3,{pop,peep:i===n-1&&t-(g.lastJoin??-9)<.5,sit:dead});
  }
  // Startled ducklings, after a bump.
  if(dead&&g.time-g.overAt<1.2)for(let i=1;i<Math.min(n,6);i++){const p=pts[i];c.globalAlpha=clamp(1.2-(g.time-g.overAt),0,1);g.text(c,'!',p.x+4,p.y-12,11,'#fffdf3','center');c.globalAlpha=1;}
}
function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock();
  const grad=c.createLinearGradient(0,0,0,SNAKE.y0);grad.addColorStop(0,along(SKY,s));grad.addColorStop(1,mix(along(SKY,s),'#ffffff',.25));c.fillStyle=grad;c.fillRect(0,0,W,H);
  stars(c,rect,t,clamp((s-60)/15,0,1),{bottom:70,n:24});
  // The hedge behind the fence, and the lawn round the outside.
  rect(c,0,SNAKE.y0-30,W,H,s>=70?'#36483c':'#7fa36a');
  for(let x=-10;x<W;x+=22)ellipse(c,x+noise(x)*6,SNAKE.y0-30,16,12,s>=70?'#2f3f35':'#6f955c');
  board(g,c,s,t);
  // Treats bob; the golden bone glints, with a ring that runs out.
  if(L.treat){const {x,y}=SnakeRun.centre(L.treat.c,L.treat.r),bob=Math.sin(t*4)*1.5;ellipse(c,x,y+8,7,3,'rgba(40,60,30,.25)');item(c,L.treat.kind,x,y+9+bob,{scale:.8,shadow:false});}
  if(L.gold){const {x,y}=SnakeRun.centre(L.gold.c,L.gold.r),left=clamp((L.gold.until-L.time)/SNAKE.golden,0,1),blink=left<.3&&Math.sin(t*20)<0;
    if(!blink){c.save();c.translate(x,y);c.rotate(Math.sin(t*3)*.25);rect(c,-7,-2,14,4,'#e8c45a');ellipse(c,-8,-3,3,3,'#e8c45a');ellipse(c,-8,3,3,3,'#e8c45a');ellipse(c,8,-3,3,3,'#e8c45a');ellipse(c,8,3,3,3,'#e8c45a');rect(c,-6,-2,10,1,'#fbe4a4');c.restore();}
    c.strokeStyle='rgba(251,228,164,.9)';c.lineWidth=2;c.beginPath();c.arc(x,y,13,-Math.PI/2,-Math.PI/2+left*Math.PI*2);c.stroke();
    if(Math.sin(t*6)>.6)rect(c,x+8,y-10,2,2,'#fffdf3');}
  parade(g,c,L,t);
  if(L.state==='ready'){const {x,y}=SnakeRun.centre(L.head.c,L.head.r);for(const [dx,dy] of [[0,-1],[0,1],[1,0]]){c.globalAlpha=.4+.3*Math.sin(t*5);poly(c,[[x+dx*24-dy*5,y+dy*24-dx*5],[x+dx*32,y+dy*32],[x+dx*24+dy*5,y+dy*24+dx*5]],'#fffdf3');c.globalAlpha=1;}}
}
function event(g,e){
  const s=g.sound,t=g.time;
  switch(e.type){
    case 'eat':{const quick=t-(g.ateAt??-9)<2.5;g.combo=quick?(g.combo||0)+1:0;g.ateAt=t;s('chomp',1+Math.min(.6,g.combo*.06));
      g.burst(e.x,e.y,6,{colors:['#e8c58c','#f1dfb6','#cf7759'],speed:70,up:20,size:3,life:.4});g.say('+1',e.x,e.y-18,{size:15,life:.7});
      if((e.length-1)%10===0)g.say(`${e.length-1} ducklings!`,W/2,SNAKE.y0+60,{color:'#fbe4a4',size:22,life:1.2});break;}
    case 'golden':g.ateAt=t;s('best');g.burst(e.x,e.y,14,{colors:['#e8c45a','#fbe4a4','#fffdf3'],speed:140,up:30,size:3,life:.7});g.say('+3',e.x,e.y-20,{color:'#fbe4a4',size:20,life:.9});break;
    case 'gold':s('pop',1.3);g.burst(e.x,e.y,8,{colors:['#fbe4a4','#fffdf3'],speed:60,up:10,size:2,life:.5});break;
    case 'goldgone':g.burst(e.x,e.y,6,{colors:['#e8c45a'],speed:40,up:0,g:-30,size:2,life:.5});break;
    case 'start':s('galgan');break;
    case 'bump':s('bonk');setTimeout(()=>{if(!g.stopped)s('galgan',.8);},160);g.shake=6;g.flash=.25;g.say(e.what==='fence'?'Bonk, the fence':'Oops, the ducklings',e.x,e.y-26,{size:15,life:1.3});break;
    case 'full':s('win');g.say('The whole lawn!',W/2,H/2,{color:'#fbe4a4',size:26,life:2});break;
  }
}
function card(c,{hat}={}){
  for(let x=0;x<120;x+=10)for(let y=0;y<90;y+=10)rect(c,x,y,10,10,(x+y)/10%2?'#a9c98a':'#9dbf7e');
  rect(c,0,0,120,4,'#e9dfc6');rect(c,0,86,120,4,'#e9dfc6');rect(c,0,0,4,90,'#e9dfc6');rect(c,116,0,4,90,'#e9dfc6');
  // Galgan out in front, three ducklings in step behind, round a corner, and a treat ahead.
  for(const [x,y,i] of [[22,48,0],[22,66,1],[38,66,2]])duckling(c,x,y,false,i*1.3+.4,{scale:.85});
  duckling(c,22,30,false,.9,{scale:.85});
  character(c,'galgan',64,72,{scale:.72,mood:'happy',frame:1,running:true,shadow:true,hat});
  item(c,'fish',98,46,{scale:.7,shadow:false});
}
export default {Logic:SnakeRun,zones:SNAKE_ZONES,draw,event,card,swipe:'chain',swipeAt:18,reset:g=>{g.faces=[];g.len=null;g.lastJoin=null;g.ateAt=null;g.combo=0;}};

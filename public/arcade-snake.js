import {item,rect,poly,ellipse} from './art.js';
import {SnakeRun,SNAKE,SNAKE_ZONES} from './shared/arcade-snake.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Long Galgan: the lawn seen from above, inside the picket fence, and Galgan going round it
// getting longer and longer. He slides from square to square rather than jumping; a treat goes
// down him as a bulge, and his tail never stops. The lawn goes from morning to night.
const LAWN=[[0,['#a9c98a','#9dbf7e']],[10,['#b3cf8c','#a6c480']],[25,['#a3c486','#97b97b']],[45,['#c9c183','#bdb577']],[70,['#4f6a58','#475f4f']],[100,['#3a4f4d','#334644']]];
const SKY=[[0,'#bcd9e0'],[25,'#c6e0e8'],[45,'#efc59a'],[70,'#2e3558'],[100,'#141829']];
const FUR='#50554a',LIT='#616758',TAN='#c9b888',NOSE='#1f2320';
const ANGLE={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2};
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
/** Where segment i is drawn: on its way from where it was to where it is. */
function spot(L,i,k){
  const now=L.body[i],was=L.prev[i]||now,{x:ax,y:ay}=SnakeRun.centre(was.c,was.r),{x:bx,y:by}=SnakeRun.centre(now.c,now.r);
  return {x:ax+(bx-ax)*k,y:ay+(by-ay)*k};
}
function dog(g,c,L,t){
  const k=L.state==='play'?clamp(L.acc*L.speed,0,1):L.over?1:0,n=L.body.length,pts=[];
  for(let i=0;i<n;i++)pts.push(spot(L,i,k));
  // A treat on its way down: one segment a step, a little fatter where it is.
  const fat=new Map();for(const b of g.bulges){const at=Math.floor((t-b)*L.speed*1.2);if(at<n)fat.set(at,1);}
  const dead=L.over&&g.overAt!==null;
  // The tail, wagging, off the end.
  const tail=pts[n-1],before=pts[n-2]||tail,ta=Math.atan2(tail.y-before.y,tail.x-before.x)+Math.sin(t*(dead?2:12))*.5;
  c.save();c.translate(tail.x,tail.y);c.rotate(ta);rect(c,4,-2.5,12,5,FUR);rect(c,13,-2,5,4,TAN);c.restore();
  for(let i=n-1;i>0;i--){
    const a=pts[i],b=pts[i-1],mx=(a.x+b.x)/2,my=(a.y+b.y)/2,big=fat.has(i)?3:0,w=19+big;
    rect(c,Math.min(a.x,b.x)-w/2,Math.min(a.y,b.y)-w/2,Math.abs(a.x-b.x)+w,Math.abs(a.y-b.y)+w,FUR);
    ellipse(c,a.x,a.y,w/2+1,w/2+1,FUR);
    if(i%3===1)ellipse(c,mx,my,3,3,LIT);
  }
  for(let i=n-1;i>0;i--){const a=pts[i];rect(c,a.x-4,a.y-4,8,3,LIT);}
  // Little cream paws along his sides, so a long dog still looks like a dog.
  for(let i=2;i<n-1;i+=4){const a=pts[i],b=pts[i-1],dx=Math.sign(Math.round(b.x-a.x)),dy=Math.sign(Math.round(b.y-a.y));for(const side of [-1,1]){const px=a.x-dy*side*11,py=a.y+dx*side*11;rect(c,px-2.5,py-2.5,5,5,TAN);}}
  // The head, facing the way he is going, his ears behind and his nose in front.
  const h=pts[0],dir=L.over?L.dir:(L.queue[0]&&k>.85?L.dir:L.dir),ang=ANGLE[dir];
  c.save();c.translate(h.x,h.y);c.rotate(ang);
  ellipse(c,-2,0,13,12,FUR);rect(c,-12,-11,7,6,'#3d4139');rect(c,-12,5,7,6,'#3d4139');
  rect(c,2,-7,12,14,FUR);rect(c,8,-5,8,10,TAN);rect(c,14,-3,4,6,NOSE);
  if(t-(g.ateAt??-9)<.25)rect(c,15,2,5,3,'#e88c8c');
  if(dead){for(const s of [-1,1]){rect(c,1,s*5-2,5,1,NOSE);rect(c,3,s*5-4,1,5,NOSE);}}
  else for(const s of [-1,1]){rect(c,3,s*5-1.5,3,3,NOSE);rect(c,4,s*5-1.5,1,1,'#ffffff');}
  c.restore();
  if(g.hat)item(c,g.hat,h.x-Math.cos(ang)*4,h.y-Math.sin(ang)*4+4,{scale:.5,shadow:false});
  if(dead)for(let i=0;i<3;i++){const a=t*4+i*2.1;item(c,'star',h.x+Math.cos(a)*14,h.y-14+Math.sin(a)*5,{scale:.35,shadow:false});}
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
  dog(g,c,L,t);
  g.bulges=g.bulges.filter(b=>(t-b)*L.speed*1.2<L.body.length+2);
  if(L.state==='ready'){const {x,y}=SnakeRun.centre(L.head.c,L.head.r);for(const [dx,dy] of [[0,-1],[0,1],[1,0]]){c.globalAlpha=.4+.3*Math.sin(t*5);poly(c,[[x+dx*24-dy*5,y+dy*24-dx*5],[x+dx*32,y+dy*32],[x+dx*24+dy*5,y+dy*24+dx*5]],'#fffdf3');c.globalAlpha=1;}}
}
function event(g,e){
  const s=g.sound,t=g.time;
  switch(e.type){
    case 'eat':{const quick=t-(g.ateAt??-9)<2.5;g.combo=quick?(g.combo||0)+1:0;g.ateAt=t;s('chomp',1+Math.min(.6,g.combo*.06));g.bulges.push(t);
      g.burst(e.x,e.y,6,{colors:['#e8c58c','#f1dfb6','#cf7759'],speed:70,up:20,size:3,life:.4});g.say('+1',e.x,e.y-18,{size:15,life:.7});
      if(e.length%10===0)g.say(`${e.length} long!`,W/2,SNAKE.y0+60,{color:'#fbe4a4',size:22,life:1.2});break;}
    case 'golden':g.ateAt=t;s('best');g.bulges.push(t);g.burst(e.x,e.y,14,{colors:['#e8c45a','#fbe4a4','#fffdf3'],speed:140,up:30,size:3,life:.7});g.say('+3',e.x,e.y-20,{color:'#fbe4a4',size:20,life:.9});break;
    case 'gold':s('pop',1.3);g.burst(e.x,e.y,8,{colors:['#fbe4a4','#fffdf3'],speed:60,up:10,size:2,life:.5});break;
    case 'goldgone':g.burst(e.x,e.y,6,{colors:['#e8c45a'],speed:40,up:0,g:-30,size:2,life:.5});break;
    case 'start':s('galgan');break;
    case 'bump':s('bonk');setTimeout(()=>{if(!g.stopped)s('galgan',.8);},160);g.shake=6;g.flash=.25;g.say(e.what==='fence'?'Bonk, the fence':'Ow, his own tail',e.x,e.y-26,{size:15,life:1.3});break;
    case 'full':s('win');g.say('The whole lawn!',W/2,H/2,{color:'#fbe4a4',size:26,life:2});break;
  }
}
function card(c,{hat}={}){
  for(let x=0;x<120;x+=10)for(let y=0;y<90;y+=10)rect(c,x,y,10,10,(x+y)/10%2?'#a9c98a':'#9dbf7e');
  rect(c,0,0,120,4,'#e9dfc6');rect(c,0,86,120,4,'#e9dfc6');rect(c,0,0,4,90,'#e9dfc6');rect(c,116,0,4,90,'#e9dfc6');
  const path=[[22,70],[22,58],[22,46],[34,46],[46,46],[58,46],[58,34],[58,22],[70,22],[82,22]];
  for(let i=0;i<path.length-1;i++){const [ax,ay]=path[i],[bx,by]=path[i+1];rect(c,Math.min(ax,bx)-6,Math.min(ay,by)-6,Math.abs(ax-bx)+12,Math.abs(ay-by)+12,FUR);}
  rect(c,18,72,4,8,FUR);const [hx,hy]=path.at(-1);rect(c,hx,hy-6,10,12,FUR);rect(c,hx+6,hy-4,6,8,TAN);rect(c,hx+11,hy-2,3,4,NOSE);rect(c,hx-6,hy-9,5,4,'#3d4139');rect(c,hx-6,hy+5,5,4,'#3d4139');rect(c,hx+3,hy-5,2,2,NOSE);rect(c,hx+3,hy+3,2,2,NOSE);
  if(hat)item(c,hat,hx-2,hy+2,{scale:.4,shadow:false});
  item(c,'fish',100,30,{scale:.7,shadow:false});
}
export default {Logic:SnakeRun,zones:SNAKE_ZONES,draw,event,card,swipe:'chain',swipeAt:18,reset:g=>{g.bulges=[];g.ateAt=null;g.combo=0;}};

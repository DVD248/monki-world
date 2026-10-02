import {character,item,rect,poly,ellipse} from './art.js';
import {CandleRun,CANDLES,CANDLES_ZONES} from './shared/arcade-candles.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Candle Cake: a party in the house. The cake turns on its stand under the bunting, with a
// little icing figure of whoever's birthday it is in the middle; Monki stands at the table
// with the next candle. A finished cake gets its candles blown out and the next one is
// brought in. The party goes on into the night, with lights along the bunting.
const WALL=[[0,'#f3dcc8'],[30,'#f0d3c0'],[70,'#efcba6'],[120,'#3a3f63'],[200,'#20243f']];
const TRIM=[[0,'#e6c3a8'],[30,'#e2bba0'],[70,'#dfb48e'],[120,'#2f3354'],[200,'#191c33']];
const CAKES=[{top:'#f4c6cf',rim:'#e39cab',pipe:'#fbe3e8',name:'strawberry'},{top:'#8a5a44',rim:'#6e4433',pipe:'#b07a5d',name:'chocolate'},
  {top:'#fbf1d8',rim:'#e9d6a8',pipe:'#fffaf0',name:'vanilla'},{top:'#cfe6cf',rim:'#a9cfa9',pipe:'#eef7ec',name:'mint'}];
const SPRINKLES=['#e67e7e','#f3c96b','#7fb6d9','#8fc77f','#c89be0','#fffaf0'];
const NAMES={sernik:'Sernik',galgan:'Galgan',monki:'Monki',julia:'Julia',david:'David'};
const BUNTING=['#e8a0a0','#f3d27a','#9cc7e4','#a9d39a','#d5b0e6'];
const TAU=Math.PI*2,{cx:CX,cy:CY}=CANDLES;

/** A candle along +x from `from`, striped, with its flame at the far end. */
function candle(c,from,{kind='candle',lit=1,t=0,id=0}={}){
  const len=CANDLES.len,stripe=kind==='pre'?'#7fa7d1':'#e98a8a',body=kind==='pre'?'#e8eef6':'#fffaf0';
  rect(c,from,-3.5,len,7,body);rect(c,from,2,len,1.5,mix(body,'#000000',.12));
  for(let x=from+4;x<from+len-2;x+=8)poly(c,[[x,-3.5],[x+4,-3.5],[x+1,3.5],[x-3,3.5]],stripe);
  rect(c,from+len,-.5,4,1,'#5a4a3a');
  if(lit>0){
    const f=1+Math.sin(t*14+id*1.7)*.18,tip=from+len+5;
    // A teardrop: round where it leaves the wick, pointed at the end, yellow in the middle.
    c.globalAlpha=lit*.28;ellipse(c,tip+6,0,12*f,10*f,'#fbe4a4');c.globalAlpha=lit;
    ellipse(c,tip+4,0,4.2,3.8,'#f08f4a');poly(c,[[tip+4,-3.7],[tip+14*f,0],[tip+4,3.7]],'#f08f4a');
    ellipse(c,tip+4.5,0,2.6,2.2,'#fbe4a4');poly(c,[[tip+4.5,-2.1],[tip+10*f,0],[tip+4.5,2.1]],'#fbe4a4');
    c.globalAlpha=1;
  }
}
function strawberry(c,x,y,a){
  c.save();c.translate(x,y);c.rotate(a+Math.PI/2);
  ellipse(c,0,1,7,8,'#d9444a');ellipse(c,-2,-1,3,3,'#e8676b');rect(c,-4,-8,8,3,'#5e9a4e');rect(c,-1,-11,2,4,'#5e9a4e');
  for(const [dx,dy] of [[-3,1],[2,3],[0,-2],[3,-1],[-1,5]])rect(c,dx,dy,1,1,'#f6d77a');
  c.restore();
}
function cake(g,c,L,k,{scale=1,lit=1,t=0}={}){
  const look=CAKES[L.cake.look%CAKES.length],R=L.radius;
  c.save();c.translate(CX,CY);c.scale(scale,scale);
  // The stand does not turn; everything on it does.
  ellipse(c,0,8,R+26,R+20,'rgba(70,50,40,.18)');ellipse(c,0,0,R+22,R+22,'#f6f2ea');ellipse(c,0,0,R+16,R+16,'#e9e2d4');
  c.save();c.rotate(L.rot);
  ellipse(c,0,0,R,R,look.rim);ellipse(c,0,0,R-5,R-5,look.top);
  for(let i=0;i<28;i++){const a=i/28*TAU;ellipse(c,Math.cos(a)*(R-6),Math.sin(a)*(R-6),4,4,look.pipe);}
  for(let i=0;i<34;i++){const a=noise(i+L.cake.k*7)*TAU,r=noise(i+40)*(R-22);const x=Math.cos(a)*r,y=Math.sin(a)*r;c.save();c.translate(x,y);c.rotate(noise(i+3)*3);rect(c,-2,-.5,4,1.5,SPRINKLES[i%SPRINKLES.length]);c.restore();}
  for(const it of L.items){
    if(it.kind==='berry'){strawberry(c,Math.cos(it.a)*(R-11),Math.sin(it.a)*(R-11),it.a);continue;}
    c.save();c.rotate(it.a);candle(c,R-CANDLES.inset,{kind:it.kind,lit,t,id:it.id});c.restore();
  }
  c.restore();
  // The birthday one, in icing, stands upright in the middle however the cake turns.
  character(c,L.cake.for,0,16,{scale:.95,mood:'happy',shadow:false,frame:0});
  c.restore();
}
function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,vt=g.clock();
  rect(c,0,0,W,H,along(WALL,s));
  for(let x=0;x<W;x+=28)rect(c,x,0,14,H,mix(along(WALL,s),'#ffffff',.06));
  rect(c,0,H-92,W,92,along(TRIM,s));
  stars(c,rect,t,clamp((s-110)/25,0,1),{bottom:150,n:30});
  // Bunting across the top, with lights along it once it is dark.
  const night=clamp((s-100)/30,0,1);
  for(let row=0;row<2;row++){const y0=34+row*36;c.strokeStyle='#a48a72';c.lineWidth=1.5;c.beginPath();for(let x=-10;x<=W+10;x+=10){const y=y0+Math.sin(x/W*Math.PI)*14;x===-10?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
    for(let i=0;i<9;i++){const x=12+i*46+row*23,y=y0+Math.sin(x/W*Math.PI)*14;poly(c,[[x-9,y],[x+9,y],[x,y+15]],BUNTING[(i+row*2)%BUNTING.length]);
      if(night>0){c.globalAlpha=night*(.6+.4*Math.sin(t*3+i+row));ellipse(c,x+23,y+2,3,3,'#fbe4a4');c.globalAlpha=1;}}}
  // Balloons on the walls, bobbing.
  for(const [x,col,ph] of [[28,'#e8a0a0',0],[372,'#9cc7e4',1.7],[46,'#f3d27a',3.1]]){const y=150+Math.sin(t*1.3+ph)*4;c.strokeStyle='#a49b70';c.lineWidth=1;c.beginPath();c.moveTo(x,y+16);c.lineTo(x+3,y+60);c.stroke();ellipse(c,x,y,13,16,col);ellipse(c,x-4,y-6,3,4,mix(col,'#ffffff',.5));}
  // The table edge, and Monki at it.
  rect(c,0,H-70,W,70,'#a47a52');rect(c,0,H-70,W,4,'#c09468');rect(c,0,H-66,W,2,'#7e5b3c');
  const done=g.doneAt!=null?vt-g.doneAt:-1,blown=done>.6,brought=g.newAt!=null?clamp((vt-g.newAt)/.35,0,1):1;
  const pop=brought<1?.7+.3*Math.sin(brought*Math.PI/2)+Math.sin(brought*Math.PI)*.08:1;
  const wob=clamp(1-(vt-(g.stuckAt??-9))/.15,0,1)*(g.reduced?0:.025);
  cake(g,c,L,L.k,{scale:pop*(1+wob),lit:blown&&L.state==='between'?0:1,t:vt});
  if(blown&&L.state==='between'&&done<1.1)for(let i=0;i<6;i++){const a=i/6*TAU+L.rot,R=L.radius+CANDLES.len+6,u=(done-.6)/.5;c.globalAlpha=clamp(1-u,0,1)*.6;ellipse(c,CX+Math.cos(a)*R+Math.sin(t*3+i)*3,CY+Math.sin(a)*R-u*24,4+u*6,4+u*6,'#e9e4d8');c.globalAlpha=1;}
  // The candle in flight, and the next one in Monki's hands.
  if(L.flying){c.save();c.translate(CX,L.flying.y);c.rotate(-Math.PI/2);candle(c,-CANDLES.len/2,{t:vt,id:99});c.restore();for(let i=1;i<4;i++){c.globalAlpha=.12*(4-i);rect(c,CX-3,L.flying.y+CANDLES.len/2+i*10,6,8,'#fffaf0');}c.globalAlpha=1;}
  const ready=!L.flying&&L.state==='play'&&L.cake.left>0&&vt-(g.thrownAt??-9)>.12;
  const mood=L.over?'annoyed':vt-(g.stuckAt??-9)<.3?'happy':'idle';
  character(c,'monki',CX,H-14,{scale:1.45,mood,frame:t*3,hat:g.hat,shadow:false});
  if(ready){c.save();c.translate(CX,H-104);c.rotate(-Math.PI/2);candle(c,-CANDLES.len/2,{t:vt,id:98});c.restore();}
  for(const f of g.falling){const u=vt-f.at;if(u>1.4)continue;c.save();c.translate(f.x+f.vx*u,f.y+f.vy*u+600*u*u);c.rotate(-Math.PI/2+f.spin*u);candle(c,-CANDLES.len/2,{lit:0,t:vt});c.restore();}
  g.falling=g.falling.filter(f=>vt-f.at<1.4);
}
function hud(g,c){
  const L=g.logic,t=g.time;
  // Candles still to go on this cake, down the left, like the ones in Monki's box.
  const need=L.cake.need;
  for(let i=0;i<need;i++){const y=H-120-i*16,left=i<L.cake.left;c.globalAlpha=left?1:.25;rect(c,16,y,14,5,left?'#fffaf0':'#d8cfc0');rect(c,30,y+1,4,3,left?'#f3a95a':'#a49b8c');c.globalAlpha=1;}
  // Where this cake is among the five; the fifth is a big one.
  const group=Math.floor(L.k/5)*5;
  for(let i=0;i<5;i++){const k=group+i,x=W/2-48+i*24,y=30,big=i===4,on=k===L.k,past=k<L.k||k===L.k&&L.state==='between';
    if(big){c.globalAlpha=past||on?1:.35;item(c,'crown',x,y+8,{scale:.55,shadow:false});c.globalAlpha=1;continue;}
    ellipse(c,x,y,on?7:5,on?7:5,past?'#e98a8a':on?'#fffaf0':'rgba(60,50,45,.25)');}
  const label=`${NAMES[L.cake.for]}’s ${L.cake.big?'big ':''}cake`;
  g.text(c,label,W/2,64,14,'#fffdf3','center');
  if(L.state==='between')g.text(c,`Happy birthday, ${NAMES[L.cake.for]}!`,W/2,CY+L.radius+64,18,'#fbe4a4','center');
}
function event(g,e){
  const s=g.sound,vt=g.clock(),L=g.logic;
  switch(e.type){
    case 'throw':s('throw',1.2);g.thrownAt=vt;break;
    case 'stick':{s('wood',1.15);g.stuckAt=vt;const look=CAKES[L.cake.look%CAKES.length];g.burst(CX,e.y,5,{colors:[look.top,look.pipe],speed:70,up:-20,g:200,size:3,life:.35});break;}
    case 'berry':s('pop');g.burst(CX,e.y-4,12,{colors:['#d9444a','#e8676b','#f6d77a'],speed:120,up:30,size:3,life:.6});g.say('+1',CX+30,e.y-10,{color:'#f3a0a0',size:18,life:.8});break;
    case 'clink':
      s('bonk');setTimeout(()=>{if(!g.stopped)s('fall');},140);g.shake=6;g.flash=.3;
      g.falling.push({x:CX,y:e.y+CANDLES.len/2,vx:(Math.random()<.5?-1:1)*90,vy:-160,spin:(Math.random()<.5?-1:1)*9,at:vt});
      g.say('Clink!',CX,e.y+40,{size:20,life:1.2});break;
    case 'cake':
      g.doneAt=vt;s('win');setTimeout(()=>{if(!g.stopped)s('whoosh');},600);
      g.burst(CX,CY-20,26,{colors:SPRINKLES,speed:220,up:120,size:4,life:1.1});break;
    case 'newcake':g.doneAt=null;g.newAt=vt;s('drop',.9);if(e.big)g.say('A big one!',W/2,CY-L.radius-50,{color:'#fbe4a4',size:20,life:1.3});break;
  }
}
function card(c,{hat}={}){
  rect(c,0,0,120,90,'#f3dcc8');rect(c,0,72,120,18,'#a47a52');rect(c,0,72,120,2,'#c09468');
  for(let i=0;i<5;i++)poly(c,[[6+i*26,4],[18+i*26,4],[12+i*26,12]],BUNTING[i]);
  ellipse(c,60,34,30,30,'#e9e2d4');ellipse(c,60,34,24,24,'#e39cab');ellipse(c,60,34,21,21,'#f4c6cf');
  for(const a of [-2.3,-1.2,-.2,.9,2.1]){c.save();c.translate(60,34);c.rotate(a);rect(c,20,-1.5,13,3,'#fffaf0');poly(c,[[34,-2],[39,0],[34,2]],'#f3a95a');c.restore();}
  for(let i=0;i<8;i++){rect(c,48+noise(i)*24,24+noise(i+9)*20,2,1,SPRINKLES[i%6]);}
  character(c,'monki',60,90,{scale:.75,mood:'happy',shadow:false,hat});rect(c,58,52,4,12,'#fffaf0');poly(c,[[58,52],[60,46],[62,52]],'#f3a95a');
}
export default {Logic:CandleRun,zones:CANDLES_ZONES,draw,event,hud,card,reset:g=>{g.doneAt=null;g.newAt=null;g.stuckAt=null;g.thrownAt=null;g.falling=[];}};

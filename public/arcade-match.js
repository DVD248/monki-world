import {character,item,rect,poly,ellipse} from './art.js';
import {MatchRun,MATCH,MATCH_ZONES} from './shared/arcade-match.js';
import {W,H,along,clamp,mix,noise} from './arcade-kit.js';

// Match Tap: the kitchen shelf, Sernik sitting on top of it, and everything you match
// flying into him. The kitchen gets later in the day as the snacks pile up.
const WALL=[[0,'#eadcc0'],[80,'#e6d6b4'],[200,'#e7c9a2'],[400,'#3a4166'],[650,'#23283f']];
const TILE=[[0,'#e2d1b1'],[200,'#dcc6a0'],[400,'#434a70'],[650,'#2d3350']];
const WOOD='#a47a52',WOOD_DARK='#7e5b3c',MOUTH={x:352,y:92};
// Each snack sits on its own colour of plate, so a group shows before the snacks are read.
const PLATE={icecream:'#f3d6d8',fish:'#cfe0e6',pizza:'#f3e3a8',donut:'#e6cdb4',carrot:'#f4d2b0',mushroom:'#e3d9ec',star:'#fbeec0'};

function draw(g,c){
  const L=g.logic,s=L.score,t=g.time,wall=along(WALL,s),tile=along(TILE,s);
  rect(c,0,0,W,H,wall);
  for(let y=0;y<H;y+=36)for(let x=(y/36%2)*18;x<W;x+=36)rect(c,x,y,17,17,tile);
  if(s>=400)for(let i=0;i<24;i++){c.globalAlpha=.4+.4*Math.sin(t*2+i);rect(c,noise(i)*W,noise(i+9)*100,1,1,'#f4efd0');}
  c.globalAlpha=1;
  // The shelf.
  const gx=MATCH.x0,gy=MATCH.y0,gw=MATCH.cols*MATCH.cell,gh=MATCH.rows*MATCH.cell;
  rect(c,gx-8,gy-10,gw+16,gh+18,WOOD);rect(c,gx-8,gy-10,gw+16,4,mix(WOOD,'#ffffff',.2));rect(c,gx-4,gy-4,gw+8,gh+8,WOOD_DARK);
  rect(c,gx,gy,gw,gh,mix(tile,'#000000',.12));
  for(let r=1;r<MATCH.rows;r++)rect(c,gx,gy+r*MATCH.cell-1,gw,2,mix(tile,'#000000',.2));
  const vt=g.clock();
  c.save();c.beginPath();c.rect(gx,gy,gw,gh);c.clip();
  for(let col=0;col<MATCH.cols;col++)for(const [r,tl] of L.grid[col].entries()){
    const x=gx+col*MATCH.cell+MATCH.cell/2,y=gy+tl.y*MATCH.cell+MATCH.cell/2;if(y<gy-MATCH.cell)continue;
    const shake=g.nope&&g.nope.id===tl.id&&t-g.nope.at<.3?Math.sin((t-g.nope.at)*60)*3:0;
    ellipse(c,x+shake,y+2,20,20,PLATE[tl.kind]||'#f5eedc');ellipse(c,x+shake,y+5,17,15,mix(PLATE[tl.kind]||'#f5eedc','#ffffff',.25));
    if(tl.kind==='star'){item(c,'star',x,y+15,{scale:1.5+Math.sin(vt*6)*.08});rect(c,x+12,y-14+Math.sin(vt*5)*3,2,2,'#fbe4a4');rect(c,x-14,y+6+Math.cos(vt*4)*3,2,2,'#fbe4a4');}
    else item(c,tl.kind,x+shake,y+14,{scale:1.25});
  }
  c.restore();
  // The clock across the top, and Sernik on the shelf waiting for whatever comes.
  const bx=150,bw=156,frac=L.clock/MATCH.full,low=L.clock<3&&L.state==='play';
  rect(c,bx,24,bw,16,'rgba(38,48,36,.3)');rect(c,bx+2,26,(bw-4)*frac,12,low?(Math.sin(t*12)>0?'#d8847a':'#e6a092'):frac>.5?'#9eb67b':'#e4c87a');
  item(c,'clock',bx-14,42,{scale:.6});
  // Quick hands: the multiple the next match will give back, by the clock.
  if(L.state==='play'&&L.mult>=1.1)g.text(c,`×${L.mult.toFixed(1)}`,bx+bw+8,38,13,L.mult>=1.6?'#fbe4a4':'#cfe3b8');
  if(L.state==='ready'){c.globalAlpha=.9;g.text(c,'The clock starts with your first match',W/2,70,13,'#fffdf3','center');c.globalAlpha=1;}
  const eating=t-(g.chompAt??-9)<.3;
  character(c,'sernik',MOUTH.x+8,gy-10,{scale:1.5,flip:true,mood:L.over?'sleep':eating?'happy':low?'annoyed':'idle',frame:eating?t*12:t*2,hat:g.hat,shadow:false});
  for(const f of g.flyers||[]){
    const k=clamp((t-f.at)/.38,0,1);if(k<=0)continue;const e=k*k*(3-2*k),x=f.x+(MOUTH.x-f.x)*e,y=f.y+(MOUTH.y-f.y)*e-Math.sin(k*Math.PI)*60;
    c.globalAlpha=1-k*.4;item(c,f.kind,x,y+10,{scale:1.2-k*.6});c.globalAlpha=1;
  }
  g.flyers=(g.flyers||[]).filter(f=>t-f.at<.38);
}
function event(g,e){
  const s=g.sound,t=g.time;
  switch(e.type){
    case 'match':case 'star':{
      s('match',1+Math.min(.8,(e.n-3)*.08+(e.mult-1)*.25));
      if(e.quicker){s('point',1+e.mult*.2);g.say(`Quick hands ×${e.mult.toFixed(1)}`,W/2,96,{color:'#fbe4a4',size:16,life:1});}
      g.flyers=(g.flyers||[]).concat(e.cells.map(([c,r],i)=>({...MatchRun.centre(c,r),kind:e.kinds[i]==='star'?'star':e.kinds[i],at:t+i*.025})));
      const land=t+.38+e.cells.length*.025;setTimeout(()=>{if(!g.stopped){s('chomp');g.chompAt=g.time;}},(land-t)*1000);
      g.say(`+${e.n}`,e.x,e.y-20,{color:e.n>=MATCH.star?'#e4c87a':'#fffdf3',size:e.n>=MATCH.star?26:18,life:.8});
      g.say(`+${e.bonus.toFixed(1)}s`,e.x,e.y+6,{color:'#cfe3b8',size:12,life:.7});
      if(e.leaveStar){s('best');g.say('A star!',e.x,e.y-48,{color:'#e4c87a',size:18,life:1});}
      if(e.type==='star'){g.shake=4;g.flash=.25;s('whoosh');}
      break;
    }
    case 'nope':{s('boop');const L=g.logic,c=Math.floor((e.x-MATCH.x0)/MATCH.cell),r=Math.floor((e.y-MATCH.y0)/MATCH.cell);g.nope={id:L.grid[c]?.[r]?.id,at:t};
      if(e.lost)g.say(`−${e.lost%1?e.lost.toFixed(1):e.lost}s`,e.x,e.y-16,{color:'#e6a092',size:14,life:.7});break;}
    case 'shuffle':s('shuffle');g.say('Shaken up',W/2,MATCH.y0+MATCH.rows*MATCH.cell/2,{size:20,life:1.1});break;
    case 'over':s('fall');g.say('Time!',W/2,MATCH.y0+120,{size:30,life:1.4,color:'#fbe4a4'});break;
  }
}
function card(c,{hat}={}){
  rect(c,0,0,120,90,'#eadcc0');rect(c,8,22,104,64,'#a47a52');rect(c,12,26,96,56,'#d4c3a2');
  const foods=['icecream','fish','pizza','donut'];
  for(let r=0;r<3;r++)for(let col=0;col<5;col++){const k=foods[(r*3+col*2+(r===1&&col>1?1:0))%4];item(c,k,22+col*19,42+r*18,{scale:.62});}
  character(c,'sernik',98,22,{scale:.8,flip:true,mood:'happy',shadow:false,hat});
  rect(c,10,8,60,7,'rgba(38,48,36,.3)');rect(c,11,9,40,5,'#9eb67b');
}
export default {Logic:MatchRun,zones:MATCH_ZONES,draw,event,card,reset:g=>{g.flyers=[];g.chompAt=-9;g.nope=null;}};

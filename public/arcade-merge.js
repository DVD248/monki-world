import {character,item,rect} from './art.js';
import {MergeRun,MERGE,MERGE_ZONES,mergeKind,mergeValue} from './shared/arcade-merge.js';
import {W,H,along,mix,noise,clamp,stars} from './arcade-kit.js';

// Snack Merge: a wooden tray on the kitchen table, Sernik underneath with his nose over the
// edge. Snacks slide rather than jump, two that meet squash into one with a little pop, and a
// new one grows in where there was room. The plates warm up in colour as the snacks get grander.
const PLATES=['#eef3e2','#f6ead2','#f3e2c4','#ecdcc8','#dfe9ef','#f3dccf','#f6e3b0','#f5d3d8','#e3dcf0','#f3c9b6','#f6dc8e','#fbe9a8','#d9e3f6','#f4d8f0'];
const TABLE=[[0,'#c9a27a'],[2000,'#c39a70'],[6000,'#b88f66'],[16000,'#5a4a5c']];
const ease=k=>1-(1-k)**3;

function tile(c,x,y,t,s=1,time=0){
  const size=MERGE.tile*s,l=x-size/2,top=y-size/2,col=PLATES[(t-1)%PLATES.length];
  rect(c,l+3,top+5,size-6,size-3,'rgba(80,55,35,.22)');
  rect(c,l+4,top,size-8,size,col);rect(c,l,top+4,size,size-8,col);rect(c,l+2,top+2,size-4,size-4,col);
  rect(c,l+6,top+3,size-12,3,mix(col,'#ffffff',.5));rect(c,l+4,top+size-5,size-8,3,mix(col,'#000000',.08));
  if(s>.35){item(c,mergeKind(t),x,y+20*s,{scale:1.55*s,shadow:false});
    const label=String(mergeValue(t));c.font=`800 ${Math.round(11*s)}px 'Avenir Next','Nunito',ui-rounded,sans-serif`;c.textAlign='right';c.fillStyle=mix(col,'#4a3a2a',.55);c.fillText(label,l+size-7,top+size-7);}
  if(t>=11){c.globalAlpha=.5+.5*Math.sin(time*5+x);rect(c,l+size-14,top+8,2,2,'#fffdf3');rect(c,l+10,top+size-20,2,2,'#fffdf3');c.globalAlpha=1;}
}
function draw(g,c){
  // The picture runs on the clock that keeps going after the end, so the last slide finishes.
  const L=g.logic,s=L.score,t=g.time,now=g.clock(),table=along(TABLE,s);
  rect(c,0,0,W,H,table);
  for(let y=0;y<H;y+=46)rect(c,0,y,W,2,mix(table,'#000000',.08));
  for(let i=0;i<10;i++)rect(c,noise(i)*W,noise(i+4)*H,30+noise(i+2)*40,1,mix(table,'#ffffff',.08));
  stars(c,rect,t,clamp((s-12000)/4000,0,1),{bottom:120,n:24});
  // The tray, with a shake when a swipe moves nothing.
  const nudge=clamp(1-(t-(g.stuckAt??-9))/.25,0,1)*(g.reduced?0:1),dx=Math.sin(t*60)*3*nudge*(g.stuckDir==='left'||g.stuckDir==='right'?1:0),dy=Math.sin(t*60)*3*nudge*(g.stuckDir==='up'||g.stuckDir==='down'?1:0);
  const side=MERGE.size*(MERGE.tile+MERGE.gap)+MERGE.gap;
  c.save();c.translate(dx,dy);
  rect(c,MERGE.x0-6,MERGE.y0-4,side+12,side+14,'rgba(60,40,25,.25)');
  rect(c,MERGE.x0-6,MERGE.y0-8,side+12,side+12,'#8b6646');rect(c,MERGE.x0-2,MERGE.y0-4,side+4,side+4,'#a47a52');
  for(let r=0;r<MERGE.size;r++)for(let col=0;col<MERGE.size;col++){const {x,y}=MergeRun.centre(r,col);rect(c,x-MERGE.tile/2+2,y-MERGE.tile/2+2,MERGE.tile-4,MERGE.tile-4,'#93694a');rect(c,x-MERGE.tile/2+2,y-MERGE.tile/2+2,MERGE.tile-4,3,'#7e5b3c');}
  // The ones that merged away, sliding into the snack they became, then gone.
  for(const gh of L.ghosts){const k=clamp((now-L.movedAt)/MERGE.slide,0,1);if(k>=1)continue;const a=MergeRun.centre(gh.fr,gh.fc),b=MergeRun.centre(gh.r,gh.c),e=ease(k);tile(c,a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e,gh.t,1,t);}
  const over=L.over&&g.overAt!==null;
  for(const tl of L.tiles){
    const k=clamp((now-tl.at)/MERGE.slide,0,1),e=ease(k),a=MergeRun.centre(tl.fr,tl.fc),b=MergeRun.centre(tl.r,tl.c);
    const grow=clamp((now-tl.born)/.14,0,1),pop=tl.pop!=null?clamp((now-tl.pop)/.16,0,1):1;
    const scale=now<tl.born?0:(grow<1?.2+.8*ease(grow):1)*(pop<1?1+Math.sin(pop*Math.PI)*.16:1);
    if(scale<=0)continue;
    // Merging: until the pop, the snack is still the one it was.
    tile(c,a.x+(b.x-a.x)*e,a.y+(b.y-a.y)*e,tl.pop!=null&&now<tl.pop?tl.t-1:tl.t,scale,t);
  }
  if(over){c.globalAlpha=clamp((g.time-g.overAt)*2,0,.35);rect(c,MERGE.x0-2,MERGE.y0-4,side+4,side+4,'#3a2a1e');c.globalAlpha=1;}
  c.restore();
  // Sernik, nose over the edge of the table, looking at the biggest snack so far.
  const happy=t-(g.cheerAt??-9)<.6,y=H-4+(happy&&!g.reduced?-Math.abs(Math.sin((t-g.cheerAt)*12))*6:0);
  character(c,'sernik',W-62,y,{scale:1.5,flip:true,mood:over?'annoyed':happy?'happy':'idle',frame:t*2,hat:g.hat,shadow:false});
  g.text(c,'Biggest so far',24,561,14,'#fffdf3');
  tile(c,170,556,L.best,.62,t);
  // What the next step up looks like: something to make.
  if(!over){g.text(c,'Next up',W-86,66,13,'#fffdf3','right');tile(c,W-46,60,L.best+1,.5,t);}
}
function event(g,e){
  const s=g.sound,t=g.time;
  switch(e.type){
    case 'slide':if(!e.merges)s('paper-land',1.4);break;
    case 'merge':
      s('match',.85+Math.min(1,e.t*.07));g.burst(e.x,e.y,4+Math.min(10,e.t),{colors:[PLATES[(e.t-1)%PLATES.length],'#fffdf3'],speed:70+e.t*6,up:20,size:3,life:.45});
      g.say(`+${e.value}`,e.x,e.y-34,{color:'#fffdf3',size:e.t>=7?20:15,life:.7});break;
    case 'newbest':s('best',1+Math.min(.5,(e.t-5)*.06));g.cheerAt=t;g.say(`A ${e.kind==='icecream'?'ice cream':e.kind==='teacup'?'cup of tea':e.kind}!`,W/2,MERGE.y0-22,{color:'#fbe4a4',size:22,life:1.4});break;
    case 'stuck':s('boop',1.3);g.stuckAt=t;g.stuckDir=e.dir;break;
    case 'spawn':break;
    case 'full':s('fall');g.say('The tray is full',W/2,MERGE.y0+180,{size:24,life:2});break;
  }
}
function card(c,{hat}={}){
  rect(c,0,0,120,90,'#c9a27a');rect(c,14,8,72,72,'#8b6646');rect(c,17,11,66,66,'#a47a52');
  const tiles=[[1,'sprout'],[2,'carrot'],[5,'fish'],[7,'pizza']];
  tiles.forEach(([t,kind],i)=>{const x=20+(i%2)*32,y=14+Math.floor(i/2)*32;rect(c,x,y,28,28,PLATES[t-1]);rect(c,x,y,28,2,'#ffffff');item(c,kind,x+14,y+22,{scale:.62,shadow:false});});
  character(c,'sernik',102,90,{scale:.85,flip:true,mood:'happy',shadow:false,hat});
}
export default {Logic:MergeRun,zones:MERGE_ZONES,draw,event,card,swipe:'one',swipeAt:26,reset:g=>{g.stuckAt=null;g.cheerAt=null;g.stuckDir=null;}};

import {character,item,rect,poly,ellipse} from './art.js';
import {NAMES,present} from './shared/world.js';

// The birthday surprise: the first time the person it is for opens the app (from the day it
// was left for), the lights go down, everybody who lives here jumps out round a cake with a
// candle for every year, she makes a wish and taps them out, there are fireworks and the
// tune, and then the letter. If Kot has not moved in yet, Kot is the last guest at the door.
// The same party plays again from the cake it leaves in the room, without Kot's entrance.
const W=400,H=600,SANS="'Avenir Next','Nunito',ui-rounded,'Segoe UI',sans-serif";
const CONFETTI=['#e4c87a','#ca9187','#9eb67b','#83b8bd','#d6a082','#b9a3d6','#fbf8ee','#e7a7a0'];
const CAKE={x:200,top:474,left:100,right:300,base:552};
/** "21st", "22nd", "23rd", "11th". */
export const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
const ease=t=>t<0?0:t>1?1:t*t*(3-2*t);

export class BirthdayParty{
  /** mode: 'first' (the real one), 'replay' (from the cake) or 'preview' (the one leaving it). */
  constructor({canvas,state,birthday,mode='first',sounds={play(){}},reduced=false,onLetter=()=>{},onDone=()=>{}}){
    Object.assign(this,{canvas,c:canvas.getContext('2d'),state,b:birthday,mode,sounds,reduced,onLetter,onDone});
    this.who=birthday.for;this.from=birthday.from;
    // Kot comes in at the end only the first time, and only if Kot does not live here yet.
    this.kotComing=mode!=='replay'&&!state.cast?.includes('kot');
    const others=present(state).filter(id=>id!==this.who&&!(id==='kot'&&this.kotComing));
    // The birthday person in the middle behind the cake; people and Monki either side; the animals in front.
    const back=[[128,446],[272,446],[56,450],[344,450]],front=[[52,578],[356,578],[306,590]];
    this.guests=[{id:this.who,x:200,y:440,hat:'crown',star:true}];
    const tall=id=>['david','julia','monki'].includes(id);
    for(const id of [...others.filter(tall),...others.filter(id=>!tall(id))]){const [x,y]=(tall(id)?back.shift():front.shift())||back.shift()||front.shift()||[200,590];this.guests.push({id,x,y,hat:'partyhat'});}
    // A candle for every year (up to forty), in two staggered rows once there are more than twelve.
    const n=Math.min(40,birthday.age),rows=n>12?2:1,counts=[Math.ceil(n/rows),n-Math.ceil(n/rows)],span=CAKE.right-CAKE.left-36,step=counts[0]>1?span/(counts[0]-1):0;
    this.candles=[];
    for(let r=rows-1;r>=0;r--)for(let k=0;k<counts[r];k++)this.candles.push({x:CAKE.left+18+(counts[r]===1?span/2:k*step)+(r?step/2:0),y:CAKE.top+(r?-4:6),lit:true,seed:Math.random()*9});
    this.parts=[];this.smoke=[];this.fireworks=[];this.phase='dark';this.t=0;this.at=0;this.envelope=null;this.kot=null;this.stopped=false;this.texts=[];
    this.down=e=>{e.preventDefault();const r=canvas.getBoundingClientRect();this.tap((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height);};
    this.key=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();this.tap(W/2,CAKE.top);}};
    canvas.addEventListener('pointerdown',this.down);canvas.addEventListener('keydown',this.key);
    this.last=0;this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  stop(){this.stopped=true;cancelAnimationFrame(this.frame);this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('keydown',this.key);}
  go(phase){this.phase=phase;this.at=this.t;}
  get since(){return this.t-this.at;}
  loop(ts){
    if(this.stopped)return;this.frame=requestAnimationFrame(t=>this.loop(t));
    const dt=Math.min(.05,(ts-(this.last||ts))/1000);this.last=ts;this.t+=dt;this.update(dt);this.draw();
  }
  confetti(n,x,y,{spread=1,up=320}={}){
    if(this.reduced)n=Math.ceil(n/3);
    for(let i=0;i<n;i++){const a=-Math.PI/2+(Math.random()-.5)*spread*2;const v=up*(.5+Math.random()*.7);
      this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,r:Math.random()*6,vr:(Math.random()-.5)*10,c:CONFETTI[i%CONFETTI.length],life:3+Math.random()*2,w:3+Math.random()*3,h:5+Math.random()*4});}
  }
  update(dt){
    const s=this.since;
    if(this.phase==='lights'){this.sounds.play('tap');this.go('surprise');this.sounds.play('win');for(let i=0;i<3;i++)setTimeout(()=>{if(!this.stopped)this.sounds.play('pop');},120+i*110);this.sounds.play('horn');
      this.confetti(60,10,H-60,{spread:.5,up:520});this.confetti(60,W-10,H-60,{spread:.5,up:520});for(const g of this.guests)g.jump=this.t+Math.random()*.3;}
    if(this.phase==='surprise'&&s>2.4)this.go('wish');
    if(this.phase==='cheer'){
      if(!this.reduced&&s<6&&Math.random()<dt*2.6)this.firework();
      if(s>4.2&&!this.envelope){this.envelope={at:this.t};this.sounds.play('gift');}
    }
    // Kot, out of the door and over to the space beside Monki at the back.
    if(this.phase==='guest'&&this.kot){const k=this.kot,a=ease((this.t-k.at-1.1)/1.4);k.x=392-(392-336)*a;k.y=424+(452-424)*a;if(a>=1&&!k.home){k.home=true;this.sounds.play('kot');this.confetti(30,336,400,{spread:.8,up:300});}}
    // A light breeze of confetti the whole time once the lights are on.
    if(this.phase!=='dark'&&!this.reduced&&Math.random()<dt*6)this.parts.push({x:Math.random()*W,y:-10,vx:(Math.random()-.5)*30,vy:40+Math.random()*40,r:Math.random()*6,vr:(Math.random()-.5)*6,c:CONFETTI[Math.floor(Math.random()*CONFETTI.length)],life:12,w:3,h:5,drift:true});
    for(const p of this.parts){p.vy+=(p.drift?0:420)*dt;p.vx*=p.drift?1:Math.pow(.6,dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.r+=p.vr*dt;p.life-=dt;}
    this.parts=this.parts.filter(p=>p.life>0&&p.y<H+20);
    for(const p of this.smoke){p.y-=26*dt;p.x+=Math.sin(this.t*3+p.s)*8*dt;p.life-=dt;}this.smoke=this.smoke.filter(p=>p.life>0);
    for(const f of this.fireworks){f.age+=dt;for(const p of f.bits){p.vy+=90*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}}this.fireworks=this.fireworks.filter(f=>f.age<1.6);
    this.texts=this.texts.filter(x=>this.t-x.at<x.life);
  }
  firework(){
    const x=60+Math.random()*280,y=150+Math.random()*170,c=CONFETTI[Math.floor(Math.random()*6)],bits=[];
    for(let i=0;i<26;i++){const a=i/26*Math.PI*2,v=60+Math.random()*40;bits.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v});}
    this.fireworks.push({bits,c,age:0});this.sounds.play('pop',.7+Math.random()*.3);
  }
  say(text,x,y,{size=18,color='#fffdf3',life=1}={}){this.texts.push({text,x,y,size,color,life,at:this.t});}
  tap(x,y){
    // Shh… and only when the light is switched on, everybody. The tap is also what lets a
    // phone play the sound.
    if(this.phase==='dark'){if(this.since>.6)this.go('lights');}
    else if(this.phase==='wish')this.blow(x);
    else if(this.phase==='cheer'&&this.envelope&&this.t-this.envelope.at>.6){this.go('letter');this.sounds.play('paper');this.onLetter();}
    else if(this.phase==='guest'&&this.kot?.home)this.finish();
  }
  /** A puff where the finger is: the nearest few candles go out, with a wisp of smoke each. */
  blow(x){
    const lit=this.candles.filter(c=>c.lit).sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x));
    if(!lit.length)return;
    const k=Math.min(lit.length,3+Math.floor(Math.random()*3));
    for(const c of lit.slice(0,k)){c.lit=false;for(let i=0;i<3;i++)this.smoke.push({x:c.x+(Math.random()-.5)*3,y:c.y-18-i*3,s:Math.random()*9,life:1.4+i*.3});}
    this.sounds.play('whoosh',1.3+Math.random()*.2);
    const left=this.candles.filter(c=>c.lit).length;
    if(left)return;
    // Every one out: the wish is made.
    this.go('cheer');this.sounds.play('birthday');this.sounds.play('horn');
    this.confetti(80,W/2,CAKE.top-20,{spread:1.2,up:460});for(const g of this.guests)g.jump=this.t+Math.random()*.4;
    if(!this.reduced)for(let i=0;i<3;i++)setTimeout(()=>{if(!this.stopped)this.firework();},i*300);
  }
  /** After the letter: the last guest, or straight on to the house. */
  afterLetter(){
    if(this.kotComing){this.go('guest');this.kot={x:410,y:470,at:this.t};this.sounds.play('knock');setTimeout(()=>{if(!this.stopped)this.sounds.play('knock');},900);}
    else this.finish();
  }
  finish(){if(this.done)return;this.done=true;this.stop();this.onDone();}

  // ---------------------------------------------------------------- drawing
  draw(){
    const c=this.c,t=this.t,b=this.b;
    c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
    // The living room, dressed for it.
    const wall=c.createLinearGradient(0,0,0,H);wall.addColorStop(0,'#f3dfcf');wall.addColorStop(1,'#efd2bf');c.fillStyle=wall;c.fillRect(0,0,W,H);
    for(let x=10;x<W;x+=40)rect(c,x,0,14,420,'#f0d6c4');
    rect(c,0,420,W,H-420,'#b98d68');for(let y=432;y<H;y+=26)rect(c,0,y,W,2,'#a87c58');rect(c,0,418,W,4,'#a47454');
    this.bunting(c,8,t);this.bunting(c,34,t+1.3,true);
    // The banner and the name.
    const on=this.phase!=='dark';
    c.textAlign='center';c.textBaseline='alphabetic';
    this.label(c,`HAPPY ${ordinal(b.age).toUpperCase()} BIRTHDAY`,W/2,96,22,'#fff6e2');
    this.label(c,NAMES[this.who].toUpperCase(),W/2,150+(on&&!this.reduced?Math.sin(t*2.4)*3:0),52,'#f2c75c');
    this.balloons(c,t);
    if(this.mode==='preview')this.label(c,'PREVIEW · ONLY YOU CAN SEE THIS',W/2,186,11,'#fffdf3');
    // The door Kot comes in at.
    if(this.phase==='guest')this.door(c);
    // Everybody, back row first, then the cake, then the front row.
    const row=g=>g.y<500;
    for(const g of this.guests.filter(row))this.guest(c,g,t);
    this.cake(c,t);
    for(const g of this.guests.filter(g=>!row(g)))this.guest(c,g,t);
    if(this.kot)this.guest(c,{id:'kot',x:this.kot.x,y:this.kot.y,hat:'bow',walking:!this.kot.home,big:true},t);
    for(const p of this.smoke){c.globalAlpha=Math.min(.55,p.life*.4);ellipse(c,p.x,p.y,3+(1.6-p.life)*3,2.5+(1.6-p.life)*2,'#eae6dc');}c.globalAlpha=1;
    for(const f of this.fireworks){c.globalAlpha=Math.max(0,1-f.age/1.6);for(const p of f.bits)rect(c,p.x,p.y,3,3,f.c);}c.globalAlpha=1;
    for(const p of this.parts){c.save();c.translate(p.x,p.y);c.rotate(p.r);rect(c,-p.w/2,-p.h/2,p.w,p.h,p.c);c.restore();}
    // The words for each moment.
    const s=this.since;
    if(this.phase==='surprise'){const k=Math.min(1,s*5),z=this.reduced?1:1+(1-k)*.6;c.save();c.translate(W/2,300);c.scale(z,z);this.label(c,'SURPRISE!',0,0,58,'#fffdf3');c.restore();}
    if(this.phase==='wish'){const lit=this.candles.filter(x=>x.lit).length;this.label(c,`Make a wish, ${NAMES[this.who]}.`,W/2,268,26,'#fffdf3');
      this.label(c,lit===b.age?'Then tap the cake to blow out the candles.':`${lit} to go`,W/2,300,lit===b.age?15:18,'#fff3dc');}
    if(this.phase==='cheer'){this.label(c,'Happy birthday!',W/2,262,34,'#fffdf3');if(this.envelope)this.envelopeArt(c,t);}
    if(this.phase==='guest'){this.label(c,'One more guest.',W/2,262,26,'#fffdf3');if(this.kot?.home){this.label(c,'Kot has moved in.',W/2,296,20,'#fff3dc');this.label(c,'Tap to go into the house',W/2,326,14,'#fff3dc');}}
    for(const x of this.texts){c.globalAlpha=1-(this.t-x.at)/x.life;this.label(c,x.text,x.x,x.y-(this.t-x.at)*20,x.size,x.color);}c.globalAlpha=1;
    // Lights off: everything is there, waiting, in the dark.
    if(this.phase==='dark'){c.fillStyle='rgba(22,26,44,.88)';c.fillRect(0,0,W,H);this.label(c,'Shh…',W/2,290,26,'#c9cfe0');
      if(s>.8){c.globalAlpha=Math.min(1,(s-.8)*2)*(this.reduced?1:.75+Math.sin(t*3)*.25);this.label(c,'Tap to turn on the lights',W/2,330,16,'#e8ecf6');c.globalAlpha=1;}}
    else if(this.phase==='surprise'&&s<.35&&!this.reduced){c.fillStyle=`rgba(255,250,235,${.5*(1-s/.35)})`;c.fillRect(0,0,W,H);}
    if(this.phase==='letter'){c.fillStyle='rgba(40,34,30,.45)';c.fillRect(0,0,W,H);}
  }
  label(c,text,x,y,size,color){
    c.font=`800 ${size}px ${SANS}`;c.textAlign='center';c.lineJoin='round';c.lineWidth=Math.max(3,size/6);c.strokeStyle='rgba(70,42,36,.72)';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);
  }
  bunting(c,y,t,offset=false){
    c.strokeStyle='#a7856a';c.lineWidth=1.5;c.beginPath();c.moveTo(0,y);c.quadraticCurveTo(W/2,y+26,W,y);c.stroke();
    for(let i=offset?1:0;i<22;i+=2){const x=i*W/21,sag=y+Math.sin(Math.PI*x/W)*13,sway=this.reduced?0:Math.sin(t*2+i)*1.5;poly(c,[[x-8,sag],[x+8,sag],[x+sway,sag+20]],CONFETTI[i%6]);}
  }
  balloons(c,t){
    const digits=String(this.b.age).split(''),xs=digits.length===1?[54]:digits.length===2?[46,354]:[40,84,356];
    // Ordinary balloons behind, then one with each digit on it.
    for(const [x,y,col,k] of [[24,250,'#83b8bd',1],[92,206,'#e7a7a0',2],[312,218,'#9eb67b',3],[380,262,'#e4c87a',4]]){const bob=this.reduced?0:Math.sin(t*1.4+k)*4;rect(c,x,y+bob+18,1,90,'#a49b80');ellipse(c,x,y+bob,15,19,col);rect(c,x-6,y+bob-10,4,6,'#ffffff55');}
    digits.forEach((d,i)=>{const x=xs[i]??(40+i*40),y=232+(i%2)*14,bob=this.reduced?0:Math.sin(t*1.2+i*1.7)*5;rect(c,x,y+bob+30,1,110,'#a49b80');ellipse(c,x,y+bob,26,32,i%2?'#e2b04a':'#d98a7a');rect(c,x-12,y+bob-18,5,9,'#ffffff55');
      c.font=`900 40px ${SANS}`;c.textAlign='center';c.fillStyle='#fff8ea';c.fillText(d,x,y+bob+14);});
  }
  cake(c,t){
    const {x,top,left,right,base}=CAKE,w=right-left;
    // The table, then a tall pink cake with cream piped round it and the name on the front.
    rect(c,left-26,base,w+52,10,'#8f6a4c');rect(c,left-26,base,w+52,3,'#a98060');rect(c,left-14,base+10,6,40,'#7a5940');rect(c,right+8,base+10,6,40,'#7a5940');
    ellipse(c,x,base-2,w/2+14,8,'#f6f2e8');
    rect(c,left,top+8,w,base-top-10,'#f2c1bb');rect(c,left,top+8,8,base-top-10,'#f6d1cc');rect(c,right-10,top+8,10,base-top-10,'#e2a9a3');
    rect(c,left,top+38,w,6,'#fbe8de');for(let i=0;i<w;i+=10)ellipse(c,left+5+i,top+44,5,4,'#fbe8de');
    ellipse(c,x,top+8,w/2,12,'#fbeee6');
    for(let i=0;i<w;i+=14){const d=6+((i*7)%9);rect(c,left+3+i,top+10,6,d,'#fbeee6');ellipse(c,left+6+i,top+10+d,3,3,'#fbeee6');}
    for(let i=0;i<w;i+=16)ellipse(c,left+8+i,base-6,4,4,'#c96f72');
    c.font=`700 italic 17px Georgia,'Iowan Old Style',serif`;c.textAlign='center';c.fillStyle='#b8575e';c.fillText(NAMES[this.who],x,top+72);
    // The candles, striped, each with a flame until it is blown out.
    for(const k of this.candles){
      rect(c,k.x-2,k.y-16,4,16,'#f8f2e2');rect(c,k.x-2,k.y-13,4,2,'#83b8bd');rect(c,k.x-2,k.y-7,4,2,'#e7a7a0');rect(c,k.x,k.y-19,1,3,'#5f574a');
      if(k.lit){const f=this.reduced?0:Math.sin(t*14+k.seed)*1.2,glow=this.phase==='dark'?.5:.25;
        c.globalAlpha=glow;ellipse(c,k.x,k.y-24,9,11,'#ffd98a');c.globalAlpha=1;ellipse(c,k.x+f*.4,k.y-24,3,5.5+f*.5,'#f5a640');ellipse(c,k.x+f*.3,k.y-23,1.6,3,'#fff1b8');}
    }
  }
  guest(c,g,t){
    const since=t-(g.jump??-9),hop=!this.reduced&&since>=0&&since<.5?Math.sin(since/.5*Math.PI)*22:0;
    const cheering=this.phase==='surprise'||this.phase==='cheer';
    const mood=this.phase==='dark'?'idle':g.star&&this.phase==='wish'?'idle':'happy';
    character(c,g.id,g.x,g.y-hop,{scale:g.star?1.9:g.big?1.75:1.6,hat:g.hat,mood,frame:cheering||g.walking?t*8:t*2,running:!!g.walking,flip:g.x>200&&!g.walking?true:g.walking,shadow:true});
  }
  door(c){
    const open=this.kot?ease((this.t-this.kot.at-.8)/.5):0;
    rect(c,360,322,40,100,'#8c6f4f');rect(c,364,326,36,96,'#3e3a33');rect(c,364+30*open,326,36-30*open,96,'#b88b5f');rect(c,364+30*open+4,370,3,4,'#e4c87a');
  }
  envelopeArt(c,t){
    const k=ease((this.t-this.envelope.at)/.6),y=300+(1-k)*-260+(this.reduced?0:Math.sin(t*2)*3),x=W/2;
    c.save();c.translate(x,y);c.rotate((1-k)*.4);
    rect(c,-46,-30,92,60,'#fbf3e3');rect(c,-46,-30,92,60,'#fbf3e3');poly(c,[[-46,-30],[0,6],[46,-30]],'#efe2c8');poly(c,[[-46,30],[-6,0],[6,0],[46,30]],'#f3e8d2');
    c.strokeStyle='#d8c8a8';c.lineWidth=1;c.strokeRect(-45.5,-29.5,91,59);
    ellipse(c,0,4,9,9,'#c45a5f');poly(c,[[0,10],[-6,3],[-4,-1],[0,2],[4,-1],[6,3]],'#f6d6d0');
    c.restore();
    if(k>=1)this.label(c,'There is a letter for you. Tap to open it.',W/2,356,14,'#fff3dc');
  }
}

/** The letter, as real text over the party: paragraphs as written, line breaks kept. */
export function fillLetter(el,{birthday}){
  const b=birthday;el.replaceChildren();
  const to=document.createElement('p');to.className='birthday-to';to.textContent=`For ${NAMES[b.for]}, on your ${ordinal(b.age)} birthday`;
  const text=document.createElement('div');text.className='birthday-text';
  for(const para of b.message.split(/\n\s*\n/)){const p=document.createElement('p');para.split('\n').forEach((line,i)=>{if(i)p.append(document.createElement('br'));p.append(document.createTextNode(line));});text.append(p);}
  const from=document.createElement('p');from.className='birthday-from';from.textContent=b.signature||NAMES[b.from];
  el.append(to,text,from);
}

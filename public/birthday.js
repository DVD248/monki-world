import {character,poly} from './art.js';
import {NAMES,present} from './shared/world.js';

// The birthday surprise, over the whole screen. The first time the person it is for opens the
// app (from the day it was left for) the room is dark but for everybody's eyes; she turns the
// light on and they all jump out. Then the lights go down for the cake and the song, and she
// blows the candles out: a tap puffs at the nearest few, a finger drawn across puts out the ones
// it passes. A letter comes down in an envelope; and if Kot has not moved in yet, the last
// present has Kot in it. The cake it leaves in the room plays it again, without Kot.
const W=400,BEAT=.36,SONG=25*BEAT;
const SANS="'Avenir Next','Nunito',ui-rounded,'Segoe UI',system-ui,sans-serif",SERIF="Georgia,'Iowan Old Style',Palatino,serif";
/** Rose, gold, sage, teal, lilac, apricot: the house's own colours, brighter for a party. */
const PARTY=['#e2958d','#e8bd5c','#a2bd7e','#8dc0c2','#c2a5d9','#eea57d'],DEEP=['#b0605a','#b88a2c','#6b8a4c','#558d90','#8a6ca6','#bf7048'];
const BALLOONS=[...PARTY,'#f7eedd'];
const FOIL={gold:{hi:'#fff7d6',mid:'#efc865',lo:'#b7822b',end:'#f3d384',seam:'rgba(140,92,24,.5)'},rose:{hi:'#ffeae3',mid:'#ecab9c',lo:'#b1665c',end:'#f2c4b7',seam:'rgba(140,72,64,.5)'}};
// Where the eyes are on each sprite, at scale 1 and facing right: all that shows in the dark.
const EYES={david:[[-4,-27],[4,-27]],julia:[[-4,-27],[4,-27]],monki:[[-3,-29.5],[5,-29.5]],kot:[[2,-26.5],[10,-26.5]],sernik:[[5.5,-23],[13.5,-23]],galgan:[[5.5,-23],[13.5,-23]]};
// The balloons bunched in the top left corner (the right is its mirror): x, y, radius, colour.
const GARLAND=[[-8,18,27,0],[24,-10,23,1],[55,-18,18,2],[12,40,17,6],[-14,62,21,3],[40,14,14,4],[77,-10,15,0],[2,84,13,1],[33,50,10,5],[97,-16,11,6],[63,6,9,1],[47,34,8,2],[83,10,7,4],[20,66,7,3]];
const LISTENERS=['pointerdown','pointermove','pointerup','pointercancel','keydown'];

/** "21st", "22nd", "23rd", "11th". */
export const ordinal=n=>{const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
/** The party's own coordinates on a screen this size: always 400 across and as tall as the screen
 * allows (600 to 900), centred; on a wider screen the room carries on either side. */
export function stageFor(width,height){
  const h=Math.round(Math.min(900,Math.max(600,W*height/Math.max(1,width)))),k=Math.min(width/W,height/h);
  return {h,k,ox:(width-W*k)/2,oy:(height-h*k)/2};
}
const unit=t=>t<0?0:t>1?1:t,ease=t=>{t=unit(t);return t*t*(3-2*t);},out=t=>1-(1-unit(t))**3;
/** Overshoots and settles: for things that pop up. */
const springy=t=>{t=unit(t);const a=2.4;return 1+(a+1)*(t-1)**3+a*(t-1)**2;};
/** A colour lightened (towards cream) or darkened (towards a warm brown). */
function tint(hex,a){const n=parseInt(hex.slice(1),16),to=a>0?[255,252,244]:[70,36,30],f=Math.abs(a);return `rgb(${[n>>16,n>>8&255,n&255].map((v,i)=>Math.round(v+(to[i]-v)*f)).join()})`;}
function rounded(c,x,y,w,h,r){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else{c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}}
/** What a notch or a home bar takes from the top and bottom of the screen, in CSS pixels. */
function insets(el){
  const p=document.createElement('div');p.style.cssText='position:absolute;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)';
  el.append(p);const s=getComputedStyle(p),r={top:parseFloat(s.paddingTop)||0,bottom:parseFloat(s.paddingBottom)||0};p.remove();return r;
}
const fromSegment=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,u=l?unit(((p.x-a.x)*dx+(p.y-a.y)*dy)/l):0;return Math.hypot(p.x-a.x-u*dx,p.y-a.y-u*dy);};

export class BirthdayParty{
  /** mode: 'first' (the real one), 'replay' (from the cake) or 'preview' (the one leaving it).
   * `still` draws one picture of the cake and the guests, between those heights, and stops. */
  constructor({canvas,state,birthday,mode='first',sounds={play(){}},reduced=false,onLetter=()=>{},onDone=()=>{},still=null}){
    Object.assign(this,{canvas,c:canvas.getContext('2d'),state,b:birthday,mode,sounds,reduced,onLetter,onDone,still});
    this.who=birthday.for;
    // Kot comes in at the end only the first time, and only if Kot does not live here yet.
    this.kotComing=mode!=='replay'&&!still&&!state.cast?.includes('kot');
    // Behind the cake the birthday person in the middle, the other one and Monki either side; in
    // front the dogs at the corners, and Kot (once Kot lives here) in the middle.
    const SLOT={monki:'right',sernik:'frontLeft',galgan:'frontRight',kot:'front'};
    this.guests=[{id:this.who,slot:'centre',hat:'crown'}];
    for(const id of present(state)){
      const slot=SLOT[id]||(['david','julia'].includes(id)?'left':null);
      if(id===this.who||!slot||(id==='kot'&&this.kotComing)||this.guests.some(g=>g.slot===slot))continue;
      this.guests.push({id,slot,hat:id==='kot'?'bow':'partyhat'});
    }
    this.guests.forEach((g,i)=>Object.assign(g,{eyes:.45+i*.3,blink:1.4+Math.random()*2,shut:-9,jump:-9,beat:i*.8}));
    const n=Math.min(40,Math.max(1,Math.round(birthday.age)||1));
    this.candles=Array.from({length:n},(_,i)=>({i,lit:false,out:-9,lightAt:9e9,seed:Math.random()*9}));
    Object.assign(this,{parts:[],smoke:[],floaters:[],sparkles:[],timers:[],sprites:new Map(),phase:'dark',t:0,at:0,dark:1,flash:0,dim:0,litBy:9e9,stopped:false,done:false,envelope:null,box:null,lid:null,kot:null,songAt:null,sparkleUntil:0});
    if(still){this.phase='cake';this.dark=.42;for(const k of this.candles)k.lit=true;this.resize();this.draw();return;}
    this.down=e=>{e.preventDefault();this.finger=e.pointerId;try{canvas.setPointerCapture(e.pointerId);}catch{}const p=this.point(e);this.trail=p;this.tap(p.x,p.y);};
    this.move=e=>{if(e.pointerId!==this.finger)return;const p=this.point(e);if(this.ready)this.sweep(this.trail,p);this.trail=p;};
    this.up=e=>{if(e.pointerId===this.finger)this.finger=null;};
    this.key=e=>{if(![' ','Enter'].includes(e.key))return;e.preventDefault();const k=this.candles.find(k=>k.lit);if(this.ready&&k)this.tap(k.x,k.base);else this.tap(W/2,this.L.words);};
    this.handlers=[this.down,this.move,this.up,this.up,this.key];
    LISTENERS.forEach((type,i)=>canvas.addEventListener(type,this.handlers[i]));
    this.go('dark');this.resize();this.last=0;this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  stop(){this.stopped=true;cancelAnimationFrame(this.frame);LISTENERS.forEach((type,i)=>this.canvas.removeEventListener(type,this.handlers?.[i]));}
  go(phase){this.phase=phase;this.at=this.t;this.canvas.dataset.phase=phase;}
  get since(){return this.t-this.at;}
  later(s,fn){this.timers.push({at:this.t+s,fn});}
  /** Every candle alight, so they can be blown out. */
  get ready(){return this.phase==='cake'&&this.since>=this.litBy;}
  loop(ts){
    if(this.stopped)return;this.frame=requestAnimationFrame(t=>this.loop(t));
    const dt=Math.min(.05,(ts-(this.last||ts))/1000);this.last=ts;this.resize();this.update(dt);this.draw();
  }
  /** A finger on the screen, in party coordinates. */
  point(e){const r=this.canvas.getBoundingClientRect(),{k,ox,oy}=this.stage;return {x:(e.clientX-r.left-ox)/k,y:(e.clientY-r.top-oy)/k};}
  /** Device pixels for the canvas, the stage on it, and everything laid out again, whenever the
   * screen changes size or turns. */
  resize(){
    const cw=this.canvas.clientWidth||W,ch=this.canvas.clientHeight||600,dpr=Math.min(3,window.devicePixelRatio||1);
    if(this.size&&this.size.cw===cw&&this.size.ch===ch&&this.size.dpr===dpr)return;
    const st=this.still?{h:600,k:cw/W,ox:0,oy:-this.still.top*cw/W}:stageFor(cw,ch);
    this.stage=st;this.size={cw,ch,dpr};this.px=dpr*st.k;
    this.canvas.width=Math.round(cw*dpr);this.canvas.height=Math.round(ch*dpr);
    const inset=insets(this.canvas.parentElement||document.body),below=ch-st.oy-st.h*st.k;
    this.view={x0:-st.ox/st.k,x1:(cw-st.ox)/st.k,y0:-st.oy/st.k,y1:(ch-st.oy)/st.k};
    this.safe=this.still?{top:0,bottom:0}:{top:Math.max(0,inset.top-st.oy)/st.k,bottom:Math.max(0,inset.bottom-below)/st.k};
    this.layout();this.sprites.clear();this.room=null;this.shade=null;
  }
  layout(){
    const top=this.safe.top,bottom=this.stage.h-this.safe.bottom,extra=Math.max(0,bottom-top-600),L=this.L={top,bottom};
    // From the bottom up: the table, the cake on it, the back row just behind it, then the wall.
    L.hem=bottom-44;L.table=L.hem-60;L.cakeBase=L.table-10;L.tier1=L.cakeBase-2;L.tier2=L.tier1-41;L.cakeTop=L.tier2-34;
    L.feet=L.cakeTop+8;L.floor=L.feet-28;L.front=bottom-22;
    // From the top down, between the pennants and the party hats: the name in gold balloons, the
    // age in rose gold, and the words, each as big as the wall allows and evenly spaced.
    L.banner=top+16+extra*.05;
    const flags=L.banner+56,free=L.feet-134-flags;
    L.nameSize=Math.round(Math.max(48,Math.min(84,free*.27/.95)));L.digitSize=Math.round(Math.max(60,Math.min(140,free*.34/.95)));
    const nameH=L.nameSize*.95,digitH=L.digitSize*.95,gap=Math.max(0,(free-nameH-digitH-80)/4);
    L.name=flags+gap+nameH/2;L.digits=L.name+nameH/2+gap+digitH/2;L.words=Math.round(L.digits+digitH/2+gap+26);
    // A candle for every year on the top tier: two rings once there are more than nine.
    const n=this.candles.length,rings=n>9?[Math.ceil(n*.6),n-Math.ceil(n*.6)]:[n];let i=0;
    rings.forEach((m,r)=>{const [rx,ry]=n>9?(r?[22,3.4]:[40,6.5]):[34,5.5];for(let j=0;j<m;j++){const a=-Math.PI/2+(j+.5)/m*Math.PI*2+r*.35,k=this.candles[i++];k.x=n===1?200:200+Math.cos(a)*rx;k.base=n===1?L.cakeTop:L.cakeTop+Math.sin(a)*ry;k.top=k.base-17;}});
    this.order=[...this.candles].sort((a,b)=>a.base-b.base);
    L.flames=L.cakeTop-22;
  }
  /** Where each guest stands, and how big. */
  spot(slot){const L=this.L;return {centre:[200,L.feet,2.6],left:[104,L.feet+3,2.3],right:[296,L.feet+3,2.3],frontLeft:[48,L.front,2.15],frontRight:[352,L.front,2.15],front:[200,L.front+4,2.25]}[slot];}
  toStage(c){const {dpr}=this.size;c.setTransform(this.px,0,0,this.px,dpr*this.stage.ox,dpr*this.stage.oy);}

  // ---------------------------------------------------------------- what happens
  tap(x,y){
    const s=this.since;
    if(this.phase==='dark'){if(s>.6)this.lightsOn();}
    else if(this.phase==='cake'){if(this.ready)this.blow(x,y);}
    else if(this.phase==='cheer'){const e=this.envelope;if(e?.landed&&this.t-e.landed>.25){this.go('opening');this.sounds.play('paper');}}
    else if(this.phase==='present'){if(this.box?.landed&&this.t-this.box.landed>.3)this.openBox();}
    else if(this.phase==='kot'){if(s>1.1)this.finish();}
  }
  /** Shh… and only when the light goes on, everybody. The tap is also what lets a phone play sound. */
  lightsOn(){
    this.go('surprise');this.dark=0;this.flash=this.reduced?0:1;
    this.sounds.play('switch');this.later(.05,()=>{this.sounds.play('win');this.sounds.play('horn');});
    for(let i=0;i<4;i++)this.later(.12+i*.11,()=>this.sounds.play('pop'));
    this.cannons(80);for(const g of this.guests)g.jump=this.t+Math.random()*.25;
  }
  /** The lights down, the candles lit one by one, and the song. */
  cakeTime(){
    this.go('cake');this.sounds.play('switch');
    const n=this.candles.length,step=Math.min(.065,1.3/n);
    [...this.candles].sort((a,b)=>a.x-b.x).forEach((k,i)=>k.lightAt=.6+i*step);
    this.litBy=.7+n*step;this.songAt=this.t+.45;this.later(.45,()=>this.sounds.play('birthday'));
  }
  /** A puff where the finger is: the candles right there, or at least the nearest few. */
  blow(x,y){
    const lit=this.candles.filter(k=>k.lit),d=k=>Math.hypot(k.x-x,(k.base-6-y)*1.3);if(!lit.length)return;
    lit.sort((a,b)=>d(a)-d(b));
    this.snuff(lit.slice(0,Math.max(lit.filter(k=>d(k)<22).length,Math.min(lit.length,3+Math.floor(Math.random()*3)))));
  }
  /** A finger drawn across the cake puts out every candle it passes. */
  sweep(a,b){const lit=this.candles.filter(k=>k.lit&&fromSegment({x:k.x,y:k.top-4},a,b)<13);if(lit.length)this.snuff(lit);}
  snuff(list){
    for(const k of list){k.lit=false;k.out=this.t;for(let i=0;i<3;i++)this.smoke.push({x:k.x+(Math.random()-.5)*2,y:k.top-3-i*2,vx:(Math.random()-.5)*5,vy:-16-Math.random()*10,r:1.4+i*.5,life:1.5+i*.4,max:1.5+i*.4,seed:Math.random()*9});}
    if(this.t-(this.puffed??-9)>.1){this.puffed=this.t;this.sounds.play('puff');}
    if(this.candles.some(k=>k.lit))return;
    // Every one out: the wish is made, in the dark for a moment, and then the lights.
    this.go('blown');this.sounds.play('whoosh');
  }
  cheer(){
    this.go('cheer');this.dark=0;this.flash=this.reduced?0:.75;
    this.sounds.play('win');this.sounds.play('horn');this.later(.2,()=>this.sounds.play('horn'));
    for(let i=0;i<5;i++)this.later(.05+i*.1,()=>this.sounds.play('pop'));
    this.burst(200,this.L.cakeTop-12,90,{spread:.9,speed:[380,640]});this.cannons(60);
    for(const g of this.guests)g.jump=this.t+Math.random()*.3;
    if(!this.reduced)for(let i=0;i<7;i++)this.floaters.push({x:70+Math.random()*260,y:this.L.feet-30-Math.random()*40,v:70+Math.random()*50,r:10+Math.random()*5,c:PARTY[i%6],seed:Math.random()*9});
    this.sparkleUntil=this.t+3.4;
  }
  /** After the letter: one more present, or straight on to the house. */
  afterLetter(){
    this.envelope=null;
    if(!this.kotComing){this.finish();return;}
    this.go('present');this.box={at:this.t,landed:0,wobble:-9,wobbles:0};this.sounds.play('gift');
  }
  openBox(){
    this.go('kot');const top=this.L.bottom-8-50;
    this.lid={x:200,y:top-6,vx:120,vy:-560,rot:0,vr:7};this.kot={at:this.t};
    this.burst(200,top,70,{spread:.7,speed:[380,620]});
    this.sounds.play('pop');this.sounds.play('gift');this.later(.35,()=>this.sounds.play('kot'));this.later(.55,()=>this.sounds.play('win'));
  }
  finish(){if(this.done)return;this.done=true;this.stop();this.onDone();}

  update(dt){
    this.t+=dt;const s=this.since,L=this.L;
    for(const timer of this.timers.filter(x=>x.at<=this.t)){this.timers.splice(this.timers.indexOf(timer),1);if(!this.stopped)timer.fn();}
    // The room light: off, on, down for the cake, off for a moment when the last candle goes out.
    const to={dark:1,cake:.8,blown:.93}[this.phase]??0;
    this.dark+=(to-this.dark)*(1-Math.exp(-dt*(to>this.dark?(this.phase==='blown'?10:2.4):7)));
    this.flash=Math.max(0,this.flash-dt*2.4);
    // The party dims behind the letter.
    const dimTo=this.phase==='opening'?.58*ease((s-.35)/.5):this.phase==='letter'?.58:0;
    this.dim+=(dimTo-this.dim)*(1-Math.exp(-dt*6));
    if(this.phase==='surprise'&&s>2.9)this.cakeTime();
    if(this.phase==='cake')for(const k of this.candles)if(!k.lit&&k.out<0&&s>=k.lightAt){k.lit=true;if(k.i%3===0)this.sounds.play('flame');}
    if(this.phase==='blown'&&s>.8)this.cheer();
    if(this.phase==='cheer'&&s>2.6&&!this.envelope){this.envelope={at:this.t,landed:0};this.sounds.play('gift');}
    const e=this.envelope;if(e&&!e.landed&&this.t-e.at>=1.1){e.landed=this.t;this.sounds.play('paper-land');}
    if(this.phase==='opening'&&s>.9){this.go('letter');this.sounds.play('paper');this.onLetter();}
    const box=this.box;
    if(box&&!box.landed&&this.t-box.at>=.62){box.landed=this.t;this.sounds.play('land');this.burst(200,L.bottom-10,16,{spread:1.4,speed:[90,180]});}
    // Something in the box: a wobble every so often, and now and then a little meow.
    if(this.phase==='present'&&box?.landed&&this.t-box.landed>.9&&this.t-box.wobble>1.6){box.wobble=this.t;box.wobbles++;this.sounds.play(box.wobbles%2?'kot':'boop');}
    // A light fall of confetti whenever the lights are up.
    if(['surprise','cheer','letter','present','kot'].includes(this.phase)&&!this.reduced&&Math.random()<dt*6)this.piece(this.view.x0+Math.random()*(this.view.x1-this.view.x0),L.top-12,(Math.random()-.5)*20,40);
    for(const p of this.parts){p.vx*=Math.exp(-2.4*dt);p.vy=Math.min(p.fall,p.vy+520*dt);p.x+=(p.vx+Math.sin(this.t*2.4+p.seed)*p.sway)*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.flip+=p.vf*dt;p.life-=dt;}
    this.parts=this.parts.filter(p=>p.life>0&&p.y<this.view.y1+20);
    for(const p of this.smoke){p.x+=(p.vx+Math.sin(this.t*2.2+p.seed)*7)*dt;p.y+=p.vy*dt;p.r+=dt*3.2;p.life-=dt;}
    this.smoke=this.smoke.filter(p=>p.life>0);
    for(const f of this.floaters){f.y-=f.v*dt;f.x+=Math.sin(this.t*1.3+f.seed)*12*dt;}
    this.floaters=this.floaters.filter(f=>f.y>this.view.y0-90);
    const lid=this.lid;if(lid){lid.vy+=1100*dt;lid.x+=lid.vx*dt;lid.y+=lid.vy*dt;lid.rot+=lid.vr*dt;if(lid.y>this.view.y1+80)this.lid=null;}
    if(this.sparkleUntil>this.t&&!this.reduced&&Math.random()<dt*16)this.sparkles.push({x:70+Math.random()*260,y:L.name+(Math.random()-.5)*L.nameSize,at:this.t,size:3+Math.random()*4});
    this.sparkles=this.sparkles.filter(p=>this.t-p.at<.8);
  }
  piece(x,y,vx,vy,fall=55+Math.random()*60){
    const r=Math.random(),i=Math.floor(Math.random()*PARTY.length);
    this.parts.push({x,y,vx,vy,kind:r<.72?'paper':r<.88?'dot':'curl',c:PARTY[i],back:DEEP[i],w:4+Math.random()*3,h:6+Math.random()*4,rot:Math.random()*6,vr:(Math.random()-.5)*8,flip:Math.random()*6,vf:4+Math.random()*8,fall,sway:10+Math.random()*25,seed:Math.random()*9,life:10});
  }
  /** Paper bursting from a point: up, and a little to one side. */
  burst(x,y,n,{aim=0,spread=.5,speed=[420,720]}={}){
    if(this.reduced)n=Math.ceil(n/3);
    for(let i=0;i<n;i++){const a=-Math.PI/2+aim+(Math.random()-.5)*spread*2,v=speed[0]+Math.random()*(speed[1]-speed[0]);this.piece(x,y,Math.cos(a)*v,Math.sin(a)*v);}
  }
  /** Party poppers from both bottom corners. */
  cannons(n){const y=this.L.bottom-30;this.burst(-4,y,n,{aim:.42,spread:.32,speed:[600,880]});this.burst(W+4,y,n,{aim:-.42,spread:.32,speed:[600,880]});}

  // ---------------------------------------------------------------- drawing
  draw(){
    const c=this.c,t=this.reduced?0:this.t;
    c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
    c.drawImage(this.room||=this.paintRoom(),0,0);
    this.toStage(c);
    this.fairyLights(c,t,false);this.pennants(c,t);this.nameBalloons(c,t);this.digitBalloons(c,t);
    for(const f of this.floaters)this.floater(c,f);
    for(const g of this.guests)if(!g.slot.startsWith('front'))this.guest(c,g);
    this.table(c);this.cake(c);this.candleSticks(c);
    for(const g of this.guests)if(g.slot.startsWith('front'))this.guest(c,g);
    if(this.box)this.present(c);
    this.drawParts(c);
    this.shadeOver(c);
    // What shows in the dark: the flames, the fairy lights, smoke caught in them, and eyes.
    this.flames(c,t);this.fairyLights(c,t,true);this.smokeWisps(c);
    if(this.phase==='dark')this.eyes(c);
    if(this.envelope)this.envelopeArt(c,t);
    if(this.lid)this.lidArt(c);
    this.sparkleArt(c);
    if(!this.still)this.words(c);
    if(this.flash>0||this.dim>.002){
      c.setTransform(1,0,0,1,0,0);
      if(this.dim>.002){c.fillStyle=`rgba(28,18,24,${this.dim})`;c.fillRect(0,0,this.canvas.width,this.canvas.height);}
      if(this.flash>0){c.fillStyle=`rgba(255,250,236,${this.flash*.75})`;c.fillRect(0,0,this.canvas.width,this.canvas.height);}
    }
  }
  /** The room, drawn once: the wall, the panelling, the floor, the rug and the balloons. */
  paintRoom(){
    const cv=document.createElement('canvas');cv.width=this.canvas.width;cv.height=this.canvas.height;
    const g=cv.getContext('2d'),L=this.L,{x0,x1,y0,y1}=this.view,w=x1-x0,rail=L.floor-60;this.toStage(g);
    const wall=g.createLinearGradient(0,y0,0,L.floor);wall.addColorStop(0,'#f9e9da');wall.addColorStop(1,'#f1d6c2');
    g.fillStyle=wall;g.fillRect(x0,y0,w,L.floor-y0);
    // A quiet stripe with a small diamond between, then a rail and panels below it.
    for(let x=Math.floor(x0/30)*30,i=0;x<x1;x+=30,i++){
      g.fillStyle='rgba(226,178,150,.2)';g.fillRect(x,y0,10,rail-y0);
      g.fillStyle='rgba(212,156,126,.34)';for(let y=Math.floor(y0/40)*40+(i%2?20:0);y<rail-8;y+=40){g.beginPath();g.moveTo(x+20,y-2.6);g.lineTo(x+22.6,y);g.lineTo(x+20,y+2.6);g.lineTo(x+17.4,y);g.fill();}
    }
    g.fillStyle='#efccb5';g.fillRect(x0,rail,w,L.floor-rail);
    for(let x=Math.floor(x0/66)*66;x<x1;x+=66){g.lineWidth=1.5;g.strokeStyle='rgba(203,146,116,.5)';g.strokeRect(x+9,rail+12,48,L.floor-rail-25);g.lineWidth=1;g.strokeStyle='rgba(255,238,224,.6)';g.strokeRect(x+10.5,rail+13.5,48,L.floor-rail-25);}
    g.fillStyle='#d8a68a';g.fillRect(x0,rail-4,w,6);g.fillStyle='rgba(255,240,228,.8)';g.fillRect(x0,rail-4,w,1.5);g.fillStyle='rgba(150,95,70,.22)';g.fillRect(x0,rail+2,w,2);
    // The skirting, and the floor: boards running along the wall, wider apart nearer.
    g.fillStyle='#f8ecdd';g.fillRect(x0,L.floor-10,w,10);g.fillStyle='rgba(150,100,70,.3)';g.fillRect(x0,L.floor-1,w,2);
    const floor=g.createLinearGradient(0,L.floor,0,y1);floor.addColorStop(0,'#b3825d');floor.addColorStop(1,'#cfa078');
    g.fillStyle=floor;g.fillRect(x0,L.floor+1,w,y1-L.floor);
    for(let y=L.floor+1,gap=9,row=0;y<y1;row++){
      const next=y+gap;g.fillStyle='rgba(116,70,42,.22)';for(let x=Math.floor(x0/150)*150+(row%3)*50;x<x1;x+=150)g.fillRect(x,y,1.2,gap);
      g.fillStyle='rgba(116,70,42,.3)';g.fillRect(x0,next,w,1.4);g.fillStyle='rgba(255,230,200,.13)';g.fillRect(x0,next+1.4,w,1);y=next;gap*=1.14;
    }
    // A round rug under the table.
    const ry=L.hem+2,oval=(rx,ryy,col,dy=0)=>{g.fillStyle=col;g.beginPath();g.ellipse(200,ry+dy,rx,ryy,0,0,Math.PI*2);g.fill();};
    oval(192,37,'rgba(90,55,35,.16)',3);oval(188,34,'#f2e4c4');oval(180,30,'#9fc2c0');oval(148,23,'#b6d3cf');
    g.strokeStyle='rgba(243,230,200,.9)';g.lineWidth=1.5;g.setLineDash([3,4]);g.beginPath();g.ellipse(200,ry,164,26.5,0,0,Math.PI*2);g.stroke();g.setLineDash([]);
    // Balloons bunched in both top corners.
    for(const mirror of [false,true])for(const [x,y,r,i] of [...GARLAND].sort((a,b)=>b[2]-a[2]))this.balloon(g,mirror?x1-x:x0+x,L.top+y-6,r,BALLOONS[i],false);
    return cv;
  }
  balloon(c,x,y,r,color,knot=true){
    const g=c.createRadialGradient(x-r*.35,y-r*.4,r*.08,x,y,r*1.05);
    g.addColorStop(0,tint(color,.6));g.addColorStop(.32,tint(color,.12));g.addColorStop(.82,color);g.addColorStop(1,tint(color,-.2));
    c.fillStyle=g;c.beginPath();c.ellipse(x,y,r*.94,r,0,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(x-r*.4,y-r*.44,r*.2,r*.11,-.75,0,Math.PI*2);c.fill();
    if(knot)poly(c,[[x-2.5,y+r+3],[x+2.5,y+r+3],[x,y+r-1]],tint(color,-.2));
  }
  /** Warm little bulbs strung along the top of the wall: off in the dark, glowing when the lights are down. */
  fairyLights(c,t,glow){
    const {x0,x1}=this.view,y=this.L.top+1,swag=Math.max(90,(x1-x0)/3),at=x=>y+12*Math.sin(Math.PI*(((x-x0)/swag)%1));
    const on=this.phase!=='dark'||!!this.still;
    if(!glow){c.strokeStyle='#8f7f6a';c.lineWidth=.9;c.beginPath();for(let x=x0;x<=x1;x+=4)x===x0?c.moveTo(x,at(x)):c.lineTo(x,at(x));c.stroke();}
    if(glow&&!(on&&this.dark>.05))return;
    let i=0;for(let x=x0+8;x<x1;x+=17,i++){
      const by=at(x)+3.5;
      if(!glow){c.fillStyle='#6f6355';c.fillRect(x-1,by-3.5,2,2);c.fillStyle=on?'#fff0b6':'#d2c6ad';c.beginPath();c.ellipse(x,by+.5,2,2.7,0,0,Math.PI*2);c.fill();continue;}
      const a=.6*this.dark*(this.reduced?1:.72+.28*Math.sin(t*2.3+i*1.9)),g=c.createRadialGradient(x,by,0,x,by,11);
      g.addColorStop(0,`rgba(255,212,140,${a})`);g.addColorStop(1,'rgba(255,212,140,0)');
      c.globalCompositeOperation='lighter';c.fillStyle=g;c.fillRect(x-11,by-11,22,22);c.globalCompositeOperation='source-over';
      c.fillStyle=`rgba(255,246,210,${Math.min(1,this.dark*1.4)})`;c.beginPath();c.ellipse(x,by+.5,2,2.7,0,0,Math.PI*2);c.fill();
    }
  }
  /** HAPPY BIRTHDAY on a string of pennants; on a wider screen, plain ones carry on to the edges. */
  bannerAt(x){const {x0,x1}=this.view,a=x0-8,b=x1+8,u=(x-a)/(b-a);return this.L.banner+24*4*u*(1-u);}
  pennants(c,t){
    const {x0,x1}=this.view,word='HAPPY BIRTHDAY',slot=25.5,start=200-(word.length-1)*slot/2;
    c.strokeStyle='#b8987c';c.lineWidth=1.1;c.beginPath();for(let x=x0-8;x<=x1+12;x+=6)x===x0-8?c.moveTo(x,this.bannerAt(x)):c.lineTo(x,this.bannerAt(x));c.stroke();
    c.font=`800 13px ${SANS}`;c.textAlign='center';c.textBaseline='middle';
    for(let i=Math.floor((x0-start)/slot);start+i*slot<x1+12;i++){
      const ch=i>=0&&i<word.length?word[i]:'';if(ch===' ')continue;
      const fx=start+i*slot,fy=this.bannerAt(fx),ang=Math.atan2(this.bannerAt(fx+1)-this.bannerAt(fx-1),2)+(this.reduced?0:Math.sin(t*1.7+i*.8)*.05),col=PARTY[(i%6+6)%6];
      c.save();c.translate(fx,fy);c.rotate(ang);
      c.fillStyle=col;c.beginPath();c.moveTo(-11,0);c.lineTo(11,0);c.lineTo(0,30);c.closePath();c.fill();
      c.fillStyle='rgba(255,255,255,.2)';c.beginPath();c.moveTo(-11,0);c.lineTo(0,0);c.lineTo(0,30);c.closePath();c.fill();
      c.fillStyle='rgba(80,40,30,.2)';c.fillRect(-11,0,22,2);
      if(ch){c.fillStyle='#fffaf0';c.fillText(ch,0,10.5);}
      c.restore();
    }
  }
  /** A foil balloon in the shape of a letter or a number: drawn once, then only moved. */
  foil(ch,size,tone){
    const key=`${ch}|${size}|${tone}`;if(this.sprites.has(key))return this.sprites.get(key);
    const px=this.px,T=FOIL[tone],cv=document.createElement('canvas'),g=cv.getContext('2d'),font=`900 ${size}px ${SANS}`;
    g.font=font;const w=g.measureText(ch).width,pad=size*.3,sw=w+pad*2,sh=size*1.05+pad*2,base=size*.36;
    cv.width=Math.ceil(sw*px);cv.height=Math.ceil(sh*px);
    g.scale(px,px);g.translate(pad+w/2,sh/2);g.font=font;g.textAlign='center';g.textBaseline='alphabetic';g.lineJoin='round';
    const puff=size*.17,body=g.createLinearGradient(0,-size*.55,0,size*.5);
    body.addColorStop(0,T.hi);body.addColorStop(.3,T.mid);body.addColorStop(.62,T.lo);body.addColorStop(.86,T.mid);body.addColorStop(1,T.end);
    g.lineWidth=puff;g.strokeStyle=body;g.fillStyle=body;g.strokeText(ch,0,base);g.fillText(ch,0,base);
    // Light from the top left, kept on the balloon; a streak of shine; the seam round the edge.
    g.globalCompositeOperation='source-atop';
    const shine=g.createLinearGradient(-w*.6,-size*.6,w*.5,size*.55);
    shine.addColorStop(0,'rgba(255,255,255,.6)');shine.addColorStop(.32,'rgba(255,255,255,0)');shine.addColorStop(.68,'rgba(0,0,0,0)');shine.addColorStop(1,'rgba(90,40,0,.22)');
    g.fillStyle=shine;g.fillRect(-sw/2,-sh/2,sw,sh);
    g.strokeStyle='rgba(255,255,255,.8)';g.lineCap='round';g.lineWidth=size*.05;
    g.beginPath();g.moveTo(-w*.3,-size*.06);g.quadraticCurveTo(-w*.3,-size*.3,-w*.08,-size*.36);g.stroke();
    g.globalCompositeOperation='source-over';
    g.lineWidth=Math.max(.8,size*.018);g.strokeStyle=T.seam;g.strokeText(ch,0,base);
    // Its shadow on the wall, behind it.
    g.globalCompositeOperation='destination-over';
    g.shadowColor='rgba(120,70,40,.32)';g.shadowBlur=size*.1*px;g.shadowOffsetX=1000*px;g.shadowOffsetY=size*.07*px;
    g.lineWidth=puff;g.strokeStyle=g.fillStyle='#000';g.strokeText(ch,-1000,base);g.fillText(ch,-1000,base);
    const sprite={cv,w,sw,sh};this.sprites.set(key,sprite);return sprite;
  }
  sprite(c,s,x,y,rot=0,scale=1){c.save();c.translate(x,y);if(rot)c.rotate(rot);if(scale!==1)c.scale(scale,scale);c.drawImage(s.cv,-s.sw/2,-s.sh/2,s.sw,s.sh);c.restore();}
  nameBalloons(c,t){
    const L=this.L,letters=[...NAMES[this.who].toUpperCase()].map(ch=>this.foil(ch,L.nameSize,'gold'));
    const gap=L.nameSize*.02,total=letters.reduce((s,x)=>s+x.w,0)+gap*(letters.length-1),fit=Math.min(1,340/total);
    let x=200-total*fit/2;
    letters.forEach((s,i)=>{const bob=this.reduced?0:Math.sin(t*1.25+i*1.3)*2.4,rot=this.reduced?0:Math.sin(t*.9+i*1.7)*.035;this.sprite(c,s,x+s.w*fit/2,L.name+bob,rot,fit);x+=(s.w+gap)*fit;});
  }
  /** The age in rose-gold balloons, with a curl of ribbon under each. */
  digitBalloons(c,t){
    const L=this.L,digits=[...String(this.b.age)].map(d=>this.foil(d,L.digitSize,'rose')),size=L.digitSize;
    const gap=-size*.02,total=digits.reduce((s,x)=>s+x.w,0)+gap*(digits.length-1);let left=200-total/2;
    const xs=digits.map(s=>{const at=left+s.w/2;left+=s.w+gap;return at;});
    digits.forEach((s,i)=>{
      const x=xs[i],bob=this.reduced?0:Math.sin(t*1.1+i*1.9)*3,rot=this.reduced?0:Math.sin(t*.8+i*2.3)*.04,y=L.digits+bob,end=y+size*.42;
      c.strokeStyle='#c99c90';c.lineWidth=1.2;c.beginPath();c.moveTo(x,end);for(let k=1;k<=6;k++)c.lineTo(x+Math.sin(k*1.4+t*1.5)*3,end+k*6);c.stroke();
      this.sprite(c,s,x,y,rot);
    });
  }
  floater(c,f){
    c.strokeStyle='rgba(150,120,100,.55)';c.lineWidth=.8;c.beginPath();c.moveTo(f.x,f.y+f.r+2);c.quadraticCurveTo(f.x+Math.sin(this.t*2+f.seed)*6,f.y+f.r+18,f.x,f.y+f.r+36);c.stroke();
    this.balloon(c,f.x,f.y,f.r,f.c);
  }
  guest(c,g){
    const t=this.t,[x,y,scale]=this.spot(g.slot),since=t-g.jump,hop=!this.reduced&&since>=0&&since<.55?Math.sin(since/.55*Math.PI)*24:0;
    const cheering=['surprise','cheer','kot'].includes(this.phase);
    // Everybody sways to the song while the candles are lit.
    let sway=0;if(this.phase==='cake'&&!this.reduced&&this.songAt!=null){const u=t-this.songAt;if(u>0&&u<SONG)sway=Math.sin(u*Math.PI*2/(3*BEAT)+g.beat)*.045;}
    c.save();c.translate(x,y-hop);if(sway)c.rotate(sway);
    character(c,g.id,0,0,{scale,hat:g.hat,mood:'happy',frame:cheering?t*7:this.still?0:t*2,flip:x>200,shadow:!hop});
    c.restore();
  }
  table(c){
    const L=this.L,top=L.table,hem=L.hem,rx=102,n=Math.round((rx*2+10)/12),step=(rx*2+10)/n;
    c.fillStyle='rgba(90,50,30,.2)';c.beginPath();c.ellipse(200,hem+4,rx+12,8,0,0,Math.PI*2);c.fill();
    // A long cloth with soft folds and a green band at the hem, then the round top.
    const cloth=c.createLinearGradient(200-rx,0,200+rx,0);cloth.addColorStop(0,'#ebdfcc');cloth.addColorStop(.25,'#fdf9f1');cloth.addColorStop(.7,'#f8f0e2');cloth.addColorStop(1,'#e3d4bd');
    c.fillStyle=cloth;c.beginPath();c.moveTo(200-rx,top);c.lineTo(200-rx-5,hem);for(let i=0;i<n;i++)c.arc(200-rx-5+step*(i+.5),hem,step/2,Math.PI,0,true);c.lineTo(200+rx,top);c.closePath();c.fill();
    c.fillStyle='rgba(196,172,140,.2)';for(let x=200-rx+12;x<200+rx-8;x+=20)c.fillRect(x+(x-200)*.03,top+10,3,hem-top-14);
    c.fillStyle='#a9c08d';c.beginPath();c.moveTo(200-rx-3.6,hem-14);c.lineTo(200+rx+3.6,hem-14);c.lineTo(200+rx+4.4,hem-7);c.lineTo(200-rx-4.4,hem-7);c.closePath();c.fill();
    c.fillStyle='#e9dcc6';for(let i=0;i<n;i++){c.beginPath();c.arc(200-rx-5+step*(i+.5),hem+3.5,1.5,0,Math.PI*2);c.fill();}
    c.fillStyle='#e8dcc8';c.beginPath();c.ellipse(200,top+2,rx,14,0,0,Math.PI*2);c.fill();
    c.fillStyle='#fffaf2';c.beginPath();c.ellipse(200,top,rx,13,0,0,Math.PI*2);c.fill();
    // Two small presents beside the cake.
    this.parcel(c,200-rx+14,top+3,28,21,'#8dc0c2','#e8bd5c');this.parcel(c,200+rx-14,top+4,22,27,'#e2958d','#fbf2e2');
  }
  parcel(c,x,y,w,h,body,ribbon){
    c.fillStyle=body;c.fillRect(x-w/2,y-h,w,h);c.fillStyle='rgba(60,30,20,.14)';c.fillRect(x+w/2-4,y-h,4,h);
    c.fillStyle=tint(body,-.12);c.fillRect(x-w/2-2,y-h-5,w+4,6);
    c.fillStyle=ribbon;c.fillRect(x-2,y-h-5,4,h+5);
    c.beginPath();c.ellipse(x-5,y-h-8,5,3.2,-.5,0,Math.PI*2);c.ellipse(x+5,y-h-8,5,3.2,.5,0,Math.PI*2);c.fill();
  }
  /** Two tiers on a stand: pink with white icing, then cream with pink, the name on the front. */
  cake(c){
    const L=this.L,x=200,base=L.cakeBase,y1=L.tier1,y2=L.tier2,top=L.cakeTop;
    c.fillStyle='#efe6d8';c.beginPath();c.moveTo(x-9,base);c.lineTo(x+9,base);c.lineTo(x+15,L.table);c.lineTo(x-15,L.table);c.closePath();c.fill();
    c.fillStyle='#e3c779';c.beginPath();c.ellipse(x,base+1.5,85,9.5,0,0,Math.PI*2);c.fill();
    c.fillStyle='#fbf7ef';c.beginPath();c.ellipse(x,base,84,8.5,0,0,Math.PI*2);c.fill();
    this.tier(c,x,y1,72,41,10,['#e7a39c','#f6c7c0','#f0b4ac','#d78f88'],'#fff6ef',1);
    // Pearls round the bottom, and the name.
    c.fillStyle='#fff1e8';for(let dx=-64;dx<=64;dx+=10.6){const yy=y1+10*Math.sqrt(1-(dx/72)**2)-3.5;c.beginPath();c.arc(x+dx,yy,3,0,Math.PI*2);c.fill();}
    c.font=`italic 600 19px ${SERIF}`;c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='rgba(255,246,240,.7)';c.fillText(NAMES[this.who],x,y1-12.5);c.fillStyle='#ab4b57';c.fillText(NAMES[this.who],x,y1-14);
    this.tier(c,x,y2,50,34,8,['#ecdccb','#fdf6ee','#f8ece0','#e2cdb8'],'#eea7a0',2);
    // Sprinkles on the upper tier.
    for(let i=0;i<22;i++){const sx=x-44+((i*37)%88),sy=y2-26+((i*53)%22);c.fillStyle=PARTY[i%6];c.fillRect(sx,sy,2.4,1.2);}
    c.fillStyle='#f3b4ad';c.beginPath();c.ellipse(x,top,50,8,0,0,Math.PI*2);c.fill();
  }
  tier(c,x,base,rx,h,ry,shades,icing,seed){
    const side=c.createLinearGradient(x-rx,0,x+rx,0);side.addColorStop(0,shades[0]);side.addColorStop(.2,shades[1]);side.addColorStop(.62,shades[2]);side.addColorStop(1,shades[3]);
    c.fillStyle=side;c.beginPath();c.moveTo(x-rx,base-h);c.lineTo(x-rx,base);c.ellipse(x,base,rx,ry,0,Math.PI,0,true);c.lineTo(x+rx,base-h);c.closePath();c.fill();
    // Icing over the top, running down the front in drips.
    c.fillStyle=icing;c.beginPath();c.ellipse(x,base-h,rx+1,ry,0,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(x,base-h+3,rx+1,ry,0,0,Math.PI);c.fill();
    for(let dx=-rx+4,i=0;dx<rx-2;dx+=8.5,i++){const edge=base-h+ry*Math.sqrt(Math.max(0,1-(dx/rx)**2)),len=4+((i*7+seed*5)%11);c.fillRect(x+dx-3,edge,6,len);c.beginPath();c.arc(x+dx,edge+len,3,0,Math.PI*2);c.fill();}
  }
  candleSticks(c){
    for(const k of this.order){
      c.fillStyle=PARTY[k.i%6];c.fillRect(k.x-2,k.top,4,k.base-k.top);
      c.fillStyle='rgba(255,252,244,.85)';for(let y=k.top+2;y<k.base-1;y+=4)c.fillRect(k.x-2,y,4,1.5);
      c.fillStyle='rgba(80,40,30,.2)';c.fillRect(k.x+1.1,k.top,.9,k.base-k.top);
      c.fillStyle='#4e463e';c.fillRect(k.x-.45,k.top-3,.9,3);
    }
  }
  flames(c,t){
    const lit=this.order.filter(k=>k.lit);if(!lit.length)return;
    c.globalCompositeOperation='lighter';
    for(const k of lit){const g=c.createRadialGradient(k.x,k.top-7,0,k.x,k.top-7,13);g.addColorStop(0,'rgba(255,196,110,.42)');g.addColorStop(1,'rgba(255,170,80,0)');c.fillStyle=g;c.fillRect(k.x-13,k.top-20,26,26);}
    c.globalCompositeOperation='source-over';
    for(const k of lit){
      const f=this.reduced?0:Math.sin(t*13+k.seed)*.8+Math.sin(t*7.7+k.seed*2)*.5,h=7.5+f*.7,tip=f*.9,y=k.top-2.5;
      c.fillStyle='#f29a3c';c.beginPath();c.moveTo(k.x+tip,y-h);c.quadraticCurveTo(k.x+3.3,y-h*.35,k.x,y+1);c.quadraticCurveTo(k.x-3.3,y-h*.35,k.x+tip,y-h);c.fill();
      c.fillStyle='#ffd66e';c.beginPath();c.moveTo(k.x+tip*.7,y-h*.78);c.quadraticCurveTo(k.x+2.1,y-h*.3,k.x,y);c.quadraticCurveTo(k.x-2.1,y-h*.3,k.x+tip*.7,y-h*.78);c.fill();
      c.fillStyle='#fffbea';c.beginPath();c.ellipse(k.x,y-1.6,1,1.8,0,0,Math.PI*2);c.fill();
    }
  }
  smokeWisps(c){for(const p of this.smoke){const a=.3*p.life/p.max,r=p.r*1.8,g=c.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(236,232,226,${a})`);g.addColorStop(1,'rgba(236,232,226,0)');c.fillStyle=g;c.fillRect(p.x-r,p.y-r,r*2,r*2);}}
  /** The room light. Dark is a sheet over everything with the candles' light cut out of it. */
  shadeOver(c){
    const d=this.dark;if(d<.004)return;
    const sh=this.shade||=document.createElement('canvas');
    if(sh.width!==this.canvas.width||sh.height!==this.canvas.height){sh.width=this.canvas.width;sh.height=this.canvas.height;}
    const g=sh.getContext('2d'),lit=this.candles.filter(k=>k.lit).length/this.candles.length,x=200,y=this.L.flames;
    g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='copy';g.fillStyle=`rgba(16,9,24,${d})`;g.fillRect(0,0,sh.width,sh.height);
    if(lit>0){
      g.globalCompositeOperation='destination-out';this.toStage(g);
      const R=130+160*lit,light=g.createRadialGradient(x,y,4,x,y,R);
      light.addColorStop(0,`rgba(0,0,0,${Math.min(.98,.45+lit)})`);light.addColorStop(.4,`rgba(0,0,0,${.66*lit})`);light.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=light;g.fillRect(x-R,y-R,R*2,R*2);
    }
    c.setTransform(1,0,0,1,0,0);c.drawImage(sh,0,0);this.toStage(c);
    if(lit>0){
      const R=100+130*lit,warm=c.createRadialGradient(x,y,0,x,y,R);warm.addColorStop(0,`rgba(255,168,88,${.3*lit})`);warm.addColorStop(1,'rgba(255,170,90,0)');
      c.globalCompositeOperation='lighter';c.fillStyle=warm;c.fillRect(x-R,y-R,R*2,R*2);c.globalCompositeOperation='source-over';
    }
  }
  /** Everybody waiting in the dark: just their eyes, opening one by one, blinking, looking about. */
  eyes(c){
    const t=this.t,a=unit((this.dark-.5)*2);
    for(const g of this.guests){
      const u=this.since-g.eyes;if(u<0||g.slot==='centre')continue;
      if(t>g.blink){g.shut=t;g.blink=t+1.6+Math.random()*2.6;}
      const open=Math.min(unit(u/.25),t-g.shut<.13?.12:1),[x,y,s]=this.spot(g.slot),flip=x>200?-1:1,wave=Math.sin(t*.8+g.beat*3),look=wave>.55?1:wave<-.55?-1:0;
      for(const [ex,ey] of EYES[g.id]||EYES.sernik){
        const px=x+ex*s*flip,py=y+ey*s;
        c.fillStyle=g.id==='kot'?`rgba(232,236,140,${a})`:`rgba(246,244,255,${a})`;c.beginPath();c.ellipse(px,py,1.45*s,1.75*s*open,0,0,Math.PI*2);c.fill();
        if(open>.5){c.fillStyle=`rgba(20,16,30,${a})`;c.beginPath();c.ellipse(px+look*.55*s,py+.15*s,.62*s,.85*s,0,0,Math.PI*2);c.fill();}
      }
    }
  }
  envelopeAt(){return this.L.words+12;}
  /** The letter comes down in an envelope with a wax heart; a tap opens the flap and it rises out. */
  envelopeArt(c,t){
    const e=this.envelope,u=(this.t-e.at)/1.1,end=this.envelopeAt(),L=this.L,w=124,h=82;
    let y=end,rot=0;
    if(u<1){const p=out(u);y=L.top-70+(end-L.top+70)*p;rot=(this.reduced?0:.45)*Math.cos(u*9)*(1-p);}
    else if(!this.reduced)y+=Math.sin(t*2)*2.5;
    const open=this.phase==='opening'?this.since:this.phase==='letter'?9:0,flap=ease(open/.35),rise=ease((open-.3)/.5);
    // A soft light behind it.
    const halo=c.createRadialGradient(200,y,10,200,y,110);halo.addColorStop(0,'rgba(255,250,232,.7)');halo.addColorStop(1,'rgba(255,250,232,0)');c.fillStyle=halo;c.fillRect(90,y-110,220,220);
    c.save();c.translate(200,y);c.rotate(rot);
    c.fillStyle='rgba(70,40,30,.16)';c.fillRect(-w/2+3,-h/2+5,w,h);
    c.fillStyle='#f3e3c8';c.fillRect(-w/2,-h/2,w,h);
    if(flap>.5){c.fillStyle='#ecd8b9';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,-h/2);c.lineTo(0,-h/2-h*.6*(flap-.5)*2);c.closePath();c.fill();}
    if(rise>0){
      const cy=-h/2+6-rise*60;c.fillStyle='#fffaf0';c.fillRect(-w/2+9,cy,w-18,h-12);
      c.fillStyle='rgba(176,96,90,.35)';for(let k=0;k<3;k++)c.fillRect(-w/2+22,cy+16+k*10,w-44-(k===2?30:0),1.5);
      this.heart(c,0,cy+52,5,'#d9727b');
    }
    c.fillStyle='#fbf2e2';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(0,h*.1);c.lineTo(w/2,-h/2);c.lineTo(w/2,h/2);c.lineTo(-w/2,h/2);c.closePath();c.fill();
    c.strokeStyle='rgba(190,150,110,.35)';c.lineWidth=1;c.beginPath();c.moveTo(-w/2,h/2);c.lineTo(-6,2);c.moveTo(w/2,h/2);c.lineTo(6,2);c.stroke();
    if(flap<=.5){
      const tip=-h/2+h*.62*(1-flap*2);
      c.fillStyle='#f6e8d2';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(w/2,-h/2);c.lineTo(0,tip);c.closePath();c.fill();
      c.strokeStyle='rgba(170,130,90,.3)';c.beginPath();c.moveTo(-w/2,-h/2);c.lineTo(0,tip);c.lineTo(w/2,-h/2);c.stroke();
      if(flap<.25){c.fillStyle='#9d3542';c.beginPath();c.arc(0,tip-2,12,0,Math.PI*2);c.fill();c.fillStyle='#b9454f';c.beginPath();c.arc(0,tip-2,9.5,0,Math.PI*2);c.fill();this.heart(c,0,tip-2,4.6,'#e9959a');}
    }
    c.strokeStyle='rgba(170,130,90,.35)';c.lineWidth=1;c.strokeRect(-w/2+.5,-h/2+.5,w-1,h-1);
    c.restore();
  }
  heart(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y+r*.9);c.bezierCurveTo(x-r*1.6,y-r*.2,x-r*.7,y-r*1.4,x,y-r*.45);c.bezierCurveTo(x+r*.7,y-r*1.4,x+r*1.6,y-r*.2,x,y+r*.9);c.fill();}
  /** The last present: a box that wobbles and meows, and when it is opened, Kot. */
  present(c){
    const box=this.box,L=this.L,bottom=L.bottom-8,w=72,h=50,t=this.t;
    let y=bottom,sx=1,sy=1,rot=0;const u=(t-box.at)/.62;
    if(u<1)y=L.top-60+(bottom-L.top+60)*u*u;
    else{
      const v=t-box.landed;if(v<.35&&!this.reduced){const q=Math.sin(v/.35*Math.PI)*(1-v/.35);sy=1-.14*q;sx=1+.1*q;}
      const wv=t-box.wobble;if(this.phase==='present'&&wv<.45&&!this.reduced){rot=Math.sin(wv/.45*Math.PI*3)*.07*(1-wv/.45);y-=Math.sin(wv/.45*Math.PI)*4;}
    }
    if(u>=1){c.fillStyle='rgba(70,40,25,.22)';c.beginPath();c.ellipse(200,bottom+2,w*.62,7,0,0,Math.PI*2);c.fill();}
    c.save();c.translate(200,y);c.rotate(rot);c.scale(sx,sy);
    const open=this.phase==='kot';
    if(open){
      c.fillStyle='#5f9294';c.fillRect(-w/2+3,-h-5,w-6,7);
      // Kot comes up out of it, in a bow: everything above the box, and only what is inside it.
      const k=t-this.kot.at,rise=this.reduced?1:springy((k-.1)/.5),ky=60-80*rise;
      c.save();c.beginPath();c.rect(-w*2,-320,w*4,320-h);c.rect(-w/2+3,-h,w-6,h);c.clip();
      character(c,'kot',0,ky,{scale:2.2,hat:'bow',mood:'happy',frame:t*3,shadow:false});c.restore();
    }
    c.fillStyle='#8dc0c2';c.fillRect(-w/2,-h,w,h);
    c.fillStyle='#fbf2e2';for(let r=0;r<3;r++)for(let q=0;q<5;q++){const dx=-w/2+8+q*15+(r%2)*7,dy=-h+10+r*15;if(dx<w/2-5){c.beginPath();c.arc(dx,dy,2.6,0,Math.PI*2);c.fill();}}
    c.fillStyle='rgba(40,70,72,.18)';c.fillRect(w/2-11,-h,11,h);c.fillStyle='rgba(255,255,255,.18)';c.fillRect(-w/2,-h,5,h);
    c.fillStyle='#d9787c';c.fillRect(-6.5,-h,13,h);
    if(!open){c.fillStyle='#7fb2b4';c.fillRect(-w/2-5,-h-13,w+10,15);c.fillStyle='rgba(255,255,255,.2)';c.fillRect(-w/2-5,-h-13,w+10,3);c.fillStyle='#d9787c';c.fillRect(-6.5,-h-13,13,15);this.bow(c,0,-h-13);}
    c.restore();
  }
  bow(c,x,y){
    c.fillStyle='#c9646a';c.beginPath();c.moveTo(x,y);c.lineTo(x-14,y+14);c.lineTo(x-8,y+15);c.closePath();c.moveTo(x,y);c.lineTo(x+14,y+14);c.lineTo(x+8,y+15);c.closePath();c.fill();
    c.fillStyle='#e0868b';c.beginPath();c.ellipse(x-11,y-7,12,7,-.35,0,Math.PI*2);c.ellipse(x+11,y-7,12,7,.35,0,Math.PI*2);c.fill();
    c.fillStyle='#c9646a';c.beginPath();c.ellipse(x-11,y-7,5,3,-.35,0,Math.PI*2);c.ellipse(x+11,y-7,5,3,.35,0,Math.PI*2);c.fill();
    c.fillStyle='#d9787c';c.beginPath();c.ellipse(x,y-4,5,5,0,0,Math.PI*2);c.fill();
  }
  lidArt(c){const l=this.lid,w=82;c.save();c.translate(l.x,l.y);c.rotate(l.rot);c.fillStyle='#7fb2b4';c.fillRect(-w/2,-8,w,15);c.fillStyle='#d9787c';c.fillRect(-6.5,-8,13,15);this.bow(c,0,-8);c.restore();}
  sparkleArt(c){
    for(const p of this.sparkles){const u=(this.t-p.at)/.8,r=p.size*Math.sin(u*Math.PI);c.fillStyle='rgba(255,252,236,.95)';c.beginPath();c.moveTo(p.x,p.y-r);c.lineTo(p.x+r*.22,p.y);c.lineTo(p.x,p.y+r);c.lineTo(p.x-r*.22,p.y);c.closePath();c.moveTo(p.x-r,p.y);c.lineTo(p.x,p.y+r*.22);c.lineTo(p.x+r,p.y);c.lineTo(p.x,p.y-r*.22);c.closePath();c.fill();}
  }
  drawParts(c){
    const px=this.px,{dpr}=this.size,ox=dpr*this.stage.ox,oy=dpr*this.stage.oy;
    for(const p of this.parts){
      const co=Math.cos(p.rot)*px,si=Math.sin(p.rot)*px;c.setTransform(co,si,-si,co,ox+p.x*px,oy+p.y*px);
      if(p.kind==='paper'){const f=Math.cos(p.flip),w=p.w*Math.max(.15,Math.abs(f));c.fillStyle=f>0?p.c:p.back;c.fillRect(-w/2,-p.h/2,w,p.h);}
      else if(p.kind==='dot'){c.fillStyle=p.c;c.beginPath();c.arc(0,0,2.2,0,Math.PI*2);c.fill();}
      else{const wv=Math.sin(p.flip)*2;c.strokeStyle=p.c;c.lineWidth=1.8;c.beginPath();c.moveTo(-8,0);c.quadraticCurveTo(-4,-4+wv,0,0);c.quadraticCurveTo(4,4-wv,8,0);c.stroke();}
    }
    this.toStage(c);
  }

  // ---------------------------------------------------------------- words
  /** Big friendly letters, each popping in on its own: a cream edge, a darker step under it. */
  sticker(c,text,x,y,size,since,{maxWidth=360,stagger=.05}={}){
    c.font=`900 ${size}px ${SANS}`;let width=c.measureText(text).width;
    if(width>maxWidth){size*=maxWidth/width;c.font=`900 ${size}px ${SANS}`;width=c.measureText(text).width;}
    c.textAlign='center';c.textBaseline='alphabetic';c.lineJoin='round';
    let lx=x-width/2,n=0;
    for(const ch of text){
      const cw=c.measureText(ch).width,u=(since-n*stagger)/.45;
      if(ch!==' '&&u>0){
        const i=n%PARTY.length,s=this.reduced?1:springy(u),rot=this.reduced?0:(n%2?.06:-.06)*(1-unit(u*1.5));
        c.save();c.translate(lx+cw/2,y);c.rotate(rot);c.scale(s,s);
        c.lineWidth=size*.2;c.strokeStyle='rgba(84,44,40,.3)';c.strokeText(ch,0,size*.08);
        c.strokeStyle='#fffaf0';c.strokeText(ch,0,0);
        c.fillStyle=DEEP[i];c.fillText(ch,0,size*.05);c.fillStyle=PARTY[i];c.fillText(ch,0,0);
        c.restore();
      }
      lx+=cw;if(ch!==' ')n++;
    }
  }
  script(c,text,x,y,size,{color='#fff6e6',glow='rgba(40,20,26,.65)',alpha=1}={}){
    if(alpha<=0)return;
    c.save();c.globalAlpha=alpha;c.font=`italic ${size}px ${SERIF}`;c.textAlign='center';c.textBaseline='alphabetic';
    c.shadowColor=glow;c.shadowBlur=size*.45*this.px;c.shadowOffsetY=size*.05*this.px;c.fillStyle=color;c.fillText(text,x,y);c.restore();
  }
  hint(c,text,x,y,alpha=1){
    if(alpha<=0)return;
    c.save();c.globalAlpha=alpha;c.font=`700 14px ${SANS}`;const w=c.measureText(text).width+32,dark=this.phase==='dark';
    c.fillStyle=dark?'rgba(255,246,230,.1)':'rgba(52,34,32,.78)';rounded(c,x-w/2,y-16,w,32,16);c.fill();
    if(dark){c.strokeStyle='rgba(255,246,230,.4)';c.lineWidth=1;c.stroke();}
    c.fillStyle='#fff6e8';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y+1);c.restore();
  }
  words(c){
    const L=this.L,s=this.since,name=NAMES[this.who],y=L.words,pulse=this.reduced?1:.9+.1*Math.sin(this.t*3.2);
    if(this.phase==='dark'){
      // Whispers by the eyes, then how to turn the light on.
      const whisper=(text,g,at)=>{const u=s-at;if(!g||u<0||u>2.4)return;const [x,gy,sc]=this.spot(g.slot);c.globalAlpha=unit(u/.3)*unit((2.4-u)/.5);c.font=`italic 14px ${SERIF}`;c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#c9cbe8';c.fillText(text,x,gy-38*sc-8);c.globalAlpha=1;};
      whisper('shh!',this.guests.find(g=>g.slot==='left'),1);
      whisper(`${name}’s here!`,this.guests.find(g=>g.slot==='right')||this.guests.find(g=>g.slot==='frontRight'),2.2);
      if(s>1.3)this.hint(c,'Tap to turn on the lights',200,y,unit((s-1.3)*2)*pulse);
    }else if(this.phase==='surprise'){
      c.globalAlpha=unit((2.9-s)/.35);this.sticker(c,'SURPRISE!',200,y+20,64,s);c.globalAlpha=1;
    }else if(this.phase==='cake'){
      const lit=this.candles.filter(k=>k.lit).length,started=this.candles.some(k=>k.out>=0);
      this.script(c,`Make a wish, ${name}`,200,y,30,{alpha:unit((s-1)*1.5)});
      if(started)this.hint(c,`${lit} candle${lit===1?'':'s'} to go`,200,y+38);
      else this.hint(c,'Tap the candles to blow them out',200,y+38,unit((s-this.litBy-1.6)*2)*pulse);
    }else if(this.phase==='cheer'){
      const fade=this.envelope?unit(1-(this.t-this.envelope.at)/.4):1;
      if(fade>0){c.globalAlpha=fade;this.sticker(c,'Happy birthday!',200,y+16,50,s,{maxWidth:350});c.globalAlpha=1;}
      if(this.envelope?.landed)this.hint(c,'A letter for you · tap to open',200,this.envelopeAt()+68,unit((this.t-this.envelope.landed)*2)*pulse);
    }else if(this.phase==='present'){
      this.script(c,'One more present…',200,y,28,{color:'#9a4651',glow:'rgba(255,248,236,.95)',alpha:unit((s-.5)*2)});
      if(this.box?.landed)this.hint(c,'Tap to open it',200,y+36,unit((this.t-this.box.landed-.6)*2)*pulse);
    }else if(this.phase==='kot'){
      this.sticker(c,'It’s Kot!',200,y+8,54,s-.45);
      this.hint(c,'Kot has moved in · tap to go inside',200,y+40,unit((s-1.3)*2)*pulse);
    }
    if(this.mode==='preview')this.hint(c,'Preview · only you can see this',200,L.bottom-18,.92);
  }
}

/** One still picture of the party, for the page where it is planned: the cake lit, everybody round it. */
export function birthdayPicture(canvas,{state,birthday}){return new BirthdayParty({canvas,state,birthday,still:{top:266}});}

/** The letter, as real text on paper over the party: paragraphs as written, line breaks kept. */
export function fillLetter(el,{birthday}){
  const b=birthday,make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
  el.replaceChildren();
  const scroll=make('div','birthday-scroll');scroll.tabIndex=0;
  const to=make('p','birthday-to');to.append(make('span','',`For ${NAMES[b.for]}`),make('small','',`on your ${ordinal(b.age)} birthday`));
  const text=make('div','birthday-text');
  for(const para of b.message.split(/\n\s*\n/)){const p=make('p');para.split('\n').forEach((line,i)=>{if(i)p.append(document.createElement('br'));p.append(document.createTextNode(line));});text.append(p);}
  scroll.append(to,make('div','birthday-flourish','♥'),text,make('p','birthday-from',b.signature||NAMES[b.from]));
  el.append(scroll);
}

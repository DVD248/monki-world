import {character,item,rect,poly,ellipse} from './art.js';
import {SkyJump,FoodDrop,JUMP,DROP,JUMP_ZONES,DROP_ZONES,ARCADE_GAMES,platformX,birdX,dropX,scoreText} from './shared/arcade.js';
import {W,H,SANS,along,noise,clamp} from './arcade-kit.js';
import drive from './arcade-drive.js';
import jet from './arcade-jet.js';
import fall from './arcade-fall.js';
import cliff from './arcade-cliff.js';
import match from './arcade-match.js';
import hop from './arcade-hop.js';

/** Draws and drives one arcade run on the canvas. The rules live in shared/arcade.js;
 * this is the feel: the squash on a bounce, the crumbs, the voice of whoever you just
 * overtook, and a line across the sky where your best and theirs are. Sky Jump and Food
 * Drop are drawn here; each later game brings its rules, picture and card in one file. */
export const VIEWS={drive,jet,cliff,hop,fall,match};
export const ARCADE_ZONES={jump:JUMP_ZONES,drop:DROP_ZONES,...Object.fromEntries(Object.entries(VIEWS).map(([id,view])=>[id,view.zones]))};
const STEP=1/120;
// Sky Jump climbs from a garden afternoon, through the evening, into space.
const SKY_TOP=[[0,'#bcd9e0'],[150,'#c9e0ec'],[300,'#b5cde6'],[450,'#e7b98f'],[600,'#2e3558'],[800,'#141829']];
const SKY_LOW=[[0,'#e4efd9'],[150,'#e6f0ee'],[300,'#d9e6ef'],[450,'#f3d8b4'],[600,'#4a5078'],[800,'#1f2440']];
const PADS={cloud:['#fbf8ee','#dfe2d4'],moving:['#dcebf2','#a9c6d2'],fragile:['#f6e1d6','#d8b3a2'],fake:['#8f989d','#6b7478']};
const KITCHEN=[{wall:'#eadcc0',tile:'#e2d1b1',floor:'#b9926a',line:'#a88259'},{wall:'#cfe4dc',tile:'#bcd6c8',floor:'#8fae72',line:'#7c9a61'},{wall:'#c9dcea',tile:'#b8cce0',floor:'#b06d4c',line:'#95593d'},{wall:'#2f3656',tile:'#394166',floor:'#4f4a5c',line:'#403c4c'},{wall:'#161a2c',tile:'#1f2440',floor:'#3a3350',line:'#2d2840'}];

export class ArcadeGame{
  constructor(canvas,game,{sound=()=>{},reduced=false,best=0,rival=null,hat=null,start=0,onEnd=()=>{},onOver=()=>{},onPause=()=>{}}={}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.game=game;this.info=ARCADE_GAMES[game];this.view=VIEWS[game]||null;this.start=start;
    this.sound=sound;this.reduced=reduced;this.best=best;this.rival=rival;this.hat=hat;this.onEnd=onEnd;this.onOver=onOver;this.onPause=onPause;
    this.keys=new Set();this.pointers=new Map();this.taps=[];this.cleanups=[];this.last=0;this.stopped=false;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:clamp((e.clientX-r.left)*W/r.width,0,W),y:clamp((e.clientY-r.top)*H/r.height,0,H)};};
    this.listen(canvas,'pointerdown',e=>{e.preventDefault();canvas.setPointerCapture?.(e.pointerId);const p=point(e);this.target=p.x;this.pointers.set(e.pointerId,p);if(!this.paused)this.taps.push(p);this.touched=true;});
    this.listen(canvas,'pointermove',e=>{const p=point(e);if(e.pointerType==='mouse'||e.buttons||e.pressure>0)this.target=p.x;if(this.pointers.has(e.pointerId))this.pointers.set(e.pointerId,p);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])this.listen(canvas,name,e=>this.pointers.delete(e.pointerId));
    this.listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.keys.add(e.key);this.target=null;this.touched=true;}
      else if([' ','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(!e.repeat&&!this.paused)this.taps.push({x:W/2,y:H/2,key:true});this.keys.add(e.key);this.touched=true;}});
    this.listen(canvas,'keyup',e=>this.keys.delete(e.key));
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.pause(true);});
    this.restart();
    this.frame=requestAnimationFrame(t=>this.loop(t));canvas.focus();
  }
  listen(el,name,fn){el.addEventListener(name,fn);this.cleanups.push(()=>el.removeEventListener(name,fn));}
  get score(){return this.game==='jump'?this.logic.metres:this.logic.score;}
  /** The clock the picture runs on. The rules stop at the end of a run; clouds, pigeons and
   * falling food carry on moving underneath the result instead of freezing mid-air. */
  clock(){return this.logic.time+(this.overAt===null?0:this.time-this.overAt);}
  restart(){
    const seed=`${this.game}:${Date.now()}:${Math.random()}`;
    this.logic=this.view?new this.view.Logic(seed,{start:this.start}):this.game==='jump'?new SkyJump(seed,{start:this.start}):new FoodDrop(seed,{start:this.start});
    this.particles=[];this.texts=[];this.banner=null;this.shake=0;this.flash=0;this.time=0;this.acc=0;this.ended=0;this.reported=false;this.overAt=null;
    this.target=null;this.touched=false;this.lastCam=0;this.lastView=null;this.mood=null;this.moodUntil=0;this.taps=[];this.pointers.clear();this.view?.reset?.(this);
    // Nothing to overtake on a first go; afterwards, your own best and theirs are lines to cross.
    // A test run started above a line has not crossed it.
    this.passedBest=this.best<=this.start;this.passedRival=!this.rival?.best||this.rival.best<=this.start;
    this.paused=false;this.onPause(false);
  }
  pause(value){if(this.stopped||this.logic.over&&value)return;this.paused=value;this.keys.clear();this.pointers.clear();this.taps=[];this.onPause(value);if(!value){this.last=0;this.canvas.focus();}}
  stop(){this.stopped=true;cancelAnimationFrame(this.frame);for(const off of this.cleanups)off();this.cleanups=[];}
  loop(ts){
    if(this.stopped)return;this.frame=requestAnimationFrame(t=>this.loop(t));
    const dt=Math.min(.05,(ts-(this.last||ts))/1000);this.last=ts;
    if(!this.paused)this.update(dt);this.draw();
  }
  update(dt){
    this.time+=dt;const logic=this.logic,dir=(this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0);
    // A fixed physics step, so a bounce is the same height at 60 Hz and at 120 Hz. A tap goes
    // to the first step after it, however many steps a frame holds, even none.
    this.acc+=dt;
    if(this.view){const input=this.input();while(this.acc>=STEP){input.taps=this.taps.splice(0);logic.step(STEP,input);this.acc-=STEP;}}
    else while(this.acc>=STEP){logic.step(STEP,this.target,dir);this.acc-=STEP;}
    // Crumbs and words stay where they happened while the picture scrolls.
    let sx=0,sy=this.game==='jump'?logic.cam-this.lastCam:0;this.lastCam=logic.cam||0;
    if(this.view?.camera){const cam=this.view.camera(this);if(this.lastView){sx=this.lastView.x-cam.x;sy=this.lastView.y-cam.y;}this.lastView=cam;}
    for(const p of this.particles){p.x+=sx;p.y+=sy;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.life-=dt;}
    this.particles=this.particles.filter(p=>p.life>0);
    for(const t of this.texts){t.x+=sx;t.y+=sy-26*dt;t.life-=dt;}
    this.texts=this.texts.filter(t=>t.life>0);
    for(const e of logic.events.splice(0))this.event(e);
    this.overtake();
    this.shake=Math.max(0,this.shake-dt*18);this.flash=Math.max(0,this.flash-dt*3);
    // The score is kept the moment a run ends; the result follows a beat later, after the fall.
    if(logic.over&&this.overAt===null){this.overAt=this.time;this.onEnd(this.score);}
    if(logic.over&&!this.reported){this.ended+=dt;if(this.ended>.85){this.reported=true;this.onOver(this.score);}}
  }
  /** What the fingers and keys are doing, for the games that want more than a slide:
   * taps where they landed, a finger held down, and which half of the screen it is on. */
  input(){
    const held=[...this.pointers.values()],k=this.keys;
    return {target:this.target,dir:(k.has('ArrowRight')?1:0)-(k.has('ArrowLeft')?1:0),taps:[],fingers:held,
      held:held.length>0||k.has(' ')||k.has('ArrowUp'),
      left:held.some(p=>p.x<W/2)||k.has('ArrowLeft')||k.has('ArrowDown'),
      right:held.some(p=>p.x>=W/2)||k.has('ArrowRight')||k.has('ArrowUp')};
  }
  screenY(y){return this.game==='jump'?H-(y-this.logic.cam):y;}
  burst(x,y,n,{colors=['#fbf8ee'],speed=90,up=40,g=260,size=3,life=.5}={}){
    if(this.reduced)n=Math.ceil(n/3);
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.4+Math.random()*.6);this.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-up,g,size:size*(.6+Math.random()*.7),life:life*(.6+Math.random()*.6),max:life,color:colors[i%colors.length]});}
  }
  say(text,x,y,{color='#fffdf3',size=18,life=1.1}={}){this.texts.push({text,x:clamp(x,60,W-60),y,color,size,life,max:life});}
  event(e){
    if(e.type==='zone'){this.sound('zone');this.banner={text:e.name,at:this.time};return;}
    if(this.view){this.view.event(this,e);return;}
    const y=this.screenY(e.y),s=this.sound;
    switch(e.type){
      case 'bounce':s('boing',1+Math.random()*.08);this.burst(e.x,y,5,{colors:['#fbf8ee','#e6e8dc'],speed:70,up:10,g:120,life:.35});break;
      case 'spring':s('spring');this.shake=4;this.burst(e.x,y,12,{colors:['#e4c87a','#fbf8ee','#ca9187'],speed:160,up:90});this.say('Boing!',e.x,y-50,{color:'#e4c87a'});break;
      case 'poof':s('poof');this.burst(e.x,y,10,{colors:['#f6e1d6','#fbf8ee'],speed:80,up:0,g:-40,size:5,life:.6});break;
      case 'crack':s('crack');this.burst(e.x,y,9,{colors:['#8f989d','#6b7478','#84b8c1'],speed:60,up:-20,g:500,size:4,life:.8});break;
      case 'balloon':s('whoosh');this.say('Wheee',e.x,y-40,{color:'#f3c0b0'});break;
      case 'pop':for(let i=0;i<3;i++)setTimeout(()=>{if(!this.stopped)s('pop');},i*90);this.burst(e.x,y,12,{colors:['#ca9187','#e4c87a','#83b8bd'],speed:150,up:20});break;
      case 'stomp':s('boing',.8);s('bonk');this.burst(e.x,y,8,{colors:['#9aa1a6','#e7ebe4'],speed:110,up:30,size:4,life:.7});this.say('Sorry, pigeon',e.x,y-30,{size:14});break;
      case 'shoo':this.burst(e.x,y,8,{colors:['#9aa1a6','#e7ebe4'],speed:130,size:4});break;
      case 'hit':s('bonk');this.shake=6;this.flash=.4;this.burst(e.x,y,10,{colors:['#9aa1a6','#e7ebe4'],speed:140,up:20,size:4,life:.8});this.say('Bonk',e.x,y-26,{size:15});break;
      case 'zone':s('zone');this.banner={text:e.name,at:this.time};break;
      case 'over':s('fall');if(this.game==='drop')this.mood='belly';break;
      case 'chomp':{
        const streak=e.streak||0;s('chomp',1+Math.min(.7,streak*.025));
        this.burst(e.x,y-6,e.star?12:5,{colors:e.star?['#e4c87a','#fbe4a4']:['#e8c58c','#f1dfb6','#cf7759'],speed:90,up:40,size:3});
        this.say(e.star?'+3':'+1',e.x,y-40,{color:e.star?'#e4c87a':'#fffdf3',size:e.star?22:16,life:.7});
        this.mood='happy';this.moodUntil=this.time+.25;break;
      }
      case 'streak':s('best');this.say(`${e.streak} in a row!`,W/2,H*.42,{color:'#e4c87a',size:24,life:1.3});this.burst(W/2,H*.45,16,{colors:['#e4c87a','#ca9187','#9eb67b','#83b8bd'],speed:170,up:60,size:4,life:.9});break;
      case 'yuck':s('yuck');this.shake=5;this.say(e.kind==='frog'?'Not the frog':'That is a cone',e.x,y-44,{color:'#e6b3a8',size:15});this.mood='annoyed';this.moodUntil=this.time+.7;break;
      case 'miss':s('splat');this.burst(e.x,y,8,{colors:['#e8c58c','#cf7759','#f1dfb6'],speed:80,up:60,size:4,life:.6});this.say(e.free?'Catch it with Sernik':'Dropped one',e.x,y-50,{color:'#f1dfb6',size:14});break;
      case 'heart':s('gift');this.say('+♥',e.x,y-40,{color:'#e6a0a0',size:22});break;
      case 'land':if(e.bad)this.burst(e.x,y,4,{colors:['#8dac79'],speed:50,up:40,size:3});break;
    }
  }
  /** Crossing your best, or theirs, is the moment: once each per run. */
  overtake(){
    const score=this.score;
    if(!this.passedBest&&score>this.best){this.passedBest=true;this.sound('best');this.say('New best!',W/2,H*.3,{color:'#e4c87a',size:26,life:1.6});this.burst(W/2,H*.32,22,{colors:['#e4c87a','#ca9187','#9eb67b','#83b8bd','#fbf8ee'],speed:200,up:80,size:4,life:1});}
    if(!this.passedRival&&score>this.rival.best){this.passedRival=true;this.sound(this.rival.id);setTimeout(()=>{if(!this.stopped)this.sound('best',1.2);},120);this.say(`Past ${this.rival.name}!`,W/2,H*.36,{color:'#fbe4a4',size:24,life:1.6});this.burst(W/2,H*.38,18,{colors:['#fbe4a4','#fbf8ee','#ca9187'],speed:190,up:70,size:4,life:1});}
  }

  // ---------------------------------------------------------------- drawing
  draw(){
    const c=this.c,r=this.canvas.getBoundingClientRect(),res=Math.min(3,window.devicePixelRatio||1)*(r.width||W)/W;
    if(this.canvas.width!==Math.round(W*res)){this.canvas.width=Math.round(W*res);this.canvas.height=Math.round(H*res);}
    c.setTransform(res,0,0,res,0,0);c.imageSmoothingEnabled=false;
    c.save();
    if(this.shake&&!this.reduced)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);
    if(this.view)this.view.draw(this,c);else if(this.game==='jump')this.drawJump(c);else this.drawDrop(c);
    for(const p of this.particles){c.globalAlpha=clamp(p.life/p.max,0,1);rect(c,p.x-p.size/2,p.y-p.size/2,p.size,p.size,p.color);}
    c.globalAlpha=1;c.restore();
    if(this.flash){c.fillStyle=`rgba(255,250,240,${this.flash*.5})`;c.fillRect(0,0,W,H);}
    for(const t of this.texts){c.globalAlpha=clamp(t.life/t.max*1.6,0,1);this.text(c,t.text,t.x,t.y,t.size,t.color,'center');}
    c.globalAlpha=1;
    this.hud(c);
    if(this.paused){c.fillStyle='rgba(41,54,38,.45)';c.fillRect(0,0,W,H);}
  }
  text(c,text,x,y,size,color,align='left'){
    c.font=`800 ${size}px ${SANS}`;c.textAlign=align;c.textBaseline='alphabetic';
    // A dark outline reads on the pale kitchen and in space alike.
    c.lineJoin='round';c.lineWidth=Math.max(3,size/5);c.strokeStyle='rgba(38,44,34,.78)';c.strokeText(text,x,y);c.fillStyle=color;c.fillText(text,x,y);
  }
  pill(c,x,y,w,h){c.fillStyle='rgba(38,48,36,.32)';c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,12);else c.rect(x,y,w,h);c.fill();}
  hud(c){
    const s=this.score,info=this.info,logic=this.logic;
    const lines=[];
    if(this.best>0)lines.push(s>this.best?'NEW BEST':`BEST ${scoreText(this.game,this.best)}`);
    if(this.rival?.best)lines.push(s>this.rival.best?`PAST ${this.rival.name.toUpperCase()}`:`${this.rival.name.toUpperCase()} ${scoreText(this.game,this.rival.best)}`);
    c.font=`800 30px ${SANS}`;const wide=Math.max(c.measureText(scoreText(this.game,s)).width,...lines.map(l=>{c.font=`800 12px ${SANS}`;return c.measureText(l).width;}));
    this.pill(c,8,10,wide+20,42+lines.length*17);
    this.text(c,scoreText(this.game,s),16,40,30,'#fffdf3');
    lines.forEach((line,i)=>this.text(c,line,17,62+i*17,12,'#f4efd8'));
    if(this.game==='drop'){
      for(let i=0;i<DROP.lives;i++)this.heart(c,W-30-i*28,22,i<logic.lives?'#d8847a':'rgba(60,60,55,.35)');
      if(logic.streak>=5)this.text(c,`${logic.streak} in a row`,W-16,62,13,'#f4efd8','right');
    }
    this.view?.hud?.(this,c);
    if(this.banner){const age=this.time-this.banner.at;if(age<2){c.globalAlpha=clamp(Math.min(age*4,(2-age)*2),0,1);c.font=`800 26px ${SANS}`;const w=c.measureText(this.banner.text).width+36;this.pill(c,W/2-w/2,H*.2-32,w,44);this.text(c,this.banner.text,W/2,H*.2,26,'#fffdf3','center');c.globalAlpha=1;}else this.banner=null;}
    if(!this.touched&&this.time<6&&!logic.over){c.globalAlpha=clamp((6-this.time)/1.5,0,1);c.font=`800 15px ${SANS}`;const w=c.measureText(info.hint).width+28;this.pill(c,W/2-w/2,H*.62-24,w,36);this.text(c,info.hint,W/2,H*.62,15,'#fffdf3','center');c.globalAlpha=1;}
  }
  heart(c,x,y,color){rect(c,x-8,y-4,6,6,color);rect(c,x+2,y-4,6,6,color);rect(c,x-9,y-2,18,5,color);rect(c,x-7,y+3,14,3,color);rect(c,x-4,y+6,8,3,color);rect(c,x-1,y+9,2,2,color);}

  // Sky Jump ---------------------------------------------------------
  drawJump(c){
    const g=this.logic,cam=g.cam,m=g.monki,metres=cam/JUMP.metre,t=this.time,sy=y=>H-(y-cam),vt=this.clock();
    const top=along(SKY_TOP,(cam+H)/JUMP.metre),low=along(SKY_LOW,metres),grad=c.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,top);grad.addColorStop(1,low);c.fillStyle=grad;c.fillRect(0,0,W,H);
    const night=clamp((metres-470)/160,0,1);
    if(night>0){for(let i=0;i<70;i++){const x=noise(i)*W,y=(noise(i+99)*900+cam*.08)%900-150;if(y<-4||y>H)continue;c.globalAlpha=night*(.5+.5*Math.sin(t*2+i));rect(c,x,y,noise(i+7)>.8?2:1,noise(i+7)>.8?2:1,'#f4efd0');}c.globalAlpha=1;}
    // Far clouds drift past slower than the near ones.
    // Far clouds are big, soft and faint, so they never look like something to land on.
    const far=cam*.35;c.globalAlpha=(1-night)*.22;
    for(let k=Math.floor(far/230)-1;k<Math.floor(far/230)+4;k++){const y=H-(k*230-far),x=noise(k)*460-30,w=90+noise(k+3)*80;ellipse(c,x,y,w/2,16,'#ffffff');ellipse(c,x-w*.15,y-12,w*.28,16,'#ffffff');ellipse(c,x+w*.18,y-8,w*.22,13,'#ffffff');}
    c.globalAlpha=1;
    const birdsBack=clamp(1-Math.abs(metres-360)/140,0,1);
    if(birdsBack>0){c.strokeStyle=`rgba(80,90,90,${birdsBack*.5})`;c.lineWidth=1.5;for(let i=0;i<6;i++){const x=(noise(i)*W+t*(12+i*3))%W,y=(noise(i+40)*H+cam*.2)%H,f=Math.sin(t*6+i)*2;c.beginPath();c.moveTo(x-5,y-f);c.lineTo(x,y);c.lineTo(x+5,y-f);c.stroke();}}
    this.planets(c,cam);
    this.home(c,sy);
    const lines=[];
    if(this.best>0)lines.push({at:this.best,label:`BEST ${this.best} m`,color:'#e4c87a'});
    if(this.rival?.best)lines.push({at:this.rival.best,label:`${this.rival.name} ${this.rival.best} m`,color:'#f3c0b0',who:this.rival.id});
    for(const line of lines){
      const y=sy(line.at*JUMP.metre);if(y<-20||y>H+20)continue;
      c.fillStyle=line.color;for(let x=0;x<W;x+=14)c.fillRect(x,y,8,2);
      c.font=`800 12px ${SANS}`;const right=line.who?W-44:W-10,w=c.measureText(line.label).width+16;
      this.pill(c,right-w+8,y-22,w,20);
      if(line.who)character(c,line.who,W-24,y-3,{scale:.55,shadow:false,mood:'happy'});
      this.text(c,line.label,right,y-8,12,line.color,'right');
    }
    for(const p of g.course.platforms){
      if(p.gone||p.type==='ground')continue;const y=sy(p.y);if(y<-40||y>H+20)continue;
      const x=platformX(p,vt);this.pad(c,x,y,p.w,p.type,t);
      if(p.spring!=null)item(c,'couch',x+p.spring,y+1,{scale:.42});
      if(p.balloon!=null)this.balloons(c,x+p.balloon,y-2,t,.8);
    }
    for(const b of g.course.birds){if(b.gone)continue;const y=sy(b.y);if(y<-30||y>H+30)continue;this.pigeon(c,birdX(b,vt),y,Math.cos(b.omega*vt+b.phase)>0?1:-1,t);}
    const y=sy(m.y);
    if(g.state==='boost')this.balloons(c,m.x,y-44,t,1.1);
    c.save();c.translate(m.x,y);
    // Knocked by a pigeon he tumbles about his middle, not about his feet.
    if(g.state==='bonk'&&!this.reduced){c.translate(0,-21);c.rotate(t*9);c.translate(0,21);}
    const sq=m.squash*(this.reduced?.4:1);c.scale(1+sq*.22,1-sq*.26);
    character(c,'monki',0,0,{scale:1.25,flip:m.face<0,mood:g.state==='bonk'?'annoyed':m.vy>0?'happy':'idle',frame:t*5,hat:this.hat,shadow:false});
    c.restore();
  }
  pad(c,x,y,w,type,t){
    const [fill,shade]=PADS[type]||PADS.cloud,l=x-w/2;
    rect(c,l+5,y+13,w-10,3,'rgba(50,62,54,.14)');rect(c,l+2,y+1,w-4,11,'rgba(60,72,62,.35)');
    rect(c,l+3,y,w-6,10,fill);rect(c,l,y+2,w,6,fill);rect(c,l+5,y-3,w*.34,4,fill);rect(c,x+1,y-4,w*.3,5,fill);rect(c,l+3,y+8,w-6,3,shade);
    if(type==='moving'){rect(c,l+4,y+4,3,2,shade);rect(c,l+w-7,y+4,3,2,shade);}
    if(type==='fragile'){rect(c,x-6,y+2,1,5,shade);rect(c,x-5,y+6,4,1,shade);rect(c,x+7,y+1,1,4,shade);}
    if(type==='fake')for(let i=0;i<3;i++){const dx=l+8+i*(w-16)/2,dy=(t*40+i*9)%14;rect(c,dx,y+12+dy,1,3,'#84b8c1');}
  }
  balloons(c,x,y,t,scale){
    for(const [dx,dy,phase]of[[-8,-6,0],[6,-10,1.7],[0,-18,3.1]]){
      const bx=x+dx*scale+Math.sin(t*2+phase)*1.5,by=y+dy*scale;c.strokeStyle='#a49b70';c.lineWidth=1;c.beginPath();c.moveTo(x,y+14*scale);c.lineTo(bx,by);c.stroke();item(c,'balloon',bx,by,{scale:.7*scale});
    }
  }
  pigeon(c,x,y,face,t){
    const flap=Math.floor(t*8)%2;c.save();c.translate(x,y);c.scale(face,1);
    ellipse(c,0,0,12,7,'#9aa1a6');ellipse(c,-2,2,9,4,'#b9bfc2');rect(c,8,-6,6,6,'#8a9196');rect(c,11,-5,2,2,'#303932');rect(c,14,-3,3,2,'#d9a066');
    rect(c,-12,-2,5,3,'#7d8489');poly(c,flap?[[-4,-3],[4,-3],[0,-13]]:[[-4,-1],[4,-1],[1,7]],'#7d8489');c.restore();
  }
  /** The garden and the side of the house, where every run starts. */
  home(c,sy){
    const ground=sy(0);if(ground>H+60&&sy(1600)>H+60)return;
    const roof=sy(1200),top=sy(1480);
    if(top<H+40){rect(c,300,roof,100,Math.max(0,ground-roof),'#d8c29a');for(let a=160;a<1200;a+=240){const wy=sy(a+90);if(wy<H+60&&wy>-60){rect(c,322,wy,40,50,'#8c7a5c');rect(c,325,wy+3,34,44,'#c9dfe3');rect(c,341,wy+3,2,44,'#8c7a5c');}}
      poly(c,[[284,roof+4],[400,roof+4],[400,top],[346,top]],'#a4663f');for(let k=0;k<6;k++){const ry=roof-k*(roof-top)/6;rect(c,290+k*9,ry-2,110-k*9,2,'#8c5536');}rect(c,366,top-70,18,70,'#8c6a52');rect(c,363,top-74,24,6,'#6f5140');}
    if(ground<H+10){
      rect(c,0,ground,W,H-ground+10,'#9eb67b');rect(c,0,ground,W,3,'#82995e');
      for(let x=8;x<290;x+=26){rect(c,x,ground-24,5,24,'#d9c9a3');rect(c,x+1,ground-27,3,3,'#d9c9a3');}rect(c,0,ground-18,290,3,'#cdbb92');rect(c,0,ground-9,290,3,'#cdbb92');
      for(let i=0;i<9;i++){const x=20+noise(i)*260;rect(c,x,ground+10+noise(i+5)*30,3,3,noise(i+2)>.5?'#f3e3a0':'#e8b4a8');}
    }
  }
  planets(c,cam){
    const ringed=H-(17000-cam)*.5;
    if(ringed>-80&&ringed<H+80){ellipse(c,90,ringed,28,28,'#c79a7a');rect(c,52,ringed-2,76,4,'#e4c8a0');ellipse(c,82,ringed-9,8,5,'#d8b08e');}
    const moon=H-(20300-cam)*.6;
    if(moon>-120&&moon<H+120){ellipse(c,230,moon,74,74,'#f1ead0');ellipse(c,205,moon-20,12,10,'#ddd4b4');ellipse(c,260,moon+14,17,13,'#ddd4b4');ellipse(c,240,moon-34,7,6,'#ddd4b4');}
  }

  // Food Drop ---------------------------------------------------------
  drawDrop(c){
    const g=this.logic,t=this.time,look=KITCHEN[g.zone]||KITCHEN[0],vt=this.clock(),after=this.overAt===null?0:this.time-this.overAt;
    rect(c,0,0,W,H,look.wall);
    for(let y=36;y<DROP.floor-40;y+=36)for(let x=(y/36%2)*18;x<W;x+=36)rect(c,x,y,17,17,look.tile);
    if(g.zone>=3)for(let i=0;i<40;i++){c.globalAlpha=.5+.5*Math.sin(t*2+i);rect(c,noise(i)*W,noise(i+9)*420,1+(noise(i+3)>.8),1+(noise(i+3)>.8),'#f4efd0');}
    c.globalAlpha=1;
    if(g.zone===3)ellipse(c,320,90,26,26,'#f1ead0');
    rect(c,0,DROP.floor-6,W,H-DROP.floor+6,look.floor);rect(c,0,DROP.floor-6,W,3,look.line);
    for(let x=20;x<W;x+=64)rect(c,x,DROP.floor+8,40,2,look.line);
    for(const it of g.items){
      if(it.state==='eaten')continue;
      // After the last heart the rest of the food still lands, rather than hanging in the air.
      const falling=it.state==='fall',y=falling?Math.min(DROP.floor+2,it.y+it.speed*after):DROP.floor+2,x=falling&&after?dropX(it,vt):it.x;
      if(!falling)c.globalAlpha=clamp(1.2-(vt-it.at),0,1);
      else if(y>=DROP.floor+2)c.globalAlpha=clamp(1-(it.y+it.speed*after-DROP.floor)/(it.speed*1.2),0,1);
      c.save();c.translate(x,y);if(falling&&!it.bad)c.rotate(Math.sin(vt*3+it.id)*.25);
      if(it.special==='heart')this.heart(c,0,-10,'#d8847a');
      else item(c,it.kind,0,0,{scale:it.special==='star'?1.75:1.55});
      if(it.special==='star'&&falling){rect(c,-14+Math.sin(vt*9)*3,-28,2,2,'#fbe4a4');rect(c,12,-10+Math.cos(vt*7)*3,2,2,'#fbe4a4');}
      c.restore();c.globalAlpha=1;
    }
    // Sernik eats with his head, so that is where the finger puts him.
    const face=g.face,scale=1.7,belly=1+Math.min(.3,g.eaten*.004),mood=this.mood==='belly'?'happy':this.time<this.moodUntil?this.mood:'idle';
    const bodyX=g.x-face*10*scale;
    c.save();c.translate(bodyX,DROP.floor-2);c.scale(belly,1);
    // Flat on his back once the hearts are gone, even if he was mid-run at the time.
    const running=!g.over&&Math.abs(g.vx)>40;
    character(c,'sernik',0,0,{scale,flip:face<0,mood,frame:running?t*9:t*2,running,pet:this.mood==='belly'?1:0,hat:this.hat});
    c.restore();
  }
}

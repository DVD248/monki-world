// The arcade in the corner of the house: endless games, open whenever, for as long
// as you like. Each one gets harder as you go, but only up to a ceiling that a steady
// player can hold for ever, so a run ends on a slip and never on a wall. The course and
// the food are generated so that the next thing you need is always within reach;
// tests/arcade.test.mjs checks that promise, and a plain bot climbs on it. Sky Jump and Food
// Drop live here; the others have a file each (arcade-drive.js and so on) on these helpers.
// Pure and deterministic: no DOM, and the same seed gives the same run on any phone.

export const ARCADE_GAMES={
  jump:{id:'jump',title:'Sky Jump',star:'monki',one:'metre',many:'metres',short:'m',news:25,hint:'Slide your finger. Monki follows.',did:'got Monki {n} up in Sky Jump'},
  drop:{id:'drop',title:'Food Drop',star:'sernik',one:'snack',many:'snacks',short:'',news:15,hint:'Slide Sernik under the food. Not the frogs.',did:'fed Sernik {n} in Food Drop'},
  drive:{id:'drive',title:'Hill Drive',star:'galgan',one:'metre',many:'metres',short:'m',news:250,hint:'Hold the right side to drive, the left to brake.',did:'drove Galgan {n} in Hill Drive'},
  jet:{id:'jet',title:'Jet Monki',star:'monki',one:'chimney',many:'chimneys',short:'',news:10,hint:'Tap to fly. Mind the chimneys and the clouds.',did:'flew Monki past {n} in Jet Monki'},
  cliff:{id:'cliff',title:'Cliff Jump',star:'sernik',one:'point',many:'points',short:'',news:20,hint:'Hold to crouch. Let go to jump.',did:'got Sernik {n} in Cliff Jump'},
  hop:{id:'hop',title:'Water Hop',star:'galgan',one:'hop',many:'hops',short:'',news:25,hint:'Tap the lily pad to hop onto it.',did:'got Galgan {n} up the river in Water Hop'},
  fall:{id:'fall',title:'Fall Down',star:'monki',one:'floor',many:'floors',short:'',news:20,hint:'Slide your finger. Find the gaps.',did:'took Monki down {n} in Fall Down'},
  match:{id:'match',title:'Match Tap',star:'sernik',one:'snack',many:'snacks',short:'',news:150,hint:'Tap three or more the same.',did:'matched {n} in Match Tap'},
};
export const ARCADE_MAX=99999;
export const amount=(game,n)=>`${n} ${n===1?ARCADE_GAMES[game].one:ARCADE_GAMES[game].many}`;
export const scoreText=(game,n)=>ARCADE_GAMES[game]?.short?`${n} ${ARCADE_GAMES[game].short}`:String(n);
/** The line on the other one's card: "got Monki 120 metres up in Sky Jump". */
export const bragLine=(game,n)=>ARCADE_GAMES[game].did.replace('{n}',amount(game,n));

export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
/** 0 at the start, rising quickly and then ever more slowly towards 1. Never past it. */
export const ease=(x,scale)=>1-Math.exp(-Math.max(0,x)/scale);
export function seeded(seed){
  let a=2166136261;for(const ch of String(seed))a=Math.imul(a^ch.charCodeAt(0),16777619);
  return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
}
/** The last zone whose threshold has been passed: [threshold, name, index]. */
export function zoneAt(zones,value){let at=0;zones.forEach(([from],i)=>{if(value>=from)at=i;});return [...zones[at],at];}

// ---------------------------------------------------------------- Sky Jump
// Altitude runs upwards in canvas pixels; twenty of them make a metre on the scoreboard.
export const JUMP={width:400,height:600,gravity:1500,bounce:720,spring:1.6,speed:470,metre:20,feet:8,balloonLift:820,balloonTime:1.6,body:34};
export const JUMP_ZONES=[[0,'The garden'],[60,'The roof'],[150,'The clouds'],[300,'Birds'],[450,'Evening'],[600,'Night'],[800,'Space'],[1000,'The moon']];
export const jumpApex=(v=JUMP.bounce)=>v*v/(2*JUMP.gravity);
export const jumpDifficulty=metres=>ease(metres,320);
/** How far sideways Monki can travel between a bounce and landing `rise` px higher on the way down. */
export function jumpReach(rise){const {gravity:g,bounce:v,speed}=JUMP,d=v*v-2*g*rise;return d<0?0:speed*(v+Math.sqrt(d))/g;}
export const platformX=(p,t)=>p.amp?p.x+p.amp*Math.sin(p.omega*t+p.phase):p.x;
export const birdX=(b,t)=>b.x+b.amp*Math.sin(b.omega*t+b.phase);

/** The clouds. A spine of safe ones, each reachable from the one before, with decoys and
 * spare clouds around it. Gaps, speed and trickery grow with height and level off at
 * 86% of a jump, so the very top is hard, never impossible. */
export class JumpCourse{
  constructor(seed,{birds=true}={}){
    this.rng=seeded(seed);this.birdsOn=birds;this.serial=0;
    const ground={id:this.serial++,x:200,y:0,w:JUMP.width,type:'ground',amp:0,safe:true};
    this.platforms=[ground];this.birds=[];this.last=ground;this.top=0;this.lastBalloon=0;this.lastBird=0;
  }
  extend(altitude){while(this.top<altitude)this.step();}
  prune(below){this.platforms=this.platforms.filter(p=>p.y>=below||p===this.last);this.birds=this.birds.filter(b=>b.y>=below);}
  step(){
    const r=this.rng,prev=this.last,d=jumpDifficulty(prev.y/JUMP.metre);
    const rise=Math.min(jumpApex()*.86,lerp(40,96,d)+r()*lerp(30,44,d));
    const w=Math.round(lerp(84,50,d)*(.9+r()*.2)),roll=r();
    let type='cloud';
    if(d>.08&&roll<lerp(.05,.42,d))type='moving';
    else if(d>.15&&roll<lerp(.05,.42,d)+lerp(0,.22,d))type='fragile';
    let amp=type==='moving'?lerp(30,105,d)*(.6+r()*.4):0;
    const speed=lerp(55,150,d)*(.7+r()*.3),at=r();
    const place=()=>{
      // In from the walls far enough that the whole swing stays on screen, and never further
      // sideways from the last safe cloud than Monki can get, with room to spare.
      const margin=w/2+6+amp,reach=Math.max(0,jumpReach(rise)*.72-amp-(prev.amp||0));
      const lo=Math.max(margin,prev.x-reach),hi=Math.min(JUMP.width-margin,prev.x+reach);
      return lo<=hi?lerp(lo,hi,at):null;
    };
    let x=place();
    if(x===null){type='cloud';amp=0;x=place();}
    const metres=(prev.y+rise)/JUMP.metre;
    let spring=null,balloon=null;
    if(type!=='fragile'&&metres>30&&r()<.06)spring=(r()-.5)*Math.max(0,w-26);
    else if(type!=='fragile'&&metres>100&&metres-this.lastBalloon>150&&r()<.035){balloon=(r()-.5)*Math.max(0,w-20);this.lastBalloon=metres;}
    const p={id:this.serial++,x,y:prev.y+rise,w,type,amp,omega:amp?speed/amp:0,phase:r()*Math.PI*2,spring,balloon,safe:true};
    // A bird crosses the gap now and then. Never after a cloud that vanishes, so there is
    // always somewhere to bounce while it goes past, and high enough above that cloud that
    // bouncing on it does not reach the bird: only jumping up into it does.
    let bird=null;
    if(this.birdsOn&&metres>150&&metres-this.lastBird>25&&rise>=90&&prev.type!=='fragile'&&r()<lerp(0,.12,d)){
      this.lastBird=metres;const span=120+r()*40;
      bird={id:this.serial++,x:200,y:prev.y+Math.max(JUMP.body+24,rise*.55),amp:span,omega:lerp(60,130,d)*(.8+r()*.4)/span,phase:r()*Math.PI*2,gone:false};
      this.birds.push(bird);
    }
    // Spare clouds early on, decoys later: a rain cloud looks like a step and is not one.
    // None in a bird's flight line, where standing on it would put Monki's head in the way.
    const extras=[];
    if(r()<lerp(.85,.12,d))extras.push('cloud');
    if(d>.12&&r()<lerp(.1,.55,d))extras.push('fake');
    if(rise>=50)for(const kind of extras){
      const ew=Math.round(lerp(76,52,d)),ex=lerp(ew/2+6,JUMP.width-ew/2-6,r()),ey=prev.y+18+r()*(rise-36);
      if(bird&&ey>bird.y-JUMP.body-15&&ey<bird.y+17)continue;
      this.platforms.push({id:this.serial++,x:ex,y:ey,w:ew,type:kind,amp:0,omega:0,phase:0,spring:null,balloon:null,safe:false});
    }
    this.platforms.push(p);this.last=p;this.top=p.y;
  }
}

export class SkyJump{
  constructor(seed,options={}){
    this.course=new JumpCourse(seed,options);
    this.monki={x:200,y:0,vx:0,vy:JUMP.bounce,face:1,squash:0};
    this.time=0;this.cam=0;this.high=0;this.state='play';this.boost=0;this.events=[];this.zone=0;
    this.course.extend(JUMP.height*2.5);
    if(options.start>0)this.startAt(options.start*JUMP.metre);
  }
  /** The test lab's way up: bouncing on the first still cloud at that height, on the same
   * course a run from the ground would have climbed, so hands off he keeps bouncing until
   * someone steers. The stage's name shows on the first step. */
  startAt(y){
    const still=()=>this.course.platforms.find(p=>p.safe&&p.type==='cloud'&&p.spring==null&&p.balloon==null&&p.y>=y);
    this.course.extend(y);while(!still())this.course.step();
    const p=still(),m=this.monki;
    m.x=p.x;m.y=this.high=p.y;
    this.cam=Math.max(0,p.y-JUMP.height*.42);this.course.extend(this.cam+JUMP.height*2.5);this.course.prune(this.cam-220);
  }
  get metres(){return Math.floor(this.high/JUMP.metre);}
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** `target` is where the finger is (canvas x), `dir` -1/0/1 from the keyboard. */
  step(dt,target=null,dir=0){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;const m=this.monki;
    // Knocked by a pigeon he tumbles for a moment without steering, then has his hands back.
    if(this.state==='bonk'){m.vx*=Math.pow(.2,dt);this.bonk-=dt;if(this.bonk<=0)this.state='play';}
    else{
      const want=dir?dir*JUMP.speed:target==null?0:clamp((target-m.x)*9,-JUMP.speed,JUMP.speed);
      m.vx+=(want-m.vx)*Math.min(1,dt*16);if(Math.abs(m.vx)>25)m.face=Math.sign(m.vx);
    }
    m.x=clamp(m.x+m.vx*dt,12,JUMP.width-12);
    const was=m.y;
    if(this.state==='boost'){
      m.vy=JUMP.balloonLift;this.boost-=dt;
      if(this.boost<=0){this.state='play';m.vy=JUMP.bounce;this.emit('pop',m.x,m.y+56);}
    }else m.vy-=JUMP.gravity*dt;
    m.y+=m.vy*dt;m.squash=Math.max(0,m.squash-dt*5);
    if((this.state==='play'||this.state==='bonk')&&m.vy<0)this.land(was);
    this.touchBalloons();this.touchBirds();
    this.high=Math.max(this.high,m.y);
    this.cam=Math.max(this.cam,m.y-JUMP.height*.42);
    const zone=zoneAt(JUMP_ZONES,this.metres)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',m.x,m.y,{name:JUMP_ZONES[zone][1]});}
    this.course.extend(this.cam+JUMP.height*2.5);this.course.prune(this.cam-220);
    // Gone once the top of his head drops out of the bottom of the screen.
    if(m.y<this.cam-JUMP.body){this.state='over';this.emit('over',m.x,m.y);}
  }
  land(was){
    const m=this.monki,t=this.time;
    // The highest cloud crossed in this step. A rain cloud gives way and the search carries
    // on underneath it: a real cloud just below one still catches him in the same step.
    for(;;){
      let hit=null;
      for(const p of this.course.platforms){
        if(p.gone||was<p.y||m.y>p.y||hit&&p.y<hit.y)continue;
        if(Math.abs(m.x-platformX(p,t))<=p.w/2+JUMP.feet)hit=p;
      }
      if(!hit)return;
      const px=platformX(hit,t);
      if(hit.type==='fake'){hit.gone=true;this.emit('crack',px,hit.y);continue;}
      const spring=hit.spring!=null&&Math.abs(m.x-(px+hit.spring))<16;
      m.y=hit.y;m.vy=JUMP.bounce*(spring?JUMP.spring:1);m.squash=1;if(this.state==='bonk')this.state='play';
      if(hit.type==='fragile'){hit.gone=true;this.emit('poof',px,hit.y);}
      this.emit(spring?'spring':'bounce',m.x,hit.y,{platform:hit.id});
      return;
    }
  }
  touchBalloons(){
    if(this.state!=='play')return;const m=this.monki;
    for(const p of this.course.platforms){
      if(p.balloon==null||p.gone)continue;
      const bx=platformX(p,this.time)+p.balloon,by=p.y+30;
      if(Math.abs(m.x-bx)<20&&m.y<by+22&&m.y+JUMP.body>by-12){p.balloon=null;this.state='boost';this.boost=JUMP.balloonTime;this.emit('balloon',bx,by);return;}
    }
  }
  touchBirds(){
    const m=this.monki;if(this.state==='bonk')return;
    for(const b of this.course.birds){
      if(b.gone)continue;const bx=birdX(b,this.time);
      // A little smaller than the drawing, so a near miss is a miss: on the narrowest cloud
      // there is always a side the pigeon does not cover.
      if(Math.abs(m.x-bx)>18||m.y>b.y+8||m.y+JUMP.body<b.y-6)continue;
      if(this.state==='boost'){b.gone=true;this.emit('shoo',bx,b.y);}
      // One rule a player can see: coming down onto a pigeon is a bounce, as with any cloud,
      // even one that flies into his side on the way down. Jumping up into one knocks him back
      // down: a lost bounce, and the end only if nothing is underneath to catch him. As the
      // end it stopped careful runs well short of the top, which was meant never to happen.
      else if(m.vy<0){b.gone=true;m.vy=JUMP.bounce*1.1;m.squash=1;this.emit('stomp',bx,b.y);}
      else{b.gone=true;this.state='bonk';this.bonk=.3;m.vy=Math.min(m.vy,0);this.emit('hit',bx,b.y);return;}
    }
  }
}

// ---------------------------------------------------------------- Food Drop
export const DROP={width:400,height:600,spawnY:-24,mouthY:532,floor:566,speed:640,mouth:30,lives:3};
export const DROP_ZONES=[[0,'The kitchen'],[40,'The garden'],[90,'The roof'],[150,'Night'],[220,'Among the stars']];
export const DROP_GOOD=['icecream','fish','mushroom','pizza','donut'];
export const DROP_BAD=['frog','cone'];
export const dropDifficulty=score=>ease(score,70);
/** Where a falling thing is at time t. It sways, but always lands where it was planned to. */
export const dropX=(it,t)=>clamp(it.x0+it.amp*Math.sin(it.omega*(t-it.born)+it.phase),14,DROP.width-14);

export class FoodDrop{
  /** `start` is for the test lab: a run that begins as hard as that many snacks in. */
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.x=200;this.vx=0;this.face=1;this.items=[];this.score=start;this.lives=DROP.lives;
    this.streak=0;this.time=0;this.nextAt=.9;this.lastGood={x:200,land:0};this.lastLand=0;this.serial=0;
    this.events=[];this.state='play';this.zone=0;this.eaten=0;
  }
  get metres(){return this.score;}
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  step(dt,target=null,dir=0){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;const t=this.time;
    const want=dir?dir*DROP.speed:target==null?0:clamp((target-this.x)*12,-DROP.speed,DROP.speed);
    this.vx+=(want-this.vx)*Math.min(1,dt*20);this.x=clamp(this.x+this.vx*dt,24,DROP.width-24);if(Math.abs(this.vx)>30)this.face=Math.sign(this.vx);
    while(t>=this.nextAt)this.spawn();
    for(const it of this.items){
      if(it.state!=='fall')continue;
      const before=it.y;it.y=DROP.spawnY+(t-it.born)*it.speed;it.x=dropX(it,t);
      if(before<DROP.mouthY&&it.y>=DROP.mouthY&&Math.abs(it.x-this.x)<=DROP.mouth+8)this.eat(it);
      else if(it.y>=DROP.floor){it.state='floor';it.at=t;if(it.need)this.miss(it);else this.emit('land',it.x,DROP.floor,{kind:it.kind,bad:it.bad});}
      if(this.over)return;
    }
    this.items=this.items.filter(it=>it.state==='fall'||t-it.at<1.2);
    const zone=zoneAt(DROP_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',this.x,DROP.mouthY,{name:DROP_ZONES[zone][1]});}
  }
  spawn(){
    const r=this.rng,d=dropDifficulty(this.score),t=this.nextAt,s=this.score,fall=DROP.mouthY-DROP.spawnY;
    this.nextAt=t+lerp(.95,.44,d)*(.85+r()*.3);
    // Landings keep their order, so each one only has to be reachable from the one before.
    const land=Math.max(t+fall/(lerp(160,330,d)*(.9+r()*.2)),this.lastLand+lerp(.5,.26,d));
    const roll=r();let kind=DROP_GOOD[Math.floor(r()*DROP_GOOD.length)],bad=false,special=null;
    if(s>=8&&roll<lerp(.1,.33,d)){kind=DROP_BAD[Math.floor(r()*DROP_BAD.length)];bad=true;}
    else if(s>=12&&roll>.965){kind='star';special='star';}
    else if(this.lives<DROP.lives&&s>=20&&roll>.93&&!this.items.some(i=>i.kind==='heart'&&i.state==='fall')){kind='heart';special='heart';}
    const amp=s>25?lerp(0,55,d)*r():0;
    const lx=bad?this.clearOf(lerp(30,370,r()),land):this.goodSpot(land);
    this.add({kind,bad,special,born:t,land,lx,amp});
    // Later on, a frog sometimes falls alongside a snack: pick the right one.
    if(!bad&&d>.45&&r()<lerp(0,.3,d)){
      const side=lx>200?-1:1,fx=clamp(lx+side*(110+r()*90),30,370);
      const clear=this.items.every(o=>!o.need||o.state!=='fall'||Math.abs(o.land-land)>=.4||Math.abs(o.lx-fx)>=80);
      if(Math.abs(fx-lx)>=100&&clear)this.add({kind:DROP_BAD[Math.floor(r()*DROP_BAD.length)],bad:true,special:null,born:t,land,lx:fx,amp:0});
    }
  }
  /** Somewhere Sernik can get to from the last snack in time, and not right beside a frog. */
  goodSpot(land){
    const g=this.lastGood,reach=DROP.speed*.7*Math.max(0,land-g.land)+DROP.mouth*.8;
    const lo=Math.max(30,g.x-reach),hi=Math.min(370,g.x+reach);
    let best=null,room=-1;
    for(let i=0;i<10;i++){
      const x=lerp(lo,hi,this.rng()),gap=Math.min(999,...this.items.filter(o=>o.bad&&o.state==='fall'&&Math.abs(o.land-land)<.4).map(o=>Math.abs(o.lx-x)));
      if(gap>=80)return x;if(gap>room){room=gap;best=x;}
    }
    return best;
  }
  /** A frog is never in the way of a snack that lands just before or after it. */
  clearOf(x,land){
    const near=this.items.filter(o=>o.need&&o.state==='fall'&&Math.abs(o.land-land)<.4);
    for(const o of near)if(Math.abs(x-o.lx)<80){const left=o.lx-80,right=o.lx+80;x=left>=30&&(x<o.lx||right>370)?left:right;}
    return clamp(x,30,370);
  }
  add({kind,bad,special,born,land,lx,amp}){
    const r=this.rng,speed=(DROP.mouthY-DROP.spawnY)/(land-born),omega=amp?2+r()*1.4:0,phase=r()*Math.PI*2;
    const it={id:this.serial++,kind,bad,special,need:!bad&&!special,born,land,speed,amp,omega,phase,lx,x0:lx-amp*Math.sin(omega*(land-born)+phase),y:DROP.spawnY,state:'fall'};
    it.x=dropX(it,born);this.items.push(it);
    this.lastLand=Math.max(this.lastLand,land);if(!bad)this.lastGood={x:lx,land};
  }
  eat(it){
    it.state='eaten';it.at=this.time;
    if(it.bad){this.lives--;this.streak=0;this.emit('yuck',it.x,DROP.mouthY,{kind:it.kind});}
    else if(it.special==='heart'){this.lives=Math.min(DROP.lives,this.lives+1);this.emit('heart',it.x,DROP.mouthY);}
    else{this.score+=it.special==='star'?3:1;this.eaten++;this.streak++;this.emit('chomp',it.x,DROP.mouthY,{kind:it.kind,streak:this.streak,star:it.special==='star'});if(this.streak%10===0)this.emit('streak',this.x,DROP.mouthY,{streak:this.streak});}
    if(this.lives<=0){this.state='over';this.emit('over',this.x,DROP.mouthY);}
  }
  miss(it){
    // Until the first snack is eaten nothing is lost: a first go is for finding out what to do.
    if(!this.eaten){this.emit('miss',it.x,DROP.floor,{kind:it.kind,free:true});return;}
    this.lives--;this.streak=0;this.emit('miss',it.x,DROP.floor,{kind:it.kind});
    if(this.lives<=0){this.state='over';this.emit('over',this.x,DROP.mouthY);}
  }
}

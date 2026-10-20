import {ease,seeded,zoneAt,lerp} from './arcade.js';

// Candle Cake: the throwing game. A birthday cake spins on its stand; tap and Monki pushes a
// candle up into its edge, where it stays and spins with it. Touch a candle that is already
// in and the new one bounces off, and that is the end. Every cake needs so many candles; then
// they are blown out and the next cake comes, spinning its own way: steadily at first, later
// speeding up and slowing down, swinging back and forth, or stopping and starting. Every
// fifth is a big one. A strawberry on the edge is worth a point more. Each new cake is a
// little harder than the last, levelling off where a steady eye and finger keep up.
// `gap`: how close (in radians) two candles may be; about the width of the candle as drawn.
export const CANDLES={width:400,height:600,cx:200,cy:225,r:78,big:96,from:500,speed:2300,len:44,gap:.16,berry:.17,pause:1.15,inset:6,crowd:11};
export const CANDLES_ZONES=[[0,'The party'],[30,'Second helpings'],[70,'Big birthday'],[120,'Midnight cake'],[200,'Cake for everyone']];
/** Whose birthday each cake is, in turn. */
export const CAKE_FOR=['sernik','galgan','monki','julia','david','kot'];
export const candlesDifficulty=k=>ease(k,8);
const TAU=Math.PI*2;
/** The angle between two directions, 0 to π. */
export const apart=(a,b)=>{const d=((a-b)%TAU+TAU)%TAU;return Math.min(d,TAU-d);};
/** How many candles cake k wants, how many are in already, and whether it is a big one. The
 * two together never pass CANDLES.crowd, so even the last candle of the hardest cake has a
 * space a steady hand can find: the top of the curve is a test, not a wall. */
export function cakeFor(k){
  const d=candlesDifficulty(k),big=k%5===4,need=Math.round(lerp(5,8,d))+(big?1:0);
  return {big,need,speed:lerp(2.3,3.6,d),pre:Math.max(0,Math.min(CANDLES.crowd-need,k<2?0:Math.round(lerp(0,3,d))))};
}

export class CandleRun{
  /** `start` is for the test lab: a run that begins on the cake that many candles in. */
  /** `cast` is who lives in the house: the cakes are for them, and nobody who has not moved in yet. */
  constructor(seed,{start=0,cast=CAKE_FOR}={}){
    this.cakeFor=CAKE_FOR.filter(id=>cast.includes(id));if(!this.cakeFor.length)this.cakeFor=['monki'];
    this.rng=seeded(seed);this.score=start;this.time=0;this.events=[];this.zone=0;this.state='play';
    let k=0,sum=0;while(sum+cakeFor(k).need<=start){sum+=cakeFor(k).need;k++;}
    this.k=k-1;this.zone=zoneAt(CANDLES_ZONES,start)[2];this.newCake(true);
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  get radius(){return this.cake.big?CANDLES.big:CANDLES.r;}
  /** Where a thrown candle reaches the cake: the bottom of its edge. */
  get impactY(){return CANDLES.cy+this.radius-CANDLES.inset;}
  newCake(first=false){
    const r=this.rng,k=++this.k,c=cakeFor(k),d=candlesDifficulty(k);
    // How it spins. Steady to start with; the trickier ways come in one by one.
    const kinds=['steady'];if(k>=2)kinds.push('pulse');if(k>=4)kinds.push('swing');if(k>=6)kinds.push('stopgo');if(k>=8)kinds.push('flip');
    const kind=c.big&&k>=4?(r()<.5?'swing':'flip'):kinds[Math.floor(r()*kinds.length)];
    this.cake={k,big:c.big,need:c.need,left:c.need,kind,speed:c.speed*(.9+r()*.2),dir:r()<.5?-1:1,phase:r()*TAU,period:lerp(3.2,2.2,d)*(.85+r()*.3),
      for:this.cakeFor[k%this.cakeFor.length],look:k%4};
    this.items=[];this.serial=0;this.rot=r()*TAU;this.ct=0;this.flying=null;
    // Candles already in, spread out, and strawberries in the spaces between.
    for(let i=0;i<c.pre;i++){const a=this.freeAngle(.8);if(a!==null)this.items.push({id:this.serial++,a,kind:'pre'});}
    const berries=c.big?4:k>=1&&r()<.6?1+Math.floor(r()*2):0;
    for(let i=0;i<berries;i++){const a=this.freeAngle(.6);if(a!==null)this.items.push({id:this.serial++,a,kind:'berry'});}
    this.state='play';
    if(!first)this.emit('newcake',CANDLES.cx,CANDLES.cy,{k,big:c.big,for:this.cake.for});
  }
  /** A spot on the edge at least `room` from anything already there, or null. */
  freeAngle(room){
    for(let tries=0;tries<40;tries++){const a=this.rng()*TAU;if(this.items.every(it=>apart(it.a,a)>=room))return a;}
    return null;
  }
  /** How fast the cake is turning `t` seconds into it, in radians a second. */
  spin(t){
    const c=this.cake,w=c.speed*c.dir,p=TAU/c.period;
    switch(c.kind){
      case 'pulse':return w*(.75+.55*Math.sin(t*p+c.phase));
      // Back and forth, but further forth than back, so every part of the edge comes round.
      case 'swing':return w*(.4+1.1*Math.sin(t*p*.8+c.phase));
      // Turning, then nearly still, then turning again: it visibly slows first, so it can be seen coming.
      case 'stopgo':{const u=((t/c.period+c.phase/TAU)%1+1)%1,on=u<.62?1:.12,edge=Math.min(1,Math.min(Math.abs(u-.62),u,1-u)/.1);return w*1.2*(on===1?lerp(.12,1,Math.min(1,edge)):.12);}
      case 'flip':{const u=((t/c.period+c.phase/TAU)%1+1)%1,s=u<.64?1:-1,edge=Math.min(1,Math.min(Math.abs(u-.64),u,1-u)/.12);return w*1.05*s*edge;}
      default:return w;
    }
  }
  /** Where on the cake (its own angle) the bottom of the edge is now. */
  get bottom(){return ((Math.PI/2-this.rot)%TAU+TAU)%TAU;}
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    if(this.state==='between'){this.wait-=dt;this.rot+=this.spin(this.ct)*dt*.3;if(this.wait<=0)this.newCake();return;}
    this.ct+=dt;this.rot+=this.spin(this.ct)*dt;
    if((input.taps||[]).length&&!this.flying&&this.cake.left>0){this.flying={y:CANDLES.from-CANDLES.len/2};this.emit('throw',CANDLES.cx,CANDLES.from);}
    if(this.flying){
      this.flying.y-=CANDLES.speed*dt;
      if(this.flying.y<=this.impactY)this.impact();
    }
  }
  impact(){
    const a=this.bottom,y=this.impactY;this.flying=null;
    if(this.items.some(it=>it.kind!=='berry'&&apart(it.a,a)<CANDLES.gap)){
      this.state='over';this.emit('clink',CANDLES.cx,y,{a});return;
    }
    const berry=this.items.find(it=>it.kind==='berry'&&apart(it.a,a)<CANDLES.berry);
    if(berry){this.items=this.items.filter(it=>it!==berry);this.score++;this.emit('berry',CANDLES.cx,y,{a:berry.a});}
    this.items.push({id:this.serial++,a,kind:'candle'});this.score++;this.cake.left--;
    this.emit('stick',CANDLES.cx,y,{a,left:this.cake.left});
    const zone=zoneAt(CANDLES_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',CANDLES.cx,CANDLES.cy,{name:CANDLES_ZONES[zone][1]});}
    if(!this.cake.left){this.state='between';this.wait=CANDLES.pause;this.emit('cake',CANDLES.cx,CANDLES.cy,{k:this.k,for:this.cake.for,big:this.cake.big});}
  }
}

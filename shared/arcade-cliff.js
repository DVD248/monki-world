import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Cliff Jump: Pou's Cliff Jump, the hold-and-let-go kind. Sernik stands on a rock in the
// sea; the longer the finger stays down, the further he leaps. Land on the next rock to go
// on, dead centre for a Perfect: two points, three for each more in a row. The rocks narrow,
// spread and rise and fall as you go, levelling off; the far edge of the next one is always
// within a full leap from the near edge of this one, and the arc clears its near edge.
export const CLIFF={width:400,height:600,water:500,gravity:1500,angle:58*Math.PI/180,charge:1.05,near:24,far:330,perfect:5,feet:7};
export const CLIFF_ZONES=[[0,'The garden wall'],[15,'The rocks'],[40,'The sea cliffs'],[80,'Evening'],[130,'Night'],[200,'The lighthouse']];
export const cliffDifficulty=n=>ease(n,40);
/** How far across flat ground a leap goes, for a charge from 0 to 1: straight in the time. */
export const cliffFlat=charge=>lerp(CLIFF.near,CLIFF.far,clamp(charge,0,1));
/** The launch for a charge: the speed that carries that far on the flat. */
export function cliffLaunch(charge){
  const v=Math.sqrt(cliffFlat(charge)*CLIFF.gravity/Math.sin(2*CLIFF.angle));
  return {vx:v*Math.cos(CLIFF.angle),vy:v*Math.sin(CLIFF.angle)};
}
/** Where a leap comes down at `rise` above the take-off (negative: below), or null if the
 * arc never gets that high. */
export function cliffLanding(charge,rise){
  const {vx,vy}=cliffLaunch(charge),g=CLIFF.gravity,disc=vy*vy-2*g*rise;
  return disc<0?null:vx*(vy+Math.sqrt(disc))/g;
}
/** The charge that comes down `dx` along at `rise` above the take-off, or null if even a
 * full one does not. */
export function cliffCharge(dx,rise){
  if((cliffLanding(1,rise)??-1)<dx)return null;
  let lo=0,hi=1;for(let i=0;i<32;i++){const m=(lo+hi)/2,l=cliffLanding(m,rise);if(l===null||l<dx)lo=m;else hi=m;}
  return hi;
}
/** Height of the arc above the take-off, `dx` along. */
export function cliffHeight(charge,dx){const {vx,vy}=cliffLaunch(charge),t=dx/vx;return vy*t-CLIFF.gravity*t*t/2;}

export class CliffRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.count=start;this.time=0;this.events=[];this.zone=0;this.streak=0;
    this.rocks=[{id:0,x:-60,w:170,h:250}];this.serial=1;
    this.x=60;this.y=250;this.vx=0;this.vy=0;this.state='stand';this.on=this.rocks[0];this.charge=0;this.chargeAt=0;this.wasHeld=false;
    while(this.rocks.length<5)this.addRock();
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  addRock(){
    const r=this.rng,prev=this.rocks.at(-1),d=cliffDifficulty(this.count+this.rocks.length-1);
    const w=clamp(lerp(92,36,d)*(.8+r()*.4),30,110);
    let rise=clamp(prev.h+(r()*2-1)*lerp(0,80,d),170,380)-prev.h,gap=lerp(lerp(26,60,d),lerp(110,190,d),r());
    // Whether he stands at the back of this rock or on its lip, a leap to the middle of the
    // next must come down on it, and over its near edge rather than into it.
    for(let tries=0;tries<12&&!this.fair(prev,gap,w,rise);tries++){rise*=.7;gap=gap<60?gap+14:gap*.9;}
    if(!this.fair(prev,gap,w,rise)){rise=0;gap=Math.max(24,Math.min(gap,(cliffLanding(1,0)*.9)-prev.w-w));}
    this.rocks.push({id:this.serial++,x:prev.x+prev.w+gap,w,h:prev.h+rise});
  }
  fair(prev,gap,w,rise){
    const x=prev.x+prev.w+gap;
    for(const from of [prev.x+CLIFF.feet,prev.x+prev.w-CLIFF.feet]){
      const c=cliffCharge(x+w/2-from,rise);if(c===null)return false;
      if(cliffHeight(c,x-CLIFF.feet-from)<rise+8)return false;
    }
    return true;
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;const held=!!input.held;
    if(this.state==='stand'){
      if(held&&!this.wasHeld){this.state='charge';this.chargeAt=this.time;this.emit('crouch',this.x,this.y);}
    }else if(this.state==='charge'){
      this.charge=clamp((this.time-this.chargeAt)/CLIFF.charge,0,1);
      if(!held)this.leap();
    }else if(this.state==='air'||this.state==='fall')this.fly(dt);
    this.wasHeld=held;
    const zone=zoneAt(CLIFF_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',this.x,this.y,{name:CLIFF_ZONES[zone][1]});}
  }
  leap(){const {vx,vy}=cliffLaunch(this.charge);this.vx=vx;this.vy=vy;this.state='air';this.from=this.on;this.on=null;this.emit('leap',this.x,this.y,{charge:this.charge});}
  fly(dt){
    const px=this.x,py=this.y;this.x+=this.vx*dt;this.vy-=CLIFF.gravity*dt;this.y+=this.vy*dt;
    if(this.state==='air')for(const rock of this.rocks){
      if(rock===this.from&&this.vy>0)continue;
      const inside=this.x+CLIFF.feet>=rock.x&&this.x-CLIFF.feet<=rock.x+rock.w;
      if(!inside||this.y>rock.h)continue;
      // Coming down onto the top: a landing. Coming at it from the side: into the rock.
      if(py>=rock.h-.5)this.land(rock);
      else{this.state='fall';this.vx=-Math.abs(this.vx)*.25;this.x=px;this.emit('bump',this.x,this.y);}
      return;
    }
    if(this.y<=-30){this.state='over';this.emit('splash',this.x,0);}
  }
  land(rock){
    this.y=rock.h;this.vx=this.vy=0;this.state='stand';this.on=rock;this.charge=0;
    if(rock===this.from){this.emit('same',this.x,this.y);return;}
    this.count++;
    const centre=rock.x+rock.w/2,perfect=Math.abs(this.x-centre)<=CLIFF.perfect;
    this.streak=perfect?this.streak+1:0;const points=perfect?Math.min(3,1+this.streak):1;
    this.score+=points;
    this.emit('land',this.x,this.y,{perfect,streak:this.streak,points});
    while(this.rocks[0].x+this.rocks[0].w<this.x-500)this.rocks.shift();
    while(this.rocks.length<6)this.addRock();
  }
}

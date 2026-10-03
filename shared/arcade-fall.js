import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Fall Down: Pou's game of the same name. Floors rise from below, each with one hole; Monki
// drops through the holes and rides the floors up while he runs for the next one. Touch the
// roots at the top and he is out. He starts slow and gets quicker the deeper he goes, and the
// floors rise faster with him, so from the first floor it is a race to the next hole and never
// a stroll; the holes narrow as well, all levelling off. The next hole is never further along
// than he can run at his speed then in the time the floors give him, over the run.
export const FALL={width:400,height:600,top:46,floor:588,spacing:108,thick:14,scale:115,rise:[104,222],run:[145,365],hole:[96,58],gravity:1700,fall:760,halfW:11,body:34};
export const FALL_ZONES=[[0,'The cellar'],[25,'Under the house'],[60,'Roots'],[110,'Caves'],[170,'Crystals'],[250,'Deep down']];
export const fallDifficulty=n=>ease(n,FALL.scale);
/** How fast the floors rise, px a second. */
export const fallRise=d=>lerp(...FALL.rise,d);
/** How fast Monki runs: slow to begin with, quicker the deeper he gets. */
export const fallRun=d=>lerp(...FALL.run,d);
export const fallHole=d=>lerp(...FALL.hole,d);

export class FallRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.x=FALL.width/2;this.vx=0;this.face=1;this.y=FALL.top+250;this.vy=0;
    this.time=0;this.travel=0;this.floors=[];this.serial=0;this.state='play';this.events=[];this.zone=0;this.standing=null;this.lastHole=FALL.width/2;this.debt=0;
    this.depth=start;
    // He starts low, with the room above him that a run from the top would have given him.
    for(let y=FALL.top+330;y<FALL.height+FALL.spacing;y+=FALL.spacing)this.addFloor(y);
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** A floor at y with one hole, anywhere across. What keeps it fair is a running debt:
   * the time a quick player needs to run from hole to hole, less the time the floors give
   * him. A long run is fine while there is room above him; the debt is never let grow past
   * a part of the time it takes a floor to carry him from the bottom to the roots. */
  addFloor(y){
    const r=this.rng,n=this.depth++,d=fallDifficulty(n),rise=fallRise(d),hole=fallHole(d)*(.94+r()*.12);
    const interval=FALL.spacing/rise,slack=(FALL.height-FALL.top-FALL.body)/rise,limit=slack*.35;
    const lo=hole/2+8,hi=FALL.width-hole/2-8,run=fallRun(d)*.7;
    const cost=x=>Math.max(0,this.debt+Math.abs(x-this.lastHole)/run+.12-interval);
    let x=lerp(lo,hi,r());
    if(cost(x)>limit){const room=Math.max(0,(limit-this.debt-.12+interval)*run);x=clamp(this.lastHole+Math.sign(x-this.lastHole)*room,lo,hi);}
    this.debt=cost(x);
    this.floors.push({id:this.serial++,y,hole:x,w:hole,n,passed:false,kind:r()<.18?'crate':'plank'});
    this.lastHole=x;
  }
  /** Where the floor under x is solid: everywhere but its hole. */
  solidAt(f,x){return Math.abs(x-f.hole)>f.w/2-FALL.halfW;}
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    const target=input.target,dir=input.dir||0,d=fallDifficulty(this.score),rise=fallRise(d)*dt,speed=fallRun(d);
    for(const f of this.floors)f.y-=rise;
    this.travel+=rise;
    const want=dir?dir*speed:target==null?0:clamp((target-this.x)*10,-speed,speed);
    this.vx+=(want-this.vx)*Math.min(1,dt*18);this.x=clamp(this.x+this.vx*dt,FALL.halfW,FALL.width-FALL.halfW);if(Math.abs(this.vx)>25)this.face=Math.sign(this.vx);
    // Standing, he rides his floor up until it has a hole under him.
    if(this.standing&&!this.solidAt(this.standing,this.x))this.standing=null;
    if(this.standing){this.y=this.standing.y;this.vy=0;}
    else{
      const was=this.y;this.vy=Math.min(FALL.fall,this.vy+FALL.gravity*dt);this.y+=this.vy*dt;
      // The bottom of the screen holds him: no getting ahead where nobody can see him.
      if(this.y>FALL.floor){this.y=FALL.floor;this.vy=0;}
      for(const f of this.floors){
        if(was<=f.y+rise+.01&&this.y>=f.y&&this.solidAt(f,this.x)){this.emit('land',this.x,f.y,{hard:this.vy>300});this.y=f.y;this.vy=0;this.standing=f;break;}
      }
    }
    for(const f of this.floors)if(!f.passed&&this.y>f.y+FALL.thick){f.passed=true;this.score++;this.emit('pass',this.x,f.y,{score:this.score});}
    // The top of his head in the roots: out.
    if(this.y-FALL.body<=FALL.top){this.state='over';this.emit('over',this.x,FALL.top);return;}
    this.floors=this.floors.filter(f=>f.y>-40);
    while(this.floors.at(-1).y<FALL.height+FALL.spacing)this.addFloor(this.floors.at(-1).y+FALL.spacing);
    const zone=zoneAt(FALL_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',this.x,this.y,{name:FALL_ZONES[zone][1]});}
  }
}

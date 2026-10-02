import {ease,seeded,zoneAt,lerp} from './arcade.js';

// Pancake Stack: the tower game. A pancake slides back and forth above the plate; tap and it
// drops onto the one below. Whatever hangs over the edge is cut off and falls to the dogs,
// so the next pancake is only as wide as what was left. Drop one dead on the one below for a
// Perfect: nothing is lost, and from the second Perfect in a row each one grows the stack back
// a little, up to its first width. Later pancakes slide faster, levelling off where a steady
// hand keeps up, so a run ends on a slip and never on a wall. Sized for a person's timing, a
// few hundredths of a second off on every tap: within 7 px of dead on still counts.
export const STACK={width:400,height:600,layer:18,base:540,start:180,min:4,perfect:7,grow:8,growAfter:2,range:178};
export const STACK_ZONES=[[0,'Breakfast'],[15,'Second breakfast'],[35,'Brunch'],[60,'In the clouds'],[100,'Above the birds'],[150,'Pancakes in space']];
export const stackDifficulty=n=>ease(n,45);
/** How fast the pancake slides, in pixels a second. */
export const stackSpeed=d=>lerp(140,270,d);

export class StackRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.events=[];this.zone=0;this.streak=0;this.state='play';
    // The plate (as wide as a first pancake; drawn a little wider), then any pancakes a test-lab
    // run starts with, stacked straight.
    this.layers=[{n:0,x:STACK.width/2,w:STACK.start,plate:true}];
    for(let i=1;i<=start;i++)this.layers.push(this.pancake(i,STACK.width/2,STACK.start));
    this.zone=zoneAt(STACK_ZONES,start)[2];
    this.next();
  }
  get over(){return this.state==='over';}
  get top(){return this.layers.at(-1);}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** A pancake's height above the plate, in pixels. */
  static height(n){return n*STACK.layer;}
  pancake(n,x,w){return {n,x,w,look:Math.floor(this.rng()*4)};}
  /** The next pancake comes in from the side the last one did not. */
  next(){
    const top=this.top,n=top.n+1,side=n%2?-1:1,d=stackDifficulty(this.score);
    this.slider={n,w:top.w,x:top.x+side*STACK.range,dir:-side,speed:stackSpeed(d),look:Math.floor(this.rng()*4),born:this.time};
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    if((input.taps||[]).length){this.drop();if(this.over)return;}
    const s=this.slider,lo=this.top.x-STACK.range,hi=this.top.x+STACK.range;
    s.x+=s.dir*s.speed*dt;
    if(s.x<lo){s.x=lo+(lo-s.x);s.dir=1;}else if(s.x>hi){s.x=hi-(s.x-hi);s.dir=-1;}
  }
  drop(){
    const s=this.slider,top=this.top,dx=s.x-top.x,y=StackRun.height(s.n);
    if(Math.abs(dx)>=s.w-STACK.min){
      // Off the edge altogether: the whole pancake falls, and that is the end of the tower.
      this.state='over';this.emit('miss',s.x,y,{w:s.w,dir:Math.sign(dx)||1,look:s.look});return;
    }
    let layer;
    if(Math.abs(dx)<=STACK.perfect){
      this.streak++;
      const w=this.streak>=STACK.growAfter?Math.min(STACK.start,s.w+STACK.grow):s.w;
      layer={n:s.n,x:top.x,w,look:s.look};
      this.emit('place',top.x,y,{perfect:true,streak:this.streak,grew:w>s.w,w});
    }else{
      this.streak=0;
      const w=s.w-Math.abs(dx),x=(s.x+top.x)/2,cut=Math.abs(dx),side=Math.sign(dx);
      layer={n:s.n,x,w,look:s.look};
      // The overhang, which falls off the side it was hanging over.
      this.emit('trim',x+side*(w+cut)/2,y,{w:cut,side,look:s.look});
      this.emit('place',x,y,{perfect:false,streak:0,w});
    }
    this.layers.push(layer);this.score++;
    const zone=zoneAt(STACK_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',layer.x,y,{name:STACK_ZONES[zone][1]});}
    this.next();
  }
}

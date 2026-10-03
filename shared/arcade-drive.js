import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Hill Drive: Pou's Hill Drive, after Hill Climb Racing. Galgan drives a little car over
// hills: the right side of the screen is the pedal, the left the brake (and, stopped,
// reverse). In the air the pedal tips the car back and the brake tips it forward, so the
// whole game is the thumbs: off the pedal over a jump, a tap to bring the nose up or down for
// the landing, and on again. A foot held down all the way flips him onto his head on the
// first good jump; a driver who creeps along runs out of fuel, as the cans are spaced for a
// steady pace. A flip landed on the wheels is worth a third of a tank. The jumps grow from
// hops to long flights onto flat ground and the hills steepen, all levelling off: no hill is
// steeper than the car can climb from a standstill, nothing lands it on ground too steep to
// roll down, and the next can is always within a tankful at a steady pace.
export const DRIVE={width:400,height:600,metre:20,gravity:1000,engine:950,power:230000,top:640,brake:1400,grip:1.35,
  roll:.1,drag:.00012,over:.00002,spring:420,spring2:60,damp:22,radius:12,axle:27,drop:10,inertia:1300,air:11000,tilt:1000,one:.3,
  head:{x:-3,y:31,r:6},tank:18,step:8,flat:640,flipFuel:.35,
  jump:{tan:[.18,.42],fall:[45,330],k:[1.5,3.4],steep:1,scale:2000}};
export const DRIVE_ZONES=[[0,'The lane'],[250,'The fields'],[600,'The hills'],[1100,'Evening'],[1800,'The mountains'],[2600,'Night'],[3600,'The moon road']];
export const driveDifficulty=m=>ease(m,900);
/** The steepest a hill may be at a difficulty (rise over run). */
export const driveSlope=d=>lerp(.32,.72,d);
export const driveCanGap=d=>lerp(100,185,d);

export class Terrain{
  constructor(rng,start=0){
    this.rng=rng;this.heights=[];this.y=0;this.hills=[];this.cans=[];this.jumps=[];this.nextCan=start*DRIVE.metre+900;
    const n=Math.round(DRIVE.flat/DRIVE.step);for(let i=0;i<=n;i++)this.heights.push(0);this.x=n*DRIVE.step;
  }
  /** The ground's height under x, and how steep it is there. */
  h(x){const i=Math.max(0,x/DRIVE.step),k=Math.floor(i);this.extend(x+DRIVE.step*4);const a=this.heights[k],b=this.heights[k+1];return a+(b-a)*(i-k);}
  slope(x){const k=Math.floor(Math.max(0,x/DRIVE.step));this.extend(x+DRIVE.step*4);return(this.heights[k+1]-this.heights[k])/DRIVE.step;}
  extend(to){while(this.x<to)this.hill();}
  /** Lays `len` of ground shaped by f(u), u from 0 to 1, as a rise above where it starts. */
  lay(f,len,kind){
    const n=Math.max(1,Math.round(len/DRIVE.step)),y0=this.y,x0=this.x;
    for(let i=1;i<=n;i++)this.heights.push(y0+f(i/n));
    this.x+=n*DRIVE.step;this.y=this.heights.at(-1);this.hills.push({x:x0,len:n*DRIVE.step,kind});
  }
  /** What comes next: rolling hills, a ramp with the ground falling away behind it, or a run
   * of bumps. Rolling hills are no steeper than the car can climb from a standstill and drift
   * back towards level over a long way. Ramps come early, small at first, and are the test:
   * in the air the pedal tips the car back and the brake tips it forward, so a foot held down
   * all the way over a big one lands Galgan on his head. */
  hill(){
    const r=this.rng,m=this.x/DRIVE.metre,d=driveDifficulty(m),roll=r(),after=this.hills.at(-1)?.kind==='landing';
    // After a landing, room to settle before anything else.
    if(after)this.rolling(d,r,true);
    else if(m>35&&roll<lerp(.3,.42,d))this.ramp(ease(m,DRIVE.jump.scale),r);
    else if(m>120&&roll>1-lerp(.08,.2,d))this.bumps(d,r);
    else this.rolling(d,r);
    while(this.nextCan<this.x){
      // Never in the air over a jump, where the car would fly over it: on the run-up instead,
      // a little sooner than planned and never later.
      let at=this.nextCan;for(const j of this.jumps)if(at>j.lip-60&&at<j.end)at=j.lip-60;
      this.cans.push({x:at,taken:false});this.nextCan=at+driveCanGap(driveDifficulty(at/DRIVE.metre))*DRIVE.metre*(.85+r()*.3);
    }
  }
  rolling(d,r,gentle=false){
    const len=lerp(420,210,d)*(.7+r()*.6)*(gentle?1.4:1),max=driveSlope(d)*(gentle?.5:1)*2/Math.PI*len;
    const dy=clamp((r()*2-1)*lerp(50,220,d)-this.y*.12,-max,max),bump=lerp(0,3,d)*r(),wave=110+r()*60,x0=this.x;
    this.lay(u=>dy*(1-Math.cos(Math.PI*u))/2+bump*Math.sin((x0+u*len)/wave*Math.PI*2)*Math.sin(Math.PI*u),len,'roll');
  }
  /** A jump: a run-up, a gentle curve up into a straight lip, and the ground falling away
   * steeply beyond it and levelling out below. The curve is gentle enough for the car to follow
   * at full speed and the straight long enough for it to settle, so it leaves the lip at the
   * ramp's angle; from there the nose drops a little as it flies. Small drops early on land on
   * the slope and forgive anything but a foot held on the pedal; later drops are deeper and
   * level out sooner, so the car lands on flatter ground and needs its nose brought up with a
   * tap of the pedal on the way down. */
  ramp(d,r){
    const J=DRIVE.jump,tan=Math.tan(lerp(...J.tan,d)*(.85+r()*.3)),bend=Math.max(150,340*tan),straight=lerp(70,95,d);
    const rise=tan*(bend/2+straight),len=bend+straight;
    this.lay(()=>0,lerp(200,140,d),'run');
    this.lay(u=>{const x=u*len;return x<bend?tan*x*x/(2*bend):tan*(bend/2+x-bend);},len,'ramp');
    const lip=this.x,fall=rise+lerp(...J.fall,d)*(.75+r()*.5)+Math.max(0,this.y*.06),k=lerp(...J.k,d)*(.9+r()*.2),land=Math.max(lerp(360,440,d),fall*k/J.steep);
    this.lay(u=>-fall*(1-(1-u)**k),land,'landing');
    this.jumps.push({lip,end:this.x});
  }
  /** A run of bumps: a rattle at walking pace, a bucking ride flat out. */
  bumps(d,r){
    const k=3+Math.floor(r()*lerp(2,4,d)),wave=lerp(170,130,d)*(.9+r()*.2),a=lerp(6,13,d)*(.8+r()*.4);
    this.lay(u=>a*(1-Math.cos(2*Math.PI*u*k))/2,wave*k,'bumps');
  }
}

const rot=(a,x,y)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});

export class DriveRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.ground=new Terrain(this.rng,start);this.start=start;this.time=0;this.events=[];this.zone=0;this.state='ready';
    this.x=start*DRIVE.metre+140;this.ground.extend(this.x+2000);
    this.y=this.ground.h(this.x)+DRIVE.radius+DRIVE.drop+2;this.a=Math.atan(this.ground.slope(this.x));this.vx=0;this.vy=0;this.w=0;
    this.fuel=1;this.still=0;this.contact=[false,false];this.spin=0;this.gas=0;this.brake=0;
    this.startX=start*DRIVE.metre+140;this.best=start;this.air=0;this.turned=0;this.flips=0;
  }
  get score(){return Math.max(this.start,Math.floor(this.best));}
  get metres(){return this.start+(this.x-this.startX)/DRIVE.metre;}
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  point(ox,oy){const p=rot(this.a,ox,oy);return {x:this.x+p.x,y:this.y+p.y,rx:p.x,ry:p.y};}
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    const pedal=!!input.right,stop=!!input.left&&!input.right;
    if(this.state==='ready'){if(!pedal&&!stop)return;this.state='play';}
    this.gas=pedal&&this.fuel>0?1:0;this.brake=stop?1:0;
    this.fuel=Math.max(0,this.fuel-dt/DRIVE.tank);
    for(let k=0;k<2;k++)this.physics(dt/2);
    // Cans on the ground, picked up by driving past them.
    for(const can of this.ground.cans){if(!can.taken&&Math.abs(can.x-this.x)<34&&Math.abs(this.ground.h(can.x)+14-this.y)<90){can.taken=true;this.fuel=1;this.emit('fuel',can.x,this.ground.h(can.x));}}
    this.ground.cans=this.ground.cans.filter(can=>can.x>this.x-600);
    const head=this.point(DRIVE.head.x,DRIVE.head.y);
    if(head.y-DRIVE.head.r<this.ground.h(head.x)){this.state='over';this.emit('crash',head.x,head.y);return;}
    // Out of fuel and stopped (or stuck on its roof): the end of the road.
    const slow=Math.hypot(this.vx,this.vy)<14&&Math.abs(this.w)<.3;
    this.still=slow&&(this.fuel<=0||Math.cos(this.a)<-.2)?this.still+dt:0;
    if(this.still>1.4){this.state='over';this.emit(this.fuel<=0?'empty':'stuck',this.x,this.y);return;}
    const m=this.metres;if(m>this.best){const before=Math.floor(this.best);this.best=m;if(Math.floor(m/100)>Math.floor(before/100))this.emit('hundred',this.x,this.y,{metres:Math.floor(m/100)*100});}
    const zone=zoneAt(DRIVE_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',this.x,this.y,{name:DRIVE_ZONES[zone][1]});}
  }
  physics(dt){
    const g=this.ground;let fx=0,fy=-DRIVE.gravity,tq=0,touching=0;
    const contact=[false,false];
    [-DRIVE.axle,DRIVE.axle].forEach((ox,i)=>{
      const p=this.point(ox,-DRIVE.drop),s=g.slope(p.x),len=Math.hypot(1,s),nx=-s/len,ny=1/len,tx=1/len,ty=s/len;
      const pen=DRIVE.radius-(p.y-g.h(p.x))*ny;if(pen<=0)return;
      contact[i]=true;touching++;
      const vx=this.vx-this.w*p.ry,vy=this.vy+this.w*p.rx,vn=vx*nx+vy*ny,vt=vx*tx+vy*ty;
      const fn=Math.max(0,DRIVE.spring*pen+DRIVE.spring2*pen*pen-DRIVE.damp*vn);
      // Both wheels drive. The engine pushes hardest from a standstill and less as the car
      // speeds up; the brake stops it, and held when stopped backs it up slowly.
      let ft=-vt*DRIVE.roll*fn/DRIVE.gravity;
      if(this.gas)ft+=Math.min(DRIVE.engine,DRIVE.power/Math.max(60,Math.abs(vt)))*clamp(1-vt/DRIVE.top,0,1)/2;
      if(this.brake)ft+=vt>25?-DRIVE.brake/2:vt>-90?-DRIVE.engine*.35/2:0;
      ft=clamp(ft,-DRIVE.grip*fn,DRIVE.grip*fn);
      const Fx=fn*nx+ft*tx,Fy=fn*ny+ft*ty;fx+=Fx;fy+=Fy;tq+=p.rx*Fy-p.ry*Fx;
    });
    if(touching&&this.air>.35)this.landed();
    this.air=touching?0:this.air+dt;this.contact=contact;
    // In the air the pedal tips the nose up and the brake tips it down, hard, as nothing holds
    // the car. On one wheel they still do, less, so a wheelie or a nose-dive can be saved; on
    // both, the pedal lifts the front a little, as a real one does.
    if(touching<2)tq+=(this.gas-this.brake)*DRIVE.air*(touching?DRIVE.one:1);else tq+=this.gas*DRIVE.tilt*(1-this.brake);
    // Air drag, and much more of it past the car's top speed, so a long hill down does not
    // throw it at the next hill faster than anyone could drive it.
    const sp=Math.hypot(this.vx,this.vy),drag=DRIVE.drag+Math.max(0,sp-DRIVE.top)*DRIVE.over;fx-=this.vx*sp*drag;fy-=this.vy*sp*drag;
    this.vx+=fx*dt;this.vy+=fy*dt;this.w+=tq/DRIVE.inertia*dt;this.w*=1-dt*(touching?1.2:.4);
    this.x+=this.vx*dt;this.y+=this.vy*dt;this.a+=this.w*dt;if(!touching)this.turned+=this.w*dt;
    this.spin+=(this.vx*Math.cos(this.a)+this.vy*Math.sin(this.a))*dt/DRIVE.radius;
  }
  /** Back on the ground after a jump. A whole turn in the air, landed on the wheels, is a flip,
   * and a flip is worth a third of a tank: the reward for the risk. */
  landed(){
    const air=this.air,turns=Math.floor((Math.abs(this.turned)+.6)/(Math.PI*2)),upright=Math.cos(this.a-Math.atan(this.ground.slope(this.x)))>.5;
    this.emit('land',this.x,this.y,{hard:-this.vy>380,air});
    if(turns&&upright){this.flips+=turns;this.fuel=Math.min(1,this.fuel+DRIVE.flipFuel*turns);this.emit('flip',this.x,this.y,{turns,back:this.turned>0});}
    else if(air>.72&&upright)this.emit('air',this.x,this.y,{air});
    this.turned=0;
  }
}

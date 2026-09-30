import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Hill Drive: Pou's Hill Drive. Galgan drives a little car over hills: the right side of
// the screen is the pedal, the left the brake (and, stopped, reverse). Tip him onto his
// head and the run is over; run out of fuel and the car rolls to a stop. Cans along the
// way fill the tank. The hills grow taller and closer together as you go, and the cans
// further apart, both levelling off: no slope is steeper than the car can climb from a
// standstill, and the next can is always within a tankful at a steady pace.
export const DRIVE={width:400,height:600,metre:20,gravity:1000,engine:950,power:190000,top:560,brake:1400,grip:1.35,
  roll:.1,drag:.00012,spring:420,spring2:60,damp:22,radius:12,axle:27,drop:6,inertia:1300,air:5200,tilt:300,
  head:{x:-3,y:31,r:6},tank:26,step:16};
export const DRIVE_ZONES=[[0,'The lane'],[250,'The fields'],[600,'The hills'],[1100,'Evening'],[1800,'The mountains'],[2600,'Night'],[3600,'The moon road']];
export const driveDifficulty=m=>ease(m,900);
/** The steepest a hill may be at a difficulty (rise over run). */
export const driveSlope=d=>lerp(.32,.78,d);
export const driveCanGap=d=>lerp(120,200,d);

export class Terrain{
  constructor(rng,start=0){this.rng=rng;this.heights=[];this.x=0;this.y=0;this.hills=[];this.cans=[];this.nextCan=start*DRIVE.metre+900;
    for(let i=0;i<40;i++)this.heights.push(0);this.x=40*DRIVE.step;}
  /** The ground's height under x, and how steep it is there. */
  h(x){const i=Math.max(0,x/DRIVE.step),k=Math.floor(i);this.extend(x+DRIVE.step*4);const a=this.heights[k],b=this.heights[k+1];return a+(b-a)*(i-k);}
  slope(x){const k=Math.floor(Math.max(0,x/DRIVE.step));this.extend(x+DRIVE.step*4);return(this.heights[k+1]-this.heights[k])/DRIVE.step;}
  extend(to){while(this.x<to)this.hill();}
  /** One hill: a smooth rise or fall, no steeper than the car can take, with a ripple on
   * top later on. The ground drifts, but is pulled back towards level over a long way. */
  hill(){
    const r=this.rng,d=driveDifficulty(this.x/DRIVE.metre),len=lerp(420,230,d)*(.7+r()*.6),max=driveSlope(d);
    let dy=(r()*2-1)*lerp(40,210,d)-this.y*.12;dy=clamp(dy,-max*len*2/Math.PI,max*len*2/Math.PI);
    const bump=lerp(0,4,d)*r(),wave=110+r()*60,y0=this.y;
    const n=Math.round(len/DRIVE.step);
    for(let i=1;i<=n;i++){const u=i/n,x=this.x+i*DRIVE.step;this.heights.push(y0+dy*(1-Math.cos(Math.PI*u))/2+bump*Math.sin(x/wave*Math.PI*2)*Math.sin(Math.PI*u));}
    this.hills.push({x:this.x,len:n*DRIVE.step});this.x+=n*DRIVE.step;this.y=y0+dy;
    while(this.nextCan<this.x){this.cans.push({x:this.nextCan,taken:false});this.nextCan+=driveCanGap(driveDifficulty(this.nextCan/DRIVE.metre))*DRIVE.metre*(.85+r()*.3);}
  }
}

const rot=(a,x,y)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});

export class DriveRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.ground=new Terrain(this.rng,start);this.start=start;this.time=0;this.events=[];this.zone=0;this.state='ready';
    this.x=start*DRIVE.metre+140;this.ground.extend(this.x+2000);
    this.y=this.ground.h(this.x)+DRIVE.radius+DRIVE.drop+2;this.a=Math.atan(this.ground.slope(this.x));this.vx=0;this.vy=0;this.w=0;
    this.fuel=1;this.still=0;this.contact=[false,false];this.spin=0;this.gas=0;this.brake=0;
    this.startX=start*DRIVE.metre+140;this.best=start;this.air=0;
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
    for(const can of this.ground.cans){if(!can.taken&&Math.abs(can.x-this.x)<34&&Math.abs(this.ground.h(can.x)+14-this.y)<70){can.taken=true;this.fuel=1;this.emit('fuel',can.x,this.ground.h(can.x));}}
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
    for(const [i,was] of this.contact.entries())if(contact[i]&&!was&&this.air>.35)this.emit('land',this.x,this.y,{hard:-this.vy>380});
    this.air=touching?0:this.air+dt;this.contact=contact;
    // In the air the pedal tips the nose up and the brake tips it down; on the ground the
    // pedal lifts the front a little, as a real one does.
    if(!touching)tq+=(this.gas-this.brake)*DRIVE.air;else tq+=this.gas*DRIVE.tilt*(1-this.brake);
    const sp=Math.hypot(this.vx,this.vy);fx-=this.vx*sp*DRIVE.drag;fy-=this.vy*sp*DRIVE.drag;
    this.vx+=fx*dt;this.vy+=fy*dt;this.w+=tq/DRIVE.inertia*dt;this.w*=1-dt*(touching?1.2:.4);
    this.x+=this.vx*dt;this.y+=this.vy*dt;this.a+=this.w*dt;
    this.spin+=(this.vx*Math.cos(this.a)+this.vy*Math.sin(this.a))*dt/DRIVE.radius;
  }
}

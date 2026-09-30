import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Jet Monki: Pou's Jet Pou. Monki flies right on a rocket; each tap is a push up and the
// rest is falling. Chimneys stand up from the roofs and storm clouds hang down from the
// sky, with a way through each pair. The way through narrows and moves further from the
// last one as you go, never further than a steady tapper can climb in the time between.
export const JET={width:400,height:600,x:120,top:20,ground:548,gravity:1300,flap:410,fall:720,col:62,hitW:12,hitH:14};
export const JET_ZONES=[[0,'Over the garden'],[10,'Over the roofs'],[25,'The storm'],[50,'Evening'],[85,'Night'],[130,'The stars']];
export const jetDifficulty=n=>ease(n,45);
export const jetSpeed=d=>lerp(150,205,d);
/** How far up a tapper gets in `time` seconds tapping about four times a second. */
export const jetClimb=time=>(JET.flap-JET.gravity*.24/2)*time;
/** How far below the point of a tap he is `time` seconds later: the worst way to leave a
 * pair is having just tapped, going up, with a lower way through coming. */
export const jetSink=time=>-JET.flap*time+JET.gravity*time*time/2;
/** The way through a pair at time t: some drift up and down later on. */
export const gapY=(col,t)=>col.cy+col.amp*Math.sin(col.omega*t+col.phase);

export class JetRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.y=JET.height*.45;this.vy=0;this.time=0;this.dist=0;
    this.state='ready';this.columns=[];this.serial=0;this.lastX=JET.x+260;this.lastY=JET.height*.45;this.lastGap=220;this.lastAmp=0;
    this.events=[];this.zone=0;this.flapAt=-1;
    while(this.lastX<JET.width+200)this.addColumn();
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  addColumn(){
    const r=this.rng,n=this.score+this.columns.length,d=jetDifficulty(n),speed=jetSpeed(d);
    const gap=lerp(205,150,d)*(.95+r()*.1),spacing=lerp(250,210,d)*(.9+r()*.2),x=this.lastX+spacing;
    // A sway later on, taken off what the next way through is allowed to move.
    const amp=d>.35&&r()<lerp(0,.4,d)?lerp(10,30,d)*(.5+r()*.5):0;
    const time=(spacing-JET.col-JET.hitW*2)/speed;
    // Measured edge to edge: from the bottom of this way through, just after a tap, to the
    // top of the next, and the same upwards with a steady tapper.
    const room=(this.lastGap+gap)/2-JET.hitH*2-12,sway=(amp+this.lastAmp)*2;
    const up=Math.max(0,Math.min(jetClimb(time)*.62,lerp(90,190,d))-sway),down=Math.max(0,Math.min(room+jetSink(time),lerp(90,230,d))-sway);
    const lo=JET.top+gap/2+amp+26,hi=JET.ground-gap/2-amp-26;
    const cy=clamp(this.lastY+(r()<.5?-up:down)*r(),lo,hi);
    this.columns.push({id:this.serial++,x,cy,gap,amp,omega:amp?.8+r()*.6:0,phase:r()*Math.PI*2,passed:false});
    this.lastX=x;this.lastY=cy;this.lastGap=gap;this.lastAmp=amp;
  }
  flap(){this.vy=-JET.flap;this.flapAt=this.time;this.emit('flap',JET.x,this.y);}
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;const taps=input.taps?.length||0;
    // Hovering until the first tap: nothing moves towards him before he is ready.
    if(this.state==='ready'){this.y=JET.height*.45+Math.sin(this.time*4)*6;if(!taps)return;this.state='play';}
    if(taps)this.flap();
    this.vy=Math.min(JET.fall,this.vy+JET.gravity*dt);this.y+=this.vy*dt;
    if(this.y<JET.top+JET.hitH){this.y=JET.top+JET.hitH;this.vy=Math.max(0,this.vy);}
    this.speed=jetSpeed(jetDifficulty(this.score));this.dist+=this.speed*dt;
    while(this.lastX<this.dist+JET.width+140)this.addColumn();
    const mx=this.dist+JET.x;
    for(const col of this.columns){
      if(Math.abs(col.x-mx)<JET.col/2+JET.hitW){
        const gy=gapY(col,this.time);
        if(this.y-JET.hitH<gy-col.gap/2){this.crash('cloud',col);return;}
        if(this.y+JET.hitH>gy+col.gap/2){this.crash('chimney',col);return;}
      }
      if(!col.passed&&col.x+JET.col/2<mx-JET.hitW){col.passed=true;this.score++;this.emit('pass',JET.x,this.y,{score:this.score});}
    }
    if(this.y+JET.hitH>=JET.ground){this.y=JET.ground-JET.hitH;this.crash('ground');return;}
    this.columns=this.columns.filter(col=>col.x>this.dist-80);
    const zone=zoneAt(JET_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',JET.x,this.y,{name:JET_ZONES[zone][1]});}
  }
  crash(what){this.state='over';this.emit('crash',JET.x,this.y,{what});}
}

import {item,rect,ellipse} from './art.js';
import {clamp,ACTORS} from './shared/world.js';
import {recordThrowSample,releaseVelocity,createPaperFlight,stepPaperFlight,moveFetchDog} from './paper-physics.js';
export const BUBBLE_RADIUS=12;
export const MAX_BUBBLE_RADIUS=52;
export const bubbleSize=distance=>clamp(BUBBLE_RADIUS+distance*.24,BUBBLE_RADIUS,MAX_BUBBLE_RADIUS);

/** Real toys leave their dock slots. The overlay lets the hand and fetch dog
 * cross the world/UI boundary without teleporting behind the toolbar. */
export class RoomToys{
  constructor(scene){this.scene=scene;this.mode=null;this.bubbles=[];this.shots=[];this.particles=[];this.caught=new Set();this.throws=0;this.pointer=null;this.last=0;this.owned=new Map();this.returning=null;this.wand=null;}
  get origin(){return this.scene.toyOrigin?.(this.mode)||{x:200,y:289};}
  get scale(){return this.scene.toyScale?.(this.mode)||.8;}
  get guestDoor(){return {x:470+Math.max(0,this.scene.ox||0),y:285};}
  dock(away){this.scene.callbacks.onToyDock?.(this.mode,away);}
  own(id,value){this.scene.override[id]=value;this.owned.set(id,value);}
  release(id){if(this.scene.override[id]===this.owned.get(id))delete this.scene.override[id];this.owned.delete(id);}
  beginAim(p,time=performance.now()){if(this.mode==='paper'&&this.shots.length)return false;this.pointer={...p,intent:'place',previousWand:this.wand,origin:{...this.origin},samples:[]};recordThrowSample(this.pointer.samples,p,time);if(this.mode==='bubbles')this.wand=null;this.dock(true);return true;}
  cancelAim(){if(this.pointer?.previousWand)this.wand=this.pointer.previousWand;this.pointer=null;this.dock(!!this.shots.length||!!this.wand);}
  placeWand(p){this.wand={x:clamp(p.x,35,365),y:clamp(p.y,175,310)};this.dock(true);this.scene.callbacks.onWandPlaced?.(true);}
  start(mode){this.clear();this.mode=mode;this.room=this.scene.room;this.caught.clear();this.throws=0;this.scene.callbacks.onToyMode?.(mode);}
  clear(){this.dock(false);for(const id of this.owned.keys())this.release(id);this.bubbles=[];this.shots=[];this.particles=[];this.pointer=null;this.returning=null;this.wand=null;this.mode=null;this.scene.callbacks.onToyMode?.(null);}
  blow({dx,dy,origin,r=BUBBLE_RADIUS,strength=0}={}){
    if(this.mode!=='bubbles')this.start('bubbles');
    if(dx===undefined){const angle=-Math.PI*.78+Math.random()*Math.PI*.56;dx=Math.cos(angle);dy=Math.sin(angle);}
    const length=Math.hypot(dx,dy)||1,o=origin||this.wand||this.origin,sy=this.scene.sy||1;
    r=clamp(r,BUBBLE_RADIUS,MAX_BUBBLE_RADIUS);
    const ux=dx/length,uy=dy/length,ringY=o.y-31*this.scale/sy,impulse=62+Math.min(92,strength*.45);
    this.bubbles.push({x:o.x+ux*(9+r*.58),y:ringY+uy*(9+r*.58)/sy,r,
      vx:ux*impulse,vy:(uy*impulse-10-r*.16)/sy,phase:Math.random()*Math.PI*2,age:0,actor:null});
    if(this.bubbles.length>18){const oldest=this.bubbles.shift();if(oldest.actor)this.release(oldest.actor);}
    this.scene.callbacks.onSound?.('bubble');
  }
  input(kind,p,time=performance.now()){
    if(!this.mode||this.room!==this.scene.room)return false;
    const sy=this.scene.sy||1;
    if(kind==='down'){
      if(this.mode==='bubbles'){
        if(!this.wand){this.pointer={...p,origin:{...p},intent:'place'};return true;}
        const w=this.wand;
        // The physical wand takes priority, so fast taps never pop fresh bubbles.
        if(Math.hypot(p.x-w.x,(p.y-w.y)*sy+15*this.scale)<30){this.pointer={...p,start:{...p},origin:{...w},intent:'shoot',samples:[]};recordThrowSample(this.pointer.samples,p,time);return true;}
      }
      const bubble=[...this.bubbles].reverse().find(b=>b.age>.65&&Math.hypot(p.x-b.x,(p.y-b.y)*sy)<b.r+8);
      if(bubble){this.pop(bubble);return true;}return false;
    }
    if(!this.pointer)return false;
    if(kind==='move'){
      const pointer=this.pointer;if(this.mode==='paper'||pointer.intent==='shoot')recordThrowSample(pointer.samples,p,time);Object.assign(pointer,p);
      return true;
    }
    if(kind==='up'){
      const hand=this.pointer;
      if(this.mode==='paper'){
        const a=this.scene.state.actors.sernik,dogFrom=a.room===this.room?{x:a.x,y:a.y}:this.guestDoor;
        const shot=createPaperFlight(p,releaseVelocity(hand.samples,p,time,sy),{sy,home:hand.origin,scale:this.scale});
        Object.assign(shot,{dogFrom,fetch:{...dogFrom,phase:'chase',moving:false,flip:p.x<dogFrom.x,age:0}});
        this.shots.push(shot);this.throws++;if(Math.hypot(shot.vx,shot.vy)>25)this.scene.callbacks.onSound?.('throw');
      }else if(hand.intent==='place')this.placeWand(p);
      else{const dx=p.x-hand.start.x,dy=(p.y-hand.start.y)*sy,d=Math.hypot(dx,dy),v=releaseVelocity(hand.samples,p,time,sy),speed=Math.hypot(v.x,v.y);
        this.blow(d<10?{}:{dx,dy,r:bubbleSize(d),strength:clamp(d*.18+speed*.14,0,190)});}
      this.pointer=null;return true;
    }return false;
  }
  pop(b){
    const index=this.bubbles.indexOf(b);if(index<0)return;this.bubbles.splice(index,1);
    if(b.actor){this.release(b.actor);this.scene.react(b.actor);this.caught.add(b.actor);this.scene.callbacks.onToyResult?.({toy:'bubbles',target:b.actor,room:this.room});}
    for(let i=0;i<9;i++)this.particles.push({x:b.x,y:b.y,vx:Math.cos(i)*45,vy:Math.sin(i)*45/(this.scene.sy||1),life:.5});
    this.scene.callbacks.onPop?.(b.actor);
    for(const next of [...this.bubbles])if(next.age>.65&&Math.hypot(next.x-b.x,(next.y-b.y)*(this.scene.sy||1))<b.r+next.r+14)this.pop(next);
  }
  updatePaper(s,dt){
    const sy=this.scene.sy||1,f=s.fetch,scale=this.scene.actorScale||1,reach=13*scale+12*this.scale;
    s.sy=sy;f.age+=dt;
    if(s.carried)f.carryX+=((f.flip?-1:1)*reach-f.carryX)*(1-Math.exp(-20*dt));
    const mouth=()=>({x:s.carried?f.carryX:(f.flip?-1:1)*reach,y:(-15*scale+17*this.scale)/sy});
    const targetFor=p=>{const m=mouth();return{x:p.x-m.x,y:p.y-m.y};};
    if(f.phase==='chase'){
      const impacts=stepPaperFlight(s,dt);if(impacts&&s.bounces===1)this.scene.callbacks.onSound?.('paper-land');
      const dx=s.gx-f.x;if(Math.abs(dx)>24)f.flip=dx<0;
      const arrived=f.age>.14&&moveFetchDog(f,targetFor({x:s.gx,y:s.gy}),dt,sy,Math.min(290,(f.age-.14)*1000));
      if(arrived&&s.motion==='rest'){f.phase='pickup';f.age=0;f.carryX=mouth().x;s.carried=true;s.angle=Math.atan2(Math.sin(s.angle),Math.cos(s.angle));}
    }else if(f.phase==='pickup'){
      f.moving=false;
      if(f.age>.16){f.phase='return';f.age=0;f.flip=this.origin.x<f.x;}
    }else if(f.phase==='return'){
      s.home={...this.origin};
      if(moveFetchDog(f,targetFor(s.home),dt,sy)){
        s.done=true;f.phase='home';f.age=0;this.dock(false);
        this.scene.callbacks.onToyResult?.({toy:'paper',target:'sernik',room:this.room});this.scene.callbacks.onSound?.('drop');
      }
    }else if(f.phase==='home'){
      const a=this.scene.state.actors.sernik,destination=a.room===this.room?a:this.guestDoor;
      f.flip=destination.x<f.x;
      if(f.age>.16&&moveFetchDog(f,destination,dt,sy)){this.release('sernik');s.finished=true;return;}
      if(f.age<=.16)f.moving=false;
    }
    const bob=f.moving?Math.abs(Math.sin(f.age*19))*1.6/sy:0;
    this.own('sernik',{x:f.x,y:f.y-bob,room:this.room});
    if(s.carried&&!s.done){const m=mouth();s.x=f.x+m.x;s.y=f.y-bob+m.y;s.angle*=Math.exp(-18*dt);}
  }
  update(time){
    const dt=Math.min(.05,(time-(this.last||time))/1000);this.last=time;if(!this.mode)return;const sy=this.scene.sy||1;
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    if(this.returning){this.returning.age+=dt;if(this.returning.age>=.25){this.returning=null;this.dock(false);}}
    for(const shot of this.shots)this.updatePaper(shot,dt);this.shots=this.shots.filter(s=>!s.finished);
    for(const b of [...this.bubbles]){
      if(!this.bubbles.includes(b))continue;
      b.age+=dt;if(b.actor){b.y-=9*dt/sy;this.own(b.actor,{x:b.x,y:b.y+20*(this.scene.actorScale||1)/sy,room:this.room});}
      else{
        // Release gives an initial puff; drag fades and buoyancy takes over.
        // A tiny sideways wobble makes bubbles float rather than fly like darts.
        b.vx*=Math.exp(-1.35*dt);b.vy+=((-13-b.r*.15)/sy-b.vy)*Math.min(1,dt*1.7);
        b.x+=(b.vx+Math.sin(b.age*2.8+(b.phase||0))*(3+b.r*.08))*dt;
        b.y+=b.vy*dt;
        if(b.x-b.r<15){b.x=15+b.r;b.vx=Math.abs(b.vx)*.35;}
        if(b.x+b.r>385){b.x=385-b.r;b.vx=-Math.abs(b.vx)*.35;}
        const who=ACTORS.find(id=>{const a=this.scene.state.actors[id];return a.room===this.room&&!this.bubbles.some(other=>other.actor===id)&&Math.hypot(a.x-b.x,(a.y-b.y)*sy-24*(this.scene.actorScale||1))<b.r+12;});
        if(who){const radius=({david:22,julia:22,monki:25,sernik:29,galgan:29}[who])*(this.scene.actorScale||1);
          if(b.r>=radius){b.actor=who;this.scene.callbacks.onPop?.(who);}
          else{this.scene.react(who);this.pop(b);continue;}
        }
      }
      if(b.y<50||b.age>14)this.pop(b);
    }
    // Small taps in quick succession should make a loose cloud, not seven
    // concentric outlines at the end of the wand.
    const free=this.bubbles.filter(b=>!b.actor);
    for(let i=0;i<free.length;i++)for(let j=i+1;j<free.length;j++){
      const a=free[i],b=free[j],dx=b.x-a.x,dy=(b.y-a.y)*sy,d=Math.hypot(dx,dy),space=(a.r+b.r)*.72;
      if(d<space){const angle=d>.01?Math.atan2(dy,dx):i+j,ux=Math.cos(angle),uy=Math.sin(angle),push=Math.min(2.8,(space-d)*.14);a.x-=ux*push;b.x+=ux*push;a.y-=uy*push/sy;b.y+=uy*push/sy;}
    }
  }
  draw(c,time){
    if(!this.mode||this.room!==this.scene.room)return;const sy=this.scene.sy||1;
    const toy=(type,p,rotation=0)=>{c.save();c.translate(p.x,p.y);c.scale(1,1/sy);if(type==='paper'){c.translate(0,-17*this.scale);c.rotate(rotation);c.translate(0,17*this.scale);}else c.rotate(rotation);item(c,type,0,0,{scale:this.scale});c.restore();};
    for(const s of this.shots){
      if(!s.carried&&!s.done){c.save();c.translate(s.gx,s.gy);c.scale(1,1/sy);c.globalAlpha=.18/(1+s.z/70);ellipse(c,0,2,Math.max(7,15-s.z*.025),3,'#394933');c.restore();}
      const a=this.scene.override.sernik,f=s.fetch;if(a)this.scene.character(c,'sernik',a.x,a.y,{hat:this.scene.state.actors.sernik.hat,running:f.moving,frame:f.age*11,mood:'happy',flip:f.flip});if(!s.done)toy('paper',s,s.angle);
    }
    for(const b of this.bubbles){const grow=.64+.36*Math.min(1,b.age/.18),r=b.r*grow;c.save();c.translate(b.x,b.y);c.scale(1,1/sy);ellipse(c,0,0,r,r,'#dae8e744');c.strokeStyle=b.actor?'#e3bc6f':'#fdf5e6';c.lineWidth=1.4;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();rect(c,-5,-7,3,2,'#fffbed');c.restore();}
    if(this.wand)toy('wand',this.wand);
    if(this.pointer){const p=this.pointer;if(this.mode==='paper'||p.intent==='place')toy(this.mode==='paper'?'paper':'wand',p);
      else{const dx=p.x-p.start.x,dy=(p.y-p.start.y)*sy,d=Math.hypot(dx,dy),r=bubbleSize(d),length=d||1,ux=dx/length,uy=dy/length,ringY=this.wand.y-31*this.scale/sy,x=this.wand.x+ux*(9+r*.58),y=ringY+uy*(9+r*.58)/sy;
        c.save();c.translate(x,y);c.scale(1,1/sy);ellipse(c,0,0,r,r,'#dceeee44');c.strokeStyle=r>=41?'#e5c77d':'#e2f5f3';c.lineWidth=2;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();c.restore();
        if(d>10){c.strokeStyle='#d9eee5';c.lineWidth=1;c.beginPath();c.moveTo(this.wand.x,ringY);c.lineTo(x-ux*r*.72,y-uy*r*.72/sy);c.stroke();}
      }}
    for(const p of this.particles)rect(c,p.x,p.y,2,2/sy,'#fff7ce');
  }
}

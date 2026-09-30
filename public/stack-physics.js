// Small, deterministic rigid-body model for the short stacking encounters.
// Pieces have mass, horizontal momentum, gravity and a support polygon. A group
// tips when its centre of mass moves beyond the piece holding it up. This is not
// a general physics engine; the narrow model makes the outcome readable on a
// phone and identical at different display refresh rates.
const WIDTHS={pizza:64,donut:58,teacup:48,magnet:54,mushroom:55,snowflake:55,carrot:49};
const GRAVITY=850,FLOOR=386,BASE_Y=350;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export class StackTower{
  constructor({item,difficulty=0,variant='plain',goal=4}={}){
    this.item=item;this.difficulty=difficulty;this.variant=variant;this.goal=goal;
    this.width=(WIDTHS[item]||55)*(variant==='giant'?1.14:1);
    this.height=32*(variant==='giant'?1.08:1);
    this.blocks=[];this.debris=[];this.flight=null;this.time=0;
    this.sway=0;this.swayVelocity=0;this.unstableFor=0;this.settleFor=0;this.cooldown=0;
    this.misses=0;this.falls=0;this.events=[];
  }
  get ready(){return !this.flight&&this.settleFor<=0&&this.cooldown<=0;}
  support(){const top=this.blocks.at(-1);return top?{x:top.x,y:top.y-top.h/2,w:top.w}:{x:200,y:BASE_Y,w:148};}
  sourceY(){return Math.max(58,Math.min(122,this.support().y-98));}
  sourceX(){
    const speed=(this.variant==='bounce'?1.55:1.28)+this.difficulty*.62-Math.min(.2,this.misses*.025+this.falls*.05);
    return 200+Math.sin(this.time*speed)*(116+this.difficulty*11);
  }
  sourceVelocity(){
    const speed=(this.variant==='bounce'?1.55:1.28)+this.difficulty*.62-Math.min(.2,this.misses*.025+this.falls*.05);
    return Math.cos(this.time*speed)*(116+this.difficulty*11)*speed;
  }
  predictedX(){
    const body=this.flight,fromY=body?.y??this.sourceY(),fromX=body?.x??this.sourceX(),vx=body?.vx??this.sourceVelocity()*(.035+this.difficulty*.055);
    const distance=Math.max(0,this.support().y-fromY-this.height/2),flightTime=Math.sqrt(2*distance/GRAVITY);
    return fromX+vx*flightTime;
  }
  drop(){
    if(!this.ready)return false;
    this.flight={x:this.sourceX(),y:this.sourceY(),vx:this.sourceVelocity()*(.035+this.difficulty*.055),vy:0,
      angle:0,omega:0,w:this.width,h:this.height};
    return true;
  }
  update(dt){
    const steps=Math.max(1,Math.ceil(clamp(dt,0,.05)/(1/120))),step=clamp(dt,0,.05)/steps;
    for(let i=0;i<steps;i++)this.advance(step);
    return this.events.splice(0);
  }
  advance(dt){
    this.time+=dt;
    this.swayVelocity+=(-this.sway*28-this.swayVelocity*5.7)*dt;
    this.sway=clamp(this.sway+this.swayVelocity*dt,-22,22);
    this.cooldown=Math.max(0,this.cooldown-dt);
    for(const body of this.debris){
      body.age+=dt;body.vy+=GRAVITY*dt;body.x+=body.vx*dt;body.y+=body.vy*dt;body.angle+=body.omega*dt;
      if(body.y+body.h/2>FLOOR){body.y=FLOOR-body.h/2;if(body.vy>28){body.vy*=-(this.variant==='bounce'?.38:.22);body.vx*=.7;body.omega*=.7;}else{body.vy=0;body.vx*=Math.max(0,1-4*dt);body.omega*=Math.max(0,1-5*dt);}}
    }
    this.debris=this.debris.filter(body=>body.age<2.3);
    if(this.flight){
      const body=this.flight,previousBottom=body.y+body.h/2;
      body.vy+=GRAVITY*dt;
      if(this.variant==='wind')body.vx+=Math.sin(this.time*2.3)*65*dt;
      body.x+=body.vx*dt;body.y+=body.vy*dt;body.angle+=body.omega*dt;
      const support=this.support(),bottom=body.y+body.h/2;
      if(previousBottom<=support.y&&bottom>=support.y){
        const overlap=(body.w+support.w)/2-Math.abs(body.x-support.x);
        if(overlap>=Math.max(8,body.w*.22-this.assist()*.18))this.land(body,support);
        else this.fail(body);
      }else if(bottom>FLOOR)this.fail(body);
    }
    if(this.blocks.length){
      const unstable=this.unstableAt();
      this.unstableFor=unstable>=0?this.unstableFor+dt:Math.max(0,this.unstableFor-dt*2);
      if(this.unstableFor>.16)this.collapse(unstable);
    }
    if(this.settleFor>0){
      this.settleFor=Math.max(0,this.settleFor-dt);
      if(this.settleFor===0&&this.blocks.length){
        const top=this.blocks.at(-1);
        this.events.push({type:'placed',x:top.x,y:top.y,height:this.blocks.length});
        this.cooldown=.08;
      }
    }
  }
  assist(){return Math.min(13,this.misses*1.2+this.falls*3.2);}
  land(body,support){
    const incomingVx=body.vx;
    body.y=support.y-body.h/2;
    body.angle=clamp((body.x-support.x)/body.w*.115+incomingVx*.0007,-.19,.19);
    body.vy=0;body.vx=0;body.omega=0;
    this.blocks.push(body);this.flight=null;this.settleFor=.3;
    this.swayVelocity+=clamp((body.x-support.x)*.62+incomingVx*.16,-25,25);
    this.events.push({type:'land',x:body.x,y:body.y,offset:body.x-support.x});
  }
  unstableAt(){
    for(let i=this.blocks.length-1;i>=0;i--){
      const support=i===0?{x:200,w:148}:this.blocks[i-1];
      const above=this.blocks.slice(i);
      const centre=above.reduce((sum,b)=>sum+b.x,0)/above.length+this.sway*(i+1)/this.blocks.length;
      const safe=support.w/2-5-this.difficulty*3+this.assist()*.6;
      if(Math.abs(centre-support.x)>safe)return i;
    }
    return -1;
  }
  collapse(from){
    const loose=this.blocks.splice(Math.max(0,from)),side=Math.sign((loose[0]?.x||200)-(this.blocks.at(-1)?.x||200)+this.sway)||1;
    for(let i=0;i<loose.length;i++)this.debris.push({...loose[i],vx:side*(70+i*24),vy:-45-i*25,omega:side*(1.8+i*.35),age:0});
    this.flight=null;this.settleFor=0;this.unstableFor=0;this.swayVelocity=0;this.sway=0;this.cooldown=.55;
    this.falls++;this.events.push({type:'collapse',height:this.blocks.length,x:loose[0]?.x||200,y:loose[0]?.y||300});
  }
  fail(body){
    this.flight=null;this.debris.push({...body,vx:body.vx+(body.x<200?-42:42),vy:Math.min(body.vy,120),omega:body.x<200?-2.2:2.2,age:0});
    this.misses++;this.cooldown=.27;this.events.push({type:'miss',x:body.x,y:body.y});
  }
}

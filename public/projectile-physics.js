const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

/** A finger chooses the intended landing point; gravity determines the flight. */
export function launchShot({x,y,tx,ty,duration=.65,gravity=1100}){
  const vx=(tx-x)/duration,vy=(ty-y-.5*gravity*duration*duration)/duration;
  return{x,y,tx,ty,startX:x,startY:y,duration,gravity,age:0,
    vx,vy,startVy:vy,
    angle:0,spin:clamp((tx-x)/duration/150,-1.8,1.8)};
}
export function shotPoint(shot,age){const t=clamp(age,0,shot.duration);return{x:shot.startX+shot.vx*t,y:shot.startY+shot.startVy*t+.5*shot.gravity*t*t};}
export function advanceShot(shot,dt){
  const step=clamp(dt,0,shot.duration-shot.age);
  shot.x+=shot.vx*step;shot.y+=shot.vy*step+.5*shot.gravity*step*step;
  shot.vy+=shot.gravity*step;shot.angle+=shot.spin*step;shot.age+=step;
  return shot.age>=shot.duration-1e-8;
}
export function looseBody(shot){return{x:shot.x,y:shot.y,vx:shot.vx*.42,vy:shot.vy*.45,angle:shot.angle,spin:shot.spin*2,age:0,bounces:0};}
export function advanceLooseBody(body,dt,ground=390){
  const steps=Math.max(1,Math.ceil(clamp(dt,0,.05)/(1/120))),step=clamp(dt,0,.05)/steps;
  for(let i=0;i<steps;i++){
    body.age+=step;body.vy+=1100*step;body.x+=body.vx*step;body.y+=body.vy*step;body.angle+=body.spin*step;
    if(body.y>=ground){body.y=ground;if(body.vy>32&&body.bounces<3){body.vy*=-.3;body.bounces++;}else body.vy=0;body.vx*=Math.max(0,1-2.5*step);body.spin*=Math.max(0,1-3*step);}
  }
  return body;
}

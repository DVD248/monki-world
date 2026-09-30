const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

// The last 90 ms of the finger, not the last event's pixel delta. Keeping the
// sample immediately before the window lets 30/60/120 Hz input agree.
export function recordThrowSample(samples,p,time){
  const last=samples.at(-1),t=Math.max(time,last?.t??time);
  if(last?.t===t)Object.assign(last,{x:p.x,y:p.y});
  else samples.push({x:p.x,y:p.y,t});
  while(samples.length>2&&samples[1].t<t-140)samples.shift();
}
export function releaseVelocity(samples,p,time,sy=1){
  const points=samples.map(s=>({...s}));recordThrowSample(points,p,time);
  const end=points.at(-1),startTime=Math.max(points[0].t,end.t-90);
  if(end.t-startTime<8)return{x:0,y:0};
  let a=points[0],b=points[0];
  for(const point of points){if(point.t<=startTime)a=point;else{b=point;break;}}
  const q=b.t>a.t?(startTime-a.t)/(b.t-a.t):0;
  const x=a.x+(b.x-a.x)*q,y=a.y+(b.y-a.y)*q,seconds=(end.t-startTime)/1000;
  let vx=(end.x-x)/seconds,vy=(end.y-y)*sy/seconds;
  const speed=Math.hypot(vx,vy),limit=Math.min(1,1100/(speed||1));vx*=limit;vy*=limit;
  if(speed<35)return{x:0,y:0};
  return{x:vx,y:vy};
}

export function createPaperFlight(origin,velocity,{sy=1,home=origin,scale=.8}={}){
  const speed=Math.hypot(velocity.x,velocity.y),z=Math.max(16,(184-origin.y)*sy);
  return{x:origin.x,y:origin.y,gx:origin.x,gy:origin.y+z/sy,z,
    vx:velocity.x*.68,vy:velocity.y*.68,vz:speed>35?clamp(85+speed*.11,90,205):0,
    origin:{...origin},home:{...home},sy,scale,age:0,motion:'air',bounces:0,
    angle:0,spin:clamp(velocity.x/90-velocity.y/200,-11,11),impactAge:99};
}

// Ground motion and height are independent. A soft roll has one low bounce,
// then friction; the rendered anchor is always ground minus height.
export function stepPaperFlight(s,dt){
  let impacts=0;
  for(let remaining=Math.max(0,dt);remaining>1e-7;){
    const h=Math.min(1/120,remaining);remaining-=h;s.age+=h;s.impactAge+=h;
    if(s.motion==='rest')continue;
    const damping=s.motion==='air'?.45:7,decay=Math.exp(-damping*h),travel=(1-decay)/damping;
    s.gx+=s.vx*travel;s.gy+=s.vy*travel/s.sy;s.vx*=decay;s.vy*=decay;
    if(s.motion==='air'){
      s.z+=s.vz*h-700*h*h/2;s.vz-=700*h;
      if(s.z<=0){s.z=0;s.impactAge=0;impacts++;s.bounces++;s.vx*=.72;s.vy*=.72;
        if(s.bounces===1&&-s.vz>160)s.vz=-s.vz*.22;
        else{s.vz=0;s.motion='roll';}
      }
    }else{s.spin=(s.vx-s.vy*.3)/(18*s.scale);if(Math.hypot(s.vx,s.vy)<10){s.vx=s.vy=s.spin=0;s.motion='rest';}}
    s.angle+=s.spin*h;
    const lower=Math.max(314,s.home.y+12/s.sy);
    if(s.gx<18){s.gx=18;s.vx=Math.abs(s.vx)*.28;s.spin*=-.5;}
    if(s.gx>382){s.gx=382;s.vx=-Math.abs(s.vx)*.28;s.spin*=-.5;}
    if(s.gy<184){s.gy=184;s.vy=Math.abs(s.vy)*.22;}
    if(s.gy>lower){s.gy=lower;s.vy=-Math.abs(s.vy)*.22;}
  }
  s.x=s.gx;s.y=s.gy-s.z/s.sy;return impacts;
}

export function moveFetchDog(dog,target,dt,sy,speed=285){
  const dx=target.x-dog.x,dy=(target.y-dog.y)*sy,distance=Math.hypot(dx,dy),step=Math.min(distance,speed*dt);
  dog.moving=step>.01;if(distance){dog.x+=dx*step/distance;dog.y+=dy*step/distance/sy;}
  return distance-step<.5;
}

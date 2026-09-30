import test from 'node:test';
import assert from 'node:assert/strict';
import {recordThrowSample,releaseVelocity,createPaperFlight,stepPaperFlight} from '../public/paper-physics.js';

function settle(s,h=1/60){for(let t=0;t<4&&s.motion!=='rest';t+=h)stepPaperFlight(s,h);assert.equal(s.motion,'rest');return s;}
test('release speed is time based and independent of pointer event frequency',()=>{
  const speeds=[];
  for(const interval of [1000/30,1000/60,1000/120]){
    const points=[];for(let t=0;t<200;t+=interval)recordThrowSample(points,{x:40+t*.5,y:280-t*.2},t);
    speeds.push(releaseVelocity(points,{x:140,y:240},200,2));
  }
  for(const v of speeds){assert.ok(Math.abs(v.x-500)<.001);assert.ok(Math.abs(v.y+400)<.001);}
});
test('holding still before release drops the roll instead of replaying an old flick',()=>{
  const points=[];recordThrowSample(points,{x:40,y:290},0);recordThrowSample(points,{x:140,y:230},100);
  assert.deepEqual(releaseVelocity(points,{x:140,y:230},240,2),{x:0,y:0});
  const s=settle(createPaperFlight({x:140,y:230},{x:0,y:0},{sy:2}));assert.equal(s.x,140);assert.equal(s.bounces,1);assert.equal(s.y,238);
});
test('a final change of direction determines the throw, not the whole drag',()=>{
  const points=[];for(const[t,x]of [[0,40],[100,250],[200,200],[250,160]])recordThrowSample(points,{x,y:250},t);
  assert.ok(releaseVelocity(points,{x:150,y:250},265).x<0);
});
test('the roll starts exactly at the hand and continues in its release direction',()=>{
  for(const direction of [-1,1]){
    const p={x:200,y:260},s=createPaperFlight(p,{x:direction*450,y:0});assert.deepEqual({x:s.x,y:s.y},p);
    stepPaperFlight(s,1/120);assert.ok((s.x-p.x)*direction>0);assert.ok(s.y<p.y,'A moving throw has a little lift');
  }
});
test('a stronger flick travels farther and a drop has no invented horizontal motion',()=>{
  const p={x:100,y:260};
  const slow=settle(createPaperFlight(p,{x:130,y:0})),fast=settle(createPaperFlight(p,{x:550,y:0})),drop=settle(createPaperFlight(p,{x:0,y:0}));
  assert.ok(fast.x-slow.x>70);assert.ok(slow.x>p.x+10);assert.equal(drop.x,p.x);
  assert.equal(fast.bounces,2,'One soft bounce, then a landing');assert.ok(fast.angle>slow.angle);
});
test('gravity rises, falls, bounces once and settles without an endless spring',()=>{
  const s=createPaperFlight({x:180,y:265},{x:220,y:-100},{sy:2});let rising=false,falling=false;let highest=s.z;
  for(let t=0;t<4;t+=1/120){const before=s.z;stepPaperFlight(s,1/120);rising||=s.z>before;falling||=s.z<before;highest=Math.max(highest,s.z);assert.ok(s.z>=0);}
  assert.ok(rising&&falling&&highest>20);assert.equal(s.motion,'rest');assert.equal(s.vx,0);assert.equal(s.vy,0);assert.equal(s.z,0);
});
test('throw distance and rest position agree at 30, 60 and 120 Hz',()=>{
  const states=[30,60,120].map(fps=>settle(createPaperFlight({x:200,y:250},{x:350,y:-120},{sy:2}),1/fps));
  for(const s of states){assert.ok(Math.abs(s.x-states[0].x)<.1);assert.ok(Math.abs(s.y-states[0].y)<.1);}
});
test('portrait depth does not change the screen-space strength of a flick',()=>{
  const velocities=[1,2].map(sy=>releaseVelocity([{x:100,y:260,t:0}],{x:125,y:260-25/sy},80,sy));
  assert.deepEqual(velocities[0],velocities[1]);
});
test('extreme releases are bounded and settle inside the fetch area',()=>{
  const velocity=releaseVelocity([{x:0,y:0,t:0}],{x:9999,y:-9999},10,2);assert.ok(Math.hypot(velocity.x,velocity.y)<=1100.001);
  for(const angle of [0,1,2,3,4,5]){
    const s=settle(createPaperFlight({x:200,y:210},{x:1100*Math.cos(angle),y:1100*Math.sin(angle)},{sy:2,home:{x:70,y:370}}));
    assert.ok(s.x>=18&&s.x<=382&&s.y>=184&&s.y<=376);
  }
});

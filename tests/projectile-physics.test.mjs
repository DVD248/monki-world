import test from 'node:test';
import assert from 'node:assert/strict';
import {launchShot,shotPoint,advanceShot,looseBody,advanceLooseBody} from '../public/projectile-physics.js';

test('the previewed arc and simulated gravity reach the same finger-selected point',()=>{
  for(const dt of [1/30,1/60,1/120]){
    const shot=launchShot({x:85,y:345,tx:280,ty:190});
    const midway=shotPoint(shot,shot.duration/2);
    assert.ok(midway.y<(345+190)/2,'the item should rise above a straight interpolation');
    while(!advanceShot(shot,dt)){}
    assert.ok(Math.abs(shot.x-280)<.001);assert.ok(Math.abs(shot.y-190)<.001);
    assert.ok(Math.abs(shotPoint(shot,shot.duration).y-shot.y)<.001);
  }
});

test('a missed item bounces, loses energy and settles on the floor',()=>{
  const shot=launchShot({x:85,y:345,tx:320,ty:100});
  while(!advanceShot(shot,1/60)){}
  const body=looseBody(shot);
  for(let i=0;i<240;i++)advanceLooseBody(body,1/60);
  assert.equal(body.y,390);assert.equal(body.vy,0);assert.ok(body.bounces>0&&body.bounces<=3);
  assert.ok(Math.abs(body.vx)<Math.abs(shot.vx));
});

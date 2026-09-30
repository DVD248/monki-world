import test from 'node:test';
import assert from 'node:assert/strict';
import {StackTower} from '../public/stack-physics.js';

function playDrop(tower,target,dt=1/60,followLandingGuide=false){
  let dropped=false;
  for(let i=0;i<1400;i++){
    const aim=followLandingGuide?tower.predictedX():tower.sourceX();
    if(!dropped&&tower.ready&&Math.abs(aim-target)<2){assert.equal(tower.drop(),true);dropped=true;}
    const events=tower.update(dt);
    const result=events.find(event=>['placed','collapse','miss'].includes(event.type));
    if(result&&dropped)return result;
  }
  throw new Error(`Could not drop near ${target}`);
}

test('centred pieces fall, land, wobble and build a real tower',()=>{
  const tower=new StackTower({item:'donut',goal:4});
  for(let height=1;height<=4;height++){
    const result=playDrop(tower,200,1/60,true);
    assert.equal(result.type,'placed');assert.equal(result.height,height);
    assert.equal(tower.blocks.length,height);
    assert.ok(tower.blocks.every(block=>Math.abs(block.angle)<.2));
  }
  assert.equal(tower.falls,0);
});

test('a later six-piece tower can keep building without a forced collapse',()=>{
  const tower=new StackTower({item:'mushroom',goal:6,difficulty:.9});
  for(let height=1;height<=6;height++){
    const result=playDrop(tower,200,1/60,true);
    assert.equal(result.type,'placed');
    assert.equal(result.height,height);
  }
  assert.equal(tower.blocks.length,6);
});

test('an off-centre landing tips only the unsupported part, with rotating debris',()=>{
  const tower=new StackTower({item:'teacup',goal:4});
  assert.equal(playDrop(tower,200).type,'placed');
  const result=playDrop(tower,232);
  assert.equal(result.type,'collapse');assert.equal(result.height,1);
  assert.equal(tower.blocks.length,1);assert.equal(tower.debris.length,1);
  assert.ok(Math.abs(tower.debris[0].omega)>0);
  assert.equal(tower.falls,1);
});

test('a complete miss keeps the built part and does not impose lives or a restart',()=>{
  const tower=new StackTower({item:'mushroom',goal:4});
  assert.equal(playDrop(tower,200).type,'placed');
  const result=playDrop(tower,310);
  assert.equal(result.type,'miss');assert.equal(tower.blocks.length,1);
  assert.equal(tower.misses,1);
  for(let i=0;i<60;i++)tower.update(1/60);
  assert.equal(tower.ready,true);
});

test('the same falling piece lands in the same place at 30, 60 and 120 Hz',()=>{
  const positions=[];
  for(const dt of [1/30,1/60,1/120]){
    const tower=new StackTower({item:'pizza',goal:4});
    assert.equal(tower.drop(),true);
    let result;
    for(let i=0;i<250&&!result;i++)result=tower.update(dt).find(event=>event.type==='placed');
    assert.ok(result);positions.push(tower.blocks[0].x);
  }
  assert.ok(Math.max(...positions)-Math.min(...positions)<.5);
});

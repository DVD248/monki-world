import test from 'node:test';
import assert from 'node:assert/strict';
import {JumpCourse,SkyJump,JUMP,jumpApex,jumpReach,jumpDifficulty,platformX,FoodDrop,DROP,dropDifficulty,ARCADE_GAMES,amount,zoneAt,JUMP_ZONES,DROP_ZONES} from '../shared/arcade.js';
import {createWorld,applyOperation} from '../shared/world.js';

const SEEDS=['a','b','c','d','e','f','g','h'];
const spine=course=>course.platforms.filter(p=>p.safe).sort((a,b)=>a.y-b.y);

test('every safe cloud is reachable from the one before, all the way up',()=>{
  for(const seed of SEEDS){
    const course=new JumpCourse(seed);course.extend(2500*JUMP.metre);
    const safe=spine(course);
    for(let i=1;i<safe.length;i++){
      const a=safe[i-1],b=safe[i],rise=b.y-a.y;
      assert.ok(rise>0&&rise<=jumpApex()*.86+1e-9,`${seed}: a ${rise.toFixed(1)}px gap at ${Math.round(b.y/JUMP.metre)} m`);
      const sideways=Math.abs(b.x-a.x)+(a.amp||0)+(b.amp||0);
      assert.ok(sideways<=jumpReach(rise)*.72+1e-6,`${seed}: ${sideways.toFixed(0)}px sideways at ${Math.round(b.y/JUMP.metre)} m`);
      assert.ok(b.x-b.amp-b.w/2>=0&&b.x+b.amp+b.w/2<=JUMP.width,`${seed}: cloud off screen at ${Math.round(b.y/JUMP.metre)} m`);
    }
  }
});

test('it gets harder with height, then levels off below the limit',()=>{
  const course=new JumpCourse('curve');course.extend(3000*JUMP.metre);
  const safe=spine(course),gapsIn=(from,to)=>{const g=[];for(let i=1;i<safe.length;i++)if(safe[i].y/JUMP.metre>=from&&safe[i].y/JUMP.metre<to)g.push(safe[i].y-safe[i-1].y);return g.reduce((s,v)=>s+v,0)/g.length;};
  const start=gapsIn(0,50),middle=gapsIn(250,350),top=gapsIn(2000,3000);
  assert.ok(start<middle&&middle<top,`gaps ${start.toFixed(0)} → ${middle.toFixed(0)} → ${top.toFixed(0)}`);
  assert.ok(top<jumpApex()*.86);
  assert.ok(Math.abs(jumpDifficulty(2000)-jumpDifficulty(3000))<.01,'the curve is flat at the top');
  const tricky=h=>course.platforms.filter(p=>p.y/JUMP.metre>=h&&p.y/JUMP.metre<h+300&&(p.type==='moving'||p.type==='fragile'||p.type==='fake')).length;
  assert.ok(tricky(0)<tricky(600),'moving, vanishing and rain clouds arrive with height');
});

/** A plain player: steer for the next safe cloud, where it will be on the way down. */
function climb(seed,goal){
  const game=new SkyJump(seed,{birds:false});let from=game.course.platforms[0];
  for(let frame=0;frame<60*60*12&&!game.over&&game.metres<goal;frame++){
    // Nothing below the bottom of the screen: after a spring or a balloon, the clouds you left are gone.
    const m=game.monki,floor=Math.max(from.y+1,game.cam-JUMP.body+12),next=spine(game.course).find(p=>p.y>floor&&!p.gone);
    let target=200;
    if(next){const disc=m.vy*m.vy+2*JUMP.gravity*(m.y-next.y),wait=disc>0?(m.vy+Math.sqrt(disc))/JUMP.gravity:0;target=platformX(next,game.time+wait);}
    game.step(1/60,target);
    for(const e of game.events.splice(0))if(e.type==='bounce'||e.type==='spring')from=game.course.platforms.find(p=>p.id===e.platform)||from;
  }
  return game.metres;
}

test('a steady player climbs past the point where it stops getting harder',()=>{
  const heights=SEEDS.slice(0,5).map(seed=>climb(seed,1200));
  assert.ok(heights.filter(h=>h>=1200).length>=4,`bot heights: ${heights.join(', ')}`);
});

test('birds, balloons and springs turn up; a bird is a bounce from above and a knock from below',()=>{
  const course=new JumpCourse('things');course.extend(1500*JUMP.metre);
  assert.ok(course.birds.length>0&&course.platforms.some(p=>p.spring!=null)&&course.platforms.some(p=>p.balloon!=null));
  assert.ok(course.birds.every(b=>b.y/JUMP.metre>150),'no birds in the first 150 m');
  const bird={id:999,x:200,y:400,amp:0,omega:0,phase:0,gone:false};
  const alone=(game,birds,platforms)=>{game.course.birds=birds;game.course.platforms=platforms;game.course.top=1e9;return game;};
  // From above, even when it flies into his side on the way down.
  const game=alone(new SkyJump('stomp'),[bird],[]);
  Object.assign(game.monki,{x:200,y:398,vy:-300});game.step(1/60,214);
  assert.equal(bird.gone,true);assert.ok(game.monki.vy>0,'bounced off it');assert.ok(game.events.some(e=>e.type==='stomp'));
  // From below: knocked back down, and caught by the cloud he jumped from.
  const hit=alone(new SkyJump('hit'),[{...bird,gone:false}],[{id:1,x:200,y:340,w:80,type:'cloud',amp:0}]);
  Object.assign(hit.monki,{x:200,y:370,vy:400});hit.step(1/60,200);
  assert.equal(hit.state,'bonk');assert.equal(hit.course.birds[0].gone,true,'the pigeon flies off');
  for(let i=0;i<120&&hit.state!=='play';i++)hit.step(1/60,200);
  assert.equal(hit.state,'play');assert.ok(hit.events.some(e=>e.type==='bounce'&&e.platform===1),'lands on the cloud below');
  // With nothing underneath, the knock is the end of the run.
  const fall=alone(new SkyJump('fall'),[{...bird,gone:false}],[]);fall.cam=300;
  Object.assign(fall.monki,{x:200,y:370,vy:400});
  for(let i=0;i<240&&!fall.over;i++)fall.step(1/60,200);
  assert.equal(fall.over,true);
});

test('pigeons are a setback, not a wall: walking into every one still gets past the top of the curve',()=>{
  const heights=SEEDS.map(seed=>{
    const game=new SkyJump(seed);let from=game.course.platforms[0],knocked=false;
    for(let frame=0;frame<60*60*20&&!game.over&&game.metres<1200;frame++){
      const m=game.monki,floor=Math.max(from.y+1,game.cam-JUMP.body+12),next=spine(game.course).find(p=>p.y>floor&&!p.gone);
      let target=200;
      if(next){const disc=m.vy*m.vy+2*JUMP.gravity*(m.y-next.y),wait=disc>0?(m.vy+Math.sqrt(disc))/JUMP.gravity:0;target=platformX(next,game.time+wait);}
      if(knocked&&!from.gone)target=platformX(from,game.time);// knocked back: onto the cloud underneath
      game.step(1/60,target);
      for(const e of game.events.splice(0)){if(e.type==='bounce'||e.type==='spring'){from=game.course.platforms.find(p=>p.id===e.platform)||from;knocked=false;}if(e.type==='hit')knocked=true;}
    }
    return game.metres;
  });
  assert.ok(heights.filter(h=>h>=1200).length>=5,`heights with pigeons: ${heights.join(', ')}`);
});

test('a rain cloud just above a real one does not let Monki through the real one',()=>{
  const game=new SkyJump('rain');
  game.course.platforms=[{id:1,x:200,y:1000,w:80,type:'cloud',amp:0},{id:2,x:200,y:1003,w:80,type:'fake',amp:0}];
  game.course.top=1e9;game.course.birds=[];Object.assign(game.monki,{x:200,y:1006,vy:-1400});game.cam=900;game.high=1300;
  for(let i=0;i<30&&!game.over;i++)game.step(1/120,200);
  assert.deepEqual(game.events.filter(e=>['crack','bounce'].includes(e.type)).map(e=>e.type),['crack','bounce']);
  assert.equal(game.over,false);
});

test('a pigeon never reaches a player bouncing on a cloud, only one jumping up into it',()=>{
  // Standing on a cloud, Monki fills [y, y + body]; a pigeon fills [y - 9, y + 11].
  const touches=(cloud,bird)=>cloud.y<=bird.y+11&&cloud.y+JUMP.body>=bird.y-9;
  let birds=0;
  for(const seed of SEEDS){
    const course=new JumpCourse(seed);course.extend(2500*JUMP.metre);birds+=course.birds.length;
    for(const bird of course.birds){
      const crowded=course.platforms.filter(p=>touches(p,bird));
      assert.deepEqual(crowded.map(p=>p.type),[],`${seed}: a cloud in the pigeon's way at ${Math.round(bird.y/JUMP.metre)} m`);
    }
  }
  assert.ok(birds>100,'pigeons still turn up');
});

test('falling below the screen ends a jump run; the camera never goes down',()=>{
  const game=new SkyJump('fall');let lowest=Infinity,cam=0;
  for(let i=0;i<60*20&&!game.over;i++){game.step(1/60,i<200?200:0);assert.ok(game.cam>=cam);cam=game.cam;lowest=Math.min(lowest,game.monki.y);}
  assert.ok(game.metres>=0);
  const lost=new SkyJump('lost');lost.cam=1000;lost.monki.y=1000-JUMP.body-1;lost.monki.vy=-100;lost.step(1/60);
  assert.equal(lost.over,true);
});

test('each snack can be reached from the one before, and frogs keep clear of them',()=>{
  for(const seed of SEEDS){
    const game=new FoodDrop(seed);const seen=new Map();
    game.lives=Infinity;game.score=0;
    for(let i=0;i<60*400;i++){
      // Score climbs as if every snack were eaten, so the late game is generated too.
      game.step(1/60,null);for(const it of game.items)if(!seen.has(it.id))seen.set(it.id,it);
      game.score=Math.floor(game.time*1.2);game.events.length=0;
    }
    const all=[...seen.values()],wanted=all.filter(i=>!i.bad).sort((a,b)=>a.land-b.land);
    assert.ok(dropDifficulty(game.score)>.99,'reached the top of the curve');
    for(let i=1;i<wanted.length;i++){
      const a=wanted[i-1],b=wanted[i];
      assert.ok(Math.abs(b.lx-a.lx)<=DROP.speed*.7*(b.land-a.land)+DROP.mouth*.8+1e-6,`${seed}: snack ${b.id} out of reach`);
    }
    let crowded=0;
    for(const frog of all.filter(i=>i.bad))for(const snack of all.filter(i=>i.need))if(Math.abs(frog.land-snack.land)<.4&&Math.abs(frog.lx-snack.lx)<80)crowded++;
    assert.ok(crowded<=all.length*.01,`${seed}: ${crowded} frogs right beside a snack`);
    assert.ok(all.every(i=>i.lx>=30&&i.lx<=370));
  }
});

/** A plain player for Food Drop: go to where the next snack lands; step aside from a frog about to land on you. */
function feed(seed,goal){
  const game=new FoodDrop(seed);
  for(let frame=0;frame<60*60*20&&!game.over&&game.score<goal;frame++){
    const falling=game.items.filter(i=>i.state==='fall').sort((a,b)=>a.land-b.land);
    const next=falling.find(i=>!i.bad);let target=next?next.lx:game.x;
    const frog=falling.find(i=>i.bad&&i.land-game.time<.25&&Math.abs(i.lx-target)<DROP.mouth+14);
    if(frog)target=frog.lx+(target<frog.lx?-1:1)*(DROP.mouth+20);
    game.step(1/60,target);game.events.length=0;
  }
  return game.score;
}

test('Food Drop: a steady player keeps going long after it stops speeding up',()=>{
  const scores=SEEDS.slice(0,5).map(seed=>feed(seed,400));
  assert.ok(scores.filter(s=>s>=400).length>=4,`bot scores: ${scores.join(', ')}`);
});

test('Food Drop costs a heart for a dropped snack or an eaten frog, and ends at none',()=>{
  const first=new FoodDrop('first');
  for(let i=0;i<60*20&&!first.eaten;i++)first.step(1/60,null);
  assert.equal(first.lives,DROP.lives,'nothing is lost before the first snack');
  assert.ok(first.events.some(e=>e.type==='miss'&&e.free));
  const game=new FoodDrop('lives');game.eaten=1;
  for(let i=0;i<60*60&&!game.over;i++){game.step(1/60,20);}
  assert.equal(game.over,true);assert.equal(game.lives,0);
  assert.ok(game.events.some(e=>e.type==='miss'));
});

test('a new best reaches the other one as a single line, the latest only',()=>{
  let world=createWorld('arcade',1000);let n=0;const op=(actor,type,fields={})=>{world=applyOperation(world,{id:`t${++n}`,actor,type,...fields},1000+n);};
  op('david','arcadeBest',{game:'jump',score:12});
  assert.equal(world.arcade.david.jump,12);assert.equal(world.log.filter(e=>e.action?.startsWith('arcade')).length,0,'too small to mention');
  op('david','arcadeBest',{game:'jump',score:40});op('david','arcadeBest',{game:'jump',score:30});
  assert.equal(world.arcade.david.jump,40,'a worse run changes nothing');
  op('david','arcadeBest',{game:'jump',score:90});
  const mine=world.log.filter(e=>e.who==='david'&&e.game==='jump');
  assert.equal(mine.length,1);assert.equal(mine[0].count,90);assert.equal(mine[0].action,'arcade');assert.equal(mine[0].target,'monki');
  op('julia','arcadeBest',{game:'jump',score:120});
  assert.equal(world.log[0].action,'arcadePass');assert.equal(world.log[0].who,'julia');
  op('david','answer',{target:world.log[0].id,line:'Julia beat David at Sky Jump: 120 metres.'});
  assert.throws(()=>applyOperation(world,{id:'bad1',actor:'david',type:'arcadeBest',game:'pong',score:3}),/Unknown game/);
  for(const game of ['constructor','__proto__','toString','hasOwnProperty'])assert.throws(()=>applyOperation(world,{id:'bad-'+game,actor:'david',type:'arcadeBest',game,score:30}),/Unknown game/);
  assert.throws(()=>applyOperation(world,{id:'bad2',actor:'david',type:'arcadeBest',game:'drop',score:-1}),/Invalid/);
  assert.throws(()=>applyOperation(world,{id:'bad3',actor:'david',type:'arcadeBest',game:'drop',score:1e9}),/Invalid/);
});

test('names and zones',()=>{
  assert.equal(amount('jump',1),'1 metre');assert.equal(amount('drop',84),'84 snacks');
  assert.equal(zoneAt(JUMP_ZONES,0)[1],'The garden');assert.equal(zoneAt(JUMP_ZONES,1000)[1],'The moon');
  assert.deepEqual(Object.keys(ARCADE_GAMES).slice(0,2),['jump','drop']);
});

test('the test lab can start either game at any stage, standing on something',()=>{
  for(const seed of SEEDS)for(const [from,name] of JUMP_ZONES){
    const game=new SkyJump(seed,{start:from}),m=game.monki,under=game.course.platforms.find(p=>p.y===m.y&&p.x===m.x);
    assert.equal(zoneAt(JUMP_ZONES,game.metres)[1],name,`${seed}: ${game.metres} m`);assert.ok(game.metres<from+80,`${seed} ${name}: ${game.metres} m`);
    assert.ok(from===0?under?.type==='ground':under?.type==='cloud'&&under.spring==null&&under.balloon==null,`${seed} ${name}: starts on a still cloud`);
    const zones=[];for(let i=0;i<120*1.2;i++){game.step(1/120);zones.push(...game.events.splice(0).filter(e=>e.type==='zone').map(e=>e.name));}
    assert.equal(zones[0]??'The garden',name);assert.ok(!game.over&&game.metres>=from,`${seed} ${name}: lands back on it`);
  }
  for(const [from,name] of DROP_ZONES){const game=new FoodDrop('lab',{start:from});game.step(1/60);assert.equal(game.score,from);assert.equal(DROP_ZONES[game.zone][1],name);}
  assert.equal(new SkyJump('same').course.platforms.length,new SkyJump('same',{start:0}).course.platforms.length,'a normal run is unchanged');
});

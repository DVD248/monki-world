import test from 'node:test';
import assert from 'node:assert/strict';
import {ARCADE_GAMES,bragLine,zoneAt} from '../shared/arcade.js';
import {DriveRun,DRIVE,DRIVE_ZONES,Terrain,driveDifficulty,driveSlope,driveCanGap} from '../shared/arcade-drive.js';
import {JetRun,JET,JET_ZONES,gapY} from '../shared/arcade-jet.js';
import {CliffRun,CLIFF,CLIFF_ZONES,cliffCharge,cliffHeight} from '../shared/arcade-cliff.js';
import {HopRun,HOP,HOP_ZONES,padX,padUnder,padSoon} from '../shared/arcade-hop.js';
import {FallRun,FALL,FALL_ZONES} from '../shared/arcade-fall.js';
import {MatchRun,MATCH,MATCH_ZONES,matchBonus} from '../shared/arcade-match.js';
import {StackRun,STACK,STACK_ZONES} from '../shared/arcade-stack.js';
import {CandleRun,CANDLES,CANDLES_ZONES,cakeFor,apart} from '../shared/arcade-candles.js';
import {SnakeRun,SNAKE,SNAKE_ZONES,DIRS} from '../shared/arcade-snake.js';
import {MergeRun,MERGE,MERGE_ZONES,MERGE_DIRS,mergeKind} from '../shared/arcade-merge.js';
import {seeded} from '../shared/arcade.js';
import {createWorld,applyOperation} from '../shared/world.js';

// The six later games. Each promises what Sky Jump and Food Drop promise: harder as you go,
// levelling off, and never a wall. Plain bots play each one to show that the promise holds,
// and slower bots show that the top of the curve is still a test.
const SEEDS=['a','b','c','d','e','f','g','h'];
const STEP=1/120;
const run=(game,bot,{seconds=600,until=()=>false}={})=>{for(let i=0;i<seconds/STEP&&!game.over&&!until(game);i++)game.step(STEP,bot(game,i));return game;};

// ---------------------------------------------------------------- Jet Monki
const RISE=JET.flap**2/(2*JET.gravity);
/** Taps to hold the bottom of the way through when the next one is lower, like a person. */
function jetBot(g){
  if(g.state==='ready')return {taps:[{}]};
  const mx=g.dist+JET.x,[cur,next]=g.columns.filter(c=>c.x+JET.col/2>mx-JET.hitW),peak=.32;
  const band=(c,t)=>{const hi=Math.max(gapY(c,t),gapY(c,t+peak)),lo=Math.min(gapY(c,t),gapY(c,t+peak));return [hi-c.gap/2+JET.hitH+RISE+10,lo+c.gap/2-JET.hitH-8];};
  const [lo,hi]=band(cur,g.time),inside=mx+JET.hitW>cur.x-JET.col/2-30;
  const [nlo,nhi]=next?band(next,g.time+(next.x-mx)/g.speed):[lo,hi],want=inside?(nlo+nhi)/2:gapY(cur,g.time)+cur.gap*.1;
  const target=Math.min(hi,Math.max(lo,want)),tap=g.y>target&&g.vy>-60&&g.time-(g.lastTap??-1)>.1;
  if(tap)g.lastTap=g.time;return {taps:tap?[{}]:[]};
}
test('Jet Monki: a steady tapper gets through every pair, all the way up the curve',()=>{
  for(const seed of SEEDS.slice(0,6)){const g=run(new JetRun(seed),jetBot,{until:g=>g.score>=300});assert.ok(g.score>=300,`${seed}: ${g.score}`);}
});
/** Flies like a person: the middle of the way through, leaning towards the next one near the
 * end, and every tap a little early or late (`jitter` seconds, one standard deviation). */
const jetPerson=(jitter,seed)=>{const r=seeded('taps'+seed);let at=null,last=-1;return g=>{
  if(g.state==='ready')return {taps:[{}]};
  const mx=g.dist+JET.x,[cur,next]=g.columns.filter(c=>c.x+JET.col/2>mx-JET.hitW),seen=c=>gapY(c,g.time+Math.max(0,(c.x-mx)/g.speed));
  let target=seen(cur);if(next&&cur.x-JET.col/2-JET.hitW-mx<g.speed*.45)target+=Math.max(-cur.gap*.15,Math.min(cur.gap*.15,(seen(next)-target)*.3));
  const la=.04,py=g.y+g.vy*la+JET.gravity*la*la/2;
  if(at===null&&py>target+RISE*.35&&g.time-last>.12){last=g.time;at=g.time+Math.max(0,.04+(r()+r()+r()-1.5)*jitter*2);}
  if(at!==null&&g.time>=at){at=null;return {taps:[{}]};}return {taps:[]};};};
test('Jet Monki: taps a few hundredths of a second off still get a long way',()=>{
  // The ways through used to be sized for a perfect tapper, and a person's runs ended at a
  // dozen or so. Off by 0.045 s a tap, every run now gets well into the storm.
  for(const seed of SEEDS){const g=run(new JetRun(seed),jetPerson(.045,seed),{until:g=>g.score>=40});assert.ok(g.score>=40,`${seed}: ${g.score}`);}
});
test('Jet Monki: nothing comes at him before the first tap, and the ways through narrow to a floor',()=>{
  const g=new JetRun('wait');for(let i=0;i<600;i++)g.step(STEP,{taps:[]});
  assert.equal(g.state,'ready');assert.equal(g.dist,0);assert.ok(!g.over);
  const late=new JetRun('late',{start:400});late.lastX=0;late.columns=[];for(let i=0;i<200;i++)late.addColumn();
  assert.ok(late.columns.every(c=>c.gap>=140&&c.cy-c.gap/2-c.amp>JET.top&&c.cy+c.gap/2+c.amp<JET.ground),'every way through fits on the screen');
  const early=new JetRun('early');assert.ok(early.columns[0].gap>190,'the first ones are wide');
});
test('Jet Monki: a chimney, a cloud and the roofs each end the run',()=>{
  const g=new JetRun('fall');g.step(STEP,{taps:[{}]});run(g,()=>({taps:[]}),{seconds:10});
  assert.ok(g.over);assert.ok(['ground','chimney','cloud'].includes(g.events.find(e=>e.type==='crash').what));
});

// ---------------------------------------------------------------- Fall Down
/** Keeps a finger over the next hole down, `delay` seconds behind what it sees. */
const fallBot=(delay=0)=>{const seen=[];return g=>{const next=g.floors.find(f=>f.y>=g.y-1&&!f.passed);seen.push(next?next.hole:200);return {target:seen[Math.max(0,seen.length-1-Math.round(delay/STEP))]};};};
test('Fall Down: a quick finger outlasts the fastest floors, from the top and from deep down',()=>{
  for(const seed of SEEDS.slice(0,4))for(const start of [0,200]){const g=run(new FallRun(seed,{start}),fallBot(),{seconds:240});assert.ok(!g.over,`${seed} from ${start}: out at ${g.score}`);}
});
test('Fall Down: at the bottom of the curve a slow finger is caught by the roots',()=>{
  let caught=0;for(const seed of SEEDS){const g=run(new FallRun(seed,{start:200}),fallBot(.4),{seconds:240});if(g.over)caught++;}
  assert.ok(caught>=6,`a 0.4 s finger was caught in ${caught} of 8`);
});
test('Fall Down: the bottom of the screen holds him, and every hole fits him',()=>{
  const g=new FallRun('bottom');run(g,g=>({target:g.floors[0].hole}),{seconds:20});
  assert.ok(g.y<=FALL.floor+.01);
  const late=new FallRun('late',{start:500});for(let i=0;i<300;i++)late.addFloor(0);
  assert.ok(late.floors.every(f=>f.w>FALL.halfW*2+20&&f.hole-f.w/2>0&&f.hole+f.w/2<FALL.width));
});

// ---------------------------------------------------------------- Cliff Jump
/** Holds for exactly the leap that lands in the middle of the next rock, give or take. */
const cliffBot=(error=0)=>{const r=seeded('hand'+error);let want=0;return g=>{
  if(g.state==='stand'){const next=g.rocks[g.rocks.indexOf(g.on)+1];want=cliffCharge(next.x+next.w/2-g.x,next.h-g.on.h)*(1+(r()*2-1)*error);return {held:true};}
  if(g.state==='charge')return {held:(g.time-g.chargeAt+STEP)/CLIFF.charge<=want};return {held:false};};};
test('Cliff Jump: the middle of every rock can be reached, and the leap to it clears the near edge',()=>{
  for(const seed of SEEDS){const g=new CliffRun(seed,{start:0});while(g.rocks.length<400)g.addRock();
    for(let i=1;i<g.rocks.length;i++){const a=g.rocks[i-1],b=g.rocks[i],rise=b.h-a.h;
      for(const from of [a.x+CLIFF.feet,a.x+a.w-CLIFF.feet]){const c=cliffCharge(b.x+b.w/2-from,rise);assert.ok(c!==null,`${seed} rock ${i}`);assert.ok(cliffHeight(c,b.x-CLIFF.feet-from)>=rise+8,`${seed} rock ${i} edge`);}}}
});
test('Cliff Jump: a steady hand goes on for ever; a rough one falls in at the top of the curve',()=>{
  for(const seed of SEEDS){const g=run(new CliffRun(seed),cliffBot(),{seconds:3600,until:g=>g.count>=300});assert.ok(g.count>=300,`${seed}: ${g.count}`);}
  let wet=0;for(const seed of SEEDS){const g=run(new CliffRun(seed,{start:120}),cliffBot(.14),{seconds:3600,until:g=>g.count>=420});if(g.over)wet++;}
  assert.ok(wet>=6,`a ±14% judge of distance fell in ${wet} of 8 times`);
});
test('Cliff Jump: a Perfect is worth two, then three in a row; a hop on the spot is worth nothing',()=>{
  const g=run(new CliffRun('perfect'),cliffBot(),{until:g=>g.count>=3});assert.equal(g.score,2+3+3);
  const same=new CliffRun('same');same.step(STEP,{held:true});same.step(STEP,{held:false});run(same,()=>({held:false}),{until:g=>g.state==='stand'});
  assert.equal(same.score,0);assert.ok(same.events.some(e=>e.type==='same'));
});

// ---------------------------------------------------------------- Water Hop
/** Forward to a pad that will not carry him off soon; along or back if there is none. */
function hopChoose(g,lead=.12){
  const safeFor=(row,x)=>row.kind==='bank'?99:(row.dir>0?HOP.width-HOP.edge-x:x-HOP.edge)/row.speed;
  let best=null,score=-1e9;
  for(const dr of [1,0,-1]){const row=g.rowAt(g.row+dr);if(!row||g.row+dr<g.base)continue;const y=HOP.base-((g.row+dr)*HOP.row-g.cam);
    if(row.kind==='bank'){if(dr&&dr*10+5>score){score=dr*10+5;best={x:g.x,y};}continue;}
    for(const p of row.pads){const px=padX(row,p,g.time+lead);if([0,lead,lead+HOP.hop,lead+HOP.hop+.5].some(k=>padUnder(row,p,g.time+k)))continue;
      const lo=Math.max(px-p.w/2+10,20),hi=Math.min(px+p.w/2-10,HOP.width-20);if(lo>hi)continue;const lx=Math.min(hi,Math.max(lo,g.x));if(Math.abs(lx-g.x)>HOP.reach-8)continue;
      const safe=safeFor(row,lx);if(safe<.7)continue;const s=dr*10+Math.min(safe,3)-(dr===0?6:0);if(s>score){score=s;best={x:lx,y};}}}
  if(g.on&&safeFor(g.rowAt(g.row),g.x)>1.4&&score<10)return null;
  return best;
}
const hopBot=(think=.15)=>{let wait=think;return g=>{if(g.hop)return {taps:[]};wait-=STEP;if(wait>0)return {taps:[]};const c=hopChoose(g,think/2);if(c)wait=think;return {taps:c?[c]:[]};};};
test('Water Hop: no gap in any row is wider than a hop, all the way round',()=>{
  const g=new HopRun('gaps');for(let n=1;n<600;n++)g.addRow(g.rows.at(-1).n+1);
  for(const row of g.rows){if(row.kind==='bank')continue;const edges=row.pads.map(p=>[p.x0-p.w/2,p.x0+p.w/2]).sort((a,b)=>a[0]-b[0]);
    for(let i=0;i<edges.length;i++){const next=i+1<edges.length?edges[i+1][0]:edges[0][0]+HOP.width+HOP.margin*2;assert.ok(next-edges[i][1]<=HOP.reach*2-40+1e-9,`row ${row.n}`);}}
});
test('Water Hop: a quick player crosses a long way; carried off the side, into the water he goes',()=>{
  const far=SEEDS.map(seed=>run(new HopRun(seed),hopBot(),{seconds:900}).score);
  assert.ok(far.filter(n=>n>=100).length>=6,`rows reached: ${far.join(' ')}`);
  const g=new HopRun('carried');run(g,g=>g.row===0?{taps:[{x:g.x,y:HOP.base-(HOP.row-g.cam)}]}:{taps:[]},{seconds:30});
  assert.ok(g.over);assert.ok(['carried','splash','behind','dive'].includes(g.events.find(e=>e.type==='splash').how));
});
test('Water Hop: a diving pad shivers for the whole warning before it goes under',()=>{
  const g=new HopRun('dive',{start:120});for(let n=g.rows.at(-1).n+1;n<400;n++)g.addRow(n);
  const rows=g.rows.filter(r=>r.kind==='sink');assert.ok(rows.length>10);let dives=0;
  for(const row of rows)for(const pad of row.pads)for(let t=0;t<12;t+=1/60){
    if(padUnder(row,pad,t)||!padUnder(row,pad,t+1/60))continue;dives++;
    for(let k=1/60;k<HOP.warn-1e-6;k+=1/60)assert.ok(padSoon(row,pad,t+1/60-k),`row ${row.n}: still ${k.toFixed(2)} s before it dives`);
  }
  assert.ok(dives>20);
});
test('Water Hop: the river waits for the first hop, then rises',()=>{
  const g=new HopRun('wait');run(g,()=>({taps:[]}),{seconds:20});assert.ok(!g.over);assert.equal(g.cam,0);
  const bank=g.rowAt(0);assert.equal(bank.kind,'bank');
});

// ---------------------------------------------------------------- Match Tap
function matchPick(g){for(let c=0;c<MATCH.cols;c++)for(let r=0;r<MATCH.rows;r++)if(g.grid[c][r].kind==='star'||g.group(c,r).length>=MATCH.min)return MatchRun.centre(c,r);return null;}
const matchBot=think=>{let wait=0;return g=>{wait-=STEP;if(wait>0||!g.resting)return {taps:[]};const p=matchPick(g);if(!p)return {taps:[]};wait=think;return {taps:[p]};};};
test('Match Tap: a settled shelf always has something to tap',()=>{
  for(const seed of SEEDS){const g=new MatchRun(seed);run(g,matchBot(.3),{seconds:120,until:g=>g.over});
    const s=new MatchRun(seed);for(let i=0;i<200;i++){s.step(STEP,{taps:[]});}assert.ok(s.resting&&s.hasMove(),seed);}
  const flat=new MatchRun('flat');for(const col of flat.grid)for(const [r,t] of col.entries())t.kind=['fish','pizza'][(r+flat.grid.indexOf(col))%2];
  assert.ok(!flat.hasMove());flat.settle();assert.ok(flat.hasMove(),'a shelf with nothing to tap is shaken up');
});
test('Match Tap: quick hands keep the clock going; slow ones run out',()=>{
  for(const seed of SEEDS.slice(0,4)){assert.ok(!run(new MatchRun(seed),matchBot(.5),{seconds:300}).over,`${seed} at 0.5 s a move`);}
  for(const seed of SEEDS.slice(0,4)){const g=run(new MatchRun(seed),matchBot(1.5),{seconds:600});assert.ok(g.over,`${seed} at 1.5 s a move`);assert.ok(g.score>150);}
});
test('Match Tap: tapping anywhere runs the clock out; a miss costs a second once it runs',()=>{
  // Five taps a second at random, as a finger mashing the shelf would. It used to keep the
  // clock going nearly as well as looking did.
  const mash=seed=>{const r=seeded('mash'+seed);let wait=0;return ()=>{wait-=STEP;if(wait>0)return {taps:[]};wait=.2;return {taps:[{x:MATCH.x0+r()*MATCH.cols*MATCH.cell,y:MATCH.y0+r()*MATCH.rows*MATCH.cell}]};};};
  for(const seed of SEEDS.slice(0,4)){
    const random=run(new MatchRun(seed),mash(seed),{seconds:120}),looking=run(new MatchRun(seed),matchBot(1),{seconds:300});
    assert.ok(random.over&&random.time<30,`${seed}: mashing lasted ${random.time.toFixed(0)} s`);
    assert.ok(looking.time>random.time*3,`${seed}: ${looking.time.toFixed(0)} s looking, ${random.time.toFixed(0)} s mashing`);
  }
  const g=new MatchRun('miss');run(g,()=>({taps:[]}),{seconds:3});
  g.step(STEP,{taps:[matchPick(g)]});assert.equal(g.state,'play');run(g,()=>({taps:[]}),{seconds:2});
  let lone=null;for(let c=0;c<MATCH.cols&&!lone;c++)for(let r=0;r<MATCH.rows&&!lone;r++)if(g.grid[c][r].kind!=='star'&&g.group(c,r).length<MATCH.min)lone=MatchRun.centre(c,r);
  const before=g.clock;g.step(STEP,{taps:[lone]});assert.ok(Math.abs(before-g.clock-MATCH.miss)<.05,`${(before-g.clock).toFixed(2)} s`);
  assert.ok(matchBonus(3,0)<1&&matchBonus(5,0)>2*matchBonus(4,0)*.8,'three is worth little, five a lot');
});
test('Match Tap: two do nothing, seven leave a star, and a star takes its row and column',()=>{
  const g=new MatchRun('rules');run(g,()=>({taps:[]}),{seconds:3});
  for(const col of g.grid)for(const [r,t] of col.entries())t.kind=['fish','pizza','donut'][(r+g.grid.indexOf(col))%3];
  g.grid[0][9].kind=g.grid[1][9].kind='icecream';g.grid[2][9].kind='carrot';
  let p=MatchRun.centre(0,9);g.step(STEP,{taps:[p]});assert.equal(g.score,0);assert.ok(g.events.some(e=>e.type==='nope'));assert.equal(g.state,'ready','the clock waits');
  for(let c=0;c<7;c++)g.grid[c][9].kind='icecream';p=MatchRun.centre(3,9);g.step(STEP,{taps:[p]});
  assert.equal(g.score,7);assert.equal(g.grid[3][9].kind,'star');assert.equal(g.state,'play');
  run(g,()=>({taps:[]}),{until:g=>g.resting,seconds:5});
  const before=g.score;g.step(STEP,{taps:[MatchRun.centre(3,9)]});assert.equal(g.score-before,MATCH.cols+MATCH.rows-1);
});

// ---------------------------------------------------------------- Pancake Stack
/** Taps when the pancake will be over the one below, off by `sigma` seconds (one standard
 * deviation), as a person's finger is. */
const stackBot=(sigma=0,seed='hand')=>{const r=seeded('stack'+seed+sigma);let plan=null;return g=>{
  const s=g.slider;if(!plan||plan.n!==s.n)plan={n:s.n,at:g.time+Math.abs(s.x-g.top.x)/s.speed+(r()+r()+r()-1.5)*2*sigma};
  if(g.time>=plan.at){plan.at=Infinity;return {taps:[{}]};}return {taps:[]};};};
test('Pancake Stack: dead on loses nothing, an overhang is cut off, and off the edge it falls',()=>{
  const g=new StackRun('rules');const w=g.top.w;assert.equal(g.slider.w,STACK.start);
  const drop=dx=>{g.slider.x=g.top.x+dx;g.step(STEP,{taps:[{}]});return g.events.splice(0);};
  let e=drop(3);assert.ok(e.some(x=>x.type==='place'&&x.perfect));assert.equal(g.top.w,STACK.start);assert.equal(g.score,1);
  e=drop(30);assert.ok(e.some(x=>x.type==='trim'&&x.w===30&&x.side===1));assert.equal(g.top.w,STACK.start-30);assert.equal(g.streak,0);
  assert.equal(g.slider.w,g.top.w,'the next one is as wide as what was left');assert.notEqual(g.slider.dir,0);
  e=drop(-g.top.w-2);assert.ok(g.over);assert.ok(e.some(x=>x.type==='miss'));assert.equal(g.score,2);assert.ok(w>0);
  // Nothing happens until a tap: the pancake waits, sliding.
  const idle=run(new StackRun('idle'),()=>({taps:[]}),{seconds:60});assert.ok(!idle.over);assert.equal(idle.score,0);
});
test('Pancake Stack: Perfects in a row grow it back, never past its first width',()=>{
  const g=new StackRun('grow');const drop=dx=>{g.slider.x=g.top.x+dx;g.step(STEP,{taps:[{}]});};
  drop(40);const narrow=g.top.w;drop(0);assert.equal(g.top.w,narrow,'one Perfect keeps it');
  drop(0);assert.equal(g.top.w,narrow+STACK.grow,'the second in a row grows it');
  for(let i=0;i<30;i++)drop(0);assert.equal(g.top.w,STACK.start);
});
test('Pancake Stack: a steady hand goes on and on; a rough one runs out, but not at once',()=>{
  for(const seed of SEEDS.slice(0,4)){const g=run(new StackRun(seed),stackBot(.015,seed),{seconds:600});assert.ok(!g.over,`${seed}: a steady hand fell at ${g.score}`);}
  const rough=SEEDS.map(seed=>run(new StackRun(seed),stackBot(.055,seed),{seconds:600}));
  assert.ok(rough.every(g=>g.over),'a rough hand ends');
  assert.ok(rough.every(g=>g.score>=15),`even a rough hand gets a little tower: ${rough.map(g=>g.score).join(' ')}`);
  // Faster later, but only up to a point.
  const late=new StackRun('late',{start:400});assert.ok(late.slider.speed<=280&&late.slider.speed>new StackRun('early').slider.speed);
});

// ---------------------------------------------------------------- Candle Cake
/** Waits until a candle thrown now would land well clear of the others, judging the spin as a
 * person does (how fast, and whether it is speeding up or slowing down), then taps up to
 * `sigma` seconds off. Picky at first, less so the longer it waits. */
const candlesBot=(sigma=0,seed='hand',{greed=.85,patience=2.5}={})=>{
  const r=seeded('cake'+seed+sigma),TAU=Math.PI*2,flight=(CANDLES.from-CANDLES.len/2-(CANDLES.cy+CANDLES.r))/CANDLES.speed;let at=null,since=0;
  return g=>{
    if(g.state==='play'&&!g.flying&&at===null){
      const w=g.spin(g.ct),acc=(g.spin(g.ct+.05)-g.spin(g.ct-.05))/.1,h=flight+.02,land=((g.bottom-(w*h+acc*h*h/2))%TAU+TAU)%TAU;
      const blocks=g.items.filter(it=>it.kind!=='berry'),clear=a=>blocks.length?Math.min(...blocks.map(it=>apart(it.a,a))):Math.PI;
      let best=0;for(let i=0;i<72;i++)best=Math.max(best,clear(i/72*TAU));
      since+=STEP;if(clear(land)>=Math.max(CANDLES.gap+.05,Math.min(best*greed,Math.PI/2)*Math.exp(-since/patience))){at=g.time+Math.max(0,(r()+r()+r()-1.5)*2*sigma);since=0;}
    }
    if(at!==null&&g.time>=at){at=null;return {taps:[{}]};}return {taps:[]};};};
test('Candle Cake: a candle goes in where the edge is at the bottom; too close to another, it bounces off',()=>{
  const g=new CandleRun('rules');assert.equal(g.items.length,0,'the first cake is bare');
  const throwNow=()=>{g.step(STEP,{taps:[{}]});run(g,()=>({taps:[]}),{until:g=>!g.flying,seconds:1});return g.events.splice(0);};
  const a=g.bottom;let e=throwNow();const stuck=e.find(x=>x.type==='stick');assert.ok(stuck);assert.equal(g.score,1);
  assert.ok(apart(stuck.a,a)<.25,'near where the bottom was when it left');assert.equal(g.cake.left,g.cake.need-1);
  // Line the cake up so the bottom is right on that candle, and throw again.
  g.rot=Math.PI/2-stuck.a-g.spin(g.ct)*.09;e=throwNow();assert.ok(g.over,'into a candle: the end');assert.ok(e.some(x=>x.type==='clink'));assert.equal(g.score,1);
  // A cake is done when its last candle is in; the next one comes after a moment.
  const h=new CandleRun('done');h.cake.left=1;h.step(STEP,{taps:[{}]});run(h,()=>({taps:[]}),{until:g=>g.state!=='play',seconds:1});
  assert.equal(h.state,'between');assert.ok(h.events.some(x=>x.type==='cake'));run(h,()=>({taps:[]}),{seconds:CANDLES.pause+.1});
  assert.equal(h.state,'play');assert.equal(h.k,1);assert.ok(h.events.some(x=>x.type==='newcake'));
});
test('Candle Cake: every cake leaves room, the trickier spins come one by one, and every fifth is big',()=>{
  for(let k=0;k<400;k++){const c=cakeFor(k);assert.ok(c.need+c.pre<=CANDLES.crowd,`cake ${k}`);assert.equal(c.big,k%5===4);assert.ok(c.speed<=3.6);}
  // Spread round the whole edge, so a spot for the last candle is a matter of timing, never of luck.
  const seen=new Set();for(const seed of SEEDS)for(const start of [0,30,80,200]){const g=new CandleRun(seed,{start});seen.add(g.cake.kind);
    const pre=g.items.filter(it=>it.kind==='pre');for(let i=0;i<pre.length;i++)for(let j=i+1;j<pre.length;j++)assert.ok(apart(pre[i].a,pre[j].a)>=.8);}
  assert.ok(seen.has('steady')&&seen.size>=3,[...seen].join(' '));
  const early=new CandleRun('first');assert.equal(early.cake.kind,'steady');
  // Swings and flips still go round: no part of the edge is out of reach.
  for(const kind of ['swing','flip','stopgo','pulse']){const g=new CandleRun('turn');g.cake.kind=kind;let turned=0;for(let t=0;t<20;t+=STEP)turned+=g.spin(t)*STEP;assert.ok(Math.abs(turned)>Math.PI*2,`${kind} turned ${turned.toFixed(1)}`);}
});
test('Candle Cake: a steady hand gets through cake after cake; a hurried one is caught, but not at once',()=>{
  const cakes=g=>g.k;
  const steady=SEEDS.map(seed=>run(new CandleRun(seed),candlesBot(.018,seed,{greed:.9,patience:3}),{seconds:400}));
  assert.ok(steady.filter(g=>cakes(g)>=25).length>=6,`cakes reached: ${steady.map(cakes).join(' ')}`);
  const hurried=SEEDS.map(seed=>run(new CandleRun(seed),candlesBot(.055,seed,{greed:.6,patience:1.2}),{seconds:600}));
  assert.ok(hurried.filter(g=>g.over).length>=7,'a hurried hand is caught');
  assert.ok(hurried.every(g=>cakes(g)>=2),`but not on the first cakes: ${hurried.map(cakes).join(' ')}`);
});

// ---------------------------------------------------------------- Long Galgan
/** Steers for the treat by the shortest way that still leaves him room to get back to his
 * tail; failing that, follows his tail. Each swipe lands up to `sigma` seconds off, so a late
 * one turns a square late, as a thumb does. `careless`: just heads for the treat. */
const snakeBot=(sigma=0,seed='hand',{careless=false}={})=>{
  const r=seeded('snake'+seed+sigma),OPP={up:'down',down:'up',left:'right',right:'left'},key=(c,rr)=>c*100+rr;let last=null,pending=[];
  const blocked=(body,c,rr)=>c<0||rr<0||c>=SNAKE.cols||rr>=SNAKE.rows||body.has(key(c,rr));
  const room=(body,c,rr)=>{const seen=new Set([key(c,rr)]),q=[[c,rr]];while(q.length&&seen.size<400){const [x,y]=q.pop();for(const [dx,dy] of Object.values(DIRS)){const k=key(x+dx,y+dy);if(!seen.has(k)&&!blocked(body,x+dx,y+dy)){seen.add(k);q.push([x+dx,y+dy]);}}}return seen.size;};
  const path=(body,from,to)=>{const prev=new Map([[key(from.c,from.r),null]]),q=[[from.c,from.r]];while(q.length){const [x,y]=q.shift();if(x===to.c&&y===to.r){let k=key(x,y),first=null;while(prev.get(k)){first=prev.get(k)[1];k=prev.get(k)[0];}return first;}for(const [d,[dx,dy]] of Object.entries(DIRS)){const k=key(x+dx,y+dy);if(!prev.has(k)&&!blocked(body,x+dx,y+dy)){prev.set(k,[key(x,y),d]);q.push([x+dx,y+dy]);}}}return null;};
  const choose=g=>{const h=g.head,body=new Set(g.body.slice(0,-1).map(p=>key(p.c,p.r))),at=d=>[h.c+DIRS[d][0],h.r+DIRS[d][1]];
    const safe=Object.keys(DIRS).filter(d=>d!==OPP[g.dir]&&!blocked(body,...at(d)));if(!safe.length)return g.dir;
    const goal=g.gold||g.treat,dist=d=>{const [c,rr]=at(d);return Math.abs(c-goal.c)+Math.abs(rr-goal.r);};
    if(careless)return safe.sort((a,b)=>dist(a)-dist(b))[0];
    const d=path(body,h,goal);if(d&&safe.includes(d)&&room(body,...at(d))>=g.body.length+2)return d;
    const t=path(body,h,g.body.at(-1));if(t&&safe.includes(t))return t;
    return safe.sort((a,b)=>room(body,...at(b))-room(body,...at(a)))[0];};
  return g=>{
    if(g.state==='ready')return {swipes:[{dir:'up'}]};
    if(g.prev!==last){last=g.prev;const d=choose(g);if(d!==(g.queue[0]||g.dir))pending.push({at:g.time+.5/g.speed+(r()+r()+r()-1.5)*2*sigma,dir:d});}
    const swipes=[];pending=pending.filter(p=>p.at<=g.time?(swipes.push({dir:p.dir}),false):true);return {swipes};};};
test('Long Galgan: he waits for a swipe; a treat makes him one longer; the fence and his own back end it',()=>{
  const g=new SnakeRun('rules');assert.equal(g.body.length,SNAKE.start);run(g,()=>({}),{seconds:10});assert.equal(g.state,'ready');assert.equal(g.time>0,true);
  // Put a treat right in front of him and go.
  g.treat={c:g.head.c,r:g.head.r-1,kind:'fish'};g.step(STEP,{swipes:[{dir:'up'}]});run(g,()=>({}),{until:g=>g.score>0,seconds:1});
  assert.equal(g.score,1);run(g,()=>({}),{until:g=>g.body.length>SNAKE.start,seconds:1});assert.equal(g.body.length,SNAKE.start+1);
  run(g,()=>({}),{seconds:10});assert.ok(g.over);assert.equal(g.events.find(e=>e.type==='bump').what,'fence');
  // Turning back on himself in a tight square: his own back.
  const h=new SnakeRun('coil',{start:6});h.treat={c:0,r:0,kind:'fish'};
  const turn=g=>g.state==='ready'?'up':g.queue.length?null:g.dir==='up'?'left':g.dir==='left'?'down':null;
  run(h,g=>({swipes:turn(g)?[{dir:turn(g)}]:[]}),{seconds:5});assert.ok(h.over);assert.equal(h.events.find(e=>e.type==='bump').what,'tail');
});
test('Long Galgan: a turn straight back is ignored, two quick turns both count, and a late swipe at the fence saves him',()=>{
  const g=new SnakeRun('turns');g.step(STEP,{swipes:[{dir:'left'}]});assert.equal(g.state,'ready','straight back into himself is not a turn');
  g.step(STEP,{swipes:[{dir:'up'},{dir:'left'}]});assert.deepEqual(g.queue.slice(0,2),['up','left']);
  run(g,()=>({}),{until:g=>g.dir==='left',seconds:2});assert.equal(g.dir,'left','both turns were taken, one a step');
  // Heading for the fence: he holds back for a moment, and a swipe in that moment is in time.
  const f=new SnakeRun('fence');f.step(STEP,{swipes:[{dir:'up'}]});run(f,()=>({}),{until:g=>g.head.r===0,seconds:5});assert.ok(!f.over);
  run(f,()=>({}),{seconds:SNAKE.grace*.5});assert.ok(!f.over,'held back at the fence');
  f.step(STEP,{swipes:[{dir:'right'}]});run(f,()=>({}),{seconds:.5});assert.ok(!f.over,'and the late swipe got him out');assert.equal(f.dir,'right');
  const late=new SnakeRun('fence');late.step(STEP,{swipes:[{dir:'up'}]});run(late,()=>({}),{until:g=>g.head.r===0,seconds:5});run(late,()=>({}),{seconds:SNAKE.grace+.2});assert.ok(late.over,'but not for ever');
});
test('Long Galgan: a careful player goes a long way; a careless one runs into himself, but not at once',()=>{
  const careful=SEEDS.map(seed=>run(new SnakeRun(seed),snakeBot(.02,seed),{seconds:240}));
  assert.ok(careful.filter(g=>g.score>=50).length>=6,`treats: ${careful.map(g=>g.score).join(' ')}`);
  const careless=SEEDS.map(seed=>run(new SnakeRun(seed),snakeBot(.06,seed,{careless:true}),{seconds:600}));
  assert.ok(careless.every(g=>g.over),'a careless one ends');
  assert.ok(careless.filter(g=>g.score>=12).length>=6,`but gets a good few first: ${careless.map(g=>g.score).join(' ')}`);
  assert.ok(careless.filter(g=>g.events.find(e=>e.type==='bump')?.what==='fence').length<=2,'and rarely by the fence');
});

// ---------------------------------------------------------------- Snack Merge
/** A tray laid out by hand: rows of steps (0 for empty), top row first. */
const tray=(rows,seed='tray')=>{const g=new MergeRun(seed);g.tiles=[];rows.forEach((row,r)=>row.forEach((t,c)=>{if(t)g.add(r,c,t);}));return g;};
const read=g=>[0,1,2,3].map(r=>[0,1,2,3].map(c=>g.at(r,c)?.t??0));
/** Tries each way on a copy and takes the one that leaves the tidiest tray: room to move, big
 * snacks in a corner, neighbours that are close. `random`: any way that moves. */
const mergeBot=(style='careful',seed='hand')=>{const r=seeded('merge'+seed);let last=-9;return g=>{
  // At a person's pace: a swipe every quarter of a second.
  if(g.time-last<.25)return {swipes:[]};last=g.time;
  const ways=Object.keys(MERGE_DIRS),moved=d=>{const h=Object.assign(Object.create(MergeRun.prototype),{tiles:g.tiles.map(t=>({...t})),events:[],ghosts:[],time:g.time,score:g.score,serial:g.serial,moves:0,best:g.best,zone:g.zone,state:'play'});h.spawn=()=>null;return h.move(d)?h:null;};
  if(style==='random')return {swipes:[{dir:ways[Math.floor(r()*4)]}]};
  let best=null,top=-1e9;for(const d of ways){const h=moved(d);if(!h)continue;const grid=read(h);let v=16-h.tiles.length;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){if(x<3)v-=Math.max(0,grid[y][x+1]-grid[y][x])*1.2;if(y<3)v-=Math.max(0,grid[y][x]-grid[y+1][x])*1.2;}
    if(grid[3][0]===h.best)v+=3;if(v>top){top=v;best=d;}}
  return {swipes:best?[{dir:best}]:[]};};};
test('Snack Merge: everything slides as far as it goes, and two the same become the next snack up, once a swipe',()=>{
  let g=tray([[1,1,1,1],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);g.spawn=()=>null;g.move('left');assert.deepEqual(read(g)[0],[2,2,0,0]);assert.equal(g.score,8);
  g=tray([[1,1,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);g.spawn=()=>null;g.move('left');assert.deepEqual(read(g)[0],[2,2,0,0],'a fresh carrot does not merge again in the same swipe');
  g=tray([[0,0,0,3],[0,0,0,3],[0,0,0,0],[0,0,0,2]]);g.spawn=()=>null;g.move('down');assert.deepEqual(read(g).map(row=>row[3]),[0,0,4,2]);
  g=tray([[2,1,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);g.move('left');assert.equal(g.tiles.length,2,'nothing moved: no new snack');assert.ok(g.events.some(e=>e.type==='stuck'));
  g.move('right');assert.equal(g.tiles.length,3,'a swipe that moves brings one new snack');
  assert.equal(mergeKind(1),'sprout');assert.equal(mergeKind(11),'crown');
});
test('Snack Merge: the tray is full when no swipe can move anything; new snacks are mostly sprouts',()=>{
  const g=tray([[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,1]]);assert.ok(!g.canMove());
  const h=tray([[1,2,1,2],[2,1,2,1],[1,2,1,2],[2,1,2,2]]);assert.ok(h.canMove(),'two the same side by side can still merge');
  h.spawn=()=>null;h.move('right');assert.ok(!h.over);
  let sprouts=0,all=0;for(const seed of SEEDS)for(let i=0;i<60;i++){const k=new MergeRun(seed+i);for(const t of k.tiles){all++;if(t.t===1)sprouts++;}}
  assert.ok(sprouts/all>.84&&sprouts/all<.96,`${(sprouts/all*100).toFixed(0)}% sprouts`);
});
test('Snack Merge: swiping any old way fills the tray soon; a tidy player makes far more',()=>{
  const random=SEEDS.map(seed=>run(new MergeRun(seed),mergeBot('random',seed),{seconds:600}));
  const careful=SEEDS.map(seed=>run(new MergeRun(seed),mergeBot('careful',seed),{seconds:3600}));
  assert.ok(random.every(g=>g.over),'random swiping ends');
  const med=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
  assert.ok(med(careful.map(g=>g.score))>med(random.map(g=>g.score))*2.5,`careful ${careful.map(g=>g.score).join(' ')}; random ${random.map(g=>g.score).join(' ')}`);
  assert.ok(careful.filter(g=>g.best>=7).length>=6,'a tidy player reaches pizza');
});

// ---------------------------------------------------------------- Hill Drive
/** Pedal down; off when the nose comes up; in the air, lines up with the ground ahead. */
function driveBot(g){
  if(g.state==='ready')return {right:true};
  const ground=Math.atan(g.ground.slope(g.x)),rel=g.a-ground;
  if(g.contact.some(Boolean))return rel>.45?{right:false,left:rel>.7}:{right:true};
  const target=Math.atan(g.ground.slope(g.x+g.vx*.35));
  return g.a>target+.15?{left:true}:g.a<target-.15?{right:true}:{};
}
test('Hill Drive: no hill is steeper than the car can climb from a standstill',()=>{
  const t=new Terrain(seeded('hills'));t.extend(6000*DRIVE.metre);let steepest=0;
  for(let i=1;i<t.heights.length;i++){const s=Math.abs(t.heights[i]-t.heights[i-1])/DRIVE.step,d=driveDifficulty(i*DRIVE.step/DRIVE.metre);steepest=Math.max(steepest,s);assert.ok(s<=driveSlope(d)+.25,`at ${Math.round(i*DRIVE.step/DRIVE.metre)} m: ${s.toFixed(2)}`);}
  // The steepest there can be, ripple and all, from a standstill, pedal down: up it goes.
  const ramp=new DriveRun('ramp');const slope=Math.max(steepest,driveSlope(1)+.12);ramp.ground.heights=ramp.ground.heights.map((_,i)=>Math.max(0,(i-12))*DRIVE.step*slope);ramp.ground.x=Infinity;
  ramp.x=13*DRIVE.step;ramp.y=ramp.ground.h(ramp.x)+DRIVE.radius+DRIVE.drop;ramp.a=Math.atan(slope);
  run(ramp,g=>({right:Math.atan2(Math.sin(g.a),Math.cos(g.a))-Math.atan(slope)<.4}),{seconds:6});
  assert.ok(!ramp.over&&ramp.x>13*DRIVE.step+300,`climbed ${Math.round(ramp.x-13*DRIVE.step)} px up a slope of ${slope.toFixed(2)}`);
});
test('Hill Drive: a careful driver gets a long way, and never for want of fuel',()=>{
  const far=[];for(const seed of SEEDS){const g=run(new DriveRun(seed),driveBot,{seconds:360});far.push(g.score);assert.ok(!g.events.some(e=>e.type==='empty'),`${seed} ran dry`);}
  assert.ok(far.filter(m=>m>=1000).length>=6,`metres: ${far.join(' ')}`);
  // The cans: never further apart than a tank lasts at a gentle 9 m/s.
  const t=new Terrain(seeded('cans'));t.extend(8000*DRIVE.metre);
  for(let i=1;i<t.cans.length;i++)assert.ok((t.cans[i].x-t.cans[i-1].x)/DRIVE.metre<=DRIVE.tank*9,`can ${i}`);
});
test('Hill Drive: the car waits for the pedal; tipped onto his head, Galgan is out',()=>{
  const g=new DriveRun('wait');run(g,()=>({}),{seconds:5});assert.equal(g.state,'ready');assert.ok(!g.over);
  const flip=new DriveRun('flip');flip.state='play';flip.a=Math.PI;flip.y=flip.ground.h(flip.x)+40;run(flip,()=>({}),{seconds:3});
  assert.ok(flip.over);assert.ok(flip.events.some(e=>e.type==='crash'));
});

// ---------------------------------------------------------------- all six
// Each run gets a bot of its own: some remember what they have seen.
const GAMES={drive:[DriveRun,DRIVE_ZONES,()=>driveBot],jet:[JetRun,JET_ZONES,()=>jetBot],cliff:[CliffRun,CLIFF_ZONES,()=>cliffBot()],hop:[HopRun,HOP_ZONES,()=>hopBot()],fall:[FallRun,FALL_ZONES,()=>fallBot()],match:[MatchRun,MATCH_ZONES,()=>matchBot(.4)],stack:[StackRun,STACK_ZONES,()=>stackBot()],candles:[CandleRun,CANDLES_ZONES,()=>candlesBot()],snake:[SnakeRun,SNAKE_ZONES,()=>snakeBot()],merge:[MergeRun,MERGE_ZONES,()=>mergeBot()]};
test('every game: the same seed and the same fingers make the same run',()=>{
  for(const [id,[Game,,bot]] of Object.entries(GAMES)){
    const a=run(new Game('same'),bot(),{seconds:40}),b=run(new Game('same'),bot(),{seconds:40});
    assert.equal(a.score,b.score,id);assert.equal(a.time,b.time,id);
  }
});
test('every game: the test lab can start it at any stage, and it opens there',()=>{
  for(const [id,[Game,zones,bot]] of Object.entries(GAMES))for(const [from,name] of zones){
    const g=new Game('lab',{start:from});assert.ok(g.score>=from,`${id} ${name}`);
    run(g,bot(),{seconds:1.5});assert.ok(!g.over,`${id} ${name}: over at once`);
    assert.equal(zoneAt(zones,g.score)[1],name,`${id} ${name}`);
  }
});
test('every game: its line on the other phone',()=>{
  assert.deepEqual(Object.keys(ARCADE_GAMES),['jump','drop','drive','jet','cliff','hop','fall','match','stack','candles','snake','merge']);
  assert.equal(bragLine('drive',812),'drove Galgan 812 metres in Hill Drive');
  assert.equal(bragLine('jet',1),'flew Monki past 1 chimney in Jet Monki');
  assert.equal(bragLine('hop',40),'got Galgan 40 hops up the river in Water Hop');
  for(const game of Object.values(ARCADE_GAMES))assert.ok(game.news>0&&game.hint&&game.did.includes('{n}'),game.id);
  // A best in any of them is kept, and one worth telling reaches the other one's card.
  let world=createWorld('later',1000),n=0;const op=(actor,fields)=>{world=applyOperation(world,{id:`b${++n}`,actor,type:'arcadeBest',...fields},1000+n);};
  for(const id of ['drive','jet','cliff','hop','fall','match']){op('julia',{game:id,score:ARCADE_GAMES[id].news});assert.equal(world.arcade.julia[id],ARCADE_GAMES[id].news);}
  assert.equal(world.log.filter(e=>e.action==='arcade').length,6);
  op('david',{game:'drive',score:900});assert.equal(world.log[0].action,'arcadePass');assert.equal(world.log[0].target,'galgan');
});

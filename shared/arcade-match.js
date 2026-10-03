import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Match Tap: Pou's Match Tap. A shelf of snacks; tap three or more of the same that touch
// and Sernik has them, the rest drop down and more come in from the top. The clock runs
// down all the while and every group puts some back: a three hardly any, a big group a lot
// more. Quick hands pay: the quicker the last few matches came, the more each gives back, up
// to double, so the game is a quick eye as much as a good one. A tap on a snack with no group
// costs a second, so tapping anywhere fast runs the clock out instead of keeping it going.
// Seven or more leave a star, which takes its whole row and column. Later on there are more
// kinds of snack, the clock runs faster and gives back less, all of it levelling off where
// quick, careful hands keep up. There is always a group to tap: a shelf with none is shaken
// up for free.
export const MATCH={width:400,height:600,cols:8,rows:10,cell:46,x0:16,y0:118,min:3,full:15,start:10,star:7,fall:70,miss:1,
  scale:450,kinds:[150,550],drain:[1.3,1.95],bonus:[.5,1.45,.7],paceSlow:1.35,paceGain:1.1,paceMax:2,paceMix:.35};
export const MATCH_FOODS=['icecream','fish','pizza','donut','carrot','mushroom'];
export const MATCH_ZONES=[[0,'Snack time'],[80,'Lunch'],[200,'Tea'],[400,'Dinner'],[650,'Midnight feast']];
export const matchDifficulty=score=>ease(score,MATCH.scale);
export const matchKinds=score=>score<MATCH.kinds[0]?4:score<MATCH.kinds[1]?5:6;
export const matchDrain=d=>lerp(...MATCH.drain,d);
/** Seconds back for a group of n: half a second for three, far more for bigger groups
 * (1.4 for four, 2.5 for five, 3.7 for six), a little less later on. */
/** What quick hands are worth: a pace (seconds a match, recently) to a multiple of the time back. */
export const matchPace=pace=>clamp(1+(MATCH.paceSlow-pace)*MATCH.paceGain,1,MATCH.paceMax);
export const matchBonus=(n,d)=>MATCH.bonus[0]*Math.pow(Math.max(0,n-2),MATCH.bonus[1])*lerp(1,MATCH.bonus[2],d);

export class MatchRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.clock=MATCH.start;this.pace=MATCH.paceSlow+.3;this.mult=1;this.lastMatch=-9;this.state='ready';this.events=[];this.zone=0;this.serial=0;this.moves=0;
    this.grid=Array.from({length:MATCH.cols},()=>Array.from({length:MATCH.rows},(_,r)=>this.tile(r-MATCH.rows-1)));
    this.settle(true);
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  tile(y,kind=MATCH_FOODS[Math.floor(this.rng()*matchKinds(this.score))]){return {id:this.serial++,kind,y,vy:0};}
  /** Screen position of a cell's middle. */
  static centre(c,r){return {x:MATCH.x0+c*MATCH.cell+MATCH.cell/2,y:MATCH.y0+r*MATCH.cell+MATCH.cell/2};}
  get resting(){return this.grid.every((col,c)=>col.every((t,r)=>t.y===r));}
  /** Every tile touching this one, of the same kind (or just the star itself). */
  group(c,r){
    const kind=this.grid[c][r].kind;if(kind==='star')return [[c,r]];
    const seen=new Set([c*100+r]),out=[[c,r]];
    for(let i=0;i<out.length;i++){const [x,y]=out[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=MATCH.cols||ny>=MATCH.rows||seen.has(nx*100+ny)||this.grid[nx][ny].kind!==kind)continue;seen.add(nx*100+ny);out.push([nx,ny]);}}
    return out;
  }
  hasMove(){
    for(let c=0;c<MATCH.cols;c++)for(let r=0;r<MATCH.rows;r++){if(this.grid[c][r].kind==='star'||this.group(c,r).length>=MATCH.min)return true;}
    return false;
  }
  /** A shelf with nothing to tap is shaken until it has something; on the first fill too. */
  settle(silent=false){
    let tries=0;
    while(!this.hasMove()&&tries++<200){for(const col of this.grid)for(const t of col)t.kind=MATCH_FOODS[Math.floor(this.rng()*matchKinds(this.score))];}
    if(tries&&!silent)this.emit('shuffle',MATCH.width/2,MATCH.y0+MATCH.rows*MATCH.cell/2);
  }
  tap(x,y){
    const c=Math.floor((x-MATCH.x0)/MATCH.cell),r=Math.floor((y-MATCH.y0)/MATCH.cell);
    if(c<0||r<0||c>=MATCH.cols||r>=MATCH.rows)return;
    // Only what is sitting still can be picked, so what is tapped is what was seen.
    const t=this.grid[c][r];if(t.y!==r)return;
    const star=t.kind==='star',cells=star?this.cross(c,r):this.group(c,r);
    if(!star&&cells.length<MATCH.min){
      // Free before the clock starts; after that, a guess costs time.
      const lost=this.state==='play'?Math.min(this.clock,MATCH.miss):0;this.clock-=lost;
      this.emit('nope',x,y,{kind:t.kind,lost});return;
    }
    if(this.state==='ready')this.state='play';
    const n=cells.length,d=matchDifficulty(this.score);this.moves++;
    // Quick hands pay: the time back grows with the pace of the last few matches, smoothly,
    // from as it is for an unhurried tapper to double for a very quick one.
    if(this.lastMatch>0)this.pace=this.pace*(1-MATCH.paceMix)+Math.min(3,this.time-this.lastMatch)*MATCH.paceMix;this.lastMatch=this.time;
    const was=this.mult,mult=this.mult=matchPace(this.pace),bonus=matchBonus(n,d)*mult;
    this.score+=n;this.clock=Math.min(MATCH.full,this.clock+bonus);
    const kinds=cells.map(([cc,rr])=>this.grid[cc][rr].kind);
    for(const [cc,rr] of cells)this.grid[cc][rr]=null;
    const leaveStar=!star&&n>=MATCH.star;
    if(leaveStar)this.grid[c][r]={id:this.serial++,kind:'star',y:r,vy:0};
    this.emit(star?'star':'match',x,y,{n,cells,kinds,kind:t.kind,bonus,leaveStar,mult,quicker:Math.floor(mult*4)>Math.floor(was*4)&&mult>=1.25});
    this.drop();
  }
  /** The star's row and column. */
  cross(c,r){const out=[];for(let i=0;i<MATCH.cols;i++)out.push([i,r]);for(let j=0;j<MATCH.rows;j++)if(j!==r)out.push([c,j]);return out;}
  drop(){
    for(let c=0;c<MATCH.cols;c++){
      const kept=this.grid[c].filter(Boolean),missing=MATCH.rows-kept.length;
      const fresh=Array.from({length:missing},(_,i)=>this.tile(i-missing-1.2));
      this.grid[c]=[...fresh,...kept];
    }
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    const wasResting=this.resting;
    for(const tap of input.taps||[])if(!tap.key)this.tap(tap.x,tap.y);
    for(const col of this.grid)col.forEach((t,r)=>{if(t.y<r){t.vy+=MATCH.fall*dt;t.y=Math.min(r,t.y+t.vy*dt);if(t.y===r){t.vy=0;}}});
    if(!wasResting&&this.resting)this.settle();
    // The clock waits for the first group: a look at the shelf is free.
    if(this.state==='play'){
      this.clock-=matchDrain(matchDifficulty(this.score))*dt;
      if(this.clock<=0){this.clock=0;this.state='over';this.emit('over',MATCH.width/2,MATCH.y0);return;}
    }
    const zone=zoneAt(MATCH_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',MATCH.width/2,MATCH.y0,{name:MATCH_ZONES[zone][1]});}
  }
}

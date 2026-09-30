import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Match Tap: Pou's Match Tap. A shelf of snacks; tap three or more of the same that touch
// and Sernik has them, the rest drop down and more come in from the top. The clock runs
// down all the while and every group puts some back, a big group a lot more. Seven or more
// leave a star, which takes its whole row and column. Later on there are more kinds of
// snack, the clock runs faster and gives back less, all of it levelling off. There is
// always a group to tap: a shelf with none is shaken up for free.
export const MATCH={width:400,height:600,cols:8,rows:10,cell:46,x0:16,y0:118,min:3,full:12,start:10,star:7,fall:70};
export const MATCH_FOODS=['icecream','fish','pizza','donut','carrot','mushroom'];
export const MATCH_ZONES=[[0,'Snack time'],[80,'Lunch'],[200,'Tea'],[400,'Dinner'],[650,'Midnight feast']];
export const matchDifficulty=score=>ease(score,350);
export const matchKinds=score=>score<80?4:score<400?5:6;
export const matchDrain=d=>lerp(.8,1.7,d);
/** Seconds back for a group of n: more than a line for bigger groups, less later on. */
export const matchBonus=(n,d)=>(.3*n+.07*n*n)*lerp(1,.55,d);

export class MatchRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.clock=MATCH.start;this.state='ready';this.events=[];this.zone=0;this.serial=0;this.moves=0;
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
    if(!star&&cells.length<MATCH.min){this.emit('nope',x,y,{kind:t.kind});return;}
    if(this.state==='ready')this.state='play';
    const n=cells.length,d=matchDifficulty(this.score);this.moves++;
    this.score+=n;this.clock=Math.min(MATCH.full,this.clock+matchBonus(n,d));
    const kinds=cells.map(([cc,rr])=>this.grid[cc][rr].kind);
    for(const [cc,rr] of cells)this.grid[cc][rr]=null;
    const leaveStar=!star&&n>=MATCH.star;
    if(leaveStar)this.grid[c][r]={id:this.serial++,kind:'star',y:r,vy:0};
    this.emit(star?'star':'match',x,y,{n,cells,kinds,kind:t.kind,bonus:matchBonus(n,d),leaveStar});
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

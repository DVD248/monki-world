import {seeded,zoneAt} from './arcade.js';

// Snack Merge: the sliding puzzle. Sixteen places on a tray; swipe and every snack slides as
// far as it can that way. Two the same that meet become the next one up: two sprouts make a
// carrot, two carrots a potato, and so on up through fish, doughnuts and pizza to presents,
// a crown and a rainbow. Each swipe brings one new little snack. When no swipe can move
// anything the tray is full and the run is over. No clock: it is as hard as the tray gets.
// The new snack is a sprout nine times in ten, as in the original, which is what keeps a
// careful player going and gets a careless tray full.
export const MERGE={width:400,height:600,size:4,tile:84,gap:8,x0:12,y0:128,slide:.1,four:.1};
export const MERGE_ZONES=[[0,'Little bites'],[500,'Snack time'],[2000,'A feast'],[6000,'Treasure'],[16000,'The crown']];
/** What each step up the chain is, and its points (two to the power of the step). */
export const MERGE_CHAIN=['sprout','carrot','potato','mushroom','fish','donut','pizza','icecream','teacup','present','crown','star','moon','rainbow'];
export const mergeValue=t=>2**t;
export const mergeKind=t=>MERGE_CHAIN[Math.min(t,MERGE_CHAIN.length)-1];
export const MERGE_DIRS={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]};

export class MergeRun{
  /** `start` is for the test lab: a tray that already has the snack that many points bring. */
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.events=[];this.zone=zoneAt(MERGE_ZONES,start)[2];this.state='play';
    this.serial=0;this.tiles=[];this.ghosts=[];this.moves=0;this.best=0;this.movedAt=-1;
    // A snack of step t takes about t×2^t points to make.
    if(start>0){let t=1;while((t+1)*mergeValue(t+1)<=start&&t<12)t++;this.add(MERGE.size-1,0,t);}
    this.spawn(true);this.spawn(true);
    this.best=Math.max(...this.tiles.map(x=>x.t));
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** Screen position of a place's middle. */
  static centre(r,c){return {x:MERGE.x0+MERGE.gap+c*(MERGE.tile+MERGE.gap)+MERGE.tile/2,y:MERGE.y0+MERGE.gap+r*(MERGE.tile+MERGE.gap)+MERGE.tile/2};}
  at(r,c){return this.tiles.find(x=>x.r===r&&x.c===c);}
  add(r,c,t,extra={}){const tile={id:this.serial++,r,c,t,fr:r,fc:c,at:this.time,born:this.time,...extra};this.tiles.push(tile);return tile;}
  spawn(quiet=false){
    const empty=[];for(let r=0;r<MERGE.size;r++)for(let c=0;c<MERGE.size;c++)if(!this.at(r,c))empty.push([r,c]);
    if(!empty.length)return null;
    const [r,c]=empty[Math.floor(this.rng()*empty.length)],t=this.rng()<MERGE.four?2:1,tile=this.add(r,c,t,{born:this.time+(quiet?0:MERGE.slide)});
    if(!quiet){const {x,y}=MergeRun.centre(r,c);this.emit('spawn',x,y,{t});}
    return tile;
  }
  canMove(){
    if(this.tiles.length<MERGE.size**2)return true;
    for(const a of this.tiles){const right=this.at(a.r,a.c+1),below=this.at(a.r+1,a.c);if(right&&right.t===a.t||below&&below.t===a.t)return true;}
    return false;
  }
  /** Slides everything one way. Returns whether anything moved. */
  move(dir){
    const [dr,dc]=MERGE_DIRS[dir],N=MERGE.size,now=this.time;
    for(const tile of this.tiles){tile.fr=tile.r;tile.fc=tile.c;tile.at=now;}
    this.ghosts=[];this.movedAt=now;let moved=false,gained=0;const merged=[];
    // Walk each line from the far end, so the snack nearest the wall goes first.
    for(let i=0;i<N;i++){
      const line=[];for(let j=0;j<N;j++){const k=dr+dc>0?N-1-j:j,r=dr?k:i,c=dr?i:k,tile=this.at(r,c);if(tile)line.push(tile);}
      let slot=0,last=null;
      for(const tile of line){
        if(last&&last.t===tile.t&&!last.merged){
          // These two meet: the one already there becomes the next snack up; this one slides into it.
          this.ghosts.push({t:tile.t,fr:tile.r,fc:tile.c,r:last.r,c:last.c});
          this.tiles=this.tiles.filter(x=>x!==tile);last.t++;last.merged=true;last.pop=now+MERGE.slide;gained+=mergeValue(last.t);merged.push(last);moved=true;continue;
        }
        const k=slot++,r=dr?(dr>0?N-1-k:k):i,c=dc?(dc>0?N-1-k:k):i;
        if(tile.r!==r||tile.c!==c){tile.r=r;tile.c=c;moved=true;}
        last=tile;
      }
    }
    for(const tile of this.tiles)delete tile.merged;
    if(!moved){this.emit('stuck',MERGE.width/2,MERGE.y0,{dir});return false;}
    this.moves++;this.score+=gained;
    this.emit('slide',MERGE.width/2,MERGE.y0,{dir,merges:merged.length,gained});
    for(const tile of merged){const {x,y}=MergeRun.centre(tile.r,tile.c);this.emit('merge',x,y,{t:tile.t,value:mergeValue(tile.t)});
      if(tile.t>this.best){this.best=tile.t;if(tile.t>=5)this.emit('newbest',x,y,{t:tile.t,kind:mergeKind(tile.t)});}}
    this.spawn();
    const zone=zoneAt(MERGE_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',MERGE.width/2,MERGE.y0,{name:MERGE_ZONES[zone][1]});}
    if(!this.canMove()){this.state='over';this.emit('full',MERGE.width/2,MERGE.y0+180);}
    return true;
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    for(const s of input.swipes||[]){if(MERGE_DIRS[s.dir])this.move(s.dir);if(this.over)return;}
  }
}

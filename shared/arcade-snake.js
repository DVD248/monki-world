import {ease,seeded,zoneAt,lerp} from './arcade.js';

// Long Galgan: the snake game. Galgan trots round the lawn inside the fence; swipe and he
// turns. Every treat he eats makes him one longer, and now and then a golden bone turns up for
// a few seconds, worth three. Into the fence or into his own back and that is the end. He
// keeps two turns in mind, so a quick swipe-swipe round a corner is not lost, and heading for
// trouble he holds back for a moment before he bumps into it, long enough for a late swipe to
// save him. He goes a little faster as he grows, levelling off at a pace a steady thumb keeps up.
export const SNAKE={width:400,height:600,cols:15,rows:20,cell:25,x0:12.5,y0:92,start:3,grace:.16,golden:6,goldenEvery:9};
export const SNAKE_ZONES=[[0,'The lawn'],[10,'The flower beds'],[25,'The vegetable patch'],[45,'Evening'],[70,'Night'],[100,'The longest dog']];
export const SNAKE_TREATS=['fish','pizza','donut','carrot','icecream','mushroom'];
export const snakeDifficulty=n=>ease(n,35);
/** Steps a second. */
export const snakeSpeed=d=>lerp(5.2,9.2,d);
export const DIRS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
const OPPOSITE={up:'down',down:'up',left:'right',right:'left'};

export class SnakeRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.events=[];this.zone=zoneAt(SNAKE_ZONES,start)[2];this.state='ready';
    // A test-lab run starts as long as that many treats would have made him, coiled from the middle.
    const len=Math.min(SNAKE.start+start,Math.floor(SNAKE.cols*SNAKE.rows*.45)),c0=Math.floor(SNAKE.cols/2),r0=Math.floor(SNAKE.rows/2)+2;
    this.body=[];let c=c0,r=r0,dc=-1;
    for(let i=0;i<len;i++){this.body.push({c,r});const nc=c+dc;if(nc<1||nc>=SNAKE.cols-1){r++;dc=-dc;}else c=nc;}
    if(this.body.some(p=>p.r>=SNAKE.rows))this.body=this.body.filter(p=>p.r<SNAKE.rows);
    this.dir='right';this.queue=[];this.acc=0;this.hold=0;this.grow=0;this.prev=this.body.map(p=>({...p}));
    this.eaten=0;this.treat=null;this.gold=null;this.nextGold=SNAKE.goldenEvery;this.place();
  }
  get over(){return this.state==='over';}
  get head(){return this.body[0];}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** Screen position of a cell's middle. */
  static centre(c,r){return {x:SNAKE.x0+(c+.5)*SNAKE.cell,y:SNAKE.y0+(r+.5)*SNAKE.cell};}
  get speed(){return snakeSpeed(snakeDifficulty(this.score));}
  occupied(c,r){return this.body.some(p=>p.c===c&&p.r===r);}
  /** A free cell for a treat, not right under his nose. */
  freeCell(avoid=[]){
    const h=this.head,free=[];
    for(let c=0;c<SNAKE.cols;c++)for(let r=0;r<SNAKE.rows;r++){
      if(this.occupied(c,r)||avoid.some(a=>a&&a.c===c&&a.r===r))continue;
      if(Math.abs(c-h.c)+Math.abs(r-h.r)<3)continue;free.push({c,r});
    }
    return free.length?free[Math.floor(this.rng()*free.length)]:null;
  }
  place(){const cell=this.freeCell([this.gold]);this.treat=cell&&{...cell,kind:SNAKE_TREATS[Math.floor(this.rng()*SNAKE_TREATS.length)]};}
  /** A turn, kept for the next step (or the one after, if one is already waiting). */
  turn(dir){
    const last=this.queue.at(-1)||this.dir;
    if(!DIRS[dir]||dir===last||dir===OPPOSITE[last]||this.queue.length>=2)return;
    this.queue.push(dir);
  }
  /** Where the head would go next, and whether that is the end. */
  ahead(dir){
    const [dc,dr]=DIRS[dir],c=this.head.c+dc,r=this.head.r+dr;
    // The tail moves out of the way this step, unless he is growing.
    const body=this.grow>0?this.body:this.body.slice(0,-1);
    return {c,r,bad:c<0||r<0||c>=SNAKE.cols||r>=SNAKE.rows?'fence':body.some(p=>p.c===c&&p.r===r)?'tail':null};
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    for(const s of input.swipes||[])this.turn(s.dir);
    if(this.state==='ready'){if(!this.queue.length)return;this.state='play';this.emit('start',0,0);}
    if(this.gold&&this.time>=this.gold.until){this.emit('goldgone',...Object.values(SnakeRun.centre(this.gold.c,this.gold.r)));this.gold=null;}
    // One step at a time: a physics step is always shorter than one of his.
    const every=1/this.speed;this.acc+=dt;if(this.acc<every)return;
    let dir=this.queue[0]||this.dir,next=this.ahead(dir);
    if(next.bad){
      // Heading for trouble: a moment's grace for a turn that gets him out of it.
      const out=this.queue.slice(1).find(d=>!this.ahead(d).bad);
      if(out){this.queue=[out];dir=out;next=this.ahead(out);}
      else{this.hold+=dt;if(this.hold<SNAKE.grace){this.acc=every;return;}
        const {x,y}=SnakeRun.centre(next.c,next.r);this.state='over';this.emit('bump',x,y,{what:next.bad});return;}
    }
    if(this.queue.length)this.queue.shift();
    this.hold=0;this.acc-=every;this.dir=dir;this.move(next);
  }
  move(next){
    this.prev=this.body.map(p=>({...p}));
    this.body.unshift({c:next.c,r:next.r});
    if(this.grow>0)this.grow--;else this.body.pop();
    const {x,y}=SnakeRun.centre(next.c,next.r);
    if(this.treat&&next.c===this.treat.c&&next.r===this.treat.r){
      this.score++;this.eaten++;this.grow++;this.emit('eat',x,y,{kind:this.treat.kind,length:this.body.length+this.grow});
      this.place();
      if(this.eaten>=this.nextGold&&!this.gold){const cell=this.freeCell([this.treat]);if(cell){this.gold={...cell,until:this.time+SNAKE.golden};this.emit('gold',...Object.values(SnakeRun.centre(cell.c,cell.r)));}this.nextGold=this.eaten+SNAKE.goldenEvery+Math.floor(this.rng()*4);}
    }else if(this.gold&&next.c===this.gold.c&&next.r===this.gold.r){
      this.score+=3;this.grow++;this.emit('golden',x,y,{length:this.body.length+this.grow});this.gold=null;
    }
    if(!this.treat){this.state='over';this.emit('full',x,y);return;}
    const zone=zoneAt(SNAKE_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',x,y,{name:SNAKE_ZONES[zone][1]});}
  }
}

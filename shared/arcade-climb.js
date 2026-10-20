import {ease,seeded,zoneAt,lerp} from './arcade.js';

// Kot Climb: Kot goes up the curtain, which in this house goes up a very long way. Tap the left
// or the right half and Kot hops to that side of it and one step up; a shelf sticks out on one
// side or the other of most steps, and hopping into one is the end. Every step up tops up the
// bar along the top, which drains all the time and faster the higher Kot gets, so the game is
// reading the shelves coming down and keeping up. It levels off where a steady thumb holds it,
// so a run ends on a slip and never on a wall. Nothing drains before the first hop, the first
// steps are bare, and a step never has a shelf on both sides: there is always a way up.
export const CLIMB={width:400,height:600,step:62,gain:.09,start:.62,bare:4,
  drain:[.13,.31],scale:110,shelf:[.5,.82],swap:[.3,.55]};
export const CLIMB_ZONES=[[0,'The cat tree'],[30,'The top shelf'],[70,'Through the ceiling'],[120,'The roof'],[180,'The clouds'],[260,'Night'],[400,'The moon']];
export const climbDifficulty=n=>ease(n,CLIMB.scale);
/** How much of the bar goes in a second, at this difficulty. A steady climb has to tap
 * drain/gain times a second to keep level: from about 1.4 a second up to about 3.4. */
export const climbDrain=d=>lerp(CLIMB.drain[0],CLIMB.drain[1],d);
/** What sits on a shelf, for the picture: drawn from the same seed, so the same on any phone. */
export const CLIMB_PROPS=['plant','teacup','radio','potato','duck','lamp','frog','fish','present','resident'];

export class ClimbRun{
  /** `start` is for the test lab: a run that begins that many steps up. `cast` is who lives in
   * the house, for a resident asleep on a shelf now and then. */
  constructor(seed,{start=0,cast=[]}={}){
    this.rng=seeded(seed);this.score=start;this.time=0;this.events=[];this.state='play';
    this.side=-1;this.energy=CLIMB.start;this.started=false;this.lastSide=0;
    this.sleepers=cast.filter(id=>['monki','sernik','galgan'].includes(id));
    // rows[k] is the shelf on step k: -1 left, 1 right, 0 none.
    this.rows=[];for(let k=0;k<=start+CLIMB.bare;k++)this.rows.push({side:0});
    this.zone=zoneAt(CLIMB_ZONES,start)[2];
    this.extend();
  }
  get over(){return this.state==='over';}
  get difficulty(){return climbDifficulty(this.score);}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  /** The shelves coming down: enough above Kot to read well ahead. */
  extend(){while(this.rows.length<this.score+16)this.rows.push(this.row(this.rows.length));}
  row(k){
    const r=this.rng,d=climbDifficulty(k);
    // Some bare steps throughout, fewer the higher it gets; and higher up the shelves swap
    // sides more often, so there is more to read and more hopping across.
    if(r()>lerp(CLIMB.shelf[0],CLIMB.shelf[1],d))return {side:0};
    const side=!this.lastSide?(r()<.5?-1:1):r()<lerp(CLIMB.swap[0],CLIMB.swap[1],d)?-this.lastSide:this.lastSide;
    this.lastSide=side;
    const kind=Math.floor(r()*(CLIMB_PROPS.length-(this.sleepers.length?0:1))),prop=CLIMB_PROPS[kind];
    return {side,prop,who:prop==='resident'?this.sleepers[Math.floor(r()*this.sleepers.length)]:null,look:Math.floor(r()*3)};
  }
  /** Which way a hop goes: the half of the screen tapped, or an arrow key. */
  static way(input){
    for(const t of input.taps||[])if(!t.key)return t.x<CLIMB.width/2?-1:1;
    for(const s of input.swipes||[])if(s.key&&(s.dir==='left'||s.dir==='right'))return s.dir==='left'?-1:1;
    return 0;
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;
    const way=ClimbRun.way(input);
    if(way)this.hop(way);
    if(this.over||!this.started)return;
    this.energy-=climbDrain(this.difficulty)*dt;
    if(this.energy<=0){this.energy=0;this.state='over';this.emit('slip',this.side,this.score);}
  }
  hop(side){
    this.started=true;
    const next=this.score+1,row=this.rows[next],swapped=side!==this.side;
    this.side=side;
    if(row.side===side){this.state='over';this.emit('bonk',side,next,{prop:row.prop,who:row.who});return;}
    this.score=next;this.energy=Math.min(1,this.energy+CLIMB.gain);
    this.emit('climb',side,next,{swapped});
    const zone=zoneAt(CLIMB_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',side,next,{name:CLIMB_ZONES[zone][1]});}
    this.extend();
  }
}

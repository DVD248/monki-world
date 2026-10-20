import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Water Hop: Pou's Water Hop, with a little Frogger. Galgan crosses a river going up the
// screen, hopping from lily pad to lily pad and along floating logs, each row drifting the
// other way from the last. A hop only goes a short way sideways, and the pads are spread out,
// so most of the game is the wait: for a pad in the next row to drift into reach (the ones he
// can reach have a ring round them), then the tap, before his own pad carries him off the
// side. Tap the pad to hop onto it; tapping his own row hops him along it, or back a row if
// he must. The view rises on its own once he starts, so he has to keep going. Later rows are
// faster, the pads smaller and further apart, and in some rows a few pads dive now and then,
// shivering first. No gap is so wide that the next pad takes long to come.
export const HOP={width:400,height:600,row:62,base:530,reach:72,near:10,hop:.2,edge:6,margin:110,warn:.8};
export const HOP_ZONES=[[0,'The pond'],[20,'The stream'],[50,'The river'],[90,'Evening'],[140,'Night'],[200,'The sea']];
export const hopDifficulty=n=>ease(n,50);
export const hopScroll=d=>lerp(22,48,d);
const RING=HOP.width+HOP.margin*2,wrap=v=>((v%RING)+RING)%RING-HOP.margin;

/** Where a floating thing is at time t. */
export const padX=(row,pad,t)=>wrap(pad.x0+row.dir*row.speed*t);
/** Whether a diving pad is under at time t (for a moment in each turn). */
export const padUnder=(row,pad,t)=>pad.omega>0&&Math.sin(pad.omega*t+pad.phase)<-.72;
/** Whether a diving pad will go under within HOP.warn: it shivers all that time, long enough
 * to see it and hop off. A pad is under for at least 0.7 s, so tenths of a second catch it. */
export const padSoon=(row,pad,t)=>pad.omega>0&&!padUnder(row,pad,t)&&[1,2,3,4,5,6,7,8].some(i=>padUnder(row,pad,t+i*HOP.warn/8));

/** Whether a hop from x reaches the pad at time t: some of it within a hop, and in sight. */
export const padReach=(row,pad,x,t)=>{const px=padX(row,pad,t);return Math.max(0,Math.abs(px-x)-pad.w/2)<=HOP.reach+HOP.near&&px+pad.w/2>HOP.edge+8&&px-pad.w/2<HOP.width-HOP.edge-8;};

export class HopRun{
  constructor(seed,{start=0}={}){
    this.rng=seeded(seed);this.base=start;this.score=start;this.time=0;this.events=[];this.zone=0;
    this.rows=[];this.row=start;this.x=HOP.width/2;this.on=null;this.offset=0;this.state='ready';this.hop=null;this.queued=null;
    this.cam=start*HOP.row;this.lastBank=start;this.lastDir=1;
    for(let n=start;n<start+14;n++)this.addRow(n);
  }
  get over(){return this.state==='over';}
  emit(type,x,y,extra={}){this.events.push({type,x,y,...extra});}
  rowAt(n){return this.rows.find(r=>r.n===n);}
  addRow(n){
    const r=this.rng,d=hopDifficulty(n);
    if(n===this.base||n-this.lastBank>=Math.round(lerp(7,16,d))){this.lastBank=n;this.rows.push({n,kind:'bank',dir:0,speed:0,pads:[]});return;}
    const roll=r();const kind=d>.2&&roll<lerp(0,.22,d)?'sink':roll>lerp(.6,.72,d)?'log':'lily';
    // Each row the other way from the last, so pads in the next row are always coming towards
    // Galgan's: a wait for one to come into reach is never long, but it is a wait.
    const dir=-this.lastDir;this.lastDir=dir;
    const speed=lerp(30,85,d)*(.8+r()*.4);
    // In a diving row only some pads dive, paler than the rest: there is always a steady one.
    const dives=()=>kind==='sink'&&r()<lerp(.35,.55,d);
    // Gaps wider than a hop reaches, so there is not always somewhere to go: the timing is the
    // game. Never so wide that the wait is longer than the pads take to close it.
    const pads=[],window=2*(HOP.reach+HOP.near),maxGap=window+lerp(60,130,d);let at=r()*60;
    while(true){
      // Diving pads come close together, so when one shivers there is always a neighbour to hop to.
      const w=kind==='log'?lerp(150,95,d)*(.85+r()*.3):lerp(54,40,d)*(.9+r()*.2);
      const gap=kind==='sink'?lerp(20,44,r()):Math.min(maxGap,(kind==='log'?lerp(110,220,d):lerp(90,200,d))*(.7+r()*.6));
      if(at+w+gap>RING){break;}
      pads.push({x0:at+w/2,w,omega:dives()?1.4+r()*.8:0,phase:r()*Math.PI*2});at+=w+gap;
    }
    // Close the ring: the last gap, back round to the first pad, is kept narrow too.
    const first=pads[0].x0-pads[0].w/2,last=pads.at(-1),tail=RING-(last.x0+last.w/2)+first;
    if(tail>maxGap)pads.push({x0:(last.x0+last.w/2+RING+first)/2,w:Math.min(kind==='log'?100:46,tail-20),omega:dives()?1.4+r()*.8:0,phase:r()*Math.PI*2});
    if(pads.every(p=>p.omega))pads[0].omega=0;
    this.rows.push({n,kind,dir,speed,pads});
  }
  /** The pad under x in a row at time t, within `near` of its edge, or null. A diving one
   * counts: it may be up again by the time he lands, and if not, in he goes. */
  padAt(row,x,t,near=0){
    let best=null,dist=Infinity;
    for(const pad of row.pads){const px=padX(row,pad,t),d=Math.max(0,Math.abs(x-px)-pad.w/2);if(d<=near&&d<dist){best=pad;dist=d;}}
    return best;
  }
  /** Where he stands on the screen's own scale: rows up, x across. */
  get y(){return this.row*HOP.row;}
  tapTo(x,screenY){
    // Up, along, or back a row, by where the tap is; never further than a hop.
    const tapped=Math.round((HOP.base-screenY+this.cam)/HOP.row),to=this.row+clamp(tapped-this.row,-1,1);
    const row=this.rowAt(to);if(!row||to<this.base)return;
    const tx=clamp(x,this.x-HOP.reach,this.x+HOP.reach);
    let pad=null,offset=0;
    if(row.kind!=='bank'){pad=this.padAt(row,tx,this.time,HOP.near);if(pad){
      // Onto the part of the pad that can be seen, however much of it is still off the side.
      const px=padX(row,pad,this.time),lo=Math.max(-pad.w/2+6,HOP.edge+8-px),hi=Math.min(pad.w/2-6,HOP.width-HOP.edge-8-px);
      offset=lo<=hi?clamp(tx-px,lo,hi):clamp(tx-px,-pad.w/2+6,pad.w/2-6);if(Math.abs(px+offset-this.x)>HOP.reach+HOP.near)pad=null;}}
    if(this.state==='ready')this.state='play';
    this.hop={from:{x:this.x,row:this.row},to,pad,offset,x:clamp(tx,HOP.edge,HOP.width-HOP.edge),at:this.time};
    this.on=null;this.emit('hop',this.x,this.y,{to});
  }
  step(dt,input={}){
    if(this.over)return;
    dt=Math.min(dt,1/30);this.time+=dt;const t=this.time;
    for(const tap of input.taps||[]){if(tap.key)continue;if(this.hop)this.queued=tap;else this.tapTo(tap.x,tap.y);}
    if(this.hop){
      const h=this.hop,row=this.rowAt(h.to),k=(t-h.at)/HOP.hop;
      const goal=h.pad?padX(row,h.pad,t)+h.offset:h.x;
      this.x=h.from.x+(goal-h.from.x)*Math.min(1,k);
      if(k>=1){
        this.row=h.to;this.hop=null;
        if(row.kind==='bank'){this.x=goal;this.emit('land',this.x,this.y,{bank:true});}
        else if(h.pad&&!padUnder(row,h.pad,t)){this.on=h.pad;this.offset=h.offset;this.emit('land',this.x,this.y,{log:row.kind==='log'});}
        else{this.fallIn('splash');return;}
        if(this.row>this.score){this.score=this.row;this.emit('up',this.x,this.y,{score:this.score});}
        if(this.queued){const q=this.queued;this.queued=null;this.tapTo(q.x,q.y);}
      }
    }else if(this.on){
      const row=this.rowAt(this.row);this.x=padX(row,this.on,t)+this.offset;
      if(padUnder(row,this.on,t)){this.fallIn('dive');return;}
      if(this.x<HOP.edge||this.x>HOP.width-HOP.edge){this.fallIn('carried');return;}
    }
    // The view rises once he has started, and keeps up if he is quick.
    if(this.state==='play'){
      const d=hopDifficulty(this.score);this.cam+=hopScroll(d)*dt;
      const ahead=this.y-this.cam-(HOP.base-HOP.height*.62);if(ahead>0)this.cam+=ahead*Math.min(1,dt*3);
      if(HOP.base-(this.y-this.cam)>HOP.height+10){this.fallIn('behind');return;}
    }
    while(this.rows.at(-1).n<this.row+14)this.addRow(this.rows.at(-1).n+1);
    this.rows=this.rows.filter(r=>r.n>=this.row-10);
    const zone=zoneAt(HOP_ZONES,this.score)[2];
    if(zone>this.zone){this.zone=zone;this.emit('zone',this.x,this.y,{name:HOP_ZONES[zone][1]});}
  }
  fallIn(how){this.state='over';this.emit('splash',this.x,this.y,{how});}
}

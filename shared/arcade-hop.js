import {ease,seeded,zoneAt,clamp,lerp} from './arcade.js';

// Water Hop: Pou's Water Hop. Galgan crosses a river going up the screen, hopping from lily
// pad to lily pad and along floating logs, each row drifting its own way. Tap the pad to
// hop onto it; tapping his own row hops him along it. The river carries him, and a pad that
// takes him off the side drops him in. The view rises on its own once he starts, so he has
// to keep going. Later rows are faster, the pads smaller and further apart, and some dive
// for a moment now and then. Every gap is narrower than a hop, so from anywhere there is
// always a pad in reach in the next row.
export const HOP={width:400,height:600,row:62,base:530,reach:112,near:22,hop:.2,edge:6,margin:110};
export const HOP_ZONES=[[0,'The pond'],[20,'The stream'],[50,'The river'],[90,'Evening'],[140,'Night'],[200,'The sea']];
export const hopDifficulty=n=>ease(n,60);
export const hopScroll=d=>lerp(14,46,d);
const RING=HOP.width+HOP.margin*2,wrap=v=>((v%RING)+RING)%RING-HOP.margin;

/** Where a floating thing is at time t. */
export const padX=(row,pad,t)=>wrap(pad.x0+row.dir*row.speed*t);
/** Whether a diving pad is under at time t (for a moment in each turn). */
export const padUnder=(row,pad,t)=>row.kind==='sink'&&Math.sin(pad.omega*t+pad.phase)<-.72;

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
    const roll=r();const kind=d>.2&&roll<lerp(0,.28,d)?'sink':roll>lerp(.62,.7,d)?'log':'lily';
    const dir=r()<.75?-this.lastDir:this.lastDir;this.lastDir=dir;
    const speed=lerp(28,92,d)*(.75+r()*.5);
    // Pads round the ring the river turns on, never a gap wider than a hop can cross.
    const pads=[],maxGap=HOP.reach*2-40;let at=r()*60;
    while(true){
      const w=kind==='log'?lerp(150,92,d)*(.85+r()*.3):lerp(58,42,d)*(.9+r()*.2);
      const gap=Math.min(maxGap,(kind==='log'?lerp(40,130,d):lerp(26,108,d))*(.6+r()*.8));
      if(at+w+gap>RING){break;}
      pads.push({x0:at+w/2,w,omega:kind==='sink'?1.4+r()*.8:0,phase:r()*Math.PI*2});at+=w+gap;
    }
    // Close the ring: the last gap, back round to the first pad, is kept narrow too.
    const first=pads[0].x0-pads[0].w/2,last=pads.at(-1),tail=RING-(last.x0+last.w/2)+first;
    if(tail>maxGap)pads.push({x0:(last.x0+last.w/2+RING+first)/2,w:Math.min(kind==='log'?100:48,tail-20),omega:kind==='sink'?1.4+r()*.8:0,phase:r()*Math.PI*2});
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

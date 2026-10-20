import {rect,ellipse} from './art.js';
import {present,clamp} from './shared/world.js';
const ease=p=>{p=clamp(p,0,1);return p*p*(3-2*p);};
const lerp=(a,b,p)=>a+(b-a)*p;

// Visual choreography only. The tidy operation is already saved, so closing the
// page or changing rooms mid-animation can never lose the cleanup.
export class Tidying{
  constructor(scene,before){
    this.scene=scene;this.room=scene.room;this.started=performance.now();this.duration=scene.reduced?180:3200;this.owned=new Map();this.soundStage=-1;this.stopped=false;
    // Everybody who lives here helps; nobody who has not moved in yet turns up for it.
    const crew=present(before),gap=crew.length>5?56:67;
    this.jobs=before.objects.filter(o=>o.room===this.room).map((o,i)=>({from:o,to:scene.state.objects.find(n=>n.id===o.id),helper:crew[i%crew.length]}));
    this.helpers=crew.map((id,i)=>({id,home:{...before.actors[id]},from:before.actors[id].room===this.room?{...before.actors[id]}:{x:i%2?470+(scene.ox||0):-70-(scene.ox||0),y:260},spot:{x:(crew.length>5?60:64)+i*gap,y:240+i%2*35}}));
    this.dust=before.traces.filter(t=>t.room===this.room);this.progress=0;
  }
  override(id,value){this.scene.override[id]=value;this.owned.set(id,value);}
  update(now){
    const p=(now-this.started)/this.duration;this.progress=p;
    if(p>=1||this.room!==this.scene.room){this.stop();return false;}
    const work=ease((p-.18)/.42),returning=ease((p-.64)/.36);
    for(const [i,h]of this.helpers.entries()){
      const job=this.jobs.find(j=>j.helper===h.id),start=job?.from||h.spot;
      const dest=job?.to?.room===this.room?job.to:{x:330,y:292};
      const x=job?lerp(start.x,dest.x,work)-22:h.spot.x+Math.sin(p*18+i)*13,y=job?lerp(start.y,dest.y,work)+10:h.spot.y;
      const approach=ease(p/.2),a=this.scene.state.actors[h.id],home=a.room===this.room?a:h.from;
      this.override(h.id,{x:lerp(lerp(h.from.x,x,approach),home.x,returning),y:lerp(lerp(h.from.y,y,approach),home.y,returning)-Math.abs(Math.sin(p*35+i))*2,room:this.room});
    }
    for(const [i,job]of this.jobs.entries())if(job.to&&job.to.room===this.room){const settle=ease((p-.18-i%3*.025)/.38),bounce=Math.sin(settle*Math.PI)*6;this.override(job.from.id,{x:lerp(job.from.x,job.to.x,settle),y:lerp(job.from.y,job.to.y,settle)-bounce/(this.scene.sy||1),room:this.room});}
    if(p>.62&&!this.shone){this.shone=true;this.scene.callbacks.onSound?.('tidy');}
    const stage=Math.floor(p*4);if(stage!==this.soundStage){this.soundStage=stage;this.scene.callbacks.onSound?.(stage===3?'drop':'sweep');}
    return true;
  }
  draw(c){
    const p=this.progress,work=ease((p-.18)/.42);
    // Mess gathers in a little pile instead of vanishing on the first frame.
    for(const [i,d]of this.dust.entries()){c.save();c.globalAlpha=1-work;this.scene.trace(c,{...d,x:lerp(d.x,336,work),y:lerp(d.y,290,work)},0);c.restore();}
    if(p<.64)for(let i=0;i<16;i++){const k=ease((p-.2)/.4),x=lerp(45+(i*53)%310,337,k),y=lerp(216+(i*23)%88,292,k);c.save();c.globalAlpha=Math.sin(clamp(p/.64,0,1)*Math.PI)*.7;rect(c,x,y,2,2/(this.scene.sy||1),i%2?'#bca47c':'#efe0b8');c.restore();}
    for(const job of this.jobs)if(!job.to||job.to.room!==this.room){const x=lerp(job.from.x,338,work),y=lerp(job.from.y,290,work);c.save();c.globalAlpha=1-work*.95;this.scene.item(c,job.from.type,x,y,{scale:1-work*.7});c.restore();}
    // Even a clean room gets a tiny enthusiastic sweep. Monki wears the bucket.
    for(const [i,h]of this.helpers.entries()){
      const a=this.scene.override[h.id];if(!a)continue;
      if(h.id==='monki'&&p<.64){this.scene.item(c,'bowl',a.x,a.y-39/(this.scene.sy||1),{scale:.85});continue;}
      if(p<.64){const x=a.x+17+Math.sin(p*35+i)*5,y=a.y+1;
        c.save();c.translate(x,y);c.scale(1,1/(this.scene.sy||1));c.translate(-x,-y);
        rect(c,x,y-24,2,21,'#a77b4b');rect(c,x-5,y-5,13,7,'#d8bd72');for(let n=0;n<4;n++)rect(c,x-4+n*3,y-2,1,5,'#a99358');
        c.save();c.globalAlpha=Math.sin(p*Math.PI)*.65;for(let n=0;n<3;n++)ellipse(c,x-8+n*8,y+4-n%2*4,4+n,2,'#f3e7c9');c.restore();c.restore();}
    }
    if(p>.6&&p<.9){const phase=(p-.6)/.3;c.save();c.globalAlpha=Math.sin(phase*Math.PI)*.13;const x=-40+phase*500; c.fillStyle='#fff4c9';c.beginPath();c.moveTo(x,173);c.lineTo(x+23,173);c.lineTo(x+73,316);c.lineTo(x+50,316);c.closePath();c.fill();c.restore();}
    if(p>.65){for(let i=0;i<9;i++){const fade=Math.sin(clamp((p-.65-i*.012)/.22,0,1)*Math.PI),x=40+i*39,y=214+i%3*31;c.save();c.globalAlpha=Math.max(0,fade);c.translate(x,y);c.scale(1,1/(this.scene.sy||1));rect(c,-1,-5,2,11,'#fff5ca');rect(c,-5,-1,10,2,'#fff5ca');c.restore();}}
  }
  stop(){if(this.stopped)return;this.stopped=true;for(const [id,value]of this.owned)if(this.scene.override[id]===value)delete this.scene.override[id];this.owned.clear();this.scene.callbacks.onTidyEnd?.();}
}

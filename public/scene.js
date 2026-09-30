import {character,item,rect,poly,ellipse,shadow} from './art.js';
import {random,clamp,ACTORS} from './shared/world.js';
import {RoomToys} from './room-toys.js';
import {weatherFor} from './shared/places.js';
import {plantStage,DISCOVERIES} from './shared/life.js';
import {ambienceAt,mix} from './shared/ambience.js';
import {Tidying} from './tidying.js';
import {ADVENTURES} from './shared/adventures.js';
import {FURNITURE,SOUVENIR_SPOTS,decorOption} from './shared/decor.js';
import {furniture} from './furniture-art.js';
import {AmbientLife} from './ambient-life.js';

/** Touching something has to be worth doing on its own, before any of the rest of
 * the game means anything. Each resident answers a poke in their own way, and
 * repeating it quickly escalates. */
const REACTIONS={
  monki:['hop','spin','tumble','squash','spin'],
  sernik:['hop','shake','hop','spin','tumble'],
  galgan:['shake','squash','flop','shake','flop'],
  david:['hop','shake','squash'],
  julia:['hop','shake','squash'],
};
const CHAPTERS_BY_ID=Object.fromEntries(ADVENTURES.map(chapter=>[chapter.id,chapter]));
const THING_REACTIONS={couch:'squash',lamp:'shake',plant:'shake',bowl:'hop',radio:'shake',fridge:'shake',potato:'hop'};
const rng=random('a-house-for-five');
const plants=[];
export class Scene {
  constructor(canvas,{onTap,onMove,onDoor,onFrame,onMoment,onFridge,onIncident,onGift,onHold,onPop,onToyResult}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.callbacks={onTap,onMove,onDoor,onFrame,onMoment,onFridge,onIncident,onGift,onHold,onPop};this.room='house';this.state=null;this.animations={};this.hitboxes=[];this.down=null;this.moving=null;this.time=0;this.selected=null;this.night=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.callbacks.onToyResult=onToyResult;this.toys=new RoomToys(this);this.ambient=new AmbientLife();this.bubbles=[];this.toy=null;this.petEffects={};this.ambience=ambienceAt();
    this.resize();window.addEventListener('resize',()=>this.resize());
    canvas.addEventListener('pointerdown',e=>{if(this.toys.input('down',this.at(e))){canvas.setPointerCapture(e.pointerId);return;}this.pointerDown(e);});canvas.addEventListener('pointermove',e=>{if(!this.toys.input('move',this.at(e)))this.pointerMove(e);});canvas.addEventListener('pointerup',e=>{if(!this.toys.input('up',this.at(e)))this.pointerUp(e);});canvas.addEventListener('pointercancel',()=>{this.down=null;this.moving=null;this.toys.pointer=null;});
    this.override={};this.hiddenObjects=new Set();this.traceCutoff=Infinity;this.replaying=false;this.highlight=null;
    this.running=true;this.draw(0);
  }
  resize(){
    this.immersive=matchMedia('(max-width:700px), (max-width:1000px) and (max-height:500px)').matches;
    document.documentElement.classList.toggle('immersive',this.immersive);
    const r=this.canvas.getBoundingClientRect(),land=r.width>r.height;
    this.width=this.immersive?(land?Math.round(400*r.width/r.height):400):560;
    this.height=this.immersive?(land?400:Math.round(400*r.height/r.width)):360;
    const dock=document.documentElement.classList.contains('decorating')?document.querySelector('#decor-editor'):document.querySelector('.controls-backdrop');
    const unit=this.width/r.width,top=((document.querySelector('.scene-bar')?.getBoundingClientRect().bottom||54)+14)*unit,bottom=((dock?.getBoundingClientRect().height||156)+10)*unit;
    this.sy=this.immersive&&!land?clamp((this.height-top-bottom)/281,1,2.3):1;
    this.actorScale=this.propScale=this.immersive?1.4:1;
    // In landscape the dock sits on the right; center residents in the free
    // area, rather than placing the rightmost dog underneath the controls.
    const sideDock=this.immersive&&land?(document.querySelector(document.documentElement.classList.contains('decorating')?'#decor-editor':'.controls-backdrop')?.getBoundingClientRect().width||290)*unit:0;
    // The wall starts just under the location bar in both orientations. Landscape had a fixed
    // -20, which hid the top of the window and of the shared drawing behind the bar.
    this.ox=(this.width-sideDock-400)/2;this.oy=this.immersive?top-55*this.sy:0;
    this.resolution=Math.min(3,window.devicePixelRatio||1)*r.width/this.width;
    this.canvas.width=Math.round(this.width*this.resolution);this.canvas.height=Math.round(this.height*this.resolution);this.c.imageSmoothingEnabled=false;
    this.toyCanvas=document.getElementById('toy-layer');
    if(this.toyCanvas){this.toyCanvas.width=this.canvas.width;this.toyCanvas.height=this.canvas.height;this.toyRect=null;this.placeToyLayer(r);this.toyContext=this.toyCanvas.getContext('2d');}
  }
  /** The toy overlay is fixed to the screen; the room is not on a scrolling page, and it
   * moves when a toy hides the story card. Keep the overlay on the room, not where it was. */
  placeToyLayer(r=this.canvas.getBoundingClientRect()){
    const p=this.toyRect;if(p&&p.left===r.left&&p.top===r.top&&p.width===r.width&&p.height===r.height)return;
    this.toyRect={left:r.left,top:r.top,width:r.width,height:r.height};Object.assign(this.toyCanvas.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  }
  // More depth on a portrait screen, without stretching character pixels.
  item(c,id,x,y,options={}){c.save();c.translate(x,y);c.scale(1,1/(this.sy||1));const scale=(options.scale??1)*(this.propScale||1);if(FURNITURE[id]&&(!FURNITURE[id].legacy||options.finish))furniture(c,id,0,0,{scale,finish:options.finish,showShadow:options.shadow!==false});else item(c,id,0,0,{...options,scale});c.restore();}
  character(c,id,x,y,options={}){c.save();c.translate(x,y);c.scale(1,1/(this.sy||1));character(c,id,0,0,{...options,scale:(options.scale??1)*(this.actorScale||1)});c.restore();}
  update(state,room,actor){this.state=state;this.room=room;this.actor=actor;}
  at(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.width||this.canvas.width)/r.width-this.ox,y:((e.clientY-r.top)*(this.height||this.canvas.height)/r.height-this.oy)/(this.sy||1)};}
  screenPoint(p){const r=this.canvas.getBoundingClientRect();return{x:r.left+(p.x+this.ox)*r.width/this.width,y:r.top+(p.y*this.sy+this.oy)*r.height/this.height};}
  position(id){return this.moving?.id===id?this.moving:this.override?.[id]||this.ambient?.poseFor(id,this.time)||this.state.actors[id]||this.state.objects.find(o=>o.id===id);}
  /** Where a resident is drawn this frame, with its saved room while it is being carried. */
  actorAt(id){return {...this.state.actors[id],...this.position(id)};}
  pointerDown(e){if(this.tidying)return;if(this.replaying){this.stopReplay();return;}if(e.button!==0)return;e.preventDefault();this.canvas.setPointerCapture(e.pointerId);const p=this.at(e);const hit=[...this.hitboxes].reverse().find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h&&(!this.decorEditing||h.id.startsWith('decor:')||this.state.objects.some(o=>o.id===h.id)));if(hit?.movable){const entity=this.position(hit.id);hit.offsetY=entity.y-p.y;hit.offsetX=entity.x-p.x;}
    if(this.decorEditing){this.down={...p,hit,time:performance.now(),last:p,travel:0};return;}
    // A chapter invitation is drawn over its star. A tap on it should open the
    // chapter; a stroke on a dog underneath should still reach the dog.
    let dogUnder=null;
    if(hit?.action==='onIncident'){
      dogUnder=[...this.hitboxes].reverse().find(h=>['sernik','galgan'].includes(h.id)&&p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h)||null;
      if(dogUnder){const a=this.position(dogUnder.id);dogUnder.offsetY=a.y-p.y;dogUnder.offsetX=a.x-p.x;}
    }
    this.down={...p,hit,dogUnder,time:performance.now(),last:p,travel:0,petting:false};}
  pointerMove(e){
    // Once it is clearly a stroke rather than a tap (the same 7px the room uses to
    // tell petting from tapping), hand the gesture to the dog under the invitation.
    if(this.down?.dogUnder&&!this.moving){const q=this.at(e),d=this.down,from=d.preLast||d;
      d.preTravel=(d.preTravel||0)+Math.hypot(q.x-from.x,q.y-from.y);d.preLast=q;
      if(d.preTravel>7){d.hit=d.dogUnder;d.dogUnder=null;d.travel=d.preTravel;d.last=q;}}
    if(!this.down?.hit?.movable)return;const p=this.at(e),d=this.down;
    const distance=Math.hypot(p.x-d.x,p.y-d.y),dog=['sernik','galgan'].includes(d.hit.id);
    const outsideDog=dog&&(p.x<d.hit.x-6||p.x>d.hit.x+d.hit.w+6||p.y<d.hit.y-6||p.y>d.hit.y+d.hit.h+6);
    d.travel+=Math.hypot(p.x-d.last.x,p.y-d.last.y);d.last=p;
    // Spatial intent, not a race against a timer: a local stroke pets, pulling
    // away picks up. A stroke can always become a drag. Persist only on release.
    if(dog&&!this.moving&&!outsideDog){
      if(d.travel>7){if(!d.petting)this.callbacks.onSound?.('pet-long');d.petting=true;this.petEffects[d.hit.id]={at:performance.now(),power:Math.min(1,d.travel/125)};}
      return;
    }
    if(this.moving||(dog?outsideDog:distance>=5)){
      if(!this.moving){this.callbacks.onDragStart?.();this.callbacks.onSound?.('pick');}
      d.petting=false;delete this.petEffects[d.hit.id];
      this.moving={id:d.hit.id,x:clamp(p.x+(dog?d.hit.offsetX:0),35,365),y:clamp(p.y+d.hit.offsetY,171,314)};
    }
  }
  pointerUp(e){if(!this.down)return;const p=this.at(e),hit=this.down.hit;
    if(this.decorEditing){
      if(this.moving){this.animations[this.moving.id]={start:performance.now(),ms:340,kind:'land',n:1};this.callbacks.onMove(this.moving,this.room);this.callbacks.onDecorSelect?.(this.moving.id);}
      else if(this.decorPlacement)this.callbacks.onDecorPlace?.(p);
      else this.callbacks.onDecorSelect?.(hit?.id||null);
      this.down=null;this.moving=null;return;
    }
    const held=performance.now()-this.down.time>420;
    if(this.moving){this.animations[this.moving.id]={start:performance.now(),ms:340,kind:'land',n:1};this.callbacks.onMove(this.moving,this.room);}
    else if(this.down.petting)this.callbacks.onPet?.(hit.id);
    else if(hit){
      if(hit.action==='popBubble'){this.bubbles=this.bubbles.filter(b=>b.id!==hit.id);this.callbacks.onPop?.();}
      else if(hit.action)this.callbacks[hit.action]?.(hit.id);
      else if(held)this.callbacks.onHold?.(hit.id,p);
      else this.callbacks.onTap(hit.id,p);
    }
    else this.callbacks.onTap(null,p);
    this.down=null;this.moving=null;
  }
  react(id,type){
    const now=performance.now(),prev=this.animations[id];
    // Poking again before the last one settles makes the next one bigger.
    const n=prev&&now-prev.start<1500?Math.min(prev.n+1,6):1;
    const bond=this.state?.bond?.[this.actor]?.[id]||0;
    const pool=bond>=12&&REACTIONS[id]?[...REACTIONS[id],'spin','tumble','hop']:REACTIONS[id]||[THING_REACTIONS[type]||'hop'];
    this.animations[id]={start:now,ms:480+n*45,kind:pool[(n-1)%pool.length],n};
    return n;
  }
  playWith(kind){if(this.toys.mode===kind)this.toys.clear();else this.toys.start(kind);}
  startTidy(before){this.toys.clear();this.down=null;this.moving=null;this.tidying?.stop();this.tidying=new Tidying(this,before);}
  stopTidy(){this.tidying?.stop();this.tidying=null;}
  /** The transform a reaction applies this frame, pivoting on the thing's feet. */
  reactionAt(id,time){
    const a=this.animations[id];if(!a)return null;
    const k=(time-a.start)/a.ms;if(k<0||k>=1)return null;
    const amp=Math.min(2,.75+a.n*.2),fade=1-k,dir=a.n%2?1:-1;
    switch(a.kind){
      case 'land':return{sx:1+Math.sin(k*Math.PI*2)*.12*fade,sy:1-Math.sin(k*Math.PI*2)*.12*fade,dy:-Math.abs(Math.sin(k*Math.PI*2))*3*fade};
      case 'hop':return{dy:-Math.abs(Math.sin(k*Math.PI*2))*13*amp};
      case 'shake':return{dx:Math.sin(k*Math.PI*10)*4.5*amp*fade};
      case 'spin':return{rot:k*Math.PI*2*dir};
      case 'tumble':return{rot:Math.sin(k*Math.PI*2)*.9*amp*dir,dy:-Math.sin(k*Math.PI)*10};
      case 'squash':return{sx:1+Math.sin(k*Math.PI)*.3*amp,sy:1-Math.sin(k*Math.PI)*.26*amp};
      case 'flop':return{rot:Math.sin(k*Math.PI)*1.4*dir,dy:Math.sin(k*Math.PI)*4};
    }
    return null;
  }

  /** Show someone what moved while they were not looking. The room rewinds to how
   * they left it and then plays the changes back, one at a time, with no words. */
  startReplay(items,onDone){
    this.toys.clear();this.stopTidy();
    this.replayQueue=items;this.replayIndex=-1;this.replayDone=onDone;
    this.override={};this.hiddenObjects=new Set();this.highlight=null;
    let cutoff=Infinity;
    for(const it of items){
      // Items are chronological, so the earliest one holds the position she left it in.
      if((it.kind==='object'||it.kind==='actor')&&!this.override[it.id])this.override[it.id]={...it.from};
      if(it.kind==='appear')this.hiddenObjects.add(it.id);
      if(it.kind==='trace')cutoff=Math.min(cutoff,it.trace.at-1);
    }
    this.traceCutoff=cutoff;this.replaying=true;this.stepAt=0;this.tween=null;
  }
  stopReplay(){
    if(!this.replaying)return;
    this.replaying=false;this.override={};this.hiddenObjects=new Set();this.traceCutoff=Infinity;this.tween=null;this.highlight=null;
    const done=this.replayDone;this.replayDone=null;done?.();
  }
  advanceReplay(time){
    const STEP=560;
    if(!this.stepAt){this.stepAt=time;return;}
    if(this.tween){
      const t=this.tween,k=clamp((time-t.at)/400,0,1),ease=k*k*(3-2*k),o=this.override[t.id];
      if(o){o.x=t.from.x+(t.to.x-t.from.x)*ease;o.y=t.from.y+(t.to.y-t.from.y)*ease;
        if(k>=1){o.room=t.to.room;delete this.override[t.id];this.tween=null;}}
      else this.tween=null;
    }
    if(time-this.stepAt<STEP)return;
    this.stepAt=time;this.replayIndex++;
    const item=this.replayQueue[this.replayIndex];
    if(!item){this.stopReplay();return;}
    const mark=(x,y,room)=>{this.highlight={who:item.who,at:time,x,y,room};};
    if(item.kind==='object'||item.kind==='actor'){
      this.override[item.id]={...item.from};
      this.tween={id:item.id,from:item.from,to:item.to,at:time};
      mark(item.to.x,item.to.y,item.to.room);
    }else if(item.kind==='appear'){this.hiddenObjects.delete(item.id);mark(item.to.x,item.to.y,item.to.room);}
    else if(item.kind==='gone')mark(item.from.x,item.from.y,item.from.room);
    else if(item.kind==='hat'){const a=this.state.actors[item.id];this.react(item.id);mark(a.x,a.y,a.room);}
    else if(item.kind==='trace'){this.traceCutoff=item.trace.at;mark(item.trace.x,item.trace.y,item.trace.room);}
  }
  hit(id,x,y,w,h,extra={}){this.hitboxes.push({id,x,y,w,h,...extra});}
  // `resting` while a full-screen game covers the room: nothing here is visible, and redrawing it
  // under a blurred backdrop cost the game its frames on a phone.
  draw(time){if(!this.running)return;this.time=time;requestAnimationFrame(t=>this.draw(t));if(document.hidden||!this.state||this.resting)return;
    if(this.replaying)this.advanceReplay(time);
    this.toys.update(time);
    if(this.tidying&&!this.tidying.update(time))this.tidying=null;
    this.weather=this.weatherOverride||weatherFor(this.state);
    this.ambient.update(time,this);
    const c=this.c,w=this.width,h=this.height,t=this.reduced?0:time/1000;
    c.setTransform(this.resolution,0,0,this.resolution,0,0);
    c.clearRect(0,0,w,h);rect(c,0,0,w,h,mix('#526467','#dbe5c8',this.ambience.light));
    // Quiet, wide landscape continues around the dollhouse at desktop sizes.
    for(const p of plants){const x=(p.x+w)%w,y=p.y%h;rect(c,x,y,2,1,this.night?'#829482':p.s>.5?'#c3d3aa':'#ceddb8');if(p.s>.88){rect(c,x,y-2,1,3,'#aebf92');rect(c,x-1,y-3,3,1,'#f0e9c4');}}
    c.save();c.translate(this.ox,this.oy);c.scale(1,this.sy);this.hitboxes=[];
    if(this.room==='house')this.house(c,t);else if(this.room==='garden')this.garden(c,t);else if(this.room==='roof')this.roof(c,t);else this.cellar(c,t);
    const newestHere=this.state.moments?.find(m=>CHAPTERS_BY_ID[m.chapter]?.room===this.room);
    const newestSouvenir=CHAPTERS_BY_ID[newestHere?.chapter]?.souvenir;
    for(const decor of this.state.decor||[]){
      if(this.state.catalog?.hiddenDecor?.includes(decor))continue;
      const newest=decor===newestSouvenir;
      const extra=SOUVENIR_SPOTS[decor];
      if(!extra||this.room!==extra[0])continue;
      const x=extra[1]+(decor==='boat'?Math.sin(t)*6:0),y=extra[2];
      this.item(c,decor,x,y,{scale:extra[3]*(newest?1.2:1),shadow:newest&&y>200});
      if(decor==='lily')this.item(c,'frog',300,248,{scale:.55});
      this.hit(`decor:${decor}`,x-15*this.propScale,y-32*this.propScale/this.sy,30*this.propScale,36*this.propScale/this.sy);
    }
    for(const trace of this.state.traces.filter(v=>v.room===this.room&&v.at<=this.traceCutoff))this.trace(c,trace,t);
    // One small incoming parcel at a clear edge is enough to say "something is
    // waiting". Draw it behind the cast so it never masks a resident or steals
    // a touch from one. Outgoing gifts belong on the other person's phone.
    const waiting=this.room==='house'?this.state.gifts.find(g=>!g.opened&&g.to===this.actor):null;
    if(waiting){
      const anchors=[[43,289],[356,281],[44,229],[354,230]];
      const obstacles=[...ACTORS.map(id=>this.position(id)).filter(a=>a?.room==='house'),...this.state.objects.filter(o=>o.room==='house')];
      const {x,y}=anchors.map(([x,y])=>({x,y,gap:Math.min(...obstacles.map(a=>Math.hypot(x-a.x,y-a.y)))})).sort((a,b)=>b.gap-a.gap)[0]||{x:43,y:289};
      const up=(this.propScale||1)/(this.sy||1);
      this.item(c,'present',x,y,{scale:.62,shadow:true});this.sparkle(c,x+11,y-25*up,t);
      this.hit(waiting.id,x-17,y-30*up,34,35*up,{action:'onGift'});
    }
    const place=e=>{const o=this.override[e.id]||(e.kind==='actor'?this.ambient.poseFor(e.id,time):null);return o?{...e,...o}:e;};
    const objects=this.state.objects.filter(o=>!this.hiddenObjects.has(o.id)).map(o=>place({...o,kind:'object'})).filter(o=>o.room===this.room);
    const actors=ACTORS.map(id=>place({...this.state.actors[id],id,kind:'actor'})).filter(a=>a.room===this.room&&!(a.id==='sernik'&&this.toys.shots.length));
    const entities=[...objects,...actors].map(e=>this.moving?.id===e.id?{...e,...this.moving}:e).sort((a,b)=>a.y-b.y);
    const event=this.state.incident;
    for(const entity of entities){const{x,y,id}=entity;
      const held=this.moving?.id===id;
      const lift=held?(12+Math.sin(t*8)*2)/this.sy:0;
      // Ground marks are drawn flat, not stretched into tall ovals on a portrait phone.
      if(this.selected===id||held){const k=(entity.kind==='actor'?this.actorScale:this.propScale)||1;c.save();c.translate(x,y);c.scale(k,k/(this.sy||1));
        if(this.selected===id)ellipse(c,0,1,17,5,'#e9e3a5');if(held)shadow(c,0,2,entity.type==='couch'?30:13);c.restore();}
      const fx=this.reactionAt(id,time);
      c.save();
      if(fx){c.translate(x+(fx.dx||0),y+(fx.dy||0));if(fx.rot)c.rotate(fx.rot);if(fx.sx||fx.sy)c.scale(fx.sx||1,fx.sy||1);c.translate(-x,-y);}
      if(entity.kind==='actor'){
        const petFx=this.petEffects[id],sharedPet=Math.max(0,1-(Date.now()-(entity.petAt||0))/9000)*.55;
        const pet=Math.max(sharedPet,petFx?Math.max(0,petFx.power-(time-petFx.at)/4000):0),frame=pet>0||entity.running?t*9:Math.floor(t+(ACTORS.indexOf(id)*.7));
        this.character(c,id,x,y-lift,{hat:entity.hat,mood:this.tidying||held?'happy':entity.mood,frame:held?t*7:frame,carried:held,running:entity.running,flip:entity.ambient&&entity.flip,pet:this.tidying||held?0:pet});
        // Marks beside a resident keep the sprite's own proportions. A portrait phone stretches
        // the floor, and a "z" 30 floor units up floated far above a sleeping dog.
        const s=this.actorScale||1,up=s/(this.sy||1);
        if(pet>.3){this.sparkle(c,x-18*s,y-42*up,t);this.sparkle(c,x+24*s,y-37*up,t+.7);}
        if(entity.mood==='sleep'&&Math.sin(t*1.5)>-.5){c.save();c.translate(x,y);c.scale(s,up);c.fillStyle='#8d967e';c.font='8px monospace';c.fillText('z',15,-30-(t%2)*3);c.restore();}
        if(entity.mood==='annoyed'){c.save();c.translate(x,y);c.scale(s,up);rect(c,-2,-47,11,7,'#a8b295');rect(c,1,-48,5,1,'#a8b295');c.fillStyle='#627152';c.font='6px monospace';c.fillText('...',0,-42);c.restore();}
        c.restore();
        const dog=['sernik','galgan'].includes(id);
        const scale=this.actorScale;this.hit(id,x-(dog?31:20)*scale,y-42*scale/this.sy,(dog?62:40)*scale,46*scale/this.sy,{movable:true});
      }else{
        this.item(c,entity.type,x,y-lift,{shadow:true,finish:entity.finish});
        c.restore();
        const dimensions=FURNITURE[entity.type]?.size|| (entity.type==='couch'?[72,46]:entity.type==='plant'?[36,53]:entity.type==='lamp'?[37,60]:entity.type==='bowl'?[35,10]:entity.type==='radio'?[31,25]:[29,31]);
        this.hit(id,x-dimensions[0]*this.propScale/2,y-dimensions[1]*this.propScale/this.sy,dimensions[0]*this.propScale,dimensions[1]*this.propScale/this.sy,{movable:true});
        const stashed=this.state.hidden?.[id];
        if(stashed&&stashed.from!==this.actor&&!this.replaying)this.sparkle(c,x+11*this.propScale,y-(dimensions[1]-4)*this.propScale/this.sy,t);
      }
    }
    this.ambient.draw(c,time,this);
    // One physical receipt of what happened here, not a stack of popups. The
    // partner's portrait makes authorship visible even before Moments is opened.
    if(newestHere){
      const chapter=CHAPTERS_BY_ID[newestHere.chapter];
      // Keep this off the house doodle, clock and unlockable wall keepsakes.
      const spot={house:[304,95],garden:[121,170],roof:[296,137],cellar:[83,122]}[this.room];
      if(chapter&&spot){const[x,y]=spot,s=this.propScale;
        c.save();c.translate(x,y);c.scale(s,s/this.sy);
        rect(c,-14,-31,28,30,'#9b8466');rect(c,-12,-29,24,25,'#f5edda');
        c.save();c.beginPath();c.rect(-10,-27,20,18);c.clip();rect(c,-10,-27,20,18,chapter.color||'#aebfa8');
        item(c,chapter.souvenir,0,-7,{scale:.42});c.restore();
        rect(c,-8,-6,15,2,'#b6a785');rect(c,10,-6,2,2,'#b6a785');c.restore();
        this.hit('moment',x-21*s,y-38*s/this.sy,42*s,44*s/this.sy,{action:'onMoment'});
      }
    }
    // Who did it, floating over the thing they did it to.
    if(this.replaying&&this.highlight?.room===this.room){
      const h=this.highlight,age=Math.min(1,(time-h.at)/700);
      const r=13+Math.sin(age*Math.PI)*11;
      c.strokeStyle='#87996a';c.lineWidth=1.5;c.globalAlpha=1-age*.35;
      c.beginPath();c.ellipse(h.x,h.y+2,r,r*.42,0,0,7);c.stroke();c.globalAlpha=1;
      if(ACTORS.includes(h.who))this.character(c,h.who,h.x,h.y-36,{scale:.62});
    }
    if(event?.room===this.room&&!this.replaying)this.incident(c,event,t);
    const found=this.state.life?.finds?.[this.actor];
    // Above the resident's head at any screen shape, and with it when a scene moves it.
    const fup=(this.actorScale||1)/(this.sy||1),fa=found&&this.actorAt(found.actor);
    if(found?.fresh){const a=fa;if(a.room===this.room){this.sparkle(c,a.x+30,a.y-52*fup,t);this.hit('find',a.x+7,a.y-82*fup,46,43*fup,{action:'onFind'});}}
    else if(found){const a=fa,d=DISCOVERIES.find(d=>d.id===found.discovery);if(d&&a.room===this.room){this.item(c,d.item,a.x+22,a.y-47*fup,{scale:.7});this.sparkle(c,a.x+37,a.y-51*fup,t);this.hit('find',a.x+7,a.y-82*fup,46,43*fup,{action:'onFind'});}}
    this.tidying?.draw(c);
    if(this.room==='garden'||this.room==='roof')this.weatherFront(c,t);
    this.lightFront(c);
    c.restore();
    if(this.toyContext&&this.toys.mode)this.placeToyLayer();
    const toy=this.toyContext||c;toy.setTransform(this.resolution,0,0,this.resolution,0,0);if(this.toyContext)toy.clearRect(0,0,w,h);toy.save();toy.translate(this.ox,this.oy);toy.scale(1,this.sy);this.toys.draw(toy,time);toy.restore();
    if(this.replaying)this.replayFrame(c,w,h);
  }
  /** A border and a row of dots: enough to say "this already happened" without words. */
  replayFrame(c,w,h){
    const total=this.replayQueue?.length||0,done=clamp(this.replayIndex+1,0,total);
    c.save();
    c.globalAlpha=.5;rect(c,0,0,w,3,'#8b9d6c');rect(c,0,h-3,w,3,'#8b9d6c');rect(c,0,0,3,h,'#8b9d6c');rect(c,w-3,0,3,h,'#8b9d6c');
    c.globalAlpha=1;
    const gap=9,startX=Math.round(w/2-(total-1)*gap/2);
    for(let i=0;i<total;i++)rect(c,startX+i*gap-2,h-13,4,4,i<done?'#6f8455':'#b9c7a2');
    c.restore();
  }
  surfacePattern(c,kind,style,x,y,w,h){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    const accent=this.night?mix('#574b55',style.accent,.65):style.accent;
    if(kind==='wall'){
      if(['brick','stone','tile'].includes(style.pattern)){
        const cellW=style.pattern==='tile'?18:style.pattern==='brick'?27:32;
        const cellH=style.pattern==='tile'?18:style.pattern==='brick'?13:17;
        for(let yy=y;yy<y+h;yy+=cellH){
          rect(c,x,yy,w,1,accent);
          for(let xx=x+((Math.floor((yy-y)/cellH)%2)*Math.floor(cellW/2));xx<x+w;xx+=cellW)rect(c,xx,yy+1,1,cellH-1,accent);
        }
        c.restore();return;
      }
      for(let yy=y+11;yy<y+h;yy+=20)for(let xx=x+10;xx<x+w;xx+=23){
        const shift=(Math.floor((yy-y)/20)%2)*8,X=xx+shift;
        if(style.pattern==='stripe')rect(c,X,yy-9,2,20,accent);
        else if(style.pattern==='grid'){rect(c,X,yy-9,1,20,accent);rect(c,X-11,yy+8,23,1,accent);}
        else if(style.pattern==='dot'||style.pattern==='fleck')rect(c,X,yy,style.pattern==='dot'?3:1,style.pattern==='dot'?3:2,accent);
        else if(style.pattern==='leaf'){rect(c,X,yy,2,6,accent);rect(c,X+2,yy-2,4,3,accent);}
        else if(style.pattern==='flower'){rect(c,X-2,yy,6,2,accent);rect(c,X,yy-2,2,6,accent);}
        else if(style.pattern==='star'){rect(c,X-2,yy,6,1,accent);rect(c,X,yy-2,1,5,accent);}
        else if(style.pattern==='cloud'){rect(c,X-5,yy,12,2,accent);rect(c,X-2,yy-3,6,3,accent);}
      }
    }else if(style.pattern==='plank'){
      for(let yy=y+8;yy<y+h;yy+=20){rect(c,x,yy,w,1,accent);for(let xx=x+((Math.floor((yy-y)/20)%2)*38);xx<x+w;xx+=76)rect(c,xx,yy+1,1,19,accent);}
    }else if(style.pattern==='tile'||style.pattern==='checker'){
      for(let yy=y;yy<y+h;yy+=22)for(let xx=x;xx<x+w;xx+=22){if(style.pattern==='checker'&&(Math.floor((xx-x)/22)+Math.floor((yy-y)/22))%2===0)rect(c,xx,yy,22,22,accent);else{rect(c,xx,yy,22,1,accent);rect(c,xx,yy,1,22,accent);}}
    }else if(style.pattern==='stone'){
      for(let yy=y+19,row=0;yy<y+h;yy+=23,row++){
        rect(c,x,yy,w,1,accent);
        for(let xx=x+(row%2?18:0);xx<x+w;xx+=row%3===0?41:34)rect(c,xx,yy+1,1,22,accent);
      }
    }
    c.restore();
  }
  landscape(c,style,x,y,w,h,t=0){
    if(!style||style.id==='plain')return;
    // Backdrops sit behind the place, not on top of it. Keep the silhouette
    // low and tinted by the actual sky so every finish works at noon and night.
    const sky=this.ambience.sky;
    const distant=this.night?mix('#30465a',style.color,.27):mix(sky,style.color,.43);
    const near=this.night?mix('#283e49',style.accent,.33):mix(sky,style.accent,.61);
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    const X=f=>x+w*f,Y=f=>y+h*f;
    if(style.id==='sea'){
      rect(c,x,Y(.62),w,h*.38,distant);rect(c,x,Y(.79),w,h*.21,near);
      for(let i=0;i<11;i++)rect(c,X((i*31%100)/100),Y(.7+(i%3)*.08),w*.035,1,this.night?'#99b8ba':'#d6e8df');
    }else if(style.id==='city'){
      rect(c,x,Y(.91),w,h*.09,near);
      for(let i=0;i<18;i++){const bx=X(i/18),height=.16+(i*13%5)*.075;rect(c,bx,Y(1-height),w/18+1,h*height,i%3?distant:near);if(this.night&&i%2===0)rect(c,bx+w/55,Y(1-height)+h*.11,Math.max(1,w/150),Math.max(1,h*.025),'#d6c99f');}
    }else if(style.id==='mountains'){
      for(let i=0;i<5;i++)poly(c,[[X((i-1)/4),Y(1)],[X(i/4+.08),Y(.46+i%2*.15)],[X((i+1)/4+.2),Y(1)]],i%2?distant:near);
      for(let i=0;i<5;i++)poly(c,[[X(i/4+.042),Y(.57+i%2*.15)],[X(i/4+.08),Y(.46+i%2*.15)],[X(i/4+.118),Y(.57+i%2*.15)]],this.night?'#688292':'#d9e6df');
    }else{
      poly(c,[[x,Y(.78)],[X(.22),Y(.61)],[X(.42),Y(.73)],[X(.67),Y(.56)],[X(.89),Y(.7)],[x+w,Y(.62)],[x+w,y+h],[x,y+h]],distant);
      poly(c,[[x,Y(.86)],[X(.25),Y(.76)],[X(.57),Y(.9)],[X(.85),Y(.72)],[x+w,Y(.82)],[x+w,y+h],[x,y+h]],near);
      if(style.id==='forest'||style.id==='orchard')for(let i=0;i<11;i++){
        const bx=X((i+.25)/11),by=Y(.79+i%3*.045),size=h*(style.id==='forest'?.15:.12);
        rect(c,bx,by-size*.4,Math.max(1,size*.16),size*.8,near);
        poly(c,[[bx-size*.55,by-size*.1],[bx,by-size*1.2],[bx+size*.65,by-size*.1]],i%2?near:distant);
        if(style.id==='orchard'&&i%3===0)rect(c,bx+size*.2,by-size*.8,Math.max(1,size*.18),Math.max(1,size*.18),'#d9a17b');
      }
    }
    c.restore();
  }
  house(c,t){
    const wall=decorOption(this.state,'house','wall'),floor=decorOption(this.state,'house','floor'),trim=decorOption(this.state,'house','trim'),rug=decorOption(this.state,'house','rug');
    const wallColor=mix('#574b55',wall.color,this.ambience.light),floorColor=mix('#665049',floor.color,this.ambience.light);
    if(this.immersive){
      const left=-this.ox,bottom=(this.height-this.oy)/this.sy,top=-this.oy/this.sy;
      rect(c,left,top,this.width,170-top,wallColor);
      rect(c,left,139,this.width,31,mix('#62695b',trim.color,this.ambience.light));for(let x=left;x<400+this.ox;x+=12)rect(c,x,141,1,27,mix('#535c4e',trim.accent,this.ambience.light));rect(c,left,164,this.width,6,mix('#454e42',trim.accent,this.ambience.light));
      rect(c,left,170,this.width,bottom-170,floorColor);
      this.surfacePattern(c,'wall',wall,left,top,this.width,137-top);
      this.surfacePattern(c,'floor',floor,left,170,this.width,bottom-170);
    }else{
    shadow(c,201,314,169);rect(c,29,164,344,145,'#a6b78e');rect(c,32,55,336,116,trim.accent);
    rect(c,36,58,328,113,wallColor);rect(c,37,60,325,5,trim.color);
    rect(c,37,139,326,30,trim.color);for(let x=39;x<365;x+=12)rect(c,x,141,1,27,trim.accent);rect(c,36,137,328,4,trim.accent);rect(c,36,164,328,6,trim.accent);
    poly(c,[[36,170],[364,170],[384,309],[16,309]],floorColor);
    c.save();c.beginPath();c.moveTo(36,170);c.lineTo(364,170);c.lineTo(384,309);c.lineTo(16,309);c.closePath();c.clip();this.surfacePattern(c,'floor',floor,16,170,368,140);c.restore();
    this.surfacePattern(c,'wall',wall,37,64,326,73);
    rect(c,17,309,367,7,'#b5936e');rect(c,22,316,357,3,'#c2a278');
    }
    // Window, curtains and sunlight.
    c.save();c.translate(113,138);c.scale(this.propScale,this.propScale/this.sy);c.translate(-113,-138);
    rect(c,76,78,74,60,trim.accent);rect(c,80,82,66,51,this.ambience.sky);
    this.landscape(c,decorOption(this.state,'house','view'),80,82,66,50,t);
    rect(c,82,84,29,3,'#dae5ca');if(!this.night){rect(c,83+this.ambience.progress*51,92-Math.sin(this.ambience.progress*Math.PI)*5,7,7,'#f7e9b3');rect(c,91,96,14,3,'#dfedda');}
    rect(c,111,80,4,55,trim.color);rect(c,79,106,68,3,trim.color);rect(c,73,133,79,5,trim.accent);rect(c,73,136,79,3,trim.color);
    poly(c,[[70,76],[84,76],[83,116],[76,111],[70,116]],trim.color);poly(c,[[140,76],[155,76],[155,117],[148,112],[144,116]],trim.color);rect(c,68,73,89,3,trim.accent);
    if(this.night){rect(c,123,89,5,6,'#e7d6a1');rect(c,123,89,2,4,'#28354f');rect(c,136,95,1,1,'#eee2b8');}c.restore();
    if(!this.night){const shift=(.5-this.ambience.progress)*120;poly(c,[[81,173],[144,173],[184+shift,233],[105+shift,233]],'#e5cca150');}
    // Wall clock.
    c.save();c.translate(207,101);c.scale(1.15,1.15/this.sy);pixelClock(c,0,0,t);c.restore();
    // Shared doodle is painted directly inside the wall frame.
    c.save();c.translate(264,115);c.scale(this.propScale,this.propScale/this.sy);c.translate(-264,-115);
    rect(c,243,79,43,36,'#ac906a');rect(c,246,82,37,30,'#f5eccf');
    if(this.state.drawing.length){c.strokeStyle='#667746';c.lineWidth=1.2;for(const line of this.state.drawing){c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(247+x*34,84+y*26):c.moveTo(247+x*34,84+y*26));c.stroke();}}
    else{poly(c,[[250,105],[257,94],[264,101],[273,90],[280,105]],'#a6b17d');rect(c,253,88,4,4,'#ddc68e');}
    c.restore();this.hit('frame',264-25*this.propScale,115-40*this.propScale/this.sy,50*this.propScale,42*this.propScale/this.sy,{action:'onFrame'});
    // Door becomes a real route as the world grows.
    const doorOpen=this.state.unlocked.includes('garden');
    c.save();c.translate(333,170);c.scale(this.propScale,this.propScale/this.sy);c.translate(-333,-170);
    rect(c,316,105,33,65,trim.accent);rect(c,319,109,27,58,doorOpen?'#91ad7c':trim.color);
    if(doorOpen){rect(c,320,111,22,21,'#c4d7b6');rect(c,320,132,22,34,'#adc18f');rect(c,320,163,22,4,'#879b68');poly(c,[[321,109],[333,114],[333,170],[321,166]],trim.color);}
    else{rect(c,322,114,20,20,trim.color);rect(c,322,140,20,22,trim.color);rect(c,339,136,3,3,trim.accent);}
    c.restore();this.hit('garden',333-20*this.propScale,170-69*this.propScale/this.sy,40*this.propScale,70*this.propScale/this.sy,{action:'onDoor'});
    this.item(c,'fridge',284,180);this.hit('fridge',284-19*this.propScale,180-56*this.propScale/this.sy,38*this.propScale,58*this.propScale/this.sy,{action:'onFridge'});
    // The arcade stands in the corner left of the window, where nothing else goes.
    this.item(c,'arcade',26,182);this.hit('arcade',26-14*this.propScale,182-53*this.propScale/this.sy,28*this.propScale,54*this.propScale/this.sy,{action:'onArcade'});
    if(this.state.fridgeBox?.batch){this.item(c,this.state.fridgeBox.batch.for?'present':'snowflake',286,158,{scale:.32});this.sparkle(c,304,156,t);}
    // A rug is a choice, including no rug at all.
    if(rug.id!=='none'){
      poly(c,[[139,213],[252,213],[269,270],[124,270]],rug.accent);
      poly(c,[[143,218],[248,218],[262,265],[131,265]],rug.color);
      for(let y=225;y<260;y+=11)for(let x=147;x<252;x+=14)rect(c,x+(y%2)*2,y,rug.pattern==='diamond'?5:9,2,rug.accent);
      for(let x=128;x<272;x+=5)rect(c,x,271,2,4,rug.accent);
    }
    if(!this.immersive)for(let i=0;i<3;i++)pixelStone(c,194+i*3,325+i*12,14);
  }
  garden(c,t){
    this.sky(c,t);
    const left=-this.ox,right=this.width-this.ox,bottom=(this.height-this.oy)/this.sy;
    const groundStyle=decorOption(this.state,'garden','ground'),fence=decorOption(this.state,'garden','fence'),shed=decorOption(this.state,'garden','shed');
    const base=mix(this.ambience.ground,groundStyle.color,.7),ground=this.weather==='rain'?mix(base,'#809994',.42):this.weather==='snow'?mix(base,'#e2ece3',.58):base;
    rect(c,left,137,this.width,bottom-137,ground);
    if(groundStyle.pattern==='tile'||groundStyle.pattern==='stone')this.surfacePattern(c,'floor',groundStyle,left,170,this.width,bottom-170);
    else for(let i=0;i<72;i++){const x=left+(i*79%Math.floor(this.width)),y=177+(i*37)%160;rect(c,x,y,groundStyle.pattern==='wild'?4:2,groundStyle.pattern==='wild'?5:2,groundStyle.accent);if(groundStyle.pattern==='flower'&&i%7===0)rect(c,x+3,y-3,3,3,'#f3dfaa');if(groundStyle.pattern==='leaf'&&i%5===0)rect(c,x+3,y-2,4,2,'#d5aa79');}
    // The fence and trees share a ground plane; draw trees after the rails so
    // their trunks visibly reach the grass instead of ending at fence height.
    if(fence.id!=='none'){
      c.save();c.translate(0,170);c.scale(1,1/this.sy);
      rect(c,left,-31,this.width,5,fence.accent);rect(c,left,-10,this.width,5,fence.accent);
      for(let x=left+6;x<right;x+=22){rect(c,x,-39,10,42,fence.color);poly(c,[[x,-39],[x+5,-44],[x+10,-39]],fence.color);rect(c,x+7,-37,2,38,fence.accent);rect(c,x+3,-29,2,2,fence.accent);if(this.weather==='snow')poly(c,[[x-2,-39],[x+5,-46],[x+12,-39],[x+12,-37],[x-2,-37]],'#f0f5eb');}
      c.restore();
    }
    for(const [x,s]of [[38,1.7],[366,1.5]]){c.save();c.translate(x,188);c.scale(1,1/this.sy);ellipse(c,0,2,19,4,'#708b5f33');c.rotate(Math.sin(t*1.5+x)*(this.weather==='wind'?.07:.012));tree(c,0,0,s);c.restore();}
    for(let i=0;i<6;i++){c.save();c.translate(195+Math.sin(i*1.4)*7,225+i*16);c.scale(1,1/this.sy);pixelStone(c,0,0,22);c.restore();}
    // The little shed is now a distinct garden destination, on a stone pad.
    c.save();c.translate(200,216);c.scale(this.propScale,this.propScale/this.sy);
    ellipse(c,0,2,38,7,'#758b6055');rect(c,-29,-34,58,34,shed.color);rect(c,-25,-32,50,31,mix(shed.color,'#f4e6c8',.25));
    for(let y=-28;y<0;y+=8)rect(c,-25,y,50,1,shed.color);
    poly(c,[[-34,-33],[0,-61],[34,-33]],shed.accent);poly(c,[[-28,-34],[0,-57],[28,-34]],mix(shed.accent,'#b6c3b3',.23));rect(c,-34,-34,68,4,shed.accent);
    rect(c,-11,-26,22,27,'#718366');rect(c,-8,-23,16,22,'#526c58');rect(c,8,-13,2,3,'#dec489');
    rect(c,-22,-22,8,9,'#aac9b4');rect(c,16,-22,8,9,'#aac9b4');c.restore();
    this.item(c,this.state.life?.places.hut?.item||'sock',202,217,{scale:.4});this.hit('hut',156,216-87/this.sy,88,91/this.sy,{action:'onPlace'});
    c.save();c.translate(285,268);c.scale(1,1/this.sy);
    ellipse(c,0,2,64,32,'#6d89692e');ellipse(c,0,0,59,28,'#c6c3a0');ellipse(c,0,-2,52,22,'#6d9f9d');ellipse(c,0,-4,45,16,'#91bebb');
    for(let i=0;i<4;i++){const r=(t*6+i*12)%43;c.strokeStyle='#d8e8d1';c.lineWidth=1;c.globalAlpha=(1-r/43)*.8;c.beginPath();c.ellipse(-4,-4,r,r*.32,0,0,7);c.stroke();}c.globalAlpha=1;
    for(const[x,y]of [[-46,-16],[35,18],[48,-8]]){rect(c,x,y,3,15,'#648860');rect(c,x+5,y+5,2,10,'#789764');}c.restore();
    this.item(c,this.state.life?.places.pool?.item||'duck',281+Math.sin(t*.45)*16,265+Math.cos(t*.8)/this.sy,{scale:.65});this.hit('pool',223,268-33/this.sy,123,64/this.sy,{action:'onPlace'});
    c.save();c.translate(96,284);c.scale(1,1/this.sy);rect(c,-48,-43,96,47,'#806749');rect(c,-43,-39,86,39,'#9a805b');rect(c,-48,1,96,7,'#b39970');rect(c,-48,-43,96,5,'#ccb287');for(let y=-31;y<-2;y+=12)rect(c,-39,y,78,2,'#786947');c.restore();
    const stage=plantStage(this.state),seed=this.state.life?.plant?.seed;
    for(let i=0;i<4;i++){const type=stage===4?{sun:'flower',moon:'star',wild:'mushroom'}[seed]:stage>=1?'sprout':stage===0?'potato':'mushroom';this.item(c,type,65+i*20,284-(i%2?9:24)/this.sy,{scale:stage===0?.18:stage===4?.6:.3+Math.max(0,stage)*.08});}
    this.hit('farm',45,284-49/this.sy,102,60/this.sy,{action:'onPlace'});
    this.sign(c,'house',31,298);this.hit('house',10,255,44,58,{action:'onDoor'});
    if(this.state.unlocked.includes('roof')){c.save();c.translate(359,286);c.scale(1,1/this.sy);rect(c,-6,-104,4,104,'#927c55');rect(c,13,-104,4,104,'#927c55');for(let y=-95;y<-4;y+=13)rect(c,-5,y,22,4,'#bea776');c.restore();this.hit('roof',346,286-110/this.sy,35,114/this.sy,{action:'onDoor'});}
  }
  roof(c,t){
    this.sky(c,t);
    const tile=decorOption(this.state,'roof','tile'),facade=decorOption(this.state,'roof','facade');
    // Roof belongs to the house: visible eaves, front wall, windows and foundation.
    rect(c,-Math.max(80,this.ox),190,Math.max(560,this.width),Math.max(200,this.height-this.oy-190),this.ambience.ground);ellipse(c,200,344,189,10,'#485f4b33');
    rect(c,24,298,350,40,facade.color);rect(c,24,331,350,8,facade.accent);
    for(const x of [83,276]){rect(c,x,315,42,18,'#a28a69');rect(c,x+3,317,36,14,this.night?'#e7c57d':'#aec8c1');rect(c,x+20,316,2,17,'#c1a67c');}
    poly(c,[[51,145],[335,145],[388,308],[9,308]],tile.color);
    c.save();c.beginPath();c.moveTo(51,145);c.lineTo(335,145);c.lineTo(388,308);c.lineTo(9,308);c.closePath();c.clip();
    for(let y=150;y<309;y+=15){rect(c,48-(y-145)/4,y,288+(y-145)/2,2,tile.accent);for(let x=23;x<385;x+=29)rect(c,x+((y/15)%2)*14,y,1,14,tile.accent);}
    c.restore();
    rect(c,10,308,378,6,'#9c7b5e');rect(c,19,314,360,3,'#c6a581');
    rect(c,276,98,42,76,'#b79d7d');rect(c,273,94,48,9,'#ccb597');for(let y=109;y<170;y+=12)rect(c,277,y,39,1,'#957e63');
    rect(c,60,161,68,3,'#7d8563');rect(c,61,157,3,68,'#8c8d68');rect(c,124,157,3,68,'#8c8d68');for(const [x,scale]of [[82,1],[105,.8]]){c.save();c.translate(x,165);c.rotate(Math.sin(t*2)*(this.weather==='wind'?.3:.07));this.item(c,'sock',0,22,{scale});c.restore();}
    this.sign(c,'house',335,300);this.hit('house',310,264,49,53,{action:'onDoor'});
    this.item(c,'telescope',193,209,{scale:1.5});this.hit('sky',155,146,85,70,{action:'onPlace'});this.sparkle(c,230,154,t);
    if(this.state.life?.places.sky){const n=this.state.life.places.sky.count;c.strokeStyle='#f7e7b6';c.lineWidth=1;c.beginPath();for(let i=0;i<Math.min(n+2,7);i++){const x=105+(i*37)%130,y=40+(i*29)%52;i?c.lineTo(x,y):c.moveTo(x,y);rect(c,x-1,y-1,3,3,'#f7e7b6');}c.stroke();}
  }
  sky(c,t){
    const w=this.weather,dim=['rain','cloudy','snow'].includes(w),a=this.ambience,style=decorOption(this.state,this.room,'sky');
    const chosen=style&&style.id!=='natural'?mix(a.sky,style.color,.52*a.light):a.sky;
    rect(c,-Math.max(80,this.ox),-Math.max(22,this.oy),Math.max(560,this.width),240+Math.max(22,this.oy),dim?mix(chosen,w==='rain'?'#7f99aa':'#bdc9cb',w==='rain'?.62:.35):chosen);
    this.landscape(c,decorOption(this.state,this.room,'backdrop'),-Math.max(80,this.ox),81,Math.max(560,this.width),62,t);
    if(this.night){this.item(c,'moon',301,69,{scale:1.5});for(let i=0;i<18;i++)rect(c,15+(i*53)%371,7+(i*31)%107,2,2,i%3===Math.floor(t/2)%3?'#f0e9c1':'#a1b6b4');}
    else if(!dim){ellipse(c,a.sun.x,a.sun.y,14,14/this.sy,mix('#f2daac','#eda981',a.warm));}
    const cloud=mix('#657d95',w==='rain'?'#8ea4b2':dim?'#d4deda':'#e6eddb',a.light),n=dim?8:3,speed=w==='wind'?17:3;for(let i=0;i<n;i++){const x=((i*147+t*speed)%650)-115,y=18+(i*23)%90;c.save();c.translate(x,y);c.scale(w==='rain'?1.6:1,1/this.sy);rect(c,0,0,52,9,cloud);rect(c,10,-8,29,10,cloud);c.restore();}
    if(w==='wind')for(let i=0;i<4;i++){const x=(t*50+i*119)%440-30;rect(c,x,75+i*21,22,1,'#e1e9d7');}
  }
  lightFront(c){
    const a=this.ambience;c.save();
    const top=-this.oy/this.sy,height=this.height/this.sy;
    if(this.room!=='cellar'){c.globalAlpha=(1-a.light)*(this.room==='house'?.10:.25);rect(c,-this.ox,top,this.width,height,this.room==='house'?'#4d3047':'#243450');c.globalAlpha=a.warm*.10;rect(c,-this.ox,top,this.width,height,'#ecad72');}
    if(this.room==='house'&&a.light<.8){
      const lamp=this.state.objects.find(o=>o.id==='lamp'&&o.room==='house');
      if(lamp){const p=this.position('lamp'),lift=this.moving?.id==='lamp'?(12+Math.sin(this.time/1000*8)*2)/this.sy:0;c.save();c.translate(p.x,p.y-lift);c.scale(this.propScale,this.propScale/this.sy);
        // A small warm pool around the shade, not a spotlight over the cast.
        const glow=c.createRadialGradient(0,-36,3,0,-30,54);glow.addColorStop(0,'#ffc87960');glow.addColorStop(.45,'#f8b76523');glow.addColorStop(1,'#f8b76500');
        c.globalAlpha=1-a.light;c.fillStyle=glow;c.fillRect(-55,-85,110,110);ellipse(c,0,5,31,6,'#f1b56b16');c.restore();}
    }
    c.restore();
  }
  weatherFront(c,t){
    // Weather uses screen-space distances, not the stretched portrait depth.
    const w=this.width,h=this.height,left=-this.ox,top=-this.oy;
    c.save();c.scale(1,1/this.sy);
    if(this.weather==='rain')for(let i=0;i<Math.ceil(w*h/4200);i++){const x=left+((i*73-t*32)%(w+40)+w+40)%(w+40)-20,y=top+(i*137+t*(290+i%3*32))%(h+40)-20,len=i%3===0?14:9;c.globalAlpha=i%3===0?.55:.3;c.fillStyle='#497d9b';c.beginPath();c.moveTo(x+2,y-len);c.quadraticCurveTo(x-4,y+1,x-1,y+2);c.quadraticCurveTo(x+3,y+3,x+2,y-len);c.fill();}
    if(this.weather==='snow')for(let i=0;i<Math.ceil(w*h/7600);i++){const x=left+(i*71+Math.sin(t*.7+i)*19)%(w+30),y=top+(i*113+t*(12+i%3*5))%(h+20)-10;c.globalAlpha=.6+i%3*.17;c.fillStyle='#f8fcf6';if(i%3===0){c.strokeStyle='#f8fcf6';c.lineWidth=1.2;c.beginPath();for(let a=0;a<3;a++){const angle=a*Math.PI/3+Math.sin(t*.5+i)*.3;c.moveTo(x-Math.cos(angle)*3,y-Math.sin(angle)*3);c.lineTo(x+Math.cos(angle)*3,y+Math.sin(angle)*3);}c.stroke();}else ellipse(c,x,y,1.7,1.7,'#f8fcf6');}
    if(this.weather==='wind')for(let i=0;i<18;i++){const x=left+(i*83+t*90)%(w+60)-30,y=top+100+(i*61)%(h-100)+Math.sin(t*3+i)*9;c.save();c.translate(x,y);c.rotate(t*2+i);ellipse(c,0,0,4,1.8,i%2?'#80954f':'#ba985e');c.restore();}
    c.restore();
    if(this.weather==='rain')for(let i=0;i<8;i++){const x=32+i*46,y=233+i%3*32,r=(t*20+i*3)%15;c.save();c.translate(x,y);c.scale(1,1/this.sy);ellipse(c,0,1,17+i%3*5,4,'#789eac3a');c.globalAlpha=(1-r/15)*.75;c.strokeStyle='#accad1';c.lineWidth=1.3;c.beginPath();c.ellipse(0,0,r,r*.26,0,0,Math.PI*2);c.stroke();if(r<5){c.fillStyle='#7aa4b6';c.fillRect(-r,-5-r,1.5,3);c.fillRect(r,-3-r,1.5,3);}c.restore();}
  }
  cellar(c,t){
    const wall=decorOption(this.state,'cellar','wall'),floor=decorOption(this.state,'cellar','floor');
    if(this.immersive){
      const left=-this.ox,top=-this.oy/this.sy,bottom=(this.height-this.oy)/this.sy;
      rect(c,left,top,this.width,174-top,wall.color);this.surfacePattern(c,'wall',wall,left,top,this.width,174-top);
      rect(c,left,174,this.width,bottom-174,floor.color);this.surfacePattern(c,'floor',floor,left,174,this.width,bottom-174);
      rect(c,left,169,this.width,5,wall.accent);rect(c,left,174,this.width,2,mix(wall.accent,floor.accent,.5));
    }else{
      rect(c,31,66,337,245,wall.accent);rect(c,37,72,325,101,wall.color);this.surfacePattern(c,'wall',wall,37,72,325,101);
      rect(c,37,173,325,134,floor.color);this.surfacePattern(c,'floor',floor,37,173,325,134);
    }
    this.item(c,'potato',190,257,{scale:3,shadow:true});this.item(c,'crown',190,220,{scale:2});this.item(c,'frog',282,220);this.sign(c,'house',67,290);this.hit('house',45,250,46,48,{action:'onDoor'});
  }
  sign(c,text,x,y){c.save();c.translate(x,y);c.scale(1,1/this.sy);rect(c,-1,-26,3,28,'#9a8961');rect(c,-14,-37,29,17,'#d4c199');rect(c,-9,-30,15,2,'#829064');poly(c,[[-10,-29],[-4,-34],[-4,-25]],'#829064');c.restore();}
  sparkle(c,x,y,t){const up=Math.sin(t*2)*2;c.save();c.translate(x,y);c.scale(1,1/this.sy);rect(c,-1,-4+up,2,7,'#f8eaca');rect(c,-4,-1+up,8,2,'#f8eaca');rect(c,9,3,2,2,'#faf0d2');c.restore();}
  incident(c,e,t){
    // Heights are in the resident's own proportions (see draw), so the balloons and the
    // invitation stay on Monki on a portrait phone rather than up by the lamp. The widths
    // stay as they were: a wider invitation took the drag of the lamp beside him.
    const a=this.actorAt(e.actor),loc=a.room===this.room?{x:a.x,y:a.y}:{x:220,y:232};const x=loc.x,y=loc.y,up=(this.actorScale||1)/(this.sy||1);
    if(e.id==='balloons'||e.aftermath==='balloons'){
      for(let i=0;i<3;i++){const bx=x+(i-1)*18+Math.round(Math.sin(t+i)*2),by=y-(55+i%2*15)*up;c.strokeStyle='#a5966b';c.lineWidth=1;c.beginPath();c.moveTo(x,y-17*up);c.lineTo(bx,by-10*up);c.stroke();this.item(c,'balloon',bx,by,{scale:.75});}
      this.hit(e.uid,x-37,y-112*up,74,103*up,{action:'onIncident'});
    }else{
      if(a.room!==this.room){this.character(c,e.actor,x,y,{frame:Math.floor(t)});}
      if(e.kind==='sweep'){ellipse(c,x,y+8*up,30,9*up,'#a2c4b17d');for(let i=0;i<4;i++)rect(c,x-20+i*12,y+7*up,5,2*up,'#c5deca');}
      if(e.kind==='balance')for(let i=0;i<3;i++)this.item(c,e.item,x,y-(39+i*13)*up,{scale:.7});
      else if(e.kind==='hold')this.item(c,e.item,x+24,y-45*up,{scale:1.2});
      else{this.item(c,e.item,x+23+Math.sin(t*2)*2,y-45*up,{scale:.9});}
      this.hit(e.uid,x-31,y-85*up,73,87*up,{action:'onIncident'});
    }
    this.sparkle(c,x+40,y-64*up,t);
    if(this.state.completed===0){c.save();c.translate(x,y);c.scale(1,up);rect(c,37,-47,7,8,'#f7edcf');rect(c,36,-54,3,11,'#f7edcf');rect(c,40,-51,3,7,'#f7edcf');c.restore();}
  }
  trace(c,v,t){const{x,y,type}=v;
    if(type==='soap'){for(let i=0;i<3;i++){c.strokeStyle='#e8f0df';c.lineWidth=1;c.beginPath();c.arc(x-15+i*12,y+3-i%2*5,5+i,0,7);c.stroke();}}
    if(['crumbs','mess'].includes(type)){for(let i=0;i<6;i++)rect(c,x-19+i*7,y+5+((i*7)%9),2+(i%2),2,'#a58c61');if(type==='mess')this.item(c,'sock',x-27,y+6,{scale:.5});}
    if(['wet','flood'].includes(type)){ellipse(c,x,y+8,type==='flood'?58:24,7,'#a3c3af77');rect(c,x-10,y+6,14,1,'#d2dcc2');}
    if(type==='flowers')for(let i=0;i<3;i++)this.item(c,'flower',x-22+i*18,y+10,{scale:.55});
    if(type==='fish')this.item(c,'fish',115,184,{scale:.65});
    if(type==='frog')this.item(c,'frog',x+28,y+6,{scale:.6});
    if(type==='duck')this.item(c,'duck',x-26,y+3,{scale:.6});
    if(type==='stars')this.sparkle(c,x-22,y-5,t);
    if(type==='tower')for(let i=0;i<3;i++)this.item(c,'potato',x+38,y-i*7,{scale:.6});
    if(type==='moon')this.item(c,'moon',239,77,{scale:.75});
    if(type==='hole'){ellipse(c,x,y+6,15,6,'#7d6a4e');ellipse(c,x,y+5,12,4,'#5f5340');for(let i=0;i<4;i++)rect(c,x-16+i*10,y+11,3,2,'#9c8865');}
    if(type==='potato')this.item(c,'potato',x,y+4,{scale:.7});
    if(type==='balloons'){for(let i=0;i<3;i++)rect(c,x-14+i*13,y+6,3,3,'#c58f8f');rect(c,x+4,y+2,1,6,'#a5966b');}
  }
}
function bush(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);rect(c,-18,-17,36,17,'#95ad76');rect(c,-13,-23,26,23,'#9fb67f');rect(c,-21,-13,42,9,'#95ad76');for(const[a,b]of[[-14,-11],[-3,-18],[11,-10],[-4,-4]])rect(c,a,b,5,3,'#b7c798');c.restore();}
function tree(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);rect(c,-4,-38,8,39,'#a5966c');rect(c,-2,-34,3,33,'#b7a77d');bush(c,0,-32,1.5);bush(c,-10,-40,1.1);bush(c,11,-43,1);c.restore();}
function pixelStone(c,x,y,w){rect(c,x-w/2,y-2,w,5,'#c9c6a5');rect(c,x-w/2+2,y-3,w-4,1,'#dbd7b6');}
function pixelClock(c,x,y,t){rect(c,x-10,y-8,20,16,'#b7a57c');rect(c,x-8,y-10,16,20,'#b7a57c');rect(c,x-7,y-7,14,14,'#f2e6bf');rect(c,x-1,y-5,1,6,'#8c8965');rect(c,x,y,4,1,'#8c8965');}

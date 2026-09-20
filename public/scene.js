import {character,item,rect,poly,ellipse,shadow} from './art.js';
import {random,clamp,ACTORS} from './shared/world.js';

const rng=random('a-house-for-five');
const plants=Array.from({length:115},()=>({x:rng()*600,y:rng()*400,s:rng()}));
export class Scene {
  constructor(canvas,{onTap,onMove,onDoor,onFrame,onFridge,onIncident,onGift}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.callbacks={onTap,onMove,onDoor,onFrame,onFridge,onIncident,onGift};this.room='house';this.state=null;this.animations={};this.hitboxes=[];this.down=null;this.moving=null;this.time=0;this.selected=null;this.night=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();window.addEventListener('resize',()=>this.resize());
    canvas.addEventListener('pointerdown',e=>this.pointerDown(e));canvas.addEventListener('pointermove',e=>this.pointerMove(e));canvas.addEventListener('pointerup',e=>this.pointerUp(e));canvas.addEventListener('pointercancel',()=>{this.down=null;this.moving=null});
    this.override={};this.hiddenObjects=new Set();this.traceCutoff=Infinity;this.replaying=false;this.highlight=null;
    this.running=true;this.draw(0);
  }
  resize(){const mobile=window.innerWidth<701;this.canvas.width=mobile?400:560;this.canvas.height=mobile?376:336;this.ox=(this.canvas.width-400)/2;this.oy=mobile?22:0;this.c.imageSmoothingEnabled=false;}
  update(state,room,actor){this.state=state;this.room=room;this.actor=actor;}
  at(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*this.canvas.width/r.width-this.ox,y:(e.clientY-r.top)*this.canvas.height/r.height-this.oy};}
  pointerDown(e){if(this.replaying){this.stopReplay();return;}if(e.button!==0)return;this.canvas.setPointerCapture(e.pointerId);const p=this.at(e);const hit=[...this.hitboxes].reverse().find(h=>p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h);if(hit?.movable){const entity=this.state.actors[hit.id]||this.state.objects.find(o=>o.id===hit.id);hit.offsetY=entity.y-p.y;}this.down={...p,hit,time:performance.now()};}
  pointerMove(e){if(!this.down?.hit?.movable)return;const p=this.at(e);if(this.moving||Math.hypot(p.x-this.down.x,p.y-this.down.y)>5){this.moving={id:this.down.hit.id,x:Math.max(35,Math.min(365,p.x)),y:Math.max(171,Math.min(314,p.y+this.down.hit.offsetY))};}}
  pointerUp(e){if(!this.down)return;const p=this.at(e),hit=this.down.hit;
    if(this.moving)this.callbacks.onMove(this.moving,this.room);
    else if(hit){if(hit.action)this.callbacks[hit.action]?.(hit.id);else this.callbacks.onTap(hit.id,p);}
    else this.callbacks.onTap(null,p);
    this.down=null;this.moving=null;
  }
  react(id){this.animations[id]=performance.now()+1100;}

  /** Show someone what moved while they were not looking. The room rewinds to how
   * they left it and then plays the changes back, one at a time, with no words. */
  startReplay(items,onDone){
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
  draw(time){if(!this.running)return;this.time=time;requestAnimationFrame(t=>this.draw(t));if(document.hidden||!this.state)return;
    if(this.replaying)this.advanceReplay(time);
    const c=this.c,w=this.canvas.width,h=this.canvas.height,t=this.reduced?0:time/1000;
    c.clearRect(0,0,w,h);rect(c,0,0,w,h,this.night?'#6c7d72':'#dbe5c8');
    // Quiet, wide landscape continues around the dollhouse at desktop sizes.
    for(const p of plants){const x=(p.x+w)%w,y=p.y%h;rect(c,x,y,2,1,this.night?'#829482':p.s>.5?'#c3d3aa':'#ceddb8');if(p.s>.88){rect(c,x,y-2,1,3,'#aebf92');rect(c,x-1,y-3,3,1,'#f0e9c4');}}
    c.save();c.translate(this.ox,this.oy);this.hitboxes=[];
    if(this.room==='house')this.house(c,t);else if(this.room==='garden')this.garden(c,t);else if(this.room==='roof')this.roof(c,t);else this.cellar(c,t);
    for(const trace of this.state.traces.filter(v=>v.room===this.room&&v.at<=this.traceCutoff))this.trace(c,trace,t);
    const place=e=>{const o=this.override[e.id];return o?{...e,x:o.x,y:o.y,room:o.room}:e;};
    const objects=this.state.objects.filter(o=>!this.hiddenObjects.has(o.id)).map(o=>place({...o,kind:'object'})).filter(o=>o.room===this.room);
    const actors=ACTORS.map(id=>place({...this.state.actors[id],id,kind:'actor'})).filter(a=>a.room===this.room);
    const entities=[...objects,...actors].map(e=>this.moving?.id===e.id?{...e,...this.moving}:e).sort((a,b)=>a.y-b.y);
    const event=this.state.incident;
    for(const entity of entities){const{x,y,id}=entity;
      if(this.selected===id){ellipse(c,x,y+1,17,5,'#e9e3a5');rect(c,x-1,y+6,2,2,'#a6ad70');}
      const held=this.moving?.id===id||(this.down?.hit?.id===id&&this.down.hit.movable&&!this.replaying);
      const lift=(this.animations[id]>time?Math.abs(Math.sin((time-this.animations[id])/150))*5:0)+(held?7:0);
      if(held)shadow(c,x,y+2,entity.type==='couch'?30:13);
      if(entity.kind==='actor'){
        const frame=Math.floor(t+(ACTORS.indexOf(id)*.7));
        character(c,id,x,y-lift,{hat:entity.hat,mood:entity.mood,frame});
        if(entity.mood==='sleep'&&Math.sin(t*1.5)>-.5){c.fillStyle='#8d967e';c.font='8px monospace';c.fillText('z',x+15,y-30-(t%2)*3);}
        if(entity.mood==='annoyed'){rect(c,x-2,y-47,11,7,'#a8b295');rect(c,x+1,y-48,5,1,'#a8b295');c.fillStyle='#627152';c.font='6px monospace';c.fillText('...',x,y-42);}
        this.hit(id,x-20,y-42,40,46,{movable:true,offsetY:y-(this.down?.y||y)});
      }else{
        item(c,entity.type,x,y-lift,{shadow:true});
        const dimensions=entity.type==='couch'?[72,46]:entity.type==='plant'?[36,53]:entity.type==='lamp'?[37,60]:[29,31];
        this.hit(id,x-dimensions[0]/2,y-dimensions[1],...dimensions,{movable:true,offsetY:y-(this.down?.y||y)});
      }
    }
    // Who did it, floating over the thing they did it to.
    if(this.replaying&&this.highlight?.room===this.room){
      const h=this.highlight,age=Math.min(1,(time-h.at)/700);
      const r=13+Math.sin(age*Math.PI)*11;
      c.strokeStyle='#87996a';c.lineWidth=1.5;c.globalAlpha=1-age*.35;
      c.beginPath();c.ellipse(h.x,h.y+2,r,r*.42,0,0,7);c.stroke();c.globalAlpha=1;
      if(ACTORS.includes(h.who))character(c,h.who,h.x,h.y-36,{scale:.62});
    }
    if(event?.room===this.room&&!this.replaying)this.incident(c,event,t);
    const gifts=this.state.gifts.filter(g=>!g.opened);
    if(this.room==='house')gifts.slice(0,3).forEach((g,i)=>{const x=208+i*31,y=282;item(c,'present',x,y,{shadow:true});if(g.to===this.actor){this.sparkle(c,x,y-34,t);this.hit(g.id,x-17,y-35,34,39,{action:'onGift'});}});
    c.restore();
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
  house(c,t){
    shadow(c,201,314,169);rect(c,29,164,344,145,'#a6b78e');rect(c,32,55,336,116,'#b39d78');
    rect(c,36,58,328,113,'#f0e2bc');rect(c,37,60,325,5,'#f8ebcb');
    for(let y=72;y<135;y+=15)for(let x=45;x<360;x+=16){rect(c,x+(y%2)*3,y,1,3,'#d9cba3');rect(c,x-1+(y%2)*3,y+1,3,1,'#ded1ae');}
    rect(c,37,139,326,30,'#bac5a0');for(let x=39;x<365;x+=12)rect(c,x,141,1,27,'#9faf87');rect(c,36,137,328,4,'#a4b38b');rect(c,36,164,328,6,'#86966f');
    poly(c,[[36,170],[364,170],[384,309],[16,309]],'#ceb18a');
    for(let y=179;y<309;y+=18){const spread=(y-170)/7;rect(c,36-spread,y,328+spread*2,1,'#b99d77');const row=Math.round((y-179)/18);for(let x=38+(row%2)*35;x<370;x+=69)rect(c,x,y+1,1,16,'#c1a47f');}
    rect(c,17,309,367,7,'#b5936e');rect(c,22,316,357,3,'#c2a278');
    // Window, curtains and sunlight.
    rect(c,76,78,74,60,'#bca378');rect(c,80,82,66,51,this.night?'#647f81':'#b6d4ce');
    poly(c,[[80,120],[96,109],[107,116],[125,103],[146,114],[146,132],[80,132]],this.night?'#83977b':'#a2bc88');
    rect(c,82,84,29,3,'#dae5ca');if(!this.night){rect(c,124,91,9,9,'#f7e9b3');rect(c,91,96,14,3,'#dfedda');}
    rect(c,111,80,4,55,'#f0e2bc');rect(c,79,106,68,3,'#f0e2bc');rect(c,73,133,79,5,'#bfa17c');rect(c,73,136,79,3,'#d6b990');
    poly(c,[[70,76],[84,76],[83,116],[76,111],[70,116]],'#d2be94');poly(c,[[140,76],[155,76],[155,117],[148,112],[144,116]],'#d2be94');rect(c,68,73,89,3,'#a79872');
    if(!this.night)poly(c,[[81,173],[144,173],[205,233],[116,233]],'#e5cca150');
    // Wall clock.
    pixelClock(c,207,96,t);
    // Shared doodle is painted directly inside the wall frame.
    rect(c,243,79,43,36,'#ac906a');rect(c,246,82,37,30,'#f5eccf');
    if(this.state.drawing.length){c.strokeStyle='#667746';c.lineWidth=1.2;for(const line of this.state.drawing){c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(247+x*34,84+y*26):c.moveTo(247+x*34,84+y*26));c.stroke();}}
    else{poly(c,[[250,105],[257,94],[264,101],[273,90],[280,105]],'#a6b17d');rect(c,253,88,4,4,'#ddc68e');}
    this.hit('frame',241,77,48,40,{action:'onFrame'});
    // Door becomes a real route as the world grows.
    const doorOpen=this.state.unlocked.includes('garden');
    rect(c,316,105,33,65,'#9d8e68');rect(c,319,109,27,58,doorOpen?'#91ad7c':'#c8b089');
    if(doorOpen){rect(c,320,111,22,21,'#c4d7b6');rect(c,320,132,22,34,'#adc18f');rect(c,320,163,22,4,'#879b68');poly(c,[[321,109],[333,114],[333,170],[321,166]],'#cab089');}
    else{rect(c,322,114,20,20,'#d7c398');rect(c,322,140,20,22,'#d7c398');rect(c,339,136,3,3,'#938257');}
    this.hit('garden',314,103,39,69,{action:'onDoor'});
    item(c,'fridge',284,180);this.hit('fridge',266,125,36,56,{action:'onFridge'});
    // Rug, floor plant, slippers, outside stepping stones.
    poly(c,[[139,213],[252,213],[269,270],[124,270]],'#afb58b');
    poly(c,[[143,218],[248,218],[262,265],[131,265]],'#d9cda3');
    poly(c,[[147,222],[245,222],[254,259],[140,259]],'#b8bf95');
    for(let y=226;y<260;y+=8)for(let x=148;x<248;x+=10)rect(c,x,y,3,2,'#cbd0a6');
    for(let x=128;x<272;x+=5)rect(c,x,271,2,4,'#b9bb93');
    for(let i=0;i<3;i++)pixelStone(c,194+i*3,325+i*12,14);
    bush(c,21,124,1.0);bush(c,372,103,.8);bush(c,380,268,.8);
  }
  garden(c,t){
    rect(c,18,152,365,149,'#c0d29f');
    for(let x=24;x<382;x+=17){rect(c,x,120,5,59,'#ded7ae');poly(c,[[x,120],[x+2,115],[x+5,120]],'#ded7ae');}rect(c,22,138,360,4,'#c5c69a');rect(c,22,161,360,4,'#c5c69a');
    tree(c,76,166,1.7);tree(c,325,119,1.2);
    ellipse(c,275,251,57,24,'#acbb8f');ellipse(c,275,247,53,21,'#8faaa0');ellipse(c,275,247,47,16,'#a9c6b5');rect(c,261+(Math.sin(t)*9),246,16,1,'#d6e1c6');item(c,'duck',287,248,{scale:.75});
    rect(c,65,228,86,54,'#ad906a');for(let y=233;y<282;y+=13)rect(c,68,y,80,2,'#947c5e');for(let i=0;i<4;i++)item(c,i%2?'flower':'mushroom',78+i*18,255+(i%2)*15,{scale:.65});
    rect(c,172,139,54,35,'#d7c5a1');poly(c,[[166,140],[199,115],[233,140]],'#9e7d58');rect(c,187,149,23,25,'#7c825e');
    for(let i=0;i<5;i++)pixelStone(c,192+i*3,190+i*22,12);
    this.sign(c,'house',31,298);this.hit('house',10,255,44,58,{action:'onDoor'});
    if(this.state.unlocked.includes('roof')){rect(c,355,181,3,104,'#9e8b60');rect(c,370,181,3,104,'#9e8b60');for(let y=190;y<279;y+=13)rect(c,355,y,17,3,'#b5a16e');this.hit('roof',348,177,32,110,{action:'onDoor'});}
  }
  roof(c,t){
    rect(c,-80,-22,560,174,this.night?'#67777c':'#c4d9cf');
    for(const [x,y]of[[28,52],[144,33],[324,62]]){rect(c,x+Math.sin(t/10)*3,y,35,7,'#e7ead5');rect(c,x+6,y-5,20,5,'#e7ead5');}
    if(this.night)item(c,'moon',301,69,{scale:2});else{rect(c,305,38,23,23,'#f1ddb0');rect(c,301,44,31,11,'#f1ddb0');}
    poly(c,[[51,145],[335,145],[388,308],[9,308]],'#b99575');
    for(let y=150;y<309;y+=15){rect(c,48-(y-145)/4,y,288+(y-145)/2,2,'#9b7f64');for(let x=23;x<385;x+=29)rect(c,x+((y/15)%2)*14,y,1,14,'#a5886a');}
    rect(c,276,98,42,76,'#b79d7d');rect(c,273,94,48,9,'#ccb597');for(let y=109;y<170;y+=12)rect(c,277,y,39,1,'#957e63');
    rect(c,60,161,68,3,'#7d8563');rect(c,61,157,3,68,'#8c8d68');rect(c,124,157,3,68,'#8c8d68');item(c,'sock',82,187);item(c,'sock',105,187,{scale:.8});
    this.sign(c,'house',335,300);this.hit('house',310,264,49,53,{action:'onDoor'});
    item(c,'radio',225,243);
  }
  cellar(c,t){rect(c,31,66,337,245,'#83907b');rect(c,37,72,325,101,'#a2ac91');for(let y=78;y<168;y+=17){rect(c,37,y,325,1,'#8f9d82');for(let x=42;x<360;x+=35)rect(c,x+(y%2)*16,y,1,17,'#8f9d82');}rect(c,37,173,325,134,'#b3b498');item(c,'potato',190,257,{scale:3,shadow:true});item(c,'crown',190,220,{scale:2});item(c,'frog',282,220);this.sign(c,'house',67,290);this.hit('house',45,250,46,48,{action:'onDoor'});}
  sign(c,text,x,y){rect(c,x-1,y-26,3,28,'#9a8961');rect(c,x-14,y-37,29,17,'#d4c199');rect(c,x-9,y-30,15,2,'#829064');poly(c,[[x-10,y-29],[x-4,y-34],[x-4,y-25]],'#829064');}
  sparkle(c,x,y,t){const up=Math.sin(t*2)*2;rect(c,x-1,y-4+up,2,7,'#f8eaca');rect(c,x-4,y-1+up,8,2,'#f8eaca');rect(c,x+9,y+3,2,2,'#faf0d2');}
  incident(c,e,t){
    const a=this.state.actors[e.actor],loc=a.room===this.room?{x:a.x,y:a.y}:{x:220,y:232};const x=loc.x,y=loc.y;
    if(e.id==='balloons'||e.aftermath==='balloons'){
      for(let i=0;i<3;i++){const bx=x+(i-1)*18+Math.round(Math.sin(t+i)*2),by=y-55-i%2*15;c.strokeStyle='#a5966b';c.lineWidth=1;c.beginPath();c.moveTo(x,y-17);c.lineTo(bx,by-10);c.stroke();item(c,'balloon',bx,by,{scale:.75});}
      this.hit(e.uid,x-37,y-112,74,103,{action:'onIncident'});
    }else{
      if(a.room!==this.room){character(c,e.actor,x,y,{frame:Math.floor(t)});}
      if(e.kind==='sweep'){ellipse(c,x,y+8,30,9,'#a2c4b17d');for(let i=0;i<4;i++)rect(c,x-20+i*12,y+7,5,2,'#c5deca');}
      if(e.kind==='balance')for(let i=0;i<3;i++)item(c,e.item,x,y-39-i*13,{scale:.7});
      else if(e.kind==='hold')item(c,e.item,x+24,y-45,{scale:1.2});
      else{item(c,e.item,x+23+Math.sin(t*2)*2,y-45,{scale:.9});}
      this.hit(e.uid,x-31,y-85,73,87,{action:'onIncident'});
    }
    this.sparkle(c,x+40,y-64,t);
    if(this.state.completed===0){rect(c,x+37,y-47,7,8,'#f7edcf');rect(c,x+36,y-54,3,11,'#f7edcf');rect(c,x+40,y-51,3,7,'#f7edcf');}
  }
  trace(c,v,t){const{x,y,type}=v;
    if(['crumbs','mess'].includes(type)){for(let i=0;i<6;i++)rect(c,x-19+i*7,y+5+((i*7)%9),2+(i%2),2,'#a58c61');if(type==='mess')item(c,'sock',x-27,y+6,{scale:.5});}
    if(['wet','flood'].includes(type)){ellipse(c,x,y+8,type==='flood'?58:24,7,'#a3c3af77');rect(c,x-10,y+6,14,1,'#d2dcc2');}
    if(type==='flowers')for(let i=0;i<3;i++)item(c,'flower',x-22+i*18,y+10,{scale:.55});
    if(type==='fish')item(c,'fish',115,184,{scale:.65});
    if(type==='frog')item(c,'frog',x+28,y+6,{scale:.6});
    if(type==='duck')item(c,'duck',x-26,y+3,{scale:.6});
    if(type==='stars')this.sparkle(c,x-22,y-5,t);
    if(type==='tower')for(let i=0;i<3;i++)item(c,'potato',x+38,y-i*7,{scale:.6});
    if(type==='moon')item(c,'moon',239,77,{scale:.75});
    if(type==='hole'){ellipse(c,x,y+6,15,6,'#7d6a4e');ellipse(c,x,y+5,12,4,'#5f5340');for(let i=0;i<4;i++)rect(c,x-16+i*10,y+11,3,2,'#9c8865');}
    if(type==='balloons'){for(let i=0;i<3;i++)rect(c,x-14+i*13,y+6,3,3,'#c58f8f');rect(c,x+4,y+2,1,6,'#a5966b');}
  }
}
function bush(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);rect(c,-18,-17,36,17,'#95ad76');rect(c,-13,-23,26,23,'#9fb67f');rect(c,-21,-13,42,9,'#95ad76');for(const[a,b]of[[-14,-11],[-3,-18],[11,-10],[-4,-4]])rect(c,a,b,5,3,'#b7c798');c.restore();}
function tree(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);rect(c,-4,-38,8,39,'#a5966c');rect(c,-2,-34,3,33,'#b7a77d');bush(c,0,-32,1.5);bush(c,-10,-40,1.1);bush(c,11,-43,1);c.restore();}
function pixelStone(c,x,y,w){rect(c,x-w/2,y-2,w,5,'#c9c6a5');rect(c,x-w/2+2,y-3,w-4,1,'#dbd7b6');}
function pixelClock(c,x,y,t){rect(c,x-10,y-8,20,16,'#b7a57c');rect(c,x-8,y-10,16,20,'#b7a57c');rect(c,x-7,y-7,14,14,'#f2e6bf');rect(c,x-1,y-5,1,6,'#8c8965');rect(c,x,y,4,1,'#8c8965');}

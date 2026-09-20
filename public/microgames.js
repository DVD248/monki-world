import {character,item,rect,poly,ellipse,shadow} from './art.js';
import {random,clamp,CONTRACTS} from './shared/world.js';

export class Microgame {
  constructor(canvas,event,{onFinish,onProgress,sound,reduced=false}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.event=event;this.rng=random(event.seed+event.modifier);this.onFinish=onFinish;this.onProgress=onProgress;this.sound=sound;this.reduced=reduced;
    this.contract=event.contract||'score';this.shape=CONTRACTS[this.contract]||{};
    this.silent=!!this.shape.silent;this.fragile=!!this.shape.fragile;this.untimed=!!this.shape.untimed;
    // A quiet game has no announced length either; it simply stops at some point.
    this.duration=this.contract==='quiet'?10+this.rng()*10:(this.shape.duration??(event.kind==='hold'?25:22));
    this.time=0;this.last=0;this.score=0;this.started=false;this.finished=false;this.paused=false;this.pointer={x:200,y:350,down:false};this.keys=new Set();this.entities=[];this.particles=[];this.spawnAt=0;this.angle=0;this.velocity=0;this.balanceTime=0;this.charge=0;this.flash=0;this.round=0;this.findPhase=0;this.findTarget=0;this.findAt=0;this.findOrder=[0,1,2];this.cleanup=[];
    this.spawnInitial();
    this.listen(canvas,'pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);this.input(e,'down')});
    this.listen(canvas,'pointermove',e=>this.input(e,'move'));
    this.listen(canvas,'pointerup',e=>this.input(e,'up'));
    this.listen(canvas,'pointercancel',()=>{this.pointer.down=false;this.charge=0});
    this.listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)){e.preventDefault();this.keys.add(e.key);if(!e.repeat&&[' ','Enter'].includes(e.key))this.act('down');}});
    this.listen(canvas,'keyup',e=>{this.keys.delete(e.key);if([' ','Enter'].includes(e.key))this.act('up');});
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.setPaused(true);});
    this.c.imageSmoothingEnabled=false;this.frame=requestAnimationFrame(t=>this.loop(t));canvas.focus();
  }
  listen(el,name,fn){el.addEventListener(name,fn);this.cleanup.push(()=>el.removeEventListener(name,fn));}
  spawnInitial(){
    if(this.event.kind==='tap')for(let i=0;i<6;i++)this.spawnTap(i);
    if(this.event.kind==='sweep')for(let i=0;i<this.event.goal;i++)this.entities.push({x:45+this.rng()*310,y:95+this.rng()*235,r:18+this.rng()*12,alive:true});
    if(this.event.kind==='find')this.nextFind();
  }
  spawnTap(i){this.entities.push({x:45+(i%3)*145+(this.rng()-.5)*15,y:95+Math.floor(i/3)*125+(this.rng()-.5)*30,alive:true,phase:this.rng()*6});}
  point(e){const r=this.canvas.getBoundingClientRect();return{x:clamp((e.clientX-r.left)*400/r.width,0,400),y:clamp((e.clientY-r.top)*420/r.height,0,420)};}
  input(e,type){const p=this.point(e);this.pointer={...this.pointer,...p};this.act(type);}
  act(type){
    if(this.finished||this.paused)return;
    if(type==='down')this.pointer.down=true;
    if(this.time<1.1){if(type==='up')this.pointer.down=false;return;}
    const {x,y}=this.pointer,k=this.event.kind;
    if(type==='down'&&k==='tap'){
      const target=this.entities.find(o=>o.alive&&Math.hypot(o.x-x,o.y-y)<(this.event.modifier==='tiny'?28:38));
      if(target){target.alive=false;this.pointWon(target.x,target.y);this.entities.push({x:40+this.rng()*320,y:85+this.rng()*240,phase:this.rng()*6,alive:true});}
    }
    if(k==='sweep'&&this.pointer.down){for(const o of this.entities)if(o.alive&&Math.hypot(o.x-x,o.y-y)<o.r+12){o.alive=false;this.pointWon(o.x,o.y);}}
    if(type==='up'&&k==='aim'){
      const dx=x-200,dy=y-353,len=Math.max(40,Math.hypot(dx,dy));
      this.entities.push({x:200,y:353,vx:dx/len*350,vy:Math.min(-100,dy/len*350),alive:true});this.sound('throw');
    }
    if(type==='up'&&k==='hold'){
      if(this.charge>=.58&&this.charge<=.84){this.pointWon(200,215);this.round++;}
      else if(this.charge>.04){this.mistake();}
      this.charge=0;
    }
    if(type==='down'&&k==='find'&&this.findPhase===2){
      const index=[0,1,2].find(i=>Math.abs(x-(86+i*114))<46&&y>200&&y<320);
      if(index!==undefined){if(this.findOrder[index]===this.findTarget){this.pointWon(86+index*114,240);this.findPhase=3;this.findAt=this.time;}else{this.findPhase=3;this.findAt=this.time;this.mistake();}}
    }
    if(type==='up')this.pointer.down=false;
  }
  mistake(){this.flash=.3;this.sound('boop');if(this.fragile)this.finish();}
  pointWon(x,y){this.score++;this.sound('pop');this.onProgress(this.score,this.event.goal);for(let i=0;i<5;i++)this.particles.push({x,y,vx:(this.rng()-.5)*90,vy:-25-this.rng()*75,life:.55});}
  nextFind(){this.findTarget=Math.floor(this.rng()*3);this.findPhase=0;this.findAt=this.time;this.findOrder=[0,1,2];this.nextOrder=[0,1,2].sort(()=>this.rng()-.5);if(this.nextOrder.every((n,i)=>n===i))this.nextOrder=[1,2,0];}
  setPaused(value){this.paused=value;this.pointer.down=false;this.keys.clear();this.charge=0;document.getElementById('resume-game').hidden=!value;}
  loop(ts){if(this.finished)return;this.frame=requestAnimationFrame(t=>this.loop(t));const dt=Math.min(.04,(ts-(this.last||ts))/1000);this.last=ts;if(!this.paused)this.update(dt);this.draw();}
  update(dt){
    this.time+=dt;this.flash=Math.max(0,this.flash-dt);
    const k=this.event.kind,mod=this.event.modifier;const elapsed=Math.max(0,this.time-1.2);
    if(this.keys.has('ArrowLeft'))this.pointer.x=clamp(this.pointer.x-260*dt,20,380);
    if(this.keys.has('ArrowRight'))this.pointer.x=clamp(this.pointer.x+260*dt,20,380);
    if(this.keys.has('ArrowUp'))this.pointer.y=clamp(this.pointer.y-260*dt,40,380);
    if(this.keys.has('ArrowDown'))this.pointer.y=clamp(this.pointer.y+260*dt,40,380);
    if(this.time<1.2)return;
    if(k==='catch'){
      this.spawnAt-=dt;
      if(this.spawnAt<=0){this.spawnAt=mod==='sleepy'?.85:.56;this.entities.push({x:30+this.rng()*340,y:40,vx:mod==='windy'?50:0,vy:mod==='sleepy'?80:100+this.rng()*50,alive:true,bad:this.rng()<.18});}
      for(const o of this.entities){if(!o.alive)continue;o.y+=o.vy*dt;o.x+=o.vx*dt;if(mod==='bouncy')o.x+=Math.sin(this.time*4+o.y/30)*dt*40;if(o.y>346&&o.y<380&&Math.abs(o.x-this.pointer.x)<30){o.alive=false;if(!o.bad)this.pointWon(o.x,o.y);else{this.mistake();}}if(o.y>425)o.alive=false;}
    }
    if(k==='aim'){
      const tx=200+Math.sin(elapsed*(mod==='sleepy'?.6:1.4))*120,ty=154+Math.sin(elapsed)*20;
      this.target={x:tx,y:ty};
      for(const o of this.entities){if(!o.alive)continue;o.x+=o.vx*dt;o.y+=o.vy*dt;o.vy+=90*dt;if(mod==='windy')o.vx+=30*dt;if(Math.hypot(o.x-tx,o.y-(ty-16))<(mod==='tiny'?27:36)){o.alive=false;this.pointWon(tx,ty);}if(o.y>425||o.x<-30||o.x>430||o.y<0)o.alive=false;}
    }
    if(k==='tap'&&!this.reduced){for(const o of this.entities)if(o.alive){const speed=mod==='bouncy'?21:mod==='windy'?30:5;o.x=clamp(o.x+Math.sin(this.time*2+o.phase)*dt*speed,22,378);o.y=clamp(o.y+Math.cos(this.time+o.phase)*dt*5,75,330);}}
    if(k==='sweep'&&this.pointer.down)this.act('move');
    if(k==='balance'){
      // The finger is a direct support point, so one-handed play is forgiving.
      const support=(this.pointer.x-200)/170,wind=mod==='windy'?Math.sin(elapsed*2)*.32:.07;
      this.velocity+=(this.angle*.7+support*1.7+Math.sin(elapsed*1.5)*.35+wind)*dt;this.velocity*=Math.pow(.985,dt*60);this.angle+=this.velocity*dt;
      if(Math.abs(this.angle)>.95){this.angle=0;this.velocity=0;this.balanceTime=0;this.flash=.5;this.sound('boop');if(this.fragile){this.finish();return;}}
      else{this.balanceTime+=dt;this.score=Math.floor(this.balanceTime);this.onProgress(this.score,this.event.goal);}
    }
    if(k==='hold'&&this.pointer.down){this.charge+=dt*(mod==='sleepy'?.6:mod==='bouncy'?1.2:.85);if(this.charge>1){this.charge=0;this.flash=.2;}}
    if(k==='find'){
      const age=this.time-this.findAt;
      if(this.findPhase===0&&age>1.2){this.findPhase=1;this.findAt=this.time;}
      else if(this.findPhase===1&&age>1.2){this.findOrder=this.nextOrder;this.findPhase=2;this.findAt=this.time;}
      else if(this.findPhase===3&&age>.75){this.nextFind();}
    }
    this.entities=this.entities.filter(o=>o.alive);for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    const reachedGoal=this.event.goal>0&&this.score>=this.event.goal;
    const ranOut=elapsed>=this.duration;
    // A quiet game also stops early once there is simply nothing left to touch.
    const nothingLeft=this.contract==='quiet'&&this.time>3&&!this.entities.length;
    if(reachedGoal||ranOut||nothingLeft)this.finish();
  }
  draw(){const c=this.c,k=this.event.kind,elapsed=Math.max(0,this.time-1.2),mod=this.event.modifier;
    rect(c,0,0,400,420,'#dce6c8');rect(c,0,52,400,2,'#c3d1ab');rect(c,0,350,400,70,'#c2d0ac');
    for(let i=0;i<18;i++)rect(c,(i*73)%400,70+(i*47)%269,3,1,'#c8d8b3');
    if(!this.silent&&!this.untimed){
      rect(c,25,23,350,3,'#c2ceaa');rect(c,25,23,350*(1-Math.min(1,elapsed/this.duration)),3,'#849d66');
      c.fillStyle='#70835b';c.font='10px monospace';c.textAlign='left';c.fillText(String(this.score).padStart(2,'0'),25,42);c.textAlign='right';c.fillText(`${Math.ceil(Math.max(0,this.duration-elapsed))}s`,375,42);
    }
    const scale=mod==='tiny'?.65:mod==='giant'?1.6:1;
    if(k==='tap'){
      character(c,this.event.actor,200,382,{scale:1.65,frame:Math.floor(this.time)});
      for(const o of this.entities){if(this.event.item==='balloon')item(c,'balloon',o.x,o.y+14,{scale:1.5*scale});else{ellipse(c,o.x,o.y,25,25,'#eaf0d577');item(c,this.event.item,o.x,o.y+12,{scale:1.5*scale});}}
    }
    if(k==='catch'){
      character(c,this.event.actor,70,100,{scale:1.1});rect(c,15,105,370,4,'#a5b387');
      for(const o of this.entities){item(c,o.bad?'mushroom':this.event.item,o.x,o.y,{scale:1.2*scale});if(o.bad){c.fillStyle='#ab7459';c.font='13px monospace';c.textAlign='center';c.fillText('×',o.x,o.y+13);}}
      character(c,'monki',this.pointer.x,403,{scale:1.1});rect(c,this.pointer.x-27,357,54,15,'#aa9165');rect(c,this.pointer.x-31,353,62,5,'#c4aa7b');
    }
    if(k==='aim'){
      const target=this.target||{x:200,y:154};shadow(c,target.x,target.y,23);character(c,this.event.actor,target.x,target.y,{scale:1.7,frame:Math.floor(this.time*2)});
      for(const o of this.entities)item(c,this.event.item,o.x,o.y,{scale:1.1*scale});
      item(c,this.event.item,200,375,{scale:1.5});
      if(this.pointer.down){c.strokeStyle='#99ac7c';c.setLineDash([3,6]);c.beginPath();c.moveTo(200,351);c.lineTo(this.pointer.x,this.pointer.y);c.stroke();c.setLineDash([]);ellipse(c,this.pointer.x,this.pointer.y,7,7,'#849d6644');}
      if(elapsed<3&&!this.silent)this.hintArrow(c,200,310,200,235);
    }
    if(k==='sweep'){
      character(c,this.event.actor,335,126,{scale:1.4});
      for(const o of this.entities){ellipse(c,o.x,o.y,o.r,o.r*.47,this.event.aftermath==='crumbs'?'#b1a780':'#94b8a477');if(this.event.item==='frog')item(c,'frog',o.x,o.y,{scale:.8});else rect(c,o.x-o.r/2,o.y-3,o.r,2,'#c4daca');}
      rect(c,this.pointer.x-17,this.pointer.y-9,34,20,'#eee1b7');rect(c,this.pointer.x-14,this.pointer.y-7,3,16,'#c9ba92');
    }
    if(k==='balance'){
      character(c,this.event.actor,200,346,{scale:1.9});c.save();c.translate(200,279);c.rotate(this.angle);rect(c,-52,-4,104,5,'#a18a5c');for(let i=0;i<4;i++)item(c,this.event.item,0,-9-i*30,{scale:1.5});c.restore();
      rect(c,54,381,292,2,'#97ac7a');ellipse(c,this.pointer.x,382,7,7,'#758e5c');if(elapsed<3&&!this.silent)this.hintArrow(c,130,362,270,362);
    }
    if(k==='hold'){
      character(c,this.event.actor,200,337,{scale:2});item(c,this.event.item,200,250-this.charge*80,{scale:2+this.round*.3});
      rect(c,63,365,274,20,'#b6c89d');rect(c,63+274*.58,365,274*.26,20,'#889f69');rect(c,63,386,274,1,'#90a475');rect(c,63+274*this.charge-2,360,4,30,'#f5e8bc');
      if(elapsed<3&&!this.silent){c.fillStyle='#70835b';c.textAlign='center';c.font='11px monospace';c.fillText('↓  …  ↑',200,407);}
    }
    if(k==='find'){
      character(c,this.event.actor,200,150,{scale:1.75});item(c,this.event.item,200,80,{scale:.9});
      const age=this.time-this.findAt;
      for(let i=0;i<3;i++){
        let x=86+i*114;
        if(this.findPhase===1){const end=this.nextOrder.indexOf(this.findOrder[i]);const progress=clamp(age/1.2,0,1);x+=(end-i)*114*(progress*progress*(3-2*progress));}
        shadow(c,x,302,33);rect(c,x-33,249,66,47,'#b7a77e');rect(c,x-36,241,72,11,'#cabb93');rect(c,x-2,252,5,43,'#97a279');
        if((this.findPhase===0||this.findPhase===3)&&this.findOrder[i]===this.findTarget)item(c,this.event.item,x,230,{scale:1.5});
      }
      if(this.findPhase===0||this.findPhase===1){c.fillStyle='#7e9168';c.font='11px monospace';c.textAlign='center';c.fillText(this.findPhase===0?'◉':'…',200,352);}
    }
    if(mod==='bouncy'&&k!=='tap'&&k!=='find')character(c,'galgan',((this.time*58)%500)-50,340,{scale:1.2,frame:Math.floor(this.time*6)});
    for(const p of this.particles)rect(c,p.x,p.y,3,3,'#fbefbf');
    if(this.flash>0){c.globalAlpha=.15;rect(c,0,54,400,366,'#c7956a');c.globalAlpha=1;}
    if(this.time<1.2){c.globalAlpha=.3;rect(c,0,54,400,366,'#eaf0d9');c.globalAlpha=1;c.textAlign='center';c.font='15px monospace';c.fillStyle='#5f7650';c.fillText(this.time<.6?'…':'↓',200,209);}
    if(this.paused){c.globalAlpha=.6;rect(c,0,0,400,420,'#e0e6cf');c.globalAlpha=1;}
  }
  hintArrow(c,x,y,x2,y2){c.strokeStyle='#99ac7c';c.lineWidth=2;c.setLineDash([3,5]);c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();c.setLineDash([]);poly(c,[[x2,y2],[x2-5,y2+8],[x2+5,y2+8]],'#99ac7c');}
  finish(){if(this.finished)return;this.finished=true;this.stop();this.onFinish({score:this.score,event:this.event});}
  stop(){this.finished=true;cancelAnimationFrame(this.frame);this.cleanup.forEach(f=>f());this.keys.clear();}
}

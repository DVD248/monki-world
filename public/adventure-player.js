import {character,item,rect,poly,ellipse,shadow} from './art.js';
import {clamp,random,ITEMS} from './shared/world.js';
import {difficultyFor,matchFaces} from './shared/adventures.js';
import {StackTower} from './stack-physics.js';
import {launchShot,shotPoint,advanceShot,looseBody,advanceLooseBody} from './projectile-physics.js';

/** Little physical stories. No hidden win conditions, random instant losses,
 * countdown pressure or empty waiting games. Each gesture has an immediate response. */
export class AdventurePlayer{
  constructor(canvas,chapter,{onDone,onStep,sound,startStep=0,reduced=false,singleStep=false}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.chapter=chapter;this.onDone=onDone;this.onStep=onStep;this.sound=sound;this.reduced=reduced;this.singleStep=singleStep;
    this.chapter={...chapter,edition:chapter.edition||0,variant:chapter.variant||'plain'};this.difficulty=difficultyFor(this.chapter);this.rng=random(chapter.id+this.chapter.edition);this.pointer={x:200,y:360,down:false};this.keys=new Set();this.cleanups=[];
    this.time=0;this.last=0;this.age=0;this.particles=[];this.shots=[];this.phase='play';this.closed=false;this.paused=false;
    this.enter(clamp(startStep,0,2));
    this.listen(canvas,'pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);this.input(e,'down');});
    this.listen(canvas,'pointermove',e=>this.input(e,'move'));
    this.listen(canvas,'pointerup',e=>this.input(e,'up'));
    this.listen(canvas,'pointercancel',()=>{this.pointer.down=false;this.dragging=false;this.aimStart=null;this.sortDrag=false;});
    this.listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)){e.preventDefault();this.keys.add(e.key);if(!e.repeat&&(e.key===' '||e.key==='Enter'))this.keyboardAction('down');}});
    this.listen(canvas,'keyup',e=>{this.keys.delete(e.key);if(e.key===' '||e.key==='Enter')this.keyboardAction('up');});
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.pause(true);});
    this.c.imageSmoothingEnabled=false;this.frame=requestAnimationFrame(t=>this.loop(t));canvas.focus();
  }
  listen(el,name,fn){el.addEventListener(name,fn);this.cleanups.push(()=>el.removeEventListener(name,fn));}
  enter(step){
    this.step=step;this.spec={...this.chapter.steps[step]};this.misses=0;
    if(this.spec.kind==='feed')this.spec.hint='Drag from the food. Aim at the dog. Release.';
    if(this.spec.kind==='stack'){
      this.spec.hint='Tap to drop. Keep the tower balanced.';
      this.spec.goal=Math.min(6,Math.max(this.spec.goal,4+Math.floor(this.difficulty*2.1)));
    }
    if(this.spec.kind==='sequence')this.spec.goal+=Math.round(this.difficulty*2);
    this.hits=0;this.age=0;this.phase='play';this.entities=[];this.shots=[];this.catchDebris=[];this.basketImpact=0;this.stackShakenUntil=0;this.dragging=false;this.selected=false;this.charge=0;this.cooldown=0;this.spawn=0;this.findPhase='peek';this.findAge=0;this.findTarget=Math.floor(this.rng()*3);this.findOrder=[0,1,2];this.findNext=this.rng()>.5?[2,0,1]:[1,2,0];
    const k=this.spec.kind;
    if(k==='pop')for(let i=0;i<this.spec.goal;i++){this.entities.push({id:i,x:70+(i%3)*125,y:125+Math.floor(i/3)*75,alive:true,phase:i*1.7});}
    if(k==='wipe')for(let i=0;i<this.spec.goal;i++)this.entities.push({id:i,x:65+(i%3)*125,y:180+Math.floor(i/3)*48,alive:true});
    if(k==='match'){this.pairCount=this.difficulty>=.55?4:3;this.spec.goal=this.pairCount;this.spec.hint='Find each matching pair.';this.matchItems=matchFaces(this.spec.item,this.pairCount);this.cards=Array.from({length:this.pairCount*2},(_,i)=>({value:i%this.pairCount,sort:this.rng(),open:false,done:false})).sort((a,b)=>a.sort-b.sort);this.firstCard=null;this.matchWait=0;}
    // "Catch socks. Let potatoes fall.", not "Catch sock."
    if(k==='catch'&&this.difficulty>=.4)this.spec.hint=`Catch ${(ITEMS[this.spec.item]?.name||this.spec.item).toLowerCase()}s. Let ${this.spec.item==='sock'?'potatoes':'socks'} fall.`;
    if(k==='trail'){this.path=Array.from({length:this.spec.goal},(_,i)=>({x:65+(i%3)*130,y:150+Math.floor(i/3)*135}));}
    if(k==='sort'){this.sortRight=this.rng()>.5;this.sortDrag=false;}
    if(k==='sequence'){this.sequence=Array.from({length:this.spec.goal},()=>Math.floor(this.rng()*3));this.sequenceAt=0;this.sequenceShow=true;this.sequenceAge=0;}
    if(k==='stack')this.tower=new StackTower({item:this.spec.item,difficulty:this.difficulty,variant:this.chapter.variant,goal:this.spec.goal});
    this.aimStart=null;this.throwShot=null;this.throwFeedback=null;this.obscurers=this.chapter.variant==='bubbles'?Array.from({length:5},(_,i)=>({x:65+i*68,y:155+i%2*60,alive:true})):[];
    this.onStep({step,spec:this.spec,hits:0,goal:this.spec.goal});
  }
  point(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*400/r.width,y:(e.clientY-r.top)*430/r.height};}
  input(e,type){Object.assign(this.pointer,this.point(e));this.act(type);}
  keyboardAction(type){
    const k=this.spec.kind;
    if(type==='down'&&k==='pop'){const o=this.entities.find(e=>e.alive);if(o){this.pointer.x=o.x;this.pointer.y=o.y;}}
    if(type==='down'&&k==='dress'&&!this.paused&&this.phase==='play'){this.winPoint(200,210);return;}
    if(type==='down'&&(k==='feed'||k==='aim')&&!this.aimStart){this.pointer.x=85;this.pointer.y=345;}
    if(type==='down'&&k==='find'){this.pointer.y=275;}
    this.act(type);
  }
  act(type){
    if(this.closed||this.paused||this.phase!=='play')return;
    if(type==='down')this.pointer.down=true;
    const{x,y}=this.pointer,k=this.spec.kind;
    if(type==='down'){const b=this.obscurers.find(b=>b.alive&&Math.hypot(b.x-x,b.y-y)<34);if(b){b.alive=false;this.sound('pop');return;}}
    if(k==='stack'&&type==='down'){
      if(this.tower.drop())this.sound('pick');
    }
    if(k==='trail'&&this.pointer.down){const target=this.path[this.hits];if(target&&Math.hypot(target.x-x,target.y-y)<43-this.level()*13)this.winPoint(target.x,target.y);}
    if(k==='aim'||k==='feed'){
      if(type==='down'&&Math.hypot(x-85,y-345)<68&&!this.throwShot){this.aimStart={x:85,y:345};this.throwFeedback=null;this.sound('pick');}
      if(type==='up'&&this.aimStart){this.throwShot=launchShot({x:85,y:345,tx:clamp(x,35,365),ty:clamp(y,70,365)});this.aimStart=null;this.sound('throw');}
    }
    if(k==='sort'){
      if(type==='down'&&Math.hypot(x-200,y-198)<65)this.sortDrag=true;
      if(type==='up'&&this.sortDrag){this.sortDrag=false;if(y>270&&Math.abs(x-(this.sortRight?300:100))<77){this.winPoint(x,y);this.sortRight=this.rng()>.5;}else this.sound('boop');}
    }
    if(k==='match'&&type==='down'&&this.matchWait<=0){
      const i=this.cards.findIndex((card,i)=>{const p=this.cardAt(i);return!card.done&&!card.open&&Math.abs(x-p.x)<p.size/2&&Math.abs(y-p.y)<p.size/2;});
      if(i>=0){this.cards[i].open=true;this.sound('tap');if(this.firstCard===null)this.firstCard=i;else{const first=this.cards[this.firstCard];if(first.value===this.cards[i].value){first.done=this.cards[i].done=true;this.winPoint(x,y);}else this.matchWait=.85;this.firstCard=null;}}
    }
    if(k==='sequence'&&type==='down'&&!this.sequenceShow){const i=[0,1,2].find(i=>Math.abs(x-(82+i*118))<49&&y>220&&y<327);if(i!==undefined){if(i===this.sequence[this.sequenceAt]){this.sequenceAt++;this.winPoint(x,y);}else{this.sequenceShow=true;this.sequenceAge=0;this.sequenceAt=0;this.hits=0;this.onStep({step:this.step,spec:this.spec,hits:0,goal:this.spec.goal});this.sound('boop');}}}
    if(k==='pop'&&type==='down'){
      const e=this.entities.find(o=>o.alive&&Math.hypot(o.x-x,o.y-y)<48-this.level()*13);
      if(e){e.alive=false;this.winPoint(e.x,e.y);}
    }
    if(k==='wipe'&&this.pointer.down)for(const e of this.entities)if(e.alive&&Math.hypot(e.x-x,e.y-y)<57){e.alive=false;this.winPoint(e.x,e.y);}
    if(k==='dress'){
      if(type==='down'&&Math.hypot(x-80,y-343)<62){this.dragging=true;this.selected=true;this.sound('pick');}
      else if(type==='down'&&this.selected&&Math.hypot(x-225,y-188)<90)this.winPoint(225,178);
      if(type==='up'&&this.dragging){this.dragging=false;if(Math.hypot(x-225,y-188)<90)this.winPoint(225,178);}
    }
    if(k==='pull'&&type==='up'){
      if(this.charge>=.55+this.level()*.06&&this.charge<=.9-this.level()*.06)this.winPoint(200,160);else if(this.charge>.04)this.miss();
      this.charge=0;
    }
    if(k==='find'&&type==='down'&&this.findPhase==='choose'){
      const i=[0,1,2].find(i=>Math.abs(x-(82+i*118))<48&&y>220&&y<335);
      if(i!==undefined){if(this.findOrder[i]===this.findTarget)this.winPoint(x,y);else{this.findPhase='peek';this.findAge=0;this.sound('boop');}}
    }
    if(type==='up')this.pointer.down=false;
  }
  level(){return Math.max(0,this.difficulty-Math.floor(this.misses/3)*.18);}
  cardAt(i){const columns=this.pairCount===4?4:3;return{x:columns===4?62+i%4*92:77+i%3*123,y:168+Math.floor(i/columns)*120,size:columns===4?78:88};}
  miss(){this.misses++;this.bump=.14;this.sound('miss');}
  dogX(){const d=this.level();return 255+Math.sin(this.time*(1.05+d*.55))*(20+d*45);}
  stackX(){return this.tower?.sourceX()??200;}
  aimTarget(){const d=this.level();return{x:260+Math.sin(this.time*((this.chapter.variant==='wind'?1.25:.7)+d*.45))*(30+d*30),y:180+Math.sin(this.time*.6)*d*16};}
  winPoint(x,y){
    if(this.phase!=='play')return;
    this.hits++;this.sound(this.spec.kind==='stack'?'step':'pop');this.bump=.18;
    for(let i=0;i<8;i++)this.particles.push({x,y,vx:(this.rng()-.5)*110,vy:-30-this.rng()*90,life:.7});
    this.onStep({step:this.step,spec:this.spec,hits:this.hits,goal:this.spec.goal});
    if(this.hits>=this.spec.goal){this.phase='payoff';this.phaseAt=this.time;this.pointer.down=false;this.dragging=false;this.sound('win');}
  }
  pause(value){this.paused=value;this.pointer.down=false;this.aimStart=null;this.dragging=false;this.sortDrag=false;this.keys.clear();document.getElementById('resume-game').hidden=!value;}
  loop(ts){if(this.closed)return;this.frame=requestAnimationFrame(t=>this.loop(t));const dt=Math.min(.045,(ts-(this.last||ts))/1000);this.last=ts;if(!this.paused)this.update(dt);this.draw();}
  update(dt){
    this.time+=dt;this.age+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.bump=Math.max(0,(this.bump||0)-dt);
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    if(this.phase==='payoff'){
      if(this.time-this.phaseAt>.42){if(!this.singleStep&&this.step<2)this.enter(this.step+1);else{this.phase='complete';this.stop();this.onDone(this.chapter);}}
      return;
    }
    if(this.phase==='ending'){this.phase='complete';this.stop();this.onDone(this.chapter);return;}
    const k=this.spec.kind;
    if(k==='stack')for(const event of this.tower.update(dt)){
      if(event.type==='land'){this.sound('wood');this.bump=.12;}
      else if(event.type==='placed')this.winPoint(event.x,event.y);
      else if(event.type==='miss')this.miss();
      else if(event.type==='collapse'){this.hits=event.height;this.stackShakenUntil=this.time+1.1;this.miss();for(let i=0;i<12;i++)this.particles.push({x:event.x,y:event.y,vx:(this.rng()-.5)*120,vy:-25-this.rng()*75,life:.7});this.onStep({step:this.step,spec:this.spec,hits:this.hits,goal:this.spec.goal});}
    }
    if(this.keys.has('ArrowLeft'))this.pointer.x=clamp(this.pointer.x-230*dt,25,375);
    if(this.keys.has('ArrowRight'))this.pointer.x=clamp(this.pointer.x+230*dt,25,375);
    if(this.keys.has('ArrowUp'))this.pointer.y=clamp(this.pointer.y-230*dt,50,390);
    if(this.keys.has('ArrowDown'))this.pointer.y=clamp(this.pointer.y+230*dt,50,390);
    if(k==='pop'&&!this.reduced)for(const e of this.entities){e.x=clamp(e.x+Math.sin(this.time+e.phase)*dt*((this.chapter.variant==='wind'?35:5)+this.level()*27),35,365);e.y=clamp(e.y+Math.cos(this.time+e.phase)*dt*(this.chapter.variant==='bounce'?30:3),75,365);}
    if(k==='wipe'&&this.pointer.down)this.act('move');
    if(k==='trail'&&this.pointer.down)this.act('move');
    if(k==='match'&&this.matchWait>0){this.matchWait-=dt;if(this.matchWait<=0)for(const card of this.cards)if(!card.done)card.open=false;}
    if(k==='sequence'&&this.sequenceShow){this.sequenceAge+=dt;if(this.sequenceAge>this.sequence.length*.8+.8)this.sequenceShow=false;}
    if((k==='aim'||k==='feed')&&this.throwShot){const s=this.throwShot;if(advanceShot(s,dt)){const target=k==='feed'?{x:this.dogX(),y:246}:this.aimTarget(),hit=k==='aim'?Math.abs(s.x-target.x)<48-this.level()*14&&Math.abs(s.y-target.y)<38-this.level()*10:Math.hypot(s.x-target.x,s.y-target.y)<66-this.level()*24;this.throwFeedback={hit,x:s.x,y:s.y,at:this.time,target,body:hit?null:looseBody(s)};if(hit){this.winPoint(target.x,target.y);if(k==='aim')this.sound('basket');}else this.miss();this.throwShot=null;}}
    if((k==='aim'||k==='feed')&&this.throwFeedback?.body&&this.time-this.throwFeedback.at<1.2)advanceLooseBody(this.throwFeedback.body,dt);
    if(k==='catch'){
      this.basketImpact=Math.max(0,this.basketImpact-dt);
      this.spawn-=dt;if(this.spawn<=0){this.spawn=.96-this.level()*.2;this.entities.push({x:45+this.rng()*310,y:60,alive:true,decoy:this.difficulty>=.4&&this.rng()<.23,vy:42+this.level()*24,angle:0,spin:(this.rng()-.5)*1.4,bounces:0});}
      for(const e of this.entities){e.vy+=115*dt;e.y+=e.vy*dt;e.angle+=e.spin*dt;if(this.chapter.variant==='wind')e.x=clamp(e.x+Math.sin(this.time)*dt*36,30,370);if(e.alive&&e.y>334&&e.y<381&&Math.abs(e.x-this.pointer.x)<(this.chapter.variant==='giant'?64:47)){e.alive=false;this.basketImpact=.42;this.sound('basket');if(e.decoy){this.miss();this.wrongUntil=this.time+1.2;}else this.winPoint(e.x,e.y);}if(e.y>398){if(this.chapter.variant==='bounce'&&!e.decoy&&!e.bounces){e.y=396;e.vy=-265;e.bounces=1;}else{e.alive=false;this.catchDebris.push({x:e.x,y:390,vx:e.spin*35,vy:-75,angle:e.angle,spin:e.spin*2,age:0,bounces:0,item:e.decoy?(this.spec.item==='sock'?'potato':'sock'):this.spec.item});}}}
      this.entities=this.entities.filter(e=>e.alive);
      for(const e of this.catchDebris)advanceLooseBody(e,dt);
      this.catchDebris=this.catchDebris.filter(e=>e.age<.9);
    }
    if(k==='pull'&&this.pointer.down){this.charge+=dt*(.5+this.level()*.16);if(this.charge>=1){this.charge=0;this.pointer.down=false;this.miss();}}
    if(k==='find'){
      this.findAge+=dt;
      if(this.findPhase==='peek'&&this.findAge>1.9){this.findPhase='shuffle';this.findAge=0;}
      else if(this.findPhase==='shuffle'&&this.findAge>1.25-this.level()*.45){this.findOrder=this.findNext;this.findPhase='choose';this.findAge=0;}
    }
    if(k==='steer'){
      this.spawn-=dt;if(this.spawn<=0){this.spawn=1.15;this.entities.push({x:55+this.rng()*290,y:45,alive:true});}
      for(const e of this.entities){e.y+=(95+this.level()*55)*dt;if(this.chapter.variant==='wind')e.x=clamp(e.x+Math.sin(this.time*1.3)*dt*28,45,355);if(e.alive&&e.y>295&&e.y<340){e.alive=false;if(Math.abs(e.x-clamp(this.pointer.x,50,350))>45)this.winPoint(this.pointer.x,305);else this.miss();}}
      this.entities=this.entities.filter(e=>e.alive);
    }
  }
  backdrop(c){
    const id=this.chapter.id,theme=this.chapter.theme,night=id==='moon-trip'||theme==='space'||theme==='night';
    rect(c,0,0,400,430,night?'#354b65':'#d6e8d8');
    if(night){for(let i=0;i<30;i++)rect(c,(i*73)%395,25+(i*37)%310,2,2,'#dfe6c5');rect(c,0,335,400,95,'#9e8f82');}
    else if(id==='boat'||theme==='water'){
      rect(c,0,0,400,90,'#d9e9e4');rect(c,0,90,400,340,'#abd0d0');
      for(let i=0;i<12;i++)rect(c,((i*87)+this.time*8)%420-10,118+(i*27)%290,25,2,'#d5e5d9');
    }else if(theme==='garden'||theme==='snow'){
      rect(c,0,0,400,270,theme==='snow'?'#d6e5e3':'#c7ddd4');rect(c,0,260,400,170,theme==='snow'?'#edf0e5':'#b7c990');for(let x=0;x<400;x+=30){rect(c,x,220,8,72,'#e9dfb9');rect(c,x,238,30,5,'#d2cda6');}item(c,'plant',330,230,{scale:2});
    }else{
      rect(c,0,0,400,260,'#f2e3c3');for(let x=0;x<400;x+=22)rect(c,x,15,1,240,'#dfd4b4');
      rect(c,0,225,400,42,'#b6c99d');rect(c,0,262,400,7,'#8d9e75');rect(c,0,269,400,161,'#d5b891');
      for(let y=286;y<430;y+=24)rect(c,0,y,400,1,'#bfa27d');
      rect(c,26,45,65,67,'#ab9976');rect(c,31,50,55,57,'#b3d5d3');rect(c,55,50,4,57,'#f4e8c9');rect(c,31,78,55,3,'#f4e8c9');
      if(id==='cloud')item(c,'couch',285,289,{scale:1.8,shadow:true});
    }
  }
  draw(){
    const c=this.c,r=this.canvas.getBoundingClientRect(),resolution=Math.min(3,window.devicePixelRatio||1)*(r.width||400)/400;
    if(this.canvas.width!==Math.round(400*resolution)){this.canvas.width=Math.round(400*resolution);this.canvas.height=Math.round(430*resolution);c.imageSmoothingEnabled=false;}
    c.setTransform(resolution,0,0,resolution,0,0);this.backdrop(c);const k=this.spec.kind,id=this.chapter.id,t=this.reduced?0:this.time;
    if(this.phase==='ending'){this.ending(c,t);return;}
    const won=this.phase==='payoff';
    const large=this.chapter.variant==='giant'?1.3:1;
    if(k==='aim'){
      const target=this.aimTarget(),f=this.throwFeedback,age=f?this.time-f.at:99,impact=f?.hit&&age<.5?Math.sin(age/.5*Math.PI)*7:0;
      character(c,this.chapter.actor,target.x,142,{scale:1.7,mood:f?.hit&&age<.8?'happy':'idle'});this.basket(c,target.x,target.y+20,impact);
      ellipse(c,85,373,29,7,'#b8b69155');if(!this.throwShot)item(c,this.spec.item,85,365,{scale:this.aimStart?1.55:1.35});
      if(this.aimStart){const p=this.pointer,preview=launchShot({x:85,y:345,tx:clamp(p.x,35,365),ty:clamp(p.y,70,365)});c.strokeStyle='#879a75';c.lineWidth=2;c.beginPath();for(let i=0;i<=18;i++){const q=shotPoint(preview,preview.duration*i/18);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y);}c.stroke();ellipse(c,p.x,p.y,14,5,'#728e6455');c.strokeStyle='#506c51';c.beginPath();c.ellipse(p.x,p.y,14,5,0,0,Math.PI*2);c.stroke();}
      if(this.throwShot){const s=this.throwShot;ellipse(c,s.x,s.ty+12,Math.max(6,14-s.age*11),4,'#65745b33');c.save();c.translate(s.x,s.y);c.rotate(s.angle);item(c,this.spec.item,0,0,{scale:1.35});c.restore();}
      if(f&&age<.95){const fade=clamp((.95-age)/.3,0,1);c.save();c.globalAlpha=fade;
        if(f.body){c.save();c.translate(f.body.x,f.body.y);c.rotate(f.body.angle);item(c,this.spec.item,0,0,{scale:1.2});c.restore();}
        c.fillStyle=f.hit?'#37694d':'#9b5145';c.font='bold 19px sans-serif';c.textAlign='center';c.fillText(f.hit?'+1':'×  Miss',clamp(f.hit?f.target.x:f.x,55,340),Math.max(90,(f.hit?f.target.y:f.y)-42-age*10));c.textAlign='start';c.restore();
      }
      if(!this.aimStart&&this.age<5)this.hand(c,85+(t%2)*85,340-(t%2)*75,t);
    }
    if(k==='stack'){
      const tower=this.tower,support=tower.support(),projected=tower.predictedX();
      const shaken=this.time<this.stackShakenUntil;
      character(c,this.chapter.actor,67+(shaken?Math.sin(t*25)*3:0),369-(shaken?Math.abs(Math.sin(t*14))*5:0),{scale:1.7,mood:shaken?'annoyed':'idle'});
      ellipse(c,200,364,102,11,'#5b654333');rect(c,121,351,158,11,'#8e7657');rect(c,127,349,146,4,'#c2a47a');
      for(let i=0;i<tower.blocks.length;i++){const block=tower.blocks[i];this.stackPiece(c,{...block,x:block.x+tower.sway*(i+1)/tower.blocks.length,angle:block.angle+tower.sway*.004*(i+1)});}
      for(const block of tower.debris)this.stackPiece(c,block);
      if(tower.flight)this.stackPiece(c,tower.flight);
      else if(tower.ready&&!won)this.stackPiece(c,{x:tower.sourceX(),y:tower.sourceY(),w:tower.width,h:tower.height,angle:0});
      if(!won){const safe=Math.abs(projected-support.x)<support.w/2-4+tower.assist()*.6;
        c.save();c.globalAlpha=.65;ellipse(c,projected,support.y+3,tower.width*.43,5,safe?'#718e6b':'#bd7b68');c.restore();
        c.strokeStyle='#a38b67';c.lineWidth=1;c.setLineDash([3,6]);c.beginPath();c.moveTo(support.x,support.y-4);c.lineTo(support.x,support.y-27);c.stroke();c.setLineDash([]);
      }
      if(this.age<4&&!tower.flight&&tower.ready)this.hand(c,285,330,t);
    }
    if(k==='trail'){
      c.strokeStyle='#d3bd8f';c.lineWidth=5;c.beginPath();this.path.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();
      this.path.forEach((p,i)=>{ellipse(c,p.x,p.y,23,23,i<this.hits?'#9caf7c':i===this.hits?'#e2b368':'#eee0bd');if(i<this.hits)item(c,this.spec.item,p.x,p.y+12,{scale:.65});else{c.fillStyle='#796950';c.font='16px sans-serif';c.fillText(String(i+1),p.x-5,p.y+6);}});character(c,this.chapter.actor,335,410,{scale:1.5});
    }
    if(k==='sort'){
      this.basket(c,100,341);this.basket(c,300,341);item(c,this.spec.item,100,388,{scale:1.2});item(c,'sock',300,388,{scale:1.2});
      item(c,this.sortRight?'sock':this.spec.item,this.sortDrag?this.pointer.x:200,this.sortDrag?this.pointer.y:225,{scale:2});character(c,this.chapter.actor,65,150,{scale:1.4});if(this.age<5)this.hand(c,220,248,t);
    }
    if(k==='match'){
      this.cards.forEach((card,i)=>{const {x,y,size}=this.cardAt(i);rect(c,x-size/2,y-size/2,size,size,card.done?'#bbcf9b':'#fbefd2');rect(c,x-size/2+5,y-size/2+5,size-10,size-10,card.open?'#e8d8ae':'#a3b699');if(card.open)item(c,this.matchItems[card.value],x,y+25,{scale:this.pairCount===4?1.25:1.5});else item(c,'star',x,y+14,{scale:.85});});
    }
    if(k==='sequence'){
      character(c,this.chapter.actor,202,185,{scale:2.1});
      const index=Math.floor(this.sequenceAge/.8),lit=this.sequenceShow&&this.sequenceAge%.8<.58?this.sequence[index]:-1;
      for(let i=0;i<3;i++){rect(c,36+i*118,237,92,85,lit===i?'#fff4b9':['#c99782','#a3b98a','#96b7bd'][i]);item(c,['flower','star','frog'][i],82+i*118,291,{scale:1.3});}
      c.fillStyle='#738563';c.font='14px sans-serif';c.textAlign='center';c.fillText(this.sequenceShow?'Watch':'Your turn',200,370);c.textAlign='start';
    }
    if(k==='pop'){
      const floating=id==='up',y=floating?185+this.hits*38:342;
      if(floating){for(const e of this.entities.filter(e=>e.alive)){c.strokeStyle='#997d65';c.lineWidth=1;c.beginPath();c.moveTo(200,y-45);c.lineTo(e.x,e.y);c.stroke();}}
      character(c,this.chapter.actor,200,y,{scale:2.4,frame:Math.floor(t*2),mood:won?'happy':'idle'});
      for(const e of this.entities.filter(e=>e.alive)){
        if(this.spec.item==='drop')item(c,'drop',e.x,e.y+19,{scale:2});
        else item(c,this.spec.item,e.x,e.y+25,{scale:(this.spec.item==='balloon'?2:1.7)*large});
      }
      const first=this.entities.find(e=>e.alive);if(first&&this.age<5)this.hand(c,first.x+23,first.y+25,t);
    }
    if(k==='dress'){
      ellipse(c,225,285,55,11,'#8a80532b');
      character(c,this.chapter.actor,225,285,{scale:3,frame:Math.floor(t),hat:won?this.spec.item:null,mood:won?'happy':'idle'});
      if(!won){
        c.strokeStyle='#ecb74b';c.lineWidth=3;c.setLineDash([5,5]);c.beginPath();c.arc(225,182,45,0,Math.PI*2);c.stroke();c.setLineDash([]);
        item(c,this.spec.item,this.dragging?this.pointer.x:80,this.dragging?this.pointer.y:365,{scale:2.1,shadow:true});
        if(this.age<6&&!this.dragging){const p=(t%2.5)/2.5;this.hand(c,80+145*p,348-150*p,t);this.arrow(c,110,326,183,229);}
      }
    }
    if(k==='feed'){
      const dog=this.dogX(),feedback=this.throwFeedback,feedbackAge=feedback?this.time-feedback.at:99,hop=feedback?.hit&&feedbackAge<.45?Math.sin(feedbackAge/.45*Math.PI)*10:0;
      character(c,this.chapter.actor==='galgan'?'galgan':'sernik',dog,291-hop,{scale:2.6,hat:id==='up'?'cone':null,mood:hop?'happy':'idle',frame:Math.floor(t*2)});
      character(c,'monki',62,350,{scale:2.2,frame:Math.floor(t*2)});
      if(!this.throwShot)item(c,this.spec.item,85,365,{scale:1.7});
      if(this.aimStart){const preview=launchShot({x:85,y:345,tx:clamp(this.pointer.x,35,365),ty:clamp(this.pointer.y,70,365)});c.strokeStyle='#a1ae79';c.setLineDash([4,5]);c.beginPath();for(let i=0;i<=16;i++){const p=shotPoint(preview,preview.duration*i/16);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();c.setLineDash([]);ellipse(c,this.pointer.x,this.pointer.y,7,7,'#d3a064');}
      if(this.throwShot){const s=this.throwShot;c.save();c.translate(s.x,s.y);c.rotate(s.angle);item(c,this.spec.item,0,0,{scale:1.35});c.restore();}
      if(feedback&&feedbackAge<1.1){if(feedback.body){c.save();c.translate(feedback.body.x,feedback.body.y);c.rotate(feedback.body.angle);item(c,this.spec.item,0,0,{scale:1.1});c.restore();}else{c.fillStyle='#f7e9bb';c.font='bold 21px sans-serif';c.fillText('+1',dog-8,226-hop);}if(feedback.body){c.fillStyle='#9b5145';c.font='bold 21px sans-serif';c.fillText('×',feedback.x-6,feedback.y-28);}}
      for(let i=0;i<this.hits;i++)item(c,this.spec.item,dog-30+i*17,308,{scale:.7});
      if(this.age<5&&!this.aimStart)this.hand(c,85+(t%2)*75,345-(t%2)*50,t);
    }
    if(k==='wipe'){
      character(c,this.chapter.actor,205,310,{scale:2.8,mood:won?'happy':'idle'});
      if(id==='boat')item(c,'couch',205,330,{scale:2});
      for(const e of this.entities.filter(e=>e.alive)){
        if(id==='cloud')item(c,'cloud',e.x,e.y+20,{scale:3});
        else{ellipse(c,e.x,e.y,52,20,'#87babe');rect(c,e.x-20,e.y-5,29,2,'#c3e3dc');}
      }
      if(this.pointer.down){rect(c,this.pointer.x-21,this.pointer.y-12,42,25,'#f4e5b6');rect(c,this.pointer.x-18,this.pointer.y-9,3,20,'#cab991');}
      if(this.age<5)this.hand(c,110+(t%2)*85,245,t);
    }
    if(k==='catch'){
      character(c,this.chapter.actor,77,155,{scale:1.7,frame:Math.floor(t*3)});
      item(c,id==='moon-trip'?'moon':'couch',270,139,{scale:1.6});
      for(const e of this.entities){c.save();c.translate(e.x,e.y);c.rotate(e.angle);item(c,e.decoy?(this.spec.item==='sock'?'potato':'sock'):this.spec.item,0,0,{scale:1.6*large});c.restore();}
      for(const e of this.catchDebris){c.save();c.globalAlpha=clamp((.9-e.age)/.25,0,1);c.translate(e.x,e.y);c.rotate(e.angle);item(c,e.item,0,0,{scale:1.3});c.restore();}
      this.basket(c,this.pointer.x,369,this.basketImpact?Math.sin((.42-this.basketImpact)/.42*Math.PI)*9:0);character(c,'monki',this.pointer.x,424,{scale:1.5,hat:this.wrongUntil>this.time?(this.spec.item==='sock'?'potato':'sock'):null});
      if(this.age<4)this.hand(c,125+(t%2)*65,391,t);
    }
    if(k==='pull'){
      const y=89+this.charge*100+this.hits*35;item(c,this.spec.item,200,y,{scale:3});
      c.strokeStyle='#d0bd8e';c.lineWidth=2;c.beginPath();c.moveTo(200,y);c.lineTo(200,310);c.stroke();character(c,'monki',200,364,{scale:2.5,frame:this.pointer.down?Math.floor(t*6):0});
      rect(c,62,388,276,18,'#82958b');rect(c,62+276*(.55+this.level()*.06),388,276*(.35-this.level()*.12),18,'#d8ddac');rect(c,62+276*this.charge,383,5,28,'#fff3c1');
      if(this.age<4)this.hand(c,266,331,t);
    }
    if(k==='find'){
      character(c,'galgan',205,160,{scale:2,mood:'idle'});
      for(let i=0;i<3;i++){
        const p=clamp(this.findAge/(1.25-this.level()*.45),0,1),destination=this.findNext.indexOf(this.findOrder[i]);let x=82+i*118;
        if(this.findPhase==='shuffle')x+=(destination-i)*118*p*p*(3-2*p);
        shadow(c,x,316,38);rect(c,x-36,259,72,55,'#ba9168');rect(c,x-40,249,80,13,'#d9b68c');rect(c,x-3,250,6,64,'#8f9d77');
        if((this.findPhase==='peek'||won)&&this.findOrder[i]===this.findTarget){if(this.spec.item==='monki')character(c,'monki',x,244,{scale:1.5});else item(c,this.spec.item,x,244,{scale:1.8});}
      }
      if(this.findPhase==='choose'&&!won)this.hand(c,this.pointer.x,338,t);
    }
    if(k==='steer'){
      for(const e of this.entities){ellipse(c,e.x,e.y,24,12,'#a5afa2');rect(c,e.x-13,e.y-11,22,10,'#b7bbaa');}
      const x=clamp(this.pointer.x,50,350);item(c,this.spec.item,x,335,{scale:1.4,shadow:true});character(c,this.chapter.actor,x,300,{scale:1.7,hat:this.chapter.reward});
      if(this.age<4)this.hand(c,100+(t%2)*100,380,t);
    }
    for(const p of this.particles)rect(c,p.x,p.y,4,4,'#fff5c2');
    for(const b of this.obscurers.filter(b=>b.alive)){ellipse(c,b.x,b.y,32,32,'#daeee488');c.strokeStyle='#fff6da';c.lineWidth=2;c.beginPath();c.arc(b.x,b.y,32,0,7);c.stroke();}
    if(this.chapter.variant==='night'){const g=c.createRadialGradient(this.pointer.x,this.pointer.y,65,this.pointer.x,this.pointer.y,330);g.addColorStop(0,'#20334600');g.addColorStop(1,'#203346bb');rect(c,0,0,400,430,g);}
    if(this.chapter.variant==='wind'){c.strokeStyle='#f7eed6';c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo((t*33+i*93)%440-40,95+i*77);c.lineTo((t*33+i*93)%440,95+i*77);c.stroke();}}
    if(won){c.fillStyle='#f8efd4';c.beginPath();c.arc(352,43,19,0,Math.PI*2);c.fill();c.strokeStyle='#56805a';c.lineWidth=4;c.beginPath();c.moveTo(343,43);c.lineTo(349,49);c.lineTo(362,35);c.stroke();}
    if(this.paused){rect(c,0,0,400,430,'#dce5d4bb');}
  }
  ending(c,t){
    const id=this.chapter.id;
    if(id==='boat'){item(c,'couch',200+Math.sin(t)*10,285,{scale:2.4});character(c,'galgan',200+Math.sin(t)*10,217,{scale:2.5,hat:'duck'});}
    else{character(c,this.chapter.actor,210,282,{scale:3.5,hat:this.chapter.reward,mood:'happy'});character(c,id==='up'?'sernik':'monki',91,315,{scale:1.8,hat:id==='up'?'icecream':null,mood:'happy'});}
    for(let i=0;i<10;i++){const x=25+i*37,y=80+(i*39+t*22)%280;rect(c,x,y,4,5,['#e8b165','#d89181','#a3bb82'][i%3]);}
  }
  basket(c,x,y,impact=0){c.save();c.translate(x,y+impact*.4);c.scale(1+impact*.008,1-impact*.018);ellipse(c,0,12,39,6,'#5d69442b');rect(c,-34,-20,68,28,'#c69a64');for(let i=0;i<6;i++)rect(c,-27+i*11,-17,2,22,'#ad7e54');for(let j=0;j<3;j++)rect(c,-33,-11+j*8,66,2,'#dab27c');ellipse(c,0,-20,40,10,'#e7c38e');ellipse(c,0,-21,33,6,'#806144');c.restore();}
  stackPiece(c,body){
    c.save();c.translate(body.x,body.y);c.rotate(body.angle||0);
    rect(c,-body.w/2,-body.h/2,body.w,body.h,'#9c7754');
    rect(c,-body.w/2+3,-body.h/2+2,body.w-6,body.h-5,'#d9b68a');
    rect(c,-body.w/2+5,-body.h/2+4,body.w-10,2,'#ecd1a7');
    item(c,this.spec.item,0,body.h/2-3,{scale:.85});
    c.restore();
  }
  hand(c,x,y,t){const d=this.reduced?0:Math.sin(t*4)*3;c=this.c;c.save();c.translate(x,y+d);c.strokeStyle='#78674b';c.lineWidth=1.4;c.fillStyle='#fff3d8';c.beginPath();c.moveTo(-6,8);c.lineTo(-8,-1);c.quadraticCurveTo(-8,-5,-4,-2);c.lineTo(-2,2);c.lineTo(-2,-15);c.quadraticCurveTo(0,-20,3,-15);c.lineTo(3,-5);c.lineTo(10,-4);c.quadraticCurveTo(15,-3,13,5);c.lineTo(9,13);c.lineTo(-2,13);c.closePath();c.fill();c.stroke();c.restore();}
  arrow(c,x,y,tx,ty){c.strokeStyle='#b2ad80';c.lineWidth=2;c.setLineDash([3,6]);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+65,y,tx,ty);c.stroke();c.setLineDash([]);}
  stop(){this.closed=true;cancelAnimationFrame(this.frame);this.cleanups.forEach(f=>f());this.keys.clear();}
}

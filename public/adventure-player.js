import {character,item,rect,poly,ellipse,shadow} from './art.js';
import {clamp,random} from './shared/world.js';

/** Six little physical stories. No hidden win conditions, random instant losses,
 * countdown pressure or empty waiting games. Each gesture has an immediate response. */
export class AdventurePlayer{
  constructor(canvas,chapter,{onDone,onStep,sound,startStep=0,reduced=false}){
    this.canvas=canvas;this.c=canvas.getContext('2d');this.chapter=chapter;this.onDone=onDone;this.onStep=onStep;this.sound=sound;this.reduced=reduced;
    this.rng=random(chapter.id+chapter.edition);this.pointer={x:200,y:360,down:false};this.keys=new Set();this.cleanups=[];
    this.time=0;this.last=0;this.age=0;this.particles=[];this.shots=[];this.phase='play';this.closed=false;this.paused=false;
    this.enter(clamp(startStep,0,2));
    this.listen(canvas,'pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);this.input(e,'down');});
    this.listen(canvas,'pointermove',e=>this.input(e,'move'));
    this.listen(canvas,'pointerup',e=>this.input(e,'up'));
    this.listen(canvas,'pointercancel',()=>{this.pointer.down=false;this.dragging=false;});
    this.listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)){e.preventDefault();this.keys.add(e.key);if(!e.repeat&&(e.key===' '||e.key==='Enter'))this.keyboardAction('down');}});
    this.listen(canvas,'keyup',e=>{this.keys.delete(e.key);if(e.key===' '||e.key==='Enter')this.keyboardAction('up');});
    this.listen(document,'visibilitychange',()=>{if(document.hidden)this.pause(true);});
    this.c.imageSmoothingEnabled=false;this.frame=requestAnimationFrame(t=>this.loop(t));canvas.focus();
  }
  listen(el,name,fn){el.addEventListener(name,fn);this.cleanups.push(()=>el.removeEventListener(name,fn));}
  enter(step){
    this.step=step;this.spec=this.chapter.steps[step];this.hits=0;this.age=0;this.phase='play';this.entities=[];this.shots=[];this.dragging=false;this.selected=false;this.charge=0;this.cooldown=0;this.spawn=0;this.findPhase='peek';this.findAge=0;this.findTarget=Math.floor(this.rng()*3);this.findOrder=[0,1,2];this.findNext=[2,0,1];
    const k=this.spec.kind;
    if(k==='pop')for(let i=0;i<this.spec.goal;i++){this.entities.push({id:i,x:70+(i%3)*125,y:125+Math.floor(i/3)*75,alive:true,phase:i*1.7});}
    if(k==='wipe')for(let i=0;i<this.spec.goal;i++)this.entities.push({id:i,x:65+(i%3)*125,y:180+Math.floor(i/3)*48,alive:true});
    this.onStep({step,spec:this.spec,hits:0,goal:this.spec.goal});
  }
  point(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*400/r.width,y:(e.clientY-r.top)*430/r.height};}
  input(e,type){Object.assign(this.pointer,this.point(e));this.act(type);}
  keyboardAction(type){
    const k=this.spec.kind;
    if(type==='down'&&k==='pop'){const o=this.entities.find(e=>e.alive);if(o){this.pointer.x=o.x;this.pointer.y=o.y;}}
    if(type==='down'&&k==='dress'){this.winPoint(200,210);return;}
    if(type==='down'&&k==='feed'){this.pointer.x=260;this.pointer.y=280;}
    if(type==='down'&&k==='find'){this.pointer.y=275;}
    this.act(type);
  }
  act(type){
    if(this.closed||this.paused||this.phase!=='play')return;
    if(type==='down')this.pointer.down=true;
    const{x,y}=this.pointer,k=this.spec.kind;
    if(k==='pop'&&type==='down'){
      const e=this.entities.find(o=>o.alive&&Math.hypot(o.x-x,o.y-y)<48);
      if(e){e.alive=false;this.winPoint(e.x,e.y);}
    }
    if(k==='wipe'&&this.pointer.down)for(const e of this.entities)if(e.alive&&Math.hypot(e.x-x,e.y-y)<57){e.alive=false;this.winPoint(e.x,e.y);}
    if(k==='dress'){
      if(type==='down'&&Math.hypot(x-80,y-343)<62){this.dragging=true;this.selected=true;this.sound('pick');}
      else if(type==='down'&&this.selected&&Math.hypot(x-225,y-188)<90)this.winPoint(225,178);
      if(type==='up'&&this.dragging){this.dragging=false;if(Math.hypot(x-225,y-188)<90)this.winPoint(225,178);}
    }
    if(k==='feed'&&type==='down'&&y>165&&y<335&&Math.abs(x-this.dogX())<68&&this.cooldown<=0){
      this.cooldown=.36;this.shots.push({x:75,y:340,age:0,tx:this.dogX(),ty:247});this.sound('throw');
    }
    if(k==='pull'&&type==='up'){
      if(this.charge>=.55&&this.charge<=.9)this.winPoint(200,160);else if(this.charge>.04){this.sound('boop');this.bump=.3;}
      this.charge=0;
    }
    if(k==='find'&&type==='down'&&this.findPhase==='choose'){
      const i=[0,1,2].find(i=>Math.abs(x-(82+i*118))<48&&y>220&&y<335);
      if(i!==undefined){if(this.findOrder[i]===this.findTarget)this.winPoint(x,y);else{this.findPhase='peek';this.findAge=0;this.sound('boop');}}
    }
    if(type==='up')this.pointer.down=false;
  }
  dogX(){return 258+Math.sin(this.time*1.4)*29;}
  winPoint(x,y){
    if(this.phase!=='play')return;
    this.hits++;this.sound('pop');this.bump=.18;
    for(let i=0;i<8;i++)this.particles.push({x,y,vx:(this.rng()-.5)*110,vy:-30-this.rng()*90,life:.7});
    this.onStep({step:this.step,spec:this.spec,hits:this.hits,goal:this.spec.goal});
    if(this.hits>=this.spec.goal){this.phase='payoff';this.phaseAt=this.time;this.pointer.down=false;this.dragging=false;this.sound('win');}
  }
  pause(value){this.paused=value;this.pointer.down=false;this.keys.clear();document.getElementById('resume-game').hidden=!value;}
  loop(ts){if(this.closed)return;this.frame=requestAnimationFrame(t=>this.loop(t));const dt=Math.min(.045,(ts-(this.last||ts))/1000);this.last=ts;if(!this.paused)this.update(dt);this.draw();}
  update(dt){
    this.time+=dt;this.age+=dt;this.cooldown=Math.max(0,this.cooldown-dt);this.bump=Math.max(0,(this.bump||0)-dt);
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=130*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    if(this.phase==='payoff'){
      if(this.time-this.phaseAt>1.15){if(this.step<2)this.enter(this.step+1);else{this.phase='ending';this.phaseAt=this.time;}}
      return;
    }
    if(this.phase==='ending'){if(this.time-this.phaseAt>2.2){this.stop();this.onDone(this.chapter);}return;}
    const k=this.spec.kind;
    if(this.keys.has('ArrowLeft'))this.pointer.x=clamp(this.pointer.x-230*dt,25,375);
    if(this.keys.has('ArrowRight'))this.pointer.x=clamp(this.pointer.x+230*dt,25,375);
    if(this.keys.has('ArrowUp'))this.pointer.y=clamp(this.pointer.y-230*dt,50,390);
    if(this.keys.has('ArrowDown'))this.pointer.y=clamp(this.pointer.y+230*dt,50,390);
    if(k==='pop'&&!this.reduced)for(const e of this.entities){e.x+=Math.sin(this.time+e.phase)*dt*5;e.y+=Math.cos(this.time+e.phase)*dt*3;}
    if(k==='wipe'&&this.pointer.down)this.act('move');
    if(k==='catch'){
      this.spawn-=dt;if(this.spawn<=0){this.spawn=.88;this.entities.push({x:45+this.rng()*310,y:60,alive:true,vy:90+this.chapter.edition*7});}
      for(const e of this.entities){e.y+=e.vy*dt;if(e.alive&&e.y>334&&e.y<381&&Math.abs(e.x-this.pointer.x)<47){e.alive=false;this.winPoint(e.x,e.y);}if(e.y>430)e.alive=false;}
      this.entities=this.entities.filter(e=>e.alive);
    }
    if(k==='feed'){
      for(const shot of this.shots){shot.age+=dt;if(shot.age>=.42&&!shot.done){shot.done=true;this.winPoint(shot.tx,shot.ty);}}
      this.shots=this.shots.filter(s=>s.age<.7);
    }
    if(k==='pull'&&this.pointer.down){this.charge+=dt*.5;if(this.charge>=1){this.charge=0;this.pointer.down=false;this.sound('boop');}}
    if(k==='find'){
      this.findAge+=dt;
      if(this.findPhase==='peek'&&this.findAge>1.9){this.findPhase='shuffle';this.findAge=0;}
      else if(this.findPhase==='shuffle'&&this.findAge>1.25){this.findOrder=this.findNext;this.findPhase='choose';this.findAge=0;}
    }
    if(k==='steer'){
      this.spawn-=dt;if(this.spawn<=0){this.spawn=1.15;this.entities.push({x:55+this.rng()*290,y:45,alive:true});}
      for(const e of this.entities){e.y+=95*dt;if(e.alive&&e.y>295&&e.y<340){e.alive=false;if(Math.abs(e.x-this.pointer.x)>45)this.winPoint(this.pointer.x,305);else{this.sound('boop');this.bump=.25;}}}
      this.entities=this.entities.filter(e=>e.alive);
    }
  }
  backdrop(c){
    const id=this.chapter.id,night=id==='moon-trip';
    rect(c,0,0,400,430,night?'#354b65':'#d6e8d8');
    if(night){for(let i=0;i<30;i++)rect(c,(i*73)%395,25+(i*37)%310,2,2,'#dfe6c5');rect(c,0,335,400,95,'#9e8f82');}
    else if(id==='boat'){
      rect(c,0,0,400,90,'#d9e9e4');rect(c,0,90,400,340,'#abd0d0');
      for(let i=0;i<12;i++)rect(c,((i*87)+this.time*8)%420-10,118+(i*27)%290,25,2,'#d5e5d9');
    }else{
      rect(c,0,0,400,260,'#f2e3c3');for(let x=0;x<400;x+=22)rect(c,x,15,1,240,'#dfd4b4');
      rect(c,0,225,400,42,'#b6c99d');rect(c,0,262,400,7,'#8d9e75');rect(c,0,269,400,161,'#d5b891');
      for(let y=286;y<430;y+=24)rect(c,0,y,400,1,'#bfa27d');
      rect(c,26,45,65,67,'#ab9976');rect(c,31,50,55,57,'#b3d5d3');rect(c,55,50,4,57,'#f4e8c9');rect(c,31,78,55,3,'#f4e8c9');
      if(id==='cloud')item(c,'couch',285,289,{scale:1.8,shadow:true});
    }
  }
  draw(){
    const c=this.c;this.backdrop(c);const k=this.spec.kind,id=this.chapter.id,t=this.reduced?0:this.time;
    if(this.phase==='ending'){this.ending(c,t);return;}
    const won=this.phase==='payoff';
    if(k==='pop'){
      const floating=id==='up',y=floating?185+this.hits*38:342;
      if(floating){for(const e of this.entities.filter(e=>e.alive)){c.strokeStyle='#997d65';c.lineWidth=1;c.beginPath();c.moveTo(200,y-45);c.lineTo(e.x,e.y);c.stroke();}}
      character(c,this.chapter.actor,200,y,{scale:2.4,frame:Math.floor(t*2),mood:won?'happy':'idle'});
      for(const e of this.entities.filter(e=>e.alive)){
        if(this.spec.item==='drop')item(c,'drop',e.x,e.y+19,{scale:2});
        else item(c,this.spec.item,e.x,e.y+25,{scale:this.spec.item==='balloon'?2:1.7});
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
      const dog=this.dogX();character(c,this.chapter.actor==='galgan'?'galgan':'sernik',dog,291,{scale:2.6,hat:id==='up'?'cone':null,mood:this.bump?'happy':'idle',frame:Math.floor(t*2)});
      character(c,'monki',62,350,{scale:2.2,frame:Math.floor(t*2)});
      item(c,this.spec.item,83,310,{scale:1.6});
      for(const s of this.shots){if(s.done)continue;const p=s.age/.42;item(c,this.spec.item,s.x+(s.tx-s.x)*p,s.y+(s.ty-s.y)*p-Math.sin(p*Math.PI)*65,{scale:1.35});}
      for(let i=0;i<this.hits;i++)item(c,this.spec.item,dog-30+i*17,308,{scale:.7});
      if(this.age<5)this.hand(c,dog+34,231,t);
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
      for(const e of this.entities)item(c,this.spec.item,e.x,e.y,{scale:1.6});
      this.basket(c,this.pointer.x,369);character(c,'monki',this.pointer.x,424,{scale:1.5});
      if(this.age<4)this.hand(c,125+(t%2)*65,391,t);
    }
    if(k==='pull'){
      const y=89+this.charge*100+this.hits*35;item(c,'moon',200,y,{scale:3});
      c.strokeStyle='#d0bd8e';c.lineWidth=2;c.beginPath();c.moveTo(200,y);c.lineTo(200,310);c.stroke();character(c,'monki',200,364,{scale:2.5,frame:this.pointer.down?Math.floor(t*6):0});
      rect(c,62,388,276,18,'#82958b');rect(c,62+276*.55,388,276*.35,18,'#d8ddac');rect(c,62+276*this.charge,383,5,28,'#fff3c1');
      if(this.age<4)this.hand(c,266,331,t);
    }
    if(k==='find'){
      character(c,'galgan',205,160,{scale:2,mood:'idle'});
      for(let i=0;i<3;i++){
        const p=clamp(this.findAge/1.25,0,1),destination=this.findNext.indexOf(this.findOrder[i]);let x=82+i*118;
        if(this.findPhase==='shuffle')x+=(destination-i)*118*p*p*(3-2*p);
        shadow(c,x,316,38);rect(c,x-36,259,72,55,'#ba9168');rect(c,x-40,249,80,13,'#d9b68c');rect(c,x-3,250,6,64,'#8f9d77');
        if((this.findPhase==='peek'||won)&&this.findOrder[i]===this.findTarget)item(c,'frog',x,244,{scale:1.8});
      }
      if(this.findPhase==='choose'&&!won)this.hand(c,this.pointer.x,338,t);
    }
    if(k==='steer'){
      for(const e of this.entities){ellipse(c,e.x,e.y,24,12,'#a5afa2');rect(c,e.x-13,e.y-11,22,10,'#b7bbaa');}
      const x=clamp(this.pointer.x,50,350);item(c,'couch',x,335,{scale:1.4,shadow:true});character(c,'galgan',x,300,{scale:1.7,hat:'duck'});
      if(this.age<4)this.hand(c,100+(t%2)*100,380,t);
    }
    for(const p of this.particles)rect(c,p.x,p.y,4,4,'#fff5c2');
    if(won){c.fillStyle='#f8efd4';c.beginPath();c.arc(352,43,19,0,Math.PI*2);c.fill();c.strokeStyle='#56805a';c.lineWidth=4;c.beginPath();c.moveTo(343,43);c.lineTo(349,49);c.lineTo(362,35);c.stroke();}
    if(this.paused){rect(c,0,0,400,430,'#dce5d4bb');}
  }
  ending(c,t){
    const id=this.chapter.id;
    if(id==='boat'){item(c,'couch',200+Math.sin(t)*10,285,{scale:2.4});character(c,'galgan',200+Math.sin(t)*10,217,{scale:2.5,hat:'duck'});}
    else{character(c,this.chapter.actor,210,282,{scale:3.5,hat:this.chapter.reward,mood:'happy'});character(c,id==='up'?'sernik':'monki',91,315,{scale:1.8,hat:id==='up'?'icecream':null,mood:'happy'});}
    for(let i=0;i<10;i++){const x=25+i*37,y=80+(i*39+t*22)%280;rect(c,x,y,4,5,['#e8b165','#d89181','#a3bb82'][i%3]);}
  }
  basket(c,x,y){rect(c,x-34,y-20,68,28,'#c69a64');rect(c,x-39,y-25,78,7,'#e7c38e');for(let i=0;i<6;i++)rect(c,x-27+i*11,y-17,2,22,'#ad7e54');}
  hand(c,x,y,t){const d=this.reduced?0:Math.sin(t*4)*3;c=this.c;c.save();c.translate(x,y+d);c.strokeStyle='#78674b';c.lineWidth=1.4;c.fillStyle='#fff3d8';c.beginPath();c.moveTo(-6,8);c.lineTo(-8,-1);c.quadraticCurveTo(-8,-5,-4,-2);c.lineTo(-2,2);c.lineTo(-2,-15);c.quadraticCurveTo(0,-20,3,-15);c.lineTo(3,-5);c.lineTo(10,-4);c.quadraticCurveTo(15,-3,13,5);c.lineTo(9,13);c.lineTo(-2,13);c.closePath();c.fill();c.stroke();c.restore();}
  arrow(c,x,y,tx,ty){c.strokeStyle='#b2ad80';c.lineWidth=2;c.setLineDash([3,6]);c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+65,y,tx,ty);c.stroke();c.setLineDash([]);}
  stop(){this.closed=true;cancelAnimationFrame(this.frame);this.cleanups.forEach(f=>f());this.keys.clear();}
}

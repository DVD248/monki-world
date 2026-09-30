import {character,rect,poly,ellipse} from './art.js';
import {DriveRun,DRIVE,DRIVE_ZONES} from './shared/arcade-drive.js';
import {W,H,SANS,along,noise,clamp,mix,stars} from './arcade-kit.js';

// Hill Drive: down the lane from the house, across the fields, into the hills and the
// mountains, and at night along a road that ends up on the moon. The view pulls back as
// the car speeds up, so there is time to see the next hill coming.
const SKY=[[0,'#bcd9e0'],[600,'#c9e0ec'],[1100,'#e7b98f'],[1800,'#b8c6d6'],[2600,'#2e3558'],[3600,'#141829']];
const HAZE=[[0,'#e6f0dc'],[600,'#eef0dc'],[1100,'#f3d8b4'],[1800,'#e0e6ea'],[2600,'#4a5078'],[3600,'#1f2440']];
const TOP=[[0,'#9eb67b'],[250,'#a9bd72'],[600,'#8fae72'],[1100,'#a7a36e'],[1800,'#9a958e'],[2600,'#4f6448'],[3600,'#c9c4b8']];
const DIRT=[[0,'#a88259'],[600,'#9a7652'],[1100,'#9c6f4f'],[1800,'#77716c'],[2600,'#3d3a44'],[3600,'#8e8a82']];
const FAR=[[0,'#b9cfb0'],[600,'#a8c2a0'],[1100,'#d6a88a'],[1800,'#aab6c2'],[2600,'#394062'],[3600,'#2a2f48']];
const SX=W*.3,SY=H*.56;

/** Where the camera is and how far out: it leads the car and pulls back with speed. */
function view(g){
  const L=g.logic,t=g.time,dt=Math.min(.05,t-(g.viewT??t));g.viewT=t;
  const speed=Math.hypot(L.vx,L.vy),z=clamp(1.1-(speed/DRIVE.top)*.35,.75,1.1);
  g.zoom=(g.zoom??z)+(z-(g.zoom??z))*Math.min(1,dt*1.5);
  const cx=L.x+L.vx*.3,cy=L.y+10;g.cx=(g.cx??cx)+(cx-(g.cx??cx))*Math.min(1,dt*5);g.cy=(g.cy??cy)+(cy-(g.cy??cy))*Math.min(1,dt*4);
}
const toScreen=(g,x,y)=>({x:(x-g.cx)*g.zoom+SX,y:SY-(y-g.cy)*g.zoom});

function draw(g,c){
  const L=g.logic,m=L.score,t=g.time;view(g);const z=g.zoom;
  const grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,along(SKY,m));grad.addColorStop(1,along(HAZE,m));c.fillStyle=grad;c.fillRect(0,0,W,H);
  stars(c,rect,t,clamp((m-2300)/300,0,1),{drift:g.cx*.02,bottom:360});
  if(m>=3400){const my=110;ellipse(c,300,my,40,40,'#f1ead0');ellipse(c,288,my-10,8,6,'#ddd4b4');ellipse(c,312,my+12,10,8,'#ddd4b4');}
  // Far hills, slow.
  const far=along(FAR,m);c.fillStyle=far;c.beginPath();c.moveTo(0,H);
  for(let x=0;x<=W;x+=10){const wx=x/.25+g.cx*.25;c.lineTo(x,SY-40-60*Math.sin(wx*.004)-40*Math.sin(wx*.0017+1));}c.lineTo(W,H);c.fill();
  // The ground.
  const top=along(TOP,m),dirt=along(DIRT,m),left=g.cx-SX/z-DRIVE.step,right=g.cx+(W-SX)/z+DRIVE.step;
  c.fillStyle=dirt;c.beginPath();c.moveTo(0,H);
  for(let x=Math.floor(left/DRIVE.step)*DRIVE.step;x<=right;x+=DRIVE.step){const p=toScreen(g,x,L.ground.h(x));c.lineTo(p.x,p.y);}c.lineTo(W,H);c.fill();
  c.strokeStyle=top;c.lineWidth=Math.max(4,10*z);c.lineJoin='round';c.beginPath();
  for(let x=Math.floor(left/DRIVE.step)*DRIVE.step;x<=right;x+=DRIVE.step){const p=toScreen(g,x,L.ground.h(x)-4);x===Math.floor(left/DRIVE.step)*DRIVE.step?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}c.stroke();
  for(let x=Math.floor(left/48)*48;x<=right;x+=48){if(noise(x)>.55)continue;const p=toScreen(g,x,L.ground.h(x)-16-noise(x+1)*30);rect(c,p.x,p.y,3*z+1,3*z+1,mix(dirt,'#000000',.18));}
  // Every hundred metres a post; the best runs get a flag.
  for(let n=Math.ceil((left-140)/DRIVE.metre/100);n<=(right-140)/DRIVE.metre/100;n++){if(n<=0)continue;const x=n*100*DRIVE.metre+140,p=toScreen(g,x,L.ground.h(x));rect(c,p.x-1,p.y-30*z,3,30*z,'#e9e4d8');g.text(c,`${n*100}`,p.x,p.y-34*z,11,'#fffdf3','center');}
  const flags=[];if(g.best>0)flags.push({at:g.best,color:'#e4c87a',label:'BEST'});if(g.rival?.best)flags.push({at:g.rival.best,color:'#f3c0b0',label:g.rival.name.toUpperCase(),who:g.rival.id});
  for(const f of flags){const x=f.at*DRIVE.metre+140;if(x<left-40||x>right+40)continue;const p=toScreen(g,x,L.ground.h(x));rect(c,p.x,p.y-64*z,3,64*z,'#6b5a45');poly(c,[[p.x+3,p.y-64*z],[p.x+30,p.y-56*z],[p.x+3,p.y-48*z]],f.color);g.text(c,f.label,p.x+4,p.y-70*z,10,f.color);if(f.who)character(c,f.who,p.x-12,p.y,{scale:.5*z+.2,shadow:false,mood:'happy'});}
  for(const can of L.ground.cans){if(can.taken||can.x<left||can.x>right)continue;const p=toScreen(g,can.x,L.ground.h(can.x));jerrycan(c,p.x,p.y-2,z*1.1,t);}
  car(g,c,L,t,z);
  pedals(c,L);
}
function jerrycan(c,x,y,s,t){
  const b=Math.sin(t*3)*2*s;c.save();c.translate(x,y-b);c.scale(s,s);
  rect(c,-9,-24,18,22,'#c9553f');rect(c,-9,-24,18,3,'#e07a62');rect(c,-6,-28,6,4,'#8f3a2c');rect(c,2,-27,5,3,'#3a3f38');rect(c,-5,-18,10,2,'#8f3a2c');rect(c,-5,-12,10,2,'#8f3a2c');
  c.restore();
}
function car(g,c,L,t,z){
  const after=g.overAt===null?0:g.time-g.overAt,p=toScreen(g,L.x,L.y);
  c.save();c.translate(p.x,p.y);c.rotate(-L.a);c.scale(z,z);
  // Galgan in the seat, then the car around him.
  const mood=L.over?'annoyed':L.gas&&L.contact.some(Boolean)?'happy':'idle';
  character(c,'galgan',-4,-2,{scale:1.05,mood,frame:t*3,hat:g.hat,shadow:false});
  rect(c,-20,-20,4,18,'#7a4a3a');
  rect(c,-34,-8,68,14,'#c96b5a');rect(c,-34,-8,68,3,'#e08a74');rect(c,-30,4,60,4,'#a4513f');
  rect(c,12,-14,24,8,'#c96b5a');rect(c,12,-14,24,2,'#e08a74');rect(c,33,-10,5,6,'#f3e3a0');
  rect(c,-38,-4,5,6,'#8f3a2c');rect(c,16,-26,2,14,'#8a9aa0');rect(c,17,-26,8,2,'#8a9aa0');
  for(const ox of [-DRIVE.axle,DRIVE.axle]){c.save();c.translate(ox,DRIVE.drop);ellipse(c,0,0,DRIVE.radius,DRIVE.radius,'#3a3f38');ellipse(c,0,0,5,5,'#c9c1a8');
    c.rotate(L.spin);for(let k=0;k<3;k++){c.rotate(Math.PI*2/3);rect(c,-1,-DRIVE.radius+1,2,5,'#5a605a');}c.restore();}
  if(L.gas&&!L.over&&L.contact.some(Boolean)&&noise(Math.floor(t*20))>.5){ellipse(c,-40,-2,4+noise(t)*3,3,'rgba(200,196,184,.6)');}
  c.restore();
  if(L.over&&after<1.2){c.globalAlpha=clamp(1.2-after,0,1);for(let i=0;i<3;i++){const a=t*4+i*2.1;rect(c,p.x+Math.cos(a)*14,p.y-30*z+Math.sin(a)*5,3,3,'#fbe4a4');}c.globalAlpha=1;}
}
/** The two pedals, drawn where the thumbs go. */
function pedals(c,L){
  for(const [x,label,on] of [[16,'◀ Brake',L.brake&&!L.over],[W-126,'Gas ▶',L.gas&&!L.over]]){
    c.globalAlpha=on?.75:.38;c.fillStyle=on?'#fbf8ee':'rgba(38,48,36,.55)';c.beginPath();c.roundRect?c.roundRect(x,H-66,110,50,14):c.rect(x,H-66,110,50);c.fill();c.globalAlpha=1;
    c.font=`800 15px ${SANS}`;c.textAlign='center';c.fillStyle=on?'#3a3f38':'#fffdf3';c.fillText(label,x+55,H-36);
  }
}
function hud(g,c){
  const L=g.logic,x=W-130,y=16,low=L.fuel<.25;
  jerrycan(c,x-12,y+24,.7,0);
  rect(c,x,y+6,110,14,'rgba(38,48,36,.35)');rect(c,x+2,y+8,106*L.fuel,10,low?(Math.sin(g.time*10)>0?'#d8847a':'#e6a092'):'#e4c87a');
  if(low&&!L.over)g.text(c,'Fuel!',x+55,y+40,13,'#f3c0b0','center');
}
function event(g,e){
  const s=g.sound;if(g.cx===undefined)return;const p=toScreen(g,e.x,e.y);
  switch(e.type){
    case 'fuel':s('fuel');g.say('Fuel!',p.x,p.y-60,{color:'#fbe4a4',size:18,life:.9});g.burst(p.x,p.y-20,10,{colors:['#e4c87a','#fbe4a4','#c9553f'],speed:120,up:60,size:3,life:.6});break;
    case 'land':s('land');if(e.hard){g.shake=4;g.burst(p.x,p.y+14,8,{colors:['#c9b58f','#a88259'],speed:90,up:40,size:3,life:.5});}break;
    case 'hundred':s('point',1.2);g.say(`${e.metres} m`,W/2,H*.3,{color:'#fffdf3',size:22,life:1});break;
    case 'crash':s('bonk');setTimeout(()=>{if(!g.stopped)s('fall');},120);g.shake=7;g.flash=.35;g.say('Ouch!',p.x,p.y-40,{size:20});break;
    case 'empty':s('fall');g.say('Out of fuel',W/2,H*.35,{size:22,color:'#f3c0b0'});break;
    case 'stuck':s('fall');g.say('Stuck',W/2,H*.35,{size:22});break;
  }
}
function card(c,{hat}={}){
  const grad=c.createLinearGradient(0,0,0,90);grad.addColorStop(0,'#bcd9e0');grad.addColorStop(1,'#e6f0dc');c.fillStyle=grad;c.fillRect(0,0,120,90);
  c.fillStyle='#b9cfb0';c.beginPath();c.moveTo(0,70);for(let x=0;x<=120;x+=6)c.lineTo(x,52-10*Math.sin(x*.05));c.lineTo(120,90);c.lineTo(0,90);c.fill();
  c.fillStyle='#a88259';c.beginPath();c.moveTo(0,90);for(let x=0;x<=120;x+=4)c.lineTo(x,72-14*Math.sin(x*.035+.4));c.lineTo(120,90);c.fill();
  c.strokeStyle='#9eb67b';c.lineWidth=4;c.beginPath();for(let x=0;x<=120;x+=4){const y=72-14*Math.sin(x*.035+.4);x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
  c.save();c.translate(52,56);c.rotate(-.35);c.scale(.62,.62);character(c,'galgan',-4,-2,{scale:1.05,mood:'happy',shadow:false,hat});
  rect(c,-34,-8,68,14,'#c96b5a');rect(c,12,-14,24,8,'#c96b5a');for(const ox of [-27,27]){ellipse(c,ox,6,12,12,'#3a3f38');ellipse(c,ox,6,5,5,'#c9c1a8');}c.restore();
  jerrycan(c,100,62,.55,0);
}
export default {Logic:DriveRun,zones:DRIVE_ZONES,draw,event,hud,card,camera:g=>({x:(g.cx??0)*(g.zoom??1),y:-(g.cy??0)*(g.zoom??1)}),reset:g=>{g.cx=g.cy=g.zoom=g.viewT=undefined;}};

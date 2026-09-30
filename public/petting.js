import {character,rect,ellipse} from './art.js';

// A little touch toy, with no meter, reward quota or maintenance requirement.
export function petCanvas({dog,hat,onPet,sound,isOpen}){
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=270;canvas.className='pet-pad';canvas.tabIndex=0;canvas.setAttribute('aria-label',`Stroke ${dog}. Move a finger back and forth, or press Space to pet.`);
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;let down=false,last=null,distance=0,energy=0,lastFrame=0,lastSound=-Infinity,closed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Fit every pose, including tall hats, once; never zoom as the dog rolls over.
  const probe=document.createElement('canvas');probe.width=240;probe.height=240;const pc=probe.getContext('2d');
  for(const pet of [0,.5,1])for(const frame of [0,1,2])character(pc,dog,100,180,{hat,pet,frame,shadow:false});
  const pixels=pc.getImageData(0,0,240,240).data;let left=240,right=0,top=240,bottom=0;
  for(let y=0;y<240;y++)for(let x=0;x<240;x++)if(pixels[(y*240+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const scale=Math.min(4.8,300/(right-left+1),195/(bottom-top+1)),originX=180-(left+right-200)/2*scale;
  const pulse=(amount,audible=true)=>{energy=Math.min(1,energy+amount);const now=performance.now();if(audible&&now-lastSound>950){sound('pet-long');lastSound=now;}};
  const finish=()=>{if(distance>14)onPet();distance=0;down=false;last=null;};
  canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);down=true;distance=0;last={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointermove',e=>{if(!down)return;const step=Math.hypot(e.clientX-last.x,e.clientY-last.y);distance+=step;last={x:e.clientX,y:e.clientY};pulse(Math.min(step,50)/260,distance>14);});
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  const pat=()=>{pulse(.42,false);sound('pet');onPet();};canvas.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();pat();}});
  function draw(ts){if(closed)return;if(!canvas.isConnected||!isOpen()){closed=true;finish();return;}const dt=Math.min(.05,(ts-(lastFrame||ts))/1000);lastFrame=ts;energy=Math.max(0,energy-dt*(down?.035:.12));
    rect(c,0,0,360,270,'#e0e6cd');ellipse(c,180,225,111,23,'#bdc99f');
    const t=reduced?0:ts/1000;character(c,dog,originX,224,{scale,hat,pet:energy,mood:energy>.05?'happy':'idle',frame:t*9});
    if(energy>.1)for(let i=0;i<4;i++){const x=75+i*65,y=80+Math.sin(t*2+i)*7;rect(c,x,y,2,7,'#fbf2c7');rect(c,x-3,y+3,8,2,'#fbf2c7');}
    if(!down&&energy<.08){const x=151+Math.sin(t)*10;c.strokeStyle='#a9b793';c.lineWidth=2;c.beginPath();c.moveTo(x,250);c.lineTo(x+58,250);c.moveTo(x+5,245);c.lineTo(x,250);c.lineTo(x+5,255);c.moveTo(x+53,245);c.lineTo(x+58,250);c.lineTo(x+53,255);c.stroke();}
    requestAnimationFrame(draw);
  }requestAnimationFrame(draw);return {canvas,pat};
}

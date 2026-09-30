import {rect,poly,ellipse,pixelBox,shadow} from './art.js';
import {FINISHES,FURNITURE} from './shared/decor.js';

/** Small, deliberately blocky furniture sprites. The finish changes wood/fabric
 * on the same object, rather than multiplying almost-identical inventory IDs. */
export function furniture(c,type,x,y,{scale=1,finish='oak',showShadow=true}={}){
  if(!FURNITURE[type])return false;
  const {main:m,light:l,dark:d}=FINISHES[finish]||FINISHES.oak;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  if(showShadow)shadow(c,0,1,FURNITURE[type].size[0]*.48);
  switch(type){
    case 'couch':
      rect(c,-32,-39,64,34,d);rect(c,-29,-42,58,29,l);rect(c,-26,-34,25,21,m);rect(c,2,-34,25,21,m);rect(c,-35,-23,9,19,d);rect(c,26,-23,9,19,d);rect(c,-25,-13,50,10,l);rect(c,-28,-4,6,5,d);rect(c,22,-4,6,5,d);break;
    case 'plant':
      poly(c,[[-10,-16],[10,-16],[7,0],[-7,0]],m);rect(c,-12,-18,24,5,d);rect(c,-1,-44,3,27,'#67845d');for(const [xx,yy]of[[-11,-39],[10,-43],[-10,-29],[11,-31]])ellipse(c,xx,yy,9,5,xx<0?'#85a473':'#a3bb8a');break;
    case 'lamp':
      rect(c,-13,-3,26,4,d);rect(c,-2,-38,4,36,m);poly(c,[[-12,-54],[12,-54],[18,-35],[-18,-35]],l);rect(c,-17,-36,34,3,d);rect(c,-5,-51,3,11,'#f5e7b8');break;
    case 'radio':
      pixelBox(c,-15,-22,30,22,m,d);rect(c,-12,-18,16,13,'#6b7f74');for(let i=0;i<5;i++)rect(c,-11+i*3,-17,1,11,l);ellipse(c,10,-10,3,3,l);rect(c,9,-31,1,9,d);break;
    case 'bowl':
      rect(c,-15,-10,30,7,l);rect(c,-11,-3,22,4,d);rect(c,-12,-11,24,3,m);rect(c,-7,-8,14,2,'#ead2a4');break;
    case 'armchair':
      rect(c,-19,-37,38,29,d);rect(c,-16,-39,32,28,l);rect(c,-23,-23,9,20,m);rect(c,14,-23,9,20,m);rect(c,-15,-17,30,12,m);rect(c,-13,-14,26,7,l);rect(c,-16,-5,4,6,d);rect(c,12,-5,4,6,d);break;
    case 'loveseat':
      rect(c,-30,-37,60,32,d);rect(c,-27,-40,54,28,l);rect(c,-24,-33,23,22,m);rect(c,2,-33,22,22,m);rect(c,-32,-23,8,20,d);rect(c,24,-23,8,20,d);rect(c,-25,-13,50,10,l);rect(c,-24,-4,5,5,d);rect(c,19,-4,5,5,d);break;
    case 'stool':
      rect(c,-12,-26,4,24,d);rect(c,8,-26,4,24,d);rect(c,-13,-16,26,3,m);rect(c,-15,-28,30,6,l);rect(c,-13,-29,26,2,m);break;
    case 'pouf':
      ellipse(c,0,-10,18,9,d);rect(c,-17,-14,34,10,m);ellipse(c,0,-14,17,8,l);for(let i=-12;i<=12;i+=8)rect(c,i,-17,1,5,m);break;
    case 'table':
      rect(c,-27,-24,5,23,d);rect(c,22,-24,5,23,d);rect(c,-30,-27,60,7,m);rect(c,-28,-30,56,5,l);rect(c,-24,-17,48,2,d);break;
    case 'sidetable':
      rect(c,-12,-32,4,30,d);rect(c,8,-32,4,30,d);rect(c,-14,-17,28,3,m);rect(c,-17,-35,34,6,l);rect(c,-14,-37,28,3,m);break;
    case 'shelf':
      pixelBox(c,-22,-61,44,60,m,d);rect(c,-18,-57,36,13,'#e6d8b8');rect(c,-18,-38,36,14,'#e6d8b8');rect(c,-18,-18,36,13,'#e6d8b8');
      for(const [xx,yy,cc]of[[-16,-56,'#8b9d81'],[-9,-56,'#ba8470'],[0,-56,'#a8a6b9'],[-14,-37,'#d5b687'],[-4,-37,'#748f9a'],[6,-37,'#b68c85'],[-14,-17,'#a8b788'],[1,-17,'#a99482']])rect(c,xx,yy,5,yy===-56?12:11,cc);
      for(const yy of [-42,-22])rect(c,-19,yy,38,3,d);break;
    case 'cabinet':
      pixelBox(c,-24,-44,48,42,m,d);rect(c,-21,-40,19,30,l);rect(c,3,-40,18,30,l);rect(c,-21,-25,42,2,d);rect(c,-5,-26,2,5,d);rect(c,5,-26,2,5,d);rect(c,-20,-3,5,5,d);rect(c,15,-3,5,5,d);break;
    case 'bench':
      rect(c,-29,-39,58,17,l);for(let i=-25;i<29;i+=10)rect(c,i,-36,3,13,m);rect(c,-32,-20,64,7,m);rect(c,-28,-13,5,14,d);rect(c,23,-13,5,14,d);rect(c,-30,-26,5,22,d);rect(c,25,-26,5,22,d);break;
    case 'planter':
      poly(c,[[-13,-16],[13,-16],[9,0],[-9,0]],m);rect(c,-15,-18,30,5,d);rect(c,-1,-45,3,28,d);
      for(const [xx,yy]of[[-8,-43],[9,-47],[-11,-30],[11,-34]])ellipse(c,xx,yy,9,5,xx<0?'#789a72':'#9bb787');break;
    case 'cactus':
      poly(c,[[-11,-15],[11,-15],[7,0],[-7,0]],m);rect(c,-13,-17,26,4,d);rect(c,-4,-38,8,23,'#5b9276');rect(c,-10,-29,6,5,'#5b9276');rect(c,-11,-34,4,9,'#5b9276');rect(c,4,-25,7,5,'#5b9276');rect(c,8,-32,4,11,'#5b9276');for(let i=-1;i<3;i++)rect(c,i*3,-35,1,3,'#a9c69a');break;
    case 'lantern':
      rect(c,-2,-38,4,7,d);rect(c,-8,-32,16,4,d);rect(c,-10,-28,20,26,m);rect(c,-6,-25,12,18,'#f5d69d');rect(c,-3,-22,6,10,'#ffedb6');rect(c,-12,-4,24,4,d);break;
    case 'floorlamp':
      rect(c,-13,-3,26,4,d);rect(c,-2,-35,4,33,m);ellipse(c,0,-40,16,20,l);rect(c,-15,-41,30,3,m);rect(c,-12,-31,24,3,d);break;
    case 'mirror':
      rect(c,-18,-60,36,53,d);rect(c,-14,-56,28,46,l);rect(c,-11,-53,22,39,'#a8c5c5');poly(c,[[-11,-51],[0,-53],[-11,-32]],'#deeeeb');rect(c,-2,-7,4,7,d);rect(c,-17,0,34,3,d);break;
    case 'screen':
      for(const [xx,width]of[[-31,19],[-11,22],[13,19]]){rect(c,xx,-59,width,59,d);rect(c,xx+2,-57,width-4,53,l);rect(c,xx+3,-29,width-6,2,m);rect(c,xx+3,-44,width-6,2,m);rect(c,xx+3,-12,width-6,2,m);}break;
    case 'birdhouse':
      rect(c,-2,-25,4,25,d);rect(c,-13,-43,26,20,l);poly(c,[[-16,-43],[0,-55],[16,-43]],m);ellipse(c,0,-34,5,5,d);rect(c,-15,-24,30,3,d);break;
  }
  c.restore();return true;
}

export function furniturePreview(type,finish='oak',size=70){
  const canvas=document.createElement('canvas');canvas.width=90;canvas.height=90;canvas.style.width=`${size}px`;canvas.style.height=`${size}px`;canvas.style.imageRendering='pixelated';
  furniture(canvas.getContext('2d'),type,45,79,{scale:1.15,finish,showShadow:false});return canvas;
}

// Every sprite is drawn on a low-resolution pixel grid. No fonts or image CDNs.
// Reference cues: Monki's orange fur and long arms; Julia's long hair / round
// glasses; David's middle-parted black hair; Sernik's cream fur; Galgan's brows.
export const P = { ink:'#454637', dark:'#303932', cream:'#f9edcc', bark:'#796343', brown:'#a4663f', orange:'#b77545', skin:'#dca782', lightSkin:'#f0c5a3', green:'#82995e', leaf:'#58734b', lightLeaf:'#9eb67b', blue:'#839e9b', blueDark:'#607d79', rose:'#ca9187', yellow:'#e4c87a' };
export const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function poly(c, points, color) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill(); }
export function ellipse(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill()}
export function pixelBox(c,x,y,w,h,color,border=P.ink){rect(c,x+2,y,w-4,h,color);rect(c,x,y+2,w,h-4,color);rect(c,x+2,y,w-4,1,border);rect(c,x+2,y+h-1,w-4,1,border);rect(c,x,y+2,1,h-4,border);rect(c,x+w-1,y+2,1,h-4,border);}
export function shadow(c,x,y,w=12){ellipse(c,x,y,w,3,'#4a573224')}

// Attachment points belong to the head, not to the inventory item's baseline.
// Belly face coordinates live inside that head's upside-down transform.
export function headProfile(id,pose='standing'){
  if(pose==='belly-face')return{x:.5,capX:0,eyeY:-2.5,top:-8,upper:-13,half:10,scale:.7};
  if(pose==='belly')return{x:18,capX:18,eyeY:-9.5,top:-20,upper:-20,half:10,scale:.7};
  if(pose==='sleep')return{x:15,capX:14,eyeY:-10.5,top:-18,upper:-21,half:10,scale:.7};
  if(id==='david')return{x:0,capX:0,eyeY:-27,top:-36,upper:-38,half:9,scale:.72};
  if(id==='julia')return{x:0,capX:0,eyeY:-27,top:-34,upper:-35,half:10,scale:.72};
  if(id==='monki')return{x:1,capX:0,eyeY:-30,top:-35,upper:-37,half:12,scale:.8};
  return{x:10,capX:10,eyeY:-23,top:-28,upper:-35,half:10,scale:.7};
}
const FACE_ACCESSORIES=new Set(['glasses','headphones','bow','flower']);
const WORN_SUPPORT={beret:-1,helmet:-5,towel:2,teacup:3,frog:1,duck:-1,moth:-2,bee:-2,magnet:-2,sprout:2};
const WORN_INSET={beret:1,helmet:2,chefhat:2,rainhat:2,nightcap:2,piratehat:2,towel:3,flowercrown:4};
export function wearAccessory(c,type,id,pose='standing',layer='all'){
  if(!type)return;const face=FACE_ACCESSORIES.has(type);
  if(layer==='face'&&!face||layer==='head'&&face)return;
  const h=headProfile(id,pose);
  if(type==='glasses'){
    const scale=.7;item(c,type,h.x,h.eyeY+6.5*scale,{scale,shadow:false});
  }else if(type==='headphones'){
    // An adjustable band hugs the crown; ear cups sit beside the actual face.
    const left=h.x-h.half-1,right=h.x+h.half+1,top=h.upper-2;
    c.strokeStyle='#68767b';c.lineWidth=2;c.beginPath();c.moveTo(left,h.eyeY);c.lineTo(left,top+4);c.quadraticCurveTo(left,top,h.x,top);c.quadraticCurveTo(right,top,right,top+4);c.lineTo(right,h.eyeY);c.stroke();
    for(const x of [left-2,right-2]){rect(c,x,h.eyeY-3,4,9,'#a87c64');rect(c,x+1,h.eyeY-2,2,6,'#c89978');}
  }else if(type==='bow'){
    item(c,type,h.x-h.half+2,h.upper+4+7.5*.65,{scale:.65,shadow:false});
  }else if(type==='flower'){
    item(c,type,h.x+h.half-1,h.upper+5+18*.5,{scale:.5,shadow:false});
  }else{
    const scale=h.scale,y=h.top+(WORN_INSET[type]??0)-(WORN_SUPPORT[type]??0)*scale;
    item(c,type,h.capX,y,{scale,shadow:false});
  }
}

export function character(c,id,x,y,options={}){
  const {scale=1,frame=0,mood='idle',hat=null,flip=false,shadow:showShadow=true,pet=0,carried=false,running=false}=options;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-scale:scale,scale);
  if(carried){c.translate(0,-20);c.rotate(Math.sin(frame*2)*.09);c.translate(0,20);c.scale(1,1+Math.sin(frame*3)*.025);}
  if(showShadow)shadow(c,0,-1,id==='monki'?13:12);
  const bob=mood==='sleep'?0:Math.floor(frame)%2;
  c.translate(0,-bob);
  if(id==='david'||id==='julia'){
    const julia=id==='julia',skin=julia?P.lightSkin:P.skin,hair=julia?'#947348':'#343b34';
    const limb=carried?Math.sin(frame*3)*3:0;
    if(julia){rect(c,-10,-33,20,23,hair);rect(c,-11,-29,3,24,'#9f7d50');rect(c,8,-29,3,24,'#7a5f3d');}
    rect(c,-7,-12+limb,6,10,julia?'#75848c':'#7b8d78');rect(c,2,-12-limb,6,10,julia?'#75848c':'#7b8d78');
    rect(c,-8,-3+limb,7,3,'#48473c');rect(c,2,-3-limb,8,3,'#48473c');
    rect(c,-8,-22,17,12,julia?'#d9d5bb':'#424940');
    rect(c,-10,-20-limb,3,9,skin);rect(c,9,-20+limb,3,9,skin);
    if(julia){rect(c,-8,-21,17,3,'#eae3c9');rect(c,-3,-22,7,2,skin);}
    rect(c,-8,-34,16,15,skin);rect(c,-10,-29,2,6,skin);rect(c,8,-29,2,6,skin);
    rect(c,-7,-35,14,3,hair);rect(c,-9,-32,3,7,hair);rect(c,6,-32,3,7,hair);
    if(julia){rect(c,-8,-34,8,4,'#ad8c5a');rect(c,-9,-29,2,18,hair);rect(c,7,-30,3,19,hair);}
    else{rect(c,-8,-37,13,3,hair);rect(c,-5,-38,5,1,hair);rect(c,-10,-32,7,3,hair);rect(c,2,-34,7,4,hair);rect(c,-3,-33,3,2,'#44483e');}
    if(mood==='sleep'){rect(c,-5,-27,3,1,P.ink);rect(c,3,-27,3,1,P.ink);}
    else{rect(c,-5,-28,2,mood==='happy'?1:2,P.ink);rect(c,3,-28,2,mood==='happy'?1:2,P.ink);}
    if(julia&&hat!=='glasses'){c.strokeStyle='#535747';c.lineWidth=1;c.strokeRect(-7.5,-29.5,6,5);c.strokeRect(1.5,-29.5,6,5);rect(c,-1,-28,3,1,'#535747');}
    rect(c,-1,-22,3,1,mood==='happy'?'#ad6c59':'#a67a5c');
    if(mood==='annoyed'){rect(c,-6,-30,4,1,P.ink);rect(c,2,-30,4,1,P.ink);}
    wearAccessory(c,hat,id);
  }else if(id==='monki'){
    const fur='#a9693b',lit='#bb7a45',face='#d8b27d';
    const limb=carried?Math.sin(frame*3)*3:0;
    rect(c,-9,-24,18,21,fur);rect(c,-7,-23,14,19,lit);
    rect(c,-14,-23-limb,6,18,fur);rect(c,9,-23+limb,6,18,fur);rect(c,-15,-8-limb,6,5,'#8c603d');rect(c,10,-8+limb,6,5,'#8c603d');
    rect(c,-8,-7,6,8,fur);rect(c,3,-7,6,8,fur);rect(c,-10,-2,9,4,'#8c603d');rect(c,2,-2,10,4,'#8c603d');
    rect(c,-10,-34,20,17,fur);rect(c,-7,-37,14,5,fur);rect(c,-13,-30,4,7,fur);rect(c,9,-30,4,7,fur);
    rect(c,-8,-31,16,11,face);rect(c,-6,-33,5,7,face);rect(c,2,-33,5,7,face);
    rect(c,-6,-32,4,4,'#f1e5bb');rect(c,3,-32,4,4,'#f1e5bb');
    if(mood==='sleep'){rect(c,-6,-30,4,1,P.ink);rect(c,3,-30,4,1,P.ink);}
    else{rect(c,-4,-31,2,3,P.dark);rect(c,4,-31,2,3,P.dark);}
    rect(c,-1,-27,3,1,'#765137');rect(c,-5,-22,10,1,'#765137');
    if(mood==='happy'){rect(c,-2,-22,4,2,'#765137');}
    if(mood==='annoyed'){rect(c,-6,-34,5,1,P.ink);rect(c,2,-34,5,1,P.ink);}
    rect(c,-5,-16,2,4,'#ca8a52');rect(c,3,-10,2,3,'#ca8a52');
    wearAccessory(c,hat,id);
  }else{
    const dark=id==='galgan',fur=dark?'#50554a':'#d9c18d',lit=dark?'#616758':'#ead5a5',cream=dark?'#c9b888':'#f1dfb6';
    if(mood==='sleep'&&pet<=.1&&!carried&&!running){
      // Sideways loaf: tucked paws, muzzle resting on them, slow breathing.
      const breath=Math.sin(frame*1.5)>.1?1:0;
      rect(c,-22,-12-breath,29,12+breath,fur);rect(c,-18,-15-breath,22,10,lit);
      rect(c,-24,-8,8,6,fur);rect(c,-27,-9,5,4,lit);
      rect(c,0,-4,19,4,cream);rect(c,4,-18,20,15,fur);rect(c,7,-13,17,10,cream);
      rect(c,3,-21,6,10,fur);rect(c,18,-19,5,9,fur);
      rect(c,9,-11,4,1,P.dark);rect(c,18,-10,4,1,P.dark);rect(c,17,-6,6,3,P.dark);
      if(dark){rect(c,8,-14,5,2,'#d3bc83');rect(c,18,-13,4,2,'#d3bc83');}
      wearAccessory(c,hat,id,'sleep');
    }else if(pet>.72&&!carried&&!running){
      // Belly up. A blocky loaf, four silly little paws, the usual face upside
      // down. Deliberately only two frames: this is a plush toy, not anatomy.
      const awake=pet>.1,kick=awake?Math.floor(frame/2)%2:0;
      rect(c,-29,-8+kick,9,4,fur);rect(c,-30,-10+kick,4,4,lit);
      // Far paws, then the body and its one flat tummy patch.
      rect(c,-17,-23+kick,5,12,fur);rect(c,0,-21-kick,5,10,fur);
      rect(c,-21,-14,31,14,fur);rect(c,-18,-17,25,16,lit);
      rect(c,-15,-13,19,11,cream);rect(c,-7,-8,2,2,fur);
      // Near paws flop the other way. No joints, toes or fur shading.
      rect(c,-22,-20-kick,6,10,cream);rect(c,5,-19+kick,6,9,cream);
      c.save();c.translate(18,-12);c.rotate(Math.PI);
      rect(c,-9,-8,18,17,fur);rect(c,-6,-6,12,14,cream);
      rect(c,-11,-13,5,9,fur);rect(c,7,-13,5,9,fur);
      if(!dark)rect(c,8,-13,4,7,'#c6aa78');
      rect(c,-5,-3,3,1,P.dark);rect(c,3,-3,3,1,P.dark);
      if(dark){rect(c,-6,-6,4,2,'#d3bc83');rect(c,3,-6,4,2,'#d3bc83');}
      rect(c,-2,2,5,3,P.dark);rect(c,0,5,2,2,P.ink);
      if(awake)rect(c,1,7,3,3,'#c68776');
      wearAccessory(c,hat,id,'belly-face','face');
      c.restore();
      // Perch on the head's upper edge, even upside down. Tall hats stay above
      // the dog, rather than piercing the floor or being clipped in pet view.
      wearAccessory(c,hat,id,'belly','head');
    }else{
      rect(c,-13,-17,25,13,fur);rect(c,-10,-19,19,4,lit);
      const kick=carried||running?Math.sin(frame*3)*3:0;
      rect(c,-11,-7+kick,5,8,cream);rect(c,5,-7-kick,5,8,cream);rect(c,-3,-5+kick,4,6,lit);
      c.save();c.translate(-13,-10);if(pet)c.rotate(Math.sin(frame*1.8)*pet*.7);rect(c,-4,-10,4,12,fur);rect(c,-7,-12,5,5,fur);rect(c,-6,-14,3,4,lit);c.restore();
      rect(c,1,-27,17,18,fur);rect(c,4,-24,12,13,cream);
      poly(c,[[0,-25],[0,-35],[7,-27]],fur);poly(c,[[12,-27],[19,-34],[18,-22]],fur);
      if(!dark)rect(c,16,-29,4,9,'#c6aa78');
      rect(c,4,-24,3,pet>.1?1:2,P.dark);rect(c,12,-24,3,pet>.1?1:2,P.dark);
      if(dark){rect(c,3,-27,4,2,'#d3bc83');rect(c,12,-27,4,2,'#d3bc83');}
      rect(c,8,-18,5,3,P.dark);rect(c,10,-15,2,2,P.ink);
      if(mood==='happy'){rect(c,10,-13,3,4,'#c68776');}
      if(mood==='annoyed'){rect(c,3,-26,5,1,P.ink);rect(c,11,-26,5,1,P.ink);}
      wearAccessory(c,hat,id);
    }
  }
  c.restore();
}

export function item(c,type,x,y,options={}){
  const {scale=1,shadow:showShadow=false,variant=0}=options;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  if(showShadow)shadow(c,0,0,type==='couch'?32:10);
  switch(type){
    case 'ball':ellipse(c,0,-12,12,12,'#cf7759');rect(c,-8,-18,6,5,'#f3c982');rect(c,2,-10,6,5,'#f3c982');rect(c,-6,-22,3,2,'#fbe4a4');break;
    case 'arcade':
      // A small cabinet in the corner of the house. Monki is on the screen.
      rect(c,-13,-52,26,52,'#8c4e3a');rect(c,-12,-51,24,50,'#b0654a');
      rect(c,-12,-51,24,8,'#8c4e3a');rect(c,-10,-49,20,4,'#f3d98c');rect(c,-6,-48,3,2,'#b0654a');rect(c,1,-48,5,2,'#b0654a');
      rect(c,-10,-41,20,16,'#2c3530');rect(c,-8,-39,16,12,'#9fd0b8');rect(c,-6,-33,5,1,'#f8f6ec');rect(c,1,-36,5,1,'#f8f6ec');rect(c,-2,-38,3,3,'#b77545');
      rect(c,-13,-25,26,6,'#8c4e3a');rect(c,-7,-29,2,4,'#303932');ellipse(c,-6,-29.5,2.2,2,'#d05a4a');rect(c,2,-24,3,2,'#e4c87a');rect(c,6,-24,3,2,'#9eb67b');
      rect(c,-3,-13,6,4,'#6f3d2d');rect(c,-1,-12,2,2,'#e4c87a');rect(c,-13,-2,26,2,'#6f3d2d');break;
    case 'wand':rect(c,-2,-22,4,22,'#b87b61');ellipse(c,0,-29,9,10,'#af775d');ellipse(c,0,-29,6,7,'#d3e6db');rect(c,-4,-34,2,4,'#fbf6dc');break;
    case 'bubbles':for(const[x,y,s]of[[-8,-7,7],[7,-19,9],[-9,-29,5]]){c.strokeStyle='#83b8bd';c.lineWidth=1.5;c.beginPath();c.arc(x,y,s,0,7);c.stroke();rect(c,x-s/2,y-s/2,3,2,'#f1faf2');}break;
    case 'cloud':rect(c,-19,-17,38,14,'#e7ede0');rect(c,-13,-23,23,22,'#f4f5e9');rect(c,-23,-12,46,8,'#e7ede0');break;
    case 'drop':poly(c,[[0,-25],[-9,-8],[-8,-3],[-4,0],[4,0],[8,-3],[9,-8]],'#84b8c1');rect(c,-4,-10,2,5,'#d6e9df');break;
    case 'boat':poly(c,[[-22,-10],[22,-10],[14,1],[-14,1]],'#ba956a');rect(c,-1,-36,2,27,'#877958');poly(c,[[1,-36],[1,-13],[19,-13]],'#e4c080');break;
    case 'kite':poly(c,[[0,-34],[14,-18],[0,-4],[-14,-18]],'#d88f70');poly(c,[[0,-34],[14,-18],[0,-18]],'#e8c58c');rect(c,0,-4,1,13,'#a49b70');rect(c,-3,4,7,2,'#b5bc94');break;
    case 'telescope':poly(c,[[-16,-22],[13,-34],[20,-20],[-10,-9]],'#829db0');rect(c,-1,-15,3,17,'#947c5e');poly(c,[[0,-7],[-10,3],[-7,4],[1,-5],[9,4],[12,3]],'#947c5e');break;
    case 'lily':ellipse(c,0,-5,18,6,'#8dac79');item(c,'flower',0,-4,{scale:.6});break;
    case 'rainbow':for(let i=0;i<3;i++){c.strokeStyle=['#d79172','#d9bf79','#91b68c'][i];c.lineWidth=4;c.beginPath();c.arc(0,-1,22-i*4,Math.PI,0);c.stroke();}break;
    case 'potato':pixelBox(c,-8,-12,16,12,'#c2a577','#8f7959');rect(c,-4,-10,2,2,'#d5bb8c');rect(c,3,-7,1,2,'#8e7753');rect(c,-3,-4,2,1,'#8e7753');break;
    case 'cone':poly(c,[[-8,-2],[0,-23],[8,-2]],'#d8874c');rect(c,-5,-10,10,3,'#f8e3b7');rect(c,-10,-3,20,3,'#ad633c');break;
    case 'bow':poly(c,[[-10,-12],[-2,-9],[-10,-3]],'#c88278');poly(c,[[10,-12],[2,-9],[10,-3]],'#c88278');rect(c,-3,-10,6,5,'#ac6e68');rect(c,-9,-10,3,2,'#e0a298');break;
    case 'glasses':rect(c,-12,-10,10,7,'#3d4840');rect(c,2,-10,10,7,'#3d4840');rect(c,-3,-9,6,2,'#3d4840');rect(c,-10,-9,4,2,'#7f9587');rect(c,4,-9,4,2,'#7f9587');break;
    case 'crown':poly(c,[[-10,-14],[-5,-8],[0,-16],[5,-8],[10,-14],[8,-1],[-8,-1]],'#d8b759');rect(c,-8,-3,16,3,'#a8954e');rect(c,-1,-5,3,2,'#cb8164');break;
    case 'flower':rect(c,-1,-17,2,18,'#6d8b56');rect(c,1,-8,5,3,'#91a86a');for(const [dx,dy]of[[-4,-22],[2,-22],[-6,-17],[4,-17],[-2,-13]])rect(c,dx,dy,5,5,'#d6a082');rect(c,-1,-18,4,4,'#e9cf7d');break;
    case 'sock':rect(c,-5,-18,9,13,'#b8c5a9');rect(c,-5,-7,15,6,'#cdd7bc');rect(c,-5,-18,9,3,'#8ba382');rect(c,7,-6,4,5,'#8ba382');break;
    case 'frog':{const colors=['#8fa76b','#c3ad75','#8da5a2','#b49299','#abc178'];const color=colors[variant%5];rect(c,-10,-12,20,10,color);rect(c,-9,-16,7,7,color);rect(c,3,-16,7,7,color);rect(c,-7,-14,3,3,'#f7eecd');rect(c,5,-14,3,3,'#f7eecd');rect(c,-6,-14,1,2,P.dark);rect(c,6,-14,1,2,P.dark);rect(c,-12,-3,7,4,color);rect(c,6,-3,7,4,color);rect(c,-3,-5,7,1,'#607548');break;}
    case 'icecream':poly(c,[[-6,-12],[6,-12],[0,1]],'#c79b5e');rect(c,-4,-10,7,1,'#e2b975');rect(c,-7,-20,14,9,'#e7b7a4');rect(c,-4,-24,8,5,'#f2ccb8');rect(c,-8,-14,16,3,'#f8dac2');break;
    case 'fish':rect(c,-9,-11,15,9,'#93b5ac');poly(c,[[4,-6],[13,-13],[13,0]],'#709c92');rect(c,-10,-8,3,3,'#b4ccbe');rect(c,-6,-9,2,2,P.dark);rect(c,-2,-12,4,2,'#709c92');break;
    case 'balloon':rect(c,-1,-13,1,20,'#a6a174');pixelBox(c,-9,-32,18,20,'#d4a281','#b98569');rect(c,-6,-28,3,6,'#efd3ad');rect(c,-2,-13,5,3,'#b98569');break;
    case 'duck':rect(c,-10,-10,20,9,'#e5c776');rect(c,3,-20,10,13,'#e9d187');rect(c,12,-15,5,3,'#c78247');rect(c,9,-17,2,2,P.ink);rect(c,-9,-11,8,2,'#eedea1');break;
    case 'mushroom':rect(c,-4,-10,8,10,'#e7d7ac');rect(c,-12,-15,24,7,'#b8755e');rect(c,-8,-20,16,7,'#cb8d71');rect(c,-5,-18,3,3,'#e8d6b0');rect(c,4,-14,3,3,'#e8d6b0');break;
    case 'moon':poly(c,[[7,-25],[-2,-23],[-9,-16],[-10,-9],[-5,-2],[5,1],[13,-4],[4,-4],[-1,-10],[0,-19]],'#ead995');break;
    case 'star':poly(c,[[0,-23],[4,-15],[12,-14],[6,-8],[8,0],[0,-4],[-8,0],[-6,-8],[-12,-14],[-4,-15]],'#dfc780');rect(c,-3,-13,2,2,'#a8985c');rect(c,3,-13,2,2,'#a8985c');break;
    case 'key':pixelBox(c,-9,-20,11,11,'#d2b770','#a79358');rect(c,-6,-17,4,4,'#f0e1ae');rect(c,-1,-13,12,4,'#d2b770');rect(c,7,-9,3,4,'#d2b770');break;
    case 'plant':rect(c,-10,-15,20,3,'#ae805a');poly(c,[[-9,-12],[9,-12],[6,0],[-6,0]],'#c39368');rect(c,-6,-12,3,10,'#d6ac7e');rect(c,-1,-44,2,30,'#658151');poly(c,[[0,-30],[-13,-42],[-16,-39],[-13,-31],[-1,-26]],'#839b61');poly(c,[[0,-36],[8,-49],[14,-47],[12,-39],[1,-32]],'#789559');poly(c,[[0,-22],[13,-35],[17,-31],[14,-25],[0,-18]],'#93aa6c');break;
    case 'lamp':rect(c,-12,-3,24,3,'#7e7450');rect(c,-1,-40,3,37,'#8e8055');poly(c,[[-10,-55],[11,-55],[18,-36],[-17,-36]],'#ded3a0');rect(c,-16,-37,33,3,'#b5aa7f');rect(c,-9,-53,4,14,'#eee5b7');break;
    case 'couch':rect(c,-32,-40,65,31,'#617d78');rect(c,-29,-42,59,27,'#87a39b');rect(c,-26,-38,25,23,'#98b0a5');rect(c,2,-38,25,23,'#8aa69c');rect(c,-35,-25,10,21,'#6b8780');rect(c,25,-25,10,21,'#6b8780');rect(c,-25,-15,50,10,'#91aaa0');rect(c,-26,-6,52,4,'#5f7c73');rect(c,-29,-3,5,5,'#6a694d');rect(c,25,-3,5,5,'#6a694d');rect(c,-24,-29,15,13,'#d0bd8f');rect(c,-22,-28,11,10,'#e0d0a1');break;
    case 'bowl':rect(c,-12,-9,24,6,'#bac1a7');rect(c,-9,-3,18,3,'#8e9d87');rect(c,-10,-10,20,4,'#74876c');rect(c,-6,-9,5,2,'#bb9260');rect(c,2,-9,6,2,'#bb9260');break;
    case 'present':rect(c,-12,-20,24,20,'#b9bb8a');rect(c,-14,-23,28,6,'#cbd2a1');rect(c,-2,-23,5,23,'#d4987c');rect(c,-12,-28,10,5,'#c99174');rect(c,3,-28,9,5,'#c99174');break;
    case 'frame':rect(c,-15,-25,30,25,'#b28c61');rect(c,-12,-22,24,19,'#f0e4bc');rect(c,-8,-13,4,7,'#8fa96b');rect(c,-4,-16,5,5,'#a4b984');rect(c,5,-19,4,4,'#d5b575');break;
    case 'radio':pixelBox(c,-14,-20,28,20,'#9a8761','#776e4c');rect(c,-11,-16,14,12,'#6b765e');for(let i=0;i<5;i++)rect(c,-10+i*3,-15,1,10,'#99a185');rect(c,7,-14,4,4,'#dcd0a2');rect(c,7,-7,4,2,'#dcd0a2');rect(c,8,-30,1,11,'#8b9273');break;
    case 'fridge':rect(c,-17,-53,34,53,'#d9ddc7');rect(c,-15,-51,29,48,'#e9ead7');rect(c,-15,-35,29,2,'#b4bea3');rect(c,9,-45,2,7,'#9aaa8b');rect(c,9,-29,2,10,'#9aaa8b');rect(c,-17,-3,34,3,'#a6b297');break;
    case 'pizza':poly(c,[[-15,-26],[16,-20],[-6,1]],'#ebcb77');rect(c,-15,-27,31,4,'#b78651');ellipse(c,-4,-17,3,3,'#bc7050');ellipse(c,4,-17,3,3,'#bc7050');ellipse(c,-4,-7,3,3,'#bc7050');break;
    case 'shell':poly(c,[[-16,-8],[-13,-22],[-6,-29],[6,-29],[14,-22],[17,-8],[3,0]],'#e4b89d');for(let i=-2;i<3;i++)poly(c,[[2,-2],[i*6-2,-23],[i*6,-24]],'#bf8f7e');break;
    case 'umbrella':poly(c,[[-23,-24],[-17,-35],[-5,-42],[7,-42],[20,-34],[25,-24]],'#bd8582');poly(c,[[-8,-24],[-5,-42],[7,-42],[11,-24]],'#e8c6a2');rect(c,0,-24,2,22,'#816e56');rect(c,-6,-4,7,3,'#816e56');break;
    case 'skateboard':rect(c,-24,-9,48,6,'#a57b54');rect(c,-21,-11,42,4,'#a5b877');ellipse(c,-14,-1,4,4,'#667463');ellipse(c,15,-1,4,4,'#667463');break;
    case 'helmet':c.save();c.beginPath();c.rect(-20,-32,45,23);c.clip();ellipse(c,0,-14,16,15,'#9eabae');c.restore();rect(c,-17,-15,33,10,'#9eabae');rect(c,-16,-9,39,4,'#748991');rect(c,-8,-25,7,3,'#c7d0c7');break;
    case 'magnet':rect(c,-14,-30,8,24,'#c87f71');rect(c,6,-30,8,24,'#c87f71');rect(c,-7,-11,15,9,'#c87f71');rect(c,-14,-30,8,7,'#aebeb5');rect(c,6,-30,8,7,'#aebeb5');break;
    case 'teacup':ellipse(c,13,-14,7,7,'#b9c4b1');ellipse(c,13,-14,4,4,'#f5e9cc');rect(c,-14,-23,27,20,'#e4dfc6');ellipse(c,0,-23,14,4,'#8d765a');ellipse(c,0,-3,12,3,'#c5c9af');rect(c,-20,0,40,3,'#d1d3b9');break;
    case 'rocket':rect(c,-10,-32,20,25,'#d8dccc');poly(c,[[-10,-32],[0,-47],[10,-32]],'#bc7e66');ellipse(c,0,-24,6,6,'#829fa5');poly(c,[[-10,-16],[-19,-4],[-10,-7]],'#bc7e66');poly(c,[[10,-16],[19,-4],[10,-7]],'#bc7e66');poly(c,[[-6,-7],[0,6],[6,-7]],'#e7b461');break;
    case 'camera':rect(c,-19,-25,38,25,'#737f71');rect(c,-14,-30,13,6,'#626e61');ellipse(c,0,-13,10,10,'#b7c1ae');ellipse(c,0,-13,7,7,'#4c6769');rect(c,12,-21,4,4,'#eeddb1');break;
    case 'donut':ellipse(c,0,-17,17,16,'#b18b60');ellipse(c,0,-19,16,13,'#dbb3a2');ellipse(c,0,-18,6,5,'#83795c');for(let i=0;i<6;i++)rect(c,Math.cos(i)*12-1,-19+Math.sin(i)*9,3,2,i%2?'#e9d997':'#859c79');break;
    case 'carrot':poly(c,[[-10,-25],[11,-25],[-3,1]],'#cd9253');rect(c,-3,-37,4,13,'#7f9c61');poly(c,[[0,-29],[-10,-37],[-7,-40],[2,-32]],'#93ab6c');rect(c,-7,-19,9,2,'#e2ae66');break;
    case 'snowflake':for(let i=0;i<6;i++){const a=i*Math.PI/3;c.strokeStyle='#a4c6d0';c.lineWidth=3;c.beginPath();c.moveTo(0,-18);c.lineTo(Math.cos(a)*18,-18+Math.sin(a)*18);c.stroke();}rect(c,-3,-21,6,6,'#ecf3e8');break;
    case 'clock':ellipse(c,0,-18,18,18,'#b29971');ellipse(c,0,-18,14,14,'#f3e3bd');rect(c,-1,-29,2,12,'#76816b');rect(c,0,-19,9,2,'#76816b');break;
    case 'paper':
      // Upright roll: unmistakable hollow top, layered white paper and one short flap.
      ellipse(c,0,-7,16,6,'#bfb7a7');rect(c,-16,-29,32,22,'#dedbd2');rect(c,-12,-29,19,24,'#fffefa');rect(c,8,-27,6,20,'#efede4');ellipse(c,0,-29,16,7,'#c0b7a6');ellipse(c,0,-30,14,6,'#fffefa');ellipse(c,0,-30,7,3.5,'#b4936c');ellipse(c,0,-31,5,2.5,'#6b5947');
      poly(c,[[-11,-23],[9,-23],[9,-4],[6,1],[-11,1]],'#fffefa');rect(c,-11,-22,20,1,'#eeeae0');for(let i=0;i<4;i++)rect(c,-9+i*5,-8,2,1,'#beb7a6');rect(c,-11,1,17,1,'#cac3b5');break;
    case 'beret':ellipse(c,0,-8,17,7,'#a87562');rect(c,-12,-6,25,5,'#825b4d');rect(c,-2,-18,3,5,'#825b4d');break;
    case 'chefhat':rect(c,-12,-18,24,18,'#f5f2e6');for(const x of [-10,0,10])ellipse(c,x,-23,9,9,'#fffdf3');rect(c,-12,-4,24,3,'#d7d6c5');break;
    case 'rainhat':ellipse(c,0,-12,13,11,'#d9b158');rect(c,-20,-4,40,5,'#bb954a');rect(c,-8,-16,5,3,'#e9cd87');break;
    case 'nightcap':poly(c,[[-15,-3],[-4,-28],[16,-14],[10,-7],[3,-19],[10,-2]],'#8eabc0');rect(c,-15,-3,28,5,'#dce1d6');ellipse(c,17,-12,5,5,'#eee9d3');break;
    case 'headphones':c.strokeStyle='#68767b';c.lineWidth=5;c.beginPath();c.arc(0,-10,16,Math.PI,Math.PI*2);c.stroke();rect(c,-20,-12,8,15,'#a87c64');rect(c,12,-12,8,15,'#a87c64');break;
    case 'sprout':rect(c,-1,-19,3,21,'#829a5a');ellipse(c,-7,-18,9,4,'#9bb46c');ellipse(c,7,-23,9,5,'#729951');break;
    case 'moth':ellipse(c,-10,-12,11,8,'#dfd3ae');ellipse(c,10,-12,11,8,'#e5d9b4');rect(c,-2,-20,4,21,'#a99b71');rect(c,-9,-15,3,3,'#b7a87a');rect(c,7,-15,3,3,'#b7a87a');break;
    case 'partyhat':poly(c,[[-14,0],[0,-32],[14,0]],'#c68c76');rect(c,-5,-17,9,3,'#e8c46f');rect(c,-9,-7,18,3,'#a9bd86');ellipse(c,0,-32,4,4,'#e4c378');break;
    case 'bee':ellipse(c,-6,-20,7,5,'#e4ede2');ellipse(c,6,-20,7,5,'#e4ede2');ellipse(c,0,-10,12,8,'#d7b663');rect(c,-6,-17,3,14,'#726b52');rect(c,1,-17,3,14,'#726b52');rect(c,9,-12,2,2,'#4e5946');break;
    case 'towel':ellipse(c,0,-13,15,12,'#cad9ce');rect(c,-16,-12,33,14,'#dbe5d7');rect(c,9,-23,6,23,'#9eb5b1');rect(c,10,-22,2,20,'#dbe5d7');break;
    case 'flowercrown':ellipse(c,0,-5,19,5,'#83995e');for(let i=0;i<5;i++){ellipse(c,-16+i*8,-7-(i%2)*3,5,5,'#ead7a3');rect(c,-17+i*8,-8-(i%2)*3,3,3,'#c99658');}break;
    case 'piratehat':poly(c,[[-24,0],[-14,-10],[-11,-23],[0,-17],[11,-23],[14,-10],[24,0]],'#56655e');rect(c,-5,-13,10,7,'#ebe4c8');rect(c,-3,-10,2,2,'#56655e');rect(c,2,-10,2,2,'#56655e');break;
    case 'hole':ellipse(c,0,-2,11,5,'#7d6a4e');ellipse(c,0,-3,8,3,'#5f5340');rect(c,-10,2,3,2,'#9c8865');rect(c,6,1,3,2,'#9c8865');break;
    case 'tower':rect(c,-7,-6,14,6,'#c2a577');rect(c,-6,-12,12,6,'#cbb083');rect(c,-4,-17,9,5,'#c2a577');rect(c,-3,-20,6,3,'#d5bb8c');break;
    default:rect(c,-5,-8,10,8,'#d9c790');
  }
  c.restore();
}

const previewCache=new Map();
export function spriteCanvas(id,size=48,options={}){
  const key=JSON.stringify([id,size,options]);let source=previewCache.get(key);
  if(!source){
    const scratch=document.createElement('canvas');scratch.width=192;scratch.height=192;const ctx=scratch.getContext('2d',{willReadFrequently:true});
    if(['david','julia','monki','sernik','galgan'].includes(id))character(ctx,id,96,145,{...options,scale:1,shadow:false});else item(ctx,id,96,130,{...options,scale:1,shadow:false});
    const pixels=ctx.getImageData(0,0,192,192).data;let left=192,top=192,right=0,bottom=0;
    for(let y=0;y<192;y++)for(let x=0;x<192;x++)if(pixels[(y*192+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    source=document.createElement('canvas');source.width=size;source.height=size;const c=source.getContext('2d');c.imageSmoothingEnabled=false;
    if(left<=right){const w=right-left+1,h=bottom-top+1,s=Math.min((size-10)/w,(size-10)/h);c.drawImage(scratch,left,top,w,h,(size-w*s)/2,(size-h*s)/2,w*s,h*s);}
    if(previewCache.size>500)previewCache.clear();previewCache.set(key,source);
  }
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;canvas.getContext('2d').drawImage(source,0,0);return canvas;
}
export function fillSprite(element,id,options={}){element.replaceChildren(spriteCanvas(id,48,options));}

const paths={
  broom:'m18 3-7 10m-3-2 7 5-4 6-9-6 6-5Zm-1 4-3 3m6-1-3 3',
  house:'M3.5 11.5 12 4.5l8.5 7M6 10.2V19h12v-8.8M10 19v-4.5h4V19',
  cellar:'M12 3.5v8m0 0-2.8-2.8M12 11.5l2.8-2.8M4 15h16M7 19h10',
  pause:'M9.5 5.5v13M14.5 5.5v13',
  star:'M12 4.2l2.2 5.1 5.5.5-4.2 3.7 1.3 5.4L12 16l-4.8 2.9 1.3-5.4-4.2-3.7 5.5-.5z',
  sound:'M11 5 6 9H3v6h3l5 4V5Zm4 3a7 7 0 0 1 0 8m3-11a11 11 0 0 1 0 14',
  mute:'M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4',
  close:'m6 6 12 12M6 18 18 6',house:'m3 11 9-8 9 8M5 10v10h14V10m-10 10v-7h6v7',
  garden:'M12 21V11m0 4C2 15 3 8 3 8s9-1 9 7Zm0-4c0-8 9-8 9-8s1 8-9 8Z',
  roof:'m2 12 10-9 10 9M5 10v11h14V10M9 17h6m-6-4h6',cellar:'M4 3h16v18H4V3Zm4 4h8M8 11h8M8 15h8M8 19h8',
  lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Zm7 4v3',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2',
  moon:'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z',
  users:'M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 20v-3a6 6 0 0 1 12 0v3m1-15a3 3 0 0 1 0 6m3 3a5 5 0 0 1 2 4v2',
  hand:'M8 13V4a2 2 0 0 1 4 0v8-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-3 6-6 6h-1c-3 0-4-2-6-4l-4-5a2 2 0 0 1 3-2l2 2Z',
  gift:'M3 9h18v4H3V9Zm2 4v9h14v-9m-7-4v13M12 9C1 9 7-2 12 9Zm0 0c11 0 5-11 0 0Z',
  draw:'m4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4',
  move:'M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4m12-8 4 4-4 4',
  hat:'M4 17h16M7 17l2-12h6l2 12M8 13h8',
  play:'m8 4 12 8-12 8V4Z', pause:'M8 5v14M16 5v14',arrow:'M4 12h16m-6-6 6 6-6 6',
  link:'m9 15 6-6M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
  shuffle:'M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 4-4m4-3 4-3h3m-4-4 4 4-4 4',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  check:'m5 12 4 4L20 5', download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
};
export function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.star||paths.sun}"/></svg>`;}

// Every sprite is drawn on a low-resolution pixel grid. No fonts or image CDNs.
// Reference cues: Monki's orange fur and long arms; Julia's long hair / round
// glasses; David's middle-parted black hair; Sernik's cream fur; Galgan's brows.
export const P = { ink:'#454637', dark:'#303932', cream:'#f9edcc', bark:'#796343', brown:'#a4663f', orange:'#b77545', skin:'#dca782', lightSkin:'#f0c5a3', green:'#82995e', leaf:'#58734b', lightLeaf:'#9eb67b', blue:'#839e9b', blueDark:'#607d79', rose:'#ca9187', yellow:'#e4c87a' };
export const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function poly(c, points, color) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill(); }
export function ellipse(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill()}
export function pixelBox(c,x,y,w,h,color,border=P.ink){rect(c,x+2,y,w-4,h,color);rect(c,x,y+2,w,h-4,color);rect(c,x+2,y,w-4,1,border);rect(c,x+2,y+h-1,w-4,1,border);rect(c,x,y+2,1,h-4,border);rect(c,x+w-1,y+2,1,h-4,border);}
export function shadow(c,x,y,w=12){ellipse(c,x,y,w,3,'#4a573224')}

export function character(c,id,x,y,options={}){
  const {scale=1,frame=0,mood='idle',hat=null,flip=false,shadow:showShadow=true}=options;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(flip?-scale:scale,scale);
  if(showShadow)shadow(c,0,-1,id==='monki'?13:12);
  const bob=mood==='sleep'?0:Math.floor(frame)%2;
  c.translate(0,-bob);
  if(id==='david'||id==='julia'){
    const julia=id==='julia',skin=julia?P.lightSkin:P.skin,hair=julia?'#947348':'#343b34';
    if(julia){rect(c,-10,-33,20,23,hair);rect(c,-11,-29,3,24,'#9f7d50');rect(c,8,-29,3,24,'#7a5f3d');}
    rect(c,-7,-12,6,10,julia?'#75848c':'#7b8d78');rect(c,2,-12,6,10,julia?'#75848c':'#7b8d78');
    rect(c,-8,-3,7,3,'#48473c');rect(c,2,-3,8,3,'#48473c');
    rect(c,-8,-22,17,12,julia?'#d9d5bb':'#424940');
    rect(c,-10,-20,3,9,skin);rect(c,9,-20,3,9,skin);
    if(julia){rect(c,-8,-21,17,3,'#eae3c9');rect(c,-3,-22,7,2,skin);}
    rect(c,-8,-34,16,15,skin);rect(c,-10,-29,2,6,skin);rect(c,8,-29,2,6,skin);
    rect(c,-7,-35,14,3,hair);rect(c,-9,-32,3,7,hair);rect(c,6,-32,3,7,hair);
    if(julia){rect(c,-8,-34,8,4,'#ad8c5a');rect(c,-9,-29,2,18,hair);rect(c,7,-30,3,19,hair);}
    else{rect(c,-8,-37,13,3,hair);rect(c,-5,-38,5,1,hair);rect(c,-10,-32,7,3,hair);rect(c,2,-34,7,4,hair);rect(c,-3,-33,3,2,'#44483e');}
    if(mood==='sleep'){rect(c,-5,-27,3,1,P.ink);rect(c,3,-27,3,1,P.ink);}
    else{rect(c,-5,-28,2,mood==='happy'?1:2,P.ink);rect(c,3,-28,2,mood==='happy'?1:2,P.ink);}
    if(julia){c.strokeStyle='#535747';c.lineWidth=1;c.strokeRect(-7.5,-29.5,6,5);c.strokeRect(1.5,-29.5,6,5);rect(c,-1,-28,3,1,'#535747');}
    rect(c,-1,-22,3,1,mood==='happy'?'#ad6c59':'#a67a5c');
    if(mood==='annoyed'){rect(c,-6,-30,4,1,P.ink);rect(c,2,-30,4,1,P.ink);}
    if(hat)item(c,hat,0,-37,{scale:.72,shadow:false});
  }else if(id==='monki'){
    const fur='#a9693b',lit='#bb7a45',face='#d8b27d';
    rect(c,-9,-24,18,21,fur);rect(c,-7,-23,14,19,lit);
    rect(c,-14,-23,6,18,fur);rect(c,9,-23,6,18,fur);rect(c,-15,-8,6,5,'#8c603d');rect(c,10,-8,6,5,'#8c603d');
    rect(c,-8,-7,6,8,fur);rect(c,3,-7,6,8,fur);rect(c,-10,-2,9,4,'#8c603d');rect(c,2,-2,10,4,'#8c603d');
    rect(c,-10,-34,20,17,fur);rect(c,-7,-37,14,5,fur);rect(c,-13,-30,4,7,fur);rect(c,9,-30,4,7,fur);
    rect(c,-8,-31,16,11,face);rect(c,-6,-33,5,7,face);rect(c,2,-33,5,7,face);
    rect(c,-6,-32,4,4,'#f1e5bb');rect(c,3,-32,4,4,'#f1e5bb');
    if(mood==='sleep'){rect(c,-6,-30,4,1,P.ink);rect(c,3,-30,4,1,P.ink);}
    else{rect(c,-4,-31,2,3,P.dark);rect(c,4,-31,2,3,P.dark);}
    rect(c,-1,-27,3,1,'#765137');rect(c,-5,-22,10,1,'#765137');
    if(mood==='happy'){rect(c,-2,-22,4,2,'#765137');}
    rect(c,-5,-16,2,4,'#ca8a52');rect(c,3,-10,2,3,'#ca8a52');
    if(hat)item(c,hat,0,-37,{scale:.8,shadow:false});
  }else{
    const dark=id==='galgan',fur=dark?'#50554a':'#d9c18d',lit=dark?'#616758':'#ead5a5',cream=dark?'#c9b888':'#f1dfb6';
    if(mood==='sleep'){
      rect(c,-16,-12,28,10,fur);rect(c,-11,-14,21,3,lit);rect(c,10,-10,8,8,cream);rect(c,14,-7,3,1,P.ink);rect(c,-14,-3,31,3,cream);rect(c,-18,-10,3,5,fur);
      if(hat)item(c,hat,9,-13,{scale:.7,shadow:false});
    }else{
      rect(c,-13,-17,25,13,fur);rect(c,-10,-19,19,4,lit);
      rect(c,-11,-7,5,8,cream);rect(c,5,-7,5,8,cream);rect(c,-3,-5,4,6,lit);
      rect(c,-17,-20,4,12,fur);rect(c,-20,-22,5,5,fur);rect(c,-19,-24,3,4,lit);
      rect(c,1,-27,17,18,fur);rect(c,4,-24,12,13,cream);
      poly(c,[[0,-25],[0,-35],[7,-27]],fur);poly(c,[[12,-27],[19,-34],[18,-22]],fur);
      if(!dark)rect(c,16,-29,4,9,'#c6aa78');
      rect(c,4,-24,3,2,P.dark);rect(c,12,-24,3,2,P.dark);
      if(dark){rect(c,3,-27,4,2,'#d3bc83');rect(c,12,-27,4,2,'#d3bc83');}
      rect(c,8,-18,5,3,P.dark);rect(c,10,-15,2,2,P.ink);
      if(mood==='happy'){rect(c,10,-13,3,4,'#c68776');}
      if(hat)item(c,hat,10,-30,{scale:.7,shadow:false});
    }
  }
  c.restore();
}

export function item(c,type,x,y,options={}){
  const {scale=1,shadow:showShadow=false,variant=0}=options;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  if(showShadow)shadow(c,0,0,type==='couch'?32:10);
  switch(type){
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
    case 'hole':ellipse(c,0,-2,11,5,'#7d6a4e');ellipse(c,0,-3,8,3,'#5f5340');rect(c,-10,2,3,2,'#9c8865');rect(c,6,1,3,2,'#9c8865');break;
    case 'tower':rect(c,-7,-6,14,6,'#c2a577');rect(c,-6,-12,12,6,'#cbb083');rect(c,-4,-17,9,5,'#c2a577');rect(c,-3,-20,6,3,'#d5bb8c');break;
    default:rect(c,-5,-8,10,8,'#d9c790');
  }
  c.restore();
}

export function spriteCanvas(id,size=48,options={}){
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  if(['david','julia','monki','sernik','galgan'].includes(id))character(c,id,size/2,size*.86,{scale:size/48,...options});
  else item(c,id,size/2,size*.76,{scale:size/39,...options});
  return canvas;
}
export function fillSprite(element,id,options={}){element.replaceChildren(spriteCanvas(id,48,options));}

const paths={
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

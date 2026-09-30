// Furnishing stays free. Adventures reveal choices; they never charge coins or
// turn decorating into a task that must be completed.
import {TOTAL_EPISODES} from './adventures.js';
export const FURNITURE={
  couch:{name:'Sofa',size:[72,46],category:'Seating',legacy:true},
  plant:{name:'House plant',size:[36,53],category:'Plants',legacy:true},
  lamp:{name:'Lamp',size:[37,60],category:'Lights',legacy:true},
  radio:{name:'Radio',size:[31,25],category:'Oddments',legacy:true},
  bowl:{name:'Dog bowl',size:[35,12],category:'Oddments',legacy:true},
  armchair:{name:'Armchair',size:[46,45],category:'Seating'},
  loveseat:{name:'Little sofa',size:[63,43],category:'Seating'},
  stool:{name:'Stool',size:[28,29],category:'Seating'},
  pouf:{name:'Pouf',size:[34,20],category:'Seating'},
  table:{name:'Low table',size:[63,28],category:'Tables'},
  sidetable:{name:'Side table',size:[32,34],category:'Tables'},
  shelf:{name:'Bookcase',size:[45,61],category:'Storage'},
  cabinet:{name:'Cabinet',size:[48,45],category:'Storage'},
  bench:{name:'Garden bench',size:[66,37],category:'Seating'},
  planter:{name:'Tall planter',size:[28,49],category:'Plants'},
  cactus:{name:'Cactus',size:[26,40],category:'Plants'},
  lantern:{name:'Lantern',size:[24,37],category:'Lights'},
  floorlamp:{name:'Paper lamp',size:[32,57],category:'Lights'},
  mirror:{name:'Standing mirror',size:[39,61],category:'Oddments'},
  screen:{name:'Folding screen',size:[64,61],category:'Oddments'},
  birdhouse:{name:'Birdhouse',size:[31,50],category:'Oddments'},
};
export const FINISHES={
  oak:{name:'Oak',main:'#a87b56',light:'#d3ad7d',dark:'#765d48'},
  moss:{name:'Moss',main:'#78947d',light:'#a8bca0',dark:'#4e6c5d'},
  rose:{name:'Rose',main:'#ba817d',light:'#deb1a5',dark:'#865e60'},
  blue:{name:'Blue',main:'#708da0',light:'#a8bfca',dark:'#4f6978'},
  cream:{name:'Cream',main:'#c9b999',light:'#e9ddc0',dark:'#9a896e'},
  plum:{name:'Plum',main:'#817489',light:'#b7a9bd',dark:'#5e5569'},
};
const opt=(id,name,color,accent,pattern='plain')=>({id,name,color,accent,pattern});
export const DECOR_STYLES={
  house:{
    wall:[opt('sage','Sage','#c8d8c4','#9db69b','leaf'),opt('butter','Butter','#f0e2bc','#d5c79f','fleck'),opt('clay','Clay','#dcbdaa','#b9907b','stripe'),opt('sky','Blue','#c8dce2','#91b6c1','cloud'),opt('plum','Plum','#a99cae','#7b6c8b','dot'),opt('paper','Paper','#f1ebdc','#d5c8b4','grid'),opt('peach','Peach','#efd1bc','#d9a98f','flower'),opt('night','Night','#5d6176','#888ba0','star')],
    floor:[opt('oak','Oak','#b79574','#9d785c','plank'),opt('dark','Walnut','#836451','#684c43','plank'),opt('honey','Honey','#d0a16e','#b77f52','plank'),opt('mint','Mint tile','#aac3b6','#7fa69e','tile'),opt('checker','Checker','#dfd4bd','#9baa9d','checker'),opt('stone','Stone','#bcb7a8','#989c94','stone'),opt('rose','Rose tile','#d9b4ac','#b48d8b','tile')],
    trim:[opt('natural','Natural wood','#bac5a0','#86966f'),opt('walnut','Walnut','#a68b75','#765e52'),opt('white','White','#e9e9d8','#bfc6b9'),opt('moss','Moss','#9eaf91','#71876f'),opt('blue','Blue','#a7c1c5','#708f9a'),opt('rose','Rose','#d8b3ac','#ad8587')],
    rug:[opt('woven','Woven','#d9cda3','#aeb58a','stripe'),opt('blue','Blue rug','#b5c9d1','#708e9d','stripe'),opt('rose','Rose rug','#dec1bc','#b88483','diamond'),opt('moss','Moss rug','#aebc92','#718c66','diamond'),opt('gold','Gold rug','#e3c88f','#b79860','stripe'),opt('none','No rug','transparent','transparent')],
    view:[opt('hills','Hills','#a2bc88','#7e9e7b'),opt('forest','Forest','#82a98c','#597d73'),opt('city','City','#a9b8b5','#7b8f96'),opt('sea','Sea','#88b7bb','#5e929f'),opt('mountains','Mountains','#a2afbd','#7a91a4'),opt('orchard','Orchard','#a7bb87','#7e9c70')],
  },
  garden:{
    ground:[opt('grass','Grass','#a9c292','#729a70','grass'),opt('meadow','Meadow','#b9cb91','#779e73','flower'),opt('wild','Wild garden','#8fb38d','#6b9272','wild'),opt('sand','Sand','#dac8a7','#b9a786','stone'),opt('paving','Paving','#b9b8aa','#8f9e99','tile'),opt('autumn','Autumn','#b9ad84','#a48062','leaf')],
    fence:[opt('cream','Cream','#d2d4b2','#a2ac85'),opt('wood','Wood','#a88262','#7c694f'),opt('blue','Blue','#9bb9bb','#6c949b'),opt('rose','Rose','#d6aaa0','#a9827e'),opt('dark','Dark','#6e7469','#515d56'),opt('none','No fence','transparent','transparent')],
    shed:[opt('sage','Sage','#d5bd91','#667e6d'),opt('red','Red','#d2a390','#9d6867'),opt('blue','Blue','#b8c9c4','#6f919b'),opt('yellow','Yellow','#e1cc9b','#9a865f'),opt('dark','Dark','#a1a59a','#5d696b')],
    sky:[opt('natural','Natural','#b9d9d7','#dce8dc'),opt('lilac','Lilac','#cfcedf','#e9d9dc'),opt('peach','Peach','#f1cfbc','#efdcca'),opt('sea','Sea glass','#a7d2d4','#d7e6dc'),opt('gold','Honey','#e8d9aa','#efe3c3'),opt('blue','Bright blue','#abcddd','#d5e7e6')],
    backdrop:[opt('hills','Hills','#a2bc88','#7e9e7b'),opt('forest','Forest','#82a98c','#597d73'),opt('city','City','#a9b8b5','#7b8f96'),opt('sea','Sea','#88b7bb','#5e929f'),opt('mountains','Mountains','#a2afbd','#7a91a4'),opt('orchard','Orchard','#a7bb87','#7e9c70'),opt('plain','Open sky','#b9d9d7','#b9d9d7')],
  },
  roof:{
    tile:[opt('terracotta','Terracotta','#b99575','#95765f','tile'),opt('slate','Slate','#737e84','#535f69','tile'),opt('moss','Moss','#82917c','#596e64','tile'),opt('rose','Rose','#ba8d89','#916d70','tile'),opt('blue','Blue','#829ca8','#607983','tile'),opt('dark','Dark','#595969','#414553','tile'),opt('gold','Gold','#c5a36f','#9b805e','tile')],
    facade:[opt('cream','Cream','#dac69e','#bda982'),opt('sage','Sage','#b7c5ae','#8fa78e'),opt('peach','Peach','#e2bca7','#bd998e'),opt('blue','Blue','#b8ced0','#8eaab0'),opt('dark','Dark','#92929a','#6e717d')],
    sky:[opt('natural','Natural','#b9d9d7','#dce8dc'),opt('lilac','Lilac','#cfcedf','#e9d9dc'),opt('peach','Peach','#f1cfbc','#efdcca'),opt('sea','Sea glass','#a7d2d4','#d7e6dc'),opt('gold','Honey','#e8d9aa','#efe3c3'),opt('blue','Bright blue','#abcddd','#d5e7e6')],
    backdrop:[opt('hills','Hills','#a2bc88','#7e9e7b'),opt('forest','Forest','#82a98c','#597d73'),opt('city','City','#a9b8b5','#7b8f96'),opt('sea','Sea','#88b7bb','#5e929f'),opt('mountains','Mountains','#a2afbd','#7a91a4'),opt('orchard','Orchard','#a7bb87','#7e9c70'),opt('plain','Open sky','#b9d9d7','#b9d9d7')],
  },
  cellar:{
    wall:[opt('stone','Stone','#a2ac91','#83907b','stone'),opt('brick','Brick','#b89481','#8c6f63','brick'),opt('blue','Blue','#9db8bc','#708e98','tile'),opt('moss','Moss','#8ba896','#5e806f','leaf'),opt('plum','Plum','#9b8d9b','#6e637d','dot'),opt('cream','Cream','#ddd1b8','#ad9f8c','grid')],
    floor:[opt('stone','Stone','#b3b498','#8f9683','stone'),opt('dark','Dark','#877a70','#695e57','plank'),opt('tile','Tile','#c2c5b9','#99aaa5','tile'),opt('earth','Earth','#ac9379','#8c765e','stone'),opt('blue','Blue','#a3b8bd','#7e9ba2','tile')],
  },
};
// Later passes keep revealing a little room to personalise without adding
// another currency or a daily task. These are palette variants of surfaces the
// renderer already knows how to draw, so none needs a separate backdrop image.
const LATER_STYLES=[
  ['roof','tile',28,opt('copper','Copper','#af806b','#805e52','tile')],
  ['garden','ground',34,opt('clover','Clover','#8fb587','#679d6f','grass')],
  ['house','wall',40,opt('cocoa','Cocoa','#b8a08c','#8b7568','fleck')],
  ['garden','ground',46,opt('clay','Clay path','#c9ad94','#a48772','stone')],
  ['roof','tile',52,opt('lichen','Lichen','#91a08a','#6d806f','tile')],
  ['garden','shed',58,opt('apricot','Apricot','#ddbaa0','#a78670')],
  ['house','floor',64,opt('redwood','Redwood','#af8069','#865f51','plank')],
  ['garden','fence',70,opt('lilac','Lilac','#b8adc4','#8d809d')],
  ['roof','facade',76,opt('walnut','Walnut','#ad9279','#7f6b5a')],
  ['garden','sky',82,opt('mint','Mint sky','#b5d8cf','#dbe9d7')],
  ['house','wall',88,opt('lilac','Lilac','#ccc1d4','#a79cb5','dot')],
  ['cellar','wall',94,opt('chalk','Chalk','#d1d1c6','#aaada5','stone')],
  ['roof','tile',100,opt('sand','Sand tile','#c9b399','#9b846c','tile')],
  ['garden','fence',106,opt('iron','Iron','#89978e','#66756c')],
  ['house','floor',112,opt('porcelain','Porcelain','#d4d7cc','#afb8b4','tile')],
  ['cellar','floor',118,opt('umber','Umber','#af907d','#8a7064','stone')],
  ['roof','facade',124,opt('bluegrey','Blue grey','#a9bec4','#7f969d')],
  ['garden','shed',130,opt('bluegreen','Blue green','#a8c4b9','#749388')],
  ['house','rug',136,opt('citrus','Citrus','#e0cb91','#b8a35f','diamond')],
  ['cellar','wall',142,opt('terracotta','Terracotta','#bf9786','#916f65','brick')],
];
const LATER_LEVELS=new Map();
for(const [room,surface,level,option] of LATER_STYLES){DECOR_STYLES[room][surface].push(option);LATER_LEVELS.set(`${room}.${surface}.${option.id}`,level);}
export const DEFAULT_DECOR=Object.fromEntries(Object.entries(DECOR_STYLES).map(([room,surfaces])=>[room,Object.fromEntries(Object.entries(surfaces).map(([surface,options])=>[surface,options[0].id]))]));
const STARTER_FURNITURE=new Set(['couch','lamp','bowl']);
export const FURNITURE_ORDER=['plant','stool','radio','armchair','table','planter','sidetable','pouf','shelf','floorlamp','bench','loveseat','cactus','lantern','cabinet','screen','mirror','birdhouse'];
export const decorProgress=state=>Math.min(TOTAL_EPISODES,Math.max(state?.completed||0,...Object.values(state?.journeys||{}).map(j=>j?.index||0)));
const STYLE_KEYS=Object.entries(DECOR_STYLES).flatMap(([room,surfaces])=>Object.keys(surfaces).map(surface=>`${room}.${surface}`));
export function decorLevel(kind,id,room,surface){
  if(kind==='furniture')return STARTER_FURNITURE.has(id)?0:Math.max(1,FURNITURE_ORDER.indexOf(id)+1);
  if(kind==='finish')return Math.max(0,Object.keys(FINISHES).indexOf(id))*3;
  if(kind==='style'){
    const later=LATER_LEVELS.get(`${room}.${surface}.${id}`);if(later)return later;
    // Duck Race should leave a real outdoor choice, not be the only first-pass
    // adventure with no new decoration. Bringing this forward never relocks a save.
    if(room==='garden'&&surface==='backdrop'&&id==='plain')return 20;
    const index=DECOR_STYLES[room]?.[surface]?.findIndex(option=>option.id===id)??-1;
    if(index<=0||id==='none')return 0;
    return Math.min(24,(index-1)*4+1+STYLE_KEYS.indexOf(`${room}.${surface}`)%4);
  }
  return Infinity;
}
const decorLegacy=(state,kind,id,room,surface)=>{
  const owned=state?.catalog?.legacyOwned;
  return kind==='style'?owned?.styles?.[room]?.[surface]?.includes(id):owned?.[kind==='furniture'?'furniture':'finishes']?.includes(id);
};
export function decorAvailable(state,kind,id,room,surface){
  const known=kind==='furniture'?!!FURNITURE[id]:kind==='finish'?!!FINISHES[id]:!!DECOR_STYLES[room]?.[surface]?.some(option=>option.id===id);
  if(!known)return false;
  return !!decorLegacy(state,kind,id,room,surface)||decorProgress(state)>=decorLevel(kind,id,room,surface);
}
export const decorNew=(state,seen,kind,id,room,surface)=>!decorLegacy(state,kind,id,room,surface)&&decorLevel(kind,id,room,surface)>seen&&decorLevel(kind,id,room,surface)<=decorProgress(state);
export function decorNewSince(state,seen){
  if(decorProgress(state)<=seen)return false;
  if(Object.keys(FURNITURE).some(id=>decorNew(state,seen,'furniture',id)))return true;
  if(Object.keys(FINISHES).some(id=>decorNew(state,seen,'finish',id)))return true;
  return Object.entries(DECOR_STYLES).some(([room,surfaces])=>Object.entries(surfaces).some(([surface,options])=>options.some(option=>decorNew(state,seen,'style',option.id,room,surface))));
}
export function decorRewardsAt(level){
  const furniture=FURNITURE_ORDER[level-1]||null;
  const styles=Object.entries(DECOR_STYLES).flatMap(([room,surfaces])=>Object.entries(surfaces).flatMap(([surface,choices])=>choices.filter(choice=>decorLevel('style',choice.id,room,surface)===level).map(choice=>({room,surface,...choice}))));
  const finish=Object.keys(FINISHES).find(id=>decorLevel('finish',id)===level)||null;
  return{furniture,styles,finish};
}
// Keepsakes have a physical home, so they can be selected and put away from
// exactly the place where they appear rather than only in a separate album.
// Checked with every keepsake out at once, on a phone, a small phone, landscape and the Mac:
// the camera sat on the shared drawing (and took its taps), the kite hid the paper roll, the
// shell covered the frog on its lily pad, and the "smaller clock" was as big as the clock.
export const SOUVENIR_SPOTS={
  cone:['house',269,274,.9],paper:['house',96,136,.7],pizza:['house',242,166,.65],
  shell:['garden',330,294,.85],umbrella:['house',351,173,.75],skateboard:['garden',201,298,1],
  magnet:['house',283,159,.65],teacup:['garden',127,230,.85],rocket:['roof',98,155,1],
  camera:['house',236,137,.7],donut:['house',238,163,.7],carrot:['garden',114,269,.85],
  snowflake:['house',138,131,.7],duck:['garden',260,249,.85],clock:['house',226,110,.35],
  mushroom:['garden',245,298,.85],fish:['house',114,190,.85],present:['house',68,264,.9],
  boat:['garden',267,252,.8],kite:['house',180,134,.8],lily:['garden',300,255,.9],
  rainbow:['house',116,111,.9],
};
export const decorOption=(state,room,surface)=>{
  const options=DECOR_STYLES[room]?.[surface]||[];
  return options.find(option=>option.id===state?.catalog?.styles?.[room]?.[surface])||options[0];
};

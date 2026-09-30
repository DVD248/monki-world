// Small return-and-discover loops. One thing waits; missed days never create debt.
import {PLACE_STORIES,placeStory} from './places.js';
import {centralTime} from './ambience.js';
export const DAY=86400000;
export const LIFE_ITEMS={beret:{name:'Beret',wearable:true},chefhat:{name:'Chef hat',wearable:true},rainhat:{name:'Rain hat',wearable:true},nightcap:{name:'Night cap',wearable:true},headphones:{name:'Headphones',wearable:true},sprout:{name:'Sprout',wearable:true},moth:{name:'Paper moth',wearable:true},partyhat:{name:'Party hat',wearable:true},bee:{name:'Bee',wearable:true},towel:{name:'Towel',wearable:true},flowercrown:{name:'Flower crown',wearable:true},piratehat:{name:'Pirate hat',wearable:true}};
export const DISCOVERIES=[
  {id:'beret-dog',title:'An artist, apparently.',actor:'sernik',item:'beret',action:'tilt',hint:'Sernik has something on his head.'},
  {id:'chef',title:'The bowl inspector.',actor:'galgan',item:'chefhat',action:'hiccup',hint:'The inspection is not going well.'},
  {id:'radio-head',title:'Private concert.',actor:'monki',item:'headphones',action:'dance',hint:'He cannot hear you.'},
  {id:'rain-dog',title:'Prepared for absolutely nothing.',actor:'sernik',item:'rainhat',action:'shake',hint:'It is not raining.'},
  {id:'sleepy',title:'He is not getting up.',actor:'galgan',item:'nightcap',action:'sleep',hint:'A very small snore.'},
  {id:'bath',title:'Someone used the good towel.',actor:'sernik',item:'towel',action:'shake',hint:'He is still wet.'},
  {id:'party',title:'An occasion of some sort.',actor:'monki',item:'partyhat',action:'hop',hint:'Nobody knows which one.'},
  {id:'pirate',title:'Captain of the rug.',actor:'galgan',item:'piratehat',action:'tilt',hint:'He has claimed it.'},
  {id:'sprout',title:'A thought is growing.',actor:'monki',item:'sprout',action:'hiccup',hint:'It might be a plant.'},
  {id:'paper-moth',title:'The paper had a visitor.',actor:'sernik',item:'moth',action:'flutter',hint:'Paper in the garden. Leave it a couple of days.',setup:{item:'paper',room:'garden',days:2}},
  {id:'garden-bee',title:'A tiny garden inspector.',actor:'galgan',item:'bee',action:'flutter',hint:'A flower outside, and a little time.',setup:{item:'flower',room:'garden',days:2}},
  {id:'moon-cap',title:'The overnight astronomer.',actor:'monki',item:'moon',action:'float',hint:'Leave the glasses on the roof for two days.',setup:{item:'glasses',room:'roof',days:2}},
];
// Something new and daft each time, and never the same one twice in an autumn. A
// situation is on show the moment the room opens — no glitter to find, no panel, no
// poking three times, nothing to keep. One touch and it is over.
export const FRESH=[
  {id:'g-teacup',actor:'galgan',item:'teacup',mood:'sleep',spot:'couch',title:'Tea was had.',after:'The cup survived.'},
  {id:'g-crown',actor:'galgan',item:'crown',mood:'idle',spot:'couch',title:'King of the sofa.',after:'Abdicated.'},
  {id:'g-helmet',actor:'galgan',item:'helmet',mood:'idle',spot:'corner',title:'A helmet. Indoors. On Galgan.',after:'Nothing happened. He is fine.'},
  {id:'g-umbrella',actor:'galgan',item:'umbrella',mood:'idle',title:'Indoors. Just in case.',after:'It did not rain.'},
  {id:'g-sock',actor:'galgan',item:'sock',mood:'happy',title:'He found the other sock.',after:'It is still not a pair.'},
  {id:'g-duck',actor:'galgan',item:'duck',mood:'sleep',spot:'bowl',title:'Sharing the bowl with a duck.',after:'The duck has moved out.'},
  {id:'g-snowflake',actor:'galgan',item:'snowflake',mood:'idle',title:'One snowflake. Delivered.',after:'It melted.'},
  {id:'g-clock',actor:'galgan',item:'clock',mood:'sleep',title:'He is keeping the time. Badly.',after:'It is later now.'},
  {id:'g-pizza',actor:'galgan',item:'pizza',mood:'happy',spot:'rug',title:'Wearing dinner.',after:'Dinner is on the floor.'},
  {id:'g-magnet',actor:'galgan',item:'magnet',mood:'idle',spot:'radio',title:'The radio stopped working. Unrelated.',after:'It works again. Also unrelated.'},
  {id:'g-flowercrown',actor:'galgan',item:'flowercrown',mood:'sleep',title:'Somebody made him pretty while he slept.',after:'He knows.'},
  {id:'g-cone',actor:'galgan',item:'cone',mood:'annoyed',spot:'corner',title:'Galgan is facing the corner. Nobody asked him to.',after:'He has turned round.'},
  {id:'g-frog',actor:'galgan',item:'frog',mood:'idle',title:'The frog is on top now.',after:'The frog had somewhere to be.'},
  {id:'g-nightcap',actor:'galgan',item:'nightcap',mood:'sleep',spot:'couch',title:'Early night.',after:'Late morning.'},
  {id:'g-headphones',actor:'galgan',item:'headphones',mood:'sleep',title:'Listening to something very boring.',after:'It finished.'},
  {id:'g-shell',actor:'galgan',item:'shell',mood:'idle',title:'He can hear the sea.',after:'It was the fridge.'},
  {id:'g-donut',actor:'galgan',item:'donut',mood:'happy',title:'The doughnut is a hat now.',after:'The rules have changed.'},
  {id:'g-bow',actor:'galgan',item:'bow',mood:'annoyed',title:'Somebody wrapped Galgan.',after:'Unwrapped. No card.'},
  {id:'s-icecream',actor:'sernik',item:'icecream',mood:'happy',title:'Ice cream, worn not eaten.',after:'Now eaten.'},
  {id:'s-fish',actor:'sernik',item:'fish',mood:'happy',spot:'bowl',title:'The fish is his. He says.',after:'The fish disagreed.'},
  {id:'s-mushroom',actor:'sernik',item:'mushroom',mood:'idle',spot:'plant',title:'Foraging, indoors.',after:'Nothing else grew.'},
  {id:'s-glasses',actor:'sernik',item:'glasses',mood:'idle',title:'Too cool to come when called.',after:'He came anyway.'},
  {id:'s-potato',actor:'sernik',item:'potato',mood:'sleep',spot:'couch',title:'Asleep under a potato.',after:'The potato stays.'},
  {id:'s-star',actor:'sernik',item:'star',mood:'happy',title:'A small celebrity.',after:'Back to normal.'},
  {id:'s-teacup',actor:'sernik',item:'teacup',mood:'idle',title:'Balancing the good teacup.',after:'It survived.'},
  {id:'s-sprout',actor:'sernik',item:'sprout',mood:'idle',spot:'plant',title:'Trying to be a plant.',after:'He is a dog again.'},
  {id:'s-sock',actor:'sernik',item:'sock',mood:'happy',spot:'door',title:'Behind the door, with a sock.',after:'The sock is back.'},
  {id:'s-moon',actor:'sernik',item:'moon',mood:'sleep',title:'He has the moon. It is fine.',after:'Put back.'},
  {id:'s-crown',actor:'sernik',item:'crown',mood:'annoyed',title:'Crowned. Against his will.',after:'A free dog.'},
  {id:'s-duck',actor:'sernik',item:'duck',mood:'happy',title:'He brought a duck home.',after:'The duck lives here now.'},
  {id:'s-bee',actor:'sernik',item:'bee',mood:'idle',title:'A bee has chosen him.',after:'The bee has chosen someone else.'},
  {id:'s-bow',actor:'sernik',item:'bow',mood:'happy',title:'He wrapped himself. For you, probably.',after:'Opened.'},
  {id:'s-umbrella',actor:'sernik',item:'umbrella',mood:'sleep',spot:'couch',title:'Napping under an umbrella.',after:'Clear skies.'},
  {id:'s-cone',actor:'sernik',item:'cone',mood:'idle',title:'Sernik is wearing a traffic cone.',after:'Traffic is moving again.'},
  {id:'s-flower',actor:'sernik',item:'flower',mood:'happy',title:'Someone gave him a flower. It was him.',after:'He has eaten some of it.'},
  {id:'s-headphones',actor:'sernik',item:'headphones',mood:'happy',spot:'radio',title:'Sernik has discovered music.',after:'He has moved on from music.'},
  {id:'s-rainhat',actor:'sernik',item:'rainhat',mood:'idle',spot:'door',title:'Going out. Not going out.',after:'Stayed in.'},
  {id:'s-pizza',actor:'sernik',item:'pizza',mood:'happy',title:'The pizza is under control.',after:'The pizza is gone.'},
  {id:'m-potato',actor:'monki',item:'potato',mood:'idle',spot:'radio',title:'Monki has a potato. He will not explain.',after:'He has explained nothing.'},
  {id:'m-cone',actor:'monki',item:'cone',mood:'happy',spot:'lamp',title:'Up the lamp, for safety.',after:'Safe.'},
  {id:'m-crown',actor:'monki',item:'crown',mood:'happy',spot:'couch',title:'Monki has declared himself.',after:'Undeclared.'},
  {id:'m-fish',actor:'monki',item:'fish',mood:'annoyed',title:'Monki is wearing a fish. He hates fish.',after:'The fish has gone.'},
  {id:'m-glasses',actor:'monki',item:'glasses',mood:'sleep',spot:'rug',title:'Face down on the rug. In sunglasses.',after:'He was fine the whole time.'},
  {id:'m-moon',actor:'monki',item:'moon',mood:'sleep',title:'Borrowed the moon.',after:'Returned. Slightly used.'},
  {id:'m-teacup',actor:'monki',item:'teacup',mood:'idle',spot:'plant',title:'Monki is having tea in the plant.',after:'He has left the plant.'},
  {id:'m-clock',actor:'monki',item:'clock',mood:'idle',spot:'door',title:'Monki is late for something.',after:'He missed it.'},
  {id:'m-helmet',actor:'monki',item:'helmet',mood:'happy',spot:'lamp',title:'Monki is on the lamp. In a helmet.',after:'Down safely.'},
  {id:'m-star',actor:'monki',item:'star',mood:'happy',title:'Monki has a star. From where.',after:'Put back. Nobody saw where.'},
  {id:'m-donut',actor:'monki',item:'donut',mood:'sleep',title:'Asleep in a doughnut.',after:'Awake. Doughnut missing.'},
  {id:'m-snowflake',actor:'monki',item:'snowflake',mood:'idle',title:'Monki caught a snowflake. Indoors.',after:'Gone.'},
  {id:'m-shell',actor:'monki',item:'shell',mood:'idle',spot:'bowl',title:'Monki is in the bowl. He is a crab now.',after:'A monkey again.'},
  {id:'m-umbrella',actor:'monki',item:'umbrella',mood:'idle',title:'It is not raining. Monki disagrees.',after:'Agreed to disagree.'},
  {id:'m-magnet',actor:'monki',item:'magnet',mood:'annoyed',spot:'radio',title:'Monki is stuck to the radio.',after:'Unstuck.'},
  {id:'m-pizza',actor:'monki',item:'pizza',mood:'happy',title:'Monki ordered a pizza.',after:'Monki ate a pizza.'},
  {id:'m-frog',actor:'monki',item:'frog',mood:'idle',title:'A frog is sitting on Monki. He is letting it.',after:'The frog had somewhere to be.'},
];
/** Where a spot is, in the house as it is today: the sofa wherever the sofa has got to. */
export function freshSpot(s,sit){
  // By kind: a radio somebody bought and put down counts as the radio.
  const at=id=>s.objects.find(o=>(o.id===id||o.type===id)&&o.room==='house');
  const o={couch:at('couch'),bowl:at('bowl'),lamp:at('lamp'),radio:at('radio'),plant:at('plant')};
  const point=(x,y)=>({x:Math.max(35,Math.min(365,x)),y:Math.max(171,Math.min(314,y))});
  switch(sit.spot){
    case 'couch':return o.couch&&point(o.couch.x+12,o.couch.y-10);
    case 'bowl':return o.bowl&&point(o.bowl.x,o.bowl.y+2);
    case 'lamp':return o.lamp&&point(o.lamp.x,o.lamp.y-50);
    case 'radio':return o.radio&&point(o.radio.x,o.radio.y-22);
    case 'plant':return o.plant&&point(o.plant.x,o.plant.y-14);
    case 'corner':return {x:52,y:292};
    case 'door':return {x:92,y:300};
    case 'rug':return {x:220,y:300};
    default:return null;
  }
}
// A daily situation is part of the house: the resident really is wearing the teacup, on
// both phones, until somebody pokes it or the day is over. Drawn on its owner's phone only,
// it put a different Galgan on each phone, and a dog the other one moved stayed put.
// Only the caption, the glitter and the poke that ends it belong to the owner.
function beginSituation(s,sit,now){
  const a=s.actors[sit.actor],spot=freshSpot(s,sit),was={hat:a.hat??null};
  // Anything a resident has on is yours too: the teacup is in the house now.
  unlock(s,sit.item);a.hat=sit.item;a.mood=sit.mood||a.mood;a.movedAt=now;
  if(spot)Object.assign(a,{room:'house',x:spot.x,y:spot.y});
  return was;
}
function endSituation(s,actor,{found=false}={}){
  const life=initLife(s),f=life.finds[actor];if(!f?.fresh)return null;
  const sit=FRESH.find(x=>x.id===f.fresh),a=sit&&s.actors[sit.actor];
  // Whatever it had on before comes back, unless somebody has dressed it since.
  if(a&&a.hat===sit.item)a.hat=f.was?.hat??null;
  if(a&&found)a.mood='happy';
  life.freshSeen??={};(life.freshSeen[actor]??=[]).push(f.fresh);
  delete life.finds[actor];
  return sit||null;
}
export const REACTIONS=['laugh','wow','love'];
const people=['david','julia'],residents=['monki','sernik','galgan'],actors=[...people,...residents];
const other=who=>who==='david'?'julia':'david';
const unlock=(s,item)=>{if(!s.inventory.includes(item))s.inventory.push(item);};
function entry(s,who,action,target,now,item){s.log.unshift({id:`life-${s.revision}-${now}`,who,action,target,at:now,item});s.log=s.log.slice(0,48);}
export function initLife(s){
  if(!s.life){
    s.life={finds:{},nextFind:{},serial:0,collection:[],setups:{},mail:[],postcards:[],plant:null};
    for(const g of s.gifts||[])s.life.mail.push({id:`gift:${g.id}`,kind:'gift',giftId:g.id,from:g.from,to:g.to,at:g.at,opened:g.opened});
    if(s.drawing?.length&&s.drawingBy)s.life.mail.push({id:`drawing:${s.drawingAt}`,kind:'drawing',from:s.drawingBy,to:other(s.drawingBy),at:s.drawingAt,lines:smallDrawing(s.drawing),opened:(s.received?.[other(s.drawingBy)]||0)>=s.drawingAt});
  }
  s.life.places??={};
  return s.life;
}
export function smallDrawing(lines){const total=lines.reduce((n,l)=>n+l.length,0),stride=Math.max(1,Math.ceil(total/700));return lines.map(l=>l.filter((_,i)=>i%stride===0||i===l.length-1)).filter(l=>l.length);}
export function addLetter(s,letter){
  const life=initLife(s);if(life.mail.some(m=>m.id===letter.id))return;
  if(life.mail.filter(m=>m.from===letter.from&&!m.opened).length>=12)throw new Error('There are a few things waiting already. Let your person open one first.');
  life.mail.unshift(letter);
  const saved=life.mail.filter(m=>m.opened&&(!m.reaction||m.reactionSeen)).slice(0,60),keep=new Set(saved.map(m=>m.id));
  life.mail=life.mail.filter(m=>!m.opened||(m.reaction&&!m.reactionSeen)||keep.has(m.id));
}
export function pendingMail(s,actor){
  return (s.life?.mail||[]).flatMap(m=>m.to===actor&&!m.opened?[{kind:m.kind,id:m.kind==='gift'?m.giftId:m.id,mailId:m.id,from:m.from}]:m.from===actor&&m.reaction&&!m.reactionSeen?[{kind:'reaction',id:m.id,mailId:m.id,from:m.to,reaction:m.reaction}]:[]);
}
export function buddy(s,actor){const all=residents.map(id=>[id,s.bond?.[actor]?.[id]||0]).sort((a,b)=>b[1]-a[1]);return all[0][1]>=3?all[0][0]:null;}
export function plantStage(s,now=Date.now()){const p=s.life?.plant;if(!p)return -1;return Math.min(4,Math.max(0,Math.floor((now-p.at)/(2*DAY))));}
// Test fixtures age timestamps, never change the computer clock or a real save.
export function ageSandbox(s,days){
  const delta=days*DAY,life=initLife(s);s.lastVisit-=delta;
  if(life.plant)life.plant.at-=delta;
  for(const key of Object.keys(life.setups))life.setups[key]-=delta;
  for(const key of Object.keys(life.nextFind))life.nextFind[key]-=delta;
  for(const a of Object.values(s.actors)){if(a.movedAt)a.movedAt-=delta;if(a.hatAt)a.hatAt-=delta;}
  for(const j of Object.values(s.journeys))if(j.lastAt)j.lastAt-=delta;
  for(const c of s.chains||[])c.at-=delta;
  if(s.fridgeAt)s.fridgeAt-=delta;
}
export function syncSetups(s,now){
  const life=initLife(s);
  for(const d of DISCOVERIES.filter(d=>d.setup)){
    const ready=s.objects.some(o=>o.type===d.setup.item&&o.room===d.setup.room);
    if(ready&&life.setups[d.id]===undefined)life.setups[d.id]=now;
    if(!ready)delete life.setups[d.id];
  }
}
export function advanceLife(s,actor,now){
  const life=initLife(s);syncSetups(s,now);
  // Nothing waits. A situation nobody touched is simply over by the next day, and
  // something else is going on instead. Waiting until it was dealt with put the same
  // card in front of her for weeks in the simulation — once, twenty-five openings running.
  const current=life.finds[actor];
  if(current?.fresh&&now>=(life.nextFind[actor]||0))endSituation(s,actor);
  // One begun by an earlier version was only ever drawn on its owner's phone: put it into the house.
  else if(current?.fresh&&!current.was){const sit=FRESH.find(x=>x.id===current.fresh);if(sit)current.was=beginSituation(s,sit,now);}
  if(life.finds[actor]||now<(life.nextFind[actor]||0)||!s.journeys?.[actor]?.index)return;
  // A rare visitor somebody set up for (paper left in the garden, and so on) still comes
  // first, and waits to be found: it was earned.
  const owned=new Set(life.collection.map(c=>c.discovery));
  const special=DISCOVERIES.find(d=>d.setup&&!owned.has(d.id)&&life.setups[d.id]!==undefined&&now-life.setups[d.id]>=d.setup.days*DAY);
  if(special){life.finds[actor]={id:`find-${life.serial++}`,discovery:special.id,actor:special.actor,at:now};life.nextFind[actor]=now+20*3600000;return;}
  // The same rhythm as before (one at most every twenty hours), but each one new: the
  // first not yet seen by this person, in an order of this world's own.
  life.freshSeen??={};const seen=new Set(life.freshSeen[actor]||[]);
  // Shuffled for this world, then taking turns between the three, so it is not Monki four days running.
  const mixed=who=>FRESH.filter(f=>f.actor===who).sort((a,b)=>roll(`${s.seed}:fresh:${a.id}`)-roll(`${s.seed}:fresh:${b.id}`));
  const lanes=['galgan','sernik','monki'].map(mixed),order=[];
  for(let i=0;order.length<FRESH.length;i++)for(const lane of lanes)if(lane[i])order.push(lane[i]);
  const offset=actor==='julia'?Math.floor(order.length/2):0,turned=[...order.slice(offset),...order.slice(0,offset)];
  // Never on the one the other person's situation already has on, nor on a hat stuck there for a day.
  const taken=new Set(Object.entries(life.finds).filter(([who,f])=>who!==actor&&f?.fresh).map(([,f])=>f.actor));
  // Not "stuck to the radio" in a house that has no radio yet: furniture arrives over time.
  const there=f=>!['couch','bowl','lamp','radio','plant'].includes(f.spot)||s.objects.some(o=>(o.id===f.spot||o.type===f.spot)&&o.room==='house');
  const pool=turned.filter(f=>!taken.has(f.actor)&&!(s.stuck?.[f.actor]>now)&&there(f));if(!pool.length)return;
  const sit=pool.find(f=>!seen.has(f.id))||pool[(life.serial||0)%pool.length];
  life.finds[actor]={id:`find-${life.serial++}`,fresh:sit.id,actor:sit.actor,at:now,was:beginSituation(s,sit,now)};
  life.nextFind[actor]=now+20*3600000;
}
const roll=(seed)=>{let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ((h>>>0)%10000)/10000;};
// Somewhere a dog has no business being. Position only; the art already copes.
const PERCHES={
  sernik:[[318,196,'on the shelf'],[147,277,'under the sofa'],[92,300,'behind the door']],
  galgan:[[196,183,'on top of the lamp'],[330,300,'in the bowl'],[60,290,'in the corner, facing it']],
  monki:[[56,192,'in the plant'],[336,188,'on the radio'],[220,300,'face down on the rug']],
};

export function routines(s,now,hour,items){
  // Only on a genuine return; never move something she just positioned herself.
  const h=Number.isInteger(hour)&&hour>=0&&hour<=23?hour:centralTime(now).hour;
  const busy=new Set(Object.values(s.life?.finds||{}).filter(f=>f?.fresh).map(f=>f.actor));
  for(const id of residents){
    if(busy.has(id))continue;
    const a=s.actors[id];if(now-(a.movedAt||0)<6*3600000)continue;
    let room='house',x=220,y=230,mood='idle';
    if(id==='sernik'){const bowl=s.objects.find(o=>o.id==='bowl');if(h<11){room=bowl?.room||'house';x=(bowl?.x||320)-25;y=bowl?.y||280;}else if(h<19&&s.unlocked.includes('garden')){room='garden';x=273;y=270;}else{x=147;y=277;mood='sleep';}}
    if(id==='galgan'){const sofa=s.objects.find(o=>o.id==='couch');room=sofa?.room||'house';x=(sofa?.x||120)+15;y=(sofa?.y||190)+22;mood=h>11?'sleep':'idle';}
    if(id==='monki'){if(h>=20&&s.unlocked.includes('roof')){room='roof';x=191;y=200;}else{x=167;y=194;}}
    // One day in three, it is somewhere daft instead of somewhere sensible.
    const day=Math.floor(now/86400000);
    if(roll(`${s.seed}:perch:${id}:${day}`)<0.34){
      const perches=PERCHES[id],pick=perches[Math.floor(roll(`${s.seed}:which:${id}:${day}`)*perches.length)];
      room='house';x=pick[0];y=pick[1];
    }
    Object.assign(a,{room,x:Math.max(35,Math.min(365,x)),y:Math.max(171,Math.min(314,y)),mood});
    // Something it helped itself to comes off again after a couple of days, so the
    // joke can turn up on somebody else. A hat she put there stays until she moves it.
    if(a.hatAt&&now-a.hatAt>2*DAY){a.hat=null;delete a.hatAt;}
    // Never two of them at once: a household in matching outfits reads as a bug,
    // and one animal in something daft is where the laugh actually is.
    if(items&&!a.hat&&!(s.stuck?.[id]>now)&&roll(`${s.seed}:hat:${id}:${day}`)<0.34){
      const worn=residents.map(r=>s.actors[r].hat).filter(Boolean);
      const hats=(s.inventory||[]).filter(i=>items[i]?.wearable&&!worn.includes(i));
      if(hats.length&&worn.length<1){a.hat=hats[Math.floor(roll(`${s.seed}:whichhat:${id}:${day}`)*hats.length)];a.hatAt=now;}
    }
  }
}
export function applyLifeOperation(s,op,now,items){
  const life=initLife(s),actor=op.actor;
  switch(op.type){
    case 'placeComplete':{
      if(!PLACE_STORIES[op.place]||!s.unlocked.includes(op.place==='sky'?'roof':'garden'))throw new Error('This place is not open yet');
      const story=placeStory(s,op.place);if(op.round!==story.round)break;
      life.places[op.place]={count:story.round+1,by:actor,at:now,item:story.reward};unlock(s,story.reward);
      s.actors[story.actor].mood='happy';entry(s,actor,'placePlay',story.actor,now,story.reward);break;
    }
    case 'collectFind':{
      const f=life.finds[actor];if(!f||f.id!==op.target)break;
      if(f.fresh){
        const sit=endSituation(s,actor,{found:true});life.nextFind[actor]=now+20*3600000;if(!sit)break;
        unlock(s,sit.item);
        life.collection.push({fresh:sit.id,who:actor,actor:sit.actor,item:sit.item,at:now});life.collection=life.collection.slice(-120);
        entry(s,actor,'discovery',sit.actor,now,sit.item);break;
      }
      const d=DISCOVERIES.find(d=>d.id===f.discovery);unlock(s,d.item);
      if(!life.collection.some(c=>c.discovery===d.id))life.collection.push({discovery:d.id,who:actor,actor:f.actor,at:now});
      s.actors[f.actor].mood='happy';delete life.finds[actor];life.nextFind[actor]=now+20*3600000;
      entry(s,actor,'discovery',f.actor,now,d.item);break;
    }
    case 'plantSeed':
      if(!['sun','moon','wild'].includes(op.seed))throw new Error('Choose a seed');
      if(life.plant)throw new Error('Something is already growing');
      life.plant={id:op.id,seed:op.seed,at:now,by:actor,picked:false};entry(s,actor,'plant','plant',now);break;
    case 'pickBloom':{
      if(!life.plant||life.plant.picked||plantStage(s,now)<4)break;
      const reward={sun:'flowercrown',moon:'star',wild:'mushroom'}[life.plant.seed];life.plant.picked=true;unlock(s,reward);
      entry(s,actor,'bloom','plant',now,reward);break;
    }
    case 'replant':
      if(!life.plant?.picked)throw new Error('Let this one grow first');life.plant=null;break;
    case 'walkWith':{
      if(!s.unlocked.includes(op.room))throw new Error('Not a room');
      // In the garden, in front of the pond and the growing bed rather than standing in them.
      const garden=op.room==='garden';
      const person=s.actors[actor];if(person.room!==op.room){
        const y=garden?309:286;
        const seats=garden?(actor==='julia'?[292,236,332,160]:[122,176,64,244]):actor==='julia'?[258,198,330,118]:[135,202,65,283];
        const present=Object.values(s.actors).filter(a=>a!==person&&a.room===op.room);
        const clear=x=>present.every(a=>Math.hypot(x-a.x,y-a.y)>=43);
        const x=seats.find(clear)??seats.reduce((best,x)=>{
          const gap=Math.min(...present.map(a=>Math.hypot(x-a.x,y-a.y)));
          return gap>best.gap?{x,gap}:best;
        },{x:seats[0],gap:-1}).x;
        Object.assign(person,{room:op.room,x,y,mood:'idle',movedAt:now,lastBy:actor});
      }
      const pal=buddy(s,actor);if(!pal)break;
      // The one in today's daft situation stays where it is staged until it is poked.
      if(Object.values(life.finds).some(f=>f?.fresh&&f.actor===pal))break;
      const a=s.actors[pal];if(now-(a.movedAt||0)<60000)break;
      a.room=op.room;a.x=actor==='julia'?(garden?250:300):(garden?160:90);a.y=garden?311:289;a.mood='happy';a.movedAt=now;break;
    }
    case 'postcard':{
      if(!actors.includes(op.portrait)||!['house','garden','night'].includes(op.scene)||!['idle','happy','sleep'].includes(op.pose)||(op.hat!==null&&(!items[op.hat]||!s.inventory.includes(op.hat))))throw new Error('Invalid postcard');
      if(life.postcards.length>=300)throw new Error('The postcard album is full. Save a picture to your phone.');
      const card={id:op.id,kind:'postcard',from:actor,to:other(actor),portrait:op.portrait,hat:op.hat,scene:op.scene,pose:op.pose,at:now,opened:false};
      life.postcards.unshift({...card});if(op.send===true)addLetter(s,card);entry(s,actor,'postcard',op.portrait,now);break;
    }
    case 'openLetter':{
      const m=life.mail.find(m=>m.id===op.target&&m.to===actor);if(!m||m.kind==='gift')throw new Error('This letter is not for you');m.opened=true;break;
    }
    case 'reactLetter':{
      const m=life.mail.find(m=>m.id===op.target&&m.to===actor);if(!m||!m.opened||!REACTIONS.includes(op.reaction))throw new Error('Open your letter first');
      if(!m.reaction){m.reaction=op.reaction;m.reactedAt=now;m.reactionSeen=false;entry(s,actor,'reaction',m.from,now,op.reaction);}break;
    }
    case 'readReaction':{
      const m=life.mail.find(m=>m.id===op.target&&m.from===actor);if(!m)throw new Error('Not your reaction');m.reactionSeen=true;break;
    }
    default:return false;
  }
  return true;
}

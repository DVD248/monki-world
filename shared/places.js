// Places are toys with a shared aftermath, not extra daily tasks.
import {centralTime} from './ambience.js';
export const WEATHER=['clear','cloudy','rain','wind','snow'];
export function weatherFor(state,now=Date.now()){
  let n=2166136261;for(const ch of `${state.seed}:${Math.floor(now/10800000)}`)n=Math.imul(n^ch.charCodeAt(0),16777619);
  // A September afternoon should not routinely become a blizzard. Weather is
  // fictional, but its season uses the same Central European clock as the light.
  const cold=[11,12,1,2,3,4].includes(centralTime(now).month);
  return (cold?['clear','clear','cloudy','rain','wind','snow']:['clear','clear','clear','cloudy','rain','wind'])[(n>>>0)%6];
}
const s=(kind,item,goal,title,hint)=>({kind,item,goal,title,hint});
export const PLACE_STORIES={
  pool:[
    {title:'The duck needs a lift.',actor:'sernik',item:'duck',reward:'duck',steps:[s('aim','duck',3,'Over here','Drag the duck toward the ring. Release.'),s('steer','boat',4,'A short crossing','Slide around the rocks.'),s('dress','shell',1,'A passenger','Put the shell on Sernik.')]},
    {title:'The fish has luggage.',actor:'galgan',item:'fish',reward:'shell',steps:[s('catch','shell',4,'Pack lightly','Catch the shells.'),s('sort','fish',5,'Fish. Not socks.','Fish left. Socks right.'),s('aim','fish',3,'All aboard','Drag toward the ring. Release.')]},
    {title:'The lily is a ferry.',actor:'monki',item:'lily',reward:'frog',steps:[s('find','frog',1,'One passenger','Watch the frog’s box.'),s('steer','lily',5,'Tiny captain','Slide past the rocks.'),s('feed','frog',3,'Going home','Drag from the frog. Aim at the dog. Release.')]},
  ],
  farm:[
    {title:'The mushrooms are escaping.',actor:'galgan',item:'mushroom',reward:'mushroom',steps:[s('catch','mushroom',4,'Catch the caps','Slide the basket.'),s('sort','mushroom',4,'Not a vegetable','Mushrooms left. Socks right.'),s('dress','mushroom',1,'One found a home','Put the cap on Galgan.')]},
    {title:'Monki planted lunch.',actor:'monki',item:'carrot',reward:'flower',steps:[s('trail','carrot',6,'Follow the sprouts','Touch the spots in order.'),s('stack','carrot',3,'A tall lunch','Drop when it lines up.'),s('feed','carrot',3,'The inspector','Drag from the carrot. Aim. Release.')]},
    {title:'The flowers hum.',actor:'julia',item:'flower',reward:'flowercrown',steps:[s('sequence','flower',3,'A tiny tune','Listen with your eyes. Repeat.'),s('pop','flower',5,'Seeds everywhere','Tap the floating flowers.'),s('dress','flowercrown',1,'Wear the garden','Put the flowers on Julia.')]},
  ],
  hut:[
    {title:'Someone is in there.',actor:'galgan',item:'sock',reward:'sock',steps:[s('find','monki',1,'Not a dog','Watch Monki’s box.'),s('match','sock',3,'Borrowed socks','Match the pairs.'),s('dress','sock',1,'Evidence','Put the sock on Galgan.')]},
    {title:'The guest brought a box.',actor:'sernik',item:'present',reward:'beret',steps:[s('find','frog',1,'A visitor','Follow the frog’s box.'),s('feed','icecream',3,'Make yourself at home','Drag from the ice cream. Aim. Release.'),s('dress','beret',1,'The new tenant','Put the beret on Sernik.')]},
    {title:'Galgan opened a hotel.',actor:'galgan',item:'nightcap',reward:'nightcap',steps:[s('sort','nightcap',4,'Room service','Hats left. Socks right.'),s('stack','teacup',3,'A bed, apparently','Tap when the cups line up.'),s('dress','nightcap',1,'Fully booked','Put the cap on Galgan.')]},
  ],
  sky:[
    {title:'A star is stuck.',actor:'monki',item:'star',reward:'star',steps:[s('trail','star',6,'Join the sky','Follow the stars in order.'),s('pull','star',2,'A little tug','Hold. Release in the light.'),s('dress','star',1,'Pocket universe','Put the star on Monki.')]},
    {title:'Laundry in orbit.',actor:'david',item:'sock',reward:'moon',steps:[s('aim','sock',3,'Send it back','Drag toward the ring. Release.'),s('catch','star',5,'Loose stars','Slide the basket.'),s('dress','moon',1,'A moon helmet','Put the moon on David.')]},
    {title:'The clouds have buttons.',actor:'julia',item:'cloud',reward:'rainhat',steps:[s('sequence','star',3,'Sky code','Watch the lights. Repeat.'),s('pop','cloud',5,'Open a window','Tap the small clouds.'),s('dress','rainhat',1,'Forecast: hat','Put the hat on Julia.')]},
  ],
};
export function placeStory(state,place){
  const n=state.life?.places?.[place]?.count||0,pool=PLACE_STORIES[place];if(!pool)return null;
  const def=pool[n%pool.length];return {...def,id:`place-${place}-${n%pool.length}`,place,round:n,index:-1,difficulty:Math.min(1,n/14),edition:Math.floor(n/3),variant:['plain','wind','bubbles','bounce'][Math.floor(n/3)%4],ready:true,room:place==='sky'?'roof':'garden',theme:place==='sky'?'space':place==='pool'?'water':'garden',color:'#cfddbe',ending:def.title,detail:'Something here is a little different now.',souvenir:def.reward};
}

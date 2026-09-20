// A situation earns its strangeness: show the cause, let a finger change it,
// then show the result. The rules never change without a visible explanation.
export const ADVENTURES = [
  { id:'up', title:'Monki is leaving.', subtitle:'The balloons were a bad idea.', actor:'monki', item:'balloon', reward:'cone', souvenir:'ball', room:'house', color:'#efc7a1',
    steps:[
      {kind:'pop',title:'Bring him down',hint:'Tap the balloons',goal:3,item:'balloon'},
      {kind:'dress',title:'He found a hat',hint:'Drag the cone onto Monki',goal:1,item:'cone'},
      {kind:'feed',title:'Sernik took it',hint:'Tap Sernik to trade ice cream',goal:3,item:'icecream'},
    ],ending:'A very normal hat.',detail:'The cone stays. Sernik has the ice cream.' },
  { id:'boat',title:'The sofa is a boat.',subtitle:'Galgan has already boarded.',actor:'galgan',item:'couch',reward:'duck',souvenir:'boat',room:'garden',color:'#c3dce0',
    steps:[
      {kind:'wipe',title:'A small leak',hint:'Swipe the water out',goal:7,item:'fish'},
      {kind:'dress',title:'Choose the captain',hint:'Drag the duck onto Galgan',goal:1,item:'duck'},
      {kind:'steer',title:'Off they go',hint:'Drag the boat around the rocks',goal:6,item:'couch'},
    ],ending:'Captain Galgan.',detail:'A tiny boat now lives in the garden.' },
  { id:'laundry',title:'Someone opened the laundry.',subtitle:'Sernik is extremely involved.',actor:'sernik',item:'sock',reward:'sock',souvenir:'kite',room:'house',color:'#e4cfe0',
    steps:[
      {kind:'catch',title:'Not the good socks',hint:'Slide the basket to catch them',goal:5,item:'sock'},
      {kind:'dress',title:'One left over',hint:'Drag the sock onto Sernik',goal:1,item:'sock'},
      {kind:'pop',title:'Now they can fly',hint:'Tap the flying socks',goal:5,item:'sock'},
    ],ending:'One sock. Two ears.',detail:'Sernik keeps the sock. The kite is yours.' },
  { id:'moon-trip',title:'Monki wants that one.',subtitle:'Unfortunately, it is the moon.',actor:'monki',item:'moon',reward:'moon',souvenir:'telescope',room:'roof',color:'#cbd4e8',
    steps:[
      {kind:'pull',title:'A little closer',hint:'Hold to pull. Release in the light.',goal:2,item:'moon'},
      {kind:'dress',title:'It is smaller up close',hint:'Drag the moon onto Monki',goal:1,item:'moon'},
      {kind:'catch',title:'The stars followed',hint:'Slide the basket to catch them',goal:5,item:'star'},
    ],ending:'The moon fits.',detail:'There is a telescope on the roof now.' },
  { id:'frog-guest',title:'A visitor.',subtitle:'Nobody invited him.',actor:'galgan',item:'frog',reward:'frog',souvenir:'lily',room:'garden',color:'#c9dfad',
    steps:[
      {kind:'find',title:'He was just here',hint:'Watch the frog. Tap his box.',goal:1,item:'frog'},
      {kind:'feed',title:'He brought friends',hint:'Tap Galgan to send them over',goal:4,item:'frog'},
      {kind:'dress',title:'One is staying',hint:'Drag the frog onto Galgan',goal:1,item:'frog'},
    ],ending:'The visitor stays.',detail:'A frog. A dog. An arrangement.' },
  { id:'cloud',title:'Weather under the sofa.',subtitle:'Only in this one spot.',actor:'sernik',item:'flower',reward:'flower',souvenir:'rainbow',room:'house',color:'#d2e0d4',
    steps:[
      {kind:'wipe',title:'Where is Sernik?',hint:'Swipe the clouds away',goal:8,item:'cloud'},
      {kind:'pop',title:'Personal rainstorm',hint:'Tap the falling drops',goal:5,item:'drop'},
      {kind:'dress',title:'Something grew',hint:'Drag the flower onto Sernik',goal:1,item:'flower'},
    ],ending:'Local weather.',detail:'The flower is staying. So is the rainbow.' },
];
/** A chapter a day. Twenty hours rather than twenty-four so playing a little
 * earlier each evening never pushes tomorrow's out of reach. */
export const CHAPTER_GAP = 20 * 3600000;
export function adventureFor(state,actor,now=Date.now()){
  const journey=state.journeys?.[actor]||{index:0};
  const index=journey.index,done=index>=ADVENTURES.length;
  const chapter=ADVENTURES[Math.min(index,ADVENTURES.length-1)];
  const nextAt=(journey.lastAt||0)+CHAPTER_GAP;
  return {...chapter,index,done,nextAt,ready:!done&&now>=nextAt};
}
export function journeyFields(state){
  state.journeys??={david:{index:0},julia:{index:0}};
  for(const actor of ['david','julia'])state.journeys[actor]??={index:0};
  state.moments??=[];state.toys??=['paper','bubbles'];state.decor??=[];
  return state;
}

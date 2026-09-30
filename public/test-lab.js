import {ADVENTURES,VARIATIONS,VARIANT_LABELS,featuredStepFor} from './shared/adventures.js';
import {ITEMS,ACTORS,NAMES,applyOperation,prepareWorld} from './shared/world.js';
import {spriteCanvas} from './art.js';
import {DISCOVERIES,DAY,initLife,ageSandbox} from './shared/life.js';
import {WEATHER,PLACE_STORIES,placeStory} from './shared/places.js';
import {ambienceAt} from './shared/ambience.js';
import {ambientScenes} from './ambient-life.js';
import {DECOR_STYLES} from './shared/decor.js';
import {ARCADE_GAMES,amount} from './shared/arcade.js';
import {ARCADE_ZONES} from './arcade.js';
const KEY='monki-test-checks-v1';
export function recordCheck(chapter,step){try{const checks=JSON.parse(localStorage.getItem(KEY)||'{}');checks[`${chapter.id}:${chapter.variant||'plain'}:${step}`]=Date.now();localStorage.setItem(KEY,JSON.stringify(checks));}catch{}}
export function testLab({body,store,scene,play,arcade,reset,goTo}){
  let checks={};try{checks=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{}
  const p=document.createElement('p');p.textContent='Sandbox only. No shared saves, gifts or progress are touched. A check appears only after you actually complete a segment.';body.append(p);
  const count=document.createElement('p');count.textContent=`${Object.keys(checks).length} / ${ADVENTURES.length*3*VARIATIONS.length} segment variations checked on this device.`;body.append(count);
  const tools=document.createElement('div');tools.className='button-row';
  const button=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.className='secondary-button';b.onclick=fn;return b;};
  tools.append(button('Fresh sandbox',reset),button('Room + toys',()=>document.getElementById('sheet').close()),button('Switch player',()=>{store.local.actor=store.actor==='david'?'julia':'david';store.save();p.textContent=`Sandbox player: ${NAMES[store.actor]}.`;}),button('Simulate a week away',()=>{ageSandbox(store.state,7);store.local.lastVisitSent=0;store.visit();p.textContent='One week simulated: plant, visitor setups, adventures and delayed surprises.';}),button('Gift from partner',()=>{const actor=store.actor==='david'?'julia':'david';store.local.world=applyOperation(store.state,{id:crypto.randomUUID(),type:'gift',item:'cone',actor});store.save();document.getElementById('sheet').close();}));body.append(tools);
  const playable=Object.values(ARCADE_GAMES).filter(game=>ARCADE_ZONES[game.id]);
  const games=document.createElement('details'),gamesTitle=document.createElement('summary');gamesTitle.textContent=`Arcade · all ${playable.length} games, from any stage`;games.append(gamesTitle);body.append(games);
  for(const game of playable)for(const [from,name] of ARCADE_ZONES[game.id])games.append(button(`${game.title} · ${name}${from?` · from ${amount(game.id,from)}`:''}`,()=>arcade(game.id,from)));
  const label=document.createElement('label');label.textContent='Variation ';const variant=document.createElement('select');variant.id='test-variant';for(const v of VARIATIONS){const option=document.createElement('option');option.value=v;option.textContent=v==='plain'?'Original':VARIANT_LABELS[v];variant.append(option);}label.append(variant);body.append(label);
  const fixtures=document.createElement('details');const fs=document.createElement('summary');fs.textContent='World tests · weather, discoveries, letters, growing patch';fixtures.append(fs);body.append(fixtures);
  const fixture=(label,fn)=>fixtures.append(button(label,()=>{initLife(store.state);fn(store.state);store.save();document.getElementById('sheet').close();}));
  const partner=()=>store.actor==='david'?'julia':'david';
  for(const w of WEATHER)fixture(`Weather: ${w}`,()=>{scene.weatherOverride=w;});
  fixture('Weather: automatic',()=>{scene.weatherOverride=null;});
  for(const level of [0,1,12,24,28,82,144])fixture(`Decor unlocked after ${level} adventures`,s=>{s.completed=level;for(const journey of Object.values(s.journeys))journey.index=level;});
  for(const name of ['Dawn','Morning','Midday','Afternoon','Dusk','Night'])fixture(`Time: ${name}`,()=>{const a=ambienceAt(),noon=(a.rise+a.set)/2,hour={Dawn:a.rise,Morning:(a.rise+noon)/2,Midday:noon,Afternoon:(noon+a.set)/2,Dusk:a.set,Night:0}[name];scene.timeOverride=hour;scene.ambience=ambienceAt(Date.now(),hour);scene.night=scene.ambience.night;});
  fixture('Time: Central European live',()=>{scene.timeOverride=null;scene.ambience=ambienceAt();scene.night=scene.ambience.night;});
  for(const d of DISCOVERIES)fixture(`Discovery: ${d.id}`,s=>{s.life.finds[store.actor]={id:crypto.randomUUID(),discovery:d.id,actor:d.actor,at:Date.now()};});
  for(let stage=0;stage<=4;stage++)fixture(`Growing patch: stage ${stage}`,s=>{s.life.plant={id:'test-plant',seed:'wild',at:Date.now()-stage*2*DAY,by:partner(),picked:false};});
  fixture('Mailbox: drawing from partner',s=>{store.local.world=applyOperation(s,{id:crypto.randomUUID(),actor:partner(),type:'draw',lines:[[[.2,.8],[.5,.1],[.8,.8],[.2,.8]]]});});
  fixture('Mailbox: postcard from partner',s=>{store.local.world=applyOperation(s,{id:crypto.randomUUID(),actor:partner(),type:'postcard',portrait:'monki',hat:'cone',pose:'happy',scene:'night',send:true});});
  fixture('Mailbox: reaction from partner',s=>{s.life.mail.unshift({id:crypto.randomUUID(),kind:'postcard',from:store.actor,to:partner(),portrait:'sernik',hat:'bow',pose:'happy',scene:'garden',at:Date.now(),opened:true,reaction:'laugh',reactionSeen:false});});
  fixture('Bonded Sernik',s=>{s.bond[store.actor].sernik=25;s.actors.sernik.movedAt=0;});
  for(const pose of ['Sleeping','Belly-up'])fixture(`Dogs: ${pose} with berets`,s=>{for(const id of ['sernik','galgan']){const a=s.actors[id];a.room=scene.room;a.hat='beret';a.petAt=0;a.mood=pose==='Sleeping'?'sleep':'happy';delete scene.petEffects[id];if(pose==='Belly-up')scene.petEffects[id]={at:performance.now(),power:1};}});
  for(const item of ['glasses','headphones','helmet'])fixture(`Outfits: ${ITEMS[item].name} on everyone`,s=>{for(const id of ACTORS){s.actors[id].hat=item;s.actors[id].room=scene.room;}});
  fixture('Cleanup: visiting helpers',s=>{scene.toys.clear();scene.stopTidy();const away=scene.room==='house'?'garden':'house';for(const id of ACTORS)s.actors[id].room=[store.actor,'monki'].includes(id)?scene.room:away;const couch=s.objects.find(o=>o.id==='couch');if(couch){couch.room=scene.room;couch.x=275;couch.y=275;}});
  fixture('Residents: repair a piled-up save',s=>{scene.toys.clear();scene.stopTidy();for(const a of Object.values(s.actors)){a.room=scene.room;a.x=200;a.y=250;}store.local.world=prepareWorld(s);});
  fixture('Residents: close together',s=>{scene.toys.clear();scene.stopTidy();Object.assign(s.actors.david,{room:scene.room,x:200,y:250});Object.assign(s.actors.julia,{room:scene.room,x:212,y:250});});
  fixture('Residents: notice new furniture',s=>{scene.ambient.active=null;s.actors.monki.room=scene.room;s.objects.push({id:`test-new-${crypto.randomUUID()}`,type:'stool',room:scene.room,x:262,y:259});});
  fixture('Residents: notice a changed surface',s=>{scene.ambient.active=null;s.actors.monki.room=scene.room;const surface=Object.keys(DECOR_STYLES[scene.room])[0],choices=DECOR_STYLES[scene.room][surface];s.catalog.styles[scene.room][surface]=choices.find(choice=>choice.id!==s.catalog.styles[scene.room][surface]).id;});
  fixture('Fridge: empty freezer',s=>{s.fridgeBox.batch=null;});
  fixture('Fridge: gift from partner',s=>{s.fridgeBox.batch={id:crypto.randomUUID(),ingredients:['fish','icecream'],result:'duck',by:partner(),for:store.actor,at:Date.now()};});
  for(const [place,stories]of Object.entries(PLACE_STORIES))for(let i=0;i<stories.length;i++)fixture(`Place: ${place} · ${i+1}`,s=>{s.life.places[place]={count:i};});
  const ambient=document.createElement('details'),ambientTitle=document.createElement('summary');ambientTitle.textContent='Live character scenes · preview every ambient event';ambient.append(ambientTitle);body.append(ambient);
  const stage=(s,room)=>{for(const [id,y] of Object.entries({david:259,julia:253,monki:246,sernik:282,galgan:289})){s.actors[id].room=room;if(room!=='house')s.actors[id].y=y;}};
  for(const room of ['house','garden','roof','cellar']){
    const draft=structuredClone(store.state);stage(draft,room);
    for(const spec of ambientScenes(draft,room))ambient.append(button(`${room} · ${spec.id.replaceAll('-',' ')}`,()=>{
      stage(store.state,room);
      store.save();goTo(room);document.getElementById('sheet').close();
      scene.ambient.force(spec.id,store.state,room);
    }));
  }
  const outdoors=document.createElement('details'),outTitle=document.createElement('summary');outTitle.textContent='Outdoor stories · all 36 segments';outdoors.append(outTitle);body.append(outdoors);
  for(const [place,stories]of Object.entries(PLACE_STORIES))for(let n=0;n<stories.length;n++)for(let step=0;step<3;step++){
    outdoors.append(button(`${place} ${n+1} · ${stories[n].steps[step].kind}`,()=>{const draft=structuredClone(store.state);draft.life.places[place]={count:n};const c=placeStory(draft,place);delete c.place;play(c,step);}));
  }
  const paceLabel=document.createElement('label');paceLabel.textContent=' Pace ';const pace=document.createElement('select');pace.id='test-pace';for(const [v,name]of [['auto','Natural progression'],['0','Tutorial'],['1','Later adventures']]){const o=document.createElement('option');o.value=v;o.textContent=name;pace.append(o);}paceLabel.append(pace);body.append(paceLabel);
  const list=document.createElement('div');list.className='test-list';body.append(list);
  const search=document.createElement('input');search.type='search';search.placeholder='Find an adventure or mechanic';search.setAttribute('aria-label','Filter adventure tests');search.className='share-link';body.insertBefore(search,list);search.oninput=()=>{for(const card of list.children)card.hidden=!card.textContent.toLowerCase().includes(search.value.toLowerCase());};
  function draw(){list.replaceChildren();for(const [index,chapter]of ADVENTURES.entries()){
    const card=document.createElement('section');card.className='test-case';const h=document.createElement('h3');h.textContent=`${index+1}. ${chapter.title}`;card.append(h);
    const chapterConfig=()=>({...chapter,index:index+VARIATIONS.indexOf(variant.value)*ADVENTURES.length,difficulty:pace.value==='auto'?undefined:Number(pace.value),edition:VARIATIONS.indexOf(variant.value),variant:variant.value,ready:true});
    card.append(button('Play normal short encounter',()=>play({...chapterConfig(),singleStep:true},featuredStepFor(chapter))));
    const whole=button('Play full adventure',()=>play(chapterConfig(),0));card.append(whole);
    chapter.steps.forEach((s,step)=>{const passed=checks[`${chapter.id}:${variant.value}:${step}`];const b=button(`${passed?'✓ ':''}${step+1}. ${s.title} · ${s.kind}`,()=>play(chapterConfig(),step));b.dataset.testChapter=chapter.id;b.dataset.testStep=step;card.append(b);});list.append(card);
  }}variant.onchange=draw;draw();
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='All item previews — check for clipping';details.append(summary);const grid=document.createElement('div');grid.className='item-grid';for(const id of [...ACTORS,...Object.keys(ITEMS)]){const cell=document.createElement('div');cell.className='collection-item';cell.append(spriteCanvas(id,72,{hat:ACTORS.includes(id)?'umbrella':null}),document.createTextNode(NAMES[id]||ITEMS[id].name));grid.append(cell);}details.append(grid);body.append(details);
}

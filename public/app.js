import {Store} from './store.js';
import {Scene} from './scene.js';
import {AdventurePlayer} from './adventure-player.js';
import {Sounds} from './audio.js';
import {icon,spriteCanvas,character,item,rect,fillSprite} from './art.js';
import {ACTORS,NAMES,ITEMS,other,createWorld,clamp,favourite,waitingFor} from './shared/world.js';
import {ADVENTURES,adventureFor} from './shared/adventures.js';

const $=id=>document.getElementById(id);
const store=new Store(),sounds=new Sounds();
let room='house',selectedItem=null,game=null,sheetKind=null,toastTimer,tipTimer,nightMode='auto',lastRevision=-1,lastCompleted=0;
const sheet=$('sheet'),body=$('sheet-body'),menu=$('interaction-menu');
const scene=new Scene($('world'),{onTap:tap,onMove:(point,place)=>{operate('move',{target:point.id,x:point.x,y:point.y,room:place});sounds.play('drop');hideMenu();},onDoor:goTo,onFrame:drawSheet,onFridge:fridgeSheet,onIncident:startIncident,onGift:giftSheet,onHold:hold,onPop:who=>{sounds.play('pop');if(who)setTimeout(()=>sounds.play(who),90);}});

function button(label,className,fn){const b=document.createElement('button');b.className=className;b.textContent=label;b.addEventListener('click',fn);return b;}
function pict(id,options){return spriteCanvas(id,48,options);}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3300);}
function tip(message,ms=3500){$('scene-tip').textContent=message;$('scene-tip').classList.add('visible');clearTimeout(tipTimer);tipTimer=setTimeout(()=>$('scene-tip').classList.remove('visible'),ms);}
function hideMenu(){menu.hidden=true;scene.selected=null;}
function showSheet(kind,title,eyebrow='MONKI WORLD'){
  hideMenu();sheetKind=kind;$('sheet-eyebrow').textContent=eyebrow;body.replaceChildren();
  if(title){const h=document.createElement('h2');h.textContent=title;body.append(h);}if(!sheet.open)sheet.showModal();
}
function closeSheet(){sheet.close();sheetKind=null;}
function paragraph(text,cls=''){const p=document.createElement('p');p.textContent=text;p.className=cls;body.append(p);return p;}
function operate(type,fields={}){try{return store.op(type,fields);}catch(error){toast(error.message);return null;}}
function relative(at){const mins=Math.max(0,Math.floor((Date.now()-at)/60000));return mins<1?'just now':mins<60?`${mins}m ago`:mins<1440?`${Math.floor(mins/60)}h ago`:`${Math.floor(mins/1440)}d ago`;}
function describe(entry){
  const who=NAMES[entry.who]||'Someone',target=NAMES[entry.target]||ITEMS[entry.target]?.name||'something',thing=ITEMS[entry.item]?.name||'something';
  const actions={wear:`put ${thing} on ${target}`,move:`moved ${target}`,out:`took ${target} outside`,take:`borrowed ${target}`,eat:'found a snack',sleep:'fell asleep',dig:'dug a little hole',build:'moved things around',guard:`is watching ${target}`,hide:`hid ${target}`,find:`found ${target}`,gift:`left a present for ${target}`,open:'opened a present',draw:'left a drawing on the wall',play:'made a small mess',match:'picked the same frog',mismatch:'picked different frogs',place:`put down ${thing}`,grow:'found somewhere new',toy:entry.item==='bubbles'?'blew some bubbles':'gave Sernik the toilet paper',tidy:'put the loose things away',adventure:'added a picture to Moments',poke:`poked ${target}${entry.count>1?` ×${entry.count}`:''}`};
  return `${who} ${actions[entry.action]||'was here'}.`;
}
function draftKey(){return `monki-adventure:${store.local.room||'solo'}:${store.actor}`;}
function readDraft(chapter){try{const d=JSON.parse(localStorage.getItem(draftKey()));return d?.index===chapter.index?d.step:0;}catch{return 0;}}

function render(){
  const state=store.state||createWorld('preview');
  const chapter=adventureFor(state,store.actor||'david');
  // Nothing beckons in the room on a day with no chapter in it.
  const preview=chapter.ready?{id:chapter.id==='up'?'balloons':chapter.id,uid:'adventure',actor:chapter.actor,room:state.unlocked.includes(chapter.room)?chapter.room:'house',kind:'tap',item:chapter.item,aftermath:chapter.id==='up'?'balloons':null}:null;
  scene.update({...state,incident:preview},room,store.actor||'david');
  const resting=!chapter.ready;
  $('story-kicker').textContent=chapter.done?'THAT IS ALL OF THEM':resting?'NOT TODAY':chapter.index===0?'SOMETHING IS HAPPENING':'A SMALL ADVENTURE';
  // Tomorrow's title is not given away today.
  $('story-title').textContent=chapter.done?'Everyone is having a lie down.':resting?'Nothing is happening.':chapter.title;
  $('story-subtitle').textContent=chapter.done?'The house is yours to mess about with.':resting?'Something else tomorrow. The house is still here.':chapter.subtitle;
  $('start-adventure').disabled=resting;
  $('start-adventure').textContent=resting?(chapter.done?'Done':'Tomorrow'):readDraft(chapter)>0?'Resume':'Play';
  const art=$('story-art').getContext('2d');art.clearRect(0,0,105,90);
  if(resting){character(art,'galgan',51,83,{scale:1.6,mood:'sleep'});}
  else{character(art,chapter.actor,51,83,{scale:1.6});item(art,chapter.item,78,34,{scale:1.15});}
  $('connection').textContent=!store.actor?'a little world':store.saveError?'storage is full':store.connected?(store.online?(store.paired?'our world · saved':'saved · invite your person'):'saved on this device'):'on this device';
  $('status-dot').classList.toggle('offline',!!store.actor&&(!store.online||store.saveError));
  const titles={house:'Home',garden:'Garden',roof:'Roof',cellar:'?'};
  $('locations').replaceChildren();
  // Somewhere you cannot go yet is not shown at all. Nothing counts down to it.
  for(const place of ['house','garden','roof','cellar'].filter(p=>state.unlocked.includes(p))){
    const b=button('','place-tab'+(room===place?' active':'')+(state.incident?.room===place?' incident':''),()=>goTo(place));
    b.innerHTML=icon(place)+`<span>${titles[place]}</span>`;b.setAttribute('aria-label',titles[place]);b.setAttribute('aria-current',room===place?'location':'false');$('locations').append(b);
  }
  $('residents').replaceChildren();
  for(const id of ACTORS){const b=button('','resident'+(store.actor===id?' you':''),()=>residentSheet(id));b.title=NAMES[id];b.setAttribute('aria-label',NAMES[id]);b.append(pict(id,{hat:state.actors[id].hat}));$('residents').append(b);}
  $('pocket').replaceChildren();
  for(const id of state.inventory.slice(0,5)){const b=button('','pocket-item'+(selectedItem===id?' selected':''),()=>itemSheet(id));b.title=ITEMS[id].name;b.setAttribute('aria-label',ITEMS[id].name);b.append(pict(id));$('pocket').append(b);}
  const plus=button('+','pocket-item plus',collectionSheet);plus.setAttribute('aria-label','All little things');$('pocket').append(plus);
  const incoming=state.gifts.find(g=>g.to===store.actor&&!g.opened),last=state.log[0];
  const img=$('trace-image');
  if(incoming){img.replaceChildren(pict('present'));$('trace-label').textContent=`${NAMES[incoming.from]} left you a present. Tap to open.`;}
  else if(last){img.replaceChildren(pict(last.who in NAMES?last.who:'monki'));$('trace-label').textContent=describe(last);}
  else{img.replaceChildren(pict(other(store.actor||'david')));$('trace-label').textContent=`Leave something for ${NAMES[other(store.actor||'david')]}.`;}
  lastCompleted=state.completed;lastRevision=state.revision;
  if(sheetKind==='together')togetherSheet();
  if(sheetKind==='history')historySheet();
}

/** Opening the game is the diff. Anything that moved since she last looked plays
 * back in the room, then her marker advances. If nothing moved, nothing happens. */
/** The opening moment, in priority order. She is handed things; she is never asked
 * to work out what is different. Something from him beats the room's own news,
 * and if there is neither, nothing happens at all. */
function openingMoment(){
  const st=store.state;
  if(!st||!store.actor||scene.replaying||game||sheet.open)return;
  const waiting=waitingFor(st,store.actor);
  if(waiting.length){arrivalSheet(waiting[0]);return;}
  playCatchUp();
  // Whoever she has petted most is pleased to see her. No number, no label.
  const pal=favourite(st,store.actor);
  if(pal&&!scene.replaying)scene.react(pal);
}

/** One thing, from one person, taken in one tap. */
function arrivalSheet(item){
  const from=item.from;
  showSheet('arrival','');
  const header=document.createElement('div');header.className='result-picks';
  header.append(pict(from));const arrow=document.createElement('span');arrow.textContent='→';
  header.append(arrow,pict(store.actor));body.append(header);
  if(item.kind==='gift'){
    const b=button('','reveal-gift full',async()=>{
      b.disabled=true;sounds.play('gift');
      if(!operate('openGift',{target:item.id}))return;
      operate('received');
      await store.sync();
      const opened=store.state.gifts.find(g=>g.id===item.id);
      if(opened?.item)showGiftResult(opened.item);else closeSheet();
    });
    b.append(pict('present'));body.append(b);
    return;
  }
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=206;canvas.className='draw-pad';
  const c=canvas.getContext('2d');c.strokeStyle='#61713f';c.lineWidth=2.5;c.lineCap='round';c.lineJoin='round';
  for(const line of store.state.drawing){c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(x*300,y*206):c.moveTo(x*300,y*206));c.stroke();}
  body.append(canvas);
  const ok=button('','primary-button full',()=>{operate('received');closeSheet();sounds.play('pop');});
  ok.innerHTML=icon('check');body.append(ok);
}

function playCatchUp(){
  const st=store.state;
  if(!st||!store.actor||scene.replaying||game)return;
  const since=st.seen?.[store.actor]??0;
  // Only what someone else did. Replaying your own drag back at you rewinds it to
  // where it started and slides it in again, which reads as the game glitching.
  const unseen=(st.changes||[]).filter(c=>c.at>since&&c.who!==store.actor);
  if(!unseen.length)return;
  const items=unseen.flatMap(c=>[
    ...c.moves.map(m=>({...m,who:c.who})),
    ...c.traces.map(tr=>({kind:'trace',trace:tr,who:c.who})),
  ]);
  const where=it=>it.to?.room||it.from?.room||it.trace?.room;
  const tally={};
  for(const it of items){const r=where(it);if(r&&st.unlocked.includes(r))tally[r]=(tally[r]||0)+1;}
  const busiest=Object.entries(tally).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const here=items.filter(it=>where(it)===(busiest||room)).slice(-12);
  if(!here.length){operate('seen');return;}
  if(busiest&&busiest!==room){room=busiest;selectedItem=null;hideMenu();}
  render();
  scene.startReplay(here,()=>{operate('seen');render();});
}

function clock(){const date=new Date();scene.night=nightMode==='night'||nightMode==='auto'&&(date.getHours()<7||date.getHours()>=20);}
function goTo(place){
  if(!store.state)return;
  if(!store.state.unlocked.includes(place)){sounds.play('boop');tip(place==='garden'?'locked. for now.':'not quite yet.');return;}
  room=place;selectedItem=null;hideMenu();render();sounds.play('tap');
}
/** A tap is always just a reaction. Opening a menu when she touches her own dog is
 * the difference between a toy and a file browser. Anything else is a long press. */
function tap(id,point){
  if(!store.state){welcome();return;}
  hideMenu();
  if(!id){if(selectedItem){operate('place',{item:selectedItem,room});selectedItem=null;render();}return;}
  if(selectedItem&&ACTORS.includes(id)&&ITEMS[selectedItem]?.wearable){
    operate('wear',{target:id,item:selectedItem});scene.react(id);selectedItem=null;render();sounds.play('gift');return;
  }
  if(ACTORS.includes(id)){
    const n=scene.react(id);
    operate('poke',{target:id});
    sounds.play(id);
    // Pestered enough times in a row and they simply go somewhere else.
    if(n>=5){
      const a=store.state.actors[id];
      operate('move',{target:id,x:clamp(a.x+(Math.random()<.5?-95:95),40,360),y:clamp(a.y+(Math.random()-.5)*44,175,310),room});
      sounds.play('throw');
    }
    render();return;
  }
  const object=store.state.objects.find(o=>o.id===id);
  if(!object)return;
  if(object.type==='radio'){sounds.toggle();updateSound();scene.react(id,'radio');render();return;}
  scene.react(id,object.type);sounds.play(object.type==='couch'||object.type==='plant'?'wood':'tap');render();
}

/** Holding something is how you ask for its options. */
function hold(id,point){
  if(!store.state||!id)return;
  if(store.actor&&id===other(store.actor)){personSheet();return;}
  if(ACTORS.includes(id)){residentSheet(id);return;}
  const object=store.state.objects.find(o=>o.id===id);
  if(object)furnitureSheet(object);
}

/** Anything that has wandered into another room can be sent back from here. */
function furnitureSheet(object){
  showSheet('furniture','');
  const picture=pict(object.type);picture.className='big-item';body.append(picture);
  const titles={house:'Home',garden:'Garden',roof:'Roof',cellar:'Down there'};
  const elsewhere=store.state.unlocked.filter(r=>r!==object.room);
  if(!elsewhere.length){paragraph('Hold and drag to move it around.');return;}
  const row=document.createElement('div');row.className='surprise-row';
  for(const place of elsewhere){
    const b=button('','surprise-card',()=>{
      operate('sendTo',{target:object.id,room:place});
      closeSheet();sounds.play('drop');render();
    });
    const glyph=document.createElement('strong');glyph.innerHTML=icon(place);
    b.append(glyph);b.setAttribute('aria-label',`Send the ${ITEMS[object.type]?.name||'thing'} to ${titles[place]||place}`);
    row.append(b);
  }
  body.append(row);
  paragraph('Or hold and drag it around this room.');
}

function welcome(){
  showSheet('welcome','Who’s here?','A SMALL PLACE FOR FIVE');
  const canvas=document.createElement('canvas');canvas.width=220;canvas.height=82;canvas.className='welcome-scene';const c=canvas.getContext('2d');ACTORS.forEach((id,i)=>character(c,id,25+i*43,68,{scale:1.25,mood:id==='galgan'?'sleep':'idle'}));body.append(canvas);
  paragraph('Monki has a small balloon problem. Choose yourself. He could use a hand.');
  const choices=document.createElement('div');choices.className='choice-people';
  for(const actor of ['david','julia']){const b=button('','person-choice',async()=>{
    b.disabled=true;try{if(store.server)await store.create(actor);else store.solo(actor);closeSheet();render();startIncident();}catch(e){toast(e.message);b.disabled=false;}
  });b.append(pict(actor));const label=document.createElement('span');label.textContent=NAMES[actor];b.append(label);choices.append(b);}body.append(choices);
  paragraph(store.server?'Your place saves itself. Invite your person whenever.':'Playing on this device. Start the included server for a shared world.','onboarding-note');
}
/** Everything to do with the other person lives on the other person. */
function personSheet(){
  if(!store.state||!store.actor)return;
  const them=other(store.actor);
  showSheet('person',`For ${NAMES[them]}.`);
  const header=document.createElement('div');header.className='result-picks';
  header.append(pict(store.actor));const arrow=document.createElement('span');arrow.textContent='→';
  header.append(arrow,pict(them,{hat:store.state.actors[them].hat}));body.append(header);
  const row=document.createElement('div');row.className='surprise-row';
  for(const[glyph,label,go]of[['gift','Leave a present',collectionSheet],['draw','Leave a drawing',drawSheet],['hat','Choose their look',()=>residentSheet(them)],['eye','See what happened',historySheet]]){
    const b=button('','surprise-card',go);const strong=document.createElement('strong');strong.innerHTML=icon(glyph);
    const text=document.createElement('span');text.textContent=label;b.append(strong,text);b.setAttribute('aria-label',label);row.append(b);
  }
  body.append(row);
  body.append(button('Pick a frog together','secondary-button full',togetherSheet));
  if(store.local.invite&&!store.paired)body.append(button(`Invite ${NAMES[them]}`,'primary-button full',shareSheet));
}
function collectionSheet(){
  if(!store.state)return;showSheet('collection','Little things.');paragraph('For heads. For the floor. For each other.');
  const grid=document.createElement('div');grid.className='item-grid';
  for(const id of store.state.inventory){const b=button('','collection-item',()=>itemSheet(id));b.append(pict(id));const name=document.createElement('span');name.textContent=ITEMS[id].name;b.append(name);grid.append(b);}body.append(grid);
}
function itemSheet(id){
  if(!store.state)return;showSheet('item',ITEMS[id].name+'.');const canvas=pict(id);canvas.className='big-item';body.append(canvas);
  const row=document.createElement('div');row.className='button-row';
  row.append(button('Put it here','secondary-button',()=>{operate('place',{item:id,room});closeSheet();sounds.play('tap');tip('hold + drag to move it');}));
  row.append(button(`Wrap for ${NAMES[other(store.actor)]}`,'primary-button',()=>{if(operate('gift',{item:id})){closeSheet();sounds.play('gift');toast('Left in the house.');}}));body.append(row);
  if(ITEMS[id].wearable){paragraph('Or, a hat.');const options=document.createElement('div');options.className='wear-options';
    ACTORS.forEach(actor=>{const b=button('','',()=>{operate('wear',{target:actor,item:id});closeSheet();scene.react(actor);sounds.play('gift');});b.append(pict(actor,{hat:id}));const small=document.createElement('small');small.textContent=NAMES[actor];b.append(small);b.setAttribute('aria-label',`Put ${ITEMS[id].name} on ${NAMES[actor]}`);options.append(b);});body.append(options);}
  body.append(button('← all little things','quiet-action',collectionSheet));
}
function residentSheet(id){
  if(!store.state)return;showSheet('resident',NAMES[id]+'.');
  const a=store.state.actors[id],canvas=pict(id,{hat:a.hat});canvas.className='big-item';body.append(canvas);
  const row=document.createElement('div');row.className='button-row';
  row.append(button('Poke','secondary-button',()=>{operate('poke',{target:id});scene.react(id);sounds.play('tap');closeSheet();}));
  if(a.room!==room)row.append(button('Come here','secondary-button',()=>{operate('move',{target:id,x:200,y:252,room});closeSheet();}));
  if(a.hat)row.append(button('Hat off','secondary-button',()=>{operate('wear',{target:id,item:null});closeSheet();}));
  const ready=adventureFor(store.state,store.actor);
  if(ready.ready&&ready.actor===id)row.append(button('Play adventure','primary-button',()=>{closeSheet();startIncident();}));body.append(row);
  const people=document.createElement('div');people.className='wear-options';for(const who of ACTORS){const b=button('','',()=>residentSheet(who));b.append(pict(who));const name=document.createElement('small');name.textContent=NAMES[who];b.append(name);people.append(b);}body.append(people);
  const grid=document.createElement('div');grid.className='item-grid';for(const hat of store.state.inventory.filter(i=>ITEMS[i].wearable)){const b=button('','collection-item',()=>{operate('wear',{target:id,item:hat});closeSheet();sounds.play('gift');});b.append(pict(hat));const name=document.createElement('span');name.textContent=ITEMS[hat].name;b.append(name);b.title=ITEMS[hat].name;b.setAttribute('aria-label',`Wear ${ITEMS[hat].name}`);grid.append(b);}body.append(grid);
}

function historySheet(){
  if(!store.state)return;showSheet('history','While you were out.');
  if(!store.state.log.length){paragraph('Nothing yet. Leave a present or move something.');return;}
  for(const entry of store.state.log.slice(0,18)){const row=document.createElement('div');row.className='activity-row';row.append(pict(entry.who in NAMES?entry.who:'monki'));const copy=document.createElement('span');copy.className='activity-copy';copy.textContent=describe(entry);row.append(copy);const time=document.createElement('time');time.textContent=relative(entry.at);row.append(time);body.append(row);}
}
function memoryArt(chapter){
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=190;const c=canvas.getContext('2d');rect(c,0,0,300,190,chapter.color);rect(c,0,145,300,45,'#acb88e');character(c,chapter.actor,174,157,{scale:2.8,hat:chapter.reward,mood:'happy'});character(c,chapter.id==='up'?'sernik':'monki',67,166,{scale:1.5,hat:chapter.id==='up'?'icecream':null});item(c,chapter.souvenir,265,167,{scale:1.6});return canvas;
}
function albumSheet(){
  if(!store.state)return;showSheet('album','That happened.','MOMENTS');
  if(!store.state.moments?.length){paragraph('Little pictures of the things you get up to. Monki can start the collection.');body.append(button('Help Monki','primary-button full',startIncident));return;}
  const grid=document.createElement('div');grid.className='album-grid';
  for(const m of store.state.moments){const chapter=ADVENTURES.find(c=>c.id===m.chapter);if(!chapter)continue;const card=document.createElement('div');card.className='memory-card';card.append(memoryArt(chapter));const title=document.createElement('strong');title.textContent=chapter.ending;const who=document.createElement('small');who.textContent=`${NAMES[m.who]} · ${relative(m.at)}`;card.append(title,who);grid.append(card);}body.append(grid);
}

function togetherSheet(){
  if(!store.state)return;showSheet('together','Us two.','SAME HOUSE. DIFFERENT PHONES.');
  const picks=store.state.choices,ready=picks.revealed.find(r=>r.round===picks.round);
  if(ready){
    const row=document.createElement('div');row.className='result-picks';row.append(pict('david'));row.append(pict('frog',{variant:ready.david}));const match=document.createElement('span');match.textContent=ready.match?'=':'≠';row.append(match);row.append(pict('frog',{variant:ready.julia}));row.append(pict('julia'));body.append(row);
    paragraph(ready.match?'Same frog. Monki is wearing it now.':'Two perfectly acceptable frogs.');body.append(button('Another frog','secondary-button',()=>operate('nextPick')));
  }else{
    paragraph('Pick a frog. Don’t tell.');
    const row=document.createElement('div');row.className='frog-row';
    for(let i=0;i<5;i++){const b=button('','frog-pick'+(picks.picks[store.actor]===i?' selected':''),()=>operate('pick',{choice:i,round:picks.round}));b.disabled=picks.picks[store.actor]!==undefined;b.append(pict('frog',{variant:i}));b.setAttribute('aria-label',`Frog ${i+1}`);row.append(b);}body.append(row);
    if(picks.picks[store.actor]!==undefined)paragraph(`✓ yours is hidden. Waiting for ${NAMES[other(store.actor)]}.`);
    else if(picks.partnerReady)paragraph(`${NAMES[other(store.actor)]} picked already. Your turn.`);
  }
  if(!store.connected){paragraph('This world is on one device. For two phones, start the server and make a shared world.','settings-small');}
  else if(store.local.invite){
    paragraph(store.paired?'Your person is connected. The world saves for both of you.':'Send this little place to your person.');
    body.append(button(store.paired?'Invitation link':'Invite '+NAMES[other(store.actor)],'primary-button full',shareSheet));
  }else paragraph('Connected. Everything you leave here can be found by your person.');
}
function shareSheet(){
  showSheet('share','A key to this place.');
  const url=store.shareURL();if(!url){paragraph('This is a local-only world. Start the included server to play together.');return;}
  paragraph('Open this link on the other phone. Same Wi-Fi, with the Mac running.');
  const input=document.createElement('input');input.className='share-link';input.readOnly=true;input.value=url;input.setAttribute('aria-label','Private invitation link');body.append(input);
  const row=document.createElement('div');row.className='button-row';row.append(button('Copy link','primary-button',async()=>{try{await navigator.clipboard.writeText(url);toast('Copied.');}catch{input.select();try{document.execCommand('copy');toast('Copied.');}catch{toast('Select and copy the link.');}}}));
  if(navigator.share)row.append(button('Share','secondary-button',async()=>{try{await navigator.share({title:'monki world',text:'Come here.',url});}catch{}}));body.append(row);
  paragraph('Keep the link between you two. It is the key to your shared world.','settings-small');
}
function deviceSheet(){
  showSheet('device','Your place. Another phone.');paragraph(`Open this private link on your own phone to continue as ${NAMES[store.actor]}.`);
  const input=document.createElement('input');input.className='share-link';input.readOnly=true;input.value=store.deviceURL();input.setAttribute('aria-label','Private device transfer link');body.append(input);
  body.append(button('Copy my link','primary-button full',async()=>{try{await navigator.clipboard.writeText(input.value);toast('Copied.');}catch{input.select();document.execCommand('copy');toast('Copied.');}}));
  paragraph('For your own devices. Use the invitation for your partner.','settings-small');
}
function giftSheet(id){
  const gift=store.state.gifts.find(g=>g.id===id&&!g.opened);if(!gift)return;
  showSheet('gift','For you.');paragraph(`← ${NAMES[gift.from]}`);
  const b=button('','reveal-gift full',async()=>{
    b.disabled=true;sounds.play('gift');const op=operate('openGift',{target:id});if(!op)return;
    await store.sync();
    let opened=store.state.gifts.find(g=>g.id===id);
    if(!opened?.item){paragraph('Opening when connected…');const check=setInterval(()=>{opened=store.state.gifts.find(g=>g.id===id);if(opened?.item){clearInterval(check);if(sheetKind==='gift')showGiftResult(opened.item);}else if(sheetKind!=='gift')clearInterval(check);},500);}
    else showGiftResult(opened.item);
  });b.append(pict('present'));body.append(b);paragraph('tap to unwrap.');
}
function showGiftResult(id){showSheet('gift',ITEMS[id].name+'.');const c=pict(id);c.className='big-item';body.append(c);body.append(button('Put it somewhere','primary-button full',()=>{closeSheet();room='house';render();}));}

function drawSheet(){
  if(!store.state)return;showSheet('drawing','On the wall.');paragraph(`A little drawing for ${NAMES[other(store.actor)]}.`);
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=206;canvas.className='draw-pad';canvas.setAttribute('aria-label','Draw with a finger or mouse');body.append(canvas);const c=canvas.getContext('2d');let lines=[],line=null;
  const redraw=()=>{c.clearRect(0,0,300,206);c.strokeStyle='#61713f';c.lineWidth=2.5;c.lineCap='round';c.lineJoin='round';for(const l of lines){c.beginPath();l.forEach(([x,y],i)=>i?c.lineTo(x*300,y*206):c.moveTo(x*300,y*206));c.stroke();}};
  const point=e=>{const r=canvas.getBoundingClientRect();return[Math.max(0,Math.min(1,(e.clientX-r.left-8)/(r.width-16))),Math.max(0,Math.min(1,(e.clientY-r.top-8)/(r.height-16)))];};
  canvas.addEventListener('pointerdown',e=>{if(lines.length>=120||lines.reduce((n,l)=>n+l.length,0)>3500)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);line=[point(e)];lines.push(line);redraw();});canvas.addEventListener('pointermove',e=>{if(!line||line.length>=300||lines.reduce((n,l)=>n+l.length,0)>3500)return;line.push(point(e));redraw();});canvas.addEventListener('pointerup',()=>{if(line?.length===1)line.push([Math.min(1,line[0][0]+.003),line[0][1]]);line=null;redraw();});canvas.addEventListener('pointercancel',()=>line=null);
  const row=document.createElement('div');row.className='button-row';row.append(button('Hang it up','primary-button',()=>{if(!lines.length){toast('One small scribble first.');return;}operate('draw',{lines});closeSheet();sounds.play('gift');tip('on the wall.');}));row.append(button('Undo','secondary-button',()=>{lines.pop();redraw();}));row.append(button('Clear','quiet-action',()=>{lines=[];redraw();}));body.append(row);
}
/** Mild inconvenience as affection: change their next game, stick a hat on them
 * for a day, or move something of theirs somewhere else. */
function surpriseSheet(){
  if(!store.state)return;showSheet('surprise','');
  const them=other(store.actor);
  const header=document.createElement('div');header.className='result-picks';header.append(pict(store.actor));const arrow=document.createElement('span');arrow.textContent='↝';header.append(arrow,pict(them));body.append(header);

  const row=document.createElement('div');row.className='surprise-row';
  for(const[modifier,glyph]of[['bouncy','~'],['tiny','·'],['windy','≈'],['giant','●']]){
    const b=button('','surprise-card',()=>{operate('chaos',{modifier});closeSheet();sounds.play('gift');});
    const strong=document.createElement('strong');strong.textContent=glyph;b.append(strong);
    b.setAttribute('aria-label',{bouncy:'A passing dog',tiny:'Smaller',windy:'Windy',giant:'Larger'}[modifier]);row.append(b);
  }
  body.append(row);

  // A hat they cannot take off until tomorrow.
  const hats=store.state.inventory.filter(i=>ITEMS[i].wearable);
  if(hats.length){
    const stick=document.createElement('div');stick.className='item-grid';
    for(const hat of hats){const b=button('','collection-item',()=>{operate('stick',{target:them,item:hat});closeSheet();sounds.play('gift');});b.append(pict(them,{hat}));b.setAttribute('aria-label',`Stick the ${ITEMS[hat].name} on ${NAMES[them]} for a day`);stick.append(b);}
    body.append(stick);
  }

  // Put one of the things in the house somewhere else entirely.
  const movable=store.state.objects.filter(o=>!store.state.hidden?.[o.id]);
  if(movable.length){
    const hide=document.createElement('div');hide.className='item-grid';
    for(const o of movable.slice(0,8)){const b=button('','collection-item',()=>{operate('hide',{target:o.id});closeSheet();sounds.play('gift');});b.append(pict(o.type));b.setAttribute('aria-label',`Hide the ${ITEMS[o.type]?.name||'thing'}`);hide.append(b);}
    body.append(hide);
  }
}
function fridgeSheet(){if(!store.state)return;showSheet('fridge','The fridge.');const canvas=pict(store.state.fridgeAt?'potato':'fridge');canvas.className='big-item';body.append(canvas);if(store.state.fridgeAt)paragraph('…');else body.append(button('Put the potato in','secondary-button full',()=>{operate('fridge');closeSheet();sounds.play('tap');}));}

function startIncident(){
  if(!store.state){welcome();return;}if(game)return;
  const chapter=adventureFor(store.state,store.actor);
  if(!chapter.ready){sounds.play('boop');tip(chapter.done?'That is all of them.':'Something else tomorrow.',4000);return;}
  closeSheet();hideMenu();scene.stopReplay();
  $('game-chapter').textContent=chapter.title;$('resume-game').hidden=true;$('microgame').showModal();
  game=new AdventurePlayer($('micro'),chapter,{startStep:readDraft(chapter),sound:k=>sounds.play(k),reduced:scene.reduced,onDone:finishIncident,onStep:({step,spec,hits,goal})=>{
    $('game-title').textContent=spec.title;$('game-hint').textContent=spec.hint;$('game-progress').textContent=`${hits} / ${goal}`;
    $('game-steps').replaceChildren();for(let i=0;i<3;i++){const p=document.createElement('span');p.className=i<step?'done':i===step?'current':'';$('game-steps').append(p);}
    try{localStorage.setItem(draftKey(),JSON.stringify({index:chapter.index,step}));}catch{}
  }});
}
function finishIncident(chapter){
  game=null;$('microgame').close();
  const op=operate('adventureComplete',{chapter:chapter.id,index:chapter.index});if(!op)return;
  try{localStorage.removeItem(draftKey());}catch{}
  if(store.state.unlocked.includes(chapter.room))room=chapter.room;
  hideMenu();render();sounds.play('gift');showSheet('ending',chapter.ending,'ADDED TO YOUR MOMENTS');
  const photo=memoryArt(chapter);photo.className='ending-photo';body.append(photo);paragraph(chapter.detail);
  const row=document.createElement('div');row.className='button-row';row.append(button('Back home','primary-button',()=>{closeSheet();room='house';render();}));row.append(button(`Leave ${NAMES[other(store.actor)]} a gift`,'secondary-button',()=>itemSheet(chapter.reward)));body.append(row);
}
function leaveGame(){if(game){game.stop();game=null;}$('microgame').close();render();}
function updateSound(){$('sound').innerHTML=icon(sounds.enabled?'sound':'mute');$('sound').setAttribute('aria-label',sounds.enabled?'Turn sound off':'Turn sound on');$('sound').title=sounds.enabled?'Turn sound off':'Turn sound on';}
function settingsSheet(){
  showSheet('settings','Make yourself at home.');
  if(!store.actor){body.append(button('Choose your person','primary-button',welcome));return;}
  const info=[['Here as',NAMES[store.actor]],['World',store.connected?(store.online?'Shared · saved':'Saved here · waiting to sync'):'On this device'],['Sound',sounds.enabled?'On':'Off']];
  for(const[label,value]of info){const row=document.createElement('div');row.className='setting-row';const a=document.createElement('span');a.textContent=label;const b=label==='Sound'?button(value,'',()=>{sounds.toggle();updateSound();settingsSheet();}):document.createElement('span');b.textContent=value;row.append(a,b);body.append(row);}
  const light=document.createElement('div');light.className='setting-row';light.append(document.createTextNode('Outside'));light.append(button({auto:'Follow the clock',day:'Day',night:'Night'}[nightMode],'',()=>{nightMode={auto:'day',day:'night',night:'auto'}[nightMode];clock();settingsSheet();}));body.append(light);
  const row=document.createElement('div');row.className='button-row';if(store.local.invite)row.append(button('Invite your person','primary-button',shareSheet));row.append(button('Save a copy','secondary-button',()=>{const blob=new Blob([store.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monki-world-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('World exported.');}));body.append(row);
  if(store.connected)body.append(button('Continue on my phone ↗','quiet-action',deviceSheet));
  paragraph('Touch a resident or an unusual object. Hold and drag to move things. The little things below can go on heads, on the floor, or inside a present.');
  paragraph('Nothing here is owed to anyone. Nobody starves, nothing expires, and leaving for a week is not punished — the residents simply get on with it.','settings-small');
  paragraph(store.connected?'Both phones share this world while this server is available. Offline changes wait on your device and sync when you return.':'This is a local-only world. Run Start Monki World.command for shared play.','settings-small');
  if(store.saveError)paragraph('This browser’s storage is full. Export a copy before leaving.','error-line');
}

// Updates never rewind a drag. Partner activity is an explicit, labelled card.
// The world arrives from the server after boot, so the opening moment is retried
// on every update; once it has been taken, it costs nothing.
store.addEventListener('change',()=>{render();openingMoment();});store.addEventListener('rejected',e=>toast(e.detail));
for(const[id,glyph,label]of[['wardrobe','hat','Dress up'],['draw','draw','Draw'],['surprise','gift','Leave a gift'],['history','eye','Moments']])$(id).innerHTML=icon(glyph)+`<span>${label}</span>`;
$('settings').innerHTML=icon('settings');$('close-sheet').innerHTML=icon('close');$('together-icon').innerHTML=icon('users');$('leave-game').innerHTML=icon('close');$('pause-game').innerHTML=icon('pause');
$('close-sheet').addEventListener('click',closeSheet);sheet.addEventListener('close',()=>sheetKind=null);sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();}});
$('sound').addEventListener('click',()=>{sounds.toggle();updateSound();});$('settings').addEventListener('click',settingsSheet);$('history').addEventListener('click',albumSheet);$('last-trace').addEventListener('click',()=>{const gift=store.state?.gifts.find(g=>g.to===store.actor&&!g.opened);if(gift)giftSheet(gift.id);else if(store.state?.log.length)historySheet();else personSheet();});$('draw').addEventListener('click',drawSheet);$('surprise').addEventListener('click',collectionSheet);$('together').addEventListener('click',personSheet);$('wardrobe').addEventListener('click',()=>residentSheet('monki'));$('start-adventure').addEventListener('click',startIncident);
for(const[id,toy]of[['play-ball','paper'],['play-bubbles','bubbles']])$(id).addEventListener('click',()=>{if(!store.state){welcome();return;}if(!operate('toy',{toy}))return;scene.playWith(toy);sounds.play(toy==='paper'?'paper':'throw');tip(toy==='paper'?'Sernik has it.':'Tap the bubbles.',4500);});
$('tidy-room').addEventListener('click',()=>{if(operate('tidy')){sounds.play('tap');tip('Put away. Still in your little things.');}});
item($('ball-art').getContext('2d'),'paper',20,33,{scale:1.4});item($('bubble-art').getContext('2d'),'bubbles',20,36,{scale:1.15});$('tidy-icon').innerHTML=icon('gift');
$('leave-game').addEventListener('click',leaveGame);$('microgame').addEventListener('cancel',e=>{e.preventDefault();leaveGame();});$('pause-game').addEventListener('click',()=>{if(game)game.pause(!game.paused);});$('resume-game').addEventListener('click',()=>game?.pause(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideMenu();});
const brand=$('brand-monki').getContext('2d');character(brand,'monki',24,43,{scale:1.1,shadow:false});updateSound();render();clock();setInterval(clock,10000);setInterval(()=>store.visit(),15000);

async function boot(){
  await store.probe();
  const invitation=location.hash.match(/^#join=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  const seat=location.hash.match(/^#seat=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  if(seat){showSheet('device-join','Your place is here.');paragraph('Continue your existing character on this device.');body.append(button('Continue here','primary-button full',async()=>{try{await store.restore(seat[1],seat[2]);history.replaceState(null,'',location.pathname);closeSheet();render();tip('welcome back.');setTimeout(openingMoment,400);}catch(error){toast(error.message);}}));}
  else if(invitation){
    if(store.local?.room===invitation[1]&&store.local?.invite===invitation[2]){shareSheet();return;}
    showSheet('join','Come in.');paragraph('This link opens your person’s world.');
    if(store.state&&store.local.room!==invitation[1])paragraph('Your current world stays on its server. Save a copy in Settings if you also want a local backup.','settings-small');
    body.append(button('Enter the world','primary-button full',async()=>{try{await store.join(invitation[1],invitation[2]);history.replaceState(null,'',location.pathname);closeSheet();render();tip('you’re here.');setTimeout(openingMoment,400);}catch(error){toast(error.message);}}));
  }else if(!store.actor)welcome();else{await store.sync();store.visit();setTimeout(openingMoment,600);}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&store.actor)setTimeout(openingMoment,500);});
  if(store.loadError)toast('Couldn’t read the local save. Your server world is still available through its invitation.');
  if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
boot();

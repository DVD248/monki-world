import {Store,LAN} from './store.js';
import {Scene} from './scene.js';
import {AdventurePlayer} from './adventure-player.js';
import {Sounds} from './audio.js';
import {icon,spriteCanvas,character,item,rect,fillSprite} from './art.js';
import {ACTORS,NAMES,ITEMS,PETS,other,createWorld,clamp,favourite,waitingFor,present,residentsHere,isHere,atTheDoor,moveEveryoneIn} from './shared/world.js';
import {ADVENTURES,adventureFor,featuredStepFor,VARIANT_LABELS} from './shared/adventures.js';
import {testLab,recordCheck} from './test-lab.js';
import {lifeUI} from './life-ui.js';
import {pendingMail,plantStage,DISCOVERIES,FRESH} from './shared/life.js';
import {ambienceAt} from './shared/ambience.js';
import {petCanvas} from './petting.js';
import {fridgeUI} from './fridge-ui.js';
import {decorUI} from './decor-ui.js';
import {FURNITURE,decorRewardsAt,decorProgress,decorNewSince} from './shared/decor.js';
import {ArcadeGame,VIEWS as ARCADE_VIEWS} from './arcade.js';
import {ARCADE_GAMES,ARCADE_MAX,amount,scoreText,bragLine} from './shared/arcade.js';

const $=id=>document.getElementById(id);
// The online copy has no testing sandbox: ?test=1 is ignored there and Settings does not offer it.
const testMode=LAN&&new URLSearchParams(location.search).get('test')==='1';
const store=new Store({sandbox:testMode}),sounds=new Sounds();let previewGame=false;
let room='house',selectedItem=null,game=null,sheetKind=null,toastTimer,tipTimer,nightMode='auto',lastRevision=-1,lastCompleted=0,featured=null,lastGreeting=0;
const sheet=$('sheet'),body=$('sheet-body'),menu=$('interaction-menu');
let fridgeDispose=null,arcade=null,arcadeId=null,arcadeStart=0,arcadeReadyAt=0;
const toolsPanel=$('room-tools'),nativeTools=typeof toolsPanel.showPopover==='function';
function closeTools(){if(nativeTools)toolsPanel.hidePopover();else toolsPanel.hidden=true;$('open-tools').setAttribute('aria-expanded','false');}
// Keep the same small drawer usable on phones without native popover support.
if(!nativeTools){
  toolsPanel.removeAttribute('popover');toolsPanel.classList.add('tools-fallback');toolsPanel.hidden=true;
  $('open-tools').addEventListener('click',()=>{toolsPanel.hidden=!toolsPanel.hidden;$('open-tools').setAttribute('aria-expanded',String(!toolsPanel.hidden));if(!toolsPanel.hidden)toolsPanel.querySelector('button').focus();});
  toolsPanel.querySelector('[popovertargetaction="hide"]').addEventListener('click',closeTools);
  document.addEventListener('pointerdown',e=>{if(!toolsPanel.hidden&&!toolsPanel.contains(e.target)&&!$('open-tools').contains(e.target))closeTools();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!toolsPanel.hidden){closeTools();$('open-tools').focus();}});
}
const scene=new Scene($('world'),{onTap:tap,onMove:(point,place)=>{operate('move',{target:point.id,x:point.x,y:point.y,room:place,...(scene.decorEditing?{decor:true}:{})});sounds.play('drop');hideMenu();},onDoor:goTo,onFrame:drawSheet,onMoment:albumSheet,onFridge:fridgeSheet,onIncident:startIncident,onGift:giftSheet,onHold:hold,onPop:who=>{sounds.play('pop');if(who)setTimeout(()=>sounds.play(who),90);},onToyResult:result=>operate('toyResult',result)});
const life=lifeUI({store,showSheet,body,button,paragraph,closeSheet,operate,pict,sounds,toast,play:startIncident,history:historySheet});
const decor=decorUI({store,editor:$('decor-editor'),body:$('decor-editor-body'),button,operate,sounds,getRoom:()=>room,scene,closeTools});
scene.callbacks.onDecorPlace=point=>decor.place(point);
scene.callbacks.onDecorSelect=id=>decor.select(id);
scene.callbacks.onPlace=id=>life.place(id);
scene.callbacks.onFind=()=>{if(!payoff())life.find();};
scene.callbacks.onPet=id=>{operate('pet',{target:id});};
scene.callbacks.onArcade=()=>arcadeSheet();scene.callbacks.onKnock=()=>openDoor();
scene.callbacks.onSound=k=>sounds.play(k);
scene.callbacks.onTidyEnd=()=>{for(const id of ['tidy-room','play-ball','play-bubbles'])$(id).disabled=false;$('tidy-room').removeAttribute('aria-busy');};
scene.callbacks.onToyMode=mode=>{for(const[id,toy]of [['play-ball','paper'],['play-bubbles','bubbles']])$(id).setAttribute('aria-pressed',String(mode===toy));$('toy-mode').hidden=!mode;document.documentElement.classList.toggle('has-toy',!!mode);$('toy-instruction').textContent=mode==='paper'?'Drag the roll → release':'Place the wand in the room';};
scene.callbacks.onWandPlaced=()=>{$('toy-instruction').textContent='Tap → small · drag → big';};
scene.toyOrigin=mode=>{const r=$(mode==='paper'?'ball-art':'bubble-art').getBoundingClientRect();return scene.at({clientX:r.left+r.width/2,clientY:r.top+r.height*.925});};
scene.toyScale=mode=>{const r=$(mode==='paper'?'ball-art':'bubble-art').getBoundingClientRect();return .9*r.width/40*scene.width/$('world').getBoundingClientRect().width;};
scene.callbacks.onToyDock=(mode,away)=>{if(mode)$(mode==='paper'?'play-ball':'play-bubbles').classList.toggle('toy-away',away);};
scene.callbacks.onDragStart=()=>hideMenu();

function button(label,className,fn){const b=document.createElement('button');b.className=className;b.textContent=label;b.addEventListener('click',fn);return b;}
function pict(id,options){return spriteCanvas(id,48,options);}
function toast(message){
  // Over an open sheet, not under it: a modal sheet is drawn above the whole page, so a
  // refusal from inside one ("a few things are waiting already") was never seen at all.
  const t=$('toast'),host=document.querySelector('dialog[open]')||document.body;if(t.parentElement!==host)host.append(t);
  t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3300);}
// A message still showing when its sheet closes stays on screen.
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{if(d.contains($('toast')))document.body.append($('toast'));});
function tip(message,ms=3500){$('scene-tip').textContent=message;$('scene-tip').classList.add('visible');clearTimeout(tipTimer);tipTimer=setTimeout(()=>$('scene-tip').classList.remove('visible'),ms);}
function hideMenu(){menu.hidden=true;scene.selected=null;}
function showSheet(kind,title,eyebrow='MONKI WORLD'){
  fridgeDispose?.();fridgeDispose=null;
  if(decor.isOpen())decor.close();
  closeTools();scene.toys.clear();hideMenu();sheetKind=kind;$('sheet-eyebrow').textContent=eyebrow;body.replaceChildren();
  if(title){const h=document.createElement('h2');h.textContent=title;body.append(h);}if(!sheet.open)sheet.showModal();
}
function closeSheet(){fridgeDispose?.();fridgeDispose=null;sheet.close();sheetKind=null;}
function paragraph(text,cls=''){const p=document.createElement('p');p.textContent=text;p.className=cls;body.append(p);return p;}
function operate(type,fields={}){try{return store.op(type,fields);}catch(error){toast(error.message);return null;}}
/** Today's daft situation, if there is one waiting for this person. */
function situation(state=store.state){const f=state?.life?.finds?.[store.actor];return f?.fresh?{find:f,sit:FRESH.find(x=>x.id===f.fresh)}:null;}
/** One touch: it reacts, the thing comes off, and that is the end of it. */
function payoff(){
  const here=situation();if(!here?.sit)return false;
  const {find,sit}=here;
  scene.react(sit.actor);sounds.play(sit.actor);
  if(!operate('collectFind',{target:find.id}))return false;
  sounds.play('gift');tip(sit.after,4600);render();return true;
}
// What the other one did since you last looked is the first thing on the card, with one
// tap to laugh back. The simulated David ended most autumns sure she never played, and
// she saw his traces in a line that faded after five seconds.
const WORTH={arrive:9,arcadePass:7,arcade:5,answer:8,wear:7,adventure:6,discovery:6,placePlay:5,place:5,hide:5,move:4,sendTo:4,plant:4,bloom:4,toy:3,tidy:3,pet:3,open:3,freezeGift:6,freeze:2,match:2,mismatch:2};
let news=null,reaction=null,greeted=false;
/** The newest thing in the world, by the server's clock, which stamps everything that
 * happens. "Seen up to here" is kept in those terms: a phone clock a few seconds behind
 * the server made yesterday's news new again. */
const newest=st=>Math.max(0,...(st?.log||[]).map(e=>e.at||0));
/** What reached this screen while it was open and showing has been seen. */
function looked(){if(!store.local||!greeted)return;const n=newest(store.state);if(n>(store.local.lastLook||0)){store.local.lastLook=n;store.save();}}
/** Her answer to something of yours, in a sentence: on a phone the kicker is hidden, and a bare "Ha!" said nothing about who or what. */
function reactionLine(m){const what={drawing:'drawing',postcard:'picture',gift:'present'}[store.state?.life?.mail.find(x=>x.id===m.mailId)?.kind]||'present',who=NAMES[m.from];
  return {laugh:`${who} laughed at your ${what}.`,love:`${who} loved your ${what}.`,wow:`${who} said ?! to your ${what}.`}[m.reaction]||`${who} answered your ${what}.`;}
function partnerNews(){
  const st=store.state;if(!st||!store.actor)return null;
  // A phone that has never looked (a seat just moved to it) counts from your own last doing
  // something here, not from the start: otherwise a month-old laugh greeted you as news.
  const them=other(store.actor),since=store.local.lastLook??Math.max(0,...st.log.filter(e=>e.who===store.actor).map(e=>e.at||0));
  const theirs=st.log.filter(e=>e.who===them&&e.at>since&&WORTH[e.action]);
  if(!theirs.length)return null;
  return [...theirs].sort((a,b)=>(WORTH[b.action]-WORTH[a.action])||(b.at-a.at))[0];
}
function answerNews(){
  if(!news)return;
  if(news.action==='answer'){news.answered=true;render();return;}
  if(operate('answer',{target:news.id,line:describe(news)})){news.answered=true;sounds.play('pop');toast(`${NAMES[other(store.actor)]} will see that.`);render();}
}
function relative(at){const mins=Math.max(0,Math.floor((Date.now()-at)/60000));return mins<1?'just now':mins<60?`${mins}m ago`:mins<1440?`${Math.floor(mins/60)}h ago`:`${Math.floor(mins/1440)}d ago`;}
function describe(entry){
  // "in headphones", "an umbrella", "a traffic cone".
  const a=w=>w==='something'||/^(sunglasses|headphones)$/.test(w)?w:(/^[aeiou]/.test(w)?'an ':'a ')+w;
  const who=NAMES[entry.who]||'Someone',target=NAMES[entry.target]||(ITEMS[entry.target]?'the '+ITEMS[entry.target].name.toLowerCase():null)||(FURNITURE[entry.target]?'the '+FURNITURE[entry.target].name.toLowerCase():null)||{house:'Home',garden:'Garden',roof:'Roof',cellar:'Down there'}[entry.target]||'something',thing=ITEMS[entry.item]?.name.toLowerCase()||(ITEMS[entry.target]?ITEMS[entry.target].name.toLowerCase():'something');
  const actions={gift:`left a present for ${NAMES[other(entry.who)]||'someone'}`,wear:entry.item===null?`took ${target}’s hat off`:`put ${a(thing)} on ${target}`,move:`moved ${target}`,out:`took ${target} outside`,take:`borrowed ${target}`,eat:'found a snack',sleep:'fell asleep',dig:'dug a little hole',build:'moved things around',guard:`is watching ${target}`,hide:`hid ${target}`,find:`found ${target}`,open:'opened a present',draw:'left a drawing on the wall',play:'made a small mess',match:'picked the same frog',mismatch:'picked different frogs',place:`put down ${a(thing)}`,grow:'found somewhere new',toy:entry.item==='bubbles'?'blew some bubbles':'gave Sernik the toilet paper',tidy:'put the loose things away',adventure:'added a picture to Moments',poke:`poked ${target}${entry.count>1?` ×${entry.count}`:''}`,decorate:`changed ${target}`,buyFurniture:`brought home ${FURNITURE[entry.target]?.name||target}`,storeFurniture:`stored ${FURNITURE[entry.target]?.name||target}`,placeFurniture:`put back ${FURNITURE[entry.target]?.name||target}`,sellFurniture:`removed ${FURNITURE[entry.target]?.name||target}`,refinishFurniture:`changed ${FURNITURE[entry.target]?.name||target}`};
  Object.assign(actions,{answer:`laughed at something ${NAMES[entry.target]||'you'} did`,pet:`petted ${target}`,discovery:NAMES[entry.target]?`found ${target} in ${a(thing)}`:`found ${a(thing)}`,plant:'planted a seed',bloom:'picked something from the patch',postcard:`left a picture of ${target}`,reaction:`sent ${target} a little answer`,placePlay:`left ${a(thing)} outside`,freeze:'tried something in the freezer',freezeGift:`left ${target} a freezer experiment`,inviteAdventure:`chose ${NAMES[entry.target]||'someone'}’s next adventure`,arrive:`let ${target} in`});
  if(Object.hasOwn(ARCADE_GAMES,entry.game||'')){const n=entry.count||0;
    actions.arcade=bragLine(entry.game,n);
    actions.arcadePass=`beat ${NAMES[other(entry.who)]||'someone'} at ${ARCADE_GAMES[entry.game].title}: ${amount(entry.game,n)}`;}
  return `${who} ${actions[entry.action]||'was here'}.`;
}

// What the card's small picture shows, for anything that cannot look at a canvas. The
// two-phone simulation read "Captain of the rug." for months without ever seeing the dog
// in the pirate hat beside it.
function pictured(who=[],things=[]){$('story-art').dataset.picture=JSON.stringify({who:who.map(w=>({...w,hat:w.hat?(ITEMS[w.hat]?.name||w.hat).toLowerCase():undefined})),things:things.map(t=>(ITEMS[t]?.name||t).toLowerCase())});}
/** The first story waits for the other one. Played alone while setting up, it left
 * their very first look at "More later" — the weakest first impression the two-phone
 * simulation found, in half its timelines. It starts once you are both in. */
function waitsForThem(chapter){return chapter.index===0&&!!store.local?.invite&&!store.paired;}
function render(){
  const state=store.state||createWorld('preview');
  const chapter=adventureFor(state,store.actor||'david');
  const them=other(store.actor||'david'),held=waitsForThem(chapter);
  // Nothing beckons in the room on a day with no chapter in it.
  const preview=chapter.ready&&!held?{id:chapter.id==='up'?'balloons':chapter.id,uid:'adventure',actor:chapter.actor,room:state.unlocked.includes(chapter.room)?chapter.room:'house',kind:'tap',item:chapter.item,aftermath:chapter.id==='up'?'balloons':null}:null;
  scene.update({...state,incident:preview},room,store.actor||'david');
  const resting=!chapter.ready||held;
  $('story-kicker').textContent=chapter.done?'A FULL HOUSE':resting?'TAKE YOUR TIME':chapter.index===0?'SOMETHING IS HAPPENING':'A SMALL ADVENTURE';
  // Tomorrow's title is not given away today.
  $('story-title').textContent=chapter.done?'Quite a collection.':resting?'The house is yours.':chapter.title;
  $('story-subtitle').textContent=chapter.done?'Revisit a favourite in Moments.':resting?'More later. Revisit an adventure whenever.':chapter.subtitle;
  if(chapter.from&&!resting)$('story-subtitle').textContent=`${NAMES[chapter.from]} chose this for you.`;
  $('start-adventure').disabled=false;
  $('start-adventure').textContent=resting?'Revisit':'Play';
  if(held){$('story-kicker').textContent='THE FIRST ONE';$('story-title').textContent=`The first one waits for ${NAMES[them]}.`;
    $('story-subtitle').textContent='It starts when you are both here.';$('start-adventure').textContent=`Invite ${NAMES[them]}`;}
  const art=$('story-art').getContext('2d');art.clearRect(0,0,105,90);
  if(held){character(art,them,51,83,{scale:1.6});pictured([{id:them}]);}
  else if(resting){const sleeper=isHere(state,'galgan')?'galgan':'monki';character(art,sleeper,51,83,{scale:1.6,mood:'sleep'});pictured([{id:sleeper,mood:'sleep'}]);}
  else{character(art,chapter.actor,51,83,{scale:1.6});item(art,chapter.item,78,34,{scale:1.15});pictured([{id:chapter.actor}],[chapter.item]);}
  featured=held?shareSheet:null;
  // Her answer to something of yours shows once, as the room opens, and is not kept waiting.
  // Something already on the card at an earlier opening steps back behind today's daft
  // thing: it is still in the room and the mailbox, and it comes back when nothing else is on.
  const allMail=pendingMail(state,store.actor),shownAt=store.local?.mailShown||{},find=state.life?.finds[store.actor];
  const newMail=allMail.filter(m=>m.kind==='reaction'||!(shownAt[m.mailId]&&shownAt[m.mailId]<lastGreeting));
  const mail=newMail[0]||(reaction&&!reaction.done?reaction:null)||(!find?.fresh?allMail[0]:null);
  const fresh=news&&!news.answered?news:null;
  if(!mail&&fresh){
    featured=answerNews;const them=other(store.actor);
    $('story-kicker').textContent=fresh.action==='answer'?`${NAMES[them].toUpperCase()} LAUGHED`:`${NAMES[them].toUpperCase()} WAS HERE`;
    // On a phone the kicker is hidden, so who laughed has to be in the headline itself.
    $('story-title').textContent=fresh.action==='answer'?`${NAMES[them]} laughed: ${(fresh.line||'at something you did.').replace(new RegExp('^'+NAMES[store.actor]+'\\b'),'you')}`:describe(fresh);
    $('story-subtitle').textContent=relative(fresh.at);
    $('start-adventure').textContent=fresh.action==='answer'?'♡':'Ha!';
    art.clearRect(0,0,105,90);character(art,them,40,81,{scale:1.6,mood:'happy'});
    const target=ACTORS.includes(fresh.target)&&fresh.target!==them?fresh.target:null,thing=!target&&ITEMS[fresh.item||fresh.target]?(fresh.item||fresh.target):null;
    // What the news says, not what they happen to have on now: "found Sernik in a sock"
    // drawn with today's crown was the wrong picture on almost every card.
    const worn=['discovery','wear'].includes(fresh.action)&&fresh.item?fresh.item:state.actors[target]?.hat;
    if(target)character(art,target,80,81,{scale:1.1,hat:worn});else if(thing)item(art,thing,80,76,{scale:1.1});
    pictured([{id:them,mood:'happy'},...(target?[{id:target,hat:worn||undefined}]:[])],thing?[thing]:[]);
  }
  else if(mail){featured=()=>{if(reaction?.mailId===mail.mailId)reaction.done=true;if(mail.kind==='gift')openPresent(mail);else life.letter(mail.mailId);};$('story-kicker').textContent='FROM '+NAMES[mail.from].toUpperCase();$('story-title').textContent=mail.kind==='reaction'?reactionLine(mail):`${NAMES[mail.from]} ${{gift:'left you a present',drawing:'drew you something',postcard:'sent you a picture'}[mail.kind]||'left you something'}.`;$('story-subtitle').textContent=mail.kind==='reaction'?'A little answer.':'Left in your mailbox.';$('start-adventure').textContent='Open';art.clearRect(0,0,105,90);character(art,mail.from,40,81,{scale:1.6});
    // A drawing looks like a drawing on the card, not like a present.
    const shown=mail.kind==='reaction'?state.life?.mail.find(x=>x.id===mail.mailId)?.kind:mail.kind,thing=shown==='drawing'||shown==='postcard'?'frame':'present';
    item(art,thing,79,76,{scale:1.2});pictured([{id:mail.from}],[thing]);}
  // A situation or visitor this version does not know (a newer phone began it) is left off
  // the card rather than stopping the whole screen from drawing.
  else if(find?.fresh&&FRESH.some(x=>x.id===find.fresh)){const sit=FRESH.find(x=>x.id===find.fresh);featured=payoff;$('story-kicker').textContent='LOOK AT THAT';$('story-title').textContent=sit.title;$('story-subtitle').textContent='';$('start-adventure').textContent='Poke';art.clearRect(0,0,105,90);art.drawImage(spriteCanvas(sit.actor,90,{hat:sit.item,mood:sit.mood}),8,0);pictured([{id:sit.actor,hat:sit.item,mood:sit.mood}]);}
  else if(find&&!find.fresh&&DISCOVERIES.some(d=>d.id===find.discovery)){const d=DISCOVERIES.find(d=>d.id===find.discovery);featured=()=>life.find();$('story-kicker').textContent='LOOK AT THAT';$('story-title').textContent=d.title;$('story-subtitle').textContent='';$('start-adventure').textContent='Look';art.clearRect(0,0,105,90);art.drawImage(spriteCanvas(find.actor,90,{hat:d.item}),8,0);pictured([{id:find.actor,hat:d.item}]);}
  else if(plantStage(state)===4&&!state.life.plant.picked){featured=()=>life.plant();$('story-kicker').textContent='IN THE GARDEN';$('story-title').textContent='Something grew.';$('story-subtitle').textContent='Your seed has become something.';$('start-adventure').textContent='Look';art.clearRect(0,0,105,90);item(art,'flower',52,78,{scale:2});pictured([],['flower']);}
  // Somebody new at the door comes before everything else on the card: it is one tap, and
  // whoever opens it first lets them in for both of you.
  const door=store.actor&&!held?atTheDoor(state):null;
  if(door){featured=openDoor;$('story-kicker').textContent='KNOCK KNOCK';$('story-title').textContent='Someone is at the door.';
    $('story-subtitle').textContent='Somebody small, with luggage.';$('start-adventure').textContent='Open';art.clearRect(0,0,105,90);doorArt(art);pictured([],['door']);}
  $('connection').textContent=!store.actor?'a little world':store.saveError?'storage is full':store.connected?(store.online?(store.paired?'our world · saved':'saved · invite your person'):store.lastStatus===404?'not on this server':store.lastStatus===401?'needs its link again':'saved on this device'):'on this device';
  if(testMode)$('connection').textContent='TEST SANDBOX';
  $('status-dot').classList.toggle('offline',!!store.actor&&(!store.online||store.saveError));
  // "Down there", as the send-to sheet already calls it: a tab and a room named "?" read
  // as missing text, not as a mystery, in five of six simulated autumns.
  const titles={house:'Home',garden:'Garden',roof:'Roof',cellar:'Down there'};
  $('locations').replaceChildren();
  // Somewhere you cannot go yet is not shown at all. Nothing counts down to it.
  for(const place of ['house','garden','roof','cellar'].filter(p=>state.unlocked.includes(p))){
    const b=button('','place-tab'+(room===place?' active':'')+(preview?.room===place?' incident':''),()=>goTo(place));
    b.innerHTML=icon(place)+`<span>${titles[place]}</span>`;b.setAttribute('aria-label',titles[place]);b.setAttribute('aria-current',room===place?'location':'false');$('locations').append(b);
  }
  $('residents').replaceChildren();
  $('place-actions').replaceChildren();
  // The toilet paper is Sernik's game: it is not in the dock until he lives here.
  $('play-ball').hidden=!isHere(state,'sernik');
  for(const [id,label]of room==='garden'?[['farm','Growing patch'],['pool','Pond'],['hut','Little house']]:room==='roof'?[['sky','Look through the telescope']]:[]){$('place-actions').append(button(label,'quiet-action',()=>life.place(id)));}
  if(room==='house')$('place-actions').append(button('Open the fridge','quiet-action',fridgeSheet),button('Play a game','quiet-action',arcadeSheet));
  $('world').setAttribute('aria-label',`${titles[room]}. Stroke dogs to pet; pull away to move. Tap residents or sparkling objects. Equivalent controls are in Residents.`);
  for(const id of present(state)){const b=button('','resident'+(store.actor===id?' you':''),()=>residentSheet(id));b.title=NAMES[id];b.setAttribute('aria-label',NAMES[id]);b.append(pict(id,{hat:state.actors[id].hat}));const label=document.createElement('span');label.textContent=NAMES[id];b.append(label);$('residents').append(b);}
  const incoming=pendingMail(state,store.actor)[0],last=state.log[0];
  const img=$('trace-image');
  if(incoming){img.replaceChildren(pict('present'));$('trace-label').textContent=`Mailbox · something from ${NAMES[incoming.from]}.`;}
  else if(last){img.replaceChildren(pict(last.who in NAMES?last.who:'monki'));$('trace-label').textContent=describe(last);}
  else{img.replaceChildren(pict(other(store.actor||'david')));$('trace-label').textContent=`Leave something for ${NAMES[other(store.actor||'david')]}.`;}
  const newDecor=!!store.local&&decorNewSince(state,store.local.decorSeen??decorProgress(state));
  $('open-tools').classList.toggle('new-decor',newDecor);
  $('open-tools').setAttribute('aria-label',newDecor?'Residents · new decorations':'More things to do');
  $('decorate').querySelector('span:last-child').textContent=newDecor?'Decorate · new':'Decorate';
  lastCompleted=state.completed;lastRevision=state.revision;
  // Only when what they show has changed: rebuilt on every sync, a tap on "Another frog"
  // could land on a button that had just been replaced, and do nothing.
  if((sheetKind==='together'||sheetKind==='history')&&sheetShows()!==sheetShown)(sheetKind==='together'?togetherSheet:historySheet)();
  decor.refresh();
}

/** Opening the game is the diff. Anything that moved since she last looked plays
 * back in the room, then her marker advances. If nothing moved, nothing happens. */
/** The opening moment, in priority order. She is handed things; she is never asked
 * to work out what is different. Something from him beats the room's own news,
 * and if there is neither, nothing happens at all. */
function openingMoment(){
  const st=store.state;
  if(!st||!store.actor||scene.replaying||game||arcade||sheet.open)return;
  // Not before the world has come back from the server: the saved copy on the phone does
  // not have what the other one did since, and taking the greeting then used it up.
  if(store.connected&&!store.attempted)return;
  if(greeted)return;greeted=true;lastGreeting=Date.now();
  // One sign your person has been here since you last looked: the last thing they did,
  // in a line, as the room appears. Not a count and not a list — nothing to catch up on.
  // Without it, the simulated David ended every autumn sure she never played.
  news=partnerNews();
  const answered=pendingMail(st,store.actor).find(m=>m.kind==='reaction');
  // Only at the opening it arrived at. Kept until tapped, one "Julia laughed at your drawing"
  // stood in front of the day's adventure and situation at every opening after that.
  reaction=answered?{...answered}:null;
  if(answered)operate('readReaction',{target:answered.mailId});
  store.local.lastLook=newest(st);
  // Only letters still waiting are kept track of; opened ones are not asked about again.
  const shown=store.local.mailShown||{};store.local.mailShown={};
  for(const m of pendingMail(st,store.actor))if(m.kind!=='reaction')store.local.mailShown[m.mailId]=shown[m.mailId]??lastGreeting;
  store.save();
  // Partner changes remain in the room; do not rewind a player's furniture.
  // Whoever she has petted most is pleased to see her. No number, no label.
  const pal=favourite(st,store.actor);
  if(pal&&!scene.replaying)scene.react(pal);
  if(atTheDoor(st))setTimeout(()=>sounds.play('knock'),700);
}

/** A present, opened in the one tap that the card's Open is: straight onto a resident
 * who is not busy being daft today, the way the very first one is. Through the mailbox
 * it took two taps, and in one simulated autumn a present from him sat unopened on her
 * card for a month. */
async function openPresent(mail){
  const gift=store.state?.gifts.find(g=>g.id===mail.id);
  if(!gift||gift.opened){life.letter(mail.mailId);return;}
  sounds.play('gift');if(!operate('openGift',{target:gift.id,wearer:freeWearer()}))return;
  await store.sync();
  const opened=store.state.gifts.find(g=>g.id===gift.id),item=opened?.item,from=gift.from;
  if(!item){life.letter(mail.mailId);return;}
  // The world puts it on the dog as it opens (see openGift), so it is not also on the floor.
  const wearer=opened.wornBy;
  if(wearer){
    showSheet('present',`${NAMES[wearer]} has taken it.`,`FROM ${NAMES[from].toUpperCase()}`);
    const big=pict(wearer,{hat:item});big.className='big-item';big.dataset.picture=JSON.stringify({who:[{id:wearer,hat:(ITEMS[item]?.name||item).toLowerCase()}]});body.append(big);
    paragraph(`${ITEMS[item]?.name||'It'}, from ${NAMES[from]}.`);body.append(button('Look','primary-button full',()=>{closeSheet();render();}));
  }else showGiftResult(item);
}
/** The door on the card, with a question mark: who it is stays a surprise until it opens. */
function doorArt(c){
  rect(c,30,14,46,70,'#8c6f4f');rect(c,34,18,38,66,'#b88b5f');rect(c,38,23,30,24,'#a57c53');rect(c,38,52,30,27,'#a57c53');rect(c,64,50,4,4,'#e4c87a');
  rect(c,22,82,62,4,'#9b8466');rect(c,74,8,24,22,'#fffaea');rect(c,82,30,6,4,'#fffaea');c.fillStyle='#6d7a5c';c.font='bold 16px monospace';c.textAlign='center';c.fillText('?',86,25);c.textAlign='left';
}
/** What each of them is like, said once as they come in. */
const MOVING_IN={
  galgan:'Sleeps on the sofa, moves the sofa, and has views about balloons.',
  sernik:'Takes whatever is nearest, eats most of it, and will fetch the toilet paper.',
  kot:'A calico. Wants the warm spot, your seat and the fish. Does not want the umbrella.',
};
/** Whoever is knocking comes in, on both phones, with whatever games they brought. */
function openDoor(){
  const st=store.state,id=st&&atTheDoor(st);if(!id)return;
  sounds.play('knock');if(!operate('welcome',{target:id}))return;
  if(room!=='house'){room='house';decor.roomChanged();}
  render();scene.react(id);setTimeout(()=>sounds.play(id),380);
  showSheet('moved-in',`${NAMES[id]} has moved in.`,'AT THE DOOR');
  const big=pict(id,{mood:'happy'});big.className='big-item';big.dataset.picture=JSON.stringify({who:[{id,mood:'happy'}]});body.append(big);
  paragraph(MOVING_IN[id]||'');
  const games=Object.values(ARCADE_GAMES).filter(g=>g.star===id&&(['jump','drop'].includes(g.id)||ARCADE_VIEWS[g.id]));
  if(games.length)paragraph(`${NAMES[id]} brought ${games.length===1?'a game':'games'} for the arcade: ${games.map(g=>g.title).join(', ')}.`,'settings-small');
  body.append(button('Say hello','primary-button full',()=>{closeSheet();render();tip(PETS.includes(id)?`stroke ${NAMES[id]}.`:`poke ${NAMES[id]}.`,5000);}));
}
/** A dog to put a present on: not one busy being daft in somebody's situation today. */
function freeWearer(){const busy=new Set(Object.values(store.state?.life?.finds||{}).filter(f=>f?.fresh).map(f=>f.actor));return ['galgan','sernik','kot','monki'].filter(id=>isHere(store.state,id)).find(id=>!busy.has(id))||'monki';}
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

function clock(){scene.ambience=ambienceAt(Date.now(),scene.timeOverride??(nightMode==='auto'?null:nightMode));scene.night=scene.ambience.night;document.documentElement.classList.toggle('night',scene.night);$('world-clock').textContent=scene.ambience.time.label;$('world-clock').title=`Central European time · ${scene.ambience.period}`;}
function goTo(place){
  if(!store.state)return;
  if(!store.state.unlocked.includes(place)){sounds.play('boop');tip(place==='garden'?'locked. for now.':'not quite yet.');return;}
  scene.stopTidy();scene.toys.clear();room=place;selectedItem=null;hideMenu();decor.roomChanged();operate('walkWith',{room:place});render();sounds.play('tap');
}
/** A tap pokes. Named portraits in Residents expose options without stealing
 * rapid taps, while a stationary hold remains an optional shortcut. */
function tap(id,point){
  if(!store.state){welcome();return;}
  hideMenu();
  if(id?.startsWith('decor:')){selectedItem=null;decor.open('placed',id);return;}
  if(!id){if(selectedItem){operate('place',{item:selectedItem,room});selectedItem=null;render();}return;}
  if(selectedItem&&ACTORS.includes(id)&&ITEMS[selectedItem]?.wearable){
    operate('wear',{target:id,item:selectedItem});scene.react(id);selectedItem=null;render();sounds.play('gift');return;
  }
  if(ACTORS.includes(id)&&situation()?.sit?.actor===id&&payoff())return;
  if(ACTORS.includes(id)){
    const n=scene.react(id);
    scene.ambient.noteTap(id,performance.now(),n);
    operate('poke',{target:id});
    sounds.play(id);
    // Your person too is only poked, however fast: their panel opening after a tap
    // got in the way of poking them properly. It is a hold away, and in Us two.
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
  if(store.state.hidden?.[id]){operate('found',{target:id});scene.react(id,object.type);sounds.play('win');render();return;}
  if(object.type==='radio'){sounds.toggle();updateSound();scene.react(id,'radio');render();return;}
  scene.react(id,object.type);sounds.play(object.type==='couch'||object.type==='plant'?'wood':'tap');render();
}

/** Holding something is how you ask for its options. */
function hold(id,point){
  if(!store.state||!id)return;
  if(id.startsWith('decor:')){selectedItem=null;decor.open('placed',id);return;}
  if(store.actor&&id===other(store.actor)){personSheet();return;}
  if(ACTORS.includes(id)){residentSheet(id);return;}
  const object=store.state.objects.find(o=>o.id===id);
  if(object)decor.open('placed',object.id);
}

function welcome(){
  showSheet('welcome','Who’s here?','A SMALL PLACE, FOR NOW');
  // A new house is the two of you and Monki. Everybody else comes to the door later.
  const canvas=document.createElement('canvas');canvas.width=220;canvas.height=82;canvas.className='welcome-scene';const c=canvas.getContext('2d');['david','julia','monki'].forEach((id,i)=>character(c,id,63+i*47,68,{scale:1.25}));body.append(canvas);
  paragraph('Choose yourself. Then have a look around.');
  const choices=document.createElement('div');choices.className='choice-people';
  for(const actor of ['david','julia']){const b=button('','person-choice',async()=>{
    b.disabled=true;try{if(store.server)await store.create(actor);else store.solo(actor);closeSheet();render();if(store.connected)firstGiftSheet();}catch(e){toast(e.message);b.disabled=false;}
  });b.append(pict(actor));const label=document.createElement('span');label.textContent=NAMES[actor];b.append(label);choices.append(b);}body.append(choices);
  paragraph(store.server?'Your place saves itself. Invite your person whenever.':'Playing on this device. Start the included server for a shared world.','onboarding-note');
}
/** The first time the other one comes in from the link: who made this, whose dogs these
 * are, and — if there is one — the present, opened right here. In two-phone simulations
 * her first look was a card and a room of strangers, and "not for a long time" was the
 * most common answer afterwards in every autumn. */
function firstVisitSheet(){
  const them=other(store.actor),gift=pendingMail(store.state,store.actor).find(m=>m.kind==='gift');
  showSheet('first-visit',`${NAMES[them]} made this for you.`,'HELLO');
  store.local.lastLook=newest(store.state);store.save();
  const here=present(store.state),gap=Math.min(41,200/here.length),canvas=document.createElement('canvas');canvas.width=220;canvas.height=82;canvas.className='welcome-scene';const c=canvas.getContext('2d');here.forEach((id,i)=>character(c,id,110-(here.length-1)*gap/2+i*gap,68,{scale:1.25,mood:id==='galgan'?'sleep':'idle'}));
  canvas.dataset.picture=JSON.stringify({who:here.map(id=>({id,mood:id==='galgan'?'sleep':undefined}))});body.append(canvas);
  const names=residentsHere(store.state).reverse().map(id=>NAMES[id]);
  paragraph(`${names.length>1?`${names.slice(0,-1).join(', ')} and ${names.at(-1)} live`:`${names[0]} lives`} here now.${names.length<4?' Others will come to the door.':''}`);
  const done=()=>{closeSheet();render();tip('stroke a dog.',6000);setTimeout(openingMoment,400);};
  if(!gift){body.append(button('Look around','primary-button full',done));return;}
  const b=button(`Open ${NAMES[them]}’s present`,'primary-button full',async()=>{
    b.disabled=true;sounds.play('gift');
    if(!operate('openGift',{target:gift.id,wearer:freeWearer()})){b.disabled=false;return;}
    await store.sync();
    const opened=store.state.gifts.find(g=>g.id===gift.id),item=opened?.item;
    if(!item){done();return;}
    // A present from him, straight onto one of her dogs, if it is something to wear and
    // that dog is not in his daily situation. A key or a balloon is simply handed over.
    const name=(ITEMS[item]?.name||item).toLowerCase(),wearer=opened.wornBy;
    if(wearer){
      showSheet('first-present',`${NAMES[wearer]} has taken it.`,`FROM ${NAMES[them].toUpperCase()}`);
      const big=pict(wearer,{hat:item});big.className='big-item';big.dataset.picture=JSON.stringify({who:[{id:wearer,hat:name}]});body.append(big);
    }else{
      showSheet('first-present','For you.',`FROM ${NAMES[them].toUpperCase()}`);
      const big=pict(item);big.className='big-item';big.dataset.picture=JSON.stringify({things:[name]});body.append(big);
    }
    paragraph(`${ITEMS[item]?.name||'It'}, from ${NAMES[them]}.`);
    body.append(button('Look around','primary-button full',done));
  });
  body.append(b);
}
/** Before the link goes out: one thing for them to find the first time they come in,
 * so that their first look is already about the two of you. Once, and skippable. */
function firstGiftSheet(){
  const them=other(store.actor);
  showSheet('first-gift',`Something for ${NAMES[them]} to find.`,'BEFORE YOU INVITE');
  paragraph(`It waits in ${NAMES[them]}’s mailbox until the first time they come in.`);
  const row=document.createElement('div');row.className='surprise-row';
  for(const item of ['flower','bow','glasses'].filter(i=>store.state.inventory.includes(i))){
    const b=button('','surprise-card',()=>{if(!operate('gift',{item}))return;sounds.play('gift');closeSheet();toast('In their mailbox.');});
    b.append(pict(item));const name=document.createElement('span');name.textContent=ITEMS[item].name;b.append(name);row.append(b);
  }
  body.append(row);body.append(button('Later','secondary-button full',closeSheet));
}
/** Everything to do with the other person lives on the other person. */
function personSheet(){
  if(!store.state||!store.actor)return;
  const them=other(store.actor);
  showSheet('person',`For ${NAMES[them]}.`);
  const header=document.createElement('div');header.className='result-picks person-portraits';
  header.append(pict(store.actor));const arrow=document.createElement('span');arrow.textContent='→';
  header.append(arrow,pict(them,{hat:store.state.actors[them].hat}));body.append(header);
  const row=document.createElement('div');row.className='surprise-row person-actions';
  for(const[glyph,label,go]of[['gift','Leave a present',collectionSheet],['draw','Leave a drawing',drawSheet],['hat','Choose their look',()=>residentSheet(them)],['eye','See what happened',historySheet]]){
    const b=button('','surprise-card person-action',go);const strong=document.createElement('strong');strong.innerHTML=icon(glyph);
    const text=document.createElement('span');text.textContent=label;b.append(strong,text);b.setAttribute('aria-label',label);row.append(b);
  }
  body.append(row);
  const links=document.createElement('div');links.className='person-links';
  links.append(button('Pick a frog together','person-link',togetherSheet));
  links.append(button(`Choose ${NAMES[them]}’s next adventure`,'person-link',adventureInviteSheet));
  body.append(links);
  if(store.local.invite&&!store.paired)body.append(button(`Invite ${NAMES[them]}`,'primary-button full person-invite',shareSheet));
}
function collectionSheet(){
  if(!store.state)return;showSheet('collection','Little things.');paragraph('For heads. For the floor. For each other.');
  const grid=document.createElement('div');grid.className='item-grid';
  for(const id of store.state.inventory){const b=button('','collection-item',()=>itemSheet(id));b.append(pict(id));const name=document.createElement('span');name.textContent=ITEMS[id].name;b.append(name);grid.append(b);}body.append(grid);
}
function adventureInviteSheet(){
  showSheet('invite-adventure',`Something for ${NAMES[other(store.actor)]}.`);paragraph('Choose a situation for their next visit. They can play it whenever their next adventure is ready.');
  const grid=document.createElement('div');grid.className='album-grid';
  for(const c of ADVENTURES.filter(c=>c.id!=='up')){const b=button('','memory-card',()=>{if(operate('inviteAdventure',{chapter:c.id})){closeSheet();sounds.play('gift');toast(`Left an adventure for ${NAMES[other(store.actor)]}.`);}});b.append(memoryArt(c));const name=document.createElement('strong');name.textContent=c.title;b.append(name);grid.append(b);}body.append(grid);
}
function itemSheet(id){
  if(!store.state)return;showSheet('item',ITEMS[id].name+'.');const canvas=pict(id);canvas.className='big-item';body.append(canvas);
  const row=document.createElement('div');row.className='button-row item-actions';
  row.append(button('Put it here','secondary-button',()=>{operate('place',{item:id,room});closeSheet();sounds.play('tap');tip('hold + drag to move it');}));
  row.append(button(`Wrap for ${NAMES[other(store.actor)]}`,'primary-button',()=>{if(operate('gift',{item:id})){closeSheet();sounds.play('gift');toast('Left in the house.');}}));body.append(row);
  if(ITEMS[id].wearable){paragraph('Or, a hat.');const options=document.createElement('div');options.className='wear-options';
    present(store.state).forEach(actor=>{const b=button('','',()=>{operate('wear',{target:actor,item:id});closeSheet();scene.react(actor);sounds.play('gift');});b.append(pict(actor,{hat:id}));const small=document.createElement('small');small.textContent=NAMES[actor];b.append(small);b.setAttribute('aria-label',`Put ${ITEMS[id].name} on ${NAMES[actor]}`);options.append(b);});body.append(options);}
  body.append(button('← all little things','quiet-action',collectionSheet));
}
function residentSheet(id){
  if(!store.state)return;showSheet('resident',NAMES[id]+'.');
  const a=store.state.actors[id],canvas=pict(id,{hat:a.hat});canvas.className='big-item';body.append(canvas);
  const row=document.createElement('div');row.className='button-row';
  if(PETS.includes(id))row.append(button('Pet','primary-button',()=>petSheet(id)));
  // The same poke as in the room: on the one in today's situation, that is the end of it.
  row.append(button('Poke','secondary-button',()=>{closeSheet();if(situation()?.sit?.actor===id&&payoff())return;operate('poke',{target:id});scene.react(id);sounds.play('tap');}));
  row.append(button('Make a postcard','secondary-button',()=>life.postcard(id)));
  if(a.room!==room)row.append(button('Come here','secondary-button',()=>{operate('move',{target:id,x:200,y:252,room});closeSheet();}));
  if(a.hat)row.append(button('Hat off','secondary-button',()=>{operate('wear',{target:id,item:null});closeSheet();}));
  const ready=adventureFor(store.state,store.actor);
  if(ready.ready&&ready.actor===id&&!waitsForThem(ready))row.append(button('Play adventure','primary-button',()=>{closeSheet();startIncident();}));body.append(row);
  const people=document.createElement('div');people.className='wear-options';for(const who of present(store.state)){const b=button('','',()=>residentSheet(who));b.append(pict(who));const name=document.createElement('small');name.textContent=NAMES[who];b.append(name);people.append(b);}body.append(people);
  const grid=document.createElement('div');grid.className='item-grid';for(const hat of store.state.inventory.filter(i=>ITEMS[i].wearable)){const b=button('','collection-item',()=>{operate('wear',{target:id,item:hat});closeSheet();sounds.play('gift');});b.append(pict(hat));const name=document.createElement('span');name.textContent=ITEMS[hat].name;b.append(name);b.title=ITEMS[hat].name;b.setAttribute('aria-label',`Wear ${ITEMS[hat].name}`);grid.append(b);}body.append(grid);
}
function petSheet(id){
  scene.toys.clear();showSheet('pet',NAMES[id]+'.','A LITTLE SCRATCH');
  const pad=petCanvas({dog:id,hat:store.state.actors[id].hat,onPet:()=>operate('pet',{target:id}),sound:k=>sounds.play(k),isOpen:()=>sheet.open&&sheetKind==='pet'});body.append(pad.canvas);
  paragraph('Stroke back and forth.');body.append(button('Pet','secondary-button full',pad.pat));
}

/** What the Us two and history panels show, so they are redrawn only when it changes. */
let sheetShown=null;
function sheetShows(){const st=store.state;return sheetKind==='together'?JSON.stringify([st?.choices,store.paired,!!store.local?.invite,store.connected]):sheetKind==='history'?JSON.stringify(st?.log?.slice(0,18).map(e=>e.id)):null;}
function historySheet(){
  if(!store.state)return;showSheet('history','While you were out.');sheetShown=sheetShows();
  if(!store.state.log.length){paragraph('Nothing yet. Leave a present or move something.');return;}
  for(const entry of store.state.log.slice(0,18)){const row=document.createElement('div');row.className='activity-row';row.append(pict(entry.who in NAMES?entry.who:'monki'));const copy=document.createElement('span');copy.className='activity-copy';copy.textContent=describe(entry);row.append(copy);const time=document.createElement('time');time.textContent=relative(entry.at);row.append(time);body.append(row);}
}
function memoryArt(chapter){
  const canvas=document.createElement('canvas');canvas.width=300;canvas.height=190;const c=canvas.getContext('2d');rect(c,0,0,300,190,chapter.color);rect(c,0,145,300,45,'#acb88e');c.drawImage(spriteCanvas(chapter.actor,150,{hat:chapter.reward,mood:'happy'}),100,10);const side=chapter.id!=='up'?'monki':isHere(store.state||{},'sernik')?'sernik':null;if(side)character(c,side,67,166,{scale:1.5,hat:chapter.id==='up'?'icecream':null});item(c,chapter.souvenir,265,167,{scale:1.15});return canvas;
}
function albumSheet(){
  if(!store.state)return;showSheet('album','That happened.','MOMENTS');
  life.albumLinks();
  if(!store.state.moments?.length){
    if(waitsForThem(adventureFor(store.state,store.actor))){const them=NAMES[other(store.actor)];paragraph(`Little pictures of the things you get up to. The first one waits for ${them}.`);body.append(button(`Invite ${them}`,'primary-button full',shareSheet));return;}
    paragraph('Little pictures of the things you get up to. Monki can start the collection.');body.append(button('Help Monki','primary-button full',()=>startIncident()));return;}
  const grid=document.createElement('div');grid.className='album-grid';
  for(const m of store.state.moments){const chapter=ADVENTURES.find(c=>c.id===m.chapter);if(!chapter)continue;const card=button('','memory-card',()=>startIncident({...chapter,index:-1,edition:0,variant:m.variant||'plain',ready:true}));card.setAttribute('aria-label',`Revisit ${chapter.title}`);card.append(memoryArt(chapter));const title=document.createElement('strong');title.textContent=chapter.ending;const who=document.createElement('small');who.textContent=`${NAMES[m.who]} · ${relative(m.at)} · replay`;card.append(title,who);grid.append(card);}body.append(grid);
}

function togetherSheet(){
  if(!store.state)return;showSheet('together','Us two.','SAME HOUSE. DIFFERENT PHONES.');sheetShown=sheetShows();
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
  // Only the Mac's server reports Wi-Fi addresses; the online copy works from anywhere.
  paragraph(store.addresses.length?'Open this link on the other phone. Same Wi-Fi, with the Mac running.':'Open this link on the other phone.');
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
  const mail=store.state?.life?.mail.find(m=>m.giftId===id);if(mail){life.letter(mail.id);return;}
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
  // A third of a pixel on this pad. Full-length decimals made every drawing about three times
  // the size in the world that each sync sends, and a few of them waiting offline outgrew a request.
  const unit=v=>Math.round(Math.max(0,Math.min(1,v))*1000)/1000;
  const point=e=>{const r=canvas.getBoundingClientRect();return[unit((e.clientX-r.left-8)/(r.width-16)),unit((e.clientY-r.top-8)/(r.height-16))];};
  canvas.addEventListener('pointerdown',e=>{if(lines.length>=120||lines.reduce((n,l)=>n+l.length,0)>3500)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);line=[point(e)];lines.push(line);redraw();});canvas.addEventListener('pointermove',e=>{if(!line||line.length>=300||lines.reduce((n,l)=>n+l.length,0)>3500)return;line.push(point(e));redraw();});canvas.addEventListener('pointerup',()=>{if(line?.length===1)line.push([unit(line[0][0]+.003),line[0][1]]);line=null;redraw();});canvas.addEventListener('pointercancel',()=>line=null);
  const row=document.createElement('div');row.className='button-row';row.append(button('Hang it up','primary-button',()=>{if(!lines.length){toast('One small scribble first.');return;}
    // Refused (a dozen things already waiting for them), the drawing stays on the pad with the
    // reason, instead of vanishing under "on the wall.".
    if(!operate('draw',{lines}))return;closeSheet();sounds.play('gift');tip('on the wall.');}));row.append(button('Undo','secondary-button',()=>{lines.pop();redraw();}));row.append(button('Clear','quiet-action',()=>{lines=[];redraw();}));body.append(row);
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
function fridgeSheet(){if(!store.state)return;showSheet('fridge','What’s in here?');fridgeDispose=fridgeUI({body,store,operate,sounds,close:closeSheet});}

/** The arcade in the corner: any game, any time, as long as you like. Nothing is owed and
 * nothing is kept waiting; the one thing that leaves the room is a new best, which turns up
 * on the other one's card as a line they can laugh at. */
function arcadeBests(id){const me=store.actor||'david',them=other(me),scores=store.state?.arcade||{};return {mine:scores[me]?.[id]||0,theirs:scores[them]?.[id]||0,them};}
function arcadeSheet(){
  if(!store.state){welcome();return;}
  showSheet('arcade','The arcade','IN THE CORNER');
  const me=store.actor||'david',them=other(me),games=arcadeList();
  // Both bests on every card, theirs as plainly as yours: who is ahead is half the reason to
  // play one more. A star marks the leader; a game they have not played says so.
  const ahead=games.filter(g=>{const b=arcadeBests(g.id);return b.mine>b.theirs;}).length,behind=games.filter(g=>{const b=arcadeBests(g.id);return b.theirs>b.mine;}).length;
  paragraph(ahead||behind?`You are ahead on ${ahead} ${ahead===1?'game':'games'}, ${NAMES[them]} on ${behind}.`:`Play as long as you like. Your best runs turn up on ${NAMES[them]}’s phone.`);
  const row=document.createElement('div');row.className='album-grid';
  for(const game of games){
    const {mine,theirs}=arcadeBests(game.id),b=button('','memory-card arcade-card',()=>playArcade(game.id));
    b.append(arcadeArt(game.id));const name=document.createElement('strong');name.textContent=game.title;b.append(name);
    const bests=document.createElement('div');bests.className='arcade-bests';
    for(const [who,label,n,lead] of [[me,'You',mine,mine>theirs],[them,NAMES[them],theirs,theirs>mine]]){
      const line=document.createElement('span');line.className='arcade-best'+(lead?' lead':'')+(n?'':' none');line.dataset.who=who;
      const name_=document.createElement('b'),score=document.createElement('em');name_.textContent=label;score.textContent=n?scoreText(game.id,n):'not yet';
      line.append(name_,score);bests.append(line);
    }
    b.setAttribute('aria-label',`${game.title}. Your best ${mine?scoreText(game.id,mine):'not yet'}. ${NAMES[them]}’s best ${theirs?scoreText(game.id,theirs):'not yet'}.`);
    b.append(bests);row.append(b);
  }
  body.append(row);
}
/** Every game that can be played here, in the order they sit in the cabinet. */
function arcadeList(){return Object.values(ARCADE_GAMES).filter(game=>(['jump','drop'].includes(game.id)||ARCADE_VIEWS[game.id])&&(!store.state||isHere(store.state,game.star)));}
function arcadeArt(id){
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=90;const c=canvas.getContext('2d');
  if(ARCADE_VIEWS[id]){ARCADE_VIEWS[id].card(c,{hat:store.state?.actors[ARCADE_GAMES[id].star]?.hat});return canvas;}
  if(id==='jump'){rect(c,0,0,120,90,'#c9e0ec');for(const [x,y,w]of[[8,74,40],[70,44,38],[18,24,32]]){rect(c,x,y,w,6,'#fbf8ee');rect(c,x+2,y+5,w-4,2,'#dfe2d4');}character(c,'monki',58,64,{scale:1.1,mood:'happy',shadow:false,hat:store.state?.actors.monki.hat});}
  else{rect(c,0,0,120,90,'#eadcc0');rect(c,0,78,120,12,'#b9926a');item(c,'icecream',70,30);item(c,'fish',30,48,{scale:.9});item(c,'frog',96,58,{scale:.8});character(c,'sernik',54,84,{scale:1.1,mood:'happy',shadow:false,hat:store.state?.actors.sernik.hat});}
  return canvas;
}
/** `start` comes only from the test lab: a run begun part-way up, which Again repeats. */
function playArcade(id,start=0){
  if(!store.state)return;
  closeSheet();hideMenu();scene.stopTidy();scene.stopReplay();scene.toys.clear();
  keepArcadeBest();arcade?.stop();arcadeId=id;arcadeStart=start;const info=ARCADE_GAMES[id],{mine,theirs,them}=arcadeBests(id);
  $('arcade-title').textContent=info.title;$('arcade-canvas').setAttribute('aria-label',`${info.title}. ${info.hint}`);$('arcade-over').hidden=true;$('arcade-resume').hidden=true;
  if(!$('arcade').open)$('arcade').showModal();
  scene.resting=true;
  arcade=new ArcadeGame($('arcade-canvas'),id,{sound:(k,pitch)=>sounds.play(k,pitch),reduced:scene.reduced,best:mine,
    rival:theirs?{id:them,name:NAMES[them],best:theirs}:null,hat:store.state.actors[info.star]?.hat,start,cast:present(store.state),
    // Put away mid-run (a call, the phone locked), a new best so far is kept already.
    onPause:paused=>{$('arcade-resume').hidden=!paused;if(paused)keepArcadeBest();},
    onEnd:()=>keepArcadeBest(),onOver:score=>arcadeOver(id,score,mine)});
  if(testMode)window.__arcade=arcade;// the sandbox only: lets a harness steer
}
/** A run's score is kept the moment it is a best: at the end, and when leaving or putting the
 * phone down part-way. Waiting for the result panel lost a best to a quick tap on ×. */
function keepArcadeBest(){
  if(!arcade||!store.state)return;
  const id=arcade.game,score=Math.min(ARCADE_MAX,arcade.score);
  if(score>arcadeBests(id).mine)operate('arcadeBest',{game:id,score});
}
function arcadeOver(id,score,before){
  // Theirs as it is now: they may have played while this run was going on.
  const {theirs,them}=arcadeBests(id),info=ARCADE_GAMES[id],best=score>before,passed=best&&theirs>0&&score>theirs&&before<=theirs;
  $('arcade-score').textContent=scoreText(id,score);
  // How close it was is what makes the next go: "3 metres short of your best."
  $('arcade-line').textContent=!before?(score?'That’s one to beat.':'Again?'):passed?`New best, and past ${NAMES[them]}.`:best?'New best!':score===before?'Level with your best.':`${amount(id,before-score)} short of your best.`;
  $('arcade-sub').textContent=best&&score>=info.news&&(store.paired||theirs>0)?`${NAMES[them]} will see it.`:theirs?`${NAMES[them]}’s best: ${scoreText(id,theirs)}`:'';
  const list=arcadeList().map(game=>game.id),next=list[(list.indexOf(id)+1)%list.length];$('arcade-other').textContent=`Try ${ARCADE_GAMES[next].title}`;$('arcade-other').onclick=()=>{if(performance.now()>=arcadeReadyAt)playArcade(next);};
  // A tap meant for Sernik as the panel slid in was an "Again" nobody chose, and the
  // result vanished before it was read. The buttons listen after a moment.
  arcadeReadyAt=performance.now()+450;
  $('arcade-over').hidden=false;$('arcade-again').focus();
}
function leaveArcade(){
  keepArcadeBest();arcade?.stop();arcade=null;scene.resting=false;if($('arcade').open)$('arcade').close();render();
  // Back from the phone's background straight into a game, the greeting waited for the game.
  if(!greeted)setTimeout(openingMoment,300);
}

function startIncident(selected=null,segment=0){
  if(!store.state){welcome();return;}if(game)return;
  const chosen=Array.isArray(selected?.steps),chapter=chosen?selected:adventureFor(store.state,store.actor);
  previewGame=chosen||testMode;
  // Every way in (Moments, a resident's panel, the room) waits for them, not only the card.
  if(!previewGame&&waitsForThem(chapter)){shareSheet();return;}
  if(!chapter.ready&&!previewGame){revisitSheet();return;}
  closeSheet();hideMenu();scene.stopTidy();scene.stopReplay();scene.toys.clear();
  $('game-chapter').textContent=(testMode?'TEST · ':previewGame?'REVISIT · ':'')+chapter.title;$('resume-game').hidden=true;$('microgame').showModal();
  $('test-controls').hidden=!testMode;
  game=new AdventurePlayer($('micro'),chapter,{cast:present(store.state),startStep:testMode?segment:featuredStepFor(chapter),singleStep:chosen&&typeof selected.singleStep==='boolean'?selected.singleStep:!testMode,sound:k=>sounds.play(k),reduced:scene.reduced,onDone:finishIncident,onStep:({step,spec,hits,goal})=>{
    $('game-title').textContent=spec.title;$('game-hint').textContent=spec.hint;
    $('game-variant').textContent=VARIANT_LABELS[chapter.variant]||'';
    $('game-steps').replaceChildren();
    if(testMode&&hits>=goal&&ADVENTURES.some(c=>c.id===chapter.id)&&chapter.difficulty===undefined)recordCheck(chapter,step);
  }});
}
function finishIncident(chapter){
  game=null;$('microgame').close();
  if(chapter.place){previewGame=false;if(!operate('placeComplete',{place:chapter.place,round:chapter.round}))return;room=chapter.room;render();scene.react(chapter.actor);sounds.play('gift');return;}
  // A story chosen for you can be finished before its room opens (the rocket before the roof).
  if(previewGame){previewGame=false;if(!testMode){if(store.state.unlocked.includes(chapter.room))room=chapter.room;render();scene.react(chapter.actor);return;}showSheet('preview-end',chapter.ending,'TEST COMPLETE · REAL WORLD UNCHANGED');const photo=memoryArt(chapter);photo.className='ending-photo';body.append(photo);paragraph(chapter.detail);body.append(button('Back to test lab','primary-button full',labSheet));return;}
  const beforeDecor=decorProgress(store.state);
  const op=operate('adventureComplete',{chapter:chapter.id,index:chapter.index});if(!op)return;
  if(store.state.unlocked.includes(chapter.room))room=chapter.room;
  hideMenu();render();scene.react(chapter.actor);sounds.play('gift');
  const afterDecor=decorProgress(store.state);
  if(afterDecor>beforeDecor){
    const reward=decorRewardsAt(afterDecor);
    const surface=reward.styles.find(style=>style.room===chapter.room)||reward.styles.find(style=>style.room==='house')||reward.styles[0];
    const surfaceName=surface&&`${surface.name} ${surface.room===chapter.room?'':`${surface.room} `}${surface.surface}`;
    const newThings=[reward.furniture&&FURNITURE[reward.furniture]?.name,surfaceName,reward.finish&&`${reward.finish} finish`].filter(Boolean);
    if(newThings.length)tip(`Unlocked in Decorate: ${newThings.slice(0,2).join(' · ')}`,5200);
  }
}
function leaveGame(){if(game){game.stop();game=null;}$('microgame').close();render();}
function revisitSheet(){
  showSheet('revisit','Again?','YOUR ADVENTURES');
  const ids=new Set((store.state.moments||[]).map(m=>m.chapter));
  const row=document.createElement('div');row.className='album-grid';
  for(const chapter of ADVENTURES.filter(c=>ids.has(c.id))){const b=button('','memory-card',()=>startIncident({...chapter,index:-1,edition:0,variant:'plain',ready:true}));b.append(memoryArt(chapter));const name=document.createElement('strong');name.textContent=chapter.title;b.append(name);row.append(b);}body.append(row);
  if(!ids.size)paragraph('Your first adventure is waiting at home.');
}
function labSheet(){
  if(!testMode){const url=new URL(location.href);url.searchParams.set('test','1');url.hash='';location.assign(url);return;}
  showSheet('test','Adventure test lab','ISOLATED SANDBOX');
  testLab({body,store,scene,play:startIncident,arcade:playArcade,goTo,reset:()=>{scene.toys.clear();scene.ambient.reset();scene.weatherOverride=null;scene.timeOverride=null;clock();room='house';store.solo(store.actor||'david');moveEveryoneIn(store.state);store.state.unlocked=['house','garden','roof','cellar'];store.state.inventory=Object.keys(ITEMS).filter(i=>!['present','frame','ball'].includes(i));store.save();labSheet();}});
  body.append(button('Exit testing · return to real world','primary-button full',()=>{const url=new URL(location.href);url.searchParams.delete('test');location.assign(url);}));
}
function updateSound(){$('sound').innerHTML=icon(sounds.enabled?'sound':'mute');$('sound').setAttribute('aria-label',sounds.enabled?'Turn sound off':'Turn sound on');$('sound').title=sounds.enabled?'Turn sound off':'Turn sound on';}
function settingsSheet(){
  showSheet('settings','Make yourself at home.');
  if(LAN)body.append(button(testMode?'Open test lab':'Testing mode · separate sandbox','secondary-button full',labSheet));
  if(!store.actor){body.append(button('Choose your person','primary-button',welcome));return;}
  const info=[['Here as',NAMES[store.actor]],['World',store.connected?(store.online?'Shared · saved':'Saved here · waiting to sync'):'On this device'],['Sound',sounds.enabled?'On':'Off']];
  for(const[label,value]of info){const row=document.createElement('div');row.className='setting-row';const a=document.createElement('span');a.textContent=label;const b=label==='Sound'?button(value,'',()=>{sounds.toggle();updateSound();settingsSheet();}):document.createElement('span');b.textContent=value;row.append(a,b);body.append(row);}
  const light=document.createElement('div');light.className='setting-row';light.append(document.createTextNode('Outside'));light.append(button({auto:'Follow the clock',day:'Day',night:'Night'}[nightMode],'',()=>{nightMode={auto:'day',day:'night',night:'auto'}[nightMode];clock();settingsSheet();}));body.append(light);
  const row=document.createElement('div');row.className='button-row';if(store.local.invite)row.append(button('Invite your person','primary-button',shareSheet));row.append(button('Save a copy','secondary-button',()=>{const blob=new Blob([store.export()],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monki-world-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('World exported.');}));body.append(row);
  if(store.connected)body.append(button('Continue on my phone ↗','quiet-action',deviceSheet));
  paragraph('Tap residents to poke them. Open Residents and choose a portrait for options. Stroke a dog back and forth to pet it; pull farther away to pick it up. The same drawer holds outfits, drawings, presents and memories.');
  paragraph('Nothing here is owed to anyone. Nobody starves, nothing expires, and leaving for a week is not punished — the residents simply get on with it.','settings-small');
  paragraph(store.connected?'Both phones share this world while this server is available. Offline changes wait on your device and sync when you return.':'This is a local-only world. Run Start Monki World.command for shared play.','settings-small');
  if(store.saveError)paragraph('This browser’s storage is full. Export a copy before leaving.','error-line');
  if(store.connected&&!store.online&&[401,404].includes(store.lastStatus))paragraph(store.lastError,'error-line');
}

// Updates never rewind a drag. Partner activity is an explicit, labelled card.
// The world arrives from the server after boot, so the opening moment is retried
// on every update; once it has been taken, it costs nothing.
store.addEventListener('change',()=>{render();openingMoment();});store.addEventListener('rejected',e=>toast(e.detail));
for(const[id,glyph,label]of[['wardrobe','hat','Dress up'],['draw','draw','Draw'],['surprise','gift','Leave a gift'],['history','eye','Moments']])$(id).innerHTML=icon(glyph)+`<span>${label}</span>`;
$('settings').innerHTML=icon('settings');$('close-sheet').innerHTML=icon('close');$('together-icon').innerHTML=icon('users');$('decorate-icon').innerHTML=icon('house');$('leave-game').innerHTML=icon('close');$('pause-game').innerHTML=icon('pause');
$('room-tools').addEventListener('toggle',e=>$('open-tools').setAttribute('aria-expanded',String(e.newState==='open')));
$('close-sheet').addEventListener('click',closeSheet);sheet.addEventListener('close',()=>{if(sheet.open)return;/* reopened before this arrived: that sheet is not closed */sheetKind=null;fridgeDispose?.();fridgeDispose=null;});sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();}});
$('sound').addEventListener('click',()=>{sounds.toggle();updateSound();});$('settings').addEventListener('click',settingsSheet);$('history').addEventListener('click',albumSheet);$('last-trace').addEventListener('click',()=>store.state?life.mailbox():welcome());$('draw').addEventListener('click',drawSheet);$('surprise').addEventListener('click',collectionSheet);$('together').addEventListener('click',personSheet);$('decorate').addEventListener('click',()=>decor.open());$('wardrobe').addEventListener('click',()=>residentSheet('monki'));$('start-adventure').addEventListener('click',()=>featured?featured():startIncident());
const suppressToyClick=new Set();
$('residents-icon').innerHTML=icon('users');
for(const [id,mode]of [['play-ball','paper'],['play-bubbles','bubbles']]){
  let gesture=null;const b=$(id);
  b.addEventListener('pointerdown',e=>{if(!store.state||scene.tidying||mode==='paper'&&scene.toys.shots.length||mode==='bubbles'&&scene.toys.wand||scene.toys.returning)return;const p=scene.at(e),o=scene.toyOrigin(mode);gesture={x:e.clientX,y:e.clientY,origin:{...o},time:e.timeStamp,dx:o.x-p.x,dy:o.y-p.y,dragging:false};b.setPointerCapture(e.pointerId);});
  const hand=e=>{const p=scene.at(e);return{x:p.x+(gesture?.dx||0),y:p.y+(gesture?.dy||0)};};
  b.addEventListener('pointermove',e=>{if(!gesture)return;const p=hand(e);if(!gesture.dragging&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>9){if(scene.toys.mode!==mode)scene.toys.start(mode);gesture.dragging=scene.toys.beginAim(gesture.origin,gesture.time);}if(gesture.dragging){const events=e.getCoalescedEvents?.();for(const sample of events?.length?events:[e])scene.toys.input('move',hand(sample),sample.timeStamp);}});
  b.addEventListener('pointerup',e=>{if(gesture?.dragging){scene.toys.input('up',hand(e),e.timeStamp);suppressToyClick.add(id);}gesture=null;});
  b.addEventListener('pointercancel',()=>{gesture=null;scene.toys.cancelAim();suppressToyClick.delete(id);});
  b.addEventListener('click',()=>{if(suppressToyClick.delete(id)||scene.toys.shots.length)return;if(!store.state){welcome();return;}if(mode==='paper'){scene.playWith(mode);sounds.play('paper');}else if(scene.toys.mode==='bubbles'&&scene.toys.wand)scene.toys.blow();else scene.toys.start('bubbles');});
}
$('put-away-toy').addEventListener('click',()=>{scene.toys.clear();sounds.play('drop');});
$('tidy-room').addEventListener('click',()=>{if(!store.state||scene.tidying)return;const before=structuredClone(store.state);scene.toys.clear();scene.bubbles=[];hideMenu();if(operate('tidy',{room})){scene.startTidy(before);for(const id of ['tidy-room','play-ball','play-bubbles'])$(id).disabled=true;$('tidy-room').setAttribute('aria-busy','true');}});
item($('ball-art').getContext('2d'),'paper',20,37,{scale:.9});item($('bubble-art').getContext('2d'),'wand',20,38,{scale:.9});$('tidy-icon').innerHTML=icon('broom');
$('arcade-leave').innerHTML=icon('close');$('arcade-pause').innerHTML=icon('pause');
$('arcade-leave').addEventListener('click',leaveArcade);$('arcade').addEventListener('cancel',e=>{e.preventDefault();leaveArcade();});$('arcade').addEventListener('close',()=>{keepArcadeBest();arcade?.stop();arcade=null;scene.resting=false;});
$('arcade-pause').addEventListener('click',()=>{if(arcade&&!arcade.logic.over)arcade.pause(!arcade.paused);});$('arcade-resume').addEventListener('click',()=>arcade?.pause(false));$('arcade-again').addEventListener('click',()=>{if(performance.now()>=arcadeReadyAt)playArcade(arcadeId,arcadeStart);});
$('leave-game').addEventListener('click',leaveGame);$('microgame').addEventListener('cancel',e=>{e.preventDefault();leaveGame();});$('pause-game').addEventListener('click',()=>{if(game)game.pause(!game.paused);});$('resume-game').addEventListener('click',()=>game?.pause(false));
$('test-restart').onclick=()=>{if(game){game.pause(false);game.enter(game.step);}};$('test-next').onclick=()=>{if(game){game.pause(false);game.enter((game.step+1)%3);}};$('test-back').onclick=()=>{leaveGame();labSheet();};$('test-open').onclick=labSheet;$('test-open').hidden=!testMode;
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideMenu();});
document.addEventListener('contextmenu',e=>{if(e.target.closest('canvas,button,.brand'))e.preventDefault();});
document.addEventListener('dragstart',e=>{if(!e.target.closest('input,textarea'))e.preventDefault();});
updateSound();render();clock();setInterval(clock,1000);setInterval(()=>{store.visit();if(document.hidden)return;looked();
  // Left open for hours (a tab on the Mac) is a new opening too: yesterday's "Ha!" stood in
  // front of today's situation and story until somebody switched away and back.
  if(greeted&&Date.now()-lastGreeting>6*3600000){greeted=false;openingMoment();}},15000);

async function boot(){
  if(testMode){if(!store.actor){store.solo('david');moveEveryoneIn(store.state);}store.state.unlocked=['house','garden','roof','cellar'];store.state.inventory=Object.keys(ITEMS).filter(i=>!['present','frame','ball'].includes(i));store.save();labSheet();return;}
  await store.probe();
  const invitation=location.hash.match(/^#join=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  const seat=location.hash.match(/^#seat=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  // The link that brought you in the first time is also how you come back from the chat.
  // On the phone that already has this seat it is simply the world: not "Come in" and the
  // first visit again, which also reset this phone's place and marked their news as seen.
  const seated=!!(store.local?.room&&store.local.token)&&(seat?.[1]===store.local.room&&seat[2]===store.local.token||invitation?.[1]===store.local.room);
  if(seated){history.replaceState(null,'',location.pathname);await store.sync();store.visit();if(invitation&&store.local.invite===invitation[2])shareSheet();else setTimeout(openingMoment,600);}
  else if(seat){showSheet('device-join','Your place is here.');paragraph('Continue your existing character on this device.');body.append(button('Continue here','primary-button full',async()=>{try{await store.restore(seat[1],seat[2]);history.replaceState(null,'',location.pathname);closeSheet();render();tip('welcome back.');setTimeout(openingMoment,400);}catch(error){toast(error.message);}}));}
  else if(invitation){
    showSheet('join','Come in.');paragraph('This link opens your person’s world.');
    if(store.state&&store.local.room!==invitation[1])paragraph('Your current world stays on its server. Save a copy in Settings if you also want a local backup.','settings-small');
    body.append(button('Enter the world','primary-button full',async()=>{try{await store.join(invitation[1],invitation[2]);history.replaceState(null,'',location.pathname);closeSheet();render();greeted=true;lastGreeting=Date.now();firstVisitSheet();}catch(error){toast(error.message);}}));
  }else if(!store.actor)welcome();else{await store.sync();store.visit();setTimeout(openingMoment,600);}
  // Coming back to the app is a new opening. (What was on screen is marked as seen while it
  // is open, every few seconds; never on the way out, which is also the way into the test lab.)
  // The greeting waits for the server's copy (see Store), then is taken at once.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)greeted=false;else if(store.actor)store.sync().finally(()=>setTimeout(openingMoment,300));});
  if(store.loadError)toast('Couldn’t read the local save. Your server world is still available through its invitation.');
  if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
boot();

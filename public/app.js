import {Store} from './store.js';
import {Scene} from './scene.js';
import {Microgame} from './microgames.js';
import {Sounds} from './audio.js';
import {icon,spriteCanvas,character,item,rect,fillSprite} from './art.js';
import {ACTORS,NAMES,ITEMS,other,createWorld} from './shared/world.js';

const $=id=>document.getElementById(id);
const SYMBOLS={poke:'☞',wear:'↑',move:'↔',out:'↗',take:'←',eat:'○',sleep:'z',dig:'▾',build:'▲',guard:'◉',hide:'?',find:'!',gift:'→',open:'↗',draw:'✎',chaos:'↝',play:'→',match:'=',mismatch:'≠',place:'↓',grow:'→'};
const store=new Store(),sounds=new Sounds();
let room='house',selectedItem=null,game=null,sheetKind=null,toastTimer,tipTimer,nightMode='auto',lastRevision=-1,lastCompleted=0;
const sheet=$('sheet'),body=$('sheet-body'),menu=$('interaction-menu');
const scene=new Scene($('world'),{onTap:tap,onMove:(point,place)=>{operate('move',{target:point.id,x:point.x,y:point.y,room:place});sounds.play('tap');hideMenu();},onDoor:goTo,onFrame:drawSheet,onFridge:fridgeSheet,onIncident:startIncident,onGift:giftSheet});

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

function render(){
  const state=store.state||createWorld('preview');
  scene.update(state,room,store.actor||'david');
  $('connection').textContent=!store.actor?'a little world':store.saveError?'storage is full':store.connected?(store.online?(store.paired?'our world · saved':'saved · invite your person'):'saved on this device'):'on this device';
  $('status-dot').classList.toggle('offline',!!store.actor&&(!store.online||store.saveError));
  const titles={house:'Home',garden:'Garden',roof:'Roof',cellar:'?'};
  $('locations').replaceChildren();
  // Somewhere you cannot go yet is not shown at all. Nothing counts down to it.
  for(const place of ['house','garden','roof','cellar'].filter(p=>state.unlocked.includes(p))){
    const b=button('','place-tab'+(room===place?' active':'')+(state.incident?.room===place?' incident':''),()=>goTo(place));
    b.innerHTML=icon(place);b.setAttribute('aria-label',titles[place]);b.setAttribute('aria-current',room===place?'location':'false');$('locations').append(b);
  }
  $('residents').replaceChildren();
  for(const id of ACTORS){const b=button('','resident'+(store.actor===id?' you':''),()=>residentSheet(id));b.title=NAMES[id];b.setAttribute('aria-label',NAMES[id]);b.append(pict(id,{hat:state.actors[id].hat}));$('residents').append(b);}
  $('pocket').replaceChildren();
  for(const id of state.inventory.slice(0,5)){const b=button('','pocket-item'+(selectedItem===id?' selected':''),()=>itemSheet(id));b.title=ITEMS[id].name;b.setAttribute('aria-label',ITEMS[id].name);b.append(pict(id));$('pocket').append(b);}
  const plus=button('+','pocket-item plus',collectionSheet);plus.setAttribute('aria-label','All little things');$('pocket').append(plus);
  const last=state.log[0];
  const img=$('trace-image');
  if(last){img.replaceChildren(pict(last.who in NAMES?last.who:'monki'));const verb=document.createElement('span');verb.className='verb';verb.textContent=SYMBOLS[last.action]||'→';img.append(verb,pict(last.item||last.target));
    $('trace-label').replaceChildren(document.createTextNode(relative(last.at)));}
  else{img.replaceChildren(pict('monki'),pict('potato'));$('trace-label').textContent='';}
  lastCompleted=state.completed;lastRevision=state.revision;
  if(sheetKind==='together')togetherSheet();
  if(sheetKind==='history')historySheet();
}

function clock(){const date=new Date();scene.night=nightMode==='night'||nightMode==='auto'&&(date.getHours()<7||date.getHours()>=20);}
function goTo(place){
  if(!store.state)return;
  if(!store.state.unlocked.includes(place)){sounds.play('boop');tip(place==='garden'?'locked. for now.':'not quite yet.');return;}
  room=place;selectedItem=null;hideMenu();render();sounds.play('tap');
}
function tap(id,point){
  if(!store.state){welcome();return;}
  if(!id){hideMenu();if(selectedItem){operate('place',{item:selectedItem,room});selectedItem=null;render();}return;}
  if(selectedItem&&ACTORS.includes(id)&&ITEMS[selectedItem]?.wearable){operate('wear',{target:id,item:selectedItem});scene.react(id);selectedItem=null;render();sounds.play('gift');tip('✓');return;}
  if(ACTORS.includes(id)){
    operate('poke',{target:id});scene.react(id);sounds.play('tap');
    menu.replaceChildren();const name=document.createElement('b');name.textContent=NAMES[id];menu.append(name);
    const hat=button('','',()=>residentSheet(id));hat.innerHTML=icon('hat')+'a little something';menu.append(hat);
    const move=button('','',()=>{hideMenu();tip('hold + drag');});move.innerHTML=icon('move')+'move';menu.append(move);
    const incident=store.state.incident;if(incident?.actor===id){const play=button('','',()=>startIncident());play.innerHTML=icon('eye')+'what is that?';menu.append(play);}
    menu.style.left=`${Math.max(20,Math.min(80,(point.x+scene.ox)/scene.canvas.width*100))}%`;menu.style.top=`${Math.max(36,(point.y-45+scene.oy)/scene.canvas.height*100)}%`;menu.hidden=false;scene.selected=id;
  }else{
    const object=store.state.objects.find(o=>o.id===id);if(object?.type==='radio'){sounds.toggle();updateSound();tip(sounds.enabled?'♪':'…');}
    else if(object){scene.selected=id;tip(`${ITEMS[object.type]?.name||'thing'} · hold + drag`);}
  }
}

function welcome(){
  showSheet('welcome','Who’s here?','A SMALL PLACE FOR FIVE');
  const canvas=document.createElement('canvas');canvas.width=220;canvas.height=82;canvas.className='welcome-scene';const c=canvas.getContext('2d');ACTORS.forEach((id,i)=>character(c,id,25+i*43,68,{scale:1.25,mood:id==='galgan'?'sleep':'idle'}));body.append(canvas);
  paragraph('Tap things. Move things. See what happens.');
  const choices=document.createElement('div');choices.className='choice-people';
  for(const actor of ['david','julia']){const b=button('','person-choice',async()=>{
    b.disabled=true;try{if(store.server)await store.create(actor);else store.solo(actor);closeSheet();render();}catch(e){toast(e.message);b.disabled=false;}
  });b.append(pict(actor));const label=document.createElement('span');label.textContent=NAMES[actor];b.append(label);choices.append(b);}body.append(choices);
  paragraph(store.server?'Your place saves itself. Invite your person whenever.':'Playing on this device. Start the included server for a shared world.','onboarding-note');
  const instructions=document.createElement('div');instructions.className='instructions';instructions.innerHTML=`<span>${icon('hand')}tap</span><span>${icon('move')}drag</span><span>${icon('gift')}leave things</span>`;body.append(instructions);
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
  if(store.state.incident?.actor===id)row.append(button('What is that?','primary-button',()=>{closeSheet();startIncident();}));body.append(row);
  const grid=document.createElement('div');grid.className='item-grid';for(const hat of store.state.inventory.filter(i=>ITEMS[i].wearable)){const b=button('','collection-item',()=>{operate('wear',{target:id,item:hat});closeSheet();sounds.play('gift');});b.append(pict(hat));b.title=ITEMS[hat].name;b.setAttribute('aria-label',`Wear ${ITEMS[hat].name}`);grid.append(b);}body.append(grid);
}

function historySheet(){
  if(!store.state)return;showSheet('history','Left behind.','A FEW TRACES');
  if(!store.state.log.length){paragraph('Five residents. No explanation yet.');return;}
  const symbols=SYMBOLS;
  for(const entry of store.state.log.slice(0,18)){const row=document.createElement('div');row.className='activity-row';row.append(pict(entry.who));const verb=document.createElement('span');verb.className='verb';verb.textContent=symbols[entry.action]||'→';row.append(verb);if(entry.item)row.append(pict(entry.item));row.append(pict(entry.target));if(entry.count){const count=document.createElement('span');count.textContent=`× ${entry.count}`;row.append(count);}const time=document.createElement('time');time.textContent=relative(entry.at);row.append(time);row.setAttribute('aria-label',`${NAMES[entry.who]||entry.who}: ${entry.action} ${NAMES[entry.target]||ITEMS[entry.target]?.name||entry.target}`);body.append(row);}
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
function surpriseSheet(){
  if(!store.state)return;showSheet('surprise','A small surprise.');paragraph(`For ${NAMES[other(store.actor)]}’s next incident.`);
  const row=document.createElement('div');row.className='surprise-row';for(const[modifier,glyph,label]of[['bouncy','↝','a passing dog'],['tiny','·','a bit smaller'],['windy','≋','a little wind'],['giant','●','a bit larger']]){const b=button('','surprise-card',()=>{operate('chaos',{modifier});closeSheet();sounds.play('gift');toast('Left for later.');});const strong=document.createElement('strong');strong.textContent=glyph;b.append(strong,document.createTextNode(label));row.append(b);}body.append(row);
}
function fridgeSheet(){if(!store.state)return;showSheet('fridge','The fridge.');const canvas=pict(store.state.fridgeAt?'potato':'fridge');canvas.className='big-item';body.append(canvas);if(store.state.fridgeAt)paragraph('…');else body.append(button('Put the potato in','secondary-button full',()=>{operate('fridge');closeSheet();sounds.play('tap');}));}

function startIncident(){
  if(!store.state?.incident||game)return;
  const e=store.state.incident;room=e.room;closeSheet();hideMenu();render();
  const surprise=store.state.chaos[store.actor];const event={...e,modifier:surprise?.modifier||e.modifier};
  $('game-modifier').textContent=surprise?'↝':event.modifier==='plain'?'':{bouncy:'↝',tiny:'·',giant:'●',windy:'≋',sleepy:'z'}[event.modifier];
  const pips=n=>'·'.repeat(Math.min(16,Math.max(0,n)));
  $('game-progress').textContent=pips(e.goal);$('resume-game').hidden=true;$('microgame').showModal();
  game=new Microgame($('micro'),event,{sound:k=>sounds.play(k),reduced:scene.reduced,onProgress:(score,goal)=>$('game-progress').textContent=pips(goal-score),onFinish:finishIncident});
}
/** No score, no prize screen. The game ends and you are simply back in the room,
 * where whatever just happened has left something behind. */
function finishIncident({score,event}){
  game=null;$('microgame').close();
  operate('resolve',{target:event.uid,score});
  room=event.room;closeSheet();hideMenu();render();sounds.play('gift');
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

store.addEventListener('change',render);store.addEventListener('rejected',e=>toast(e.detail));
$('settings').innerHTML=icon('settings');$('close-sheet').innerHTML=icon('close');$('together-icon').innerHTML=icon('users');$('leave-game').innerHTML=icon('close');$('pause-game').innerHTML=icon('pause');
$('close-sheet').addEventListener('click',closeSheet);sheet.addEventListener('close',()=>sheetKind=null);sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();}});
$('sound').addEventListener('click',()=>{sounds.toggle();updateSound();});$('settings').addEventListener('click',settingsSheet);$('history').addEventListener('click',historySheet);$('last-trace').addEventListener('click',historySheet);$('draw').addEventListener('click',drawSheet);$('surprise').addEventListener('click',surpriseSheet);$('together').addEventListener('click',togetherSheet);
$('leave-game').addEventListener('click',leaveGame);$('microgame').addEventListener('cancel',e=>{e.preventDefault();leaveGame();});$('pause-game').addEventListener('click',()=>{if(game)game.setPaused(!game.paused);});$('resume-game').addEventListener('click',()=>game?.setPaused(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideMenu();});
const brand=$('brand-monki').getContext('2d');character(brand,'monki',24,43,{scale:1.1,shadow:false});updateSound();render();clock();setInterval(clock,10000);setInterval(()=>store.visit(),15000);

async function boot(){
  await store.probe();
  const invitation=location.hash.match(/^#join=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  const seat=location.hash.match(/^#seat=([a-f0-9]{24})\.([a-f0-9]{48})$/);
  if(seat){showSheet('device-join','Your place is here.');paragraph('Continue your existing character on this device.');body.append(button('Continue here','primary-button full',async()=>{try{await store.restore(seat[1],seat[2]);history.replaceState(null,'',location.pathname);closeSheet();render();tip('welcome back.');}catch(error){toast(error.message);}}));}
  else if(invitation){
    if(store.local?.room===invitation[1]&&store.local?.invite===invitation[2]){shareSheet();return;}
    showSheet('join','Come in.');paragraph('This link opens your person’s world.');
    if(store.state&&store.local.room!==invitation[1])paragraph('Your current world stays on its server. Save a copy in Settings if you also want a local backup.','settings-small');
    body.append(button('Enter the world','primary-button full',async()=>{try{await store.join(invitation[1],invitation[2]);history.replaceState(null,'',location.pathname);closeSheet();render();tip('you’re here.');}catch(error){toast(error.message);}}));
  }else if(!store.actor)welcome();else{await store.sync();store.visit();}
  if(store.loadError)toast('Couldn’t read the local save. Your server world is still available through its invitation.');
  if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
boot();

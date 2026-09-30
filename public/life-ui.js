import {character,item,rect,spriteCanvas} from './art.js';
import {NAMES,ITEMS,ACTORS,other} from './shared/world.js';
import {DISCOVERIES,plantStage,pendingMail} from './shared/life.js';
import {placeStory} from './shared/places.js';

export function postcardArt(card){
  const canvas=document.createElement('canvas');canvas.width=360;canvas.height=260;canvas.className='postcard-art';
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  rect(c,0,0,360,260,'#fff4d9');rect(c,12,12,336,212,card.scene==='night'?'#455875':card.scene==='garden'?'#c5ded7':'#ebd9b2');
  rect(c,12,170,336,54,card.scene==='house'?'#c1a786':'#a8bb86');
  if(card.scene==='house'){item(c,'couch',85,191,{scale:1.8});rect(c,257,41,60,60,'#9ec5c1');rect(c,284,41,4,60,'#f9e7bb');}
  if(card.scene==='garden'){item(c,'plant',68,186,{scale:1.7});item(c,'mushroom',290,207,{scale:1.4});}
  if(card.scene==='night'){item(c,'moon',285,70,{scale:1.4});for(let i=0;i<14;i++)rect(c,30+(i*53)%291,27+(i*31)%112,2,2,'#f0eac5');}
  c.drawImage(spriteCanvas(card.portrait,180,{hat:card.hat,mood:card.pose}),94,36);
  c.fillStyle='#737b58';c.font='12px monospace';c.textAlign='center';c.fillText('monki world',180,246);
  // What the picture shows, for anything that cannot look at a canvas.
  canvas.dataset.picture=JSON.stringify({who:[{id:card.portrait,hat:card.hat?(ITEMS[card.hat]?.name||card.hat).toLowerCase():undefined,mood:card.pose}]});return canvas;
}

export function lifeUI({store,showSheet,body,button,paragraph,closeSheet,operate,pict,sounds,toast,play,history}){
  const state=()=>store.state;
  const head=id=>{const p=pict(id);p.className='big-item';body.append(p);};
  const savePNG=canvas=>canvas.toBlob(blob=>{if(!blob){toast('Could not save this picture.');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='monki-postcard.png';a.click();toast('Saved to your pictures.');sounds.play('win');setTimeout(()=>URL.revokeObjectURL(url),30000);});
  function reactions(m){
    if(m.to!==store.actor||!m.opened)return;
    const row=document.createElement('div');row.className='button-row reactions';
    for(const [value,label,face]of [['laugh','Ha!','happy'],['wow','?!','idle'],['love','♡','happy']]){
      const b=button(label,'secondary-button',()=>{if(operate('reactLetter',{target:m.id,reaction:value})){sounds.play('gift');letter(m.id);}});
      b.prepend(pict(store.actor,{mood:face}));b.setAttribute('aria-label',`React ${value}`);b.disabled=!!m.reaction;b.classList.toggle('chosen',m.reaction===value);row.append(b);
    }body.append(row);
  }
  function letter(id){
    const m=state().life.mail.find(m=>m.id===id);if(!m)return;
    showSheet('letter',m.from===store.actor?`You left this for ${NAMES[m.to]}`:`From ${NAMES[m.from]}`,'MAILBOX');
    if(m.from===store.actor&&m.reaction&&!m.reactionSeen)operate('readReaction',{target:m.id});
    if(m.kind==='gift'){
      const g=state().gifts.find(g=>g.id===m.giftId);
      // An old letter whose present has long been opened (and dropped from the list) is not
      // offered to open again: that only answered "This gift is for your partner".
      if(!m.opened&&!g?.opened&&m.to===store.actor){const b=button('Open','primary-button full',async()=>{b.disabled=true;if(!operate('openGift',{target:m.giftId})){b.disabled=false;return;}await store.sync();letter(m.id);});head('present');body.append(b);return;}
      if(g?.opened&&!g.item){head('present');paragraph('Opening when connected…');body.append(button('Check again','secondary-button full',async()=>{await store.sync();letter(m.id);}));return;}
      head(g?.item||'present');paragraph(g?.item?ITEMS[g.item]?.name:'A wrapped present.');
    }else{
      if(m.to===store.actor&&!m.opened)operate('openLetter',{target:m.id});
      if(m.kind==='postcard'){const canvas=postcardArt(m);body.append(canvas,button('Save picture','secondary-button full',()=>savePNG(canvas)));}
      else{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=206;canvas.className='draw-pad';const c=canvas.getContext('2d');c.strokeStyle='#61713f';c.lineWidth=2.5;c.lineCap='round';for(const line of m.lines||[]){c.beginPath();line.forEach(([x,y],i)=>i?c.lineTo(x*300,y*206):c.moveTo(x*300,y*206));c.stroke();}body.append(canvas);}
    }
    const latest=state().life.mail.find(x=>x.id===id);reactions(latest);
    if(m.from===store.actor&&m.reaction){paragraph(`${NAMES[m.to]}: ${{laugh:'ha!',wow:'?!',love:'♡'}[m.reaction]}`);}
    body.append(button('← Mailbox','quiet-action',mailbox));
  }
  function mailbox(){
    showSheet('mailbox','Left for each other.','MAILBOX');
    const list=state().life.mail,waiting=new Set(pendingMail(state(),store.actor).map(m=>m.mailId));
    if(!list.length)paragraph('Gifts, drawings, and pictures stay here.');
    for(const m of [...list].sort((a,b)=>Number(waiting.has(b.id))-Number(waiting.has(a.id))).slice(0,60)){
      const b=button('',`mail-row${waiting.has(m.id)?' unread':''}`,()=>letter(m.id));b.append(pict(m.kind==='postcard'?m.portrait:m.kind==='gift'?'present':m.from));const text=document.createElement('span');
      const mine=m.from===store.actor;
      const got={gift:'left you something',drawing:'drew you something',postcard:'made you a picture'}[m.kind];
      const put={gift:'You left something for',drawing:'You drew something for',postcard:'You made a picture for'}[m.kind];
      text.textContent=mine?`${put} ${NAMES[m.to]}`:`${NAMES[m.from]} ${got}`;
      if(m.reaction)text.textContent+=` — ${{laugh:'ha!',wow:'?!',love:'♡'}[m.reaction]}`;b.append(text);body.append(b);
    }
    body.append(button('Make a postcard','secondary-button full',()=>postcard(store.actor)),button('See what moved','quiet-action',history));
  }
  function postcard(portrait=store.actor,existing=null){
    showSheet('postcard','A little picture.','POSTCARDS');
    const card=existing||{portrait,hat:state().actors[portrait].hat,pose:'idle',scene:'house'};
    const preview=document.createElement('div');preview.className='postcard-preview';body.append(preview);const redraw=()=>preview.replaceChildren(postcardArt(card));redraw();
    if(!existing){
      for(const [key,values,labels]of [['portrait',ACTORS,NAMES],['scene',['house','garden','night'],{house:'Home',garden:'Garden',night:'Night'}],['pose',['idle','happy','sleep'],{idle:'…',happy:':D',sleep:'zZ'}],['hat',[null,...state().inventory.filter(i=>ITEMS[i]?.wearable)],null]]){
        const label=document.createElement('label');label.className='postcard-control';label.textContent={portrait:'Who',scene:'Where',pose:'Face',hat:'Hat'}[key];const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);
        for(const v of values){const option=document.createElement('option');option.value=v||'';option.textContent=labels?.[v]||ITEMS[v]?.name||'No hat';option.selected=card[key]===v;select.append(option);}select.onchange=()=>{card[key]=select.value||null;redraw();};label.append(select);body.append(label);
      }
      body.append(button(`Leave for ${NAMES[other(store.actor)]}`,'primary-button full',()=>{if(operate('postcard',{...card,send:true})){sounds.play('gift');closeSheet();toast('In their mailbox.');}}));
      body.append(button('Keep in Moments','secondary-button full',()=>{if(operate('postcard',{...card,send:false})){closeSheet();toast('Picture kept.');}}));
    }
    body.append(button('Save picture to this device','quiet-action',()=>savePNG(preview.firstChild)));
  }
  function find(replay=null){
    const f=replay||state().life.finds[store.actor];if(!f||f.fresh)return;
    const d=DISCOVERIES.find(d=>d.id===f.discovery);showSheet('find','',replay?'FOUND HERE':'SOMETHING SMALL');
    const canvas=document.createElement('canvas');canvas.width=300;canvas.height=220;canvas.className='discovery-art';body.append(canvas);let pokes=0;const c=canvas.getContext('2d');
    const draw=(phase=0)=>{rect(c,0,0,300,220,'#e4e7ce');rect(c,0,165,300,55,'#b5c395');const wave=Math.sin(phase*Math.PI),dx=d.action==='shake'?Math.sin(phase*25)*7*wave:0,dy=['hop','hiccup','float'].includes(d.action)?-wave*18:0;
      c.save();c.translate(150+dx,181+dy);if(d.action==='dance'||d.action==='tilt')c.rotate(wave*.16*(pokes%2?1:-1));c.drawImage(spriteCanvas(f.actor,184,{mood:d.action==='sleep'?'sleep':pokes%3===1?'idle':'happy',hat:pokes<3?d.item:null,frame:pokes}),-96,-167);c.restore();
      if(d.action==='flutter'&&pokes)item(c,d.item,230+Math.sin(phase*12)*14,135-wave*42,{scale:1.3});
      if(d.id==='bath'&&phase>0)for(let i=0;i<6;i++)item(c,'drop',70+i*30,180-wave*70+(i%2)*18,{scale:.25});
      if(pokes>=3)item(c,d.item,240,180,{scale:1.5});};draw();let animation=0;
    const b=button('Poke','secondary-button full',()=>{pokes++;draw();sounds.play(f.actor);cancelAnimationFrame(animation);const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const tick=t=>{if(!canvas.isConnected)return;const p=Math.min(1,(t-start)/650);draw(reduced?0:p);if(p<1&&!reduced)animation=requestAnimationFrame(tick);};animation=requestAnimationFrame(tick);if(pokes>=3){b.disabled=true;take.hidden=false;}});body.append(b);
    const take=button(replay?'Back':'Keep it','primary-button full',()=>{if(!replay&&!operate('collectFind',{target:f.id}))return;sounds.play('gift');closeSheet();});take.hidden=!replay;body.append(take);paragraph(d.title);
  }
  function collection(){
    showSheet('finds','Found here.','MOMENTS');const grid=document.createElement('div');grid.className='item-grid';
    for(const d of DISCOVERIES){const found=state().life.collection.find(c=>c.discovery===d.id);const b=button('','collection-item',()=>found?find(found):toast(d.setup?d.hint:'Let the residents surprise you.'));b.append(pict(found?d.item:'present'));const name=document.createElement('span');name.textContent=found?ITEMS[d.item].name:'?';b.append(name);grid.append(b);}body.append(grid);
  }
  function albumLinks(){
    const row=document.createElement('div');row.className='button-row';row.append(button('Found here','secondary-button',collection),button('Make a postcard','secondary-button',()=>postcard(store.actor)));body.append(row);
    const cards=state().life.postcards;if(cards.length){const grid=document.createElement('div');grid.className='album-grid';for(const card of cards.slice(0,40)){const b=button('','memory-card',()=>postcard(card.portrait,card));b.append(postcardArt(card));grid.append(b);}body.append(grid);}
  }
  function place(id){
    if(id==='farm'){plant();return;}
    const story=placeStory(state(),id),last=state().life.places[id];
    showSheet('place',{pool:'The pond.',hut:'The little house.',sky:'Up here.'}[id]);head(story.item);
    paragraph(story.title);if(last){const name=(ITEMS[last.item]?.name||'something').toLowerCase();paragraph(`${NAMES[last.by]} left ${/^[aeiou]/.test(name)?'an':'a'} ${name} here.`,'settings-small');}
    body.append(button('Play','primary-button full',()=>play(story)));
    if(id==='sky')paragraph('Watch the weather. Borrow a star. Leave something strange for the next person.','settings-small');
  }
  function plant(){
    showSheet('plant','The growing patch.');const p=state().life.plant,stage=plantStage(state());head(stage===4?{sun:'flowercrown',moon:'star',wild:'mushroom'}[p.seed]:stage>=1?'sprout':'plant');
    if(!p){paragraph('One seed. No watering. It grows while you are away.');const row=document.createElement('div');row.className='button-row';for(const [seed,label]of [['sun','Sun seed'],['moon','Moon seed'],['wild','Wild seed']])row.append(button(label,'secondary-button',()=>{if(operate('plantSeed',{seed}))plant();}));body.append(row);}
    else if(p.picked){paragraph('The bloom is in your little things.');body.append(button('Plant something else','secondary-button full',()=>{if(operate('replant'))plant();}));}
    else if(stage===4){paragraph('Something grew.');body.append(button('Pick it','primary-button full',()=>{if(operate('pickBloom')){sounds.play('gift');plant();}}));}
    else paragraph(['The seed is sleeping.','A tiny sprout.','It has leaves now.','Nearly something.'][stage]+' No hurry.');
    const story=placeStory(state(),'farm');paragraph(story.title);body.append(button('Play in the patch','secondary-button full',()=>play(story)));
  }
  return {mailbox,letter,postcard,find,collection,albumLinks,place,plant};
}

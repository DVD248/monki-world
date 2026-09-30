// Reading a screen the way a person would, and acting on it.
//
// Everything here is deliberately about appearance, never about function: an option
// is described as "a small cream dog" and never as "tap to start the adventure".
// Naming what a thing does would hand over the answer the audit exists to measure.

export const LOOKS={
  david:'a person with short dark hair',
  julia:'a person with long hair and glasses',
  monki:'a small brown monkey, a soft toy',
  sernik:'a small cream dog',
  galgan:'a larger dark grey dog',
};

/** What is in front of her. Runs in the page. */
const VISIBLE=`const showing=el=>{const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&Number(getComputedStyle(el).opacity)>0;};`;

export const DESCRIBE=`(()=>{
  ${VISIBLE}
  const LOOKS=${JSON.stringify(LOOKS)};
  const an=w=>/^(sunglasses|headphones|glasses)$/.test(w)?w:w==='moon'?'the moon':(/^[aeiou]/.test(w)?'an ':'a ')+w;
  // Only what is showing. The story's title and hint stay in the page after its panel
  // closes, and read without this they turned up on every other panel too — "Tap the
  // balloons" on the collection screen — which reads as confusion that is not there.
  const scene=window.__scene,text=id=>{const el=document.getElementById(id);return el&&showing(el)?el.textContent.trim():'';};
  const dialog=document.querySelector('dialog[open]');
  const out={
    where_she_is:dialog?(dialog.id==='microgame'?'a small game is open':'a panel has opened over the room'):'looking at the room',
    words_on_screen:{},buttons_she_can_see:[],
    room:document.querySelector('#locations .active span')?.textContent.trim()||'the house',
    in_the_room:[],objects_lying_around:[],marks_left_behind:[],glittering:[],anything_obviously_wrong:[],
  };
  if(dialog){
    out.words_on_screen={eyebrow:text('sheet-eyebrow'),heading:dialog.querySelector('h2')?.textContent.trim()||'',
      body:[...dialog.querySelectorAll('p')].map(p=>p.textContent.trim()).filter(Boolean).slice(0,4).join(' / '),
      game:text('game-chapter'),step:text('game-title'),hint:text('game-hint'),progress:text('game-progress')};
    out.buttons_she_can_see=[...dialog.querySelectorAll('button')].filter(showing).map(b=>b.textContent.trim()).filter(Boolean).slice(0,14);
    // A picture in the panel that says what it shows (data-picture), put into words.
    const said=[...dialog.querySelectorAll('canvas[data-picture]')].filter(showing).map(c=>{try{const p=JSON.parse(c.dataset.picture);
      return [...(p.who||[]).map(w=>(LOOKS[w.id]||w.id)+(w.hat?' wearing '+an(w.hat):'')+(w.mood==='sleep'?', asleep':'')),...(p.things||[]).map(an)].join(', ');}catch{return '';}}).filter(Boolean);
    if(said.length)out.pictures_in_the_panel=said;
  }else{
    // The room answers some touches in words — "hold + drag to move it" — in a tip
    // that fades after a few seconds. Missing it made touching the furniture look dead.
    out.words_on_screen={kicker:text('story-kicker'),headline:text('story-title'),line:text('story-subtitle'),
      main_button:text('start-adventure'),status:text('connection'),tip:text('scene-tip')};
    // The card's small picture is half of what it says — "Captain of the rug." next to a
    // dog in a pirate hat. Read without it, the caption was a riddle. The game says what
    // it drew there (data-picture on #story-art); this only puts it into words.
    const art=document.getElementById('story-art');
    if(art&&showing(art)&&art.dataset.picture){try{const p=JSON.parse(art.dataset.picture);
      const said=[...(p.who||[]).map(w=>(LOOKS[w.id]||w.id)+(w.hat?' wearing '+an(w.hat):'')+(w.mood==='sleep'?', asleep':'')),...(p.things||[]).map(an)].join(', with ');
      if(said)out.small_picture_by_the_headline=said;}catch{}}
    out.buttons_along_the_bottom=[...document.querySelectorAll('.footer-button')].filter(showing).map(b=>b.textContent.trim()).filter(Boolean);
    out.tabs_along_the_top=[...document.querySelectorAll('#locations button')].map(b=>b.getAttribute('aria-label'));
  }
  if(!scene?.state)return out;
  const s=scene.state,room=scene.room,me=scene.actor;
  for(const [id,a] of Object.entries(s.actors)){
    if(a.room!==room)continue;
    // The room plays a petting reaction on every stroke; the save only records one
    // a second. Describe what she sees on screen, not what was written down.
    const pet=scene.petEffects?.[id],beingPetted=pet&&performance.now()-pet.at<1600;
    // A tap plays a reaction too — bigger each time, a spin or a tumble once they know
    // her well — and none of it reaches the save. Describe the reaction she sees.
    const anim=scene.animations?.[id],reacting=anim&&performance.now()-anim.start<anim.ms+900;
    const REACT={hop:'hopped in surprise',shake:'shook itself',spin:'spun right round',tumble:'tumbled over',
                 squash:'squashed flat then boinged back up',flop:'flopped onto its side'};
    out.in_the_room.push({looks:LOOKS[id],
      wearing:a.hat?(window.__itemNames?.[a.hat]||String(a.hat).replace(/([A-Z])/g,' $1').toLowerCase()):'nothing on its head',
      doing:beingPetted?'leaning into her finger, eyes half shut, clearly loving being stroked'
        :reacting?'just '+(REACT[anim.kind]||'jumped')+' when she touched it'+(anim.n>2?', more dramatically each time':'')
        :a.mood==='sleep'?'asleep':a.mood==='happy'?'pleased with itself':a.mood==='annoyed'?'visibly put out':'just standing there',
      is_her:id===me});
  }
  for(const o of s.objects)if(o.room===room)
    out.objects_lying_around.push(String(o.type).replace(/([A-Z])/g,' $1').toLowerCase()
      +(o.movedAt&&Date.now()-o.movedAt<2*86400000?' (moved recently)':''));
  // Things answer a touch too — the bowl hops, the sofa squashes, the lamp shakes — and
  // describing only the characters made every object look dead to the touch.
  const MOVED={hop:'hopped',shake:'shook',squash:'squashed flat and sprang back',spin:'spun round',tumble:'tumbled',flop:'flopped over'};
  const moving=s.objects.filter(o=>o.room===room).filter(o=>{const a=scene.animations?.[o.id];return a&&performance.now()-a.start<a.ms+900;})
    .map(o=>'the '+String(o.type)+' just '+(MOVED[scene.animations[o.id].kind]||'moved')+' when touched');
  // The residents' own little scenes (ambient-life.js): a sock argument, a dog edging
  // away from a finger, Monki checking on a dog. Drawn, and never said, so none of it
  // could land. Worded to match only what is drawn.
  const amb=scene.ambient?.active,L=id=>LOOKS[id]||id;
  if(amb&&performance.now()-amb.at<amb.ms&&amb.roles.every(id=>s.actors[id]?.room===room)){
    const a=amb.roles[0],b=amb.roles[1],id=amb.id,tail=id.split('-').slice(2).join(' ');
    const said={'sock-dispute':L('sernik')+' and '+L('galgan')+' are having a small argument over a sock',
      'bowl-committee':L('galgan')+' and '+L('sernik')+' are standing over the bowl as if holding a meeting',
      'monki-sneaks':L('monki')+' is sneaking up behind '+L('galgan'),
      'monki-entertains-nobody':L('monki')+' is bouncing about in front of the dogs, who are not watching',
      'awkward-passing':'the two people are doing the awkward side-step to get past each other',
      'monki-copies-julia':L('monki')+' is copying '+L('julia')+', bouncing when she bounces',
      'sernik-blocks-julia':L('sernik')+' is standing between '+L('julia')+' and the bowl',
      'private-concert':L(a)+' and '+L(b)+' are bobbing along to the radio',
      'plant-inspection':L('monki')+' is inspecting the plant',
      'galgan-tests-sofa':L('galgan')+' is trying out the sofa for a nap',
      'wrong-telescope':L('monki')+' is looking at a star through the telescope',
      'potato-audience':L('monki')+' is performing for some potatoes'}[id]
      ||(/-follows-/.test(id)?L(b)+' is following '+L(a)+' around'
        :/-pond$/.test(id)?L(a)+' is splashing in the pond'
        :/-notices-/.test(id)?L(a)+' has noticed '+(tail==='new room'?'the room has changed':'the new '+tail)+' and is looking at it'
        :/-avoids-the-finger$/.test(id)?L(a)+' is edging away from her finger'
        :/-checks-/.test(id)?L(a)+' has come over to check on '+L(b):null);
    if(said)moving.push(said);
  }
  out.things_moving=moving;
  for(const t of s.traces)if(t.room===room)out.marks_left_behind.push(String(t.type));
  const find=s.life?.finds?.[me];
  if(find&&s.actors[find.actor]?.room===room)out.glittering.push('a small glitter over one of the characters');
  // A story that is ready waits in the room: a character holding something, and a glitter.
  // It was drawn but never described, so in the simulation a story could only be reached
  // from the card — which a find or a present takes over almost every time.
  const inc=s.incident;
  if(inc&&inc.room===room&&!scene.replaying)out.glittering.push('a small glitter beside '+LOOKS[inc.actor]
    +(inc.id==='balloons'||inc.aftermath==='balloons'?', which is holding three balloons':', with a '+String(inc.item).replace(/([A-Z])/g,' $1').toLowerCase()+' floating by its head')
    +(s.completed===0?', and a small white exclamation mark':''));
  if(room==='house'&&s.gifts.some(g=>!g.opened&&g.to===me))out.glittering.push('a small glitter over a wrapped box on the floor');
  for(const [id,h] of Object.entries(s.hidden||{}))
    if(h.from!==me&&s.objects.some(o=>o.id===id&&o.room===room))out.glittering.push('a small glitter over one of the objects');
  const c=scene.canvas.getContext('2d',{willReadFrequently:true});
  const pixels=c.getImageData(0,0,scene.canvas.width,scene.canvas.height).data;
  let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>8)painted++;
  if(painted/(pixels.length/4)<0.9)out.anything_obviously_wrong.push('part of the picture is not drawn');
  for(const el of document.querySelectorAll('#story-title,#story-subtitle,.footer-button span,#sheet h2'))
    if(el.scrollWidth>el.clientWidth+2)out.anything_obviously_wrong.push('text is cut off: "'+el.textContent.trim().slice(0,28)+'"');
  return out;
})()`;

/** Everything she could physically touch, and where to touch it. Runs in the page. */
export const AFFORDANCES=`(()=>{
  ${VISIBLE}
  const LOOKS=${JSON.stringify(LOOKS)};
  const scene=window.__scene,list=[];
  const dialog=document.querySelector('dialog[open]');
  // The exact inverse of scene.at(). When the room changed how it maps a finger to
  // the floor (a logical size, and a vertical scale sy), a stale copy of this sent
  // every tap to the wrong place, silently. So it is checked against the real thing.
  const at=(x,y)=>{
    const r=scene.canvas.getBoundingClientRect(),W=scene.width||scene.canvas.width,H=scene.height||scene.canvas.height,sy=scene.sy||1;
    const point={px:r.left+(x+scene.ox)*r.width/W,py:r.top+(y*sy+scene.oy)*r.height/H};
    const back=scene.at({clientX:point.px,clientY:point.py});
    if(Math.abs(back.x-x)>2||Math.abs(back.y-y)>2)window.__aimError=(window.__aimError||0)+1;
    return point;};
  if(dialog){
    const buttons=[...dialog.querySelectorAll('button')].filter(b=>b.textContent.trim()&&!b.disabled&&showing(b));
    buttons.slice(0,14).forEach((b,i)=>{
      const slug='btn_'+b.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,22)+'_'+i;
      b.dataset.affordance=slug;
      list.push({id:slug,how:'selector',target:'[data-affordance="'+slug+'"]',
        looks:'a button that says "'+b.textContent.trim()+'"'});
    });
    if(dialog.id==='microgame')list.push({id:'play_the_game',how:'microgame',looks:'the small game itself, which she can play'});
    // She could open Draw, but the pad is a canvas and only buttons were offered,
    // so she could never actually draw anything. A scribble is one drag across it.
    const drawPad=dialog.querySelector('.draw-pad');
    if(drawPad&&showing(drawPad)){const r=drawPad.getBoundingClientRect();
      list.push({id:'scribble_on_the_pad',how:'drag',px:r.left+r.width*.2,py:r.top+r.height*.75,
        tx:r.left+r.width*.78,ty:r.top+r.height*.25,looks:'the blank square in the panel, which she can scribble on with a finger'});}
    const pad=dialog.querySelector('.pet-pad');
    if(pad&&showing(pad)){const r=pad.getBoundingClientRect();
      list.push({id:'rub_the_dog_in_the_panel',how:'stroke',px:r.left+r.width/2,py:r.top+r.height*.55,
        looks:'the big picture of the dog in the panel, which she can rub with a finger'});}
    list.push({id:'put_it_down',how:'stop',looks:'She has had enough for now and puts the phone down.'});
    return list;
  }
  list.push({id:'start',how:'selector',target:'#start-adventure',
    looks:'the large coloured button at the top, next to a small picture'});
  if(!scene?.state){list.push({id:'put_it_down',how:'stop',looks:'She puts the phone down.'});return list;}
  const s=scene.state,room=scene.room,me=scene.actor;
  // A finger goes to the thing itself: the middle of its own touch area when the room has
  // one. A fixed offset above each object's feet missed the bowl, whose area is a thin
  // strip at its base, and touched the dog standing over it instead.
  const own=(id,x,y)=>{const h=[...(scene.hitboxes||[])].reverse().find(h=>h.id===id);return h?at(h.x+h.w/2,h.y+h.h/2):at(x,y);};
  for(const [id,a] of Object.entries(s.actors))if(a.room===room)
    list.push({id:'tap_'+id,how:'canvas',...own(id,a.x,a.y-18),
      looks:LOOKS[id]+(a.hat?', with something on its head':'')+(a.mood==='sleep'?', asleep':'')});
  for(const o of s.objects.filter(o=>o.room===room).slice(0,6))
    list.push({id:'tap_'+o.id,how:'canvas',...own(o.id,o.x,o.y-12),looks:'the '+String(o.type)+' in the room'});
  // Rubbing a dog is a different gesture from tapping it, and does something else.
  for(const id of ['sernik','galgan']){const a=s.actors[id];if(a.room!==room)continue;
    list.push({id:'rub_'+id,how:'stroke',...at(a.x,a.y-19),
      looks:'rub '+LOOKS[id]+' back and forth with a finger, the way you would a real dog'});}
  const ball=document.getElementById('play-ball');
  if(ball&&showing(ball)&&!ball.disabled){
    const r=ball.getBoundingClientRect(),room=scene.canvas.getBoundingClientRect();
    list.push({id:'throw_the_roll',how:'drag',px:r.left+r.width/2,py:r.top+r.height/2,
      tx:room.left+room.width*.3,ty:room.top+room.height*.55,
      looks:'a button along the bottom with a toilet roll on it, labelled "'+(ball.textContent.trim()||'Paper')+'"'});
  }
  // As labelled on the screen. These were once paraphrased — "a small button for more
  // things" for one that says "Residents" — which described what it does, not what she sees.
  for(const [sel,picture] of [['play-bubbles','a bubble wand'],['tidy-room','a broom'],['open-tools','two little people']]){
    const el=document.getElementById(sel);
    if(el&&showing(el))list.push({id:sel.replace(/-/g,'_'),how:'selector',target:'#'+sel,
      looks:'a button along the bottom with '+picture+' on it, labelled "'+(el.textContent.trim()||el.getAttribute('aria-label'))+'"'});
  }
  const tools=document.getElementById('room-tools');
  let toolsOpen=false;try{toolsOpen=!!tools&&tools.matches(':popover-open');}catch{toolsOpen=!!tools&&!tools.hidden&&showing(tools);}
  if(toolsOpen)for(const b of tools.querySelectorAll('button')){
    const label=(b.textContent||b.getAttribute('aria-label')||'').trim();if(!label||!showing(b))continue;
    const slug='tool_'+label.toLowerCase().replace(/[^a-z]+/g,'_').replace(/^_|_$/g,'');
    // The menu re-renders and replaces its buttons, taking any tag with it; an id survives.
    b.dataset.affordance=slug;
    list.push({id:slug,how:'selector',target:b.id?'#'+b.id:'[data-affordance="'+slug+'"]',
      looks:'a button in the little menu that says "'+label+'"'});
  }
  const find=s.life?.finds?.[me];
  if(find&&s.actors[find.actor]?.room===room){const a=s.actors[find.actor];
    list.push({id:'the_glitter',how:'canvas',...at(a.x+28,a.y-58),looks:'the small glitter above one of the characters'});}
  const inc=s.incident;
  if(inc&&inc.room===room&&!scene.replaying){const h=[...(scene.hitboxes||[])].reverse().find(h=>h.id===inc.uid);
    if(h)list.push({id:'the_story_glitter',how:'canvas',...at(h.x+h.w/2,h.y+h.h/2),looks:'the small glitter beside '+LOOKS[inc.actor]+', which has something with it'});}
  if(room==='house'){const g=s.gifts.filter(x=>!x.opened);
    g.slice(0,3).forEach((gift,i)=>{if(gift.to===me)
      list.push({id:'the_present',how:'canvas',...at(208+i*31,282-18),looks:'the small glitter above a wrapped box'});});}
  for(const b of document.querySelectorAll('.footer-button')){
    const label=b.textContent.trim();if(!label||!showing(b))continue;
    b.dataset.affordance='f_'+label.toLowerCase().replace(/[^a-z]+/g,'_');
    list.push({id:'f_'+label.toLowerCase().replace(/[^a-z]+/g,'_'),how:'selector',
      target:'[data-affordance="f_'+label.toLowerCase().replace(/[^a-z]+/g,'_')+'"]',
      looks:'a small icon at the bottom of the screen labelled "'+label+'"'});
  }
  for(const b of document.querySelectorAll('#locations button')){
    const label=b.getAttribute('aria-label');if(!label||!showing(b))continue;
    b.dataset.affordance='go_'+label.toLowerCase().replace(/[^a-z]+/g,'_');
    list.push({id:'go_'+label.toLowerCase().replace(/[^a-z]+/g,'_'),how:'selector',
      target:'[data-affordance="go_'+label.toLowerCase().replace(/[^a-z]+/g,'_')+'"]',
      looks:'a tab at the top labelled "'+label+'"'});
  }
  list.push({id:'put_it_down',how:'stop',looks:'She cannot see anything worth touching, and puts the phone down.'});
  return list;
})()`;

/** Play the open microgame to its end, the way a person who is trying would.
 * Borrowed from the mechanic sweep, so the same driver covers all fourteen. */
export const playStep=(effort='through')=>`(async()=>{
  const g=window.__game;if(!g)return {done:'no game'};
  const effort=${JSON.stringify(effort)};
  if(effort!=='through')return {done:'left',step:g.step,kind:g.spec.kind,through:g.hits/(g.spec.goal||1)};
  const startedAt=g.step,startedTime=g.time;
  const budget=2600,stopAt=Infinity;
  const click=(x,y)=>{g.pointer.x=x;g.pointer.y=y;g.act('down');g.act('up');};
  let ticks=0;
  while(g.phase==='play'&&ticks++<budget&&g.hits<stopAt){
    const bubble=g.obscurers?.find(b=>b.alive);if(bubble){click(bubble.x,bubble.y);continue;}
    switch(g.spec.kind){
      case 'pop':case 'wipe':{const e=g.entities.find(e=>e.alive);if(e)click(e.x,e.y);break;}
      case 'dress':g.pointer={x:80,y:343,down:false};g.act('down');g.pointer.x=225;g.pointer.y=188;g.act('up');break;
      case 'feed':if(!g.throwShot){g.pointer={x:85,y:345,down:false};g.act('down');g.pointer.x=g.dogX();g.pointer.y=246;g.act('up');}break;
      case 'catch':{const e=[...g.entities].sort((a,b)=>b.y-a.y)[0];if(e)g.pointer.x=e.x;break;}
      case 'pull':if(!g.pointer.down)g.act('down');else if(g.charge>.65)g.act('up');break;
      case 'find':if(g.findPhase==='choose')click(82+g.findOrder.indexOf(g.findTarget)*118,280);break;
      case 'steer':{const e=[...g.entities].sort((a,b)=>b.y-a.y)[0];g.pointer.x=e?.x>200?50:350;break;}
      case 'aim':if(!g.throwShot){g.pointer={x:85,y:345,down:false};g.act('down');Object.assign(g.pointer,g.aimTarget());g.act('up');}break;
      case 'stack':if(Math.abs(g.stackX()-200)<30)click(200,300);break;
      case 'trail':{const e=g.path[g.hits];if(e)click(e.x,e.y);break;}
      case 'sort':g.pointer={x:200,y:198,down:false};g.act('down');g.pointer.x=g.sortRight?300:100;g.pointer.y=325;g.act('up');break;
      case 'sequence':if(!g.sequenceShow)click(82+g.sequence[g.sequenceAt]*118,270);break;
      case 'match':if(g.matchWait<=0){let i;
        if(g.firstCard!==null)i=g.cards.findIndex((c,i)=>i!==g.firstCard&&!c.done&&!c.open&&c.value===g.cards[g.firstCard].value);
        else i=g.cards.findIndex(c=>!c.done&&!c.open);
        if(i>=0)click(77+i%3*123,168+Math.floor(i/3)*120);}break;
    }
    if(g.phase==='play')g.update(.04);
  }
  // Run the payoff pause out so the next step (or the ending) is actually reached.
  const over=()=>g.phase==='ending'||g.phase==='complete';
  for(let i=0;i<220&&g.step===startedAt&&!over();i++)g.update(.04);
  return {done:over()?'chapter':g.step>startedAt?'step':'stalled',
          step:startedAt,kind:g.spec.kind,seconds:+(g.time-startedTime).toFixed(1),total:+g.time.toFixed(1)};
})()`;

import {FRIDGE_INGREDIENTS} from './shared/fridge.js';
import {NAMES,ITEMS,other} from './shared/world.js';
import {spriteCanvas} from './art.js';

export function fridgeUI({body,store,operate,sounds,close}){
  const root=document.createElement('div');root.className='fridge-interior';body.append(root);let selected=[],busy=false,timer;
  const button=(text,fn,cls='secondary-button')=>{const b=document.createElement('button');b.className=cls;b.textContent=text;b.onclick=fn;return b;};
  const caption=text=>{const p=document.createElement('p');p.textContent=text;root.append(p);};
  // What this panel shows. Redrawn only when that changes: redrawn on every sync, its buttons
  // were replaced under a finger whenever the other one did anything at all.
  const shows=()=>JSON.stringify([store.state?.fridgeBox?.batch,store.state?.fridgeAt,store.state?.stuck?.[store.actor]>Date.now(),store.actor]);let shown=null;
  function draw(){
    if(!root.isConnected||busy)return;shown=shows();root.replaceChildren();const batch=store.state.fridgeBox?.batch;
    const freezer=document.createElement('section');freezer.className='freezer-shelf';freezer.setAttribute('aria-label','Freezer');root.append(freezer);
    if(batch){
      const recipe=document.createElement('div');recipe.className='fridge-recipe';for(const id of batch.ingredients)recipe.append(spriteCanvas(id,42));recipe.append(document.createTextNode('→'),spriteCanvas(batch.result,80));freezer.append(recipe);
      caption(batch.for?`For ${NAMES[batch.for]}`:`${NAMES[batch.by]} put this in here.`);
      if(!batch.for||batch.for===store.actor){const wear=!(store.state.stuck?.[store.actor]>Date.now());root.append(button(wear?'Try it on':'Take it',()=>{if(operate('fridgeTake',{batch:batch.id,wear})){sounds.play('gift');close();}},'primary-button full'));}
      if(batch.by===store.actor&&!batch.for)root.append(button(`Leave for ${NAMES[other(store.actor)]}`,()=>{if(operate('fridgeLeave',{batch:batch.id})){sounds.play('drop');draw();}},'secondary-button full'));
    }else{
      const slots=document.createElement('div');slots.className='fridge-recipe';slots.setAttribute('aria-label','Selected ingredients');for(let i=0;i<2;i++){const slot=document.createElement('span');slot.className='freezer-slot';if(selected[i])slot.append(spriteCanvas(selected[i],54));else slot.textContent='+';slots.append(slot);}freezer.append(slots);
      caption('Two things. Into the freezer.');
      const pantry=document.createElement('div');pantry.className='fridge-pantry';for(const id of FRIDGE_INGREDIENTS){const b=button('',()=>{selected=selected.includes(id)?selected.filter(i=>i!==id):[...selected.slice(-1),id];draw();},'fridge-ingredient');b.setAttribute('aria-label',ITEMS[id].name);b.setAttribute('aria-pressed',String(selected.includes(id)));b.append(spriteCanvas(id,60));const label=document.createElement('span');label.textContent=ITEMS[id].name;b.append(label);pantry.append(b);}root.append(pantry);
      const freeze=button('Freeze',()=>{if(selected.length!==2)return;busy=true;if(!operate('fridgeMix',{ingredients:selected})){busy=false;draw();return;}sounds.play('sweep');root.classList.add('freezing');freeze.disabled=true;timer=setTimeout(()=>{busy=false;root.classList.remove('freezing');sounds.play('tidy');draw();},650);},'primary-button full');freeze.disabled=selected.length!==2;root.append(freeze);
    }
    if(!store.state.fridgeAt){const potato=button('The potato drawer',()=>{if(operate('fridge')){sounds.play('wood');draw();}},'quiet-action full');root.append(potato);}else{const mark=document.createElement('span');mark.className='potato-drawer';mark.append(spriteCanvas('potato',25));root.append(mark);}
  }
  const update=()=>{if(shows()!==shown)draw();};store.addEventListener('change',update);draw();return()=>{clearTimeout(timer);store.removeEventListener('change',update);};
}

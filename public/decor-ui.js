import {FURNITURE,FINISHES,DECOR_STYLES,SOUVENIR_SPOTS,decorOption,decorAvailable,decorLevel,decorProgress,decorNew} from './shared/decor.js';
import {furniturePreview} from './furniture-art.js';
import {spriteCanvas} from './art.js';
import {ITEMS} from './shared/world.js';

const ROOM_NAMES={house:'Home',garden:'Garden',roof:'Roof',cellar:'Down there'};
const SURFACES={wall:'Walls',floor:'Floor',trim:'Trim',rug:'Rug',view:'Window',ground:'Ground',fence:'Fence',shed:'Little house',sky:'Sky',backdrop:'Distance',tile:'Tiles',facade:'House front'};
// "Traffic cone" and "Lily pad" in the trays, not the ids "cone" and "lily".
const nameOf=type=>FURNITURE[type]?.name||ITEMS[type]?.name||type;
const el=(tag,cls='',text='')=>{const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;};

const PREVIEW_CROPS={
  house:{wall:[158,61,84,38],floor:[40,278,84,38],trim:[43,136,125,55],rug:[148,222,84,38],view:[68,76,96,58]},
  garden:{ground:[155,295,84,38],fence:[102,129,176,70],shed:[155,146,90,85],sky:[95,0,190,82],backdrop:[100,78,200,65]},
  roof:{tile:[72,230,84,38],facade:[70,304,250,34],sky:[95,0,190,82],backdrop:[100,78,200,65]},
  cellar:{wall:[105,43,84,38],floor:[95,225,84,38]},
};
/** A card is a crop of the actual room renderer with only this one choice
 * changed. Time, weather, geometry and patterns therefore match the place. */
function preview(option,surface,room,scene,state){
  const c=el('canvas','decor-swatch'),g=c.getContext('2d');c.width=84;c.height=38;g.imageSmoothingEnabled=false;
  const full=document.createElement('canvas');full.width=400;full.height=340;const ink=full.getContext('2d');ink.imageSmoothingEnabled=false;
  const copy=Object.create(scene);copy.state={...state,catalog:{...state.catalog,styles:{...state.catalog.styles,[room]:{...state.catalog.styles[room],[surface]:option.id}}}};
  Object.assign(copy,{room,width:400,height:340,ox:0,oy:0,sy:1,immersive:true,propScale:1,actorScale:1,hitboxes:[],weather:scene.weatherOverride||scene.weather});
  // Show the same rendered distant scene without foreground fence or roof
  // cutting across the tiny preview; all its colours and shapes stay literal.
  if(surface==='backdrop')copy.sky(ink,(scene.time||0)/1000);
  else copy[room](ink,(scene.time||0)/1000);
  g.drawImage(full,...PREVIEW_CROPS[room][surface],0,0,84,38);
  return c;
}

/** A tray over the bottom edge, not a catalog covering the place being changed. */
export function decorUI({store,editor,body,button,operate,sounds,getRoom,scene,closeTools}){
  let tab='furniture',finish='oak',surface=null,selected=null,pending=null,lastRenderedTab=null,lastRenderedSurface=null,sawUnlocks=false;
  const state=()=>store.state;
  const active=()=>!editor.hidden;
  const unseen=id=>decorNew(state(),store.local?.decorSeen??decorProgress(state()),'furniture',id);
  function sync(){scene.decorEditing=active();scene.decorPlacement=active()?pending:null;scene.selected=selected&&!selected.startsWith('decor:')?selected:null;}
  function open(nextTab='furniture',id=null){
    if(!state())return;
    closeTools();scene.toys.clear();tab=['furniture','styles','placed','storage'].includes(nextTab)?nextTab:'furniture';selected=id;pending=null;lastRenderedTab=null;sawUnlocks=tab==='furniture'||tab==='styles';
    editor.hidden=false;document.documentElement.classList.add('decorating');sync();render();scene.resize();
  }
  function close(){const wasOpen=active();editor.hidden=true;document.documentElement.classList.remove('decorating');pending=null;selected=null;sync();scene.resize();if(wasOpen&&sawUnlocks&&store.local&&decorProgress(state())>(store.local.decorSeen??0)){store.local.decorSeen=decorProgress(state());store.save();}sawUnlocks=false;}
  function roomChanged(){selected=null;pending=null;surface=null;sync();render();}
  function select(id){if(!active())open('placed',id);else{selected=id;pending=null;tab='placed';sync();render();}}
  function place(p){
    if(!active()||!pending)return false;
    const put=pending;pending=null;sync();
    const data=put.kind==='new'?{item:put.id,finish,room:getRoom(),x:p.x,y:p.y}:{target:put.id,room:getRoom(),x:p.x,y:p.y};
    const result=operate(put.kind==='new'?'buyFurniture':'placeFurniture',data);
    if(result){sounds.play('drop');tab='placed';selected=put.kind==='new'?`furn-${result.id||''}`:put.id;}
    render();return true;
  }
  function controls(){
    const top=el('div','decor-editor-head');top.append(el('strong','',`Decorate · ${ROOM_NAMES[getRoom()]}`));top.append(button('Done','decor-done',close));body.append(top);
    const tabs=el('nav','decor-editor-tabs');
    for(const [id,label] of [['furniture','Add'],['styles','Surfaces'],['placed','In place'],['storage','Put away']]){
      const b=button(label,tab===id?'active':'',()=>{tab=id;if(id==='furniture'||id==='styles')sawUnlocks=true;pending=null;selected=null;sync();render();});b.setAttribute('aria-pressed',String(tab===id));tabs.append(b);
    }body.append(tabs);
  }
  function placementHint(whenIdle){
    if(!pending){body.append(el('p','decor-editor-hint',whenIdle));return;}
    const stored=pending.kind==='new'?null:state().catalog.storage.find(o=>o.id===pending.id),name=pending.kind==='new'?FURNITURE[pending.id]?.name:stored&&nameOf(stored.type);
    const row=el('div','decor-editor-footer');row.append(el('p','decor-editor-hint',`${name||'Piece'} · tap the room.`));
    const fallback=button('Place centre','decor-quick',()=>place({x:200,y:259}));fallback.setAttribute('aria-label','Place selected piece in the centre of this room');row.append(fallback);body.append(row);
  }
  function furnitureTab(){
    const strip=el('div','decor-editor-finishes');strip.append(el('span','decor-editor-label','Finish'));
    if(!decorAvailable(state(),'finish',finish))finish='oak';
    for(const [id,f] of Object.entries(FINISHES).filter(([id])=>decorAvailable(state(),'finish',id))){const b=button('',`decor-finish${finish===id?' active':''}`,()=>{finish=id;render();});b.style.setProperty('--finish',f.main);b.title=f.name;b.setAttribute('aria-label',f.name);b.setAttribute('aria-pressed',String(finish===id));strip.append(b);}body.append(strip);
    const rail=el('div','decor-editor-rail');
    const unlocked=Object.entries(FURNITURE).filter(([id])=>decorAvailable(state(),'furniture',id)).sort(([a],[b])=>Number(unseen(b))-Number(unseen(a))||(unseen(a)&&unseen(b)?decorLevel('furniture',b)-decorLevel('furniture',a):0));
    for(const [id,def] of unlocked){
      const b=button('',`decor-editor-card${pending?.kind==='new'&&pending.id===id?' active':''}`,()=>{pending={kind:'new',id};selected=null;sync();render();});
      b.append(furniturePreview(id,finish,54),el('span','',`${def.name}${unseen(id)?' · new':''}`));b.setAttribute('aria-label',`Place ${def.name}`);rail.append(b);
    }
    const next=Object.entries(FURNITURE).filter(([id])=>!decorAvailable(state(),'furniture',id)).sort(([a],[b])=>decorLevel('furniture',a)-decorLevel('furniture',b))[0];
    if(next){const [id,def]=next,locked=el('div','decor-editor-card decor-locked');locked.append(furniturePreview(id,finish,54),el('span','',`${def.name} · next`));rail.append(locked);}
    body.append(rail);
    placementHint('Choose a piece, then tap the room. More appears after adventures.');
  }
  function stylesTab(){
    const available=DECOR_STYLES[getRoom()];if(!available)return;
    if(!available[surface])surface=Object.keys(available)[0];
    const surfaces=el('div','decor-editor-surfaces');
    for(const name of Object.keys(available)){const b=button(SURFACES[name],name===surface?'active':'',()=>{surface=name;render();});b.setAttribute('aria-pressed',String(name===surface));surfaces.append(b);}body.append(surfaces);
    const rail=el('div','decor-editor-rail styles'),choice=decorOption(state(),getRoom(),surface)?.id;
    const seen=store.local?.decorSeen??decorProgress(state());
    const fresh=option=>decorNew(state(),seen,'style',option.id,getRoom(),surface);
    const unlocked=available[surface].filter(option=>decorAvailable(state(),'style',option.id,getRoom(),surface)).sort((a,b)=>Number(fresh(b))-Number(fresh(a))||Number(b.id===choice)-Number(a.id));
    for(const option of unlocked){const b=button('',`decor-editor-card${choice===option.id?' active':''}`,()=>{if(operate('styleRoom',{room:getRoom(),surface,choice:option.id})){sounds.play('tap');render();}});b.append(preview(option,surface,getRoom(),scene,state()),el('span','',`${option.name}${fresh(option)?' · new':''}`));b.setAttribute('aria-label',`${SURFACES[surface]}: ${option.name}`);b.setAttribute('aria-pressed',String(choice===option.id));rail.append(b);}
    const next=available[surface].filter(option=>!decorAvailable(state(),'style',option.id,getRoom(),surface)).sort((a,b)=>decorLevel('style',a.id,getRoom(),surface)-decorLevel('style',b.id,getRoom(),surface))[0];
    if(next){const locked=el('div','decor-editor-card decor-locked');locked.append(preview(next,surface,getRoom(),scene,state()),el('span','',`${next.name} · next`));rail.append(locked);}
    body.append(rail);
    body.append(el('p','decor-editor-hint','These are crops of this room. New surfaces appear after adventures.'));
  }
  function picture(object){return FURNITURE[object.type]&&(!FURNITURE[object.type].legacy||object.finish)?furniturePreview(object.type,object.finish||'oak',48):spriteCanvas(object.type,48);}
  function selectedTools(){
    if(!selected)return;
    const souvenir=selected.startsWith('decor:'),key=souvenir?selected.slice(6):selected;
    const object=souvenir?null:state().objects.find(o=>o.id===key);
    if(!souvenir&&!object){selected=null;return;}
    const row=el('div','decor-editor-selected');row.append(souvenir?spriteCanvas(key,42):picture(object),el('strong','',nameOf(souvenir?key:object.type)));
    if(souvenir){row.append(button('Put away','decor-action',()=>{if(operate('setDecorVisible',{item:key,visible:false})){sounds.play('pick');selected=null;render();}}));}
    else{
      row.append(button('Store','decor-action',()=>{if(operate('storeFurniture',{target:key})){sounds.play('pick');selected=null;render();}}));
      const remove=button('Remove','decor-remove',()=>{if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent='Remove?';return;}if(operate('sellFurniture',{target:key})){sounds.play('drop');selected=null;render();}});row.append(remove);
    }body.append(row);
    if(object&&FURNITURE[object.type]){const strip=el('div','decor-editor-finishes');strip.append(el('span','decor-editor-label','Change finish'));for(const [id,f] of Object.entries(FINISHES).filter(([id])=>decorAvailable(state(),'finish',id))){const b=button('',`decor-finish${object.finish===id?' active':''}`,()=>{if(operate('refinishFurniture',{target:key,finish:id})){sounds.play('tap');render();}});b.style.setProperty('--finish',f.main);b.title=f.name;b.setAttribute('aria-label',f.name);strip.append(b);}body.append(strip);}
  }
  function placedTab(){
    selectedTools();
    if(selected){body.append(el('p','decor-editor-hint','Drag it in the room to move it. Tap In place to choose another.'));return;}
    const rail=el('div','decor-editor-rail');
    for(const object of state().objects.filter(o=>o.room===getRoom()&&o.type!=='fridge')){const b=button('',`decor-editor-card${selected===object.id?' active':''}`,()=>select(object.id));b.append(picture(object),el('span','',nameOf(object.type)));rail.append(b);}
    for(const id of state().decor.filter(id=>SOUVENIR_SPOTS[id]?.[0]===getRoom()&&!state().catalog.hiddenDecor.includes(id))){const b=button('',`decor-editor-card${selected===`decor:${id}`?' active':''}`,()=>select(`decor:${id}`));b.append(spriteCanvas(id,48),el('span','',nameOf(id)));rail.append(b);}
    body.append(rail);body.append(el('p','decor-editor-hint','Tap a piece here or in the room to change it.'));
  }
  function storageTab(){
    const rail=el('div','decor-editor-rail');
    for(const object of state().catalog.storage){const b=button('',`decor-editor-card${pending?.id===object.id?' active':''}`,()=>{pending={kind:'stored',id:object.id};sync();render();});b.append(picture(object),el('span','',nameOf(object.type)));b.setAttribute('aria-label',`Place stored ${nameOf(object.type)}`);rail.append(b);}
    for(const id of state().catalog.hiddenDecor){const b=button('', 'decor-editor-card',()=>{if(operate('setDecorVisible',{item:id,visible:true})){sounds.play('drop');render();}});b.append(spriteCanvas(id,48),el('span','',`Show ${nameOf(id).toLowerCase()}`));rail.append(b);}
    body.append(rail);placementHint(rail.children.length?'Stored pieces can be placed again. Keepsakes return to their spot.':'Nothing put away yet.');
  }
  // What the tray shows. A sync that changed none of it leaves the tray alone: rebuilt on every
  // one, it stopped a scroll along the rail and forgot a pending "Remove?".
  const shows=()=>{const s=state();return JSON.stringify([getRoom(),s?.objects.map(o=>[o.id,o.type,o.finish,o.room]),s?.catalog,s?.decor,s?.unlocked,decorProgress(s),store.local?.decorSeen]);};let shown=null;
  function render(){
    if(!active()||!state())return;shown=shows();
    const sameRail=lastRenderedTab===tab&&(tab!=='styles'||lastRenderedSurface===surface);
    const left=sameRail?body.querySelector('.decor-editor-rail')?.scrollLeft||0:0;
    body.replaceChildren();controls();if(tab==='styles')stylesTab();else if(tab==='placed')placedTab();else if(tab==='storage')storageTab();else furnitureTab();
    const rail=body.querySelector('.decor-editor-rail');if(rail)rail.scrollLeft=left;
    lastRenderedTab=tab;lastRenderedSurface=surface;sync();
  }
  return{open,close,select,place,roomChanged,refresh:()=>{if(active()&&shows()!==shown)render();},isOpen:active};
}

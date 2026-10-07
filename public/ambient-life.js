import {rect,ellipse} from './art.js';

const ACTORS=['david','julia','monki','sernik','galgan','kot'];
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const ease=v=>{const p=clamp(v,0,1);return p*p*(3-2*p);};
const near=(n,a,b)=>clamp(n,a,b);
const pair=(state,room,a,b)=>state.actors[a]?.room===room&&state.actors[b]?.room===room;
const present=(state,room)=>ACTORS.filter(id=>state.actors[id]?.room===room);
const goal=(x,y)=>({x:near(x,45,355),y:near(y,186,302)});

/** Candidate scenes are based on who and what is actually in this room. A scene
 * never summons a resident from somewhere else or permanently moves furniture. */
export function ambientScenes(state,room){
  const here=present(state,room),objects=state.objects.filter(o=>o.room===room),scenes=[];
  const add=(id,roles,targets,effect,ms=5900)=>scenes.push({id,roles,targets,effect,ms});
  if(pair(state,room,'sernik','galgan')){
    const a=state.actors.sernik,b=state.actors.galgan,x=near((a.x+b.x)/2,100,300),y=near((a.y+b.y)/2,215,285);
    add('sock-dispute',['sernik','galgan'],{sernik:goal(x-20,y),galgan:goal(x+20,y)},'sock',6500);
    const bowl=objects.find(o=>o.type==='bowl');
    if(bowl){const side=bowl.x>200?-1:1;add('bowl-committee',['galgan','sernik'],{galgan:goal(bowl.x+side*72,bowl.y-6),sernik:goal(bowl.x-side*6,bowl.y-4)},'committee',6900);}
  }
  if(pair(state,room,'monki','galgan')){
    const dog=state.actors.galgan;
    add('monki-sneaks',['monki','galgan'],{monki:goal(dog.x-25,dog.y-9),galgan:goal(dog.x+12,dog.y)},'sock',6800);
  }
  if(['monki','sernik','galgan'].every(id=>here.includes(id))){
    const m=state.actors.monki,x=near(m.x,135,260),y=near(m.y+40,230,278);
    add('monki-entertains-nobody',['monki','sernik','galgan'],{monki:goal(x,y),sernik:goal(x-46,y+20),galgan:goal(x+46,y+20)},'audience',6600);
  }
  if(pair(state,room,'david','julia')){
    const a=state.actors.david,b=state.actors.julia,x=(a.x+b.x)/2,y=near((a.y+b.y)/2,205,280);
    add('awkward-passing',['david','julia'],{david:goal(x-13,y),julia:goal(x+13,y)},'sidestep',5900);
  }
  if(pair(state,room,'julia','monki')){
    const j=state.actors.julia;
    add('monki-copies-julia',['julia','monki'],{julia:goal(j.x+23,j.y),monki:goal(j.x-16,j.y+5)},'copy',6000);
  }
  if(pair(state,room,'julia','sernik')){
    const bowl=objects.find(o=>o.type==='bowl');
    if(bowl){const side=bowl.x>200?-1:1;add('sernik-blocks-julia',['julia','sernik'],{julia:goal(bowl.x+side*88,bowl.y-13),sernik:goal(bowl.x+side*43,bowl.y-10)},'block',6100);}
  }
  for(const person of ['david','julia'])for(const dog of ['sernik','galgan'])if(pair(state,room,person,dog)){
    const p=state.actors[person],dir=p.x>195?-1:1;
    add(`${dog}-follows-${person}`,[person,dog],{[person]:goal(p.x+dir*66,p.y+2),[dog]:goal(p.x+dir*39,p.y+16)},'paw',5500);
  }
  // Kot gets to the warm spot first, bats at whatever a dog is carrying, and weaves round legs.
  const couch=objects.find(o=>o.type==='couch');
  if(couch&&pair(state,room,'kot','galgan'))add('kot-takes-the-sofa',['kot','galgan'],{kot:goal(couch.x+14,couch.y+14),galgan:goal(couch.x+52,couch.y+22)},'nap',6900);
  if(pair(state,room,'kot','sernik')){const d=state.actors.sernik,side=d.x>200?-1:1;add('kot-bats-the-sock',['kot','sernik'],{sernik:goal(d.x,d.y),kot:goal(d.x+side*34,d.y+4)},'sock',6200);}
  for(const person of ['david','julia'])if(pair(state,room,person,'kot')){const p=state.actors[person],dir=p.x>195?-1:1;add(`kot-weaves-${person}`,[person,'kot'],{[person]:goal(p.x+dir*20,p.y+2),kot:goal(p.x+dir*20,p.y+12)},'paw',5600);}
  const radio=objects.find(o=>o.type==='radio');
  if(radio&&here.length>=2){const roles=here.filter(id=>id==='julia'||id==='david'||id==='monki').slice(0,2);if(roles.length>=2)add('private-concert',roles,{[roles[0]]:goal(radio.x-42,radio.y+34),[roles[1]]:goal(radio.x-12,radio.y+35)},'music',6200);}
  const plant=objects.find(o=>['plant','planter','cactus'].includes(o.type));
  if(plant&&here.includes('monki'))add('plant-inspection',['monki'],{monki:goal(plant.x+24,plant.y+24)},'leaf',5600);
  if(objects.some(o=>o.type==='couch')&&here.includes('galgan')){const couch=objects.find(o=>o.type==='couch');add('galgan-tests-sofa',['galgan'],{galgan:goal(couch.x+22,couch.y+18)},'nap',6900);}
  if(room==='garden')for(const dog of ['sernik','galgan'])if(here.includes(dog))add(`${dog}-pond`,[dog],{[dog]:goal(257,269)},'splash',6000);
  if(room==='roof'&&here.includes('monki'))add('wrong-telescope',['monki'],{monki:goal(184,231)},'star',6200);
  if(room==='cellar'&&here.includes('monki'))add('potato-audience',['monki'],{monki:goal(155,267)},'potato',6400);
  return scenes;
}

/** Ephemeral choreography: all participants return home. No care meter, no
 * scheduled task, no persistent clutter, and no activity-log spam. */
export class AmbientLife{
  constructor({rng=Math.random}={}){this.rng=rng;this.active=null;this.after=null;this.recent=[];this.nextAt=0;this.room=null;this.tap=null;this.holdAt=0;this.lastReactAt=-Infinity;this.lastEvadeAt=-Infinity;this.lastSceneAt=-Infinity;this.observed=null;this.cues=new Map();}
  reset(now=performance.now(),room=this.room){this.active=null;this.after=null;this.room=room;this.tap=null;this.holdAt=0;this.nextAt=now+18000+this.rng()*27000;this.lastSceneAt=-Infinity;}
  // A new piece or a changed surface is noticed by a resident once the player
  // has finished editing. This observes the shared world, so a partner's changes
  // can be noticed too, without adding a notification or a persistent chore.
  observe(state,now){
    const objects=new Map((state?.objects||[]).map(o=>[o.id,{type:o.type,room:o.room,x:o.x,y:o.y}]));
    const styles=new Map(Object.entries(state?.catalog?.styles||{}).map(([room,value])=>[room,JSON.stringify(value)]));
    if(this.observed){
      for(const [id,object] of objects)if(!this.observed.objects.has(id))this.cues.set(object.room,{kind:'object',id,at:now+1000,until:now+120000});
      for(const [room,signature] of styles)if(this.observed.styles.has(room)&&this.observed.styles.get(room)!==signature)this.cues.set(room,{kind:'surface',at:now+1000,until:now+120000});
    }
    this.observed={objects,styles};
  }
  notice(state,room,now){
    const cue=this.cues.get(room);if(!cue)return false;
    if(now>cue.until){this.cues.delete(room);return false;}
    if(now<cue.at)return false;
    const here=present(state,room),id=here.includes('monki')?'monki':here.find(name=>name==='sernik'||name==='galgan')||here[0];
    if(!id)return false;
    const object=cue.kind==='object'?state.objects.find(o=>o.id===cue.id&&o.room===room):null;
    const target=object?goal(object.x+(object.x>200?-26:26),object.y+10):goal(room==='house'?242:room==='garden'?175:200,238);
    this.cues.delete(room);
    return this.start({id:`${id}-notices-${object?.type||'new-room'}`,roles:[id],targets:{[id]:target},effect:'question',ms:4400},state,now);
  }
  choose(state,room){const candidates=ambientScenes(state,room).filter(s=>!this.recent.includes(s.id));const list=candidates.length?candidates:ambientScenes(state,room);return list.length?list[Math.floor(this.rng()*list.length)]:null;}
  start(spec,state,now){
    if(!spec)return false;
    this.active={...spec,at:now,home:Object.fromEntries(spec.roles.map(id=>[id,{...state.actors[id]}]))};
    this.recent=[...this.recent.slice(-4),spec.id];
    this.nextAt=Math.max(this.nextAt,now+45000);
    this.after=null;this.tap=null;return true;
  }
  force(id,state,room,now=performance.now()){
    const spec=ambientScenes(state,room).find(s=>s.id===id);this.room=room;return this.start(spec,state,now);
  }
  noteTap(id,now=performance.now(),intensity=1){
    if(!ACTORS.includes(id)||this.active)return;
    this.tap={id,at:now,intensity};
  }
  poseFor(id,now){
    const a=this.active;if(!a||!a.home[id])return null;
    const p=clamp((now-a.at)/a.ms,0,1),weight=ease(p/.29)*(1-ease((p-.72)/.28)),home=a.home[id],target=a.targets[id];
    let x=home.x+(target.x-home.x)*weight,y=home.y+(target.y-home.y)*weight;
    const action=p>.29&&p<.72,beat=(p-.29)*a.ms/220;
    if(action){
      if(a.effect==='music')y-=Math.abs(Math.sin(beat))*5;
      if(a.id==='sock-dispute')x+=Math.sin(beat*1.4)*(id==='sernik'?5:-5);
      if(a.effect==='sidestep')x+=Math.sin(beat*.65)*(id==='david'?11:-11);
      if(a.effect==='copy')y-=Math.abs(Math.sin(beat*.9))*(id==='monki'?9:3);
      if(a.effect==='audience'&&id==='monki')y-=Math.abs(Math.sin(beat*.95))*9;
      if(a.effect==='block')x+=Math.sin(beat*.75)*9;
      if(a.effect==='committee'&&id==='sernik')x+=Math.sin(beat*1.3)*5;
      if(a.effect==='splash'&&p>.47)y-=Math.abs(Math.sin(beat*1.8))*10;
      if(a.id==='potato-audience'&&id==='monki')y-=Math.abs(Math.sin(beat*.8))*3;
      if(a.id==='kot-bats-the-sock'&&id==='kot')y-=Math.abs(Math.sin(beat*1.7))*7;
      if(a.id.startsWith('kot-weaves')&&id==='kot')x+=Math.sin(beat*.8)*16;
    }
    const mood=!action?home.mood:a.mood|| (a.id==='kot-takes-the-sofa'?(id==='kot'?'sleep':'annoyed'):a.effect==='nap'&&id==='galgan'?'sleep':a.effect==='committee'?(id==='sernik'?'annoyed':'sleep'):a.effect==='audience'&&id!=='monki'?'sleep':a.effect==='block'?(id==='julia'?'idle':'happy'):a.effect==='sidestep'?'idle':a.effect==='copy'?(id==='julia'?'idle':'happy'):a.id==='sock-dispute'?'annoyed':a.id==='monki-sneaks'&&id==='galgan'?(p<.53?'sleep':'annoyed'):'happy');
    const direction=p<.72?target.x-home.x:home.x-target.x;
    return{x,y,room:home.room,mood,running:!action&&weight>.04,flip:Math.abs(direction)>3&&direction<0,ambient:true};
  }
  update(now,scene){
    this.observe(scene.state,now);
    if(this.room!==scene.room){
      if(this.room===null)this.reset(now,scene.room);
      else{this.active=null;this.after=null;this.tap=null;this.holdAt=0;this.room=scene.room;this.nextAt=Math.max(this.nextAt,now+8000,this.lastSceneAt+45000);}
    }
    const blocked=scene.reduced||scene.replaying||scene.tidying||scene.decorEditing||scene.toys.mode||document.querySelector('#sheet')?.open||document.querySelector('#microgame')?.open;
    if(blocked){if(this.active)this.active=null;this.nextAt=Math.max(this.nextAt,now+8000);return;}
    if(this.after&&now>this.after.until)this.after=null;
    const a=this.active;
    if(a){
      if(a.roles.some(id=>{const old=a.home[id],current=scene.state.actors[id];return !current||current.room!==old.room||Math.abs(current.x-old.x)>1||Math.abs(current.y-old.y)>1;})){this.active=null;this.nextAt=Math.max(this.nextAt,now+20000);return;}
      if(scene.down?.hit&&a.roles.includes(scene.down.hit.id)){
        if(!this.holdAt)this.holdAt=now;
        a.at+=now-this.holdAt;this.holdAt=now;
      }else this.holdAt=0;
      if(now-a.at>=a.ms){
        if(a.effect!=='none')this.after={effect:a.effect,x:a.targets[a.roles[0]].x,y:a.targets[a.roles[0]].y,until:now+1000};
        this.active=null;
        this.nextAt=Math.max(this.nextAt,now+35000+this.rng()*50000);
      }
      return;
    }
    if(scene.down||scene.moving)return;
    if(this.tap&&now-this.tap.at>650){
      const {id:target,intensity}=this.tap;this.tap=null;
      if(intensity>=3&&now-this.lastEvadeAt>9000&&this.rng()<.72){
        this.lastEvadeAt=now;this.lastReactAt=now;
        const who=scene.state.actors[target],distance=target==='sernik'?46:target==='galgan'?15:30;
        this.start({id:`${target}-avoids-the-finger`,roles:[target],targets:{[target]:goal(who.x+(who.x>200?-distance:distance),who.y+(target==='monki'?-9:0))},effect:target==='sernik'?'paw':'question',mood:target==='sernik'?'happy':'annoyed',ms:target==='galgan'?4900:3300},scene.state,now);return;
      }
      if(now-this.lastReactAt>14000){
        this.lastReactAt=now;
        if(this.rng()>=.58)return;
        const others=present(scene.state,scene.room).filter(id=>id!==target),friend=others.find(id=>id==='monki')||others.find(id=>['sernik','galgan'].includes(id))||others[0];
        if(friend){const t=scene.state.actors[target],f=scene.state.actors[friend],side=f.x<t.x?-1:1;
          this.start({id:`${friend}-checks-${target}`,roles:[friend,target],targets:{[friend]:goal(t.x+side*29,t.y+7),[target]:goal(t.x+side*7,t.y)},effect:'question',ms:4500},scene.state,now);return;}
      }
    }
    if(this.notice(scene.state,scene.room,now))return;
    if(now>=this.nextAt&&now-this.lastSceneAt>=45000){const spec=this.choose(scene.state,scene.room);if(this.start(spec,scene.state,now)){this.lastSceneAt=now;return;}this.nextAt=now+12000;}
  }
  draw(c,now,scene){
    const a=this.active,after=this.after;
    if(!a&&!after)return;
    const p=a?clamp((now-a.at)/a.ms,0,1):1,effect=a?.effect||after.effect;
    const main=a?.roles[0],pos=main?this.poseFor(main,now):after;
    if(!pos)return;
    const x=pos.x,y=pos.y,visible=a?Math.sin(Math.PI*clamp((p-.19)/.67,0,1)):clamp((after.until-now)/2200,0,1);
    if(visible<=0)return;
    c.save();c.globalAlpha=Math.min(.92,visible);
    if(effect==='sock'){const second=a?.roles[1]?this.poseFor(a.roles[1],now):null;scene.item(c,'sock',second?(x+second.x)/2:x+17,Math.min(y,second?.y||y)-34,{scale:.55,shadow:false});}
    else if(effect==='flower')scene.item(c,'flower',x+22,y-43-Math.sin(now/320)*3,{scale:.55,shadow:false});
    else if(effect==='splash'){for(let i=0;i<5;i++){const dx=(i-2)*8,dy=Math.sin(now/180+i)*5;scene.item(c,'drop',x+dx,y-13-dy,{scale:.25,shadow:false});}}
    else if(effect==='music'){for(let i=0;i<3;i++){const dx=9+i*10,dy=-49-i%2*8-Math.sin(now/270+i)*4;rect(c,x+dx,y+dy,2,10,'#657d68');rect(c,x+dx-3,y+dy+8,5,3,'#657d68');}}
    else if(effect==='star'||effect==='stars'){for(let i=0;i<(effect==='star'?1:3);i++)scene.item(c,'star',x+16+i*13,y-49-i%2*10,{scale:.23,shadow:false});}
    else if(effect==='potato'){for(let i=0;i<3;i++)ellipse(c,x+15+i*8,y-40-i%2*8,2,3,'#8fa9a4');}
    else if(effect==='paw'){for(let i=0;i<4;i++)ellipse(c,x-26+i*12,y+4+i%2*3,2,1.5,'#748b6977');}
    else if(effect==='leaf'){c.save();c.translate(x+20+Math.sin(now/310)*5,y-43+Math.cos(now/380)*4);c.rotate(Math.sin(now/270)*.45);ellipse(c,0,0,6,3,'#8ca876');rect(c,4,0,5,1,'#657d63');c.restore();}
    else if(effect==='question'){for(let i=0;i<3;i++)rect(c,x+14+i*5,y-48-i%2*4,2,2,'#7d886c');}
    else if(effect==='sniff'){for(let i=0;i<2;i++){const dx=x+16+i*5,dy=y-20+Math.sin(now/220+i)*2;rect(c,dx,dy,2,1,'#81977d');}}
    else if(effect==='sidestep'||effect==='committee'){for(let i=0;i<3;i++)rect(c,x+12+i*5,y-47-(i===1?3:0),2,2,'#7d886c');}
    c.restore();
  }
}

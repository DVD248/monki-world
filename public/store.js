import {createWorld,applyOperation,visibleWorld} from './shared/world.js';
const KEY='monki-world-v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class Store extends EventTarget {
  constructor(){super();this.busy=false;this.online=false;this.server=false;this.paired=false;this.addresses=[];this.loadError=false;this.saveError=false;
    try{this.local=JSON.parse(localStorage.getItem(KEY)||'null');}catch{this.local=null;this.loadError=true;}
    if(this.local&&(!this.local.world||!this.local.actor||!Array.isArray(this.local.pending))){this.local=null;this.loadError=true;}
    this.timer=setInterval(()=>this.sync(),3500);document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.sync();this.visit();}});window.addEventListener('online',()=>this.sync());
  }
  get state(){return this.local?.world;}
  get actor(){return this.local?.actor;}
  get connected(){return !!this.local?.room;}
  emit(){this.dispatchEvent(new Event('change'));}
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.local));this.saveError=false;}catch{this.saveError=true;}this.emit();}
  async request(path,options={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);try{const response=await fetch(path,{...options,signal:controller.signal,cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Connection failed'),{status:response.status});return data;}finally{clearTimeout(timeout);}}
  async probe(){try{const info=await this.request('/api/health');this.server=info.ok===true;this.addresses=info.addresses||[];}catch{this.server=false;}this.emit();return this.server;}
  async create(actor){
    if(!this.server)throw new Error('Start the local server to create your shared world.');
    const result=await this.request('/api/rooms',{method:'POST',body:JSON.stringify({actor})});
    this.local={actor,room:result.room,token:result.token,invite:result.invite,world:result.world,pending:[]};this.online=true;this.save();return this.state;
  }
  solo(actor){this.local={actor,world:createWorld(uid()),pending:[]};this.save();}
  async join(room,invite){const result=await this.request('/api/join',{method:'POST',body:JSON.stringify({room,invite})});this.local={actor:result.actor,room:result.room,token:result.token,world:result.world,pending:[]};this.online=true;this.paired=true;this.save();return this.state;}
  async restore(room,token){const result=await this.request('/api/world',{headers:{Authorization:`Bearer ${token}`,'X-Monki-Room':room}});if(!result.actor)throw new Error('Restart the server, then open this link again.');this.local={actor:result.actor,room,token,invite:result.invite,world:result.world,pending:[]};this.online=true;this.paired=result.paired;this.save();return this.state;}
  op(type,fields={}){
    if(!this.local)return;
    const op={...fields,type,id:uid(),actor:this.actor};
    this.local.world=applyOperation(this.state,op);
    if(this.connected)this.local.pending.push(op);
    this.save();this.sync();return op;
  }
  visit(){if(this.local&&Date.now()-this.state.lastVisit>60000)this.op('visit');}
  async sync(){
    if(this.busy||!this.connected||document.hidden)return;
    this.busy=true;
    const credential=this.local.token;
    const batch=this.local.pending.slice(0,100),ids=new Set(batch.map(o=>o.id));
    try{
      const result=await this.request('/api/world',{method:batch.length?'POST':'GET',headers:{Authorization:`Bearer ${credential}`,'X-Monki-Room':this.local.room},...(batch.length?{body:JSON.stringify({operations:batch})}:{})});
      if(this.local.token!==credential)return;
      this.local.pending=this.local.pending.filter(o=>!ids.has(o.id));
      let state=result.world;
      for(const op of this.local.pending){try{state=applyOperation(state,op);}catch{/* Server will validate queued operations. */}}
      const changed=state.revision!==this.state.revision||!this.online||this.paired!==result.paired||batch.length;
      this.local.world=state;this.online=true;this.paired=result.paired;if(result.invite)this.local.invite=result.invite;
      this.lastError=null;
      if(result.rejected?.length){this.lastError=result.rejected[0].error;this.dispatchEvent(new CustomEvent('rejected',{detail:this.lastError}));}
      if(changed)this.save();
    }catch(error){this.online=false;this.lastError=error.status===401?'The invitation needs to be opened again.':'Saved here · will sync when connected';this.emit();}
    finally{this.busy=false;}
  }
  shareURL(){if(!this.local?.invite)return null;let origin=location.origin;if(['localhost','127.0.0.1'].includes(location.hostname)&&this.addresses[0])origin=this.addresses[0];return `${origin}/#join=${this.local.room}.${this.local.invite}`;}
  deviceURL(){if(!this.connected)return null;let origin=location.origin;if(['localhost','127.0.0.1'].includes(location.hostname)&&this.addresses[0])origin=this.addresses[0];return `${origin}/#seat=${this.local.room}.${this.local.token}`;}
  export(){return JSON.stringify({exported:new Date().toISOString(),world:this.state},null,2);}
  dispose(){clearInterval(this.timer);}
}

import {createWorld,applyOperation,visibleWorld,prepareWorld} from './shared/world.js';
import {centralTime} from './shared/ambience.js';
import {decorProgress} from './shared/decor.js';
const KEY='monki-world-v1';
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const sessionId=()=>globalThis.crypto?.randomUUID?.().replaceAll('-','').slice(0,24)
  ||`${Math.random().toString(16).slice(2).padEnd(12,'0')}${Math.random().toString(16).slice(2).padEnd(12,'0')}`.slice(0,24);

export class Store extends EventTarget {
  constructor({sandbox=false}={}){super();this.sessionId=sessionId();this.opSerial=0;this.sandbox=sandbox;this.key=sandbox?'monki-world-sandbox-v1':KEY;this.busy=false;this.online=false;this.server=false;this.paired=false;this.addresses=[];this.loadError=false;this.saveError=false;
    try{this.local=JSON.parse(localStorage.getItem(this.key)||'null');}catch{this.local=null;this.loadError=true;}
    if(sandbox&&this.local){delete this.local.room;delete this.local.token;delete this.local.invite;this.local.pending=[];}
    if(this.local&&(!this.local.world||!this.local.actor||!Array.isArray(this.local.pending))){this.local=null;this.loadError=true;}
    if(this.local){try{this.local.world=prepareWorld(this.local.world);if(!Number.isFinite(this.local.decorSeen))this.local.decorSeen=Math.min(24,decorProgress(this.local.world));}catch{this.loadError=true;}}
    // Back from the background, the copy on this phone is stale until the server answers: a
    // greeting taken from it missed what the other one did meanwhile, and then marked it seen.
    this.timer=setInterval(()=>this.sync(),3500);document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(this.connected)this.attempted=false;this.sync();this.visit();}});window.addEventListener('online',()=>this.sync());
  }
  get state(){return this.local?.world;}
  get actor(){return this.local?.actor;}
  get connected(){return !!this.local?.room;}
  emit(){this.dispatchEvent(new Event('change'));}
  save(){try{localStorage.setItem(this.key,JSON.stringify(this.local));this.saveError=false;}catch{this.saveError=true;}this.emit();}
  async request(path,options={}){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);try{const response=await fetch(path,{...options,signal:controller.signal,cache:'no-store',headers:{'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Connection failed'),{status:response.status});return data;}
    // "signal is aborted without reason" and "Load failed" are what the browser says; on the
    // "Enter the world" and "Continue here" buttons she should read what to do instead.
    catch(e){if(e.status)throw e;throw Object.assign(new Error(e.name==='AbortError'?'The server took too long to answer. Try again in a moment.':'Can’t reach the server. Is the Mac on, and on the same Wi-Fi?'),{cause:e});}
    finally{clearTimeout(timeout);}}
  async probe(){if(this.sandbox)return false;try{const info=await this.request('/api/health');this.server=info.ok===true;this.addresses=info.addresses||[];}catch{this.server=false;}this.emit();return this.server;}
  async create(actor){
    if(!this.server)throw new Error('Start the local server to create your shared world.');
    const result=await this.request('/api/rooms',{method:'POST',body:JSON.stringify({actor})});
    this.local={actor,room:result.room,token:result.token,invite:result.invite,world:result.world,pending:[],decorSeen:decorProgress(result.world)};this.online=true;this.attempted=true;this.save();return this.state;
  }
  solo(actor){const world=createWorld(uid());this.local={actor,world,pending:[],decorSeen:decorProgress(world)};this.save();}
  async join(room,invite){const result=await this.request('/api/join',{method:'POST',body:JSON.stringify({room,invite})});this.local={actor:result.actor,room:result.room,token:result.token,world:result.world,pending:[],decorSeen:decorProgress(result.world)};this.online=true;this.paired=true;this.attempted=true;this.save();return this.state;}
  async restore(room,token){const result=await this.request('/api/world',{headers:{Authorization:`Bearer ${token}`,'X-Monki-Room':room}});if(!result.actor)throw new Error('Restart the server, then open this link again.');this.local={actor:result.actor,room,token,invite:result.invite,world:result.world,pending:[],decorSeen:decorProgress(result.world)};this.online=true;this.paired=result.paired;this.attempted=true;this.save();return this.state;}
  op(type,fields={}){
    if(!this.local)return;
    // A compact per-page sequence lets the shared world recognize an old retry
    // even after hundreds of newer actions have pushed it out of the legacy list.
    const op={...fields,type,id:`m2:${this.sessionId}:${++this.opSerial}`,actor:this.actor};
    this.local.world=applyOperation(this.state,op);
    if(this.connected)this.local.pending.push(op);
    this.save();this.soon();return op;
  }
  // The first touch goes at once; the rest of a burst (petting, Monki poked five times in a
  // row) goes together a moment later. A request per poke passed the server's limit inside a
  // minute, and the phone then sat on "saved on this device" until the limit cooled down.
  // Someone waiting on their own action (a present opening) still calls sync() directly.
  soon(){
    if(this.busy)return;// the request under way sends it as soon as it is back (see syncNow)
    const wait=(this.lastSent||0)+700-Date.now();
    if(wait<=0){this.sync();return;}
    this.soonTimer??=setTimeout(()=>{this.soonTimer=null;this.sync();},wait);
  }
  // Each phone says it is here at most once a minute. Counted from anybody's visit, the
  // second of two people opening it together sent nothing, and kept yesterday's situation.
  // Only while the page is showing: a desktop tab left in the background queued one a minute.
  visit(){if(this.local&&!document.hidden&&Date.now()-(this.local.lastVisitSent||0)>60000){this.local.lastVisitSent=Date.now();this.op('visit',{hour:centralTime().hour});}}
  // A sync already under way is the one to wait for. Returning at once instead meant that
  // opening a present and then waiting for the server showed "Opening when connected…"
  // while perfectly connected: the request that carried the opening was still out.
  sync(){
    if(this.sandbox||!this.connected||document.hidden)return Promise.resolve();
    if(this.busy)return this.inflight||Promise.resolve();
    this.inflight=this.syncNow();return this.inflight;
  }
  async syncNow(){
    this.busy=true;
    const identity=this.local,credential=identity.token;
    try{
      // A new action can arrive while a GET or an older POST is in flight.
      // Drain it before resolving callers that are waiting for their action to save.
      for(let round=0;round<20;round++){
        const batch=this.local.pending.slice(0,100),ids=new Set(batch.map(o=>o.id));
        this.lastSent=Date.now();
        const result=await this.request('/api/world',{method:batch.length?'POST':'GET',headers:{Authorization:`Bearer ${credential}`,'X-Monki-Room':identity.room},...(batch.length?{body:JSON.stringify({operations:batch})}:{})});
        if(this.local!==identity)return;
        this.local.pending=this.local.pending.filter(o=>!ids.has(o.id));
        let state=result.world;
        for(const op of this.local.pending){try{state=applyOperation(state,op);}catch{/* Server will validate queued operations. */}}
        const changed=state.revision!==this.state.revision||!this.online||this.paired!==result.paired||batch.length;
        this.local.world=state;this.online=true;this.paired=result.paired;if(result.invite)this.local.invite=result.invite;
        this.lastError=null;this.lastStatus=0;
        if(result.rejected?.length){this.lastError=result.rejected[0].error;this.dispatchEvent(new CustomEvent('rejected',{detail:this.lastError}));}
        if(changed)this.save();
        if(!this.local.pending.length)break;
      }
    }catch(error){this.online=false;this.lastStatus=error.status||0;
      // A server that answers but does not have this world (started from another folder or
      // data directory) is not the same as no connection, and waiting will not fix it.
      this.lastError=error.status===401?'The invitation needs to be opened again.':error.status===404?'The server that is running does not have this world. Start it from the monki world folder.':'Saved here · will sync when connected';this.emit();}
    finally{this.busy=false;this.attempted=true;}
  }
  shareURL(){if(!this.local?.invite)return null;let origin=location.origin;if(['localhost','127.0.0.1'].includes(location.hostname)&&this.addresses[0])origin=this.addresses[0];return `${origin}/#join=${this.local.room}.${this.local.invite}`;}
  deviceURL(){if(!this.connected)return null;let origin=location.origin;if(['localhost','127.0.0.1'].includes(location.hostname)&&this.addresses[0])origin=this.addresses[0];return `${origin}/#seat=${this.local.room}.${this.local.token}`;}
  export(){return JSON.stringify({exported:new Date().toISOString(),world:this.state},null,2);}
  dispose(){clearInterval(this.timer);}
}

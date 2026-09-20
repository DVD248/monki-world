import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

let child,dir,base,david,julia;
const port=22000+Math.floor(Math.random()*10000);
async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',MONKI_DATA_DIR:dir},stdio:'pipe'});child.stderr.on('data',()=>{});for(let i=0;i<80;i++){try{if((await fetch(`${base}/api/health`)).ok)return;}catch{}await delay(50);}throw new Error('Test server did not start');}
async function stop(){if(child&&child.exitCode===null){const closed=once(child,'exit');child.kill();await closed;}}
async function call(url,{identity,method='GET',body,headers={}}={}){const response=await fetch(base+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(identity?{Authorization:`Bearer ${identity.token}`,'X-Monki-Room':identity.room}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};}
before(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'monki-test-'));base=`http://127.0.0.1:${port}`;await start();});
after(async()=>{await stop();if(dir&&path.basename(dir).startsWith('monki-test-'))await rm(dir,{recursive:true,force:true});});

test('create a private shared world and join it on the second phone',async()=>{
  const a=await call('/api/rooms',{method:'POST',body:{actor:'david'}});assert.equal(a.status,201);david=a.data;
  const b=await call('/api/join',{method:'POST',body:{room:david.room,invite:david.invite}});assert.equal(b.status,200);julia=b.data;
  assert.equal(julia.actor,'julia');assert.equal(julia.room,david.room);assert.notEqual(julia.token,david.token);
});
test('simultaneous partner changes are serialized without losing either',async()=>{
  const calls=await Promise.all([
    call('/api/world',{method:'POST',identity:david,body:{operations:[{id:'move-david',type:'move',target:'couch',x:252,y:209,room:'house'}]}}),
    call('/api/world',{method:'POST',identity:julia,body:{operations:[{id:'hat-julia',type:'wear',target:'monki',item:'bow'}]}}),
  ]);assert.ok(calls.every(c=>c.status===200));
  const saved=(await call('/api/world',{identity:david})).data.world;
  assert.equal(saved.objects.find(o=>o.id==='couch').x,252);assert.equal(saved.actors.monki.hat,'bow');
});
test('API choices stay secret and author identity comes from credentials',async()=>{
  await call('/api/world',{method:'POST',identity:david,body:{operations:[{id:'pick-david',actor:'julia',type:'pick',round:0,choice:4}]}});
  const before=(await call('/api/world',{identity:julia})).data.world;
  assert.equal(before.choices.picks.david,undefined);assert.equal(before.choices.partnerReady,true);
  await call('/api/world',{method:'POST',identity:julia,body:{operations:[{id:'pick-julia',type:'pick',round:0,choice:2}]}});
  const after=(await call('/api/world',{identity:david})).data.world;
  assert.deepEqual(after.choices.picks,{david:4,julia:2});
});
test('queued retry IDs are safe to send twice',async()=>{
  const operations=[{id:'retry-poke',type:'poke',target:'sernik'}];
  await call('/api/world',{method:'POST',identity:david,body:{operations}});
  await call('/api/world',{method:'POST',identity:david,body:{operations}});
  const saved=(await call('/api/world',{identity:david})).data.world;assert.equal(saved.actors.sernik.pokes,1);
});
test('bad invitations, missing credentials, and cross-origin writes are rejected',async()=>{
  assert.equal((await call('/api/join',{method:'POST',body:{room:david.room,invite:'x'.repeat(48)}})).status,403);
  assert.equal((await call('/api/world',{headers:{'X-Monki-Room':david.room}})).status,401);
  assert.equal((await call('/api/rooms',{method:'POST',body:{actor:'david'},headers:{Origin:'https://example.invalid'}})).status,403);
  assert.equal((await call('/data/'+david.room+'.json')).status,404);
  assert.equal((await call('/server.mjs')).status,404);
});
test('saved state survives a full server restart',async()=>{
  const prior=(await call('/api/world',{identity:david})).data.world;
  await stop();await start();
  const next=(await call('/api/world',{identity:david})).data.world;
  assert.deepEqual(next,prior);
});

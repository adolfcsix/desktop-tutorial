'use strict';
/** LiveKit management calls must never hold a room lock indefinitely when SFU stalls.
 * Controlled fake SFU; no claims about real WebRTC media or networks. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {LiveKitBridge}=require('../livekit');
const {Store}=require('../storage');
const {Stage}=require('../stage');
const never=()=>new Promise(()=>{});
function serviceBridge(service){return new LiveKitBridge({url:'ws://127.0.0.1:7880',key:'test-key',secret:'sfu-timeout-test-secret-long',service,operationTimeoutMs:25});}
function within(action,ms=300){return Promise.race([Promise.resolve().then(action),new Promise((_,reject)=>setTimeout(()=>reject(Error('RPC remained pending beyond test deadline')),ms))]);}
test('SFU updateParticipant with no response fails within a bounded deadline, not a hanging promise',async()=>{
 const bridge=serviceBridge({updateParticipant:never});
 await assert.rejects(within(()=>bridge.setPermission('room','u',false)),e=>e.status===502);
});
test('SFU removeParticipant with no response fails within a bounded deadline, not a hanging promise',async()=>{
 const bridge=serviceBridge({removeParticipant:never});
 await assert.rejects(within(()=>bridge.remove('room','u')),e=>e.status===502);
});
test('a timed-out kick persists a reconnect fence and releases per-room lock for other members',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0848-timeout-'));
 try{
  const store=new Store(path.join(dir,'store.json'));
  const host=store.byToken(store.session('Host').token),viewer=store.byToken(store.session('Viewer').token);
  const id=store.createRoom(host,{title:'SFU deadline',type:'voice',tag:'Tâm sự'}).id;
  const bridge=serviceBridge({removeParticipant:never});
  const stage=new Stage(store,bridge);
  for(const user of [host,viewer]){store.join(user,id);stage.enter(user,id);}
  await assert.rejects(within(()=>stage.moderate(host,id,viewer.id,'kick')),e=>e.status===502);
  assert.equal(store.db.livekitSessionFences[stage.fenceKey(id,viewer.id)]?.state,'pending');
  assert.equal(stage.unconfirmedDisconnects.has(stage.fenceKey(id,viewer.id)),true);
  const roster=await within(()=>stage.issueToken(host,id));
  assert.ok(roster.token,'Unaffected host should not remain locked behind a stalled SFU request');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('SFU response before deadline is accepted, and not_found remove remains idempotent',async()=>{
 const bridge=serviceBridge({async updateParticipant(){return {};},async removeParticipant(){throw Object.assign(new Error('not found'),{status:404});}});
 assert.deepEqual(await bridge.setPermission('room','u',true),{connected:true});
 await assert.doesNotReject(bridge.remove('room','u'));
});
test('timed-out SFU publish grant keeps a durable replay fence even if subsequent remove succeeds',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0848-late-grant-'));
 try{
  const store=new Store(path.join(dir,'store.json'));
  const host=store.byToken(store.session('Host').token), viewer=store.byToken(store.session('Viewer').token);
  const id=store.createRoom(host,{title:'Delayed grant',type:'voice',tag:'Tâm sự'}).id;
  let removals=0;
  const bridge=serviceBridge({updateParticipant:never, async removeParticipant(){removals++;}});
  const stage=new Stage(store,bridge);
  for(const u of [host,viewer]){store.join(u,id);stage.enter(u,id);}
  stage.request(viewer,id);
  await assert.rejects(stage.speaker(host,id,viewer.id,true),e=>e.status===502);
  const key=stage.fenceKey(id,viewer.id);
  assert.equal(removals,1,'Best effort SFU removal still runs');
  assert.ok(store.db.livekitSessionFences[key]?.holdUntil>Date.now(),'A late updateParticipant must not be able to grant a new session immediately');
  stage.sweepExpired();
  assert.equal(removals,1,'The background sweep must respect an active replay hold');
  await assert.rejects(stage.issueToken(viewer,id),e=>e.status===409);
  // Make the explicit leave encounter a second SFU outage. Neither success
  // nor failure of that call may erase the original timed-out grant hold.
  bridge.service.removeParticipant=async()=>{removals++;throw Error('SFU unavailable');};
  await stage.exit(viewer,id);
  assert.ok(store.db.livekitSessionFences[key]?.holdUntil>Date.now(),'Failed leave must preserve replay hold');
  bridge.service.removeParticipant=async()=>{removals++;};
  store.join(viewer,id);
  await assert.rejects(stage.issueToken(viewer,id),e=>e.status===409,'Explicit leave/rejoin must not bypass hold');
  const fresh=new Stage(new Store(path.join(dir,'store.json')),bridge);
  fresh.store.join(viewer,id);
  await assert.rejects(fresh.issueToken(viewer,id),e=>e.status===409,'Restart cannot bypass hold');
  // Simulate the deadline passing without sleeping for minutes.
  fresh.store.db.livekitSessionFences[key].holdUntil=Date.now()-1;
  fresh.store.save();
  const token=await fresh.issueToken(viewer,id);
  assert.ok(token.token);
  assert.equal(JSON.parse(Buffer.from(token.token.split('.')[1],'base64url').toString()).video.canPublish,false);
  assert.ok(removals>=3,'A fresh removal is required after the replay hold');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('SFU RPC timeout configuration rejects invalid or unreasonably long values',()=>{
 for(const value of [0,-10,30001,'not-a-number',Infinity])
  assert.throws(()=>serviceBridgeWithTimeout(value),/TUTTT_SFU_RPC_TIMEOUT_MS/);
 function serviceBridgeWithTimeout(value){return new LiveKitBridge({url:'ws://127.0.0.1:7880',key:'test-key',secret:'sfu-timeout-test-secret-long',operationTimeoutMs:value});}
});

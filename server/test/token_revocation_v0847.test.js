'use strict';
/** Regression for self-hosted LiveKit token replay window and failed SFU kick/ban.
 * Deliberately uses a deterministic fake SFU, not a claim of real media validation.
 */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../storage');
const {Stage}=require('../stage');
const {LiveKitBridge}=require('../livekit');
function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0847-'));
 const store=new Store(path.join(dir,'data.json'));
 const host=store.byToken(store.session('Host').token), viewer=store.byToken(store.session('Viewer').token);
 const id=store.createRoom(host,{title:'Security audit',tag:'Tâm sự',type:'voice'}).id;
 let online=false,removals=0;
 const bridge={enabled:true,requireConfigured(){},token(){return {token:'mock'};},
  async remove(){removals++;if(!online)throw Error('SFU offline with uncertain state');},
  async setPermission(){}};
 const stage=new Stage(store,bridge);
 for(const user of [host,viewer]){store.join(user,id);stage.enter(user,id);}
 return {dir,store,id,host,viewer,stage,bridge,setOnline:v=>online=v,getRemovals:()=>removals,close:()=>fs.rmSync(dir,{recursive:true,force:true})};
}

test('self-hosted initial join JWT expires within 90 seconds',()=>{
 const bridge=new LiveKitBridge({url:'ws://127.0.0.1:7880',key:'local-key',secret:'private-test-secret-that-is-long'});
 const issued=bridge.token({id:'viewer-id',name:'Viewer'},'room-1');
 const claims=JSON.parse(Buffer.from(issued.token.split('.')[1],'base64url').toString());
 assert.ok(claims.exp-claims.iat<=90,`JWT validity exceeded 90 seconds: ${claims.exp-claims.iat}`);
 assert.equal(claims.video.canPublish,false);
 assert.equal(issued.expiresAt,claims.exp*1000);
});

test('failed kick retains persistent SFU fence and disallows new token even after room rejoin',async()=>{
 const s=setup();try{
  await assert.rejects(s.stage.moderate(s.host,s.id,s.viewer.id,'kick'),e=>e.status===502);
  const key=s.stage.fenceKey(s.id,s.viewer.id);
  assert.equal(s.stage.unconfirmedDisconnects.has(key),true);
  assert.equal(s.store.db.livekitSessionFences[key]?.state,'pending');
  assert.equal(s.stage.data(s.id).members.has(s.viewer.id),false);
  s.store.join(s.viewer,s.id);
  await assert.rejects(s.stage.issueToken(s.viewer,s.id),e=>e.status===409);
  s.setOnline(true);
  const credential=await s.stage.issueToken(s.viewer,s.id);
  assert.equal(credential.roster.members.find(v=>v.id===s.viewer.id).speaker,false);
  assert.equal(s.stage.unconfirmedDisconnects.has(key),false);
 }finally{s.close();}
});

test('failed ban persists ban and fence; app room join remains forbidden even after SFU recovers',async()=>{
 const s=setup();try{
  await assert.rejects(s.stage.moderate(s.host,s.id,s.viewer.id,'ban',{minutes:10}),e=>e.status===502);
  const key=s.stage.fenceKey(s.id,s.viewer.id);
  assert.ok(s.store.db.roomBans[s.id][s.viewer.id]>Date.now());
  assert.equal(s.stage.unconfirmedDisconnects.has(key),true);
  assert.throws(()=>s.store.join(s.viewer,s.id),e=>e.status===403);
  s.setOnline(true);s.stage.expiryRetryAfter.set(key,0);s.stage.sweepExpired();
  const revoke=s.stage.expiryRevocations.get(key);assert.ok(revoke);
  await revoke;
  assert.equal(s.stage.unconfirmedDisconnects.has(key),false);
  assert.throws(()=>s.store.join(s.viewer,s.id),e=>e.status===403);
 }finally{s.close();}
});

test('successful kick clears revoke fence, preserves guest rejoin, does not silently impose a ban',async()=>{
 const s=setup();try{
  s.setOnline(true);
  const roster=await s.stage.moderate(s.host,s.id,s.viewer.id,'kick');
  assert.equal(roster.members.some(v=>v.id===s.viewer.id),false);
  const key=s.stage.fenceKey(s.id,s.viewer.id);
  assert.equal(s.store.db.livekitSessionFences[key],undefined);
  assert.equal(s.stage.unconfirmedDisconnects.has(key),false);
  s.store.join(s.viewer,s.id);
  const credential=await s.stage.issueToken(s.viewer,s.id);
  assert.equal(credential.roster.members.find(v=>v.id===s.viewer.id).speaker,false);
  assert.equal(s.store.db.roomBans?.[s.id]?.[s.viewer.id],undefined);
 }finally{s.close();}
});

test('failed ban enforcement and pending fence survive a backend process restart',async()=>{
 const s=setup();try{
  await assert.rejects(s.stage.moderate(s.host,s.id,s.viewer.id,'ban',{minutes:10}),e=>e.status===502);
  const freshStore=new Store(path.join(s.dir,'data.json'));
  assert.ok(freshStore.db.roomBans[s.id][s.viewer.id]>Date.now());
  const freshStage=new Stage(freshStore,s.bridge);
  assert.ok(freshStage.unconfirmedDisconnects.has(freshStage.fenceKey(s.id,s.viewer.id)));
  assert.throws(()=>freshStore.join(s.viewer,s.id),e=>e.status===403);
  s.setOnline(true);
  freshStage.sweepExpired();
  await freshStage.expiryRevocations.get(freshStage.fenceKey(s.id,s.viewer.id));
  assert.equal(freshStage.unconfirmedDisconnects.has(freshStage.fenceKey(s.id,s.viewer.id)),false);
  assert.throws(()=>freshStore.join(s.viewer,s.id),e=>e.status===403);
 }finally{s.close();}
});

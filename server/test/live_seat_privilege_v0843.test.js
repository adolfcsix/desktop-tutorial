'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../storage');
const {Stage}=require('../stage');

function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0843-role-'));
 const store=new Store(path.join(dir,'data.json'));
 const calls=[];
 const bridge={enabled:true,requireConfigured(){},token(){return {token:'fake',serverUrl:'ws://mock',roomName:'mock'};},
  async setPermission(id,uid,enabled){calls.push({type:'permission',id,uid,enabled});return {connected:true};},
  async remove(id,uid){calls.push({type:'remove',id,uid});}};
 const stage=new Stage(store,bridge);const users={};
 for(const name of ['host','modA','modB','listener'])users[name]=store.byToken(store.session(name).token);
 const room=store.createRoom(users.host,{title:'Role boundary test',tag:'Tâm sự',type:'voice'});
 for(const user of Object.values(users)){store.join(user,room.id);stage.enter(user,room.id);}
 return {dir,store,stage,calls,users,id:room.id,cleanup(){fs.rmSync(dir,{recursive:true,force:true});}};
}

test('moderator cannot revoke a peer moderator speaker seat, even via direct API method',async()=>{
 const s=setup();try{
  const {stage,users,id,calls}=s;
  await stage.moderate(users.host,id,users.modA.id,'promote');
  await stage.moderate(users.host,id,users.modB.id,'promote');
  stage.request(users.modB,id);
  await stage.speaker(users.host,id,users.modB.id,true);
  const before=calls.length;
  await assert.rejects(stage.speaker(users.modA,id,users.modB.id,false),e=>e.status===403);
  assert.equal(calls.length,before,'A denied action must not touch LiveKit permissions');
  assert.equal(stage.snapshot(users.host,id).members.find(m=>m.id===users.modB.id).speaker,true);
 }finally{s.cleanup();}
});

test('moderator may approve and revoke listener seat when requested',async()=>{
 const s=setup();try{
  const {stage,users,id}=s;
  await stage.moderate(users.host,id,users.modA.id,'promote');
  stage.request(users.listener,id);
  await stage.speaker(users.modA,id,users.listener.id,true);
  assert.equal(stage.snapshot(users.host,id).members.find(m=>m.id===users.listener.id).speaker,true);
  await stage.speaker(users.modA,id,users.listener.id,false);
  assert.equal(stage.snapshot(users.host,id).members.find(m=>m.id===users.listener.id).speaker,false);
 }finally{s.cleanup();}
});

test('stale SFU participant is actively revoked when server stage membership expires',async()=>{
 const s=setup();try{
  const {stage,users,id,calls}=s;
  const member=stage.data(id).members.get(users.listener.id);
  member.expiresAt=Date.now()-1;
  stage.clean(id);
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(calls.some(c=>c.type==='remove'&&c.uid===users.listener.id),'An expired stage member must be disconnected at SFU');
  assert.equal(stage.data(id).members.has(users.listener.id),false);
 }finally{s.cleanup();}
});

test('failed stale-member SFU removal stays fenced until positive reconciliation',async()=>{
 const s=setup();try{
  const {stage,users,id}=s;
  s.stage.bridge.remove=async()=>{throw Error('SFU offline')};
  stage.data(id).members.get(users.listener.id).expiresAt=Date.now()-1;
  stage.clean(id);
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(stage.unconfirmedDisconnects.has(stage.fenceKey(id,users.listener.id)));
  s.store.join(users.listener,id); // user must rejoin application presence before SFU reconciliation
  assert.throws(()=>stage.enter(users.listener,id),e=>e.status===409);
  s.stage.bridge.remove=async()=>{};
  await stage.reconcileDisconnect(users.listener,id);
  assert.doesNotThrow(()=>stage.enter(users.listener,id));
 }finally{s.cleanup();}
});

test('pending SFU revocation blocks immediate re-entry even if app presence was renewed',async()=>{
 const s=setup();try{
  const {stage,users,id}=s;
  let release;
  stage.bridge.remove=()=>new Promise(resolve=>{release=resolve;});
  stage.data(id).members.get(users.listener.id).expiresAt=Date.now()-1;
  stage.clean(id);
  s.store.join(users.listener,id);
  assert.throws(()=>stage.enter(users.listener,id),e=>e.status===409);
  await new Promise(resolve=>setImmediate(resolve));
  release();
  await stage.expiryRevocations.get(stage.fenceKey(id,users.listener.id));
  assert.doesNotThrow(()=>stage.enter(users.listener,id));
 }finally{s.cleanup();}
});

test('idle sweeper retires orphan token fence left after server restart',async()=>{
 const s=setup();try{
  const oldFence=s.store.db.livekitSessionFences[s.stage.fenceKey(s.id,s.users.listener.id)];
  assert.ok(oldFence);
  const fresh=new Stage(s.store,s.stage.bridge);
  assert.notEqual(fresh.bootId,oldFence.bootId);
  fresh.sweepExpired();
  const pending=fresh.expiryRevocations.get(fresh.fenceKey(s.id,s.users.listener.id));
  assert.ok(pending,'A boot fence must be scheduled even before anyone opens the room');
  await pending;
  assert.ok(s.calls.some(x=>x.type==='remove'&&x.uid===s.users.listener.id));
  assert.equal(s.store.db.livekitSessionFences[fresh.fenceKey(s.id,s.users.listener.id)],undefined);
 }finally{s.cleanup();}
});

test('stage expiry checks presence TTL as well as stage heartbeat TTL',async()=>{
 const s=setup();try{
  const {stage,store,users,id}=s;
  store.presence.get(id).set(users.listener.id,Date.now()-1000);
  assert.ok(stage.data(id).members.get(users.listener.id).expiresAt>Date.now());
  stage.clean(id);
  const revocation=stage.expiryRevocations.get(stage.fenceKey(id,users.listener.id));
  assert.ok(revocation);
  await revocation;
  assert.equal(stage.data(id).members.has(users.listener.id),false);
 }finally{s.cleanup();}
});

test('idle sweeper retries an unsuccessful SFU revocation after the retry window',async()=>{
 const s=setup();try{
  const {stage,users,id}=s;
  let fail=true,calls=0;
  stage.bridge.remove=async()=>{calls++;if(fail)throw Error('SFU unavailable');};
  stage.data(id).members.get(users.listener.id).expiresAt=Date.now()-1;
  stage.sweepExpired();
  await stage.expiryRevocations.get(stage.fenceKey(id,users.listener.id));
  assert.equal(calls,1);
  assert.ok(stage.unconfirmedDisconnects.has(stage.fenceKey(id,users.listener.id)));
  fail=false;
  stage.expiryRetryAfter.set(stage.fenceKey(id,users.listener.id),Date.now()-1);
  stage.sweepExpired();
  await stage.expiryRevocations.get(stage.fenceKey(id,users.listener.id));
  assert.equal(calls,2);
  assert.equal(stage.unconfirmedDisconnects.has(stage.fenceKey(id,users.listener.id)),false);
 }finally{s.cleanup();}
});

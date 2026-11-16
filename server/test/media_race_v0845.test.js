'use strict';
// Deterministic adversarial tests for SFU permission acknowledgements racing
// with membership/role changes. No real network or device claims.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../storage');
const {Stage}=require('../stage');
function defer(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0845-race-'));
 const store=new Store(path.join(dir,'db.json'));
 const users=['Host','Viewer','Another'].map(name=>store.byToken(store.session(name).token));
 const room=store.createRoom(users[0],{title:'Race audit',tag:'Tâm sự',type:'voice'});
 const calls=[],started=defer(),permission=defer();let failRemove=false;
 const bridge={enabled:true,requireConfigured(){},token(){return {token:'mock-token'};},
  async setPermission(id,uid,enabled){calls.push(['permission-start',uid,enabled]);started.resolve();await permission.promise;calls.push(['permission-end',uid,enabled]);},
  async remove(id,uid){calls.push(['remove',uid]);if(failRemove)throw new Error('SFU offline');}};
 const stage=new Stage(store,bridge);
 for(const u of users){store.join(u,room.id);stage.enter(u,room.id);}
 stage.request(users[1],room.id);
 return {store,users,room,stage,calls,started,permission,setFailRemove:v=>failRemove=v,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('permission ack after listener expires must revoke SFU and reject seat grant',async()=>{
 const s=setup();try{
  const {users,stage,room,calls,started,permission}=s;
  const attempt=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;
  stage.data(room.id).members.get(users[1].id).expiresAt=Date.now()-1;
  permission.resolve();
  await assert.rejects(attempt,e=>e.status===409||e.status===403);
  assert.equal(calls.at(-1)[0],'remove','SFU removal must follow the stale permission grant');
  assert.notEqual(stage.data(room.id).members.get(users[1].id)?.speaker,true);
 }finally{s.cleanup();}
});
test('failed SFU revoke after late permission ack must fence subsequent token issuance',async()=>{
 const s=setup();try{
  const {users,stage,room,started,permission,setFailRemove}=s;
  const attempt=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;
  stage.data(room.id).members.get(users[1].id).expiresAt=Date.now()-1;
  setFailRemove(true);permission.resolve();
  await assert.rejects(attempt,e=>e.status===409);
  const key=stage.fenceKey(room.id,users[1].id);
  assert.equal(stage.unconfirmedDisconnects.has(key),true);
  assert.equal(stage.store.db.livekitSessionFences[key].state,'pending');
  stage.data(room.id).members.delete(users[1].id);
  assert.throws(()=>stage.enter(users[1],room.id),e=>e.status===409);
 }finally{s.cleanup();}
});
test('late invitation acceptance cannot publish after invited user expires',async()=>{
 const s=setup();try{
  const {users,stage,room,calls,started,permission}=s;
  const invited=await stage.invite(users[0],room.id,users[1].id);
  const invitationId=invited.outgoingInvitations.find(v=>v.toId===users[1].id).id;
  const attempt=stage.respondInvite(users[1],room.id,invitationId,true);
  await started.promise;
  stage.data(room.id).members.get(users[1].id).expiresAt=Date.now()-1;
  permission.resolve();
  await assert.rejects(attempt,e=>e.status===409);
  assert.equal(calls.at(-1)[0],'remove');
  assert.notEqual(stage.data(room.id).members.get(users[1].id)?.speaker,true);
 }finally{s.cleanup();}
});
test('speaker grant is revoked if the authorizing host expires during SFU acknowledgement',async()=>{
 const s=setup();try{
  const {users,stage,room,calls,started,permission}=s;
  const attempt=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;
  stage.data(room.id).members.get(users[0].id).expiresAt=Date.now()-1;
  permission.resolve();
  await assert.rejects(attempt,e=>e.status===409);
  assert.equal(calls.at(-1)[0],'remove');
 }finally{s.cleanup();}
});

test('failed SFU permission call with failed removal must quarantine the participant until reconciliation',async()=>{
 const s=setup();try{
  const {users,stage,room,started,permission,setFailRemove}=s;
  const action=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;
  setFailRemove(true);
  permission.reject(new Error('SDK failed after possibly applying permission'));
  await assert.rejects(action,e=>e.status===502);
  const key=stage.fenceKey(room.id,users[1].id);
  assert.ok(stage.unconfirmedDisconnects.has(key),'Failed permission update must fence token refresh');
  assert.equal(stage.store.db.livekitSessionFences[key]?.state,'pending');
  assert.throws(()=>stage.enter(users[1],room.id),e=>e.status===409);
 }finally{s.cleanup();}
});

test('successful SFU disconnect after uncertain permission result releases fence but drops stale stage seat',async()=>{
 const s=setup();try{
  const {users,stage,room,started,permission,calls}=s;
  const action=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;
  permission.reject(new Error('Timeout, update may have applied'));
  await assert.rejects(action,e=>e.status===502);
  const key=stage.fenceKey(room.id,users[1].id);
  assert.equal(stage.unconfirmedDisconnects.has(key),false,'Confirmed SFU removal must release reconnect fence');
  assert.ok(calls.some(c=>c[0]==='remove'&&c[1]===users[1].id));
  const credentials=stage.enter(users[1],room.id);
  assert.equal(credentials.roster.members.find(m=>m.id===users[1].id).speaker,false);
 }finally{s.cleanup();}
});

test('failed self seat leave quarantines publication if SFU cannot confirm media off',async()=>{
 const s=setup();try{
  const {users,stage,room,started,permission,setFailRemove}=s;
  // First grant a seat normally.
  const grant=stage.speaker(users[0],room.id,users[1].id,true);
  await started.promise;permission.resolve();await grant;
  // Now fail the SFU call to disable the current speaker.
  stage.bridge.setPermission=async()=>{throw new Error('SFU permission timeout');};
  setFailRemove(true);
  await assert.rejects(stage.leaveSeat(users[1],room.id),e=>e.status===502);
  assert.ok(stage.unconfirmedDisconnects.has(stage.fenceKey(room.id,users[1].id)));
  assert.throws(()=>stage.enter(users[1],room.id),e=>e.status===409);
 }finally{s.cleanup();}
});

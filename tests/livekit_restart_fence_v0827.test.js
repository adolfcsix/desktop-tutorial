'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../server/storage');
const {Stage}=require('../server/stage');

function lab(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-fence-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'room-db.json');
 const store=new Store(file),user=store.session('Chủ phòng').user;
 const room=store.createRoom(user,{title:'Phòng thử an toàn',tag:'Tâm sự'});
 store.join(user,room.id);
 let connected=true,removeCount=0;
 const bridge={enabled:true,requireConfigured(){},token(){return {token:'test-media-credential',serverUrl:'wss://media.invalid'};},
  async remove(){removeCount++;if(!connected)throw Error('PRIVATE_SFU_CREDENTIAL_DETAIL');}};
 const restart=()=>{const s=new Store(file);s.join(user,room.id);return {store:s,stage:new Stage(s,bridge)};};
 return {store,user,room,bridge,restart,change(flag){connected=flag;},get removeCount(){return removeCount;},file};
}

test('restart fences previously issued token until SFU revocation succeeds',async t=>{
 const l=lab(t),stage1=new Stage(l.store,l.bridge);
 stage1.enter(l.user,l.room.id);
 const key=`${l.room.id}:${l.user.id}`;
 assert.equal(l.store.db.livekitSessionFences[key].state,'active');
 assert.equal(typeof JSON.parse(fs.readFileSync(l.file)).livekitSessionFences[key].bootId,'string');
 const {stage:stage2}=l.restart();
 assert.throws(()=>stage2.enter(l.user,l.room.id),e=>e.status===409);
 assert.equal(l.removeCount,0);
 await stage2.reconcileDisconnect(l.user,l.room.id);
 assert.equal(l.removeCount,1);
 assert.equal(stage2.unconfirmedDisconnects.size,0);
 stage2.enter(l.user,l.room.id);
 assert.equal(stage2.store.db.livekitSessionFences[key].bootId,stage2.bootId);
 assert.notEqual(stage1.bootId,stage2.bootId);
});

test('SFU outage quarantine persists through backend restart, then safely recovers',async t=>{
 const l=lab(t),old=new Stage(l.store,l.bridge);old.enter(l.user,l.room.id);
 l.change(false);
 assert.deepEqual(await old.exit(l.user,l.room.id),{left:true,mediaDisconnectPending:true});
 const key=`${l.room.id}:${l.user.id}`;
 assert.equal(JSON.parse(fs.readFileSync(l.file)).livekitSessionFences[key].state,'pending');
 const {stage:newStage}=l.restart();
 assert.throws(()=>newStage.enter(l.user,l.room.id),e=>e.status===409);
 await assert.rejects(newStage.reconcileDisconnect(l.user,l.room.id),e=>e.status===409&&!e.message.includes('PRIVATE_SFU_CREDENTIAL_DETAIL'));
 assert.equal(newStage.store.db.livekitSessionFences[key].state,'pending');
 l.change(true);
 await newStage.reconcileDisconnect(l.user,l.room.id);
 assert.equal(newStage.store.db.livekitSessionFences[key],undefined);
 newStage.enter(l.user,l.room.id);
 assert.equal(newStage.store.db.livekitSessionFences[key].state,'active');
});

test('successful leave clears the persisted fence and needs no extra SFU cleanup after restart',async t=>{
 const l=lab(t),old=new Stage(l.store,l.bridge);old.enter(l.user,l.room.id);
 assert.equal((await old.exit(l.user,l.room.id)).mediaDisconnectPending,false);
 const {stage:newStage}=l.restart();
 const before=l.removeCount;
 await newStage.reconcileDisconnect(l.user,l.room.id);
 newStage.enter(l.user,l.room.id);
 assert.equal(l.removeCount,before);
});

test('permission is required before a stale participant can be remotely disconnected',async t=>{
 const l=lab(t),old=new Stage(l.store,l.bridge);old.enter(l.user,l.room.id);
 const {store,stage}=l.restart();
 store.presence.get(l.room.id).delete(l.user.id);
 await assert.rejects(stage.reconcileDisconnect(l.user,l.room.id),e=>e.status===403);
 assert.equal(l.removeCount,0);
});

test('new backend fences a token even if old process crashed during SFU removal',async t=>{
 const l=lab(t),old=new Stage(l.store,l.bridge);old.enter(l.user,l.room.id);
 l.bridge.remove=()=>new Promise(()=>{});
 void old.exit(l.user,l.room.id); // Deliberately simulates a process killed while removal is pending.
 await new Promise(r=>setImmediate(r));
 const {stage:newStage}=l.restart();
 assert.throws(()=>newStage.enter(l.user,l.room.id),e=>e.status===409);
 l.bridge.remove=async()=>{};
 await newStage.reconcileDisconnect(l.user,l.room.id);
 newStage.enter(l.user,l.room.id);
 // The dead process never resumes: multi-process writes are not supported.
});

test('v0.8.33 confirmed host kick clears target media fence so an ordinary rejoin works',async t=>{
 const l=lab(t),guest=l.store.session('Người nghe').user;
 l.store.join(guest,l.room.id);
 const stage=new Stage(l.store,l.bridge);stage.enter(l.user,l.room.id);stage.enter(guest,l.room.id);
 const key=`${l.room.id}:${guest.id}`;
 assert.ok(l.store.db.livekitSessionFences[key]);
 await stage.moderate(l.user,l.room.id,guest.id,'kick');
 assert.equal(l.store.db.livekitSessionFences[key],undefined);
 assert.equal(stage.unconfirmedDisconnects.has(key),false);
 l.store.join(guest,l.room.id);
 const renewed=stage.enter(guest,l.room.id);
 assert.equal(renewed.roster.selfId,guest.id);
});

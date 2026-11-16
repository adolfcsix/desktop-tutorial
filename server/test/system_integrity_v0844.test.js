'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../storage');
const {Stage}=require('../stage');
const {VoiceRooms}=require('../voice');

function fixture(viewers=2,type='voice'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0844-'));
 const store=new Store(path.join(dir,'data.json'));
 const users=Array.from({length:viewers+2},(_,i)=>store.byToken(store.session(i===0?'Host':i===1?'Phó phòng':'Khách '+i).token));
 const room=store.createRoom(users[0],{title:'Kiểm thử hệ thống',tag:'Tâm sự',type});
 const operations=[];
 const bridge={enabled:true,requireConfigured(){},token(){return {token:'mock',serverUrl:'ws://mock',roomName:'mock'};},
  async setPermission(roomId,userId,enabled){operations.push({op:'permission',roomId,userId,enabled});return {connected:true};},
  async remove(roomId,userId){operations.push({op:'remove',roomId,userId});}};
 const stage=new Stage(store,bridge);
 for(const user of users){store.join(user,room.id);stage.enter(user,room.id);}
 return {store,users,stage,room,operations,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}

test('voice stage reserves a host seat while host is absent; never exceeds eight active speakers',async()=>{
 const s=fixture(8);try{
  const {stage,users,room}=s,id=room.id;
  await stage.moderate(users[0],id,users[1].id,'promote');
  await stage.exit(users[0],id);
  for(const listener of users.slice(2,9)){
   stage.request(listener,id);
   await stage.speaker(users[1],id,listener.id,true);
  }
  stage.request(users[9],id);
  await assert.rejects(stage.speaker(users[1],id,users[9].id,true),e=>e.status===409);
  stage.enter(users[0],id);
  assert.equal(stage.data(id).members.size,10);
  assert.equal([...stage.data(id).members.values()].filter(m=>m.speaker).length,8);
 }finally{s.cleanup();}
});

test('expired target cannot be approved for SFU publication or moderated before cleanup',async()=>{
 const s=fixture(1);try{
  const {stage,room,users,operations}=s,id=room.id;
  stage.request(users[2],id);
  stage.data(id).members.get(users[2].id).expiresAt=Date.now()-1;
  const before=operations.filter(x=>x.op==='permission').length;
  await assert.rejects(stage.speaker(users[0],id,users[2].id,true),e=>e.status===404||e.status===422);
  assert.equal(operations.filter(x=>x.op==='permission').length,before);
  await assert.rejects(stage.moderate(users[0],id,users[2].id,'mute-chat'),e=>e.status===404);
 }finally{s.cleanup();}
});

test('expired moderator cannot issue a seat permission using a stale in-memory role',async()=>{
 const s=fixture(1);try{
  const {stage,room,users,operations}=s,id=room.id;
  await stage.moderate(users[0],id,users[1].id,'promote');
  stage.request(users[2],id);
  stage.data(id).members.get(users[1].id).expiresAt=Date.now()-1;
  const before=operations.filter(x=>x.op==='permission').length;
  await assert.rejects(stage.speaker(users[1],id,users[2].id,true),e=>e.status===403);
  assert.equal(operations.filter(x=>x.op==='permission').length,before);
 }finally{s.cleanup();}
});

test('peer moderator cannot invite another moderator to the stage',async()=>{
 const s=fixture(2);try{
  const {stage,room,users}=s,id=room.id;
  await stage.moderate(users[0],id,users[1].id,'promote');
  await stage.moderate(users[0],id,users[2].id,'promote');
  await assert.rejects(stage.invite(users[1],id,users[2].id),e=>e.status===403);
  assert.equal(stage.data(id).invitations.size,0);
 }finally{s.cleanup();}
});

test('profile biography survives disk reload and host display name stays in sync',()=>{
 const s=fixture(0);try{
  const {store,users,room}=s;
  assert.deepEqual(store.profile(users[0],{name:'Chủ phòng mới',bio:'Tâm sự cùng mọi người'}).bio,'Tâm sự cùng mọi người');
  assert.equal(store.getRoom(room.id).host,'Chủ phòng mới');
  const reloaded=new Store(store.file);
  assert.equal(reloaded.publicUser(reloaded.db.users[users[0].id]).bio,'Tâm sự cùng mọi người');
  assert.equal(reloaded.getRoom(room.id).host,'Chủ phòng mới');
  assert.throws(()=>store.profile(users[0],{name:'Hợp lệ',bio:42}),e=>e.status===422);
 }finally{s.cleanup();}
});

test('renamed member appears in refreshed LiveKit roster and legacy voice roster',()=>{
 const s=fixture(1);try{
  const {store,users,room,stage}=s,id=room.id;
  const voice=new VoiceRooms(store);
  voice.enter(users[2],id);
  store.profile(users[2],{name:'Tên mới'});
  assert.equal(stage.heartbeat(users[2],id).members.find(m=>m.id===users[2].id).name,'Tên mới');
  assert.equal(voice.heartbeat(users[2],id).participants.find(m=>m.id===users[2].id).name,'Tên mới');
 }finally{s.cleanup();}
});

test('locking a room blocks newcomers but preserves existing participants and their LiveKit heartbeat',async()=>{
 const s=fixture(1);try{
  const {store,stage,users,room}=s,id=room.id;
  await stage.settings(users[0],id,{locked:true});
  assert.equal(stage.heartbeat(users[2],id).selfId,users[2].id);
  const newcomer=store.byToken(store.session('Vị khách mới').token);
  assert.throws(()=>store.join(newcomer,id),e=>e.status===403);
 }finally{s.cleanup();}
});

test('legacy voice heartbeat keeps legitimate room presence alive past the original presence TTL',()=>{
 const s=fixture(1);try{
  const {store,users,room}=s,id=room.id;
  const legacy=new VoiceRooms(store);
  legacy.enter(users[2],id);
  store.presence.get(id).set(users[2].id,Date.now()+1_000);
  legacy.heartbeat(users[2],id);
  assert.ok(store.presence.get(id).get(users[2].id)>Date.now()+60_000);
 }finally{s.cleanup();}
});

test('moderator invitation cannot bypass peer hierarchy after target is promoted before acceptance',async()=>{
 const s=fixture(2);try{
  const {stage,users,room,operations}=s,id=room.id;
  await stage.moderate(users[0],id,users[1].id,'promote');
  const pending=await stage.invite(users[1],id,users[2].id);
  const invitationId=pending.outgoingInvitations.find(x=>x.toId===users[2].id).id;
  await stage.moderate(users[0],id,users[2].id,'promote');
  const before=operations.filter(x=>x.op==='permission').length;
  await assert.rejects(stage.respondInvite(users[2],id,invitationId,true),e=>e.status===403);
  assert.equal(operations.filter(x=>x.op==='permission').length,before);
  assert.equal(stage.data(id).members.get(users[2].id).speaker,false);
 }finally{s.cleanup();}
});

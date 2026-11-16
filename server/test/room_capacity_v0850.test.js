'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../storage');

function setup(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-cap-'));
 const store=new Store(path.join(dir,'store.json'));
 const host={id:'host-1',name:'Chủ phòng'};
 const room=store.createRoom(host,{title:'Phòng kiểm thử sức chứa',tag:'Tâm sự'});
 return {store,host,room,cleanup:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
const viewer=i=>({id:`viewer-${i}`,name:`Người nghe ${i}`});

test('room entrance enforces the same 80-person limit advertised by Live stage, reserving a host slot',()=>{
 const {store,host,room,cleanup}=setup();
 try{
  for(let i=0;i<79;i++)store.join(viewer(i),room.id);
  assert.equal(store.count(room.id),79);
  assert.throws(()=>store.join(viewer(79),room.id),err=>err.status===409);
  assert.equal(store.count(room.id),79);
  store.join(host,room.id);
  assert.equal(store.count(room.id),80);
  assert.throws(()=>store.join(viewer(80),room.id),err=>err.status===409);
 }finally{cleanup();}
});

test('an existing participant can renew heartbeat when full, and a departed slot can be reused',()=>{
 const {store,host,room,cleanup}=setup();
 try{
  store.join(host,room.id);
  for(let i=0;i<79;i++)store.join(viewer(i),room.id);
  const expiry=store.presence.get(room.id).get('viewer-0');
  store.join(viewer(0),room.id);
  assert.ok(store.presence.get(room.id).get('viewer-0')>=expiry);
  assert.equal(store.count(room.id),80);
  store.leave(viewer(1),room.id);
  store.join(viewer(79),room.id);
  assert.equal(store.count(room.id),80);
 }finally{cleanup();}
});

test('expired presence releases capacity without needing periodic SFU sweeper',()=>{
 const {store,host,room,cleanup}=setup();
 try{
  store.join(host,room.id);
  for(let i=0;i<79;i++)store.join(viewer(i),room.id);
  store.presence.get(room.id).set('viewer-15',Date.now()-1);
  store.join(viewer(79),room.id);
  assert.equal(store.count(room.id),80);
  assert.ok(!store.presence.get(room.id).has('viewer-15'));
 }finally{cleanup();}
});

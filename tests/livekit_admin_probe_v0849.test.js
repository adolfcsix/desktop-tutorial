'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=pathToFileURL(path.join(__dirname,'../scripts/verify_livekit_admin.mjs')).href;
const config={url:'ws://127.0.0.1:7880',key:'test-admin-key',secret:'a'.repeat(32)};
const hang=()=>new Promise(()=>{});
const makeMock=(overrides={})=>{
 const state={rooms:new Map(),created:[],deleted:[],queries:[]};
 const mock={
  async listRooms(names){state.queries.push(names);return [...state.rooms.values()].filter(r=>!names?.length||names.includes(r.name));},
  async createRoom(options){state.created.push(options.name);const r={name:options.name};state.rooms.set(r.name,r);return r;},
  async listParticipants(name){return [];},
  async deleteRoom(name){state.deleted.push(name);state.rooms.delete(name);}
 };
 return {state,client:{...mock,...overrides}};
};

test('opt-in SFU admin smoke creates a uniquely named room and cleans it, without touching media',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock();
 const outcome=await probeSfuAdmin(config,{clientFactory:(url,k,s)=>{
  assert.equal(url,'http://127.0.0.1:7880');assert.equal(k,config.key);assert.equal(s,config.secret);return client;
 }});
 assert.equal(outcome.ok,true);assert.equal(outcome.cleanup,'PASS');assert.equal(outcome.media,'NOT_RUN');
 assert.match(outcome.roomName,/^tuttt-qa-[0-9a-f]{16}$/);
 assert.deepEqual(state.created,[outcome.roomName]);assert.deepEqual(state.deleted,[outcome.roomName]);
 assert.equal(state.rooms.size,0);assert.ok(outcome.checks.every(c=>c.status==='PASS'));
 assert.match(outcome.message,/không kiểm chứng media/);
});

test('if listing participants fails after creation, never blindly delete a room',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock({async listParticipants(){throw Object.assign(Error('api key confidential'),{code:403});}});
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'SAFETY_HOLD');
 assert.equal(state.created.length,1);assert.equal(state.deleted.length,0);
 assert.doesNotMatch(JSON.stringify(outcome),/confidential/);
});

test('never delete a temp room that unexpectedly contains participants',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock({async listParticipants(){return [{identity:'unexpected-user'}];}});
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'SAFETY_HOLD');
 assert.deepEqual(state.deleted,[]);
});

test('deleteRoom failed: do not label release PASS; report cleanup failure without secrets',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock({async deleteRoom(){throw Error('leaked secret: abc');}});
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'FAIL');
 assert.equal(state.created.length,1);
 assert.doesNotMatch(JSON.stringify(outcome),/abc/);
});

test('deleteRoom acknowledgement without actual removal never passes cleanup verification',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock({async deleteRoom(){/* simulate silently ignored operation */}});
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'FAIL');
 assert.equal(state.created.length,1);assert.equal(state.rooms.size,1);
});

test('post-delete listRooms failure yields cleanup FAIL instead of claiming success',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client}=makeMock();
 let deleted=false;
 const prevDelete=client.deleteRoom,prevList=client.listRooms;
 client.deleteRoom=async name=>{await prevDelete(name);deleted=true;};
 client.listRooms=async names=>{if(deleted)throw Error('read-after-delete failed');return prevList(names);};
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'FAIL');
});

test('createRoom returns malformed response but did create: attempt safe cleanup',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client,state}=makeMock();
 const original=client.createRoom;
 client.createRoom=async args=>{await original(args);return {name:'wrong'};};
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'PASS');
 assert.deepEqual(state.deleted,state.created);
});

test('timed out creation: do not falsely certify cleanup or success',async()=>{
 const {probeSfuAdmin}=await import(base);
 const {client}=makeMock({createRoom:hang});
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>client,deadlineMs:12});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'UNCERTAIN');
});

test('pre-existing name collision does not create or delete any real room',async()=>{
 const {probeSfuAdmin}=await import(base);
 let creates=0,deletes=0;
 const outcome=await probeSfuAdmin(config,{clientFactory:()=>({
  listRooms:async(names)=>[{name:names[0]}],
  createRoom:async()=>{creates++;}, deleteRoom:async()=>{deletes++;}
 })});
 assert.equal(outcome.ok,false);assert.equal(outcome.cleanup,'NOT_NEEDED');
 assert.equal(creates,0);assert.equal(deletes,0);
});

test('CLI is read-only by default, requires --run to touch the SFU',()=>{
 const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/verify_livekit_admin.mjs')],{encoding:'utf8',timeout:2500});
 assert.equal(result.status,0);assert.match(result.stdout,/--run/);assert.match(result.stdout,/Chưa chạy/);
});

test('RPC deadlines reject invalid values, time out independently without hanging',async()=>{
 const {boundedSfuCall}=await import(base);
 await assert.rejects(boundedSfuCall(()=>null,0),/deadline/);
 await assert.rejects(boundedSfuCall(hang,12),e=>e.code==='timeout');
 assert.equal(await boundedSfuCall(()=>Promise.resolve(12),100),12);
});

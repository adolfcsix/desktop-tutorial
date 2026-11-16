'use strict';
/** Actual localhost HTTP API handling with a deterministic stalled SFU client.
 * Verifies status, bounded wait, room-lock release and persistent reconnect fence.
 * This is NOT an end-to-end LiveKit SFU media test. */
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0848-http-'));
process.env.TUTTT_DATA_FILE=path.join(dir,'data.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='test-bridge';
process.env.LIVEKIT_API_SECRET='test-bridge-secret-not-production';
process.env.TUTTT_SFU_RPC_TIMEOUT_MS='30';
const {server,stage,livekit,store}=require('../index');
let base,host,viewer,roomId;
async function request(uri,method='GET',payload,cookie){
 const response=await fetch(base+uri,{method,headers:{...(payload?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:payload?JSON.stringify(payload):undefined});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const live=op=>`/api/rooms/${roomId}/live/${op}`;
before(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 host=await request('/api/session','POST',{name:'Host'});viewer=await request('/api/session','POST',{name:'Viewer'});
 roomId=(await request('/api/rooms','POST',{title:'Timeout HTTP',type:'voice',tag:'Tâm sự'},host.cookie)).body.room.id;
 for(const u of [host,viewer]){
  assert.equal((await request(`/api/rooms/${roomId}/join`,'POST',null,u.cookie)).status,200);
  assert.equal((await request(live('token'),'POST',null,u.cookie)).status,200);
 }
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
test('HTTP kick SFU timeout: bounded 502, clean guest visibility, fence and unaffected host refresh',async()=>{
 livekit.service={async removeParticipant(){return new Promise(()=>{});}};
 const start=Date.now();
 const kicked=await request(live('moderate'),'POST',{userId:viewer.body.user.id,action:'kick'},host.cookie);
 assert.equal(kicked.status,502);
 assert.ok(Date.now()-start<600,'HTTP must not hang behind unresponsive SFU');
 assert.doesNotMatch(kicked.body.error,/stack|Error:|SFU_RPC_TIMEOUT/i);
 const key=stage.fenceKey(roomId,viewer.body.user.id);
 assert.equal(stage.unconfirmedDisconnects.has(key),true);
 assert.equal(store.db.livekitSessionFences[key]?.state,'pending');
 assert.equal((await request(live('token'),'POST',null,host.cookie)).status,200);
 assert.equal((await request(`/api/rooms/${roomId}/join`,'POST',null,viewer.cookie)).status,200);
 assert.equal((await request(live('token'),'POST',null,viewer.cookie)).status,409);
});
test('failed SFU removal is recoverable only after a fresh positive removal',async()=>{
 let removals=0;
 livekit.service={async removeParticipant(){removals++;}};
 const issued=await request(live('token'),'POST',null,viewer.cookie);
 assert.equal(issued.status,200);
 assert.equal(removals,1);
 assert.equal(stage.unconfirmedDisconnects.has(stage.fenceKey(roomId,viewer.body.user.id)),false);
 assert.equal(JSON.parse(Buffer.from(issued.body.token.split('.')[1],'base64url').toString()).video.canPublish,false);
});

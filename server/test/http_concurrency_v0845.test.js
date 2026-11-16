'use strict';
/** Real HTTP single-process multi-account scenarios: concurrent seat grants,
 * peer moderation and idempotent reports. SFU permission calls are mocked.
 * NOT a multi-server benchmark or real audio/video device test.
 */
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0845-multi-'));
process.env.TUTTT_DATA_FILE=path.join(temp,'db.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='test-sfu';
process.env.LIVEKIT_API_SECRET='test-only-do-not-use-outside-tests';
const {server,livekit,store}=require('../index');
const changes=[];
livekit.service={
 async updateParticipant(room,uid,opts){changes.push({room,uid,opts});await new Promise(resolve=>setTimeout(resolve,2));},
 async removeParticipant(){}
};
let base,users=[],roomId;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(temp,{recursive:true,force:true});});
async function req(url,method='GET',data,cookie=''){
 const response=await fetch(base+url,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined});
 return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const live=(id,op)=>`/api/rooms/${id}/live/${op}`;

test('7 simultaneous authenticated accounts cannot oversubscribe a 6-camera stage',async()=>{
 users=await Promise.all(['Host','Viewer 1','Viewer 2','Viewer 3','Viewer 4','Viewer 5','Viewer 6'].map(name=>req('/api/session','POST',{name})));
 assert.ok(users.every(x=>x.status===201));
 const created=await req('/api/rooms','POST',{title:'Đồng thời camera',type:'cam',tag:'Tâm sự'},users[0].cookie);
 assert.equal(created.status,201);roomId=created.body.room.id;
 const joined=await Promise.all(users.map(u=>req(`/api/rooms/${roomId}/join`,'POST',null,u.cookie)));
 assert.ok(joined.every(x=>x.status===200));
 const tokens=await Promise.all(users.map(u=>req(live(roomId,'token'),'POST',null,u.cookie)));
 assert.ok(tokens.every(x=>x.status===200),tokens.map(x=>x.status));
 const requests=await Promise.all(users.slice(1).map(u=>req(live(roomId,'seat-request'),'POST',null,u.cookie)));
 assert.ok(requests.every(x=>x.status===200));
 const seats=await Promise.all(users.slice(1).map(u=>req(live(roomId,'seat'),'POST',{userId:u.body.user.id,enabled:true},users[0].cookie)));
 assert.equal(seats.filter(x=>x.status===200).length,5);
 assert.equal(seats.filter(x=>x.status===409).length,1);
 const snapshot=await req(`/api/rooms/${roomId}/live`,'GET',null,users[0].cookie);
 assert.equal(snapshot.status,200);
 assert.equal(snapshot.body.members.filter(m=>m.speaker).length,6);
 assert.equal(changes.length,5,'SFU must not receive permission grant exceeding capacity');
});

test('peer moderators cannot bypass authority using direct HTTP requests',async()=>{
 const host=users[0],peerA=users[1],peerB=users[2];
 for(const id of [peerA.body.user.id,peerB.body.user.id]){
  const response=await req(live(roomId,'moderate'),'POST',{userId:id,action:'promote'},host.cookie);
  assert.equal(response.status,200);
 }
 const denied=await Promise.all([
  req(live(roomId,'moderate'),'POST',{userId:peerB.body.user.id,action:'kick'},peerA.cookie),
  req(live(roomId,'seat'),'POST',{userId:peerB.body.user.id,enabled:false},peerA.cookie),
  req(live(roomId,'invite'),'POST',{userId:peerB.body.user.id},peerA.cookie)
 ]);
 // The invitation is rejected as 422 because the peer already occupies a seat.
 assert.deepEqual(denied.map(x=>x.status),[403,403,422]);
 assert.equal((await req(live(roomId,'heartbeat'),'POST',null,peerB.cookie)).status,200);
});

test('simultaneous duplicate reports produce one persistent report receipt',async()=>{
 const reporter=users[6];const reason='Báo cáo thử nghiệm nhiều yêu cầu đồng thời';
 const replies=await Promise.all(Array.from({length:4},()=>req('/api/reports','POST',{roomId,reason},reporter.cookie)));
 assert.ok(replies.every(x=>x.status===201),replies.map(x=>x.status));
 assert.equal(new Set(replies.map(x=>x.body.reportId)).size,1);
 const mine=await req('/api/reports/mine','GET',null,reporter.cookie);
 assert.equal(mine.status,200);assert.equal(mine.body.reports.length,1);
 assert.equal(store.db.reports.filter(x=>x.roomId===roomId&&x.fromUserId===reporter.body.user.id).length,1);
});

test('HTTP token issuance waits for a revocation in progress, then carries updated publish scope',async()=>{
 const host=users[0], target=users[1];
 const original=livekit.service.updateParticipant;
 let began;
 const started=new Promise(resolve=>{began=resolve;});
 let finish;
 const delayed=new Promise(resolve=>{finish=resolve;});
 let wasAwaiting=true;
 livekit.service.updateParticipant=async()=>{began();await delayed;wasAwaiting=false;};
 let tokenResponse;
 try {
  const revoke=req(live(roomId,'seat'),'POST',{userId:target.body.user.id,enabled:false},host.cookie);
  await started;
  const token=req(live(roomId,'token'),'POST',null,target.cookie).then(value=>(tokenResponse=value,value));
  // Until the SFU acknowledges the revoke, the API must not hand out a
  // refresh JWT with the speaker's previous canPublish grant.
  await new Promise(resolve=>setTimeout(resolve,35));
  assert.equal(tokenResponse,undefined,'A token must not be issued during an in-flight seat revocation');
  finish();
  assert.equal((await revoke).status,200);
  const result=await token;
  assert.equal(result.status,200);
  assert.equal(wasAwaiting,false);
  const jwt=JSON.parse(Buffer.from(result.body.token.split('.')[1],'base64url').toString());
  assert.equal(jwt.video.canPublish,false,'Refreshed JWT must reflect the revoked speaker seat');
 }finally{
  finish?.();
  livekit.service.updateParticipant=original;
 }
});

test('HTTP token issuance cannot race kick while SFU participant removal is pending',async()=>{
 const host=users[0],target=users[3];
 const original=livekit.service.removeParticipant;
 let notify;
 const started=new Promise(resolve=>{notify=resolve;});
 let release;
 const blocked=new Promise(resolve=>{release=resolve;});
 livekit.service.removeParticipant=async()=>{notify();await blocked;};
 let received;
 try {
  const kick=req(live(roomId,'moderate'),'POST',{userId:target.body.user.id,action:'kick'},host.cookie);
  await started;
  const token=req(live(roomId,'token'),'POST',null,target.cookie).then(result=>(received=result,result));
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(received,undefined,'Do not refresh a token while kick is still revoking the old SFU identity');
  release();
  assert.equal((await kick).status,200);
  assert.equal((await token).status,403,'Kicked member must rejoin application room before requesting a token');
 }finally{
  release?.();
  livekit.service.removeParticipant=original;
 }
});

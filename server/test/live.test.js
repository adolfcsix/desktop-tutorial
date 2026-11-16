'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const crypto=require('node:crypto');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v04-'));
process.env.TUTTT_DATA_FILE=path.join(tmp,'store.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='tuttt-test-key';
process.env.LIVEKIT_API_SECRET='local-only-test-secret-please-not-production';
const {server,livekit}=require('../index');
let base;
const mock={updates:[],removes:[],async updateParticipant(room,identity,opts){this.updates.push({room,identity,opts});return{}},async removeParticipant(room,identity){this.removes.push({room,identity});}};
livekit.service=mock;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});});
async function request(route,method='GET',data,cookie='',origin){
 const res=await fetch(base+route,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:data?JSON.stringify(data):undefined});
 return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
}
function claims(jwt){const [h,p,s]=jwt.split('.');const sig=crypto.createHmac('sha256',process.env.LIVEKIT_API_SECRET).update(h+'.'+p).digest('base64url');assert.equal(s,sig);return JSON.parse(Buffer.from(p,'base64url').toString());}
let host,a,b,id,baseRoute;
test('SFU issues signed audience-only JWT only after joining a room',async()=>{
 host=await request('/api/session','POST',{name:'Host'});
 a=await request('/api/session','POST',{name:'An'});
 b=await request('/api/session','POST',{name:'Bình'});
 const made=await request('/api/rooms','POST',{title:'Phòng Live thử nghiệm',tag:'Tâm sự'},host.cookie);assert.equal(made.status,201);id=made.data.room.id;
 baseRoute=`/api/rooms/${id}/live`;
 assert.equal((await request(baseRoute+'/token','POST',null,a.cookie)).status,403);
 await request(`/api/rooms/${id}/join`,'POST',null,host.cookie);
 await request(`/api/rooms/${id}/join`,'POST',null,a.cookie);
 await request(`/api/rooms/${id}/join`,'POST',null,b.cookie);
 const owner=await request(baseRoute+'/token','POST',null,host.cookie);
 const guest=await request(baseRoute+'/token','POST',null,a.cookie);
 assert.equal(owner.status,200);assert.equal(guest.status,200);
 assert.equal(owner.data.serverUrl,process.env.LIVEKIT_URL);
 const h=claims(owner.data.token),g=claims(guest.data.token);
 assert.equal(h.video.room,`tuttt-${id}`);
 assert.equal(h.video.canPublish,true);assert.deepEqual(h.video.canPublishSources,['microphone']);assert.equal(h.video.roomAdmin,false);
 assert.equal(g.video.canPublish,false);assert.equal(g.video.canPublishSources,undefined);
 assert.equal(g.sub,a.data.user.id);assert.equal(g.video.canSubscribe,true);
 assert.ok(g.exp-g.iat<=300);assert.ok(!JSON.stringify(guest.data).includes(process.env.LIVEKIT_API_SECRET));
 assert.equal((await request('/api/health')).data.livekitConfigured,true);
});
test('listeners cannot grant themselves mic; only host approves pending requests',async()=>{
 const denied=await request(baseRoute+'/seat','POST',{userId:a.data.user.id,enabled:true},a.cookie);
 assert.equal(denied.status,403);
 assert.equal((await request(baseRoute+'/seat-request','POST',null,a.cookie)).status,200);
 const roster=await request(baseRoute,'GET',null,host.cookie);
 assert.ok(roster.data.requests.includes(a.data.user.id));
 const allowed=await request(baseRoute+'/seat','POST',{userId:a.data.user.id,enabled:true},host.cookie);
 assert.equal(allowed.status,200);assert.ok(allowed.data.members.find(x=>x.id===a.data.user.id).speaker);
 assert.equal(mock.updates.length,1);assert.equal(mock.updates[0].opts.permission.canPublish,true);
 assert.equal((await request(baseRoute+'/seat-leave','POST',null,a.cookie)).status,200);
 assert.equal(mock.updates[1].opts.permission.canPublish,false);
 assert.equal((await request(baseRoute+'/seat','POST',{userId:host.data.user.id,enabled:false},host.cookie)).status,403);
});
test('host can promote moderator, moderator can approve mic but cannot promote others',async()=>{
 await request(baseRoute+'/token','POST',null,b.cookie);
 const promoted=await request(baseRoute+'/moderate','POST',{userId:a.data.user.id,action:'promote'},host.cookie);
 assert.equal(promoted.status,200);
 assert.equal(promoted.data.members.find(x=>x.id===a.data.user.id).role,'moderator');
 assert.equal((await request(baseRoute+'/moderate','POST',{userId:b.data.user.id,action:'promote'},a.cookie)).status,403);
 assert.equal((await request(baseRoute+'/seat','POST',{userId:b.data.user.id,enabled:true},a.cookie)).status,403,'Cannot force person onto stage');
 assert.equal((await request(baseRoute+'/seat-request','POST',null,b.cookie)).status,200);
 const added=await request(baseRoute+'/seat','POST',{userId:b.data.user.id,enabled:true},a.cookie);
 assert.equal(added.status,200);
 assert.ok(added.data.members.find(x=>x.id===b.data.user.id).speaker);
});
test('HTTP: moderator cannot revoke peer moderator seat but host can',async()=>{
 const elevate=await request(baseRoute+'/moderate','POST',{userId:b.data.user.id,action:'promote'},host.cookie);
 assert.equal(elevate.status,200);
 const before=mock.updates.length;
 const denied=await request(baseRoute+'/seat','POST',{userId:b.data.user.id,enabled:false},a.cookie);
 assert.equal(denied.status,403);
 assert.equal(mock.updates.length,before,'API denial must not call the SFU');
 assert.equal((await request(baseRoute,'GET',null,host.cookie)).data.members.find(m=>m.id===b.data.user.id).speaker,true);
 assert.equal((await request(baseRoute+'/seat','POST',{userId:b.data.user.id,enabled:false},host.cookie)).status,200);
 assert.equal((await request(baseRoute+'/moderate','POST',{userId:b.data.user.id,action:'demote'},host.cookie)).status,200);
});
test('kicking removes participant, but a kick alone is not a ban',async()=>{
 const kicked=await request(baseRoute+'/moderate','POST',{userId:b.data.user.id,action:'kick'},host.cookie);
 assert.equal(kicked.status,200);assert.equal(mock.removes.length,1);
 assert.equal((await request(`/api/rooms/${id}/join`,'POST',null,b.cookie)).status,200);
 assert.equal((await request(baseRoute+'/token','POST',null,b.cookie)).status,200);
 assert.equal((await request(baseRoute+'/seat-request','POST',null,b.cookie)).status,200);
 assert.equal((await request(baseRoute+'/seat','POST',{userId:b.data.user.id,enabled:true},host.cookie)).status,200);
});
test('cross-origin requests and unauthenticated stage endpoints are rejected',async()=>{
 assert.equal((await request(baseRoute,'GET')).status,401);
 assert.equal((await request(baseRoute+'/token','POST',null,host.cookie,'https://attacker.example')).status,403);
 const origin=base.replace('127.0.0.1','localhost');
 assert.equal((await request(baseRoute+'/heartbeat','POST',null,host.cookie,origin)).status,403);
 assert.equal((await request(baseRoute+'/heartbeat','POST',null,host.cookie,base)).status,200);
});
test('permission-update errors do not grant speaker role in app state',async()=>{
 mock.updateParticipant=async()=>{throw Error('remote unavailable')};
 assert.equal((await request(baseRoute+'/seat-request','POST',null,a.cookie)).status,200);
 const result=await request(baseRoute+'/seat','POST',{userId:a.data.user.id,enabled:true},host.cookie);
 assert.equal(result.status,502);
 const roster=await request(baseRoute,'GET',null,host.cookie);
 assert.equal(roster.data.members.some(x=>x.id===a.data.user.id),false,
  'Uncertain permission update must remove the member from the active SFU roster');
 const refreshed=await request(baseRoute+'/token','POST',null,a.cookie);
 assert.equal(refreshed.status,200);
 const claims=JSON.parse(Buffer.from(refreshed.data.token.split('.')[1],'base64url').toString());
 assert.equal(claims.video.canPublish,false);
});
test('leaving a room revokes SFU connection and clears stage membership',async()=>{
 const result=await request(`/api/rooms/${id}/leave`,'POST',null,a.cookie);
 assert.equal(result.status,200);
 assert.ok(mock.removes.some(x=>x.identity===a.data.user.id));
 assert.equal((await request(baseRoute+'/token','POST',null,a.cookie)).status,403);
 const hostRoster=await request(baseRoute,'GET',null,host.cookie);
 assert.equal(hostRoster.status,200);
 assert.equal(hostRoster.data.members.some(x=>x.id===a.data.user.id),false);
});
test('HTTP room leave succeeds locally but explicitly warns when SFU revocation is unavailable',async()=>{
 const original=mock.removeParticipant;
 try{
  mock.removeParticipant=async()=>{throw Error('private SFU network details');};
  const result=await request(`/api/rooms/${id}/leave`,'POST',null,b.cookie);
  assert.equal(result.status,200);
  assert.equal(result.data.mediaDisconnectPending,true);
  assert.doesNotMatch(JSON.stringify(result.data),/private SFU network details/);
  const roster=await request(baseRoute,'GET',null,host.cookie);
  assert.equal(roster.status,200);
  assert.equal(roster.data.members.some(member=>member.id===b.data.user.id),false);
  assert.equal((await request(baseRoute+'/token','POST',null,b.cookie)).status,403,'A departed user must rejoin the application room before SFU reconciliation');
  assert.equal((await request(`/api/rooms/${id}/join`,'POST',null,b.cookie)).status,200);
  const blocked=await request(baseRoute+'/token','POST',null,b.cookie);
  assert.equal(blocked.status,409,'Must not reissue token until stale SFU removal is confirmed');
  assert.doesNotMatch(JSON.stringify(blocked.data),/private SFU network details/);
 }finally{mock.removeParticipant=original;}
 const recovered=await request(baseRoute+'/token','POST',null,b.cookie);
 assert.equal(recovered.status,200,'A successful authenticated SFU retry releases the session');
});

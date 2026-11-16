'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v050-cam-'));
process.env.TUTTT_DATA_FILE=path.join(tmp,'store.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='tuttt-cam-test';
process.env.LIVEKIT_API_SECRET='tuttt-testing-only-secure-key-not-for-use';
const {server,livekit,store}=require('../index');
let base,host,guests=[],roomId,endpoint;
const mock={updates:[],removed:[],async updateParticipant(r,id,data){this.updates.push({r,id,data})},async removeParticipant(r,id){this.removed.push({r,id})}};
livekit.service=mock;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});});
async function api(route,method='GET',data,who){const res=await fetch(base+route,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(who?{'cookie':who.cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||''}};
const payload=(jwt)=>JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString());
const join=(who)=>api('/api/rooms/'+roomId+'/join','POST',undefined,who);
const live=(op,who,data,method='POST')=>api(endpoint+(op?'/'+op:''),method,data,who);
test('creation distinguishes voice/cam and rejects invalid room type',async()=>{
 host=await api('/api/session','POST',{name:'Chủ phòng'});
 const wrong=await api('/api/rooms','POST',{title:'Phòng không hợp lệ',tag:'Kết bạn',type:'vr'},host);assert.equal(wrong.status,422);
 const r=await api('/api/rooms','POST',{title:'Phòng Cam 6 người',tag:'Tâm sự',type:'cam'},host);
 assert.equal(r.status,201);assert.equal(r.data.room.type,'cam');roomId=r.data.room.id;endpoint=`/api/rooms/${roomId}/live`;
 await join(host);const owner=await live('token',host);assert.equal(owner.status,200);
 assert.deepEqual(payload(owner.data.token).video.canPublishSources,['microphone','camera']);
 for(let i=0;i<7;i++){const u=await api('/api/session','POST',{name:'Khách '+(i+1)});guests.push(u);await join(u);await live('token',u)}
 const guest=await live('token',guests[0]);assert.equal(payload(guest.data.token).video.canPublish,false);
});
test('6 camera slots include host, 7th approval refused even if request exists',async()=>{
 for(let i=0;i<5;i++){
  assert.equal((await live('seat-request',guests[i])).status,200);
  assert.equal((await live('seat',host,{userId:guests[i].data.user.id,enabled:true})).status,200);
 }
 assert.equal((await live('seat-request',guests[5])).status,200);
 const rejected=await live('seat',host,{userId:guests[5].data.user.id,enabled:true});assert.equal(rejected.status,409);
 const snapshot=await live('',host,undefined,'GET');assert.equal(snapshot.data.type,'cam');assert.equal(snapshot.data.limits.cameras,6);
 assert.equal(snapshot.data.members.filter(m=>m.speaker).length,6);
 assert.ok(mock.updates.every(x=>x.data.permission.canPublishSources.includes('camera')));
 await live('seat',host,{userId:guests[4].data.user.id,enabled:false});
 const granted=await live('seat',host,{userId:guests[5].data.user.id,enabled:true});assert.equal(granted.status,200);
});
test('moderator can moderate listeners but cannot promote or kick owner',async()=>{
 const mod=guests[0],other=guests[6];
 assert.equal((await live('moderate',host,{userId:mod.data.user.id,action:'promote'})).status,200);
 assert.equal((await live('moderate',mod,{userId:other.data.user.id,action:'promote'})).status,403);
 assert.equal((await live('moderate',mod,{userId:host.data.user.id,action:'kick'})).status,403);
 assert.equal((await live('moderate',mod,{userId:other.data.user.id,action:'mute-chat',minutes:5})).status,200);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Tôi thử chat'},other)).status,403);
 assert.equal((await live('moderate',mod,{userId:other.data.user.id,action:'unmute-chat'})).status,200);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Tôi đã được mở chat'},other)).status,201);
});
test('room locked and chat settings enforced by server',async()=>{
 assert.equal((await live('settings',guests[0],{locked:true})).status,403);
 assert.equal((await live('settings',host,{locked:true,slowModeSeconds:10})).status,200);
 const stranger=await api('/api/session','POST',{name:'Khách mới'});
 assert.equal((await join(stranger)).status,403);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Tin A'},guests[5])).status,201);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Tin B'},guests[5])).status,429);
 assert.equal((await live('settings',host,{chatEnabled:false})).status,200);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Lại chat'},guests[5])).status,403);
 assert.equal((await api(`/api/rooms/${roomId}/messages`,'POST',{text:'Chủ vẫn chat được'},host)).status,201);
 assert.equal((await live('settings',host,{slowModeSeconds:7})).status,422);
 await live('settings',host,{locked:false,chatEnabled:true,slowModeSeconds:0});
});
test('kick is rejoinable, ban is timed and cannot be bypassed with token',async()=>{
 const target=guests[6];
 assert.equal((await live('moderate',guests[0],{userId:target.data.user.id,action:'kick'})).status,200);
 assert.equal((await join(target)).status,200);assert.equal((await live('token',target)).status,200);
 assert.equal((await live('moderate',host,{userId:target.data.user.id,action:'ban',minutes:60})).status,200);
 assert.equal((await join(target)).status,403);assert.equal((await live('token',target)).status,403);
 assert.equal((await live('moderate',guests[0],{userId:target.data.user.id,action:'unban'})).status,403);
 assert.equal((await live('moderate',host,{userId:target.data.user.id,action:'unban'})).status,200);
 assert.equal((await join(target)).status,200);
});
test('host camera seat remains reserved even after host briefly disconnects',async()=>{
 // Host disconnects from SFU; an appointed moderator cannot fill the reserved host slot.
 await live('leave',host);
 const before=await live('',guests[0],undefined,'GET');
 assert.equal(before.status,200);
 // All 5 guest seats are occupied after previous tests: #0,#1,#2,#3,#5.
 assert.equal(before.data.members.filter(x=>x.speaker).length,5);
 await live('seat-request',guests[4]);
 const result=await live('seat',guests[0],{userId:guests[4].data.user.id,enabled:true});
 assert.equal(result.status,409);
 const owner=await live('token',host);
 assert.equal(owner.status,200);
 assert.deepEqual(payload(owner.data.token).video.canPublishSources,['microphone','camera']);
});

test('moderation audit records successful actions and does not log rejected attempts',async()=>{
 const logs=store.db.moderationAudit||[];
 assert.ok(logs.some(x=>x.roomId===roomId&&x.action==='promote'&&x.actorId===host.data.user.id));
 assert.ok(logs.some(x=>x.roomId===roomId&&x.action==='ban'&&x.targetId===guests[6].data.user.id));
 assert.equal(logs.some(x=>x.action==='kick'&&x.targetId===host.data.user.id),false);
 for(const entry of logs){assert.ok(entry.createdAt>0);assert.equal(typeof entry.actorId,'string');assert.equal(typeof entry.targetId,'string');}
});

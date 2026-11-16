'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0844-http-'));
process.env.TUTTT_DATA_FILE=path.join(temp,'persisted.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='v0844-audit';
process.env.LIVEKIT_API_SECRET='v0844-audit-secret-for-mock-service';
const {server,stage,livekit,store}=require('../index');
const calls=[];
livekit.service={async updateParticipant(room,uid,opts){calls.push({action:'permission',room,uid,opts});},async removeParticipant(room,uid){calls.push({action:'remove',room,uid});}};
let base,host,guest,outsider,id;
before(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(ok=>server.close(ok));fs.rmSync(temp,{recursive:true,force:true});});
async function call(url,method='GET',payload,cookie='',extra={}){
 const r=await fetch(base+url,{method,headers:{...(payload?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{}),...extra},body:payload?JSON.stringify(payload):undefined});
 return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function login(name){const r=await call('/api/session','POST',{name});assert.equal(r.status,201);return r;}

test('HTTP: profile biography and room host name are saved and returned after refresh',async()=>{
 host=await login('Chủ phòng');guest=await login('Khách nghe');outsider=await login('Ngoài phòng');
 const room=await call('/api/rooms','POST',{title:'Phòng kiểm thử đầy đủ',tag:'Tâm sự'},host.cookie);
 assert.equal(room.status,201);id=room.data.room.id;
 const edited=await call('/api/me','PATCH',{name:'Host mới',bio:'Lời giới thiệu đã lưu'},host.cookie);
 assert.equal(edited.status,200);assert.equal(edited.data.user.bio,'Lời giới thiệu đã lưu');
 const me=await call('/api/me','GET',null,host.cookie);
 assert.equal(me.data.user.bio,'Lời giới thiệu đã lưu');
 assert.equal((await call(`/api/rooms/${id}`,'GET',null,guest.cookie)).data.room.host,'Host mới');
 const bad=await call('/api/me','PATCH',{name:'Tên hợp lệ',bio:{html:'unsafe'}},host.cookie);
 assert.equal(bad.status,422);
 assert.equal(store.db.users[host.data.user.id].bio,'Lời giới thiệu đã lưu');
});

test('HTTP: room lock does not eject active listener; outsider still blocked, stage seat request protected',async()=>{
 for(const user of [host,guest])assert.equal((await call(`/api/rooms/${id}/join`,'POST',null,user.cookie)).status,200);
 for(const user of [host,guest])assert.equal((await call(`/api/rooms/${id}/live/token`,'POST',null,user.cookie)).status,200);
 assert.equal((await call(`/api/rooms/${id}/live/settings`,'POST',{locked:true},host.cookie)).status,200);
 assert.equal((await call(`/api/rooms/${id}/live/heartbeat`,'POST',null,guest.cookie)).status,200);
 assert.equal((await call(`/api/rooms/${id}/join`,'POST',null,outsider.cookie)).status,403);
 assert.equal((await call(`/api/rooms/${id}/live/token`,'POST',null,outsider.cookie)).status,403);
 assert.equal((await call(`/api/rooms/${id}/audience`,'GET',null,outsider.cookie)).status,403);
 assert.equal((await call(`/api/rooms/${id}/live/seat`,'POST',{userId:guest.data.user.id,enabled:true},guest.cookie)).status,403);
});

test('HTTP: stale stage participant cannot be granted SFU permissions despite valid room presence',async()=>{
 assert.equal((await call(`/api/rooms/${id}/live/seat-request`,'POST',null,guest.cookie)).status,200);
 stage.data(id).members.get(guest.data.user.id).expiresAt=Date.now()-1;
 const prior=calls.filter(x=>x.action==='permission').length;
 const result=await call(`/api/rooms/${id}/live/seat`,'POST',{userId:guest.data.user.id,enabled:true},host.cookie);
 assert.ok([404,422].includes(result.status));
 assert.equal(calls.filter(x=>x.action==='permission').length,prior);
});

test('HTTP: report review API refuses guest role; no raw moderation secrets leaked',async()=>{
 const submitted=await call('/api/reports','POST',{roomId:id,reason:'Tin nhắn xúc phạm và quấy rối'},guest.cookie);
 assert.equal(submitted.status,201);
 const queue=await call('/api/moderation/reports','GET',null,host.cookie);
 assert.equal(queue.status,403);
 const mine=await call('/api/reports/mine','GET',null,guest.cookie);
 assert.equal(mine.status,200);assert.equal(mine.data.reports[0].id,submitted.data.reportId);
 assert.ok(!JSON.stringify(mine.data).includes('reviewHistory'));
});

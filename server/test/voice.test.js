'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v03-'));
process.env.TUTTT_DATA_FILE=path.join(tmp,'store.json');
const {server}=require('../index');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});});
async function req(route,method='GET',data,cookie=''){
 const response=await fetch(base+route,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined});
 const result=await response.json();return {status:response.status,data:result,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
}
const voice=(id,op='')=>`/api/rooms/${id}/voice${op?'/'+op:''}`;
let users,roomId;
test('voice API is bound to room membership; seats/mics/roles are enforced',async()=>{
 users=[];
 for(const name of ['Host','Bình','Chi','Dũng','Em','Phương','Giang'])users.push(await req('/api/session','POST',{name}));
 const owner=users[0];const created=await req('/api/rooms','POST',{title:'Kiểm thử voice',tag:'Tâm sự'},owner.cookie);
 assert.equal(created.status,201);roomId=created.data.room.id;
 assert.equal((await req(voice(roomId,'join'),'POST',null,owner.cookie)).status,403);
 await req('/api/rooms/'+roomId+'/join','POST',null,owner.cookie);
 const entered=await req(voice(roomId,'join'),'POST',null,owner.cookie);
 assert.equal(entered.status,200);assert.equal(entered.data.participants.length,1);
 assert.equal(entered.data.participants[0].role,'speaker');assert.equal(entered.data.limits.speakers,4);
 assert.equal((await req(voice(roomId,'seat'),'POST',{speaker:false},owner.cookie)).status,409);
 for(const u of users.slice(1,6)){
  await req(`/api/rooms/${roomId}/join`,'POST',null,u.cookie);
  assert.equal((await req(voice(roomId,'join'),'POST',null,u.cookie)).status,200);
 }
 const full=await req(voice(roomId), 'GET',null,users[1].cookie);
 assert.equal(full.data.participants.length,6);
 await req(`/api/rooms/${roomId}/join`,'POST',null,users[6].cookie);
 assert.equal((await req(voice(roomId,'join'),'POST',null,users[6].cookie)).status,409);
 assert.equal((await req(voice(roomId,'mic'),'POST',{enabled:true},users[1].cookie)).status,403);
 for(const u of users.slice(1,4))assert.equal((await req(voice(roomId,'seat'),'POST',{speaker:true},u.cookie)).status,200);
 assert.equal((await req(voice(roomId,'seat'),'POST',{speaker:true},users[4].cookie)).status,409);
 assert.equal((await req(voice(roomId,'mic'),'POST',{enabled:true},users[1].cookie)).status,200);
 const heartbeat=await req(voice(roomId,'heartbeat'),'POST',null,users[1].cookie);
 assert.ok(heartbeat.data.participants.find(p=>p.name==='Bình').mic);
 await req(voice(roomId,'seat'),'POST',{speaker:false},users[1].cookie);
 assert.equal((await req(voice(roomId), 'GET',null,users[1].cookie)).data.participants.find(p=>p.name==='Bình').mic,false);
 assert.equal((await req(voice(roomId,'mic'),'POST',{enabled:'yes'},users[1].cookie)).status,422);
});
test('SSE forwards signalling to the intended authenticated recipient',async()=>{
 const room=await req(voice(roomId),'GET',null,users[0].cookie);
 const recipient=room.data.participants.find(p=>p.name==='Bình').id;
 const from=room.data.selfId;
 const ctrl=new AbortController();
 const response=await fetch(base+'/api/events',{headers:{cookie:users[1].cookie},signal:ctrl.signal});
 assert.equal(response.status,200);
 const reader=response.body.getReader();
 try{
  const ready=await reader.read();assert.match(new TextDecoder().decode(ready.value),/retry: 3000/);
  const delivery=await req(voice(roomId,'signal'),'POST',{to:recipient,type:'candidate',payload:{candidate:'candidate:1 1 udp 1 192.168.1.2 3333 typ host'}},users[0].cookie);
  assert.equal(delivery.status,200);
  let text='';
  for(let i=0;i<3&&!text.includes('event: voice.signal');i++){
   const next=await Promise.race([reader.read(),new Promise((_,reject)=>setTimeout(()=>reject(Error('SSE voice signal timeout')),2500))]);
   text+=new TextDecoder().decode(next.value);
  }
  assert.match(text,/event: voice.signal/);
  assert.match(text,new RegExp(from));
  assert.match(text,new RegExp(roomId));
 }finally{ctrl.abort();}
});
test('WebRTC signalling validates destinations and payloads; room departures revoke access',async()=>{
 const members=await req(voice(roomId),'GET',null,users[0].cookie);
 const target=members.data.participants.find(p=>p.name==='Bình').id;
 const bad=await req(voice(roomId,'signal'),'POST',{to:target,type:'offer',payload:{type:'offer',sdp:'too short'}},users[0].cookie);
 assert.equal(bad.status,422);
 const good=await req(voice(roomId,'signal'),'POST',{to:target,type:'offer',payload:{type:'offer',sdp:'v=0\r\no=- 111 2 IN IP4 127.0.0.1\r\n'}},users[0].cookie);
 assert.equal(good.status,200);assert.ok(good.data.delivered);
 assert.equal((await req(voice(roomId,'signal'),'POST',{to:target,type:'notvalid',payload:{}},users[0].cookie)).status,422);
 await req(voice(roomId,'leave'),'POST',null,users[1].cookie);
 assert.equal((await req(voice(roomId,'signal'),'POST',{to:target,type:'candidate',payload:{candidate:'candidate:1 1 udp 1 192.168.1.2 3333 typ host'}},users[0].cookie)).status,404);
 assert.equal((await req(voice(roomId,'mic'),'POST',{enabled:true},users[1].cookie)).status,403);
 await req(`/api/rooms/${roomId}/leave`,'POST',null,users[0].cookie);
 assert.equal((await req(voice(roomId,'join'),'POST',null,users[0].cookie)).status,403);
});
test('voice.js is served, but backend source stays inaccessible',async()=>{
 const js=await fetch(base+'/voice.js');assert.equal(js.status,200);assert.match(await js.text(),/RTCPeerConnection/);
 const bad=await fetch(base+'/server/voice.js');assert.equal(bad.status,404);
});

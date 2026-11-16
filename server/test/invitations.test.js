'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v052-invites-'));
process.env.TUTTT_DATA_FILE=path.join(tmp,'store.json');
process.env.LIVEKIT_URL='ws://127.0.0.1:7880';
process.env.LIVEKIT_API_KEY='invite-tests';
process.env.LIVEKIT_API_SECRET='sample-key-only-for-local-tests-12345';
const {server,stage,livekit}=require('../index');
let base,host,guestA,guestB,mod,room,endpoint;
const mock={calls:[],removed:[],async updateParticipant(roomName,identity,options){this.calls.push({roomName,identity,options})},async removeParticipant(roomName,identity){this.removed.push({roomName,identity})}};
livekit.service=mock;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 async function account(name){return await api('/api/session','POST',{name})}
 host=await account('Chủ phòng');guestA=await account('Khách A');guestB=await account('Khách B');mod=await account('Phó phòng');
 const response=await api('/api/rooms','POST',{title:'Thử mời lên sân khấu',type:'cam',tag:'Kết bạn'},host);
 assert.equal(response.status,201);room=response.body.room.id;endpoint=`/api/rooms/${room}/live`;
 for(const user of [host,guestA,guestB,mod]){assert.equal((await api(`/api/rooms/${room}/join`,'POST',{},user)).status,200);assert.equal((await live('token',user,{})).status,200)}
});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true})});
async function api(route,method='GET',data,account){const response=await fetch(base+route,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(account?{'cookie':account.cookie}:{})},body:data?JSON.stringify(data):undefined});let body=await response.json();return {status:response.status,body,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};}
async function live(sub,who,payload,method='POST'){return api(endpoint+(sub?'/'+sub:''),method,payload,who)}
test('listener cannot invite other people and host can only invite joined listeners',async()=>{
 const denied=await live('invite',guestA,{userId:guestB.body.user.id});assert.equal(denied.status,403);
 const invalid=await live('invite',host,{userId:'not-present'});assert.equal(invalid.status,422);
 const owner=await live('invite',host,{userId:host.body.user.id});assert.equal(owner.status,422);
});
test('invitation is private to recipient and never grants camera/mic permission before consent',async()=>{
 const beforeCalls=mock.calls.length;
 const sent=await live('invite',host,{userId:guestA.body.user.id});assert.equal(sent.status,200);
 assert.equal(mock.calls.length,beforeCalls,'must not grant publishing by inviting');
 const hostView=await live('',host,undefined,'GET');
 const invitation=hostView.body.outgoingInvitations[0];assert.ok(invitation.id);
 const guestView=await live('',guestA,undefined,'GET');assert.equal(guestView.body.incomingInvitations[0].id,invitation.id);
 assert.equal(guestView.body.outgoingInvitations.length,0);
 assert.deepEqual((await live('',guestB,undefined,'GET')).body.incomingInvitations,[]);
 assert.equal((await live('invite-respond',guestB,{invitationId:invitation.id,accept:true})).status,404);
 const dupe=await live('invite',host,{userId:guestA.body.user.id});assert.equal(dupe.status,409);
 const reject=await live('invite-respond',guestA,{invitationId:invitation.id,accept:false});assert.equal(reject.status,200);
 assert.equal(reject.body.members.find(m=>m.id===guestA.body.user.id).speaker,false);
 assert.equal(mock.calls.length,beforeCalls);
});
test('recipient accepts explicitly and only then receives publishing permissions',async()=>{
 const send=await live('invite',host,{userId:guestA.body.user.id});assert.equal(send.status,200);
 const inv=(await live('',guestA,undefined,'GET')).body.incomingInvitations[0];
 const n=mock.calls.length;
 const accepted=await live('invite-respond',guestA,{invitationId:inv.id,accept:true});assert.equal(accepted.status,200);
 assert.equal(accepted.body.members.find(m=>m.id===guestA.body.user.id).speaker,true);
 assert.equal(mock.calls.length,n+1);
 assert.equal(mock.calls.at(-1).identity,guestA.body.user.id);
 assert.deepEqual(mock.calls.at(-1).options.permission.canPublishSources,['microphone','camera']);
 assert.deepEqual(accepted.body.incomingInvitations,[]);
 assert.equal((await live('invite-respond',guestA,{invitationId:inv.id,accept:true})).status,404);
});
test('host can cancel pending invitation, expired invitation cannot be accepted',async()=>{
 const sent=await live('invite',host,{userId:guestB.body.user.id});assert.equal(sent.status,200);
 let inv=(await live('',guestB,undefined,'GET')).body.incomingInvitations[0];
 assert.equal((await live('invite-cancel',guestB,{invitationId:inv.id})).status,403);
 assert.equal((await live('invite-cancel',host,{invitationId:inv.id})).status,200);
 assert.equal((await live('invite-respond',guestB,{invitationId:inv.id,accept:true})).status,404);
 assert.equal((await live('invite',host,{userId:guestB.body.user.id})).status,200);
 inv=(await live('',guestB,undefined,'GET')).body.incomingInvitations[0];
 stage.data(room).invitations.get(inv.id).expiresAt=Date.now()-10;
 assert.equal((await live('invite-respond',guestB,{invitationId:inv.id,accept:true})).status,404);
});
test('moderator may invite viewer, demotion invalidates outstanding invitation',async()=>{
 assert.equal((await live('moderate',host,{userId:mod.body.user.id,action:'promote'})).status,200);
 assert.equal((await live('invite',mod,{userId:guestB.body.user.id})).status,200);
 const inv=(await live('',guestB,undefined,'GET')).body.incomingInvitations[0];
 assert.equal((await live('moderate',host,{userId:mod.body.user.id,action:'demote'})).status,200);
 assert.equal((await live('invite-respond',guestB,{invitationId:inv.id,accept:true})).status,404);
});
test('kick cancels pending invites and cannot be bypassed by accepting later',async()=>{
 assert.equal((await live('invite',host,{userId:guestB.body.user.id})).status,200);
 const inv=(await live('',guestB,undefined,'GET')).body.incomingInvitations[0];
 assert.equal((await live('moderate',host,{userId:guestB.body.user.id,action:'kick'})).status,200);
 assert.equal((await live('invite-respond',guestB,{invitationId:inv.id,accept:true})).status,403);
});
test('when host seat reserved, available seat count is enforced at acceptance',async()=>{
 // Build a new room with 7 participants; invite 2 listeners before allocating all slots.
 const many=[];
 const newRoom=(await api('/api/rooms','POST',{title:'Giới hạn 6 cam',type:'cam',tag:'Tâm sự'},host)).body.room.id;
 const ep2=`/api/rooms/${newRoom}/live`;
 const call=async(sub,who,payload,method='POST')=>api(ep2+(sub?'/'+sub:''),method,payload,who);
 for(const user of [host,guestA,guestB,mod]){await api(`/api/rooms/${newRoom}/join`,'POST',{},user);await call('token',user,{})}
 for(let i=0;i<4;i++){const a=await api('/api/session','POST',{name:`Người ${i}`});many.push(a);await api(`/api/rooms/${newRoom}/join`,'POST',{},a);await call('token',a,{})}
 const sent=await call('invite',host,{userId:many[3].body.user.id});assert.equal(sent.status,200);
 const inv=(await call('',many[3],undefined,'GET')).body.incomingInvitations[0];
 for(const user of [guestA,guestB,mod,many[0],many[1]]){assert.equal((await call('seat-request',user,{})).status,200);assert.equal((await call('seat',host,{userId:user.body.user.id,enabled:true})).status,200);}
 const fail=await call('invite-respond',many[3],{invitationId:inv.id,accept:true});assert.equal(fail.status,409);
 assert.equal(mock.calls.some(call=>call.roomName===newRoom&&call.identity===many[3].body.user.id),false);
 assert.equal((await call('',many[3],undefined,'GET')).body.incomingInvitations.length,1);
 // Empty one seat then guest accepts the original invitation.
 assert.equal((await call('seat',host,{userId:many[1].body.user.id,enabled:false})).status,200);
 assert.equal((await call('invite-respond',many[3],{invitationId:inv.id,accept:true})).status,200);
});
test('uncertain SFU invitation update disconnects guest and drops invitation before safe rejoin',async()=>{
 // New room to avoid old seat state and rate count.
 const second=(await api('/api/rooms','POST',{title:'SFU failure rollback',type:'cam',tag:'Tâm sự'},host)).body.room.id;
 const endpoint2=`/api/rooms/${second}/live`;
 const call=(sub,who,payload,method='POST')=>api(endpoint2+(sub?'/'+sub:''),method,payload,who);
 for(const user of [host,guestA]){await api(`/api/rooms/${second}/join`,'POST',{},user);await call('token',user,{})}
 await call('invite',host,{userId:guestA.body.user.id});
 const inv=(await call('',guestA,undefined,'GET')).body.incomingInvitations[0];
 const orig=mock.updateParticipant;
 mock.updateParticipant=async()=>{throw Error('SFU unavailable')};
 try {const fail=await call('invite-respond',guestA,{invitationId:inv.id,accept:true});assert.equal(fail.status,502);
 const snapshot=await call('',guestA,undefined,'GET');
 assert.equal(snapshot.body.members.some(m=>m.id===guestA.body.user.id),false,'Do not retain a potentially publishing remote participant');
 assert.equal(snapshot.body.incomingInvitations.length,0,'Consent invitation is invalidated after unsafe SFU outcome');
 } finally{mock.updateParticipant=orig}
 const refreshed=await call('token',guestA,{});
 assert.equal(refreshed.status,200);
 const claims=JSON.parse(Buffer.from(refreshed.body.token.split('.')[1],'base64url').toString());
 assert.equal(claims.video.canPublish,false);
});

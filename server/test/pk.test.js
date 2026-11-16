'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os'),fs=require('node:fs'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-pk-v060-'));
process.env.TUTTT_DATA_FILE=path.join(dir,'db.json');
const {server,store,pk}=require('../index');
let base,h1,h2,guest,roomA,roomB,voiceB,inviteId,matchId;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port});
after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true})});
async function request(route,method='GET',data,user){const r=await fetch(base+route,{method,headers:{...(data?{'content-type':'application/json'}:{}),...(user?{'cookie':user.cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''}}
async function make(name){return request('/api/session','POST',{name});}
const create=(u,type='cam')=>request('/api/rooms','POST',{title:'Phòng PK '+u.body.user.name,tag:'Kết bạn',type},u);
const join=(r,u)=>request(`/api/rooms/${r}/join`,'POST',{},u);
const pkurl=(r,op='')=>`/api/rooms/${r}/pk${op?'/'+op:''}`;
test('PK can only link separate, same-type host-owned rooms',async()=>{
 h1=await make('Host Cam A');h2=await make('Host Cam B');guest=await make('Người xem');
 roomA=(await create(h1)).body.room.id;roomB=(await create(h2)).body.room.id;
 voiceB=(await create(h2,'voice')).body.room.id;
 await join(roomA,h1);await join(roomB,h2);await join(roomA,guest);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB},guest)).status,403);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomA},h1)).status,422);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:voiceB},h1)).status,422);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB,durationSeconds:12},h1)).status,422);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB,durationSeconds:180},h1)).status,201);
});
test('PK invite requires explicit acceptance, cannot be stolen or duplicated',async()=>{
 let invitations=(await request(pkurl(roomB), 'GET',undefined,h2)).body.invites;
 assert.equal(invitations.length,1);inviteId=invitations[0].id;
 assert.equal((await request(pkurl(roomB,'respond'),'POST',{invitationId:inviteId,accept:true},guest)).status,403);
 assert.equal((await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB},h1)).status,409);
 assert.equal((await request(pkurl(roomB,'respond'),'POST',{invitationId:inviteId,accept:true},h2)).status,200);
 assert.equal((await request(pkurl(roomB,'respond'),'POST',{invitationId:inviteId,accept:true},h2)).status,404);
 const status=(await request(pkurl(roomB),'GET',undefined,h2)).body;
 assert.equal(status.match.status,'active');matchId=status.match.id;assert.equal(status.match.scoreType,'free-cheers');
});
test('PK points come from authenticated members and are capped per user',async()=>{
 assert.equal((await request(pkurl(roomA,'cheer'),'POST',{matchId},guest)).status,200);
 assert.equal((await request(pkurl(roomA,'cheer'),'POST',{matchId},guest)).status,429);
 assert.equal((await request(pkurl(roomB,'cheer'),'POST',{matchId},guest)).status,403);
 const score=(await request(pkurl(roomA),'GET',undefined,h1)).body.match;
 assert.equal(score.scoreA,1);assert.equal(score.scoreB,0);
 assert.equal((await request(pkurl(roomB,'cheer'),'POST',{matchId},h2)).status,200);
 assert.equal((await request(pkurl(roomA),'GET',undefined,h1)).body.match.scoreB,1);
});
test('Only the host can finish the match; early finish is forfeit',async()=>{
 assert.equal((await request(pkurl(roomA,'end'),'POST',{matchId},guest)).status,403);
 const done=await request(pkurl(roomA,'end'),'POST',{matchId},h1);
 assert.equal(done.status,200);assert.equal(done.body.winner,'B');assert.equal(done.body.reason,'forfeit');assert.equal(done.body.winStreak,1);
 assert.equal((await request(pkurl(roomA,'cheer'),'POST',{matchId},guest)).status,409);
 assert.equal((await request(pkurl(roomA),'GET',undefined,h1)).body.recent[0].winner,'B');
});
test('PK invitation can be declined, cancelled and expires without a fake score',async()=>{
 let x=await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB,durationSeconds:60},h1);
 assert.equal(x.status,201);
 assert.equal((await request(pkurl(roomA,'cancel'),'POST',{invitationId:x.body.invitationId},h2)).status,403);
 assert.equal((await request(pkurl(roomA,'cancel'),'POST',{invitationId:x.body.invitationId},h1)).status,200);
 x=await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB},h1);
 assert.equal((await request(pkurl(roomB,'respond'),'POST',{invitationId:x.body.invitationId,accept:false},h2)).body.status,'declined');
 x=await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB},h1);
 store.db.pk.invites[x.body.invitationId].expiresAt=Date.now()-1;
 const snap=await request(pkurl(roomA),'GET',undefined,h1);
 assert.equal(snap.body.invites.length,0);
 assert.equal(store.db.pk.invites[x.body.invitationId].status,'expired');
});
test('PK match auto-finalizes using server clock and restarts from durable store data',async()=>{
 const invite=await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB,durationSeconds:60},h1);
 const result=await request(pkurl(roomB,'respond'),'POST',{invitationId:invite.body.invitationId,accept:true},h2);
 const m=store.db.pk.matches[result.body.match.id];m.scoreA=5;m.endsAt=Date.now()-1000;
 let snap=await request(pkurl(roomB),'GET',undefined,h2);
 assert.equal(snap.body.match,null);assert.equal(snap.body.recent[0].winner,'A');assert.equal(snap.body.recent[0].winStreak,1);
 assert.equal(store.db.pk.matches[m.id].status,'finished');
 assert.ok(fs.existsSync(process.env.TUTTT_DATA_FILE));
 const raw=JSON.parse(fs.readFileSync(process.env.TUTTT_DATA_FILE,'utf8'));
 assert.equal(raw.pk.matches[m.id].winner,'A');
});

test('PK streak increments exactly once, resets on loss and draw, persists across snapshots',async()=>{
 const start=async()=>{
  const invite=await request(pkurl(roomA,'invite'),'POST',{opponentRoomId:roomB,durationSeconds:60},h1);
  assert.equal(invite.status,201);
  const res=await request(pkurl(roomB,'respond'),'POST',{invitationId:invite.body.invitationId,accept:true},h2);
  assert.equal(res.status,200);return store.db.pk.matches[res.body.match.id];
 };
 let m=await start();m.scoreA=4;m.scoreB=1;m.endsAt=Date.now()-1000;
 let snap=(await request(pkurl(roomA),'GET',undefined,h1)).body;
 assert.equal(snap.recent[0].winner,'A');assert.equal(snap.recent[0].winStreak,2);
 assert.equal(store.db.pk.streaks[roomA],2);
 (await request(pkurl(roomB),'GET',undefined,h2));
 assert.equal(store.db.pk.streaks[roomA],2,'polling an already finished match cannot increment streak');
 m=await start();m.scoreA=9;m.scoreB=9;m.endsAt=Date.now()-1000;
 snap=(await request(pkurl(roomA),'GET',undefined,h1)).body;
 assert.equal(snap.recent[0].winner,null);assert.equal(snap.recent[0].winStreak,0);
 assert.equal(store.db.pk.streaks[roomA],0);assert.equal(store.db.pk.streaks[roomB],0);
 m=await start();m.scoreA=1;m.scoreB=7;m.endsAt=Date.now()-1000;
 snap=(await request(pkurl(roomB),'GET',undefined,h2)).body;
 assert.equal(snap.recent[0].winner,'B');assert.equal(snap.recent[0].winStreak,1);
 const saved=JSON.parse(fs.readFileSync(process.env.TUTTT_DATA_FILE,'utf8'));
 assert.equal(saved.pk.streaks[roomA],0);assert.equal(saved.pk.streaks[roomB],1);
});

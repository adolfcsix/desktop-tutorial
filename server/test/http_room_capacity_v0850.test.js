'use strict';
/** HTTP-level room admission test; no real SFU/media is implied. */
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-v0850-http-cap-'));
process.env.TUTTT_DATA_FILE=path.join(directory,'store.json');
const {server,store}=require('../index');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(directory,{recursive:true,force:true});});
const register=(name)=>store.session(name);
async function call(url,token,method='POST'){
 const response=await fetch(base+url,{method,headers:{authorization:`Bearer ${token}`}});
 return {status:response.status,body:await response.json()};
}
test('HTTP join respects 80 viewer+host capacity, including parallel requests and idempotent reconnect',async()=>{
 const host=register('Room host');
 const room=store.createRoom(host.user,{title:'Kiểm tra sức chứa phòng',tag:'Tâm sự'});
 const viewers=Array.from({length:81},(_,i)=>register(`Viewer ${i}`));
 const route=`/api/rooms/${room.id}/join`;
 const joined=await Promise.all(viewers.slice(0,80).map(v=>call(route,v.token)));
 assert.equal(joined.filter(r=>r.status===200).length,79);
 assert.equal(joined.filter(r=>r.status===409).length,1);
 assert.equal(store.count(room.id),79);
 assert.equal((await call(route,host.token)).status,200);
 assert.equal((await call(route,host.token)).status,200,'host can refresh presence in a full room');
 assert.equal((await call(route,viewers[80].token)).status,409);
 assert.equal(store.count(room.id),80);
 assert.equal((await call(`/api/rooms/${room.id}/leave`,viewers[0].token)).status,200);
 assert.equal((await call(route,viewers[80].token)).status,200);
 assert.equal(store.count(room.id),80);
 const audience=await call(`/api/rooms/${room.id}/audience`,host.token,'GET');
 assert.equal(audience.status,200);assert.equal(audience.body.count,80);
});

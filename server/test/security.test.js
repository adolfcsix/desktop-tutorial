'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-security-'));
process.env.TUTTT_DATA_FILE=path.join(tmp,'db.json');
const {server}=require('../index');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});});
test('cross-origin requests cannot create guest sessions',async()=>{
 const r=await fetch(base+'/api/session',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({name:'Test'})});
 assert.equal(r.status,403);
 assert.equal(Object.keys(JSON.parse(fs.existsSync(process.env.TUTTT_DATA_FILE)?fs.readFileSync(process.env.TUTTT_DATA_FILE):'{"users":{}}').users).length,0);
});
test('same-origin guest session still works',async()=>{
 const r=await fetch(base+'/api/session',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({name:'An'})});
 assert.equal(r.status,201);assert.match(r.headers.get('set-cookie'),/HttpOnly/);
});
test('invalid Origin and oversized JSON rejected',async()=>{
 const bad=await fetch(base+'/api/session',{method:'POST',headers:{origin:'not-a-url','content-type':'application/json'},body:'{}'});assert.equal(bad.status,403);
 const huge=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'x'.repeat(9000)})});assert.equal(huge.status,413);
});

test('SSE connection cap is enforced per user and other users remain unaffected',async()=>{
 const mk=async name=>{const r=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json','x-tuttt-client':'mobile'},body:JSON.stringify({name})});assert.equal(r.status,201);return (await r.json()).token;};
 const a=await mk('User A'), b=await mk('User B');
 const controllers=[];
 try {
  for(let i=0;i<3;i++){const ctrl=new AbortController();controllers.push(ctrl);const r=await fetch(base+'/api/events',{headers:{authorization:'Bearer '+a},signal:ctrl.signal});assert.equal(r.status,200);}
  const excess=await fetch(base+'/api/events',{headers:{authorization:'Bearer '+a}});assert.equal(excess.status,429);
  const otherCtrl=new AbortController();controllers.push(otherCtrl);const other=await fetch(base+'/api/events',{headers:{authorization:'Bearer '+b},signal:otherCtrl.signal});assert.equal(other.status,200);
 } finally {for(const c of controllers)c.abort();}
});

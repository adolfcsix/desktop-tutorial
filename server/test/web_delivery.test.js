'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-web-'));
process.env.TUTTT_DATA_FILE=path.join(temp,'store.json');
const {server}=require('../index');
let base;
before(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(ok=>server.close(ok));fs.rmSync(temp,{recursive:true,force:true});});
test('HTTP serves entry page and every directly referenced local asset',async()=>{
 const response=await fetch(base+'/');
 assert.equal(response.status,200,'npm start must serve the app at /');
 assert.match(response.headers.get('content-type'),/text\/html/);
 const html=await response.text();
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(/^(https?:|data:)/.test(match[1]))continue;
  const asset=await fetch(new URL(match[1],base+'/'));
  assert.equal(asset.status,200,match[1]);
  assert.ok((await asset.arrayBuffer()).byteLength>0,match[1]);
 }
 assert.equal((await fetch(base+'/index.html')).status,200);
});
test('static serving restricts methods and never exposes backend or data files',async()=>{
 assert.equal((await fetch(base+'/styles.css',{method:'HEAD'})).status,200);
 for(const target of ['/server/index.js','/package.json','/data/store.json','/unknown.js']){
  assert.equal((await fetch(base+target)).status,404,target);
 }
 const response=await fetch(base+'/app.js',{method:'POST'});
 assert.equal(response.status,405);
 assert.equal(response.headers.get('allow'),'GET, HEAD');
});
test('HTTP preserves Vietnamese characters split across request chunks and limits raw bytes',async()=>{
 const http=require('node:http');
 const name='Túttt tiếng Việt';
 const payload=Buffer.from(JSON.stringify({name}));
 const split=payload.indexOf(Buffer.from('ú'))+1;
 const result=await new Promise((resolve,reject)=>{
  const req=http.request(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'}},res=>{
   let raw='';res.on('data',chunk=>raw+=chunk);res.on('end',()=>resolve({status:res.statusCode,data:JSON.parse(raw)}));
  });
  req.on('error',reject);req.write(payload.subarray(0,split));
  setTimeout(()=>req.end(payload.subarray(split)),20);
 });
 assert.equal(result.status,201);assert.equal(result.data.user.name,name);
 const large=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'ệ'.repeat(3000)})});
 assert.equal(large.status,413);
});

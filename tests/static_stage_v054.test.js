'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server/index');
let origin;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test('actual HTTP serves stage UI stylesheet and logic from same origin',async()=>{
 for(const [name,type] of [['live-stage-v054.css','text/css'],['stage-layout.js','text/javascript'],['live-speaker-v057.css','text/css'],['speaker-status.js','text/javascript']]){
  const response=await fetch(origin+'/'+name);
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),new RegExp(type));
  assert.ok((await response.text()).length>250);
 }
});
test('health endpoint reports current package version and page uses new UI resources',async()=>{
 const health=await(await fetch(origin+'/api/health')).json();assert.equal(health.version,require('../package.json').version);
 const html=await(await fetch(origin+'/')).text();assert.match(html,/live-stage-v054\.css/);assert.match(html,/stage-layout\.js/);
});

'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {server}=require('../server/index');
let base;
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test('HTTP serves the new Live experience stylesheet with correct MIME',async()=>{
 const response=await fetch(base+'/live-experience-v051.css');
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/text\/css/);
 assert.match(await response.text(),/cam-stage-grid/);
});
test('new translucent chat stylesheet is served from the same origin',async()=>{
 const response=await fetch(base+'/live-chat-v052.css');
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/text\/css/);
 const css=await response.text();
 assert.match(css,/cam-mode-chat/);
 assert.match(css,/cam-mode-glass/);
});
test('web app links the new stylesheet and current health version',async()=>{
 const html=await(await fetch(base+'/')).text();
 assert.match(html,/live-experience-v051\.css/);assert.match(html,/live-chat-v052\.css/);
 const health=await(await fetch(base+'/api/health')).json();
 assert.equal(health.version,require('../package.json').version);
});

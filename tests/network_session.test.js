'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../prototype/network.js'),'utf8');
function network(fetch,extra={}){const context={window:{},fetch,Error,AbortController,setTimeout,clearTimeout,...extra};vm.runInNewContext(source,context);return context.window.TutttNetwork;}
test('session creates a guest only when the server confirms an expired/missing session',async()=>{
 const calls=[];
 const net=network(async(path)=>{calls.push(path);return path==='/api/me'?{ok:false,status:401,json:async()=>({error:'expired'})}:{ok:true,status:201,json:async()=>({user:{id:'new'}})};});
 assert.equal((await net.session()).user.id,'new');
 assert.deepEqual(calls,['/api/me','/api/session']);
});
test('server failure, invalid JSON and offline connection never replace a guest identity',async()=>{
 for(const mode of ['server','json','offline']){
  const calls=[];
  const net=network(async(path)=>{calls.push(path);if(mode==='offline')throw new Error('offline');return {ok:false,status:503,json:async()=>{if(mode==='json')throw new Error('bad JSON');return {error:'unavailable'};}};});
  await assert.rejects(()=>net.session());
  assert.deepEqual(calls,['/api/me']);
 }
});
test('a stalled request is aborted and never creates a replacement session',async()=>{
 const calls=[];let cleared=false;
 const net=network((path,{signal})=>new Promise((resolve,reject)=>{
  calls.push(path);signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})));
 }),{setTimeout:fn=>{queueMicrotask(fn);return 1;},clearTimeout:()=>{cleared=true;}});
 await assert.rejects(()=>net.session(),/phản hồi quá lâu/);
 assert.deepEqual(calls,['/api/me']);assert.equal(cleared,true);
});

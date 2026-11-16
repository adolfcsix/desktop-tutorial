'use strict';
// Runs the delivered HTML/scripts through the real HTTP server in a DOM runtime.
// This checks integration, not browser layout or physical media devices.
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-dom-'));
process.env.TUTTT_DATA_FILE=path.join(temp,'store.json');
delete process.env.LIVEKIT_URL;delete process.env.LIVEKIT_API_KEY;delete process.env.LIVEKIT_API_SECRET;
const {server}=require('../index');
let base;
before(async()=>{await new Promise(ok=>server.listen(0,'127.0.0.1',ok));base=`http://127.0.0.1:${server.address().port}`;});
after(async()=>{server.closeAllConnections();await new Promise(ok=>server.close(ok));fs.rmSync(temp,{recursive:true,force:true});});
async function until(check){for(let i=0;i<200;i++){if(check())return;await new Promise(ok=>setTimeout(ok,20));}assert.fail('Timed out waiting for app state');}
test('delivered app boots, saves profile, creates a room and sends a real room message',{timeout:15000},async()=>{
 const errors=[];let cookie='',historyReads=0,sendRequests=0;
 const console=new VirtualConsole();
 console.on('jsdomError',error=>{if(error.type!=='css parsing')errors.push(error.message);});
 class LocalResources extends ResourceLoader{fetch(url,options){return url.startsWith(base)?super.fetch(url,options):null;}}
 const dom=await JSDOM.fromURL(base+'/',{
  resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console,
  beforeParse(window){
   window.structuredClone=structuredClone;
   window.AbortController=AbortController;
   window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
   window.EventSource=class{addEventListener(){}close(){}};
   window.fetch=async(url,options={})=>{
    if(String(url).endsWith('/messages')){
     if(options.method==='POST'){sendRequests++;await new Promise(ok=>setTimeout(ok,50));}
     else historyReads++;
    }
    const response=await fetch(new URL(url,base),{...options,headers:{...options.headers,...(cookie?{cookie}:{})}});
    const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];
    return response;
   };
  }
 });
 try{
  const w=dom.window,d=w.document;
  await until(()=>d.body.textContent.includes('ĐÃ KẾT NỐI'));
  const click=selector=>{const el=d.querySelector(selector);assert.ok(el,selector);el.click();};
  const submit=id=>{const form=d.querySelector(id);assert.ok(form,id);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
  click('[data-action="tab"][data-id="profile"]');click('[data-action="editProfile"]');
  d.querySelector('#edit-profile [name="name"]').value='Túttt kiểm thử';
  d.querySelector('#edit-profile [name="bio"]').value='Đã lưu hồ sơ thật';submit('#edit-profile');
  await until(()=>!d.querySelector('#edit-profile'));
  assert.match(d.querySelector('.profile-title').textContent,/Túttt kiểm thử/);
  click('[data-action="tab"][data-id="live"]');click('[data-action="tab"][data-id="create"]');
  d.querySelector('#create-room [name="name"]').value='Phòng chạy thực tế';submit('#create-room');
  await until(()=>d.querySelector('#room-send'));
  await until(()=>historyReads>0); // Voice is unavailable in jsdom; history must still load.
  d.querySelector('#room-send [name="message"]').value='Chào Túttt, tiếng Việt ổn định';submit('#room-send');
  submit('#room-send'); // A double tap while the request is pending must send once.
  await until(()=>d.body.textContent.includes('Chào Túttt, tiếng Việt ổn định'));
  const rooms=await (await w.fetch('/api/rooms')).json();
  assert.equal(rooms.rooms[0].title,'Phòng chạy thực tế');
  const messages=await (await w.fetch(`/api/rooms/${rooms.rooms[0].id}/messages`)).json();
  assert.equal(messages.messages[0].text,'Chào Túttt, tiếng Việt ổn định');
  assert.equal(sendRequests,1);assert.equal(messages.messages.length,1);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close();}
});

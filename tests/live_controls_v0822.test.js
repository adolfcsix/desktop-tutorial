'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const voiceSource=fs.readFileSync(path.join(__dirname,'../prototype/voice.js'),'utf8');
const appSource=fs.readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
const wait=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
function fixture(api){
 const events=[],calls=[];
 class PC{
  constructor(){this.connectionState='new';this.signalingState='stable';}
  addTransceiver(){return {sender:{replaceTrack:async()=>{}}}}
  close(){}
 }
 const stage={appendChild(){},querySelectorAll(){return []}};
 const document={getElementById:()=>stage,body:{appendChild(){}},createElement:()=>({remove(){},play:async()=>{}})};
 const window={RTCPeerConnection:PC,isSecureContext:true};
 vm.runInNewContext(voiceSource,{window,RTCPeerConnection:PC,document,navigator:{mediaDevices:{getUserMedia:async()=>{}}},setInterval,clearInterval,setTimeout,clearTimeout,MediaStream:class{},Uint8Array,Math});
 const voice=new window.TutttVoice((p,m,payload)=>{calls.push({p,m,payload});return Promise.resolve(api(p,m,payload))},x=>events.push(x),()=>{});
 const roster=(room,role)=>({roomId:room,selfId:'me',participants:[{id:'me',role,mic:false}]});
 return {voice,calls,events,roster};
}
test('two fast join-seat taps make one request and expose seat pending feedback',async()=>{
 const hold=deferred();const q=fixture(p=>p.endsWith('/seat')?hold.promise:q.roster('A','listener'));
 await q.voice.enter('A');
 const first=q.voice.seat(true);await q.voice.seat(false);
 assert.equal(q.voice.seatPending,true);
 assert.equal(q.calls.filter(x=>x.p.endsWith('/seat')).length,1);
 assert.equal(q.events.at(-1).seat,false);
 hold.resolve(q.roster('A','speaker'));await first;
 assert.equal(q.voice.seatPending,false);assert.equal(q.voice.self.role,'speaker');
 await q.voice.exit();
});
test('failed seat request clears single-flight lock, allowing explicit retry',async()=>{
 let fail=true;
 const q=fixture(p=>p.endsWith('/seat')&&(fail)?Promise.reject(new Error('backend busy')):q.roster('A',p.endsWith('/seat')?'speaker':'listener'));
 await q.voice.enter('A');
 await assert.rejects(q.voice.seat(true),/backend busy/);
 assert.equal(q.voice.seatPending,false);
 fail=false;await q.voice.seat(true);
 assert.equal(q.voice.self.role,'speaker');
 assert.equal(q.calls.filter(x=>x.p.endsWith('/seat')).length,2);
 await q.voice.exit();
});
test('late seat response from previous session cannot clear new pending action in same room',async()=>{
 const old=deferred(),fresh=deferred();let count=0;
 const q=fixture(p=>p.endsWith('/seat')?(++count===1?old.promise:fresh.promise):q.roster('A','listener'));
 await q.voice.enter('A');const first=q.voice.seat(true);await wait();
 await q.voice.exit();await q.voice.enter('A');const second=q.voice.seat(true);
 assert.equal(q.voice.seatPending,true);
 old.resolve(q.roster('A','listener'));await first;
 assert.equal(q.voice.seatPending,true);
 fresh.resolve(q.roster('A','speaker'));await second;
 assert.equal(q.voice.seatPending,false);assert.equal(q.voice.self.role,'speaker');
 await q.voice.exit();
});
test('room-scoped Cam action helper guards both stale success and stale failure',()=>{
 assert.match(appSource,/function runRoomControl\(key,request,onSuccess\)/);
 assert.match(appSource,/if\(current\(\)\)onSuccess\?\.\(data\)/);
 assert.match(appSource,/if\(current\(\)\)toast\(error\?\.message/);
 assert.match(appSource,/if\(pendingRoomControls\.get\(key\)===job\)/);
});
test('Cam actions and moderation use the same session-safe control dispatcher',()=>{
 for(const key of ['cam-seat','cam-approve:', 'cam-settings','cam-moderation'])assert.ok(appSource.includes(`runRoomControl('${key}`));
 assert.match(appSource,/if\(roomControlBusy\(key\)\)return/);
});
test('local camera permission completion is tied to room and navigation, never just preview flag',()=>{
 assert.match(appSource,/pkLocalCameraPending/);
 assert.match(appSource,/pkLocalCameraRequestToken===token&&roomNavigationSeq===navigation&&state\.roomId===room/);
 assert.match(appSource,/if\(!current\(\)\)\{stream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\);return;\}/);
});
test('unchanged Cam heartbeat does not redraw the Live stage, chat or viewer sheet',()=>{
 assert.match(appSource,/const changed=JSON\.stringify\(state\.liveRoster\)!==JSON\.stringify\(roster\)/);
 assert.match(appSource,/if\(changed&&!state\.pkData\?\.match\)render\(\)/);
});

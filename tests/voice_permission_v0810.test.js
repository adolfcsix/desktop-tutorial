'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const voiceJS=readFileSync(join(__dirname,'../prototype/voice.js'),'utf8');
const appJS=readFileSync(join(__dirname,'../prototype/app.js'),'utf8');
function defer(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
function fixture(acquire){
 const events=[],notices=[],requests=[];
 const stage={appendChild(){},querySelectorAll(){return []}};
 const doc={getElementById(){return stage},createElement(){return {remove(){}}},body:{appendChild(){}}};
 class PC{constructor(){this.connectionState='new'} addTransceiver(){return {sender:{replaceTrack:async()=>{}}}} close(){}}
 const context={window:{RTCPeerConnection:PC,isSecureContext:true},RTCPeerConnection:PC,document:doc,
  navigator:{mediaDevices:{getUserMedia:acquire}},setTimeout,clearTimeout,setInterval,clearInterval,MediaStream:class{},Uint8Array,Math};
 vm.runInNewContext(voiceJS,context);
 const api=async(path,method,payload)=>{
  requests.push({path,method,payload});
  return {roomId:'a',selfId:'owner',participants:[{id:'owner',role:'speaker',mic:!!payload?.enabled}]};
 };
 const voice=new context.window.TutttVoice(api,info=>events.push(info),message=>notices.push(message));
 voice.roomId='a';voice.selfId='owner';voice.roster=[{id:'owner',role:'speaker',mic:false}];
 return {voice,events,notices,requests};
}
function recording(){
 const listeners=new Map();const track={kind:'audio',readyState:'live',muted:false,stops:0,
  addEventListener(type,fn){listeners.set(type,fn)},stop(){this.stops++;this.readyState='ended'},fire(type){listeners.get(type)?.()}};
 return {track,stream:{getAudioTracks:()=>[track],getTracks:()=>[track]}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('pending microphone permission is single-flight; a late grant after leaving cannot open a track or send mic:on',async()=>{
 const prompt=defer();let prompts=0;const q=fixture(()=>{prompts++;return prompt.promise});
 const attempt=q.voice.toggleMic();assert.equal(q.voice.micPending,true);
 await q.voice.toggleMic();assert.equal(prompts,1);
 await q.voice.exit();const {track,stream}=recording();prompt.resolve(stream);
 await attempt;assert.equal(track.stops,1);assert.equal(q.voice.mic,false);
 assert.equal(q.voice.roomId,null);assert.equal(q.voice.micPending,false);
 assert.equal(q.requests.some(c=>c.path.endsWith('/mic')&&c.payload?.enabled===true),false);
});
test('permission denial gives a useful persistent reason; retry remains an explicit user action',async()=>{
 let prompts=0;
 const q=fixture(()=>{prompts++;return Promise.reject(Object.assign(new Error('denied'),{name:'NotAllowedError'}))});
 await assert.rejects(q.voice.toggleMic(),/Quyền microphone bị từ chối/);
 assert.equal(q.voice.mic,false);assert.equal(q.voice.micPending,false);
 assert.match(q.voice.captureIssue,/cấp quyền/);
 assert.equal(prompts,1);assert.equal(q.requests.some(c=>c.payload?.enabled===true),false);
 assert.equal(q.events.at(-1).captureIssue,q.voice.captureIssue);
});
test('a pending permission grant is rejected after the microphone seat is revoked',async()=>{
 const prompt=defer();const q=fixture(()=>prompt.promise);
 const waiting=q.voice.toggleMic();q.voice.apply({roomId:'a',selfId:'owner',participants:[{id:'owner',role:'listener',mic:false}]});
 const {track,stream}=recording();prompt.resolve(stream);await waiting;
 assert.equal(track.stops,1);assert.equal(q.voice.mic,false);
 assert.equal(q.requests.filter(c=>c.payload?.enabled===true).length,0);
});
test('a track temporarily muted clears speaker evidence and can restore only that same live track',async()=>{
 const {track,stream}=recording(),q=fixture(async()=>stream);
 q.voice.watchMedia=()=>{};
 await q.voice.toggleMic();assert.equal(q.voice.mic,true);
 q.voice.speakingIds.add('owner');q.voice.meters.set('owner',{source:{disconnect(){}},active:true});
 track.muted=true;track.fire('mute');assert.equal(q.voice.speakingIds.size,0);
 assert.match(q.voice.captureIssue,/tạm gián đoạn/);
 track.muted=false;track.fire('unmute');assert.equal(q.voice.captureIssue,'');
 assert.equal(q.requests.some(c=>c.payload?.enabled===false),false);
 track.fire('ended');await tick();await tick();
 assert.equal(q.voice.mic,false);assert.ok(q.requests.some(c=>c.payload?.enabled===false));
 assert.ok(q.notices.some(m=>m.includes('Microphone đã bị ngắt')));
});
test('Voice permission feedback and toasts update existing UI instead of rebuilding the room',()=>{
 assert.match(appJS,/state\.voiceMicPending=voice\.micPending/);
 assert.match(appJS,/micControl\.disabled=state\.voiceMicPending/);
 assert.match(appJS,/state\.voiceCaptureIssue\?state\.voiceCaptureIssue/);
 assert.match(appJS,/if\(roomVisible\)/);
 assert.match(appJS,/node\.textContent=msg/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const voiceSource=readFileSync(join(__dirname,'../prototype/voice.js'),'utf8');
const appSource=readFileSync(join(__dirname,'../prototype/app.js'),'utf8');
const nativeSource=readFileSync(join(__dirname,'../mobile/src/voice/LiveVoice.ts'),'utf8');
const hookSource=readFileSync(join(__dirname,'../mobile/src/voice/useLiveVoice.ts'),'utf8');
function fixture(){
 const listeners=new Map(),jobs=new Map(),events=[],requests=[];
 let nextTimer=0,permissionPrompts=0;
 const track={kind:'audio',readyState:'live',muted:false,stopCalls:0,handlers:{},addEventListener(type,fn){this.handlers[type]=fn},stop(){this.stopCalls++;this.readyState='ended'}};
 const stream={getAudioTracks:()=>[track],getTracks:()=>[track]};
 const mediaDevices={getUserMedia:async()=>{permissionPrompts++;return stream},addEventListener(name,handler){listeners.set(name,handler)},removeEventListener(name,handler){if(listeners.get(name)===handler)listeners.delete(name)}};
 const stage={appendChild(){},querySelectorAll(){return []}};
 const document={getElementById:()=>stage,createElement:()=>({remove(){}}),body:{appendChild(){}}};
 class PC{addTransceiver(){return {sender:{replaceTrack:async()=>{}}}}close(){}}
 const window={RTCPeerConnection:PC,isSecureContext:true};
 const setTimeoutFake=(fn,ms)=>{const id=++nextTimer;jobs.set(id,{fn,ms});return id};
 const clearTimeoutFake=id=>jobs.delete(id);
 const context={window,RTCPeerConnection:PC,document,navigator:{mediaDevices},setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,setInterval,clearInterval,MediaStream:class{},Uint8Array,Math};
 vm.runInNewContext(voiceSource,context);
 const api=async(path,method,payload)=>{requests.push({path,method,payload});return {roomId:'r1',selfId:'me',participants:[{id:'me',role:'speaker',mic:!!payload?.enabled}]}};
 const voice=new window.TutttVoice(api,state=>events.push(state),()=>{});
 voice.roomId='r1';voice.selfId='me';voice.roster=[{id:'me',role:'speaker',mic:false}];voice.attachDeviceWatcher();
 function fireDeviceChange(){listeners.get('devicechange')?.()}
 function runTimer(){const pair=jobs.entries().next().value;assert.ok(pair,'expected pending timer');jobs.delete(pair[0]);pair[1].fn();return pair[1].ms}
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 return {voice,events,requests,track,stream,listeners,jobs,fireDeviceChange,runTimer,tick,get prompts(){return permissionPrompts}};
}
test('audio device changes are advisory: no automatic mic permission or track replacement',async()=>{
 const q=fixture();await q.voice.toggleMic();q.voice.lastMicEnabledAt=Date.now()-2500;
 q.fireDeviceChange();q.fireDeviceChange();assert.equal(q.jobs.size,1,'debounced multiple route events');
 assert.equal(q.runTimer(),450);assert.match(q.voice.deviceHint,/Bluetooth/);
 assert.equal(q.voice.mic,true);assert.equal(q.track.stopCalls,0);
 assert.equal(q.prompts,1,'no silent re-acquisition');
 assert.equal(q.requests.filter(r=>r.payload?.enabled===true).length,1);
 assert.equal(q.events.at(-1).deviceHint,q.voice.deviceHint);
 assert.equal(q.runTimer(),5500);assert.equal(q.voice.deviceHint,'');assert.equal(q.voice.mic,true);
 await q.voice.exit();assert.equal(q.listeners.size,0);
});
test('device-change on muted live track does not falsely claim device switch or re-enable mic',async()=>{
 const q=fixture();await q.voice.toggleMic();q.voice.lastMicEnabledAt=Date.now()-2500;
 q.track.muted=true;q.fireDeviceChange();q.runTimer();
 assert.equal(q.voice.deviceHint,'');assert.equal(q.prompts,1);assert.equal(q.voice.mic,true);
 await q.voice.exit();
});
test('ended microphone caught by devicechange reconciles OFF even if ended event was missed',async()=>{
 const q=fixture();await q.voice.toggleMic();q.track.readyState='ended';
 q.fireDeviceChange();q.runTimer();await q.tick();await q.tick();
 assert.equal(q.voice.mic,false);assert.equal(q.voice.deviceHint,'');
 assert.ok(q.requests.some(r=>r.payload?.enabled===false),'server is told capture ended');
 await q.voice.exit();
});
test('leaving a room cancels delayed route advice and removes listeners',async()=>{
 const q=fixture();await q.voice.toggleMic();q.voice.lastMicEnabledAt=Date.now()-2500;
 q.fireDeviceChange();await q.voice.exit();
 assert.equal(q.jobs.size,0);assert.equal(q.listeners.size,0);
 q.fireDeviceChange();assert.equal(q.jobs.size,0);
});
test('voice UI displays only advice, and native foreground is reconciliation-only',()=>{
 assert.match(appSource,/state\.voiceDeviceHint=voice\.deviceHint/);
 assert.match(appSource,/state\.voiceDeviceHint\?state\.voiceDeviceHint/);
 assert.match(appSource,/if\(data\.activityOnly&&state\.voiceReady\)\{updateVoiceActivityDom\(\);updateRoomSignalDom\(\);return;\}/);
 assert.match(nativeSource,/async syncAfterForeground\(\)/);
 assert.match(nativeSource,/reconcileLocalMedia\(room:Room\)/);
 assert.match(nativeSource,/RoomEvent\.TrackMuted,localTracksChanged/);
 assert.match(nativeSource,/RoomEvent\.TrackUnmuted,localTracksChanged/);
 assert.match(hookSource,/AppState\.addEventListener\('change'/);
 const method=nativeSource.split('async syncAfterForeground()')[1].split('private eventRefresh')[0];
 assert.doesNotMatch(method,/setMicrophoneEnabled|getUserMedia|startAudioSession/);
});

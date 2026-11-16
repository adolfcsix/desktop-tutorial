'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const base=join(__dirname,'../mobile/src');
function transpile(file){return ts.transpileModule(readFileSync(join(base,file),'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};}
function load(tsFile,imports){const exports={};const context={exports,module:{exports},require:name=>{if(!(name in imports))throw Error('Unexpected import '+name);return imports[name]},setInterval:imports.setInterval||setInterval,clearInterval:imports.clearInterval||clearInterval,console};vm.runInNewContext(transpile(tsFile),context,{filename:tsFile});return context.module.exports;}
function createFixture(options={}){
 const events=[],rooms=[],timers=new Map(),pendingRoster=[],pendingHeartbeat=[],pendingMutations=[],firstConnectGate=deferred(),audioStopGate=deferred();let nextTimer=0;
 const RoomEvent={Connected:'connected',Reconnecting:'reconnecting',Reconnected:'reconnected',Disconnected:'disconnected',ParticipantConnected:'participantConnected',ParticipantDisconnected:'participantDisconnected',ParticipantPermissionsChanged:'permissionsChanged',TrackSubscribed:'subscribed',TrackUnsubscribed:'unsubscribed',TrackMuted:'muted',TrackUnmuted:'unmuted',LocalTrackPublished:'localPub',LocalTrackUnpublished:'localUnpub'};
 const Track={Source:{Microphone:'mic',Camera:'cam'}};
 class Room{
  constructor(){this.listeners=new Map();this.remoteParticipants=new Map();this.pubs={};this.calls=[];this.localParticipant={permissions:{canPublish:true},getTrackPublication:(src)=>this.pubs[src],setMicrophoneEnabled:async enabled=>{this.calls.push(['mic',enabled]);if(enabled&&this.micGate)await this.micGate.promise;if(!enabled&&this.micOffReject)throw Error('Native microphone refused to stop');if(!enabled&&this.micOffIgnored)return;this.pubs.mic={isMuted:!enabled,track:enabled?{}:null}},setCameraEnabled:async enabled=>{this.calls.push(['cam',enabled]);if(enabled&&this.cameraGate)await this.cameraGate.promise;if(!enabled&&this.cameraOffGate)await this.cameraOffGate.promise;if(!enabled&&this.cameraOffReject)throw Error('Native camera refused to stop');if(!enabled&&this.cameraOffIgnored)return;this.pubs.cam={isMuted:!enabled,track:enabled?{}:null}}};rooms.push(this)}
  on(e,fn){this.listeners.set(e,[...(this.listeners.get(e)||[]),fn])}
  emit(e,...args){for(const fn of this.listeners.get(e)||[])fn(...args)}
  async connect(){if(options.holdFirstConnect&&rooms.indexOf(this)===0)await firstConnectGate.promise;this.emit(RoomEvent.Connected)}
  async disconnect(){if(this.disconnectReject)throw Error('Room signalling refused disconnect');this.disconnected=true}
 }
 const roster={roomId:'r1',selfId:'me',type:'cam',members:[{id:'me',speaker:true,cameraAllowed:true,role:'host'}],hostId:'me',limits:{speakers:8,cameras:6}};
 let seatLeaveCalls=0;
 const api={credentials:async()=>({serverUrl:'wss://example.invalid',token:'mock',roster}),leaveSeat:async()=>{++seatLeaveCalls;return {...roster,members:roster.members.map(m=>m.id==='me'?{...m,speaker:false,cameraAllowed:false}:m)}},roster:async()=>{const d=deferred();pendingRoster.push(d);return d.promise},heartbeat:async()=>{const d=deferred();pendingHeartbeat.push(d);return d.promise},requestSeat:async()=>{const d=deferred();pendingMutations.push(d);return d.promise},leave:async()=>{},other(){}};
 const audio={started:0,stopped:0,delayStop:false,startAudioSession:async()=>{audio.started++},stopAudioSession:async()=>{audio.stopped++;if(audio.delayStop)await audioStopGate.promise}};
 const capturePolicy=load('voice/liveCapturePolicy.ts',{});
 const {LiveVoice}=load('voice/LiveVoice.ts',{'./liveCapturePolicy':capturePolicy,'@livekit/react-native':{AudioSession:audio,registerGlobals:()=>{}},'livekit-client':{Room,RoomEvent,Track},'../services/api':{liveApi:api},setInterval:(fn)=>{const id=++nextTimer;timers.set(id,fn);return id},clearInterval:(id)=>timers.delete(id)});
 const voice=new LiveVoice(s=>events.push(s));
 return {voice,rooms,timers,events,api,audio,roster,RoomEvent,pendingRoster,pendingHeartbeat,pendingMutations,firstConnectGate,audioStopGate,get seatLeaveCalls(){return seatLeaveCalls}};
}
const flush=()=>new Promise(r=>setImmediate(r));

test('native UI uses honest signalling state, never claims audible Bluetooth/speaker output',()=>{
 const {liveConnectionNotice:notice}=load('voice/liveConnectionUi.ts',{});
 const ok=notice('connected',true,null);assert.match(ok.label,/Chưa xác minh đường loa/);assert.match(ok.label,/Mic đang bật/);assert.equal(ok.mediaActionsDisabled,false);
 const down=notice('reconnecting',true,null);assert.equal(down.mediaActionsDisabled,true);assert.match(down.label,/không tự bật/);assert.equal(down.shortLabel,'ĐANG NỐI');
 assert.equal(notice('error',false,'Không thể nối').tone,'error');
 assert.equal(notice('connecting',false,null).mediaActionsDisabled,true);
 assert.equal(notice('not-configured',false,null).mediaActionsDisabled,true);
});

test('native reconnect is not a microphone permission prompt; reconciling uses real publication',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];assert.equal(f.voice.state.status,'connected');
 await f.voice.microphone();assert.equal(f.voice.state.mic,true);
 const before=room.calls.length;
 room.emit(f.RoomEvent.Reconnecting);assert.equal(f.voice.state.status,'reconnecting');assert.equal(f.voice.state.mic,false);
 room.emit(f.RoomEvent.Reconnected);assert.equal(f.voice.state.status,'connected');assert.equal(f.voice.state.mic,true,'reconciles a still-live mic publication');
 assert.equal(room.calls.length,before,'no automatic mic switch on recovery');
 await f.voice.disconnect();
});

test('native old roster event cannot overwrite a new session even for the same roomId',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 old.emit(f.RoomEvent.ParticipantConnected);assert.equal(f.pendingRoster.length,1);
 await f.voice.disconnect();await f.voice.connect('r1');
 const newer=f.voice.state.roster;
 f.pendingRoster[0].resolve({...f.roster,members:[{id:'stale',speaker:false}]});await flush();
 assert.equal(f.voice.state.roster,newer);assert.equal(f.voice.state.roster.members[0].id,'me');
 await f.voice.disconnect();
});

test('native delayed heartbeat cannot overwrite later room state or errors',async()=>{
 const f=createFixture();await f.voice.connect('r1');const heartbeat=f.timers.values().next().value;heartbeat();assert.equal(f.pendingHeartbeat.length,1);
 await f.voice.disconnect();await f.voice.connect('r1');
 f.pendingHeartbeat[0].resolve({...f.roster,members:[{id:'old-heartbeat'}]});await flush();
 assert.equal(f.voice.state.roster.members[0].id,'me');
 await f.voice.disconnect();
});

test('native late camera grant after leaving disables old capture, not new session',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];old.cameraGate=deferred();
 const request=f.voice.camera();assert.equal(old.calls.filter(c=>c[0]==='cam'&&c[1]===true).length,1);
 await f.voice.disconnect();await f.voice.connect('r1');old.cameraGate.resolve();await request;
 assert.equal(old.calls.filter(c=>c[0]==='cam'&&c[1]===false).length,1);
 assert.equal(f.voice.state.camera,false);assert.equal(f.voice.state.status,'connected');
 await f.voice.disconnect();
});

test('Native discovery screen does not reference PK-only state; media controls disabled while reconnecting',()=>{
 const screens=readFileSync(join(base,'screens/Screens.tsx'),'utf8');
 const discover=screens.split('export function DiscoverScreen')[1].split('export function LiveScreen')[0];
 assert.doesNotMatch(discover,/\bpkActive\b/);
 assert.match(screens,/liveConnectionNotice\(status/);
 assert.match(screens,/accessibilityState=\{\{disabled:blocked\}\}/);
 assert.match(screens,/disabled=\{blocked\}/);
});


test('stale room completing connect cannot stop the AudioSession owned by a newer room',async()=>{
 const f=createFixture({holdFirstConnect:true});
 const opening=f.voice.connect('r1');await flush();await flush();assert.equal(f.rooms.length,1);
 await f.voice.disconnect();await f.voice.connect('r1');
 const stops=f.audio.stopped;const fresh=f.rooms.at(-1);assert.equal(f.voice.mediaRoom,fresh);
 f.firstConnectGate.resolve();await opening;
 assert.equal(f.audio.stopped,stops,'stale connect must not stop a new global audio session');
 assert.equal(f.voice.mediaRoom,fresh);assert.equal(f.voice.state.status,'connected');
 await f.voice.disconnect();
});


test('reconnect within same room rejects roster fetched before the interruption',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 room.emit(f.RoomEvent.ParticipantConnected);assert.equal(f.pendingRoster.length,1);
 room.emit(f.RoomEvent.Reconnecting);room.emit(f.RoomEvent.Reconnected);
 assert.equal(f.pendingRoster.length,2,'reconnection triggers a new roster request');
 f.pendingRoster[1].resolve({...f.roster,members:[{id:'fresh-after-reconnect'}]});await flush();
 f.pendingRoster[0].resolve({...f.roster,members:[{id:'stale-before-reconnect'}]});await flush();
 assert.equal(f.voice.state.roster.members[0].id,'fresh-after-reconnect');
 await f.voice.disconnect();
});


test('native overlapping connects honor the most recently requested room',async()=>{
 const f=createFixture({holdFirstConnect:true});
 const first=f.voice.connect('r1');await flush();await flush();
 assert.equal(f.rooms.length,1);
 const second=f.voice.connect('r2');await flush();await flush();
 f.firstConnectGate.resolve();await Promise.all([first,second]);
 assert.equal(f.voice.state.roomId,'r2');
 assert.equal(f.voice.state.status,'connected');
 assert.equal(f.voice.mediaRoom,f.rooms.at(-1));
 assert.equal(f.rooms[0].disconnected,true);
 await f.voice.disconnect();
});

test('native serialized AudioSession waits for pending stop before new start',async()=>{
 const f=createFixture();await f.voice.connect('r1');
 f.audio.delayStop=true;
 const exiting=f.voice.disconnect();await flush();
 const startsBefore=f.audio.started;
 const next=f.voice.connect('r2');await flush();await flush();
 assert.equal(f.audio.started,startsBefore,'new start must not overtake an in-flight global stop');
 f.audio.delayStop=false;f.audioStopGate.resolve();
 await Promise.all([exiting,next]);
 assert.equal(f.voice.state.status,'connected');assert.equal(f.voice.state.roomId,'r2');
 assert.equal(f.audio.started,startsBefore+1);
 await f.voice.disconnect();
});

test('native pending seat response from before reconnect cannot overwrite new roster',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 const pending=f.voice.requestSeat();await flush();assert.equal(f.pendingMutations.length,1);
 room.emit(f.RoomEvent.Reconnecting);
 room.emit(f.RoomEvent.Reconnected);
 f.pendingRoster[0].resolve({...f.roster,members:[{id:'fresh-seat',speaker:true}]});await flush();
 f.pendingMutations[0].resolve({...f.roster,members:[{id:'stale-seat',speaker:true}]});await pending;
 assert.equal(f.voice.state.roster.members[0].id,'fresh-seat');
 await f.voice.disconnect();
});

test('native pending seat response from old room is ignored even with same room ID',async()=>{
 const f=createFixture();await f.voice.connect('r1');
 const pending=f.voice.requestSeat();await flush();
 await f.voice.disconnect();await f.voice.connect('r1');
 f.pendingMutations[0].resolve({...f.roster,members:[{id:'stale',speaker:true}]});await pending;
 assert.equal(f.voice.state.roster.members[0].id,'me');
 await f.voice.disconnect();
});

test('native navigation cancels late backend join before LiveKit is opened',()=>{
 const app=readFileSync(join(__dirname,'../mobile/App.tsx'),'utf8');
 assert.match(app,/const navigation=\+\+roomNavigation\.current/);
 assert.match(app,/await tutttApi\.join\(r\.id\);[\s\S]{0,120}if\(navigation!==roomNavigation\.current\)\{/);
 assert.match(app,/if\(page==='room'\)\{\+\+roomNavigation\.current/);
 assert.match(app,/if\(activeRoomId\.current!==r\.id\)void tutttApi\.leave\(r\.id\)/);
});


test('v0.8.23 native roster: most recent read wins after out-of-order replies',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 room.emit(f.RoomEvent.ParticipantConnected);
 room.emit(f.RoomEvent.ParticipantConnected);
 assert.equal(f.pendingRoster.length,2);
 f.pendingRoster[1].resolve({...f.roster,members:[{id:'new',speaker:false}]});await flush();
 f.pendingRoster[0].resolve({...f.roster,members:[{id:'old',speaker:false}]});await flush();
 assert.equal(f.voice.state.roster.members[0].id,'new');
 await f.voice.disconnect();
});

test('v0.8.23 native heartbeat is single-flight on poor mobile networks',async()=>{
 const f=createFixture();await f.voice.connect('r1');const tick=f.timers.values().next().value;
 tick();tick();tick();assert.equal(f.pendingHeartbeat.length,1);
 f.pendingHeartbeat[0].resolve(f.roster);await flush();
 tick();assert.equal(f.pendingHeartbeat.length,2,'new heartbeat after previous settles');
 f.pendingHeartbeat[1].resolve(f.roster);await flush();await f.voice.disconnect();
});

test('v0.8.23 confirmed seat mutation supersedes a stale roster read',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 room.emit(f.RoomEvent.ParticipantConnected);assert.equal(f.pendingRoster.length,1);
 const mutation=f.voice.requestSeat();await flush();assert.equal(f.pendingMutations.length,1);
 f.pendingMutations[0].resolve({...f.roster,members:[{id:'approved',speaker:true}]});await mutation;
 f.pendingRoster[0].resolve({...f.roster,members:[{id:'stale',speaker:false}]});await flush();
 assert.equal(f.voice.state.roster.members[0].id,'approved');
 await f.voice.disconnect();
});

test('v0.8.23 native roster mutations are ordered, not concurrent',async()=>{
 const f=createFixture();await f.voice.connect('r1');
 const first=f.voice.requestSeat(),second=f.voice.requestSeat();await flush();
 assert.equal(f.pendingMutations.length,1,'second mutation waits');
 f.pendingMutations[0].resolve({...f.roster,members:[...f.roster.members,{id:'first'}]});await first;await flush();
 assert.equal(f.pendingMutations.length,2);
 f.pendingMutations[1].resolve({...f.roster,members:[...f.roster.members,{id:'second'}]});await second;
 assert.equal(f.voice.state.roster.members[1].id,'second');
 await f.voice.disconnect();
});

test('v0.8.23 old-room pending mutation does not block the new room',async()=>{
 const f=createFixture();await f.voice.connect('r1');
 const old=f.voice.requestSeat();await flush();assert.equal(f.pendingMutations.length,1);
 await f.voice.disconnect();await f.voice.connect('r2');
 const current=f.voice.requestSeat();await flush();assert.equal(f.pendingMutations.length,2);
 f.pendingMutations[1].resolve({...f.roster,members:[{id:'new-room'}]});await current;
 f.pendingMutations[0].resolve({...f.roster,members:[{id:'old-room'}]});await old;
 assert.equal(f.voice.state.roster.members[0].id,'new-room');
 await f.voice.disconnect();
});

test('v0.8.23 mobile chat polling does not re-join room or rerender identical logs',()=>{
 const app=readFileSync(join(__dirname,'../mobile/App.tsx'),'utf8');
 const begin=app.indexOf("if(!serverReady||page!=='room'||!room)return;");
 const end=app.indexOf('const switchTab=',begin);
 assert.ok(begin>=0&&end>begin);
 const poll=app.slice(begin,end);
 assert.doesNotMatch(poll,/tutttApi\.join\(/);
 assert.match(poll,/previous\.length===next\.length&&previous\.every/);
});

test('v0.8.23 Cam placeholder surface follows Ivory/Espresso palette',()=>{
 const src=readFileSync(join(base,'screens/Screens.tsx'),'utf8');
 assert.match(src,/camStageBg=c\.bg===light\.bg\?'#F1E7E0':'#362329'/);
 assert.match(src,/backgroundColor:camStageBg/);
 assert.match(src,/color:camSeatInk/);
 assert.match(src,/color:camSeatMuted/);
});

test('v0.8.33 terminal LiveKit disconnect can be retried without auto-publishing mic/camera',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 await f.voice.microphone();assert.equal(f.voice.state.mic,true);
 const removal=deferred();let leaveCalls=0;
 f.api.leave=async()=>{leaveCalls++;await removal.promise};
 old.emit(f.RoomEvent.Disconnected);
 assert.equal(f.voice.state.status,'error');assert.equal(f.voice.state.mic,false);
 const a=f.voice.retry(),b=f.voice.retry();
 await flush();assert.equal(leaveCalls,1);
 assert.equal(f.rooms.length,1,'new SFU identity cannot be issued before old revocation');
 removal.resolve();await Promise.all([a,b]);
 assert.equal(f.voice.state.status,'connected');assert.equal(f.voice.state.roomId,'r1');
 assert.ok(old.calls.some(([kind,value])=>kind==='mic'&&value===false),'old captured microphone must be stopped');
 assert.equal(f.rooms.length,2);assert.equal(f.voice.state.mic,false);assert.equal(f.voice.state.camera,false);
 assert.equal(f.rooms[1].calls.filter(call=>call[1]===true).length,0,'retry cannot activate capture');
 await f.voice.disconnect();
});

test('v0.8.33 retry fails closed if backend cannot confirm prior SFU removal',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 old.emit(f.RoomEvent.Disconnected);
 f.api.leave=async()=>{throw Error('network timeout')};
 await f.voice.retry();
 assert.equal(f.voice.state.status,'error');assert.match(f.voice.state.error,/Chưa xác nhận ngắt/);
 assert.equal(f.rooms.length,1,'must not mint credential after failed revocation');
 f.api.leave=async()=>{};
 await f.voice.retry();assert.equal(f.voice.state.status,'connected');
 await f.voice.disconnect();
});

test('v0.8.33 manual leave invalidates recovery path',async()=>{
 const f=createFixture();await f.voice.connect('r1');f.rooms[0].emit(f.RoomEvent.Disconnected);
 await f.voice.disconnect();assert.equal(f.voice.state.status,'idle');
 await f.voice.retry();assert.equal(f.rooms.length,1,'leaving room must not rejoin in background');
});


test('v0.8.33 pending SFU disconnect response blocks a new LiveKit session',async()=>{
 const f=createFixture();await f.voice.connect('r1');f.rooms[0].emit(f.RoomEvent.Disconnected);
 f.api.leave=async()=>({left:true,mediaDisconnectPending:true});
 await f.voice.retry();
 assert.equal(f.voice.state.status,'error');assert.equal(f.rooms.length,1);
 f.api.leave=async()=>({left:true,mediaDisconnectPending:false});
 await f.voice.retry();assert.equal(f.voice.state.status,'connected');await f.voice.disconnect();
});

// v0.8.34: media safety under server permissions and native lifecycle events.
test('v0.8.34 revoked mic seat and camera grant turn both native tracks off',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();await f.voice.camera();
 assert.equal(f.voice.state.mic,true);assert.equal(f.voice.state.camera,true);
 room.emit(f.RoomEvent.ParticipantConnected);
 f.pendingRoster[0].resolve({...f.roster,members:[{...f.roster.members[0],speaker:false,cameraAllowed:false}]});
 await flush();await flush();
 assert.equal(f.voice.state.mic,false);assert.equal(f.voice.state.camera,false);
 assert.ok(room.calls.some(([kind,on])=>kind==='mic'&&!on));
 assert.ok(room.calls.some(([kind,on])=>kind==='cam'&&!on));
 await f.voice.disconnect();
});
test('v0.8.34 LiveKit canPublish revocation disables local capture',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();await f.voice.camera();
 room.localParticipant.permissions.canPublish=false;
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 await flush();await flush();
 assert.equal(f.voice.state.mic,false);assert.equal(f.voice.state.camera,false);
 assert.equal(room.pubs.mic.isMuted,true);assert.equal(room.pubs.cam.isMuted,true);
 await f.voice.disconnect();
});
test('v0.8.34 background stops camera but never auto-activates capture on foreground',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();await f.voice.camera();
 const beforeMic=room.calls.filter(([kind])=>kind==='mic').length;
 await f.voice.onAppStateChange('background');
 assert.equal(f.voice.state.camera,false);assert.equal(f.voice.state.mic,true);
 assert.equal(room.pubs.cam.isMuted,true);
 assert.equal(room.calls.filter(([kind])=>kind==='mic').length,beforeMic);
 const before=room.calls.length;
 const resume=f.voice.onAppStateChange('active');
 f.pendingRoster[0].resolve(f.roster);await resume;
 assert.equal(room.calls.length,before,'foreground cannot automatically enable mic or camera');
 assert.equal(f.voice.state.camera,false);await f.voice.disconnect();
});
test('v0.8.34 late camera permission prompt is cancelled by app background transition',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.cameraGate=deferred();
 const late=f.voice.camera();await flush();
 await f.voice.onAppStateChange('background');room.cameraGate.resolve();await late;
 assert.equal(room.pubs.cam.isMuted,true);assert.equal(f.voice.state.camera,false);
 await f.voice.disconnect();
});
test('v0.8.34 capture policy does not infer camera permission from a microphone seat',()=>{
 const {captureAllowance}=load('voice/liveCapturePolicy.ts',{});
 const f=createFixture();
 const noCamera={...f.roster,members:[{...f.roster.members[0],cameraAllowed:false}]};
 const cap=captureAllowance(noCamera,true);
 assert.equal(cap.mic,true);assert.equal(cap.camera,false);
 assert.equal(captureAllowance(f.roster,false).mic,false);
 assert.equal(captureAllowance({...f.roster,type:'voice'},true).camera,false);
});

test('v0.8.34 a late microphone grant after server removes speaking rights is cancelled',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.micGate=deferred();
 const pending=f.voice.microphone();await flush();
 room.emit(f.RoomEvent.ParticipantConnected);
 f.pendingRoster[0].resolve({...f.roster,members:[{...f.roster.members[0],speaker:false}]});
 await flush();
 room.micGate.resolve();await pending;
 assert.equal(f.voice.state.mic,false);
 assert.equal(room.pubs.mic.isMuted,true);
 assert.ok(room.calls.some(([kind,enabled])=>kind==='mic'&&enabled===false));
 await f.voice.disconnect();
});
test('v0.8.34 a late camera grant after server removes camera rights is cancelled',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.cameraGate=deferred();
 const pending=f.voice.camera();await flush();
 room.emit(f.RoomEvent.ParticipantConnected);
 f.pendingRoster[0].resolve({...f.roster,members:[{...f.roster.members[0],cameraAllowed:false}]});
 await flush();
 room.cameraGate.resolve();await pending;
 assert.equal(f.voice.state.camera,false);
 assert.equal(room.pubs.cam.isMuted,true);
 await f.voice.disconnect();
});

test('v0.8.34 late mic permission prompt is rejected by LiveKit publish revocation',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.micGate=deferred();
 const pending=f.voice.microphone();await flush();
 room.localParticipant.permissions.canPublish=false;
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);await flush();
 room.micGate.resolve();await pending;
 assert.equal(f.voice.state.mic,false);assert.equal(room.pubs.mic.isMuted,true);
 await f.voice.disconnect();
});

// v0.8.35: LiveKit per-source permission and rapid app lifecycle regressions.
test('v0.8.35 source-limited LiveKit grant stops only camera while microphone stays active',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();await f.voice.camera();
 room.localParticipant.permissions.canPublishSources=['microphone'];
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 await flush();await flush();
 assert.equal(f.voice.state.mic,true);
 assert.equal(f.voice.state.camera,false);
 assert.equal(room.pubs.mic.isMuted,false);
 assert.equal(room.pubs.cam.isMuted,true);
 await assert.rejects(()=>f.voice.camera(),/quyền phát camera/);
 await f.voice.disconnect();
});
test('v0.8.35 source-limited publication permissions prevent ungranted microphone even with a seat',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 room.localParticipant.permissions.canPublishSources=['camera'];
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 await assert.rejects(()=>f.voice.microphone(),/quyền phát microphone/);
 assert.equal(room.calls.filter(([kind,on])=>kind==='mic'&&on).length,0);
 await f.voice.camera();assert.equal(f.voice.state.camera,true);
 await f.voice.disconnect();
});
test('v0.8.35 source revocation invalidates a late native camera permission grant',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.cameraGate=deferred();
 const pending=f.voice.camera();await flush();
 room.localParticipant.permissions.canPublishSources=['microphone'];
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 room.cameraGate.resolve();await pending;
 assert.equal(room.pubs.cam.isMuted,true);assert.equal(f.voice.state.camera,false);
 await f.voice.disconnect();
});
test('v0.8.35 fast foreground return waits for background camera stop before enabling',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffGate=deferred();
 const background=f.voice.onAppStateChange('background');await flush();
 const foreground=f.voice.onAppStateChange('active');await flush();
 const tapped=f.voice.camera();await flush();
 assert.equal(room.calls.filter(([kind,on])=>kind==='cam'&&on).length,1,'new enable must wait for stop');
 room.cameraOffGate.resolve();await background;await tapped;
 f.pendingRoster[0].resolve(f.roster);await foreground;
 assert.equal(room.calls.filter(([kind,on])=>kind==='cam'&&on).length,2);
 assert.equal(f.voice.state.camera,true);
 await f.voice.disconnect();
});
test('v0.8.35 native background camera stop failure exits room instead of hiding a live track',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffReject=true;
 await f.voice.onAppStateChange('background');
 assert.equal(room.disconnected,true);
 assert.equal(f.voice.mediaRoom,null);
 assert.equal(f.voice.state.camera,false);
 assert.equal(f.voice.state.status,'error');
 assert.match(f.voice.state.error,/Không xác nhận được camera/);
 await assert.rejects(()=>f.voice.camera(),/Phòng Live chưa kết nối/);
 await f.voice.disconnect();
});

// v0.8.36: no toggle-based leave. Revoked rights must never prevent OFF.
test('v0.8.36 microphone can always be turned OFF after publication rights are revoked',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();assert.equal(f.voice.state.mic,true);
 room.localParticipant.permissions.canPublish=false;
 await f.voice.microphone();
 assert.equal(room.pubs.mic.isMuted,true);
 assert.equal(f.voice.state.mic,false);
 await assert.rejects(()=>f.voice.microphone(),/quyền phát microphone/);
 await f.voice.disconnect();
});
test('v0.8.36 camera can always be turned OFF after a source-only revocation',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();
 room.localParticipant.permissions.canPublishSources=['microphone'];
 await f.voice.camera();
 assert.equal(room.pubs.cam.isMuted,true);
 assert.equal(f.voice.state.camera,false);
 await assert.rejects(()=>f.voice.camera(),/quyền phát camera/);
 await f.voice.disconnect();
});
test('v0.8.36 seat-leave explicitly stops published tracks despite stale UI and revoked permission',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();await f.voice.camera();
 room.localParticipant.permissions.canPublish=false;
 f.voice.state.mic=false;f.voice.state.camera=false; // Simulate UI snapshot lag.
 await f.voice.leaveSeat();
 assert.equal(f.seatLeaveCalls,1);
 assert.equal(room.pubs.mic.isMuted,true);assert.equal(room.pubs.cam.isMuted,true);
 assert.equal(room.calls.filter(([kind,on])=>!on&&kind==='mic').length,1);
 assert.equal(room.calls.filter(([kind,on])=>!on&&kind==='cam').length,1);
 await f.voice.disconnect();
});
test('v0.8.36 late camera permission grant is disabled after explicit seat leave',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];room.cameraGate=deferred();
 const pending=f.voice.camera();await flush();
 await f.voice.leaveSeat();
 assert.equal(f.seatLeaveCalls,1);
 room.cameraGate.resolve();await pending;
 assert.equal(room.pubs.cam.isMuted,true);
 assert.equal(f.voice.state.camera,false);
 await f.voice.disconnect();
});
test('v0.8.36 failed track stop aborts seat leave and requests session disconnect',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];await f.voice.camera();
 room.cameraOffReject=true;
 await assert.rejects(()=>f.voice.leaveSeat(),/đã yêu cầu ngắt phiên Live/);
 assert.equal(f.seatLeaveCalls,0,'must not report successful seat leave while capture might remain active');
 assert.equal(room.disconnected,true);
 assert.equal(f.voice.mediaRoom,null);
});

test('v0.8.36 failed manual microphone OFF terminates LiveKit instead of hiding capture',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();room.micOffReject=true;
 await assert.rejects(()=>f.voice.microphone(),/Phiên Live đã được yêu cầu ngắt/);
 assert.equal(room.disconnected,true);assert.equal(f.voice.mediaRoom,null);
 assert.equal(f.voice.state.status,'error');assert.match(f.voice.state.error,/microphone/);
});
test('v0.8.36 failed permission-revocation camera OFF disconnects rather than conceals capture',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffReject=true;
 room.localParticipant.permissions.canPublishSources=['microphone'];
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 await flush();await flush();
 assert.equal(room.disconnected,true);
 assert.equal(f.voice.mediaRoom,null);
 assert.equal(f.voice.state.status,'error');
});

// v0.8.40: a fulfilled native API call is not evidence that the track stopped.
test('v0.8.40 successful SDK OFF response with a still-live mic fails closed',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();room.micOffIgnored=true;
 await assert.rejects(()=>f.voice.microphone(),/Phiên Live đã được yêu cầu ngắt/);
 assert.equal(f.voice.mediaRoom,null);assert.equal(room.disconnected,true);
 assert.equal(f.voice.state.status,'error');
 assert.match(f.voice.state.error,/Chưa xác nhận mic\/camera|Không xác nhận được microphone/);
});
test('v0.8.40 successful SDK OFF response with a still-live camera prevents seat leave',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffIgnored=true;
 await assert.rejects(()=>f.voice.leaveSeat(),/đã yêu cầu ngắt phiên Live/);
 assert.equal(f.seatLeaveCalls,0);assert.equal(f.voice.mediaRoom,null);
 assert.equal(room.disconnected,true);
});
test('v0.8.40 background camera stop silently ignored triggers session shutdown',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffIgnored=true;
 await f.voice.onAppStateChange('background');
 assert.equal(f.voice.mediaRoom,null);assert.equal(room.disconnected,true);
 assert.equal(f.voice.state.status,'error');assert.match(f.voice.state.error,/camera/);
});
test('v0.8.40 server revocation verifies SDK publication, not merely Promise resolution',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.camera();room.cameraOffIgnored=true;
 room.localParticipant.permissions.canPublishSources=['microphone'];
 room.emit(f.RoomEvent.ParticipantPermissionsChanged);
 await flush();await flush();
 assert.equal(f.voice.mediaRoom,null);assert.equal(room.disconnected,true);
 assert.equal(f.voice.state.status,'error');
});
test('v0.8.40 does not reconnect after an unverified old-room track shutdown',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 await f.voice.microphone();room.micOffIgnored=true;
 await f.voice.connect('r2');
 assert.equal(f.rooms.length,1,'must not create a new SFU room while old capture is unverified');
 assert.equal(f.voice.mediaRoom,null);
 assert.equal(f.voice.state.status,'error');
 assert.match(f.voice.state.error,/Chưa xác nhận ngắt phiên LiveKit cũ/);
});
test('v0.8.40 rejected old-room signalling disconnect blocks replacement session',async()=>{
 const f=createFixture();await f.voice.connect('r1');const room=f.rooms[0];
 room.disconnectReject=true;
 await f.voice.connect('r2');
 assert.equal(f.rooms.length,1);assert.equal(f.voice.state.status,'error');
 assert.equal(f.voice.mediaRoom,null);
});
test('v0.8.40 concurrent connect waits for a pending previous camera shutdown',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 await f.voice.camera();old.cameraOffGate=deferred();old.cameraOffIgnored=true;
 const leaving=f.voice.disconnect();await flush();
 const replacing=f.voice.connect('r2');await flush();
 assert.equal(f.rooms.length,1,'a second room must never begin while old shutdown is pending');
 old.cameraOffGate.resolve();await leaving;await replacing;
 assert.equal(f.rooms.length,1);assert.equal(f.voice.mediaRoom,null);
 assert.equal(f.voice.state.status,'error');
});
test('v0.8.40 connection after pending disconnect respects failed server revocation',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 await f.voice.camera();old.cameraOffGate=deferred();
 f.api.leave=async()=>{throw Error('SFU revocation unconfirmed')};
 const leaving=f.voice.disconnect();await flush();
 const replacing=f.voice.connect('r2');await flush();
 assert.equal(f.rooms.length,1);
 old.cameraOffGate.resolve();await leaving;await replacing;
 assert.equal(f.rooms.length,1);assert.equal(f.voice.state.status,'error');
 assert.match(f.voice.state.error,/ngắt phiên LiveKit cũ/);
});
test('v0.8.40 a persistent unsafe native capture fence cannot be bypassed by retry()',async()=>{
 const f=createFixture();await f.voice.connect('r1');const old=f.rooms[0];
 await f.voice.microphone();old.micOffIgnored=true;
 await assert.rejects(()=>f.voice.microphone(),/ngắt/);
 assert.equal(f.voice.state.status,'error');
 await f.voice.retry();
 assert.equal(f.rooms.length,1,'retry must not bypass a previously unverified SDK shutdown');
 assert.equal(f.voice.mediaRoom,null);assert.equal(f.voice.state.status,'error');
});

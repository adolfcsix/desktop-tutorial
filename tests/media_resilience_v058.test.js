'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function setup(){
 const events=[],calls=[],notices=[];
 const div={appendChild(){},querySelectorAll(){return []}};
 const document={getElementById(){return div},createElement(){return {hidden:false}},body:{appendChild(){}}};
 const window={RTCPeerConnection:null,isSecureContext:true};
 const track=new EventTarget();track.stop=()=>{};track.kind='audio';
 const stream={getAudioTracks(){return [track]},getTracks(){return [track]}};
 const navigator={mediaDevices:{getUserMedia:async()=>stream}};
 const api=async(path,method,payload)=>{
  calls.push({path,method,payload});
  return {roomId:'room-x',selfId:'alice',participants:[{id:'alice',role:'speaker',mic:payload?.enabled??true}]};
 };
 vm.runInNewContext(read('prototype/voice.js'),{window,document,navigator,setInterval,clearInterval,MediaStream:class{},Uint8Array,Math});
 const voice=new window.TutttVoice(api,x=>events.push(x),x=>notices.push(x));
 voice.roomId='room-x';voice.selfId='alice';voice.roster=[{id:'alice',role:'speaker',mic:false}];voice.mic=false;
 return {voice,events,calls,notices,track,stream};
}
test('Web Voice updates speaking events without an entire room redraw',()=>{
 const app=read('prototype/app.js');const voice=read('prototype/voice.js');
 assert.match(app,/function updateVoiceActivityDom\(\)/);
 assert.match(app,/updateVoiceActivityDom\(\);updateRoomSignalDom\(\);return;\}/);
 assert.match(app,/if\(syncVoiceSeatsDom\(\)\)\{updateVoiceActivityDom\(\);updateRoomSignalDom\(\);return;\}/);
 assert.match(app,/if\(data\.activityOnly&&state\.voiceReady\)/);
 assert.match(app,/data-speaker-id/);
 assert.match(voice,/activityOnly:true/);
});
test('Mic losing permission stops the stream and syncs server mute',async()=>{
 const {voice,track,calls,events,notices}=setup();
 voice.supported=true;
 await voice.toggleMic();assert.equal(voice.mic,true);
 track.dispatchEvent(new Event('ended'));
 await new Promise(r=>setTimeout(r,0));
 assert.equal(voice.mic,false);
 assert.ok(calls.some(c=>c.path==='/rooms/room-x/voice/mic'&&c.payload?.enabled===false));
 assert.ok(events.some(e=>e.mic===false));
 assert.ok(notices.some(x=>x.includes('Microphone đã bị ngắt')));
});
test('Ending an obsolete remote track must not remove its newer meter',()=>{
 const {voice}=setup();
 voice.meters.set('bob',{track:{id:'new'},source:{disconnect(){}},active:false});
 const old={id:'old'};
 // Listener compares track identity; a superseded track cannot clear new activity meter.
 assert.notEqual(voice.meters.get('bob').track,old);
 assert.match(read('prototype/voice.js'),/this\.meters\.get\(id\)\?\.track===event\.track/);
});
test('Paused Web Audio clears a green ring instead of freezing it',()=>{
 const {voice,events}=setup();
 voice.audioContext={state:'suspended'};
 voice.speakingIds.add('alice');
 voice.meters.set('alice',{active:true,positive:3,negative:0,source:{disconnect(){}}});
 voice.sampleSpeaking();
 assert.equal(voice.speakingIds.size,0);
 assert.equal(voice.meters.get('alice').active,false);
 assert.deepEqual([...events.at(-1).activeSpeakerIds],[]);
 assert.equal(events.at(-1).activityOnly,true);
});
test('Native handles concurrent speakers and clears rings across reconnect',()=>{
 const native=read('mobile/src/screens/Screens.tsx');
 assert.match(native,/activeSpeakerIds/);
 assert.match(native,/new Set\(speakers\.map\(p=>p\?\.identity\)/);
 assert.match(native,/RoomEvent\.Reconnecting,clearSpeakers/);
 assert.match(native,/RoomEvent\.Disconnected,clearSpeakers/);
 assert.match(native,/activeIds\.has\(member\.id\)/);
 assert.doesNotMatch(native,/activeSpeakerId,setActiveSpeakerId/);
});
test('Native media state is reconciled using LiveKit track publications',()=>{
 const native=read('mobile/src/voice/LiveVoice.ts');
 assert.match(native,/getTrackPublication\?\.\(Track\.Source\.Microphone\)/);
 assert.match(native,/getTrackPublication\?\.\(Track\.Source\.Camera\)/);
 assert.match(native,/status:'reconnecting',mic:false,camera:false/);
});

'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const code=fs.readFileSync(path.resolve(__dirname,'../prototype/voice.js'),'utf8');
function createVoice(){
 const div={appendChild(){},querySelectorAll(){return []}};
 const document={getElementById(){return div},createElement(){return {hidden:false}},body:{appendChild(){}}};
 const window={RTCPeerConnection:null,isSecureContext:true};
 vm.runInNewContext(code,{window,document,navigator:{mediaDevices:{}},setInterval,clearInterval,MediaStream:class{},Uint8Array,Math});
 const events=[];const voice=new window.TutttVoice(async()=>({}),payload=>events.push(payload),()=>{});
 voice.roomId='room-1';voice.selfId='user-1';voice.roster=[{id:'user-1',role:'speaker',mic:true}];voice.mic=true;
 voice.audioContext={state:'running'};
 const samples=new Uint8Array(512);
 voice.meters.set('user-1',{samples,positive:0,negative:0,active:false,analyser:{getByteTimeDomainData(buffer){buffer.fill(160)}},source:{disconnect(){}}});
 return {voice,events};
}
test('2 positive audio windows activate the mic ring and 3 silent windows clear it',()=>{
 const {voice,events}=createVoice();
 voice.sampleSpeaking();assert.equal(voice.speakingIds.size,0);
 voice.sampleSpeaking();assert.equal(voice.speakingIds.has('user-1'),true);
 assert.deepEqual([...events.at(-1).activeSpeakerIds],['user-1']);
 voice.meters.get('user-1').analyser.getByteTimeDomainData=(array)=>array.fill(128);
 voice.sampleSpeaking();voice.sampleSpeaking();assert.equal(voice.speakingIds.size,1);
 voice.sampleSpeaking();assert.equal(voice.speakingIds.size,0);
 assert.deepEqual([...events.at(-1).activeSpeakerIds],[]);
});
test('muting the track stops a speaking indicator without waiting for audio samples',()=>{
 const {voice}=createVoice();voice.sampleSpeaking();voice.sampleSpeaking();assert.equal(voice.speakingIds.size,1);
 voice.mic=false;voice.sampleSpeaking();voice.sampleSpeaking();voice.sampleSpeaking();
 assert.equal(voice.speakingIds.size,0);
});
test('Multiple speaking tracks stop independently; muted speaker cannot remain highlighted',()=>{
 const {voice,events}=createVoice();
 voice.roster.push({id:'user-2',role:'speaker',mic:true},{id:'user-3',role:'speaker',mic:false});
 // A remote green ring requires a currently connected real media peer.
 voice.peers.set('user-2',{pc:{connectionState:'connected'}});
 voice.peers.set('user-3',{pc:{connectionState:'connected'}});
 function meter(id,value){
  const samples=new Uint8Array(512);
  voice.meters.set(id,{samples,positive:0,negative:0,active:false,analyser:{getByteTimeDomainData(arr){arr.fill(value)}},source:{disconnect(){}}});
 }
 meter('user-2',165);meter('user-3',167);
 voice.sampleSpeaking();voice.sampleSpeaking();
 assert.deepEqual([...voice.speakingIds].sort(),['user-1','user-2']);
 assert.equal(voice.speakingIds.has('user-3'),false);
 // A muted participant may still produce signal artifacts, never a green mic ring.
 voice.roster.find(x=>x.id==='user-2').mic=false;
 for(let n=0;n<3;n++)voice.sampleSpeaking();
 assert.equal(voice.speakingIds.has('user-2'),false);
 assert.equal(voice.speakingIds.has('user-1'),true);
 voice.stopWatching('user-1');
 assert.deepEqual([...voice.speakingIds],[]);
 assert.deepEqual([...events.at(-1).activeSpeakerIds],[]);
 voice.audioContext.close=()=>Promise.resolve();voice.clearActivity();
});

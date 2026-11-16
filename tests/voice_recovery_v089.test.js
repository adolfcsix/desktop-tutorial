'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{readFileSync}=require('node:fs'),{join}=require('node:path');
const code=readFileSync(join(__dirname,'../prototype/voice.js'),'utf8');
function setup(){
 const jobs=new Map();let serial=0;
 const setTimeoutFake=(fn,ms)=>{const id=++serial;jobs.set(id,{fn,ms});return id};
 const clearTimeoutFake=id=>jobs.delete(id);
 class PC{
  constructor(){this.connectionState='new';this.iceRestarts=0;this.closed=false;}
  addTransceiver(){return {sender:{replaceTrack:async()=>{}}}}
  restartIce(){this.iceRestarts++}
  close(){this.closed=true;this.connectionState='closed'}
 }
 const stage={appendChild(){},querySelectorAll(){return []}};
 const doc={getElementById:()=>stage,createElement:()=>({remove(){}}),body:{appendChild(){}}};
 const window={RTCPeerConnection:PC,isSecureContext:true};
 vm.runInNewContext(code,{window,RTCPeerConnection:PC,document:doc,navigator:{mediaDevices:{}},setInterval,clearInterval,setTimeout:setTimeoutFake,clearTimeout:clearTimeoutFake,MediaStream:class{},Uint8Array,Math});
 const events=[],notices=[];
 const voice=new window.TutttVoice(async()=>({}),m=>events.push(m),s=>notices.push(s));
 voice.roomId='room-1';voice.selfId='me';voice.roster=[{id:'me',role:'speaker',mic:false},{id:'peer',role:'speaker',mic:true}];
 voice.createPeer('peer');
 const peer=voice.peers.get('peer');
 function nextTimer(){const e=jobs.entries().next().value;assert.ok(e,'timer should exist');jobs.delete(e[0]);e[1].fn();return e[1].ms;}
 return {voice,peer,events,notices,jobs,nextTimer};
}
test('failed remote audio clears green ring immediately and bounds ICE recovery to 3 attempts',()=>{
 const {voice,peer,events,notices,jobs,nextTimer}=setup();
 voice.speakingIds.add('peer');
 voice.meters.set('peer',{active:true,positive:3,negative:0,source:{disconnect(){}}});
 peer.pc.connectionState='failed';peer.pc.onconnectionstatechange();
 assert.equal(voice.speakingIds.has('peer'),false);
 assert.deepEqual([...events.at(-1).peerReconnecting],['peer']);
 assert.equal(nextTimer(),500);assert.equal(peer.pc.iceRestarts,1);
 assert.equal(nextTimer(),1800);assert.equal(peer.pc.iceRestarts,2);
 assert.equal(nextTimer(),4200);assert.equal(peer.pc.iceRestarts,3);
 assert.equal(jobs.size,0);assert.equal(notices.length,1);
 voice.dropPeer('peer');assert.equal(peer.pc.closed,true);
});
test('recovered peer cancels remaining timers and does not recreate stale speech indicators',()=>{
 const {voice,peer,events,jobs,nextTimer}=setup();
 peer.pc.connectionState='disconnected';peer.pc.onconnectionstatechange();
 assert.equal(jobs.size,1);assert.equal(nextTimer(),2300);
 peer.pc.connectionState='connected';peer.pc.onconnectionstatechange();
 assert.equal(jobs.size,0);assert.equal(peer.recoveryAttempts,0);
 assert.deepEqual([...events.at(-1).peerReconnecting],[]);
 assert.equal(voice.speakingIds.size,0);
});
test('leaving a room cancels pending restart and disallows an old room callback',async()=>{
 const {voice,peer,jobs}=setup();
 peer.pc.connectionState='failed';peer.pc.onconnectionstatechange();
 assert.equal(jobs.size,1);
 await voice.exit();assert.equal(jobs.size,0);
 assert.equal(voice.roomId,null);
 assert.equal(peer.pc.iceRestarts,0);
});

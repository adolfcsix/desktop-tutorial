'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const code=readFileSync(join(__dirname,'../prototype/voice.js'),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(api){
 const calls=[],notices=[];let peerFactory;
 class PC{
  constructor(){this.connectionState='new';this.signalingState='stable';this.remoteDescription=null;this.localDescription={type:'answer',sdp:'test'};peerFactory?.(this)}
  addTransceiver(){return {sender:{replaceTrack:async()=>{}}}}
  async setLocalDescription(){this.localDescription={type:'answer',sdp:'test'}}
  async setRemoteDescription(desc){this.remoteDescription=desc}
  async addIceCandidate(){}
  close(){this.connectionState='closed'}
 }
 const stage={appendChild(){},querySelectorAll(){return []}};
 const doc={getElementById:()=>stage,createElement:()=>({remove(){},play:async()=>{}}),body:{appendChild(){}}};
 const window={RTCPeerConnection:PC,isSecureContext:true};
 vm.runInNewContext(code,{window,RTCPeerConnection:PC,document:doc,navigator:{mediaDevices:{getUserMedia:async()=>{}}},setInterval,clearInterval,setTimeout,clearTimeout,MediaStream:class{},Uint8Array,Math});
 const voice=new window.TutttVoice(async(path,method,payload)=>{calls.push({path,method,payload});return api(path,method,payload)},()=>{},notice=>notices.push(notice));
 const roster=(roomId,role='speaker')=>({roomId,selfId:'me',participants:[{id:'me',role,mic:false},{id:'peer',role:'speaker',mic:false}]});
 return {voice,roster,calls,notices,PC,onCreate:(f)=>{peerFactory=f}};
}
test('failed join from an old room cannot clear the newly entered room',async()=>{
 const old=deferred();const q=fixture(path=>path.includes('/A/')?old.promise:q.roster('B'));
 const first=q.voice.enter('A');await flush();
 await q.voice.enter('B');
 old.reject(new Error('old connection timed out'));
 await first;
 assert.equal(q.voice.roomId,'B');assert.equal(q.voice.selfId,'me');
 assert.equal(q.voice.roster[0].id,'me');
 await q.voice.exit();
});
test('stale seat response cannot demote a participant after same-room reentry',async()=>{
 const seat=deferred();let joins=0;
 const q=fixture((path)=>path.endsWith('/seat')?seat.promise:(++joins,q.roster('A')));
 await q.voice.enter('A');const old=q.voice.seat(true);await flush();
 await q.voice.exit();await q.voice.enter('A');
 seat.resolve(q.roster('A','listener'));await old;
 assert.equal(q.voice.self.role,'speaker');assert.equal(q.voice.roomId,'A');
 await q.voice.exit();
});
test('all old peers are detached synchronously even if replaceTrack(null) is slow',async()=>{
 const slow=deferred();const q=fixture(path=>q.roster(path.includes('/B/')?'B':'A'));
 await q.voice.enter('A');
 q.voice.peers.get('peer').sender.replaceTrack=()=>slow.promise;
 const leaving=q.voice.exit();
 assert.equal(q.voice.roomId,null);assert.equal(q.voice.peers.size,0);assert.equal(q.voice.selfId,null);
 // A new enter may begin before the old replaceTrack Promise settles.
 await q.voice.enter('B');assert.equal(q.voice.roomId,'B');
 slow.resolve();await leaving;
 assert.equal(q.voice.roomId,'B');assert.equal(q.voice.self.role,'speaker');
 await q.voice.exit();
});
test('outdated SDP offer callback cannot send signaling from a new session',async()=>{
 const pending=deferred();const q=fixture(path=>q.roster(path.includes('/B/')?'B':'A'));
 await q.voice.enter('A');
 const pc=q.voice.peers.get('peer').pc;
 pc.setLocalDescription=()=>pending.promise;
 const handling=pc.onnegotiationneeded();await flush();
 await q.voice.exit();await q.voice.enter('B');
 pending.resolve();await handling;
 assert.equal(q.calls.filter(c=>c.path.includes('/signal')).length,0);
 assert.equal(q.voice.roomId,'B');await q.voice.exit();
});
test('in-flight remote SDP is discarded after leave and reentry to the same room',async()=>{
 const pending=deferred();const q=fixture(path=>q.roster('A'));
 await q.voice.enter('A');
 const pc=q.voice.peers.get('peer').pc;
 pc.setRemoteDescription=async()=>{await pending.promise;pc.remoteDescription={type:'offer'}};
 const handling=q.voice.receive({roomId:'A',from:'peer',type:'offer',payload:{type:'offer',sdp:'old'}});
 await flush();await q.voice.exit();await q.voice.enter('A');
 pending.resolve();await handling;
 assert.equal(q.calls.filter(c=>c.path.includes('/signal')).length,0);
 assert.equal(q.voice.roomId,'A');
 await q.voice.exit();
});
test('signaling from an unlisted peer is ignored rather than silently creating a connection',async()=>{
 const q=fixture(path=>q.roster('A'));
 await q.voice.enter('A');
 const count=q.voice.peers.size;
 await q.voice.receive({roomId:'A',from:'unlisted',type:'offer',payload:{type:'offer',sdp:'fake'}});
 assert.equal(q.voice.peers.size,count);
 assert.equal(q.calls.filter(c=>c.path.includes('/signal')).length,0);
 await q.voice.exit();
});
test('late mic-off response cannot override new live roster after same-room reentry',async()=>{
 const micOff=deferred();const q=fixture(path=>path.endsWith('/mic')?micOff.promise:q.roster('A'));
 await q.voice.enter('A');
 q.voice.mic=true;
 const stopping=q.voice.toggleMic();await flush();
 await q.voice.exit();await q.voice.enter('A');
 micOff.resolve(q.roster('A','listener'));await stopping;
 assert.equal(q.voice.self.role,'speaker');
 await q.voice.exit();
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('v0.5.9 Live redesign stylesheet is linked and whitelisted on server',()=>{
 assert.match(read('prototype/index.html'),/live-redesign-v059\.css/);
 assert.match(read('server/index.js'),/\/live-redesign-v059\.css/);
});
test('Voice Live removes the old decoration and keeps real controls and chat',()=>{
 const s=read('prototype/app.js');
 assert.doesNotMatch(s,/<div class="room-live-hero">/);
 assert.match(s,/data-action="unlockAudio"/);
 assert.match(s,/data-action="mic"/);
 assert.match(s,/id="room-send"/);
 assert.doesNotMatch(s,/data-action="supporters"/);
});
test('the 2 themes share the same design contract, not two different room structures',()=>{
 const s=read('prototype/live-redesign-v059.css');
 for(const name of ['.cam-stage-grid','.cam-chat-entry','.cam-compose','.room-chatbox','.seat-grid'])assert.ok(s.includes(name),name);
 assert.match(s,/prefers-reduced-motion/);
 assert.match(s,/--brand-ruby/);
});
test('Native Live removes unnecessary voice promo banner while retaining media and moderation',()=>{
 const s=read('mobile/src/screens/Screens.tsx');
 assert.doesNotMatch(s,/VOICE ROOM<\/Text>/);
 for(const v of ['onCam','onMic','onModerate','AudioAvatar','VideoTrack','liveConnectionNotice'])assert.ok(s.includes(v),v);
});

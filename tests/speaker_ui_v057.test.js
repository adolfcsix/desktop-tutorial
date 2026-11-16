const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {visual}=require('../prototype/speaker-status');
test('Muted mic shows badge and never an activity ring',()=>{
 assert.deepEqual(visual({connected:true,mic:false,speaking:true}),{muted:true,active:false,showMuteBadge:true,showGreenRing:false});
});
test('Quiet but unmuted speaker has neither mute badge nor ring',()=>{
 assert.deepEqual(visual({connected:true,mic:true,speaking:false}),{muted:false,active:false,showMuteBadge:false,showGreenRing:false});
});
test('Actual voice activity can glow only when microphone enabled',()=>{
 assert.equal(visual({connected:true,mic:true,speaking:true}).showGreenRing,true);
 assert.equal(visual({connected:false,mic:true,speaking:true}).showGreenRing,false);
 assert.equal(visual({connected:true,mic:null,speaking:true}).showGreenRing,false);
});
test('Native microphone status uses publication, not the speaker seat',()=>{
 const screen=read('mobile/src/screens/Screens.tsx');
 assert.match(screen,/getTrackPublication\?\.\(Track\.Source\.Microphone\)/);
 assert.match(screen,/RoomEvent\.ActiveSpeakersChanged/);
 assert.match(screen,/RoomEvent\.TrackMuted/);
 assert.match(screen,/RoomEvent\.TrackUnmuted/);
 assert.match(screen,/AccessibilityInfo\.isReduceMotionEnabled/);
 assert.match(screen,/function AudioAvatar/);
 assert.match(screen,/mic===\x27muted\x27\?<MutedBadge/);
});
test('WebRTC audio activity uses received audio samples and stops on mute/leave',()=>{
 const voice=read('prototype/voice.js');
 assert.match(voice,/getByteTimeDomainData/);
 assert.match(voice,/Math\.sqrt\(sum\/m\.samples\.length\)/);
 assert.match(voice,/this\.stopWatching\(this\.selfId\)/);
 assert.match(voice,/this\.clearActivity\(\)/);
});
test('CSS never animates the ring when reduced motion is requested',()=>{
 const css=read('prototype/live-speaker-v057.css');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/animation:none!important/);
 assert.match(read('prototype/index.html'),/live-speaker-v057\.css/);
});

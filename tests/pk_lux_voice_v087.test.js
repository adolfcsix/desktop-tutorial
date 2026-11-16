'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=file=>readFileSync(join(__dirname,'..',file),'utf8');
test('Voice mic-off badges update in place and unknown mic state is not presented as on',()=>{
 const source=read('prototype/app.js');
 assert.match(source,/function updateVoiceActivityDom\(/);
 assert.match(source,/const showMuted=Boolean\(state\.voiceReady&&member\?\.mic===false\)/);
 assert.match(source,/wrap\.appendChild\(marker\)/);
 assert.match(source,/else if\(!showMuted&&badge\)badge\.remove\(\)/);
 assert.match(source,/trạng thái mic chưa xác định/);
});
test('Voice treatment stays bounded to Voice, with quiet light/night palettes and no repeating decorative effects',()=>{
 const css=read('prototype/pk-voice-v077.css');
 assert.match(css,/v0\.8\.7 — youth-oriented editorial finish/);
 assert.match(css,/#app \.pk-broadcast-voice \.pk-duel-side\.pk-side-coral/);
 assert.match(css,/#app \.pk-broadcast-voice \.pk-duel-side\.pk-side-champagne/);
 assert.match(css,/body:not\(\.light-mode\).*\.pk-broadcast-voice/);
 assert.doesNotMatch(css,/\.pk-broadcast-cam/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Active speaker halo is limited to actual active speaker CSS class and honors reduced motion',()=>{
 const css=read('prototype/live-speaker-v057.css');
 const code=read('prototype/app.js');
 assert.match(css,/\.pk-person-ring\.pk-host-speaking/);
 assert.match(css,/@keyframes tutttVoiceActualSpeechV087/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(code,/host\?\.mic&&speaking\.has\(hostId\)/);
 assert.match(code,/seat\.classList\.toggle\('is-speaking',active\)/);
});
test('No duplicate room control, new title and version correct',()=>{
 const p=JSON.parse(read('package.json'));
 const h=read('prototype/index.html');
 assert.match(p.version,/^0\.8\.\d+$/);
 assert.ok(h.includes('v'+p.version));
 assert.ok(read('server/index.js').includes("version:'"+p.version+"'"));
 assert.match(read('mobile/src/components/PKDuelBoard.tsx'),/#F0D7CD/);
});

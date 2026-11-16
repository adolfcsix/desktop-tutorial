'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=name=>readFileSync(join(__dirname,'..',name),'utf8');

test('Voice roster updates reuse seat nodes and never rebuild chat/PK for ordinary microphone or membership changes',()=>{
 const code=read('prototype/app.js');
 assert.match(code,/function voiceSeats\(r\)/);
 assert.match(code,/function voiceSeatMarkup\(s,i\)/);
 assert.match(code,/function syncVoiceSeatsDom\(\)/);
 assert.match(code,/grid\.insertBefore\(seat,position\|\|null\)/);
 assert.match(code,/seat\.dataset\.speakerId=s\?\.id\|\|''/);
 assert.match(code,/if\(syncVoiceSeatsDom\(\)\)\{updateVoiceActivityDom\(\);updateRoomSignalDom\(\);return;\}/);
 assert.doesNotMatch(code,/\.room-chatbox\.innerHTML\s*=/);
});
test('Voice stage speaker caption has reserved space, real mic evidence gate and reduced-motion fallback',()=>{
 const markup=read('prototype/app.js'), css=read('prototype/live-speaker-v057.css');
 assert.match(markup,/speakerStatus\.visual\(\{connected:state\.voiceReady&&!!s/);
 assert.match(markup,/audio\.showMuteBadge/);
 assert.match(markup,/class="seat-speaking-caption" aria-hidden="true">Đang nói/);
 assert.match(css,/\.seat\.is-speaking \.seat-speaking-caption/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Web, API and Native metadata describe the same iteration',()=>{
 const pkg=JSON.parse(read('package.json'));
 const native=JSON.parse(read('mobile/package.json'));
 assert.equal(native.version,pkg.version);
 assert.ok(read('prototype/index.html').includes('v'+pkg.version));
 assert.ok(read('server/index.js').includes("version:'"+pkg.version+"'"));
});

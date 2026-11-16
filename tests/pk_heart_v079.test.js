'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=(f)=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('one final heart style layer and served CSS, no breaking old PK meter',()=>{
 const html=read('prototype/index.html'),server=read('server/index.js'),css=read('prototype/pk-heart-v079.css');
 assert.ok(html.indexOf('pk-heart-v079.css')>html.indexOf('pk-voice-v077.css'));
 assert.match(server,/['"]\/pk-heart-v079\.css['"]/);
 assert.match(css,/pk-heart-particle/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.pk-broadcast-voice/);
 assert.match(css,/\.pk-broadcast-cam/);
 assert.match(css,/stroke:#FFFDF9!important/);
 assert.match(css,/fill:transparent!important/);
});
test('vector outline is the same for Voice/Cam and is only filled on support',()=>{
 const app=read('prototype/app.js'),css=read('prototype/pk-heart-v079.css');
 assert.match(app,/\$\{ico\('heart'\)\}<\/span>/);
 assert.doesNotMatch(app,/pk-cheer-arrow/);
 assert.match(app,/function burstPkHearts\(\)/);
 assert.match(app,/if\(showBurst\)burstPkHearts\(\)/);
 assert.match(app,/runRoomControl\('pk-cheer',room=>net\.pkCheer\(room,match\.id\),\(\)=>\{burstPkHearts\(\);void syncPK\(\)\}\)/);
 assert.match(css,/animation:pkHeartSolidV079/);
 assert.match(css,/background:transparent!important;border:0!important;box-shadow:none!important/);
});
test('PK Voice keeps real PK cheer without separate fake heart in Live toolbar',()=>{
 const app=read('prototype/app.js'),rn=read('mobile/src/screens/Screens.tsx');
 assert.match(app,/room-controls \$\{\(state\.pkData\?\.match/);
 assert.doesNotMatch(app,/data-action="heart"/);
 assert.doesNotMatch(rn,/onHeart|onGift/);
});
test('native stage keeps accessible PK supports and transparent button with outline/solid press state',()=>{
 const native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(native,/accessibilityHint="Chạm để gửi một lượt cổ vũ miễn phí/);
 assert.match(native,/pressed\|\|heartLit\?'♥':'♡'/);
 assert.match(native,/setTimeout\(\(\)=>setHeartLit\(false\),380\)/);
 assert.match(native,/backgroundColor:'transparent'/);
});

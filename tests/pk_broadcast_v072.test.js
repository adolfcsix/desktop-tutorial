'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('v0.7.2 broadcast stylesheet loads after legacy layers and is served safely',()=>{
 const h=read('prototype/index.html'),css=read('prototype/pk-v072.css');
 assert.match(h,/pk-v071\.css"[^]*pk-v072\.css"/);
 assert.match(read('server/index.js'),/['"]\/pk-v072\.css['"]/);
 assert.match(css,/\.pk-broadcast-cam/);
});
test('Cam PK presents two video-size regions with score and chat over the scene',()=>{
 const a=read('prototype/app.js'),css=read('prototype/pk-v072.css');
 assert.match(a,/pk-broadcast-cam/);
 assert.match(a,/pk-camera-backdrop/);
 assert.match(a,/pk-host-video/);
 assert.match(css,/\.pk-duel\{[^}]*position:absolute!important/);
 assert.match(css,/\.cam-interaction\.cam-chat-float\{/);
 assert.match(css,/\.pk-scoreboard\{/);
 assert.match(a,/Chưa ghép tín hiệu đối thủ/);
});
test('Web camera preview has explicit opt-in, no microphone, no publishing, and stops on exit',()=>{
 const a=read('prototype/app.js');
 assert.match(a,/data-action="pkLocalCameraToggle"/);
 assert.match(a,/getUserMedia\(\{video:\{facingMode:'user'\},audio:false\}\)/);
 assert.match(a,/pkLocalCameraStream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
 assert.match(a,/if\(action==='pkDemoFinish'[^]*stopPkLocalCamera\(\)/);
 assert.match(a,/window\.addEventListener\('pagehide',stopPkLocalCamera\)/);
 assert.doesNotMatch(a,/pkLocalCameraStream\s*&&\s*net\./);
});
test('Native Cam PK uses real local track only and places it in portrait video surface',()=>{
 const board=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(board,/roomType==='cam'/);
 assert.match(board,/local&&videoReady&&ownHost&&cameraPub/);
 assert.match(board,/VideoTrack trackRef=/);
 assert.match(board,/CHƯA GHÉP VIDEO/);
 assert.match(board,/Chưa ghép media đối thủ/);
 assert.match(board,/useWindowDimensions\(\)/);
});
test('Brand, consent and accessibility remain intact',()=>{
 const css=read('prototype/pk-v072.css'),a=read('prototype/app.js');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.pk-camera-try:focus-visible/);
 assert.match(a,/Không phải tiền hay quà thật/);
 assert.match(a,/Chỉ xem trên máy · Không phát Live/);
 assert.match(a,/aria-label="Tắt xem trước camera"/);
});

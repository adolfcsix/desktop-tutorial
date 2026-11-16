'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
test('PK stylesheet is linked and whitelisted without exposing demo values on server',()=>{
 assert.match(read('prototype/index.html'),/pk-v060\.css/);
 assert.match(read('server/index.js'),/\/pk-v060\.css/);
 assert.match(read('prototype/app.js'),/PK minh họa/);
 assert.match(read('prototype/app.js'),/Điểm cổ vũ miễn phí/);
});
test('PK duel is optional, never a new persistent chat or member tab',()=>{
 const s=read('prototype/app.js');
 assert.match(s,/pkLauncher\(\)/);
 assert.match(s,/function pkPanel\(r\)/);
 assert.match(s,/action==='pkCheer'/);
 assert.doesNotMatch(s, /Chat<\/button>.*Thành viên<\/button>.*Quản lý<\/button>/);
});
test('Voice theme uses primary host stage, compact PK and muted avatar fallback',()=>{
 const s=read('prototype/pk-v060.css');
 assert.match(s,/room-top:has\(\.pk-showdown\)/);
 assert.match(s,/seat-grid \.seat:first-child/);
 assert.match(s,/prefers-reduced-motion/);
 assert.match(read('prototype/app.js'),/live-mic-muted/);
});
test('React Native screens include controlled PK and a single lead voice avatar',()=>{
 const s=read('mobile/src/screens/Screens.tsx');
 assert.match(s,/PKPanel/);
 assert.match(s,/voices\.find\(v=>v\.role==='host'\)/);
 assert.match(read('mobile/src/components/PKPanel.tsx'),/scoreA/);
 assert.match(read('mobile/src/services/api.ts'),/pkApi/);
});

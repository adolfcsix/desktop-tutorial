'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'prototype/app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype/live-flow-v056.css'),'utf8');
const native=fs.readFileSync(path.join(root,'mobile/src/screens/Screens.tsx'),'utf8');
const index=fs.readFileSync(path.join(root,'prototype/index.html'),'utf8');
const server=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
test('Audience list is reached from viewer count and is not a permanent stage tab',()=>{
 assert.match(app,/audienceMarkup\(r,'cam-viewers'\)/);
 assert.match(app,/data-action="roomAudience"/);
 assert.doesNotMatch(app,/class="cam-panel-tabs"/);
 assert.doesNotMatch(app,/data-action="camPanel"/);
 assert.match(app,/state\.modal='roomAudience'/);
 assert.match(app,/liveRoomSheet\(manage\?'manage':'audience'\)/);
});
test('Chat floats visibly and is always present in Cam room, regardless of manager state',()=>{
 assert.match(app,/class="cam-interaction cam-chat-float"/);
 assert.match(app,/class="cam-chat-history"/);
 assert.match(app,/<form id="room-send"/);
 assert.match(css,/backdrop-filter:blur\(11px\)/);
 assert.match(css,/linear-gradient\(180deg,transparent/);
});
test('Moderation is a separate authorized sheet without redundant toolbar audience icon',()=>{
 assert.match(app,/row\('roomManage','Quản lý phòng'/);
 assert.match(app,/data-action=\"liveOptions\"/);
 assert.match(app,/if\(!isManager\)return/);
 assert.doesNotMatch(app,/data-action="gift" class="cam-action"/,"No nonfunctional gift control in Live toolbar");
 assert.doesNotMatch(app,/data-action="\$\{isManager\?'roomManage':'roomAudience'\}"/);
});
test('Mobile has the same audience sheet and always-visible translucent chat',()=>{
 assert.match(native,/setSheet\('members'\)/);
 assert.match(native,/sheet==='members'/);
 assert.match(native,/setSheet\('manage'\)/);
 assert.match(native,/<Modal transparent visible=\{sheet!==null\}/);
 assert.match(native,/c\.surface\+'D[9C]'/);
 assert.doesNotMatch(native,/accessibilityRole="tablist"/);
});
test('New stylesheet is linked and server-served',()=>{
 assert.match(index,/live-flow-v056\.css/);
 assert.match(server,/'\/live-flow-v056\.css'/);
});

'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync }=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=f=>readFileSync(join(root,f),'utf8');

test('v0.7.5 room rhythm CSS is last and is accessible through static server whitelist',()=>{
 const html=read('prototype/index.html'),server=read('server/index.js');
 assert.ok(html.indexOf('live-polish-v075.css')>html.indexOf('controls-v074.css'));
 assert.match(server,/\/live-polish-v075\.css/);
 assert.match(html,/v0\.8\.\d+/);
});
test('voice count opens one server-backed audience sheet, including silent viewers',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/audienceMarkup\(r,'voice-audience'\)/);
 assert.match(app,/net\.audience\(id\)/);
 assert.match(app,/current\.members\.filter\(m=>!m\.onStage\)/);
 assert.match(app,/Người xem/);
 assert.match(app,/Người xem.*minh họa|minh họa.*Người xem/s);
 assert.doesNotMatch(app,/state\.voiceReady\?state\.voiceParticipants:\[\]/);
});
test('voice chat keeps readable compact demo greeting without hiding real room messages',()=>{
 const app=read('prototype/app.js'),css=read('prototype/live-polish-v075.css');
 assert.match(app,/Chào mọi người!/);
 assert.match(app,/state\.roomLog\.map/);
 assert.match(css,/\.room-chatbox \.room-log/);
 assert.match(css,/min-height:96px!important/);
});
test('primary voice and camera composers have the same 46px touch target',()=>{
 const css=read('prototype/live-polish-v075.css');
 assert.match(css,/height:46px!important;min-height:46px!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const mobile=read('mobile/src/screens/Screens.tsx');
 assert.match(mobile,/accessibilityLabel="Gửi tin nhắn"/);
 assert.match(mobile,/width:46,height:46,minWidth:46,minHeight:46/);
 assert.match(mobile,/gap:isCam\?6:10,paddingHorizontal:isCam\?10:13/);
});

'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const web=fs.readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../prototype/live-chat-v052.css'),'utf8');
const mobile=fs.readFileSync(path.join(__dirname,'../mobile/src/screens/Screens.tsx'),'utf8');
const stage=fs.readFileSync(path.join(__dirname,'../server/stage.js'),'utf8');
test('live camera uses one curated layout with no display-mode chooser',()=>{
 assert.match(web,/cam-mode-unified/);assert.doesNotMatch(web,/data-action="chatView"/);
 assert.doesNotMatch(mobile,/setViewMode/);assert.doesNotMatch(mobile,/Cân bằng.*Trong suốt.*Ưu tiên chat/);
 assert.match(web,/aria-pressed/);assert.match(mobile,/accessibilityState/);
});
test('guest invitation requires explicit consent and does not automatically publish',()=>{
 assert.match(stage,/async invite\(/);assert.match(stage,/async respondInvite\(/);
 assert.match(stage,/if\(!accept\)/);assert.match(stage,/await this\.bridge\.setPermission\(id,user\.id,true/);
 assert.match(stage,/!d\.requests\.has\(targetId\)/);
});
test('native chat view keeps real video tracks rather than simulation',()=>{
 assert.match(mobile,/<VideoTrack/);assert.match(mobile,/Track\.Source\.Camera/);
 assert.match(mobile,/onRespondInvite/);
});

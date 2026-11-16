const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('Voice and Cam do not show a Top 3 CTA without verified gift data',()=>{
 const app=read('prototype/app.js');
 const native=read('mobile/src/screens/Screens.tsx');
 assert.doesNotMatch(app,/data-action="supporters"|state\.modal==='supporters'|voice-top3-button|cam-supporter-row/);
 assert.doesNotMatch(native,/Top 3|Top 3 người đồng hành/);
 assert.match(app,/data-action="roomAudience"/);
 assert.match(native,/onPress=\{openAudience\}/);
});
test('Unreachable placeholder ranking modal and styles are removed, no duplicate privacy shortcut',()=>{
 const css=read('prototype/live-polish-v053.css');
 assert.doesNotMatch(css,/cam-supporter-|voice-top3-button|supporter-rank-row/);
 const native=read('mobile/src/screens/Screens.tsx');
 assert.doesNotMatch(native,/\['♧','Quyền riêng tư',onSettings\]/);
 assert.match(native,/\['⚙','Cài đặt',onSettings\]/);
});
test('Existing room UI stylesheet stays served and no new layer is added',()=>{
 assert.match(read('server/index.js'),/live-polish-v053\.css/);
 assert.match(read('prototype/live-polish-v053.css'),/\.voice-title-row/);
});

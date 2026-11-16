const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('v0.7.3 stylesheet follows v0.7.2 overrides in working HTML',()=>{
 const html=read('prototype/index.html');
 assert.ok(html.indexOf('pk-v073.css')>html.indexOf('pk-v072.css'));
 assert.match(html, /v0\.8\.\d+/);
 assert.match(read('server/index.js'), /['\"]\/pk-v073\.css['\"]/);
});
test('Ivory override is scoped to active Cam PK and keeps Night separate',()=>{
 const css=read('prototype/pk-v073.css');
 assert.match(css,/body\.light-mode #app:has\(\.pk-broadcast-cam\)/);
 assert.match(css,/body:not\(\.light-mode\)/);
 assert.match(css,/cam-compose/);assert.match(css,/cam-actions/);
 assert.match(css,/pk-duel-side/);
});
test('PK Cam cheer is in the existing lower action rail, not over broadcast video',()=>{
 const html=read('prototype/app.js');
 assert.match(html,/cam-action pk-cheer-button pk-rail-cheer/);
 assert.match(html,/state\.connected\?'pkCheer':'pkDemoCheer'/);
 assert.match(read('prototype/pk-v073.css'),/pk-broadcast-cam \.pk-scene-footer\{display:none!important\}/);
});
test('Result demo action is contextual, accessible and remains functional',()=>{
 const html=read('prototype/app.js');
 assert.doesNotMatch(html,/pk-header-result/);
 assert.match(html,/data-action=\"pkDemoFinish\"/);
 assert.match(html,/Thử hiệu ứng kết thúc trận/);
 assert.match(html,/action==='pkDemoFinish'/);
});
test('Túttt native PK has matching Ivory surface and native cheer language',()=>{
 const tsx=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(tsx,/const ivory=palette.bg===light.bg/);
 assert.match(tsx,/stage:palette\.bg/);
 assert.match(tsx,/>Tiếp sức<\/Text>/);
 assert.match(tsx,/onPress=\{triggerCheer\}/);
});

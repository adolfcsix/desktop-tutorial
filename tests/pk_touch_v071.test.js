'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('v0.7.1 new button layer is served last and keeps color tokens',()=>{
 const html=read('prototype/index.html'),css=read('prototype/pk-v071.css');
 assert.match(html,/pk-v070\.css"[^]*pk-v071\.css"/);
 assert.match(read('server/index.js'),/['"]\/pk-v071\.css['"]/);
 for(const token of ['--pk-cheer-bg','--pk-cheer-ink','--pk-ink','--pk-focus','--pk-side-a-accent'])assert.ok(css.includes(token),token);
 assert.doesNotMatch(css,/#(?:[\da-fA-F]{3}|[\da-fA-F]{6})\b/); // no new palette hex values
});
test('PK cheer gains icon hierarchy without changing event or score logic',()=>{
 const app=read('prototype/app.js'),css=read('prototype/pk-v071.css');
 assert.match(app,/pk-cheer-icon/);assert.match(app,/pk-cheer-copy/);assert.doesNotMatch(app,/pk-cheer-arrow/);
 assert.match(app,/data-action="\$\{demo\?'pkDemoCheer':'pkCheer'\}"/);
 assert.match(app,/aria-label="Cổ vũ phe \$\{mine\}"/);
 assert.match(css,/min-height:48px!important/);
 assert.match(css,/\.pk-cheer-button:disabled/);
});
test('secondary action remains separate; replay is explicitly demo and accessible',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/data-action="pkDemoFinish"/);
 assert.match(app,/Thử hiệu ứng kết thúc trận/);
 assert.doesNotMatch(app,/data-action="pkResultDismiss"/);
 assert.match(app,/Điểm mẫu · Không phải tiền hay quà thật/);
});
test('web button UI honors focus, reduced motion and compact screens',()=>{
 const css=read('prototype/pk-v071.css');
 assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/\.circle-action\.active/);
 assert.match(css,/\.cam-action:active/);
});
test('native PK button hierarchy keeps proper semantics and tactile feedback',()=>{
 const duel=read('mobile/src/components/PKDuelBoard.tsx'),panel=read('mobile/src/components/PKPanel.tsx'),screens=read('mobile/src/screens/Screens.tsx');
 assert.match(duel,/accessibilityHint="Chạm để gửi một lượt cổ vũ miễn phí/);
 assert.match(duel,/scale:pressed&&!busy\?\.97:1/);
 assert.match(duel,/sideScale/);
 assert.match(panel,/scale:pressed\?\.96:1/);
 assert.match(screens,/scale:pressed\?\.94:1/);
});

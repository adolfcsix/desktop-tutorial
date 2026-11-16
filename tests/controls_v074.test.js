const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('v0.7.4 control stylesheet loads last in both preview and server',()=>{
 const html=read('prototype/index.html'),server=read('server/index.js');
 assert.ok(html.indexOf('controls-v074.css')>html.indexOf('pk-v073.css'));
 assert.match(server,/controls-v074\.css/);
 assert.match(html,/v0\.8\.\d+/);
});
test('Live Cam and Voice use a consistent icon rhythm and nonzero gaps',()=>{
 const css=read('prototype/controls-v074.css');
 assert.match(css,/--live-icon:42px/);
 assert.match(css,/--live-control-gap:8px/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\.pk-rail-cheer \.pk-cheer-icon/);
 assert.match(css,/prefers-reduced-motion/);
});
test('PK theme stays separated and the existing button actions remain wired',()=>{
 const html=read('prototype/app.js');
 assert.match(html,/data-action="pkDemoCheer"|state\.connected\?'pkCheer':'pkDemoCheer'/);
 assert.match(html,/data-action="pkDemoFinish"/);
 assert.match(html,/data-action="leaveRoom"/);
 assert.match(read('prototype/pk-v073.css'),/body\.light-mode/);
 assert.match(read('prototype/pk-v073.css'),/body:not\(\.light-mode\)/);
});
test('native Live controls have proportional touch targets and PK modal controls use 44pt minimum',()=>{
 const screens=read('mobile/src/screens/Screens.tsx');
 assert.match(screens,/gap:isCam\?6:10,paddingHorizontal:isCam\?10:13,paddingTop:11/);
 assert.match(screens,/flex:1,alignItems:'center',gap:8,minHeight:73,minWidth:0/);
 const panel=read('mobile/src/components/PKPanel.tsx');
 assert.match(panel,/minHeight:44,minWidth:82/);
 assert.match(panel,/minHeight:44,minWidth:105/);
});

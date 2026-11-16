'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const r=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(r,p),'utf8');const cfg=JSON.parse(read('brand/pk-color-system.json'));
test('v0.6.5 web CSS is ordered last and allowed by HTTP server',()=>{
 const html=read('prototype/index.html'); assert.match(html,/pk-v064\.css"[^]*pk-v065\.css"/);
 assert.match(read('server/index.js'),/\/pk-v065\.css/);
 assert.match(read('prototype/pk-v065.css'),/\.cam-page\.cam-mode-unified:has\(\.pk-arena-v3\)/);
});
test('light PK uses warm mocha with dark readable ink; dark PK retains espresso',()=>{
 assert.equal(cfg.palettes.light.stage,'#E9D8CA');
 assert.equal(cfg.palettes.light.ink,'#30231F');
 assert.notEqual(cfg.palettes.light.stage,cfg.palettes.dark.stage);
 assert.equal(cfg.palettes.dark.stage,'#271D1F');
 assert.equal(cfg.palettes.light.sideAAccent,'#862D24');
});
test('both web modes use one canonical surface for all active PK surfaces only',()=>{
 const css=read('prototype/pk-v065.css');
 for(const k of ['.cam-topbar','.cam-content','.cam-interaction.cam-chat-float','.cam-compose','.cam-actions','.room-top','.room-chatbox','.room-compose','.room-controls'])assert.ok(css.includes(k),k);
 assert.match(css,/background:var\(--pk-stage\)!important/);
 assert.match(css,/#app:has\(\.pk-arena-v3\)/);
});
test('web input and chat are toned overlays, not legacy light patches',()=>{
 const css=read('prototype/pk-v065.css');
 assert.match(css,/color-mix\(in srgb,var\(--pk-stage\) 91%,var\(--pk-ink\) 9%\)/);
 assert.match(css,/\.room-chatbox \.room-log/);
 assert.match(css,/\.cam-chat-entry/);
 assert.doesNotMatch(css,/background:#F7F1E5/);
});
test('native PK match toggles same-tone stage across room and hides duplicate camera/mic seats',()=>{
 const panel=read('mobile/src/components/PKPanel.tsx'),screen=read('mobile/src/screens/Screens.tsx');
 assert.match(panel,/onActiveChange\?\.\(pkActive\)/);
 assert.match(screen,/onActiveChange=\{setPkActive\}/);
 assert.match(screen,/const roomBg=c\.bg/);
 assert.match(screen,/isCam&&!pkActive/);
 assert.match(screen,/!isCam&&!pkActive/);
 assert.match(screen,/backgroundColor:roomBg/);
});
test('pk surface and colors stay generated from one brand source',()=>{
 const {spawnSync}=require('node:child_process');
 const result=spawnSync('node',['scripts/build-pk-colors.js','--check'],{cwd:r,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(read('mobile/src/theme/pkColors.ts'),/"stage": "#E9D8CA"/);
 assert.match(read('prototype/pk-colors.generated.css'),/--pk-stage:#E9D8CA;/);
});

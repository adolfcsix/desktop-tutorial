'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('PK Arena 0.6.2 linked and safe-listed for web server',()=>{
 assert.match(read('prototype/index.html'),/pk-v062\.css/);
 assert.match(read('server/index.js'),/pk-v062\.css/);
 assert.match(read('prototype/pk-v062.css'),/pk-arena-v2/);
});
test('active PK removes duplicate header and floating button without hiding viewer action',()=>{
 const css=read('prototype/pk-v062.css');const js=read('prototype/app.js');
 assert.match(css,/pk-launcher:has\(\+\.pk-arena-v2\)\{display:none!important\}/);
 assert.match(css,/\.cam-stage-caption\{display:none!important\}/);
 assert.match(js,/audienceMarkup\(r,'pk-viewers'\)/);
 assert.match(read('prototype/live-polish-v075.css'),/\.cam-stage-metrics \.cam-viewers\{display:none!important\}/);
 assert.match(js,/class="cam-header-more" data-action="liveOptions"/);
 assert.doesNotMatch(js,/class="pk-menu"/);
});
test('arena retains demo disclosure, safe PK action, real permission boundary',()=>{
 const js=read('prototype/app.js');
 assert.match(js,/Điểm mẫu · Không phải tiền hay quà thật/);
 assert.match(js,/Điểm cổ vũ miễn phí/);
 assert.match(js,/Chưa ghép video PK/);
 assert.match(js,/pkDemoCheer/);
 assert.doesNotMatch(js,/fakeLiveStream/);
});
test('native and web PK preserve focus states and reduced motion',()=>{
 const css=read('prototype/pk-v062.css'),native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/focus-visible/);
 assert.match(native,/Chưa ghép media PK/);
 assert.match(native,/accessibilityRole="button"/);
 assert.match(native,/Cổ vũ phe/);
});

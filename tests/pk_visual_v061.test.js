'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const file=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const {evaluate}=require('../prototype/pk-visual-ux');

test('PK score uses 50/50 for a zero-zero tie and does not invent a leader',()=>{
 assert.deepEqual(evaluate(0,0),{leftPct:50,label:'Hòa',leader:null});
 assert.deepEqual(evaluate(900,900),{leftPct:50,label:'Hòa',leader:null});
});
test('PK score reflects real share without dividing by zero',()=>{
 assert.equal(evaluate(1250,750).leftPct,63);
 assert.equal(evaluate(1,0).leader,'A');
 assert.equal(evaluate(0,4).leader,'B');
 assert.equal(evaluate(-1,3).leftPct,0); // exact score percentage
});
test('PK visual assets are linked, safe-listed and have accessibility labels',()=>{
 assert.match(file('prototype/index.html'),/pk-v061\.css/);
 assert.match(file('prototype/index.html'),/pk-visual-ux\.js/);
 assert.match(file('server/index.js'),/\/pk-v061\.css/);
 assert.match(file('server/index.js'),/\/pk-visual-ux\.js/);
 const js=file('prototype/app.js');
 assert.match(js,/role=\\?"progressbar\\?" aria-valuemin=/);
 assert.match(js,/BẢN MINH HỌA/);
 assert.match(js,/Chưa ghép video PK/);
 assert.match(js,/pkDemoCheer/);
});
test('PK has a dual-host stage rather than the old tiny inline score card',()=>{
 const css=file('prototype/pk-v061.css');
 assert.match(css,/grid-template-columns:1fr 1fr/);
 assert.match(css,/\.pk-duel-seam/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.cam-stage-grid\{display:none!important\}/);
});
test('React Native uses the same two-team PK semantics without claiming cross-room media',()=>{
 const screen=file('mobile/src/components/PKDuelBoard.tsx');
 const pk=file('mobile/src/components/PKPanel.tsx');
 assert.match(screen,/Chưa ghép media PK/);
 assert.match(screen,/Cổ vũ phe/);
 assert.match(screen,/Không phải coin/);
 assert.match(pk,/PKDuelBoard/);
 assert.match(pk,/Chưa ghép hình\/âm thanh hai phòng/);
});

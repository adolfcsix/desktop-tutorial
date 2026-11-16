'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
test('v0.6.6 typography stylesheet remains in chain and served from approved static allowlist',()=>{
 const html=read('prototype/index.html'),server=read('server/index.js');
 assert.match(html,/pk-v065\.css"[^]*pk-v066\.css"/);
 assert.match(server,/\/pk-v066\.css/);
 assert.match(read('package.json'),/"version": "0.(?:7|8).\d+"/);
});
test('font stacks explicitly support Vietnamese and offline system fallback',()=>{
 const css=read('prototype/pk-v066.css');
 assert.match(css,/font-family:[\"']Inter[\"'],[\"']Noto Sans[\"'],-apple-system,BlinkMacSystemFont,[\"']Segoe UI[\"'],system-ui,sans-serif/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
 assert.match(css,/\.pk-person strong/);
 assert.match(css,/\.pk-side-score strong/);
 assert.match(css,/\.cam-title strong/);
});
test('PK reading hierarchy uses mixed-case team and score labels, unboxed stage, no fake stream',()=>{
 const code=read('prototype/app.js'),css=read('prototype/pk-v066.css');
 assert.match(code,/Phe của bạn|PHE CỦA BẠN/);
 assert.match(code,/Đối thủ/);
 assert.match(code,/Chủ phòng(?: ·)?/);
 assert.match(code,/Điểm cổ vũ/);
 assert.match(code,/Điểm mẫu · Không phải tiền hay quà thật/);
 assert.match(css,/\.pk-score-caption strong/);
 assert.doesNotMatch(css,/pk-duel-side[^}]*background-color:/);
 assert.match(read('prototype/pk-v064.css'),/\.pk-duel-side\{[^}]*background:transparent!important/);
});
test('both web voice and cam get consistent chat labels, controls and CTA targets',()=>{
 const css=read('prototype/pk-v066.css'),code=read('prototype/app.js');
 assert.match(css,/\.cam-chat-label-extra/);
 assert.match(css,/\.room-topbar \.live-tag/);
 assert.match(css,/\.cam-action small/);
 assert.match(css,/\.room-controls \.circle-icon/);
 assert.match(css,/min-height:44px!important/);
 assert.match(code,/cam-chat-label-extra/);
});
test('responsive PK typography preserves small screens, low height and reduced-motion controls',()=>{
 const css=read('prototype/pk-v066.css');
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/@media\(max-height:760px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.pk-person-ring\{width:76px!important/);
});
test('native PK mirrors type hierarchy, has clear media disclosure, and uses same active palette for header',()=>{
 const board=read('mobile/src/components/PKDuelBoard.tsx');const screen=read('mobile/src/screens/Screens.tsx');
 assert.match(board,/Phe của bạn|PHE CỦA BẠN/);
 assert.match(board,/Điểm cổ vũ/);
 assert.match(board,/Chưa ghép media PK/);
 assert.match(board,/Không phải coin/);
 assert.match(screen,/pkActive\?pkTone\.cheerBg:c\.coral/);
 assert.match(screen,/pkActive\?pkTone\.clockBg:c\.surface/);
});

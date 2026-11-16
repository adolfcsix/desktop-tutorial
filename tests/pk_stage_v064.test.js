'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('PK 0.6.4 CSS is included in preview and explicitly allowed by HTTP server',()=>{
 assert.match(read('prototype/index.html'),/pk-v064\.css/);
 assert.match(read('server/index.js'),/\/pk-v064\.css/);
 assert.match(read('prototype/pk-v064.css'),/\.pk-arena-v3/);
});
test('web PK 0.6.4 uses one shared visual stage with scores next to each speaker',()=>{
 const js=read('prototype/app.js'),css=read('prototype/pk-v064.css');
 assert.match(js,/pk-arena-v2 pk-arena-v3/);
 assert.match(js,/class="pk-side-score"/);
 assert.match(css,/\.pk-duel-side\{[^}]*background:transparent!important/);
 assert.match(css,/\.pk-score-line\{display:none!important/);
 assert.match(css,/\.pk-duel-seam\{[^}]*background:transparent!important/);
 assert.match(css,/\.pk-arena-v3\{[^}]*border:0!important/);
});
test('PK active has blended chat without introducing a members/chat tabs bar',()=>{
 const css=read('prototype/pk-v064.css'),html=read('prototype/app.js');
 assert.match(css,/\.cam-content\{/);
 assert.match(css,/\.room-chatbox\{/);
 assert.match(html,/data-action="roomAudience"/);
 assert.doesNotMatch(html,/Chat<\/button>.*Thành viên<\/button>.*Quản lý<\/button>/);
});
test('PK retains signed score semantics, explicit free-cheer disclosure and safe action',()=>{
 const js=read('prototype/app.js');
 assert.match(js,/TutttPKVisual\.evaluate\(scoreA,scoreB\)/);
 assert.match(js,/Điểm mẫu · Không phải tiền hay quà thật/);
 assert.match(js,/Điểm cổ vũ miễn phí/);
 assert.match(js,/pkDemoCheer/);
 assert.match(js,/class="pk-balance-bar" role="progressbar" aria-valuemin=/);
});
test('native PK has a single shared arena and manages PK from the shared room menu',()=>{
 const board=read('mobile/src/components/PKDuelBoard.tsx'),panel=read('mobile/src/components/PKPanel.tsx');
 assert.doesNotMatch(board,/onManage|•••/);
 assert.match(board,/onCheer/);
 assert.match(board,/Cổ vũ phe/);
 assert.match(board,/Không phải coin/);
 assert.match(board,/COLORS\.sideBAccent/);
 assert.match(panel,/!m&&!finished\?<View/);
 assert.match(panel,/optionsOpenRequest/);
 assert.match(read('mobile/src/screens/Screens.tsx'),/setSheet\('options'\)/);
});

'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('v0.6.7 result theme is last and all assets are served',()=>{
 assert.match(read('prototype/index.html'),/pk-v066\.css"[^]*pk-v067\.css"/);
 assert.match(read('server/index.js'),/\/pk-v067\.css/);
 assert.match(read('package.json'),/"version": "0.(?:7|8).\d+"/);
});
test('result requires matching server-confirmed ID, not a local clock guess',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/data\.recent\|\|\[\]\)\.find\(x=>x\.id===prev\.id && x\.status==='finished'\)/);
 assert.match(app,/if\(confirmed\)showPkFinish\(confirmed\)/);
 assert.match(app,/Đang chờ máy chủ xác nhận kết quả PK/);
});
test('demo result is distinguishable, includes replay, and never changes coin balances',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/Bản xem trước offline/);
 assert.match(app,/Thử hiệu ứng kết thúc trận/);
 assert.match(app,/state\.pkDemoFinished=true/);
 assert.match(app,/Không phải tiền hay quà thật|không phải coin|Không phải coin/);
 assert.doesNotMatch(app,/data-action="pkResultDismiss"/);
});
test('result remains part of unboxed stage and provides focus and reduced-motion safeguards',()=>{
 const css=read('prototype/pk-finish-v080.css');
 assert.match(css,/\.pk-end-presentation/);
 assert.match(css,/pk-outcome-flag/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/@media\(max-width:350px\)/);
});
test('native only shows verified result after an observed PK ends',()=>{
 const panel=read('mobile/src/components/PKPanel.tsx'),duel=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(panel,/lastActiveId\.current/);
 assert.match(panel,/result\.recent\.find\(x=>x\.id===lastActiveId\.current&&x\.status==='finished'\)/);
 assert.match(panel,/<PKDuelBoard key=\{'finish-'/);
 assert.doesNotMatch(panel,/<PKResultBoard/);
 assert.match(duel,/match\.winStreak/);
 assert.match(duel,/WIN/);
});
test('PK countdown demo depends on its actual start, not fixed three minutes',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/180000-\(Date\.now\(\)-state\.pkDemoStart\)/);
 assert.match(app,/if\(remaining<=0\)/);
 assert.match(app,/if\(!state\.connected&&state\.pkPreview&&!state\.pkDemoFinished\)/);
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Finish state overlays same stage with no separate result page or extra stage CTA',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/pk-end-presentation/);
 assert.match(app,/pk-outcome-flag/);
 assert.match(app,/pk-win-streak/);
 assert.match(app,/PK_FINISH_MS=3200/);
 assert.match(app,/data-action="pkDemoFinish"/); // present only in management sheet
 assert.doesNotMatch(app,/class="pk-header-result"|class="pk-demo-end"|pk-finale-actions/);
 assert.doesNotMatch(app,/function pkResultPanel/);
 assert.match(app,/if\(confirmed\)showPkFinish\(confirmed\)/);
 assert.match(app,/pkFinishTimer=setTimeout/);
 assert.match(app,/stage\.classList\.contains\('pk-end-presentation'\)/);
});
test('WIN, LOSS and DRAW presentation respects reduced motion and bounds visual overflow',()=>{
 const css=read('prototype/pk-finish-v080.css');
 for(const klass of ['pk-outcome-win','pk-outcome-loss','pk-outcome-draw','pk-win-streak','pkResultGrowV080','pkResultShrinkV080'])assert.ok(css.includes(klass),klass);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/visibility:hidden/);
 assert.match(read('prototype/index.html'),/pk-finish-v080\.css/);
 assert.match(read('server/index.js'),/'\/pk-finish-v080\.css'/);
});
test('Server alone increments and persists streak; client displays only returned values',()=>{
 const server=read('server/pk.js'),app=read('prototype/app.js'),native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(server,/streaks\[m\.roomA\]=winner==='A'\?a\+1:0/);
 assert.match(server,/if\(m\.status!=='active'\)return false/);
 assert.match(server,/winStreak:Number\.isInteger\(m\.winStreak\)/);
 assert.match(app,/Number\.isInteger\(m\.winStreak\)/);
 assert.match(native,/match\.winStreak/);
 assert.doesNotMatch(native,/PKResultBoard/);
 const panel=read('mobile/src/components/PKPanel.tsx');
 assert.match(panel,/!m&&!finished\?/);
 assert.match(panel,/setTimeout\(\(\)=>setFinished\(null\),3200\)/);
});

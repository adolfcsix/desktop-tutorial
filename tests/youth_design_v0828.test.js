const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const palette=read('mobile/src/theme/tokens.ts');
const css=read('prototype/styles.css');
const app=read('prototype/app.js');
test('2026 editorial palette is shared by web and native, not by a duplicate stylesheet',()=>{
 for(const c of ['#F8F2EB','#1B1719','#FFFCF7','#282124','#A9382B','#FFAE90']){
  assert.ok(css.includes(c),c+' missing on web');assert.ok(palette.includes(c),c+' missing in native');
 }
 assert.match(css,/html body:not\(\.light-mode\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(read('prototype/index.html'),/youth-design-v0828\.css/);
});
test('selected theme updates browser chrome and preserves the PK stage without remount',()=>{
 assert.match(app,/meta\.content=light\?'#F8F2EB':'#1B1719'/);
 assert.match(app,/Changing color must not replace any chat input, PK stage, local video or sheet/);
 assert.match(read('prototype/index.html'),/name="theme-color" content="#F8F2EB"/);
});
test('navigation and close controls support comfortable touch targets',()=>{
 assert.match(css,/\.nav-item\{min-height:54px/);
 assert.match(css,/\.icon-btn\{min-width:44px;min-height:44px\}/);
 assert.match(css,/\.close-btn\{background:var\(--y-raised\);color:var\(--y-ink\);min-width:44px;min-height:44px\}/);
 assert.match(read('mobile/src/components/Primitives.tsx'),/minHeight:56/);
});
test('PK outcome colors and demo-score constraints are preserved',()=>{
 assert.match(read('prototype/index.html'),/pk-finish-v080\.css/);
 assert.match(app,/pkDemoScoreA:1240,pkDemoScoreB:980/);
 assert.match(read('prototype/pk-finish-v080.css'),/pk-outcome-win/);
 assert.match(read('prototype/pk-finish-v080.css'),/pk-outcome-loss/);
});

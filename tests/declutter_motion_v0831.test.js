const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('PK uses no idle pulse, no decorative stage entrance, but speaking remains legible',()=>{
 const css=read('prototype/pk-v068.css');
 assert.doesNotMatch(css,/animation:pkLiveDot|animation:pkTimeUrgency|animation:pkSceneEnter|animation:pkSparkAppear/);
 assert.match(read('prototype/live-speaker-v057.css'),/is-speaking/);
 assert.doesNotMatch(read('prototype/pk-v069.css'),/pkFluidEntrance/);
 assert.match(read('mobile/src/screens/Screens.tsx'),/speaking\?3:1\.5/);
});
test('Confirmed PK numbers update in place without a count-up animation',()=>{
 const src=read('prototype/app.js');
 assert.match(src,/function animatePkScore\(node,next\)/);
 assert.match(src,/node.textContent=formatted/);
 assert.doesNotMatch(src,/pkScoreAnimations|requestAnimationFrame\(tick\)/);
 assert.match(src,/data-pk-balance/);
});
test('No manual reduce-motion button; accessibility preferences remain respected',()=>{
 const src=read('prototype/app.js');
 assert.doesNotMatch(src,/data-action="(reduceMotion|toggleMotion)"/);
 assert.match(read('prototype/pk-v068.css'),/prefers-reduced-motion:reduce/);
 assert.match(read('mobile/src/screens/Screens.tsx'),/AccessibilityInfo.isReduceMotionEnabled/);
});

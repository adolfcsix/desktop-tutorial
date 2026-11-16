'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('v0.6.8 motion stylesheet last in chain and served by server',()=>{
 const html=read('prototype/index.html');
 assert.match(html,/pk-v067\.css"[^]*pk-v068\.css"/);
 assert.match(read('server/index.js'),/\/pk-v068\.css/);
 assert.match(read('package.json'),/"version": "0.(?:7|8).\d+"/);
});
test('PK motion enhances, rather than blocks, content and respects reduced motion',()=>{
 const css=read('prototype/pk-v068.css');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.pk-cheer-fly/);
 assert.match(css,/@keyframes pkHeartRise/);
 assert.match(css,/\.pk-finale-mark/);
 assert.match(css,/\.pk-field-art/);
 assert.match(css,/\.pk-finale-art/);
 assert.doesNotMatch(css,/animation:pkLiveDot|animation:pkTimeUrgency|animation:pkSceneEnter/);
 assert.doesNotMatch(css, /position:fixed/);
});
test('PK cheer interaction uses temporary visual burst and does not fake points',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/state\.pkCheerBurstUntil=Date\.now\(\)\+900/);
 assert.match(app,/pk-heart-particle/);
 assert.match(app,/burstPkHearts\(\)/);
 assert.match(app,/state\.pkDemoScoreA\+=40/);
 assert.match(app,/pkDemoCheer/);
 assert.match(app,/Điểm cổ vũ miễn phí/);
 assert.match(app,/Chưa ghép video PK/);
 assert.match(app,/Chưa ghép âm thanh PK/);
});
test('finale is lively but server outcome is authoritative',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/m\.winner===key/);
 assert.match(app,/pk-outcome-flag/);
 assert.match(app,/data\.recent\|\|\[\]\)\.find/);
 assert.match(app,/pk-win-streak/);
 assert.doesNotMatch(app,/pk-finale-avatar/);
});
test('React Native receives stage and result entry animation without new libraries',()=>{
 const duel=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(duel,/Animated\.timing/);
 assert.match(duel,/winScale/);
 assert.match(duel,/useNativeDriver:true/);
 assert.match(duel,/isFinished/);
 assert.match(duel,/DRAW/);
});

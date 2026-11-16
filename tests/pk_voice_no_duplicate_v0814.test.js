const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=file=>readFileSync(join(__dirname,'..',file),'utf8');
test('Voice keeps exactly one visible pair of scores, in the rivalry rail',()=>{
 const app=read('prototype/app.js');
 const voice=app.split('`:`<div class="pk-duel-side')[1].split(' return `<section data-pk-leading')[0];
 assert.match(voice,/class="pk-voice-outcome-slot"/);
 assert.doesNotMatch(voice,/data-pk-score=|pk-side-score|ĐIỂM CỔ VŨ/);
 assert.match(app,/data-pk-points="A"/);
 assert.match(app,/data-pk-points="B"/);
 assert.match(app,/root\.querySelectorAll\('\[data-pk-points="A"\]'\)/);
});
test('Cam preserves its own video score and attached WIN/LOSS badge',()=>{
 const app=read('prototype/app.js');
 const cam=app.split('const side=(key,name,color)=>cam?`')[1].split('`:`<div class="pk-duel-side')[0];
 assert.match(cam,/class="pk-side-score"/);
 assert.match(cam,/pk-cam-finish-slot/);
});
test('Voice finish slot stays present in both phases, colorful, compact and keyboard-safe',()=>{
 const css=read('prototype/pk-finish-v080.css');
 assert.match(css,/pk-broadcast-voice \.pk-voice-outcome-slot\{/);
 assert.match(css,/pk-voice-outcome-slot>\.pk-outcome-flag\{/);
 assert.match(css,/--outcome-win:#AD711F/);
 assert.match(css,/--outcome-loss:#72529D/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/pk-broadcast-voice \.pk-side-score/);
});
test('Native voice only renders scoreboard scores at the bottom, not in the participant tiles',()=>{
 const rn=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(rn, /\{fmt\(match.scoreA\)\}/);
 assert.match(rn, /\{fmt\(match.scoreB\)\}/);
 assert.doesNotMatch(rn.slice(rn.indexOf(' return <Animated.View accessibilityLabel=',rn.indexOf("if(roomType==='cam')"))), /\{fmt\(side.score\)\}/);
 assert.match(rn, /resultTag\(side.key,'voice'\)/);
 assert.match(rn, /height:34,minHeight:34,width:'100%'/);
});

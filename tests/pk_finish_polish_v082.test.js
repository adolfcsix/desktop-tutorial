const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Cam PK finish badge belongs to score group rather than free-floating stage',()=>{
 const app=read('prototype/app.js'),css=read('prototype/pk-finish-v080.css');
 assert.match(app,/<span>Điểm cổ vũ<\/span>\$\{isEnding\?`<div class="pk-cam-finish-slot">\$\{outcomeBadge\(key\)\}<\/div>`:''\}<\/div>/);
 assert.match(css,/pk-broadcast-cam \.pk-cam-finish-slot\{[^}]*position:static!important/);
 assert.doesNotMatch(css,/pk-cam-finish-slot\{[^}]*top:138px/);
 assert.match(css,/pk-broadcast-cam \.pk-win-streak/);
});
test('Voice PK keeps a single shared numeric scoreboard and dedicates a stable WIN/LOSS row',()=>{
 const app=read('prototype/app.js'),css=read('prototype/pk-finish-v080.css');
 const voice=app.slice(app.indexOf('`:`<div class="pk-duel-side'),app.indexOf(' return `<section data-pk-leading'));
 assert.match(voice,/class="pk-voice-outcome-slot" data-pk-voice-outcome="\$\{key\}"/);
 assert.match(voice,/\$\{isEnding\?outcomeBadge\(key\):''\}/);
 assert.doesNotMatch(voice,/pk-side-score|data-pk-score|ĐIỂM CỔ VŨ/);
 assert.match(css,/pk-broadcast-voice \.pk-voice-outcome-slot\{[^}]*flex:0 0 34px/);
 assert.match(css,/pk-voice-outcome-slot>\.pk-outcome-flag\{[^}]*position:static!important/);
 assert.doesNotMatch(css,/pk-broadcast-voice \.pk-side-score/);
 assert.match(voice,/pk-voice-mic-mark/);
 assert.match(voice,/pk-media-label/);
 assert.match(css,/pkVoiceWinV082/);
 assert.match(css,/pkVoiceLossV082/);
});
test('Native Cam / Voice use aligned, timed labels without adding a result CTA',()=>{
 const native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(native,/resultTag\(side.key,'cam'\)/);
 assert.match(native,/resultTag\(side.key,'voice'\)/);
 assert.match(native, /height:34,minHeight:34,width:'100%'/);
 assert.doesNotMatch(native.slice(native.indexOf(' return <Animated.View accessibilityLabel=',native.indexOf("if(roomType==='cam')"))),/\{fmt\(side\.score\)\}/);
 assert.match(native,/inputRange:\[0,\.69,1\]/);
 assert.match(read('mobile/src/components/PKPanel.tsx'),/setTimeout\(\(\)=>setFinished\(null\),3200\)/);
});

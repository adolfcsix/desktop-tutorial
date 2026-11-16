'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const get=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('WIN and LOSS have distinct, surface-aware gold and purple palettes',()=>{
 const css=get('prototype/pk-finish-v080.css');
 assert.match(css,/--outcome-win:#F8D77E/);
 assert.match(css,/--outcome-loss:#F3EEFF/);
 assert.match(css,/body\.light-mode #app \.pk-end-presentation\.pk-broadcast-voice/);
 assert.match(css,/--outcome-win:#AD711F/);
 assert.match(css,/--outcome-loss:#72529D/);
 assert.match(css,/body:not\(\.light-mode\) #app \.pk-end-presentation\.pk-broadcast-voice/);
 assert.match(css,/\.pk-outcome-win strong\{/);
 assert.match(css,/\.pk-outcome-loss strong\{/);
 assert.match(css,/\.pk-win-streak\{/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('Voice arena reduces decorative framing but retains speaker evidence and result at score',()=>{
 const css=get('prototype/pk-voice-v077.css'),js=get('prototype/app.js');
 assert.match(css,/\.pk-person-ring::before\{display:none!important\}/);
 assert.match(css,/\.pk-side-top\{[^}]*border:0!important/);
 assert.match(css,/\.pk-voice-mic-mark\.is-speaking/);
 assert.match(js,/data-pk-score=/);
 assert.match(js,/pk-voice-mic-mark/);
 assert.match(js,/\$\{isEnding\?outcomeBadge\(key\):''\}/);
});
test('React Native uses the same outcome semantic colors without adding a new control',()=>{
 const rn=get('mobile/src/components/PKDuelBoard.tsx');
 assert.match(rn,/const wordColor=isWin\?/);
 assert.match(rn,/#F8D77E/);assert.match(rn,/#AD711F/);
 assert.match(rn,/#F3EEFF/);assert.match(rn,/#72529D/);
 assert.match(rn,/accessibilityLabel=\{label\}/);
 assert.match(rn,/inputRange:\[0,\.69,1\]/);
 assert.doesNotMatch(rn,/Xem kết quả trận PK minh họa/);
});

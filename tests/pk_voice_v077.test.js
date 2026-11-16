'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
test('v0.7.7 loads dedicated Voice-only stylesheet after the rivalry meter, serves it and names the build',()=>{
 const html=read('prototype/index.html');const server=read('server/index.js');const pkg=read('package.json');
 assert.ok(html.indexOf('pk-voice-v077.css')>html.indexOf('pk-meter-v076.css'));
 assert.match(server,/\/pk-voice-v077\.css/);assert.match(pkg,/"version": "0\.8\.\d+"/);
 assert.match(html,/<title>Túttt · [^<]* v0\.8\.\d+<\/title>/);
});
test('two Voice opponents have microphone disclosure; visual speaking feedback is tied to live state',()=>{
 const js=read('prototype/app.js');
 assert.match(js,/class="pk-voice-mic-mark/);
 assert.match(js,/ico\(mine!==key\?'headphones':localMic\?\.mic\?'mic':'micoff'\)/);
 assert.match(js,/mine===key&&localSpeaking\?'is-speaking'/);
 assert.match(js,/Chưa kết nối âm thanh/);
 assert.match(js,/Âm thanh minh họa/);
 assert.match(js,/Chủ phòng/);
});
test('Voice arena has one score summary, two named sides, score accessibility and a separate genuine Cam broadcast path',()=>{
 const js=read('prototype/app.js');const css=read('prototype/pk-voice-v077.css');
 for(const cls of ['pk-voice-kicker','pk-voice-footnote','pk-score-caption','pk-balance-legends']) assert.ok(js.includes(cls));
 assert.match(js,/pk-broadcast-cam':'pk-broadcast-voice'/);
 assert.match(js,/data-pk-balance/);
 assert.match(js,/data-pk-gap/);
 assert.match(css,/#app \.pk-broadcast-voice \.pk-score-line\{display:none!important\}/);
 assert.doesNotMatch(js,/pk-voice-meter-head/);
 assert.doesNotMatch(css,/animation\s*:\s*[^;]+infinite/);
});
test('Voice-specific CSS scopes and responsive reductions preserve chat and interactive control sizes',()=>{
 const css=read('prototype/pk-voice-v077.css');
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css, /@media\(min-width:351px\) and \(max-width:375px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.pk-scene-footer/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(css, /#app \.pk-broadcast-cam/);
});
test('native Voice uses dedicated two-panel stage with no unverified opponent video render',()=>{
 const tsx=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(tsx,/SO TÀI TRỰC TIẾP/);
 assert.match(tsx,/PHE CỦA BẠN/);
 assert.match(tsx,/Chưa kết nối âm thanh/);
 assert.match(tsx,/showVideo=Boolean\(local&&videoReady&&ownHost&&cameraPub\)/);
 assert.match(tsx,/localMedia\.mic==='speaking'/);
 assert.match(tsx,/localMedia\.mic!=='ready'/);
});

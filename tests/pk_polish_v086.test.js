'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const read=f=>readFileSync(join(__dirname,'..',f),'utf8');
test('The PK scoreboard shows actual points and never visible percentages',()=>{
 const app=read('prototype/app.js'),native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(app,/data-pk-points="A"/);assert.match(app,/data-pk-points="B"/);
 assert.match(app,/el\.textContent=a\.toLocaleString\('vi-VN'\)/);
 assert.match(app,/el\.textContent=b\.toLocaleString\('vi-VN'\)/);
 assert.doesNotMatch(app,/data-pk-percent/);
 assert.match(native,/\{fmt\(match\.scoreA\)\}/);
 assert.match(native,/\{fmt\(match\.scoreB\)\}/);
 // Ratios remain necessary for the position of the bar and assistive technology.
 assert.match(app,/aria-valuenow="\$\{score\.leftPct\}"/);
});
test('One takeover animation comes from confirmed point changes, survives a tie, and honors reduced motion',()=>{
 const app=read('prototype/app.js'),meter=read('prototype/pk-meter-v076.css'),native=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(app,/lastLead=root\.dataset\.pkLastDecidedLeader\|\|root\.dataset\.pkLeading/);
 assert.match(app,/if\(incomingLead!=='tie'\)root\.dataset\.pkLastDecidedLeader=incomingLead/);
 assert.match(app,/root\.classList\.add\('pk-lead-switch'\)/);
 assert.match(meter,/@keyframes tutttPkTakeoverV086/);
 assert.match(meter,/prefers-reduced-motion:reduce/);
 assert.match(native,/lastDecidedLeader=useRef\(leader\)/);
 assert.match(native,/markerPulse=useRef\(new Animated\.Value\(1\)\)/);
 assert.match(native,/if\(!reduced\)Animated\.sequence/);
});
test('WIN/LOSS retain their theme aware colors and Voice keeps room geometry stable',()=>{
 const css=read('prototype/pk-finish-v080.css'),voice=read('prototype/pk-voice-v077.css');
 assert.match(css,/--outcome-win:#F8D77E/);
 assert.match(css,/--outcome-loss:#F3EEFF/);
 assert.match(css,/pk-end-presentation\.pk-broadcast-voice \.pk-score-caption/);
 assert.match(css,/visibility:hidden!important/);
 assert.match(css,/font-size:clamp\(21px,5\.9vw,25px\)!important/);
 assert.match(voice,/pk-person-ring\.pk-host-speaking/);
 assert.match(voice,/rgba\(46,169,118/);
});

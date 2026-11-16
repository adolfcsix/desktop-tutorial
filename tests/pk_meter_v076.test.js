'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const visual=require('../prototype/pk-visual-ux.js');

test('v0.7.6 rivalry meter stylesheet loads after older PK rules, also allowed by the server',()=>{
 const html=read('prototype/index.html'),server=read('server/index.js');
 assert.ok(html.indexOf('pk-meter-v076.css')>html.indexOf('live-polish-v075.css'));
 assert.match(server,/\/pk-meter-v076\.css/);
 assert.match(html,/<title>Túttt · [^<]* v0\.8\.\d+<\/title>/);
 assert.match(read('package.json'),/"version": "0\.8\.\d+"/);
});
test('duel meter uses two differentiated team colors, visible seam, and no infinite motion',()=>{
 const css=read('prototype/pk-meter-v076.css');
 for(const cls of ['.pk-balance-legends','.pk-balance-bar','.pk-balance-a','.pk-balance-pin','.pk-balance-ticks']) assert.ok(css.includes(cls),cls);
 assert.match(css,/linear-gradient\(90deg,var\(--pk-meter-scarlet-deep\),var\(--pk-meter-scarlet-light\)\)/);
 assert.match(css,/linear-gradient\(90deg,var\(--pk-meter-gold-deep\),var\(--pk-meter-gold-light\)\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/animation\s*:\s*[^;]*infinite/);
});
test('progressbar renders localized team POINTS (no visible percentages) and moves based on score ratios',()=>{
 const js=read('prototype/app.js');
 assert.match(js,/role="progressbar" aria-valuemin="0" aria-valuemax="100"/);
 assert.match(js,/data-pk-points="A"/);
 assert.match(js,/data-pk-points="B"/);
 assert.match(js,/data-pk-gap/);
 assert.match(js,/bar\.setAttribute\('aria-valuenow',String\(ratio\.leftPct\)\)/);
 assert.match(js,/el\.textContent=b\.toLocaleString\('vi-VN'\)/);
 assert.match(js,/el\.textContent=a\.toLocaleString\('vi-VN'\)/);
 assert.match(js,/Math\.max\(3,Math\.min\(97,ratio\.leftPct\)\)/);
});
test('the 0–100 team-share extremes do not invent additional score',()=>{
 assert.deepEqual([visual.evaluate(0,0).leftPct,visual.evaluate(0,20).leftPct,visual.evaluate(40,0).leftPct],[50,0,100]);
 assert.equal(visual.evaluate(1240,980).leftPct,56);
 assert.equal(visual.evaluate(1280,980).leftPct,57);
});
test('Cam keeps score rail above media; Voice shows two point totals and readable difference',()=>{
 const css=read('prototype/pk-meter-v076.css');
 assert.match(css,/pk-broadcast-cam \.pk-balance-legends,[^]*pk-broadcast-cam \.pk-score-caption\{display:none!important\}/);
 assert.match(css,/pk-broadcast-cam \.pk-side-top\{top:76px!important\}/);
 assert.match(css,/pk-broadcast-cam \.pk-side-score\{top:98px!important\}/);
 const rn=read('mobile/src/components/PKDuelBoard.tsx');
 assert.match(rn,/const scoreRail=\(compact:boolean\)=>/);
 assert.match(rn,/\{scoreRail\(true\)\}/);
 assert.match(rn,/\{scoreRail\(false\)\}/);
 assert.match(rn,/accessibilityValue=\{\{min:0,max:100,now:share\}\}/);
 assert.match(rn,/barProgress\.interpolate/);
});

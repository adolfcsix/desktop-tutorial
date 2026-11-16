'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
test('v0.6.9 adds final motion rules and serves them via explicit static allowlist',()=>{
  const html=read('prototype/index.html');
  assert.match(html,/pk-v068\.css"[^]*pk-v069\.css"/);
  assert.match(read('server/index.js'),/\/pk-v069\.css/);
  assert.match(read('package.json'),/"version": "0.(?:7|8).\d+"/);
});
test('demo cheering patches the existing stage rather than re-mounting the page',()=>{
  const code=read('prototype/app.js');
  assert.match(code,/if\(updatePkArenaNumbers\(state\.pkDemoScoreA,state\.pkDemoScoreB,true\)\)return;/);
  assert.match(code,/root\.querySelectorAll\('\[data-pk-score="A"\]'\)/);
  assert.match(code,/root\.querySelectorAll\('\[data-pk-score="B"\]'\)/);
  assert.match(code,/pkCheerBurstUntil=Date\.now\(\)\+900/);
  assert.doesNotMatch(code,/requestAnimationFrame\(tick\)/);
  assert.match(code,/node.textContent=formatted/);
});
test('repeated backend score sync reuses stage only for same battle and no modal',()=>{
  const code=read('prototype/app.js');
  assert.match(code,/prev && data\.match && prev\.id===data\.match\.id && !state\.modal/);
  assert.match(code,/updatePkArenaNumbers\(data\.match\.scoreA,data\.match\.scoreB\)/);
  assert.match(code,/if\(confirmed\)showPkFinish\(confirmed\)/);
});
test('score updates keep textual and assistive leader, sides and progress bar in sync',()=>{
  const code=read('prototype/app.js');
  for(const token of ['data-pk-score="${key}"','data-pk-leader','data-pk-balance','bar.setAttribute(\'aria-label\'','el.setAttribute(\'aria-label\''])assert.ok(code.includes(token),token);
  assert.match(code,/ratio\.leftPct\+'%'/);
  assert.match(code,/\.toLocaleString\('vi-VN'\)/);
});
test('PK motion uses transform/opacity and reduced-motion, no infinite decorative animation',()=>{
  const css=read('prototype/pk-v069.css');
  assert.match(css,/cubic-bezier\(\.22,1,\.36,1\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/font-variant-numeric:tabular-nums/);
  assert.doesNotMatch(css,/infinite|filter:\s*blur\(/);
});
test('native progress responds to new scores instead of recreating the stage per clock tick',()=>{
  const source=read('mobile/src/components/PKDuelBoard.tsx');
  assert.match(source,/const barProgress=useRef\(new Animated\.Value\(share\)\)\.current/);
  assert.match(source,/\},\[barProgress,share\]\)/);
  assert.match(source,/useNativeDriver:false/);
  assert.match(source,/isReduceMotionEnabled/);
  assert.match(source,/width:barProgress\.interpolate/);
});

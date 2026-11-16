'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const source=JSON.parse(read('brand/pk-color-system.json')).palettes;
const css=read('prototype/pk-colors.generated.css');
const ts=read('mobile/src/theme/pkColors.ts');
const webArena=read('prototype/pk-v062.css');
const webApp=read('prototype/app.js');
const board=read('mobile/src/components/PKDuelBoard.tsx');
const contrast=(fg,bg)=>{
 const lum=x=>{const rgb=[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
 const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};
test('both themes share one canonical palette, PK palette generator and served web CSS',()=>{
 assert.equal(Object.keys(source.light).join(','),Object.keys(source.dark).join(','));
 assert.match(read('prototype/index.html'),/pk-colors\.generated\.css/);
 assert.match(read('server/index.js'),/pk-colors\.generated\.css/);
 const {spawnSync}=require('node:child_process');
 const run=spawnSync('node',['scripts/build-pk-colors.js','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});
test('PK web+native use coral/champagne and do not use teal as a team identity',()=>{
 assert.match(webApp,/side\('B',b,'champagne'\)/);
 assert.doesNotMatch(webApp,/side\('B',b,'teal'\)/);
 assert.match(webArena,/--pk-side-b-accent/);
 assert.match(board,/COLORS\.sideBAccent/);
 assert.match(board,/PK_COLORS/);
 for (const val of ['#87D0C1','#9BDBCC','#98DACA','#91D6C7','#6EB0A4']){
  assert.ok(!webArena.includes(val)&&!board.includes(val),`Legacy teal ${val} found in active PK`);
 }
});
test('PK theme has readable text/avatar/score contrasts',()=>{
 for(const [mode,p] of Object.entries(source)){
  for(const [fg,bg,kind] of [
   [p.ink,p.stage,'body'],[p.muted,p.stage,'secondary'],
   [p.sideAAccent,p.sideABg,'side A'],[p.sideBAccent,p.sideBBg,'side B'],
   [p.sideAAvatarInk,p.sideAAvatar,'avatar A'],[p.sideBAvatarInk,p.sideBAvatar,'avatar B'],
   [p.cheerInk,p.cheerBg,'CTA'],
  ]) assert.ok(contrast(fg,bg)>=4.5,`${mode} ${kind} contrast ${contrast(fg,bg).toFixed(2)}:1`);
 }
});
test('PK speaker indicator has a separate hue; browser arena renders as color-token based surface',()=>{
 assert.equal(source.light.speaking,source.dark.speaking);
 assert.notEqual(source.light.speaking,source.light.sideBAccent);
 assert.match(webArena,/var\(--pk-stage\)/);
 assert.match(webArena,/var\(--pk-bar-b\)/);
 assert.match(board,/palette:\s*Palette/);
 assert.match(read('mobile/src/components/PKPanel.tsx'),/palette=\{c\}/);
});
test('primary PK launcher button remains readable in both modes',()=>{
 for(const [mode,p] of Object.entries(source)){
  assert.ok(contrast(p.launcherInk,p.launcherBg)>=4.5,`${mode} launcher ratio ${contrast(p.launcherInk,p.launcherBg)}`);
 }
 assert.match(read('prototype/pk-v060.css'),/background:var\(--pk-launcher-bg\)/);
 assert.match(read('mobile/src/components/PKPanel.tsx'),/matchTheme\.launcherBg/);
});

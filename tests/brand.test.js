const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const png=fs.readFileSync(path.join(root,'brand/approved/tuttt-approved-cropped.png'));
test('approved logo cropped asset is reused unchanged in web and native',()=>{
 for(const f of ['prototype/assets/tuttt-logo.png','mobile/assets/tuttt-logo.png'])
  assert.ok(fs.readFileSync(path.join(root,f)).equals(png),f);
});
test('approved original PNG remains archived without modification',()=>{
 const original=fs.readFileSync(path.join(root,'brand/approved/tuttt-approved-master.png'));
 assert.equal(require('node:crypto').createHash('sha256').update(original).digest('hex'),
          'a06d83fa1b2c1f55a639bdac0758312e3107ecfdfb7604ed2b33506ecb69d0ab');
});
test('header uses alpha logo without a cream image slab',()=>{
 const html=fs.readFileSync(path.join(root,'prototype/index.html'),'utf8');
 const web=fs.readFileSync(path.join(root,'prototype/app.js'),'utf8');
 const native=fs.readFileSync(path.join(root,'mobile/src/components/Primitives.tsx'),'utf8');
 assert.match(html,/assets\/tuttt-logo\.png/);assert.match(web,/assets\/tuttt-logo\.png/);
 assert.match(native,/assets\/tuttt-logo\.png/);
 assert.doesNotMatch(web,/brand-paper-header.*logo-original\.jpeg/);
});
test('themes and dynamic header background exist for web and native',()=>{
 const css=fs.readFileSync(path.join(root,'prototype/brand-v048.css'),'utf8');
 const tokens=fs.readFileSync(path.join(root,'mobile/src/theme/tokens.ts'),'utf8');
 const native=fs.readFileSync(path.join(root,'mobile/src/components/Primitives.tsx'),'utf8');
 assert.match(css,/body:not\(\.light-mode\)/);assert.match(css,/--brand-accent/);
 assert.match(tokens,/bg:'#1B1719'/);assert.match(tokens,/bg:'#F8F2EB'/);
 assert.match(native,/backgroundColor:c.bg/);
});
test('Expo launcher and splash assets are configured',()=>{
 const app=require(path.join(root,'mobile/app.json')).expo;
 for(const asset of [app.icon,app.splash.image,app.android.adaptiveIcon.foregroundImage])
  assert.ok(fs.existsSync(path.join(root,'mobile',asset)),asset);
});
test('static server explicitly exposes the approved logo and the new stylesheet',()=>{
 const server=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
 assert.match(server,/assets\/tuttt-logo\.png/);
 assert.match(server,/brand-v048\.css/);
});

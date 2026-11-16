'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=p=>fs.readFileSync(path.join(root,p),'utf8');

test('the app header and status bar follow one selected palette, with approved source logo unchanged',()=>{
 const css=source('prototype/styles.css');
 const html=source('prototype/app.js');
 assert.match(css,/body \.statusbar,body \.app-header\{background:var\(--app-head\)/);
 assert.match(css,/body:not\(\.light-mode\)\{\s*--app-screen:#1D1918/);
 assert.match(css,/body\.light-mode\{\s*--app-screen:#F7F1E5/);
 assert.match(html,/assets\/tuttt-logo\.png/);
});
test('featured card is bright in Ivory and dark in Espresso with readable contextual text',()=>{
 const css=source('prototype/styles.css');const html=source('prototype/app.js');
 assert.match(css,/body\.light-mode \.hero-room\{[\s\S]*?background:linear-gradient\(135deg,#FFF8EF/);
 assert.match(css,/body\.light-mode \.hero-room \.featured-kicker\{color:#8E372B\}/);
 assert.match(css,/body:not\(\.light-mode\) \.hero-room\{background:linear-gradient\(135deg,#4E2C27/);
 assert.match(html,/class="featured-kicker"/);
});
test('theme choices are independent, accessible and have one explicit selected value',()=>{
 const html=source('prototype/app.js');const screen=source('mobile/src/screens/Screens.tsx');
 assert.match(html,/data-action="setTheme" data-id="light" aria-pressed=/);
 assert.match(html,/data-action="setTheme" data-id="dark" aria-pressed=/);
 assert.match(html,/action==='setTheme'&&\(id==='light'\|\|id==='dark'\)/);
 assert.match(screen,/accessibilityRole="radiogroup"/);
 assert.match(screen,/accessibilityState=\{\{checked:\(scheme==='light'\)===isLight\}\}/);
});
test('native non-PK voice arena and discovery cards use theme-appropriate surfaces',()=>{
 const s=source('mobile/src/screens/Screens.tsx');
 assert.match(s,/!isCam&&!pkActive\?<View style=\{\{backgroundColor:c\.surfaceAlt/);
 assert.match(s,/backgroundColor:ivory\?'#F6E1D0':c\.hero/);
 assert.match(s,/color:ivory\?'#32231E':'#FFF5EC'/);
});
test('standalone builder replaces runtime JS logo paths as well as original HTML tags',()=>{
 const builder=source('scripts/build_standalone_preview.py');
 assert.match(builder,/html=html\.replace\('assets\/tuttt-logo\.png',logo_data_uri\)/);
 assert.match(builder,/assert 'assets\/tuttt-logo\.png' not in html/);
});

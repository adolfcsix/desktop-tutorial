'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
function luminance(hex){const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('Native and web share a consistent five-action nav without platform font glyphs',()=>{
 const native=read('mobile/src/components/Primitives.tsx');const web=read('prototype/app.js');
 assert.match(native,/export function TabGlyph/);
 for(const id of ['discover','live','create','chat','profile'])assert.ok(native.includes("name==='"+id+"'")||native.includes("['"+id+"'"),id);
 assert.doesNotMatch(native,/\['discover','Khám phá','⌖'\]/);
 assert.match(web,/aria-current="\$\{state\.tab===id/);
 assert.match(native,/accessibilityRole="tab"/);
});
test('Primary coral CTA has readable foreground in both themes',()=>{
 const src=read('mobile/src/components/Primitives.tsx');
 const tokens=read('mobile/src/theme/tokens.ts');
 assert.match(src,/c\.onAccent/);
 assert.match(tokens,/onAccent:'#2D211D'/);
 assert.match(tokens,/onAccent:'#FFF5EA'/);
 assert.ok(contrast('#2D211D','#FFAE90')>=4.5,'Espresso CTA contrast must be >=4.5');
 assert.ok(contrast('#FFF5EA','#A9382B')>=4.5,'Ivory CTA contrast must be >=4.5');
});
test('Legibility, touch feedback and reduced motion use the existing stylesheet',()=>{
 const css=read('prototype/styles.css');const html=read('prototype/index.html');
 assert.match(css,/v0\.8\.29 — Single-source interaction/);
 assert.match(css,/body \.room-info \.room-desc\{font-size:12px/);
 assert.match(css,/body \.text-btn\{min-height:var\(--y-tap\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(html,/interface-polish-v0829\.css/);
});
test('Room cards use readable title and description on Native',()=>{
 const screens=read('mobile/src/screens/Screens.tsx');
 const start=screens.indexOf('export function RoomRow('),end=screens.indexOf('export function DiscoverScreen(',start);
 const card=screens.slice(start,end);
 assert.match(card,/size=\{14\} bold/);
 assert.match(card,/size=\{12\} style=\{\{color:c\.muted/);
});

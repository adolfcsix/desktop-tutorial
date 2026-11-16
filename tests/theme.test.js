const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../prototype/brand-v048.css'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../mobile/src/theme/tokens.ts'),'utf8');
const channel=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const luminance=hex=>{const p=[1,3,5].map(i=>channel(parseInt(hex.slice(i,i+2),16)));return .2126*p[0]+.7152*p[1]+.0722*p[2]};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
test('light and dark body text meet 4.5:1 contrast targets',()=>{
 for(const [fg,bg] of [['#241B1C','#F4EAE0'],['#6B5753','#F4EAE0'],['#FFF2E6','#1F1819'],['#D4BDB1','#1F1819']]){
   assert.ok(ratio(fg,bg)>=4.5,`${fg} on ${bg}: ${ratio(fg,bg).toFixed(2)}:1`);
 }
});
test('primary brand red accents have readable contrast against theme backgrounds',()=>{
 for(const [fg,bg] of [['#B23B2D','#F4EAE0'],['#FF9E86','#1F1819']]){
  assert.ok(ratio(fg,bg)>=4.5,`${fg} on ${bg}: ${ratio(fg,bg).toFixed(2)}:1`)
 }
});
test('React Native and web use the 2026 editorial primary surfaces',()=>{
 const web=fs.readFileSync(path.join(__dirname,'../prototype/styles.css'),'utf8');
 for(const h of ['#F8F2EB','#1B1719','#FFFCF7','#282124']){
  assert.ok(web.includes(h),'web surface '+h);
  assert.ok(native.includes(h),'native surface '+h);
 }
 for(const [fg,bg] of [['#2D211D','#F8F2EB'],['#65534C','#F8F2EB'],['#FFF3E9','#1B1719'],['#D9C2B7','#1B1719'],['#A9382B','#F8F2EB'],['#FFAE90','#1B1719']])
  assert.ok(ratio(fg,bg)>=4.5,`${fg}/${bg}: ${ratio(fg,bg).toFixed(2)}`);
});

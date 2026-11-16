const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const web=readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
const native=readFileSync(path.join(__dirname,'../mobile/src/screens/Screens.tsx'),'utf8');
const header=readFileSync(path.join(__dirname,'../mobile/src/components/Primitives.tsx'),'utf8');
const app=readFileSync(path.join(__dirname,'../mobile/App.tsx'),'utf8');
const css=readFileSync(path.join(__dirname,'../prototype/styles.css'),'utf8');
test('Only navigation create action on Live page',()=>{
 assert.doesNotMatch(web,/data-action="create" aria-label="Tạo phòng Live"/);
 assert.doesNotMatch(native,/onPress=\{onCreate\} accessibilityLabel="Tạo phòng"/);
 assert.match(web,/\['create','Tạo','plus'\]/);
 assert.match(header,/\['create','Tạo'\]/);
});
test('No fake notification badge or inert preference',()=>{
 assert.doesNotMatch(web,/data-action="notifications"|data-action="notifyToggle"|state\.notify/);
 assert.match(web,/state\.tab==='live'\?'':/);
 assert.doesNotMatch(header,/onBell|🔔|accessibilityLabel="Thông báo"/);
 assert.doesNotMatch(app,/<Header c=\{c\} onBell=/);
});
test('No user-facing motion toggle; OS accessibility is retained',()=>{
 assert.doesNotMatch(web,/data-action="(?:reduceMotion|toggleMotion|motionToggle)"|Giảm chuyển động/);
 assert.match(css,/prefers-reduced-motion:\s*reduce/);
 assert.match(native,/AccessibilityInfo\.isReduceMotionEnabled/);
});

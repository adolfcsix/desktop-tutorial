'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {selectSeats,layout}=require('../prototype/stage-layout');
const root=path.join(__dirname,'..');
test('preserves host first even if host is briefly absent from presence',()=>{
 const roster={hostId:'host',members:[{id:'a',name:'A',speaker:true,role:'listener'}]};
 const s=selectSeats(roster,'Host');assert.equal(s.length,2);assert.equal(s[0].id,'host');assert.equal(s[0].reserved,true);
});
test('non-speakers excluded and stage never exceeds six',()=>{
 const roster={hostId:'h',members:[{id:'h',name:'Host',role:'host',speaker:true},...Array.from({length:10},(_,i)=>({id:String(i),name:'Guest',speaker:i!==4,role:'listener'}))]};
 const seats=selectSeats(roster,'Host');assert.equal(seats.length,6);assert(!seats.some(m=>m.id==='4'));
});
test('adaptive grid uses one to six granted seats, empties hidden by default',()=>{
 for(let n=1;n<=6;n++){
   const people=Array.from({length:n},(_,i)=>({id:String(i)}));
   const grid=layout(people,null);assert.equal(grid.visible.length,n);assert.equal(grid.empty,6-n);
   const expanded=layout(people,null,true);assert.equal(expanded.visible.length,6);
   assert.equal(expanded.visible.filter(Boolean).length,n);
 }
});
test('pin is allowed only for a member currently on stage and only with 2+ people',()=>{
 const people=[{id:'a'},{id:'b'}];assert.equal(layout(people,'b').pin,'b');
 assert.equal(layout(people,'ghost').pin,null);assert.equal(layout([{id:'a'}],'a').pin,null);
});
test('web and static server provide adaptive stage controls without faking active-speaker labels',()=>{
 const app=fs.readFileSync(path.join(root,'prototype/app.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'prototype/live-stage-v054.css'),'utf8');
 const server=fs.readFileSync(path.join(root,'server/index.js'),'utf8');
 assert.match(app,/data-action="pinCam"/);assert.doesNotMatch(app,/data-action="toggleVacantCams"/);
 assert.match(app,/minh họa/);assert.match(css,/cam-layout-pinned/);
 assert.match(server,/live-stage-v054\.css/);assert.match(server,/stage-layout\.js/);
});

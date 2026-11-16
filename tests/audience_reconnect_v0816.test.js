'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../prototype/audience-presence.js'),'utf8');
const ctx={window:{},Date};vm.runInNewContext(src,ctx);const audience=ctx.window.TutttAudiencePresence;
const snapshot={roomId:'a',count:2,members:[{id:'h',name:'Host',onStage:true},{id:'v',name:'Người xem',onStage:false}]};
const base={connected:true,online:true,roomId:'a',snapshot,updatedAt:1000,failed:false,now:2000,demoCount:84};
test('room presence is verified only while the snapshot is current and belongs to the current room',()=>{
 assert.equal(audience.view(base).count,2);
 assert.equal(audience.view({...base,roomId:'b'}).count,'…');
 assert.equal(audience.view({...base,online:false}).status,'reconnecting');
 assert.equal(audience.view({...base,failed:true}).status,'unavailable');
 assert.equal(audience.view({...base,now:1000+audience.MAX_AGE_MS+1}).status,'syncing');
 assert.equal(audience.view({...base,updatedAt:0}).verified,false);
 assert.equal(audience.view({...base,snapshot:{...snapshot,count:99}}).verified,false);
 assert.equal(audience.view({...base,connected:false}).status,'demo');
 assert.equal(audience.view({...base,connected:false}).count,84);
});
test('reconnection, SSE error and changing room never expose a stale audience as online',()=>{
 const app=fs.readFileSync(require('node:path').join(__dirname,'../prototype/app.js'),'utf8');
 const native=fs.readFileSync(require('node:path').join(__dirname,'../mobile/src/screens/Screens.tsx'),'utf8');
 assert.match(app,/state\.online=false;audienceRequestSeq\+\+;state\.audienceUpdatedAt=0/);
 assert.match(app,/if\(state\.page!=='room'\)render\(\);\s*else syncAudienceDom\(\)/);
 assert.match(app,/body\.dataset\.audienceSignature!==signature/);
 assert.match(native,/const audienceVerified=Boolean\(realChat/);
 assert.match(native,/realChat&&audienceVerified&&audience\?\.roomId===r\.id/);
 assert.match(native,/AppState\.addEventListener\('change'/);
});

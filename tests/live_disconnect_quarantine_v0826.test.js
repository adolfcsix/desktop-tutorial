'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Stage}=require('../server/stage');
function controlled(){
 const user={id:randomUUID(),name:'Viewer'},id=randomUUID();
 const room={id,hostId:user.id,type:'voice'};
 const store={db:{},presence:new Map([[id,new Map([[user.id,Date.now()+120000]])]]),getRoom:()=>room};
 let remove=async()=>{throw Error('downstream sensitive error');};let removes=0;
 const bridge={enabled:true,requireConfigured(){},token:()=>({serverUrl:'wss://example.test',token:'safe-test'}),remove:(...args)=>{removes++;return remove(...args);}};
 const stage=new Stage(store,bridge);
 return {stage,user,id,change(fn){remove=fn;},get removes(){return removes;}};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('failed SFU revocation quarantines identity until an authenticated retry succeeds',async()=>{
 const s=controlled();s.stage.enter(s.user,s.id);
 assert.deepEqual(await s.stage.exit(s.user,s.id),{left:true,mediaDisconnectPending:true});
 assert.equal(s.stage.data(s.id).members.size,0);
 assert.throws(()=>s.stage.enter(s.user,s.id),e=>e?.status===409);
 await assert.rejects(s.stage.reconcileDisconnect(s.user,s.id),e=>e?.status===409&&!/sensitive/.test(e.message));
 assert.throws(()=>s.stage.enter(s.user,s.id),e=>e?.status===409);
 s.change(async()=>{});
 await s.stage.reconcileDisconnect(s.user,s.id);
 assert.equal(s.stage.unconfirmedDisconnects.size,0);
 assert.equal(s.stage.enter(s.user,s.id).roster.members.length,1);
});

test('two SFU reconciliation attempts for one participant share a single remote removal',async()=>{
 const s=controlled();s.stage.enter(s.user,s.id);await s.stage.exit(s.user,s.id);
 const hold=deferred();s.change(()=>hold.promise);
 const before=s.removes;
 const a=s.stage.reconcileDisconnect(s.user,s.id),b=s.stage.reconcileDisconnect(s.user,s.id);
 await Promise.resolve();
 assert.equal(s.removes,before+1);
 assert.throws(()=>s.stage.enter(s.user,s.id),e=>e?.status===409);
 hold.resolve();await Promise.all([a,b]);
 assert.equal(s.stage.enter(s.user,s.id).roster.members.length,1);
});

test('repeated leave without a member preserves the unconfirmed media warning',async()=>{
 const s=controlled();s.stage.enter(s.user,s.id);await s.stage.exit(s.user,s.id);
 assert.deepEqual(await s.stage.exit(s.user,s.id),{left:true,mediaDisconnectPending:true});
 assert.throws(()=>s.stage.enter(s.user,s.id),e=>e?.status===409);
});

test('a confirmed SFU removal can be followed by a normal rejoin without extra probe',async()=>{
 const s=controlled();s.change(async()=>{});s.stage.enter(s.user,s.id);
 assert.equal((await s.stage.exit(s.user,s.id)).mediaDisconnectPending,false);
 assert.equal(s.stage.enter(s.user,s.id).roster.members.length,1);
 assert.equal(s.removes,1);
});

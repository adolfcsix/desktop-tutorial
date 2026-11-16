'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Stage}=require('../server/stage');
const {randomUUID}=require('node:crypto');

function setup(remove){
 const roomId=randomUUID();
 const user={id:randomUUID(),name:'Minh'};
 const room={id:roomId,hostId:user.id,type:'voice'};
 const presence=new Map([[roomId,new Map([[user.id,Date.now()+180_000]])]]);
 const store={db:{},presence,getRoom:id=>{assert.equal(id,roomId);return room;}};
 const bridge={enabled:true,requireConfigured(){},token:()=>({serverUrl:'ws://test',token:'test'}),remove};
 const events=[];const stage=new Stage(store,bridge,{emit:(e,id)=>events.push([e,id])});
 return {stage,user,roomId,events};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('leaving when SFU rejects still removes local roster, pending requests, and invitations without claiming media disconnected',async()=>{
 const {stage,user,roomId,events}=setup(async()=>{throw Error('SFU offline — do not expose');});
 stage.enter(user,roomId);
 const d=stage.data(roomId);d.requests.add(user.id);d.invitations.set('invite',{fromId:user.id,toId:'somebody'});
 const result=await stage.exit(user,roomId);
 assert.deepEqual(result,{left:true,mediaDisconnectPending:true});
 assert.equal(d.members.has(user.id),false);
 assert.equal(d.requests.has(user.id),false);
 assert.equal(d.invitations.size,0);
 assert.ok(events.some(([event])=>event==='stage.changed'));
 assert.doesNotMatch(JSON.stringify(result),/SFU offline/);
 // Never mint another token while a failed SFU revocation is unconfirmed.
 assert.throws(()=>stage.enter(user,roomId),error=>error?.status===409);
 await assert.rejects(stage.reconcileDisconnect(user,roomId),error=>error?.status===409);
 assert.throws(()=>stage.enter(user,roomId),error=>error?.status===409);
});

test('deduplicates leave and rejects re-entry while SFU removal is pending, then permits normal re-entry',async()=>{
 const pause=deferred();let calls=0;
 const {stage,user,roomId}=setup(async()=>{calls++;await pause.promise;});
 stage.enter(user,roomId);
 const first=stage.exit(user,roomId),second=stage.exit(user,roomId);
 assert.strictEqual(first,second,'the two exit requests must use the exact same promise');
 assert.throws(()=>stage.enter(user,roomId),error=>error?.status===409);
 pause.resolve();
 assert.deepEqual(await first,{left:true,mediaDisconnectPending:false});
 assert.equal(calls,1);
 assert.equal(stage.data(roomId).members.has(user.id),false);
 assert.equal(stage.enter(user,roomId).roster.members.length,1);
});

test('an already-left participant does not trigger another SFU removal',async()=>{
 let calls=0;const {stage,user,roomId}=setup(async()=>{calls++;});
 assert.deepEqual(await stage.exit(user,roomId),{left:true,mediaDisconnectPending:false});
 assert.equal(calls,0);
 stage.enter(user,roomId);
 assert.equal((await stage.exit(user,roomId)).mediaDisconnectPending,false);
 assert.equal(calls,1);
});

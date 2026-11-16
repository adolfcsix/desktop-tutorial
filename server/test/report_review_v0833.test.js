'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'tuttt-review-'));
process.env.TUTTT_DATA_FILE=path.join(work,'data.json');
const secret='local-test-review-key-do-not-use-in-production-2026';
process.env.TUTTT_REPORT_REVIEW_KEY=secret;
const {server}=require('../index');const {Store}=require('../storage');
let base,host,viewer,roomId,reportId;
const req=async(route,method='GET',payload,headers={})=>{
 const res=await fetch(base+route,{method,headers:{...headers,...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});
 return {status:res.status,body:await res.json()};
};
before(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(work,{recursive:true,force:true});});
test('report receipt is idempotent and the reporter can only inspect own state',async()=>{
 const h=await req('/api/session','POST',{name:'Host'});host=h.body.user;const hostCookie=h.body.token;
 // Browser guest sessions receive HttpOnly cookies instead of a JS token.
 const other=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Người báo cáo'})});
 viewer=other.headers.get('set-cookie').split(';')[0];
 const hostSession=await fetch(base+'/api/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Chủ khác'})});
 const ownerCookie=hostSession.headers.get('set-cookie').split(';')[0];
 const created=await req('/api/rooms','POST',{title:'Phòng tiếp nhận báo cáo',tag:'Tâm sự'},{cookie:ownerCookie});roomId=created.body.room.id;
 const first=await req('/api/reports','POST',{roomId,reason:'Có tin nhắn xúc phạm trong phòng'}, {cookie:viewer});
 assert.equal(first.status,201);assert.equal(first.body.status,'open');assert.equal(first.body.duplicate,false);reportId=first.body.reportId;
 const second=await req('/api/reports','POST',{roomId,reason:'Có tin nhắn xúc phạm trong phòng'}, {cookie:viewer});
 assert.equal(second.status,201);assert.equal(second.body.duplicate,true);assert.equal(second.body.reportId,reportId);
 const mine=await req('/api/reports/mine','GET',null,{cookie:viewer});assert.equal(mine.body.reports.length,1);assert.equal(mine.body.reports[0].status,'open');
 const stranger=await req('/api/reports/mine','GET',null,{cookie:ownerCookie});assert.equal(stranger.body.reports.length,0);
 assert.equal((await req('/api/moderation/reports','GET',null,{cookie:ownerCookie})).status,403);
 assert.equal((await req('/api/moderation/reports','GET',null,{'x-tuttt-review-key':'wrong'})).status,403);
});
test('only configured operator can list/filter and transition report with audit',async()=>{
 const h={'x-tuttt-review-key':secret};
 const queue=await req('/api/moderation/reports?status=open','GET',null,h);assert.equal(queue.status,200);assert.equal(queue.body.reports.length,1);assert.equal(queue.body.reports[0].id,reportId);
 const review=await req(`/api/moderation/reports/${reportId}`,'PATCH',{status:'reviewing'},h);
 assert.equal(review.status,200);assert.equal(review.body.status,'reviewing');
 assert.equal((await req(`/api/moderation/reports/${reportId}`,'PATCH',{status:'resolved',note:'x'},h)).status,422);
 const close=await req(`/api/moderation/reports/${reportId}`,'PATCH',{status:'resolved',note:'Đã xem nội dung và xử lý thủ công'},h);
 assert.equal(close.status,200);assert.equal(close.body.status,'resolved');
 assert.equal((await req(`/api/moderation/reports/${reportId}`,'PATCH',{status:'dismissed',note:'Đổi trạng thái'},h)).status,409);
 assert.equal((await req('/api/moderation/reports?status=not-a-status','GET',null,h)).status,422);
 const db=new Store(process.env.TUTTT_DATA_FILE);const saved=db.db.reports.find(r=>r.id===reportId);
 assert.equal(saved.status,'resolved');assert.equal(saved.reviewHistory.length,2);
 assert.equal(saved.reviewHistory[1].reviewer,'configured-operator');
 const mine=await req('/api/reports/mine','GET',null,{cookie:viewer});assert.equal(mine.body.reports[0].status,'resolved');
 assert.equal(mine.body.reports[0].reviewHistory,undefined,'private reviewer notes never leave operator API');
});

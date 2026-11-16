#!/usr/bin/env node
/** Private operator CLI. It never stores a review key in code or opens a public UI.
 * Usage: TUTTT_REPORT_REVIEW_KEY=... node scripts/review_reports.mjs list [open|reviewing|resolved|dismissed|all]
 *        TUTTT_REPORT_REVIEW_KEY=... node scripts/review_reports.mjs review REPORT_UUID
 *        TUTTT_REPORT_REVIEW_KEY=... node scripts/review_reports.mjs resolve REPORT_UUID "Resolution note"
 *        TUTTT_REPORT_REVIEW_KEY=... node scripts/review_reports.mjs dismiss REPORT_UUID "Reason for dismissal"
 */
const url=(process.env.TUTTT_API_URL||'http://127.0.0.1:8787').replace(/\/$/,'');
const key=process.env.TUTTT_REPORT_REVIEW_KEY||'';
const [command,arg,note]=process.argv.slice(2);
const isId=value=>/^[a-f0-9-]{36}$/i.test(value||'');
function usage(){console.error('Sử dụng: list [open|reviewing|resolved|dismissed|all] | review UUID | resolve UUID "Ghi chú" | dismiss UUID "Lý do"');process.exit(2);}
if(key.length<32){console.error('Thiếu TUTTT_REPORT_REVIEW_KEY hợp lệ (>=32 ký tự).');process.exit(2)}
if(!['list','review','resolve','dismiss'].includes(command))usage();
if(command==='list'&&!['open','reviewing','resolved','dismissed','all',undefined].includes(arg))usage();
if(command!=='list'&&(!isId(arg)||(command!=='review'&&(!note||note.trim().length<8))))usage();
const route=command==='list'?'/api/moderation/reports?status='+encodeURIComponent(arg||'open'):'/api/moderation/reports/'+arg;
const payload=command==='list'?undefined:{status:command==='review'?'reviewing':command==='resolve'?'resolved':'dismissed',...(note?{note}:{})};
try{
 const response=await fetch(url+route,{method:command==='list'?'GET':'PATCH',headers:{'x-tuttt-review-key':key,...(payload?{'content-type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(12000)});
 const data=await response.json();
 if(!response.ok){console.error('Không thể xử lý:',data.error||('HTTP '+response.status));process.exitCode=1;}
 else if(command==='list'){
  const reports=data.reports||[];
  if(!reports.length)console.log('Không có báo cáo ở trạng thái này.');
  else for(const r of reports)console.log(`${r.id} | ${r.status} | ${new Date(r.createdAt).toLocaleString('vi-VN')} | room=${r.roomId} | ${r.reason}`);
 }else console.log(`Đã cập nhật ${data.id}: ${data.status}`);
}catch(error){console.error('Lỗi kết nối/API:',error instanceof Error?error.message:String(error));process.exitCode=1;}

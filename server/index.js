'use strict';
const http=require('node:http');
const https=require('node:https');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Store,fail}=require('./storage');
const {VoiceRooms}=require('./voice');
const {LiveKitBridge}=require('./livekit');
const {Stage}=require('./stage');
const {PKMatches}=require('./pk');
const STATIC=path.resolve(__dirname,'../prototype');
const DATA=process.env.TUTTT_DATA_FILE || path.resolve(__dirname,'data','store.json');
const store=new Store(DATA);
const clients=new Map(); // res -> authenticated user id
function emit(res,type,payload){if(!res.destroyed)res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);}
function sendTo(userId,type,payload){for(const [res,id] of clients)if(id===userId){if(res.destroyed)clients.delete(res);else emit(res,type,payload);}}
const voice=new VoiceRooms(store,{emit:broadcast,sendTo});
const livekit=new LiveKitBridge();
const stage=new Stage(store,livekit,{emit:broadcast});
const pk=new PKMatches(store,{emit:broadcast});
const PORT=Number(process.env.PORT||8787);
const MAX_SSE_CLIENTS=100;
const MAX_SSE_PER_USER=3;
function verifyOrigin(req){
  if(!req.headers.origin)return;
  try {
    const origin=new URL(req.headers.origin);
    if(origin.host!==req.headers.host || origin.protocol!==(req.socket.encrypted?'https:':'http:'))throw fail(403,'Yêu cầu không cùng nguồn');
  } catch(error){if(error.status)throw error;throw fail(403,'Origin không hợp lệ');}
}

const HOST=process.env.HOST||'127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpeg':'image/jpeg'};
function json(res,status,body,extras={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extras});res.end(JSON.stringify(body));}
function headers(req){return {'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};}
// Reports are reviewed outside the public Live UI. A dedicated, high-entropy
// operator key is required; guest session or room-host status never grants access.
function requireReviewAccess(req){
 const expected=process.env.TUTTT_REPORT_REVIEW_KEY||'';
 const provided=req.headers['x-tuttt-review-key'];
 if(expected.length<32||typeof provided!=='string')throw fail(403,'Không có quyền xem báo cáo');
 const a=Buffer.from(provided),b=Buffer.from(expected);
 if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw fail(403,'Không có quyền xem báo cáo');
}
function auth(req){const cookie=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('tuttt_session='));const b=req.headers.authorization||'';return store.byToken(b.startsWith('Bearer ')?b.slice(7):cookie?.slice(14));}
async function body(req){
  if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Chỉ chấp nhận JSON');
  const chunks=[];let bytes=0;
  for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw fail(413,'Dữ liệu quá lớn');chunks.push(chunk);}
  try{
    const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw fail(400,'JSON phải là đối tượng');
    return parsed;
  }catch(error){if(error.status)throw error;throw fail(400,'JSON không hợp lệ');}
}
function broadcast(type,id){for(const [res] of clients){if(res.destroyed){clients.delete(res);continue;}emit(res,type,{roomId:id||null});}}
const limit=new Map();
function rate(req,user,category,max=15){const key=category+':'+(user?.id||req.socket.remoteAddress||'unknown');const now=Date.now();const entry=limit.get(key);if(!entry||now-entry.from>60_000){limit.set(key,{from:now,count:1});return}if(++entry.count>max)throw fail(429,'Thao tác quá nhanh, vui lòng thử lại');}
async function handler(req,res){
  const sec=headers(req);for(const [k,v]of Object.entries(sec))res.setHeader(k,v);
  const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
  try {
    if(pathname.startsWith('/api/') && !['GET','HEAD','OPTIONS'].includes(req.method))verifyOrigin(req);
    if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{status:'ok',version:'0.8.50',features:['guest-session','rooms','room-messages','sse','voice-signalling-legacy','livekit-sfu-gateway','speaker-approval','moderation','live-voice','live-cam-6','chat-mute','room-settings','viewer-invites-opt-in','unified-live-stage','pk-friendly-cheers','report-review-queue'],livekitConfigured:livekit.enabled});
    if(pathname==='/api/session'&&req.method==='POST'){
      rate(req,null,'session',10);
      const input=await body(req);const result=store.session(input.name);
      const cookie=`tuttt_session=${result.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${req.socket.encrypted?'; Secure':''}`;
      return json(res,201,{user:result.user,...(req.headers['x-tuttt-client']==='mobile'?{token:result.token}:{})},{'Set-Cookie':cookie});
    }
    // Restricted operator API: no public Live button or guest-role escalation.
    if(pathname==='/api/moderation/reports'&&req.method==='GET'){
      requireReviewAccess(req);rate(req,null,'review-read',60);
      return json(res,200,store.reviewQueue(url.searchParams.get('status')||'open'));
    }
    const reviewMatch=pathname.match(/^\/api\/moderation\/reports\/([a-f0-9-]{36})$/);
    if(reviewMatch&&req.method==='PATCH'){
      requireReviewAccess(req);rate(req,null,'review-write',30);
      return json(res,200,store.reviewReport(reviewMatch[1],await body(req)));
    }
    if(pathname.startsWith('/api/')) {
      const user=auth(req);if(!user)throw fail(401,'Bạn cần tạo phiên khách');
      if(pathname==='/api/me'&&req.method==='GET')return json(res,200,{user:store.publicUser(user)});
      if(pathname==='/api/me'&&req.method==='PATCH'){rate(req,user,'profile');return json(res,200,{user:store.profile(user,await body(req))});}
      if(pathname==='/api/rooms'&&req.method==='GET')return json(res,200,{rooms:store.listRooms(user)});
      if(pathname==='/api/rooms'&&req.method==='POST'){rate(req,user,'create',5);const room=store.createRoom(user,await body(req));broadcast('rooms.changed');return json(res,201,{room});}
      if(pathname==='/api/reports/mine'&&req.method==='GET')return json(res,200,store.myReports(user));
      if(pathname==='/api/reports'&&req.method==='POST'){rate(req,user,'report',6);return json(res,201,store.report(user,await body(req)));}
      if(pathname==='/api/events'&&req.method==='GET'){
        if(clients.size>=MAX_SSE_CLIENTS)throw fail(503,'Đã đạt giới hạn kết nối demo');
        if([...clients.values()].filter(id=>id===user.id).length>=MAX_SSE_PER_USER)throw fail(429,'Quá nhiều kết nối sự kiện của tài khoản');
        res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','connection':'keep-alive','X-Accel-Buffering':'no'});
        res.write('retry: 3000\n\n');clients.set(res,user.id);req.on('close',()=>clients.delete(res));return;
      }
      const blocked=pathname.match(/^\/api\/users\/([a-f0-9-]{36})\/block$/);
      if(blocked && req.method==='POST'){rate(req,user,'block',10);return json(res,200,store.block(user,blocked[1]));}
      const audienceMatch=pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/audience$/);
      if(audienceMatch&&req.method==='GET')return json(res,200,store.audience(user,audienceMatch[1],{
        stageMembers:stage.rooms.get(audienceMatch[1])?.members,
        voiceMembers:voice.rooms.get(audienceMatch[1])
      }));
      const match=pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})(?:\/(join|leave|messages))?$/);
      if(match){const id=match[1],sub=match[2];
        if(!sub && req.method==='GET')return json(res,200,{room:store.presentRoom(store.getRoom(id))});
        if(sub==='join' && req.method==='POST'){const room=store.join(user,id);broadcast('rooms.changed');return json(res,200,{room});}
        if(sub==='leave' && req.method==='POST'){pk.onHostLeave(user,id);const exit=await stage.exit(user,id);voice.leave(user,id);const room=store.leave(user,id);broadcast('rooms.changed');return json(res,200,{room,mediaDisconnectPending:exit.mediaDisconnectPending});}
        if(sub==='messages' && req.method==='GET')return json(res,200,{messages:store.messages(user,id)});
        if(sub==='messages' && req.method==='POST'){rate(req,user,'message',30);const message=store.send(user,id,await body(req));broadcast('room.changed',id);return json(res,201,{message});}
      }
      // PK challenges: time-limited, explicitly accepted, server-scored free cheers.
      const pkMatch=pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/pk(?:\/(invite|respond|cancel|cheer|end))?$/);
      if(pkMatch){
        const id=pkMatch[1],op=pkMatch[2];
        if(!op&&req.method==='GET')return json(res,200,pk.snapshot(user,id));
        if(op==='invite'&&req.method==='POST'){rate(req,user,'pk-invite',20);const payload=await body(req);return json(res,201,pk.invite(user,id,payload.opponentRoomId,payload.durationSeconds===undefined?180:payload.durationSeconds));}
        if(op==='respond'&&req.method==='POST'){rate(req,user,'pk-respond',12);const payload=await body(req);return json(res,200,pk.respond(user,id,payload.invitationId,payload.accept));}
        if(op==='cancel'&&req.method==='POST'){rate(req,user,'pk-cancel',12);const payload=await body(req);return json(res,200,pk.cancel(user,id,payload.invitationId));}
        if(op==='cheer'&&req.method==='POST'){rate(req,user,'pk-cheer',30);const payload=await body(req);return json(res,200,pk.cheer(user,id,payload.matchId));}
        if(op==='end'&&req.method==='POST'){rate(req,user,'pk-end',8);const payload=await body(req);return json(res,200,pk.end(user,id,payload.matchId));}
      }
      // SFU credentials and server-enforced stage control (requires configured LiveKit).
      const liveMatch=pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/live(?:\/(token|heartbeat|seat-request|seat|seat-leave|invite|invite-respond|invite-cancel|moderate|settings|leave))?$/);
      if(liveMatch){
        const id=liveMatch[1],operation=liveMatch[2];
        if(!operation&&req.method==='GET')return json(res,200,stage.snapshot(user,id));
        if(operation==='token'&&req.method==='POST'){rate(req,user,'live-token',12);return json(res,200,await stage.issueToken(user,id));}
        if(operation==='heartbeat'&&req.method==='POST')return json(res,200,stage.heartbeat(user,id));
        if(operation==='seat-request'&&req.method==='POST'){rate(req,user,'live-seat-request',10);return json(res,200,stage.request(user,id));}
        if(operation==='seat'&&req.method==='POST'){rate(req,user,'live-seat-action',24);const input=await body(req);return json(res,200,await stage.speaker(user,id,input.userId,input.enabled));}
        if(operation==='invite'&&req.method==='POST'){rate(req,user,'stage-invite',12);const input=await body(req);return json(res,200,await stage.invite(user,id,input.userId));}
        if(operation==='invite-respond'&&req.method==='POST'){rate(req,user,'stage-invite-answer',18);const input=await body(req);return json(res,200,await stage.respondInvite(user,id,input.invitationId,input.accept));}
        if(operation==='invite-cancel'&&req.method==='POST'){rate(req,user,'stage-invite-cancel',18);const input=await body(req);return json(res,200,await stage.cancelInvite(user,id,input.invitationId));}
        if(operation==='seat-leave'&&req.method==='POST'){rate(req,user,'live-seat-leave',10);return json(res,200,await stage.leaveSeat(user,id));}
        if(operation==='moderate'&&req.method==='POST'){rate(req,user,'live-moderation',12);const input=await body(req);return json(res,200,await stage.moderate(user,id,input.userId,input.action,input));}
        if(operation==='settings'&&req.method==='POST'){rate(req,user,'live-settings',12);return json(res,200,await stage.settings(user,id,await body(req)));}
        if(operation==='leave'&&req.method==='POST')return json(res,200,await stage.exit(user,id));
      }
      const voiceMatch=pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/voice(?:\/(join|leave|seat|mic|signal|heartbeat))?$/);
      if(voiceMatch){
        const roomId=voiceMatch[1],operation=voiceMatch[2];
        if(!operation && req.method==='GET')return json(res,200,voice.snapshot(user,roomId));
        if(operation==='join' && req.method==='POST'){rate(req,user,'voice-join',30);return json(res,200,voice.enter(user,roomId));}
        if(operation==='leave' && req.method==='POST')return json(res,200,voice.leave(user,roomId));
        if(operation==='heartbeat' && req.method==='POST')return json(res,200,voice.heartbeat(user,roomId));
        if(operation==='seat' && req.method==='POST'){rate(req,user,'voice-seat',25);return json(res,200,voice.seat(user,roomId,await body(req)));}
        if(operation==='mic' && req.method==='POST'){rate(req,user,'voice-mic',40);return json(res,200,voice.mic(user,roomId,await body(req)));}
        if(operation==='signal' && req.method==='POST'){rate(req,user,'voice-signal',360);return json(res,200,voice.signal(user,roomId,await body(req)));}
      }
      throw fail(404,'API không tồn tại');
    }
    if(req.method!=='GET' && req.method!=='HEAD')return json(res,405,{error:'Phương thức không hợp lệ'},{Allow:'GET, HEAD'});
    const target=pathname==='/'?'/index.html':pathname;
    if(!['/index.html','/styles.css','/data.js','/app.js','/network.js','/voice.js','/ux-core.js','/brand-v048.css','/cam-v050.css','/live-experience-v051.css','/live-chat-v052.css','/live-polish-v053.css','/live-stage-v054.css','/live-unified-v055.css','/live-flow-v056.css','/live-speaker-v057.css','/live-redesign-v059.css','/pk-v060.css','/pk-v061.css', '/pk-v062.css','/pk-v064.css','/pk-v065.css','/pk-v066.css','/pk-v067.css','/pk-v068.css','/pk-v069.css','/pk-v070.css','/pk-v071.css','/pk-v072.css','/pk-v073.css','/controls-v074.css','/live-polish-v075.css','/pk-meter-v076.css','/pk-voice-v077.css','/pk-heart-v079.css','/pk-finish-v080.css', '/pk-colors.generated.css','/pk-visual-ux.js','/speaker-status.js','/audience-presence.js','/stage-layout.js','/assets/tuttt-logo.png','/assets/favicon.png'].includes(target))throw fail(404,'Không tìm thấy tệp');
    const file=path.join(STATIC,target);
    const info=await fs.promises.stat(file).catch(()=>null);
    if(!info?.isFile())throw fail(404,'Không tìm thấy tệp');
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-cache'});
    if(req.method==='HEAD')return res.end();
    const stream=fs.createReadStream(file);
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  }catch(err){if(!res.headersSent)json(res,err.status||500,{error:err.status?err.message:'Lỗi hệ thống'});else res.end();}
}
// Periodic SSE keepalive prevents idle proxies from silently dropping connections.
const sseHeartbeat=setInterval(()=>{const now=Date.now();for(const [key,entry] of limit)if(now-entry.from>120_000)limit.delete(key);for(const [res] of clients){if(res.destroyed){clients.delete(res);continue;}try{res.write(': heartbeat\n\n');}catch{clients.delete(res);}}},25000);
sseHeartbeat.unref();
// PK expiry is server-driven so score and outcome never depend on an open client.
const pkClock=setInterval(()=>pk.finishExpired(),1000);pkClock.unref();
// Revoke expired stage publications even in empty/inactive room screens.
// The cleanup keeps reconnect fences until the SFU confirms removal.
const stageSweep=setInterval(()=>{
  try{stage.sweepExpired();}
  catch(error){console.error('Stage expiry sweep failed:',error instanceof Error?error.message:'unknown error');}
},10000);stageSweep.unref();
const cert=process.env.TUTTT_TLS_CERT, key=process.env.TUTTT_TLS_KEY;
if(Boolean(cert)!==Boolean(key))throw new Error('Phải cấu hình cả TUTTT_TLS_CERT và TUTTT_TLS_KEY');
const server=cert?https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},handler):http.createServer(handler);
if(require.main===module){server.listen(PORT,HOST,()=>console.log(`Túttt v0.8.50: ${cert?'https':'http'}://${HOST}:${PORT}`));}
module.exports={server,store,voice,stage,livekit,pk};

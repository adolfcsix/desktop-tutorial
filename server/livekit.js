'use strict';
/**
 * LiveKit server bridge. The server never sends its API secret to a client.
 * Tokens are signed locally with the same HS256 JWT format accepted by LiveKit.
 * Room administration uses the official livekit-server-sdk when installed.
 */
const crypto = require('node:crypto');
const {fail} = require('./storage');
const base64url = data => Buffer.from(JSON.stringify(data)).toString('base64url');
const roomName = id => `tuttt-${id}`;

class LiveKitBridge {
  constructor({url=process.env.LIVEKIT_URL, key=process.env.LIVEKIT_API_KEY, secret=process.env.LIVEKIT_API_SECRET, service=null, operationTimeoutMs=process.env.TUTTT_SFU_RPC_TIMEOUT_MS||8000}={}) {
    this.url=url||''; this.key=key||''; this.secret=secret||''; this.service=service;
    // Bound RoomService calls so one unresponsive SFU cannot hold the room lock forever.
    const ms=Number(operationTimeoutMs);
    if(!Number.isSafeInteger(ms)||ms<1||ms>30000)throw new Error('TUTTT_SFU_RPC_TIMEOUT_MS phải là số mili giây từ 1 đến 30000');
    this.operationTimeoutMs=ms;
    const values=[this.url,this.key,this.secret].filter(Boolean);
    if(values.length && values.length!==3)throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET phải được khai báo cùng nhau');
    if(this.url && !/^wss?:\/\/[^\s/]+(?:[:/][^\s]*)?$/.test(this.url))throw new Error('LIVEKIT_URL phải bắt đầu bằng ws:// hoặc wss://');
    if(this.url && (this.key.length<3||this.secret.length<16))throw new Error('Thông tin xác thực LiveKit không hợp lệ');
  }
  get enabled(){return Boolean(this.url&&this.key&&this.secret);}
  requireConfigured(){if(!this.enabled)throw fail(503,'Chưa cấu hình máy chủ LiveKit SFU');}
  token(user,roomId,{canPublish=false,roomType='voice'}={}) {
    this.requireConfigured();
    // Self-hosted LiveKit does not revoke previously issued JWTs on kick/permission
    // changes. Keep the *initial-join* replay window short; active sessions
    // are refreshed by the SFU independently of this initial token expiry.
    const now=Math.floor(Date.now()/1000), exp=now+90;
    const claims={iss:this.key,sub:user.id,nbf:now-5,iat:now,exp,jti:crypto.randomUUID(),name:user.name,
      video:{room:roomName(roomId),roomJoin:true,canPublish:!!canPublish,
        ...(canPublish?{canPublishSources:roomType==='cam'?['microphone','camera']:['microphone']}:{}),canSubscribe:true,canPublishData:false,roomAdmin:false}};
    const head=base64url({alg:'HS256',typ:'JWT'});
    const payload=base64url(claims);
    const content=`${head}.${payload}`;
    const signature=crypto.createHmac('sha256',this.secret).update(content).digest('base64url');
    return {serverUrl:this.url, token:`${content}.${signature}`,expiresAt:exp*1000,roomName:roomName(roomId)};
  }
  adminService() {
    this.requireConfigured();
    if(this.service)return this.service;
    let RoomServiceClient;
    try{({RoomServiceClient}=require('livekit-server-sdk'));}
    catch{throw fail(503,'Cần cài livekit-server-sdk để điều phối quyền host/moderator');}
    // LiveKit API uses HTTP(S); the media URL is WS(S).
    this.service=new RoomServiceClient(this.url.replace(/^ws/,'http'),this.key,this.secret);
    return this.service;
  }
  async withRpcDeadline(operation){
    let timer;
    try{
      return await Promise.race([
        Promise.resolve().then(operation),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('SFU_RPC_TIMEOUT'),{code:'SFU_RPC_TIMEOUT'})),this.operationTimeoutMs);})
      ]);
    }finally{if(timer)clearTimeout(timer);}
    // A deadline does not cancel the underlying remote RPC. Callers MUST
    // treat any timeout as an uncertain SFU state and persist a revoke fence.
  }
  async setPermission(roomId,identity,canPublish,roomType='voice') {
    const permission={canPublish:!!canPublish,canPublishSources:canPublish?(roomType==='cam'?['microphone','camera']:['microphone']):[],canSubscribe:true,canPublishData:false};
    try{await this.withRpcDeadline(()=>this.adminService().updateParticipant(roomName(roomId),identity,{permission}));}
    catch(err){
      // The person might have received credentials but not connected yet.
      if(err?.code==='not_found'||err?.status===404||/participant.*(not found|does not exist)/i.test(String(err?.message||'')))return {connected:false};
      const failure=fail(502,'Không cập nhật được quyền trên máy chủ LiveKit');
      if(err?.code==='SFU_RPC_TIMEOUT')failure.code='SFU_RPC_TIMEOUT';
      throw failure;
    }
    return {connected:true};
  }
  async remove(roomId,identity) {
    try{await this.withRpcDeadline(()=>this.adminService().removeParticipant(roomName(roomId),identity));}
    catch(err){
      if(err?.code==='not_found'||err?.status===404||/participant.*(not found|does not exist)/i.test(String(err?.message||'')))return;
      throw fail(502,'Không thể ngắt kết nối người tham gia trên LiveKit');
    }
  }
}
module.exports={LiveKitBridge,roomName};

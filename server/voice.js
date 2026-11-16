'use strict';
/** In-memory signalling and seat coordination for small WebRTC browser labs.
 * Audio media never passes through this service. Do not expose publicly.
 */
const {fail}=require('./storage');
const UUID=/^[a-f0-9-]{36}$/;
const TYPES=new Set(['offer','answer','candidate']);
class VoiceRooms {
 constructor(store,{emit=()=>{},sendTo=()=>{}}={}){
  this.store=store;this.emit=emit;this.sendTo=sendTo;this.rooms=new Map();
  this.MAX_PARTICIPANTS=6;this.MAX_SPEAKERS=4;this.TTL=70_000;
 }
 prune(roomId){
  const roster=this.rooms.get(roomId);if(!roster)return;
  const now=Date.now();let changed=false;
  for(const [id,member] of roster){
   if(member.expiresAt<=now || (this.store.presence.get(roomId)?.get(id)||0)<=now){
    roster.delete(id);changed=true;
   }
  }
  if(!roster.size)this.rooms.delete(roomId);
  if(changed)this.emit('voice.changed',roomId);
 }
 members(roomId){this.prune(roomId);return this.rooms.get(roomId)||new Map()}
 ensureRoom(user,roomId){
  const room=this.store.getRoom(roomId);
  const expiry=this.store.presence.get(roomId)?.get(user.id);
  if(!expiry || expiry<Date.now())throw fail(403,'Bạn phải tham gia phòng trước');
  return room;
 }
 self(user,roomId){
  const roster=this.members(roomId), member=roster.get(user.id);
  if(!member)throw fail(403,'Hãy kết nối voice trước');return member;
 }
 snapshot(user,roomId){
  this.ensureRoom(user,roomId);
  const roster=this.members(roomId);
  const participants=[...roster.values()].map(({id,name,role,mic})=>({id,name,role,mic}));
  return {roomId,selfId:user.id,participants,limits:{participants:this.MAX_PARTICIPANTS,speakers:this.MAX_SPEAKERS},kind:'browser-webrtc-mesh'};
 }
 enter(user,roomId){
  const room=this.ensureRoom(user,roomId);
  const roster=this.members(roomId);const existing=roster.get(user.id);
  if(!existing && roster.size>=this.MAX_PARTICIPANTS)throw fail(409,'Phòng thử nghiệm đã đủ 6 người nghe/nói');
  if(existing){existing.expiresAt=Date.now()+this.TTL;existing.name=user.name;}
  else roster.set(user.id,{id:user.id,name:user.name,role:room.hostId===user.id?'speaker':'audience',mic:false,expiresAt:Date.now()+this.TTL});
  this.rooms.set(roomId,roster);
  this.emit('voice.changed',roomId);return this.snapshot(user,roomId);
 }
 heartbeat(user,roomId){this.ensureRoom(user,roomId);const member=this.self(user,roomId);
  const renamed=member.name!==user.name;member.name=user.name;
  this.store.join(user,roomId);member.expiresAt=Date.now()+this.TTL;
  if(renamed)this.emit('voice.changed',roomId);
  return this.snapshot(user,roomId)}
 seat(user,roomId,input){
  this.ensureRoom(user,roomId);const member=this.self(user,roomId);const room=this.store.getRoom(roomId);
  if(typeof input.speaker!=='boolean')throw fail(422,'speaker phải là true hoặc false');
  if(room.hostId===user.id && input.speaker===false)throw fail(409,'Host giữ ghế nói khi đang trong phòng');
  if(input.speaker && member.role!=='speaker'){
   if([...this.members(roomId).values()].filter(x=>x.role==='speaker').length>=this.MAX_SPEAKERS)throw fail(409,'Đã đủ 4 ghế nói');
   member.role='speaker';
  }else if(!input.speaker){member.role='audience';member.mic=false;}
  this.emit('voice.changed',roomId);return this.snapshot(user,roomId);
 }
 mic(user,roomId,input){
  this.ensureRoom(user,roomId);const member=this.self(user,roomId);
  if(typeof input.enabled!=='boolean')throw fail(422,'enabled phải là true hoặc false');
  if(input.enabled && member.role!=='speaker')throw fail(403,'Bạn cần có ghế nói trước khi bật mic');
  member.mic=input.enabled;this.emit('voice.changed',roomId);return this.snapshot(user,roomId);
 }
 leave(user,roomId){
  const roster=this.members(roomId),had=roster.delete(user.id);
  if(!roster.size)this.rooms.delete(roomId);
  if(had)this.emit('voice.changed',roomId);
  return {left:true};
 }
 signal(user,roomId,input){
  this.ensureRoom(user,roomId);this.self(user,roomId);
  if(!input || !UUID.test(input.to||'') || input.to===user.id || !TYPES.has(input.type))throw fail(422,'Tín hiệu không hợp lệ');
  const target=this.members(roomId).get(input.to);if(!target)throw fail(404,'Người nhận không còn trong phòng');
  const sender=this.store.db.users[user.id];const receiver=this.store.db.users[input.to];
  if(sender?.blocked?.includes(input.to) || receiver?.blocked?.includes(user.id))throw fail(403,'Không thể kết nối với tài khoản đã chặn');
  const payload=input.payload;
  if(!payload || typeof payload!=='object' || Array.isArray(payload))throw fail(422,'Payload không hợp lệ');
  let sanitized;
  if(input.type==='candidate'){
   if(payload.candidate!==null && (typeof payload.candidate!=='string' || payload.candidate.length>2048))throw fail(422,'ICE candidate không hợp lệ');
   if(payload.sdpMid!=null && (typeof payload.sdpMid!=='string'||payload.sdpMid.length>64))throw fail(422,'ICE mid không hợp lệ');
   if(payload.sdpMLineIndex!=null && (!Number.isInteger(payload.sdpMLineIndex)||payload.sdpMLineIndex<0||payload.sdpMLineIndex>20))throw fail(422,'ICE index không hợp lệ');
   sanitized={candidate:payload.candidate??null,sdpMid:payload.sdpMid??null,sdpMLineIndex:payload.sdpMLineIndex??null};
  }else{
   if(typeof payload.sdp!=='string' || payload.sdp.length>25000 || payload.sdp.length<10 || payload.type!==input.type)throw fail(422,'SDP không hợp lệ');
   sanitized={type:input.type,sdp:payload.sdp};
  }
  this.self(user,roomId).expiresAt=Date.now()+this.TTL;
  this.sendTo(input.to,'voice.signal',{roomId,from:user.id,type:input.type,payload:sanitized});
  return {delivered:true};
 }
}
module.exports={VoiceRooms};

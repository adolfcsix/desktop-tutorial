'use strict';
/**
 * Server-owned speaker queue for SFU rooms. This state is deliberately separate
 * from the v0.3 browser mesh voice-lab, which stays available as a legacy lab.
 * Not suitable for multi-process use until state is moved to Redis/Postgres.
 */
const {fail,MAX_ROOM_PARTICIPANTS}=require('./storage');
const {randomUUID}=require('node:crypto');
class Stage {
 constructor(store,bridge,{emit=()=>{}}={}) {
  this.store=store;this.bridge=bridge;this.emit=emit;
  this.rooms=new Map();this.locks=new Map();this.pendingExits=new Map();this.unconfirmedDisconnects=new Set();this.disconnectRetries=new Map();this.expiryRevocations=new Map();this.expiryRetryAfter=new Map();this.MAX_SPEAKERS=8;this.MAX_CAMERAS=6;this.MAX_PARTICIPANTS=MAX_ROOM_PARTICIPANTS;
  // A crashed/restarted backend must not silently forget an issued media token.
  // A fence is persisted BEFORE token issuance, then removed only after SFU
  // revocation is confirmed. The boot ID distinguishes a live local session
  // from a session that may still exist on the SFU after process restart.
  this.bootId=randomUUID();
  this.store.db.livekitSessionFences||={};
  for(const key of Object.keys(this.store.db.livekitSessionFences))this.unconfirmedDisconnects.add(key);
 }
 fenceKey(id,userId){return `${id}:${userId}`;}
 setFence(id,userId,state){
  const key=this.fenceKey(id,userId);
  const prior=this.store.db.livekitSessionFences[key];
  const activeHold=prior?.holdUntil>Date.now()?{holdUntil:prior.holdUntil}:{};
  this.store.db.livekitSessionFences[key]={roomId:id,userId,bootId:this.bootId,state,updatedAt:Date.now(),...activeHold};
  this.store.save?.();
 }
 clearFence(id,userId){
  const key=this.fenceKey(id,userId);
  delete this.store.db.livekitSessionFences[key];
  this.store.save?.();
 }
 ensure(user,id){
  this.bridge.requireConfigured();
  const room=this.store.getRoom(id);
  const ban=this.store.db.roomBans?.[id]?.[user.id];
  if(ban && ban>Date.now())throw fail(403,'Bạn đang bị hạn chế tham gia phòng');
  const expiry=this.store.presence.get(id)?.get(user.id);
  if(!expiry||expiry<=Date.now())throw fail(403,'Hãy tham gia phòng trước khi kết nối Live');
  return room;
 }
 audit(roomId,actorId,targetId,action,minutes){
  this.store.db.moderationAudit||=[];
  this.store.db.moderationAudit.push({roomId,actorId,targetId,action,minutes:minutes||null,createdAt:Date.now()});
  if(this.store.db.moderationAudit.length>2000)this.store.db.moderationAudit.splice(0,this.store.db.moderationAudit.length-2000);
 }
 data(roomId){
  if(!this.rooms.has(roomId))this.rooms.set(roomId,{members:new Map(),requests:new Set(),invitations:new Map()});
  return this.rooms.get(roomId);
 }
 // A stage expiry must not only remove the visible seat. An old LiveKit
 // participant can continue publishing after its API heartbeat expires unless
 // the SFU explicitly removes that identity. Persist a reconnect fence first.
 queueExpiredRevoke(id,uid){
  const key=this.fenceKey(id,uid);
  if(!this.bridge.enabled||this.expiryRevocations.has(key)||(this.expiryRetryAfter.get(key)||0)>Date.now()
   ||(this.store.db.livekitSessionFences?.[key]?.holdUntil||0)>Date.now())return;
  const task=Promise.resolve().then(()=>this.bridge.remove(id,uid)).then(()=>{
   this.clearFence(id,uid);
   this.unconfirmedDisconnects.delete(key);
   this.expiryRetryAfter.delete(key);
  }).catch(()=>{
   // Failed revocation is NOT a successful disconnect. Keep the persisted fence
   // and retry later or when the participant explicitly re-enters.
   this.expiryRetryAfter.set(key,Date.now()+10_000);
  });
  const tracked=task.finally(()=>{if(this.expiryRevocations.get(key)===tracked)this.expiryRevocations.delete(key);});
  this.expiryRevocations.set(key,tracked);
 }
 clean(id){
  const d=this.rooms.get(id);if(!d)return;
  const now=Date.now();let changed=false;
  for(const [uid,m] of d.members){
   if(m.expiresAt<=now || (this.store.presence.get(id)?.get(uid)||0)<=now){
    const key=this.fenceKey(id,uid);
    if(this.bridge.enabled && this.store.db.livekitSessionFences?.[key]){
     this.setFence(id,uid,'pending');
     this.unconfirmedDisconnects.add(key);
     this.queueExpiredRevoke(id,uid);
    }
    d.members.delete(uid);d.requests.delete(uid);
    this.store.presence.get(id)?.delete(uid);changed=true;
   }
  }
  for(const [inviteId,invite] of d.invitations){
   if(invite.expiresAt<=now || !d.members.has(invite.toId) || !['host','moderator'].includes(d.members.get(invite.fromId)?.role)){
    d.invitations.delete(inviteId);changed=true;
   }
  }
  if(changed)this.emit('stage.changed',id);
 }
 // Called periodically even if nobody opens the room screen: expired media
 // and orphaned SFU sessions from a crashed process must be retired proactively.
 sweepExpired(){
  for(const id of this.rooms.keys())this.clean(id);
  for(const [key,fence] of Object.entries(this.store.db.livekitSessionFences||{})){
   if(fence?.bootId!==this.bootId || fence?.state==='pending'){
    this.unconfirmedDisconnects.add(key);
    this.queueExpiredRevoke(fence.roomId,fence.userId);
   }
  }
 }

 snapshot(user,id){
  const room=this.ensure(user,id);this.clean(id);const d=this.data(id);
  const type=room.type||'voice';
  const members=[...d.members.values()].map(m=>({id:m.id,name:m.name,role:m.role,speaker:m.speaker,
    cameraAllowed:type==='cam'&&m.speaker,chatMutedUntil:this.store.db.roomChatMutes?.[id]?.[m.id]||0}));
  const invitations=[...d.invitations.values()];
  const selfRole=d.members.get(user.id)?.role;
  return {roomId:id,selfId:user.id,hostId:room.hostId,type,
    incomingInvitations:invitations.filter(inv=>inv.toId===user.id),
    outgoingInvitations:['host','moderator'].includes(selfRole)?invitations.map(inv=>({id:inv.id,toId:inv.toId,fromId:inv.fromId,expiresAt:inv.expiresAt})):[],
    settings:{locked:!!room.locked,
    chatEnabled:room.chatEnabled!==false,slowModeSeconds:room.slowModeSeconds||0},members,
   requests:[...d.requests],
   limits:{speakers:type==='cam'?this.MAX_CAMERAS:this.MAX_SPEAKERS,cameras:type==='cam'?this.MAX_CAMERAS:0,participants:this.MAX_PARTICIPANTS},
   transport:'livekit-sfu',note:'Danh sách quyền được cấp, không phải thống kê kết nối SFU đã xác thực'};
 }
 // Lock token issuance together with seat, invitation, moderation and exit
 // mutations: a refreshed JWT must never inherit a grant being revoked.
 async issueToken(user,id){return this.lock(id,async()=>{
  await this.reconcileDisconnect(user,id);
  return this.enter(user,id);
 });}
 enter(user,id){
  // Do not mint a new token until an in-flight SFU removal for this identity is settled.
  const key=`${id}:${user.id}`;
  if(this.pendingExits.has(key))throw fail(409,'Đang rời phòng, hãy thử vào lại sau');
  if(this.unconfirmedDisconnects.has(key)||this.disconnectRetries.has(key))throw fail(409,'Chưa xác nhận ngắt media cũ, vui lòng thử lại sau');
  const room=this.ensure(user,id);this.clean(id);const d=this.data(id);
  // The cleanup above may have discovered an expired previous publication.
  if(this.unconfirmedDisconnects.has(key)||this.expiryRevocations.has(key))throw fail(409,'Đang thu hồi phiên media cũ, hãy thử lại sau');
  if(!d.members.has(user.id) && d.members.size>=this.MAX_PARTICIPANTS)throw fail(409,'Phòng đã đạt giới hạn người tham gia thử nghiệm');
  let m=d.members.get(user.id);
  if(!m){m={id:user.id,name:user.name,role:room.hostId===user.id?'host':this.store.db.roomModerators?.[id]?.includes(user.id)?'moderator':'listener',speaker:room.hostId===user.id,expiresAt:0};d.members.set(user.id,m);}
  m.name=user.name;m.expiresAt=Date.now()+65_000;
  // Write the fence first: if the process crashes after issuing a token,
  // the next process will revoke the potentially lingering SFU participant.
  this.setFence(id,user.id,'active');
  const credentials=this.bridge.token(user,id,{canPublish:m.speaker,roomType:room.type||'voice'});
  this.emit('stage.changed',id);
  return {roster:this.snapshot(user,id),...credentials};
 }
 heartbeat(user,id){this.ensure(user,id);this.clean(id);const d=this.data(id),m=d.members.get(user.id);if(!m)throw fail(403,'Bạn chưa kết nối Live');
  const renamed=m.name!==user.name;m.name=user.name;
  this.store.join(user,id);m.expiresAt=Date.now()+65_000;
  if(renamed)this.emit('stage.changed',id);
  return this.snapshot(user,id);
 }
 permission(user,id){const room=this.ensure(user,id);this.clean(id);const m=this.data(id).members.get(user.id);
  if(!m||!['host','moderator'].includes(m.role))throw fail(403,'Chỉ host hoặc moderator được quản lý ghế nói');return {room,m};}
 request(user,id){this.ensure(user,id);this.clean(id);const d=this.data(id),m=d.members.get(user.id);if(!m)throw fail(403,'Bạn cần vào Live trước');
  if(m.speaker)throw fail(409,'Bạn đã có ghế nói');d.requests.add(user.id);this.emit('stage.changed',id);return this.snapshot(user,id);
 }
 async lock(id,callback){
  const old=this.locks.get(id)||Promise.resolve();let release;
  const pending=new Promise(resolve=>release=resolve);
  this.locks.set(id,pending);
  await old;
  try{return await callback();}finally{release();if(this.locks.get(id)===pending)this.locks.delete(id);}
 }
 // A remote SFU permission acknowledgement may arrive AFTER a member has
 // expired, left, or lost the authorizing actor. Never commit that late grant.
 // Revocation is attempted AFTER the acknowledgement (not before), because a
 // late acknowledgement could re-enable an already removed publication.
 async assertGrantStillAuthorized(user,id,targetId){
  const d=this.data(id),actor=d.members.get(user.id),target=d.members.get(targetId),now=Date.now();
  const current=(member,uid)=>member && member.expiresAt>now && (this.store.presence.get(id)?.get(uid)||0)>now;
  const allowed=current(actor,user.id) && ['host','moderator'].includes(actor.role)
   && current(target,targetId) && (actor.role!=='moderator'||target.role==='listener')
   && !this.pendingExits.has(this.fenceKey(id,targetId))
   && !this.unconfirmedDisconnects.has(this.fenceKey(id,targetId));
  if(allowed)return;
  const key=this.fenceKey(id,targetId);
  // Fail closed: persist a fence BEFORE attempting removal, so even a crash
  // or SFU outage cannot make the old identity eligible for a new token.
  this.unconfirmedDisconnects.add(key);
  this.setFence(id,targetId,'pending');
  try{
   await this.bridge.remove(id,targetId);
   this.clearFence(id,targetId);
   this.unconfirmedDisconnects.delete(key);
  }catch{
   this.expiryRetryAfter.set(key,Date.now()+10_000);
  }
  d.members.delete(targetId);d.requests.delete(targetId);
  for(const [k,inv] of d.invitations)if(inv.toId===targetId)d.invitations.delete(k);
  this.emit('stage.changed',id);
  throw fail(409,'Quyền phát đã thay đổi trong lúc xác nhận; phiên media cũ đã được yêu cầu ngắt');
 }
 // SFU permission updates may fail after taking effect. Treat the remote
 // publication state as UNKNOWN, never as a safe unchanged permission. Fence
 // future JWT issuance first, then request a positive SFU disconnect.
 async quarantineUncertainPermission(id,uid,{holdUntil=0}={}){
  const key=this.fenceKey(id,uid);
  this.unconfirmedDisconnects.add(key);
  this.setFence(id,uid,'pending');
  if(holdUntil>Date.now()){
   // A timed-out GRANT RPC may complete after a seemingly successful removal.
   // Keep a durable fence for the remaining initial-JWT replay window, and
   // require another positive SFU removal after it has elapsed.
   this.store.db.livekitSessionFences[key].holdUntil=holdUntil;
   this.store.save?.();
  }
  try{
   await this.bridge.remove(id,uid);
   if(!(holdUntil>Date.now())){
    this.clearFence(id,uid);
    this.unconfirmedDisconnects.delete(key);
    this.expiryRetryAfter.delete(key);
   }
  }catch{
   this.expiryRetryAfter.set(key,Date.now()+10_000);
  }
  const d=this.data(id);
  d.members.delete(uid);d.requests.delete(uid);
  for(const [inviteId,inv] of d.invitations)
   if(inv.toId===uid||inv.fromId===uid)d.invitations.delete(inviteId);
  this.emit('stage.changed',id);
 }
 async speaker(user,id,targetId,enabled){return this.lock(id,async()=>{
  const {m}=this.permission(user,id);const d=this.data(id),target=d.members.get(targetId),room=this.store.getRoom(id);
  if(typeof enabled!=='boolean'||!target)throw fail(422,'Người tham gia hoặc giá trị không hợp lệ');
  // UI hiding is insufficient: the API must enforce the same role hierarchy.
  // A moderator may manage listener seats, never the host or another moderator.
  if(m.role==='moderator' && target.role!=='listener')throw fail(403,'Phó phòng chỉ có thể quản lý ghế của người xem');
  if(targetId===room.hostId && !enabled)throw fail(403,'Không thể thu hồi ghế nói của host');
  if(enabled&&!target.speaker&&!d.requests.has(targetId))throw fail(403,'Người xem chưa yêu cầu lên ghế hoặc chưa chấp nhận lời mời');
  const max=(room.type==='cam'?this.MAX_CAMERAS:this.MAX_SPEAKERS);
  const inUse=[...d.members.values()].filter(m=>m.speaker).length;
  // Reserve the host's speaker seat in BOTH Voice and Cam when the host is away.
  const reservedHost=!d.members.has(room.hostId)?1:0;
  if(enabled && !target.speaker && inUse+reservedHost>=max)throw fail(409,room.type==='cam'?'Đã đủ 6 vị trí phát camera (bao gồm chủ phòng)':'Đã đủ ghế nói');
  if(target.speaker!==enabled){
   try{await this.bridge.setPermission(id,targetId,enabled,room.type||'voice');}
   catch(error){
    await this.quarantineUncertainPermission(id,targetId,{holdUntil:enabled&&error?.code==='SFU_RPC_TIMEOUT'?Date.now()+100_000:0});
    throw fail(502,'Không xác nhận được quyền media; đã yêu cầu ngắt phiên để bảo vệ an toàn');
   }
   if(enabled)await this.assertGrantStillAuthorized(user,id,targetId);
   target.speaker=enabled;d.requests.delete(targetId);if(enabled)for(const [k,v]of d.invitations)if(v.toId===targetId)d.invitations.delete(k);this.emit('stage.changed',id);
  }
  return this.snapshot(user,id);
 });}

 /** Host/moderator may invite a viewer, but may NEVER publish their mic/camera
  * until the invited member explicitly accepts. An invitation does not reserve a seat. */
 async invite(user,id,targetId){return this.lock(id,async()=>{
  const {room}=this.permission(user,id);this.clean(id);const d=this.data(id),target=d.members.get(targetId);
  if(!targetId||targetId===user.id||!target||target.speaker)throw fail(422,'Chỉ có thể mời người xem đang trong phòng');
  if(this.data(id).members.get(user.id)?.role==='moderator'&&target.role!=='listener')throw fail(403,'Phó phòng chỉ có thể mời người xem');
  const max=room.type==='cam'?this.MAX_CAMERAS:this.MAX_SPEAKERS;
  const reserved=!d.members.has(room.hostId)?1:0;
  if([...d.members.values()].filter(x=>x.speaker).length+reserved>=max)throw fail(409,'Đã đủ vị trí trên sân khấu');
  if([...d.invitations.values()].some(x=>x.toId===targetId))throw fail(409,'Người này đã có lời mời chưa phản hồi');
  const inv={id:randomUUID(),fromId:user.id,fromName:user.name,toId:targetId,roomId:id,type:room.type||'voice',expiresAt:Date.now()+60_000};
  d.invitations.set(inv.id,inv);this.emit('stage.changed',id);
  return this.snapshot(user,id);
 });}
 async respondInvite(user,id,invitationId,accept){return this.lock(id,async()=>{
  this.ensure(user,id);this.clean(id);
  const d=this.data(id),inv=d.invitations.get(invitationId),room=this.store.getRoom(id);
  if(typeof accept!=='boolean'||!inv||inv.toId!==user.id)throw fail(404,'Lời mời không tồn tại hoặc không dành cho bạn');
  if(!accept){d.invitations.delete(invitationId);this.emit('stage.changed',id);return this.snapshot(user,id);}
  if(!['host','moderator'].includes(d.members.get(inv.fromId)?.role)){
   d.invitations.delete(invitationId);throw fail(403,'Người gửi không còn quyền mời');
  }
  const target=d.members.get(user.id);
  if(!target||target.speaker){d.invitations.delete(invitationId);throw fail(409,'Vị trí không còn khả dụng');}
  // Roles can change while a consent invitation is waiting. Recheck the
  // actor/target hierarchy at acceptance, not only when the invite was sent.
  if(d.members.get(inv.fromId)?.role==='moderator'&&target.role!=='listener'){
   d.invitations.delete(invitationId);this.emit('stage.changed',id);
   throw fail(403,'Phó phòng không thể cấp quyền cho phó phòng khác');
  }
  const max=room.type==='cam'?this.MAX_CAMERAS:this.MAX_SPEAKERS;
  const reserved=!d.members.has(room.hostId)?1:0;
  if([...d.members.values()].filter(x=>x.speaker).length+reserved>=max)throw fail(409,'Phòng đã đủ ghế, lời mời vẫn còn hiệu lực');
  // The SFU confirms permission BEFORE committing this membership change.
  try{await this.bridge.setPermission(id,user.id,true,room.type||'voice');}
  catch(error){
   await this.quarantineUncertainPermission(id,user.id,{holdUntil:error?.code==='SFU_RPC_TIMEOUT'?Date.now()+100_000:0});
   throw fail(502,'Không xác nhận được quyền media; đã yêu cầu ngắt phiên để bảo vệ an toàn');
  }
  await this.assertGrantStillAuthorized({id:inv.fromId},id,user.id);
  target.speaker=true;d.requests.delete(user.id);
  for(const [k,v] of d.invitations)if(v.toId===user.id)d.invitations.delete(k);
  this.emit('stage.changed',id);return this.snapshot(user,id);
 });}
 async cancelInvite(user,id,invitationId){return this.lock(id,async()=>{
  const {m}=this.permission(user,id);const d=this.data(id),inv=d.invitations.get(invitationId);
  if(!inv||!(inv.fromId===user.id||m.role==='host'))throw fail(404,'Không tìm thấy lời mời có thể hủy');
  d.invitations.delete(invitationId);this.emit('stage.changed',id);return this.snapshot(user,id);
 });}
 async leaveSeat(user,id){return this.lock(id,async()=>{
  this.ensure(user,id);this.clean(id);const room=this.store.getRoom(id),m=this.data(id).members.get(user.id);
  if(!m)throw fail(403,'Bạn chưa kết nối Live');
  if(room.hostId===user.id)throw fail(409,'Host không thể rời ghế nói');
  if(m.speaker){
   try{await this.bridge.setPermission(id,user.id,false,room.type||'voice');}
   catch{
    await this.quarantineUncertainPermission(id,user.id);
    throw fail(502,'Không xác nhận được việc tắt media; đã yêu cầu ngắt phiên');
   }
   m.speaker=false;this.emit('stage.changed',id);
  }
  return this.snapshot(user,id);
 });}
 async settings(user,id,input){return this.lock(id,async()=>{
  const room=this.ensure(user,id);if(room.hostId!==user.id)throw fail(403,'Chỉ chủ phòng được chỉnh cài đặt');
  if(!input || typeof input!=='object' || Array.isArray(input))throw fail(422,'Cài đặt không hợp lệ');
  const keys=Object.keys(input);if(!keys.length || keys.some(k=>!['locked','chatEnabled','slowModeSeconds'].includes(k)))throw fail(422,'Tùy chọn không hợp lệ');
  for(const key of keys){const value=input[key];
   if(key==='slowModeSeconds'){if(![0,5,10,30,60].includes(value))throw fail(422,'Chế độ chat chậm không hợp lệ');}
   else if(typeof value!=='boolean')throw fail(422,'Giá trị bật/tắt không hợp lệ');
  }
  Object.assign(room,input);this.store.save();this.emit('stage.changed',id);return this.snapshot(user,id);
 });}
 async moderate(user,id,targetId,action,options={}){return this.lock(id,async()=>{
  const {room,m}=this.permission(user,id);const d=this.data(id),target=d.members.get(targetId);
  const actions=['kick','ban','unban','promote','demote','mute-chat','unmute-chat'];
  if(!actions.includes(action))throw fail(422,'Hành động không hợp lệ');
  if(!targetId || targetId===room.hostId || targetId===user.id)throw fail(403,'Không thể quản lý chủ phòng hoặc chính mình');
  if(['promote','demote','unban'].includes(action) && m.role!=='host')throw fail(403,'Chỉ chủ phòng được phân quyền hoặc bỏ cấm');
  if(action==='unban'){
   delete this.store.db.roomBans?.[id]?.[targetId];this.audit(id,user.id,targetId,action);this.store.save();this.emit('stage.changed',id);return this.snapshot(user,id);
  }
  if(!target)throw fail(404,'Thành viên không còn ở trong phòng');
  if(m.role==='moderator' && target.role!=='listener')throw fail(403,'Phó phòng không thể xử lý phó phòng khác');
  if(action==='promote' || action==='demote'){
   this.store.db.roomModerators||={};const list=this.store.db.roomModerators[id]||=[];
   if(action==='promote'){if(!list.includes(targetId))list.push(targetId);target.role='moderator';}
   else{const ix=list.indexOf(targetId);if(ix>=0)list.splice(ix,1);target.role='listener';for(const [k,v]of d.invitations)if(v.fromId===targetId)d.invitations.delete(k);}
  }else if(action==='mute-chat' || action==='unmute-chat'){
   this.store.db.roomChatMutes||={};this.store.db.roomChatMutes[id]||={};
   if(action==='mute-chat'){
    const minutes=options.minutes===undefined?10:options.minutes;
    if(![5,10,30,60,1440].includes(minutes))throw fail(422,'Thời gian khóa chat không hợp lệ');
    this.store.db.roomChatMutes[id][targetId]=Date.now()+minutes*60_000;
   }else delete this.store.db.roomChatMutes[id][targetId];
  }else if(action==='kick' || action==='ban'){
   const minutes=options.minutes===undefined?60:options.minutes;
   if(action==='ban' && ![10,60,1440,10080].includes(minutes))throw fail(422,'Thời gian cấm không hợp lệ');
   // Persist removal intent before contacting SFU. A failed management API
   // call is NOT proof media has stopped, and must never allow token refresh.
   const key=this.fenceKey(id,targetId);
   this.unconfirmedDisconnects.add(key);
   this.setFence(id,targetId,'revoking');
   // Ban must become effective locally even when the SFU is unavailable.
   // A kick, unlike a ban, allows a later explicit room rejoin after cleanup.
   if(action==='ban'){
    this.store.db.roomBans||={};this.store.db.roomBans[id]||={};
    this.store.db.roomBans[id][targetId]=Date.now()+minutes*60_000;
    this.store.save();
   }
   let disconnected=false;
   try{await this.bridge.remove(id,targetId);disconnected=true;}
   catch{
    this.setFence(id,targetId,'pending');
    this.expiryRetryAfter.set(key,Date.now()+10_000);
   }
   if(disconnected){
    this.clearFence(id,targetId);
    this.unconfirmedDisconnects.delete(key);
    this.expiryRetryAfter.delete(key);
   }
   d.members.delete(targetId);d.requests.delete(targetId);
   for(const [k,v]of d.invitations)if(v.toId===targetId||v.fromId===targetId)d.invitations.delete(k);
   this.store.presence.get(id)?.delete(targetId);
   if(target.role==='moderator'){
    const mods=this.store.db.roomModerators?.[id]||[];
    const ix=mods.indexOf(targetId);if(ix>=0)mods.splice(ix,1);
   }
   if(!disconnected){
    this.audit(id,user.id,targetId,action,options.minutes);this.store.save();this.emit('stage.changed',id);
    throw fail(502,'Đã khóa quyền ở máy chủ Túttt nhưng chưa xác nhận ngắt trên SFU; sẽ thử thu hồi lại');
   }
  }
  this.audit(id,user.id,targetId,action,options.minutes);this.store.save();this.emit('stage.changed',id);return this.snapshot(user,id);
 });}
 /** Before minting a new token, positively revoke any old SFU participant. A
  * failed remove is NOT permission to reconnect with the same identity. */
 async reconcileDisconnect(user,id){
  // Never trigger a remote removal for a user who cannot currently enter.
  this.ensure(user,id);
  const key=this.fenceKey(id,user.id);
  if((this.store.db.livekitSessionFences?.[key]?.holdUntil||0)>Date.now())
   throw fail(409,'Đang cách ly quyền phát SFU chưa xác nhận; hãy thử lại sau');
  if(this.pendingExits.has(key))throw fail(409,'Đang rời phòng, hãy thử vào lại sau');
  // A sweep may already be revoking this identity; do not race a second
  // remove against a fresh connection.
  if(this.expiryRevocations.has(key))await this.expiryRevocations.get(key);
  if(!this.unconfirmedDisconnects.has(key))return;
  const existing=this.disconnectRetries.get(key);
  if(existing)return existing;
  const attempt=(async()=>{
   try{
    await this.bridge.remove(id,user.id);
    this.clearFence(id,user.id);
    this.unconfirmedDisconnects.delete(key);
   }catch{throw fail(409,'Chưa xác nhận ngắt media cũ, vui lòng thử lại sau');}
  })();
  const tracked=attempt.finally(()=>{if(this.disconnectRetries.get(key)===tracked)this.disconnectRetries.delete(key);});
  this.disconnectRetries.set(key,tracked);
  return tracked;
 }
 exit(user,id){
  const key=`${id}:${user.id}`;
  // Duplicate leave requests share the same in-flight operation. Otherwise a late
  // second leave could revoke a newly joined session for the same identity.
  const previous=this.pendingExits.get(key);
  if(previous)return previous;
  const pending=this.lock(id,async()=>{
   const d=this.rooms.get(id);
   const member=d?.members.get(user.id);
   let mediaDisconnectPending=this.unconfirmedDisconnects.has(key);
   if((member || this.store.db.livekitSessionFences[key]) && this.bridge.enabled){
    try{
     await this.bridge.remove(id,user.id);
     // A timed-out GRANT may still arrive late. An explicit leave must not
     // bypass the durable replay hold, even after this remove succeeds.
     if((this.store.db.livekitSessionFences?.[key]?.holdUntil||0)>Date.now()){
      this.unconfirmedDisconnects.add(key);mediaDisconnectPending=true;
     }else{
      this.clearFence(id,user.id);
      this.unconfirmedDisconnects.delete(key);mediaDisconnectPending=false;
     }
    }catch{
     // If cleanup or storage fails, fail closed: the next token request
     // must positively reconcile against SFU before issuing credentials.
     this.unconfirmedDisconnects.add(key);mediaDisconnectPending=true;
     try{this.setFence(id,user.id,'pending');}catch{ /* original fence remains in memory */ }
    }
   }
   // A temporary SFU outage must not strand the user in app membership.
   // This is local cleanup only; an SFU disconnect is NOT asserted on failure.
   d?.members.delete(user.id);d?.requests.delete(user.id);
   if(d)for(const [k,v]of d.invitations)if(v.toId===user.id||v.fromId===user.id)d.invitations.delete(k);
   this.emit('stage.changed',id);
   return {left:true,mediaDisconnectPending};
  });
  const tracked=pending.finally(()=>{if(this.pendingExits.get(key)===tracked)this.pendingExits.delete(key);});
  this.pendingExits.set(key,tracked);
  return tracked;
 }
}
module.exports={Stage};

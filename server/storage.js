'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const VALID_TAGS = new Set(['Tâm sự', 'Âm nhạc', 'Kết bạn', 'Học tập']);
const MAX_ROOM_PARTICIPANTS = 80;
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const uid = () => crypto.randomUUID();
const clean = (v, max) => typeof v === 'string' ? v.normalize('NFC').trim().replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max) : '';
class Store {
  constructor(file) {
    this.file=file; this.db={sessions:{},users:{},rooms:{},messages:{},reports:[]};
    if(fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file,'utf8'));
      this.db = { ...this.db, ...raw };
    }
    this.presence = new Map(); this.lastSent=new Map();
  }
  save() {
    const dir=path.dirname(this.file); fs.mkdirSync(dir,{recursive:true});
    const tmp=path.join(dir,'.'+path.basename(this.file)+'.'+process.pid+'.tmp');
    fs.writeFileSync(tmp,JSON.stringify(this.db,null,2),{mode:0o600});
    fs.renameSync(tmp,this.file);
  }
  session(name) {
    const displayName=clean(name,30) || 'Khách';
    const token=crypto.randomBytes(32).toString('base64url');
    const user={id:uid(),name:displayName,createdAt:Date.now(),blocked:[]};
    this.db.users[user.id]=user;
    this.db.sessions[sha(token)]={userId:user.id,expiresAt:Date.now()+30*86400e3};
    this.save(); return {token,user:this.publicUser(user)};
  }
  byToken(token) {
    if(!token || !/^[A-Za-z0-9_-]{40,64}$/.test(token))return null;
    const sess=this.db.sessions[sha(token)];
    return sess && sess.expiresAt>Date.now() ? this.db.users[sess.userId]||null : null;
  }
  publicUser(user){return {id:user.id,name:user.name,bio:user.bio||''};}
  profile(user,input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw fail(422,'Hồ sơ không hợp lệ');
    const name=clean(input.name,30);
    if(name.length<2)throw fail(422,'Tên cần ít nhất 2 ký tự');
    if(input.bio!==undefined&&typeof input.bio!=='string')throw fail(422,'Giới thiệu phải là văn bản');
    const bio=input.bio===undefined?user.bio||'':clean(input.bio,140);
    user.name=name;user.bio=bio;
    for(const room of Object.values(this.db.rooms))if(room.hostId===user.id)room.host=name;
    this.save();return this.publicUser(user);
  }
  listRooms(user) {return Object.values(this.db.rooms).filter(r=>!r.closed).sort((a,b)=>b.createdAt-a.createdAt).map(r=>this.presentRoom(r));}
  presentRoom(room) {return {...room, members:this.count(room.id),hostAv:'✦',color:'violet',art:'✳',speakers:[],featured:false};}
  count(roomId){const map=this.presence.get(roomId);if(!map)return 0;for(const [id,expiry] of map)if(expiry<Date.now())map.delete(id);return map.size;}
  // Authoritative room presence, independent of microphone, SFU or granted seats.
  // Only an active participant can see the room's public display names.
  audience(user,id,{stageMembers,voiceMembers}={}){
    const room=this.getRoom(id),present=this.presence.get(id),now=Date.now();
    if(!present || (present.get(user.id)||0)<=now)throw fail(403,'Hãy vào phòng trước khi xem người tham gia');
    const stage=stageMembers||new Map(),voice=voiceMembers||new Map();
    const members=[];
    for(const [uid,expiry] of present){
      if(expiry<=now){present.delete(uid);continue;}
      const person=this.db.users[uid];if(!person)continue;
      const stageSeat=stage.get(uid),voiceSeat=voice.get(uid);
      const onStage=Boolean((stageSeat?.expiresAt>now && stageSeat.speaker)||(voiceSeat?.expiresAt>now && voiceSeat.role==='speaker'));
      const role=uid===room.hostId?'host':this.db.roomModerators?.[id]?.includes(uid)?'moderator':onStage?'speaker':'viewer';
      members.push({id:uid,name:person.name,role,onStage});
    }
    const priority={host:0,moderator:1,speaker:2,viewer:3};
    members.sort((a,b)=>priority[a.role]-priority[b.role] || a.name.localeCompare(b.name,'vi'));
    return {roomId:id,selfId:user.id,count:members.length,members};
  }
  createRoom(user,input) {
    const title=clean(input.title,55), subtitle=clean(input.subtitle,120)||'Hãy kể câu chuyện của bạn';
    if(title.length<3)throw fail(422,'Tên phòng cần tối thiểu 3 ký tự');
    if(!VALID_TAGS.has(input.tag))throw fail(422,'Chủ đề không hợp lệ');
    if(Object.values(this.db.rooms).filter(r=>!r.closed).length>=200)throw fail(409,'Đã đạt giới hạn phòng thử nghiệm');
    const type=input.type===undefined?'voice':input.type;
    if(!['voice','cam'].includes(type))throw fail(422,'Kiểu phòng phải là voice hoặc cam');
    const room={id:uid(),title,subtitle,tag:input.tag,type,chatEnabled:true,slowModeSeconds:0,locked:false,host:user.name,hostId:user.id,createdAt:Date.now(),closed:false};
    this.db.rooms[room.id]=room;this.db.messages[room.id]=[];this.save(); return this.presentRoom(room);
  }
  getRoom(id) {const room=this.db.rooms[id];if(!room || room.closed)throw fail(404,'Không tìm thấy phòng');return room;}
  join(user,id){const room=this.getRoom(id);
    if(this.db.roomBans?.[id]?.[user.id]>Date.now())throw fail(403,'Bạn đang bị cấm tham gia phòng');
    const alreadyPresent=(this.presence.get(id)?.get(user.id)||0)>Date.now();
    if(room.locked && !alreadyPresent && room.hostId!==user.id && !this.db.roomModerators?.[id]?.includes(user.id))throw fail(403,'Phòng tạm khóa, chỉ ban quản lý có thể tham gia');
    // The room roster and SFU stage must enforce the SAME capacity. Reserve
    // a host slot while the host is away, otherwise 80 listeners could block
    // the host or join the room but be refused by the media stage.
    const count=this.count(id); // prunes expired presence before checking capacity
    const hostPresent=(this.presence.get(id)?.get(room.hostId)||0)>Date.now();
    const reserveHost=!hostPresent && user.id!==room.hostId ? 1 : 0;
    if(!alreadyPresent && count+reserveHost>=MAX_ROOM_PARTICIPANTS)
      throw fail(409,'Phòng đã đủ 80 người tham gia');
    if(!this.presence.has(id))this.presence.set(id,new Map());
    this.presence.get(id).set(user.id,Date.now()+90_000);
    return this.presentRoom(this.getRoom(id));}
  leave(user,id){this.getRoom(id);this.presence.get(id)?.delete(user.id);return this.presentRoom(this.getRoom(id));}
  messages(user,id){const room=this.getRoom(id);if(room.hostId!==user.id && (!this.presence.get(id)?.get(user.id) || this.presence.get(id).get(user.id)<Date.now()))throw fail(403,'Bạn phải tham gia phòng để xem tin nhắn');return (this.db.messages[id]||[]).filter(m=>!user.blocked?.includes(m.userId)).slice(-100);}
  send(user,id,input) {
    const room=this.getRoom(id);
    if(!this.presence.get(id)?.get(user.id) || this.presence.get(id).get(user.id)<Date.now())throw fail(403,'Vui lòng vào phòng trước khi gửi tin');
    const privileged=room.hostId===user.id || this.db.roomModerators?.[id]?.includes(user.id);
    if(!room.chatEnabled && !privileged)throw fail(403,'Chat của phòng đang tạm khóa');
    if(!privileged && this.db.roomChatMutes?.[id]?.[user.id]>Date.now())throw fail(403,'Bạn đang bị hạn chế gửi tin nhắn');
    const minDelay=(room.slowModeSeconds||0)*1000, key=id+':'+user.id;
    if(!privileged && minDelay && Date.now()-(this.lastSent.get(key)||0)<minDelay)throw fail(429,'Phòng đang bật chế độ chat chậm');
    const value=clean(input.text,500);
    if(!value || value.length>500)throw fail(422,'Tin nhắn không hợp lệ');
    const message={id:uid(),roomId:id,userId:user.id,name:user.name,text:value,createdAt:Date.now()};
    const messages=this.db.messages[id];messages.push(message);if(messages.length>300)messages.splice(0,messages.length-300);
    this.lastSent.set(key,Date.now());this.save();return message;
  }
  report(user,input) {
    const roomId=clean(input.roomId,64),reason=clean(input.reason,250);
    this.getRoom(roomId);
    if(reason.length<8)throw fail(422,'Cần mô tả lý do tối thiểu 8 ký tự');
    // Duplicate taps or a mobile retry must not flood the review queue.
    const existing=this.db.reports.findLast(r=>r.fromUserId===user.id&&r.roomId===roomId&&r.reason===reason&&Date.now()-r.createdAt<120_000);
    if(existing)return {submitted:true,reportId:existing.id,status:existing.status||'open',duplicate:true};
    const report={id:uid(),fromUserId:user.id,roomId,reason,status:'open',createdAt:Date.now(),updatedAt:null,reviewHistory:[]};
    this.db.reports.push(report);
    this.save();return {submitted:true,reportId:report.id,status:'open',duplicate:false};
  }
  myReports(user){return {reports:this.db.reports.filter(r=>r.fromUserId===user.id).slice(-50).reverse().map(r=>({id:r.id,roomId:r.roomId,status:r.status||'open',createdAt:r.createdAt,updatedAt:r.updatedAt||null}))};}
  reviewQueue(status='open'){
    const valid=['open','reviewing','resolved','dismissed','all'];
    if(!valid.includes(status))throw fail(422,'Bộ lọc trạng thái không hợp lệ');
    return {reports:this.db.reports.filter(r=>status==='all'||(r.status||'open')===status).slice(-100).reverse().map(r=>({...r,status:r.status||'open'}))};
  }
  reviewReport(reportId,input){
    const report=this.db.reports.find(r=>r.id===reportId);
    if(!report)throw fail(404,'Không tìm thấy báo cáo');
    const status=input.status,note=clean(input.note,500);
    if(!['reviewing','resolved','dismissed'].includes(status))throw fail(422,'Trạng thái không hợp lệ');
    const previous=report.status||'open';
    if(['resolved','dismissed'].includes(previous))throw fail(409,'Báo cáo đã được đóng; không ghi đè kết quả');
    if(previous===status)throw fail(409,'Trạng thái đã được cập nhật');
    if(status!=='reviewing' && note.length<8)throw fail(422,'Cần lý do xử lý tối thiểu 8 ký tự');
    const timestamp=Date.now();report.status=status;report.updatedAt=timestamp;
    report.reviewHistory||=[];
    report.reviewHistory.push({from:previous,to:status,note,reviewer:'configured-operator',createdAt:timestamp});
    this.save();return {id:report.id,roomId:report.roomId,status:report.status,updatedAt:timestamp};
  }
  block(user,targetId){if(targetId===user.id)throw fail(422,'Không thể chặn chính mình');if(!this.db.users[targetId])throw fail(404,'Người dùng không tồn tại');user.blocked ||= [];if(!user.blocked.includes(targetId))user.blocked.push(targetId);this.save();return {blocked:true};}
}
function fail(status,message){return Object.assign(new Error(message),{status});}
module.exports={Store,fail,clean,MAX_ROOM_PARTICIPANTS};

'use strict';
/**
 * Two-room friendly PK controller for the single-process prototype.
 * Scores are FREE encouragement points, not gifts, coins or revenue.
 * Cross-room media is NOT bridged: this module owns state/authorization only.
 * Production needs DB transactions, a verified gift ledger and SFU cross-room subscriptions.
 */
const {randomUUID}=require('node:crypto');
const {fail}=require('./storage');
const INVITE_MS=60_000;
const MAX_PER_MATCH=30;
class PKMatches {
  constructor(store,{emit=()=>{}}={}) {
    this.store=store;this.emit=emit;
    store.db.pk ||= {invites:{},matches:{}};
    store.db.pk.streaks ||= {}; // durable, per-room consecutive wins; never inferred from client scores
    this.lastCheer=new Map();
  }
  room(id){return this.store.getRoom(id);}
  membership(user,id){
    const room=this.room(id);
    const expiry=this.store.presence.get(id)?.get(user.id);
    if(!expiry||expiry<=Date.now())throw fail(403,'Bạn cần ở trong phòng để tham gia PK');
    if((this.store.db.roomBans?.[id]?.[user.id]||0)>Date.now())throw fail(403,'Bạn đã bị cấm tham gia phòng');
    return room;
  }
  owner(user,id){const room=this.membership(user,id);if(room.hostId!==user.id)throw fail(403,'Chỉ chủ phòng mới được quản lý PK');return room;}
  all(){return this.store.db.pk;}
  emitBoth(match){this.emit('pk.changed',match.roomA);this.emit('pk.changed',match.roomB);}
  // Exactly-once finalization, shared by timeout, forfeit and host departure.
  // A draw breaks both streaks. New rooms begin from zero; previous untracked
  // releases cannot be reconstructed reliably and are never counted as wins.
  finalize(m,{winner,reason,finishedAt=Date.now()}){
    if(m.status!=='active')return false;
    const streaks=this.all().streaks;
    const a=Number(streaks[m.roomA])||0,b=Number(streaks[m.roomB])||0;
    streaks[m.roomA]=winner==='A'?a+1:0;
    streaks[m.roomB]=winner==='B'?b+1:0;
    m.status='finished';m.finishedAt=finishedAt;m.winner=winner;m.reason=reason;
    m.winStreak=winner==='A'?streaks[m.roomA]:winner==='B'?streaks[m.roomB]:0;
    return true;
  }
  finishExpired(){
    const now=Date.now();let changed=false;
    for(const inv of Object.values(this.all().invites)){
      if(inv.status==='pending'&&inv.expiresAt<=now){inv.status='expired';changed=true;this.emit('pk.changed',inv.roomA);this.emit('pk.changed',inv.roomB);}
    }
    for(const m of Object.values(this.all().matches)){
      if(m.status==='active'&&m.endsAt<=now){this.finalize(m,{winner:m.scoreA===m.scoreB?null:m.scoreA>m.scoreB?'A':'B',reason:'timeout',finishedAt:m.endsAt});changed=true;this.emitBoth(m);}
    }
    if(changed)this.store.save();
  }
  privateMatch(m){
    const a=this.room(m.roomA),b=this.room(m.roomB);
    return {id:m.id,status:m.status,roomA:{id:a.id,title:a.title,host:a.host},roomB:{id:b.id,title:b.title,host:b.host},scoreA:m.scoreA,scoreB:m.scoreB,startedAt:m.startedAt,endsAt:m.endsAt,finishedAt:m.finishedAt||null,winner:m.winner??null,reason:m.reason||null,winStreak:Number.isInteger(m.winStreak)?m.winStreak:null,scoreType:'free-cheers',note:'Điểm cổ vũ miễn phí, không phải coin/quà tặng thật; video/audio hai phòng chưa được ghép'};
  }
  snapshot(user,id){
    this.membership(user,id);this.finishExpired();
    const inv=Object.values(this.all().invites).filter(x=>x.status==='pending'&&(x.roomA===id||x.roomB===id));
    const matches=Object.values(this.all().matches).filter(x=>x.roomA===id||x.roomB===id).sort((a,b)=>b.startedAt-a.startedAt);
    const current=matches.find(x=>x.status==='active')||null;
    return {
      roomId:id,host: this.room(id).hostId===user.id,
      invites:this.room(id).hostId===user.id?inv.map(x=>({id:x.id,roomA:x.roomA,roomB:x.roomB,from:this.room(x.roomA).host,to:this.room(x.roomB).host,expiresAt:x.expiresAt,durationSeconds:x.durationSeconds})):[],
      match:current?this.privateMatch(current):null,
      recent:matches.filter(x=>x.status!=='active').slice(0,2).map(x=>this.privateMatch(x)),
      available:Object.values(this.store.db.rooms).filter(r=>!r.closed&&r.id!==id&&r.type===this.room(id).type&&r.hostId!==user.id&&this.store.presence.get(r.id)?.get(r.hostId)>Date.now()).map(r=>({id:r.id,title:r.title,host:r.host,type:r.type})).slice(0,20)
    };
  }
  busy(id){
    return Object.values(this.all().matches).some(x=>x.status==='active'&&(x.roomA===id||x.roomB===id))||Object.values(this.all().invites).some(x=>x.status==='pending'&&(x.roomA===id||x.roomB===id));
  }
  invite(user,sourceId,targetId,durationSeconds=180){
    const source=this.owner(user,sourceId),target=this.room(targetId);
    this.finishExpired();
    if(source.id===target.id)throw fail(422,'Không thể PK với chính phòng mình');
    if(source.type!==target.type)throw fail(422,'Bản thử nghiệm chỉ hỗ trợ PK giữa hai phòng cùng loại');
    if(target.hostId===user.id)throw fail(422,'Hai phòng phải có chủ phòng khác nhau');
    if(!this.store.presence.get(target.id)?.get(target.hostId)||this.store.presence.get(target.id).get(target.hostId)<=Date.now())throw fail(409,'Chủ phòng đối phương chưa trực tuyến');
    if(!Number.isInteger(durationSeconds)||durationSeconds<60||durationSeconds>600)throw fail(422,'Thời lượng PK cần từ 60 đến 600 giây');
    if(this.busy(sourceId)||this.busy(targetId))throw fail(409,'Một trong hai phòng đang có PK hoặc lời mời chờ');
    const inv={id:randomUUID(),roomA:sourceId,roomB:targetId,fromId:user.id,toId:target.hostId,durationSeconds,status:'pending',createdAt:Date.now(),expiresAt:Date.now()+INVITE_MS};
    this.all().invites[inv.id]=inv;this.store.save();this.emit('pk.changed',sourceId);this.emit('pk.changed',targetId);
    return {invitationId:inv.id,status:'pending',expiresAt:inv.expiresAt};
  }
  respond(user,targetRoomId,invId,accept){
    this.owner(user,targetRoomId);this.finishExpired();
    if(typeof accept!=='boolean')throw fail(422,'Cần chấp nhận hoặc từ chối rõ ràng');
    const inv=this.all().invites[invId];
    if(!inv||inv.status!=='pending'||inv.roomB!==targetRoomId||inv.toId!==user.id)throw fail(404,'Lời mời không còn hiệu lực');
    if(inv.expiresAt<=Date.now())throw fail(409,'Lời mời đã hết hạn');
    if(!accept){inv.status='declined';this.store.save();this.emit('pk.changed',inv.roomA);this.emit('pk.changed',inv.roomB);return {status:'declined'};}
    const source=this.room(inv.roomA);
    if(!this.store.presence.get(source.id)?.get(source.hostId)||this.store.presence.get(source.id).get(source.hostId)<=Date.now())throw fail(409,'Chủ phòng gửi lời mời đã rời phòng');
    if(Object.values(this.all().matches).some(m=>m.status==='active'&&[inv.roomA,inv.roomB].some(id=>m.roomA===id||m.roomB===id)))throw fail(409,'Một trong hai phòng đang PK');
    inv.status='accepted';const start=Date.now();
    const match={id:randomUUID(),roomA:inv.roomA,roomB:inv.roomB,scoreA:0,scoreB:0,startedAt:start,endsAt:start+inv.durationSeconds*1000,status:'active',winner:null,cheers:{}};
    this.all().matches[match.id]=match;this.store.save();this.emitBoth(match);return {status:'active',match:this.privateMatch(match)};
  }
  cancel(user,id,invId){
    this.owner(user,id);this.finishExpired();const inv=this.all().invites[invId];
    if(!inv||inv.status!=='pending'||inv.roomA!==id||inv.fromId!==user.id)throw fail(404,'Không có lời mời cần hủy');
    inv.status='cancelled';this.store.save();this.emit('pk.changed',inv.roomA);this.emit('pk.changed',inv.roomB);return {status:'cancelled'};
  }
  cheer(user,roomId,matchId){
    this.membership(user,roomId);this.finishExpired();const m=this.all().matches[matchId];
    if(!m||m.status!=='active'||![m.roomA,m.roomB].includes(roomId))throw fail(409,'Không có trận PK đang diễn ra');
    if(m.endsAt<=Date.now())throw fail(409,'Trận PK đã kết thúc');
    const key=matchId+':'+user.id,now=Date.now();
    if((this.lastCheer.get(key)||0)>now-2000)throw fail(429,'Hãy cổ vũ chậm hơn một chút');
    if((m.cheers[key]||0)>=MAX_PER_MATCH)throw fail(429,'Bạn đã đạt giới hạn cổ vũ của trận');
    this.lastCheer.set(key,now);m.cheers[key]=(m.cheers[key]||0)+1;
    if(m.roomA===roomId)m.scoreA++;else m.scoreB++;
    this.store.save();this.emitBoth(m);return this.privateMatch(m);
  }
  end(user,roomId,matchId){
    this.owner(user,roomId);this.finishExpired();const m=this.all().matches[matchId];
    if(!m||m.status!=='active'||![m.roomA,m.roomB].includes(roomId))throw fail(404,'Không có PK đang diễn ra');
    this.finalize(m,{winner:m.roomA===roomId?'B':'A',reason:'forfeit'});this.store.save();this.emitBoth(m);return this.privateMatch(m);
  }
  onHostLeave(user,roomId){
    const m=Object.values(this.all().matches).find(x=>x.status==='active'&&(x.roomA===roomId||x.roomB===roomId));
    if(m && this.room(roomId).hostId===user.id){this.finalize(m,{winner:m.roomA===roomId?'B':'A',reason:'host-left'});this.store.save();this.emitBoth(m);}
  }
}
module.exports={PKMatches};

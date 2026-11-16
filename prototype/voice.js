'use strict';
/** Tiny WebRTC mesh client for a local demo. SFU/TURN required for scale and robust networks. */
window.TutttVoice=class TutttVoice {
 constructor(api,updated,notice){
  this.api=api;this.updated=updated;this.notice=notice;
  this.roomId=null;this.selfId=null;this.roster=[];this.peers=new Map();this.stream=null;this.mic=false;this.generation=0;this.micPending=false;this.micRequestToken=0;this.seatPending=false;this.captureIssue='';
  this.deviceHint='';this.deviceChangeTimer=null;this.deviceHintTimer=null;this.lastMicEnabledAt=0;
  this.activeMicTrackEnded=null;this.boundDeviceChange=()=>this.audioDevicesChanged();this.deviceWatcherAttached=false;
  this.speakingIds=new Set();this.meters=new Map();this.audioContext=null;this.activityTimer=null;
  this.supported=!!(window.RTCPeerConnection&&navigator.mediaDevices?.getUserMedia&&window.isSecureContext);
  let stage=document.getElementById('tuttt-audio-stage');
  if(!stage){stage=document.createElement('div');stage.id='tuttt-audio-stage';stage.hidden=true;document.body.appendChild(stage)}
  this.stage=stage;
 }
 get self(){return this.roster.find(p=>p.id===this.selfId)}
 async request(suffix,method='GET',payload){return this.api(`/rooms/${this.roomId}/voice${suffix}`,method,payload)}
 async enter(roomId){
  if(this.roomId!==roomId)await this.exit();
  if(!this.supported)throw new Error('Voice cần Chrome/Safari hiện đại và HTTPS hoặc localhost. Chat chữ vẫn hoạt động.');
  this.roomId=roomId;this.generation++;this.seatPending=false;const gen=this.generation;this.attachDeviceWatcher();
  try{
   const roster=await this.api(`/rooms/${roomId}/voice/join`,'POST');
   if(gen!==this.generation||this.roomId!==roomId)return;
   this.apply(roster);
  }catch(error){
   // A rejected request from a departed room must never clear a newer room.
   if(gen!==this.generation||this.roomId!==roomId)return;
   this.roomId=null;this.detachDeviceWatcher();throw error;
  }
 }
 apply(roster){
  if(!roster || this.roomId!==roster.roomId)return;
  this.selfId=roster.selfId;this.roster=roster.participants;
  const remote=new Set(this.roster.map(x=>x.id).filter(x=>x!==this.selfId));
  for(const id of this.peers.keys())if(!remote.has(id))this.dropPeer(id);
  for(const id of remote)if(!this.peers.has(id))this.createPeer(id);
  if(this.self?.role!=='speaker' && (this.mic||this.micPending))void this.disableLocalMic();
  this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,kind:'browser-webrtc-mesh',activeSpeakerIds:[...this.speakingIds]});
 }
 async refresh(){
  if(!this.roomId)return;
  const current=this.roomId;
  const generation=this.generation;
  try{const roster=await this.request('');if(this.roomId===current&&this.generation===generation)this.apply(roster)}
  catch(err){if(this.roomId===current&&this.generation===generation)this.notice(err.message)}
 }
 async heartbeat(){if(!this.roomId)return;const generation=this.generation;const room=this.roomId;try{const roster=await this.request('/heartbeat','POST');if(generation===this.generation&&room===this.roomId)this.apply(roster)}catch(err){if(generation===this.generation&&room===this.roomId)this.notice('Không đồng bộ được danh sách Voice: '+err.message)}}
 async seat(speaker){
  if(!this.roomId)throw new Error('Voice chưa kết nối');
  // A pending leave/join must not be inverted by a second tap using stale UI.
  if(this.seatPending)return;
  const room=this.roomId,generation=this.generation;
  const current=()=>this.roomId===room&&this.generation===generation;
  this.seatPending=true;this.emitMicState();
  try{
   if(!speaker)await this.disableLocalMic();
   if(!current())return;
   const roster=await this.api(`/rooms/${room}/voice/seat`,'POST',{speaker});
   // A response after leaving or re-entering the same room is never authoritative.
   if(current())this.apply(roster);
  }finally{
   if(current()){this.seatPending=false;this.emitMicState();}
  }
 }
 /** Device-change signals can mean microphone, speaker, or Bluetooth route changes.
  * They are NOT proof that capture failed. Browser output routing remains OS-owned.
  * Never call getUserMedia(), replaceTrack(), or publish just because devices changed. */
 attachDeviceWatcher(){
  if(this.deviceWatcherAttached||!navigator.mediaDevices?.addEventListener)return;
  navigator.mediaDevices.addEventListener('devicechange',this.boundDeviceChange);
  this.deviceWatcherAttached=true;
 }
 detachDeviceWatcher(){
  if(this.deviceWatcherAttached){navigator.mediaDevices?.removeEventListener?.('devicechange',this.boundDeviceChange);this.deviceWatcherAttached=false;}
  if(this.deviceChangeTimer!==null){clearTimeout(this.deviceChangeTimer);this.deviceChangeTimer=null;}
  if(this.deviceHintTimer!==null){clearTimeout(this.deviceHintTimer);this.deviceHintTimer=null;}
  this.deviceHint='';this.activeMicTrackEnded=null;
 }
 audioDevicesChanged(){
  if(!this.roomId||!this.mic||!this.stream)return;
  if(this.deviceChangeTimer!==null)clearTimeout(this.deviceChangeTimer);
  const generation=this.generation,roomId=this.roomId,stream=this.stream;
  this.deviceChangeTimer=setTimeout(()=>{
   this.deviceChangeTimer=null;
   if(this.generation!==generation||this.roomId!==roomId||this.stream!==stream||!this.mic)return;
   const track=stream.getAudioTracks?.()[0];
   if(track?.readyState==='ended'){this.activeMicTrackEnded?.();return;}
   if(!track||track.muted||Date.now()-this.lastMicEnabledAt<1500)return;
   this.deviceHint='Thiết bị âm thanh vừa thay đổi. Nếu không nghe được, hãy kiểm tra tai nghe, Bluetooth hoặc âm lượng của máy.';
   this.emitMicState();
   if(this.deviceHintTimer!==null)clearTimeout(this.deviceHintTimer);
   this.deviceHintTimer=setTimeout(()=>{
    this.deviceHintTimer=null;
    if(this.generation!==generation||this.roomId!==roomId||this.stream!==stream)return;
    this.deviceHint='';this.emitMicState();
   },5500);
  },450);
 }
 /** All microphone grants belong to the room/generation that initiated them.
  * No permission prompt is made by network reconnection or roster refresh. */
 emitMicState(){
  this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,
   micPending:this.micPending,captureIssue:this.captureIssue,deviceHint:this.deviceHint,
   activeSpeakerIds:[...this.speakingIds],peerReconnecting:this.peerRecoverySnapshot(),activityOnly:true});
 }
 microphoneError(error){
  switch(error?.name){
   case 'NotAllowedError':case 'PermissionDeniedError':case 'SecurityError':
    return 'Quyền microphone bị từ chối. Hãy cấp quyền trong cài đặt trình duyệt rồi bấm Bật mic.';
   case 'NotFoundError':case 'DevicesNotFoundError':
    return 'Không tìm thấy microphone. Hãy kết nối hoặc chọn thiết bị thu âm rồi thử lại.';
   case 'NotReadableError':case 'TrackStartError':
    return 'Microphone đang được thiết bị khác sử dụng hoặc không thể khởi động.';
   case 'OverconstrainedError':
    return 'Microphone không hỗ trợ cấu hình thu âm hiện tại.';
   case 'AbortError':
    return 'Thiết bị microphone bị ngắt trong lúc khởi động. Hãy thử lại.';
   default:return 'Không bật được microphone: '+(error?.message||'Lỗi thiết bị không xác định');
  }
 }
 async toggleMic(){
  if(!this.roomId)throw new Error('Voice chưa kết nối');
  // Fast double taps must not create two concurrent getUserMedia streams.
  if(this.micPending)return;
  if(this.mic){
   const generation=this.generation,room=this.roomId;
   await this.disableLocalMic();
   if(this.generation===generation&&this.roomId===room){
    const roster=await this.api(`/rooms/${room}/voice/mic`,'POST',{enabled:false});
    if(this.generation===generation&&this.roomId===room)this.apply(roster);
   }
   return;
  }
  if(this.self?.role!=='speaker')throw new Error('Hãy lên ghế nói trước khi bật mic');
  if(!this.supported)throw new Error('Trình duyệt hoặc kết nối hiện tại không cho phép sử dụng microphone');
  const generation=this.generation,room=this.roomId,selfId=this.selfId,token=++this.micRequestToken;
  const current=()=>this.generation===generation&&this.roomId===room&&this.selfId===selfId&&this.micRequestToken===token;
  this.micPending=true;this.captureIssue='';this.emitMicState();
  let stream=null,serverEnabled=false;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(!current()){stream.getTracks().forEach(t=>t.stop());return;}
   const track=stream.getAudioTracks()[0];
   if(!track||track.readyState==='ended')throw Object.assign(new Error('Thiết bị không cung cấp âm thanh'),{name:'NotFoundError'});
   if(this.self?.role!=='speaker')throw new Error('Bạn không còn quyền dùng ghế nói');
   const roster=await this.api(`/rooms/${room}/voice/mic`,'POST',{enabled:true});
   serverEnabled=true;
   if(!current()){stream.getTracks().forEach(t=>t.stop());return;}
   if(roster.participants?.find(p=>p.id===selfId)?.role!=='speaker')throw new Error('Quyền lên ghế nói đã được thu hồi');
   this.stream=stream;this.mic=true;this.lastMicEnabledAt=Date.now();this.deviceHint='';this.apply(roster);this.watchMedia(selfId,stream);
   const onMicTrackEnded=()=>{
    if(!current()||this.stream!==stream)return;
    void this.disableLocalMic().then(()=>{
     if(this.roomId===room&&this.generation===generation){
      this.captureIssue='Microphone đã ngắt hoặc quyền truy cập thay đổi. Hãy kiểm tra thiết bị rồi bật lại mic.';
      this.emitMicState();this.notice('Microphone đã bị ngắt. Kiểm tra thiết bị rồi bật lại mic.');
      return this.api(`/rooms/${room}/voice/mic`,'POST',{enabled:false});
     }
    }).catch(()=>this.notice('Microphone đã ngắt; không đồng bộ được trạng thái mic.'));
   };
   this.activeMicTrackEnded=onMicTrackEnded;
   track.addEventListener?.('ended',onMicTrackEnded,{once:true});
   track.addEventListener?.('mute',()=>{
    if(!current()||this.stream!==stream)return;
    this.stopWatching(selfId);
    this.captureIssue='Microphone đang tạm gián đoạn. Kiểm tra kết nối hoặc quyền thiết bị.';
    this.emitMicState();
   });
   track.addEventListener?.('unmute',()=>{
    if(!current()||this.stream!==stream||track.readyState==='ended')return;
    this.captureIssue='';this.watchMedia(selfId,stream);this.emitMicState();
   });
   await Promise.allSettled([...this.peers.values()].map(peer=>peer.sender.replaceTrack(track)));
   if(current())this.emitMicState();
  }catch(error){
   stream?.getTracks().forEach(t=>t.stop());
   if(!current())return; // Stale permissions never re-enable a departed room.
   this.stream=null;this.mic=false;this.stopWatching(selfId);
   if(serverEnabled)void this.api(`/rooms/${room}/voice/mic`,'POST',{enabled:false}).catch(()=>{});
   const message=this.microphoneError(error);this.captureIssue=message;this.emitMicState();
   throw new Error(message);
  }finally{
   if(current()){this.micPending=false;this.emitMicState();}
  }
 }
 async disableLocalMic(){
  // Invalidates any unresolved permission prompt immediately, before awaiting peers.
  this.micRequestToken++;this.micPending=false;this.mic=false;this.captureIssue='';this.deviceHint='';this.activeMicTrackEnded=null;
  if(this.deviceChangeTimer!==null){clearTimeout(this.deviceChangeTimer);this.deviceChangeTimer=null;}
  if(this.deviceHintTimer!==null){clearTimeout(this.deviceHintTimer);this.deviceHintTimer=null;}
  const previous=this.stream;this.stream=null;
  previous?.getTracks().forEach(t=>t.stop());this.stopWatching(this.selfId);
  this.emitMicState();
  await Promise.allSettled([...this.peers.values()].map(peer=>peer.sender.replaceTrack(null)));
 }
 createPeer(id){
  if(this.peers.has(id)||!this.selfId||!this.roomId)return;
  const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  const transceiver=pc.addTransceiver('audio',{direction:'sendrecv'});
  const peer={pc,sender:transceiver.sender,makingOffer:false,ignoreOffer:false,settingRemoteAnswer:false,pendingCandidates:[],audio:null,recoveryTimer:null,recoveryAttempts:0};
  this.peers.set(id,peer);
  const room=this.roomId,generation=this.generation;
  const active=()=>this.roomId===room&&this.generation===generation&&this.peers.get(id)===peer;
  if(this.stream?.getAudioTracks()[0])peer.sender.replaceTrack(this.stream.getAudioTracks()[0]).catch(()=>{});
  pc.ontrack=(event)=>{
   if(!active())return;
   let el=peer.audio;
   if(!el){el=document.createElement('audio');el.autoplay=true;el.playsInline=true;el.dataset.peerId=id;this.stage.appendChild(el);peer.audio=el;}
   el.srcObject=event.streams[0]||new MediaStream([event.track]);
   this.watchMedia(id,el.srcObject);
   event.track?.addEventListener?.('ended',()=>{
    if(this.meters.get(id)?.track===event.track)this.stopWatching(id);
   },{once:true});
   el.play().catch(()=>this.notice('Trình duyệt đã chặn tự phát âm thanh. Hãy chạm vào nút “Bật tiếng” trong phòng.'));
  };
  pc.onicecandidate=({candidate})=>{if(candidate&&active())this.sendSignal(id,'candidate',candidate.toJSON(),room,generation,peer).catch(()=>{})};
  pc.onconnectionstatechange=()=>{if(active())this.peerConnectionChanged(id,peer)};
  pc.onnegotiationneeded=async()=>{
   if(!active()||peer.makingOffer)return;
   try{
    peer.makingOffer=true;await pc.setLocalDescription();
    if(active()&&pc.localDescription)await this.sendSignal(id,pc.localDescription.type,{type:pc.localDescription.type,sdp:pc.localDescription.sdp},room,generation,peer);
   }catch(err){if(active())this.notice('Không thể thiết lập kết nối voice: '+err.message)}finally{peer.makingOffer=false}
  };
 }
 /** Peer recovery is bounded and scoped to the current room. No microphone
  * permission request or fake speaking indicator is triggered by a retry. */
 peerRecoverySnapshot(){
  return [...this.peers].filter(([,p])=>['disconnected','failed'].includes(p.pc.connectionState)).map(([id])=>id);
 }
 notifyPeerActivity(){
  if(!this.roomId)return;
  this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,
   activeSpeakerIds:[...this.speakingIds],peerReconnecting:this.peerRecoverySnapshot(),activityOnly:true});
 }
 clearRecoveryTimer(peer){
  if(peer.recoveryTimer!==null){clearTimeout(peer.recoveryTimer);peer.recoveryTimer=null;}
 }
 queuePeerRecovery(id,peer,delay){
  if(peer.recoveryTimer!==null||peer.recoveryAttempts>=3)return;
  const generation=this.generation,room=this.roomId;
  peer.recoveryTimer=setTimeout(()=>{
   peer.recoveryTimer=null;
   if(!room||this.roomId!==room||generation!==this.generation||this.peers.get(id)!==peer)return;
   if(!['disconnected','failed'].includes(peer.pc.connectionState))return;
   peer.recoveryAttempts++;
   if(typeof peer.pc.restartIce==='function'){
    try{peer.pc.restartIce()}catch{/* Browser/network may reject; the next attempt remains bounded. */}
   }else{
    this.notice('Trình duyệt không hỗ trợ tự khôi phục kết nối âm thanh. Hãy vào lại phòng.');return;
   }
   if(peer.recoveryAttempts<3)this.queuePeerRecovery(id,peer,[0,1800,4200][peer.recoveryAttempts]);
   else this.notice('Không nối lại được âm thanh với một thành viên. Có thể cần TURN hoặc vào lại phòng.');
  },delay);
 }
 peerConnectionChanged(id,peer){
  if(this.peers.get(id)!==peer)return;
  const state=peer.pc.connectionState;
  if(state==='connected'){
   this.clearRecoveryTimer(peer);peer.recoveryAttempts=0;
   const track=peer.audio?.srcObject?.getAudioTracks?.()?.[0];
   if(track?.readyState==='live')this.watchMedia(id,peer.audio.srcObject);
  }else if(state==='disconnected'||state==='failed'){
   // A stopped peer cannot retain a green speaking ring from stale samples.
   this.stopWatching(id);
   this.queuePeerRecovery(id,peer,state==='failed'?500:2300);
  }else if(state==='closed')this.clearRecoveryTimer(peer);
  this.notifyPeerActivity();
 }
 /** Read voice activity locally from the actual WebRTC audio track. No microphone/camera auto-enable. */
 watchMedia(id,stream){
  if(!id||!stream||!window.AudioContext&&!window.webkitAudioContext)return;
  try{
   if(!this.audioContext){const Ctx=window.AudioContext||window.webkitAudioContext;this.audioContext=new Ctx();}
   const ctx=this.audioContext;this.stopWatching(id);
   const source=ctx.createMediaStreamSource(stream),analyser=ctx.createAnalyser();
   analyser.fftSize=512;source.connect(analyser);
   this.meters.set(id,{source,analyser,track:stream.getAudioTracks?.()[0],samples:new Uint8Array(analyser.fftSize),positive:0,negative:0,active:false});
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   if(!this.activityTimer)this.activityTimer=setInterval(()=>this.sampleSpeaking(),240);
  }catch{/* Audio metering may be blocked by browser; do not simulate speech. */}
 }
 sampleSpeaking(){
  if(!this.roomId||this.audioContext?.state!=='running'){
   if(this.speakingIds.size){
    this.speakingIds.clear();
    for(const meter of this.meters.values()){meter.active=false;meter.positive=0;meter.negative=0;}
    if(this.roomId)this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,activeSpeakerIds:[],activityOnly:true});
   }
   return;
  }
  let changed=false;
  for(const [id,m] of this.meters){
   const remote=this.roster.find(p=>p.id===id);
   const peer=this.peers.get(id);
   const trackLive=m.track?.readyState!=='ended'&&m.track?.muted!==true;
   const connected=id===this.selfId||peer?.pc.connectionState==='connected';
   const micOn=trackLive&&connected&&(id===this.selfId?this.mic:remote?.mic===true);
   let talking=false;
   if(micOn){m.analyser.getByteTimeDomainData(m.samples);let sum=0;
    for(const sample of m.samples){const centered=(sample-128)/128;sum+=centered*centered;}
    talking=Math.sqrt(sum/m.samples.length)>.035;
   }
   m.positive=talking?Math.min(3,m.positive+1):0;
   m.negative=talking?0:Math.min(3,m.negative+1);
   const next=m.active?m.negative<3:m.positive>=2;
   if(next!==m.active){m.active=next;if(next)this.speakingIds.add(id);else this.speakingIds.delete(id);changed=true;}
  }
  if(changed)this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,activeSpeakerIds:[...this.speakingIds],activityOnly:true});
 }
 stopWatching(id){
  const meter=this.meters.get(id);
  if(meter){try{meter.source.disconnect()}catch{};this.meters.delete(id)}
  const wasSpeaking=this.speakingIds.delete(id);
  if(!this.meters.size&&this.activityTimer){clearInterval(this.activityTimer);this.activityTimer=null;}
  if(wasSpeaking&&this.roomId)this.updated({participants:this.roster,seat:this.self?.role==='speaker',mic:this.mic,activeSpeakerIds:[...this.speakingIds],activityOnly:true});
 }
 clearActivity(){
  if(this.activityTimer){clearInterval(this.activityTimer);this.activityTimer=null;}
  for(const meter of this.meters.values()){try{meter.source.disconnect()}catch{}}
  this.meters.clear();this.speakingIds.clear();
  const ctx=this.audioContext;this.audioContext=null;if(ctx)void ctx.close().catch(()=>{});
 }
 async sendSignal(to,type,payload,room=this.roomId,generation=this.generation,peer=this.peers.get(to)){
  if(!room||this.roomId!==room||this.generation!==generation||this.peers.get(to)!==peer)return;
  return this.api(`/rooms/${room}/voice/signal`,'POST',{to,type,payload});
 }
 async receive(packet){
  if(!this.roomId||packet.roomId!==this.roomId||packet.from===this.selfId)return;
  // Only negotiate with peers confirmed by the room roster.
  if(!this.roster.some(person=>person.id===packet.from))return;
  if(!this.peers.has(packet.from))this.createPeer(packet.from);
  const peer=this.peers.get(packet.from);if(!peer)return;
  const room=this.roomId,generation=this.generation,pc=peer.pc;
  const active=()=>this.roomId===room&&this.generation===generation&&this.peers.get(packet.from)===peer;
  try{
   if(packet.type==='candidate'){
    if(pc.remoteDescription)await pc.addIceCandidate(packet.payload);
    else peer.pendingCandidates.push(packet.payload);
    return;
   }
   const desc=packet.payload;
   if(desc?.type!=='offer'&&desc?.type!=='answer')return;
   const ready=!peer.makingOffer && (pc.signalingState==='stable'||peer.settingRemoteAnswer);
   const collision=desc.type==='offer'&&!ready;
   peer.ignoreOffer=!this.isPolite(packet.from)&&collision;
   if(peer.ignoreOffer)return;
   peer.settingRemoteAnswer=desc.type==='answer';
   await pc.setRemoteDescription(desc);
   if(!active())return;
   peer.settingRemoteAnswer=false;
   for(const candidate of peer.pendingCandidates.splice(0)){
    if(!active())return;
    await pc.addIceCandidate(candidate).catch(()=>{});
   }
   if(desc.type==='offer'){
    if(!active())return;
    await pc.setLocalDescription();
    if(!active()||!pc.localDescription)return;
    await this.sendSignal(packet.from,pc.localDescription.type,{type:pc.localDescription.type,sdp:pc.localDescription.sdp},room,generation,peer);
   }
  }catch(err){if(active())this.notice('Tín hiệu kết nối bị lỗi: '+err.message)}
  finally{if(active())peer.settingRemoteAnswer=false}
 }
 isPolite(remoteId){return this.selfId > remoteId}
 unlockAudio(){this.audioContext?.resume().catch(()=>{});for(const el of this.stage.querySelectorAll('audio'))el.play().catch(()=>this.notice('Hãy kiểm tra âm lượng và quyền phát âm thanh.'));}
 dropPeer(id){this.stopWatching(id);const peer=this.peers.get(id);if(!peer)return;this.clearRecoveryTimer(peer);peer.pc.ontrack=null;peer.pc.onicecandidate=null;peer.pc.onnegotiationneeded=null;peer.pc.onconnectionstatechange=null;peer.pc.close();peer.audio?.remove();this.peers.delete(id)}
 async exit(){
  const old=this.roomId;this.roomId=null;this.generation++;this.seatPending=false;this.detachDeviceWatcher();
  // Teardown is synchronous until all old peers and state have been detached.
  // Do not yield to a concurrent enter() while old sender replacements settle.
  const stopped=this.disableLocalMic();
  for(const id of [...this.peers.keys()])this.dropPeer(id);
  this.clearActivity();this.roster=[];this.selfId=null;
  this.updated({participants:[],seat:false,mic:false,activeSpeakerIds:[]});
  if(old)void this.api(`/rooms/${old}/voice/leave`,'POST').catch(()=>{});
  await stopped;
 }
};

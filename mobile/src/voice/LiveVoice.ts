/** Native LiveKit voice session. Requires Expo development build (not Expo Go).
 * Microphone starts disabled; no audio recordings or camera are requested.
 */
import {AudioSession,registerGlobals} from '@livekit/react-native';
import {Room,RoomEvent,Track} from 'livekit-client';
import {liveApi} from '../services/api';
import type {LiveRoster} from '../services/api';
import {captureAllowance} from './liveCapturePolicy';

registerGlobals();
export type VoiceStatus='idle'|'connecting'|'connected'|'reconnecting'|'error'|'not-configured';
export type LiveState={status:VoiceStatus;roomId:string|null;mic:boolean;camera:boolean;mediaVersion:number;roster:LiveRoster|null;error:string|null;remoteCount:number};
export const initialLive:LiveState={status:'idle',roomId:null,mic:false,camera:false,mediaVersion:0,roster:null,error:null,remoteCount:0};
export class LiveVoice {
 private session:Room|null=null;
 private ticker:ReturnType<typeof setInterval>|null=null;
 private seq=0;
 private connectIntent=0;
 private retryFlight:Promise<void>|null=null;
 // A second connect must await the FIRST teardown, including native camera OFF.
 private shutdownFlight:Promise<{mediaStopUnverified:boolean;serverRevocationPending:boolean}>|null=null;
 // A silently ignored native OFF must not be cleared just by retrying in-app.
 private unsafePriorMedia=false;
 // AudioSession is global on iOS/Android. Serialize start/stop so a stale
 // disconnect cannot stop a newer room's newly started audio session.
 private audioQueue:Promise<void>=Promise.resolve();
 private mediaEpoch=0;
 // Only the newest authorised roster read may replace the current snapshot.
 // Mutations invalidate reads started before the server confirmed the change.
 private rosterReadSeq=0;
 private rosterWriteQueue:Promise<void>=Promise.resolve();
 private heartbeatBusy=false;
 private microphoneOperation:Promise<void>|null=null;
 private cameraOperation:Promise<void>|null=null;
 // Prevent a fast foreground resume from racing the background camera stop.
 private cameraSuspension:Promise<void>|null=null;
 private cameraShutdownFault=false;
 private captureRevocations=new Set<'mic'|'camera'>();
 private foreground=true;
 state:LiveState={...initialLive};
 constructor(private emit:(x:LiveState)=>void){}
 /** An SDK promise resolving is not proof that capture was disabled. Verify the
  * local publication after the native call; a silently ignored OFF is unsafe.
  * This checks SDK state, not the physical OS privacy indicator on a phone. */
 private async stopCapture(room:Room,kind:'mic'|'camera'){
  if(kind==='mic')await room.localParticipant.setMicrophoneEnabled(false);
  else await room.localParticipant.setCameraEnabled(false);
  const source=kind==='mic'?Track.Source.Microphone:Track.Source.Camera;
  const publication=room.localParticipant.getTrackPublication?.(source);
  if(publication?.track&&!publication.isMuted)
   throw Error(`LiveKit không xác nhận ${kind==='mic'?'microphone':'camera'} đã tắt`);
 }
 private audioSession(active:boolean,revision:number):Promise<void>{
  const task=this.audioQueue.catch(()=>{}).then(async()=>{
   if(revision!==this.seq)return;
   if(active)await AudioSession.startAudioSession();
   else await AudioSession.stopAudioSession();
  });
  this.audioQueue=task.catch(()=>{});
  return task;
 }
 // Late roster mutations must never cross a room change, disconnect or
 // reconnect, even when the new session uses the same room ID.
 private async mutateRoster(action:(roomId:string)=>Promise<LiveRoster>){
  const room=this.session,id=this.state.roomId,revision=this.seq,epoch=this.mediaEpoch;
  if(!room||!id||this.state.status!=='connected')throw Error('Phòng Live chưa kết nối');
  const stillCurrent=()=>revision===this.seq&&epoch===this.mediaEpoch&&this.session===room&&this.state.roomId===id&&this.state.status==='connected';
  // Serialize mutations, including moderator actions, so later replies cannot
  // reverse the last confirmed state. Do not send a queued old-room mutation.
  const task=this.rosterWriteQueue.catch(()=>{}).then(async()=>{
   if(!stillCurrent())return;
   const roster=await action(id);
   if(stillCurrent()){
    ++this.rosterReadSeq;
    this.applyRoster(room,roster);
   }
  });
  this.rosterWriteQueue=task.catch(()=>{});
  await task;
 }
 /** A new server roster is authoritative for stage capture. Its arrival never
  * turns tracks ON; loss of a seat/camera grant immediately requests OFF. */
 private applyRoster(room:Room,roster:LiveRoster){
  if(this.session!==room||this.state.status!=='connected')return;
  const before=captureAllowance(this.state.roster,room.localParticipant.permissions);
  const after=captureAllowance(roster,room.localParticipant.permissions);
  if((before.mic&&!after.mic)||(before.camera&&!after.camera))++this.mediaEpoch;
  this.push({roster});
  this.enforceCaptureAuthority(room,roster);
 }
 private enforceCaptureAuthority(room:Room,roster:LiveRoster){
  if(this.session!==room||this.state.status!=='connected')return;
  const allowed=captureAllowance(roster,room.localParticipant.permissions);
  if(!this.foreground)allowed.camera=false;
  const mic=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
  const cam=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
  const revokeMic=!allowed.mic&&!!mic?.track&&!mic.isMuted&&!this.captureRevocations.has('mic');
  const revokeCamera=!allowed.camera&&!!cam?.track&&!cam.isMuted&&!this.captureRevocations.has('camera');
  if(!revokeMic&&!revokeCamera)return;
  // Invalidate pending user capture prompts and any outdated roster result.
  ++this.mediaEpoch;
  ++this.rosterReadSeq;
  if(revokeMic)this.captureRevocations.add('mic');
  if(revokeCamera)this.captureRevocations.add('camera');
  this.push({mic:revokeMic?false:this.state.mic,camera:revokeCamera?false:this.state.camera,mediaVersion:this.state.mediaVersion+1});
  const stop=async(kind:'mic'|'camera')=>{
   try{
    await this.stopCapture(room,kind);
   }catch{
    // A rejected native OFF must not leave the room running behind a disabled UI.
    await this.terminateUnsafeMedia(room,kind);
   }
   finally{
    // Revocation of the old room must never modify the new room's state.
    if(this.session===room){this.captureRevocations.delete(kind);this.reconcileLocalMedia(room);}
   }
  };
  if(revokeMic)void stop('mic');
  if(revokeCamera)void stop('camera');
 }
 /** The microphone is a deliberate voice call choice, not a background service
  * guarantee. The camera is shut off when the app leaves foreground and must
  * be enabled manually on return; never re-enable either track automatically. */
 async onAppStateChange(next:'active'|'background'|'inactive'){
  const foreground=next==='active';
  if(this.foreground===foreground)return;
  this.foreground=foreground;
  if(foreground){await this.syncAfterForeground();return;}
  const room=this.session;
  if(!room)return;
  const camera=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
  ++this.mediaEpoch; ++this.rosterReadSeq;
  if(camera?.track&&!camera.isMuted){
   this.push({camera:false,mediaVersion:this.state.mediaVersion+1});
   // Do not let a new foreground camera tap overtake the native stop request.
   const stop=this.stopCapture(room,'camera').then(()=>{
    if(this.session===room)this.cameraShutdownFault=false;
   },async()=>{
    if(this.session===room){
     this.cameraShutdownFault=true;
     await this.terminateUnsafeMedia(room,'camera');
    }
   });
   this.cameraSuspension=stop;
   try{await stop;}finally{
    if(this.cameraSuspension===stop)this.cameraSuspension=null;
    if(this.session===room)this.reconcileLocalMedia(room);
   }
  }
 }
 get mediaRoom():Room|null{return this.session;}
 private push(update:Partial<LiveState>){this.state={...this.state,...update};this.emit({...this.state});}
 /** A native OFF failure is a privacy incident, not merely a stale icon.
  * Stop signalling/media, preserve a truthful error and require explicit re-entry.
  * Device-level release must still be verified on a real phone. */
 private async terminateUnsafeMedia(room:Room,kind:'mic'|'camera'){
  if(this.session!==room)return;
  const previous=this.seq,roomId=this.state.roomId;
  await this.disconnect();
  if(this.seq===previous+1&&this.session===null){
   this.push({status:'error',roomId,error:`Không xác nhận được ${kind==='mic'?'microphone':'camera'} đã tắt. Đã yêu cầu ngắt phiên Live; kiểm tra đèn báo quyền riêng tư của điện thoại và khởi động lại ứng dụng.`});
  }
 }

 /** Device routes (speaker/Bluetooth) are chosen by iOS/Android, not by a LiveKit
  * connection event. Reconcile only existing tracks; NEVER request mic permission
  * or enable capture in response to route, foreground, or reconnect events. */
 private reconcileLocalMedia(room:Room){
  if(this.session!==room||this.state.status!=='connected')return;
  const micPub=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
  const camPub=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
  const allowance=captureAllowance(this.state.roster,room.localParticipant.permissions);
  const mic=allowance.mic&&!this.captureRevocations.has('mic')&&!!micPub&&!micPub.isMuted&&!!micPub.track;
  const camera=this.foreground&&!this.cameraSuspension&&!this.cameraShutdownFault&&allowance.camera&&!this.captureRevocations.has('camera')&&!!camPub&&!camPub.isMuted&&!!camPub.track;
  if(mic!==this.state.mic||camera!==this.state.camera)this.push({mic,camera,mediaVersion:this.state.mediaVersion+1});
 }
 /** Called after returning from background; async roster reads cannot apply to a
  * different room. Do not claim that physical audio output has been verified. */
 async syncAfterForeground(){
  const room=this.session,roomId=this.state.roomId,seq=this.seq,epoch=this.mediaEpoch;
  if(!room||!roomId||this.state.status!=='connected')return;
  this.reconcileLocalMedia(room);
  const request=++this.rosterReadSeq;
  try{
   const roster=await liveApi.roster(roomId);
   if(request===this.rosterReadSeq&&seq===this.seq&&epoch===this.mediaEpoch&&this.session===room&&this.state.roomId===roomId&&this.state.status==='connected')this.applyRoster(room,roster);
  }catch{/* Keep the visible connection status truthful; normal heartbeat will retry. */}
 }
 private eventRefresh(roomId:string){
  const room=this.session,generation=this.seq,epoch=this.mediaEpoch;
  if(!room||this.state.roomId!==roomId||this.state.status!=='connected')return;
  const request=++this.rosterReadSeq;
  void liveApi.roster(roomId).then(roster=>{
   if(request===this.rosterReadSeq&&generation===this.seq&&epoch===this.mediaEpoch&&this.session===room&&this.state.roomId===roomId&&this.state.status==='connected')this.applyRoster(room,roster);
  }).catch(()=>{});
 }
 async connect(roomId:string){
  const intent=++this.connectIntent;
  const revoked=await this.tearDown(true);
  if(intent!==this.connectIntent)return;
  if(!revoked){this.push({status:'error',roomId,error:'Chưa xác nhận ngắt phiên LiveKit cũ. Hãy kiểm tra mạng rồi thử lại.'});return;}
  const mine=++this.seq;
  this.push({status:'connecting',roomId,mic:false,camera:false,mediaVersion:0,roster:null,error:null,remoteCount:0});
  let room:Room|null=null;
  try {
   const result=await liveApi.credentials(roomId);
   if(mine!==this.seq)return;
   room=new Room({adaptiveStream:true,dynacast:false});
   const current=()=>mine===this.seq && this.state.roomId===roomId;
   room.on(RoomEvent.Connected,()=>{if(current()&&this.session===room)this.push({status:'connected'});});
   room.on(RoomEvent.Reconnecting,()=>{if(current()){this.mediaEpoch++;this.push({status:'reconnecting',mic:false,camera:false});}});
   room.on(RoomEvent.Reconnected,()=>{if(current()){
    // Reconcile actual local publications; do not trust stale pre-reconnect UI state.
    this.push({status:'connected',mediaVersion:this.state.mediaVersion+1,error:null});
    if(room)this.reconcileLocalMedia(room);
    if(room&&this.state.roster)this.enforceCaptureAuthority(room,this.state.roster);
    this.eventRefresh(roomId);
   }});
   room.on(RoomEvent.Disconnected,()=>{if(current()){this.mediaEpoch++;this.push({status:'error',mic:false,camera:false,error:'Phòng Live đã ngắt kết nối. Hãy vào lại phòng.'});}});
   const updateCount=()=>{if(!current())return;this.push({remoteCount:this.session?.remoteParticipants.size||0,mediaVersion:this.state.mediaVersion+1});this.eventRefresh(roomId);};
   room.on(RoomEvent.ParticipantConnected,updateCount);
   room.on(RoomEvent.ParticipantDisconnected,updateCount);
   room.on(RoomEvent.ParticipantPermissionsChanged,()=>{
    if(!current()||!room)return;
    // Even a source-only restriction can arrive while an OS permission prompt
    // is in flight. Cancel stale toggles before reading the new publication.
    ++this.mediaEpoch;
    if(this.state.roster)this.enforceCaptureAuthority(room,this.state.roster);
    this.reconcileLocalMedia(room);
    this.eventRefresh(roomId);
   });
   room.on(RoomEvent.TrackSubscribed,updateCount);
   room.on(RoomEvent.TrackUnsubscribed,updateCount);
   // Track mute/unmute may change without a participant joining or leaving.
   const localTracksChanged=()=>{if(!current()||!room)return;this.push({mediaVersion:this.state.mediaVersion+1});if(this.state.roster)this.enforceCaptureAuthority(room,this.state.roster);this.reconcileLocalMedia(room);};
   room.on(RoomEvent.TrackMuted,localTracksChanged);
   room.on(RoomEvent.TrackUnmuted,localTracksChanged);
   room.on(RoomEvent.LocalTrackPublished,localTracksChanged);
   room.on(RoomEvent.LocalTrackUnpublished,localTracksChanged);
   await this.audioSession(true,mine);
   if(mine!==this.seq){await room.disconnect().catch(()=>{});return;}
   await room.connect(result.serverUrl,result.token,{autoSubscribe:true});
   if(mine!==this.seq){await room.disconnect();return;} // A newer session owns the global AudioSession.
   this.session=room;
   // Explicitly start muted. No microphone permission prompt before user taps the button.
   this.push({status:'connected',roster:result.roster,remoteCount:room.remoteParticipants.size,mic:false,camera:false,mediaVersion:0});
   this.enforceCaptureAuthority(room,result.roster);
   this.reconcileLocalMedia(room);
   this.ticker=setInterval(()=>{
    const heartbeatEpoch=this.mediaEpoch;
    const stillCurrent=()=>mine===this.seq&&heartbeatEpoch===this.mediaEpoch&&this.session===room&&this.state.roomId===roomId;
    // Poor mobile networks may keep a request open longer than the interval.
    // Avoid a pile-up of overlapping heartbeats and stale roster responses.
    if(!stillCurrent()||this.state.status!=='connected'||this.heartbeatBusy)return;
    this.heartbeatBusy=true;
    const request=++this.rosterReadSeq;
    void liveApi.heartbeat(roomId).then(roster=>{
     if(stillCurrent()&&this.state.status==='connected'){
      if(request===this.rosterReadSeq){this.applyRoster(room,roster);this.push({error:null});}
     }
    }).catch(error=>{if(stillCurrent()&&this.state.status==='connected')this.push({error:String(error)});})
      .finally(()=>{if(mine===this.seq)this.heartbeatBusy=false;});
   },8000);
  }catch(error){
   if(room)await room.disconnect().catch(()=>{});
   if(mine!==this.seq)return; // Do not stop the audio session of a newer room.
   await this.audioSession(false,mine).catch(()=>{});
   const message=error instanceof Error?error.message:String(error);
   this.push({status:message.includes('Chưa cấu hình máy chủ')?'not-configured':'error',error:message});
  }
 }
 async microphone(){
  if(this.microphoneOperation)return this.microphoneOperation;
  const room=this.session,roomId=this.state.roomId,generation=this.seq,epoch=this.mediaEpoch;
  if(!room||this.state.status!=='connected'||!roomId)throw Error('Phòng voice chưa kết nối');
  const current=()=>generation===this.seq&&epoch===this.mediaEpoch&&this.session===room&&this.state.roomId===roomId&&this.state.status==='connected';
  // The publication is evidence; stale state.mic is not proof of local capture.
  const micPub=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
  const next=!(micPub&&!micPub.isMuted);
  // Always permit turning a live track OFF, even after the server revokes publish rights.
  if(next&&!captureAllowance(this.state.roster,room.localParticipant.permissions).mic)throw Error('Bạn cần quyền ghế nói và quyền phát microphone');
  const operation=(async()=>{
   try{
    if(next)await room.localParticipant.setMicrophoneEnabled(true);
    else await this.stopCapture(room,'mic');
    if(!current()){
     // A late permission grant must never be shown as an enabled mic in a new room.
     if(next)await this.stopCapture(room,'mic').catch(async()=>{
      if(this.session===room)await this.terminateUnsafeMedia(room,'mic');
      else await room.disconnect().catch(()=>{});
     });
     return;
    }
    const actual=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
    this.push({mic:!!actual&&!actual.isMuted,mediaVersion:this.state.mediaVersion+1,error:null});
   }catch(error){
    if(!current())return;
    if(!next){
     await this.terminateUnsafeMedia(room,'mic');
     throw Error('Không thể xác nhận microphone đã tắt. Phiên Live đã được yêu cầu ngắt.');
    }
    this.push({mic:false,error:error instanceof Error?error.message:String(error)});
    throw error;
   }
  })();
  this.microphoneOperation=operation;
  try{await operation;}finally{if(this.microphoneOperation===operation)this.microphoneOperation=null;}
 }
 async camera(){
  if(this.cameraOperation)return this.cameraOperation;
  if(this.cameraSuspension)await this.cameraSuspension;
  if(this.cameraOperation)return this.cameraOperation;
  const room=this.session,roomId=this.state.roomId,generation=this.seq,epoch=this.mediaEpoch;
  if(!room||!roomId||this.state.status!=='connected')throw Error('Phòng Live chưa kết nối');
  const publication=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
  const next=!(publication&&!publication.isMuted);
  // A track can always be stopped; only enabling needs camera/foreground permission.
  if(next){
   if(this.state.roster?.type!=='cam')throw Error('Phòng Voice không hỗ trợ camera');
   if(!this.foreground)throw Error('Camera chỉ có thể bật khi đang xem ứng dụng');
   if(this.cameraShutdownFault)throw Error('Không thể xác nhận camera đã tắt ở nền. Hãy rời phòng rồi vào lại.');
   if(!captureAllowance(this.state.roster,room.localParticipant.permissions).camera)throw Error('Bạn cần quyền vị trí camera và quyền phát camera');
  }
  const current=()=>generation===this.seq&&epoch===this.mediaEpoch&&this.session===room&&this.state.roomId===roomId&&this.state.status==='connected';
  const operation=(async()=>{
   try{
    if(next)await room.localParticipant.setCameraEnabled(true);
    else await this.stopCapture(room,'camera');
    if(!current()){
     // A late permission result must not leave the old room recording video.
     if(next)await this.stopCapture(room,'camera').catch(async()=>{
      if(this.session===room)await this.terminateUnsafeMedia(room,'camera');
      else await room.disconnect().catch(()=>{});
     });
     return;
    }
    this.reconcileLocalMedia(room);
   }catch(error){
    if(!current())return;
    if(!next){
     await this.terminateUnsafeMedia(room,'camera');
     throw Error('Không thể xác nhận camera đã tắt. Phiên Live đã được yêu cầu ngắt.');
    }
    this.push({camera:false,error:error instanceof Error?error.message:String(error)});
    throw error;
   }
  })();
  this.cameraOperation=operation;
  try{await operation;}finally{if(this.cameraOperation===operation)this.cameraOperation=null;}
 }
 async requestSeat(){await this.mutateRoster(id=>liveApi.requestSeat(id));}
 async leaveSeat(){
  const room=this.session,roomId=this.state.roomId,revision=this.seq;
  if(!room||!roomId||this.state.status!=='connected')throw Error('Phòng Live chưa kết nối');
  // Leaving is not a toggle. Server/LiveKit may already have revoked publishing;
  // OFF must remain possible even when the UI snapshot has not caught up.
  ++this.mediaEpoch;
  ++this.rosterReadSeq;
  this.push({mic:false,camera:false,mediaVersion:this.state.mediaVersion+1});
  const mic=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
  const cam=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
  try{
   if(mic?.track&&!mic.isMuted)await this.stopCapture(room,'mic');
   if(cam?.track&&!cam.isMuted)await this.stopCapture(room,'camera');
  }catch(error){
   // Media safety outranks seat mutations. Stop the session rather than
   // declaring a successful seat leave with a potentially live track.
   await this.disconnect();
   throw Error('Không xác nhận được mic/camera đã tắt; đã yêu cầu ngắt phiên Live. '+(error instanceof Error?error.message:String(error)));
  }
  if(this.session!==room||this.state.roomId!==roomId||revision!==this.seq||this.state.status!=='connected')return;
  this.reconcileLocalMedia(room);
  await this.mutateRoster(id=>liveApi.leaveSeat(id));
 }
 async approveSeat(userId:string,enabled:boolean){await this.mutateRoster(id=>liveApi.approveSeat(id,userId,enabled));}
 async invite(userId:string){await this.mutateRoster(id=>liveApi.invite(id,userId));}
 async respondInvite(invitationId:string,accept:boolean){await this.mutateRoster(id=>liveApi.inviteRespond(id,invitationId,accept));}
 async cancelInvite(invitationId:string){await this.mutateRoster(id=>liveApi.inviteCancel(id,invitationId));}
 async moderate(userId:string,action:'kick'|'ban'|'unban'|'promote'|'demote'|'mute-chat'|'unmute-chat',minutes?:number){await this.mutateRoster(id=>liveApi.moderate(id,userId,action,minutes));}
 async settings(settings:{locked?:boolean;chatEnabled?:boolean;slowModeSeconds?:number}){
  await this.mutateRoster(id=>liveApi.settings(id,settings));
 }
 /** An explicit retry is only offered after a terminal disconnect. LiveKit
  * handles transient network switches itself; do not create overlapping rooms.
  * A fresh session starts with both microphone and camera disabled. */
 async retry(){
  if(this.retryFlight)return this.retryFlight;
  const roomId=this.state.roomId;
  if(!roomId||this.state.status!=='error')return;
  const task=this.connect(roomId);this.retryFlight=task;
  try{await task;}finally{if(this.retryFlight===task)this.retryFlight=null;}
 }
 async disconnect(){
  ++this.connectIntent;
  await this.tearDown();
 }
 private async tearDown(requireRevocation=false):Promise<boolean>{
  if(this.shutdownFlight){
   const result=await this.shutdownFlight;
   return !this.unsafePriorMedia&&!result.mediaStopUnverified&&(!requireRevocation||!result.serverRevocationPending);
  }
  const task=this.performTearDown();
  this.shutdownFlight=task;
  try{
   const result=await task;
   return !this.unsafePriorMedia&&!result.mediaStopUnverified&&(!requireRevocation||!result.serverRevocationPending);
  }finally{if(this.shutdownFlight===task)this.shutdownFlight=null;}
 }
 private async performTearDown():Promise<{mediaStopUnverified:boolean;serverRevocationPending:boolean}>{
  const roomId=this.state.roomId,room=this.session,revision=++this.seq;
  this.mediaEpoch++;this.rosterReadSeq++;this.heartbeatBusy=false;this.session=null;this.captureRevocations.clear();
  // A suspended old-room server operation must not block actions in the new room.
  this.rosterWriteQueue=Promise.resolve();
  // Invalidate pending UI actions immediately. Their late results still close old tracks.
  this.microphoneOperation=null;this.cameraOperation=null;this.cameraSuspension=null;this.cameraShutdownFault=false;
  if(this.ticker){clearInterval(this.ticker);this.ticker=null;}
  this.push({...initialLive});
  // Local capture can outlive the signalling socket on some devices. Stop any
  // still-published tracks on the *old* Room before releasing AudioSession.
  // setEnabled(false) never requests microphone/camera access.
  let mediaStopUnverified=false;
  if(room){
   const mic=room.localParticipant.getTrackPublication?.(Track.Source.Microphone);
   const cam=room.localParticipant.getTrackPublication?.(Track.Source.Camera);
   if(mic?.track&&!mic.isMuted){
    try{await this.stopCapture(room,'mic');}catch{mediaStopUnverified=true;}
   }
   if(cam?.track&&!cam.isMuted){
    try{await this.stopCapture(room,'camera');}catch{mediaStopUnverified=true;}
   }
   try{await room.disconnect();}catch{mediaStopUnverified=true;}
  }
  try{await this.audioSession(false,revision);}catch{if(room)mediaStopUnverified=true;}
  let serverRevocationPending=false;
  if(roomId){
   try{const result=await liveApi.leave(roomId);serverRevocationPending=!!result?.mediaDisconnectPending;}
   catch{serverRevocationPending=true;}
  }
  // Never enter a replacement room if the old SDK still reports capture or
  // the server has not confirmed that its previous publication was revoked.
  if(mediaStopUnverified)this.unsafePriorMedia=true;
  if(mediaStopUnverified&&revision===this.seq&&this.session===null){
   this.push({status:'error',roomId,error:'Chưa xác nhận mic/camera của phiên cũ đã tắt. Kiểm tra quyền riêng tư trên điện thoại, đóng hẳn ứng dụng rồi mở lại.'});
  }
  return {mediaStopUnverified,serverRevocationPending};
 }
}

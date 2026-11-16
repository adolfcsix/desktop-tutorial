/**
 * Túttt v0.3 demo API adapter. Mobile development only, not production auth.
 * Never embed production secrets or use this guest-token mechanism for payments.
 */
export type ApiRoom={type?:'voice'|'cam';id:string;title:string;subtitle:string;host:string;members:number;tag:string;art:string;hostId:string};
export type ApiMessage={id:string;roomId:string;userId:string;name:string;text:string;createdAt:number};
const configured=(process.env.EXPO_PUBLIC_TUTTT_API_URL||'').replace(/\/$/,'');
let token:string|null=null;
async function call<T>(route:string,method='GET',payload?:unknown):Promise<T>{
 if(!configured)throw new Error('Chưa cấu hình EXPO_PUBLIC_TUTTT_API_URL');
 const response=await fetch(configured+'/api'+route,{
   method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(route==='/session'?{'X-Tuttt-Client':'mobile'}:{}),...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined,
 });
 const body=await response.json() as T&{error?:string};
 if(!response.ok)throw new Error(body.error||'Không thể kết nối máy chủ');
 return body;
}
export type AudienceMember={id:string;name:string;role:'host'|'moderator'|'speaker'|'viewer';onStage:boolean};
export type RoomAudience={roomId:string;selfId:string;count:number;members:AudienceMember[]};
export type VoiceParticipant={id:string;name:string;role:'speaker'|'audience';mic:boolean};
export type VoiceRoster={roomId:string;selfId:string;participants:VoiceParticipant[];limits:{participants:number;speakers:number};kind:string};
export const tutttApi={
 enabled:!!configured,
 async connect(name='Khách'){
   const result=await call<{token:string;user:{id:string;name:string;bio?:string}}>('/session','POST',{name});
   token=result.token;return result.user;
 },
 listRooms:()=>call<{rooms:ApiRoom[]}>('/rooms'),
 createRoom:(title:string,subtitle:string,tag:string,type:'voice'|'cam')=>call<{room:ApiRoom}>('/rooms','POST',{title,subtitle,tag,type}),
 join:(id:string)=>call<{room:ApiRoom}>(`/rooms/${encodeURIComponent(id)}/join`,'POST'),
 audience:(id:string)=>call<RoomAudience>(`/rooms/${encodeURIComponent(id)}/audience`),
 leave:(id:string)=>call<{room:ApiRoom;mediaDisconnectPending?:boolean}>(`/rooms/${encodeURIComponent(id)}/leave`,'POST'),
 messages:(id:string)=>call<{messages:ApiMessage[]}>(`/rooms/${encodeURIComponent(id)}/messages`),
 send:(id:string,text:string)=>call<{message:ApiMessage}>(`/rooms/${encodeURIComponent(id)}/messages`,'POST',{text}),
 updateProfile:(name:string,bio:string)=>call<{user:{id:string;name:string;bio:string}}>('/me','PATCH',{name,bio}),
  reportRoom:(roomId:string,reason:string)=>call<{submitted:boolean;reportId:string;status:string;duplicate:boolean}>('/reports','POST',{roomId,reason}),
 // Signalling APIs only: React Native media SDK is not bundled or verified in v0.3.
 voiceRoster:(id:string)=>call<VoiceRoster>(`/rooms/${encodeURIComponent(id)}/voice`),
 voiceJoin:(id:string)=>call<VoiceRoster>(`/rooms/${encodeURIComponent(id)}/voice/join`,'POST'),
 voiceLeave:(id:string)=>call<{left:boolean}>(`/rooms/${encodeURIComponent(id)}/voice/leave`,'POST'),
 voiceSeat:(id:string,speaker:boolean)=>call<VoiceRoster>(`/rooms/${encodeURIComponent(id)}/voice/seat`,'POST',{speaker}),
 voiceMic:(id:string,enabled:boolean)=>call<VoiceRoster>(`/rooms/${encodeURIComponent(id)}/voice/mic`,'POST',{enabled}),
};

export type LiveMember={id:string;name:string;role:'host'|'moderator'|'listener';speaker:boolean;cameraAllowed:boolean;chatMutedUntil:number};
export type StageInvitation={id:string;fromId:string;fromName?:string;toId:string;roomId?:string;type?:'voice'|'cam';expiresAt:number};
export type LiveRoster={roomId:string;selfId:string;hostId:string;type:'voice'|'cam';settings:{locked:boolean;chatEnabled:boolean;slowModeSeconds:number};members:LiveMember[];requests:string[];incomingInvitations:StageInvitation[];outgoingInvitations:StageInvitation[];limits:{speakers:number;cameras:number;participants:number};transport:'livekit-sfu';note:string};
export type LiveCredentials={serverUrl:string;token:string;roomName:string;expiresAt:number;roster:LiveRoster};
export const liveApi={
  credentials:(id:string)=>call<LiveCredentials>(`/rooms/${encodeURIComponent(id)}/live/token`,'POST'),
  roster:(id:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live`),
  heartbeat:(id:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/heartbeat`,'POST'),
  requestSeat:(id:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/seat-request`,'POST'),
  approveSeat:(id:string,userId:string,enabled:boolean)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/seat`,'POST',{userId,enabled}),
  leaveSeat:(id:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/seat-leave`,'POST'),
  moderate:(id:string,userId:string,action:'kick'|'ban'|'unban'|'promote'|'demote'|'mute-chat'|'unmute-chat',minutes?:number)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/moderate`,'POST',{userId,action,...(minutes?{minutes}:{})}),
  settings:(id:string,settings:{locked?:boolean;chatEnabled?:boolean;slowModeSeconds?:number})=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/settings`,'POST',settings),
  invite:(id:string,userId:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/invite`,'POST',{userId}),
  inviteRespond:(id:string,invitationId:string,accept:boolean)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/invite-respond`,'POST',{invitationId,accept}),
  inviteCancel:(id:string,invitationId:string)=>call<LiveRoster>(`/rooms/${encodeURIComponent(id)}/live/invite-cancel`,'POST',{invitationId}),
  leave:(id:string)=>call<{left:boolean;mediaDisconnectPending?:boolean}>(`/rooms/${encodeURIComponent(id)}/live/leave`,'POST'),
};

/** PK friendly mode: free, server-scored cheers. NOT a gift/coin ledger. */
export type PKMatch={id:string;status:'active'|'finished';roomA:{id:string;title:string;host:string};roomB:{id:string;title:string;host:string};scoreA:number;scoreB:number;startedAt:number;endsAt:number;finishedAt:number|null;winner:'A'|'B'|null;reason:string|null;winStreak:number|null;scoreType:'free-cheers';note:string};
export type PKInvitation={id:string;roomA:string;roomB:string;from:string;to:string;expiresAt:number;durationSeconds:number};
export type PKSnapshot={roomId:string;host:boolean;invites:PKInvitation[];match:PKMatch|null;recent:PKMatch[];available:{id:string;title:string;host:string;type:'cam'|'voice'}[]};
const pkPath=(id:string)=>`/rooms/${encodeURIComponent(id)}/pk`;
export const pkApi={
 snapshot:(id:string)=>call<PKSnapshot>(pkPath(id)),
 invite:(id:string,opponentRoomId:string,durationSeconds=180)=>call(pkPath(id)+'/invite','POST',{opponentRoomId,durationSeconds}),
 respond:(id:string,invitationId:string,accept:boolean)=>call(pkPath(id)+'/respond','POST',{invitationId,accept}),
 cancel:(id:string,invitationId:string)=>call(pkPath(id)+'/cancel','POST',{invitationId}),
 cheer:(id:string,matchId:string)=>call<PKMatch>(pkPath(id)+'/cheer','POST',{matchId}),
 end:(id:string,matchId:string)=>call<PKMatch>(pkPath(id)+'/end','POST',{matchId}),
};

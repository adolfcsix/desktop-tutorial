import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions,Alert,Modal,AppState} from 'react-native';
import {Action,Avatar,Label,Pill,Screen,Search,SectionTitle,uiStyles} from '../components/Primitives';
import type {Palette} from '../theme/tokens';
import {light} from '../theme/tokens';
import {PK_COLORS} from '../theme/pkColors';
import type {Room,Contact,Message,Club} from '../data/demo';
import type {LiveState} from '../voice/LiveVoice';
import {liveConnectionNotice} from '../voice/liveConnectionUi';
import {mayManageLiveMember,mayModerateLiveMember} from '../voice/livePermissionPolicy';
import type {Room as MediaRoom} from 'livekit-client';
import {Track,RoomEvent} from 'livekit-client';
import {VideoTrack} from '@livekit/react-native';
import {PKPanel} from '../components/PKPanel';
import {AudienceMemberList} from '../components/AudienceMemberList';
import {tutttApi} from '../services/api';
import type {RoomAudience} from '../services/api';


/** v0.5.7 — A seat is not a microphone. Only the media track tells us mute state. */
type MicVisual='muted'|'ready'|'unknown';
function micVisual(participant:any,connected:boolean):MicVisual{
 if(!connected||!participant)return 'unknown';
 const publication=participant.getTrackPublication?.(Track.Source.Microphone);
 if(!publication)return 'muted';
 if(publication.isMuted)return 'muted';
 // An unsubscribed remote publication cannot provide local audio activity evidence.
 if(!publication.track && participant.isLocal===false)return 'unknown';
 return 'ready';
}
function MicOffGlyph(){return <View accessible={false} style={{width:16,height:16,alignItems:'center',justifyContent:'center'}}>
 <View style={{width:5,height:9,borderRadius:3,backgroundColor:'#FFF4E8',marginTop:-2}}/>
 <View style={{width:9,height:5,borderBottomWidth:1.5,borderLeftWidth:1.5,borderRightWidth:1.5,borderColor:'#FFF4E8',borderBottomLeftRadius:5,borderBottomRightRadius:5,position:'absolute',top:6}}/>
 <View style={{height:3,width:1.5,backgroundColor:'#FFF4E8',position:'absolute',top:11}}/>
 <View style={{height:1.7,width:10,backgroundColor:'#FFF4E8',position:'absolute',top:14}}/>
 <View style={{height:2.5,width:21,backgroundColor:'#FFB29F',position:'absolute',transform:[{rotate:'-45deg'}],borderRadius:2}}/>
 </View>}
function MutedBadge({size=21}:{size?:number}){return <View accessibilityLabel="Microphone đang tắt" style={{position:'absolute',right:-3,bottom:3,width:size,height:size,borderRadius:size/2,backgroundColor:'#493234',borderWidth:1.5,borderColor:'#FFE8D9',alignItems:'center',justifyContent:'center',zIndex:5}}><MicOffGlyph/></View>}
function AudioAvatar({name,accent,size,mic,speaking}:{name:string;accent:string;size:number;mic:MicVisual;speaking:boolean}){
 const ring=useRef(new Animated.Value(1)).current;
 const [reduceMotion,setReduceMotion]=useState(false);
 useEffect(()=>{
  let alive=true;
  AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive)setReduceMotion(value)}).catch(()=>{});
  const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);
  return()=>{alive=false;sub.remove()};
 },[]);
 useEffect(()=>{
  ring.stopAnimation();ring.setValue(1);
  if(!speaking||reduceMotion)return;
  const loop=Animated.loop(Animated.sequence([
   Animated.timing(ring,{toValue:1.015,duration:850,useNativeDriver:true}),
   Animated.timing(ring,{toValue:1,duration:850,useNativeDriver:true}),
  ]));loop.start();return()=>{loop.stop();ring.setValue(1)};
 },[ring,speaking,reduceMotion]);
 const diameter=size+9;
 return <View accessible accessibilityLabel={name+(mic==='muted'?', mic tắt':speaking?', đang nói':mic==='ready'?', mic bật':', chưa xác định trạng thái mic')}
   style={{width:diameter+4,height:diameter+4,alignItems:'center',justifyContent:'center',overflow:'visible'}}>
  <Animated.View style={{width:diameter,height:diameter,borderRadius:diameter/2,borderWidth:speaking?3:1.5,borderColor:speaking?'#39D49C':'#D8B7A8',backgroundColor:'transparent',alignItems:'center',justifyContent:'center',shadowColor:'#2FCF9B',shadowOpacity:speaking?0.46:0,shadowRadius:speaking?10:0,shadowOffset:{width:0,height:0},elevation:speaking?4:0,transform:[{scale:ring}]}}>
   <Avatar label={name.slice(0,1).toUpperCase()||'?'} accent={accent} size={size}/>
  </Animated.View>
  {mic==='muted'?<MutedBadge/>:null}
 </View>
}

type Common={c:Palette};
function Desc({c,children}:{c:Palette;children:React.ReactNode}){return <Label c={c} size={12} style={{color:c.muted,marginTop:4,marginBottom:16}}>{children}</Label>}
export function RoomRow({r,c,onPress}:{r:Room;c:Palette;onPress:()=>void}){
 return <Pressable onPress={onPress} accessibilityRole="button" style={[uiStyles.card,{backgroundColor:c.surface,borderWidth:1,borderColor:c.line}]}><View style={{width:86,height:84,borderRadius:14,backgroundColor:r.accent,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:41,color:'#FFF1E7'}}>{r.art}</Text></View><View style={{flex:1}}><Label c={c} size={11} style={{color:c.lavender}}>{(r.type==='cam'?'▣ CAM  ·  ':'◉ VOICE  ·  ')+r.tag.toUpperCase()}</Label><Label c={c} size={14} bold style={{marginTop:5}}>{r.title}</Label><Label c={c} size={12} style={{color:c.muted,marginTop:4}}>{r.subtitle}</Label><Label c={c} size={11} style={{color:c.muted,marginTop:6}}>{`${r.host} · ● ${r.members} tham gia`}</Label></View></Pressable>
}
export function DiscoverScreen({c,rooms,onRoom,onLive,onCommunity,onChat,demo=true}:{c:Palette;rooms:Room[];onRoom:(r:Room)=>void;onLive:()=>void;onCommunity:()=>void;onChat:(id:string)=>void;demo?:boolean}){
 const featured=rooms[0];const ivory=c.bg===light.bg;return <Screen c={c}><Label c={c} size={10} bold style={{color:c.lavender,letterSpacing:2,marginTop:8}}>GOOD VIBES BEGIN HERE ✳</Label><Text style={[uiStyles.h1,{color:c.ink}]}>Chào ngày mới, <Text style={{color:c.lavender}}>bạn ơi.</Text></Text><Desc c={c}>Hôm nay bạn muốn nghe chuyện gì?</Desc><Pressable onPress={onLive} style={{minHeight:48,borderWidth:1,borderColor:c.line,backgroundColor:c.surface,borderRadius:16,justifyContent:'center',paddingHorizontal:14,marginBottom:19}}><Label c={c} size={12} style={{color:c.muted}}>⌕  Tìm người, phòng, chủ đề...</Label></Pressable>
 {featured?<Pressable onPress={()=>onRoom(featured)} style={{borderRadius:24,minHeight:210,backgroundColor:ivory?'#F6E1D0':c.hero,padding:20,justifyContent:'space-between',borderColor:ivory?'#D8B7A4':c.line,borderWidth:1}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><View style={{borderRadius:8,padding:7,backgroundColor:ivory?'#A5382A':c.coral}}><Text style={{fontSize:10,fontWeight:'900',color:ivory?'#FFF6EA':'#371D1C'}}>● LIVE CHAT</Text></View><Label c={c} size={10} style={{color:ivory?'#624539':'#FFE8DB'}}>{featured.members} thành viên</Label></View><View><Label c={c} size={10} style={{color:ivory?'#8C342A':'#FFE2D0'}}>PHÒNG ĐANG NỔI BẬT</Label><Text style={{color:ivory?'#32231E':'#FFF5EC',fontSize:25,fontWeight:'900',letterSpacing:-1.1,marginTop:7}}>{featured.title}</Text><Label c={c} size={11} style={{color:ivory?'#634C42':'#F3D0C5',marginTop:5}}>{featured.subtitle}</Label></View><Label c={c} size={12} bold style={{color:ivory?'#71392F':'#FFF5EC'}}>☾  Host: {featured.host}  ↗</Label></Pressable>:null}
 <SectionTitle c={c} title="Bạn đang có tâm trạng gì?"/><Pressable onPress={onLive} style={{backgroundColor:c.surfaceAlt,borderRadius:18,borderWidth:1,borderColor:c.line,flexDirection:'row',padding:16,alignItems:'center'}}><View style={{flex:1}}><Label c={c} size={10} style={{color:c.lavender}}>VIBE CHECK ✦</Label><Label c={c} size={14} bold style={{marginTop:6}}>Tìm đúng người, đúng mood.</Label><Label c={c} size={10} style={{color:c.muted,marginTop:6}}>Ghé những phòng hợp với cảm xúc của bạn.</Label></View><Text style={{fontSize:43}}>✦</Text></Pressable>
 <SectionTitle c={c} title="Phòng dành cho bạn" right="Xem tất cả" onPress={onLive}/>{rooms.slice(1,4).map(r=><RoomRow key={r.id} r={r} c={c} onPress={()=>onRoom(r)}/>)}{demo?<><SectionTitle c={c} title="Người dùng minh họa" right="Cộng đồng" onPress={onCommunity}/><View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:12}}>{[['LA','#f3b79e','Linh Anh','linh'],['MB','#afcdf5','Minh Bảo','bao'],['MI','#eea2c6','Mii','mi'],['AN','#addcc7','Anh Nhi','an']].map(([av,accent,name,id])=><Pressable key={id} onPress={()=>onChat(id)} style={{alignItems:'center',gap:7}}><Avatar label={av} accent={accent} size={54}/><Label c={c} size={10}>{name}</Label></Pressable>)}</View></>:<Desc c={c}>Phòng đang lấy từ máy chủ. Chat riêng và danh sách bạn bè sẽ được kết nối sau.</Desc>}</Screen>
}
export function LiveScreen({c,rooms,onRoom,realChat=false}:{c:Palette;rooms:Room[];onRoom:(r:Room)=>void;realChat?:boolean}){
 const [search,setSearch]=useState('');const [filter,setFilter]=useState('Tất cả');const [mode,setMode]=useState<'all'|'voice'|'cam'>('all');const found=rooms.filter(r=>(mode==='all'||(r.type||'voice')===mode)&&(filter==='Tất cả'||r.tag===filter)&&`${r.title} ${r.host} ${r.tag}`.toLowerCase().includes(search.toLowerCase()));return <Screen c={c}><Label c={c} size={10} bold style={{color:c.lavender,letterSpacing:2,marginTop:8}}>LET'S TALK</Label><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Text style={[uiStyles.h1,{color:c.ink}]}>Live <Text style={{color:c.lavender}}>●</Text></Text></View><Desc c={c}>Bước vào một căn phòng, bắt đầu câu chuyện.</Desc><Search c={c} value={search} onChange={setSearch} placeholder="Tìm phòng đang diễn ra"/><View style={{flexDirection:'row',gap:8,marginBottom:12}}>{([['all','Tất cả'],['voice','Voice'],['cam','Cam']] as const).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:mode===id}} onPress={()=>setMode(id)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:mode===id?c.lavender:c.line,backgroundColor:mode===id?(c.bg===light.bg?c.surfaceAlt:c.hero):c.surface}}><Label c={c} size={12} bold style={{color:mode===id?(c.bg===light.bg?c.ink:'#FFF5EC'):c.ink}}>{label}</Label></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:3,marginBottom:12}}>{['Tất cả','Tâm sự','Âm nhạc','Kết bạn','Học tập'].map(x=><Pill key={x} c={c} label={x} selected={filter===x} onPress={()=>setFilter(x)}/>)}</ScrollView><SectionTitle c={c} title="Đang diễn ra"/>{found.length?found.map(r=><RoomRow key={r.id} r={r} c={c} onPress={()=>onRoom(r)}/>):<Desc c={c}>Chưa có phòng phù hợp với từ khóa này.</Desc>}<Label c={c} size={10} style={{color:c.muted,marginTop:17}}>{realChat?'Chat trong phòng đã kết nối máy chủ. Chưa có âm thanh.':'Danh sách đang dùng dữ liệu mẫu. Chưa kết nối máy chủ.'}</Label></Screen>
}
export function ChatScreen({c,chats,onChat,demo=true}:{c:Palette;chats:Contact[];onChat:(id:string)=>void;demo?:boolean}){
 const [search,setSearch]=useState('');return <Screen c={c}><Label c={c} size={10} bold style={{color:c.lavender,letterSpacing:2,marginTop:8}}>STAY CLOSE</Label><Text style={[uiStyles.h1,{color:c.ink}]}>Chat</Text><Desc c={c}>{demo?'Tin nhắn mẫu để duyệt UI.':'Chat cá nhân chưa kết nối backend. Bạn có thể chat trong phòng Live.'}</Desc><Search c={c} value={search} onChange={setSearch} placeholder="Tìm cuộc trò chuyện"/><SectionTitle title="Tin nhắn" c={c}/>{chats.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())).map(contact=><Pressable key={contact.id} onPress={()=>onChat(contact.id)} style={{flexDirection:'row',gap:13,alignItems:'center',paddingVertical:14,borderBottomWidth:1,borderColor:c.line}}><Avatar label={contact.avatar} accent={contact.accent} size={56}/><View style={{flex:1}}><Label c={c} bold size={14}>{contact.name}</Label><Label c={c} size={11} style={{color:c.muted,marginTop:7}}>{contact.last}</Label></View><View style={{alignItems:'flex-end',gap:9}}><Label c={c} size={10} style={{color:c.muted}}>{contact.time}</Label>{contact.unread>0?<View style={{backgroundColor:c.lavender,borderRadius:10,width:19,height:19,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:10,color:'#FFF9F1',fontWeight:'900'}}>{contact.unread}</Text></View>:null}</View></Pressable>)}</Screen>
}
export function CommunityScreen({c,clubs,onClub}:{c:Palette;clubs:Club[];onClub:(id:string)=>void}){
 return <Screen c={c}><Label c={c} size={10} bold style={{color:c.lavender,letterSpacing:2,marginTop:8}}>YOUR PEOPLE</Label><Text style={[uiStyles.h1,{color:c.ink}]}>Cộng đồng</Text><Desc c={c}>Những nơi bạn luôn có người đồng điệu.</Desc><View style={{backgroundColor:c.surfaceAlt,padding:18,borderRadius:18,marginVertical:13}}><Label c={c} size={10} style={{color:c.lavender}}>TOGETHER, BETTER</Label><Label c={c} bold size={16} style={{marginVertical:7}}>Tìm hội cùng sở thích.</Label><Label c={c} size={11} style={{color:c.muted}}>Trò chuyện, tham gia sự kiện và có một nơi thuộc về mình.</Label></View><SectionTitle c={c} title="Cộng đồng nổi bật"/>{clubs.map(club=><Pressable key={club.id} onPress={()=>onClub(club.id)} style={[uiStyles.card,{backgroundColor:c.surface,borderWidth:1,borderColor:c.line}]}><View style={{width:64,height:64,borderRadius:14,backgroundColor:club.accent,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:33,color:'#fff'}}>{club.art}</Text></View><View style={{flex:1}}><Label c={c} size={14} bold>{club.name}</Label><Label c={c} size={11} style={{color:c.muted,marginTop:4}}>{club.subtitle}</Label><Label c={c} size={10} style={{color:c.lavender,marginTop:7}}>{club.members} thành viên · {club.joined?'✓ Đã tham gia':'Tham gia ↗'}</Label></View></Pressable>)}</Screen>
}
export function ProfileScreen({c,name,bio,onEdit,onCommunity,onSettings,demo=true}:{c:Palette;name:string;bio:string;onEdit:()=>void;onCommunity:()=>void;onSettings:()=>void;demo?:boolean}){
 return <Screen c={c}><View style={{height:126,backgroundColor:c.hero,borderRadius:23,marginTop:6,borderWidth:1,borderColor:c.line}}/><View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:-34}}><View style={{borderWidth:5,borderColor:c.bg,borderRadius:60}}><Avatar label="T" accent="#D48C72" size={77}/></View><Action c={c} label="✎  Sửa hồ sơ" outline onPress={onEdit}/></View><Text style={[uiStyles.h1,{color:c.ink,marginTop:10}]}>{name} ✦</Text><Desc c={c}>{demo?'@tuttt_user · UI demo':'Phiên khách · Hồ sơ cá nhân'}</Desc><Label c={c} size={12}>{bio}</Label>{demo?<><View style={{flexDirection:'row',marginTop:20,paddingVertical:16,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line}}>{[[demo?'12':'0','Người theo dõi'],[demo?'15':'0','Đang theo dõi'],[demo?'08':'0','Phòng đã tham gia']].map(([n,l])=><View key={l} style={{flex:1,alignItems:'center'}}><Label c={c} bold size={19}>{n}</Label><Label c={c} size={10} style={{color:c.muted}}>{l}</Label></View>)}</View><SectionTitle c={c} title="Dấu ấn của bạn"/><View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{['✦ Thành viên mới','☾ Cú đêm','♥ Dễ mến'].map(x=><View key={x} style={{padding:11,borderRadius:10,backgroundColor:c.surfaceAlt}}><Label c={c} size={10} bold>{x}</Label></View>)}</View></>:<Desc c={c}>Thống kê theo dõi và huy hiệu chưa kết nối với tài khoản khách.</Desc>}<SectionTitle c={c} title="Tài khoản"/>{[['♧','Cộng đồng của tôi',onCommunity],['⚙','Cài đặt',onSettings]].map(([icon,label,action],i)=><Pressable key={i} onPress={action as ()=>void} style={{borderBottomWidth:1,borderColor:c.line,paddingVertical:15,flexDirection:'row',alignItems:'center',gap:13}}><Label c={c} size={19} style={{color:c.lavender}}>{icon as string}</Label><View style={{flex:1}}><Label c={c} size={13} bold>{label as string}</Label></View><Label c={c} style={{color:c.muted}}>›</Label></Pressable>)}</Screen>
}
export function ConversationScreen({c,contact,messages,onBack,onSend}:{c:Palette;contact:Contact;messages:Message[];onBack:()=>void;onSend:(s:string)=>void}){
 const [input,setInput]=useState('');return <View style={{flex:1,backgroundColor:c.bg}}><View style={{flexDirection:'row',alignItems:'center',padding:14,gap:10,borderBottomWidth:1,borderColor:c.line}}><Pressable onPress={onBack} accessibilityLabel="Quay lại"><Label c={c} size={25}>‹</Label></Pressable><Avatar label={contact.avatar} accent={contact.accent} size={43}/><View><Label c={c} bold size={14}>{contact.name}</Label><Label c={c} size={10} style={{color:c.mint}}>● Đang hoạt động</Label></View></View><ScrollView style={{flex:1}} contentContainerStyle={{padding:18,gap:12,justifyContent:'flex-end',flexGrow:1}}>{messages.map(m=><View key={m.id} style={{backgroundColor:m.from==='me'?c.violet:c.surfaceAlt,borderRadius:16,padding:12,maxWidth:'82%',alignSelf:m.from==='me'?'flex-end':'flex-start'}}><Label c={c} size={13} style={{color:m.from==='me'?'#fff':c.ink}}>{m.text}</Label><Label c={c} size={9} style={{color:m.from==='me'?'#F8DACC':c.muted,textAlign:'right',marginTop:4}}>{m.time}</Label></View>)}</ScrollView><View style={{padding:12,flexDirection:'row',gap:10,borderTopWidth:1,borderColor:c.line}}><TextInput value={input} onChangeText={setInput} placeholder="Nhắn điều gì đó..." placeholderTextColor={c.muted} style={{flex:1,color:c.ink,backgroundColor:c.surfaceAlt,borderRadius:14,paddingHorizontal:14,height:43}}/><Pressable onPress={()=>{if(input.trim()){onSend(input.trim());setInput('')}}} accessibilityLabel="Gửi" style={{backgroundColor:c.lavender,width:46,height:46,borderRadius:14,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#FFF6ED',fontSize:21}}>➤</Text></Pressable></View></View>
}
export function RoomScreen({c,r,onBack,seat,mic,onSeat,onMic,onCam,mediaRoom,onSettings,log,onMessage,realChat=false,live,onApprove,onInvite,onRespondInvite,onCancelInvite,onModerate,onRetryLive}:{
 c:Palette;r:Room;onBack:()=>void;seat:boolean;mic:boolean;onSeat:()=>void;onMic:()=>void;
 onCam:()=>void;mediaRoom:MediaRoom|null;onSettings:(settings:{locked?:boolean;chatEnabled?:boolean;slowModeSeconds?:number})=>void;
 log:string[];onMessage:(s:string)=>void;realChat?:boolean;
 live?:LiveState;onApprove?:(id:string,enabled:boolean)=>void;onInvite?:(id:string)=>void;onRespondInvite?:(id:string,accept:boolean)=>void;onCancelInvite?:(id:string)=>void;
 onModerate?:(id:string,action:'kick'|'ban'|'unban'|'promote'|'demote'|'mute-chat'|'unmute-chat')=>void;onRetryLive?:()=>void;
}){
 const [msg,setMsg]=useState('');const [pkActive,setPkActive]=useState(false);const [pkOptionsRequest,setPkOptionsRequest]=useState(0);const [sheet,setSheet]=useState<'members'|'manage'|'options'|'report'|null>(null);const [reportReason,setReportReason]=useState('');const [reportBusy,setReportBusy]=useState(false);const [pinnedCameraId,setPinnedCameraId]=useState<string|null>(null);const [activeSpeakerIds,setActiveSpeakerIds]=useState<string[]>([]);const [mediaTick,setMediaTick]=useState(0);const {width,height}=useWindowDimensions();
 // Audience is server presence, not the subset joined to LiveKit audio/video.
 const [audience,setAudience]=useState<RoomAudience|null>(null);
 const [audienceIssue,setAudienceIssue]=useState(false);
 const [audienceUpdatedAt,setAudienceUpdatedAt]=useState(0);
 const [audienceRevision,setAudienceRevision]=useState(0);
 const audienceForeground=useRef(AppState.currentState!=='background'&&AppState.currentState!=='inactive');
 const audienceEpoch=useRef(0);
 useEffect(()=>{
  let live=true;let requestSeq=0;
  // Opening the sheet refreshes without flashing a previously valid count.
  setAudience(old=>old?.roomId===r.id?old:null);setAudienceIssue(false);
  if(!realChat)return()=>{live=false};
  const refresh=()=>{
   if(!audienceForeground.current)return;
   const seq=++requestSeq,epoch=audienceEpoch.current;
   tutttApi.audience(r.id).then(data=>{
    if(!live||seq!==requestSeq||epoch!==audienceEpoch.current||!audienceForeground.current)return;
    if(data.roomId!==r.id||!Array.isArray(data.members)||data.count!==data.members.length){setAudienceIssue(true);setAudienceUpdatedAt(0);return;}
    setAudience(data);setAudienceIssue(false);setAudienceUpdatedAt(Date.now());
   })
    .catch(()=>{if(live&&seq===requestSeq&&epoch===audienceEpoch.current&&audienceForeground.current){setAudienceIssue(true);setAudienceUpdatedAt(0)}});
  };
  refresh();const interval=setInterval(refresh,12000);
  return()=>{live=false;clearInterval(interval)};
 },[r.id,realChat,audienceRevision]);
 // Revalidate server presence when returning from background. The previous list
 // is not evidence of who is currently online after the app was suspended.
 useEffect(()=>{
  if(!realChat)return;
  const sub=AppState.addEventListener('change',next=>{
   const foreground=next==='active';
   if(foreground===audienceForeground.current)return;
   // Invalidate a pending fetch from before the app was suspended. A late
   // response cannot turn stale presence into a freshly verified count.
   audienceForeground.current=foreground;audienceEpoch.current+=1;
   setAudienceUpdatedAt(0);
   if(foreground)setAudienceRevision(revision=>revision+1);
  });
  return()=>sub.remove();
 },[realChat]);
 const audienceVerified=Boolean(realChat&&audienceForeground.current&&!audienceIssue&&audience?.roomId===r.id&&audienceUpdatedAt>0&&Date.now()-audienceUpdatedAt<=45000);
 const audienceCount=realChat?(audienceVerified?audience!.count:'…'):r.members;
 const openAudience=()=>{setSheet('members');setAudienceRevision(n=>n+1)};
 const submitRoomReport=async()=>{
  const reason=reportReason.trim();if(reportBusy)return;
  if(reason.length<8||reason.length>250){Alert.alert('Mô tả chưa hợp lệ','Vui lòng nhập từ 8 đến 250 ký tự.');return;}
  if(!realChat||!tutttApi.enabled){Alert.alert('Chưa kết nối','Cần kết nối máy chủ để gửi báo cáo.');return;}
  setReportBusy(true);
  try{const receipt=await tutttApi.reportRoom(r.id,reason);setSheet(null);setReportReason('');Alert.alert('Đã tiếp nhận báo cáo',`Mã báo cáo: ${receipt.reportId.slice(0,8)}\nĐã lưu trên máy chủ để người vận hành xem xét. Chưa có kiểm duyệt tự động.`);}
  catch(error){Alert.alert('Không thể gửi báo cáo',error instanceof Error?error.message:'Vui lòng thử lại sau.');}
  finally{setReportBusy(false);}
 };
 const pkTone=c.bg===light.bg?PK_COLORS.light:PK_COLORS.dark;
 // PK adopts the selected room shell; stage colors stay inside the duel itself.
 const roomBg=c.bg;
 const roomInk=c.ink;
 const roomMuted=c.muted;
 const camStageBg=c.bg===light.bg?'#F1E7E0':'#362329';
 const camSeatInk=c.bg===light.bg?'#36262B':'#FFF0E8';
 const camSeatMuted=c.bg===light.bg?'#685A59':'#E8CFC6';
 const roster=live?.roster;const isCam=(roster?.type||r.type)==='cam';
 const me=roster?.members.find(p=>p.id===roster.selfId);
 const status=live?.status||'idle';
 const isManager=status==='connected'&&(me?.role==='host'||me?.role==='moderator');
 const isHost=status==='connected'&&me?.role==='host';
 const voices=roster?.members.filter(p=>p.speaker)||[];
 const host=roster?.members.find(m=>m.id===roster.hostId);
 const camSeats=roster?[host||{id:roster.hostId,name:r.host,role:'host' as const,speaker:true},...voices.filter(m=>m.id!==roster.hostId)]:[{id:'preview-host',name:r.host,role:'host' as const,speaker:true}];
 // A granted seat is NOT proof that the person's video is live.
 const shownSpeakers=isCam?camSeats.slice(0,6):voices;
 const currentPin=shownSpeakers.length>1&&shownSpeakers.some(m=>m.id===pinnedCameraId)?pinnedCameraId:null;
 const activeIds=new Set(live?.status==='connected'?activeSpeakerIds:[]);
 const hasActiveSpeaker=shownSpeakers.some(m=>activeIds.has(m.id));
 void mediaTick;
 const highlightedId=currentPin;
 const visibleCamSeats=camSeats.slice(0,6);
 const orderedCamSeats=highlightedId?[...visibleCamSeats].sort((a,b)=>Number(b?.id===highlightedId)-Number(a?.id===highlightedId)):visibleCamSeats;
 useEffect(()=>{setPinnedCameraId(null);},[r.id]);
 useEffect(()=>{
   if(!mediaRoom){setActiveSpeakerIds([]);return;}
   const onSpeakers=(speakers:any[])=>setActiveSpeakerIds([...new Set(speakers.map(p=>p?.identity).filter((id):id is string=>typeof id==='string'&&id.length>0))]);
   const clearSpeakers=()=>setActiveSpeakerIds([]);
   // Track mute/unmute changes must update badges even if nobody joined or left.
   const mediaChanged=()=>setMediaTick(v=>v+1);
   const trackEvents=[RoomEvent.TrackMuted,RoomEvent.TrackUnmuted,RoomEvent.TrackPublished,RoomEvent.TrackUnpublished,RoomEvent.ParticipantConnected,RoomEvent.ParticipantDisconnected];
   mediaRoom.on(RoomEvent.ActiveSpeakersChanged,onSpeakers);
   mediaRoom.on(RoomEvent.Disconnected,clearSpeakers);
   mediaRoom.on(RoomEvent.Reconnecting,clearSpeakers);
   trackEvents.forEach(evt=>mediaRoom.on(evt,mediaChanged));
   onSpeakers(mediaRoom.activeSpeakers||[]);
   return()=>{mediaRoom.off(RoomEvent.ActiveSpeakersChanged,onSpeakers);mediaRoom.off(RoomEvent.Disconnected,clearSpeakers);mediaRoom.off(RoomEvent.Reconnecting,clearSpeakers);trackEvents.forEach(evt=>mediaRoom.off(evt,mediaChanged));};
 },[mediaRoom]);

 const reservedHost=Boolean(roster&&!host);
 const incoming=roster?.incomingInvitations?.[0];const outgoing=roster?.outgoingInvitations||[];
 const waiting=(roster?.requests||[]).map(id=>roster?.members.find(m=>m.id===id)).filter((m):m is NonNullable<typeof m>=>Boolean(m));
 const connection=liveConnectionNotice(status,!!live?.mic,live?.error||null);
 return <View style={{flex:1,backgroundColor:roomBg}}>
  <View style={{paddingHorizontal:18,paddingTop:8,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Pressable onPress={onBack} accessibilityLabel="Rời phòng Live" style={{padding:10,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'}}><Label c={c} size={23} style={{color:roomInk}}>‹</Label></Pressable>
   <View style={{maxWidth:108,flexShrink:1,backgroundColor:status==='connected'?(pkActive?pkTone.cheerBg:c.coral):(pkActive?pkTone.clockBg:c.surfaceAlt),borderRadius:9,paddingHorizontal:10,paddingVertical:6}}><Text accessibilityLiveRegion="polite" numberOfLines={1} style={{fontSize:11,color:status==='connected'?(pkActive?pkTone.cheerInk:'#371C1D'):(pkActive?pkTone.ink:c.ink),fontWeight:'800'}}>● {status==='connected'?(isCam?'LIVE CAM':'LIVE VOICE'):connection.shortLabel}</Text></View>
   <Pressable accessibilityRole="button" accessibilityLabel={realChat?`Xem danh sách ${audienceCount} người đang trong phòng`:'Xem danh sách minh họa; chưa có người xem thật'} accessibilityHint="Mở bảng người đang xem và người trên sân khấu" onPress={openAudience} style={({pressed})=>({minHeight:44,minWidth:78,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:10,borderRadius:15,borderWidth:1,borderColor:pkActive?pkTone.stageBorder:c.line,backgroundColor:pkActive?pkTone.clockBg:c.surface+'BF',transform:[{scale:pressed?.97:1}]})}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{width:16,height:16,alignItems:'center',justifyContent:'center'}}><View style={{width:7,height:7,borderRadius:4,backgroundColor:roomInk,position:'absolute',top:1,left:3}}/><View style={{width:8,height:7,borderRadius:4,backgroundColor:roomInk,position:'absolute',bottom:0,left:3}}/><View style={{width:5,height:5,borderRadius:3,backgroundColor:roomInk,position:'absolute',top:3,right:1,opacity:.6}}/></View>
    <Label c={c} size={11} bold style={{color:roomInk,fontVariant:['tabular-nums']}}>{audienceCount} người</Label>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn Live" onPress={()=>setSheet('options')} style={{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center',borderRadius:14}}><Text style={{color:roomInk,fontSize:17,fontWeight:'800'}}>•••</Text></Pressable>
  </View>
  <ScrollView style={{flex:1,backgroundColor:roomBg}} contentContainerStyle={{paddingHorizontal:16,paddingBottom:14,backgroundColor:roomBg}} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
   {incoming?<View accessibilityRole="alert" style={{backgroundColor:c.surface,borderWidth:1,borderColor:c.coral,borderRadius:17,padding:13,marginBottom:12,gap:9}}>
     <Label c={c} bold size={14}>{incoming.fromName||'Chủ phòng'} mời bạn lên {isCam?'camera':'mic'}</Label>
     <Label c={c} size={11} style={{color:c.muted}}>Bạn được quyền quyết định. Mic và camera không tự bật khi chấp nhận.</Label>
     <View style={{flexDirection:'row',gap:9}}><View style={{flex:1}}><Action c={c} outline label="Từ chối" onPress={()=>onRespondInvite?.(incoming.id,false)}/></View><View style={{flex:1}}><Action c={c} label="Chấp nhận" onPress={()=>onRespondInvite?.(incoming.id,true)}/></View></View>
   </View>:null}
   {!pkActive?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:7}}><View style={{flex:1}}><Label c={c} size={17} bold style={{color:roomInk}}>{r.title}</Label></View></View>:null}
   {!pkActive?<View style={{paddingHorizontal:4,paddingVertical:6,marginBottom:8}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <View style={{width:8,height:8,borderRadius:4,backgroundColor:status==='connected'?'#54d2a4':status==='connecting'||status==='reconnecting'?'#ffd28f':c.muted}}/>
     <View style={{flex:1,gap:3}}><Text numberOfLines={3} accessibilityLiveRegion="polite" style={{color:roomMuted,fontSize:11,lineHeight:15}}>{connection.label}</Text>
     {status==='error'&&onRetryLive&&realChat?<Pressable accessibilityRole="button" accessibilityLabel="Thử kết nối lại LiveKit" onPress={onRetryLive} style={{alignSelf:'flex-start',minHeight:36,justifyContent:'center'}}><Label c={c} size={11} bold style={{color:c.lavender}}>Thử kết nối lại</Label></Pressable>:null}</View>
    </View>
    </View>:null}
   <PKPanel roomId={r.id} c={c} optionsOpenRequest={pkOptionsRequest} enabled={tutttApi.enabled&&realChat} onActiveChange={setPkActive} mediaRoom={mediaRoom} hostId={roster?.hostId} liveStatus={status} activeSpeakerIds={[...activeIds]} roomType={isCam?'cam':'voice'}/>
   {!pkActive&&(isCam?<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
    <Label c={c} size={15} bold>Sân khấu camera</Label>
    <Label c={c} size={11} style={{color:c.muted}}>{camSeats.length}/6 có quyền lên cam</Label>
   </View>:<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <Label c={c} size={16} bold>Ghế nói</Label><Label c={c} size={11} style={{color:c.muted}}>{voices.length}/{roster?.limits.speakers||8} ghế</Label>
   </View>)}
   {isCam&&!pkActive?<>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12,backgroundColor:camStageBg,borderRadius:27,paddingHorizontal:12,paddingVertical:20,minHeight:205,alignItems:'center',justifyContent:'center'}}>
     {orderedCamSeats.map((member,i)=>{
      const featured=Boolean(member&&(member.id===highlightedId||(!highlightedId&&camSeats.length===1)));
      const columns=featured?1:(camSeats.length===3||camSeats.length>=5)?3:2;
      const tileWidth=featured?'100%':columns===2?'48.6%':'31.8%';
      const h=featured?Math.min(208,Math.max(154,Math.round(width*0.45))):columns===2?112:104;
      const participant=member?member.id===roster?.selfId?mediaRoom?.localParticipant:mediaRoom?.remoteParticipants.get(member.id):null;
      const publication=participant?[...participant.videoTrackPublications.values()].find(pub=>pub.source===Track.Source.Camera&&pub.track):undefined;
      const canShow=Boolean(publication?.track&&participant);
      const memberMic=micVisual(participant,status==='connected');
      const speaking=Boolean(member?.id&&activeIds.has(member.id)&&memberMic==='ready');
      return <Pressable key={member?.id||'empty-'+i} disabled={!member||camSeats.length<2} onPress={()=>member&&setPinnedCameraId(x=>x===member.id?null:member.id)} accessibilityRole={member?'button':'text'} accessibilityLabel={member?(currentPin===member.id?'Bỏ ghim ':'Ghim ')+member.name:'Ghế camera trống'} accessibilityHint={member?'Chạm để phóng to hoặc thu nhỏ camera':''}
       style={{width:tileWidth,height:h,borderRadius:featured?19:15,overflow:canShow?'hidden':'visible',borderWidth:canShow?(speaking?3:(featured?2:1)):0,borderColor:speaking?'#39D49C':featured?c.coral:c.line,backgroundColor:canShow?c.hero:'transparent',alignItems:'center',justifyContent:'center'}}>
       {canShow?<VideoTrack trackRef={{participant:participant!,publication:publication!,source:Track.Source.Camera} as any} style={{width:'100%',height:'100%'}}/>:
        <View style={{alignItems:'center',justifyContent:'center',gap:5,width:'100%'}}>
         <AudioAvatar name={member?.name||'Khách'} accent={c.lavender} size={featured?65:columns===3?47:56} mic={memberMic} speaking={speaking}/>
         <Text style={{fontSize:11,fontWeight:'700',color:camSeatInk,textAlign:'center'}} numberOfLines={1}>{member?.name||'Khách'}</Text>
         <Text style={{fontSize:10,color:camSeatMuted,textAlign:'center'}}>{reservedHost&&member?.id===roster?.hostId?'Giữ chỗ':member?.role==='host'?'Chủ phòng':member?.role==='moderator'?'Phó phòng':'Camera tắt'}</Text>
        </View>}
       {member&&canShow?<View style={{position:'absolute',left:4,right:4,bottom:4,backgroundColor:'#1B1517D9',borderRadius:8,paddingVertical:featured?6:3,paddingHorizontal:6,flexDirection:'row',gap:5,justifyContent:'space-between',alignItems:'center'}}>
        <Text numberOfLines={1} style={{color:'#fff',fontSize:featured?12:9,flex:1,fontWeight:'700'}}>{member.name}</Text>
        <Text style={{color:'#F9C5B5',fontSize:featured?10:8}}>{member.role==='host'?'CHỦ':member.role==='moderator'?'PHÓ':''}</Text>
       </View>:null}
       {member&&canShow&&memberMic==='muted'?<View style={{position:'absolute',top:5,right:5}}><MutedBadge/></View>:null}
       {member&&currentPin===member.id&&!speaking?<View style={{position:'absolute',top:6,right:6,backgroundColor:'#1F1719DF',borderRadius:9,paddingHorizontal:6,paddingVertical:3}}><Text style={{fontSize:9,color:'#FFF3E8',fontWeight:'800'}}>ĐÃ GHIM</Text></View>:null}
      </Pressable>;
     })}
    </View>
   </>:null}
   {!isCam&&!pkActive?<View style={{backgroundColor:c.surfaceAlt,borderRadius:27,paddingVertical:15,paddingHorizontal:12,marginBottom:10,minHeight:176,alignItems:'center',justifyContent:'center'}}>
      <View style={{alignItems:'center',justifyContent:'center',gap:5,marginBottom:8}}>
       {(()=>{const owner=voices.find(v=>v.role==='host')||{id:roster?.hostId||'preview',name:r.host,role:'host' as const,speaker:true};const participant=owner.id===roster?.selfId?mediaRoom?.localParticipant:mediaRoom?.remoteParticipants.get(owner.id);const audio=micVisual(participant,status==='connected');return <><AudioAvatar name={owner.name} accent={c.lavender} size={69} mic={audio} speaking={activeIds.has(owner.id)&&audio==='ready'}/><Text style={{color:c.ink,fontWeight:'900',fontSize:13}}>{owner.name}</Text><Text style={{color:c.muted,fontSize:10}}>Chủ phòng</Text></>})()}
      </View>
      {voices.filter(v=>v.role!=='host').length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:18,alignItems:'center',justifyContent:'center'}}>{voices.filter(v=>v.role!=='host').slice(0,7).map(member=>{const participant=member.id===roster?.selfId?mediaRoom?.localParticipant:mediaRoom?.remoteParticipants.get(member.id);const statusMic=micVisual(participant,status==='connected');return <View key={member.id} style={{alignItems:'center',width:68,gap:3}}><AudioAvatar name={member.name} accent={c.lavender} size={43} mic={statusMic} speaking={activeIds.has(member.id)&&statusMic==='ready'}/><Text style={{color:c.ink,fontSize:10}} numberOfLines={1}>{member.name}</Text></View>})}</View>:<Text style={{color:c.muted,fontSize:11}}>Mời bạn cùng lên mic trò chuyện</Text>}
   </View>:null}
   <View accessibilityLabel="Trò chuyện trực tiếp" style={{marginTop:5,paddingTop:9,paddingHorizontal:4,minHeight:180,backgroundColor:'transparent'}}>
    <Label c={c} size={11} bold style={{color:roomMuted,marginBottom:10}}>●  Trò chuyện trực tiếp</Label>
    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{height:pkActive?Math.max(85,Math.min(Math.round(height*.14),130)):Math.max(170,Math.min(Math.round(height*0.30),290))}} contentContainerStyle={{alignItems:'flex-start',gap:7,paddingVertical:4}}>
      {log.length?log.slice(-40).map((line,i)=><View key={i} style={{alignSelf:'flex-start',maxWidth:'97%',paddingVertical:8,paddingHorizontal:12,borderRadius:16,backgroundColor:pkActive?roomInk+'12':c.surface+'D9'}}><Label c={c} size={13} style={{color:roomInk,lineHeight:19}}>{line}</Label></View>):<Label c={c} size={12} style={{color:roomMuted}}>Chưa có tin nhắn. Hãy gửi lời chào đầu tiên!</Label>}
    </ScrollView>
   </View>
  </ScrollView>
  <View style={{flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:15,paddingVertical:9,backgroundColor:roomBg}}>
   <TextInput accessibilityLabel="Nhập tin nhắn trong phòng" placeholder="Gửi tin nhắn…" placeholderTextColor={roomMuted} value={msg} onChangeText={setMsg} style={{backgroundColor:pkActive?pkTone.clockBg:c.surface,color:roomInk,borderRadius:24,paddingHorizontal:15,flex:1,height:46,borderWidth:1,borderColor:pkActive?pkTone.stageBorder:c.line}}/>
   <Pressable accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" onPress={()=>{if(msg.trim()){onMessage(msg.trim());setMsg('')}}} style={{width:46,height:46,minWidth:46,minHeight:46,alignItems:'center',justifyContent:'center',borderRadius:18,backgroundColor:pkActive?pkTone.cheerBg:c.coral}}>
    <Text style={{color:pkActive?pkTone.cheerInk:'#FFF4E9',fontSize:23,fontWeight:'700'}}>➤</Text>
   </Pressable>
  </View>
  <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:isCam?6:10,paddingHorizontal:isCam?10:13,paddingTop:11,paddingBottom:17,borderTopWidth:0,backgroundColor:roomBg}}>
   {([['♧',seat?'Rời ghế':roster?.requests.includes(roster.selfId)?'Chờ duyệt':isCam?'Xin lên cam':'Xin lên mic',onSeat],['◉',mic?'Tắt mic':'Bật mic',onMic],...(isCam?[['▣',live?.camera?'Tắt cam':'Bật cam',onCam]] as [string,string,()=>void][]:[]),['✕','Rời phòng',onBack]] as [string,string,()=>void][]).map(([glyph,label,action],i)=>{const blocked=(i===1||(isCam&&i===2))&&connection.mediaActionsDisabled;return <Pressable key={i} accessibilityRole="button" accessibilityLabel={blocked?'Đang kết nối · '+label:label} accessibilityState={{disabled:blocked}} disabled={blocked} onPress={action} style={({pressed})=>({flex:1,alignItems:'center',gap:8,minHeight:73,minWidth:0,justifyContent:'center',opacity:blocked?.48:1,transform:[{scale:pressed?.94:1}]})}>
    <View style={{width:44,height:44,borderRadius:17,backgroundColor:i===1&&mic?pkActive?pkTone.sideAAccent:c.lavender:pkActive?pkTone.ink+'0F':c.surface,borderWidth:1,borderColor:i===1&&mic?pkTone.sideAAccent:pkActive?pkTone.stageBorder:c.line,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:19,color:i===1&&mic?'#FFF0E5':label==='Rời phòng'?pkTone.sideAAccent:roomInk}}>{glyph}</Text></View>
    <Label c={c} size={10} style={{color:roomMuted,textAlign:'center',fontWeight:'700'}}>{label==='Xin lên cam'?'Lên cam':label==='Xin lên mic'?'Lên mic':label==='Rời phòng'?'Rời':label==='Quà'?'Quà':label==='Chờ duyệt'?'Đang chờ':label}</Label>
   </Pressable>})}
  </View>
  <Modal transparent visible={sheet!==null} animationType="slide" onRequestClose={()=>setSheet(null)}>
   <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#150E10A8'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Đóng bảng thông tin" onPress={()=>setSheet(null)} style={{flex:1}} />
    <View accessibilityViewIsModal style={{backgroundColor:c.surface,borderTopLeftRadius:27,borderTopRightRadius:27,paddingHorizontal:16,paddingTop:12,paddingBottom:28,maxHeight:Math.min(height*.77,620)}}>
     <View style={{alignItems:'center',marginBottom:10}}><View style={{width:38,height:4,backgroundColor:c.line,borderRadius:9}} /></View>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
      <Label c={c} size={18} bold>{sheet==='members'?`Người trong phòng · ${audienceCount}`:sheet==='options'?'Tùy chọn Live':sheet==='report'?'Báo cáo phòng':'Quản lý phòng'}</Label>
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={()=>setSheet(null)} style={{minHeight:44,minWidth:44,justifyContent:'center',alignItems:'center'}}><Label c={c} size={20}>×</Label></Pressable>
     </View>
     {sheet==='members'?<AudienceMemberList c={c} realChat={realChat} issue={audienceIssue} host={r.host} audience={realChat&&audienceVerified&&audience?.roomId===r.id?audience:null}/>:<ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled showsVerticalScrollIndicator={false}>
   {sheet==='options'&&<View style={{gap:8,paddingBottom:4}}>
    {isManager?<Pressable accessibilityRole="button" accessibilityLabel="Quản lý phòng" onPress={()=>setSheet('manage')} style={{minHeight:62,backgroundColor:c.surfaceAlt,borderRadius:15,paddingHorizontal:15,justifyContent:'center',gap:4}}><Label c={c} size={14} bold>Quản lý phòng</Label><Label c={c} size={11} style={{color:c.muted}}>Duyệt yêu cầu và quản lý thành viên</Label></Pressable>:null}
    {pkActive?<Pressable accessibilityRole="button" accessibilityLabel="PK và kết quả" onPress={()=>{setSheet(null);setPkOptionsRequest(n=>n+1)}} style={{minHeight:62,backgroundColor:c.surfaceAlt,borderRadius:15,paddingHorizontal:15,justifyContent:'center',gap:4}}><Label c={c} size={14} bold>PK & kết quả</Label><Label c={c} size={11} style={{color:c.muted}}>Điểm, kết quả và quyền kết thúc trận</Label></Pressable>:null}
    <Pressable accessibilityRole="button" accessibilityLabel="Báo cáo phòng" onPress={()=>setSheet('report')} style={{minHeight:62,backgroundColor:c.surfaceAlt,borderRadius:15,paddingHorizontal:15,justifyContent:'center',gap:4}}><Label c={c} size={14} bold>Báo cáo phòng</Label><Label c={c} size={11} style={{color:c.muted}}>Gửi mô tả vi phạm tới máy chủ</Label></Pressable>
   </View>}
   {sheet==='report'&&<View style={{gap:12,paddingBottom:6}}>
    <Label c={c} size={12} style={{color:c.muted,lineHeight:19}}>{realChat&&tutttApi.enabled?'Báo cáo được lưu trên máy chủ. Hiện chưa có kiểm duyệt tự động.':'Cần kết nối máy chủ để gửi báo cáo thật.'}</Label>
    <TextInput accessibilityLabel="Mô tả vi phạm" multiline value={reportReason} onChangeText={setReportReason} maxLength={250} placeholder="Nội dung quấy rối, spam, xúc phạm..." placeholderTextColor={c.muted} style={{minHeight:100,borderWidth:1,borderColor:c.line,borderRadius:15,padding:14,textAlignVertical:'top',backgroundColor:c.bg,color:c.ink,fontSize:13}} />
    <Pressable accessibilityRole="button" accessibilityLabel="Gửi báo cáo" disabled={reportBusy||!realChat||!tutttApi.enabled||reportReason.trim().length<8} onPress={()=>void submitRoomReport()} style={{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:c.lavender,opacity:(reportBusy||!realChat||!tutttApi.enabled||reportReason.trim().length<8)?0.5:1}}><Text style={{color:'#FFF9F4',fontWeight:'800'}}>{reportBusy?'Đang gửi…':'Gửi báo cáo'}</Text></Pressable>
   </View>}
   {sheet==='manage'&&isManager&&waiting.length?<View style={{backgroundColor:c.surface,borderRadius:18,padding:13,borderColor:c.line,borderWidth:1}}>
    <Label c={c} size={14} bold>Yêu cầu {isCam?'lên cam':'lên mic'} ({waiting.length})</Label>
    {waiting.map(m=><View key={m.id} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:10}}>
      <Label c={c} size={12}>{m.name}</Label><Action c={c} label="Duyệt" onPress={()=>onApprove?.(m.id,true)}/>
    </View>)}
   </View>:null}
   {sheet==='manage'&&isManager&&outgoing.length?<View style={{marginTop:11,padding:12,borderRadius:13,backgroundColor:c.surfaceAlt}}><Label c={c} size={13} bold>Lời mời đang chờ</Label>{outgoing.map(inv=><View key={inv.id} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:46}}><Label c={c} size={12}>{roster?.members.find(m=>m.id===inv.toId)?.name||'Thành viên'}</Label><Pressable onPress={()=>onCancelInvite?.(inv.id)} style={{padding:10}} accessibilityRole="button" accessibilityLabel="Hủy lời mời"><Label c={c} size={11}>Hủy lời mời</Label></Pressable></View>)}</View>:null}
   {sheet==='manage'&&isManager&&roster?<View style={{marginTop:14}}>
    <Label c={c} size={14} bold>Quản lý thành viên</Label>
    {roster.members.filter(m=>mayManageLiveMember(me?.role,roster.selfId,m,roster.hostId)).map(m=><View key={m.id} style={{paddingVertical:11,borderBottomWidth:1,borderColor:c.line,gap:7}}>
     <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label c={c} size={12}>{m.name}</Label><Label c={c} size={10} style={{color:c.muted}}>{m.role==='moderator'?'Moderator':m.speaker?'Đang có ghế':'Người nghe'}</Label></View>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
      {!m.speaker?<Pressable onPress={()=>onInvite?.(m.id)} accessibilityRole="button" style={{backgroundColor:c.surfaceAlt,padding:10,minHeight:44,borderRadius:10}}><Label c={c} size={11}>Mời lên {isCam?'cam':'mic'}</Label></Pressable>:<Pressable onPress={()=>onApprove?.(m.id,false)} accessibilityRole="button" style={{backgroundColor:c.surfaceAlt,padding:10,minHeight:44,borderRadius:10}}><Label c={c} size={11}>Thu hồi ghế</Label></Pressable>}
      {isHost&&mayModerateLiveMember(me?.role,roster.selfId,m,roster.hostId,m.role==='moderator'?'demote':'promote')?<Pressable onPress={()=>onModerate?.(m.id,m.role==='moderator'?'demote':'promote')} style={{backgroundColor:c.surfaceAlt,padding:9,borderRadius:10}}><Label c={c} size={10}>{m.role==='moderator'?'Thu hồi phó phòng':'Phong phó phòng'}</Label></Pressable>:null}
      {m.role==='listener'&&mayModerateLiveMember(me?.role,roster.selfId,m,roster.hostId,m.chatMutedUntil>Date.now()?'unmute-chat':'mute-chat')?<Pressable onPress={()=>onModerate?.(m.id,m.chatMutedUntil>Date.now()?'unmute-chat':'mute-chat')} style={{backgroundColor:c.surfaceAlt,padding:9,borderRadius:10}}><Label c={c} size={10}>{m.chatMutedUntil>Date.now()?'Mở chat':'Khóa chat 10p'}</Label></Pressable>:null}
      {m.role==='listener'&&mayModerateLiveMember(me?.role,roster.selfId,m,roster.hostId,'ban')?<Pressable onPress={()=>onModerate?.(m.id,'ban')} style={{backgroundColor:c.surfaceAlt,padding:9,borderRadius:10}}><Label c={c} size={10}>Cấm vào 1 giờ</Label></Pressable>:null}
      <Pressable onPress={()=>onModerate?.(m.id,'kick')} style={{backgroundColor:c.surfaceAlt,padding:9,borderRadius:10}}><Label c={c} size={10}>Mời ra</Label></Pressable>
     </View>
    </View>)}
   </View>:null}
   {sheet==='manage'&&isHost&&roster?<View style={{backgroundColor:c.surface,borderRadius:17,padding:15,marginVertical:16,borderWidth:1,borderColor:c.line,gap:10}}>
    <Label c={c} size={14} bold>Cài đặt phòng · chủ phòng</Label>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
     <Action c={c} outline label={roster.settings.locked?'Mở cửa phòng':'Khóa phòng'} onPress={()=>onSettings({locked:!roster.settings.locked})}/>
     <Action c={c} outline label={roster.settings.chatEnabled?'Khóa chat chung':'Mở chat chung'} onPress={()=>onSettings({chatEnabled:!roster.settings.chatEnabled})}/>
     <Action c={c} outline label={'Chat chậm: '+(roster.settings.slowModeSeconds||0)+'s'} onPress={()=>onSettings({slowModeSeconds:roster.settings.slowModeSeconds===0?5:roster.settings.slowModeSeconds===5?10:roster.settings.slowModeSeconds===10?30:0})}/>
    </View>
   </View>:null}
     </ScrollView>}
    </View>
   </View>
  </Modal>
 </View>;
}
export function ClubDetail({c,club,onBack,onToggle}:{c:Palette;club:Club;onBack:()=>void;onToggle:()=>void}){return <Screen c={c}><Pressable onPress={onBack} style={{paddingVertical:12}}><Label c={c} size={18}>‹  Cộng đồng</Label></Pressable><View style={{height:185,backgroundColor:club.accent,borderRadius:25,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontSize:91}}>{club.art}</Text></View><Label c={c} size={10} style={{color:c.lavender,marginTop:20}}>GẶP NGƯỜI CÙNG GU</Label><Text style={[uiStyles.h1,{color:c.ink}]}>{club.name}</Text><Desc c={c}>{club.subtitle} · {club.members} thành viên</Desc><Action c={c} label={club.joined?'✓ Đã tham gia · Rời nhóm':'Tham gia cộng đồng'} onPress={onToggle}/><SectionTitle c={c} title="Không gian chung"/><Label c={c} size={12} style={{color:c.muted}}>Các kênh trò chuyện, sự kiện và phân quyền thành viên sẽ được kết nối backend ở giai đoạn tiếp theo.</Label></Screen>}
export function SettingsScreen({c,onBack,isLight,onTheme}:{c:Palette;onBack:()=>void;isLight:boolean;onTheme:()=>void}){return <Screen c={c}><Pressable onPress={onBack} style={{paddingVertical:12}}><Label c={c} size={18}>‹  Cài đặt</Label></Pressable><Text style={[uiStyles.h1,{color:c.ink}]}>Tùy chỉnh trải nghiệm</Text><Desc c={c}>Túttt theo cách bạn thấy thoải mái nhất.</Desc><SectionTitle c={c} title="Giao diện"/><View accessibilityRole="radiogroup" accessibilityLabel="Chọn giao diện" style={{flexDirection:'row',gap:10,marginTop:14}}>{(['light','dark'] as const).map((scheme)=><Pressable key={scheme} onPress={()=>{if((scheme==='light')!==isLight)onTheme()}} accessibilityRole="radio" accessibilityState={{checked:(scheme==='light')===isLight}} style={{flex:1,minHeight:56,borderRadius:15,borderWidth:(scheme==='light')===isLight?2:1,borderColor:(scheme==='light')===isLight?c.lavender:c.line,backgroundColor:(scheme==='light')===isLight?c.surfaceAlt:c.surface,justifyContent:'center',alignItems:'center'}}><Label c={c} size={12} bold>{scheme==='light'?'☀ Ivory · Sáng':'☾ Espresso · Tối'}</Label></Pressable>)}</View><Desc c={c}>Giao diện được áp dụng đồng nhất cho mọi trang.</Desc><SectionTitle c={c} title="Quyền riêng tư"/><Desc c={c}>Trong phòng Live, bạn có thể gửi báo cáo vi phạm khi đã kết nối máy chủ. Chặn người dùng và quyền riêng tư tài khoản đang được hoàn thiện.</Desc></Screen>}

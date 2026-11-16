import React,{useEffect,useRef,useState} from 'react';
import {Alert,Appearance,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StatusBar,Text,TextInput,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';
import {Action,BottomTabs,Header,Label} from './src/components/Primitives';
import {demoRooms,demoContacts,demoClubs,initialMessages} from './src/data/demo';
import type {Room,Contact,Club,Message} from './src/data/demo';
import {dark,light} from './src/theme/tokens';
import {tutttApi} from './src/services/api';
import {useLiveVoice} from './src/voice/useLiveVoice';
import type {ApiRoom} from './src/services/api';
import {DiscoverScreen,LiveScreen,ChatScreen,ProfileScreen,CommunityScreen,ConversationScreen,RoomScreen,ClubDetail,SettingsScreen} from './src/screens/Screens';

type Tab='discover'|'live'|'chat'|'profile';
type Page=Tab|'community'|'room'|'thread'|'club'|'settings';
const now=()=>new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
const toRoom=(x:ApiRoom):Room=>({type:x.type||'voice',id:x.id,title:x.title,subtitle:x.subtitle,host:x.host,members:x.members,tag:x.tag,art:'✳',accent:'#9A4A3B'});
function AppContent(){
 const [theme,setTheme]=useState<'dark'|'light'>('light');const c=theme==='dark'?dark:light;
 // Keep native dialogs and controls in the same scheme as the chosen app theme.
 useEffect(()=>{Appearance.setColorScheme(theme)},[theme]);
 const [page,setPage]=useState<Page>('discover');const [tab,setTab]=useState<Tab>('discover');
 const [rooms,setRooms]=useState<Room[]>(demoRooms);const [contacts,setContacts]=useState<Contact[]>(demoContacts);
 const [clubs,setClubs]=useState<Club[]>(demoClubs);const [messages,setMessages]=useState<Record<string,Message[]>>(initialMessages);
 const [room,setRoom]=useState<Room|null>(null);const [contact,setContact]=useState<Contact|null>(null);const [club,setClub]=useState<Club|null>(null);
 const [modal,setModal]=useState<'create'|'edit'|null>(null);const [roomType,setRoomType]=useState<'voice'|'cam'>('voice');const [roomName,setRoomName]=useState('');const [roomDesc,setRoomDesc]=useState('');const [roomTag,setRoomTag]=useState('Tâm sự');
 const [username,setUsername]=useState('Bạn');const [bio,setBio]=useState('Một tâm hồn thích những cuộc trò chuyện hay ✨');const [draftUsername,setDraftUsername]=useState('Bạn');const [draftBio,setDraftBio]=useState('');
 const [seat,setSeat]=useState(false);const [mic,setMic]=useState(false);const [roomLog,setRoomLog]=useState<string[]>([]);
 const [serverReady,setServerReady]=useState(false);
 const {state:liveState,voice:liveVoice}=useLiveVoice();
 const roomNavigation=useRef(0);
 const activeRoomId=useRef<string|null>(null);
 const [connectedUser,setConnectedUser]=useState<string|null>(null);
 const refreshRooms=async()=>{if(!tutttApi.enabled||!connectedUser)return;try{const x=await tutttApi.listRooms();setRooms(x.rooms.map(toRoom))}catch{}};
 useEffect(()=>{
   if(!tutttApi.enabled)return;
   let alive=true;
   (async()=>{try{const user=await tutttApi.connect();if(!alive)return;
     setUsername(user.name);setBio(user.bio||'');setConnectedUser(user.id);setContacts([]);setRooms([]);setServerReady(true);
     const result=await tutttApi.listRooms();if(alive)setRooms(result.rooms.map(toRoom));
   }catch(error){if(alive)Alert.alert('Máy chủ chưa sẵn sàng',String(error));}})();
   return()=>{alive=false};
 },[]);
 useEffect(()=>{
   if(!serverReady)return;
   const handle=setInterval(()=>{tutttApi.listRooms().then(x=>setRooms(x.rooms.map(toRoom))).catch(()=>{})},10000);
   return()=>clearInterval(handle);
 },[serverReady]);
 useEffect(()=>{
   if(!serverReady||page!=='room'||!room)return;
   let alive=true;
   async function update(){try{
     const data=await tutttApi.messages(room!.id);
     if(alive){
       const next=data.messages.map(m=>m.name+': '+m.text);
       setRoomLog(previous=>previous.length===next.length&&previous.every((line,index)=>line===next[index])?previous:next);
     }
     // Joining is owned by openRoom(). Polling chat must NEVER re-join the room.
   }catch{}}
   update();const handle=setInterval(update,3500);
   return()=>{alive=false;clearInterval(handle)};
 },[serverReady,page,room?.id]);
 const switchTab=(id:string)=>{if(id==='create'){setModal('create');return}const next=id as Tab;setTab(next);setPage(next)};
 const openRoom=(r:Room)=>{
   const navigation=++roomNavigation.current;
   activeRoomId.current=r.id;
   setRoom(r);setRoomLog([]);setSeat(false);setMic(false);setPage('room');
   if(serverReady){
     void (async()=>{try{
       await tutttApi.join(r.id);
       if(navigation!==roomNavigation.current){
         // The delayed join may have succeeded after the user left. Only leave
         // that membership when it is not already reused by a newer entry.
         if(activeRoomId.current!==r.id)void tutttApi.leave(r.id).catch(()=>{});
         return;
       }
       await liveVoice.connect(r.id);
     }catch(error){if(navigation===roomNavigation.current)Alert.alert('Không thể tham gia phòng',String(error));}})();
   }
 };
 const openChat=(id:string)=>{const found=contacts.find(x=>x.id===id);if(!found)return;setContact(found);setContacts(prev=>prev.map(x=>x.id===id?{...x,unread:0}:x));setPage('thread');setTab('chat')};
 const back=()=>{if(page==='room'){++roomNavigation.current;activeRoomId.current=null;void liveVoice.disconnect();if(serverReady&&room)tutttApi.leave(room.id).catch(()=>{});setPage('live');setTab('live');setRoom(null);setMic(false);setSeat(false)}else if(page==='thread'){setPage('chat');setTab('chat')}else if(page==='club'){setPage('community')}else{setPage('profile');setTab('profile')}};
 const sendMessage=(text:string)=>{if(!contact)return;const id=contact.id;setMessages(prev=>({...prev,[id]:[...(prev[id]||[]),{id:String(Date.now()),from:'me',text,time:now()}]}));setContacts(prev=>prev.map(x=>x.id===id?{...x,last:text,time:now()}:x))};
 const createRoom=async()=>{const title=roomName.trim();if(!title)return Alert.alert('Thiếu tên phòng','Vui lòng nhập tên phòng trước khi tạo.');
 if(serverReady){try{const result=await tutttApi.createRoom(title,roomDesc.trim(),roomTag,roomType);const r=toRoom(result.room);setRooms(prev=>[r,...prev]);setModal(null);setRoomName('');setRoomDesc('');openRoom(r);return;}catch(error){Alert.alert('Không thể tạo phòng',String(error));return;}}const r:Room={type:roomType,id:'demo-'+Date.now(),title,subtitle:roomDesc.trim()||'Hãy kể câu chuyện của bạn',host:username,members:1,tag:roomTag,art:'✳',accent:'#9A4A3B'};setRooms(prev=>[r,...prev]);setModal(null);setRoomName('');setRoomDesc('');openRoom(r)};
 const showEdit=()=>{setDraftUsername(username);setDraftBio(bio);setModal('edit')};
 const showVoiceError=(error:unknown)=>Alert.alert('Live',error instanceof Error?error.message:String(error));
 const toggleSeat=()=>{if(!serverReady)return showVoiceError('Đang sử dụng bản demo giao diện');
   const self=liveState.roster?.members.find(x=>x.id===liveState.roster?.selfId);
   if(self?.role==='host')return Alert.alert('Ghế chủ phòng','Chủ phòng luôn giữ một vị trí trên sân khấu; bạn có thể tắt mic và camera.');
   const pending=liveState.roster?.requests.includes(liveState.roster.selfId);
   if(pending)return Alert.alert('Đã gửi yêu cầu','Hãy đợi host hoặc moderator duyệt.');
   void (self?.speaker?liveVoice.leaveSeat():liveVoice.requestSeat()).catch(showVoiceError);
 };
 const toggleCam=()=>{if(!serverReady)return showVoiceError('Camera cần máy chủ LiveKit');void liveVoice.camera().catch(showVoiceError);};
 const toggleMic=()=>{if(!serverReady)return showVoiceError('Đang sử dụng bản demo giao diện');
   void liveVoice.microphone().catch(showVoiceError);
 };
 const inviteGuest=(uid:string)=>{void liveVoice.invite(uid).catch(showVoiceError)};
 const respondInvite=(invitationId:string,accept:boolean)=>{void liveVoice.respondInvite(invitationId,accept).catch(showVoiceError)};
 const cancelInvite=(invitationId:string)=>{void liveVoice.cancelInvite(invitationId).catch(showVoiceError)};
 const approveSeat=(uid:string,enabled:boolean)=>{void liveVoice.approveSeat(uid,enabled).catch(showVoiceError)};
 const moderateMember=(uid:string,action:'kick'|'ban'|'unban'|'promote'|'demote'|'mute-chat'|'unmute-chat')=>{
   const labels:{[k:string]:string}={kick:'Mời người này ra khỏi phòng? Họ có thể vào lại.',ban:'Cấm người này vào phòng trong 60 phút?',promote:'Bổ nhiệm làm phó phòng?',demote:'Thu hồi quyền phó phòng?','mute-chat':'Khóa chat thành viên này trong 10 phút?','unmute-chat':'Mở lại quyền chat?'};
   Alert.alert('Quản lý thành viên',labels[action]||'Bạn xác nhận thao tác này?', [{text:'Hủy',style:'cancel'},
     {text:'Xác nhận',style:['kick','ban'].includes(action)?'destructive':'default',onPress:()=>{void liveVoice.moderate(uid,action,action==='ban'?60:action==='mute-chat'?10:undefined).catch(showVoiceError)}}]);
 };
 const roomSettings=(update:{locked?:boolean;chatEnabled?:boolean;slowModeSeconds?:number})=>{void liveVoice.settings(update).catch(showVoiceError)};
 const headerVisible=['discover','live','chat','profile','community'].includes(page);
 const tabsVisible=['discover','live','chat','profile','community'].includes(page);
 let screen:React.ReactNode=null;
 if(page==='discover')screen=<DiscoverScreen c={c} rooms={rooms} onRoom={openRoom} onLive={()=>switchTab('live')} onCommunity={()=>setPage('community')} onChat={openChat} demo={!serverReady}/>;
 if(page==='live')screen=<LiveScreen c={c} rooms={rooms} onRoom={openRoom} realChat={serverReady}/>;
 if(page==='chat')screen=<ChatScreen c={c} chats={contacts} onChat={openChat} demo={!serverReady}/>;
 if(page==='profile')screen=<ProfileScreen c={c} name={username} bio={bio} onEdit={showEdit} onCommunity={()=>setPage('community')} onSettings={()=>setPage('settings')} demo={!serverReady}/>;
 if(page==='community')screen=<CommunityScreen c={c} clubs={clubs} onClub={id=>{const found=clubs.find(x=>x.id===id);if(found){setClub(found);setPage('club')}}}/>;
 if(page==='room'&&room)screen=<RoomScreen c={c} r={room} onBack={()=>Alert.alert('Rời phòng Live?', 'Microphone và camera sẽ ngắt kết nối khi bạn rời phòng.',[{text:'Ở lại',style:'cancel'},{text:'Rời phòng',style:'destructive',onPress:back}])} seat={!!liveState.roster?.members.find(x=>x.id===liveState.roster?.selfId)?.speaker} mic={liveState.mic} live={liveState} onApprove={approveSeat} onInvite={inviteGuest} onRespondInvite={respondInvite} onCancelInvite={cancelInvite} onModerate={moderateMember} onRetryLive={()=>{void liveVoice.retry().catch(showVoiceError)}} onSeat={toggleSeat} onMic={toggleMic} onCam={toggleCam} mediaRoom={liveVoice.mediaRoom} onSettings={roomSettings} log={roomLog} onMessage={async s=>{if(serverReady){try{await tutttApi.send(room.id,s);const data=await tutttApi.messages(room.id);setRoomLog(data.messages.map(m=>m.name+': '+m.text));}catch(error){Alert.alert('Chưa gửi được',String(error));}}else setRoomLog(x=>[...x,username+': '+s])}} realChat={serverReady}/>;
 if(page==='thread'&&contact)screen=<ConversationScreen c={c} contact={contact} messages={messages[contact.id]||[]} onBack={back} onSend={sendMessage}/>;
 if(page==='club'&&club)screen=<ClubDetail c={c} club={club} onBack={back} onToggle={()=>{const updated={...club,joined:!club.joined};setClub(updated);setClubs(prev=>prev.map(x=>x.id===club.id?updated:x))}}/>;
 if(page==='settings')screen=<SettingsScreen c={c} onBack={back} isLight={theme==='light'} onTheme={()=>setTheme(x=>x==='dark'?'light':'dark')}/>;
 return <SafeAreaView style={{flex:1,backgroundColor:c.bg}} edges={['top','bottom']}><StatusBar barStyle={theme==='dark'?'light-content':'dark-content'}/>{headerVisible?<Header c={c}/>:null}<View style={{flex:1}}>{screen}</View>{tabsVisible?<BottomTabs c={c} tab={tab} onSelect={switchTab}/>:null}
 <Modal visible={modal!==null} animationType="slide" transparent onRequestClose={()=>setModal(null)}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end',backgroundColor:'#030208bb'}}><Pressable style={{flex:1}} onPress={()=>setModal(null)} accessibilityLabel="Đóng"/><ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:'80%',backgroundColor:c.surface,borderTopLeftRadius:24,borderTopRightRadius:24}} contentContainerStyle={{paddingHorizontal:24,paddingTop:23,paddingBottom:42}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Label c={c} size={22} bold>{modal==='create'?'Tạo phòng Live ✦':'Sửa hồ sơ'}</Label><Pressable onPress={()=>setModal(null)} accessibilityLabel="Đóng"><Label c={c} size={23}>×</Label></Pressable></View><Label c={c} size={12} style={{color:c.muted,marginTop:9,marginBottom:14}}>{modal==='create'?'Một góc nhỏ của bạn. Tự do đặt chủ đề và trò chuyện.':'Chỉnh sửa những gì bạn muốn mọi người nhìn thấy.'}</Label>
 {modal==='create'?<><Label c={c} size={13} bold>Loại phòng</Label><View style={{flexDirection:'row',gap:10,marginTop:10,marginBottom:18}}>{([['voice','🎙  Live Voice','Tối đa 8 ghế mic'],['cam','▣  Live Cam','Tối đa 6 camera']] as const).map(([type,title,info])=><Pressable key={type} onPress={()=>setRoomType(type)} accessibilityRole="radio" accessibilityState={{checked:roomType===type}} style={{flex:1,borderWidth:2,borderColor:roomType===type?c.coral:c.line,backgroundColor:roomType===type?c.surfaceAlt:c.surface,borderRadius:16,padding:13,minHeight:78}}><Label c={c} bold size={13}>{title}</Label><Label c={c} size={11} style={{color:c.muted,marginTop:6}}>{info}</Label></Pressable>)}</View><Label c={c} size={12} bold>Tên phòng</Label><TextInput value={roomName} onChangeText={setRoomName} maxLength={55} placeholder="Những câu chuyện chưa kể" placeholderTextColor={c.muted} style={{color:c.ink,backgroundColor:c.surfaceAlt,borderRadius:13,padding:13,marginTop:9,marginBottom:17}}/><Label c={c} size={12} bold>Chủ đề</Label><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:11}}>{['Tâm sự','Âm nhạc','Kết bạn','Học tập'].map(x=><Pressable key={x} onPress={()=>setRoomTag(x)} style={{borderRadius:10,backgroundColor:roomTag===x?c.surface:c.surfaceAlt,borderColor:c.line,borderWidth:1,padding:11}}><Label c={c} size={12}>{x}</Label></Pressable>)}</View><Label c={c} size={12} bold>Mô tả (không bắt buộc)</Label><TextInput value={roomDesc} onChangeText={setRoomDesc} maxLength={120} multiline placeholder="Mọi người sẽ nói về điều gì?" placeholderTextColor={c.muted} style={{color:c.ink,backgroundColor:c.surfaceAlt,borderRadius:13,padding:13,marginTop:9,marginBottom:17,minHeight:65,textAlignVertical:'top'}}/><Label c={c} size={10} style={{color:c.muted,marginBottom:13}}>{serverReady?'Chat phòng đồng bộ với server; voice qua LiveKit cần nghiệm thu trên thiết bị thật.':'Voice native đang ở giai đoạn tích hợp; chưa nghiệm thu hai thiết bị.'}</Label><Action c={c} label="Tạo phòng →" onPress={createRoom}/></>:<><Label c={c} size={12} bold>Tên hiển thị</Label><TextInput value={draftUsername} onChangeText={setDraftUsername} maxLength={30} style={{color:c.ink,backgroundColor:c.surfaceAlt,borderRadius:13,padding:13,marginTop:9,marginBottom:17}}/><Label c={c} size={12} bold>Giới thiệu</Label><TextInput value={draftBio} onChangeText={setDraftBio} multiline maxLength={140} style={{color:c.ink,backgroundColor:c.surfaceAlt,borderRadius:13,padding:13,marginTop:9,marginBottom:17,minHeight:80}}/><Action c={c} label="Lưu thay đổi" onPress={async()=>{const name=draftUsername.trim()||'Bạn';if(serverReady){try{const result=await tutttApi.updateProfile(name,draftBio);setUsername(result.user.name);setBio(result.user.bio)}catch(error){Alert.alert('Không thể cập nhật hồ sơ',String(error));return}}else{setUsername(name);setBio(draftBio)}setModal(null)}}/></>}
 </ScrollView></KeyboardAvoidingView></Modal></SafeAreaView>
}
export default function App(){return <SafeAreaProvider><AppContent/></SafeAreaProvider>}

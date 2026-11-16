import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,Easing,Pressable,Text,View,useWindowDimensions} from 'react-native';
import {VideoTrack} from '@livekit/react-native';
import {Track} from 'livekit-client';
import type {Room as MediaRoom} from 'livekit-client';
import type {PKMatch} from '../services/api';
import type {Palette} from '../theme/tokens';
import {light} from '../theme/tokens';
import {PK_COLORS} from '../theme/pkColors';
import {pkMediaVisual} from './pkMediaEvidence';

const clock=(remaining:number)=>{const seconds=Math.max(0,Math.ceil(remaining/1000));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`};
const fmt=(n:number)=>Math.max(0,n).toLocaleString('vi-VN');

/** An unboxed, shared PK stage. Hosts are avatar placeholders until real cross-room media is integrated. */
export function PKDuelBoard({match,roomId,now,busy,stale=false,onCheer,palette,mediaRoom,hostId,liveStatus,activeSpeakerIds=[],roomType='voice'}: {match:PKMatch;roomId:string;now:number;busy:boolean;stale?:boolean;onCheer:()=>void;palette:Palette;mediaRoom?:MediaRoom|null;hostId?:string;liveStatus?:string;activeSpeakerIds?:string[];roomType?:'cam'|'voice'}){
 const isFinished=match.status==='finished';
 const ivory=palette.bg===light.bg;
 // Match room chrome to the selected palette; only the video tiles stay cinematic.
 const COLORS=ivory?{...PK_COLORS.light,stage:palette.bg}:{...PK_COLORS.dark,stage:palette.bg};
 const {height:viewportHeight}=useWindowDimensions();
 const [heartLit,setHeartLit]=useState(false);
 const heartFlash=useRef<ReturnType<typeof setTimeout>|null>(null);
 const triggerCheer=()=>{if(busy)return;setHeartLit(true);if(heartFlash.current)clearTimeout(heartFlash.current);heartFlash.current=setTimeout(()=>setHeartLit(false),380);onCheer();};
 useEffect(()=>()=>{if(heartFlash.current)clearTimeout(heartFlash.current);},[]);
 const enter=useRef(new Animated.Value(0)).current;
 useEffect(()=>{let mounted=true;AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(!mounted)return;if(reduced)enter.setValue(1);else Animated.timing(enter,{toValue:1,duration:390,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start()}).catch(()=>enter.setValue(1));return()=>{mounted=false;enter.stopAnimation()}},[enter]);
 const winScale=useRef(new Animated.Value(0)).current;
 useEffect(()=>{if(!isFinished)return;let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{
   if(!mounted)return;
   if(reduced)winScale.setValue(1);
   else Animated.timing(winScale,{toValue:1,duration:430,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  }).catch(()=>winScale.setValue(1));
  return()=>{mounted=false;winScale.stopAnimation()};
 },[winScale,isFinished]);
 const resultTag=(key:string,variant:'cam'|'voice'='voice')=>{
  if(!isFinished)return null;
  const isWin=match.winner===key;
  const isDraw=match.winner===null;
  const label=isWin?'WIN':isDraw?'DRAW':'LOSS';
  const wordColor=isWin?(variant==='voice'&&ivory?'#AD711F':'#F8D77E'):isDraw?(variant==='voice'&&ivory?'#795F50':'#F0DEC9'):(variant==='voice'&&ivory?'#72529D':'#F3EEFF');
  const wordShadow=isWin?'rgba(116,71,24,.38)':isDraw?'rgba(89,58,38,.16)':(variant==='voice'&&ivory?'rgba(255,255,255,.88)':'rgba(111,73,149,.5)');
  return <Animated.View pointerEvents="none" style={{flexDirection:'row',alignItems:'center',justifyContent:variant==='cam'?'flex-start':'center',gap:6,opacity:winScale.interpolate({inputRange:[0,.32,1],outputRange:[0,0,1]}),transform:[{translateY:winScale.interpolate({inputRange:[0,1],outputRange:[6,0]})}]}}>
   <Text accessibilityLabel={label} style={{color:wordColor,fontWeight:'900',fontSize:variant==='cam'?(isWin?22:17):(isWin?22:18),letterSpacing:variant==='cam'?1.1:.7,textShadowColor:wordShadow,textShadowOffset:{width:0,height:2},textShadowRadius:variant==='cam'?7:4}}>{label}</Text>
   {isWin&&typeof match.winStreak==='number'&&match.winStreak>0?<Animated.View style={{backgroundColor:'#EFC76A',paddingHorizontal:variant==='cam'?6:5,paddingVertical:variant==='cam'?4:3,borderRadius:12,borderWidth:1,borderColor:'rgba(255,251,240,.78)',opacity:winScale.interpolate({inputRange:[0,.69,1],outputRange:[0,0,1]}),transform:[{scale:winScale.interpolate({inputRange:[0,1],outputRange:[.85,1]})}]}}><Text style={{fontSize:variant==='cam'?11:10,fontWeight:'900',color:'#6D4420',fontVariant:['tabular-nums']}}>x{match.winStreak}</Text></Animated.View>:null}
  </Animated.View>;
 };
 const sideScale=(key:string)=>winScale.interpolate({inputRange:[0,1],outputRange:[1,match.winner===key?(roomType==='cam'?1.18:1.12):match.winner===null?1:(roomType==='cam'?.82:.89)]});
 const total=match.scoreA+match.scoreB;
 const share=total?Math.round(100*match.scoreA/total):50;
 // Only one short marker response on an actual lead reversal. Retain the last
 // decisive leader through a tie; neither a tie nor mount triggers a flourish.
 const leader=match.scoreA===match.scoreB?'tie':match.scoreA>match.scoreB?'A':'B';
 const lastDecidedLeader=useRef(leader);
 const markerPulse=useRef(new Animated.Value(1)).current;
 useEffect(()=>{
  if(leader==='tie'||isFinished)return;
  const previous=lastDecidedLeader.current;
  lastDecidedLeader.current=leader;
  if(previous==='tie'||previous===leader)return;
  let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{
   if(!mounted)return;
   markerPulse.stopAnimation();markerPulse.setValue(1);
   if(!reduced)Animated.sequence([
    Animated.timing(markerPulse,{toValue:1.22,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:true}),
    Animated.timing(markerPulse,{toValue:1,duration:270,easing:Easing.out(Easing.cubic),useNativeDriver:true})
   ]).start();
  }).catch(()=>markerPulse.setValue(1));
  return()=>{mounted=false;markerPulse.stopAnimation();markerPulse.setValue(1)};
 },[leader,isFinished,markerPulse]);
 // Score changes are uncommon relative to the room clock: only tween the bar when
 // server-confirmed scores change; never restart the entrance animation each second.
 const barProgress=useRef(new Animated.Value(share)).current;
 useEffect(()=>{let mounted=true;
  AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{
   if(!mounted)return;
   if(reduced){barProgress.stopAnimation();barProgress.setValue(share);return;}
   Animated.timing(barProgress,{toValue:share,duration:440,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();
  }).catch(()=>barProgress.setValue(share));
  return()=>{mounted=false;barProgress.stopAnimation()};
 },[barProgress,share]);
 const me=match.roomA.id===roomId?'A':'B';
 const label=match.scoreA===match.scoreB?'Hòa':match.scoreA>match.scoreB?'Phe A dẫn':'Phe B dẫn';
 // One score rail for Cam and Voice: two opposing warm materials, calibrated
 // percentages and a moving seam. It has no idle/looping animation.
 const scoreRail=(compact:boolean)=><View
  accessible accessibilityRole="progressbar"
  accessibilityValue={{min:0,max:100,now:share}}
  accessibilityLabel={`Thanh thế trận PK. Phe A ${fmt(match.scoreA)} điểm. Phe B ${fmt(match.scoreB)} điểm. ${label}.`}
  style={compact?{position:'absolute',top:5,left:9,right:9,zIndex:8}:{marginTop:1,marginHorizontal:5}}>
  {!compact?<View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:5,alignItems:'center'}}>
   <Text style={{color:COLORS.muted,fontWeight:'760',fontSize:9.5}}>● PHE A  <Text style={{color:COLORS.ink,fontSize:11,fontWeight:'860'}}>{fmt(match.scoreA)}</Text></Text>
   <Text style={{color:COLORS.muted,fontWeight:'760',fontSize:9.5}}><Text style={{color:COLORS.ink,fontSize:11,fontWeight:'860'}}>{fmt(match.scoreB)}</Text>  PHE B ●</Text>
  </View>:null}
  <View style={{height:compact?14:19,borderRadius:10,backgroundColor:ivory?'#D8B98C':COLORS.barB,borderWidth:1,borderColor:ivory?'#98735855':'#F4D8B044',overflow:'visible'}}>
   <Animated.View style={{height:'100%',width:barProgress.interpolate({inputRange:[0,100],outputRange:['0%','100%']}),backgroundColor:ivory?'#C35849':COLORS.barA,borderTopLeftRadius:9,borderBottomLeftRadius:9,borderTopRightRadius:3,borderBottomRightRadius:3,overflow:'hidden'}}>
    <View style={{height:4,backgroundColor:'#FFF0DC36',marginTop:1}}/>
   </Animated.View>
   <View pointerEvents="none" style={{position:'absolute',top:1,bottom:1,left:4,right:4,flexDirection:'row',justifyContent:'space-between'}}>
    {Array.from({length:15},(_,i)=><View key={i} style={{width:1,backgroundColor:'#FFF5E53C'}}/>)}
   </View>
   <Animated.View pointerEvents="none" style={{position:'absolute',top:-4,left:barProgress.interpolate({inputRange:[0,3,97,100],outputRange:['3%','3%','97%','97%']}),width:compact?20:22,height:compact?20:22,borderRadius:6,backgroundColor:'#53352F',borderWidth:2,borderColor:'#FFF1E1',alignItems:'center',justifyContent:'center',transform:[{translateX:compact?-10:-11},{rotate:'45deg'},{scale:markerPulse}]}}>
    <Text style={{fontSize:compact?11:12,fontWeight:'900',lineHeight:compact?14:15,color:'#FFF1E1',transform:[{rotate:'-45deg'}]}}>✦</Text>
   </Animated.View>
  </View>
  {!compact?<Text style={{textAlign:'center',fontSize:10,color:COLORS.muted,marginTop:7,fontWeight:'600'}}><Text style={{fontWeight:'800',color:COLORS.ink}}>{label}</Text>{match.scoreA===match.scoreB?' · Cùng số điểm':` · Cách biệt ${fmt(Math.abs(match.scoreA-match.scoreB))} điểm`}</Text>:null}
 </View>;

 // Only render publications from this device's joined LiveKit room.
 // The opposing PK room remains a placeholder until a cross-room media bridge exists.
 const connected=liveStatus==='connected' && !!mediaRoom;
 const ownHost=connected&&hostId?(mediaRoom?.localParticipant.identity===hostId?mediaRoom.localParticipant:mediaRoom?.remoteParticipants.get(hostId)):undefined;
 const ownMicPub=ownHost?.getTrackPublication(Track.Source.Microphone);
 const cameraPub=roomType==='cam'?ownHost?.getTrackPublication(Track.Source.Camera):undefined;
 const localMedia=pkMediaVisual({sameRoom:true,connected:!!connected,hostFound:!!ownHost,micTrack:!!ownMicPub?.track,micMuted:!!ownMicPub?.isMuted,activeSpeaker:Boolean(hostId&&activeSpeakerIds.includes(hostId)),cameraTrack:!!cameraPub?.track,cameraMuted:!!cameraPub?.isMuted});
 const speaking=localMedia.mic==='speaking';
 const videoReady=localMedia.camera;
 const sides=[
  {key:'A',host:match.roomA.host,score:match.scoreA,avatar:COLORS.sideAAvatar,avatarText:COLORS.sideAAvatarInk,accent:COLORS.sideAAccent},
  {key:'B',host:match.roomB.host,score:match.scoreB,avatar:COLORS.sideBAvatar,avatarText:COLORS.sideBAvatarInk,accent:COLORS.sideBAccent}
 ];
 // Camera PK is a real video-first broadcast surface: an empty camera tile is
 // never shown as a live stream. Only the joined room's own published host
 // camera is rendered; the opposing host awaits a consented media bridge.
 if(roomType==='cam')return <Animated.View accessibilityLabel={`PK giữa ${match.roomA.host} và ${match.roomB.host}. Phe A ${fmt(match.scoreA)} điểm. Phe B ${fmt(match.scoreB)} điểm. ${label}.`}
  style={{backgroundColor:COLORS.stage,overflow:'hidden',marginHorizontal:-16,opacity:enter.interpolate({inputRange:[0,1],outputRange:[.88,1]})}}>
   <View style={{height:55,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:13,backgroundColor:COLORS.stage}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{height:7,width:7,borderRadius:4,backgroundColor:COLORS.sideAAccent}}/><Text style={{color:COLORS.ink,fontSize:13,fontWeight:'800'}}>{isFinished?'PK đã kết thúc':'PK trực tiếp'}</Text></View>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
     <Text style={{color:COLORS.ink,fontSize:23,fontWeight:'900',fontVariant:['tabular-nums']}}>{isFinished?'00:00':clock(match.endsAt-now)}</Text>
     
    </View>
   </View>
   <View style={{height:Math.max(300,Math.min(440,Math.round(viewportHeight*.49))),flexDirection:'row',backgroundColor:ivory?'#B5A094':'#261C1E',overflow:'hidden'}}>
    {sides.map(side=>{
     const local=me===side.key;
     const showVideo=Boolean(local&&videoReady&&ownHost&&cameraPub);
     return <View key={side.key} style={{flex:1,position:'relative',overflow:'hidden',backgroundColor:ivory?(side.key==='A'?'#CAB7A8':'#DAC9B3'):(side.key==='A'?'#48353A':'#56443E'),borderRightWidth:side.key==='A'?1:0,borderColor:'#251B1C'}}>
      {showVideo?<VideoTrack trackRef={{participant:ownHost!,publication:cameraPub!,source:Track.Source.Camera} as any} style={{width:'100%',height:'100%'}}/>:
       <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12,paddingHorizontal:10}}>
        <View style={{width:67,height:67,borderRadius:34,backgroundColor:ivory?'#FFF7EE60':'#FFF2E512',borderWidth:1,borderColor:ivory?'#68483A38':'#FFF2E53B',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:29,color:ivory?'#523A35':'#FFEDE2'}}>▣</Text></View>
        <Text style={{fontSize:10,letterSpacing:.8,fontWeight:'750',color:ivory?'#523A35':'#FFEDE2',textAlign:'center'}}>{local?'CAMERA CHƯA PHÁT':'CHƯA GHÉP VIDEO'}</Text>
       </View>}
      <View pointerEvents="none" style={{position:'absolute',top:0,left:0,right:0,height:140,backgroundColor:ivory?'#3B292991':'#1911154B'}}/>
      <View pointerEvents="none" style={{position:'absolute',bottom:0,left:0,right:0,height:125,backgroundColor:ivory?'#2F2020B8':'#19111590'}}/>
      <View style={{position:'absolute',top:13,left:11,right:8}}>
       <Text style={{fontSize:11,color:'#F9E1D2',fontWeight:'700'}}>{local?'Phòng của bạn':'Đối thủ'}</Text>
       <Text style={{fontSize:30,color:'#FFF3E8',fontWeight:'900',letterSpacing:-1.2,fontVariant:['tabular-nums']}}>{fmt(side.score)}</Text>
       <Text style={{fontSize:10,color:'#FFF0E0CC'}}>Điểm cổ vũ</Text>
       {isFinished?<View pointerEvents="none" style={{marginTop:7,alignSelf:'flex-start',maxWidth:'100%'}}>{resultTag(side.key,'cam')}</View>:null}
      </View>
      <View style={{position:'absolute',bottom:20,left:10,right:8,flexDirection:'row',alignItems:'center',gap:7}}>
       <Animated.View style={{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:side.avatar,borderWidth:local&&speaking?2:0,borderColor:COLORS.speaking,transform:[{scale:sideScale(side.key)}]}}><Text style={{color:side.avatarText,fontSize:15,fontWeight:'900'}}>{side.host.slice(0,1).toLocaleUpperCase('vi-VN')}</Text></Animated.View>
       <View style={{minWidth:0,flex:1}}><Text style={{fontWeight:'800',color:'#FFF3E9',fontSize:12}} numberOfLines={1}>{side.host}</Text><Text numberOfLines={1} style={{fontSize:9,color:'#F2D6C8'}}>{local?showVideo?(speaking?'Đang nói':'Camera đã kết nối'):localMedia.label:'Chưa ghép media đối thủ'}</Text></View>
      </View>
     </View>;
    })}
    {scoreRail(true)}
   </View>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:11,paddingHorizontal:13,paddingVertical:12,backgroundColor:COLORS.stage}}>
    <Text style={{flex:1,color:COLORS.muted,fontSize:10,lineHeight:16}}>{stale?'Mất đồng bộ · Đang kết nối lại':'Điểm cổ vũ miễn phí · Chưa ghép video liên phòng · Không phải coin'}</Text>
    <Pressable disabled={busy} onPress={triggerCheer} accessibilityRole="button" accessibilityLabel={`Cổ vũ phe ${me}`} accessibilityHint="Chạm để gửi một lượt cổ vũ miễn phí, khi máy chủ xác nhận" style={({pressed})=>({minHeight:52,flexDirection:'row',alignItems:'center',gap:7,opacity:isFinished?0:busy?.55:1,transform:[{scale:pressed&&!busy?.97:1}]})}>{({pressed})=><><Text style={{color:'#FFFDF9',fontSize:29,lineHeight:30,textShadowColor:'rgba(18,8,10,.65)',textShadowOffset:{width:0,height:2},textShadowRadius:5}}>{pressed||heartLit?'♥':'♡'}</Text><Text style={{fontSize:12,color:COLORS.ink,fontWeight:'800'}}>Tiếp sức</Text></>}</Pressable>
   </View>
  </Animated.View>;
 return <Animated.View accessibilityLabel={`PK giữa ${match.roomA.host} và ${match.roomB.host}. Phe A ${fmt(match.scoreA)} điểm. Phe B ${fmt(match.scoreB)} điểm. ${label}.`}
  style={{backgroundColor:ivory?'#EDDACD':'#392B32',overflow:'hidden',paddingTop:10,paddingHorizontal:13,paddingBottom:11,marginBottom:0,opacity:enter.interpolate({inputRange:[0,1],outputRange:[0.88,1]}),transform:[{translateY:enter.interpolate({inputRange:[0,1],outputRange:[8,0]})}]}}>
   
   
   
   
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:7,flex:1}}>
     <View style={{height:6,width:6,borderRadius:3,backgroundColor:COLORS.sideAAccent}}/>
     <Text style={{fontSize:14,fontWeight:'900',color:COLORS.ink,letterSpacing:-0.4}}>{isFinished?'PK đã kết thúc':'PK trực tiếp'}</Text>{now-match.startedAt>=0&&now-match.startedAt<3000?<Text style={{color:COLORS.sideAAccent,fontSize:10,fontWeight:'700'}}>Vào trận!</Text>:null}
    </View>
    <Text style={{fontWeight:'900',color:COLORS.ink,fontSize:23,fontVariant:['tabular-nums'],letterSpacing:-.6}}>{isFinished?'00:00':clock(match.endsAt-now)}</Text>
    
   </View>
   <View style={{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:3,marginTop:1,marginBottom:8}}>
    <Text style={{fontSize:9,fontWeight:'800',letterSpacing:1.1,color:COLORS.muted}}>SO TÀI TRỰC TIẾP</Text>
    <Text style={{fontSize:9,fontWeight:'800',letterSpacing:.7,color:COLORS.muted}}>VOICE BATTLE  ✦</Text>
   </View>
   <View style={{position:'relative',flexDirection:'row',alignItems:'stretch',minHeight:196,backgroundColor:ivory?'#EBD7C9':'#4D3B3B',borderColor:ivory?'#BD98863B':'#E9C8A52D',borderWidth:1,borderRadius:23,overflow:'hidden'}}>
    {sides.map(side=><View key={side.key} style={{flex:1,alignItems:'center',justifyContent:'space-between',paddingHorizontal:5,paddingTop:9,paddingBottom:7,minWidth:0,backgroundColor:side.key==='A'?(ivory?'#F0D7CD':'#523C40'):(ivory?'#EFDDC2':'#52443E'),borderRightWidth:side.key==='A'?1:0,borderColor:ivory?'#B9918028':'#E5CC9A22'}}>
      <View style={{borderRadius:99,backgroundColor:'transparent',borderColor:'transparent',borderWidth:0,paddingHorizontal:8,paddingVertical:4,marginBottom:4}}><Text style={{fontSize:9,fontWeight:'800',color:side.accent}}>{me===side.key?'PHE CỦA BẠN':'PHE ĐỐI THỦ'}</Text></View>
      <Animated.View style={{width:80,height:80,alignItems:'center',justifyContent:'center',transform:[{scale:sideScale(side.key)}]}}>
       <View style={{width:76,height:76,borderRadius:38,alignItems:'center',justifyContent:'center',borderWidth:speaking&&me===side.key?3:2,borderColor:speaking&&me===side.key?COLORS.speaking:side.accent+'60',overflow:'hidden'}}>
        <View style={{width:64,height:64,borderRadius:32,backgroundColor:side.avatar,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',fontSize:29,color:side.avatarText}}>{side.host.slice(0,1).toLocaleUpperCase('vi-VN')}</Text></View>
       </View>
       <View pointerEvents="none" style={{position:'absolute',right:-1,bottom:0,width:23,height:23,borderRadius:12,backgroundColor:ivory?'#FFF4E8':'#E6D0BC',borderColor:ivory?'#E7CCB8':'#56433E',borderWidth:1,alignItems:'center',justifyContent:'center'}}>
        <View style={{width:5,height:9,borderRadius:3,backgroundColor:side.accent,marginBottom:2}}/>
        <View style={{position:'absolute',bottom:3,width:12,height:7,borderBottomLeftRadius:6,borderBottomRightRadius:6,borderColor:side.accent,borderWidth:1.5,borderTopWidth:0}}/>
        {me!==side.key?<Text style={{position:'absolute',fontSize:14,fontWeight:'900',color:side.accent}}>?</Text>:null}
        {me===side.key&&localMedia.mic!=='speaking'&&localMedia.mic!=='ready'?<View style={{position:'absolute',width:19,height:2,backgroundColor:ivory?'#8D4E40':'#6D3A35',transform:[{rotate:'-45deg'}]}}/>:null}
       </View>
      </Animated.View>
      <Text accessibilityLiveRegion="polite" style={{fontSize:9,color:speaking&&me===side.key?COLORS.speaking:COLORS.muted,marginTop:3,textAlign:'center'}} numberOfLines={1}>{me!==side.key?'Chưa kết nối âm thanh':localMedia.label}</Text>
      <Text numberOfLines={1} style={{fontSize:14,fontWeight:'900',color:COLORS.ink,maxWidth:'100%',marginTop:4,letterSpacing:-.35}}>{side.host}</Text>
      <Text style={{fontSize:10,color:COLORS.muted,marginTop:1}}>Chủ phòng</Text>
      <View pointerEvents="none" style={{height:34,minHeight:34,width:'100%',marginTop:'auto',alignItems:'center',justifyContent:'center'}}>
       {isFinished?resultTag(side.key,'voice'):null}
      </View>
     </View>)}
    <View pointerEvents="none" style={{position:'absolute',left:'50%',top:78,marginLeft:-20,width:40,height:34,borderWidth:2,borderColor:ivory?'#FAECDD':'#E5C9A6',borderRadius:12,backgroundColor:ivory?'#613F36':'#603B38',alignItems:'center',justifyContent:'center'}}><Text style={{color:'#FFF0E1',fontSize:16,fontWeight:'900'}}>VS</Text></View>
   </View>
   <View style={{marginTop:8}}>{scoreRail(false)}</View>
   <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:9}}>
    <Text style={{flex:1,color:COLORS.muted,fontSize:11,lineHeight:16}}>{stale?'Đang mất đồng bộ điểm. Chờ máy chủ xác nhận.':'Chưa ghép media PK liên phòng · Điểm miễn phí · Không phải coin'}</Text>
    <Pressable disabled={busy||isFinished} accessibilityRole="button" accessibilityLabel={`Cổ vũ phe ${me}`} accessibilityHint="Chạm để gửi một lượt cổ vũ miễn phí, khi máy chủ xác nhận" onPress={triggerCheer}
     style={({pressed})=>({minHeight:46,paddingLeft:0,paddingRight:0,backgroundColor:'transparent',borderRadius:0,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7,opacity:isFinished?0:busy?.55:1,transform:[{scale:pressed&&!busy?.97:1}]})}>
     {({pressed})=><><Text style={{color:'#FFFDF9',fontSize:30,lineHeight:30,textShadowColor:'rgba(18,8,10,.65)',textShadowOffset:{width:0,height:2},textShadowRadius:5}}>{pressed||heartLit?'♥':'♡'}</Text><Text style={{color:COLORS.ink,fontWeight:'800',fontSize:12}}>{stale?'Chờ kết nối':'Tiếp sức'}</Text></>}
    </Pressable>
   </View>
  </Animated.View>;
}

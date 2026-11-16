import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Modal,Pressable,ScrollView,Text,View,Alert} from 'react-native';
import {pkApi,PKSnapshot} from '../services/api';
import type {Room as MediaRoom} from 'livekit-client';
import type {PKMatch} from '../services/api';
import type {Palette} from '../theme/tokens';
import {PKDuelBoard} from './PKDuelBoard';
import {PK_COLORS} from '../theme/pkColors';
import {light} from '../theme/tokens';

export function PKPanel({roomId,c,enabled,onActiveChange,mediaRoom,hostId,liveStatus,activeSpeakerIds=[],roomType='voice',optionsOpenRequest=0}:{roomId:string;c:Palette;enabled:boolean;onActiveChange?:(active:boolean)=>void;mediaRoom?:MediaRoom|null;hostId?:string;liveStatus?:string;activeSpeakerIds?:string[];roomType?:'cam'|'voice';optionsOpenRequest?:number}){
 const rub=c.coral;
 const matchTheme=c.bg===light.bg?PK_COLORS.light:PK_COLORS.dark;
 const [pk,setPk]=useState<PKSnapshot|null>(null);
 const [finished,setFinished]=useState<PKMatch|null>(null);
 const lastActiveId=useRef<string|null>(null);
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(optionsOpenRequest>0)setOpen(true)},[optionsOpenRequest]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [now,setNow]=useState(Date.now());
 const [lastSync,setLastSync]=useState(0);
 const requestSeq=useRef(0);
 const isStale=Boolean(pk?.match) && (lastSync===0 || now-lastSync>15000 || Boolean(error));
 const reload=useCallback(async()=>{if(!enabled)return;const seq=++requestSeq.current;try{
  const result=await pkApi.snapshot(roomId);
  if(seq!==requestSeq.current)return;
  setLastSync(Date.now());
  if(result.match){lastActiveId.current=result.match.id;setFinished(null)}
  else if(lastActiveId.current){
   const confirmed=result.recent.find(x=>x.id===lastActiveId.current&&x.status==='finished');
   if(confirmed)setFinished(confirmed);
   lastActiveId.current=null;
  }
  setPk(result);setError('');
 }catch(e){if(seq!==requestSeq.current)return;setError(e instanceof Error?e.message:'Không tải được PK')}},[roomId,enabled]);
 useEffect(()=>{requestSeq.current++;setPk(null);setFinished(null);setLastSync(0);setError('');lastActiveId.current=null;if(!enabled)return;void reload();const interval=setInterval(()=>void reload(),5000);return()=>{requestSeq.current++;clearInterval(interval)}},[enabled,reload]);
 useEffect(()=>{if(!enabled)return;const tick=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(tick)},[enabled]);
 const act=async(fn:()=>Promise<unknown>)=>{if(busy||isStale)return;setBusy(true);try{await fn();await reload()}catch(e){Alert.alert('Không thể thực hiện PK',e instanceof Error?e.message:'Thử lại sau')}finally{setBusy(false)}};
 useEffect(()=>{if(!finished)return;const timeout=setTimeout(()=>setFinished(null),3200);return()=>clearTimeout(timeout)},[finished?.id]);
 const m=pk?.match;
 const pkActive=Boolean(m||finished);
 useEffect(()=>{onActiveChange?.(pkActive)},[pkActive,onActiveChange]);
 return <>
  {!m&&!finished?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
   <Pressable onPress={()=>setOpen(true)} accessibilityRole="button" accessibilityLabel="Mở PK hai phòng" style={({pressed})=>({minWidth:87,minHeight:42,borderRadius:22,backgroundColor:matchTheme.launcherBg,alignItems:'center',justifyContent:'center',paddingHorizontal:15,transform:[{scale:pressed?.96:1}]})}>
    <Text style={{color:matchTheme.launcherInk,fontSize:12,fontWeight:'800'}}>✦  PK</Text>
   </Pressable>
   {pk?.invites?.length?<Text style={{color:c.coral,fontSize:11,fontWeight:'700'}}>Có lời mời PK</Text>:null}
  </View>:null}
  {m?<PKDuelBoard match={m} roomId={roomId} now={now} busy={busy||isStale} stale={isStale} palette={c} mediaRoom={mediaRoom} hostId={hostId} liveStatus={liveStatus} activeSpeakerIds={activeSpeakerIds} roomType={roomType} onCheer={()=>void act(()=>pkApi.cheer(roomId,m.id))}/>:null}
  {!m&&finished?<PKDuelBoard key={'finish-'+finished.id} match={finished} roomId={roomId} now={now} busy={true} stale={false} palette={c} mediaRoom={mediaRoom} hostId={hostId} liveStatus={liveStatus} activeSpeakerIds={activeSpeakerIds} roomType={roomType} onCheer={()=>{}}/>:null}
  <Modal transparent visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}>
   <View style={{flex:1,backgroundColor:'#1B1112A8',justifyContent:'flex-end'}}>
    <Pressable onPress={()=>setOpen(false)} style={{flex:1}} accessibilityLabel="Đóng"/>
    <View style={{backgroundColor:c.bg,borderTopLeftRadius:29,borderTopRightRadius:29,padding:20,maxHeight:'78%'}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Text style={{fontSize:20,fontWeight:'900',color:c.ink}}>⚡ PK hai phòng</Text><Pressable accessibilityLabel="Đóng PK" onPress={()=>setOpen(false)} style={{padding:10}}><Text style={{color:c.ink,fontSize:20}}>×</Text></Pressable></View>
     <Text style={{color:c.muted,fontSize:12,lineHeight:19,marginBottom:14}}>Chủ phòng mời đấu, đối phương xác nhận. Điểm cổ vũ miễn phí được xác minh tại máy chủ. Chưa ghép hình/âm thanh hai phòng.</Text>
     <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight:390}}>
      {!enabled?<Text style={{color:c.muted}}>Chưa kết nối backend, không thể bắt đầu PK.</Text>:null}
      {busy?<ActivityIndicator color={rub}/>:null}
      {error?<Text accessibilityRole="alert" style={{color:rub,fontSize:12}}>Mất đồng bộ PK: {error}</Text>:null}
      {pk?.invites.map(inv=>{const incoming=inv.roomB===roomId;return <View key={inv.id} style={{padding:13,borderRadius:16,backgroundColor:c.surface,marginVertical:5}}>
       <Text style={{fontWeight:'800',color:c.ink}}>{incoming?`Lời mời từ ${inv.from}`:`Đang mời ${inv.to}`}</Text>
       <Text style={{color:c.muted,fontSize:11,marginTop:4}}>{inv.durationSeconds/60} phút · Hết hạn sau 60 giây</Text>
       <View style={{flexDirection:'row',gap:12,marginTop:12,alignItems:'center'}}>{incoming?<><Pressable disabled={busy} onPress={()=>void act(()=>pkApi.respond(roomId,inv.id,false))} style={{minHeight:44,minWidth:82,paddingHorizontal:12,alignItems:'center',justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:c.line}}><Text style={{color:c.ink}}>Từ chối</Text></Pressable><Pressable disabled={busy} onPress={()=>void act(()=>pkApi.respond(roomId,inv.id,true))} style={{minHeight:44,minWidth:105,paddingHorizontal:12,alignItems:'center',justifyContent:'center',backgroundColor:rub,borderRadius:14}}><Text style={{color:'#FFF'}}>Chấp nhận</Text></Pressable></>:<Pressable disabled={busy} onPress={()=>void act(()=>pkApi.cancel(roomId,inv.id))} style={{minHeight:44,paddingHorizontal:12,justifyContent:'center',borderRadius:14,borderWidth:1,borderColor:c.line}}><Text style={{color:rub}}>Hủy lời mời</Text></Pressable>}</View>
      </View>})}
      {pk?.host&&!m&&!pk.invites.length?<><Text style={{color:c.ink,fontSize:13,fontWeight:'800',marginVertical:8}}>Mời phòng cùng loại đang online</Text>{pk.available.map(t=><Pressable key={t.id} disabled={busy} onPress={()=>void act(()=>pkApi.invite(roomId,t.id))} style={{paddingVertical:12,borderBottomWidth:1,borderColor:c.line}}><Text style={{fontWeight:'800',color:c.ink}}>{t.host}</Text><Text style={{fontSize:12,color:c.muted}}>{t.title} · Mời PK 3 phút</Text></Pressable>)}{!pk.available.length?<Text style={{color:c.muted,fontSize:12,marginVertical:10}}>Chưa có chủ phòng phù hợp đang online.</Text>:null}</>:null}
      {pk?.host&&m?<Pressable disabled={busy} onPress={()=>Alert.alert('Bỏ cuộc PK?','Phòng đối thủ sẽ thắng trận này.',[{text:'Hủy',style:'cancel'},{text:'Kết thúc',style:'destructive',onPress:()=>void act(()=>pkApi.end(roomId,m.id))}])} style={{minHeight:44,paddingHorizontal:12,justifyContent:'center',alignSelf:'flex-start'}}><Text style={{color:rub,fontSize:12}}>Kết thúc PK (bỏ cuộc)</Text></Pressable>:null}
      {pk?.recent[0]?<Text style={{fontSize:12,color:c.muted,marginTop:15}}>Trận trước: {pk.recent[0].scoreA} – {pk.recent[0].scoreB} · {pk.recent[0].winner===null?'Hòa':pk.recent[0].winner==='A'?pk.recent[0].roomA.host:pk.recent[0].roomB.host} thắng</Text>:null}
     </ScrollView>
    </View>
   </View>
  </Modal>
 </>;
}

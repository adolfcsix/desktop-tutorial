import React,{memo,useMemo} from 'react';
import {SectionList,Text,View} from 'react-native';
import type {Palette} from '../theme/tokens';
import type {AudienceMember,RoomAudience} from '../services/api';

type Props={c:Palette;audience:RoomAudience|null;realChat:boolean;issue:boolean;host:string};
const MemberRow=memo(function MemberRow({member,selfId,c}:{member:AudienceMember;selfId:string;c:Palette}){
 return <View style={{minHeight:56,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:1,borderBottomColor:c.line+'68'}}>
  <View style={{height:36,width:36,borderRadius:18,backgroundColor:c.surfaceAlt,alignItems:'center',justifyContent:'center'}}>
   <Text style={{fontSize:14,fontWeight:'800',color:c.ink}}>{(member.name||'?').slice(0,1).toLocaleUpperCase('vi-VN')}</Text>
  </View>
  <View style={{flex:1,minWidth:0}}>
   <Text numberOfLines={1} style={{fontSize:13,fontWeight:'800',color:c.ink}}>{member.name}{member.id===selfId?' (Bạn)':''}</Text>
   <Text style={{fontSize:11,color:c.muted,marginTop:2}}>{member.role==='host'?'Chủ phòng':member.role==='moderator'?'Phó phòng':member.onStage?'Trên sân khấu':'Người xem'}</Text>
  </View>
 </View>;
});
/** Virtualized member sheet: two logical groups, without mounting every avatar at once. */
export function AudienceMemberList({c,audience,realChat,issue,host}:Props){
 const sections=useMemo(()=>{
  if(!audience)return [];
  return [
   {title:'Trên sân khấu',data:audience.members.filter(m=>m.onStage)},
   {title:'Đang xem',data:audience.members.filter(m=>!m.onStage)},
  ];
 },[audience]);
 return <SectionList
  sections={sections}
  keyExtractor={m=>m.id}
  initialNumToRender={10}
  maxToRenderPerBatch={12}
  windowSize={5}
  stickySectionHeadersEnabled
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{paddingBottom:12,paddingHorizontal:2}}
  keyboardShouldPersistTaps="handled"
  ListHeaderComponent={<Text style={{color:c.muted,fontSize:11,marginBottom:12,lineHeight:17}}>{realChat?(audience?'Đã đồng bộ từ máy chủ · gồm cả người chỉ xem, không bật mic/camera.':'Đang đồng bộ danh sách người xem. Số liệu trước đó không được coi là đang trực tuyến.'):'Bản xem trước. Số người là dữ liệu minh họa, chưa phải danh sách trực tuyến.'}</Text>}
  ListEmptyComponent={<Text style={{color:c.muted,fontSize:12,lineHeight:18,paddingVertical:12}}>{!realChat?`Chủ phòng: ${host} (minh họa). Kết nối máy chủ để xem thành viên thật.`:issue?'Chưa xác minh được danh sách. Đóng rồi mở lại để thử lại.':'Đang đồng bộ danh sách từ máy chủ…'}</Text>}
  renderSectionHeader={({section})=><View style={{backgroundColor:c.surface,paddingVertical:9,flexDirection:'row',justifyContent:'space-between'}}>
   <Text style={{fontSize:12,fontWeight:'800',color:c.ink}}>{section.title}</Text>
   <Text style={{fontSize:11,fontWeight:'700',color:c.muted}}>{section.data.length}</Text>
  </View>}
  renderItem={({item})=><MemberRow member={item} selfId={audience?.selfId||''} c={c}/>}
  renderSectionFooter={({section})=>section.data.length===0?<Text style={{color:c.muted,fontSize:11,paddingVertical:10}}>{section.title==='Trên sân khấu'?'Chưa có ai trên sân khấu.':'Chưa có người xem khác.'}</Text>:null}
 />;
}

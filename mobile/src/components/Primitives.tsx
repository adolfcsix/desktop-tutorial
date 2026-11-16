import React from 'react';
import {Image,Pressable,StyleSheet,Text,TextInput,View,ScrollView} from 'react-native';
import type {Palette} from '../theme/tokens';
export function Label({children,c,size=15,bold=false,style}: {children:React.ReactNode;c:Palette;size?:number;bold?:boolean;style?:object}){
 return <Text style={[{color:c.ink,fontSize:size,fontWeight:bold?'700':'400',lineHeight:size*1.42},style]}>{children}</Text>;
}
export function Avatar({label,accent,size=47}:{label:string;accent:string;size?:number}){
 return <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:accent,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#2D1D1C',fontWeight:'900',fontSize:size*.3}}>{label}</Text></View>
}
export function Pill({label,onPress,selected,c}:{label:string;onPress:()=>void;selected:boolean;c:Palette}){
 return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{selected}} style={({pressed})=>({borderWidth:1,borderColor:selected?c.violet:c.line,backgroundColor:selected?c.surfaceAlt:c.surface,paddingHorizontal:15,minHeight:44,justifyContent:'center',paddingVertical:10,borderRadius:13,marginRight:8,opacity:pressed?0.8:1})}><Label c={c} bold size={13}>{label}</Label></Pressable>
}
export function Action({label,onPress,c,outline=false,style}:{label:string;onPress:()=>void;c:Palette;outline?:boolean;style?:object}){
 return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[{backgroundColor:outline?c.surface:c.lavender,borderWidth:outline?1:0,borderColor:c.line,borderRadius:15,padding:13,minHeight:46,alignItems:'center',justifyContent:'center',opacity:pressed?0.82:1},style]}><Text style={{color:outline?c.ink:c.onAccent,fontWeight:'700',fontSize:14}}>{label}</Text></Pressable>
}
export function Search({placeholder,value,onChange,c}:{placeholder:string;value:string;onChange:(v:string)=>void;c:Palette}){
 return <View style={{backgroundColor:c.surface,borderWidth:1,borderColor:c.line,borderRadius:16,flexDirection:'row',alignItems:'center',paddingHorizontal:14,minHeight:48,marginVertical:12}}><Text style={{color:c.muted,fontSize:17,marginRight:9}}>⌕</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.muted} style={{color:c.ink,flex:1,fontSize:16,minHeight:46}} autoCapitalize="none" /></View>
}
export function Header({c}:{c:Palette}){
 return <View style={{paddingHorizontal:18,paddingTop:3,paddingBottom:4,backgroundColor:c.bg,flexDirection:'row',alignItems:'center'}}>
  <View accessible accessibilityLabel="Logo Túttt" style={{flexDirection:'row',alignItems:'center'}}>
   <Image source={require('../../assets/tuttt-logo.png')} resizeMode="contain" style={{width:138,height:80}} />
  </View>
 </View>;
}
/** Platform-neutral vector-like tab symbols, drawn with native views.
 * Avoid font-dependent Unicode glyphs that render differently on iOS/Android. */
export function TabGlyph({name,color}:{name:string;color:string}){
 const stroke={borderColor:color,borderWidth:2};
 const frame={width:24,height:24,alignItems:'center' as const,justifyContent:'center' as const};
 if(name==='create')return <Text style={{fontSize:27,fontWeight:'500',lineHeight:32,color}}>+</Text>;
 if(name==='discover')return <View style={frame} accessible={false}>
  <View style={{width:21,height:21,borderRadius:11,...stroke,alignItems:'center',justifyContent:'center'}}>
   <View style={{width:7,height:7,transform:[{rotate:'45deg'}],borderWidth:1.6,borderColor:color,borderRadius:1}}/>
  </View></View>;
 if(name==='live')return <View style={frame} accessible={false}>
  <View style={{width:19,height:17,borderTopWidth:2,borderLeftWidth:2,borderRightWidth:2,borderColor:color,borderTopLeftRadius:12,borderTopRightRadius:12,position:'absolute',top:3}}/>
  <View style={{position:'absolute',left:2,top:12,width:5,height:9,borderRadius:3,backgroundColor:color}}/>
  <View style={{position:'absolute',right:2,top:12,width:5,height:9,borderRadius:3,backgroundColor:color}}/>
 </View>;
 if(name==='chat')return <View style={frame} accessible={false}>
  <View style={{width:21,height:17,borderRadius:6,...stroke,position:'absolute',top:2}}/>
  <View style={{position:'absolute',width:7,height:7,borderLeftWidth:2,borderBottomWidth:2,borderColor:color,bottom:2,left:6,transform:[{rotate:'-34deg'}]}}/>
 </View>;
 return <View style={frame} accessible={false}>
  <View style={{width:9,height:9,borderRadius:5,...stroke,position:'absolute',top:1}}/>
  <View style={{width:21,height:11,borderTopLeftRadius:11,borderTopRightRadius:11,borderTopWidth:2,borderLeftWidth:2,borderRightWidth:2,borderColor:color,position:'absolute',bottom:1}}/>
 </View>;
}
export function BottomTabs({tab,onSelect,c}:{tab:string;onSelect:(x:string)=>void;c:Palette}){
 const items:[string,string][]=[['discover','Khám phá'],['live','Live'],['create','Tạo'],['chat','Chat'],['profile','Cá nhân']];
 return <View style={{minHeight:76,borderTopWidth:1,borderColor:c.line,flexDirection:'row',paddingHorizontal:7,backgroundColor:c.surface}}>{items.map(([id,label])=><Pressable key={id} onPress={()=>onSelect(id)} style={({pressed})=>({flex:1,minHeight:56,alignItems:'center',justifyContent:'center',gap:3,borderRadius:14,backgroundColor:tab===id&&id!=='create'?c.surfaceAlt:pressed?c.surfaceAlt:'transparent',opacity:pressed?.82:1})} accessibilityLabel={label} accessibilityRole="tab" accessibilityState={{selected:tab===id}}><View style={id==='create'?{backgroundColor:c.lavender,width:45,height:45,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:-15}:undefined}><TabGlyph name={id} color={id==='create'?c.onAccent:tab===id?c.lavender:c.muted}/></View><Text style={{fontSize:11,fontWeight:'700',color:tab===id?c.lavender:c.muted}}>{label}</Text></Pressable>)}</View>
}
export function Screen({children,c,scroll=true}:{children:React.ReactNode;c:Palette;scroll?:boolean}){
 return scroll?<ScrollView keyboardShouldPersistTaps="handled" style={{flex:1,backgroundColor:c.bg}} contentContainerStyle={{paddingHorizontal:22,paddingBottom:24}}>{children}</ScrollView>:<View style={{flex:1,backgroundColor:c.bg,paddingHorizontal:22}}>{children}</View>
}
export function SectionTitle({title,right,onPress,c}:{title:string;right?:string;onPress?:()=>void;c:Palette}){
 return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:24,marginBottom:12}}><Label c={c} size={17} bold>{title}</Label>{right&&onPress?<Pressable accessibilityRole="button" accessibilityLabel={right} onPress={onPress} style={{minHeight:44,justifyContent:'center',paddingHorizontal:4}}><Label c={c} size={11} style={{color:c.lavender}}>{right} ↗</Label></Pressable>:null}</View>
}
export const uiStyles=StyleSheet.create({h1:{fontSize:28,fontWeight:'800',letterSpacing:-1.25,marginTop:5},section:{marginTop:12},muted:{fontSize:12,marginTop:5,marginBottom:16},formField:{padding:14,borderRadius:13,borderWidth:1,marginTop:8,fontSize:14},card:{borderRadius:20,padding:12,marginBottom:12,flexDirection:'row',alignItems:'center',gap:12}});

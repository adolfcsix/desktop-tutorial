import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {initialLive,LiveVoice} from './LiveVoice';
import type {LiveState} from './LiveVoice';
export function useLiveVoice(){
 const [state,setState]=useState<LiveState>({...initialLive});
 const ref=useRef<LiveVoice|null>(null);
 if(!ref.current)ref.current=new LiveVoice(setState);
 useEffect(()=>{
  let previous=AppState.currentState;
  const subscription=AppState.addEventListener('change',next=>{
   if(next!==previous)void ref.current?.onAppStateChange(next==='active'?'active':next==='inactive'?'inactive':'background');
   previous=next;
  });
  return()=>{subscription.remove();void ref.current?.disconnect();};
 },[]);
 return {state,voice:ref.current};
}

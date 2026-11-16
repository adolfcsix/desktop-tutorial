'use strict';
// Same-origin API, session cookie is HttpOnly (never read by browser JS).
window.TutttNetwork=(()=>{
  async function api(path, method='GET', payload){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
    const response=await fetch('/api'+path,{method,signal:controller.signal,credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});
    let data;try{data=await response.json()}catch{throw new Error('Không nhận được phản hồi JSON');}
    if(!response.ok){const error=new Error(data.error||'Không thể kết nối máy chủ');error.status=response.status;throw error;}return data;
    }catch(error){if(error.name==='AbortError')throw new Error('Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối và thử lại.');throw error;}
    finally{clearTimeout(timer);}
  }
  async function session(){try{return await api('/me')}catch(error){if(error.status!==401)throw error;return await api('/session','POST',{name:'Khách'})}}
  const rooms=()=>api('/rooms');
  const createRoom=(obj)=>api('/rooms','POST',obj);
  const join=(id)=>api('/rooms/'+encodeURIComponent(id)+'/join','POST');
  const leave=(id)=>api('/rooms/'+encodeURIComponent(id)+'/leave','POST');
  const messages=(id)=>api('/rooms/'+encodeURIComponent(id)+'/messages');
  const audience=(id)=>api('/rooms/'+encodeURIComponent(id)+'/audience');
  const send=(id,text)=>api('/rooms/'+encodeURIComponent(id)+'/messages','POST',{text});
  const liveToken=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live/token','POST');
  const liveRoster=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live');
  const liveHeartbeat=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live/heartbeat','POST');
  const liveRequest=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live/seat-request','POST');
  const liveApprove=(id,userId,enabled)=>api('/rooms/'+encodeURIComponent(id)+'/live/seat','POST',{userId,enabled});
  const liveSeatLeave=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live/seat-leave','POST');
  const liveModerate=(id,userId,action,minutes)=>api('/rooms/'+encodeURIComponent(id)+'/live/moderate','POST',{userId,action,...(minutes?{minutes}:{})});
  const liveSettings=(id,setting)=>api('/rooms/'+encodeURIComponent(id)+'/live/settings','POST',setting);
  const liveInvite=(id,userId)=>api('/rooms/'+encodeURIComponent(id)+'/live/invite','POST',{userId});
  const liveInviteRespond=(id,invitationId,accept)=>api('/rooms/'+encodeURIComponent(id)+'/live/invite-respond','POST',{invitationId,accept});
  const liveInviteCancel=(id,invitationId)=>api('/rooms/'+encodeURIComponent(id)+'/live/invite-cancel','POST',{invitationId});
  const liveLeave=(id)=>api('/rooms/'+encodeURIComponent(id)+'/live/leave','POST');
  const pkSnapshot=(id)=>api('/rooms/'+encodeURIComponent(id)+'/pk');
  const pkInvite=(id,opponentRoomId,durationSeconds)=>api('/rooms/'+encodeURIComponent(id)+'/pk/invite','POST',{opponentRoomId,durationSeconds});
  const pkRespond=(id,invitationId,accept)=>api('/rooms/'+encodeURIComponent(id)+'/pk/respond','POST',{invitationId,accept});
  const pkCancel=(id,invitationId)=>api('/rooms/'+encodeURIComponent(id)+'/pk/cancel','POST',{invitationId});
  const pkCheer=(id,matchId)=>api('/rooms/'+encodeURIComponent(id)+'/pk/cheer','POST',{matchId});
  const pkEnd=(id,matchId)=>api('/rooms/'+encodeURIComponent(id)+'/pk/end','POST',{matchId});
  const profile=(name,bio)=>api('/me','PATCH',{name,bio});
  const report=(roomId,reason)=>api('/reports','POST',{roomId,reason});
  return {api,session,rooms,createRoom,join,leave,messages,audience,send,profile,report,liveToken,liveRoster,liveHeartbeat,liveRequest,liveApprove,liveSeatLeave,liveModerate,liveSettings,liveInvite,liveInviteRespond,liveInviteCancel,liveLeave,pkSnapshot,pkInvite,pkRespond,pkCancel,pkCheer,pkEnd};
})();

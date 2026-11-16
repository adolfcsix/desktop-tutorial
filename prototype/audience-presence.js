'use strict';
// Only a fresh, successful snapshot can be called a current audience. The
// stream is a control signal; it must not be mistaken for audio connectivity.
window.TutttAudiencePresence=(()=>{
 const MAX_AGE_MS=45000;
 function current({connected,online,roomId,snapshot,failed,updatedAt,now=Date.now()}){
  return Boolean(connected&&online&&!failed&&snapshot?.roomId===roomId&&
   Number.isFinite(updatedAt)&&updatedAt>0&&now>=updatedAt&&now-updatedAt<=MAX_AGE_MS&&
   Array.isArray(snapshot.members)&&Number.isInteger(snapshot.count)&&snapshot.count===snapshot.members.length);
 }
 function view(options){
  if(!options.connected)return {verified:false,count:options.demoCount,status:'demo',message:'BẢN XEM TRƯỚC · Danh sách minh họa, không phải người đang online.'};
  if(current(options))return {verified:true,count:options.snapshot.count,status:'current',message:`${options.snapshot.count} người đang ở trong phòng · dữ liệu mới xác nhận từ máy chủ.`};
  return {verified:false,count:'…',status:!options.online?'reconnecting':options.failed?'unavailable':'syncing',message:!options.online?'Mất kết nối cập nhật phòng · đang đồng bộ lại danh sách người xem.':options.failed?'Chưa xác minh được người đang xem. Đóng rồi mở lại để thử lại.':'Đang xác minh danh sách người trong phòng…'};
 }
 return {current,view,MAX_AGE_MS};
})();

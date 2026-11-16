/** LiveKit connection-state language. It describes signalling, never verified audio output.
 * Speaker/Bluetooth routes and audible remote sound require a real-device check. */
import type {VoiceStatus} from './LiveVoice';
export type LiveNoticeTone='normal'|'warning'|'error';
export type LiveConnectionNotice={label:string;shortLabel:string;tone:LiveNoticeTone;mediaActionsDisabled:boolean};
export function liveConnectionNotice(status:VoiceStatus,mic:boolean,error:string|null):LiveConnectionNotice{
 switch(status){
  case 'connected':return {label:`Đã vào phòng LiveKit · Mic ${mic?'đang bật':'đang tắt'} · Chưa xác minh đường loa/tai nghe`,shortLabel:'LIVE',tone:'normal',mediaActionsDisabled:false};
  case 'connecting':return {label:'Đang kết nối tín hiệu LiveKit · Chưa truyền âm thanh',shortLabel:'ĐANG VÀO',tone:'warning',mediaActionsDisabled:true};
  case 'reconnecting':return {label:'Tín hiệu gián đoạn · Đang kết nối lại. Mic và camera tạm khóa thao tác; không tự bật lại.',shortLabel:'ĐANG NỐI',tone:'warning',mediaActionsDisabled:true};
  case 'not-configured':return {label:'Chưa cấu hình máy chủ LiveKit · Có thể tiếp tục chat chữ.',shortLabel:'CHƯA CẤU HÌNH',tone:'error',mediaActionsDisabled:true};
  case 'error':return {label:error?'Âm thanh chưa kết nối · '+error:'Âm thanh chưa kết nối · Hãy vào lại phòng.',shortLabel:'MẤT KẾT NỐI',tone:'error',mediaActionsDisabled:true};
  default:return {label:'Chưa vào phiên âm thanh · Chat chữ vẫn có thể dùng.',shortLabel:'CHƯA KẾT NỐI',tone:'normal',mediaActionsDisabled:true};
 }
}

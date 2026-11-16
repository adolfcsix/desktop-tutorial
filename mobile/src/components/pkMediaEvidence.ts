/** Evidence gate for the host visible on this device's joined LiveKit room.
 * Never claim a remote PK opponent is streaming before cross-room media exists.
 */
export type PKMediaEvidence = {
 sameRoom:boolean;
 connected:boolean;
 hostFound:boolean;
 micTrack:boolean;
 micMuted:boolean;
 activeSpeaker:boolean;
 cameraTrack:boolean;
 cameraMuted:boolean;
};
export type PKMediaVisual = {
 mic:'unknown'|'off'|'ready'|'speaking';
 camera:boolean;
 label:string;
};
export function pkMediaVisual(input:PKMediaEvidence):PKMediaVisual {
 if(!input.sameRoom)return {mic:'unknown',camera:false,label:'Chưa ghép tín hiệu đối thủ'};
 if(!input.connected)return {mic:'unknown',camera:false,label:'Media phòng chưa kết nối'};
 if(!input.hostFound)return {mic:'unknown',camera:false,label:'Chủ phòng chưa có tín hiệu'};
 const camera=Boolean(input.cameraTrack&&!input.cameraMuted);
 if(!input.micTrack||input.micMuted)return {mic:'off',camera,label:'Mic tắt hoặc chưa có tiếng'};
 if(input.activeSpeaker)return {mic:'speaking',camera,label:'● Đang nói'};
 return {mic:'ready',camera,label:'Mic đã bật'};
}

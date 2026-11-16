#!/usr/bin/env node
/**
 * Opt-in LiveKit RoomService admin smoke check. Creates a UNIQUE temporary room,
 * checks room/participant listing, and deletes that room only after verifying
 * it is empty. This does NOT test publishing, token revocation, or WebRTC media.
 *
 * Usage: node scripts/verify_livekit_admin.mjs --run [--json]
 * No user-supplied room name is accepted, to protect real Túttt rooms.
 */
import {randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {getLocalConfig,normalizeServiceUrl,resolvedLivekitConfig,safeProbeFailure} from './verify_livekit_sfu.mjs';

const requireFromServer=createRequire(new URL('../server/package.json',import.meta.url));
const defaultFactory=(url,key,secret)=>{
 const {RoomServiceClient}=requireFromServer('livekit-server-sdk');
 return new RoomServiceClient(url,key,secret);
};

export async function boundedSfuCall(action,deadlineMs=8000){
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>30000)throw Error('SFU deadline must be 1–30000 ms');
 let timeout;
 try{
  return await Promise.race([
   Promise.resolve().then(action),
   new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Object.assign(Error('SFU_ADMIN_TIMEOUT'),{code:'timeout'})),deadlineMs);})
  ]);
 }finally{if(timeout)clearTimeout(timeout);}
}

const validateRoomList=(rooms,name)=>Array.isArray(rooms)&&rooms.some(r=>r?.name===name);
const failMessage=(error)=>safeProbeFailure(error);

export async function probeSfuAdmin(config,{clientFactory=defaultFactory,deadlineMs=8000}={}){
 const parsed=resolvedLivekitConfig({LIVEKIT_URL:config.url,LIVEKIT_API_KEY:config.key,LIVEKIT_API_SECRET:config.secret});
 const name=`tuttt-qa-${randomBytes(8).toString('hex')}`;
 const report={ok:false,roomName:name,serviceUrl:normalizeServiceUrl(parsed.url),
  checks:[],cleanup:'NOT_NEEDED',media:'NOT_RUN'};
 const check=(step,status,message)=>report.checks.push({step,status,message});
 let client;
 let created=false;
 let creationAttempted=false;
 let safeToDelete=false;
 let failure=null;
 const invoke=(method,...args)=>boundedSfuCall(()=>client[method](...args),deadlineMs);
 try{
  client=clientFactory(parsed.serviceUrl,parsed.key,parsed.secret);
  const existing=await invoke('listRooms',[name]);
  if(!Array.isArray(existing))throw Error('Invalid room listing');
  if(validateRoomList(existing,name))throw Error('Unexpected collision with an existing test room');
  check('unique-room-preflight','PASS','Phòng kiểm thử chưa tồn tại');
  creationAttempted=true;
  const room=await invoke('createRoom',{name,emptyTimeout:60});
  if(room?.name!==name)throw Error('RoomService returned a different room name');
  created=true;
  check('room-create','PASS','Tạo phòng kiểm thử riêng thành công');
  const listed=await invoke('listRooms',[name]);
  if(!validateRoomList(listed,name))throw Error('Created room missing from listRooms');
  check('room-list','PASS','Đọc được phòng vừa tạo');
  const participants=await invoke('listParticipants',name);
  if(!Array.isArray(participants))throw Error('Invalid participant listing');
  if(participants.length)throw Error('Unexpected participant in isolated test room');
  safeToDelete=true;
  check('participant-list','PASS','Phòng thử nghiệm không có thành viên');
 }catch(error){failure=error;check('admin-rpc','FAIL',failMessage(error));}
 finally{
  if(creationAttempted&&client){
   // A createRoom timeout can still create the room later. Recheck before cleanup.
   // Never delete if participant state cannot be confirmed: deleteRoom kicks users.
   if(!safeToDelete){
    try{
     const found=await invoke('listRooms',[name]);
     if(!Array.isArray(found))throw Error('Invalid room listing during cleanup');
     if(!validateRoomList(found,name)){
      // Creation may have timed out; absence NOW cannot prove absence LATER.
      if(created){report.cleanup='NOT_CONFIRMED';check('cleanup','WARN','Không xác nhận được sự tồn tại của phòng đã tạo');}
      else {report.cleanup='UNCERTAIN';check('cleanup','WARN','Không xác nhận được tạo phòng có hoàn tất muộn hay không');}
     }else{
      const participants=await invoke('listParticipants',name);
      if(!Array.isArray(participants)||participants.length)throw Error('Unable to confirm that temporary room is empty');
      safeToDelete=true;
     }
    }catch{report.cleanup='SAFETY_HOLD';check('cleanup','WARN','Không thể xác nhận phòng trống; không gọi deleteRoom');}
   }
   if(safeToDelete){
    try{
     await invoke('deleteRoom',name);
     // An acknowledged delete is not sufficient if the room still appears.
     const remaining=await invoke('listRooms',[name]);
     if(!Array.isArray(remaining)||validateRoomList(remaining,name))
      throw Error('Temporary room still present after deleteRoom');
     report.cleanup='PASS';check('cleanup','PASS','Đã xóa và xác nhận phòng thử nghiệm không còn tồn tại');
    }catch(error){report.cleanup='FAIL';check('cleanup','FAIL',failMessage(error));}
   }
  }
 }
 report.ok=!failure && report.cleanup==='PASS' && report.checks.every(c=>c.status==='PASS');
 report.message=report.ok?'API quản trị SFU tạo/đọc/xóa phòng tạm thành công (không kiểm chứng media)'
  :'API quản trị SFU chưa đạt đầy đủ; xem các bước và trạng thái cleanup';
 return report;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv.includes('--run')){
  console.log('Chưa chạy thao tác ghi lên SFU. Dùng --run để tự nguyện tạo rồi xóa một phòng tạm tuttt-qa-*.');
  console.log('Yêu cầu livekit-server-sdk trên server và cấu hình LiveKit riêng. Không dùng phòng đang có người.');
 }else{
  try{
   const result=await probeSfuAdmin(getLocalConfig());
   if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
   else{
    console.log(`${result.ok?'PASS':'FAIL'}: ${result.message}`);
    for(const c of result.checks)console.log(`${c.status} ${c.step}: ${c.message}`);
    console.log(`Phòng tạm: ${result.roomName}; cleanup: ${result.cleanup}; media: ${result.media}`);
   }
   if(!result.ok)process.exitCode=2;
  }catch(error){console.error('FAIL — '+failMessage(error));process.exitCode=1;}
 }
}

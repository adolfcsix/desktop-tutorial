#!/usr/bin/env node
/** Preflight network/LiveKit readiness without credentials or microphone access.
 * Usage: node scripts/preflight_livekit.mjs --url http://192.168.1.10:3001 [--require-livekit]
 * This checks reachability/configuration, NOT two-device media quality.
 */
const timeoutMs=7000;
export function interpretHealth(payload,requireLivekit=false){
 if(!payload||payload.status!=='ok'||!Array.isArray(payload.features)||!payload.features.includes('livekit-sfu-gateway'))return {ok:false,message:'Không nhận diện được API Túttt có hỗ trợ LiveKit'};
 const configured=payload.livekitConfigured===true;
 return {ok:!requireLivekit||configured,message:configured?'API hoạt động; LiveKit đã được cấu hình (chưa kiểm tra truyền media)':'API hoạt động nhưng LiveKit chưa được cấu hình',configured};
}
export async function preflight(apiUrl,requireLivekit=false,fetcher=fetch){
 if(!apiUrl)throw new Error('Thiếu --url hoặc EXPO_PUBLIC_TUTTT_API_URL');
 const address=new URL(apiUrl);
 if(!['http:','https:'].includes(address.protocol))throw Error('URL chỉ hỗ trợ http hoặc https');
 const path=address.pathname.replace(/\/$/,'');
 if(path&&path!=='/api')throw Error('Hãy nhập URL gốc máy chủ, không phải đường dẫn trang web');
 address.pathname='/api/health';address.search='';address.hash='';
 const response=await fetcher(address.toString(),{signal:AbortSignal.timeout(timeoutMs),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(`HTTP ${response.status} tại /api/health`);
 const result=interpretHealth(await response.json(),requireLivekit);
 return {...result,url:address.origin};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const flag=process.argv.indexOf('--url');
 const raw=flag>=0?process.argv[flag+1]:process.env.EXPO_PUBLIC_TUTTT_API_URL;
 const requireLivekit=process.argv.includes('--require-livekit');
 try{
  const result=await preflight(raw,requireLivekit);
  console.log(`${result.ok?'PASS':'FAIL'} — ${result.message}`);
  console.log(`Máy chủ: ${result.url}`);
  if(/localhost|127\.0\.0\.1|\[::1\]/.test(result.url))console.warn('LƯU Ý: điện thoại thật cần địa chỉ IP LAN hoặc tên miền có thể truy cập, không phải localhost của máy tính.');
  console.log('Chưa xác minh: thiết bị thật, Bluetooth, TURN/NAT và nghe/nói hai chiều.');
  if(!result.ok)process.exitCode=2;
 }catch(error){console.error('FAIL — '+(error instanceof Error?error.message:String(error)));process.exitCode=1;}
}

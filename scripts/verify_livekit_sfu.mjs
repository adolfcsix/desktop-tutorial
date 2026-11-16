#!/usr/bin/env node
/** A real authenticated RoomService API probe (not a media/ICE test).
 * Secrets are loaded only on the server-side; never sent to Túttt's public health API.
 * Local config: .local/livekit.env; cloud config: LIVEKIT_* environment variables.
 */
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {preflight} from './preflight_livekit.mjs';
import {parseLocalEnv} from './run_local_api.mjs';

const requireFromServer=createRequire(new URL('../server/package.json',import.meta.url));
export function normalizeServiceUrl(mediaUrl){
 if(typeof mediaUrl!=='string')throw Error('Chưa khai báo LIVEKIT_URL');
 let url;
 try{url=new URL(mediaUrl);}catch{throw Error('LIVEKIT_URL không hợp lệ');}
 if(!['ws:','wss:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('LIVEKIT_URL cần là ws(s)://host[:port] không chứa token, path hoặc mật khẩu');
 url.protocol=url.protocol==='wss:'?'https:':'http:';
 return url.origin;
}
export function resolvedLivekitConfig(env,localContent=''){
 // Explicit environment always wins; local-only secrets never enter EXPO_PUBLIC_*.
 const local=localContent?parseLocalEnv(localContent):{};
 const config={url:env.LIVEKIT_URL||local.LIVEKIT_URL,key:env.LIVEKIT_API_KEY||local.LIVEKIT_API_KEY,secret:env.LIVEKIT_API_SECRET||local.LIVEKIT_API_SECRET};
 const serviceUrl=normalizeServiceUrl(config.url);
 if(!config.key||!config.secret||config.key.length<3||config.secret.length<16)throw Error('Thiếu LIVEKIT_API_KEY hoặc LIVEKIT_API_SECRET hợp lệ');
 return {...config,serviceUrl};
}
export function safeProbeFailure(error){
 const code=String(error?.code??error?.status??'').toLowerCase();
 const message=String(error?.message||'').toLowerCase();
 if(code.includes('401')||code.includes('403')||/unauthenticated|permission denied|invalid api key|invalid.*secret|unauthorized/.test(message))return 'LiveKit từ chối xác thực API key/secret';
 if(code.includes('timeout')||/timed? ?out|deadline exceeded/.test(message))return 'Hết thời gian chờ phản hồi LiveKit';
 if(/cannot find module|cannot find package|module_not_found/.test(message))return 'Chưa cài livekit-server-sdk trong thư mục server';
 return 'Không kiểm tra được LiveKit SFU (cổng, mạng, TLS hoặc dịch vụ)';
}
export async function probeSfu(config,{clientFactory,deadlineMs=8000}={}){
 const parsed=resolvedLivekitConfig({LIVEKIT_URL:config.url,LIVEKIT_API_KEY:config.key,LIVEKIT_API_SECRET:config.secret});
 const create=clientFactory||((url,key,secret)=>{
  const {RoomServiceClient}=requireFromServer('livekit-server-sdk');
  return new RoomServiceClient(url,key,secret);
 });
 let handle;
 try{
  const service=create(parsed.serviceUrl,parsed.key,parsed.secret);
  const rooms=await Promise.race([
   Promise.resolve().then(()=>service.listRooms()),
   new Promise((_,reject)=>{handle=setTimeout(()=>reject(Object.assign(Error('SFU_TIMEOUT'),{code:'timeout'})),deadlineMs);})
  ]);
  if(!Array.isArray(rooms))throw Error('SFU API returned invalid payload');
  return {ok:true,message:'LiveKit SFU đã phản hồi API có xác thực (chưa xác minh âm thanh/video WebRTC)',serviceUrl:parsed.serviceUrl};
 }catch(error){return {ok:false,message:safeProbeFailure(error),serviceUrl:parsed.serviceUrl};}
 finally{if(handle)clearTimeout(handle);}
}
export function getLocalConfig(){
 const path=new URL('../.local/livekit.env',import.meta.url);
 const local=existsSync(path)?readFileSync(path,'utf8'):'';
 return resolvedLivekitConfig(process.env,local);
}
if(fileURLToPath(import.meta.url)===resolve(process.argv[1]||'')){
 const flag=process.argv.indexOf('--api');
 const apiUrl=flag>=0?process.argv[flag+1]:null;
 try{
  if(flag>=0&&!apiUrl)throw Error('Thiếu URL sau --api');
  if(apiUrl){
   const result=await preflight(apiUrl,true);
   console.log(`Backend: ${result.ok?'PASS':'FAIL'} — ${result.message}`);
   if(!result.ok){process.exitCode=2;}
  }
  if(!process.exitCode){
   const config=getLocalConfig();
   const outcome=await probeSfu(config);
   console.log(`SFU: ${outcome.ok?'PASS':'FAIL'} — ${outcome.message}`);
   console.log(`Địa chỉ dịch vụ: ${outcome.serviceUrl}`);
   if(!outcome.ok)process.exitCode=2;
  }
  console.log('Chưa nghiệm thu: kết nối media/ICE, nghe hai chiều, camera, Bluetooth và chuyển Wi-Fi/4G trên thiết bị thật.');
 }catch(error){
  // Do not print raw SDK exceptions (could include sensitive request metadata).
  console.error('FAIL — '+safeProbeFailure(error));process.exitCode=1;
 }
}

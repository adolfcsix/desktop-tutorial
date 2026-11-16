#!/usr/bin/env node
/** Create local-only LiveKit credentials and LAN configuration. Never commit .local/. */
import {randomBytes} from 'node:crypto';
import {mkdirSync,openSync,writeFileSync,closeSync,existsSync,unlinkSync,statSync} from 'node:fs';
import {isIP} from 'node:net';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';

export function validateLanIPv4(value){
 if(typeof value!=='string'||isIP(value)!==4)throw Error('Cần --lan-ip là IPv4 của máy tính trong mạng LAN');
 const parts=value.split('.').map(Number);
 const privateLan=parts[0]===10||(parts[0]===172&&parts[1]>=16&&parts[1]<=31)||(parts[0]===192&&parts[1]===168);
 if(!privateLan||parts[3]===0||parts[3]===255)throw Error('Dùng IPv4 mạng riêng (10.x, 172.16–31.x hoặc 192.168.x), không dùng IP công khai/loopback/broadcast');
 return value;
}
export function buildLocalConfig(lanIp,key,secret){
 validateLanIPv4(lanIp);
 if(!/^[A-Za-z0-9_]{8,64}$/.test(key)||!/^[-A-Za-z0-9_]{32,128}$/.test(secret))throw Error('Khóa LiveKit không đúng định dạng');
 const yaml=`# AUTO-GENERATED LOCAL TEST ONLY. Never commit or publish.\nport: 7880\nlog_level: info\nrtc:\n  tcp_port: 7881\n  port_range_start: 50000\n  port_range_end: 50019\n  node_ip: ${lanIp}\n  use_external_ip: false\nkeys:\n  ${key}: ${secret}\n`;
 const env=`# LOCAL TEST ONLY. Server-side credentials. Never put these in EXPO_PUBLIC_*.\nLIVEKIT_URL=ws://${lanIp}:7880\nLIVEKIT_API_KEY=${key}\nLIVEKIT_API_SECRET=${secret}\nHOST=0.0.0.0\nPORT=8787\n`;
 return {yaml,env};
}
export function prepare(lanIp,{dir=resolve(fileURLToPath(new URL('../.local/',import.meta.url))),random=randomBytes}={}){
 validateLanIPv4(lanIp);
 const yamlPath=join(dir,'livekit.yaml'),envPath=join(dir,'livekit.env');
 // Never clobber local credentials: a running room may still depend on them.
 if(existsSync(yamlPath)||existsSync(envPath))throw Error('Đã có cấu hình .local. Không ghi đè khóa cũ; hãy dùng lại cấu hình hiện có.');
 const key=`tuttt_${random(8).toString('hex')}`;
 const secret=random(32).toString('hex');
 const {yaml,env}=buildLocalConfig(lanIp,key,secret);
 mkdirSync(dir,{recursive:true,mode:0o700});
 if(process.platform!=='win32'&&(statSync(dir).mode&0o077))throw Error('Thư mục .local phải chỉ cho chủ sở hữu truy cập (chmod 700)');
 const created=[];
 try{
  for(const [path,content] of [[yamlPath,yaml],[envPath,env]]){
   const fd=openSync(path,'wx',0o600);
   created.push(path);
   try{writeFileSync(fd,content,{encoding:'utf8'});}finally{closeSync(fd);}
  }
 }catch(error){
  // Remove only the files created by this invocation, never pre-existing credentials.
  for(const path of created.reverse())try{unlinkSync(path);}catch{}
  throw error;
 }
 return {yamlPath,envPath,lanIp}; // Never return credentials from production callers.
}
const main=fileURLToPath(import.meta.url)===resolve(process.argv[1]||'');
if(main){
 const flag=process.argv.indexOf('--lan-ip');
 try{
  if(flag<0||!process.argv[flag+1])throw Error('Dùng: node scripts/prepare_local_livekit.mjs --lan-ip 192.168.x.x');
  const result=prepare(process.argv[flag+1]);
  console.log(`Đã tạo cấu hình riêng tư: ${result.yamlPath} và ${result.envPath}`);
  console.log(`LiveKit LAN: ws://${result.lanIp}:7880 (CHỈ mạng LAN thử nghiệm)`);
  console.log('Không chia sẻ, không commit hai tệp .local. Chạy Docker Compose trước, sau đó API.');
 }catch(error){console.error('FAIL — '+(error instanceof Error?error.message:'Lỗi tạo cấu hình'));process.exitCode=1;}
}

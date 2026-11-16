#!/usr/bin/env node
/** Starts backend with secrets from ignored .local/livekit.env. No secrets logged. */
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export function parseLocalEnv(content){
 const vars={};
 for(const line of content.split(/\r?\n/)){
  const text=line.trim();
  if(!text||text.startsWith('#'))continue;
  const match=text.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if(!match)throw Error('Tệp local env có dòng sai định dạng');
  if(Object.hasOwn(vars,match[1]))throw Error('Biến env bị khai báo trùng');
  vars[match[1]]=match[2];
 }
 for(const field of ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET'])if(!vars[field])throw Error('Cấu hình LiveKit chưa đầy đủ');
 return vars;
}
if(fileURLToPath(import.meta.url)===resolve(process.argv[1]||'')){
 try{
  const vars=parseLocalEnv(readFileSync(new URL('../.local/livekit.env',import.meta.url),'utf8'));
  console.log('Chạy API Túttt với cấu hình LiveKit cục bộ. Không hiển thị khóa bí mật.');
  const child=spawn(process.execPath,['server/index.js'],{cwd:root,stdio:'inherit',env:{...process.env,...vars}});
  child.on('error',()=>{console.error('Không khởi động được API');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=code===null?1:code;});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
 }catch(error){console.error('FAIL — '+(error instanceof Error?error.message:'Lỗi cấu hình'));process.exitCode=1;}
}

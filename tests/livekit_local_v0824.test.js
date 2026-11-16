'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {join}=require('node:path');
const {mkdtempSync,existsSync,readFileSync,statSync,rmSync,chmodSync}=require('node:fs');
const {tmpdir}=require('node:os');
const base=pathToFileURL(join(__dirname,'../scripts/verify_livekit_sfu.mjs')).href;
const configPath=pathToFileURL(join(__dirname,'../scripts/prepare_local_livekit.mjs')).href;
const launchPath=pathToFileURL(join(__dirname,'../scripts/run_local_api.mjs')).href;

test('local media config validates LAN IPv4 and never stores credentials in shared files',async()=>{
 const {validateLanIPv4,buildLocalConfig,prepare}=await import(configPath);
 for(const bad of ['localhost','127.0.0.1','0.0.0.0','224.0.0.1','169.254.2.1','8.8.8.8','1.1.1.1','172.32.1.12','172.15.2.3','192.0.2.3','192.168.1.0','192.168.1.255','192.168.1.1:8787',''])assert.throws(()=>validateLanIPv4(bad));
 for(const good of ['10.4.2.3','172.16.2.14','172.31.254.6','192.168.1.242'])assert.equal(validateLanIPv4(good),good);
 assert.equal(validateLanIPv4('192.168.1.242'),'192.168.1.242');
 const dir=mkdtempSync(join(tmpdir(),'tuttt-livekit-'));
 try{
  const output=prepare('192.168.1.242',{dir});
  assert.equal(existsSync(output.yamlPath),true);
  const yaml=readFileSync(output.yamlPath,'utf8'),env=readFileSync(output.envPath,'utf8');
  assert.match(yaml,/node_ip: 192\.168\.1\.242/);
  assert.match(env,/LIVEKIT_URL=ws:\/\/192\.168\.1\.242:7880/);
  const key=env.match(/LIVEKIT_API_KEY=(.*)/)[1],secret=env.match(/LIVEKIT_API_SECRET=(.*)/)[1];
  assert.match(yaml,new RegExp('  '+key+': '+secret));
  assert.ok(secret.length>=32&&key.length>=8);
  assert.throws(()=>prepare('192.168.1.242',{dir}),/Không ghi đè/);
  if(process.platform!=='win32'){
   assert.equal(statSync(output.yamlPath).mode&0o077,0);
   assert.equal(statSync(output.envPath).mode&0o077,0);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.throws(()=>buildLocalConfig('192.168.1.242','abc','short'),/không đúng/);
});

test('SFU preflight authenticates to listRooms and does not claim WebRTC media success',async()=>{
 const {normalizeServiceUrl,resolvedLivekitConfig,probeSfu}=await import(base);
 const secret='c'.repeat(32),key='tuttt_local_key';
 assert.equal(normalizeServiceUrl('wss://sample.livekit.cloud'),'https://sample.livekit.cloud');
 assert.equal(normalizeServiceUrl('ws://192.168.1.242:7880'),'http://192.168.1.242:7880');
 for(const url of ['https://sample.livekit.cloud','ws://user:pass@host:7880','ws://sample/rtc','ws://sample?token=secret','file:///tmp'])assert.throws(()=>normalizeServiceUrl(url));
 const config=resolvedLivekitConfig({LIVEKIT_URL:'ws://192.168.1.242:7880',LIVEKIT_API_KEY:key,LIVEKIT_API_SECRET:secret});
 let calls=0;
 const ok=await probeSfu(config,{clientFactory:(url,k,s)=>{
  assert.equal(url,'http://192.168.1.242:7880');assert.equal(k,key);assert.equal(s,secret);
  return {listRooms:async()=>{calls++;return [];}};
 }});
 assert.equal(ok.ok,true);assert.equal(calls,1);assert.match(ok.message,/chưa xác minh âm thanh/);
 const denied=await probeSfu(config,{clientFactory:()=>({listRooms:async()=>{throw Object.assign(Error('hidden secret material'),{code:401});}})});
 assert.equal(denied.ok,false);assert.match(denied.message,/từ chối xác thực/);assert.doesNotMatch(denied.message,/secret material/);
});

test('SFU preflight distinguishes unavailable SFU and timeout without exposing token',async()=>{
 const {probeSfu,safeProbeFailure}=await import(base);
 const conf={url:'wss://example.invalid',key:'tuttt_local_key',secret:'x'.repeat(32)};
 const timeout=await probeSfu(conf,{deadlineMs:15,clientFactory:()=>({listRooms:()=>new Promise(()=>{})})});
 assert.equal(timeout.ok,false);assert.match(timeout.message,/Hết thời gian/);
 const error=await probeSfu(conf,{clientFactory:()=>({listRooms:async()=>{throw Error('secret abc unreachable');}})});
 assert.equal(error.ok,false);assert.doesNotMatch(error.message,/secret abc/);
 assert.match(safeProbeFailure(Error('Cannot find module livekit-server-sdk')),/Chưa cài/);
});

test('local API runner parses private environment without exposing or rewriting keys',async()=>{
 const {parseLocalEnv}=await import(launchPath);
 const env=parseLocalEnv('LIVEKIT_URL=ws://192.168.1.242:7880\nLIVEKIT_API_KEY=good-key\nLIVEKIT_API_SECRET='+ 'x'.repeat(32)+'\n');
 assert.equal(env.LIVEKIT_API_KEY,'good-key');
 assert.throws(()=>parseLocalEnv('LIVEKIT_URL=ws://example\n'),/chưa đầy đủ/);
 assert.throws(()=>parseLocalEnv('LIVEKIT_URL=x\nLIVEKIT_URL=y\n'),/trùng/);
});

test('LAN credentials reject pre-existing world-readable directories rather than writing secret material',async()=>{
 if(process.platform==='win32')return;
 const {prepare}=await import(configPath);
 const dir=mkdtempSync(join(tmpdir(),'tuttt-perms-'));
 try{
  chmodSync(dir,0o755);
  assert.throws(()=>prepare('10.0.2.15',{dir}),/chỉ cho chủ sở hữu/);
  assert.equal(existsSync(join(dir,'livekit.yaml')),false);
  assert.equal(existsSync(join(dir,'livekit.env')),false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

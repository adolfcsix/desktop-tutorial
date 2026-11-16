#!/usr/bin/env node
/** One-command, offline release regression suite. Never accesses production or secrets.
 * Tests public UI semantics with local Chromium; neither microphone nor SFU media is certified.
 *   npm run qa:release          full suite
 *   npm run qa:release -- --fast   API/tests and syntax only
 *   npm run qa:release -- --extended   reconnect/theme and migrated historical browser suites too
 */
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const config=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
const version=config.version;
const resultDir=join(root,'docs','qa-v'+version.replaceAll('.',''));
const full=!process.argv.includes('--fast');
const extended=process.argv.includes('--extended');
mkdirSync(resultDir,{recursive:true});
const jobs=[
 ['Backend/API + unit tests','npm',['test'],120000],
 ['Web/Node syntax','npm',['run','check:web'],30000],
 ['Native config static audit (warnings reported)','node',['scripts/doctor_native.mjs'],20000],
 ['Single-file export','python3',['scripts/build_standalone_preview.py'],25000]
];
if(full){
 jobs.push(
  ['Youth design cross-screen audit','python3',['tests/browser_youth_visual_v0828.py'],60000],
  ['Touch, typography and keyboard review','python3',['tests/browser_interface_polish_v0829.py'],60000],
  ['Clutter-free navigation & OS motion preference','python3',['tests/browser_declutter_v0830.py'],60000],
  ['Unified Live options, report and PK menus','python3',['tests/browser_live_options_v0832.py'],60000],
  ['Live UI & PK visual','python3',['tests/browser_release_smoke_v0825.py'],60000],
  ['Standalone Voice/Cam themes','python3',['tests/browser_standalone_theme_v0818.py'],60000],
  ['Connected profile and uncluttered Live controls','python3',['tests/browser_profile_connected_v0844.py'],60000],
  ['Chat under burst','python3',['tests/browser_chat_resilience_v089.py'],60000]
 );
 if(extended)jobs.push(
  ['Viewer disconnect/reconnect','python3',['tests/browser_audience_reconnect_v0816.py'],60000],
  ['Theme without remount','python3',['tests/browser_theme_session_v0820.py'],60000],
  ['Migrated v0.5.6 Live/Chat regressions','python3',['tests/browser_qa_v056.py'],60000],
  ['Migrated v0.5.7 mic-state regressions','python3',['tests/browser_qa_v057.py'],60000]
 );
}

const results=[];
const begin=new Date().toISOString();
for(const [name,cmd,args,timeout] of jobs){
 const start=Date.now();
 const out=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout,maxBuffer:8*1024*1024,env:{...process.env,CI:'1'}});
 const status=out.status===0&&!out.error?'PASS':'FAIL';
 const last=(out.stdout||'').trim().split('\n').slice(-10).join('\n');
 const err=(out.stderr||'').trim().split('\n').slice(-10).join('\n');
 results.push({name,status,seconds:Math.round((Date.now()-start)/1000),code:out.status,
  error:out.error?.code||null,excerpt:status==='FAIL'?`${last}\n${err}`.trim().slice(-2200):last.slice(-500)});
 console.log(`${status} — ${name} (${results.at(-1).seconds}s)`);
}
// API/browser smoke tests succeeding does NOT mean an Android/iOS build is
// ready. Record the separate Native gates without making offline QA fail.
const nativeGateResult=spawnSync('node',['scripts/verify_native.mjs','--json'],{
 cwd:root,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024,env:{...process.env,CI:'1'}
});
let nativeReadiness={dependencyGate:'NOT_RUN',deviceConfigGate:'NOT_RUN',nativeBuild:'NOT_RUN',deviceMedia:'NOT_RUN'};
try{
 const data=JSON.parse(nativeGateResult.stdout||'');
 nativeReadiness={dependencyGate:data.dependencyGate,deviceConfigGate:data.deviceConfigGate,
  nativeBuild:data.nativeBuild,deviceMedia:data.deviceMedia,
  configAuditGate:data.configAuditGate};
}catch{/* The verifier's full trace remains available by running verify:native. */}
console.log(`NATIVE (independent) — dependency=${nativeReadiness.dependencyGate}; device=${nativeReadiness.deviceConfigGate}; build=${nativeReadiness.nativeBuild}`);
const failed=results.filter(r=>r.status!=='PASS');
const report={version,startedAt:begin,finishedAt:new Date().toISOString(),status:failed.length?'FAIL':'PASS',
 automatedChecks:results,nativeReadiness,limitations:{cloudBrowser:'Requires a publicly accessible staging URL; cannot access local file paths',
 livekitSfu:'Not tested by local Chromium',twoPhysicalPhones:'Not tested',nativeBuild:'Not tested'}};
writeFileSync(join(resultDir,'automation-results.json'),JSON.stringify(report,null,2)+'\n');
const md=`# Túttt v${version} — Kiểm thử tự động\n\nNgày chạy: ${report.finishedAt}. Kết quả: **${report.status}**.\n\n| Hạng mục | Kết quả | Thời gian |\n|---|---|---|\n${results.map(r=>`| ${r.name} | ${r.status} | ${r.seconds}s |`).join('\n')}\n\n**Native độc lập:** dependency=${nativeReadiness.dependencyGate}; cấu hình thiết bị=${nativeReadiness.deviceConfigGate}; APK/IPA=${nativeReadiness.nativeBuild}. Kết quả QA ${report.status} chỉ xác nhận các hạng mục kiểm thử ở bảng trên.\n\n**Giới hạn:** Không kiểm chứng âm thanh/video hai thiết bị thật, build iOS/Android, Bluetooth, Wi-Fi/4G hoặc LiveKit SFU. TinyFish chỉ truy cập được bản triển khai có URL bên ngoài; bản HTML offline và localhost không tự truy cập từ cloud.\n`;
writeFileSync(join(resultDir,'AUTOMATED_QA.md'),md);
if(failed.length){
 for(const x of failed)console.error(`\nFAIL ${x.name}:\n${x.excerpt}`);
 process.exitCode=1;
}
console.log('Report: '+join(resultDir,'AUTOMATED_QA.md'));

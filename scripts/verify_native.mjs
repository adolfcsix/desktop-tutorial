#!/usr/bin/env node
/** Strict, reproducible Expo/LiveKit native build readiness verification.
 * npm run verify:native -- [--install] [--offline] [--device] [--json]
 * A fresh install creates a REAL npm lockfile via npm and then npm ci.
 * No use of --force/--legacy-peer-deps, global npx binaries, or synthetic locks.
 * A failed install is a hard blocker even if stale node_modules are present.
 */
import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectNativeProject,assessRuntimeMatrix} from './doctor_native.mjs';
import {inspectNpmLock,inspectInstalledTree,npmErrorMessage} from './native_dependency_integrity.mjs';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const mobile=join(root,'mobile');
const args=new Set(process.argv.slice(2));
const install=args.has('--install');
const offline=args.has('--offline');
const json=args.has('--json');
const device=args.has('--device');
const steps=[];
const record=(name,status,detail)=>steps.push({name,status,detail});
const packageJson=JSON.parse(readFileSync(join(mobile,'package.json'),'utf8'));
let installOk=true;
const nodeCompatible=assessRuntimeMatrix({dependencies:packageJson.dependencies}).find(x=>x.id==='node-runtime');
record('Node SDK prerequisite',nodeCompatible.status,nodeCompatible.message);
if(nodeCompatible.status!=='PASS')installOk=false;
function run(name,cmd,cmdArgs,timeoutMs=120000){
 const result=spawnSync(cmd,cmdArgs,{cwd:mobile,encoding:'utf8',timeout:timeoutMs,maxBuffer:2*1024*1024,env:{...process.env,CI:'1'}});
 const success=result.status===0&&!result.error;
 const output=[result.stdout,result.stderr].filter(Boolean).join('\n');
 const tail=output.trim().split('\n').slice(-10).join('\n');
 record(name,success?'PASS':'FAIL',success?'Hoàn tất (exit 0)':`${npmErrorMessage(output,result.error?.code||String(result.status))}; ${tail.slice(-700)}`);
 return success;
}
function readLock(){try{return JSON.parse(readFileSync(join(mobile,'package-lock.json'),'utf8'));}catch{return null;}}

if(install){
 if(installOk&&!existsSync(join(mobile,'package-lock.json'))){
  const options=['install','--package-lock-only','--strict-peer-deps','--ignore-scripts','--no-audit','--no-fund'];
  if(offline)options.push('--offline');
  installOk=run('npm strict lockfile generation','npm',options,180000);
 }
 if(installOk){
  const lockCheck=inspectNpmLock(readLock(),packageJson);
  if(lockCheck.status!=='PASS'){
   record('npm lockfile preflight',lockCheck.status,lockCheck.detail);
   installOk=false;
  }else{
   const options=['ci','--strict-peer-deps','--no-audit','--no-fund'];
   if(offline)options.push('--offline');
   installOk=run('npm ci (strict peers)','npm',options,240000);
  }
 }
}
const lockCheck=inspectNpmLock(readLock(),packageJson);
const installedCheck=inspectInstalledTree(packageJson,mobile);
record('Resolved npm lockfile',lockCheck.status,lockCheck.detail);
record('Installed dependency tree',installedCheck.status,installedCheck.detail);
if(install&&!installOk)record('Install prerequisite','BLOCKED','Lần cài dependency này thất bại; không dùng lại node_modules cũ để báo đạt');

const ready=installOk&&nodeCompatible.status==='PASS'&&lockCheck.status==='PASS'&&installedCheck.status==='PASS';
if(!ready){
 for(const name of ['npm ls direct dependencies','Expo SDK dependency check','Expo config prebuild resolution','Expo Doctor','TypeScript semantic check'])
  record(name,'NOT_RUN','Dependency installation hoặc lockfile chưa được xác minh đầy đủ');
}else{
 run('npm ls direct dependencies','npm',['ls','--depth=0'],45000);
 run('Expo SDK dependency check','npm',['run','sdk:check'],90000);
 run('Expo config prebuild resolution','npm',['exec','--','expo','config','--type','prebuild','--json'],90000);
 run('Expo Doctor','npm',['run','doctor'],90000);
 run('TypeScript semantic check','npm',['run','typecheck'],90000);
}
let staticReport;
try { staticReport=inspectNativeProject(); }
catch (error) {
 // Bad Expo identifiers or unreadable app config must be a structured FAIL,
 // never an uncaught exception that hides the rest of the verification report.
 staticReport={version:packageJson.version,status:'FAIL',checks:[{
  id:'native-config-error',status:'FAIL',message:error instanceof Error?error.message:'Không đọc được cấu hình Expo'
 }]};
}
record('Native config declaration',staticReport.status,staticReport.checks.filter(x=>x.status!=='PASS').map(x=>`${x.id}: ${x.message}`).join(' | ')||'PASS');
// Native dependency validation and physical-device configuration are separate gates.
// A missing staging URL/app signing ID must NOT be mistaken for a TypeScript failure.
const dependencySteps=steps.filter(x=>x.name!=='Native config declaration');
const dependencyGate=dependencySteps.every(x=>x.status==='PASS')?'PASS':'BLOCKED';
// Device readiness must be independent from npm/TypeScript status. In v0.8.41
// the aggregate static audit included lockfile and node_modules warnings, so a
// fully configured phone still showed NEEDS_CONFIGURATION when npm was blocked.
const deviceCheckIds=new Set([
 'android-id','ios-id','api-url','eas-profile','dev-client',
 'permission:android.permission.RECORD_AUDIO','permission:android.permission.CAMERA',
 'ios-privacy:NSMicrophoneUsageDescription','ios-privacy:NSCameraUsageDescription'
]);
const deviceChecks=staticReport.checks.filter(x=>deviceCheckIds.has(x.id));
const deviceConfigGate=staticReport.checks.some(x=>x.id==='native-config-error')?'FAIL':
 deviceChecks.some(x=>x.status==='FAIL')?'FAIL':
 deviceChecks.some(x=>x.status!=='PASS')?'NEEDS_CONFIGURATION':'PASS';
record('Device declarations only',deviceConfigGate,[...staticReport.checks.filter(x=>x.id==='native-config-error'),...deviceChecks.filter(x=>x.status!=='PASS')].map(x=>`${x.id}: ${x.message}`).join(' | ')||'Android/iOS identifiers, API origin, media permissions and EAS profile declared');
const report={version:staticReport.version,dependencyGate,technicalGate:dependencyGate,deviceConfigGate,configAuditGate:staticReport.status,deviceGateEnforced:device,
 deviceChecks,
 steps,deviceMedia:'NOT_RUN',nativeBuild:'NOT_RUN',
 caveat:'dependencyGate=PASS cần npm ci strict, npm ls, expo install --check, expo config --type prebuild, Expo Doctor và TypeScript. deviceConfigGate là kiểm tra khai báo, không chứng nhận thiết bị/đường truyền.'};
const reportPath=join(root,'docs','qa-v'+staticReport.version.replaceAll('.',''),'native-verification.json');
mkdirSync(resolve(reportPath,'..'),{recursive:true});
writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
if(json)console.log(JSON.stringify(report,null,2));
else{
 for(const step of steps)console.log(`${step.status}: ${step.name} — ${step.detail.slice(0,420)}`);
 console.log(`Native dependencies: ${report.dependencyGate}; device config: ${report.deviceConfigGate}; build: ${report.nativeBuild}; media: ${report.deviceMedia}`);
 console.log('Report: '+reportPath);
}
if(dependencyGate!=='PASS'||staticReport.status==='FAIL'||deviceConfigGate==='FAIL'||(device&&deviceConfigGate!=='PASS'))process.exitCode=1;

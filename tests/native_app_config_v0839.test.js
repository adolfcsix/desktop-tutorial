'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync} = require('node:fs');
const {join} = require('node:path');
const {tmpdir} = require('node:os');
const root=join(__dirname,'..');
const readJson=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const buildConfig=require('../mobile/app.config.js');
const doctor=()=>import('../scripts/doctor_native.mjs');

test('v0.8.39 Expo config preserves preview identity when no build IDs are supplied',()=>{
 const app=readJson('mobile/app.json').expo;
 const out=buildConfig({config:app},{});
 assert.equal(out.android.package,app.android.package);
 assert.equal(out.ios.bundleIdentifier,app.ios.bundleIdentifier);
 assert.deepEqual(out.plugins,app.plugins);
 assert.deepEqual(out.android.permissions,app.android.permissions);
 assert.deepEqual(out.ios.infoPlist,app.ios.infoPlist);
 assert.equal(out.version,app.version);
});
test('v0.8.39 Expo build config safely injects independent Android/iOS identifiers',()=>{
 const app=readJson('mobile/app.json').expo;
 const out=buildConfig({config:app},{TUTTT_ANDROID_APPLICATION_ID:'vn.tuttt.native',TUTTT_IOS_BUNDLE_ID:'vn.tuttt.ios'});
 assert.equal(out.android.package,'vn.tuttt.native');
 assert.equal(out.ios.bundleIdentifier,'vn.tuttt.ios');
 assert.equal(app.android.package,'com.example.tuttt.preview');
 assert.equal(app.ios.bundleIdentifier,'com.example.tuttt.preview');
});
test('v0.8.39 Expo config rejects placeholder and unsafe build identifiers',()=>{
 const app=readJson('mobile/app.json').expo;
 for(const bad of ['com.example.preview','com.example','localhost','bad id.test','com..tuttt','-bad.example','com.a/b',' com.valid.name','com.valid.name ']){
  assert.throws(()=>buildConfig({config:app},{TUTTT_ANDROID_APPLICATION_ID:bad}),undefined,bad);
 }
 for(const bad of ['com.example.preview','x','vn.app/evil','vn..app','bad app.test']){
  assert.throws(()=>buildConfig({config:app},{TUTTT_IOS_BUNDLE_ID:bad}),undefined,bad);
 }
});
test('v0.8.39 doctor evaluates Expo effective IDs rather than only committed app.json',async()=>{
 const {inspectNativeProject}=await doctor();
 const beforeA=process.env.TUTTT_ANDROID_APPLICATION_ID,beforeI=process.env.TUTTT_IOS_BUNDLE_ID;
 try{
  process.env.TUTTT_ANDROID_APPLICATION_ID='vn.tuttt.android';
  process.env.TUTTT_IOS_BUNDLE_ID='vn.tuttt.ios';
  const result=inspectNativeProject({root,apiUrl:''});
  assert.equal(result.checks.find(x=>x.id==='android-id').status,'PASS');
  assert.equal(result.checks.find(x=>x.id==='ios-id').status,'PASS');
  assert.equal(result.status,'WARN','still blocked by missing npm lock and API');
 } finally {
  if(beforeA===undefined)delete process.env.TUTTT_ANDROID_APPLICATION_ID;else process.env.TUTTT_ANDROID_APPLICATION_ID=beforeA;
  if(beforeI===undefined)delete process.env.TUTTT_IOS_BUNDLE_ID;else process.env.TUTTT_IOS_BUNDLE_ID=beforeI;
 }
});
test('v0.8.39 native source scan discovers nested TypeScript sources',async()=>{
 const {mobileSourcePaths}=await doctor();
 const dir=mkdtempSync(join(tmpdir(),'tuttt-source-scan-'));
 try{
  mkdirSync(join(dir,'nested'),{recursive:true});
  writeFileSync(join(dir,'entry.tsx'),'export const ok=true');
  writeFileSync(join(dir,'nested','camera.ts'),'export const cam=true');
  writeFileSync(join(dir,'nested','notes.md'),'not TS');
  assert.deepEqual(mobileSourcePaths(dir,'src').sort(),['src/entry.tsx','src/nested/camera.ts']);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('v0.8.39 malformed npm lockfile produces explicit FAIL instead of crashing the doctor',async()=>{
 const {inspectNativeProject}=await doctor();
 const dir=mkdtempSync(join(tmpdir(),'tuttt-malformed-lock-'));
 try{
  mkdirSync(join(dir,'mobile','src'),{recursive:true});
  const files=['package.json','mobile/package.json','mobile/app.json','mobile/app.config.js','mobile/eas.json','mobile/App.tsx'];
  for(const name of files){
   const target=join(dir,name);
   copyFileSync(join(root,name),target);
  }
  writeFileSync(join(dir,'mobile','package-lock.json'),'{ invalid JSON');
  const result=inspectNativeProject({root:dir,apiUrl:''});
  assert.equal(result.status,'FAIL');
  assert.equal(result.checks.find(x=>x.id==='lock-integrity').status,'FAIL');
  assert.equal(result.checks.find(x=>x.id==='resolved-lock').status,'WARN');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

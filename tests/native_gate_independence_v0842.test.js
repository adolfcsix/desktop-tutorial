'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {join}=require('node:path');
const root=join(__dirname,'..');
const base={
 TUTTT_ANDROID_APPLICATION_ID:'vn.tuttt.acceptance',
 TUTTT_IOS_BUNDLE_ID:'vn.tuttt.acceptance',
 EXPO_PUBLIC_TUTTT_API_URL:'https://staging.tuttt.example.vn',
};
function verify(vars={},flags=[]){
 const r=spawnSync(process.execPath,['scripts/verify_native.mjs','--json',...flags],{
  cwd:root,encoding:'utf8',timeout:16000,env:{...process.env,...vars}
 });
 assert.match(r.stdout,/^\s*\{/,'Verifier must report JSON even for invalid identifiers');
 return {code:r.status,report:JSON.parse(r.stdout)};
}
test('v0.8.42 device declarations PASS independently of missing dependencies',()=>{
 const {code,report}=verify(base);
 assert.equal(code,1,'missing lockfile must still block technical release');
 assert.equal(report.deviceConfigGate,'PASS');
 assert.equal(report.dependencyGate,'BLOCKED');
 assert.equal(report.configAuditGate,'WARN');
 assert.equal(report.nativeBuild,'NOT_RUN');
 assert.equal(report.deviceMedia,'NOT_RUN');
 assert.ok(report.deviceChecks.every(x=>x.status==='PASS'));
});
test('v0.8.42 --device cannot bypass dependency gate even when configured',()=>{
 const {code,report}=verify(base,['--device']);
 assert.equal(code,1);assert.equal(report.deviceGateEnforced,true);
 assert.equal(report.deviceConfigGate,'PASS');
 assert.equal(report.dependencyGate,'BLOCKED');
});
test('v0.8.42 device gate warnings depend only on actual device prerequisites',()=>{
 const {report}=verify({...base,EXPO_PUBLIC_TUTTT_API_URL:''});
 assert.equal(report.deviceConfigGate,'NEEDS_CONFIGURATION');
 assert.ok(report.deviceChecks.some(x=>x.id==='api-url'&&x.status==='WARN'));
 assert.ok(!report.deviceChecks.some(x=>/lock|dependencies/i.test(x.id)));
});
test('v0.8.42 malformed Android identifier returns structured FAIL, not crash',()=>{
 const {code,report}=verify({...base,TUTTT_ANDROID_APPLICATION_ID:'bad id !!'});
 assert.equal(code,1);assert.equal(report.deviceConfigGate,'FAIL');
 assert.equal(report.configAuditGate,'FAIL');
 assert.match(report.steps.find(x=>x.name==='Native config declaration').detail,/TUTTT_ANDROID_APPLICATION_ID/);
});
test('v0.8.42 public HTTP staging cannot be accepted for a token-bearing device',()=>{
 const {report}=verify({...base,EXPO_PUBLIC_TUTTT_API_URL:'http://staging.tuttt.example.vn'});
 assert.equal(report.deviceConfigGate,'FAIL');
 assert.ok(report.deviceChecks.some(x=>x.id==='api-url'&&x.status==='FAIL'));
});
test('v0.8.42 stable semver ranges reject pre-release versions',async()=>{
 const {inspectInstalledTree}=await import('../scripts/native_dependency_integrity.mjs');
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=require('node:fs');
 const {tmpdir}=require('node:os');
 const dir=mkdtempSync(join(tmpdir(),'tuttt-semver-'));
 try{
  const pkg={dependencies:{'react-native-safe-area-context':'~5.9.1'}};
  const location=join(dir,'node_modules','react-native-safe-area-context');
  mkdirSync(location,{recursive:true});
  writeFileSync(join(location,'package.json'),JSON.stringify({name:'react-native-safe-area-context',version:'5.9.1-rc.0'}));
  assert.equal(inspectInstalledTree(pkg,dir).status,'FAIL');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

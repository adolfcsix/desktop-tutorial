"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
function verify(extra=[],env={}){
 const r=spawnSync(process.execPath,['scripts/verify_native.mjs','--json',...extra],{
  cwd:root,encoding:'utf8',timeout:16000,env:{...process.env,...env}
 });
 assert.ok(r.stdout.startsWith('{'),r.stderr||r.stdout);
 return {code:r.status,report:JSON.parse(r.stdout)};
}
test('v0.8.41 dependency gate is distinct from signing and staging configuration',()=>{
 const {report}=verify();
 assert.equal(report.dependencyGate,'BLOCKED');
 assert.equal(report.technicalGate,report.dependencyGate);
 assert.equal(report.deviceConfigGate,'NEEDS_CONFIGURATION');
 assert.equal(report.deviceMedia,'NOT_RUN');assert.equal(report.nativeBuild,'NOT_RUN');
});
test('v0.8.41 config warnings do not masquerade as compiler errors',()=>{
 const {report}=verify();
 const config=report.steps.find(x=>x.name==='Native config declaration');
 assert.equal(config.status,'WARN');
 assert.match(config.detail,/lockfile|dependencies|api-url|ios-id|android-id/i);
 assert.ok(report.steps.some(x=>x.name==='TypeScript semantic check'&&x.status==='NOT_RUN'));
});
test('v0.8.41 records the prebuild plugin resolution check but never invokes it without dependencies',()=>{
 const {report}=verify();
 assert.equal(report.steps.find(x=>x.name==='Expo config prebuild resolution').status,'NOT_RUN');
 const src=readFileSync(join(root,'scripts/verify_native.mjs'),'utf8');
 assert.match(src,/'expo','config','--type','prebuild','--json'/);
});
test('v0.8.41 install gate checks Node before attempting npm network requests',()=>{
 const src=readFileSync(join(root,'scripts/verify_native.mjs'),'utf8');
 assert.match(src,/nodeCompatible\.status!=='PASS'/);
 assert.match(src,/if\(installOk&&!existsSync/);
 assert.match(src,/--strict-peer-deps/);
 assert.doesNotMatch(src,/["']--(?:force|legacy-peer-deps)["']/);
});
test('v0.8.41 no positive build/media assertions from static audit',()=>{
 const {code,report}=verify();
 assert.equal(code,1);
 assert.ok(report.steps.some(x=>x.name==='Node SDK prerequisite'&&x.status==='PASS'));
 assert.ok(report.steps.some(x=>x.name==='Resolved npm lockfile'&&x.status==='BLOCKED'));
 assert.equal(report.nativeBuild,'NOT_RUN');
});

test('v0.8.41 explicit --device gate marks absent staging config as a blocking prerequisite',()=>{
 const {code,report}=verify(['--device']);
 assert.equal(code,1);
 assert.equal(report.deviceGateEnforced,true);
 assert.equal(report.deviceConfigGate,'NEEDS_CONFIGURATION');
 const regular=verify();
 assert.equal(regular.report.deviceGateEnforced,false);
});

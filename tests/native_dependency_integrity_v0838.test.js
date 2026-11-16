'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync}=require('node:fs');
const {tmpdir}=require('node:os');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const helpers=()=>import('../scripts/native_dependency_integrity.mjs');
const pkg={name:'tuttt-mobile',version:'0.8.39',dependencies:{react:'19.3.0',expo:'58.0.19','react-native-safe-area-context':'~5.9.1'},devDependencies:{typescript:'6.0.0'}};
const lockFor=(app=pkg)=>({name:app.name,version:app.version,lockfileVersion:3,packages:{'':{name:app.name,version:app.version,dependencies:{...app.dependencies},devDependencies:{...app.devDependencies}},...Object.fromEntries(Object.entries({...app.dependencies,...app.devDependencies}).map(([name,spec])=>['node_modules/'+name,{version:spec.replace(/^[~^]/,''),resolved:'https://registry.npmjs.org/'+name+'/-/fixture.tgz',integrity:'sha512-test'}]))}});

test('v0.8.39 rejects absent, fabricated and root-only npm lockfiles',async()=>{
 const {inspectNpmLock}=await helpers();
 assert.equal(inspectNpmLock(null,pkg).status,'BLOCKED');
 assert.equal(inspectNpmLock({lockfileVersion:3,packages:{'':lockFor().packages['']}},pkg).status,'FAIL');
 const good=lockFor();assert.equal(inspectNpmLock(good,pkg).status,'PASS');
 delete good.packages['node_modules/react'].resolved;delete good.packages['node_modules/react'].integrity;
 assert.equal(inspectNpmLock(good,pkg).status,'FAIL');
});
test('v0.8.39 rejects stale root versions, missing lock entries, and mismatched versions',async()=>{
 const {inspectNpmLock}=await helpers();
 const a=lockFor();a.packages[''].dependencies.react='19.3.1';assert.equal(inspectNpmLock(a,pkg).status,'FAIL');
 const b=lockFor();b.packages['node_modules/react'].version='19.3.1';assert.equal(inspectNpmLock(b,pkg).status,'FAIL');
 const c=lockFor();c.packages['node_modules/react-native-safe-area-context'].version='5.10.0';assert.equal(inspectNpmLock(c,pkg).status,'FAIL');
});
test('v0.8.39 checks versions actually installed rather than only expo folder existence',async()=>{
 const {inspectInstalledTree}=await helpers();
 const dir=mkdtempSync(join(tmpdir(),'tuttt-native-'));
 try{
  assert.equal(inspectInstalledTree(pkg,dir).status,'BLOCKED');
  for(const [name,spec] of Object.entries({...pkg.dependencies,...pkg.devDependencies})){
   const p=join(dir,'node_modules',name);mkdirSync(p,{recursive:true});writeFileSync(join(p,'package.json'),JSON.stringify({name,version:spec.replace(/^[~^]/,'')}));
  }
  assert.equal(inspectInstalledTree(pkg,dir).status,'PASS');
  writeFileSync(join(dir,'node_modules','react','package.json'),JSON.stringify({name:'react',version:'19.3.1'}));
  assert.equal(inspectInstalledTree(pkg,dir).status,'FAIL');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('v0.8.39 diagnoses DNS, peer conflicts, engines and timeouts separately',async()=>{
 const {npmErrorMessage}=await helpers();
 for(const [text,expected] of [['npm ERR! code EAI_AGAIN','NETWORK_DNS'],['npm ERR! code ERESOLVE','ERESOLVE'],['npm ERR! code ETIMEDOUT','NETWORK_TIMEOUT'],['npm ERR! code ENOTCACHED','CACHE_MISS'],['npm ERR! code EBADENGINE','ENGINE'],['npm ERR! code EINTEGRITY','INTEGRITY']])
  assert.match(npmErrorMessage(text),new RegExp('^'+expected));
});
test('v0.8.39 fresh strict install uses npm-generated lock then npm ci without peer bypass',()=>{
 const src=readFileSync(join(__dirname,'../scripts/verify_native.mjs'),'utf8');
 assert.match(src,/--package-lock-only/);assert.match(src,/['"]ci['"]/);assert.match(src,/--strict-peer-deps/);
 assert.doesNotMatch(src,/['"]--(?:force|legacy-peer-deps)['"]/);
 assert.match(src,/installOk&&nodeCompatible\.status==='PASS'&&lockCheck\.status==='PASS'&&installedCheck\.status==='PASS'/);
});
test('v0.8.39 refuses to mark native ready when DNS blocked or dependencies absent',()=>{
 const r=spawnSync('node',['scripts/verify_native.mjs','--json'],{cwd:join(__dirname,'..'),encoding:'utf8',timeout:15000});
 const report=JSON.parse(r.stdout);
 if(report.steps.find(s=>s.name==='Resolved npm lockfile').status!=='PASS'){
  assert.equal(r.status,1);assert.equal(report.technicalGate,'BLOCKED');
  assert.ok(report.steps.some(s=>s.status==='NOT_RUN'));
 }
 assert.equal(report.nativeBuild,'NOT_RUN');assert.equal(report.deviceMedia,'NOT_RUN');
});

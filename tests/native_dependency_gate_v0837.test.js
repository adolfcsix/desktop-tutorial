'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,existsSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');
const root=join(__dirname,'..');
const p=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
const doctor=()=>import('../scripts/doctor_native.mjs');

test('v0.8.40 SDK 58: React DOM, RSC override and local doctor are pinned',async()=>{
 const pkg=p('mobile/package.json');const {assessReactPins,assessNativeConfig}=await doctor();
 assert.deepEqual(assessReactPins({dependencies:pkg.dependencies,overrides:pkg.overrides}).map(x=>x.status),['PASS','PASS']);
 assert.equal(pkg.devDependencies['expo-doctor'],'1.21.6');
 assert.equal(pkg.scripts.doctor,'expo-doctor');
 assert.equal(pkg.scripts['sdk:check'],'expo install --check');
 const checks=assessNativeConfig({app:p('mobile/app.json'),packageJson:pkg,rootPackage:p('package.json'),eas:p('mobile/eas.json'),apiUrl:'',lockfilePresent:false});
 assert.equal(checks.find(x=>x.id==='doctor-local').status,'PASS');
});

test('v0.8.40 SDK 58: mismatched peer pairs fail without force/legacy flags',async()=>{
 const {assessReactPins}=await doctor();
 assert.equal(assessReactPins({dependencies:{react:'19.3.0','react-dom':'19.3.1'},overrides:{'react-server-dom-webpack':'19.3.0'}})[0].status,'FAIL');
 assert.equal(assessReactPins({dependencies:{react:'19.3.0','react-dom':'19.3.0'},overrides:{'react-server-dom-webpack':'19.3.1'}})[1].status,'FAIL');
 assert.doesNotMatch(readFileSync(join(root,'scripts/verify_native.mjs'),'utf8'),/['"]--force['"]|['"]--legacy-peer-deps['"]/);
});

test('v0.8.40 SDK 58: removed StatusBar props and legacy APIs rejected',async()=>{
 const {assessSdk58Source}=await doctor();
 const app=readFileSync(join(root,'mobile/App.tsx'),'utf8');
 assert.equal(assessSdk58Source(app).status,'PASS');
 assert.match(app,/<StatusBar\s+barStyle=/);
 for(const bad of ['<StatusBar backgroundColor="red"/>','<StatusBar translucent/>','<Modal animated={true}/>','InteractionManager.runAfterInteractions(x)','from "react-native/Libraries/StyleSheet"']){
  assert.equal(assessSdk58Source(bad).status,'FAIL',bad);
 }
});

test('v0.8.40 SDK 58: package-lock integrity checks real packages, not guessed lock entries',async()=>{
 const {assessLockIntegrity}=await doctor();
 const pkg=p('mobile/package.json');
 assert.equal(assessLockIntegrity(null,pkg).status,'WARN');
 const lock={lockfileVersion:3,packages:{'':{name:pkg.name,version:pkg.version,dependencies:pkg.dependencies,devDependencies:structuredClone(pkg.devDependencies)}}};
 assert.equal(assessLockIntegrity(lock,pkg).status,'PASS');
 lock.packages[''].devDependencies['expo-doctor']='1.0.0';
 assert.equal(assessLockIntegrity(lock,pkg).status,'FAIL');
});

test('v0.8.40 never reports Native ready while dependencies or lockfile are missing',async()=>{
 // Test real workspace prerequisites; do not access network or generate fake locks.
 if(existsSync(join(root,'mobile/node_modules/expo/package.json'))&&existsSync(join(root,'mobile/package-lock.json')))return;
 const r=spawnSync('node',['scripts/verify_native.mjs','--json'],{cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(r.status,1);
 const info=JSON.parse(r.stdout);
 assert.equal(info.technicalGate,'BLOCKED');
 assert.ok(info.steps.some(x=>x.status==='NOT_RUN'));
 assert.equal(info.nativeBuild,'NOT_RUN');
 assert.equal(info.deviceMedia,'NOT_RUN');
});

test('v0.8.40 versions match root, server, Expo and app health',()=>{
 const version=p('package.json').version;
 for(const file of ['package.json','mobile/package.json','server/package.json'])assert.equal(p(file).version,version,file);
 assert.equal(p('mobile/app.json').expo.version,version);
 const backend=readFileSync(join(root,'server/index.js'),'utf8');
 assert.ok(backend.includes(`version:'${version}'`));
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {join}=require('node:path');
const root=join(__dirname,'..');
const doctor=()=>import('../scripts/doctor_native.mjs');

test('v0.8.40 native doctor evaluates real project configuration without a phone or credentials',async()=>{
 const {inspectNativeProject}=await doctor();
 const result=inspectNativeProject({root,apiUrl:''});
 assert.equal(result.version,require('../package.json').version);
 assert.equal(result.status,'WARN');
 assert.equal(result.checks.find(x=>x.id==='dev-client').status,'PASS');
 assert.equal(result.checks.find(x=>x.id==='eas-profile').status,'PASS');
 assert.equal(result.checks.find(x=>x.id==='api-url').status,'WARN');
 assert.ok(result.limitations.some(x=>x.includes('hai thiết bị')));
});
test('v0.8.40 native doctor rejects unusable physical-device API origins',async()=>{
 const {assessApiUrl}=await doctor();
 for(const value of [
  'http://localhost:8787','http://127.0.0.1:8787','http://8.8.8.8:8787',
  'https://user:pass@host.net','https://host.net/api','file:///tmp/host',
  'https://your-tuttt-test-api.example.com','https://host.net/?secret=1'
 ]) assert.equal(assessApiUrl(value).status,'FAIL',value);
 assert.equal(assessApiUrl('http://192.168.1.2:8787').status,'WARN');
 assert.equal(assessApiUrl('https://staging.tuttt-app.vn').status,'PASS');
});
test('v0.8.40 native doctor identifies missing critical device declarations and plugin',async()=>{
 const {assessNativeConfig}=await doctor();
 const ok={expo:{version:'0.8.40',plugins:['@livekit/react-native-expo-plugin','@config-plugins/react-native-webrtc'],
  android:{package:'com.private.tuttt',permissions:['android.permission.RECORD_AUDIO','android.permission.CAMERA']},
  ios:{bundleIdentifier:'com.private.tuttt',infoPlist:{NSCameraUsageDescription:'Bật camera',NSMicrophoneUsageDescription:'Bật mic'}}}};
 const pkg={version:'0.8.40',dependencies:{expo:'58.0.19',react:'19.3.0','react-dom':'19.3.0','react-native':'0.88.0','@livekit/react-native-expo-plugin':'1.1.0','@config-plugins/react-native-webrtc':'15.0.2','expo-dev-client':'58'},overrides:{'react-server-dom-webpack':'19.3.0'},devDependencies:{'expo-doctor':'1.21.6'},scripts:{start:'expo start --dev-client',doctor:'expo-doctor'}};
 const eas={build:{development:{developmentClient:true,distribution:'internal'}}};
 const passed=assessNativeConfig({app:ok,packageJson:pkg,rootPackage:{version:'0.8.40'},eas,apiUrl:'https://staging.tuttt-app.vn',dependenciesInstalled:true});
 assert.ok(passed.every(x=>x.status==='PASS'),JSON.stringify(passed.filter(x=>x.status!=='PASS')));
 const incomplete=structuredClone(ok);incomplete.expo.plugins=[];incomplete.expo.android.permissions=[];
 const failed=assessNativeConfig({app:incomplete,packageJson:pkg,rootPackage:{version:'0.8.40'},eas,apiUrl:'https://staging.tuttt-app.vn',dependenciesInstalled:true});
 assert.ok(failed.filter(x=>x.status==='FAIL').length>=3);
});

test('v0.8.40 matrix rejects incompatible SDK and unsupported Node runtime',async()=>{
 const {assessRuntimeMatrix}=await doctor();
 const good=assessRuntimeMatrix({dependencies:{expo:'58.0.19',react:'19.3.0','react-dom':'19.3.0','react-native':'0.88.0'},nodeVersion:'22.16.0'});
 assert.ok(good.every(x=>x.status==='PASS'));
 const wrong=assessRuntimeMatrix({dependencies:{expo:'58.0.19',react:'19.2.3','react-native':'0.86.0'},nodeVersion:'20.19.0'});
 assert.equal(wrong.filter(x=>x.status==='FAIL').length,3);
});
test('v0.8.40 doctor reports a missing reproducible lockfile but never claims build readiness',async()=>{
 const {inspectNativeProject}=await doctor();
 const info=inspectNativeProject({root,apiUrl:''});
 assert.equal(info.checks.find(x=>x.id==='lockfile').status,'WARN');
 assert.equal(info.checks.find(x=>x.id==='sdk:expo').status,'PASS');
 assert.ok(info.limitations.some(x=>x.includes('TypeScript semantic')));
});

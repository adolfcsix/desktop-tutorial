'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
let modulePromise;
const load=()=>modulePromise ||= import('../scripts/preflight_staging.mjs');

test('staging preflight rejects local and credential-bearing or non-HTTPS endpoints',async()=>{
 const {safeStagingUrl}=await load();
 for(const url of ['http://staging.example.com','https://localhost','https://127.0.0.1','https://192.168.1.4','https://app.local','https://staging.example.com:8443','https://user:password@staging.example.com','https://staging.example.com/path','https://staging.example.com/?token=secret']){
  assert.throws(()=>safeStagingUrl(url),Error,url);
 }
 assert.equal(safeStagingUrl('https://staging.example.com/'),'https://staging.example.com');
});

test('staging preflight verifies web + API identity without secrets or writes',async()=>{
 const {checkStaging}=await load();
 const requests=[];
 const fetcher=async (url,options)=>{
  requests.push({url,options});
  if(url.endsWith('/api/health'))return {ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({status:'ok',features:['livekit-sfu-gateway'],version:'0.8.27',livekitConfigured:false})};
  return {ok:true,status:200,headers:{get:()=> 'text/html'},text:async()=>'<title>Túttt — Ivory / Espresso</title>'};
 };
 const result=await checkStaging({webUrl:'https://staging.example.com',apiUrl:'https://api.example.com',fetcher,requiredVersion:'0.8.27'});
 assert.equal(result.status,'PASS');assert.equal(result.livekitConfigured,false);
 assert.deepEqual(requests.map(x=>x.url),['https://staging.example.com/','https://api.example.com/api/health']);
 assert.ok(requests.every(x=>x.options.redirect==='error'));
 assert.ok(requests.every(x=>!JSON.stringify(x.options).includes('secret')));
});

test('staging preflight refuses API version mismatch and unrelated web page',async()=>{
 const {checkStaging}=await load();
 const website=(title)=>async(url)=>url.endsWith('/health')?
  {ok:true,headers:{get:()=> 'application/json'},json:async()=>({status:'ok',features:['livekit-sfu-gateway'],version:'0.8.26'})}:
  {ok:true,headers:{get:()=> 'text/html'},text:async()=>title};
 await assert.rejects(checkStaging({webUrl:'https://web.example.com',apiUrl:'https://api.example.com',fetcher:website('<title>Túttt</title>'),requiredVersion:'0.8.27'}),/Sai phiên bản/);
 await assert.rejects(checkStaging({webUrl:'https://web.example.com',apiUrl:'https://api.example.com',fetcher:website('<title>Other</title>')}),/Túttt hợp lệ/);
});

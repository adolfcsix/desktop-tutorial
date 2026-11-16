#!/usr/bin/env node
/** Read-only preflight for an explicitly supplied PUBLIC HTTPS staging deployment.
 * It does not deploy, log in, start LiveKit, or test media.
 * TinyFish can only browse a staging site after both endpoints are accessible.
 */
import {isIP} from 'node:net';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function safeStagingUrl(raw,label='URL'){
 if(typeof raw!=='string'||!raw.trim())throw Error(`Thiếu ${label}`);
 let url;try{url=new URL(raw);}catch{throw Error(`${label} không hợp lệ`);}
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error(`${label} phải là HTTPS, không có mật khẩu, query hay fragment`);
 const hostname=url.hostname.toLowerCase().replace(/^\[|\]$/g,'');
 if(isIP(hostname) || !hostname.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(hostname)||hostname==='0.0.0.0')throw Error(`${label} cần là tên miền HTTPS công khai, không phải IP/localhost/LAN`);
 if(url.port && url.port!=='443')throw Error(`${label} chỉ hỗ trợ cổng HTTPS mặc định`);
 if(url.pathname!=='/'&&url.pathname!=='')throw Error(`${label} phải là URL gốc tên miền`);
 return url.origin;
}
export async function checkStaging({webUrl,apiUrl,fetcher=fetch,requiredVersion}={}){
 const web=safeStagingUrl(webUrl,'Web staging');
 const api=safeStagingUrl(apiUrl,'API staging');
 const opts={redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'text/html,application/json'}};
 const [page,health]=await Promise.all([
  fetcher(web+'/',opts),fetcher(api+'/api/health',opts)
 ]);
 if(!page.ok)throw Error(`Web staging HTTP ${page.status}`);
 if(!health.ok)throw Error(`API staging HTTP ${health.status}`);
 const type=page.headers?.get?.('content-type')||'';
 const markup=await page.text();
 if(!/html/i.test(type)||!/Túttt|TÚTTT|TUTTT/i.test(markup)||markup.length>2_000_000)throw Error('Web staging chưa trả về giao diện Túttt hợp lệ');
 const apiType=health.headers?.get?.('content-type')||'';
 if(apiType&&!/json/i.test(apiType))throw Error('API /api/health không trả về JSON');
 const data=await health.json();
 if(data?.status!=='ok'||!Array.isArray(data.features)||!data.features.includes('livekit-sfu-gateway'))throw Error('API không nhận diện là Túttt LiveKit');
 if(requiredVersion && data.version!==requiredVersion)throw Error(`Sai phiên bản API: cần ${requiredVersion}, nhận ${String(data.version||'không rõ')}`);
 return {status:'PASS',web,api,apiVersion:data.version,livekitConfigured:!!data.livekitConfigured,
  note:'Chỉ xác nhận HTTPS và nội dung web/API có thể truy cập; chưa kiểm tra SFU xác thực, media hai chiều hoặc TinyFish thực hiện thao tác'};
}
if(fileURLToPath(import.meta.url)===resolve(process.argv[1]||'')){
 const value=name=>{const i=process.argv.indexOf(name);return i<0?'':(process.argv[i+1]||'');};
 try{
  const outcome=await checkStaging({webUrl:value('--web'),apiUrl:value('--api'),requiredVersion:value('--version')||undefined});
  console.log(`PASS — Web ${outcome.web}; API ${outcome.api}; version ${outcome.apiVersion}`);
  console.log(outcome.livekitConfigured?'LiveKit: có cấu hình (SFU và media chưa xác thực)':'LiveKit: chưa cấu hình');
  console.log(outcome.note);
 }catch(error){console.error(`FAIL — ${error.message}`);process.exitCode=1;}
}

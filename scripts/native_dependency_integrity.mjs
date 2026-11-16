/** Verify real npm output. These checks never create or synthesize a lockfile.
 * This is a prerequisite to (not a replacement for) npm ci, expo-doctor and tsc.
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const isExactVersion = spec => /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(spec);
function versionAllowed(spec, version) {
  if (isExactVersion(spec)) return spec === version;
  const match=/^([~^])(\d+)\.(\d+)\.(\d+)$/.exec(spec);
  if(!match) return false; // fail closed on unsupported specifiers
  const [,operator, major, minor, patch] = match;
  // Stable semver ranges must not silently accept pre-release binaries.
  const installed=/^(\d+)\.(\d+)\.(\d+)$/.exec(version||'');
  if(!installed)return false;
  const [a,b,c]=[+major,+minor,+patch], [x,y,z]=installed.slice(1).map(Number);
  if(x!==a)return false;
  if(operator==='~')return y===b&&z>=c;
  // npm caret semantics for 0.x versions
  if(a===0)return b===0? y===0&&z===c : y===b&&z>=c;
  return (y>b)||(y===b&&z>=c);
}
const allDirect = pkg => ({...pkg.dependencies,...pkg.devDependencies});
const record = (id,status,detail) => ({id,status,detail});
function loadJson(path){try{return JSON.parse(readFileSync(path,'utf8'));}catch{return null;}}
export function inspectNpmLock(lock,pkg){
 if(!lock)return record('npm-lock','BLOCKED','Chưa có package-lock.json do npm tạo');
 if(lock.lockfileVersion!==3||!lock.packages||!lock.packages[''])return record('npm-lock','FAIL','Lockfile không phải npm lock v3 đầy đủ');
 const root=lock.packages[''];
 if(root.name!==pkg.name||root.version!==pkg.version)return record('npm-lock','FAIL','Tên/phiên bản ứng dụng trong lockfile không khớp package.json');
 for(const group of ['dependencies','devDependencies'])for(const [name,spec] of Object.entries(pkg[group]||{})){
  if(root[group]?.[name]!==spec)return record('npm-lock','FAIL',`Đã thay đổi ${group}.${name} nhưng chưa cập nhật lockfile`);
  const entry=lock.packages[`node_modules/${name}`];
  if(!entry||!versionAllowed(spec,entry.version))return record('npm-lock','FAIL',`Lockfile thiếu phiên bản đã phân giải hợp lệ cho ${name}@${spec}`);
  if(!entry.link && !entry.resolved && !entry.integrity)return record('npm-lock','FAIL',`Lockfile thiếu metadata xuất xứ cho ${name}`);
 }
 return record('npm-lock','PASS','Lockfile npm v3 có đủ gói trực tiếp và phiên bản đã phân giải');
}
export function inspectInstalledTree(pkg, mobileDir){
 for(const [name,spec] of Object.entries(allDirect(pkg))){
  const path=join(mobileDir,'node_modules',name,'package.json');
  if(!existsSync(path))return record('installed-tree','BLOCKED',`Thiếu node_modules/${name}`);
  const installed=loadJson(path);
  if(!installed||installed.name!==name||!versionAllowed(spec,installed.version))
   return record('installed-tree','FAIL',`Phiên bản ${name} cài trên máy không khớp ${spec} (đang có: ${installed?.version||'unknown'})`);
 }
 return record('installed-tree','PASS','Các dependencies trực tiếp đã cài đúng phiên bản khai báo');
}
export function npmErrorMessage(output='',code=''){
 const s=String(output);
 if(/EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(s)||code==='EAI_AGAIN')return 'NETWORK_DNS: Không phân giải được npm registry; cần sửa DNS/Internet trước khi chạy lại';
 if(/ENOTCACHED|cache mode is 'only-if-cached'/i.test(s))return 'CACHE_MISS: npm cache chưa có đầy đủ gói; cần tải từ registry trên máy có mạng';
 if(/ETIMEDOUT|ECONNRESET|network timeout/i.test(s))return 'NETWORK_TIMEOUT: npm registry không phản hồi; kiểm tra mạng hoặc proxy';
 if(/ERESOLVE|unable to resolve dependency tree/i.test(s))return 'ERESOLVE: Xung đột peer; kiểm tra Expo/LiveKit/React, không dùng --force hoặc --legacy-peer-deps';
 if(/EBADENGINE|Unsupported engine/i.test(s))return 'ENGINE: Phiên bản Node/npm chưa đáp ứng yêu cầu';
 if(/EINTEGRITY/i.test(s))return 'INTEGRITY: Không khớp checksum; kiểm tra npm cache và lockfile';
 return code?`NPM_FAILURE: ${code}`:'NPM_FAILURE: xem nhật ký npm trên máy phát triển';
}

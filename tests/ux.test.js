const test=require('node:test');
const assert=require('node:assert/strict');
const {normalize,matchesRoom,filterRooms,recommendedRooms}=require('../prototype/ux-core.js');
const rooms=[{id:'a',title:'Chuyện đêm khuya',subtitle:'Tâm sự bình yên',tag:'Tâm sự',host:'Linh',featured:true},{id:'b',title:'Học tiếng Anh',subtitle:'Cùng luyện tập',tag:'Học tập',host:'Nam'},{id:'c',title:'Chuyện vui mỗi ngày',subtitle:'Tối nay',tag:'Kết bạn',host:'Minh'}];
test('Vietnamese search is accent and case tolerant',()=>{
 assert.equal(normalize('  TÂM SỰ  '),'tam su');
 assert.deepEqual(filterRooms(rooms,'Tất cả','chuyen').map(r=>r.id),['a','c']);
 assert.deepEqual(filterRooms(rooms,'Tất cả','HOC Tieng').map(r=>r.id),['b']);
});
test('all search terms must match within the room metadata',()=>{
 assert.equal(matchesRoom(rooms[0],'Tất cả','dem linh'),true);
 assert.equal(matchesRoom(rooms[0],'Tất cả','dem nam'),false);
});
test('topic filter and empty rooms do not throw',()=>{
 assert.deepEqual(filterRooms(rooms,'Học tập','').map(r=>r.id),['b']);
 assert.deepEqual(filterRooms(undefined,'Tất cả',''),[]);
 assert.deepEqual(filterRooms(rooms,'Âm nhạc','x'),[]);
});
test('recommendations do not hide a room if there is no featured room',()=>{
 assert.deepEqual(recommendedRooms(rooms).map(r=>r.id),['b','c']);
 assert.deepEqual(recommendedRooms(rooms.slice(1)).map(r=>r.id),['b','c']);
});

const fs=require('node:fs');
const path=require('node:path');
test('index references the search helper before app boot',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../prototype/index.html'),'utf8');
 assert.ok(html.indexOf('ux-core.js')>0 && html.indexOf('ux-core.js')<html.indexOf('app.js'));
 const server=fs.readFileSync(path.join(__dirname,'../server/index.js'),'utf8');
 assert.ok(server.includes("'/ux-core.js'"),'UX helper must be in the static allowlist');
});
test('all form submission flows clear the draft after successful send',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
 assert.match(app,/if\(form\.id==='chat-send'\).*?form\.reset\(\)/s);
 assert.match(app,/if\(form\.id==='room-send'\).*?await net\.send\(state\.roomId,text\);form\.reset\(\)/s);
});

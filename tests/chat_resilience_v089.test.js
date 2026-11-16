'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{readFileSync}=require('node:fs'),{join}=require('node:path');
const read=file=>readFileSync(join(__dirname,'..',file),'utf8');
test('Live Chat reuses server message UUID nodes and never rewrites the entire chat box',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/function updateLiveChatDom\(\)/);
 assert.match(app,/existing=new Map\(/);
 assert.match(app,/node\.dataset\.chatId=id/);
 assert.match(app,/node\.parentNode!==box\|\|node\.nextSibling!==next/);
 assert.match(app,/box\.insertBefore\(node,next\)/);
 assert.match(app,/node\.textContent=m\.name\+': '\+m\.text/);
 assert.doesNotMatch(app,/\.room-chatbox\.innerHTML\s*=/);
});
test('SSE room.changed bursts coalesce and stale room replies are ignored',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/let roomMessageSync=null/);
 assert.match(app,/if\(roomMessageSync\?\.room===room\)\{roomMessageSync\.dirty=true/);
 assert.match(app,/if\(roomMessageSync!==job\|\|state\.roomId!==room/);
 assert.match(app,/\}while\(job\.dirty\)/);
 assert.match(app,/roomMessageSync=null;\s*render\(\)/);
});
test('Control signalling loss does not equate to mic disconnection; room state is restored on SSE open',()=>{
 const app=read('prototype/app.js');
 assert.match(app,/Tín hiệu điều khiển tạm gián đoạn\. Âm thanh có thể vẫn hoạt động/);
 assert.match(app,/camStatus\.dataset\.signalNormalText/);
 assert.match(app,/stream\.addEventListener\('open'/);
 assert.match(app,/void syncRoomMessages\(\); \/\/ missed room\.changed events/);
 assert.match(app,/if\(voice\.roomId===state\.roomId\)void voice\.refresh\(\)/);
});

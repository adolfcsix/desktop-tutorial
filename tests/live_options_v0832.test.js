'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const read=name=>readFileSync(path.join(__dirname,'..',name),'utf8');
const web=read('prototype/app.js');
const screen=read('mobile/src/screens/Screens.tsx');
const duel=read('mobile/src/components/PKDuelBoard.tsx');
const panel=read('mobile/src/components/PKPanel.tsx');
const api=read('mobile/src/services/api.ts');

test('Live Voice and Cam expose one shared top-level options menu, PK stage has no duplicate',()=>{
 assert.equal((web.match(/data-action="liveOptions" aria-label="Tùy chọn Live"/g)||[]).length,2);
 assert.doesNotMatch(web,/data-action="roomMore"|class="pk-menu"/);
 assert.doesNotMatch(web,/cam-manage-shortcut/);
 assert.equal((screen.match(/accessibilityLabel="Tùy chọn Live"/g)||[]).length,1);
 assert.doesNotMatch(screen,/⚙ Quản lý/);
 assert.doesNotMatch(duel,/•••|onManage/);
});
test('Host and moderator management is gated; viewers keep report and PK results',()=>{
 assert.match(web,/const canManage=room\?\.type==='cam'&&state\.liveReady&&\['host','moderator'\]/);
 assert.match(web,/if\(!state\.liveReady\|\|room\?\.type!=='cam'\|\|!\['host','moderator'\]/);
 assert.match(screen,/\{isManager\?<Pressable accessibilityRole="button" accessibilityLabel="Quản lý phòng"/);
 assert.match(screen,/sheet==='manage'&&isManager/);
 assert.match(web,/row\('roomReport','Báo cáo phòng'/);
 assert.match(screen,/accessibilityLabel="Báo cáo phòng"/);
 assert.match(web,/activePk\?row\('pkOpen','PK & kết quả'/);
 assert.match(screen,/pkActive\?<Pressable accessibilityRole="button" accessibilityLabel="PK và kết quả"/);
});
test('Report is a real backend action with validation, not a dead-end UI',()=>{
 assert.match(api,/reportRoom:\(roomId:string,reason:string\)=>call<\{submitted:boolean;reportId:string;status:string;duplicate:boolean\}>\('\/reports','POST',\{roomId,reason\}\)/);
 assert.match(screen,/const reason=reportReason\.trim\(\)/);
 assert.match(screen,/reason\.length<8\|\|reason\.length>250/);
 assert.match(screen,/const receipt=await tutttApi\.reportRoom\(r\.id,reason\)/);
 assert.match(screen,/receipt\.reportId\.slice\(0,8\)/);
 assert.match(web,/form\.id==='room-report'/);
 assert.match(read('server/index.js'),/pathname==='\/api\/reports'&&req\.method==='POST'/);
});
test('PK panel is opened from the shared room menu without remounting media',()=>{
 assert.match(screen,/setPkOptionsRequest\(n=>n\+1\)/);
 assert.match(screen,/optionsOpenRequest=\{pkOptionsRequest\}/);
 assert.match(panel,/if\(optionsOpenRequest>0\)setOpen\(true\)/);
 assert.match(panel,/<PKDuelBoard match=\{m\}/);
 assert.doesNotMatch(panel,/onManage=/);
});

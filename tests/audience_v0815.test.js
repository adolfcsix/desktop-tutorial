'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('audience uses room presence, not only members connected to a live audio session',()=>{
 const server=read('server/storage.js'),app=read('prototype/app.js'),net=read('prototype/network.js');
 assert.match(server,/audience\(user,id/);assert.match(server,/this\.presence\.get\(id\)/);
 assert.match(app,/const view=audienceView\(r\)/);
 assert.match(app,/audienceRequestSeq\+\+/);
 assert.match(app,/if\(sequence!==audienceRequestSeq\|\|id!==state\.roomId/);
 assert.match(net,/\/audience'/);
});
test('Cam PK retains one viewer button, and Voice buttons open the same sheet',()=>{
 const app=read('prototype/app.js'),css=read('prototype/live-polish-v075.css');
 assert.match(app,/audienceMarkup\(r,'pk-viewers'\)/);
 assert.match(app,/audienceMarkup\(r,'cam-viewers'\)/);
 assert.match(app,/audienceMarkup\(r,'voice-audience'\)/);
 assert.match(css,/\.cam-stage-metrics \.cam-viewers\{display:none!important\}/);
 assert.match(app,/data-audience-sheet-body/);
 assert.doesNotMatch(app,/state\.voiceReady\?state\.voiceParticipants\.length:r\.members/);
});
test('Native uses authoritative audience API and keeps the spectator list separate from stage privileges',()=>{
 const native=read('mobile/src/screens/Screens.tsx'),api=read('mobile/src/services/api.ts'),memberList=read('mobile/src/components/AudienceMemberList.tsx');
 assert.match(native,/tutttApi\.audience\(r\.id\)/);
 assert.match(memberList,/audience\.members\.filter\(m=>!m\.onStage\)/);
 assert.match(memberList,/SectionList/);
 assert.match(native,/setSheet\('members'\)/);
 assert.match(api,/export type RoomAudience/);
 assert.match(api,/\/audience`/);
});

test('v0.8.34 spectator sheet uses virtualized SectionList instead of eager nested ScrollView rows',()=>{
 const screen=read('mobile/src/screens/Screens.tsx');
 const list=read('mobile/src/components/AudienceMemberList.tsx');
 assert.match(screen,/sheet==='members'\?<AudienceMemberList/);
 assert.match(list,/SectionList/);assert.match(list,/initialNumToRender=\{10\}/);
 assert.match(list,/maxToRenderPerBatch=\{12\}/);
 assert.match(list,/stickySectionHeadersEnabled/);
 assert.doesNotMatch(list,/<ScrollView/);
});

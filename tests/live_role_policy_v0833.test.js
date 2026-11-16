'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');const {join}=require('node:path');const vm=require('node:vm');
const ts=require('typescript');
const base=join(__dirname,'../mobile/src');
const file=readFileSync(join(base,'voice/livePermissionPolicy.ts'),'utf8');
const transpiled=ts.transpileModule(file,{fileName:'livePermissionPolicy.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const modRef={exports:{}};vm.runInNewContext(transpiled,{exports:modRef.exports,module:modRef});
const {mayManageLiveMember:manage,mayModerateLiveMember:moderate}=modRef.exports;
const host={id:'host',role:'host'},mod={id:'mod',role:'moderator'},listener={id:'user',role:'listener'};
test('v0.8.33 host actions are not available against self or host',()=>{
 assert.equal(manage('host','host',host,'host'),false);
 assert.equal(manage('moderator','mod',host,'host'),false);
 assert.equal(manage('listener','user',mod,'host'),false);
 assert.equal(manage('host','host',mod,'host'),true);
 assert.equal(moderate('host','host',mod,'host','demote'),true);
 assert.equal(moderate('host','host',listener,'host','promote'),true);
 assert.equal(moderate('host','host',listener,'host','demote'),false);
});
test('v0.8.33 moderators only manage listeners and cannot appoint moderators',()=>{
 assert.equal(manage('moderator','mod',mod,'host'),false);
 assert.equal(manage('moderator','mod',listener,'host'),true);
 assert.equal(moderate('moderator','mod',listener,'host','promote'),false);
 assert.equal(moderate('moderator','mod',listener,'host','ban'),true);
 assert.equal(moderate('moderator','mod',mod,'host','kick'),false);
 assert.equal(manage(undefined,'host',listener,'host'),false);
});
test('v0.8.33 Native role view is hidden during signalling disruption; retry is contextual',()=>{
 const screen=readFileSync(join(base,'screens/Screens.tsx'),'utf8');
 assert.match(screen,/status==='connected'&&\(me\?\.role==='host'\|\|me\?\.role==='moderator'\)/);
 assert.match(screen,/members\.filter\(m=>mayManageLiveMember/);
 assert.match(screen,/status==='error'&&onRetryLive&&realChat/);
 assert.match(screen,/accessibilityLabel="Thử kết nối lại LiveKit"/);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const src=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const compiled=ts.transpileModule(src('mobile/src/components/pkMediaEvidence.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
const moduleState={exports:{}};
vm.runInNewContext(compiled.outputText,{module:moduleState,exports:moduleState.exports});
const {pkMediaVisual}=moduleState.exports;
const base={sameRoom:true,connected:true,hostFound:true,micTrack:true,micMuted:false,activeSpeaker:false,cameraTrack:true,cameraMuted:false};
test('v0.7.0 media evidence: cross-room streams are never inferred from host names',()=>{
 const state=pkMediaVisual({...base,sameRoom:false,activeSpeaker:true});
 assert.equal(state.mic,'unknown');assert.equal(state.camera,false);assert.match(state.label,/Chưa ghép/);
});
test('v0.7.0 media evidence: offline and missing host are not presented as live',()=>{
 assert.equal(pkMediaVisual({...base,connected:false,activeSpeaker:true}).mic,'unknown');
 assert.equal(pkMediaVisual({...base,hostFound:false,activeSpeaker:true}).camera,false);
});
test('v0.7.0 media evidence: microphone status requires an unmuted publication and track',()=>{
 assert.equal(pkMediaVisual({...base,micTrack:false,activeSpeaker:true}).mic,'off');
 assert.equal(pkMediaVisual({...base,micMuted:true,activeSpeaker:true}).mic,'off');
 assert.equal(pkMediaVisual({...base}).mic,'ready');
 assert.equal(pkMediaVisual({...base,activeSpeaker:true}).mic,'speaking');
});
test('v0.7.0 media evidence: published video must have enabled track, independent of microphone',()=>{
 assert.equal(pkMediaVisual({...base,cameraMuted:true}).camera,false);
 assert.equal(pkMediaVisual({...base,cameraTrack:false}).camera,false);
 assert.equal(pkMediaVisual({...base,micMuted:true}).camera,true);
});
test('v0.7.0 native PK only subscribes to the host of its own joined LiveKit room',()=>{
 const screen=src('mobile/src/screens/Screens.tsx');const panel=src('mobile/src/components/PKPanel.tsx');const duel=src('mobile/src/components/PKDuelBoard.tsx');
 assert.match(screen,/hostId=\{roster\?\.hostId\}/);
 assert.match(screen,/activeSpeakerIds=\{\[\.\.\.activeIds\]\}/);
 assert.match(panel,/seq!==requestSeq\.current/);
 assert.match(panel,/isStale/);
 assert.match(duel,/getTrackPublication\(Track\.Source\.Microphone\)/);
 assert.match(duel,/getTrackPublication\(Track\.Source\.Camera\)/);
 assert.match(duel,/showVideo=Boolean\(local&&videoReady&&ownHost&&cameraPub\)/); 
 assert.match(duel,/Chưa (?:ghép tín hiệu đối thủ|kết nối âm thanh)/);
});
test('v0.7.0 browser PK maintains stage when sync fails and disables stale cheer',()=>{
 const app=src('prototype/app.js');const html=src('prototype/index.html');
 assert.match(app,/pkSyncError=true;updatePkNetworkStatus\(\)/);
 assert.match(app,/button\.disabled=stale/);
 assert.match(app,/pkRequestSeq/);
 assert.match(app,/pk-host-speaking/);
 assert.match(app,/localMic\?\.mic&&state\.voiceSpeakingIds\.includes/);
 assert.match(html,/pk-v070\.css/);
});
test('v0.7.0 room chat and SSE sync preserve PK stage identity',()=>{
 const app=src('prototype/app.js');
 assert.match(app,/function updateLiveChatDom\(\)/);
 assert.match(app,/if\(!updateLiveChatDom\(\)\)render\(\)/);
 assert.match(app,/updateRoomSignalDom\(\);updatePkNetworkStatus\(\)/);
 assert.match(app,/if\(syncVoiceSeatsDom\(\)\)\{updateVoiceActivityDom\(\);updateRoomSignalDom\(\);return;\}/);
 assert.match(app,/if\(nearBottom\)box\.scrollTop=box\.scrollHeight/);
});

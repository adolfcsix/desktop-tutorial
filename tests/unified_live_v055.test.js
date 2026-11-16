const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const web=fs.readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../mobile/src/screens/Screens.tsx'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../prototype/live-unified-v055.css'),'utf8');
test('camera-off stage is circular avatar, not rectangular fake video',()=>{
 assert.match(web,/cam-tile occupied avatar-only/);assert.match(css,/border-radius:50%/);
 assert.match(native,/canShow\?<VideoTrack/);assert.match(native,/overflow:canShow\?/);
 assert.match(native,/borderRadius:diameter\/2/);
});
test('removes cluttered display chooser and stage vacancy toggles on web and native',()=>{
 assert.doesNotMatch(web,/data-action="chatView"|data-action="toggleVacantCams"|cam-view-switch/);
 assert.doesNotMatch(native,/viewMode|showVacantCams|setViewMode|setShowVacantCams/);
});
test('stage preserves separate chat pane and media permission gates',()=>{
 assert.match(web,/cam-chat-history/);assert.match(native,/Track.Source.Camera/);
 assert.match(web,/inviteAnswer/);assert.match(native,/onRespondInvite/);
});

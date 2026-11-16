const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const hex=s=>s.match(/#[0-9a-fA-F]{6}/g)||[];
const channel=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const luminance=hex=>{const [r,g,b]=[1,3,5].map(i=>channel(parseInt(hex.slice(i,i+2),16)/255));return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{let [x,y]=[luminance(a),luminance(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};

test('Ivory PK Cam uses brand room chrome, but preserves a readable cinematic media layer',()=>{
 const css=read('prototype/pk-v073.css');
 assert.match(css,/--pk-stage:#F4EAE0;--pk-ink:#241B1C;--pk-muted:#6B5753/);
 assert.doesNotMatch(css,/#D5C0B2/);
 assert.match(css,/\.pk-duel-side:after\{background:linear-gradient\(180deg,#382623A3/);
 assert.match(css,/\.cam-compose input\{\s*background:var\(--surface\)!important;color:var\(--ink\)!important/);
 assert.ok(ratio('#241B1C','#F4EAE0')>=7);
});
test('Ivory and Espresso PK Voice shells share the application color family',()=>{
 const css=read('prototype/pk-voice-v077.css');
 assert.match(css,/body\.light-mode #app:has\(\.room-top \.pk-broadcast-voice\)\{--pk-stage:#F4EAE0/);
 assert.match(css,/body:not\(\.light-mode\) #app:has\(\.room-top \.pk-broadcast-voice\)\{--pk-stage:#1F1819/);
 assert.match(css,/--voice-surface-a:#523C40/);
});
test('Native room, PK and system controls respect the same selected scheme',()=>{
 const screen=read('mobile/src/screens/Screens.tsx');
 const duel=read('mobile/src/components/PKDuelBoard.tsx');
 const app=read('mobile/App.tsx');
 assert.match(screen,/const roomBg=c\.bg/);
 assert.match(screen,/const roomInk=c\.ink/);
 assert.doesNotMatch(screen,/pkActive\?pkTone\.stage:c\.bg/);
 assert.match(duel,/stage:palette\.bg/);
 assert.match(app,/Appearance\.setColorScheme\(theme\)/);
 assert.match(duel,/backgroundColor:ivory\?\(side\.key==='A'\?'#CAB7A8':'#DAC9B3'\)/);
});
test('All metadata, including Expo, match the root release',()=>{
 const expected=JSON.parse(read('package.json')).version;
 assert.match(expected,/^0\.8\.\d+$/);
 assert.equal(JSON.parse(read('mobile/package.json')).version,expected);
 assert.equal(JSON.parse(read('mobile/app.json')).expo.version,expected);
 assert.ok(read('prototype/index.html').includes('v'+expected));
 assert.ok(read('server/index.js').includes("version:'"+expected+"'"));
});

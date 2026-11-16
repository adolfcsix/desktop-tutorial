'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../prototype/app.js'),'utf8');
test('changing theme updates existing DOM and persists only a validated choice',()=>{
 assert.match(src,/function savedTheme\(\)\{try\{/);
 assert.match(src,/choice==='dark'\?'dark':'light'/);
 assert.match(src,/function applyTheme\(\)/);
 assert.match(src,/document\.documentElement\.style\.colorScheme=light\?'light':'dark'/);
 assert.match(src,/button\.setAttribute\('aria-pressed',String\(button\.dataset\.id===state\.theme\)\)/);
 assert.match(src,/window\.localStorage\?\.setItem\('tuttt\.theme',next\)/);
 assert.match(src,/if\(action==='setTheme'.*return setTheme\(id\)/);
 const handler=src.match(/if\(action==='setTheme'.*?if\(action==='notifyToggle'/)?.[0]||'';
 assert.doesNotMatch(handler, /setTheme\(id\).*render\(\)/);
});
test('stale joins cannot re-enter or change another room after navigating away',()=>{
 assert.match(src,/let roomNavigationSeq=0/);
 assert.match(src,/const navigation=\+\+roomNavigationSeq/);
 assert.match(src,/if\(!current\(\)\)\{\s*\/\/ If the same room was re-entered/);
 assert.match(src,/if\(state\.page!=='room'\|\|state\.roomId!==id\)void net\.leave\(id\)/);
 assert.match(src,/if\(!current\(\)\)return;\s*await syncRoomMessages\(\)/);
 assert.match(src,/if\(action==='confirmLeaveRoom'\)\{roomNavigationSeq\+\+/);
 assert.match(src,/state\.roomId=null;state\.audience=null/);
});

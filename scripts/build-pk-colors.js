#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const {palettes}=JSON.parse(fs.readFileSync(path.join(root,'brand/pk-color-system.json'),'utf8'));
const kebab=s=>s.replace(/([a-z])([A-Z])/g,'$1-$2').replace(/([A-Z])([A-Z][a-z])/g,'$1-$2').toLowerCase();
let css='/* GENERATED — scripts/build-pk-colors.js / brand/pk-color-system.json — do not hand-edit. */\n';
for(const [mode,colors] of Object.entries(palettes)){css+=(mode==='light'?'body.light-mode':'body:not(.light-mode)')+'{\n';for(const [key,value] of Object.entries(colors))css+=`  --pk-${kebab(key)}:${value};\n`;css+='}\n';}
const ts='// GENERATED — scripts/build-pk-colors.js / brand/pk-color-system.json — do not hand-edit.\nexport const PK_COLORS = '+JSON.stringify(palettes,null,2)+' as const;\n';
const outputs=[['prototype/pk-colors.generated.css',css],['mobile/src/theme/pkColors.ts',ts]];
let valid=true;for(const [rel,content] of outputs){const dest=path.join(root,rel);if(process.argv.includes('--check')){if(!fs.existsSync(dest)||fs.readFileSync(dest,'utf8')!==content){console.error('OUT OF SYNC',rel);valid=false;}}else{fs.writeFileSync(dest,content);console.log('GENERATED',rel);}}
if(!valid)process.exitCode=1;

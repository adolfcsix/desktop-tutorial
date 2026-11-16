"""Chromium regression: theme changes in place, persisted scheme and stale room joins.

This is not a WebRTC two-device/real Bluetooth test.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'qa-v0821';OUT.mkdir(parents=True,exist_ok=True)
VERSION=json.loads((ROOT/'package.json').read_text())['version']
HTML=ROOT.parent/f'TUTTT_V{VERSION.replace(".","_")}_PREVIEW.html'

async def theme_cases(browser,origin):
 results=[]
 for width,height,mode in [(320,740,'voice'),(390,844,'voice'),(390,844,'cam'),(430,932,'cam')]:
  ctx=await browser.new_context(viewport={'width':width,'height':height})
  page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   # Chromium in this environment blocks local HTTP; test the exact exported HTML.
   # A storage shim supplies the same synchronous getItem/setItem contract on about:blank.
   await page.evaluate("""() => {window.__prefs={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>window.__prefs[k]||null,setItem:(k,v)=>window.__prefs[k]=String(v)}})}""")
   await page.set_content(HTML.read_text(),wait_until='domcontentloaded')
   await page.locator('[data-action="tab"][data-id="profile"]').click()
   await page.locator('[data-action="settings"]').click()
   dark=page.locator('[data-action="setTheme"][data-id="dark"]')
   await dark.focus()
   await page.evaluate("window.__themeNode=document.querySelector('[data-action=\"setTheme\"][data-id=\"dark\"]'); window.__oldRoot=document.getElementById('app').firstElementChild")
   await dark.click()
   assert await page.evaluate('document.querySelector("[data-action=setTheme][data-id=dark]")===window.__themeNode')
   assert await dark.get_attribute('aria-pressed')=='true'
   assert await page.evaluate('document.documentElement.style.colorScheme')=='dark'
   assert await page.evaluate('localStorage.getItem("tuttt.theme")')=='dark'
   assert await page.evaluate('document.getElementById("app").firstElementChild===window.__oldRoot')
   await page.set_content(HTML.read_text(),wait_until='domcontentloaded')
   assert await page.evaluate('!document.body.classList.contains("light-mode")'), 'dark choice not restored'
   await page.locator('[data-action="tab"][data-id="live"]').first.click()
   if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
   await page.locator('[data-action="pkOpen"]').first.click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   editor=page.locator('.cam-compose input' if mode=='cam' else '.room-compose input')
   await editor.fill('Bản nháp không được mất khi đổi chủ đề')
   await page.evaluate('''() => {
     window.__editor=document.querySelector('.cam-compose input,.room-compose input');
     window.__stage=document.querySelector('.pk-battle-scene');
     window.__top=document.querySelector('.cam-topbar,.room-topbar');
     const action=document.createElement('button');action.dataset.action='theme';action.id='qa-toggle-theme';action.hidden=true;
     document.getElementById('app').appendChild(action);
     action.click(); action.remove();
   }''')
   assert await page.evaluate('document.body.classList.contains("light-mode")')
   assert await page.evaluate('document.querySelector(".cam-compose input,.room-compose input")===window.__editor')
   assert await page.evaluate('document.querySelector(".pk-battle-scene")===window.__stage')
   assert await page.evaluate('document.querySelector(".cam-topbar,.room-topbar")===window.__top')
   assert await editor.input_value()=='Bản nháp không được mất khi đổi chủ đề'
   assert '1.240' in await page.locator('[data-pk-points="A"]').inner_text()
   assert '%' not in await page.locator('.pk-balance-legends').inner_text()
   assert await page.evaluate('document.documentElement.style.colorScheme')=='light'
   if width==390:
    await page.screenshot(path=str(OUT/f'{mode}-390-ivory-switched-in-place.png'))
   # Change back while audience dialog is open: keep the actual DOM/dialog/focus.
   await page.locator('.audience-trigger:visible').first.click()
   await page.evaluate('''() => {
     window.__dialog=document.querySelector('[role="dialog"]');
     window.__stage=document.querySelector('.pk-battle-scene');
     const button=document.createElement('button');button.dataset.action='theme';button.hidden=true;
     document.getElementById('app').appendChild(button);button.click();button.remove();
   }''')
   assert await page.evaluate('document.querySelector("[role=dialog]")===window.__dialog')
   assert await page.evaluate('document.querySelector(".pk-battle-scene")===window.__stage')
   assert await page.evaluate('document.documentElement.style.colorScheme')=='dark'
   await page.keyboard.press('Escape')
   assert await editor.input_value()=='Bản nháp không được mất khi đổi chủ đề'
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   assert not errors,(mode,width,errors)
   if width==390:await page.screenshot(path=str(OUT/f'{mode}-390-espresso-restored.png'))
   results.append({'width':width,'mode':mode,'persisted':True,'pk_stable':True,'chat_draft':True,'audience_stable':True})
   print('PASS theme',width,mode,flush=True)
  finally:await ctx.close()
 return results

# Create two server rooms, postpone the first join and navigate to another one.
FAKE='''() => {
 const a={id:'room-A',type:'cam',title:'Phòng A',subtitle:'Thử A',tag:'Tâm sự',host:'Mây',hostId:'h',members:1,color:'violet',art:'✳',speakers:[]};
 const b={id:'room-B',type:'cam',title:'Phòng B',subtitle:'Thử B',tag:'Tâm sự',host:'Hạ',hostId:'h',members:1,color:'peach',art:'✳',speakers:[]};
 window.__left=[];window.__resolveA=null;
 class TestEventSource{constructor(){queueMicrotask(()=>this.handlers?.open?.forEach(x=>x({})))}handlers={};addEventListener(k,f){(this.handlers[k]??=[]).push(f)}close(){}}
 window.EventSource=TestEventSource;
 window.TutttNetwork={
 session:async()=>({user:{id:'h',name:'Mây'}}),rooms:async()=>({rooms:[a,b]}),
 join:async id=>id==='room-A'?await new Promise(r=>window.__resolveA=r):{room:b},
 leave:async id=>(window.__left.push(id),{}),
 audience:async id=>({roomId:id,count:1,members:[{id:'h',name:'Mây',role:'host',onStage:true}]}),
 liveToken:async()=>{throw new Error('No SFU')},
 messages:async()=>({messages:[]}),pkSnapshot:async id=>({roomId:id,host:true,match:null,invites:[],available:[],recent:[]}),
 liveHeartbeat:async()=>({members:[]})};
}'''

async def stale_join_case(browser):
 from browser_room_v075 import base,styles,scripts
 import re
 page=await browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  await page.set_content(base,wait_until='domcontentloaded')
  for name in styles:
   css=(ROOT/'prototype'/name).read_text();css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
   await page.add_style_tag(content=css)
  for name in scripts:
   if name=='app.js':await page.evaluate(FAKE)
   await page.add_script_tag(content=(ROOT/'prototype'/name).read_text())
  await page.locator('[data-action="tab"][data-id="live"]').first.click()
  await page.locator('.room-card[data-id="room-A"]').click()
  await page.wait_for_function('typeof window.__resolveA === "function"')
  await page.locator('[data-action="back"]').first.click()
  await page.locator('[data-action="confirmLeaveRoom"]').click()
  await page.locator('.room-card[data-id="room-B"]').click()
  await page.wait_for_function('document.querySelector(".cam-page")?.textContent?.includes("Phòng B")')
  await page.evaluate('window.__resolveA({room:{id:"room-A"}})')
  await page.wait_for_function('window.__left.filter(x=>x==="room-A").length>=2')
  assert await page.evaluate('window.__left.every(x=>x==="room-A")'), 'new room accidentally left'
  assert 'Phòng B' in await page.locator('.cam-page').inner_text()
  assert not errors,errors
  print('PASS delayed join + switched room',flush=True)
  return {'stale_room':'room-A','active_room':'room-B','no_new_room_leave':True}
 finally:await page.close()

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  try:
   results=await theme_cases(browser,'offline-preview')
   switched=await stale_join_case(browser)
  finally:await browser.close()
 (OUT/'interaction-results.json').write_text(json.dumps({'theme':results,'stale_join':switched},ensure_ascii=False,indent=2))
 print('DONE',len(results),'theme + 1 join',flush=True)
if __name__=='__main__':asyncio.run(main())

"""Chromium: real UI state transitions with mocked same-origin transport, no live-media claims."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs'/'qa-v0816';OUT.mkdir(exist_ok=True,parents=True)
FAKE='''() => {
 const id='11111111-1111-4111-8111-111111111111';
 const room={id,type:'cam',title:'Phòng khách thử',subtitle:'Nhẹ nhàng trò chuyện',tag:'Tâm sự',host:'Mai',hostId:'h',members:2,color:'violet',art:'✳',speakers:[]};
 window.__fakeRoom=room;
 window.__fakeMembers=[{id:'h',name:'Mai',role:'host',onStage:true},{id:'v',name:'Người đang xem',role:'viewer',onStage:false}];
 window.__audienceError=false;
 window.__mockEventSource=null;
 class MockEventSource {
   handlers={};constructor(){window.__mockEventSource=this;queueMicrotask(()=>this.emit('open',{}));}
   addEventListener(name,callback){(this.handlers[name] ||= []).push(callback)}
   emit(name,detail){for(const fn of this.handlers[name]||[])fn(detail||{});}
   close(){}
 }
 window.EventSource=MockEventSource;
 window.TutttNetwork={
  session:async()=>({user:{id:'h',name:'Mai'}}),rooms:async()=>({rooms:[window.__fakeRoom]}),
  audience:async()=>{if(window.__audienceError)throw Error('Network offline');return {roomId:id,selfId:'h',count:window.__fakeMembers.length,members:window.__fakeMembers}},
  join:async()=>({room:room}),leave:async()=>({room:room}),
  liveToken:async()=>{throw Error('SFU not configured')},
  messages:async()=>({messages:[]}),pkSnapshot:async()=>({roomId:id,host:true,match:null,invites:[],available:[],recent:[]}),
  send:async()=>({}),liveHeartbeat:async()=>({members:[]}),
 };
}'''
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  import re
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  if name=='app.js':await page.evaluate(FAKE)
  await page.add_script_tag(content=(ROOT/'prototype'/name).read_text())
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844)]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   page.set_default_timeout(9000)
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   await setup(page)
   await page.locator('.room-card').first.click()
   counter=page.locator('.audience-trigger:visible')
   await page.wait_for_function("document.querySelector('.audience-trigger [data-audience-count]')?.textContent==='2'")
   composer=page.locator('.cam-compose input');await composer.fill('Đang soạn dở')
   # Membership changes via room list SSE must update just count/sheet, not replace composer.
   await page.evaluate("""() => {window.__composer=document.querySelector('.cam-compose input'); window.__fakeMembers.push({id:'v2',name:'Người mới',role:'viewer',onStage:false});window.__mockEventSource.emit('rooms.changed',{})}""")
   await page.wait_for_function("document.querySelector('.audience-trigger [data-audience-count]')?.textContent==='3'")
   assert await page.evaluate('window.__composer===document.querySelector(".cam-compose input")'), 'DOM editor reconstructed by rooms.changed'
   assert await composer.input_value()=='Đang soạn dở'
   await counter.click()
   assert 'Người mới' in await page.locator('[data-audience-sheet-body]').inner_text()
   await page.evaluate("window.__mockEventSource.emit('error',{})")
   await page.wait_for_function("document.querySelector('.audience-trigger [data-audience-count]')?.textContent==='…'")
   assert 'Mất kết nối cập nhật' in await page.locator('[data-audience-sheet-body]').inner_text()
   assert 'Người mới' not in await page.locator('[data-audience-sheet-body]').inner_text(), 'old names visible as live'
   if width==390:await page.screenshot(path=str(OUT/'cam-390-reconnecting-sheet.png'))
   await page.evaluate("""() => {window.__fakeMembers=[{id:'h',name:'Mai',role:'host',onStage:true},{id:'v3',name:'Khán giả vừa vào',role:'viewer',onStage:false}];window.__mockEventSource.emit('open',{})}""")
   await page.wait_for_function("document.querySelector('.audience-trigger [data-audience-count]')?.textContent==='2'")
   await page.wait_for_function("document.querySelector('[data-audience-sheet-body]')?.textContent?.includes('Khán giả vừa vào')")
   assert 'Người mới' not in await page.locator('[data-audience-sheet-body]').inner_text()
   if width==390:await page.screenshot(path=str(OUT/'cam-390-reconnected-sheet.png'))
   await page.locator('[data-action="closeModal"]').first.click()
   assert await composer.input_value()=='Đang soạn dở'
   assert not errors,(width,errors)
   results.append({'width':width,'fresh_before':2,'after_join':3,'reconnecting':'…','fresh_after_reconnect':2,'editor_intact':True})
   print('PASS',width,flush=True)
   await page.close()
  await browser.close()
 (OUT/'reconnect-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results))
if __name__=='__main__':asyncio.run(main())

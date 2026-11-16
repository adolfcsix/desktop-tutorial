"""Chromium: 100 rapid chat lines, incremental DOM, scroll anchor, no input loss, offline signal status."""
import asyncio, json, re, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs/qa-v089';OUT.mkdir(parents=True,exist_ok=True)

async def setup(page,mode):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  js=(ROOT/'prototype'/name).read_text()
  if name=='app.js':
   js=js.replace('async function syncPK(){', 'window.__QA089={state,render,updateLiveChatDom,updateRoomSignalDom,syncRoomMessages};\nasync function syncPK(){',1)
  await page.add_script_tag(content=js)
 await page.wait_for_timeout(40)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE' if mode=='voice' else 'CAM')).first.click()
 await page.evaluate('''() => {const qa=window.__QA089;qa.state.connected=true;qa.state.online=true;qa.state.roomMessages=[];qa.state.roomLog=[];qa.render();}''')

async def verify(page,mode,theme,width):
 if theme=='dark':await page.evaluate("document.body.classList.remove('light-mode')")
 selector='.room-chatbox' if mode=='voice' else '.cam-chat-history'
 editor=page.locator('.room-compose input')
 await editor.fill('Bản nháp vẫn đang gõ ở Túttt')
 await editor.focus()
 await page.evaluate('''() => {window.__QA089.input=document.querySelector('.room-compose input');window.__QA089.box=document.querySelector('.room-chatbox,.cam-chat-history');}''')
 first=await page.evaluate('''() => {const qa=window.__QA089;qa.state.roomMessages=Array.from({length:90},(_,i)=>({id:'m-'+i,name:'Khách '+i,text:'Tin nhắn số '+i+' · đang trò chuyện'}));return qa.updateLiveChatDom()}''')
 assert first
 limit=80 if mode=='voice' else 45
 assert await page.locator(selector+' [data-chat-id]').count()==limit
 box=page.locator(selector)
 await box.evaluate('e=>e.scrollTop=Math.min(e.scrollHeight*.34,e.scrollHeight-e.clientHeight)')
 anchor=await page.evaluate('''() => {const qa=window.__QA089,el=[...qa.box.querySelectorAll('[data-chat-id]')].find(n=>n.getBoundingClientRect().bottom>qa.box.getBoundingClientRect().top+2);return el?{id:el.dataset.chatId,top:el.getBoundingClientRect().top}:null}''')
 before=await box.evaluate('e=>e.scrollTop')
 result=await page.evaluate('''() => {
  const qa=window.__QA089;
  qa.state.roomMessages=Array.from({length:99},(_,i)=>({id:'m-'+i,name:'Khách '+i,text:i===98?'<img src=x onerror=alert(1)>':'Tin nhắn số '+i+' · đang trò chuyện'}));
  qa.updateLiveChatDom();
  return {inputSame:qa.input===document.querySelector('.room-compose input'),boxSame:qa.box===document.querySelector('.room-chatbox,.cam-chat-history'),focusSame:document.activeElement===qa.input,rows:qa.box.querySelectorAll('[data-chat-id]').length,image:qa.box.querySelector('img')!==null};
 }''')
 assert result=={'inputSame':True,'boxSame':True,'focusSame':True,'rows':limit,'image':False},result
 assert await editor.input_value()=='Bản nháp vẫn đang gõ ở Túttt'
 if anchor:
  after=await page.evaluate('''id=>{const el=[...document.querySelectorAll('[data-chat-id]')].find(n=>n.dataset.chatId===id);return el?.getBoundingClientRect().top??null}''',anchor['id'])
  if after is not None:
   metrics=await box.evaluate('e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop})')
   assert abs(after-anchor['top'])<=3.0,(mode,width,'anchor shift',anchor,after)
 # Duplicate events should not create duplicate DOM nodes.
 await page.evaluate('window.__QA089.updateLiveChatDom()')
 assert await page.locator(selector+' [data-chat-id]').count()==limit
 # No room or editor re-render when the signalling channel drops.
 status=await page.evaluate('''() => {let q=window.__QA089;q.state.online=false;q.updateRoomSignalDom();return {inputStable:q.input===document.querySelector('.room-compose input'),status:document.querySelector('.voice-status')?.textContent||document.querySelector('.cam-status-line')?.textContent||''}}''')
 assert status['inputStable']
 assert 'kết nối lại' in status['status'],status
 await page.evaluate('''() => {let q=window.__QA089;q.state.online=true;q.updateRoomSignalDom()}''')
 assert 'kết nối lại' not in await page.locator('.voice-status' if mode=='voice' else '.cam-status-line').inner_text()
 assert await editor.input_value()=='Bản nháp vẫn đang gõ ở Túttt'
 await page.evaluate('''() => {let q=window.__QA089;q.state.roomMessages=Array.from({length:95},(_,i)=>({id:'clean-'+i,name:'Người xem '+i,text:'Trận đấu đang gay cấn, chào mọi người!'}));q.updateLiveChatDom()}''')
 await box.evaluate('e=>e.scrollTop=e.scrollHeight')
 await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-burst-chat.png'))
 # Simulated SSE burst: only one outstanding fetch, one final refresh, and
 # late old-room responses cannot overwrite the newly opened room state.
 await page.evaluate('''() => {
  const qa=window.__QA089;
  qa.pending=[];qa.fetches=0;
  window.TutttNetwork.messages=()=>{qa.fetches++;return new Promise(resolve=>qa.pending.push(resolve))};
  qa.syncRoomMessages();qa.syncRoomMessages();qa.syncRoomMessages();
 }''')
 assert await page.evaluate('window.__QA089.fetches')==1
 await page.evaluate('''() => {window.__QA089.pending.shift()({messages:[{id:'sse-1',name:'Linh',text:'Tin đầu'}]})}''')
 await page.wait_for_function('window.__QA089.fetches===2')
 await page.evaluate('''() => {window.__QA089.pending.shift()({messages:[{id:'sse-1',name:'Linh',text:'Tin đầu'},{id:'sse-2',name:'Ngọc',text:'Tin cuối'}]})}''')
 await page.wait_for_function("window.__QA089.state.roomMessages.at(-1)?.id==='sse-2'")
 assert await editor.input_value()=='Bản nháp vẫn đang gõ ở Túttt'
 assert await page.locator(selector+' [data-chat-id]').count()==2
 # A pending fetch for the previous room cannot mutate a different room.
 await page.evaluate('''() => {const q=window.__QA089;q.syncRoomMessages();q.state.roomId='another-room';q.state.roomMessages=[];q.pending.shift()({messages:[{id:'old-room',name:'Sai phòng',text:'Không được hiện'}]})}''')
 await page.wait_for_timeout(15)
 assert await page.evaluate("window.__QA089.state.roomMessages.length")==0
 assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
 return {'mode':mode,'theme':theme,'width':width,'count':limit,'scrollBefore':before,'anchor':anchor,'stable':result}

async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode,theme,width,height in [('voice','light',320,740),('voice','dark',390,844),('cam','light',390,844),('cam','dark',320,740)]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   page.set_default_timeout(9000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    await setup(page,mode)
    results.append(await verify(page,mode,theme,width))
    assert not errors,errors
    print('PASS',mode,theme,width,flush=True)
   finally: await page.close()
  await browser.close()
 OUT.joinpath('chat-resilience-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('TOTAL',len(results),'burst chat scenarios',flush=True)

asyncio.run(main())

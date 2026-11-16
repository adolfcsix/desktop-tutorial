"""Isolated Chromium UI QA for microphone permission and room-chat preservation."""
import asyncio,re,sys,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs/qa-v0810';OUT.mkdir(parents=True,exist_ok=True)
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  js=(ROOT/'prototype'/name).read_text()
  if name=='app.js':
   js=js.replace('async function syncPK(){','window.__QA0810={state,voiceRef:()=>voice,render,updateRoomSignalDom};\nasync function syncPK(){',1)
  await page.add_script_tag(content=js)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
 await page.evaluate('''() => {
  const qa=window.__QA0810,v=qa.voiceRef(),r=qa.state.rooms.find(x=>x.id===qa.state.roomId);
  r.hostId='qa-voice-host';v.roomId=r.id;v.selfId='qa-voice-host';
  v.roster=[{id:v.selfId,name:'Chủ phòng',role:'speaker',mic:false}];v.supported=true;
  qa.state.connected=true;qa.state.online=true;qa.state.voiceReady=true;
  qa.state.voiceParticipants=v.roster;qa.state.seat=true;qa.state.mic=false;
  v.api=async(path,method,payload)=>({roomId:v.roomId,selfId:v.selfId,participants:[{id:v.selfId,name:'Chủ phòng',role:'speaker',mic:!!payload?.enabled}]});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>window.__qaMicPromise}});
  qa.render();
 }''')
async def case(page,theme,width):
 if theme=='dark':
  await page.evaluate('''()=>{window.__QA0810.state.theme='dark';window.__QA0810.render()}''')
 editor=page.locator('.room-compose input')
 await editor.fill('Bản nháp không mất khi chờ quyền microphone')
 await editor.focus()
 await page.evaluate('''() => {window.__QA0810.editor=document.querySelector('.room-compose input');window.__QA0810.chat=document.querySelector('.room-chatbox');
  window.__qaMicPromise=new Promise((resolve,reject)=>{window.__qaResolve=resolve;window.__qaReject=reject});}''')
 await page.locator('.room-controls [data-action="mic"]').click()
 await page.wait_for_function('window.__QA0810.voiceRef().micPending===true')
 status=await page.locator('.voice-status').inner_text()
 assert 'xin quyền mic' in status,status
 assert await page.locator('.room-controls [data-action="mic"]').is_disabled()
 stable=await page.evaluate('''()=>({editor:window.__QA0810.editor===document.querySelector('.room-compose input'),chat:window.__QA0810.chat===document.querySelector('.room-chatbox')})''')
 assert all(stable.values()),stable
 # Declining permission must neither auto retry nor replace the chat editor.
 await page.evaluate('''()=>window.__qaReject(Object.assign(new Error('denied'),{name:'NotAllowedError'}))''')
 await page.wait_for_function("window.__QA0810.voiceRef().micPending===false")
 assert 'Quyền microphone' in await page.locator('.room-top > .notice').inner_text()
 assert 'từ chối' in await page.locator('.toast').inner_text()
 assert await editor.input_value()=='Bản nháp không mất khi chờ quyền microphone'
 stable_after=await page.evaluate('''()=>({editor:window.__QA0810.editor===document.querySelector('.room-compose input'),chat:window.__QA0810.chat===document.querySelector('.room-chatbox')})''')
 assert all(stable_after.values()),stable_after
 await page.screenshot(path=str(OUT/f'voice-{theme}-{width}-mic-denied.png'))
 # Reattempt requires an explicit press; leaving while the second prompt is pending must cancel it.
 await page.evaluate('''()=>{window.__qaMicPromise=new Promise(resolve=>window.__qaResolve=resolve)}''')
 await page.locator('.room-controls [data-action="mic"]').click()
 await page.wait_for_function('window.__QA0810.voiceRef().micPending===true')
 await page.evaluate('''async()=>{await window.__QA0810.voiceRef().exit();window.__qaTrack={readyState:'live',stop(){this.readyState='ended';this.stopped=true},addEventListener(){}};window.__qaResolve({getAudioTracks:()=>[window.__qaTrack],getTracks:()=>[window.__qaTrack]})}''')
 await page.wait_for_function('window.__qaTrack.stopped===true')
 assert await page.evaluate('window.__QA0810.voiceRef().mic===false')
 return {'width':width,'theme':theme,'permissionFeedback':True,'draftPreserved':True,'lateGrantStopped':True}
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height,theme in [(320,740,'light'),(390,844,'dark')]:
   page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');page.set_default_timeout(8500)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    await setup(page);results.append(await case(page,theme,width))
    assert not errors,errors
   finally:await page.close()
  await browser.close()
 (OUT/'mic-permission-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('mic permission browser QA',len(results),'/',len(results),'PASS',results)
if __name__=='__main__':asyncio.run(main())

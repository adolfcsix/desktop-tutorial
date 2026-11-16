"""Chromium QA: a device route notification stays informational and preserves chat/PK DOM."""
import asyncio,re,sys,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs/qa-v0811';OUT.mkdir(parents=True,exist_ok=True)
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  js=(ROOT/'prototype'/name).read_text()
  if name=='app.js':
   js=js.replace('async function syncPK(){','window.__QA0811={state,voiceRef:()=>voice,render,updateRoomSignalDom};\nasync function syncPK(){',1)
  await page.add_script_tag(content=js)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
 await page.evaluate('''() => {
  const q=window.__QA0811,v=q.voiceRef(),r=q.state.rooms.find(x=>x.id===q.state.roomId);
  r.hostId='qa-host';v.roomId=r.id;v.selfId='qa-host';v.supported=true;
  v.roster=[{id:v.selfId,name:'Chủ phòng',role:'speaker',mic:false}];
  q.state.connected=true;q.state.online=true;q.state.voiceReady=true;
  q.state.voiceParticipants=v.roster;q.state.seat=true;q.state.mic=false;
  v.api=async(_path,_method,payload)=>({roomId:v.roomId,selfId:v.selfId,participants:[{id:v.selfId,name:'Chủ phòng',role:'speaker',mic:!!payload?.enabled}]});
  window.__qaGetUserMediaCalls=0;
  window.__qaAudioTrack={kind:'audio',readyState:'live',muted:false,stop(){this.readyState='ended';this.stopped=true},addEventListener(){}};
  const device={getUserMedia:async()=>{window.__qaGetUserMediaCalls++;return {getAudioTracks:()=>[window.__qaAudioTrack],getTracks:()=>[window.__qaAudioTrack]}},
   addEventListener(name,fn){if(name==='devicechange')window.__qaDeviceListener=fn},removeEventListener(name,fn){if(window.__qaDeviceListener===fn)window.__qaDeviceListener=null}};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:device});
  v.attachDeviceWatcher();q.render();
 }''')
async def case(page,width,theme):
 if theme=='dark':await page.evaluate("()=>{window.__QA0811.state.theme='dark';window.__QA0811.render()}")
 editor=page.locator('.room-compose input');await editor.fill('Đang gõ khi đổi tai nghe Bluetooth')
 await page.evaluate('''()=>{const q=window.__QA0811;window.__qaEditor=document.querySelector('.room-compose input');window.__qaStage=document.querySelector('.room-top');}''')
 await page.locator('.room-controls [data-action="mic"]').click()
 await page.wait_for_function('window.__QA0811.voiceRef().mic===true')
 await page.evaluate('''()=>{window.__QA0811.voiceRef().lastMicEnabledAt=Date.now()-2000;window.__qaDeviceListener()}''')
 await page.wait_for_function('window.__QA0811.voiceRef().deviceHint.includes("Bluetooth")')
 status=await page.locator('.room-top .voice-status').inner_text()
 notice=await page.locator('.room-top > .notice').inner_text()
 assert 'đường âm thanh' in status,status
 assert 'Bluetooth' in notice,notice
 state=await page.evaluate('''()=>({
  mic:window.__QA0811.voiceRef().mic,
  calls:window.__qaGetUserMediaCalls,
  chatPreserved:window.__qaEditor===document.querySelector('.room-compose input'),
  stagePreserved:window.__qaStage===document.querySelector('.room-top'),
  draft:document.querySelector('.room-compose input').value,
  overflow:document.documentElement.scrollWidth>innerWidth+2,
  })''')
 assert state['mic'] and state['calls']==1 and state['chatPreserved'] and state['stagePreserved']
 assert state['draft']=='Đang gõ khi đổi tai nghe Bluetooth'
 assert not state['overflow'],state
 await page.screenshot(path=str(OUT/f'voice-{theme}-{width}-audio-route.png'))
 return {'theme':theme,'width':width,**state}
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  try:
   for width,height,theme in ((320,740,'light'),(390,844,'dark')):
    page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce');page.set_default_timeout(9000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     await setup(page)
     results.append(await case(page,width,theme))
     assert not errors,errors
    finally:await page.close()
  finally:await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
 print('browser route QA:',len(results),'/',len(results),'PASS',results)
if __name__=='__main__':asyncio.run(main())

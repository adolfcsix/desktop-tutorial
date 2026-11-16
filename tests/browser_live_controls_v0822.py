"""Interaction audit for duplicate Live actions, stale room results, and stable heartbeat.
Mock server; not actual two-device LiveKit or a native build.
"""
import asyncio,re,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs'/'qa-v0822';OUT.mkdir(parents=True,exist_ok=True)
FAKE=r'''() => {
 const room=(id)=>({id,type:'cam',title:'Phòng '+id,subtitle:'Thử nghiệm điều khiển Live',tag:'Tâm sự',host:'Host',hostId:'h',members:2,color:'violet',art:'✳',speakers:[]});
 const rooms=[room('A'),room('B')];
 const roster=(id)=>({roomId:id,selfId:'me',members:[{id:'h',name:'Host',role:'host',speaker:true},{id:'me',name:'Bạn',role:'listener',speaker:false}],settings:{locked:false,chatEnabled:true,slowModeSeconds:0},requests:[]});
 const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
 window.__camAction=deferred();window.__camCalls=0;window.__heartbeatCalls=0;
 class EventStream{
   handlers={}; constructor(){queueMicrotask(()=>this.emit('open'))}
   addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)}
   emit(name,data){for(const fn of this.handlers[name]||[])fn(data||{})}
   close(){}
 }
 window.EventSource=EventStream;
 const realInterval=window.setInterval.bind(window);
 window.setInterval=(fn,delay)=>delay===30000?(window.__heartbeatPulse=fn,11):realInterval(fn,delay);
 window.TutttNetwork={
  api:async()=>({}), session:async()=>({user:{id:'me',name:'Bạn'}}),rooms:async()=>({rooms}),
  join:async()=>({}),leave:async()=>({}),liveLeave:async()=>({}),
  liveToken:async id=>({roster:roster(id)}),
  liveHeartbeat:async id=>(window.__heartbeatCalls++,roster(id)),
  liveRequest:async()=>{window.__camCalls++;return window.__camAction.promise},
  liveSeatLeave:async id=>roster(id),
  audience:async id=>({roomId:id,count:2,selfId:'me',members:[{id:'h',name:'Host',role:'host',onStage:true},{id:'me',name:'Bạn',role:'listener',onStage:false}]}),
  messages:async()=>({messages:[]}),pkSnapshot:async id=>({roomId:id,host:false,match:null,invites:[],available:[],recent:[]})
 };
 window.__roster=roster;
}'''
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  if name=='app.js':
   await page.evaluate(FAKE)
   source=(ROOT/'prototype'/name).read_text().replace('startNetwork();\n})();', 'window.__roomTest=()=>({id:state.roomId,roster:state.liveRoster?.roomId,ready:state.liveReady});startNetwork();\n})();')
  else: source=(ROOT/'prototype'/name).read_text()
  await page.add_script_tag(content=source)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def open_room(page,room):
 await page.locator(f'.room-card[data-id="{room}"]').click()
 await page.wait_for_function(f'window.__roomTest().id === "{room}" && window.__roomTest().ready')
async def case(browser,width):
 page=await browser.new_page(viewport={'width':width,'height':844 if width>350 else 740},device_scale_factor=1)
 page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  await setup(page);await open_room(page,'A')
  compose=page.locator('.cam-compose input');await compose.fill('Bản nháp cần giữ nguyên')
  action=page.locator('[data-action="requestCamSeat"]');assert await action.count()==1
  await action.click();await page.wait_for_function('window.__camCalls === 1')
  assert await action.is_disabled(), 'Action should be locked while pending'
  # JS dispatch on the disabled element still reaches delegation in some runtimes;
  # the room-action guard must independently reject the duplicate.
  await page.evaluate('''() => {const b=document.querySelector('[data-action="requestCamSeat"]');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));}''')
  await page.wait_for_timeout(70)
  assert await page.evaluate('window.__camCalls')==1,'Duplicate request emitted'
  assert await compose.input_value()=='Bản nháp cần giữ nguyên'
  await page.locator('[data-action="back"]').first.click()
  await page.locator('[data-action="confirmLeaveRoom"]').click()
  await open_room(page,'B')
  await compose.fill('Bản nháp của phòng B')
  await page.evaluate('window.__camAction.resolve(window.__roster("A"))')
  await page.wait_for_timeout(110)
  assert await page.evaluate('window.__roomTest().roster')=='B','Stale Cam action mutated room B'
  assert await compose.input_value()=='Bản nháp của phòng B'
  await page.evaluate('''() => {window.__sameInput=document.querySelector('.cam-compose input');window.__sameStage=document.querySelector('.cam-stage-grid')}''')
  await page.evaluate('window.__heartbeatPulse()')
  await page.wait_for_function('window.__heartbeatCalls > 0')
  await page.wait_for_timeout(100)
  assert await page.evaluate('document.querySelector(".cam-compose input") === window.__sameInput'),'Heartbeat rebuilt chat editor'
  assert await page.evaluate('document.querySelector(".cam-stage-grid") === window.__sameStage'),'Heartbeat rebuilt stage despite identical roster'
  assert await compose.input_value()=='Bản nháp của phòng B'
  assert not errors, errors
  if width==390:await page.screenshot(path=str(OUT/'cam-390-ivory-guarded-controls.png'))
  print('PASS Cam single-flight/stale result/unchanged heartbeat',width,flush=True)
  return {'width':width,'duplicateCalls':await page.evaluate('window.__camCalls'),'heartbeatCalls':await page.evaluate('window.__heartbeatCalls')}
 finally:await page.close()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  results=[]
  for width in (tuple(int(x) for x in sys.argv[1:]) if len(sys.argv)>1 else (320,390)):results.append(await case(browser,width))
  await browser.close()
 (OUT/'live-control-interactions.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results),'scenarios')
if __name__=='__main__':asyncio.run(main())

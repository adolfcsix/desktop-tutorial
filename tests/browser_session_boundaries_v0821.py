"""Chromium: delayed Cam stage/heartbeat responses cannot mutate a new Live room.

Media transmission is not exercised: mocked same-origin API, not two-device LiveKit.
"""
import asyncio,json,re,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs'/'qa-v0821';OUT.mkdir(parents=True,exist_ok=True)
FAKE='''() => {
 const room=(id,title)=>({id,type:'cam',title,subtitle:'Thử tính ổn định Live',tag:'Tâm sự',host:'Mai',hostId:'h',members:1,color:'violet',art:'✳',speakers:[]});
 const rooms=[room('room-A','Phòng A'),room('room-B','Phòng B')];
 const roster=(id)=>({roomId:id,selfId:'h',members:[{id:'h',name:id,role:'host',speaker:true}],requests:[],settings:{locked:false,chatEnabled:true,slowModeSeconds:0}});
 const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
 window.__lateStage=deferred();window.__lateHeartbeat=deferred();
 window.__events=null;
 class MockEventSource{
  handlers={};constructor(){window.__events=this;queueMicrotask(()=>this.emit('open',{}))}
  addEventListener(event,fn){(this.handlers[event]??=[]).push(fn)}
  emit(name,data){for(const fn of this.handlers[name]||[])fn(data||{})}
  close(){}
 }
 window.EventSource=MockEventSource;
 const realSetInterval=window.setInterval;
 window.setInterval=(callback,delay)=>delay===30000?(window.__heartbeatPulse=callback,7):realSetInterval(callback,delay);
 window.TutttNetwork={
  session:async()=>({user:{id:'h',name:'Mai'}}),rooms:async()=>({rooms}),
  join:async id=>({room:rooms.find(r=>r.id===id)}),leave:async()=>({}),liveLeave:async()=>({}),
  audience:async id=>({roomId:id,count:1,members:[{id:'h',name:'Mai',role:'host',onStage:true}]}),
  liveToken:async id=>({roster:roster(id)}),liveRoster:async id=>id==='room-A'?window.__lateStage.promise:roster(id),
  liveHeartbeat:async id=>id==='room-A'?window.__lateHeartbeat.promise:roster(id),
  messages:async()=>({messages:[]}),pkSnapshot:async id=>({roomId:id,host:true,match:null,invites:[],available:[],recent:[]}),
  send:async()=>({})
 };
}'''
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text();css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  if name=='app.js':
   await page.evaluate(FAKE)
   code=(ROOT/'prototype'/name).read_text().replace('startNetwork();\n})();', 'window.__liveState=()=>({room:state.roomId,liveReady:state.liveReady,roster:state.liveRoster?.roomId,navigation:roomNavigationSeq});startNetwork();\n})();')
  else:code=(ROOT/'prototype'/name).read_text()
  await page.add_script_tag(content=code)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def case(browser,settlement):
 page=await browser.new_page(viewport={'width':390,'height':844})
 page.set_default_timeout(9000)
 errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
 try:
  await setup(page)
  await page.locator('.room-card[data-id="room-A"]').click()
  await page.wait_for_function('window.__liveState().room === "room-A" && window.__liveState().liveReady')
  await page.evaluate('''() => { window.__events.emit('stage.changed',{data:JSON.stringify({roomId:'room-A'})});window.__heartbeatPulse(); }''')
  await page.locator('[data-action="back"]').first.click()
  await page.locator('[data-action="confirmLeaveRoom"]').click()
  await page.locator('.room-card[data-id="room-B"]').click()
  await page.wait_for_function('window.__liveState().room === "room-B" && window.__liveState().liveReady')
  editor=page.locator('.cam-compose input')
  await editor.fill('Bản nháp ở phòng B không được mất')
  await page.evaluate('''which=>{
   if(which==='resolve')window.__lateStage.resolve({roomId:'room-A',selfId:'h',members:[]});
   else window.__lateStage.reject(new Error('Old room stage request failed'));
   window.__lateHeartbeat.resolve({roomId:'room-A',selfId:'h',members:[]});
  }''',settlement)
  await page.wait_for_timeout(80)
  state=await page.evaluate('window.__liveState()')
  assert state['room']=='room-B' and state['roster']=='room-B' and state['liveReady'],state
  assert await editor.input_value()=='Bản nháp ở phòng B không được mất'
  assert await page.locator('.cam-page').count()==1
  assert not errors,errors
  if settlement=='resolve':await page.screenshot(path=str(OUT/'cam-390-new-room-after-stale-responses.png'))
  print('PASS stale stage/heartbeat',settlement,state,flush=True)
  return {'mode':settlement,'room':state['room'],'roster':state['roster'],'liveReady':state['liveReady'],'draftPreserved':True}
 finally:await page.close()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  try:results=[await case(browser,mode) for mode in ('resolve','reject')]
  finally:await browser.close()
 (OUT/'session-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('DONE',len(results),'browser session scenarios')
if __name__=='__main__':asyncio.run(main())

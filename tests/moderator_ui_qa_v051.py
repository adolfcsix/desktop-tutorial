"""UI mock adapter verifies layout and confirmation paths, NOT real SFU or backend integration."""
import asyncio,base64,re,json
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs'/'qa-v051'
MOCK_JS=r'''
class DemoEvents { constructor(){this.listeners={}} addEventListener(name,cb){this.listeners[name]=cb} close(){} }
window.EventSource=DemoEvents;
window.__qaRoster={roomId:'cam-qa',type:'cam',selfId:'host-qa',hostId:'host-qa',limits:{cameras:6,speakers:6,participants:80},settings:{locked:false,chatEnabled:true,slowModeSeconds:0},members:[
 {id:'host-qa',name:'Ngọc Anh',role:'host',speaker:true,cameraAllowed:true,chatMutedUntil:0},
 {id:'g-1',name:'Minh Khang',role:'listener',speaker:false,cameraAllowed:false,chatMutedUntil:0},
 {id:'g-2',name:'Linh Chi',role:'listener',speaker:false,cameraAllowed:false,chatMutedUntil:0},
 {id:'g-3',name:'Bảo Trâm',role:'listener',speaker:true,cameraAllowed:true,chatMutedUntil:0}],requests:['g-1']};
Object.assign(window.TutttNetwork,{
 session:async()=>({user:{id:'host-qa',name:'Ngọc Anh'}}),
 rooms:async()=>({rooms:[{id:'cam-qa',type:'cam',title:'Đêm tâm sự cùng những người bạn',subtitle:'Chuyện nhỏ thôi nhưng thật vui',tag:'Tâm sự',host:'Ngọc Anh',hostId:'host-qa',members:24,featured:true,color:'violet',art:'♫'}]}),
 join:async()=>({}),leave:async()=>({}),messages:async()=>({messages:[]}),liveToken:async()=>({roster:window.__qaRoster}),liveRoster:async()=>window.__qaRoster,
 liveApprove:async(id,targetId,enabled)=>{const m=window.__qaRoster.members.find(x=>x.id===targetId);m.speaker=enabled;m.cameraAllowed=enabled;window.__qaRoster.requests=window.__qaRoster.requests.filter(x=>x!==targetId);return window.__qaRoster},
 liveModerate:async(id,targetId,action)=>{const m=window.__qaRoster.members.find(x=>x.id===targetId);if(action==='promote')m.role='moderator';if(action==='demote')m.role='listener';if(action==='mute-chat')m.chatMutedUntil=Date.now()+600000;if(action==='unmute-chat')m.chatMutedUntil=0;return window.__qaRoster},
 liveSettings:async(id,value)=>{Object.assign(window.__qaRoster.settings,value);return window.__qaRoster},
 liveLeave:async()=>({}),send:async()=>({}),profile:async()=>({})
});
'''
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(root/'prototype/index.html').read_text('utf8');html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html);html=re.sub(r'<script src="[^"]+"></script>','',html)
  logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode();html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
  await page.set_content(html)
  for f in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css']:
   css=(root/'prototype'/f).read_text('utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M);await page.add_style_tag(content=css)
  for f in ['data.js','network.js','voice.js','ux-core.js']:
   await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
  await page.add_script_tag(content=MOCK_JS)
  await page.add_script_tag(content=(root/'prototype/app.js').read_text('utf8'))
  await page.wait_for_timeout(400)
  await page.locator('.nav-item[data-id="live"]').click()
  await page.locator('[data-action="liveMode"][data-id="cam"]').click()
  await page.locator('.room-card').first.click()
  await page.wait_for_timeout(200)
  assert await page.locator('.cam-panel-tab[data-id="manage"]').count()==1, 'host missing manage tab'
  await page.locator('[data-action="camPanel"][data-id="manage"]').first.click()
  await page.screenshot(path=str(out/'moderation-light-390.png'))
  assert await page.locator('[data-action="stageApprove"][data-id="g-1"]').count()==1
  await page.locator('[data-action="stageApprove"][data-id="g-1"]').click()
  await page.wait_for_timeout(70)
  assert await page.locator('.cam-stage-count').inner_text()=='3/6',await page.locator('.cam-stage-count').inner_text()
  await page.locator('[data-action="memberMenu"][data-id="g-2"]').first.click()
  assert await page.locator('[role="dialog"]').count()==1
  await page.locator('[data-action="stageMod"][data-id="promote:g-2"]').click()
  assert await page.locator('[data-action="confirmStageMod"]').count()==1
  # cancel does not change permission
  await page.locator('[data-action="closeModal"]').first.click()
  assert await page.evaluate('window.__qaRoster.members.find(m=>m.id==="g-2").role')=='listener'
  await page.locator('[data-action="memberMenu"][data-id="g-2"]').first.click()
  await page.locator('[data-action="stageMod"][data-id="promote:g-2"]').click()
  await page.locator('[data-action="confirmStageMod"]').click()
  await page.wait_for_timeout(90)
  assert await page.evaluate('window.__qaRoster.members.find(m=>m.id==="g-2").role')=='moderator'
  assert not errors,errors
  await page.screenshot(path=str(out/'moderation-after-approval-390.png'))
  print(json.dumps({'moderation_mock_ui':'pass','camera_seats':6,'new_approved_speakers':3,'role_after_confirmation':'moderator','console_page_errors':errors},ensure_ascii=False,indent=2))
  await browser.close()
asyncio.run(main())

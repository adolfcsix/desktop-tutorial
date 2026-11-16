"""v0.8.7 focused visual + live activity DOM regression suite."""
import asyncio,json,sys,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect,base,styles,scripts
OUT=ROOT/'docs'/'qa-v087';OUT.mkdir(exist_ok=True)
async def instrumented_setup(page):
 # Only the test fixture exposes state; no production debug API is added.
 await page.set_content(base,wait_until='domcontentloaded')
 for file in styles:
  css=(ROOT/'prototype'/file).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for file in scripts:
  js=(ROOT/'prototype'/file).read_text()
  if file=='app.js':
   assert 'async function syncPK(){' in js
   js=js.replace('async function syncPK(){','window.__TUTTT_QA={state,render,updateVoiceActivityDom};\nasync function syncPK(){',1)
  await page.add_script_tag(content=js)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for w,h in [(320,740),(360,780),(390,844),(430,932)]:
   for theme in ('light','dark'):
    page=await browser.new_page(viewport={'width':w,'height':h},reduced_motion='no-preference')
    page.set_default_timeout(9000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     await setup(page)
     if theme=='dark':await dark_theme(page)
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     stage=page.locator('.pk-broadcast-voice');assert await stage.count()==1
     assert await page.locator('[data-pk-points="A"]').first.inner_text()=='1.240'
     assert '%' not in await page.locator('.pk-balance-legends').inner_text()
     assert await page.locator('.room-controls .circle-action').count()==4
     assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),(w,theme,'overflow')
     composer=await rect(page,'.room-compose button');chat=await rect(page,'.room-chatbox')
     assert chat['height']>=94,(w,theme,chat)
     assert composer['bottom']<=h-45,(w,theme,composer)
     if w in (320,390):await page.screenshot(path=str(OUT/f'voice-{theme}-{w}-active.png'))
     before=await rect(page,'.room-compose button')
     await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
     await page.locator('[data-action="pkDemoFinish"]').click()
     assert await page.locator('.pk-outcome-win strong').inner_text()=='WIN'
     assert await page.locator('.pk-outcome-loss strong').inner_text()=='LOSS'
     await page.wait_for_timeout(700)
     win=await page.locator('.pk-outcome-win strong').evaluate('e=>getComputedStyle(e).color')
     loss=await page.locator('.pk-outcome-loss strong').evaluate('e=>getComputedStyle(e).color')
     assert win!=loss,(w,theme,win,loss)
     after=await rect(page,'.room-compose button')
     assert abs(after['y']-before['y'])<=1,(w,theme,'composer shifted',after,before)
     assert not errors,(w,theme,errors)
     results.append({'width':w,'theme':theme,'win':win,'loss':loss,'composer_shift':round(after['y']-before['y'],2)})
     if w==390:await page.screenshot(path=str(OUT/f'voice-{theme}-{w}-finish.png'))
     print('PASS layout',w,theme,flush=True)
    finally:await page.close()
  # Mic badge and real speaking event transitions: test fixture; never user-visible simulated activity.
  page=await browser.new_page(viewport={'width':390,'height':844})
  await instrumented_setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('[data-action="pkOpen"]').first.click();await page.locator('[data-action="pkPreviewToggle"]').click()
  await page.evaluate('''() => {
   const {state,render}=window.__TUTTT_QA;
   const room=state.rooms.find(x=>x.id===state.roomId);
   room.hostId='qa-fixture-host';state.voiceReady=true;
   state.voiceParticipants=[{id:room.hostId,name:room.host,role:'speaker',mic:false}];
   state.voiceSpeakingIds=[];render();
  }''')
  host=page.locator('.room-top .seat[data-speaker-id]').first
  assert await host.locator('.live-mic-muted').count()==1,'badge missing initial'
  draft=page.locator('.room-compose input');await draft.fill('bản nháp đang nhập')
  await page.evaluate('''() => {window.__TUTTT_QA.state.voiceParticipants[0].mic=true;window.__TUTTT_QA.updateVoiceActivityDom();}''')
  assert await host.locator('.live-mic-muted').count()==0,'badge must clear without rerender'
  assert 'mic bật' in (await host.get_attribute('aria-label'))
  await page.evaluate('''() => {window.__TUTTT_QA.state.voiceSpeakingIds=[window.__TUTTT_QA.state.voiceParticipants[0].id];window.__TUTTT_QA.updateVoiceActivityDom();}''')
  assert 'is-speaking' in (await host.get_attribute('class'))
  assert 'pk-host-speaking' in (await page.locator('.pk-broadcast-voice .my-side .pk-person-ring').get_attribute('class'))
  assert await draft.input_value()=='bản nháp đang nhập'
  await page.evaluate('''() => {window.__TUTTT_QA.state.voiceParticipants[0].mic=false;window.__TUTTT_QA.state.voiceSpeakingIds=[];window.__TUTTT_QA.updateVoiceActivityDom();}''')
  assert await host.locator('.live-mic-muted').count()==1
  assert 'is-speaking' not in (await host.get_attribute('class'))
  assert await draft.input_value()=='bản nháp đang nhập'
  print('PASS mic on/off/voice activity keeps chat draft',flush=True)
  await page.close()
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await instrumented_setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('[data-action="pkOpen"]').first.click();await page.locator('[data-action="pkPreviewToggle"]').click()
  await page.evaluate('''() => {const {state,render}=window.__TUTTT_QA;const r=state.rooms.find(x=>x.id===state.roomId);r.hostId='qa-fixture-host';state.voiceReady=true;state.voiceParticipants=[{id:r.hostId,name:r.host,role:'speaker',mic:true}];state.voiceSpeakingIds=[r.hostId];render();}''')
  anim=await page.locator('.pk-broadcast-voice .my-side .pk-person-ring').evaluate('e=>getComputedStyle(e).animationName')
  assert anim=='none',anim
  await page.close()
  print('PASS reduced-motion',flush=True)
  await browser.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('RESULT',len(results),'layouts and 2 interaction checks',flush=True)
asyncio.run(main())

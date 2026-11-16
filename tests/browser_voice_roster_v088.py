"""Live Voice roster: check real DOM updates, not only static source assertions.
The synthetic participants are test-only and are never exposed to the product.
"""
import asyncio,json,re,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import base,styles,scripts
OUT=ROOT/'docs/qa-v088';OUT.mkdir(parents=True,exist_ok=True)

async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for name in styles:
  css=(ROOT/'prototype'/name).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for name in scripts:
  js=(ROOT/'prototype'/name).read_text()
  if name=='app.js':
   assert 'async function syncPK(){' in js
   js=js.replace('async function syncPK(){','window.__TUTTT_QA={state,voiceRef:()=>voice,render,syncVoiceSeatsDom,updateVoiceActivityDom};\nasync function syncPK(){',1)
  await page.add_script_tag(content=js)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
 await page.evaluate('''() => {
  const {state,voiceRef,render}=window.__TUTTT_QA,voice=voiceRef();
  const room=state.rooms.find(x=>x.id===state.roomId);
  room.hostId='voice-host-1';voice.roomId=room.id;voice.selfId=room.hostId;
  const people=[
   {id:room.hostId,name:room.host,role:'speaker',mic:true},
   {id:'voice-2',name:'Ngọc Anh',role:'speaker',mic:false},
   {id:'voice-3',name:'Khánh Vy',role:'speaker',mic:null},
   {id:'voice-4',name:'Bạn nghe A',role:'listener',mic:false}
  ];
  voice.roster=people;state.voiceParticipants=people;
  state.voiceReady=true;state.seat=true;state.mic=true;state.voiceSpeakingIds=[];
  render();
 }''')

async def check_roster(page,width,theme):
 # Before PK, the room has 3 speakers, no fake green ring for an unknown mic.
 assert await page.locator('.seat-grid .seat').count()==3
 assert await page.locator('.seat-grid .is-speaking').count()==0
 assert await page.locator('.seat-grid [data-speaker-id="voice-2"] .live-mic-muted').count()==1
 assert await page.locator('.seat-grid [data-speaker-id="voice-3"] .live-mic-muted').count()==0
 draft=page.locator('.room-compose input')
 await draft.fill('Giữ bản nháp khi bốn người thay mic')
 await draft.focus()
 await page.evaluate('''() => {
  window.__TUTTT_QA.testChat=document.querySelector('.room-chatbox');
  window.__TUTTT_QA.testInput=document.querySelector('.room-compose input');
  window.__TUTTT_QA.hostSeat=document.querySelector('.seat-grid [data-speaker-id="voice-host-1"]');
 }''')
 # One change contains four speakers, two listeners, reordering, mute, and two confirmed speakers.
 outcome=await page.evaluate('''() => {
  const {state,voiceRef,syncVoiceSeatsDom,updateVoiceActivityDom}=window.__TUTTT_QA;
  const voice=voiceRef();
  const host=state.voiceParticipants.find(x=>x.id==='voice-host-1');host.mic=false;
  const two=state.voiceParticipants.find(x=>x.id==='voice-2');two.mic=true;
  const three=state.voiceParticipants.find(x=>x.id==='voice-3');three.mic=true;
  const four={id:'voice-5',name:'Bảo Ngọc',role:'speaker',mic:true};
  const six={id:'voice-6',name:'Bạn nghe B',role:'listener',mic:false};
  state.voiceParticipants=[two,host,three,four,state.voiceParticipants[3],six];
  voice.roster=state.voiceParticipants;
  state.mic=false;state.voiceSpeakingIds=['voice-host-1','voice-2','voice-3'];
  voice.updated({participants:voice.roster,seat:true,mic:false,activeSpeakerIds:[...state.voiceSpeakingIds]});
  return {chatStable:window.__TUTTT_QA.testChat===document.querySelector('.room-chatbox'),
   editorStable:window.__TUTTT_QA.testInput===document.querySelector('.room-compose input'),
   hostStable:window.__TUTTT_QA.hostSeat===document.querySelector('.seat-grid [data-speaker-id="voice-host-1"]'),
   focusStable:document.activeElement===window.__TUTTT_QA.testInput};
 }''')
 assert all(outcome.values()),outcome
 assert await draft.input_value()=='Giữ bản nháp khi bốn người thay mic'
 assert await page.locator('.seat-grid .seat').count()==4
 assert await page.locator('.seat-grid .is-speaking').count()==2
 assert await page.locator('.seat-grid .seat-speaking-caption').count()==4
 assert await page.locator('.seat-grid [data-speaker-id="voice-host-1"] .live-mic-muted').count()==1
 assert await page.locator('.seat-grid [data-speaker-id="voice-2"] .live-mic-muted').count()==0
 assert await page.locator('.voice-audience').inner_text()!=''
 assert '6 người' in await page.locator('.voice-audience').inner_text()
 # PK launcher and unlock are independent 44 px actions, not an overlay on subtitle.
 launcher=page.locator('.voice-summary .voice-pk-row .pk-launcher')
 assert await launcher.count()==1
 pk_rect=await launcher.evaluate('e=>e.getBoundingClientRect().toJSON()')
 intro_rect=await page.locator('.room-subtitle').evaluate('e=>e.getBoundingClientRect().toJSON()')
 assert pk_rect['height']>=44,(width,pk_rect)
 assert pk_rect['y']>=intro_rect['bottom']-1,(width,pk_rect,intro_rect)
 assert await page.locator('.room-controls [data-action="mic"]').get_attribute('aria-pressed')=='false'
 assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
 # Captions must fit within rounded stage; never clip short-phone active speakers.
 clipped=await page.evaluate('''() => {const box=document.querySelector('.seat-grid').getBoundingClientRect();
  return [...document.querySelectorAll('.seat-grid .seat-speaking-caption')].filter(el=>{const r=el.getBoundingClientRect();return r.top<box.top+2 || r.bottom>box.bottom-4}).length}''')
 assert clipped==0,(width,theme,'caption clipped',clipped)
 await page.screenshot(path=str(OUT/f'voice-{theme}-{width}-four-speakers.png'))
 # Speaker leaves seat, another microphone becomes silent. Both update in place.
 await page.evaluate('''() => {
  const {state,voiceRef,syncVoiceSeatsDom,updateVoiceActivityDom}=window.__TUTTT_QA;
  state.voiceParticipants.find(x=>x.id==='voice-2').role='listener';
  state.voiceParticipants.find(x=>x.id==='voice-3').mic=false;
  state.voiceSpeakingIds=['voice-3']; // stale speech evidence may exist; must not show it.
  voiceRef().roster=state.voiceParticipants;
  voiceRef().updated({participants:state.voiceParticipants,seat:true,mic:false,activeSpeakerIds:[...state.voiceSpeakingIds]});
 }''')
 assert await page.locator('.seat-grid .seat').count()==3
 assert await page.locator('.seat-grid [data-speaker-id="voice-2"]').count()==0
 assert await page.locator('.seat-grid .is-speaking').count()==0
 assert await page.locator('.seat-grid [data-speaker-id="voice-3"] .live-mic-muted').count()==1
 assert await draft.input_value()=='Giữ bản nháp khi bốn người thay mic'
 # PK stage must also survive a live voice activity/roster update, including its chat editor.
 await page.locator('[data-action="pkOpen"]').first.click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 assert await page.locator('.pk-broadcast-voice').count()==1
 await page.evaluate('''() => {
  window.__TUTTT_QA.testPk=document.querySelector('.pk-broadcast-voice');
  window.__TUTTT_QA.testChat=document.querySelector('.room-chatbox');
  window.__TUTTT_QA.testInput=document.querySelector('.room-compose input');
 }''')
 await draft.fill('Tin nhắn khi PK đang chạy')
 stable=await page.evaluate('''() => {
  const {state,voiceRef,syncVoiceSeatsDom,updateVoiceActivityDom}=window.__TUTTT_QA;
  state.voiceParticipants.find(x=>x.id==='voice-host-1').mic=true;
  state.voiceSpeakingIds=['voice-host-1'];voiceRef().roster=state.voiceParticipants;
  voiceRef().updated({participants:state.voiceParticipants,seat:true,mic:false,activeSpeakerIds:[...state.voiceSpeakingIds]});
  const root=document.querySelector('.pk-broadcast-voice');
  return {pk:root===window.__TUTTT_QA.testPk,
   chat:window.__TUTTT_QA.testChat===document.querySelector('.room-chatbox'),
   input:window.__TUTTT_QA.testInput===document.querySelector('.room-compose input'),
   ringing:root.querySelector('.my-side .pk-person-ring').classList.contains('pk-host-speaking')};
 }''')
 assert all(stable.values()),stable
 assert await draft.input_value()=='Tin nhắn khi PK đang chạy'
 return {'width':width,'theme':theme,'roster':outcome,'pk':stable}

async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for w,h,theme in [(320,740,'light'),(390,844,'light'),(390,844,'dark'),(430,932,'light')]:
   page=await browser.new_page(viewport={'width':w,'height':h},reduced_motion='no-preference');page.set_default_timeout(8000)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:
    await setup(page)
    if theme=='dark':
     await page.evaluate("document.body.classList.remove('light-mode')")
    result=await check_roster(page,w,theme)
    assert not errors,errors
    results.append(result)
    print('PASS roster+PK',w,theme,flush=True)
   finally:await page.close()
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await setup(page)
  await page.evaluate('''() => {const qa=window.__TUTTT_QA;qa.state.voiceSpeakingIds=['voice-host-1'];qa.syncVoiceSeatsDom();qa.updateVoiceActivityDom()}''')
  animation=await page.locator('.seat-grid [data-speaker-id="voice-host-1"] .avatar').evaluate('e=>getComputedStyle(e).animationName')
  assert animation=='none',animation
  print('PASS reduced-motion',flush=True)
  await page.close();await browser.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('TOTAL',len(results),'multi-user room scenarios + reduced-motion',flush=True)

asyncio.run(main())

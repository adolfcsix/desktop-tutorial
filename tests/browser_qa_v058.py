"""Chromium smoke test + targeted Voice activity DOM regression on offline demo."""
import asyncio,base64,re,json
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v058';out.mkdir(parents=True,exist_ok=True)
styles=['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css','live-polish-v053.css','live-stage-v054.css','live-unified-v055.css','live-flow-v056.css','live-speaker-v057.css']
scripts=['data.js','network.js','voice.js','ux-core.js','stage-layout.js','speaker-status.js','app.js']
async def setup(page):
 html=(root/'prototype/index.html').read_text('utf8')
 html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
 html=re.sub(r'<script src="[^"]+"></script>','',html)
 logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
 html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
 await page.set_content(html)
 for f in styles:
  css=re.sub(r'^@import[^;]+;','',(root/'prototype'/f).read_text('utf8'),flags=re.M)
  await page.add_style_tag(content=css)
 for f in scripts:
  js=(root/'prototype'/f).read_text('utf8')
  if f=='app.js':
   assert 'render();\nstartNetwork();\n})();' in js
   js=js.replace('render();\nstartNetwork();\n})();','window.__tutttDevQA={voice,state,render};\nrender();\nstartNetwork();\n})();')
  await page.add_script_tag(content=js)
 await page.wait_for_timeout(130)
async def main():
 report=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for w,h in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':w,'height':h})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await setup(page)
   await page.locator('.nav-item[data-id="live"]').click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').first.click()
   await page.wait_for_timeout(140)
   assert await page.locator('.cam-chat-history').count()==1
   assert await page.locator('.cam-avatar-wrap').count()>=1
   assert await page.locator('.cam-panel-tabs').count()==0
   assert await page.locator('.cam-viewers').count()==1
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.screenshot(path=str(out/f'cam-light-{w}.png'))
   if w==390:
    await page.locator('[data-action="roomAudience"]').click()
    assert await page.locator('[role="dialog"] #modal-title').inner_text()=='Người trong phòng'
    await page.locator('[data-action="closeModal"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="confirmLeaveRoom"]').first.click()
    await page.locator('[data-action="liveMode"][data-id="voice"]').click()
    await page.locator('.room-card').first.click()
    assert await page.locator('.seat').count()==4
    # Synthetic media state used only to test DOM update and speech-ring UX, not actual audio.
    baseline=await page.evaluate('''() => {
     const {voice,state,render}=window.__tutttDevQA;
     voice.roomId=state.roomId;voice.selfId='alice';
     voice.roster=[{id:'alice',name:'Hà My',role:'speaker',mic:true}];
     state.voiceReady=true;state.voiceParticipants=voice.roster;state.voiceSpeakingIds=[];
     render();
     const input=document.querySelector('#room-send input');input.value='Dòng tin đang nhập';
     window._tuttt_chat_node=document.querySelector('.room-chatbox');
     window._tuttt_input_node=input;
     return {count:document.querySelectorAll('.seat[data-speaker-id="alice"]').length,
       input:input.value};
    }''')
    assert baseline['count']==1,baseline
    result=await page.evaluate('''() => {
     const {voice}=window.__tutttDevQA;
     voice.updated({participants:voice.roster,seat:true,mic:true,activeSpeakerIds:['alice'],activityOnly:true});
     const seat=document.querySelector('.seat[data-speaker-id="alice"]');
     return {speaking:seat.classList.contains('is-speaking'),label:seat.getAttribute('aria-label'),
      stableChat:document.querySelector('.room-chatbox')===window._tuttt_chat_node,
      stableDraft:document.querySelector('#room-send input')===window._tuttt_input_node,
      draft:document.querySelector('#room-send input').value};
    }''')
    assert result['speaking'] and result['stableChat'] and result['stableDraft'] and result['draft']=='Dòng tin đang nhập',result
    await page.wait_for_timeout(2900)  # Let the old navigation toast expire before screenshot.
    await page.screenshot(path=str(out/'voice-speaking-demo-390.png'))
    result=await page.evaluate('''() => {
     const {voice}=window.__tutttDevQA;
     voice.updated({participants:voice.roster,seat:true,mic:true,activeSpeakerIds:[],activityOnly:true});
     return {speaking:document.querySelector('.seat[data-speaker-id="alice"]').classList.contains('is-speaking'),
      stableChat:document.querySelector('.room-chatbox')===window._tuttt_chat_node};
    }''')
    assert not result['speaking'] and result['stableChat']
   assert not errors,errors
   report.append({'viewport':f'{w}x{h}','errors':errors,'no_horizontal_overflow':True,'chat_visible':True,'audience_via_count':w==390,'stable_voice_chat_during_speech':w==390})
   await page.close()
  await browser.close()
 (out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf8')
 print(json.dumps(report,ensure_ascii=False,indent=2))
asyncio.run(main())

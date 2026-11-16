import asyncio,base64,json,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v055';out.mkdir(exist_ok=True,parents=True)
styles=['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css','live-polish-v053.css','live-stage-v054.css','live-unified-v055.css']
scripts=['data.js','network.js','voice.js','ux-core.js','stage-layout.js','app.js']
async def set_up(page):
 html=(root/'prototype/index.html').read_text('utf8')
 html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
 html=re.sub(r'<script src="[^"]+"></script>','',html)
 logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
 html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
 await page.set_content(html,wait_until='domcontentloaded')
 for f in styles:await page.add_style_tag(content=re.sub(r'^@import[^;]+;', '', (root/'prototype'/f).read_text('utf8'),flags=re.M))
 for f in scripts:await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
 await page.wait_for_timeout(220)
 await page.locator('.nav-item[data-id="live"]').click()
 await page.locator('[data-action="liveMode"][data-id="cam"]').click()
 await page.locator('.room-card').first.click()
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   await set_up(page)
   assert await page.locator('.cam-tile.avatar-only').count()==3
   assert await page.locator('.cam-display-settings').count()==0
   assert await page.locator('[data-action="toggleVacantCams"]').count()==0
   assert await page.locator('.cam-chat-history').count()==1
   ratio=await page.locator('.cam-stage-avatar').first.evaluate('(el)=>{const r=el.getBoundingClientRect(); const st=getComputedStyle(el);return {w:r.width,h:r.height,radius:st.borderRadius}}')
   assert abs(ratio['w']-ratio['h'])<=1,ratio
   assert ratio['radius']=='50%',ratio
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.screenshot(path=str(out/f'cam-unified-light-{width}.png'))
   await page.locator('[data-action="pinCam"]').nth(1).click()
   assert await page.locator('.cam-tile.pinned').count()==1
   await page.screenshot(path=str(out/f'cam-unified-pinned-{width}.png'))
   await page.locator('.cam-tile.pinned').click()
   assert await page.locator('.cam-tile.pinned').count()==0
   if width==390:
    await page.locator('[data-action="supporters"]').click()
    assert await page.locator('[role="dialog"]').count()==1
    await page.locator('.close-btn').click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="confirmLeaveRoom"]').first.click()
    await page.locator('.nav-item[data-id="profile"]').click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="theme"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('.nav-item[data-id="live"]').click()
    await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').first.click()
    await page.wait_for_timeout(3500)
    await page.screenshot(path=str(out/'cam-unified-dark-390.png'))
   assert not errors,errors
   results.append({'size':f'{width}x{height}','seats':3,'avatar_circle':True,'mode_selector':False,'pin':True,'horizontal_overflow':False,'js_errors':errors})
   await page.close()
  await browser.close()
 (out/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(run())

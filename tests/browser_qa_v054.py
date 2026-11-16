import asyncio,base64,json,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v054';out.mkdir(exist_ok=True,parents=True)
styles=['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css','live-polish-v053.css','live-stage-v054.css']
scripts=['data.js','network.js','voice.js','ux-core.js','stage-layout.js','app.js']
async def run():
 rows=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   html=(root/'prototype/index.html').read_text('utf8')
   html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
   html=re.sub(r'<script src="[^"]+"></script>','',html)
   logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
   html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
   await page.set_content(html,wait_until='domcontentloaded')
   for f in styles:await page.add_style_tag(content=re.sub(r'^@import[^;]+;', '', (root/'prototype'/f).read_text('utf8'),flags=re.M))
   for f in scripts:await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
   await page.wait_for_timeout(250)
   await page.locator('.nav-item[data-id="live"]').click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').first.click()
   assert await page.locator('.cam-tile').count()==3,'default uses three demo seats, no blank stage slots'
   assert await page.locator('.cam-layout-compact').count()==1
   assert await page.get_by_text('ghế minh họa',exact=False).count()==1
   await page.screenshot(path=str(out/f'cam-adaptive-light-{width}.png'))
   await page.locator('[data-action="pinCam"]').nth(1).click()
   assert await page.locator('.cam-layout-pinned').count()==1
   assert await page.locator('.cam-tile.pinned').count()==1
   await page.screenshot(path=str(out/f'cam-pinned-light-{width}.png'))
   await page.locator('.cam-tile.pinned').click()
   assert await page.locator('.cam-tile.pinned').count()==0
   await page.locator('[data-action="toggleVacantCams"]').click()
   assert await page.locator('.cam-tile').count()==6
   assert await page.locator('.cam-tile.empty').count()==3
   await page.locator('[data-action="toggleVacantCams"]').click()
   assert await page.locator('.cam-tile').count()==3
   await page.locator('[data-action="chatView"][data-id="chat"]').click()
   assert await page.locator('#room-send').is_visible()
   assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
   await page.screenshot(path=str(out/f'cam-chat-focus-{width}.png'))
   if width==390:
    await page.locator('[data-action="supporters"]').click()
    await page.wait_for_timeout(250)
    assert await page.locator('[role="dialog"] #modal-title').count()==1
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
    await page.wait_for_timeout(3100)
    await page.screenshot(path=str(out/'cam-adaptive-dark-390.png'))
   assert not errors,errors
   rows.append({'width':width,'height':height,'tiles_default':3,'tiles_expanded':6,'pin_works':True,'overflow':False,'errors':errors})
   await page.close()
  await browser.close()
 (out/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 print(json.dumps(rows,ensure_ascii=False,indent=2))
asyncio.run(run())

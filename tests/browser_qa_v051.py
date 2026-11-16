import asyncio,base64,json,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v051';out.mkdir(exist_ok=True,parents=True)
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   html=(root/'prototype/index.html').read_text('utf8');html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html);html=re.sub(r'<script src="[^"]+"></script>','',html)
   logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode();html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
   await page.set_content(html,wait_until='domcontentloaded')
   for f in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css']:
    css=(root/'prototype'/f).read_text('utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M);await page.add_style_tag(content=css)
   for f in ['data.js','network.js','voice.js','ux-core.js','app.js']:
    await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
   await page.wait_for_timeout(400)
   await page.locator('.nav-item[data-id="live"]').click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').first.click();await page.wait_for_timeout(150)
   tiles=await page.locator('.cam-tile').count()
   labels=await page.locator('.cam-tile').all_text_contents()
   assert tiles==6,(width,'tiles=',tiles)
   assert 'Bơ' in labels[0] or 'Chủ' in labels[0] or labels[0].strip(),(width,labels)
   overflow=await page.evaluate('document.documentElement.scrollWidth > window.innerWidth')
   assert not overflow,(width,'horizontal overflow')
   await page.screenshot(path=str(out/f'cam-light-{width}.png'))
   await page.locator('[data-action="camPanel"][data-id="audience"]').first.click()
   assert (await page.locator('.cam-panel-tab.selected').inner_text()).startswith('Thành viên')
   await page.screenshot(path=str(out/f'audience-light-{width}.png'))
   await page.locator('[data-action="camPanel"][data-id="chat"]').first.click()
   assert await page.locator('#room-send').count()==1
   await page.locator('[data-action="leaveRoom"]').first.click()
   assert await page.locator('[role="dialog"]').count()==1
   assert await page.locator('.cam-tile').count()==6,'room disappeared without confirmation'
   await page.locator('[data-action="closeModal"]').first.click()
   assert await page.locator('.cam-tile').count()==6
   await page.locator('[data-action="leaveRoom"]').first.click()
   await page.locator('[data-action="confirmLeaveRoom"]').first.click()
   assert await page.locator('.cam-tile').count()==0
   if width==390:
    await page.locator('.nav-item[data-id="profile"]').click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="theme"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('.nav-item[data-id="live"]').click()
    await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').first.click()
    await page.wait_for_timeout(2900)
    await page.screenshot(path=str(out/'cam-dark-390.png'))
    assert 'light-mode' not in await page.locator('body').get_attribute('class')
   assert not errors,(width,errors)
   results.append({'width':width,'height':height,'tiles':tiles,'overflow':overflow,'dialog_confirm':True,'theme': 'dark and light' if width==390 else 'light','page_errors':errors})
   await page.close()
  await browser.close()
 (out/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print(json.dumps(results,ensure_ascii=False,indent=2))
asyncio.run(run())

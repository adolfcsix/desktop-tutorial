import asyncio,base64,json,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v052';out.mkdir(exist_ok=True,parents=True)
async def run():
 results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await b.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   html=(root/'prototype/index.html').read_text('utf8')
   html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
   html=re.sub(r'<script src="[^"]+"></script>','',html)
   logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
   html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
   await page.set_content(html,wait_until='domcontentloaded')
   for f in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css']:
    css=(root/'prototype'/f).read_text('utf8');css=re.sub(r'^@import[^;]+;', '', css,flags=re.M);await page.add_style_tag(content=css)
   for f in ['data.js','network.js','voice.js','ux-core.js','app.js']:
    await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
   await page.wait_for_timeout(250)
   await page.locator('.nav-item[data-id="live"]').click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').first.click()
   assert await page.locator('.cam-tile').count()==6
   async def capture(mode):
    await page.locator(f'[data-action="chatView"][data-id="{mode}"]').click()
    assert (await page.locator('.cam-page').get_attribute('class')).endswith('cam-mode-'+mode)
    assert await page.locator('#room-send').is_visible()
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    metrics=await page.evaluate('''() => {const get=s=>{let e=document.querySelector(s);let r=e.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)}};return {stage:get('.cam-stage-grid'),chat:get('.cam-chat-history'),input:get('#room-send'),actions:get('.cam-actions'),viewport:innerHeight}}''')
    await page.screenshot(path=str(out/f'{mode}-light-{width}.png'))
    return metrics
   metrics={}
   for mode in ['balance','glass','chat']:metrics[mode]=await capture(mode)
   await page.locator('[data-action="chatFont"]').click()
   assert '--chat-text-size:15px' in await page.locator('.cam-page').get_attribute('style')
   await page.locator('[data-action="camPanel"][data-id="audience"]').first.click()
   assert (await page.locator('.cam-panel-tab.selected').inner_text()).startswith('Thành viên')
   if width==390:
    await page.locator('[data-action="leaveRoom"]').first.click()
    await page.locator('[data-action="closeModal"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="confirmLeaveRoom"]').first.click()
    await page.locator('.nav-item[data-id="profile"]').click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="theme"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('.nav-item[data-id="live"]').click()
    await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').first.click()
    await page.locator('[data-action="chatView"][data-id="glass"]').click()
    await page.screenshot(path=str(out/'glass-dark-390.png'))
   assert not errors,(width,errors)
   results.append({'width':width,'height':height,'modes':metrics,'errors':errors})
   await page.close()
  await b.close()
 (out/'browser-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
 print(json.dumps(results,indent=2,ensure_ascii=False))
asyncio.run(run())

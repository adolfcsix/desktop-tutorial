import asyncio,base64,json,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v053';out.mkdir(exist_ok=True,parents=True)
async def run():
 records=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   html=(root/'prototype/index.html').read_text('utf8')
   html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
   html=re.sub(r'<script src="[^"]+"></script>','',html)
   logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
   html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
   await page.set_content(html,wait_until='domcontentloaded')
   for f in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css','live-polish-v053.css']:
    await page.add_style_tag(content=re.sub(r'^@import[^;]+;', '', (root/'prototype'/f).read_text('utf8'),flags=re.M))
   for f in ['data.js','network.js','voice.js','ux-core.js','app.js']:
    await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
   await page.wait_for_timeout(200)
   await page.locator('.nav-item[data-id="live"]').click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').first.click()
   assert await page.locator('.cam-tile').count()==6
   assert await page.locator('[data-action="supporters"]').count()==1
   await page.screenshot(path=str(out/f'live-light-{width}.png'))
   await page.locator('[data-action="supporters"]').click()
   await page.wait_for_timeout(300)
   assert await page.locator('[role="dialog"] #modal-title').inner_text()=='Người đồng hành nổi bật'
   assert await page.locator('.supporter-rank-row').count()==3
   assert await page.get_by_text('DỮ LIỆU MINH HỌA',exact=False).count()==1
   if width==390:await page.screenshot(path=str(out/'top3-demo-390.png'))
   await page.locator('.close-btn').click()
   assert not await page.locator('[role="dialog"]').count()
   await page.locator('[data-action="chatView"][data-id="glass"]').click()
   await page.screenshot(path=str(out/f'glass-light-{width}.png'))
   assert await page.locator('#room-send').is_visible()
   assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
   dims=await page.evaluate('''() => {let find=x=>{let r=document.querySelector(x).getBoundingClientRect();return [Math.round(r.top),Math.round(r.bottom),Math.round(r.height)]};return {stage:find('.cam-stage-grid'),leaderboard:find('.cam-supporter-row'),chat:find('.cam-interaction'),compose:find('.cam-compose'),actions:find('.cam-actions')}}''')
   if width==390:
    await page.locator('[data-action="chatView"][data-id="chat"]').click()
    await page.screenshot(path=str(out/'chat-focus-light-390.png'))
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
    await page.wait_for_timeout(3100)
    await page.screenshot(path=str(out/'live-dark-390.png'))
   assert not errors,errors
   records.append({'width':width,'height':height,'errors':errors,'dimensions':dims})
   await page.close()
  await browser.close()
 (out/'results.json').write_text(json.dumps(records,indent=2,ensure_ascii=False),encoding='utf8')
 print(json.dumps(records,indent=2,ensure_ascii=False))
asyncio.run(run())

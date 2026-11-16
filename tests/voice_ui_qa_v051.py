import asyncio,base64,re
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs'/'qa-v051'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(root/'prototype/index.html').read_text('utf8');html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html);html=re.sub(r'<script src="[^"]+"></script>','',html)
  html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()+'"')
  await page.set_content(html)
  for f in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css']:
   css=(root/'prototype'/f).read_text('utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M);await page.add_style_tag(content=css)
  for f in ['data.js','network.js','voice.js','ux-core.js','app.js']:await page.add_script_tag(content=(root/'prototype'/f).read_text('utf8'))
  await page.wait_for_timeout(350)
  await page.locator('.nav-item[data-id="live"]').click()
  await page.locator('[data-action="liveMode"][data-id="voice"]').click()
  await page.locator('.room-card').first.click()
  await page.screenshot(path=str(out/'voice-light-390.png'))
  assert await page.locator('.seat').count()==4
  assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
  await page.locator('[data-action="back"]').first.click()
  assert await page.locator('[role="dialog"]').count()==1
  await page.locator('[data-action="closeModal"]').first.click()
  assert not errors,errors
  print('Voice UI pass, seat count',await page.locator('.seat').count(),'no runtime errors')
  await browser.close()
asyncio.run(main())

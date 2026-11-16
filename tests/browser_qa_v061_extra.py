from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
qa=root/'docs'/'qa-v061'
async def main():
 html=(root/'prototype/index.html').read_text(encoding='utf8')
 cssfiles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',html)
 jsfiles=re.findall(r'<script src="([^"]+)"></script>',html)
 html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
 html=re.sub(r'<script src="[^"]+"></script>','',html)
 logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
 html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
 out=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for mode in ['light','dark']:
   page=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content(html,wait_until='domcontentloaded')
   for f in cssfiles:await page.add_style_tag(content=re.sub(r'^@import[^;]+;','',(root/'prototype'/f).read_text(encoding='utf8'),flags=re.M))
   for f in jsfiles:await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf8'))
   await page.locator('[data-action="tab"][data-id="live"]').first.click()
   if mode=='dark':
    await page.locator('[data-action="tab"][data-id="profile"]').first.click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="theme"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="tab"][data-id="live"]').first.click()
   await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
   await page.locator('.cam-content>.pk-launcher').click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   score=await page.locator('.pk-score-line').inner_text()
   assert '1.240' in score and '980' in score,score
   await page.locator('[data-action="pkDemoCheer"]').click()
   newscore=await page.locator('.pk-score-line').inner_text()
   assert '1.280' in newscore,newscore
   await page.screenshot(path=str(qa/f'pk-duel-cam-{mode}-390.png'))
   out.append({'theme':mode,'score_before':score,'score_after':newscore,'errors':errors,'overflow':await page.evaluate('document.documentElement.scrollWidth>innerWidth')})
   await page.close()
  await browser.close()
 (qa/'enhanced-results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
 print(out)
asyncio.run(main())

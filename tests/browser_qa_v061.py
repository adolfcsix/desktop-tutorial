from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]; screens=root/'docs'/'qa-v061';screens.mkdir(exist_ok=True,parents=True)
async def main():
 out=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
   html=(root/'prototype/index.html').read_text(encoding='utf-8')
   cssfiles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',html)
   jsfiles=re.findall(r'<script src="([^"]+)"></script>',html)
   html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
   html=re.sub(r'<script src="[^"]+"></script>','',html)
   logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
   html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
   await page.set_content(html,wait_until='domcontentloaded')
   for f in cssfiles:
    txt=(root/'prototype'/f).read_text(encoding='utf-8')
    txt=re.sub(r'^@import[^;]+;','',txt,flags=re.M)
    await page.add_style_tag(content=txt)
   for f in jsfiles:await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf-8'))
   await page.wait_for_timeout(180)
   await page.locator('[data-action="tab"][data-id="live"]').first.click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
   await page.wait_for_timeout(70)
   assert await page.locator('.voice-pk-row .pk-launcher').count()==1
   await page.screenshot(path=str(screens/f'voice-{width}.png'))
   voice_overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.locator('.pk-launcher').first.click()
   assert await page.locator('#modal-title').inner_text()=='⚡ PK hai phòng'
   await page.locator('[data-action="pkPreviewToggle"]').click()
   assert await page.locator('.pk-showdown').count() == 1
   await page.screenshot(path=str(screens/f'voice-pk-{width}.png'))
   await page.locator('[data-action="back"]').first.click()
   await page.locator('[data-action="confirmLeaveRoom"]').first.click()
   if await page.locator('[data-action="tab"][data-id="live"]').count(): await page.locator('[data-action="tab"][data-id="live"]').first.click()
   if await page.locator('[data-action="liveMode"][data-id="cam"]').count(): await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
   await page.wait_for_timeout(70)
   await page.screenshot(path=str(screens/f'cam-{width}.png'))
   assert await page.locator('.cam-content>.pk-launcher').count()==1
   cam_overflow=await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.locator('.cam-content>.pk-launcher').click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   assert await page.locator('.cam-content>.pk-showdown').count()==1
   await page.screenshot(path=str(screens/f'cam-pk-{width}.png'))
   out.append({'width':width,'page_errors':errs,'voice_overflow':voice_overflow,'cam_overflow':cam_overflow,'pk_preview':True,'voice_input':await page.locator('#room-send input').count(),'dialog_count':await page.locator('[role="dialog"]').count()})
   await page.close()
  await browser.close()
 (screens/'results.json').write_text(json.dumps(out,indent=2,ensure_ascii=False),encoding='utf-8');print(out)
asyncio.run(main())

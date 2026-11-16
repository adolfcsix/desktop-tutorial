# Optional: pip install playwright and install Chromium; this runs the OFFLINE DOM demo only.
from pathlib import Path
import asyncio,re,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1] / 'prototype'
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="styles.css"\s*/?>','',html)
html=re.sub(r'\s*<script src="[^\"]+"></script>','',html)
css=(root/'styles.css').read_text(encoding='utf-8')
css=css.split('\n',1)[1] if css.startswith('@import') else css
async def load(page):
 errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 await page.set_content(html,wait_until='domcontentloaded')
 await page.add_style_tag(content=css)
 for f in ['data.js','network.js','voice.js','ux-core.js','app.js']:
  await page.add_script_tag(content=(root/f).read_text(encoding='utf-8'))
 await page.wait_for_timeout(300)
 return errors
async def main():
 out=Path(__file__).resolve().parents[1] / 'docs' / 'qa-screens';out.mkdir(parents=True,exist_ok=True)
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for w,h in [(320,720),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   errors=await load(page)
   await page.screenshot(path=str(out/f'discover-{w}.png'))
   print('loaded',w,await page.locator('.app-logo').count(),'rooms',await page.locator('.room-card').count(),'errors',errors[:2])
   if w==390:
    # Live and accent-free search
    await page.get_by_role('button',name='Live',exact=True).click()
    await page.screenshot(path=str(out/'live-dark-390.png'))
    inp=page.locator('#searchRooms')
    await inp.fill('chuyen')
    print('filtered live',await page.locator('.room-card').count(),'count',await page.locator('#live-room-count').inner_text())
    await inp.fill('')
    # Open a room, type message, trigger render by toast; ensure draft survives
    await page.locator('.room-card').first.click()
    print('room opened',await page.locator('.room-topbar').count(),'errors',errors[:2]);await page.screenshot(path=str(out/'room-dark-390.png'))
    await page.locator('input[name="message"]').fill('Bản nháp chưa gửi')
    await page.locator('[data-action="heart"]').click()
    print('draft restored',await page.locator('input[name="message"]').input_value())
    await page.locator('[data-action="leaveRoom"]').click()
    await page.get_by_role('button',name='Cá nhân',exact=True).click()
    await page.get_by_role('button',name='Cài đặt',exact=False).click()
    await page.locator('[data-action="theme"]').click()
    await page.wait_for_timeout(50)
    await page.screenshot(path=str(out/'settings-light-390.png'))
    await page.locator('[data-action="back"]').click()
    await page.get_by_role('button',name='Live',exact=True).click()
    await page.screenshot(path=str(out/'live-light-390.png'))
    # dialog keyboard
    await page.locator('[data-action="create"]').first.click()
    dialog=page.locator('[role="dialog"]')
    print('dialog',await dialog.count(),'focus',await page.evaluate('document.activeElement.getAttribute("role")'))
    await page.keyboard.press('Tab')
    print('first focused',await page.evaluate('document.activeElement.outerHTML.slice(0,130)'))
    await page.keyboard.press('Escape')
    print('dialog closed',await dialog.count())
    await page.screenshot(path=str(out/'live-light-postmodal-390.png'))
    print('390 page errors',errors)
   await page.close()
  await browser.close()
asyncio.run(main())

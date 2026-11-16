import asyncio,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  page.set_default_timeout(4500)
  await setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  for expected in ('x1','x2'):
   print('start',expected,flush=True)
   await page.locator('[data-action="pkOpen"]').first.click()
   print('opened sheet',flush=True)
   await page.locator('[data-action="pkPreviewToggle"]').click()
   print('entered preview',flush=True)
   await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
   print('opened PK sheet',flush=True)
   await page.locator('[data-action="pkDemoFinish"]').click()
   print('clicked result',flush=True)
   assert await page.locator('.pk-win-streak').inner_text()==expected
   await page.wait_for_timeout(3350)
   print('dismissed?',await page.locator('.pk-end-presentation').count(),flush=True)
   assert await page.locator('.pk-end-presentation').count()==0
  await browser.close()
asyncio.run(asyncio.wait_for(run(),timeout=38))

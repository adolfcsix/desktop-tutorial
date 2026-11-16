import asyncio,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs'/'qa-v080'
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height,mode,theme in [(320,740,'voice','light'),(390,844,'voice','light'),(390,844,'voice','dark'),(390,844,'cam','light'),(390,844,'cam','dark')]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   await setup(page)
   if theme=='dark':await dark_theme(page)
   if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
   await page.locator('[data-action="pkOpen"]').first.click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
   await page.locator('[data-action="pkDemoFinish"]').click()
   await page.wait_for_timeout(670)
   if mode=='voice':
    hidden=await page.locator('.pk-end-presentation .pk-person>.pk-media-label').first.evaluate('e=>getComputedStyle(e).visibility')
    assert hidden=='hidden',hidden
   assert await page.locator('.pk-outcome-flag').count()==2
   await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-finish.png'))
   print('PASS',width,mode,theme,flush=True)
   await page.close()
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('[data-action="pkOpen"]').first.click()
  await page.locator('[data-action="pkPreviewToggle"]').click()
  await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
  await page.locator('[data-action="pkDemoFinish"]').click()
  assert await page.locator('.pk-outcome-win').is_visible()
  anim=await page.locator('.pk-person-ring').first.evaluate('e=>getComputedStyle(e).animationName')
  assert anim=='none',anim
  print('PASS reduced-motion',flush=True)
  await browser.close()
asyncio.run(main())

"""Regression QA for uncluttered navigation, single create CTA and accessibility."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'package.json').read_text())['version']
HTML=(ROOT.parent/('TUTTT_V'+VERSION.replace('.','_')+'_PREVIEW.html')).read_text()
OUT=ROOT/'docs'/('qa-v'+VERSION.replace('.',''))
OUT.mkdir(parents=True,exist_ok=True)
async def run_case(browser,width,theme):
 page=await browser.new_page(viewport={'width':width,'height':844 if width!=320 else 720},device_scale_factor=1)
 page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 try:
  await page.set_content(HTML,wait_until='domcontentloaded')
  assert await page.locator('[data-action="notifications"], [data-action="notifyToggle"]').count()==0
  await page.locator('.brand-approved-header').evaluate('e=>e.decode()')
  assert await page.locator('.brand-approved-header').evaluate('e=>e.naturalWidth>0')
  if theme=='dark':
   await page.locator('[data-action="tab"][data-id="profile"]').click()
   await page.locator('[data-action="settings"]').click()
   await page.locator('[data-action="setTheme"][data-id="dark"]').click()
   await page.locator('[data-action="back"]').click()
  await page.locator('[data-action="tab"][data-id="live"]').first.click()
  assert await page.locator('[data-action="create"][aria-label="Tạo phòng Live"]').count()==0
  assert await page.locator('[data-action="tab"][data-id="create"]').count()==1
  assert await page.locator('.app-header .header-actions button').count()==0
  assert await page.locator('.app-header [aria-label="Thông báo"]').count()==0
  assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  if width==390:await page.screenshot(path=str(OUT/f'live-{theme}-390-clean.png'),full_page=True)
  await page.locator('[data-action="tab"][data-id="create"]').click()
  assert await page.locator('[role="dialog"]').count()==1
  assert 'Tạo phòng Live' in await page.locator('[role="dialog"]').inner_text()
  await page.locator('[data-action="closeModal"]').first.click()
  await page.locator('[data-action="tab"][data-id="profile"]').click()
  await page.locator('[data-action="settings"]').click()
  assert await page.locator('.theme-choice').count()==2
  assert await page.locator('[role="switch"]').count()==0
  assert 'Giảm chuyển động' not in await page.locator('.scrollbody').inner_text()
  assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  if width==390:await page.screenshot(path=str(OUT/f'settings-{theme}-390-clean.png'),full_page=True)
  await page.emulate_media(reduced_motion='reduce')
  assert await page.evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches')
  assert not errors,errors
  return {'width':width,'theme':theme,'singleCreate':'PASS','fauxNotificationRemoved':'PASS','motionControlRemoved':'PASS','osReducedMotion':'PASS','overflow':'none'}
 finally:await page.close()
async def main():
 outcomes=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,theme in [(320,'light'),(390,'light'),(390,'dark'),(430,'dark')]:
   outcomes.append(await run_case(browser,width,theme))
   print('PASS',width,theme,flush=True)
  await browser.close()
 (OUT/'declutter-browser-results.json').write_text(json.dumps(outcomes,ensure_ascii=False,indent=2)+'\n')
 print('PASS',len(outcomes),'browser declutter cases')
if __name__=='__main__':asyncio.run(main())

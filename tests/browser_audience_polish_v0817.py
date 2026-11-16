"""Chromium acceptance: polished audience sheet and trustworthy presence, no audio claims."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_audience_reconnect_v0816 import setup
OUT=ROOT/'docs'/'qa-v0817';OUT.mkdir(exist_ok=True,parents=True)
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height,theme in [(320,740,'light'),(390,844,'light'),(390,844,'dark')]:
   page=await browser.new_page(viewport={'width':width,'height':height})
   page.set_default_timeout(12000)
   errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
   await setup(page)
   if theme=='dark':
    await page.locator('[data-action="tab"][data-id="profile"]').first.click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="theme"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="tab"][data-id="live"]').first.click()
   await page.locator('.room-card').first.click()
   await page.wait_for_function("document.querySelector('[data-audience-count]')?.textContent==='2'")
   composer=page.locator('.cam-compose input');await composer.fill('Dở dang nhưng không mất')
   button=page.locator('.audience-trigger:visible').first
   await button.focus();await button.press('Enter')
   assert await page.locator('[role="dialog"]').count()==1
   assert await page.locator('.audience-panel-summary.is-current strong').inner_text()=='2 người trong phòng'
   assert await page.locator('.audience-section').count()==2
   assert await page.locator('.audience-self').inner_text()=='Bạn'
   assert await page.locator('.audience-person').count()==2
   assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
   await page.wait_for_timeout(300)
   await page.screenshot(path=str(OUT/f'audience-{width}-{theme}-current.png'))
   await page.evaluate("window.__mockEventSource.emit('error',{})")
   await page.wait_for_function("document.querySelector('.audience-panel-summary.is-pending')!==null")
   assert 'Người đang xem' not in await page.locator('[data-audience-sheet-body]').inner_text()
   assert not await page.locator('.audience-person').count()
   await page.wait_for_timeout(250)
   if width==390:await page.screenshot(path=str(OUT/f'audience-{width}-{theme}-reconnecting.png'))
   await page.keyboard.press('Escape')
   assert not await page.locator('[role="dialog"]').count()
   assert await composer.input_value()=='Dở dang nhưng không mất'
   assert 'audience-trigger' in await page.evaluate('document.activeElement?.className')
   assert not errors,errors
   results.append({'viewport':width,'theme':theme,'current_verified':True,'stale_hidden':True,'draft_kept':True,'focus_returned':True})
   print('PASS',width,theme,flush=True)
   await page.close()
  await browser.close()
 (OUT/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results))
if __name__=='__main__':asyncio.run(run())

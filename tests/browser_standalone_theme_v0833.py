"""Verify the exact single-file v0.8.18 preview, including theme toggle and PK."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
VERSION=__import__('json').loads((ROOT/'package.json').read_text())['version']
HTML=(ROOT.parent/f'TUTTT_V{VERSION.replace(".","_")}_PREVIEW.html').read_text()
OUT=ROOT/'docs/qa-v0833';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode in ('voice','cam'):
   for theme in ('light','dark'):
    page=await browser.new_page(viewport={'width':390,'height':844})
    page.set_default_timeout(10000);errs=[];page.on('pageerror',lambda ex:errs.append(str(ex)))
    try:
     await page.set_content(HTML,wait_until='domcontentloaded')
     await page.locator('[data-action="tab"][data-id="live"]').first.click()
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').first.click()
      await page.locator('[data-action="settings"]').first.click()
      await page.locator('[data-action="setTheme"][data-id="dark"]').first.click()
      await page.locator('[data-action="back"]').first.click()
      await page.locator('[data-action="tab"][data-id="live"]').first.click()
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     actual=await page.evaluate("getComputedStyle(document.querySelector('#app')).backgroundColor")
     assert (actual=='rgb(244, 234, 224)' if theme=='light' else actual in ('rgb(31, 24, 25)','rgb(39, 29, 31)')),actual
     assert await page.locator('.audience-trigger:visible').count()==1
     await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.wait_for_timeout(530)
     assert await page.locator('.pk-outcome-win').count()==1
     assert await page.locator('.pk-outcome-loss').count()==1
     assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
     assert not errs,errs
     await page.screenshot(path=str(OUT/f'{mode}-{theme}-390-result.png'))
     results.append({'mode':mode,'theme':theme,'app_bg':actual})
     print('PASS',mode,theme,actual,flush=True)
    finally:await page.close()
  await browser.close()
 OUT.joinpath('standalone-theme-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('DONE',len(results),'cases')
if __name__=='__main__':asyncio.run(main())

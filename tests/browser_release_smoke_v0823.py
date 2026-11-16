"""Visual smoke for v0.8.23; no fake audio/remote camera."""
import asyncio,sys,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0823';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode in ('voice','cam'):
   for theme in ('light','dark'):
    page=await browser.new_page(viewport={'width':390,'height':844})
    page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     await setup(page)
     if theme=='dark':await dark_theme(page)
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     await page.locator('[data-action="pkOpen"]').click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     assert await page.locator('.audience-trigger:visible').count()==1
     points=await page.locator('.pk-balance-legends').inner_text()
     assert '%' not in points and '1.240' in points and '980' in points,points
     assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
     assert not errors,errors
     await page.screenshot(path=str(OUT/f'{mode}-{theme}-390-pk.png'))
     results.append({'mode':mode,'theme':theme,'pkPoints':points.strip()})
     print('PASS',mode,theme,flush=True)
    finally:await page.close()
  await browser.close()
 (OUT/'visual-smoke.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results),'PK states')
if __name__=='__main__':asyncio.run(main())

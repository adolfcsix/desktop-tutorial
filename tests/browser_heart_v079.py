"""Verify unboxed white PK hearts, contrast, score update and responsive layout."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v079';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for w,h in ((320,740),(390,844),(430,932)):
   for mode in ('voice','cam'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':w,'height':h},reduced_motion='no-preference')
     errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
     await setup(page)
     if theme=='dark':await dark_theme(page)
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     await page.locator('[data-action="pkOpen"]').first.click();await page.locator('[data-action="pkPreviewToggle"]').click()
     sel='.cam-actions .pk-rail-cheer' if mode=='cam' else '.pk-scene-footer .pk-cheer-button'
     btn=page.locator(sel)
     assert await btn.count()==1,(w,theme,mode)
     properties=await btn.evaluate('''e=>{const b=getComputedStyle(e),s=e.querySelector('svg'),v=getComputedStyle(s);return {bg:b.backgroundColor,border:b.borderWidth,box:b.boxShadow,stroke:v.stroke,fill:v.fill,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}}''')
     assert properties['bg']=='rgba(0, 0, 0, 0)',(w,theme,mode,properties)
     assert properties['stroke']=='rgb(255, 253, 249)',(w,theme,mode,properties)
     assert properties['height']>=44,(w,theme,mode,properties)
     if mode=='voice':
      assert await page.locator('.room-controls .circle-action').count()==4
      assert await page.locator('.room-controls [data-action="heart"]').count()==0
     else:
      assert await page.locator('.cam-actions .cam-action').count()==6
     initial=await page.locator('[data-pk-balance]').get_attribute('aria-valuenow')
     assert initial=='56',(w,theme,mode,initial)
     await btn.click()
     assert await page.locator('[data-pk-balance]').get_attribute('aria-valuenow')=='57'
     assert await page.locator('.is-pk-heart-filled').count()==1,(w,mode,theme)
     assert await page.locator('.pk-heart-particle').count()==1,(w,mode,theme)
     if w==390:
      await page.wait_for_timeout(170)
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-390-active.png'))
     assert not errs,(w,theme,mode,errs)
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
     results.append({'width':w,'mode':mode,'theme':theme,'style':properties,'score':'56→57'})
     print('PASS',w,mode,theme,flush=True)
     await page.close()
  # reduced-motion: no floating hearts, instant fill, score still updates
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('[data-action="pkOpen"]').first.click();await page.locator('[data-action="pkPreviewToggle"]').click()
  await page.locator('.pk-scene-footer .pk-cheer-button').click()
  assert await page.locator('.pk-heart-particle').count()==0
  assert await page.locator('[data-pk-balance]').get_attribute('aria-valuenow')=='57'
  results.append({'reduced_motion':'passed'})
  print('PASS reduced-motion',flush=True)
  await page.close()
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results))
asyncio.run(main())

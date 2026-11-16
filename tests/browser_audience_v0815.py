"""Audience count UI: one button per room, Voice/Cam PK and non-PK, 320-768."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v0815';OUT.mkdir(exist_ok=True,parents=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in ((320,740),(390,844),(430,932),(768,1024)):
   for mode in ('voice','cam'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(10000)
     errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
     await setup(page)
     if theme=='dark':await dark_theme(page)
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     btn=page.locator('.audience-trigger:visible')
     assert await btn.count()==1,(width,mode,theme,'before PK duplicate count')
     count=await btn.locator('[data-audience-count]').inner_text()
     assert count in ('84','128'),(mode,count)
     compose=page.locator('.room-compose input' if mode=='voice' else '.cam-compose input')
     await compose.fill('Bản nháp cần được giữ')
     await btn.click()
     assert await page.locator('.cam-sheet-body [data-audience-count]').count()==0
     sheet=await page.locator('[data-audience-sheet-body]').inner_text()
     assert 'BẢN XEM TRƯỚC' in sheet and 'minh họa' in sheet and 'Đang xem' not in sheet,(mode,sheet)
     assert await page.locator('.cam-person-row').count()>=2
     assert not errors,(width,mode,theme,errors)
     if width in (320,390):
      await page.wait_for_timeout(260)
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-audience.png'))
     await page.locator('[data-action="closeModal"]').first.click()
     assert await compose.input_value()=='Bản nháp cần được giữ'
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     btn=page.locator('.audience-trigger:visible')
     assert await btn.count()==1,(width,mode,theme,'PK duplicate count',await page.locator('.audience-trigger').count())
     assert await btn.evaluate('e=>e.getBoundingClientRect().height')>=44
     assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
     await btn.click()
     assert await page.locator('[data-audience-sheet-body]').is_visible()
     if width in (320,390):
      await page.wait_for_timeout(260)
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-pk-audience.png'))
     await page.locator('[data-action="closeModal"]').first.click()
     assert await compose.input_value()=='Bản nháp cần được giữ'
     assert not errors,(width,mode,theme,errors)
     results.append({'width':width,'mode':mode,'theme':theme,'btnHeight':round(await btn.evaluate('e=>e.getBoundingClientRect().height'),1)})
     print('PASS',width,mode,theme,flush=True)
     await page.close()
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results),'scenarios',flush=True)
if __name__=='__main__':asyncio.run(main())

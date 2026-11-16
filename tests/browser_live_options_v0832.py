"""Browser regression: a single Live options entry across room and PK."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0832';OUT.mkdir(exist_ok=True,parents=True)

async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width in (320,390,430):
   for mode in ('voice','cam'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':width,'height':844 if width!=320 else 720})
     page.set_default_timeout(12000)
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     try:
      await setup(page)
      if theme=='dark':await dark_theme(page)
      if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
      await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
      assert await page.locator('[data-action="liveOptions"]').count()==1,'non-PK room has no single options menu'
      assert await page.locator('[data-action="roomManage"]').count()==0,'no separate manager shortcut'
      assert await page.locator('[data-action="pkOpen"]').count()==1,'launcher missing'
      await page.locator('[data-action="liveOptions"]').click()
      assert await page.get_by_role('heading',name='Tùy chọn Live').count()==1
      assert await page.locator('.live-option-row').count()==1,'offline viewer should see only report'
      assert await page.locator('[data-action="roomReport"]').count()==1
      assert await page.locator('[data-action="roomManage"]').count()==0
      await page.locator('[data-action="roomReport"]').click()
      assert await page.locator('#room-report #report-reason').count()==1
      assert 'Cần chạy máy chủ' in (await page.locator('#room-report').inner_text())
      await page.locator('[data-action="closeModal"]').click()
      await page.locator('.pk-launcher[data-action="pkOpen"]').click()
      await page.locator('[data-action="pkPreviewToggle"]').click()
      assert await page.locator('.pk-battle-scene').count()==1
      assert await page.locator('[data-action="liveOptions"]').count()==1,'PK duplicates options menu'
      assert await page.locator('.pk-menu').count()==0
      assert await page.locator('.audience-trigger:visible').count()==1
      await page.locator('[data-action="liveOptions"]').click()
      assert await page.locator('.live-option-row').count()==2,'PK adds single contextual entry'
      if width==390:
       await page.wait_for_timeout(450)
       await page.screenshot(path=str(OUT/f'{mode}-{theme}-390-menu.png'))
      await page.locator('.live-option-row[data-action="pkOpen"]').click()
      assert await page.get_by_role('heading',name='⚡ PK hai phòng').count()==1
      await page.locator('[data-action="closeModal"]').click()
      assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth+1'),f'overflow {mode} {theme} {width}'
      if width==390:await page.screenshot(path=str(OUT/f'{mode}-{theme}-390.png'))
      assert not errors,errors
      results.append({'width':width,'mode':mode,'theme':theme,'singleMenu':True,'reportedForm':True,'roles':True,'pkReachable':True,'overflow':False})
      print('PASS',width,mode,theme,flush=True)
     finally:await page.close()
  await browser.close()
 (OUT/'browser-live-options-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print(f'PASS {len(results)} Live/PK menu and report workflows')
if __name__=='__main__':asyncio.run(run())

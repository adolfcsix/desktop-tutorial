"""Theme consistency for Voice/Cam, PK and audience sheets, including 320px.
   Images and theme values come from rendered Chromium CSS, not static guesses."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0818';OUT.mkdir(parents=True,exist_ok=True)
async def sample(page,selectors):
 return await page.evaluate('''(selectors)=>Object.fromEntries(selectors.map(s=>{let e=document.querySelector(s);if(!e)return [s,null];let c=getComputedStyle(e);return [s,{bg:c.backgroundColor,fg:c.color,image:c.backgroundImage,scheme:c.colorScheme}]}))''',selectors)
def rgb(s):
 import re
 nums=[int(x) for x in re.findall(r'\d+',s)[:3]]
 return nums
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in ((320,740),(390,844)):
   for mode in ('voice','cam'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda ex:errors.append(str(ex)))
     try:
      await setup(page)
      if theme=='dark':await dark_theme(page)
      # Discover/Live cards must respect theme too.
      base=await sample(page,['body','#app','.room-card','.nav'])
      assert (min(rgb(base['#app']['bg']))>215 if theme=='light' else max(rgb(base['#app']['bg']))<65),(mode,theme,'live app',base)
      assert base['body']['scheme']==theme,base['body']
      if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
      await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
      composer=page.locator('.cam-compose input' if mode=='cam' else '.room-compose input')
      await composer.fill('Giữ bản nháp khi mở bảng')
      await page.locator('[data-action="pkOpen"]').first.click()
      await page.locator('[data-action="pkPreviewToggle"]').click()
      sel='.pk-broadcast-cam .pk-duel-side' if mode=='cam' else '.pk-broadcast-voice .pk-duel-side'
      bg=await sample(page,['body','#app','.cam-topbar','.room-top','.room-chatbox','.room-compose','.cam-compose',sel])
      assert (rgb(bg['#app']['bg'])==[244,234,224] if theme=='light' else max(rgb(bg['#app']['bg']))<50),(mode,theme,'PK chrome',bg)
      assert ('rgba' in bg[sel]['image'] or 'linear-gradient' in bg[sel]['image']),bg[sel]
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-pk.png'))
      btn=page.locator('.audience-trigger:visible');assert await btn.count()==1
      await btn.click()
      sheet=await sample(page,['.sheet','.audience-panel-summary','.close-btn','.cam-person-avatar'])
      assert rgb(sheet['.sheet']['bg'])==([255,249,241] if theme=='light' else [43,34,35]),(mode,theme,'sheet',sheet)
      close=page.locator('[data-action="closeModal"]').first
      await close.click()
      assert await composer.input_value()=='Giữ bản nháp khi mở bảng'
      await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
      await page.locator('[data-action="pkDemoFinish"]').click()
      await page.wait_for_timeout(650)
      assert await page.locator('.pk-outcome-win').count()==1
      assert await page.locator('.pk-outcome-loss').count()==1
      colors=await sample(page,['.pk-outcome-win strong','.pk-outcome-loss strong'])
      assert colors['.pk-outcome-win strong']['fg'] != colors['.pk-outcome-loss strong']['fg'],colors
      assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),(mode,theme,width)
      assert not errors,errors
      results.append({'width':width,'mode':mode,'theme':theme,'shell':bg['#app']['bg'],'sheet':sheet['.sheet']['bg'],'colors':{k:v['fg'] for k,v in colors.items()}})
      print('PASS',width,mode,theme,'shell',bg['#app']['bg'],flush=True)
     finally: await page.close()
  await browser.close()
 OUT.joinpath('theme-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
 print('DONE',len(results),'theme cases')
if __name__=='__main__':asyncio.run(main())

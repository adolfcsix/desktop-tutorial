"""End-state layout on real Chromium: 320-768px, two modes, light/dark."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v082';OUT.mkdir(parents=True,exist_ok=True)
async def reveal(page,mode,theme):
 await setup(page)
 if theme=='dark': await dark_theme(page)
 if mode=='cam': await page.locator('[data-action="liveMode"][data-id="cam"]').click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
 await page.locator('[data-action="pkOpen"]').first.click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 pre={'composer': await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button'),
 'chat':await rect(page,'.cam-chat-history' if mode=='cam' else '.room-chatbox') if await page.locator('.cam-chat-history' if mode=='cam' else '.room-chatbox').count() else None}
 await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
 await page.locator('[data-action="pkDemoFinish"]').click()
 await page.wait_for_timeout(820)
 return pre
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932),(768,1024)]:
   for mode in ('cam','voice'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(10000)
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     pre=await reveal(page,mode,theme)
     assert await page.locator('.pk-outcome-flag').count()==2,(width,mode,'missing flags')
     assert await page.locator('.pk-outcome-win strong').inner_text()=='WIN'
     assert await page.locator('.pk-outcome-loss strong').inner_text()=='LOSS'
     assert await page.locator('.pk-win-streak').inner_text()=='x1'
     assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth'),(width,mode,'horizontal overflow')
     composer=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
     assert abs(composer['y']-pre['composer']['y'])<1.2,(width,mode,theme,'composer moved',composer,pre)
     geom=await page.evaluate('''() => {
      const box=x=>{let r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}};
      const s=x=>[...document.querySelectorAll(x)].map(box);
      return {scores:s('.pk-side-score'),flags:s('.pk-outcome-flag'),avatars:s('.pk-person-ring'),labels:s('.pk-person>strong'),mic:s('.pk-voice-mic-mark'),rails:s('.pk-scoreboard')};
     }''')
     assert all(x['x']>=-.5 and x['right']<=width+.5 for x in geom['flags']), (width,mode,geom)
     if mode=='cam':
      assert await page.locator('.pk-cam-finish-slot').count()==2
      assert await page.locator('.pk-side-score>.pk-cam-finish-slot').count()==2
      for a,b in zip(geom['flags'],geom['scores']):
       assert a['y']>=b['y']+25 and a['bottom']<=b['bottom']+2,(width,mode,a,b)
      for a,b in zip(geom['flags'],geom['avatars']):
       assert a['bottom']+8<b['y'],(width,mode,'flag and avatar overlap',a,b)
     else:
      assert await page.locator('.pk-voice-outcome-slot>.pk-outcome-flag').count()==2
      assert await page.locator('.pk-broadcast-voice .pk-side-score').count()==0
      labels=page.locator('.pk-person>strong')
      for i in range(await labels.count()):
       assert await labels.nth(i).is_visible(),(width,mode,'host hidden')
      assert len(geom['mic'])==2
      assert not geom['scores'],(width,mode,'redundant side scores')
      for flag,rail in zip(geom['flags'],geom['rails'][:1]*2):
       assert flag['bottom']<rail['y']+4,(width,mode,'flag overlaps meter',flag,rail)
     if width in (320,390,430):
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-finish.png'))
     assert not errors,(width,mode,theme,errors)
     results.append({'width':width,'mode':mode,'theme':theme,'composer_shift':round(composer['y']-pre['composer']['y'],2)})
     print('PASS',width,mode,theme,flush=True)
     await page.close()
  # reduced-motion does not suppress text or label; idle stage remains unaffected.
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await reveal(page,'voice','light')
  assert await page.locator('.pk-outcome-win').is_visible()
  assert await page.locator('.pk-person-ring').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
  await page.close()
  # timer always self-clears; the room controls remain visible.
  page=await browser.new_page(viewport={'width':390,'height':844})
  await reveal(page,'cam','light')
  await page.wait_for_timeout(2600)
  assert await page.locator('.pk-end-presentation').count()==0,'result did not disappear after 3.2s'
  assert await page.locator('.cam-actions').is_visible()
  await page.close()
  await browser.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETE',len(results),'layout cases + reduced motion + auto dismiss',flush=True)
if __name__=='__main__':asyncio.run(main())

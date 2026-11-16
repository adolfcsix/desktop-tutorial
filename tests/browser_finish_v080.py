"""Túttt PK finish: stage-local WIN/LOSS, 3.2 second timeout, no new stage buttons."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v080'
OUT.mkdir(parents=True,exist_ok=True)

async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932),(768,1024)]:
   for mode in ('voice','cam'):
    for theme in ('light','dark'):
     page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='no-preference')
     page.set_default_timeout(10000)
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await setup(page)
     if theme=='dark':await dark_theme(page)
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     stage=page.locator('.pk-battle-scene')
     before=await stage.bounding_box()
     assert await page.locator('[data-action="pkDemoFinish"]').count()==0,(width,mode,'finish control on stage!')
     assert await page.locator('.pk-demo-end, .pk-header-result, .pk-finale').count()==0,(width,mode,'legacy result button')
     controls=page.locator('.cam-actions .cam-action' if mode=='cam' else '.room-controls .circle-action')
     precontrolcount=await controls.count()
     precomposer=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
     await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
     assert await page.get_by_text('Thử hiệu ứng kết thúc trận').count()==1
     await page.locator('[data-action="pkDemoFinish"]').click()
     flags=page.locator('.pk-outcome-flag')
     assert await flags.count()==2,(width,mode,'two flags missing')
     assert await page.locator('.pk-outcome-win strong').inner_text()=='WIN'
     assert await page.locator('.pk-outcome-loss strong').inner_text()=='LOSS'
     assert await page.locator('.pk-win-streak').inner_text()=='x1'
     assert await page.locator('.pk-finale, [data-action="pkResultDismiss"]').count()==0
     after=await stage.bounding_box()
     postcontrolcount=await controls.count()
     composer=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
     assert precontrolcount==postcontrolcount,(precontrolcount,postcontrolcount)
     assert abs(precomposer['y']-composer['y'])<=1,(width,theme,mode,precomposer,composer)
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
     layout=await page.evaluate('''() => {
       let r=e=>{let b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}};
       let stage=r(document.querySelector('.pk-battle-scene'));
       return {stage,flags:[...document.querySelectorAll('.pk-outcome-flag')].map(e=>r(e)),avatars:[...document.querySelectorAll('.pk-duel-side .pk-person-ring')].map(e=>r(e)),chat:r(document.querySelector('.room-chatbox, .cam-chat-history, .cam-interaction'))};
     }''')
     assert all(v['x']>=0 and v['right']<=width+0.5 for v in layout['flags']),(width,theme,mode,layout)
     # WIN badge should not overlap the rivalry meter or chat.
     if mode=='voice':
      score=await rect(page,'.pk-scoreboard')
      assert all(f['bottom']<score['y']+8 for f in layout['flags']),(width,layout,score)
     if width in (320,390):
      await page.wait_for_timeout(700)
      await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-finish.png'))
     assert not errors,(width,mode,theme,errors)
     if width==390 and theme=='light':
      await page.wait_for_timeout(2850)
      assert await page.locator('.pk-end-presentation').count()==0,(width,mode,'finish did not auto dismiss')
     results.append({'width':width,'height':height,'mode':mode,'theme':theme,'flag_count':2,'streak':'x1','composer_shift':round(composer['y']-precomposer['y'],2),'controls':precontrolcount})
     print('PASS',width,mode,theme,flush=True)
     await page.close()
  # Replay demo with two separate matches, confirm streak x2.
  page=await browser.new_page(viewport={'width':390,'height':844})
  await setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  for streak in ('x1','x2'):
   await page.locator('[data-action="pkOpen"]').first.click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
   await page.locator('[data-action="pkDemoFinish"]').click()
   assert await page.locator('.pk-win-streak').inner_text()==streak
   await page.wait_for_timeout(3350)
  print('PASS demo streak x1 x2',flush=True)
  await page.close()
  # Reduced motion should display labels without movement; timer still dismisses.
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await setup(page)
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('[data-action="pkOpen"]').first.click()
  await page.locator('[data-action="pkPreviewToggle"]').click()
  await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
  await page.locator('[data-action="pkDemoFinish"]').click()
  assert await page.locator('.pk-outcome-win').is_visible()
  reduced=await page.locator('.pk-person-ring').first.evaluate('e=>getComputedStyle(e).animationName')
  assert reduced=='none',reduced
  await page.close();await browser.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETE',len(results),'cases')
asyncio.run(main())

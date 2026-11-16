"""Preserve v0.5.6/v0.5.7 Live UX assertions on the *current* complete UI.

Historical scripts had loaded only frozen v0.5.x assets into a v0.8.x HTML
page, yielding false negatives. These regressions intentionally load every
asset named by the current index. Speaking-state is visual simulation only.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
from browser_room_v075 import ROOT,setup,dark_theme

OUT=ROOT/'docs'/'qa-v0845';OUT.mkdir(parents=True,exist_ok=True)

async def run(series):
 results=[]
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  try:
   for w,h in ((320,740),(390,844),(430,932)):
    page=await browser.new_page(viewport={'width':w,'height':h})
    page.set_default_timeout(10000)
    errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
    try:
     await setup(page)
     if w==390:await dark_theme(page)
     await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
     assert await page.locator('.cam-panel-tabs').count()==0
     assert await page.locator('.cam-interaction.cam-chat-float').count()==1
     assert await page.locator('.cam-chat-history:visible').count()==1
     assert await page.locator('.cam-avatar-wrap').count()>=1
     assert await page.locator('.live-mic-muted').count()>=1
     assert await page.locator('[data-action="gift"],[data-action="heart"]').count()==0
     audience=page.locator('.audience-trigger:visible')
     assert await audience.count()==1
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
     await audience.click()
     assert await page.get_by_role('heading',name='Người trong phòng').count()==1
     await page.locator('[data-action="closeModal"]').first.click()
     await page.locator('#room-send input').fill('Lời chào kiểm thử')
     await page.locator('#room-send button').click()
     assert 'Lời chào kiểm thử' in await page.locator('.cam-chat-history').inner_text()
     if series=='v057':
      tile=page.locator('.cam-stage-grid .cam-tile').first
      await tile.evaluate("el => el.classList.add('is-speaking')")
      assert await tile.evaluate("el => el.classList.contains('is-speaking')")
      await tile.evaluate("el => el.classList.remove('is-speaking')")
      assert not await tile.evaluate("el => el.classList.contains('is-speaking')")
     geom=await page.evaluate('''() => {let s=q=>{let r=document.querySelector(q).getBoundingClientRect();return {h:r.height,bottom:r.bottom}};return {chat:s('.cam-chat-history'),compose:s('#room-send'),actions:s('.cam-actions')}}''')
     assert geom['chat']['h']>=70,geom
     assert geom['compose']['bottom']<=h+2,geom
     assert geom['actions']['bottom']<=h+2,geom
     assert not errors,errors
     results.append({'viewport':f'{w}x{h}','theme':'dark' if w==390 else 'light','visualSpeakingOnly':series=='v057','passed':True})
     print('PASS',series,w,flush=True)
    finally:await page.close()
  finally:await browser.close()
 (OUT/f'legacy-{series}.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f'PASS {series}: {len(results)}/3 migrated historical UX scenarios')

if __name__=='__main__':
 import sys
 assert len(sys.argv)==2 and sys.argv[1] in ('v056','v057')
 asyncio.run(run(sys.argv[1]))

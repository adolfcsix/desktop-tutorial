"""Current release: no fake leaderboard CTA, quieter PK and intact viewer action."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0831'
OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode in ['voice','cam']:
   for theme in ['light','dark']:
    page=await browser.new_page(viewport={'width':390,'height':844})
    page.set_default_timeout(12000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     await setup(page)
     if theme=='dark':await dark_theme(page)
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
     assert await page.locator('[data-action="supporters"],.cam-supporter-row,.voice-top3-button').count()==0
     assert await page.locator('[data-action="pkOpen"]').count()==1
     await page.locator('[data-action="pkOpen"]').click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     assert await page.locator('.pk-battle-scene').count()==1
     assert await page.locator('.audience-trigger:visible').count()==1
     assert await page.locator('[data-action="supporters"]').count()==0
     if mode=='voice':
      assert await page.locator('.voice-top3-button').count()==0
      assert await page.locator('.pk-cheer-button:visible').count()==1
     else:
      assert await page.locator('.cam-supporter-row').count()==0
     animations=await page.evaluate('''()=>({pulse:getComputedStyle(document.querySelector('.pk-pulse-light')).animationName,duel:getComputedStyle(document.querySelector('.pk-duel')).animationName,overflow:document.documentElement.scrollWidth>innerWidth+1})''')
     assert animations['pulse']=='none',animations
     assert animations['duel']=='none',animations
     assert not animations['overflow'],animations
     assert not errors,errors
     results.append({'mode':mode,'theme':theme,'noFauxRanking':True,'viewerButton':True,'speakingAndPkControls':True,'idleAnimations':animations})
     print('PASS',mode,theme,flush=True)
    finally:await page.close()
  await browser.close()
 (OUT/'declutter-v0831-browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print('PASS',len(results),'v0.8.31 declutter checks')
if __name__=='__main__':asyncio.run(main())

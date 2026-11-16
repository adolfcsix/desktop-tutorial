"""Web screenshot and computed palette QA; no new media or score is synthesized."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v084';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height,mode,theme in [(390,844,'voice','light'),(390,844,'voice','dark'),(390,844,'cam','light'),(390,844,'cam','dark'),(320,740,'voice','light'),(320,740,'cam','light')]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   page.set_default_timeout(12000)
   errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
   try:
    await setup(page)
    if theme=='dark':await dark_theme(page)
    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
    await page.locator('[data-action="pkOpen"]').first.click()
    await page.locator('[data-action="pkPreviewToggle"]').click()
    before=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
    await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
    await page.locator('[data-action="pkDemoFinish"]').click()
    await page.wait_for_timeout(820)
    after=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
    assert abs(after['y']-before['y'])<1,('composer moved',before,after)
    assert await page.locator('.pk-outcome-win').count()==1
    assert await page.locator('.pk-outcome-loss').count()==1
    assert await page.locator('.pk-win-streak').inner_text()=='x1'
    colors=await page.evaluate('''() => Object.fromEntries(['win','loss'].map(key=>[key,getComputedStyle(document.querySelector('.pk-outcome-'+key+' strong')).color]))''')
    if mode=='voice' and theme=='light': assert colors=={'win':'rgb(173, 113, 31)','loss':'rgb(114, 82, 157)'},colors
    if mode=='voice' and theme=='dark': assert colors=={'win':'rgb(248, 217, 134)','loss':'rgb(237, 226, 255)'},colors
    if mode=='cam': assert colors=={'win':'rgb(248, 215, 126)','loss':'rgb(243, 238, 255)'},colors
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),'horizontal overflow'
    if mode=='voice':
     assert await page.locator('.pk-voice-mic-mark').count()==2
     assert await page.locator('.pk-person>strong').count()==2
     assert await page.locator('.pk-voice-outcome-slot>.pk-outcome-flag').count()==2
     assert await page.locator('.pk-broadcast-voice .pk-side-score').count()==0
    else:
     assert await page.locator('.pk-side-score>.pk-cam-finish-slot').count()==2
    assert not errors,errors
    await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-finish.png'))
    results.append({'width':width,'mode':mode,'theme':theme,'colors':colors,'composer_move_px':round(after['y']-before['y'],2)})
    print('PASS',width,mode,theme,colors,flush=True)
   finally: await page.close()
  await browser.close()
 OUT.joinpath('results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETE',len(results),flush=True)
if __name__=='__main__':asyncio.run(main())

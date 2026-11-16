import asyncio,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from browser_room_v075 import setup,rect
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for w,h in [(320,740),(360,780),(390,844)]:
   page=await browser.new_page(viewport={'width':w,'height':h})
   await setup(page)
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
   await page.locator('[data-action="pkOpen"]').click();await page.locator('[data-action="pkPreviewToggle"]').click()
   print('\n',w)
   for sel in ['.room-topbar','.voice-title-row','.pk-broadcast-voice','.pk-scene-head','.pk-voice-kicker','.pk-duel','.pk-duel-side','.pk-side-top','.pk-person','.pk-person-ring','.pk-side-score','.pk-scoreboard','.pk-voice-meter-head','.pk-balance-legends','.pk-balance-bar','.pk-score-caption','.pk-scene-footer','.pk-demo-end','.pk-cheer-button','.room-chatbox','.room-compose','.room-controls']:
    try:
     r=await rect(page,sel);print(sel,round(r['y']),round(r['height']),round(r['bottom']))
    except:pass
   await page.close()
  await browser.close()
asyncio.run(main())

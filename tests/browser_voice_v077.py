import asyncio,sys,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v077';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 records=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for w,h in [(320,740),(360,780),(390,844),(430,932),(768,1024)]:
   for theme in ['light','dark']:
    page=await browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await setup(page)
    if theme=='dark':await dark_theme(page)
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
    await page.locator('[data-action="pkOpen"]').first.click()
    await page.locator('[data-action="pkPreviewToggle"]').click()
    await page.wait_for_timeout(150)
    stage=page.locator('.pk-broadcast-voice')
    assert await stage.count()==1
    chat=await rect(page,'.room-chatbox');log=await rect(page,'.room-chatbox .room-log')
    duel=await rect(page,'.pk-broadcast-voice .pk-duel');bar=await rect(page,'.pk-broadcast-voice .pk-balance-bar')
    statuses=await page.locator('.pk-broadcast-voice .pk-media-label').evaluate_all('''els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,getComputedStyle(e).clipPath]})''')
    if not all(a>60 and b>=12 and c=='none' for a,b,c in statuses):print('STATUS BUG',w,theme,statuses)
    assert bar['height']>=17 and bar['x']>=0 and bar['right']<=w
    assert duel['width']>=285 and duel['right']<=w
    assert chat['height']>=(97 if w<=350 or w>=390 else 90) and log['bottom']<=chat['bottom']+1,(w,theme,chat,log)
    assert not errors,errors
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    if w in [320,390,430]:await page.screenshot(path=str(OUT/f'voice-{theme}-{w}.png'))
    await page.locator('[data-action="pkDemoCheer"]').click()
    assert await stage.locator('[data-pk-balance]').get_attribute('aria-valuenow')=='57'
    records.append({'w':w,'theme':theme,'chat':chat,'duel':duel,'bar':bar,'status':statuses})
    print('PASS',w,theme,'chat',round(chat['height']), 'bar',round(bar['height']),flush=True)
    await page.close()
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
asyncio.run(main())

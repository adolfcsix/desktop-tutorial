"""Exercise the exact exported standalone HTML, not a dev-server variant."""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'package.json').read_text())['version']
HTML=(ROOT.parent/('TUTTT_V'+VERSION.replace('.','_')+'_PREVIEW.html')).read_text()
OUT=ROOT/'docs'/('qa-v'+VERSION.split('.')[1].zfill(2)+VERSION.split('.')[2]);OUT.mkdir(exist_ok=True)
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode,theme in [('voice','light'),('voice','dark'),('cam','light'),('cam','dark')]:
   page=await browser.new_page(viewport={'width':390,'height':844})
   page.set_default_timeout(10000)
   errors=[];page.on('pageerror',lambda ex:errors.append(str(ex)))
   try:
    await page.set_content(HTML,wait_until='domcontentloaded')
    await page.locator('[data-action="tab"][data-id="live"]').first.click()
    if theme=='dark':
     await page.locator('[data-action="tab"][data-id="profile"]').first.click()
     await page.locator('[data-action="settings"]').first.click()
     await page.locator('[data-action="setTheme"][data-id="dark"]').first.click()
     await page.locator('[data-action="back"]').first.click()
     await page.locator('[data-action="tab"][data-id="live"]').first.click()
    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
    await page.locator('[data-action="pkOpen"]').first.click()
    await page.locator('[data-action="pkPreviewToggle"]').click()
    before=await page.locator('.pk-battle-scene').get_attribute('data-pk-leading')
    assert before=='A',before
    assert '1.240' in await page.locator('[data-pk-points="A"]').inner_text()
    assert '%' not in await page.locator('.pk-balance-legends').inner_text()
    await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
    await page.locator('[data-action="pkDemoFinish"]').click()
    await page.wait_for_timeout(720)
    assert await page.locator('.pk-outcome-win strong').inner_text()=='WIN'
    assert await page.locator('.pk-outcome-loss strong').inner_text()=='LOSS'
    assert await page.locator('.pk-win-streak').inner_text()=='x1'
    colors=await page.evaluate('''() => Object.fromEntries(['win','loss'].map(k=>[k,getComputedStyle(document.querySelector('.pk-outcome-'+k+' strong')).color]))''')
    assert colors['win']!=colors['loss'],colors
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors,errors
    await page.screenshot(path=str(OUT/f'{mode}-{theme}-390-finish.png'))
    results.append({'mode':mode,'theme':theme,'colors':colors})
    print('PASS',mode,theme,colors,flush=True)
   finally:await page.close()
  await browser.close()
 OUT.joinpath('results-standalone.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results),'standalone cases')
asyncio.run(main())

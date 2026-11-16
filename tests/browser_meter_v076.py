"""Responsive / point-change / accessibility regression for v0.7.6 PK meter."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(Path(__file__).parent))
from browser_room_v075 import setup,dark_theme,rect
OUT=ROOT/'docs'/'qa-v076';OUT.mkdir(parents=True,exist_ok=True)
async def run():
    records=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
        for width,height in ((320,740),(390,844),(430,932),(768,1024)):
            for mode in ('voice','cam'):
                for theme in ('light','dark'):
                    page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                    page.set_default_timeout(8000)
                    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                    await setup(page)
                    if theme=='dark':await dark_theme(page)
                    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
                    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM' if mode=='cam' else 'VOICE')).first.click()
                    await page.locator('[data-action="pkOpen"]').first.click()
                    await page.locator('[data-action="pkPreviewToggle"]').click()
                    stage=page.locator('.pk-battle-scene');bar=stage.locator('[data-pk-balance]')
                    assert await bar.get_attribute('role')=='progressbar'
                    assert await bar.get_attribute('aria-valuenow')=='56'
                    assert await stage.locator('[data-pk-points="A"]').inner_text()=='1.240'
                    assert await stage.locator('[data-pk-points="B"]').inner_text()=='980'
                    assert '260' in await stage.locator('[data-pk-gap]').inner_text()
                    b=await rect(page,'.pk-balance-bar');pin=await rect(page,'.pk-balance-pin')
                    assert b['height']>=13 and b['width']>150,(width,mode,b)
                    assert b['x']>=0 and b['right']<=width,(width,mode,b)
                    assert pin['x']>b['x']+5 and pin['right']<b['right']-5,(width,mode,pin,b)
                    if mode=='cam':
                        name=await rect(page,'.pk-side-top')
                        assert name['y']>=pin['bottom']+2,(width,theme,name,pin)
                    else:
                        chat=await rect(page,'.room-chatbox')
                        first=await rect(page,'.room-chatbox .room-log')
                        assert chat['height']>=97 and first['bottom']<=chat['bottom']+1,(width,theme,chat,first)
                    # Exact change in score must be mirrored everywhere, without remounting the stage.
                    original_id=await stage.evaluate('e=>{e.dataset.qaIdentity="persisted";return e.dataset.qaIdentity}')
                    await page.locator('[data-action="pkDemoCheer"]').click()
                    assert await bar.get_attribute('aria-valuenow')=='57'
                    assert await stage.locator('[data-pk-points="A"]').inner_text()=='1.280'
                    assert await stage.locator('[data-pk-points="B"]').inner_text()=='980'
                    assert '300' in await stage.locator('[data-pk-gap]').inner_text()
                    assert await stage.get_attribute('data-qa-identity')==original_id
                    await page.wait_for_timeout(550)
                    assert not errors,(width,mode,theme,errors)
                    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
                    if width in (320,390) and theme=='light' or (width==390 and theme=='dark'):
                        await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}.png'))
                    records.append({'width':width,'height':height,'mode':mode,'theme':theme,'after':57,'errors':errors})
                    print('PASS',width,mode,theme,flush=True)
                    await page.close()
        # Reduced motion must disable the fill movement and keep final score.
        page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
        await setup(page)
        await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
        await page.locator('[data-action="pkOpen"]').first.click()
        await page.locator('[data-action="pkPreviewToggle"]').click()
        fill=page.locator('.pk-balance-a')
        assert await fill.evaluate('e=>getComputedStyle(e).transitionDuration')=='0s'
        await page.locator('[data-action="pkDemoCheer"]').click()
        assert await page.locator('[data-pk-balance]').get_attribute('aria-valuenow')=='57'
        await page.close();await browser.close()
        records.append({'reduced_motion':True,'passed':True})
    (OUT/'results.json').write_text(json.dumps({'cases':records,'count':len(records)},ensure_ascii=False,indent=2))
    print('COMPLETED',len(records),'checks')
if __name__=='__main__':asyncio.run(run())

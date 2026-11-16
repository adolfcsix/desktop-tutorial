"""Real browser QA of v0.8.14: no duplicated Voice score and a centered result row."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0814'
OUT.mkdir(parents=True,exist_ok=True)

async def check(page,width,height,mode,theme):
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    await setup(page)
    if theme=='dark':await dark_theme(page)
    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
    await page.locator('[data-action="pkOpen"]').first.click()
    await page.locator('[data-action="pkPreviewToggle"]').click()
    await page.wait_for_timeout(100)
    stage=page.locator('.pk-battle-scene')
    composerSel='.cam-compose button' if mode=='cam' else '.room-compose button'
    start_composer=await page.locator(composerSel).first.evaluate('(e)=>e.getBoundingClientRect().y')
    assert await page.locator('[data-pk-points="A"]').inner_text()=='1.240'
    assert await page.locator('[data-pk-points="B"]').inner_text()=='980'
    assert '%' not in await page.locator('.pk-balance-legends').inner_text()
    if mode=='voice':
        assert await stage.locator('.pk-side-score').count()==0
        assert await stage.locator('.pk-voice-outcome-slot').count()==2
        assert all(not txt.strip() for txt in await stage.locator('.pk-voice-outcome-slot').all_inner_texts())
        assert await stage.locator('.pk-person>strong').count()==2
        # No score or score caption inside either participant card.
        for tile in await stage.locator('.pk-duel-side').all():
            assert await tile.locator('[data-pk-score], [data-pk-points]').count()==0
            assert 'ĐIỂM CỔ VŨ' not in (await tile.inner_text()).upper()
    else:
        assert await stage.locator('.pk-side-score').count()==2
        assert await stage.locator('.pk-voice-outcome-slot').count()==0
    await stage.locator('[data-action="pkOpen"]').click()
    await page.locator('[data-action="pkDemoFinish"]').click()
    await page.wait_for_timeout(640)
    assert await stage.locator('.pk-outcome-win strong').inner_text()=='WIN'
    assert await stage.locator('.pk-outcome-loss strong').inner_text()=='LOSS'
    assert await stage.locator('.pk-win-streak').inner_text()=='x1'
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    current_composer=await page.locator(composerSel).first.evaluate('(e)=>e.getBoundingClientRect().y')
    assert abs(current_composer-start_composer)<1.5,(mode,theme,width,'composer moved',current_composer,start_composer)
    geom=await page.evaluate('''() => {
      const b=e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      let stage=document.querySelector('.pk-battle-scene');
      let sides=[...stage.querySelectorAll('.pk-duel-side')];
      return {sides:sides.map(b),flags:[...stage.querySelectorAll('.pk-outcome-flag')].map(b),
        slots:[...stage.querySelectorAll('.pk-voice-outcome-slot')].map(b),
        hostnames:[...stage.querySelectorAll('.pk-person>strong')].map(b),
        avatars:[...stage.querySelectorAll('.pk-person-ring')].map(b),
        meter:b(stage.querySelector('.pk-scoreboard')),
        colors:Object.fromEntries(['win','loss'].map(k=>[k,getComputedStyle(stage.querySelector('.pk-outcome-'+k+' strong')).color]))};
    }''')
    assert len(geom['flags'])==2
    if mode=='voice':
        assert await stage.locator('.pk-voice-outcome-slot>.pk-outcome-flag').count()==2
        for i,(slot,flag,side) in enumerate(zip(geom['slots'],geom['flags'],geom['sides'])):
            assert flag['y']>=slot['y']-1 and flag['bottom']<=slot['bottom']+1,(i,'outside slot',slot,flag)
            assert flag['x']>=side['x']-1 and flag['right']<=side['right']+1,(i,'outside side',flag,side)
            assert flag['y']>geom['hostnames'][i]['bottom']+1,(i,'overlap host',geom)
            assert abs((flag['x']+flag['right'])/2-(side['x']+side['right'])/2)<3,(i,'not centered',flag,side)
        assert all(f['bottom']<geom['meter']['y'] for f in geom['flags']),('overlaps meter',geom)
    else:
        assert await stage.locator('.pk-side-score>.pk-cam-finish-slot').count()==2
    assert geom['colors']['win']!=geom['colors']['loss'],geom['colors']
    assert not errors,errors
    await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}-finish.png'))
    return {'width':width,'mode':mode,'theme':theme,'colors':geom['colors'],'composer_shift':round(current_composer-start_composer,2)}

async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
        for width,height in [(320,740),(360,780),(390,844),(430,932)]:
            for theme in ('light','dark'):
                page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                page.set_default_timeout(12000)
                try:
                    result=await check(page,width,height,'voice',theme)
                    results.append(result)
                    print('PASS',width,theme,'voice',flush=True)
                finally:await page.close()
        for theme in ('light','dark'):
            page=await browser.new_page(viewport={'width':390,'height':844})
            page.set_default_timeout(12000)
            try:
                result=await check(page,390,844,'cam',theme)
                results.append(result)
                print('PASS',390,theme,'cam regression',flush=True)
            finally:await page.close()
        # 3.2s overlay auto-dismiss, reduced-motion still labels WIN/LOSS.
        page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
        page.set_default_timeout(12000)
        await check(page,390,844,'voice','light')
        assert await page.locator('.pk-person-ring').first.evaluate('(e)=>getComputedStyle(e).animationName')=='none'
        await page.wait_for_timeout(2900)
        assert await page.locator('.pk-end-presentation').count()==0
        assert await page.locator('.room-compose').count()==1
        await page.close()
        await browser.close()
    (OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('TOTAL',len(results),'plus reduced-motion and auto-dismiss',flush=True)

if __name__=='__main__':asyncio.run(main())

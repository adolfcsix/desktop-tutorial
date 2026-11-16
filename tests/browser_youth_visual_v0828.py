"""Cross-screen design audit of the EXACT standalone preview: no remote web assets required.
WCAG-like calculations cover authored foreground/background of primary surfaces only.
Video backdrops are intentionally excluded from the flat-surface contrast calculation.
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
R = Path(__file__).resolve().parents[1]
VERSION = json.loads((R/'package.json').read_text())['version']
HTML = (R.parent/('TUTTT_V'+VERSION.replace('.','_')+'_PREVIEW.html')).read_text()
OUT = R/'docs'/('qa-v'+VERSION.replace('.',''));  OUT.mkdir(parents=True, exist_ok=True)

def lum(hexstr):
    a=[int(hexstr[i:i+2],16)/255 for i in (1,3,5)]
    r=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in a]
    return .2126*r[0]+.7152*r[1]+.0722*r[2]
def contrast(a,b):
    x,y=lum(a),lum(b)
    return round((max(x,y)+.05)/(min(x,y)+.05),2)
async def computed(page,selector,property):
    return await page.locator(selector).first.evaluate('(el,k)=>getComputedStyle(el)[k]',property)
async def no_overflow(page,tag):
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth+1'),tag+' overflow'
async def switch(page,theme):
    if theme=='light':return
    await page.locator('[data-action="tab"][data-id="profile"]').click()
    await page.locator('[data-action="settings"]').click()
    await page.locator('[data-action="setTheme"][data-id="dark"]').click()
    assert await page.locator('[data-action="setTheme"][data-id="dark"]').get_attribute('aria-pressed')=='true'
    assert await page.locator('meta[name="theme-color"]').get_attribute('content')=='#1B1719'
    await page.locator('[data-action="back"]').click()

async def main():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
        for width,height in [(320,740),(390,844),(430,932)]:
            for theme in ('light','dark'):
                page=await browser.new_page(viewport={'width':width,'height':height})
                page.set_default_timeout(13000)
                errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                try:
                    await page.set_content(HTML,wait_until='domcontentloaded')
                    await page.locator('[data-action="tab"][data-id="live"]').first.click()
                    assert await page.locator('.brand-approved-header').evaluate('el=>el.naturalWidth')>0,'Header logo missing'
                    await switch(page,theme)
                    # Discover — surface, nav, featured card, no horizontal overflow
                    await page.locator('[data-action="tab"][data-id="discover"]').click()
                    assert await computed(page,'.scrollbody','backgroundColor')==('rgb(248, 242, 235)' if theme=='light' else 'rgb(27, 23, 25)')
                    art=await computed(page,'.hero-room','backgroundImage')
                    assert ('255, 249, 243' if theme=='light' else '72, 48, 51') in art,(theme,art)
                    title=await computed(page,'.page-title','color');assert title==('rgb(45, 33, 29)' if theme=='light' else 'rgb(255, 243, 233)'),title
                    sizes=await page.locator('.nav-item').evaluate_all('els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))')
                    assert all(x['w']>=44 and x['h']>=44 for x in sizes),sizes
                    await no_overflow(page,'discover')
                    if width==390:await page.screenshot(path=str(OUT/f'discover-{theme}-390.png'))
                    await page.locator('.nav [data-action="tab"][data-id="live"]').click()
                    await no_overflow(page,'Live browse')
                    if width==390:await page.screenshot(path=str(OUT/f'live-{theme}-390.png'))
                    await page.locator('[data-action="tab"][data-id="chat"]').click()
                    await no_overflow(page,'chat')
                    if width==390:await page.screenshot(path=str(OUT/f'chat-{theme}-390.png'))
                    await page.locator('[data-action="openChat"]').first.click()
                    await page.locator('#chat-send input').fill('Kiểm thử bản nháp không bị mất')
                    assert await page.locator('#chat-send input').input_value()=='Kiểm thử bản nháp không bị mất'
                    if width==390:await page.screenshot(path=str(OUT/f'conversation-{theme}-390.png'))
                    await page.locator('[data-action="back"]').click()
                    await page.locator('[data-action="tab"][data-id="profile"]').click()
                    cover=await computed(page,'.profile-cover','backgroundImage')
                    assert ('249, 223, 200' if theme=='light' else '83, 51, 57') in cover,(theme,cover)
                    if width==390:await page.screenshot(path=str(OUT/f'profile-{theme}-390.png'))
                    await page.locator('[data-action="settings"]').click()
                    assert await page.locator('.theme-choice').count()==2
                    await no_overflow(page,'settings')
                    if width==390:await page.screenshot(path=str(OUT/f'settings-{theme}-390.png'))
                    await page.locator('[data-action="back"]').click()
                    await page.locator('[data-action="tab"][data-id="create"]').first.click()
                    assert await page.locator('.sheet').is_visible()
                    assert await computed(page,'.sheet','backgroundColor')==('rgb(255, 252, 247)' if theme=='light' else 'rgb(40, 33, 36)')
                    await no_overflow(page,'modal')
                    if width==390:await page.screenshot(path=str(OUT/f'create-{theme}-390.png'))
                    await page.locator('[data-action="closeModal"]').first.click()
                    # Voice PK and audience — latest rules intentionally remain untouched
                    await page.locator('.nav [data-action="tab"][data-id="live"]').click()
                    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
                    await page.locator('[data-action="pkOpen"]').first.click()
                    await page.locator('[data-action="pkPreviewToggle"]').first.click()
                    legend=await page.locator('.pk-balance-legends').inner_text()
                    assert '%' not in legend and '1.240' in legend and '980' in legend,legend
                    assert await page.locator('.audience-trigger:visible').count()==1
                    await no_overflow(page,'voice PK')
                    if width==390:await page.screenshot(path=str(OUT/f'voice-{theme}-390.png'))
                    assert not errors,(width,theme,errors)
                    results.append({'width':width,'theme':theme,'steps':['Discover','Live','Chat','Conversation','Profile','Settings','Create room','Voice PK'],'logo':'approved','metaColor':await page.locator('meta[name="theme-color"]').get_attribute('content')})
                    print('PASS',width,theme,'8 screens + PK',flush=True)
                finally:await page.close()
        await browser.close()
    ratios={
        'ivoryText':contrast('#2D211D','#F8F2EB'),
        'ivorySecondary':contrast('#65534C','#F8F2EB'),
        'ivoryAccent':contrast('#A9382B','#F8F2EB'),
        'espressoText':contrast('#FFF3E9','#1B1719'),
        'espressoSecondary':contrast('#D9C2B7','#1B1719'),
        'espressoAccent':contrast('#FFAE90','#1B1719'),
        'nativeDarkSentBubble':contrast('#FFF5EA','#B74A3D')
    }
    assert all(r>=4.5 for r in ratios.values()),ratios
    (OUT/'visual-audit.json').write_text(json.dumps({'version':VERSION,'runs':results,'textContrasts':ratios},ensure_ascii=False,indent=2))
    print('DONE',len(results),'screen matrix, contrast',ratios,flush=True)

if __name__=='__main__':asyncio.run(main())

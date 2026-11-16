"""Visual + interaction audit for compact Live/PK rooms v0.7.5."""
import asyncio, base64, json, re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'docs'/'qa-v075'
OUT.mkdir(parents=True, exist_ok=True)
raw=(ROOT/'prototype/index.html').read_text()
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',raw)
scripts=re.findall(r'<script src="([^"]+)"></script>',raw)
base=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',raw)
base=re.sub(r'<script src="[^"]+"></script>','',base)
logo=base64.b64encode((ROOT/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
base=base.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')

async def setup(page):
    await page.set_content(base,wait_until='domcontentloaded')
    for f in styles:
        css=(ROOT/'prototype'/f).read_text()
        css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
        await page.add_style_tag(content=css)
    for f in scripts:
        await page.add_script_tag(content=(ROOT/'prototype'/f).read_text())
    await page.locator('[data-action="tab"][data-id="live"]').first.click()

async def dark_theme(page):
    await page.locator('[data-action="tab"][data-id="profile"]').first.click()
    await page.locator('[data-action="settings"]').first.click()
    await page.locator('[data-action="setTheme"][data-id="dark"]').first.click()
    await page.locator('[data-action="back"]').first.click()
    await page.locator('[data-action="tab"][data-id="live"]').first.click()

async def rect(page,sel):
    return await page.locator(sel).first.evaluate('''e=>{let r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}}''')

async def run():
    results=[]
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
        for width,height in ((320,740),(390,844),(430,932),(768,1024)):
            for theme in ('light','dark'):
                for mode in ('cam','voice'):
                    page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
                    page.set_default_timeout(8000)
                    errors=[]
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    await setup(page)
                    if theme=='dark':await dark_theme(page)
                    if mode=='cam': await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
                    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM' if mode=='cam' else 'VOICE')).first.click()
                    # In both non-PK and PK Voice, the audience count must open the sheet.
                    if mode=='voice':
                        audience=page.locator('.room-topbar .voice-audience')
                        assert await audience.count()==1
                        await audience.click()
                        await page.get_by_role('heading',name='Người trong phòng').wait_for()
                        text=await page.locator('.cam-sheet-body').inner_text()
                        assert 'Không tìm thấy phòng' not in text and 'bản xem trước' in text.casefold(),text
                        await page.locator('[data-action="closeModal"]').first.click()
                        assert await page.get_by_role('heading',name='Người trong phòng').count()==0
                    await page.locator('[data-action="pkOpen"]').first.click()
                    await page.locator('[data-action="pkPreviewToggle"]').click()
                    await page.wait_for_timeout(100)
                    selector='.cam-actions .cam-action' if mode=='cam' else '.room-controls .circle-action'
                    sizes=await page.locator(selector).evaluate_all('''els=>els.map(el=>{const r=el.getBoundingClientRect(),i=el.querySelector('span')?.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,h:r.height,icon:i?.width}})''')
                    gaps=[round(sizes[i+1]['x']-sizes[i]['right'],2) for i in range(len(sizes)-1)]
                    icons=[round(v['icon'],2) for v in sizes]
                    assert len(sizes)==(6 if mode=='cam' else 4),sizes
                    assert all(s['h']>=44 and s['w']>=40 and s['right']<=width+0.5 for s in sizes),sizes
                    assert all(g>=5 for g in gaps),gaps
                    assert max(icons)-min(icons)<=1,icons
                    assert all(s['x']>=0 for s in sizes),sizes
                    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
                    head=await rect(page,'.cam-topbar' if mode=='cam' else '.room-topbar')
                    input_=await rect(page,'.cam-compose input' if mode=='cam' else '.room-compose input')
                    send=await rect(page,'.cam-compose button' if mode=='cam' else '.room-compose button')
                    assert input_['height']==46 and send['height']==46,(input_,send)
                    assert abs(head['height']-(54 if mode=='voice' and width<=350 else 59))<=3,head
                    assert send['bottom']<height-45,send
                    assert not errors,(width,theme,mode,errors)
                    if mode=='voice':
                        chat=await rect(page,'.room-chatbox')
                        first=await rect(page,'.room-chatbox .room-log')
                        assert first['y']>=chat['y']-1.0 and first['bottom']<=chat['bottom']+1.0,(chat,first)
                        assert chat['height']>=97,(width,height,chat)
                        assert 'Chào mọi người!' in await page.locator('.room-chatbox .room-log').first.inner_text()
                        await page.locator('.room-topbar .voice-audience').click()
                        sheet=await page.locator('.cam-sheet-body').inner_text()
                        assert 'bản xem trước' in sheet.casefold()
                        await page.locator('[data-action="closeModal"]').first.click()
                    else:
                        await page.locator('.pk-broadcast-cam [data-action="roomAudience"]').click()
                        assert 'bản xem trước' in (await page.locator('.cam-sheet-body').inner_text()).casefold()
                        await page.locator('[data-action="closeModal"]').first.click()
                    if width in (320,390,430):
                        await page.screenshot(path=str(OUT/f'{mode}-{theme}-{width}.png'))
                    await page.locator('[data-action="pkDemoCheer"]').click()
                    # v0.8+ finishes on the same arena, not an obsolete finale/CTA panel.
                    await page.locator('[data-action="liveOptions"]').click();await page.locator('.live-option-row[data-action="pkOpen"]').click()
                    await page.locator('[data-action="pkDemoFinish"]').click()
                    assert await page.locator('.pk-end-presentation .pk-outcome-flag').count()==2
                    assert await page.locator('.pk-finale-actions button').count()==0
                    assert not errors,(width,theme,mode,errors)
                    results.append({'viewport':f'{width}x{height}','theme':theme,'mode':mode,'gaps':gaps,'icons':icons,'chat':chat if mode=='voice' else None,'errors':errors})
                    print('PASS',width,theme,mode,flush=True)
                    await page.close()
        await browser.close()
    (OUT/'results.json').write_text(json.dumps({'count':len(results),'cases':results},ensure_ascii=False,indent=2))
    print('COMPLETED',len(results),'scenarios')

if __name__=='__main__':asyncio.run(run())

from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];outdir=root/'docs'/'qa-v063';outdir.mkdir(parents=True,exist_ok=True)
html=(root/'prototype/index.html').read_text(encoding='utf8')
cssfiles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',html)
jsfiles=re.findall(r'<script src="([^"]+)"></script>',html)
html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=re.sub(r'<script src="[^"]+"></script>','',html)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def init(page):
 await page.set_content(html,wait_until='domcontentloaded')
 for f in cssfiles:await page.add_style_tag(content=re.sub(r'^@import[^;]+;','',(root/'prototype'/f).read_text(encoding='utf8'),flags=re.M))
 for f in jsfiles:await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf8'))
 await page.wait_for_timeout(120)
async def switch_dark(page):
 await page.locator('[data-action="tab"][data-id="profile"]').first.click()
 await page.locator('[data-action="settings"]').first.click()
 await page.locator('[data-action="theme"]').first.click()
 await page.locator('[data-action="back"]').first.click()
async def open_pk(page,mode):
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 if mode=='cam':
  await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
  await page.locator('.cam-content>.pk-launcher').click()
 else:
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('.voice-pk-row .pk-launcher').click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 await page.wait_for_timeout(130)
 assert await page.locator('.pk-arena-v2').count()==1
async def check():
 results=[]
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   for theme in ('light','dark'):
    for kind in ('voice','cam'):
     page=await b.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
     await init(page)
     if theme=='dark':await switch_dark(page)
     await open_pk(page,kind)
     metrics=await page.evaluate('''() => {const get=sel=>getComputedStyle(document.querySelector(sel));const css=get('.pk-arena-v2');const a=get('.pk-side-coral'),b=get('.pk-side-champagne'); const r=document.querySelector('.pk-arena-v2').getBoundingClientRect();return {windowWidth:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,stageWidth:r.width,stageBG:css.backgroundImage,stageColor:css.color,teamABG:get('.pk-side-coral .pk-person-avatar').backgroundColor,teamBBG:get('.pk-side-champagne .pk-person-avatar').backgroundColor,teamAColor:get('.pk-score-a strong').color,teamBColor:get('.pk-score-right strong').color,barB:get('.pk-balance-bar').backgroundColor,teamBAccent:css.getPropertyValue('--pk-side-b-accent').trim(),chatVisible:!!document.querySelector('.cam-floating-chat,.room-chatbox,.cam-interaction')}}''')
     assert not metrics['overflow'],f'{theme} {kind} {width} overflow'
     assert 'linear-gradient' in metrics['stageBG']
     assert metrics['teamBAccent'] in ('#E5C49E','#E8C79F'),metrics
     assert metrics['teamABG']!=metrics['teamBBG']
     assert metrics['barB'].startswith('rgb('),metrics
     assert not errors,errors
     if width==390:
      await page.screenshot(path=str(outdir/f'pk-{kind}-{theme}-390.png'))
     if width==320 and theme=='light' and kind=='cam':
      await page.screenshot(path=str(outdir/'pk-cam-light-320.png'))
     results.append({'width':width,'mode':theme,'room':kind,'errors':errors,**metrics})
     await page.close()
  await b.close()
 (outdir/'browser-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf8')
 print('Passed',len(results),'PK screenshots and computed CSS checks; no overflow/errors')
 print('CSS sample',results[1])
asyncio.run(check())

from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs/qa-v065';out.mkdir(exist_ok=True,parents=True)
html=(root/'prototype/index.html').read_text(encoding='utf8')
cssfiles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',html)
jsfiles=re.findall(r'<script src="([^"]+)"></script>',html)
html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html)
html=re.sub(r'<script src="[^"]+"></script>','',html)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def init(page):
 await page.set_content(html,wait_until='domcontentloaded')
 for f in cssfiles: await page.add_style_tag(content=re.sub(r'^@import[^;]+;','',(root/'prototype'/f).read_text(encoding='utf8'),flags=re.M))
 for f in jsfiles: await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf8'))
 await page.wait_for_timeout(140)
async def dark(page):
 await page.locator('[data-action="tab"][data-id="profile"]').first.click()
 await page.locator('[data-action="settings"]').first.click()
 await page.locator('[data-action="theme"]').first.click()
 await page.locator('[data-action="back"]').first.click()
async def enter(page,kind):
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 if kind=='cam':
  await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
  await page.locator('.cam-content>.pk-launcher').click()
 else:
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click()
  await page.locator('.voice-pk-row .pk-launcher').click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 await page.wait_for_timeout(140)
 assert await page.locator('.pk-arena-v3').count()==1
async def main():
 result=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   for theme in ['light','dark']:
    for kind in ['cam','voice']:
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
     await init(page)
     if theme=='dark':await dark(page)
     await enter(page,kind)
     measure=await page.evaluate('''() => {
      const pick=s=>document.querySelector(s);
      const style=s=>getComputedStyle(pick(s));
      const section=style('.pk-arena-v3'),left=style('.pk-side-coral'),right=style('.pk-side-champagne');
      const hostA=pick('.pk-side-coral .pk-side-score'),hostB=pick('.pk-side-champagne .pk-side-score');
      const surfaces=kind=>kind==='cam'?['.cam-topbar','.pk-arena-v3','.cam-content','.cam-interaction','.cam-compose','.cam-actions']:['.room-top','.pk-arena-v3','.room-chatbox','.room-compose','.room-controls'];
      const kind=pick('.cam-page')?'cam':'voice';
      const backgrounds=surfaces(kind).map(s=>({selector:s,color:style(s).backgroundColor}));
      return {backgrounds,overflow:document.documentElement.scrollWidth>innerWidth, border:section.borderTopWidth,
       radius:section.borderTopLeftRadius,teamA:left.backgroundColor,teamB:right.backgroundColor,
       scoreA:hostA?.textContent.trim(),scoreB:hostB?.textContent.trim(),
       bar:style('.pk-balance-bar').height,chatVisible:!!pick('.cam-interaction,.room-chatbox'),
       audienceEntry:!!pick('.pk-viewers,.voice-audience'),viewport:innerWidth};
     }''')
     assert measure['overflow']==False,(width,theme,kind,'overflow')
     assert measure['border']=='0px',measure
     assert measure['teamA']==measure['teamB']=='rgba(0, 0, 0, 0)',measure
     assert measure['scoreA'] and measure['scoreB']
     assert len({v['color'] for v in measure['backgrounds']})==1,(width,theme,kind,measure['backgrounds'])
     assert measure['backgrounds'][0]['color']!=('rgb(48, 35, 36)' if theme=='light' else 'rgb(233, 216, 202)'),measure['backgrounds']
     assert measure['chatVisible']
     assert not errors,errors
     # Free cheers must update both score and bar, never a transaction.
     initial=await page.locator('.pk-side-coral .pk-side-score strong').inner_text()
     if width==390:
      await page.screenshot(path=str(out/f'{kind}-{theme}-390.png'))
     await page.locator('[data-action="pkDemoCheer"]').click()
     updated=await page.locator('.pk-side-coral .pk-side-score strong').inner_text()
     assert updated!=initial,(initial,updated)
     if width==390 and kind=='cam' and theme=='light': await page.screenshot(path=str(out/'cam-cheer-light-390.png'))
     result.append({'width':width,'theme':theme,'kind':kind,'errors':errors,**measure,'cheerUpdated':True})
     await page.close()
  await browser.close()
 (out/'browser-results.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf8')
 print('PASS',len(result),'seamless background viewport/theme/mode scenarios')
asyncio.run(main())

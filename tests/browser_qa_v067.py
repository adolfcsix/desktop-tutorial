from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];outdir=root/'docs'/'qa-v067';outdir.mkdir(exist_ok=True,parents=True)
raw=(root/'prototype/index.html').read_text(encoding='utf8')
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',raw)
scripts=re.findall(r'<script src="([^"]+)"></script>',raw)
base=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',raw)
base=re.sub(r'<script src="[^"]+"></script>','',base)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
base=base.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def prime(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for filename in styles:
  css=(root/'prototype'/filename).read_text(encoding='utf8')
  css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for filename in scripts:
  await page.add_script_tag(content=(root/'prototype'/filename).read_text(encoding='utf8'))
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def open_pk(page,kind):
 if kind=='cam':
  await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=('CAM' if kind=='cam' else 'VOICE'))).first.click()
 await page.locator('[data-action="pkOpen"]').first.click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 await page.locator('.pk-arena-v3').wait_for()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(390,844)]:
   for theme in ('light','dark'):
    for kind in ('cam','voice'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await prime(page)
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').first.click()
      await page.locator('[data-action="settings"]').first.click()
      await page.locator('[data-action="theme"]').first.click()
      await page.locator('[data-action="back"]').first.click()
      await page.locator('[data-action="tab"][data-id="live"]').first.click()
     await open_pk(page,kind)
     # Verify timer runs down from actual preview start; manipulate only demo start using time passing
     initial=await page.locator('[data-pk-countdown]').inner_text()
     await page.wait_for_timeout(2200)
     after=await page.locator('[data-pk-countdown]').inner_text()
     assert initial!=after,(kind,width,initial,after)
     await page.locator('[data-action="pkDemoCheer"]').click()
     assert '1.280' in await page.locator('.pk-side-score').first.inner_text()
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.locator('.pk-finale').wait_for()
     assert 'minh họa' in (await page.locator('.pk-finale').get_attribute('aria-label')).lower()
     data=await page.evaluate('''() => {
       const box=s=>{const el=document.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}}
       return {stage:box('.pk-finale'),chat:box('.cam-interaction')||box('.room-chatbox'),compose:box('.cam-compose')||box('.room-compose'), overflow:document.documentElement.scrollWidth>innerWidth, title:document.querySelector('.pk-finale-title').textContent, colors:{stage:getComputedStyle(document.querySelector('.pk-finale')).backgroundColor,app:getComputedStyle(document.querySelector('#app')).backgroundColor}}
     }''')
     assert not data['overflow'],(kind,theme,width,'overflow')
     assert data['stage']['right']<=width+3,(kind,theme,width,'stage too wide',data['stage'])
     assert data['compose'],(kind,theme,width,'compose missing')
     assert not errors,(kind,theme,width,errors)
     name=f'pk-result-{kind}-{theme}-{width}.png'
     await page.screenshot(path=str(outdir/name))
     await page.locator('[data-action="pkDemoRestart"]').click()
     assert await page.locator('.pk-arena-v3.pk-demo').count()==1
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.locator('[data-action="pkResultDismiss"]').click()
     assert await page.locator('.pk-finale').count()==0
     assert await page.locator('.pk-demo').count()==0
     results.append({'width':width,'theme':theme,'kind':kind,'initialCountdown':initial,'afterCountdown':after,**data,'image':name,'pageErrors':errors,'demoReplay':True})
     await page.close()
  await browser.close()
 (outdir/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('PASS:',len(results),'/ 12 scenarios, sample:',json.dumps(results[0],ensure_ascii=False))
if __name__=='__main__':asyncio.run(main())

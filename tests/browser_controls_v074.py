from pathlib import Path
import asyncio, re, base64, json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
out=root/'docs'/'qa-v074'
out.mkdir(exist_ok=True)
raw=(root/'prototype/index.html').read_text()
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',raw)
scripts=re.findall(r'<script src="([^"]+)"></script>',raw)
base=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',raw)
base=re.sub(r'<script src="[^"]+"></script>','',base)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
base=base.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def setup(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for f in styles:
  css=(root/'prototype'/f).read_text();css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for f in scripts: await page.add_script_tag(content=(root/'prototype'/f).read_text())
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height in ((320,740),(390,844),(430,932)):
   for theme in ('light','dark'):
    for mode in ('cam','voice'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(7000)
     errors=[]
     page.on('pageerror',lambda e:errors.append(str(e)))
     await setup(page)
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').first.click()
      await page.locator('[data-action="settings"]').first.click()
      await page.locator('[data-action="theme"]').first.click()
      await page.locator('[data-action="back"]').first.click()
      await page.locator('[data-action="tab"][data-id="live"]').first.click()
     if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM' if mode=='cam' else 'VOICE')).first.click()
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     await page.wait_for_timeout(100)
     selector='.cam-actions .cam-action' if mode=='cam' else '.room-controls .circle-action'
     sizes=await page.locator(selector).evaluate_all('''els=>els.map(el=>{const r=el.getBoundingClientRect();const icon=el.querySelector('span');const i=icon?.getBoundingClientRect();return {label:el.getAttribute('aria-label')||el.textContent.trim(),x:r.x,right:r.right,w:r.width,h:r.height,iconW:i?.width,iconH:i?.height}})''')
     gaps=[round(sizes[i+1]['x']-sizes[i]['right'],2) for i in range(len(sizes)-1)]
     icons=[round(s['iconW'],2) for s in sizes]
     assert len(sizes)==(6 if mode=='cam' else 5),(mode,sizes)
     assert all(x>=44-0.01 for x in (s['h'] for s in sizes)),sizes
     assert all(g>=4.8 for g in gaps), (width,theme,mode,gaps)
     assert max(icons)-min(icons)<=1.0,(width,theme,mode,icons)
     assert all(s['w']>=40 for s in sizes),(width,theme,mode,sizes)
     assert all(s['x']>=-0.5 and s['right']<=width+0.5 for s in sizes),(width,theme,mode,sizes)
     bottoms=await page.locator(selector).evaluate_all('els=>els.map(e=>Math.round(e.getBoundingClientRect().bottom))')
     assert all(y<=height-5 for y in bottoms),(width,height,theme,mode,bottoms)
     controls=await page.evaluate('''()=>{const q=(s)=>{let a=document.querySelector(s);if(!a)return null;let r=a.getBoundingClientRect();return {h:r.height,w:r.width,x:r.x,right:r.right}};return {send:q('.cam-compose button, .room-compose button'),input:q('.cam-compose input, .room-compose input'),result:q('.pk-header-result'),clock:q('.pk-clock'),menu:q('[data-action="liveOptions"]'),overflow:document.documentElement.scrollWidth>innerWidth}}''')
     assert not controls['overflow'],(width,theme,mode,controls)
     assert controls['send'] and controls['send']['h']>=44,controls
     if mode=='cam':
      assert controls['result'] and controls['result']['h']>=44,controls
     if width in (320,390):await page.screenshot(path=str(out/f'{mode}-{theme}-{width}.png'))
     await page.locator('[data-action="pkDemoCheer"]').click()
     await page.locator('[data-action="pkDemoFinish"]').click()
     assert await page.locator('.pk-finale-actions button').count()>=2
     assert not errors,(width,theme,mode,errors)
     results.append({'width':width,'theme':theme,'mode':mode,'icons':icons,'gaps':gaps,'send':controls['send'],'overflow':controls['overflow'],'errors':errors})
     print('PASS',width,theme,mode,'gaps',gaps,'icons',icons,flush=True)
     await page.close()
  await browser.close()
 (out/'results.json').write_text(json.dumps({'cases':results},indent=2,ensure_ascii=False))
 print('COMPLETED',len(results),'scenarios')
if __name__=='__main__':asyncio.run(run())

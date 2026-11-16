from pathlib import Path
import asyncio,re,base64,json,os
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];outdir=root/'docs'/'qa-v073';outdir.mkdir(parents=True,exist_ok=True)
raw=(root/'prototype/index.html').read_text(encoding='utf8')
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',raw)
scripts=re.findall(r'<script src="([^"]+)"></script>',raw)
base=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',raw)
base=re.sub(r'<script src="[^"]+"></script>','',base)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode();base=base.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def prime(page):
 await page.set_content(base,wait_until='domcontentloaded')
 for f in styles:
  css=(root/'prototype'/f).read_text(encoding='utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for f in scripts: await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf8'))
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   if os.getenv('QA_ONLY') and str(width)!=os.getenv('QA_ONLY'): continue
   for theme in ('light','dark'):
    for kind in ('cam','voice'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(6000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     await prime(page)
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').first.click()
      await page.locator('[data-action="settings"]').first.click()
      await page.locator('[data-action="theme"]').first.click()
      await page.locator('[data-action="back"]').first.click()
      await page.locator('[data-action="tab"][data-id="live"]').first.click()
     if kind=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
     await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=('CAM' if kind=='cam' else 'VOICE'))).first.click()
     await page.locator('[data-action="pkOpen"]').first.click()
     await page.locator('[data-action="pkPreviewToggle"]').click()
     await page.locator('.pk-cheer-button').wait_for();await page.wait_for_timeout(350)
     css=await page.locator('.pk-cheer-button').evaluate('''el=>({height:el.getBoundingClientRect().height, width:el.getBoundingClientRect().width, radius:getComputedStyle(el).borderRadius, bg:getComputedStyle(el).backgroundColor,icon:!!el.querySelector('.pk-cheer-icon'),text:el.innerText})''')
     if width==390:await page.screenshot(path=str(outdir/f'pk-layout-{kind}-{theme}-390.png'))
     assert css['height']>=44 and css['icon'],css
     assert 'Tiếp sức' in css['text']
     await page.locator('[data-action="pkDemoCheer"]').click()
     await page.wait_for_timeout(480)
     assert '1.280' in await page.locator('.pk-side-score').first.inner_text()
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.locator('.pk-finale').wait_for();await page.wait_for_timeout(400)
     again=page.locator('[data-action="pkDemoRestart"]');back=page.locator('[data-action="pkResultDismiss"]')
     assert await again.is_visible() and await back.is_visible()
     dims=await page.evaluate('''() => {const n=q=>{const e=document.querySelector(q);const r=e.getBoundingClientRect();return {w:r.width,h:r.height,x:r.left,right:r.right,b:r.bottom}};return {restart:n('[data-action="pkDemoRestart"]'),dismiss:n('[data-action="pkResultDismiss"]'),overflow:document.documentElement.scrollWidth>innerWidth,buttonCount:document.querySelectorAll('.pk-finale-actions button').length}}''')
     assert dims['restart']['h']>=44 and dims['dismiss']['h']>=44,dims
     assert not dims['overflow'] and dims['restart']['right']<=width+2 and dims['dismiss']['right']<=width+2,dims
     if width==390:await page.screenshot(path=str(outdir/f'pk-result-{kind}-{theme}-390.png'))
     await again.click();assert await page.locator('.pk-cheer-button').count()==1
     await page.locator('[data-action="pkDemoFinish"]').click();await back.click();assert await page.locator('.pk-finale').count()==0
     assert not errors,errors
     print('PASS',width,theme,kind,flush=True)
     results.append({'width':width,'theme':theme,'kind':kind,'primary':css,'finale':dims,'jsErrors':errors})
     await page.close()
  if os.getenv('QA_SKIP_REDUCED')=='1':
   await browser.close()
   (outdir/'results-430.json').write_text(json.dumps({'cases':results,'reducedMotion':'checked at 320/390'},ensure_ascii=False,indent=2),encoding='utf8')
   print('COMPLETED',len(results),'cases; reduced motion checked separately',flush=True)
   return
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await prime(page);await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='VOICE')).first.click();await page.locator('[data-action="pkOpen"]').click();await page.locator('[data-action="pkPreviewToggle"]').click()
  motion=await page.locator('.pk-cheer-button').evaluate('(el)=>getComputedStyle(el).transitionDuration')
  assert motion in ('0s','0s, 0s'),motion
  await page.close();await browser.close()
 (outdir/'results.json').write_text(json.dumps({'cases':results,'reducedMotion':'PASS'},ensure_ascii=False,indent=2),encoding='utf8')
 print('COMPLETED',len(results),'cases + reduced motion',flush=True)
if __name__=='__main__':asyncio.run(main())

from pathlib import Path
import asyncio,re,base64,json,os
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1]
outdir=root/'docs'/'qa-v069';outdir.mkdir(parents=True,exist_ok=True)
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
 if kind=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=('CAM' if kind=='cam' else 'VOICE'))).first.click()
 await page.locator('[data-action="pkOpen"]').first.click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 await page.locator('.pk-arena-v3').wait_for()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   if os.getenv('QA_ONLY') and str(width)!=os.getenv('QA_ONLY'):continue
   for theme in ('light','dark'):
    for kind in ('cam','voice'):
     page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
     page.set_default_timeout(5000)
     errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
     print('START',width,theme,kind,flush=True)
     await prime(page)
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').first.click()
      await page.locator('[data-action="settings"]').first.click()
      await page.locator('[data-action="theme"]').first.click()
      await page.locator('[data-action="back"]').first.click()
      await page.locator('[data-action="tab"][data-id="live"]').first.click()
     print('PRIMED',width,theme,kind,flush=True)
     await open_pk(page,kind)
     print('PK OPEN',width,theme,kind,flush=True)
     await page.wait_for_timeout(500)
     assert await page.locator('.pk-field-art').count()==1
     assert await page.locator('.pk-arena-v3 .pk-person-ring').count()==2
     assert 'pk-demo' in (await page.locator('.pk-arena-v3').get_attribute('class'))
     if width==390:
      await page.screenshot(path=str(outdir/f'pk-active-{kind}-{theme}-390.png'))
     input_selector='.cam-compose input' if kind=='cam' else '.room-compose input'
     print('FILL',width,theme,kind,flush=True)
     await page.locator(input_selector).fill('Tin nhắn nháp chưa gửi')
     # Identity, not merely restored input value: a remount restarts entrance animation.
     await page.evaluate('''() => {window.__stageBefore=document.querySelector('.pk-duel');window.__draftBefore=document.querySelector('.cam-compose input, .room-compose input');}''')
     await page.locator('[data-action="pkDemoCheer"]').click()
     persistent=await page.evaluate('''() => ({sameStage:document.querySelector('.pk-duel')===window.__stageBefore,
       sameDraft:document.querySelector('.cam-compose input, .room-compose input')===window.__draftBefore})''')
     assert persistent['sameStage'] and persistent['sameDraft'],(width,theme,kind,persistent)
     await page.wait_for_timeout(550)
     assert '1.280' in await page.locator('.pk-side-score').first.inner_text()
     assert '1.280' in await page.locator('.pk-score-line').inner_text()
     assert await page.locator('.pk-cheer-fly').count()==1
     assert await page.locator(input_selector).input_value()=='Tin nhắn nháp chưa gửi'
     initial=await page.locator('[data-pk-countdown]').inner_text()
     if width==390 and kind=='cam' and theme=='light':
      await page.wait_for_timeout(1100)
      assert initial!=await page.locator('[data-pk-countdown]').inner_text()
     print('CHEERED',width,theme,kind,flush=True)
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.locator('.pk-finale').wait_for()
     await page.wait_for_timeout(720)
     assert await page.locator('.pk-finale-avatar').count()==2
     assert 'Thắng rồi!' in await page.locator('.pk-finale-title').inner_text()
     dims=await page.evaluate('''() => {
       const box=s=>{const el=document.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
       return {stage:box('.pk-finale'),chat:box('.cam-interaction')||box('.room-chatbox'),compose:box('.cam-compose')||box('.room-compose'),overflow:document.documentElement.scrollWidth>innerWidth,head:document.querySelector('.pk-finale-title').textContent,bg:getComputedStyle(document.querySelector('.pk-finale')).backgroundColor}
     }''')
     assert not dims['overflow'],(width,kind,theme,'overflow')
     assert dims['stage']['x']>=-2 and dims['stage']['right']<=width+2,(width,kind,theme,'stage clipped',dims['stage'])
     assert dims['compose'] and dims['chat']
     assert not errors,(width,kind,theme,errors)
     if width in (320,390):await page.screenshot(path=str(outdir/f'pk-result-{kind}-{theme}-{width}.png'))
     print('DIMS',width,theme,kind,dims,flush=True)
     await page.locator('[data-action="pkDemoRestart"]').click()
     assert await page.locator('.pk-arena-v3.pk-demo').count()==1
     await page.locator('[data-action="pkDemoFinish"]').click()
     await page.locator('[data-action="pkResultDismiss"]').click()
     assert await page.locator('.pk-finale').count()==0
     print('DONE',width,theme,kind,flush=True)
     results.append({'width':width,'height':height,'theme':theme,'kind':kind,'draftPreserved':True,'incrementalScoreDOM':persistent,'finale':dims,'errors':errors,'replayDismiss':True})
     await page.close()
  # Check reduced-motion branch: animations are actually disabled, but results still visible.
  page=await browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
  await prime(page);await open_pk(page,'cam')
  reduced=await page.locator('.pk-duel').evaluate('(el)=>getComputedStyle(el).animationName')
  assert reduced=='none',reduced
  await page.locator('[data-action="pkDemoCheer"]').click()
  assert '1.280' in await page.locator('.pk-side-score').first.inner_text()
  transition=await page.locator('.pk-balance-a').evaluate('(el)=>getComputedStyle(el).transitionDuration')
  assert transition in ('0s','0s, 0s'),transition
  await page.close()
  await browser.close()
 (outdir/('results-'+(os.getenv('QA_ONLY') or 'all')+'.json')).write_text(json.dumps({'cases':results,'reducedMotion':'PASS'},ensure_ascii=False,indent=2),encoding='utf8')
 print(f'PASS {len(results)}/{len(results)} responsive cases; reduced-motion PASS')
if __name__=='__main__':asyncio.run(main())

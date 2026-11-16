from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];outdir=root/'docs'/'qa-v066';outdir.mkdir(exist_ok=True,parents=True)
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
async def enter_pk(page,kind):
 if kind=='cam':
  await page.locator('[data-action="liveMode"][data-id="cam"]').first.click()
 await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=('CAM' if kind=='cam' else 'VOICE'))).first.click()
 launcher=page.locator('.cam-content > .pk-launcher' if kind=='cam' else '.voice-pk-row .pk-launcher')
 await launcher.click()
 await page.locator('[data-action="pkPreviewToggle"]').click()
 await page.locator('.pk-arena-v3').wait_for()
async def main():
 rows=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
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
     await enter_pk(page,kind)
     await page.wait_for_timeout(90)
     filename=f'{kind}-{theme}-{width}.png'
     await page.screenshot(path=str(outdir/filename))
     results=await page.evaluate('''() => {
      const q=s=>document.querySelector(s),r=s=>{const n=q(s);if(!n)return null;const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,scrollW:n.scrollWidth,clientW:n.clientWidth}};
      const hostA=r('.pk-duel-side:first-child .pk-person strong'),hostB=r('.pk-duel-side:nth-child(2) .pk-person strong');
      const scoreA=r('.pk-duel-side:first-child .pk-side-score'),scoreB=r('.pk-duel-side:nth-child(2) .pk-side-score');
      const chat=r('.cam-interaction.cam-chat-float')||r('.room-chatbox');
      const composer=r('.cam-compose')||r('.room-compose');
      return {bodyOverflow:document.documentElement.scrollWidth>innerWidth,stage:r('.pk-arena-v3'),hostA,hostB,scoreA,scoreB,chat,composer,labels:Array.from(document.querySelectorAll('.pk-side-score span')).map(x=>x.textContent),font:getComputedStyle(q('.pk-person strong')).fontFamily,scoreSize:getComputedStyle(q('.pk-side-score strong')).fontSize,stageBG:getComputedStyle(q('.pk-arena-v3')).backgroundColor,chatBG:getComputedStyle(q('.cam-interaction')||q('.room-chatbox')).backgroundColor,buttons:[...document.querySelectorAll('.pk-viewers,[data-action="liveOptions"],.pk-cheer-button')].map(b=>({text:b.textContent.trim(),height:b.getBoundingClientRect().height}))}
     }''')
     results.update({'width':width,'height':height,'theme':theme,'kind':kind,'image':filename,'errors':errors})
     assert not errors,(kind,theme,width,errors)
     assert not results['bodyOverflow'],(kind,theme,width,'overflow')
     assert results['hostA']['right']<=results['hostB']['x'],(kind,theme,width,'host overlap')
     assert results['scoreA']['right']<=results['scoreB']['x'],(kind,theme,width,'score overlap')
     assert results['chat'] and results['composer'],(kind,theme,width,'chat/composer')
     assert results['scoreSize']!='29px',('typography did not override',results)
     rows.append(results)
     await page.close()
  await browser.close()
 (outdir/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
 print('BROWSER_QA_V066',len(rows),'passed')
 for x in rows:print(x['width'],x['kind'],x['theme'],'font',x['font'],'score',x['scoreSize'],'chat-y',round(x['chat']['y']))
asyncio.run(main())

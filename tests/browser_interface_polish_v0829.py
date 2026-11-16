"""Actual Chrome interaction and legibility review across small/large viewports.
No network dependencies; exercises the exact exported HTML for release.
"""
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'package.json').read_text())['version']
HTML=(ROOT.parent/('TUTTT_V'+VERSION.replace('.','_')+'_PREVIEW.html')).read_text()
OUT=ROOT/'docs'/('qa-v'+VERSION.replace('.',''))
OUT.mkdir(parents=True,exist_ok=True)
async def test_layout(page,width,theme):
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 await page.set_content(HTML,wait_until='domcontentloaded')
 if theme=='dark':
  await page.locator('[data-action="tab"][data-id="profile"]').click()
  await page.locator('[data-action="settings"]').click()
  await page.locator('[data-action="setTheme"][data-id="dark"]').click()
  await page.locator('[data-action="back"]').click()
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 # Body copy is not the tiny 10px default and all primary touch controls have reasonable targets.
 dims=await page.evaluate("""() => ({
  title:getComputedStyle(document.querySelector('.room-info h3')).fontSize,
  subtitle:getComputedStyle(document.querySelector('.room-info .room-desc')).fontSize,
  nav:[...document.querySelectorAll('.nav-item')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),
  action:[...document.querySelectorAll('.text-btn')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),
  overflow:document.documentElement.scrollWidth > innerWidth+1,
  background:getComputedStyle(document.querySelector('.scrollbody')).backgroundColor
 })""")
 assert not dims['overflow'],(width,theme,'overflow')
 assert float(dims['title'][:-2])>=13 and float(dims['subtitle'][:-2])>=11,(width,theme,dims)
 assert all(x['w']>=44 and x['h']>=44 for x in dims['nav']),(width,theme,'nav target',dims)
 assert all(x['h']>=44 for x in dims['action']),(width,theme,'text target',dims)
 assert dims['background']==('rgb(248, 242, 235)' if theme=='light' else 'rgb(27, 23, 25)'),dims
 await page.locator('[data-action="tab"][data-id="discover"]').click()
 hero=page.locator('.hero-room[role="button"]')
 await hero.focus()
 assert await hero.evaluate('(el)=>el===document.activeElement')
 # Native keyboard accessibility: the whole featured card is a real keyboard target.
 await page.keyboard.press('Enter')
 assert await page.locator('.room-top').count()==1 or await page.locator('.cam-room').count()==1,'keyboard hero opening'
 if width==390:
  await page.screenshot(path=str(OUT/f'polish-voice-{theme}-390.png'),full_page=True)
 assert not errors,errors
 return {'width':width,'theme':theme,'typography':{'title':dims['title'],'subtitle':dims['subtitle']},'tabTargets':dims['nav'],'actionTargets':dims['action'],'keyboardHero':'pass'}
async def main():
 outcomes=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for w,h in [(320,740),(390,844),(430,932)]:
   for theme in ('light','dark'):
    page=await browser.new_page(viewport={'width':w,'height':h});page.set_default_timeout(10000)
    try:outcomes.append(await test_layout(page,w,theme));print('PASS',w,theme,flush=True)
    finally:await page.close()
  await browser.close()
 (OUT/'interface-polish-audit.json').write_text(json.dumps({'version':VERSION,'cases':outcomes},ensure_ascii=False,indent=2))
 print('PASS',len(outcomes),'interface and keyboard checks')
if __name__=='__main__':asyncio.run(main())

"""Live-mode profile + declutter browser acceptance. The backend HTTP profile contract
is separately tested in server/test/http_system_e2e_v0844.test.js.
Browser here uses a deterministic API stub; no media/device claims are made.
"""
import asyncio,json,re
from pathlib import Path
from playwright.async_api import async_playwright
from browser_room_v075 import ROOT,base,styles,scripts

OUT=ROOT/'docs'/'qa-v0844';OUT.mkdir(parents=True,exist_ok=True)
FAKE_NETWORK=r'''() => {
 window.__profileSaves=[];
 window.TutttNetwork={
  session:async()=>({user:{id:'me',name:'Mai',bio:'Đã đồng bộ lời giới thiệu'}}),
  rooms:async()=>({rooms:[]}),
  profile:async(name,bio)=>{
   window.__profileSaves.push({name,bio});return {user:{id:'me',name,bio}};
  }
 };
 window.EventSource=class {constructor(){} addEventListener(){} close(){}};
}'''

async def load(page,connected=False):
 await page.set_content(base,wait_until='domcontentloaded')
 for f in styles:
  css=(ROOT/'prototype'/f).read_text('utf8')
  await page.add_style_tag(content=re.sub(r'^@import[^;]+;', '',css,flags=re.M))
 for f in scripts:
  if f=='app.js' and connected:await page.evaluate(FAKE_NETWORK)
  await page.add_script_tag(content=(ROOT/'prototype'/f).read_text('utf8'))
 if connected:await page.wait_for_function("document.querySelector('[data-action=tab][data-id=profile]')!==null && window.__profileSaves")

async def profile_case(browser,width,theme):
 page=await browser.new_page(viewport={'width':width,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  await load(page,True)
  await page.locator('[data-action="tab"][data-id="profile"]').first.click()
  if theme=='dark':
   await page.locator('[data-action="settings"]').first.click()
   await page.locator('[data-action="setTheme"][data-id="dark"]').first.click()
   await page.locator('[data-action="back"]').first.click()
  assert 'Đã đồng bộ lời giới thiệu' in await page.locator('.profile-title').locator('..').inner_text()
  assert await page.locator('.stat-grid').count()==0,'Fake follow counters must be hidden for real guest session'
  assert await page.locator('.badge-row').count()==0,'Fake achievements must be hidden for real guest session'
  await page.locator('[data-action="editProfile"]').click()
  await page.locator('#edit-profile [name="name"]').fill('Mai mới')
  await page.locator('#edit-profile [name="bio"]').fill('Đã lưu trên máy chủ')
  await page.locator('#edit-profile button[type="submit"]').click()
  await page.wait_for_function('window.__profileSaves.length === 1')
  assert await page.evaluate('window.__profileSaves[0].bio')=='Đã lưu trên máy chủ'
  assert 'Mai mới' in await page.locator('.profile-title').inner_text()
  assert 'Đã lưu trên máy chủ' in await page.locator('.profile-title').locator('..').inner_text()
  assert await page.locator('[role="dialog"]').count()==0
  assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
  assert not errors,errors
  await page.screenshot(path=str(OUT/f'profile-server-{theme}-{width}.png'))
  return {'width':width,'theme':theme,'profile_saved':True,'no_fake_stats':True}
 finally:await page.close()

async def live_case(browser,mode):
 page=await browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  await load(page)
  await page.locator('[data-action="tab"][data-id="live"]').first.click()
  if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
  assert await page.locator('[data-action="gift"],[data-action="heart"]').count()==0
  await page.locator('[data-action="pkOpen"]').first.click()
  await page.locator('[data-action="pkPreviewToggle"]').first.click()
  assert await page.locator('[data-action="pkDemoCheer"]').count()>=1
  assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
  assert not errors,errors
  await page.screenshot(path=str(OUT/f'{mode}-no-fake-buttons-390.png'))
  return {'mode':mode,'no_fake_controls':True,'pk_cheer_kept':True}
 finally:await page.close()

async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  try:
   for width,theme in ((320,'light'),(390,'light'),(390,'dark'),(430,'dark')):
    results.append(await profile_case(browser,width,theme));print('PASS profile',width,theme,flush=True)
   for mode in ('voice','cam'):
    results.append(await live_case(browser,mode));print('PASS live',mode,flush=True)
  finally:await browser.close()
 (OUT/'profile-controls-v0844.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 print('PASS',len(results),'additional browser scenarios',flush=True)
if __name__=='__main__':asyncio.run(main())

"""Real Chromium audit of UI shells and theme switches on non-Live pages."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
VERSION=json.loads((ROOT/'package.json').read_text())['version']
PREVIEW=ROOT.parent/f'TUTTT_V{VERSION.replace(".","_")}_PREVIEW.html'
async def setup(page):
 await page.set_content(PREVIEW.read_text(encoding='utf-8'),wait_until='domcontentloaded')
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
 await page.locator('.brand-approved-header').evaluate('e=>e.decode()')
 assert await page.locator('.brand-approved-header').evaluate('e=>e.naturalWidth')>0,'Standalone header logo did not load' 
OUT=ROOT/'docs'/'qa-v0821';OUT.mkdir(parents=True,exist_ok=True)
async def color(page,sel,field='backgroundColor'):
 return await page.locator(sel).first.evaluate('(e,field)=>getComputedStyle(e)[field]',field)
def bright(s):
 vals=[int(x.strip()) for x in s.removeprefix('rgb(').removeprefix('rgba(').split(')')[0].split(',')[:3]]
 return sum(vals)/3>155
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  for width,height in [(320,740),(390,844),(430,932)]:
   page=await browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await setup(page)
   try:
    for theme in ['light','dark']:
     if theme=='dark':
      await page.locator('[data-action="tab"][data-id="profile"]').click()
      await page.locator('[data-action="settings"]').click()
      await page.locator('[data-action="setTheme"][data-id="dark"]').click()
      assert await page.locator('[data-action="setTheme"][data-id="dark"]').get_attribute('aria-pressed')=='true'
      assert await page.locator('[data-action="setTheme"][data-id="light"]').get_attribute('aria-pressed')=='false'
     elif width==390:
      # Idempotent choice should not invert theme.
      await page.locator('[data-action="tab"][data-id="profile"]').click()
      await page.locator('[data-action="settings"]').click()
      await page.locator('[data-action="setTheme"][data-id="light"]').click()
      assert await page.locator('[data-action="setTheme"][data-id="light"]').get_attribute('aria-pressed')=='true'
     expected_light=theme=='light'
     assert (await color(page,'.statusbar')).startswith('rgb(')
     header=await color(page,'.statusbar')
     assert bright(header)==expected_light,(theme,width,'statusbar',header)
     if await page.locator('[data-action="back"]').count():
      await page.locator('[data-action="back"]').click()
     await page.locator('[data-action="tab"][data-id="discover"]').click()
     h=await color(page,'.app-header');hero=await color(page,'.hero-room');vibe=await color(page,'.vibe-banner')
     assert bright(h)==expected_light,(theme,width,'header',h)
     # background image gradients are rendered so sample pixels or check authored colors.
     assert ('255, 249, 243' in await color(page,'.hero-room','backgroundImage'))==expected_light,(theme,width,await color(page,'.hero-room','backgroundImage'))
     assert ('255, 252, 247' in await color(page,'.vibe-banner','backgroundImage'))==expected_light,(theme,width,await color(page,'.vibe-banner','backgroundImage'))
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,theme,'discover overflow')
     if width==390: await page.screenshot(path=str(OUT/f'discover-{theme}-390.png'))
     await page.locator('[data-action="tab"][data-id="chat"]').click()
     chatbg=await color(page,'.chat-row');assert bright(chatbg)==expected_light,(theme,width,'chat row',chatbg)
     if width==390: await page.screenshot(path=str(OUT/f'chat-{theme}-390.png'))
     await page.locator('[data-action="openChat"]').first.click()
     conv=await color(page,'.conversation-head');editor=await color(page,'.chat-compose input')
     assert bright(conv)==expected_light,(theme,width,'chat header',conv)
     assert bright(editor)==expected_light,(theme,width,'chat editor',editor)
     await page.locator('#chat-send input').fill('Giữ nội dung đang nhập')
     if width==390: await page.screenshot(path=str(OUT/f'conversation-{theme}-390.png'))
     assert await page.locator('#chat-send input').input_value()=='Giữ nội dung đang nhập'
     await page.locator('[data-action="back"]').click()
     await page.locator('[data-action="tab"][data-id="profile"]').click()
     if width==390: await page.screenshot(path=str(OUT/f'profile-{theme}-390.png'))
     await page.locator('[data-action="settings"]').click()
     settings=await color(page,'.theme-choice');assert bright(settings)==expected_light,(theme,width,'settings',settings)
     btn=page.locator('[data-action="setTheme"][data-id="dark" if "dark" else "light"]') if False else page.locator('.theme-choice')
     assert await btn.count()==2
     for touch in await btn.evaluate_all('els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))'):
      assert touch['height']>=44 and touch['width']>=44,(theme,width,touch)
     if width==390: await page.screenshot(path=str(OUT/f'settings-{theme}-390.png'))
     await page.locator('[data-action="back"]').click()
     await page.locator('[data-action="tab"][data-id="discover"]').click()
     await page.locator('[data-action="tab"][data-id="create"]').first.click()
     sheet=await color(page,'.sheet');assert bright(sheet)==expected_light,(theme,width,'modal',sheet)
     if width==390: await page.screenshot(path=str(OUT/f'create-{theme}-390.png'))
     await page.locator('[data-action="closeModal"]').first.click()
     assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,theme,'overflow')
     assert not errors,(width,theme,errors)
     results.append({'width':width,'theme':theme,'header':header,'discoverHero':await color(page,'.hero-room','backgroundImage'),'chatRow':chatbg,'conversation':conv,'sheet':sheet})
     print('PASS',width,theme,flush=True)
   finally: await page.close()
  await browser.close()
 OUT.joinpath('nonlive-theme-results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
 print('DONE',len(results))
if __name__=='__main__':asyncio.run(run())

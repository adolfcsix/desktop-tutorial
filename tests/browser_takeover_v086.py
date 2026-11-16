"""Verify A/B point labels and real B -> tie -> A lead takeover, without new UI controls."""
import asyncio,re,base64,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'prototype/index.html').read_text()
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',HTML)
scripts=re.findall(r'<script src="([^"]+)"></script>',HTML)
BASE=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',HTML)
BASE=re.sub(r'<script src="[^"]+"></script>','',BASE)
logo=base64.b64encode((ROOT/'prototype/assets/tuttt-logo.png').read_bytes()).decode()
BASE=BASE.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
OUT=ROOT/'docs/qa-v086';OUT.mkdir(parents=True,exist_ok=True)
async def setup(page):
 await page.set_content(BASE,wait_until='domcontentloaded')
 for file in styles:
  css=(ROOT/'prototype'/file).read_text()
  css=re.sub(r'^@import[^;]+;\s*','',css,flags=re.M)
  await page.add_style_tag(content=css)
 for file in scripts:
  js=(ROOT/'prototype'/file).read_text()
  if file=='app.js':
   # Test fixture only: the opponent initially leads by forty points.
   assert 'pkDemoScoreA:1240,pkDemoScoreB:980' in js
   assert 'state.pkDemoScoreA=1240;state.pkDemoScoreB=980;' in js
   js=js.replace('pkDemoScoreA:1240,pkDemoScoreB:980','pkDemoScoreA:1240,pkDemoScoreB:1280')
   js=js.replace('state.pkDemoScoreA=1240;state.pkDemoScoreB=980;','state.pkDemoScoreA=1240;state.pkDemoScoreB=1280;')
  await page.add_script_tag(content=js)
 await page.locator('[data-action="tab"][data-id="live"]').first.click()
async def run():
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for width,height,mode,reduced in [(390,844,'voice',False),(320,740,'voice',False),(390,844,'cam',False),(390,844,'voice',True)]:
   page=await browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference')
   page.set_default_timeout(9000)
   errors=[];page.on('pageerror',lambda ex:errors.append(str(ex)))
   try:
    await setup(page)
    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
    await page.locator('[data-action="pkOpen"]').first.click()
    await page.locator('[data-action="pkPreviewToggle"]').click()
    stage=page.locator('.pk-battle-scene')
    assert await stage.get_attribute('data-pk-leading')=='B'
    assert await stage.locator('[data-pk-points="A"]').inner_text()=='1.240'
    assert await stage.locator('[data-pk-points="B"]').inner_text()=='1.280'
    assert '%' not in await stage.locator('.pk-balance-legends').inner_text()
    await stage.evaluate('(el)=>el.dataset.qaPersistent="yes"')
    cheer=page.locator('[data-action="pkDemoCheer"]').last
    await cheer.click()
    assert await stage.get_attribute('data-pk-leading')=='tie'
    assert await stage.get_attribute('data-pk-last-decided-leader')=='B'
    await cheer.click()
    assert await stage.get_attribute('data-pk-leading')=='A'
    assert await stage.get_attribute('data-pk-last-decided-leader')=='A'
    assert await stage.get_attribute('data-qa-persistent')=='yes'
    assert 'pk-lead-switch' in (await stage.get_attribute('class'))
    assert await stage.locator('[data-pk-points="A"]').inner_text()=='1.320'
    assert await stage.locator('[data-pk-points="B"]').inner_text()=='1.280'
    assert await stage.locator('[data-pk-balance]').get_attribute('aria-valuenow')=='51'
    motion=await page.locator('.pk-balance-pin').evaluate('(e)=>getComputedStyle(e).animationName')
    if reduced:assert motion=='none',motion
    else:assert 'tutttPkTakeoverV086' in motion,motion
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors,errors
    if not reduced and width==390:
     await page.screenshot(path=str(OUT/f'{mode}-390-takeover.png'))
    results.append({'width':width,'mode':mode,'reduce_motion':reduced,'animation':motion,'points':{'A':1320,'B':1280}})
    print('PASS',width,mode,'reduced' if reduced else 'animated',flush=True)
   finally:await page.close()
  await browser.close()
 (OUT/'results-takeover.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
 print('COMPLETED',len(results),'takeover tests')
asyncio.run(run())

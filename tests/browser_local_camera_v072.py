"""Consent and cleanup check with a genuine canvas MediaStreamTrack, no device access."""
from pathlib import Path
import asyncio,re,base64,json
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs/qa-v072';out.mkdir(exist_ok=True,parents=True)
raw=(root/'prototype/index.html').read_text(encoding='utf8')
styles=re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',raw)
scripts=re.findall(r'<script src="([^"]+)"></script>',raw)
base=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',raw)
base=re.sub(r'<script src="[^"]+"></script>','',base)
logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode();base=base.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  await page.set_content(base)
  for f in styles:
   css=(root/'prototype'/f).read_text(encoding='utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M)
   await page.add_style_tag(content=css)
  # No permission bypass in app code: only the QA browser substitutes an isolated
  # canvas-generated MediaStream for a hardware camera to test the same life cycle.
  await page.evaluate('''() => {
    window.__qaCameraCalls=0;
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async(options)=>{
      window.__qaCameraCalls++;
      if(options.audio!==false || !options.video)throw new Error('Must request video only');
      const c=document.createElement('canvas');c.width=320;c.height=240;
      const ctx=c.getContext('2d');ctx.fillStyle='#A84D3C';ctx.fillRect(0,0,320,240);
      ctx.fillStyle='#F5DBC9';ctx.fillRect(80,30,160,180);
      return c.captureStream(25);
    }}});
  }''')
  for f in scripts:await page.add_script_tag(content=(root/'prototype'/f).read_text(encoding='utf8'))
  await page.locator('[data-action="tab"][data-id="live"]').first.click()
  await page.locator('[data-action="liveMode"][data-id="cam"]').click()
  await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
  await page.locator('[data-action="pkOpen"]').click()
  await page.locator('[data-action="pkPreviewToggle"]').click()
  assert await page.evaluate('window.__qaCameraCalls')==0
  await page.locator('.pk-camera-try').click()
  await page.wait_for_function('''() => {const v=document.querySelector('[data-pk-local-video]');return v?.srcObject?.getVideoTracks()?.[0]?.readyState==='live'}''')
  assert await page.evaluate('window.__qaCameraCalls')==1
  assert await page.locator('.pk-has-local-preview').count()==1
  assert await page.locator('.pk-side-champagne.pk-has-local-preview').count()==0
  await page.evaluate('window.__qaTrack=document.querySelector("[data-pk-local-video]").srcObject.getVideoTracks()[0]')
  await page.screenshot(path=str(out/'pk-local-camera-consented-390.png'))
  await page.locator('.pk-camera-stop').click()
  assert await page.evaluate('window.__qaTrack.readyState')=='ended'
  assert await page.locator('.pk-has-local-preview').count()==0
  await page.locator('.pk-camera-try').click()
  await page.wait_for_function('document.querySelector("[data-pk-local-video]")?.srcObject?.getVideoTracks()[0]?.readyState==="live"')
  await page.evaluate('window.__qaTrack2=document.querySelector("[data-pk-local-video]").srcObject.getVideoTracks()[0]')
  # The finish action is no longer a visible demo button; invoke the existing
  # delegated event in QA to verify track cleanup without adding UI controls.
  await page.evaluate('''() => {const b=document.createElement('button');b.dataset.action='pkDemoFinish';document.getElementById('app').appendChild(b);b.click();b.remove()}''')
  assert await page.evaluate('window.__qaTrack2.readyState')=='ended'
  assert not errs,errs
  print(json.dumps({'cameraOffInitially':True,'localPreviewNeedsClick':True,'noAudioRequested':True,'opponentStreamNeverFaked':True,'cameraStopsOnToggle':True,'cameraStopsOnPkFinish':True,'pageErrors':errs},ensure_ascii=False),flush=True)
  await browser.close()
if __name__=='__main__':asyncio.run(main())

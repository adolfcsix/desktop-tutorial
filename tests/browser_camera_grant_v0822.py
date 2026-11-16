"""Delayed local preview camera grants must not attach to a room after departure."""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup
OUT=ROOT/'docs'/'qa-v0822';OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  page.set_default_timeout(12000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   await setup(page)
   await page.evaluate('''() => {
    window.__camPrompts=0;window.__camStops=0;
    window.__camDeferred={};window.__camDeferred.promise=new Promise(resolve=>window.__camDeferred.resolve=resolve);
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:opts=>{
      if(opts.audio!==false || !opts.video)throw new Error('camera preview must be video only');
      window.__camPrompts++;return window.__camDeferred.promise;
    }}});
    window.__resolveCamera=()=>{
     const track={readyState:'live',stop(){this.readyState='ended';window.__camStops++},addEventListener(){}};
     window.__camDeferred.resolve({getTracks:()=>[track],getVideoTracks:()=>[track]});
    };
   }''')
   await page.locator('[data-action="liveMode"][data-id="cam"]').click()
   await page.locator('.room-card').filter(has=page.locator('.room-category',has_text='CAM')).first.click()
   await page.locator('[data-action="pkOpen"]').click()
   await page.locator('[data-action="pkPreviewToggle"]').click()
   await page.locator('.pk-camera-try').click()
   await page.locator('.pk-camera-try').click()
   assert await page.evaluate('window.__camPrompts')==1,'Second tap requested a second media stream'
   await page.locator('[data-action="back"]').first.click()
   await page.locator('[data-action="confirmLeaveRoom"]').click()
   await page.evaluate('window.__resolveCamera()')
   await page.wait_for_function('window.__camStops === 1')
   assert await page.locator('.pk-has-local-preview').count()==0
   assert not errors,errors
   result={'permissionRequests':1,'stoppedLateTracks':1,'noAttachAfterLeaving':True,'pageErrors':errors}
   (OUT/'camera-late-grant.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
   print('PASS late preview camera grant cancelled on leave, no double request')
  finally:
   await page.close();await browser.close()
if __name__=='__main__':asyncio.run(main())

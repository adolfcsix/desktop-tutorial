from pathlib import Path
import asyncio
from playwright.async_api import async_playwright
from browser_qa_v069 import prime,open_pk
root=Path(__file__).resolve().parents[1]
qa=root/'docs'/'qa-v069'
qa.mkdir(exist_ok=True,parents=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  ctx=await browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,record_video_dir=str(qa),record_video_size={'width':390,'height':844})
  page=await ctx.new_page()
  await prime(page)
  await open_pk(page,'cam')
  await page.wait_for_timeout(600)
  await page.locator('[data-action="pkDemoCheer"]').click()
  await page.wait_for_timeout(850)
  await page.locator('[data-action="pkDemoCheer"]').click()
  await page.wait_for_timeout(850)
  await page.locator('[data-action="pkDemoFinish"]').click()
  await page.wait_for_timeout(750)
  video=page.video
  await page.close()
  path=await video.path()
  await ctx.close();await browser.close()
  print(path)
  return path
if __name__=='__main__':asyncio.run(main())

import asyncio,base64,re,json
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[1];out=root/'docs'/'qa-v052'
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(root/'prototype/index.html').read_text('utf8');html=re.sub(r'<link rel="stylesheet" href="[^"]+"\s*/?>','',html);html=re.sub(r'<script src="[^"]+"></script>','',html)
  logo=base64.b64encode((root/'prototype/assets/tuttt-logo.png').read_bytes()).decode();html=html.replace('src="assets/tuttt-logo.png"','src="data:image/png;base64,'+logo+'"')
  await page.set_content(html)
  for file in ['styles.css','brand-v048.css','cam-v050.css','live-experience-v051.css','live-chat-v052.css']:
   css=(root/'prototype'/file).read_text('utf8');css=re.sub(r'^@import[^;]+;','',css,flags=re.M);await page.add_style_tag(content=css)
  for file in ['data.js','network.js','voice.js','ux-core.js','app.js']:
   await page.add_script_tag(content=(root/'prototype'/file).read_text('utf8'))
  await page.wait_for_timeout(100)
  await page.locator('.nav-item[data-id="live"]').click()
  await page.locator('[data-action="liveMode"][data-id="cam"]').click()
  await page.locator('.room-card').first.click()
  for msg in ['Bình luận thử nghiệm · Chào mọi người!','Bình luận thử nghiệm · Bạn đang nghe nhạc gì?','Bình luận thử nghiệm · Thích giao diện mới hơn.']:
   await page.locator('#room-send input[name="message"]').fill(msg)
   await page.locator('#room-send button[type="submit"]').click()
  await page.screenshot(path=str(out/'chat-focus-messages-light-390.png'))
  await page.locator('[data-action="chatView"][data-id="glass"]').click()
  await page.screenshot(path=str(out/'chat-glass-messages-light-390.png'))
  # in test, theme switch while preserving preview room state
  await page.locator('[data-action="back"]').first.click();await page.locator('[data-action="confirmLeaveRoom"]').click()
  await page.locator('.nav-item[data-id="profile"]').click();await page.locator('[data-action="settings"]').first.click();await page.locator('[data-action="theme"]').first.click();await page.locator('[data-action="back"]').first.click()
  await page.locator('.nav-item[data-id="live"]').click();await page.locator('[data-action="liveMode"][data-id="cam"]').click();await page.locator('.room-card').first.click()
  for msg in ['Tin nhắn minh họa · Xin chào!','Tin nhắn minh họa · Live này vui quá','Tin nhắn minh họa · Mọi người nghe rõ không?']:
   await page.locator('#room-send input[name="message"]').fill(msg);await page.locator('#room-send button[type="submit"]').click()
  await page.locator('[data-action="chatView"][data-id="glass"]').click()
  await page.screenshot(path=str(out/'chat-glass-messages-dark-390.png'))
  assert not errors,errors
  await browser.close()
  print(json.dumps({'screenshots':3,'js_errors':errors},ensure_ascii=False))
asyncio.run(run())

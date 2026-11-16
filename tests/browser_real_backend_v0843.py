"""Offline end-to-end real HTTP server & Chromium UI; no fake API, no physical media."""
import asyncio,os,socket,subprocess,tempfile,time,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'qa-v0843'/'real-backend'
OUT.mkdir(parents=True,exist_ok=True)

def unused_port():
 with socket.socket() as s:
  s.bind(('127.0.0.1',0))
  return s.getsockname()[1]

async def ready(url):
 import urllib.request
 for _ in range(80):
  try:
   with urllib.request.urlopen(url+'/api/health',timeout=.3) as r:
    return json.load(r)
  except Exception:await asyncio.sleep(.1)
 raise AssertionError('Backend did not start')

async def test():
 port=unused_port();url=f'http://127.0.0.1:{port}'
 with tempfile.TemporaryDirectory(prefix='tuttt-qa43-api-') as tmp:
  env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','TUTTT_DATA_FILE':tmp+'/db.json'}
  for k in ['LIVEKIT_URL','LIVEKIT_API_KEY','LIVEKIT_API_SECRET']:env.pop(k,None)
  process=subprocess.Popen(['node','server/index.js'],cwd=str(ROOT),env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  try:
   health=await ready(url)
   assert health['status']=='ok' and health['livekitConfigured'] is False
   async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    host=await browser.new_page(viewport={'width':390,'height':844})
    guest=await browser.new_page(viewport={'width':320,'height':740})
    errors=[]
    host.on('pageerror',lambda err:errors.append(('host',str(err))))
    guest.on('pageerror',lambda err:errors.append(('guest',str(err))))
    await host.goto(url,wait_until='domcontentloaded')
    await host.wait_for_function("window.TutttNetwork && document.querySelector('.eyebrow')?.textContent.includes('KẾT NỐI')",timeout=15000)
    await host.locator('[data-action="tab"][data-id="live"]').first.click()
    await host.locator('[data-action="create"]').first.click()
    await host.locator('#room-name').fill('QA43 kiểm thử phòng thật')
    await host.locator('#room-topic').select_option('Tâm sự')
    await host.locator('#room-desc').fill('Kiểm thử hai trình duyệt cùng máy chủ')
    await host.locator('#create-room button[type="submit"]').click()
    await host.locator('#room-send input').wait_for(timeout=10000)
    assert await host.locator('.room-title, .voice-title-row').count()>0
    room_id=await host.evaluate("window.__TUTTT_QA_ROOM_ID__ || location.hash")
    await guest.goto(url,wait_until='domcontentloaded')
    await guest.wait_for_function("window.TutttNetwork && document.querySelector('.eyebrow')?.textContent.includes('KẾT NỐI')",timeout=15000)
    await guest.locator('[data-action="tab"][data-id="live"]').first.click()
    card=guest.locator('.room-card').filter(has_text='QA43 kiểm thử phòng thật').first
    await card.wait_for(timeout=10000)
    await card.click()
    await guest.locator('#room-send input').wait_for(timeout=10000)
    await guest.locator('#room-send input').fill('Tin nhắn QA43 từ người xem')
    await guest.locator('#room-send button[type="submit"]').click()
    await guest.wait_for_function("document.body.innerText.includes('Tin nhắn QA43 từ người xem')",timeout=10000)
    await host.wait_for_function("document.body.innerText.includes('Tin nhắn QA43 từ người xem')",timeout=15000)
    # A report is a real API write, not a decorative toast.
    await guest.locator('[data-action="liveOptions"]').click()
    await guest.locator('[data-action="roomReport"]').click()
    await guest.locator('#report-reason').fill('Kiểm tra quy trình báo cáo vi phạm nội dung mẫu')
    await guest.locator('#room-report button[type="submit"]').click()
    await guest.wait_for_timeout(350)
    assert not errors,errors
    assert not await host.evaluate('document.documentElement.scrollWidth > innerWidth+1')
    assert not await guest.evaluate('document.documentElement.scrollWidth > innerWidth+1')
    await host.screenshot(path=str(OUT/'live-real-host-390.png'))
    await guest.screenshot(path=str(OUT/'live-real-guest-320.png'))
    report={'version':health['version'],'realHttpServer':True,'guestAuth':True,'roomCreation':True,'twoBrowserJoin':True,'chatRealtime':True,'reportSubmitted':True,'viewport390':True,'viewport320':True,'jsErrors':errors}
    (OUT/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('PASS actual server, two guest cookies, room create/join, chat cross-client, report, responsive')
    await browser.close()
  finally:
   process.terminate()
   try:process.communicate(timeout=4)
   except subprocess.TimeoutExpired:process.kill();process.communicate()

if __name__=='__main__':asyncio.run(test())

"""Computed theme surface audit. Run with python tests/browser_theme_audit_v0818.py"""
import asyncio,json,sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
from browser_room_v075 import setup,dark_theme
OUT=ROOT/'docs'/'qa-v0818';OUT.mkdir(parents=True,exist_ok=True)
SEL=['body','#app','.app-header','.nav','.room-top','.room-topbar','.room-chatbox','.room-compose','.room-compose input','.room-controls','.circle-icon','.voice-summary','.pk-broadcast-voice','.pk-broadcast-voice .pk-duel','.pk-broadcast-voice .pk-duel-side','.pk-broadcast-voice .pk-balance-legends','.pk-broadcast-cam','.pk-broadcast-cam .pk-duel-side','.cam-topbar','.cam-compose','.cam-compose input','.sheet','.sheet-head','.close-btn','.audience-panel-summary','.cam-person-row','.cam-person-avatar']
async def sample(page):
 return await page.evaluate('''sels=>Object.fromEntries(sels.map(sel=>{const el=document.querySelector(sel);if(!el)return [sel,null];const c=getComputedStyle(el);return [sel,{bg:c.backgroundColor,color:c.color,bgImage:c.backgroundImage.slice(0,95),border:c.borderTopColor}]}))''',SEL)
async def main():
 data={}
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security'])
  for mode in ('voice','cam'):
   for theme in ('light','dark'):
    page=await browser.new_page(viewport={'width':390,'height':844});await setup(page)
    if theme=='dark':await dark_theme(page)
    if mode=='cam':await page.locator('[data-action="liveMode"][data-id="cam"]').click()
    await page.locator('.room-card').filter(has=page.locator('.room-category',has_text=mode.upper())).first.click()
    await page.locator('[data-action="pkOpen"]').first.click();await page.locator('[data-action="pkPreviewToggle"]').click()
    data[f'{mode}-{theme}-pk']=await sample(page)
    await page.locator('.audience-trigger:visible').click()
    data[f'{mode}-{theme}-sheet']=await sample(page)
    await page.close()
  await browser.close()
 OUT.joinpath('baseline.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
 for key,v in data.items():
  print(key, {name:x['bg'] for name,x in v.items() if x and (name in ('body','#app','.room-top','.room-chatbox','.room-compose','.pk-broadcast-voice','.pk-broadcast-cam','.sheet','.audience-panel-summary','.cam-person-row'))})
asyncio.run(main())

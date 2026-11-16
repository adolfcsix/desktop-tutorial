"""Historical v0.5.6 behaviors re-tested against current full Live UI.
See browser_legacy_live_v0845.py; no frozen stylesheet/script lists remain.
"""
import asyncio
from browser_legacy_live_v0845 import run
if __name__=='__main__':asyncio.run(run('v056'))

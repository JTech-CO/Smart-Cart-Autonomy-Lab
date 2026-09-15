"""Probe browser file and loopback navigation without changing browser policy.

A blocked probe is recorded as NOT_VERIFIED, not as a passing E2E test.
The temporary HTTP server is a test fixture, not an application dependency.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, threading, time
ROOT=Path(__file__).resolve().parents[1]; SITE=ROOT/'simulator'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(SITE)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
rows=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,
            args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,url in [('file',(SITE/'index.html').as_uri()),('loopback-http',f'http://127.0.0.1:{server.server_port}/index.html')]:
            page=browser.new_page()
            try:
                page.goto(url,wait_until='load',timeout=15000)
                page.wait_for_function('window.__SMART_CART__',timeout=30000)
                row={'target':name,'status':'VERIFIED','navigation':'loaded and simulation initialized'}
            except Exception as exc:
                row={'target':name,'status':'NOT_VERIFIED','reason':str(exc).split('Call log:')[0].strip()}
            rows.append(row);print(row,flush=True);page.close()
        browser.close()
finally:
    server.shutdown();server.server_close();thread.join(timeout=3)
(ROOT/'tests/navigation-results.json').write_text(json.dumps({'executedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'tests':rows,'remotePagesDeployed':False},ensure_ascii=False,indent=2))

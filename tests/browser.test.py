"""UI, WebGL and input regression for Smart Cart Autonomy Lab 1.1.1.

Requires Python Playwright and Chromium, for testing only. The app has no build
or runtime dependencies. Use DISPLAY=:99 with a running Xvfb when ANGLE needs it.
The default harness injects unchanged local source text into about:blank because
this delivery environment blocks URL navigation by policy. This is explicitly
not a successful file/HTTP navigation test. Set SC_TEST_URL on an ordinary host
to exercise that host's real static URL instead. No browser policies are changed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, time

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'simulator'; OUT=ROOT/'tests'; ASSETS=SITE/'assets'
results=[]; errors=[]; requests=[]

def check(name, condition, detail=None):
    row={'name':name,'status':'PASS' if condition else 'FAIL','detail':detail}
    results.append(row); print(row, flush=True)

def source_document():
    html=(SITE/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'<link[^>]+href="css/app.css"[^>]*>',lambda _: '<style>'+(SITE/'css/app.css').read_text()+'</style>',html)
    scripts=re.findall(r'<script defer src="([^"]+)"></script>',html)
    html=re.sub(r'<script defer src="[^"]+"></script>','',html)
    return html.replace('</body>',''.join('<script>'+(SITE/f).read_text()+'</script>' for f in scripts)+'</body>')

def start(page):
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('request',lambda r: requests.append(r.url))
    if os.environ.get('SC_TEST_URL'):
        page.goto(os.environ['SC_TEST_URL'],wait_until='load')
    else:
        page.set_content(source_document(),wait_until='load')
    page.wait_for_function('window.__SMART_CART__ && document.querySelector("#loading").hidden',timeout=45000)
    page.evaluate('SC.app.setRenderEnabled(false);SC.app.pause(true)')

def frozen_render(page):
    page.evaluate('SC.app.view.target=null;SC.app.setRenderEnabled(true)')
    page.wait_for_timeout(800)
    page.evaluate('SC.app.setRenderEnabled(false)')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,
        args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1,accept_downloads=True)
    start(page)
    gpu=page.evaluate('''(()=>{const r=SC.app.view.renderer,g=r.gl,e=g.getExtension('WEBGL_debug_renderer_info');return {version:g.getParameter(g.VERSION),renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),triangles:r.triangles,draws:r.drawCalls,error:g.getError()}})()''')
    check('Actual WebGL 2 scene and shader rendering',gpu['error']==0 and gpu['triangles']>50000,gpu)
    check('Version appears in document and interface','1.1.1' in page.title() and page.locator('.version').inner_text()=='1.1.1')
    check('Light-only interface with explicit light color scheme',page.evaluate('getComputedStyle(document.documentElement).colorScheme==="light" && getComputedStyle(document.body).backgroundColor==="rgb(255, 255, 255)"'))
    check('No duplicate document IDs',page.evaluate('(()=>{let a=[...document.querySelectorAll("[id]")].map(e=>e.id);return a.length===new Set(a).size})()'))
    check('Primary viewport receives most workspace width',page.evaluate('document.querySelector(".viewport").clientWidth/innerWidth>=.70'))
    check('No UI chrome overlays the 3D canvas',page.evaluate('(()=>{const c=document.querySelector(".viewport").getBoundingClientRect();return [".stage-heading",".stage-controls",".statusbar"].every(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.bottom<=c.top||r.top>=c.bottom})})()'))
    check('Diagnostics are initially collapsed without hiding current data',page.locator('.trend-details[open]').count()==0 and page.locator('#uwbLeft').is_visible())
    check('Motor readings use a semantic table',page.locator('table.drive-table th[scope=row]').count()==4)
    fonts=page.evaluate('''(()=>{let small=[];for(const e of document.querySelectorAll('button,select,label,summary,small,p,dt,dd,td,th,h1,h2,h3,.metric-pair span,.metric-triple span')){if(e.checkVisibility()&&parseFloat(getComputedStyle(e).fontSize)<14)small.push({tag:e.tagName,id:e.id,size:getComputedStyle(e).fontSize})}return small})()''')
    check('Visible essential text is at least 14 CSS px',not fonts,fonts)
    # True DOM keyboard inputs, not injected controller movement.
    page.locator('#scene').focus();page.evaluate('SC.app.pause(false)')
    before=page.evaluate('({...SC.app.sim.user})')
    page.keyboard.down('ArrowUp');page.wait_for_timeout(600);page.keyboard.up('ArrowUp')
    after=page.evaluate('({...SC.app.sim.user})')
    check('Arrow keys move the user',((before['x']-after['x'])**2+(before['z']-after['z'])**2)**.5>.2)
    page.keyboard.press('Space'); t=page.evaluate('SC.app.sim.time');page.wait_for_timeout(160)
    check('Canvas Space pauses and freezes time',page.evaluate('SC.app.sim.paused') and page.evaluate('SC.app.sim.time')==t)
    # Focused native buttons must not also trigger the global Space handler.
    page.locator('#pauseBtn').focus();page.keyboard.press('Space')
    check('Focused pause button Space resumes once',not page.evaluate('SC.app.sim.paused'))
    page.keyboard.press('Space')
    check('Focused pause button Space pauses once',page.evaluate('SC.app.sim.paused'))
    page.locator('#scene').focus();page.keyboard.press('KeyE');page.evaluate('SC.app.step(110)')
    check('E-stop latch stops motor and wheel simulation',page.evaluate('SC.app.sim.estop&&SC.app.sim.cart.v===0&&SC.app.sim.state==="E_STOP"'))
    page.keyboard.press('KeyE')
    page.locator('#cameraSelect').select_option('detail')
    check('Camera selector operates real model-detail camera',page.evaluate('SC.app.view.mode==="detail"'))
    # All lighting still drives the renderer, but none changes the UI theme.
    brightness={}
    for mode in ['sun','artificial','low']:
        page.locator('#lightSelect').select_option(mode)
        page.evaluate('SC.app.view.render(.25)')
        r=page.evaluate('''(()=>{let g=SC.app.view.renderer.gl,a=new Uint8Array(4*20*20),cv=document.getElementById('scene');g.readPixels(Math.floor(cv.width*.75),Math.floor(cv.height*.32),20,20,g.RGBA,g.UNSIGNED_BYTE,a);let sum=0;for(let i=0;i<a.length;i+=4)sum+=(a[i]+a[i+1]+a[i+2])/3;return {mean:sum/400,error:g.getError(),theme:getComputedStyle(document.body).backgroundColor}})()''')
        brightness[mode]=r['mean'];check('Lighting works independently of white UI: '+mode,r['error']==0 and r['theme']=='rgb(255, 255, 255)',r)
    check('Low-light environment actually changes rendered luminance',brightness['low']<brightness['artificial']*.5,brightness)
    page.locator('#lightSelect').select_option('sun')
    # Modal focus containment and the unchanged configuration fields.
    page.evaluate('SC.app.pause(false)');page.locator('#settingsBtn').click()
    check('Settings is a native modal and pauses the session',page.evaluate('document.getElementById("settingsDrawer").matches(":modal")&&SC.app.sim.paused'))
    t=page.evaluate('SC.app.sim.time');page.keyboard.press('ArrowUp');page.wait_for_timeout(120)
    check('Settings interaction cannot move the background simulation',page.evaluate('SC.app.sim.time')==t)
    page.locator('input[name=sunElevation]').fill('18');page.locator('input[name=sunElevation]').dispatch_event('input')
    check('Solar-angle field still updates the live scene configuration',page.evaluate('SC.app.sim.config.sunElevation===18'))
    page.locator('input[name=slope]').fill('7');page.locator('input[name=people]').uncheck()
    page.locator('button[form=settingsForm]').click();page.evaluate('SC.app.pause(true);SC.app.setRenderEnabled(false)')
    check('Applying settings rebuilds matching terrain and objects',page.evaluate('SC.app.sim.config.slope===7&&!SC.app.sim.config.people&&SC.app.sim.world.objects.every(o=>o.type!=="person")'))
    page.locator('#settingsBtn').click();page.keyboard.press('Escape');page.wait_for_timeout(70)
    check('Escape closes settings and restores button focus without resuming',page.evaluate('!document.getElementById("settingsDrawer").open&&SC.app.sim.paused&&document.activeElement.id==="settingsBtn"&&document.getElementById("settingsBtn").getAttribute("aria-expanded")==="false"'))
    page.locator('#settingsBtn').click();page.locator('.advanced-settings > summary').click()
    check('Advanced sensor fields remain discoverable',page.locator('input[name=uwbRange]').is_visible() and page.locator('select[name=quality]').count()==1)
    page.locator('#closeSettings').click()
    page.locator('#terrainSelect').select_option('stairs')
    page.evaluate('SC.app.pause(true);SC.app.sim.setInput(0,1);SC.app.step(1200)')
    check('Terrain menu retains stair stop without wheel spin',page.evaluate('SC.app.sim.user.z>6&&SC.app.sim.cart.z<3.02&&SC.app.sim.cart.v===0'))
    page.evaluate('SC.app.reset({...SC.defaults,density:"none",noise:0});SC.app.pause(true);SC.app.sim.setInput(0,1);SC.app.step(180)')
    page.locator('#settingsBtn').click();page.locator('.fault-details > summary').click();page.locator('[data-fault=uwb]').check()
    page.locator('#closeSettings').click();page.evaluate('SC.app.step(180)')
    check('UWB fault injection retains stop behavior',page.evaluate('SC.app.sim.state==="TAG_LOST"&&SC.app.sim.cart.v===0'))
    # Light graphs show real history with explicit axis units and distinguish missing from zero.
    page.locator('.sensor-panel').nth(0).locator('summary').click();page.wait_for_timeout(120)
    check('LiDAR disclosure opens real point cloud and chart',page.locator('#radar').is_visible() and page.evaluate('document.getElementById("radar").width>100&&document.getElementById("lidarChart").width>200'))
    page.locator('.sensor-panel').nth(2).locator('summary').click();page.wait_for_timeout(120)
    check('ToF chart has millimeter labels and millimeter-scaled history', '밀리미터' in page.locator('#tofChart').get_attribute('aria-label') and "v*1000" in (SITE/'js/app.js').read_text())
    page.evaluate('SC.app.sim.sensors.fault.tof=true;SC.app.step(18)')
    check('Invalid measurements display missing instead of zero',page.locator('#tofLeft').inner_text().startswith('--') and page.locator('#tofLeftStatus').inner_text()=='측정 무효')
    check('Left/right graph labels are explicit and have line-style cues',page.locator('.chart-legend .key-dashed').count()==4)
    # Export actual blobs and complete real browser-native saves.
    downloads=[];page.on('download',lambda d:downloads.append(d))
    page.evaluate('''()=>{window.__blobs=[];const old=URL.createObjectURL;URL.createObjectURL=function(b){window.__blobs.push(b);return old.call(this,b)}}''')
    page.locator('#exportBtn').click();page.keyboard.press('Escape')
    check('Export popover Escape closes and returns focus',page.evaluate('document.getElementById("exportMenu").hidden&&document.activeElement.id==="exportBtn"'))
    exported={}
    for kind in ['csv','telemetry','config','session','png']:
        page.locator('#exportBtn').click()
        with page.expect_download(timeout=15000) as pending:
            page.locator('[data-export='+kind+']').click()
        d=pending.value;target=OUT/('download-check-'+d.suggested_filename)
        d.save_as(str(target));exported[kind]={'saved':True,'bytes':target.stat().st_size}
        if kind=='csv': check('CSV export retains numeric sensor and motor history','rpm_left' in target.read_text(encoding='utf-8-sig') and 'tof_left_m' in target.read_text(encoding='utf-8-sig'))
        elif kind=='telemetry':
            tel=json.loads(target.read_text());check('Flutter JSON retains synthetic source and null cliff',tel['sim']['source']=='synthetic' and tel['tof']['cliff'] is None)
        elif kind=='config': cfg=json.loads(target.read_text());check('Configuration export retains schema','schema' in cfg and cfg['schema']=='smart-cart-config/1')
        elif kind=='session': check('Session export preserves samples and simulation disclosure',json.loads(target.read_text())['synthetic'] is True)
        else: check('3D PNG export produces actual image data',target.read_bytes().startswith(b'\x89PNG') and target.stat().st_size>20000)
        target.unlink()
    check('All five export types complete native file save',len(exported)==5 and all(v['saved'] for v in exported.values()),exported)
    imported={**cfg['config'],'density':'many','people':True,'seed':71}
    page.locator('#importFile').set_input_files({'name':'settings.json','mimeType':'application/json','buffer':json.dumps({'schema':'smart-cart-config/1','config':imported}).encode()})
    page.wait_for_timeout(160);page.evaluate('SC.app.pause(true);SC.app.setRenderEnabled(false)')
    check('JSON import changes the real world configuration',page.evaluate('SC.app.sim.config.seed===71&&SC.app.sim.world.objects.length===27'))
    page.locator('#importFile').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"maxSpeed":999}'})
    page.wait_for_timeout(100)
    check('Invalid import does not replace the valid scene',page.evaluate('SC.app.sim.config.seed===71&&SC.app.sim.config.maxSpeed<=1.5'))
    page.evaluate('SC.app.pause(false);window.dispatchEvent(new Event("blur"))')
    check('Focus loss pauses and clears user input',page.evaluate('SC.app.sim.paused&&SC.app.sim.input.x===0&&SC.app.sim.input.z===0'))
    page.locator('#helpBtn').click()
    check('Readable model dialog preserves safety limitations',page.locator('#helpDialog').evaluate('(d)=>d.open') and '전방 ToF' in page.locator('#helpDialog').inner_text())
    page.keyboard.press('Escape')
    check('Help dismissal does not restart the simulation',page.evaluate('SC.app.sim.paused&&!document.getElementById("helpDialog").open'))
    counts=[]
    for i in range(3): counts.append(page.evaluate('SC.app.reset(SC.defaults);SC.app.pause(true);SC.app.view.render(0);SC.app.view.renderer.resources.size'))
    check('Resets release superseded GPU geometry',max(counts)==min(counts),counts)
    # Layout checks at several CSS viewport widths. These are reflow tests, not
    # a claim of real-device hardware testing or browser-zoom certification.
    layouts=[]
    for width,height in [(1600,1000),(1366,768),(1024,768),(820,1180),(600,900),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(80)
        r=page.evaluate('''(()=>{const a=document.querySelector('.viewport').getBoundingClientRect();return {w:innerWidth,scroll:document.documentElement.scrollWidth,canvasWidth:a.width,canvasHeight:a.height,estop:document.getElementById('emergencyBtn').getBoundingClientRect().right<=innerWidth}})()''')
        layouts.append(r)
        check('Readable responsive layout '+str(width)+'px',r['scroll']<=width and r['canvasHeight']>=160 and r['estop'],r)
    page.set_viewport_size({'width':1600,'height':1000})
    # Refresh previews from actual, unmodified simulation samples.
    page.evaluate('document.querySelectorAll(".trend-details").forEach(e=>e.open=false);SC.app.reset(SC.defaults);SC.app.pause(true);SC.app.sim.setInput(-.12,1);SC.app.step(270);SC.app.view.setCamera("follow");document.querySelector(".telemetry-scroll").scrollTop=0')
    frozen_render(page);page.wait_for_timeout(3800)
    page.evaluate('document.activeElement.blur()')
    page.screenshot(path=str(ASSETS/'preview-desktop.png'))
    page.locator('#cameraSelect').select_option('detail');frozen_render(page)
    page.screenshot(path=str(ASSETS/'preview-cart.png'))
    page.locator('#cameraSelect').select_option('follow');frozen_render(page)
    page.locator('.sensor-panel').nth(0).locator('summary').click();page.locator('.sensor-panel').nth(1).locator('summary').click()
    page.locator('.telemetry-scroll').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(ASSETS/'preview-diagnostics.png'))
    page.evaluate('document.querySelector(".advanced-settings").open=false;document.querySelector(".fault-details").open=false')
    page.locator('#settingsBtn').click();page.locator('.dialog-body').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(ASSETS/'preview-settings.png'));page.locator('#closeSettings').click()
    # Native touchscreen-like pointer capture and release, below the viewport.
    mobile=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True)
    start(mobile)
    check('Mobile controls are real visible buttons',mobile.locator('[data-dir=up]').is_visible())
    mobile.locator('[data-dir=up]').scroll_into_view_if_needed();mobile.evaluate('SC.app.pause(false)')
    before=mobile.evaluate('({...SC.app.sim.user})')
    bounds=mobile.locator('[data-dir=up]').bounding_box();mobile.mouse.move(bounds['x']+bounds['width']/2,bounds['y']+bounds['height']/2)
    mobile.mouse.down();mobile.wait_for_timeout(500);mobile.mouse.up()
    after=mobile.evaluate('({...SC.app.sim.user})')
    check('Touch direction button moves user and releases input',((before['x']-after['x'])**2+(before['z']-after['z'])**2)**.5>.2)
    mobile.wait_for_timeout(120)
    check('Pointer release clears touch movement',mobile.evaluate('SC.app.sim.input.x===0&&SC.app.sim.input.z===0'))
    mobile.evaluate('SC.app.pause(true)');mobile.locator('#settingsBtn').click()
    check('Mobile native dialog fits viewport',mobile.locator('#settingsDrawer').evaluate('(d)=>d.getBoundingClientRect().width<=innerWidth&&d.getBoundingClientRect().height<=innerHeight'))
    mobile.locator('#closeSettings').click();mobile.evaluate('SC.app.view.setCamera("follow");SC.app.view.distance=8;window.scrollTo(0,0)');frozen_render(mobile)
    mobile.screenshot(path=str(ASSETS/'preview-mobile.png'),full_page=True)
    check('No JS or WebGL errors during component regression',not errors,errors)
    check('No external runtime asset requests',not requests if not os.environ.get('SC_TEST_URL') else all(u.startswith(os.environ['SC_TEST_URL']) for u in requests),requests)
    data={'suite':'Browser UI and WebGL regression','version':'1.1.1','executedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'mode':'static URL' if os.environ.get('SC_TEST_URL') else 'about:blank with unchanged local source contents injected by Playwright',
        'browser':browser.version,'gpu':gpu,'passed':sum(r['status']=='PASS' for r in results),'failed':sum(r['status']=='FAIL' for r in results),
        'tests':results,'nativeDownloads':exported,'layouts':layouts,
        'limits':'Default mode does not verify browser file/HTTP navigation, remote Pages deployment, real-device GPU performance or physical cart behavior.'}
    (OUT/'browser-results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print('RESULT',data['passed'],data['failed'],flush=True)
    browser.close()
    if data['failed']:raise SystemExit(1)

"""1.2.0 held-key/camera invariance, live instruments and layout regression.

QA only: requires Playwright and Chromium. No policy is disabled. Default mode
uses original local source in about:blank; set SC_TEST_URL on a host that permits
static URL navigation. Optional SC_BASELINE_DIR points to an extracted 1.1.1
package for comparative CSS layout measurements, not runtime deployment.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os, re, time, hashlib
R=Path(__file__).resolve().parents[1];S=R/'simulator';rows=[];errors=[];comparisons=[]

def check(name,ok,detail=None):
    row={'name':name,'status':'PASS' if ok else 'FAIL','detail':detail};rows.append(row);print(row,flush=True)

def source(site=S,runtime=True):
    h=(site/'index.html').read_text()
    h=re.sub(r'<link[^>]+href="css/app.css"[^>]*>',lambda _:'<style>'+(site/'css/app.css').read_text()+'</style>',h)
    scripts=re.findall(r'<script defer(?:="")? src="([^"]+)"></script>',h)
    h=re.sub(r'<script defer(?:="")? src="[^"]+"></script>','',h)
    if runtime:h=h.replace('</body>',''.join('<script>'+(site/f).read_text()+'</script>' for f in scripts)+'</body>')
    return h

def start(page):
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    if os.getenv('SC_TEST_URL'):page.goto(os.environ['SC_TEST_URL'],wait_until='load')
    else:page.set_content(source(),wait_until='load')
    page.wait_for_function('window.__SMART_CART__&&document.querySelector("#loading").hidden',timeout=45000)
    page.evaluate('SC.app.setRenderEnabled(false);SC.app.pause(true)')

def reset(page):
    page.evaluate('SC.app.reset({...SC.defaults,density:"none",noise:0,light:"artificial"});SC.app.pause(true);SC.app.setRenderEnabled(false)')
    page.locator('#scene').focus()

def advance(page,seconds=.30):
    end=page.evaluate('SC.app.sim.time')+seconds
    page.wait_for_function('end=>SC.app.sim.time>=end',arg=end,timeout=15000)

def position(page):return page.evaluate('({x:SC.app.sim.user.x,z:SC.app.sim.user.z})')

def geometry(page):return page.evaluate('''()=>{let v=document.querySelector('.viewport').getBoundingClientRect(),bar=document.querySelector('.statusbar').getBoundingClientRect();return {window:[innerWidth,innerHeight],viewport:{width:v.width,height:v.height,top:v.top,bottom:v.bottom},summary:{top:bar.top,bottom:bar.bottom,height:bar.height},pageWidth:document.documentElement.scrollWidth}}''')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM','/usr/bin/chromium'),args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    p=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1);start(p)
    rect=geometry(p)
    check('All driving-summary fields are above the 3D scene',rect['summary']['bottom']<=rect['viewport']['top'] and p.locator('.stage-overview #speed').count()==1 and p.locator('.stage-controls #odometer').count()==0,rect)
    check('1600x1000 working scene is at least 680px tall without page scrolling',rect['viewport']['height']>=680 and p.evaluate('document.documentElement.scrollHeight<=innerHeight'),rect)
    check('Five plots are rendered without a collapsed ancestor',p.evaluate('''()=>[...document.querySelectorAll('.spark')].length===5&&[...document.querySelectorAll('.spark')].every(c=>!c.closest('details')&&c.width>180&&c.height>90)'''))
    check('A single scroll container keeps numerical rows aligned with graphs',p.evaluate('''()=>[...document.querySelectorAll('.sensor-body')].every(e=>{let a=e.querySelector('.sensor-values').getBoundingClientRect(),b=e.querySelector('.live-trend').getBoundingClientRect();return Math.abs(a.top-b.top)<1&&a.right<b.left&&b.width>230})'''))
    # All physical letter keys keep their fixed axis during a real pointer orbit,
    # a C-key reset, and an upper-camera preset. No controller vector injection.
    for key,axis,sign in [('KeyW','z',1),('KeyS','z',-1),('KeyA','x',1),('KeyD','x',-1)]:
        reset(p);before=position(p);p.evaluate('SC.app.pause(false)');p.keyboard.down(key);advance(p)
        a=p.evaluate('SC.app.view.azimuth');box=p.locator('#scene').bounding_box();x=box['x']+box['width']*.5;y=box['y']+box['height']*.5
        p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+190,y-30,steps=8);p.mouse.up();advance(p)
        after=position(p);other='z' if axis=='x' else 'x';az=p.evaluate('SC.app.view.azimuth')
        check(key+' keeps one terrain axis while held through real orbit drag',after[axis]*sign>before[axis]*sign+.35 and abs(after[other]-before[other])<1e-9 and abs(az-a)>.9,{'before':before,'after':after,'orbitRadians':az-a})
        before=after;p.keyboard.press('KeyC');advance(p);after=position(p)
        check(key+' keeps moving on the same axis while C resets the camera',sign*(after[axis]-before[axis])>.20 and abs(after[other]-before[other])<1e-9)
        before=after;p.evaluate('SC.app.view.setCamera("top")');advance(p);after=position(p)
        check(key+' ignores top-camera orientation while still held',sign*(after[axis]-before[axis])>.20 and abs(after[other]-before[other])<1e-9)
        p.keyboard.up(key);advance(p,.08)
        check(key+' keyup clears movement after the camera changes',p.evaluate('SC.app.sim.input.x===0&&SC.app.sim.input.z===0'))
        p.evaluate('SC.app.pause(true)')
    # Opposing keys cancel, diagonals maintain speed, and a real blur is safe.
    reset(p);p.evaluate('SC.app.pause(false)');p.keyboard.down('KeyW');p.keyboard.down('ArrowDown');advance(p,.12)
    check('Opposing letter/arrow keys cancel rather than rotating the input',p.evaluate('SC.app.sim.input.x===0&&SC.app.sim.input.z===0'))
    p.keyboard.up('ArrowDown');p.keyboard.down('KeyA');advance(p,.12)
    check('Combined letter input has normalized diagonal speed',p.evaluate('Math.abs(Math.hypot(SC.app.sim.input.x,SC.app.sim.input.z)-1)<1e-9&&SC.app.sim.input.x>0&&SC.app.sim.input.z>0'))
    p.evaluate('window.dispatchEvent(new Event("blur"))');p.keyboard.up('KeyW');p.keyboard.up('KeyA')
    check('Focus loss clears keys and pauses after an orbiting held-input session',p.evaluate('SC.app.sim.paused&&SC.app.sim.input.x===0&&SC.app.sim.input.z===0'))
    # Time-series canvases update from actual sampled histories, no disclosure click.
    reset(p);before=p.evaluate('Object.fromEntries([...document.querySelectorAll(".spark")].map(c=>[c.id,c.toDataURL()]))')
    p.evaluate('SC.app.sim.setInput(0,1);SC.app.step(360)');p.wait_for_timeout(150)
    after=p.evaluate('Object.fromEntries([...document.querySelectorAll(".spark")].map(c=>[c.id,c.toDataURL()]))')
    for key in before:check('Live '+key+' repaints from advancing simulation history',before[key]!=after[key] and p.locator('#'+key).is_visible())
    p.locator('.telemetry-scroll').evaluate('e=>e.scrollTop=e.scrollHeight');p.wait_for_timeout(100)
    check('Scrolled lower instruments preserve numeric/plot row alignment',p.evaluate('''()=>{let a=document.getElementById('servoL').getBoundingClientRect(),b=document.getElementById('servoChart').getBoundingClientRect(),panel=document.querySelector('.telemetry').getBoundingClientRect();return b.top<panel.bottom&&a.left<b.left&&b.width>200}'''))
    layouts=[]
    for width,height in [(1920,1080),(1600,1000),(1440,900),(1366,768),(1280,720),(1201,800),(1200,900),(820,1180),(600,900),(521,900),(520,900),(390,844),(320,740)]:
        p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(160)
        state=p.evaluate('''()=>{const body=document.querySelector('.sensor-body'),a=body.querySelector('.sensor-values').getBoundingClientRect(),b=body.querySelector('.live-trend').getBoundingClientRect();return {width:innerWidth,scroll:document.documentElement.scrollWidth,sideBySide:b.left>a.left&&Math.abs(a.top-b.top)<1,allPlots:[...document.querySelectorAll('.spark')].every(c=>c.checkVisibility()&&c.getBoundingClientRect().width>=180),graphs:[...document.querySelectorAll('.spark')].map(c=>({w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height})),summaryAbove:document.querySelector('.statusbar').getBoundingClientRect().bottom<=document.querySelector('.viewport').getBoundingClientRect().top}}''')
        layouts.append(state);check('Visible plots and unclipped layout at '+str(width)+'px',state['scroll']<=width and state['allPlots'] and state['summaryAbove'] and state['sideBySide']==(width>520),state)
    # Optional layout comparison reads the previous artifact, not an inferred screenshot.
    baseline=os.getenv('SC_BASELINE_DIR')
    if baseline:
        old=browser.new_page(viewport={'width':1600,'height':1000});old.set_content(source(Path(baseline)/'simulator',False))
        for width,height in [(1600,1000),(1366,768)]:
            old.set_viewport_size({'width':width,'height':height});p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(80)
            a=geometry(old);b=geometry(p);row={'resolution':[width,height],'baseline111':a,'release120':b,'heightGain':b['viewport']['height']-a['viewport']['height']};comparisons.append(row)
            check('3D height increases over supplied 1.1.1 at '+str(width)+'px',row['heightGain']>65,row)
        old.close()
    # Additional actual screenshot of lower drive graphs; keep DOM values computed.
    p.set_viewport_size({'width':1600,'height':1000});p.evaluate('SC.app.reset({...SC.defaults,density:"none",noise:0,light:"artificial"});SC.app.pause(true);SC.app.sim.setInput(-.12,1);SC.app.step(440);SC.app.view.setCamera("follow");SC.app.setRenderEnabled(true)');p.wait_for_timeout(900);p.evaluate('SC.app.setRenderEnabled(false)')
    p.locator('.telemetry-scroll').evaluate('e=>e.scrollTop=e.scrollHeight');p.evaluate('document.activeElement.blur()');p.screenshot(path=str(S/'assets/preview-drive.png'))
    check('No browser errors during held-input/live-plot release checks',not errors,errors)
    report={'suite':'1.2.0 working-area, held-key and live-plot browser regression','version':'1.2.0','executedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'browser':browser.version,'passed':sum(t['status']=='PASS' for t in rows),'failed':sum(t['status']=='FAIL' for t in rows),'tests':rows,'layouts':layouts,'baselineLayoutComparisons':comparisons,'mode':'static URL' if os.getenv('SC_TEST_URL') else 'about:blank source injection; URL navigation is not validated','limits':'Chromium emulation, not physical GPU/device certification. Root/HTTP navigation and remote deployment are separate checks.'}
    (R/'tests/release120-browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('RESULT',report['passed'],report['failed']);browser.close()
    if report['failed']:raise SystemExit(1)

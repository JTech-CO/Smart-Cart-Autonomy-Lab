"""1.1.1 actual DOM keyboard/pointer and rendered-state regressions.

Requires Playwright/Chromium only for QA. DISPLAY=:99 may be needed by ANGLE.
Default delivery-host mode injects the complete local page because URL entry
is administrator-blocked; SC_TEST_URL uses a real static URL on ordinary hosts.
No navigation/security policies are changed.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, math, os, re, time
ROOT=Path(__file__).resolve().parents[1]; SITE=ROOT/'simulator'; ASSETS=SITE/'assets'
rows=[]; errors=[]
def check(name, ok, detail=None):
    row={'name':name,'status':'PASS' if ok else 'FAIL','detail':detail};rows.append(row);print(row,flush=True)
def document():
    s=(SITE/'index.html').read_text();s=re.sub(r'<link[^>]+href="css/app.css"[^>]*>',lambda _:'<style>'+(SITE/'css/app.css').read_text()+'</style>',s)
    scripts=re.findall(r'<script defer src="([^"]+)"></script>',s);s=re.sub(r'<script defer src="[^"]+"></script>','',s)
    return s.replace('</body>',''.join('<script>'+(SITE/f).read_text()+'</script>' for f in scripts)+'</body>')
def start(p):
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
    if os.environ.get('SC_TEST_URL'):p.goto(os.environ['SC_TEST_URL'],wait_until='load')
    else:p.set_content(document(),wait_until='load')
    p.wait_for_function('window.__SMART_CART__ && document.getElementById("loading").hidden',timeout=45000)
    p.evaluate('SC.app.setRenderEnabled(false);SC.app.pause(true)')
def reset(p):
    p.evaluate('SC.app.reset({...SC.defaults,density:"none",noise:0,light:"artificial"});SC.app.pause(true);SC.app.setRenderEnabled(false)')
def project(p):
    return p.evaluate('(()=>{let u=SC.app.sim.user;return SC.app.view.renderer.project([u.x,u.y+1,u.z])})()')
def camera(p,a):
    p.evaluate('a=>{const v=SC.app.view,u=SC.app.sim.user;v.azimuth=a;v.elevation=.63;v.distance=6;v.target=[u.x,u.y+.8,u.z];v.render(0)}',a)
def acquired(p,x,z,noise=0):
    p.evaluate('''q=>{SC.app.reset({...SC.defaults,density:'none',noise:q.noise,light:'artificial'});SC.app.pause(true);SC.app.setRenderEnabled(false);
      const s=SC.app.sim;s.cart.z=0;s.user.x=q.x;s.user.z=q.z;s.sensors=new SC.Sensors(s.config);
      s.sensors.uwb.fused={x:q.x,z:q.z,vx:0,vz:0};s.sensors.uwb.stamp=0;s.sensors.update(s.world,s.cart,s.user,0);
      s.nav=new SC.Navigation(s.config,s.world);s.nav.observe(s.sensors,0,s.cart);
    }''',{'x':x,'z':z,'noise':noise})
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM','/usr/bin/chromium'),headless=True,
        args=['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    p=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1);start(p)
    for a in [0,math.pi/2,math.pi,-math.pi/2]:
        for key,axis,sign in [('ArrowLeft','x',-1),('ArrowRight','x',1),('ArrowUp','y',-1),('ArrowDown','y',1)]:
            reset(p);camera(p,a);before=project(p);p.locator('#scene').focus();p.evaluate('SC.app.pause(false)')
            p.keyboard.down(key);p.wait_for_timeout(340);p.keyboard.up(key);p.evaluate('SC.app.pause(true)');after=project(p)
            d=after[axis]-before[axis];check(f'{key} moves in its screen direction at orbit {round(a*180/math.pi)} deg',d*sign>3,{'pixels':d})
    reset(p);p.locator('#scene').focus();p.evaluate('SC.app.view.setCamera("follow");SC.app.view.render(0)')
    before=p.evaluate('({a:SC.app.view.azimuth,e:SC.app.view.elevation})');box=p.locator('#scene').bounding_box()
    x=box['x']+box['width']*.48;y=box['y']+box['height']*.40
    p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+90,y-45,steps=10);p.mouse.up()
    after=p.evaluate('({a:SC.app.view.azimuth,e:SC.app.view.elevation,drag:SC.app.view.drag,focus:document.activeElement.id})')
    check('Real right/up mouse drag increases azimuth/elevation and ends capture',after['a']>before['a']+.5 and after['e']>before['e']+.25 and after['drag'] is None,after)
    check('Orbit drag returns keyboard focus to the simulation',after['focus']=='scene')
    a=after['a'];camera(p,a);before=project(p);p.keyboard.down('ArrowLeft');p.evaluate('SC.app.pause(false)')
    # Pause clears keys; press after resuming, as a human does.
    p.keyboard.up('ArrowLeft');p.keyboard.down('ArrowLeft');p.wait_for_timeout(340);p.keyboard.up('ArrowLeft');p.evaluate('SC.app.pause(true)');after=project(p)
    check('Left movement remains screen-left after a real orbit drag',after['x']<before['x']-3)
    reset(p);camera(p,0);p.locator('#pauseBtn').focus();p.keyboard.press('Space');before=project(p)
    p.keyboard.down('ArrowLeft');p.wait_for_timeout(340);p.keyboard.up('ArrowLeft');p.evaluate('SC.app.pause(true)');after=project(p)
    check('Arrow movement is not swallowed by the focused Pause button',after['x']<before['x']-3)
    reset(p);p.locator('input[name=seed]').evaluate('(el)=>{document.getElementById("settingsBtn").click();el.focus()}')
    before=p.evaluate('({x:SC.app.sim.user.x,z:SC.app.sim.user.z})');p.keyboard.press('ArrowLeft');p.wait_for_timeout(100);after=p.evaluate('({x:SC.app.sim.user.x,z:SC.app.sim.user.z})')
    check('Editing a setting retains native arrows and cannot move the background',before==after and p.evaluate('SC.app.sim.paused'))
    p.keyboard.press('Escape')
    acquired(p,0,-4);p.evaluate('SC.app.step(210)')
    state=p.evaluate('({v:SC.app.sim.cart.v,rpm:SC.app.sim.cart.rpmL,pwm:SC.app.sim.cart.dutyL,state:SC.app.sim.state})')
    check('Actual rendered reverse session has negative speed, RPM and PWM',state['v']<-.1 and state['rpm']<0 and state['pwm']<0 and state['state']=='REVERSE',state)
    check('Reverse status and signed drive values are readable in the UI','후진' in p.locator('#stateText').inner_text() and '-' in p.locator('#rpmL').inner_text() and '후진' in p.locator('#brakeState').inner_text())
    p.evaluate('SC.app.view.setCamera("follow");SC.app.view.azimuth=2.45;SC.app.view.elevation=.60;SC.app.view.distance=7;SC.app.view.target=null;SC.app.step(0)');p.screenshot(path=str(ASSETS/'preview-reverse.png'),full_page=True)
    acquired(p,1.25,.33,1);p.evaluate('SC.app.step(140)')
    state=p.evaluate('({state:SC.app.sim.state,age:SC.app.sim.time-SC.app.sim.sensors.uwb.stamp,yaw:SC.app.sim.cart.yaw,contacts:SC.app.sim.contacts})')
    check('Near-side user repositions without losing the valid range-history track',state['state']=='REPOSITION' and state['age']<.2 and abs(state['yaw'])>.2 and state['contacts']==0,state)
    check('Near-side recovery uses localized status instead of a raw state code','위치·방향' in p.locator('#stateText').inner_text() and '거리·이력' in p.locator('#uwbMode').inner_text())
    p.evaluate('''()=>{SC.app.reset({...SC.defaults,terrain:'uphill',slope:8,density:'few',people:true,pillars:false,boxes:false,light:'sun',noise:0});SC.app.pause(true);SC.app.setRenderEnabled(false);
      const s=SC.app.sim;s.world.objects.filter(o=>o.type==='person').forEach((o,i)=>{o.x=-7+i*1.6;o.z=10+(i%3)*2;o.y=s.world.height(o.x,o.z)});s.cart.z=4.8;s.cart.x=.8;Object.assign(s.cart,SC.cartTerrainPose(s.cart,s.world));s.user.x=-.6;s.user.z=8.2;s.user.y=s.world.height(s.user.x,s.user.z);s.user.vx=0;s.user.vz=.7;s.user.yaw=0;s.user.phase=1.0;
      s.command={speed:.5,steer:0,brake:false};for(let i=0;i<150;i++){s.integrate(1/60);s.time+=1/60;}s.state='FOLLOW';s.nav.status='FOLLOW';s.capture();s.sensors=new SC.Sensors(s.config);s.sensors.update(s.world,s.cart,s.user,s.time);SC.app.step(0);
      const v=SC.app.view;v.mode='follow';v.azimuth=-1.1;v.elevation=.30;v.distance=6.1;v.target=[0,s.world.height(0,6.5)+.8,6.5];SC.app.step(0);
    }''')
    check('Slope force and acceleration values render with explicit SI units','m/s²' in p.locator('#acceleration').inner_text() and 'N' in p.locator('#gravityForce').inner_text() and '-' in p.locator('#gravityForce').inner_text())
    geometry=p.evaluate('''(()=>{const v=SC.app.view,s=SC.app.sim,draws=[];v.humanDraw(v.user,s.user,draws);let min=Infinity;
      for(const d of draws.filter(d=>d.item.id.startsWith('foot'))){let a=d.item.vertices;for(let i=0;i<a.length;i+=6){let q=SC.math.M.point(d.matrix,a.slice(i,i+3));min=Math.min(min,q[1]-s.world.height(q[0],q[2]));}}
      return{minimumSoleClearance:min,error:v.renderer.gl.getError(),footMeshes:draws.filter(d=>d.item.id.startsWith('foot')).length};})()''')
    check('Rendered walking user has separate above-ground feet on an incline',geometry['minimumSoleClearance']>=0 and geometry['footMeshes']>=4 and geometry['error']==0,geometry)
    p.screenshot(path=str(ASSETS/'preview-slope.png'),full_page=True)
    # Real browser touch dispatch at the visible direction button, not a call
    # to Simulation.setInput. It generates the app's pointer/capture events.
    mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1);start(mobile);reset(mobile);camera(mobile,math.pi/2)
    mobile.locator('[data-dir=left]').scroll_into_view_if_needed();b=mobile.locator('[data-dir=left]').bounding_box();before=project(mobile)
    mobile.evaluate('SC.app.pause(false)');session=mobile.context.new_cdp_session(mobile)
    session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]})
    mobile.wait_for_timeout(360);session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});mobile.wait_for_timeout(60);mobile.evaluate('SC.app.pause(true)');after=project(mobile)
    check('Real mobile touch-left moves screen-left after a 90-degree camera turn',after['x']<before['x']-3,{'pixels':after['x']-before['x']})
    check('Real touch release clears movement and capture state',mobile.evaluate('SC.app.sim.input.x===0&&SC.app.sim.input.z===0&&document.querySelectorAll("[data-dir].active").length===0'))
    check('No browser script or GL errors in five-defect integration tests',not errors,errors)
    data={'suite':'1.1.1 five-defect browser regression','version':'1.1.1','executedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'browser':browser.version,
      'mode':'static URL' if os.environ.get('SC_TEST_URL') else 'about:blank source injection; not URL-entry E2E',
      'passed':sum(r['status']=='PASS' for r in rows),'failed':sum(r['status']=='FAIL' for r in rows),'tests':rows,'remotePagesDeployed':False}
    (ROOT/'tests/bugfix-browser-results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2));print('RESULT',data['passed'],data['failed'],flush=True);browser.close()
    if data['failed']:raise SystemExit(1)

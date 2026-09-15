/* Smart Cart Autonomy Lab 1.1.1. UI and IO only.
 * SANE light workspace; no device control, sockets, analytics or network requests. */
'use strict';
(()=>{
const $=id=>document.getElementById(id),M=SC.math,deg=M.DEG;
const states={ACQUIRE:['태그 위치 획득 중','유효한 UWB 거리·방위를 기다립니다.'],FOLLOW:['사용자 추종 중','센서 기반 추정 위치를 향해 안전 거리를 유지합니다.'],AVOID:['장애물 회피 중','관측 지도와 후보 궤적을 비교해 우회합니다.'],HOLD_DISTANCE:['추종 거리 유지','사용자 이동을 기다리며 제동을 유지합니다.'],TAG_LOST:['태그 신호 소실','UWB 추정이 오래되어 감속·정지합니다.'],SENSOR_HOLD:['센서 안전 정지','주행에 필요한 센서 관측이 유효하지 않습니다.'],TERRAIN_HOLD:['통과 불가 지형 · 정지','알려진 지형 제한이 적용됐습니다. 바퀴를 헛돌리지 않습니다.'],OBSTACLE_HOLD:['안전 경로 대기','충돌 여유가 확보될 때까지 정지합니다.'],NO_PATH:['경로 재탐색','관측 지도에서 현재 통과 가능한 경로를 찾지 못했습니다.'],RECOVER:['저속 복구 조향','전륜 조향 제약을 고려해 저속으로 방향을 회복합니다.'],REVERSE:['저속 후진 추종','이전 UWB 위치 추정과 후방 관측을 확인하며 후진합니다.'],REPOSITION:['추종 위치·방향 회복','가까운 측면의 사용자를 놓치지 않고 안전 여유를 확보합니다.'],GEAR_CHANGE:['전후진 전환 · 제동','현재 속도를 낮춘 뒤 반대 방향 구동으로 전환합니다.'],BRAKE:['장애물 접근 · 제동','관측된 장애물이 제동 거리 안에 있습니다.'],E_STOP:['비상정지 래치','비상정지를 해제하기 전에는 구동을 재개하지 않습니다.'],CONTACT_HOLD:['접촉 후 안전 정지','접촉을 기록하고 구동을 멈췄습니다. 주변 공간을 다시 확인합니다.']};
const number=(n,d=2)=>n==null||!Number.isFinite(n)?'--':n.toFixed(d),formatTime=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0'),colors={cyan:'#126e64',blue:'#295fc0',blue2:'#295fc0',gold:'#885600',gold2:'#885600',white:'#44535e',muted:'#295fc0'};
const set=(id,value)=>{const e=$(id);if(e&&e.textContent!==String(value))e.textContent=value;},metric=(id,value,unit,d=2)=>{const e=$(id),v=number(value,d);if(e.dataset.val===v+unit)return;e.dataset.val=v+unit;e.replaceChildren(document.createTextNode(v+' '));const small=document.createElement('small');small.textContent=unit;e.appendChild(small);};
let sim,view,lastFrame=performance.now(),accumulator=0,lastUI=-1,frameCounter=0,fpsStart=performance.now(),rateStart=0,keys=new Set(),touch=new Set(),toastTimer,renderEnabled=true;
const configUnits={slope:'°',peopleSpeed:' m/s',boxMass:' kg',followDistance:' m',maxSpeed:' m/s',userSpeed:' m/s',cargo:' kg',sunElevation:'°',sunAzimuth:'°',lidarRange:' m',uwbRange:' m',uwbFov:'°',tofRange:' m',noise:'×'};
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function settingsSync(){const cfg=sim.config;for(const input of $('settingsForm').elements){if(!input.name||!(input.name in cfg))continue;if(input.type==='checkbox')input.checked=cfg[input.name];else input.value=cfg[input.name];if($(input.name+'Output'))set(input.name+'Output',cfg[input.name]+(configUnits[input.name]||''));}for(const [id,key]of[['terrainSelect','terrain'],['densitySelect','density'],['lightSelect','light']])$(id).value=cfg[key];for(const e of document.querySelectorAll('[data-layer]'))e.checked=cfg[e.dataset.layer];for(const e of document.querySelectorAll('[data-fault]'))e.checked=sim.sensors.fault[e.dataset.fault];set('followTarget',number(cfg.followDistance,1)+' m');}
function reset(config=sim.config){const next=SC.validateConfig(config);sim=new SC.Simulation(next);sim.capture();if(view)view.build(sim);else view=new SC.View($('scene'),sim);SC.app.sim=sim;SC.app.view=view;accumulator=0;rateStart=0;fpsStart=performance.now();lastUI=-1;keys.clear();touch.clear();settingsSync();updateUI();}
function changeConfig(key,value,live=false){try{let next=SC.validateConfig({...sim.config,[key]:value});if(live){Object.assign(sim.config,next);settingsSync();}else{reset(next);toast('환경을 변경하고 사용자·카트를 초기화했습니다.');}}catch(error){toast(error.message);}}
function pause(value,reason=''){sim.paused=value;keys.clear();touch.clear();sim.setInput(0,0);accumulator=0;lastFrame=performance.now();if(reason)sim.recordEvent('PAUSE',reason);updateUI();}
function toggleSettings(value) {
 const dialog=$('settingsDrawer');
 if(value){
  closeExport(false);pause(true);dialog.hidden=false;
  if(!dialog.open)dialog.showModal();
  $('settingsBtn').setAttribute('aria-expanded','true');
 }else if(dialog.open)dialog.close();
}
function closeExport(restoreFocus=false){
 const wasOpen=!$('exportMenu').hidden;
 $('exportMenu').hidden=true;$('exportBtn').setAttribute('aria-expanded','false');
 if(restoreFocus&&wasOpen)$('exportBtn').focus({preventScroll:true});
}
function toggleExport(){
 if(!$('exportMenu').hidden){closeExport(true);return;}
 const menu=$('exportMenu'),r=$('exportBtn').getBoundingClientRect();
 menu.hidden=false;
 const left=Math.max(12,Math.min(r.right-menu.offsetWidth,innerWidth-menu.offsetWidth-12));
 menu.style.left=left+'px';menu.style.top=Math.min(r.bottom+8,innerHeight-200)+'px';
 $('exportBtn').setAttribute('aria-expanded','true');
 menu.querySelector('button').focus({preventScroll:true});
} 
function download(name,data,mime){const blob=data instanceof Blob?data:new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);toast(name+' 다운로드를 요청했습니다.');}
function exportData(kind){const stamp=new Date().toISOString().replace(/[:.]/g,'-'),base='smart-cart-'+stamp;try{if(kind==='csv'){if(!sim.samples.length)return toast('기록된 데이터가 없습니다.');const columns=Object.keys(sim.samples[0]),csv=columns.join(',')+'\r\n'+sim.samples.map(row=>columns.map(k=>row[k]==null?'':typeof row[k]==='number'?String(Math.round(row[k]*1e6)/1e6):JSON.stringify(row[k])).join(',')).join('\r\n');download(base+'.csv','\uFEFF'+csv,'text/csv;charset=utf-8');}else if(kind==='png'){view.render(0);$('scene').toBlob(blob=>{if(blob)download(base+'.png',blob,'image/png');else toast('이미지 변환에 실패했습니다.');},'image/png');}else{const content=kind==='config'?{schema:'smart-cart-config/1',config:sim.config}:kind==='telemetry'?sim.telemetry():{schema:'smart-cart-session/1',exportedAt:new Date().toISOString(),synthetic:true,config:sim.config,notes:['All telemetry is simulated.','Known terrain guard is not a ToF cliff detector.','Currents, motor envelope and parking brake are uncalibrated assumptions.','Input log uses simulation timestamps. Retained samples: last 30 simulated minutes.'],samples:sim.samples,inputLog:sim.inputLog,events:sim.events,telemetry:sim.telemetry()};download(base+'-'+kind+'.json',JSON.stringify(content,null,2),'application/json');}}catch(error){toast('내보내기 실패: '+error.message);} $('exportMenu').hidden=true;$('exportBtn').setAttribute('aria-expanded','false');}
function fitCanvas(canvas){let r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.round(r.width*d),h=Math.round(r.height*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);return{ctx,w:r.width,h:r.height};}
function chart(id,series,min=0,max=null) {
 const canvas=$(id);
 if(canvas.closest('details:not([open])'))return;
 const {ctx:c,w,h}=fitCanvas(canvas);if(w<1||h<1)return;
 c.clearRect(0,0,w,h);
 const values=series.flatMap(s=>s.data).filter(v=>v!==null&&Number.isFinite(v));
 const largest=values.length?Math.max(...values):0,smallest=values.length?Math.min(...values):0;
 max=max===null?Math.max(.1,largest)*1.12:Math.max(max,largest);
 min=min===null?Math.min(0,smallest)*1.15:Math.min(min,smallest);
 const span=Math.max(.001,max-min),left=44,right=w-4,top=12,bottom=h-26;
 c.font='14px "Segoe UI", "Malgun Gothic", sans-serif';c.lineWidth=1;
 for(const value of [min,(min+max)/2,max]){
  const y=bottom-(value-min)/span*(bottom-top);
  c.strokeStyle='#dce1e5';c.beginPath();c.moveTo(left,y);c.lineTo(right,y);c.stroke();
  if(value===min||value===max){c.fillStyle='#53616d';c.textAlign='right';c.fillText(number(value,Math.abs(value)<5&&value!==0?1:0),left-7,y+4);}
 }
 for(const item of series){
  c.strokeStyle=item.color;c.lineWidth=1.8;c.setLineDash(Array.isArray(item.dash)?item.dash:item.dash?[5,4]:[]);c.beginPath();let pen=false;
  for(let i=0;i<item.data.length;i++){
   const v=item.data[i];if(v===null||!Number.isFinite(v)){pen=false;continue;}
   const x=right-(item.data.length-1-i)*(right-left)/119,y=bottom-(v-min)/span*(bottom-top);
   if(pen)c.lineTo(x,y);else{c.moveTo(x,y);pen=true;}
  }
  c.stroke();
 }
 c.setLineDash([]);c.fillStyle='#53616d';c.textAlign='left';c.fillText('-12초',left,h-5);c.textAlign='right';c.fillText('현재',right,h-5);
 if(!values.length){c.textAlign='center';c.fillText('유효한 관측 없음',(left+right)/2,(top+bottom)/2-7);}
}
function radar() {
 const canvas=$('radar');if(canvas.closest('details:not([open])'))return;
 const {ctx:c,w,h}=fitCanvas(canvas);if(w<1||h<1)return;
 const r=Math.min(w,h)*.36,cx=w/2,cy=h/2,max=sim.config.lidarRange;
 c.clearRect(0,0,w,h);c.strokeStyle='#a8b8bd';c.lineWidth=1;
 for(let i=1;i<=3;i++){c.beginPath();c.arc(cx,cy,r*i/3,0,Math.PI*2);c.stroke();}
 c.strokeStyle='#d0d8de';c.beginPath();c.moveTo(cx-r,cy);c.lineTo(cx+r,cy);c.moveTo(cx,cy-r);c.lineTo(cx,cy+r);c.stroke();
 c.fillStyle='#53616d';c.font='14px "Segoe UI", "Malgun Gothic", sans-serif';c.textAlign='center';c.fillText('전방',cx,15);c.fillText(max+' m',cx,h-4);
 for(const ray of sim.sensors.lidar.rays){
  if(!ray.valid||!ray.hit)continue;
  const x=cx+Math.sin(ray.angle)*ray.distance/max*r,y=cy-Math.cos(ray.angle)*ray.distance/max*r;
  c.fillStyle=colors.cyan;c.fillRect(x-1.5,y-1.5,3,3);
 }
 const f=sim.sensors.uwb.fused;
 if(f){let o=sim.sensors.lidar.origin,dx=f.x-o[0],dz=f.z-o[2],a=sim.cart.yaw,x=(dx*Math.cos(a)-dz*Math.sin(a))/max*r,y=(dx*Math.sin(a)+dz*Math.cos(a))/max*r;if(Math.hypot(x,y)<r){c.beginPath();c.arc(cx+x,cy-y,3.5,0,Math.PI*2);c.fillStyle=colors.blue;c.fill();}}
 c.fillStyle='#293a44';c.beginPath();c.moveTo(cx,cy-5);c.lineTo(cx+3,cy+3);c.lineTo(cx-3,cy+3);c.closePath();c.fill();
}
function delta(key,scale=1,unit='m'){let arr=sim.history[key]||[],a=arr.at(-1),b=arr.at(-2);return a==null||b==null?'--':((a-b)>=0?'+':'')+number((a-b)*scale,scale===1000?0:3)+' '+unit;}
function updateUI(){if(!sim)return;if(view&&$('cameraSelect').value!==view.mode)$('cameraSelect').value=view.mode;const c=sim.cart,s=sim.sensors,t=sim.latest||{},history=key=>sim.history[key]||[],state=states[sim.state]||[sim.state,''];set('elapsed',formatTime(sim.time));set('stateText',state[0]);set('runState','실행 중');$('runState').hidden=sim.paused;set('stateReason',state[1]);$('statusDot').style.background=['FOLLOW','AVOID','HOLD_DISTANCE'].includes(sim.state)?'#3c7b59':['E_STOP','CONTACT_HOLD','SENSOR_HOLD','TAG_LOST'].includes(sim.state)?'#c14c3d':'#9b7d37';$('pauseOverlay').hidden=!sim.paused;$('pauseBtn').innerHTML=sim.paused?'재개'+' <kbd>Space</kbd>':'일시정지 <kbd>Space</kbd>';$('emergencyBtn').textContent=sim.estop?'비상정지 해제':'비상정지 E';$('emergencyBtn').setAttribute('aria-pressed',String(sim.estop));$('terrainNotice').hidden=!isFinite(sim.world.barrierZ());$('terrainNotice').firstChild.textContent=sim.config.terrain==='stairs'?'계단 통과 금지 · 알려진 지형 지도 기반 정지':'8° 초과 경사 통과 금지 · 알려진 지형 지도 기반 정지';
 set('worldSummary','18 × 28 m / 장애물 '+sim.world.objects.length+'개');set('lightLabel',sim.config.light==='sun'?'햇빛 / 고도 '+sim.config.sunElevation+'°':sim.config.light==='low'?'저조도':'상부 인공 조명');document.querySelector('.stage').classList.toggle('low',sim.config.light==='low');
 metric('lidarNearest',s.lidar.nearest,'m');set('lidarHits',s.lidar.hits+' / '+s.lidar.rays.length);metric('lidarQuality',s.lidar.quality*100,'%',0);set('lidarDelta','Δ '+delta('lidar_nearest_m'));set('lidarRangeText','360° / 상한 '+sim.config.lidarRange+' m / 유효 모델 '+number(s.lidar.range,1)+' m');
 for(let i=0;i<2;i++){const a=s.uwb.anchors[i],side=i?'Right':'Left';metric('uwb'+side,a?.distance,'m');set('uwb'+side+'Status',!a?.valid?'위치 미획득':a.nlos?'비가시선 · '+number(a.quality*100,0)+'%':a.inFov?'가시선 · PDoA':'거리만 획득');const tf=s.tof.values[i];metric('tof'+side,tf?.distance==null?null:tf.distance*1000,'mm',0);set('tof'+side+'Status',tf?.status==='invalid'?'측정 무효':tf?.status==='hit'?'거리 반환':'반환 없음');}
 const tele=sim.telemetry();set('uwbMode',s.uwb.mode==='pdoa'?'거리·방위':s.uwb.mode==='range_history'?'거리·이력 융합':'신호 소실');set('uwbFused',number(tele.uwb.dist_m)+' m');set('uwbBearing',number(tele.uwb.bearing_deg,1)+'°');set('uwbAge',Math.round((sim.time-s.uwb.stamp)*1000)+' ms');set('uwbDelta','Δ 좌 '+delta('uwb_left_m')+' / 우 '+delta('uwb_right_m'));set('tofRangeText','27° / 유효 모델 '+number(s.tof.values[0]?.range,2)+' m');set('tofDelta','Δ 좌 '+delta('tof_left_m',1000,'mm')+' / 우 '+delta('tof_right_m',1000,'mm'));
 for(let side of['L','R']){set('rpm'+side,number(c['rpm'+side],1)+' rpm');set('current'+side,number(c['current'+side],2)+' A');set('power'+side,number(c['power'+side],1)+' W');set('duty'+side,number(c['duty'+side],1)+'%');metric('servo'+side,c['steer'+side]/deg,'°',1);}set('brakeState',c.parking?'주차 제동':c.brake?'감속 제동':c.coasting?'구동 해제':c.v<-.025?'후진 구동':'전진 구동');set('acceleration',number(c.a,2)+' m/s²');set('gravityForce',number(c.gravityForce??0,1)+' N');set('motorForce',number(c.motorForce??0,1)+' N');set('brakeForce',number(c.brakeForce??0,1)+' N');set('servoCmd',number(sim.command.steer/deg,1)+'°');set('pitch',number(c.pitch/deg,1)+'°');metric('speed',c.v,'m/s');metric('commandSpeed',sim.command.speed,'m/s');metric('followTarget',sim.config.followDistance,'m',1);metric('odometer',c.distance,'m',1);set('contacts',sim.contacts);
 radar();chart('lidarChart',[{data:history('lidar_nearest_m'),color:colors.cyan}],0,sim.config.lidarRange);chart('uwbChart',[{data:history('uwb_left_m'),color:colors.blue},{data:history('uwb_right_m'),color:colors.blue2,dash:true}],0);chart('tofChart',[{data:history('tof_left_m').map(v=>v===null?null:v*1000),color:colors.gold},{data:history('tof_right_m').map(v=>v===null?null:v*1000),color:colors.gold2,dash:true}],0,sim.config.tofRange*1000);chart('motorChart',[{data:history('current_left_A'),color:colors.white},{data:history('current_right_A'),color:colors.white,dash:true}],0);chart('servoChart',[{data:history('steer_left_deg'),color:colors.white},{data:history('steer_right_deg'),color:colors.white,dash:true},{data:history('command_steer_deg'),color:colors.muted,dash:[2,3]}],-55,55);
 let ev=sim.events.slice(0,7),signature=ev.map(e=>e.t+e.type+e.message).join('');if($('events').dataset.key!==signature){$('events').dataset.key=signature;$('events').replaceChildren();for(let e of ev){let row=document.createElement('div'),tm=document.createElement('time'),text=document.createElement('span');row.className='event-entry';tm.textContent=number(e.t,1)+'s';text.textContent=e.type==='STATE'?(states[e.message]?.[0]||e.message):e.message;row.append(tm,text);$('events').appendChild(row);}}
}
function labels(){for(let[id,p]of[['cartLabel',[sim.cart.x,sim.cart.y+1.17,sim.cart.z+.2]],['userLabel',[sim.user.x,sim.user.y+1.98,sim.user.z]]]){let q=view.renderer.project(p),e=$(id);e.hidden=!q?.visible;if(q?.visible){const w=$('scene').clientWidth,h=$('scene').clientHeight;e.style.left=M.clamp(q.x,e.offsetWidth/2+4,w-e.offsetWidth/2-4)+'px';e.style.top=M.clamp(q.y,e.offsetHeight+4,h-4)+'px';}}}
function inputs(){if(sim.paused||$('helpDialog').open||$('settingsDrawer').open)return sim.setInput(0,0);const focused=document.activeElement,editing=focused&&focused.closest('input,select,textarea,[contenteditable=true],summary,a,.telemetry');if(editing)return sim.setInput(0,0);const active=k=>keys.has(k),up=active('ArrowUp')||active('KeyW')||touch.has('up'),down=active('ArrowDown')||active('KeyS')||touch.has('down'),left=active('ArrowLeft')||active('KeyA')||touch.has('left'),right=active('ArrowRight')||active('KeyD')||touch.has('right');let d=view.screenVector(Number(right)-Number(left),Number(up)-Number(down));if(d.x!==sim.input.x||d.z!==sim.input.z)sim.setInput(d.x,d.z);}
function frame(now){const dt=Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;try{inputs();if(!sim.paused){accumulator+=dt;let n=0;while(accumulator>=SC.constants.step&&n<6){sim.step();accumulator-=SC.constants.step;n++;}}if(renderEnabled){view.render(dt);labels();}if(now-lastUI>100){updateUI();lastUI=now;}frameCounter++;if(now-fpsStart>1500){let seconds=(now-fpsStart)/1000;set('fps',Math.round(frameCounter/seconds)+' FPS / WEBGL 2');set('simulationRate','모의 시간 '+number((sim.time-rateStart)/seconds,2)+'×');rateStart=sim.time;frameCounter=0;fpsStart=now;}requestAnimationFrame(frame);}catch(error){console.error(error);fatal(error);}}
function fatal(error){$('loading').hidden=false;$('loading').classList.add('error');$('loading').querySelector('h2').textContent='시뮬레이션 오류';$('loading').querySelector('p').textContent=String(error.message||error);if(sim)sim.paused=true;}
SC.app={get sim(){return sim;},set sim(v){sim=v;},get view(){return view;},set view(v){view=v;},reset,pause,exportData,states,setRenderEnabled:v=>renderEnabled=v,step:n=>{const paused=sim.paused;sim.paused=false;for(let i=0;i<n;i++)sim.step();sim.paused=paused;view.render(0);labels();updateUI();},setInput:(x,z)=>sim.setInput(x,z)};
try{
 reset(SC.defaults);
 $('loading').hidden=true;
 $('pauseBtn').addEventListener('click',()=>pause(!sim.paused));$('resetBtn').addEventListener('click',()=>{reset();toast('같은 시드로 초기화했습니다.');});$('emergencyBtn').addEventListener('click',()=>{sim.setEmergency(!sim.estop);updateUI();});$('settingsBtn').addEventListener('click',()=>toggleSettings($('settingsDrawer').hidden));$('closeSettings').addEventListener('click',()=>toggleSettings(false));$('cameraSelect').addEventListener('change',e=>{view.setCamera(e.target.value);keys.clear();});
 for(const[id,key]of[['terrainSelect','terrain'],['densitySelect','density'],['lightSelect','light']])$(id).addEventListener('change',e=>changeConfig(key,e.target.value,key==='light'));
 for(const e of document.querySelectorAll('[data-layer]'))e.addEventListener('change',()=>{sim.config[e.dataset.layer]=e.checked;});
 for(const e of document.querySelectorAll('[data-fault]'))e.addEventListener('change',()=>{sim.sensors.fault[e.dataset.fault]=e.checked;sim.recordEvent('FAULT',e.dataset.fault.toUpperCase()+(e.checked?' 관측 중단':' 관측 복구'));});
 for(const input of $('settingsForm').elements)if(input.type==='range')input.addEventListener('input',()=>{set(input.name+'Output',input.value+(configUnits[input.name]||''));if(input.dataset.live){sim.config[input.name]=+input.value;}});
 $('settingsForm').addEventListener('submit',e=>{e.preventDefault();let cfg={...sim.config};for(const input of e.currentTarget.elements){if(!input.name)continue;cfg[input.name]=input.type==='checkbox'?input.checked:input.tagName==='SELECT'?input.value:Number(input.value);}try{reset(cfg);toggleSettings(false);toast('설정을 적용했습니다.');}catch(error){toast(error.message);}});
 $('boxPushBtn').addEventListener('click',()=>{sim.disturbance();toast(sim.events[0].message);});
 $('exportBtn').addEventListener('click',e=>{e.stopPropagation();toggleExport();});
 for(const element of document.querySelectorAll('[data-export]'))element.addEventListener('click',()=>{exportData(element.dataset.export);$('exportBtn').focus({preventScroll:true});});
 document.addEventListener('pointerdown',e=>{if(!$('exportMenu').contains(e.target)&&!$('exportBtn').contains(e.target))closeExport();});
 document.addEventListener('focusin',e=>{if(!$('exportMenu').hidden&&!$('exportMenu').contains(e.target)&&!$('exportBtn').contains(e.target))closeExport();});
 window.addEventListener('resize',()=>closeExport());
 for(const details of document.querySelectorAll('.trend-details'))details.addEventListener('toggle',()=>{if(details.open)updateUI();});
 $('settingsDrawer').addEventListener('close',()=>{$('settingsDrawer').hidden=true;$('settingsBtn').setAttribute('aria-expanded','false');keys.clear();touch.clear();sim.setInput(0,0);$('settingsBtn').focus({preventScroll:true});});
 $('importBtn').addEventListener('click',()=>{$('importFile').click();closeExport();});$('importFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1024*1024)throw new Error('설정 파일은 1 MB 이하여야 합니다.');const data=JSON.parse(await f.text());reset(data.config||data);toast('환경 설정을 불러왔습니다.');}catch(error){toast('설정 불러오기 실패: '+error.message);}e.target.value='';});
 $('helpBtn').addEventListener('click',()=>{closeExport();pause(true);$('helpDialog').showModal();});$('helpDialog').addEventListener('close',()=>{$('helpBtn').focus({preventScroll:true});});$('closeHelp').addEventListener('click',()=>$('helpDialog').close());$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
 document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){closeExport(true);return;}
  if(e.ctrlKey||e.metaKey||e.altKey||$('helpDialog').open||$('settingsDrawer').open)return;
  // Native controls retain Space/Enter/arrow behavior. Do not trigger both
  // a global pause shortcut and a focused button's native click.
  if(e.target.closest('input,select,textarea,[contenteditable=true],summary,a,.telemetry'))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){
   e.preventDefault();keys.add(e.code);return;
  }
  // Toolbar button focus must not swallow movement after Pause/Reset, but
  // Space/Enter still activate that button natively exactly once.
  if(e.target.closest('button'))return;
  if(e.repeat)return;
  if(e.code==='Space'){e.preventDefault();pause(!sim.paused);}
  else if(e.code==='KeyE'){e.preventDefault();sim.setEmergency(!sim.estop);updateUI();}
  else if(e.code==='KeyC'){e.preventDefault();view.setCamera('follow');$('cameraSelect').value='follow';}
 });
 document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{if(sim&&!sim.paused)pause(true,'포커스 이탈. 자동 재개하지 않습니다.');});document.addEventListener('visibilitychange',()=>{if(document.hidden&&sim&&!sim.paused)pause(true,'탭 비활성화. 자동 재개하지 않습니다.');});
 for(const button of document.querySelectorAll('[data-dir]')){button.addEventListener('pointerdown',e=>{e.preventDefault();$('scene').focus({preventScroll:true});button.setPointerCapture(e.pointerId);touch.add(button.dataset.dir);button.classList.add('active');});for(const event of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{touch.delete(button.dataset.dir);button.classList.remove('active');});}
 $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);fatal(new Error('WebGL 컨텍스트가 손실됐습니다. 페이지를 새로 열어 주세요.'));});
 lastFrame=performance.now();requestAnimationFrame(frame);globalThis.__SMART_CART__=SC.app;
}catch(error){console.error(error);fatal(error);}
})();

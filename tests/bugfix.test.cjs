/* Executable 1.2.0 defect regression. No browser or third-party dependencies.
 * Navigation fixtures explicitly supply acquired history where stated; they
 * do not claim two initial rear ranges uniquely identify a tag bearing. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../simulator/js');
for(const f of['math','world','kinematics','dynamics','sensors','navigation','simulation','gl','model','view'])require(path.join(root,f+'.js'));
const rows=[],test=(name,fn)=>{const t=performance.now();try{const detail=fn()??null;rows.push({name,status:'PASS',ms:Math.round(performance.now()-t),detail});console.log('PASS',name);}catch(e){rows.push({name,status:'FAIL',message:e.message});console.error('FAIL',name,e.stack);process.exitCode=1;}};
const base=(extra={})=>new SC.Simulation({density:'none',noise:0,light:'artificial',...extra});
const advance=(s,n)=>{for(let i=0;i<n;i++)s.step();};
function acquired(target,extra={}){
 const s=base(extra);s.cart.z=0;Object.assign(s.cart,SC.cartTerrainPose(s.cart,s.world));Object.assign(s.user,target);s.user.y=s.world.height(s.user.x,s.user.z);
 s.sensors=new SC.Sensors(s.config);s.sensors.uwb.fused={x:s.user.x,z:s.user.z,vx:0,vz:0};s.sensors.uwb.stamp=0;
 s.sensors.update(s.world,s.cart,s.user,0);s.nav=new SC.Navigation(s.config,s.world);s.nav.observe(s.sensors,0,s.cart);return s;
}
function placed(terrain,slope=8,cargo=15,yaw=0){const s=base({terrain,slope,cargo});s.cart.z=5;s.cart.yaw=yaw;s.user.x=8;s.user.z=15;Object.assign(s.cart,SC.cartTerrainPose(s.cart,s.world));return s;}
for(const angle of[-180,-135,-90,-45,0,45,90,135])test('Fixed terrain cardinal/diagonal inputs independent of orbit '+angle+' deg',()=>{
 // Extra camera state must have no effect. No View API participates in this mapping.
 for(const elevation of[.15,.63,1.52]){
  for(const [right,forward]of[[-1,0],[1,0],[0,1],[0,-1],[-1,1],[1,1],[-1,-1],[1,-1]]){
   const d=SC.math.controlVector(right,forward,{azimuth:angle*SC.math.DEG,elevation});
   assert.equal(d.x,-right);assert.equal(d.z,forward);
   const s=base();s.setInput(d.x,d.z);
   assert(Math.abs(Math.hypot(s.input.x,s.input.z)-1)<1e-9);
  }
 }
});
test('Drag signs, focus, active pointer ownership and cancellation',()=>{
 const events={};let focus=0;const canvas={addEventListener:(n,f)=>events[n]=f,setPointerCapture(){},focus(){focus++;}};
 const v={canvas,azimuth:0,elevation:.6,distance:6,mode:'follow',drag:null};SC.View.prototype.bind.call(v);
 events.pointerdown({button:0,clientX:100,clientY:100,pointerId:4,preventDefault(){}});
 events.pointermove({clientX:180,clientY:65,pointerId:99});assert.equal(v.azimuth,0);
 events.pointermove({clientX:180,clientY:65,pointerId:4});assert(v.azimuth>0);assert(v.elevation>.6);assert.equal(focus,1);
 events.pointercancel({pointerId:4});const a=v.azimuth;events.pointermove({clientX:300,clientY:200,pointerId:4});assert.equal(v.azimuth,a);assert.equal(v.drag,null);
});
for(const noise of[0,1,2])test('UWB acquired track crosses both lateral FoV boundaries, noise '+noise,()=>{
 const s=base({noise}),sensors=new SC.Sensors(s.config);s.cart.z=0;let maxError=0,maxAge=0,historyCount=0;
 for(let i=0;i<=800;i++){
  const a=2*Math.PI*i/800,u={x:1.4*Math.sin(a),z:.824+1.4*Math.cos(a),y:0};
  sensors.update(s.world,s.cart,u,i*.02);assert(sensors.uwb.fused);
  maxError=Math.max(maxError,SC.math.dist(u,sensors.uwb.fused));maxAge=Math.max(maxAge,i*.02-sensors.uwb.stamp);
  if(sensors.uwb.mode==='range_history')historyCount++;
 }
 assert(maxError<.40);assert(maxAge<.3);assert(historyCount>200);return{maxError_m:maxError,maxAge_s:maxAge,rangeOnlySamples:historyCount};
});
test('Slant-range projection uses the estimated terrain height, not a fixed flat height',()=>{
 const s=placed('uphill'),sensors=new SC.Sensors(s.config),u={x:.8,z:11,y:s.world.height(.8,11)};
 sensors.update(s.world,s.cart,u,0);assert(sensors.uwb.fused);assert(SC.math.dist(sensors.uwb.fused,u)<.01);
});
for(const side of[-1,1])test('Acquired '+(side<0?'left':'right')+' near-side user triggers safe repositioning',()=>{
 const s=acquired({x:side*1.25,z:.33},{noise:1}),start={...s.cart};let moved=0,lost=0,states=new Set();
 for(let i=0;i<700;i++){s.step();moved=Math.max(moved,SC.math.dist(start,s.cart));if(s.time-s.sensors.uwb.stamp>.75)lost++;states.add(s.state);}
 assert(moved>.6);assert(Math.abs(s.cart.yaw)>.6);assert(states.has('REPOSITION'));assert.equal(lost,0);assert.equal(s.contacts,0);
 assert(SC.math.dist(s.sensors.uwb.fused,s.user)<.3);return{displacement_m:moved,heading_deg:s.cart.yaw/SC.math.DEG,contacts:s.contacts};
});
test('A user leaving the near-side position continues to be tracked',()=>{
 const s=acquired({x:1.25,z:.33},{noise:1});advance(s,500);const start={...s.cart};s.setInput(1,0);advance(s,450);
 assert(s.cart.x>start.x+.5);assert(s.time-s.sensors.uwb.stamp<.3);assert.equal(s.contacts,0);assert(s.state!=='TAG_LOST');
 return{cartDisplacement_m:SC.math.dist(start,s.cart),trackingMode:s.sensors.uwb.mode};
});
for(const x of[-2,0,2])test('Acquired rear target x='+x+' is approached with correct reverse curvature and held',()=>{
 const s=acquired({x,z:-4});let minV=0,maxV=0,shifts=0;
 for(let i=0;i<1200;i++){s.step();minV=Math.min(minV,s.cart.v);maxV=Math.max(maxV,s.cart.v);if(s.state==='GEAR_CHANGE')shifts++;}
 assert(minV<-.15);assert(maxV<.04);assert(s.cart.z<-1.5);if(x)assert(s.cart.x*x>.3);
 assert.equal(s.cart.v,0);assert.equal(s.state,'HOLD_DISTANCE');assert.equal(s.contacts,0);assert(shifts<30);
 const spacing=SC.math.dist(s.nav.centre(s.cart),s.user);assert(spacing>2.0&&spacing<2.5);
 return{minSpeed_mps:minV,maxSpeed_mps:maxV,spacing_m:spacing,gearChangeTicks:shifts};
});
test('Close forward target causes low-speed reverse separation instead of permanent radial hold',()=>{
 const s=acquired({x:0,z:1.5});let minV=0;for(let i=0;i<700;i++){s.step();minV=Math.min(minV,s.cart.v);}
 assert(minV<-.15);assert(s.cart.z<-.7);assert.equal(s.state,'HOLD_DISTANCE');assert.equal(s.contacts,0);
});
test('Forward-to-reverse change commands braking before negative drive',()=>{
 const s=acquired({x:0,z:-5});s.cart.v=.5;const cmd=s.nav.command(s.world,s.cart,s.sensors,.05);
 assert.equal(s.nav.status,'GEAR_CHANGE');assert.equal(cmd.speed,0);assert(cmd.brake);
 let reverse=false;for(let i=0;i<220;i++){s.step();if(s.command.speed<0){assert(Math.abs(s.cart.v)<.29);reverse=true;}}
 assert(reverse);assert(s.cart.v<-.1);
});
test('Reverse swept-body collision check rejects an observed rear obstacle',()=>{
 const s=acquired({x:0,z:-5});s.nav.points=[{x:0,z:-.67}];
 const q=s.nav.rollout(s.cart,-.25,0,{x:0,z:-3},s.sensors,s.world);assert(!q.safe);
});
test('Reverse trajectory respects the known rear map boundary',()=>{
 const s=acquired({x:0,z:-5});s.cart.z=s.world.zMin+.37;
 assert(!s.nav.rollout(s.cart,-.25,0,{x:0,z:-12},s.sensors,s.world).safe);
});
test('Initial rear ranges still do not fabricate a bearing or start blind reverse',()=>{
 const s=base();s.cart.z=0;s.user.z=-4;s.sensors=new SC.Sensors(s.config);s.sensors.update(s.world,s.cart,s.user,0);
 assert(s.sensors.uwb.anchors.every(a=>a.valid&&a.bearing===null));assert.equal(s.sensors.uwb.fused,null);
 assert(s.nav.command(s.world,s.cart,s.sensors,.1).brake);
});
const items=SC.buildPerson();
for(const terrain of['flat','uphill','downhill','rolling','stairs'])test('Actual shoe/calf meshes clear '+terrain+' across gait phases, headings and slope breaks',()=>{
 const s=base({terrain,slope:8}),zs=terrain==='stairs'?[3.88,4.1,4.3,4.55]:[1.9,2,2.1,5.8,6,6.1,8.9,9,9.1];
 let minClearance=Infinity,boneError=0,poses=0;
 for(const z of zs)for(let yaw=0;yaw<2*Math.PI-1e-5;yaw+=Math.PI/4)for(let phase=0;phase<6.28;phase+=Math.PI/4){
  const person={x:0,z,y:s.world.height(0,z),yaw,phase,vx:Math.sin(yaw)*.7,vz:Math.cos(yaw)*.7},pose=SC.humanPose(person,s.world);poses++;
  for(const j of Object.values(pose.joints))boneError=Math.max(boneError,Math.abs(Math.hypot(...SC.math.V.sub(j.hip,j.knee))-.43),Math.abs(Math.hypot(...SC.math.V.sub(j.ankle,j.knee))-.40));
  for(const item of items.filter(i=>/^(foot|shin)/.test(i.id))){const a=item.vertices,mat=pose.parts[item.id];for(let i=0;i<a.length;i+=6){const p=SC.math.M.point(mat,a.slice(i,i+3));minClearance=Math.min(minClearance,p[1]-s.world.height(p[0],p[2]));}}
 }
 assert(minClearance>=-1e-5);assert(boneError<1e-7);return{poses,minimumClearance_m:minClearance,maximumBoneLengthError_m:boneError};
});
test('Stationary feet do not keep swinging after pedestrian movement stops',()=>{
 const s=placed('uphill'),person={x:0,z:5,y:s.world.height(0,5),yaw:0,vx:0,vz:0,phase:.7};
 const a=SC.humanPose(person,s.world),b=SC.humanPose({...person,phase:2.7},s.world);
 assert.deepEqual(a.parts.footL,b.parts.footL);assert.deepEqual(a.parts.footR,b.parts.footR);
});
test('Tagged user and autonomous pedestrians share the same terrain-referenced rendering',()=>{
 const s=placed('downhill'),v={sim:s},person={x:0,z:5,y:s.world.height(0,5),yaw:.8,phase:2,vx:.5,vz:.2},draws=[];
 SC.View.prototype.humanDraw.call(v,items,person,draws);const expected=SC.humanPose(person,s.world);
 assert.deepEqual(draws.find(x=>x.item.id==='footL').matrix,expected.parts.footL);
});
for(const terrain of['uphill','downhill'])test('Unpowered and unbraked cart accelerates down '+terrain,()=>{
 const s=placed(terrain);s.command={speed:0,steer:0,brake:false,coast:true};for(let i=0;i<60;i++)s.integrate(1/60);
 const sign=terrain==='uphill'?-1:1;assert(s.cart.v*sign>.8);assert((s.cart.z-5)*sign>.4);assert(s.cart.a*sign>.8);assert.equal(s.cart.currentL,0);
 return{speed_mps:s.cart.v,displacement_m:s.cart.z-5,acceleration_mps2:s.cart.a,gravity_N:s.cart.gravityForce};
});
test('Flat, unpowered, unbraked rest does not spontaneously accelerate',()=>{
 const s=placed('flat');s.command={speed:0,steer:0,brake:false,coast:true};for(let i=0;i<90;i++)s.integrate(1/60);assert.equal(s.cart.v,0);assert.equal(s.cart.z,5);
});
test('An uphill coasting cart stops and rolls back instead of being clamped at zero',()=>{
 const s=placed('uphill');s.cart.v=.35;s.command={speed:0,steer:0,brake:false,coast:true};let forward=false;
 for(let i=0;i<70;i++){s.integrate(1/60);if(s.cart.v>0)forward=true;}assert(forward);assert(s.cart.v<-.5);assert(s.cart.spinL<0);
});
test('Gravity and pitch signs reverse when the vehicle faces downhill',()=>{
 const a=placed('uphill'),b=placed('uphill',8,15,Math.PI);
 for(const s of[a,b]){s.command={speed:0,steer:0,brake:false,coast:true};for(let i=0;i<30;i++)s.integrate(1/60);}
 assert(a.cart.v<0&&b.cart.v>0);assert(Math.abs(a.cart.v+b.cart.v)<1e-7);assert(a.cart.z<5&&b.cart.z<5);
});
test('Cross-slope support tilts the cart without inventing longitudinal gravity',()=>{
 const s=placed('uphill',8,15,Math.PI/2);assert(Math.abs(s.cart.roll)>7*SC.math.DEG);assert(Math.abs(s.cart.pitch)<1e-9);
 s.command={speed:0,steer:0,brake:false,coast:true};s.integrate(1/60);assert(Math.abs(s.cart.gravityForce)<1e-9);
});
test('Equivalent wheel rotational inertia is included in force balance',()=>{
 const s=placed('uphill');s.cart.v=.4;s.command={speed:.65,steer:0,brake:false};s.integrate(1/60);const c=s.cart;
 assert(c.effectiveMass>c.mass+3);assert(Math.abs(c.a*c.effectiveMass-(c.motorForce+c.gravityForce+c.rollingForce+c.brakeForce+c.dragForce))<1e-7);
 return{mass_kg:c.mass,effectiveMass_kg:c.effectiveMass};
});
test('Payload changes acceleration under the same controller and drive response',()=>{
 const a=placed('flat',8,0),b=placed('flat',8,65);for(const s of[a,b]){s.command={speed:1,steer:0,brake:false};for(let i=0;i<24;i++)s.integrate(1/60);}
 assert(a.cart.v>b.cart.v+.025);return{unloadedSpeed_mps:a.cart.v,loadedSpeed_mps:b.cart.v};
});
test('A grade transition is not canceled instantly by exact force feed-forward',()=>{
 const a=placed('flat'),b=placed('flat');for(const s of[a,b]){s.command={speed:.7,steer:0,brake:false};for(let i=0;i<300;i++)s.integrate(1/60);s.cart.z=5;}
 b.config.terrain='uphill';a.integrate(1/60);b.integrate(1/60);assert(b.cart.a<a.cart.a-.8);return{flatAcceleration_mps2:a.cart.a,uphillEntryAcceleration_mps2:b.cart.a};
});
test('Finite service braking gives longer downhill stopping travel than uphill',()=>{
 const results={};for(const terrain of['uphill','flat','downhill']){
  const s=placed(terrain,8,65);s.cart.v=.8;s.command={speed:0,steer:0,brake:true};let n=0;
  do{s.integrate(1/60);n++;}while(Math.abs(s.cart.v)>1e-8&&n<240);
  assert(n<240);assert.equal(s.cart.v,0);results[terrain]={distance:s.cart.z-5,time:n/60};
 }
 assert(results.downhill.distance>results.flat.distance+.05);assert(results.flat.distance>results.uphill.distance+.01);return results;
});
test('Commanded parking brake holds a loaded 8-degree incline in both directions',()=>{
 for(const terrain of['uphill','downhill']){const s=placed(terrain,8,65);s.cart.v=.5;s.command={speed:0,steer:0,brake:true};for(let i=0;i<180;i++)s.integrate(1/60);const z=s.cart.z,spin=s.cart.spinL;for(let i=0;i<180;i++)s.integrate(1/60);assert.equal(s.cart.v,0);assert.equal(s.cart.z,z);assert.equal(s.cart.spinL,spin);assert(s.cart.parking);assert(Math.abs(s.cart.netForce)<1e-8);}
});
test('Signed reverse and slope dynamics are retained in CSV capture and Flutter extension',()=>{
 const s=placed('uphill');s.command={speed:0,steer:0,brake:false,coast:true};for(let i=0;i<20;i++)s.integrate(1/60);s.capture();const t=s.telemetry();
 assert(s.latest.acceleration_mps2<0);assert(s.latest.gravity_force_N<0);assert(s.latest.rpm_left<0);
 assert(t.drive.speed_mps<0);assert.equal(t.sim.acceleration_mps2,s.cart.a);assert.equal(t.sim.gravity_force_N,s.cart.gravityForce);assert.equal(t.tof.cliff,null);
});
const out={suite:'1.2.0 five-defect regression',version:'1.2.0',node:process.version,executedAt:new Date().toISOString(),passed:rows.filter(r=>r.status==='PASS').length,failed:rows.filter(r=>r.status==='FAIL').length,tests:rows};
fs.writeFileSync(path.join(__dirname,'bugfix-results.json'),JSON.stringify(out,null,2));console.log('RESULT',out.passed,out.failed);

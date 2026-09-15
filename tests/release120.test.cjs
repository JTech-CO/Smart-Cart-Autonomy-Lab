/* 1.2.0 fixed-axis controls, gait direction and delivery contract.
 * Node-only numerical and source tests. No runtime dependencies. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),site=path.join(ROOT,'simulator');
for(const f of ['math','world','kinematics','dynamics','sensors','navigation','simulation','gl','model','view'])require(path.join(site,'js',f+'.js'));
const tests=[];
function test(name,fn){try{const detail=fn()??null;tests.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){tests.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.stack);process.exitCode=1;}}
const near=(a,b,e=1e-9)=>assert(Math.abs(a-b)<=e,`${a} is not within ${e} of ${b}`);
const flat=new SC.World({...SC.defaults,density:'none'});
test('The application input path does not read camera/view orientation',()=>{
 const source=fs.readFileSync(path.join(site,'js/app.js'),'utf8');
 const block=source.slice(source.indexOf('function inputs(){'),source.indexOf('function frame('));
 assert(block.includes('M.controlVector'));assert(!block.includes('view.'));assert.equal(typeof SC.View.prototype.screenVector,'undefined');
});
test('Fixed axis mapping rejects nonfinite input and clamps external magnitudes',()=>{
 let d=SC.math.controlVector(NaN,Infinity);near(d.x,0);near(d.z,0);
 d=SC.math.controlVector(90,-12);near(d.x,-1);near(d.z,-1);
});
test('WASD/arrow equivalent directions preserve normalized travel speed',()=>{
 for(const [right,forward] of [[0,1],[0,-1],[-1,0],[1,0],[-1,1],[1,1],[-1,-1],[1,-1]]){
  const s=new SC.Simulation({density:'none',noise:0}),d=SC.math.controlVector(right,forward),before={...s.user};
  s.setInput(d.x,d.z);s.world.userMove(s.user,s.input.x*s.config.userSpeed,s.input.z*s.config.userSpeed,1/60);
  near(Math.hypot(s.user.x-before.x,s.user.z-before.z),s.config.userSpeed/60);
 }
});
test('Swing foot travels from behind to ahead; positive lift never accompanies reverse swing',()=>{
 let last=-Infinity;for(let j=0;j<=100;j++){const a=SC.gait.sample(j*Math.PI/100);assert(a.stride>=last-1e-12);last=a.stride;if(j>0&&j<100)assert(a.lift>0);}
 assert(SC.gait.sample(.2).stride<0);assert(SC.gait.sample(Math.PI-.2).stride>0);
});
test('Stance foot recedes at exactly the distance-phase rate without lift',()=>{
 const rate=SC.gait.phasePerMeter;
 for(let j=1;j<100;j++){let p=Math.PI+j*Math.PI/101,a=SC.gait.sample(p),b=SC.gait.sample(p+1e-4);near(a.lift,0);near((b.stride-a.stride)/1e-4,-1/rate,1e-8);}
});
test('Gait cycles are continuous and periodic across negative and wrapped phases',()=>{
 for(let p=-10;p<20;p+=.13){let a=SC.gait.sample(p),b=SC.gait.sample(p+2*Math.PI);near(a.stride,b.stride);near(a.lift,b.lift);}
 for(const p of [0,Math.PI,2*Math.PI]){const a=SC.gait.sample(p-1e-8),b=SC.gait.sample(p+1e-8);near(a.stride,b.stride,1e-8);near(a.lift,b.lift,1e-8);}
});
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])test('Supported foot remains planted in straight travel at heading '+Math.round(yaw*180/Math.PI),()=>{
 let maxDrift=0;
 for(const speed of [.2,.35,.65,1.05,1.5])for(const side of ['L','R']){
  const start=Math.PI+.3-(side==='R'?Math.PI:0),person={x:0,z:0,yaw,phase:start,vx:Math.sin(yaw)*speed,vz:Math.cos(yaw)*speed};
  const first=SC.humanPose(person,flat).joints[side].ankle;
  const interval=1.5/(SC.gait.phasePerMeter*speed);
  for(let i=1;i<=30;i++){
   const dt=interval/30;person.x+=person.vx*dt;person.z+=person.vz*dt;person.phase+=speed*dt*SC.gait.phasePerMeter;
   const foot=SC.humanPose(person,flat).joints[side].ankle;
   maxDrift=Math.max(maxDrift,Math.hypot(foot[0]-first[0],foot[1]-first[1],foot[2]-first[2]));
  }
 }
 assert(maxDrift<1e-8);return{maxDriftM:maxDrift,speedsMps:[.2,.35,.65,1.05,1.5],legs:2};
});
test('Arms counter-swing against the same-side advancing leg',()=>{
 for(const phase of [.25,1.4,2.7,4,5.5]){
  const p={x:0,z:0,yaw:0,phase,vx:0,vz:1},pose=SC.humanPose(p,flat);
  for(const side of ['L','R']){
   const x=side==='L'?-.198:.198,hand=SC.math.M.point(pose.parts['arm'+side],[x,1.08,0]);
   const stride=pose.joints[side].ankle[2];assert(stride*hand[2]<=1e-10);
  }
 }
});
test('User facing follows actual travel for four fixed input directions',()=>{
 for(const [vx,vz] of [[0,1],[0,-1],[1,0],[-1,0]]){
  let user={x:0,z:0,yaw:0,phase:0};flat.userMove(user,vx,vz,1/60);
  near(Math.sin(user.yaw),vx);near(Math.cos(user.yaw),vz);near(user.phase,SC.gait.phasePerMeter/60);
 }
});
test('User gait does not continue when world boundary rejects forward movement',()=>{
 const u={x:0,z:flat.zMax-.35,yaw:0,phase:1.2};flat.userMove(u,0,1,1/60);
 near(u.vx,0);near(u.vz,0);near(u.phase,1.2);
});
test('Blocked autonomous pedestrian neither moonwalks nor advances intended phase',()=>{
 const w=new SC.World({...SC.defaults,density:'none'}),o={type:'person',x:0,z:0,y:0,yaw:0,vx:0,vz:0,r:.28,phase:1.2,goal:{x:0,z:5},preferredSpeed:.65};w.objects=[o];
 w.step(1/60,{x:7,z:7,r:.25},{x:0,z:0,yaw:0});near(o.x,0);near(o.z,0);near(o.vx,0);near(o.vz,0);near(o.phase,1.2);
});
test('Free autonomous pedestrian phase and facing use resolved displacement',()=>{
 const w=new SC.World({...SC.defaults,density:'none'}),o={type:'person',x:0,z:0,y:0,yaw:0,vx:0,vz:0,r:.28,phase:0,goal:{x:3,z:5},preferredSpeed:.65};w.objects=[o];
 for(let i=0;i<60;i++){const a={...o};w.step(1/60,{x:7,z:-7,r:.25},{x:-7,z:-7,yaw:0});
 const distance=Math.hypot(o.x-a.x,o.z-a.z);near(o.vx,(o.x-a.x)*60);near(o.vz,(o.z-a.z)*60);
 if(Math.hypot(o.vx,o.vz)>.03){near(o.phase-a.phase,distance*SC.gait.phasePerMeter);near(o.yaw,Math.atan2(o.vx,o.vz));}}
});
test('Standard outermost README names and reciprocal language links',()=>{
 for(const n of ['README.md','README-KR.md'])assert(fs.existsSync(path.join(ROOT,n)));
 assert(!fs.existsSync(path.join(ROOT,'README-SIMULATION.md')));assert(!fs.existsSync(path.join(ROOT,'README-SIMULATION-KR.md')));
 assert(fs.readFileSync(path.join(ROOT,'README.md'),'utf8').includes('(README-KR.md)'));assert(fs.readFileSync(path.join(ROOT,'README-KR.md'),'utf8').includes('(README.md)'));
});
test('All five history canvases use always-visible time-plot containers',()=>{
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');assert.equal((html.match(/class="live-trend"/g)||[]).length,5);
 assert(!html.includes('class="trend-details"'));assert.equal((html.match(/class="spark"/g)||[]).length,5);
});
test('Both entry titles and README introductions identify release 1.2.0',()=>{
 for(const n of ['index.html','simulator/index.html','README.md','README-KR.md'])assert(fs.readFileSync(path.join(ROOT,n),'utf8').includes('1.2.0'));
});
const out={suite:'1.2.0 fixed-input, gait and packaging regression',version:'1.2.0',node:process.version,executedAt:new Date().toISOString(),passed:tests.filter(x=>x.status==='PASS').length,failed:tests.filter(x=>x.status==='FAIL').length,tests};
fs.writeFileSync(path.join(__dirname,'release120-results.json'),JSON.stringify(out,null,2));console.log('RESULT',out.passed,out.failed);

'use strict';
SC.View=class View{
 constructor(canvas,sim){this.canvas=canvas;this.renderer=new SC.GL.Renderer(canvas);this.mode='follow';this.azimuth=-.58;this.elevation=.63;this.distance=6.5;this.target=null;this.drag=null;this.build(sim);this.bind();}
 /** Drag convention: right increases orbit azimuth; up raises the viewpoint. */
 bind(){
  this.canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0||this.drag)return;
   e.preventDefault();this.canvas.focus({preventScroll:true});
   this.drag={x:e.clientX,y:e.clientY,id:e.pointerId};this.canvas.setPointerCapture(e.pointerId);
  });
  this.canvas.addEventListener('pointermove',e=>{
   if(!this.drag||e.pointerId!==this.drag.id)return;
   this.azimuth=SC.math.wrap(this.azimuth+(e.clientX-this.drag.x)*.006);
   this.elevation=SC.math.clamp(this.elevation-(e.clientY-this.drag.y)*.006,.15,1.52);
   this.drag={x:e.clientX,y:e.clientY,id:e.pointerId};if(this.mode==='top')this.mode='follow';
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(event,e=>{
   if(this.drag&&e.pointerId===this.drag.id)this.drag=null;
  });
  this.canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=SC.math.clamp(this.distance*Math.exp(e.deltaY*.001),1.7,35);},{passive:false});
  this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 setCamera(mode){this.mode=mode;this.target=null;if(mode==='detail'){this.distance=2.8;this.elevation=.40;this.azimuth=2.55;}else if(mode==='overview'){this.distance=29;this.elevation=1.13;this.azimuth=-.22;}else if(mode==='top'){this.distance=16;this.elevation=1.52;this.azimuth=0;}else{this.distance=6.5;this.elevation=.63;this.azimuth=-.58;}}
 build(sim){this.renderer.disposeGeometry();this.sim=sim;this.cart=SC.buildCart();this.user=SC.buildPerson('#6c8c85',true);this.people=['#707d8f','#8c7b6e','#839183','#736f80'].map(c=>SC.buildPerson(c));const {Builder,material:mat}=SC.GL,B=new Builder(),w=sim.world,concrete=mat('#a8aeaa',.01,.94),edge=mat('#717b79',.08,.9),white=mat('#e4e4d9',0,.9),yellow=mat('#c3aa67',0,.83),floor=mat('#7d8887',0,.98);concrete.surface=1;floor.surface=1;
 // Continuous heightfield plus explicit stair risers. Rendered and queried terrain share World.height.
 let zs=[w.zMin,w.zMax];if(sim.config.terrain==='stairs'){zs=[w.zMin,4,...Array.from({length:6},(_,i)=>4+(i+1)*.32),w.zMax];}else if(sim.config.terrain==='rolling')zs=[w.zMin,1,6,11,w.zMax];else zs=[w.zMin,2,9,w.zMax];
 for(let i=0;i<zs.length-1;i++){let a=zs[i],b=zs[i+1],ha=w.height(0,a+.00001),hb=w.height(0,b-.00001);B.quad([[-9,ha,a],[-9,hb,b],[9,hb,b],[9,ha,a]],concrete,'world');if(i>0&&sim.config.terrain==='stairs'){let prev=w.height(0,a-.00001);B.quad([[-9,prev,a],[9,prev,a],[9,ha,a],[-9,ha,a]],edge,'world');B.box([18,.002,.025],[0,ha+.002,a+.015],yellow,'world');}}
 B.box([160,.2,160],[0,-3.4,0],floor,'world'); // distant neutral apron, never a drivable surface
 for(let s of[-1,1])for(let i=0;i<zs.length-1;i++){let a=zs[i],b=zs[i+1],ha=w.height(s*9,a+.001),hb=w.height(s*9,b-.001);B.quad([[s*8.75,ha+.009,a],[s*8.75,hb+.009,b],[s*8.82,hb+.009,b],[s*8.82,ha+.009,a]],white,'world');B.quad([[s*9,ha,a],[s*9,hb,b],[s*9,hb+.16,b],[s*9,ha+.16,a]],edge,'world');}
 for(let z=-8;z<17;z+=2){let h=w.height(0,z),h2=w.height(0,z+.5);if(sim.config.terrain==='stairs'&&z>=4&&z<6)continue;for(let x of[-4.5,4.5])B.quad([[x-.025,h+.01,z],[x-.025,h2+.01,z+.5],[x+.025,h2+.01,z+.5],[x+.025,h+.01,z]],white,'world');}
 B.label('SMART CART / AUTONOMY TEST AREA','18 m x 28 m  |  SIMULATION ONLY',[4.6,.4],[-4,w.height(-4,-8)+.015,-8],[-Math.PI/2,0,0],'world','#9aa49f','#53605f');
 if(isFinite(w.barrierZ())){let z=w.barrierZ()-.14,h=w.height(0,z);for(let x=-8.8;x<8.8;x+=.5)B.quad([[x,h+.01,z],[x+.28,h+.01,z],[x+.40,h+.01,z+.1],[x+.12,h+.01,z+.1]],yellow,'world');}
 this.worldItems=B.items;this.objectItems=new Map();
 for(const o of w.objects){if(o.type==='person')continue;const b=new Builder();if(o.type==='pillar'){let m=mat('#bac1bd',.01,.85);m.surface=1;b.cyl(o.r,o.h,[0,o.h/2,0],m,'obstacle',[0,0,0],36);b.cyl(o.r+.05,.13,[0,.065,0],edge,'obstacle',[0,0,0],36);b.cyl(o.r+.002,.14,[0,.55,0],yellow,'obstacle',[0,0,0],36);b.cyl(o.r+.002,.015,[0,.455,0],edge,'obstacle',[0,0,0],36);b.ring(o.r+.004,.009,[0,2.3,0],edge,'obstacle',[0,0,0],36,6);b.label('C'+String(o.id.split('-')[1]).padStart(2,'0'),'FIXED',[.25,.2],[0,1.3,o.r+.002],[0,0,0],'obstacle','#d7d9d3','#64716e');}else{let cardboard=mat('#b9996e',0,.96),tape=mat('#c7b28b',0,.66),ink=mat('#6a5c48',0,.9);cardboard.surface=2;b.box([o.w,o.h,o.d],[0,o.h/2,0],cardboard,'obstacle',.008);b.box([.061,.001,o.d-.009],[0,o.h+.001,0],tape,'obstacle');b.box([.061,o.h,.001],[0,o.h/2,o.d/2+.001],tape,'obstacle');for(let x of[-o.w/2+.015,o.w/2-.015])b.box([.001,o.h-.02,.001],[x,o.h/2,o.d/2+.002],ink,'obstacle');b.label('HANDLE WITH CARE',o.mass+' kg / MOVABLE',[o.w*.55,o.h*.24],[-o.w*.1,o.h*.63,o.d/2+.002],[0,0,0],'obstacle','#e3dfce','#494d49');for(let j=0;j<12;j++)b.box([.003+(j%3)*.001,.046,.001],[-.09+j*.009,o.h*.29,o.d/2+.003],ink,'obstacle');}this.objectItems.set(o.id,b.items);}
 this.target=null;
 }
 humanDraw(items,person,draws){
  const pose=SC.humanPose(person,this.sim.world);
  for(const item of items)draws.push({item,matrix:pose.parts[item.id]||pose.root});
 }
 overlays(){const s=this.sim,{M,V,DEG}=SC.math,c=s.cart,q=s.config,lines=[],faces=[],cyan=q.light==='low'?[.33,.90,.77]:[.05,.43,.37],blue=q.light==='low'?[.43,.68,1]:[.12,.36,.72],gold=q.light==='low'?[1,.68,.30]:[.58,.34,.03],mint=q.light==='low'?[.75,.82,.86]:[.23,.32,.37],identity=M.identity();const line=(a,b,color,alpha=1)=>lines.push(...a,...color,alpha,...b,...color,alpha),face=(a,b,c,color,alpha)=>faces.push(...a,...color,alpha,...b,...color,alpha,...c,...color,alpha);
 const circle=(origin,r,color,alpha=.3,plane='xz',transform=identity)=>{for(let i=0;i<96;i++){let a=i*Math.PI/48,b=(i+1)*Math.PI/48,p=plane==='xz'?[Math.sin(a)*r,0,Math.cos(a)*r]:[Math.cos(a)*r,Math.sin(a)*r,0],p2=plane==='xz'?[Math.sin(b)*r,0,Math.cos(b)*r]:[Math.cos(b)*r,Math.sin(b)*r,0];line(V.add(origin,M.point(transform,p,0).slice(0,3)),V.add(origin,M.point(transform,p2,0).slice(0,3)),color,alpha);}};
 if(q.showLidar){let scan=s.sensors.lidar,o=scan.origin,trs=s.sensors.matrix(c);circle(o,q.lidarRange,cyan,.22,'xz',trs);for(let i=0;i<scan.rays.length;i++){let ray=scan.rays[i];if(!ray.valid)continue;if(i%6===0||ray.hit)line(o,ray.point,cyan,ray.hit?.30:.055);if(ray.hit){let p=ray.point;line([p[0]-.022,p[1],p[2]],[p[0]+.022,p[1],p[2]],cyan,.95);line([p[0],p[1]-.022,p[2]],[p[0],p[1]+.022,p[2]],cyan,.95);}if(i%8===0){let next=scan.rays[(i+8)%scan.rays.length];face(o,ray.point,next.point,cyan,.014);}}
 circle(o,.075,cyan,.95,'xz');}
 if(q.showUwb){for(let a of s.sensors.uwb.anchors){let col=a.nlos?[1,.53,.33]:blue;circle(a.origin,q.uwbRange,col,.13);if(a.distance!==null){circle(a.origin,a.distance,col,.32);let f=s.sensors.uwb.fused;if(f){const p=[f.x,s.world.height(f.x,f.z)+1.08,f.z];line(a.origin,p,col,.9);}}for(let sign of[-1,1]){let dir=s.sensors.direction(c,sign*q.uwbFov*DEG/2);line(a.origin,V.add(a.origin,V.mul(dir,Math.min(q.uwbRange,4))),col,.3);}}if(s.sensors.uwb.fused){let f=s.sensors.uwb.fused,y=s.world.height(f.x,f.z)+.016;circle([f.x,y,f.z],.38,blue,.9);line([f.x,y,f.z],[f.x,y+1.15,f.z],blue,.6);}}
 if(q.showTof){for(let a of s.sensors.tof.values){let points=[];for(let i=0;i<=12;i++){let dir=s.sensors.direction(c,(i/12-.5)*a.fov*DEG),p=V.add(a.origin,V.mul(dir,a.range));points.push(p);if(i===0||i===12)line(a.origin,p,gold,.66);if(i>0){line(points[i-1],p,gold,.5);face(a.origin,points[i-1],p,gold,.042);}}if(a.distance!==null){line(a.origin,a.point,gold,.98);circle(a.point,.045,gold,.9);} // horizontal FoV surrogate matches the range sampler
 }}
 if(q.showPath&&s.nav.path.length){for(let i=1;i<s.nav.path.length;i++){let a=s.nav.path[i-1],b=s.nav.path[i],n=Math.ceil(SC.math.dist(a,b)/.2);for(let j=0;j<n;j++){let t=j/n,u=(j+1)/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,x2=a.x+(b.x-a.x)*u,z2=a.z+(b.z-a.z)*u;line([x,s.world.height(x,z)+.025,z],[x2,s.world.height(x2,z2)+.025,z2],mint,.9);}}if(s.nav.goal){let p=s.nav.goal;circle([p.x,s.world.height(p.x,p.z)+.026,p.z],.13,mint,.95);}}
 if(q.showMap){for(let i=0;i<s.nav.expiry.length;i++)if(s.nav.expiry[i]>s.time){let p=s.nav.point(i),r=.115,y=s.world.height(p.x,p.z)+.035;face([p.x-r,y,p.z-r],[p.x+r,y,p.z-r],[p.x+r,y,p.z+r],[1,.45,.28],.3);face([p.x-r,y,p.z-r],[p.x+r,y,p.z+r],[p.x-r,y,p.z+r],[1,.45,.28],.3);}}
 if(q.showTruth){let p=s.user;circle([p.x,p.y+.026,p.z],.28,[1,.4,.66],.95);if(s.sensors.uwb.fused){let f=s.sensors.uwb.fused;line([p.x,p.y+.04,p.z],[f.x,p.y+.04,f.z],[1,.4,.66],.95);}}
 return{lines,faces};
 }
 camera(dt){const s=this.sim,c=s.cart,V=SC.math.V;let desired=this.mode==='overview'?[0,.7,4]:this.mode==='detail'?[c.x,c.y+.48,c.z+.30]:[c.x+Math.sin(c.yaw)*.3,c.y+.6,c.z+Math.cos(c.yaw)*1.1];if(!this.target)this.target=desired;else this.target=this.target.map((v,i)=>SC.math.lerp(v,desired[i],Math.min(1,dt*5)));let a=this.azimuth;return{target:this.target,eye:V.add(this.target,[Math.sin(a)*this.distance*Math.cos(this.elevation),Math.sin(this.elevation)*this.distance,-Math.cos(a)*this.distance*Math.cos(this.elevation)]),shadowTarget:[c.x,c.y,c.z+1]};}
 render(dt=.016){const s=this.sim,c=s.cart,M=SC.math.M,draws=this.worldItems.map(item=>({item,matrix:M.identity()})),root=M.mul(s.sensors.matrix(c),M.translate(0,0,.379));for(let item of this.cart){let part=M.identity(),side=item.id.endsWith('L')?-1:1,steer=side<0?c.steerL:c.steerR;if(item.id.startsWith('rear'))part=M.pivot([side*.381,.131,-.379],M.rx(side<0?c.spinL:c.spinR));else if(item.id.startsWith('fork')||item.id.startsWith('front')){part=M.pivot([side*.258,.244,.364],M.ry(steer));if(item.id.startsWith('front'))part=M.mul(part,M.pivot([side*.258,.067,.389],M.rx(side<0?c.spinFL:c.spinFR)));}else if(item.id==='lidar')part=M.pivot([0,.864,.489],M.ry(s.time*20*Math.PI));draws.push({item,matrix:M.mul(root,part)});}
 for(let o of s.world.objects){if(o.type==='person')this.humanDraw(this.people[o.color],o,draws);else for(let item of this.objectItems.get(o.id))draws.push({item,matrix:M.translate(o.x,o.y,o.z)});}this.humanDraw(this.user,s.user,draws);this.renderer.render(draws,this.camera(dt),s.config,this.overlays());}
};

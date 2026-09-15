/* Ground-referenced articulation for the 1.2.0 renderer.
 * Pure geometry, shared by headless tests. Not a biomechanical or suspension solver. */
'use strict';
(()=>{
 const {M,V,clamp}=SC.math;
 SC.cartTerrainPose=function(cart,world){
  const K=SC.constants,co=Math.cos(cart.yaw),si=Math.sin(cart.yaw);
  const h=(x,z)=>world.height(cart.x+x*co+z*si,cart.z-x*si+z*co);
  const rl=h(-K.rearTrack/2,0),rr=h(K.rearTrack/2,0),fl=h(-K.frontTrack/2,K.wheelbase),fr=h(K.frontTrack/2,K.wheelbase);
  return{y:(rl+rr)/2,pitch:Math.atan2((fl+fr-rl-rr)/2,K.wheelbase),roll:Math.atan(((rr-rl)/K.rearTrack+(fr-fl)/K.frontTrack)/2)};
 };
 const bone=(start,end,lateral)=>{
  const y=V.norm(V.sub(start,end)),z=V.norm(V.cross(lateral,y)),x=V.cross(y,z);
  return [...x,0,...y,0,...z,0,...start,1];
 };
 // One cycle advances 2*pi / phasePerMeter metres. During stance the
 // foot recedes at exactly the body's speed; the swing travels forward.
 SC.gait=Object.freeze({
  phasePerMeter:7.5,
  sample(phase){
   const p=((phase%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
   const amplitude=Math.PI/(2*this.phasePerMeter),swing=p<Math.PI;
   const u=swing?p/Math.PI:(p-Math.PI)/Math.PI;
   const stride=swing?amplitude*(2*u*u*(3-2*u)-1):amplitude*(1-2*u);
   return{stride,lift:swing?Math.sin(Math.PI*u)*.095:0,swing};
  }
 });
 SC.humanPose=function(person,world){
  const co=Math.cos(person.yaw),si=Math.sin(person.yaw),lateral=[co,0,-si],forward=[si,0,co];
  const moving=clamp(Math.hypot(person.vx||0,person.vz||0)/.55,0,1),phase=person.phase||0;
  const thigh=.43,shin=.40,hipHeight=.91,ankleHeight=.10,feet={};
  let rootY=world.height(person.x,person.z);
  for(const side of [-1,1]){
   const suffix=side<0?'L':'R',p=phase+(side>0?Math.PI:0);
   const cycle=SC.gait.sample(p),walking=Math.hypot(person.vx||0,person.vz||0)>.03;
   const stride=walking?cycle.stride:0,lift=walking?cycle.lift*moving:0;
   const localX=side*.105,x=person.x+localX*co+stride*si,z=person.z-localX*si+stride*co;
   // Align a shoe with the local terrain, then support its WHOLE sole. At a
   // slope break / stair nosing the highest sample wins, rather than the ankle.
   const hl=world.height(x-.055*co,z+.055*si),hr=world.height(x+.055*co,z-.055*si);
   const hb=world.height(x-.065*si,z-.065*co),hf=world.height(x+.181*si,z+.181*co);
   const pitch=Math.atan2(hf-hb,.246),roll=Math.atan2(hr-hl,.11);
   const rotation=M.compose([0,0,0],[-clamp(pitch,-.30,.30),person.yaw,clamp(roll,-.25,.25)]);
   let ankleY=-Infinity;
   // Include interior points so a tread boundary cannot pierce a sole.
   for(const xx of [-.060,0,.060])for(let j=0;j<=8;j++){
    const zz=-.070+j*.253/8,q=M.point(rotation,[xx,-ankleHeight,zz],0);
    ankleY=Math.max(ankleY,world.height(x+q[0],z+q[2])-q[1]);
   }
   ankleY+=.006+lift;
   const ankle=[x,ankleY,z],hipX=person.x+side*.094*co,hipZ=person.z-side*.094*si;
   const horizontal=Math.hypot(ankle[0]-hipX,ankle[2]-hipZ);
   // Lower the pelvis just enough for both two-bone legs to reach. No foot
   // penetration is used to compensate for a too-high or too-rigid pelvis.
   const maxY=ankleY+Math.sqrt(Math.max(.01,(thigh+shin-.003)**2-horizontal**2))-hipHeight;
   rootY=Math.min(rootY,maxY);
   feet[suffix]={ankle,matrix:M.mul(M.translate(...ankle),rotation),hipX,hipZ,lift,pitch,roll,stride};
  }
  const parts={},joints={};
  for(const suffix of ['L','R']){
   const foot=feet[suffix],hip=[foot.hipX,rootY+hipHeight,foot.hipZ],delta=V.sub(foot.ankle,hip),d=Math.hypot(...delta),u=V.norm(delta);
   const along=clamp((thigh*thigh-shin*shin+d*d)/(2*d),0,thigh);
   const bend=V.norm(V.sub(forward,V.mul(u,V.dot(forward,u))));
   const knee=V.add(V.add(hip,V.mul(u,along)),V.mul(bend,Math.sqrt(Math.max(0,thigh*thigh-along*along))));
   parts['thigh'+suffix]=bone(hip,knee,lateral);parts['shin'+suffix]=bone(knee,foot.ankle,lateral);parts['foot'+suffix]=foot.matrix;
   joints[suffix]={hip,knee,ankle:foot.ankle,lift:foot.lift};
  }
  const root=M.compose([person.x,rootY,person.z],[0,person.yaw,0]);
  for(const side of [-1,1])parts['arm'+(side<0?'L':'R')]=M.mul(root,M.pivot([side*.198,1.39,0],M.rx(feet[side<0?'L':'R'].stride/(Math.PI/(2*SC.gait.phasePerMeter))*.29)));
  return{root,parts,joints,rootY};
 };
})();

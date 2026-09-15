/* Signed, force-based longitudinal dynamics. Parameters are uncalibrated
 * demonstration assumptions, NOT specifications of the MY1016Z or a brake kit.
 * +velocity / +force = vehicle forward, including when driving in reverse. */
'use strict';
SC.dynamics=Object.freeze({massKg:34,g:9.81,rollingCoefficient:.018,tyreMu:.55,
 rearInertia:.022,frontInertia:.003,dragCoefficient:.30,stallTorqueNm:24,
 speedKp:130,speedKi:70,integralLimitN:200,actuatorTimeConstant:.18,
 referenceAcceleration:.75,referenceDeceleration:1.20,serviceBrakeN:260,
 parkingBrakeN:300,brakeTimeConstant:.08});
SC.longitudinalStep=function(c,cmd,config,dt){
 const P=SC.dynamics,K=SC.constants,{clamp}=SC.math;
 const mass=P.massKg+config.cargo,meff=mass+2*P.rearInertia/K.rearRadius**2+2*P.frontInertia/K.frontRadius**2;
 const normal=mass*P.g*Math.cos(c.pitch)*Math.cos(c.roll||0),gravity=-mass*P.g*Math.sin(c.pitch);
 const v0=c.v,curvature=Math.tan(c.steer)/K.wheelbase,omega0=K.noLoadRPM*Math.PI/30;
 const wheelOmega=[v0*(1+curvature*K.rearTrack/2)/K.rearRadius,v0*(1-curvature*K.rearTrack/2)/K.rearRadius];
 const torqueLimit=w=>Math.min(P.stallTorqueNm*Math.max(0,1-Math.abs(w)/omega0),K.motorW/Math.max(.3,Math.abs(w)));
 const available=Math.min(2*Math.min(...wheelOmega.map(torqueLimit))/K.rearRadius,normal*P.tyreMu);
 const coast=cmd.coast===true,braking=!!cmd.brake;
 c.speedReference??=0;c.speedIntegralN??=0;c.motorForce??=0;c.brakeLevel??=0;
 if(braking||coast){c.speedReference=v0;c.speedIntegralN=0;c.motorForce=0;}
 else {
  const requested=clamp(cmd.speed,-.28,config.maxSpeed);
  const limit=Math.abs(requested)>Math.abs(c.speedReference)?P.referenceAcceleration:P.referenceDeceleration;
  c.speedReference+=clamp(requested-c.speedReference,-limit*dt,limit*dt);
  const error=c.speedReference-v0,raw=P.speedKp*error+c.speedIntegralN;
  // No exact grade feed-forward. The PI builds the required holding/tractive
  // load over time, so a slope transition cannot instantly cancel gravity.
  if(Math.abs(raw)<available||raw*error<0)c.speedIntegralN=clamp(c.speedIntegralN+P.speedKi*error*dt,-P.integralLimitN,P.integralLimitN);
  const target=clamp(P.speedKp*error+c.speedIntegralN,-available,available);
  c.motorForce=clamp(c.motorForce+(target-c.motorForce)*(1-Math.exp(-dt/P.actuatorTimeConstant)),-available,available);
 }
 c.brakeLevel+=(Number(braking)-c.brakeLevel)*(1-Math.exp(-dt/P.brakeTimeConstant));
 if(c.brakeLevel<1e-6)c.brakeLevel=0;
 const drag=-P.dragCoefficient*v0*Math.abs(v0),external=c.motorForce+gravity+drag;
 const rollingCap=normal*P.rollingCoefficient;
 let brakeCap=Math.min(P.serviceBrakeN,normal*P.tyreMu)*c.brakeLevel;
 if(braking&&Math.abs(v0)<.005)brakeCap=Math.min(P.parkingBrakeN,normal*P.tyreMu);
 const forcesAtRest=()=>{
  const rolling=-clamp(external,-rollingCap,rollingCap);
  const brake=-clamp(external+rolling,-brakeCap,brakeCap);
  return{rolling,brake,net:external+rolling+brake};
 };
 let rolling,brake,net,a,ds;
 if(Math.abs(v0)<1e-9){({rolling,brake,net}=forcesAtRest());a=net/meff;c.v=a*dt;ds=.5*a*dt*dt;}
 else {
  rolling=-Math.sign(v0)*rollingCap;brake=-Math.sign(v0)*brakeCap;net=external+rolling+brake;a=net/meff;
  c.v=v0+a*dt;ds=v0*dt+.5*a*dt*dt;
  if(v0*c.v<0){
   // Resolve the zero crossing. Friction / a commanded parking brake can
   // hold, but gravity may start motion in the OTHER direction when unbraked.
   const stop=clamp(-v0/a,0,dt),rest=dt-stop;
   ({rolling,brake,net}=forcesAtRest());const after=net/meff;
   c.v=after*rest;ds=.5*v0*stop+.5*after*rest*rest;
  }
 }
 if(Math.abs(c.v)<1e-9)c.v=0;
 c.a=(c.v-v0)/dt;c.brake=braking;c.coasting=coast;c.mass=mass;c.effectiveMass=meff;
 c.gravityForce=gravity;c.rollingForce=rolling;c.dragForce=drag;c.brakeForce=brake;
 c.netForce=net;c.forceLimit=available;c.parking=braking&&c.v===0;
 c.brakeW=Math.max(0,-brake*c.v)+Math.max(0,-c.motorForce*c.v);
 return{distance:ds,force:c.motorForce,mass};
};

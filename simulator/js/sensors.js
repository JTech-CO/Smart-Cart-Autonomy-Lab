'use strict';
SC.Sensors = class Sensors {
  constructor(config){this.config=config;this.rng=new SC.math.RNG(config.seed^0x83f71);this.tL=-1;this.tU=-1;this.tT=-1;this.fault={lidar:false,uwb:false,tof:false};this.lidar={seq:0,rays:[],range:config.lidarRange,quality:0,hits:0,nearest:null,stamp:-1};this.uwb={anchors:[],fused:null,stamp:-1,quality:0,mode:'lost'};this.tof={values:[],stamp:-1};this.mounts={lidar:[0,.864,.868],uwb:[[-.313,.858,.824],[.313,.858,.824]],tof:[[-.205,.312,.944],[.205,.312,.944]]};}
  matrix(cart){return SC.math.M.compose([cart.x,cart.y,cart.z],[-cart.pitch,cart.yaw,cart.roll||0]);}
  origin(cart,mount){return SC.math.M.point(this.matrix(cart),mount).slice(0,3);}
  direction(cart,a,e=0){return SC.math.V.norm(SC.math.M.point(this.matrix(cart),[Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e)],0).slice(0,3));}
  update(world,cart,user,time){let fresh=false;if(time-this.tL>=.1-1e-8){this.scanLidar(world,cart,user,time);this.tL=time;fresh=true;}if(time-this.tU>=.05-1e-8){this.scanUwb(world,cart,user,time);this.tU=time;}if(time-this.tT>=.05-1e-8){this.scanTof(world,cart,user,time);this.tT=time;}return fresh;}
  lightPenalty(){// Tunable stress model, not manufacturer outdoor performance data.
    if(this.config.light!=='sun')return {noise:1,drop:.003,range:1};const s=Math.sin(this.config.sunElevation*SC.math.DEG);return{noise:1.7,drop:.01+s*.035,range:.96};}
  scanLidar(world,cart,user,t){let light=this.lightPenalty(),range=this.config.lidarRange*light.range,N=this.config.quality==='low'?180:360,origin=this.origin(cart,this.mounts.lidar),rays=[],hits=0,valid=0,nearest=Infinity;
    for(let i=0;i<N;i++){let a=i/N*Math.PI*2,dir=this.direction(cart,a),good=!this.fault.lidar&&this.rng.next()>=light.drop*this.config.noise,q=good?world.ray(origin,dir,range,user):{hit:false,distance:range},d=q.hit?SC.math.clamp(q.distance+this.rng.normal()*(.009+.0018*q.distance)*this.config.noise*light.noise,.05,range):range;
      if(good)valid++;if(good&&q.hit){hits++;nearest=Math.min(nearest,d);}rays.push({angle:a,origin,direction:dir,distance:d,point:origin.map((v,k)=>v+dir[k]*d),hit:good&&q.hit,valid:good});}
    this.lidar={seq:this.lidar.seq+1,rays,origin,range,nominalRange:this.config.lidarRange,quality:valid/N,hits,nearest:isFinite(nearest)?nearest:null,stamp:t};
  }
  scanTof(world,cart,user,t){let lp=this.lightPenalty(),range=this.config.tofRange*(this.config.light==='sun'?.63:1),values=[];for(let i=0;i<2;i++){const origin=this.origin(cart,this.mounts.tof[i]);let best=null,rays=[];for(let j=0;j<9;j++){const a=(j/8-.5)*27*SC.math.DEG,dir=this.direction(cart,a),r=world.ray(origin,dir,range,user);rays.push({direction:dir,distance:r.distance,point:r.point,hit:r.hit});if(r.hit&&(!best||r.distance<best.distance))best={...r,direction:dir};}
      const valid=!this.fault.tof&&this.rng.next()>=lp.drop*1.2*this.config.noise;let d=valid&&best?SC.math.clamp(best.distance+this.rng.normal()*(.009+.003*best.distance)*this.config.noise*lp.noise,.03,range):null;
      // Returns are represented on the centreline: a single-zone sensor cannot report a hit bearing.
      const centre=this.direction(cart,0);values.push({origin,range,nominalRange:this.config.tofRange,distance:d,valid,status:!valid?'invalid':d===null?'no_return':'hit',direction:centre,point:d===null?null:origin.map((v,k)=>v+centre[k]*d),rays,fov:27});}
    this.tof={values,stamp:t};
  }
  scanUwb(world,cart,user,t){const anchors=[],tag=[user.x,user.y+1.08,user.z],lp=this.config.noise;
    for(let i=0;i<2;i++){const origin=this.origin(cart,this.mounts.uwb[i]),delta=SC.math.V.sub(tag,origin),r=Math.hypot(...delta),bearing=SC.math.wrap(Math.atan2(delta[0],delta[2])-cart.yaw),inFov=Math.abs(bearing)<=this.config.uwbFov*SC.math.DEG/2+1e-9;
      const occlusion=r>.01?world.ray(origin,SC.math.V.norm(delta),r-.05).hit:false;let quality=occlusion?.3:.96,valid=!this.fault.uwb&&r<=this.config.uwbRange&&this.rng.next()> (occlusion?.045:.003)*lp;
      let distance=valid?Math.max(.1,r+(occlusion?.12+.009*r:0)*lp+this.rng.normal()*(occlusion?.10:.018)*lp):null,angle=valid&&inFov?bearing+this.rng.normal()*(occlusion?5.5:.7)*SC.math.DEG*lp:null;
      anchors.push({origin,distance,bearing:angle,quality:valid?quality:0,valid,nlos:occlusion,inFov,range:this.config.uwbRange});
    }
    this.uwb.anchors=anchors;let samples=[];
    for(const a of anchors)if(a.valid&&a.bearing!==null){
      const ang=cart.yaw+a.bearing;let rr=a.distance,x,z;
      // Use the known terrain and an assumed 1.08 m worn-tag height, NOT the
      // user's true position/height, when projecting slant range onto the map.
      for(let j=0;j<4;j++){
        x=a.origin[0]+Math.sin(ang)*rr;z=a.origin[2]+Math.cos(ang)*rr;
        const dh=world.height(x,z)+1.08-a.origin[1];rr=Math.sqrt(Math.max(0,a.distance*a.distance-dh*dh));
      }
      samples.push({x:a.origin[0]+Math.sin(ang)*rr,z:a.origin[2]+Math.cos(ang)*rr,w:a.quality});
    }
    let mode='pdoa';
    if(!samples.length&&anchors.every(a=>a.valid)&&this.uwb.fused&&t-this.uwb.stamp<.75){
      // Range-only MAP update around the motion prediction. Intersecting two
      // noisy circles exactly fails near the anchor baseline and may switch
      // to a mirrored solution. A finite-variance prior avoids both failures;
      // it DOES NOT provide an initial rear-side bearing without history.
      const prev=this.uwb.fused,dt=Math.max(.05,t-this.uwb.stamp);
      const px=prev.x+prev.vx*dt,pz=prev.z+prev.vz*dt,prior=1/(.14+dt*.35)**2;
      let x=px,z=pz;
      for(let j=0;j<7;j++){
        let hxx=prior,hxz=0,hzz=prior,bx=prior*(px-x),bz=prior*(pz-z);
        for(const a of anchors){
          const dx=x-a.origin[0],dz=z-a.origin[2],dy=world.height(x,z)+1.08-a.origin[1],r=Math.max(.05,Math.hypot(dx,dy,dz));
          const gx=dx/r,gz=(dz+dy*world.slopeAt(x,z))/r;
          const sigma=a.nlos?.24:.022+.016*this.config.noise,residual=SC.math.clamp(a.distance-r,-.65,.65),w=1/(sigma*sigma);
          hxx+=w*gx*gx;hxz+=w*gx*gz;hzz+=w*gz*gz;bx+=w*gx*residual;bz+=w*gz*residual;
        }
        const det=hxx*hzz-hxz*hxz;if(det<1e-9)break;
        x+=SC.math.clamp((bx*hzz-bz*hxz)/det,-.24,.24);z+=SC.math.clamp((bz*hxx-bx*hxz)/det,-.24,.24);
      }
      const residual=Math.max(...anchors.map(a=>Math.abs(Math.hypot(x-a.origin[0],world.height(x,z)+1.08-a.origin[1],z-a.origin[2])-a.distance)));
      if(Number.isFinite(x)&&Number.isFinite(z)&&residual<.65){samples.push({x,z,w:Math.min(...anchors.map(a=>a.quality))*.62});mode='range_history';}
    }
    if(samples.length){let sum=samples.reduce((s,a)=>s+a.w,0),x=samples.reduce((s,a)=>s+a.x*a.w,0)/sum,z=samples.reduce((s,a)=>s+a.z*a.w,0)/sum,prev=this.uwb.fused,q=sum/samples.length;
      if(!prev||t-this.uwb.stamp>1){this.uwb.fused={x,z,vx:0,vz:0};this.uwb.stamp=t;}
      else {const dt=Math.max(.05,t-this.uwb.stamp),px=prev.x+prev.vx*dt,pz=prev.z+prev.vz*dt,res=Math.hypot(x-px,z-pz);if(res<Math.max(1.7,dt*2.2)){const alpha=mode==='range_history'?.68:(q>.5?.68:.27),beta=.065;prev.x=px+alpha*(x-px);prev.z=pz+alpha*(z-pz);prev.vx=SC.math.clamp(prev.vx+beta*(x-px)/dt,-1.8,1.8);prev.vz=SC.math.clamp(prev.vz+beta*(z-pz)/dt,-1.8,1.8);this.uwb.stamp=t;}}
      this.uwb.quality=q;this.uwb.mode=mode;
    }else{this.uwb.quality=0;this.uwb.mode='lost';}
    this.uwb.age=t-this.uwb.stamp;
  }
};

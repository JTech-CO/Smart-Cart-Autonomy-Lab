'use strict';
SC.World = class World {
  constructor(config){this.config=config;this.rng=new SC.math.RNG(config.seed);this.xMin=-9;this.xMax=9;this.zMin=-10;this.zMax=18;this.objects=[];this.revision=0;this.generate();}
  height(x,z){const c=this.config,t=Math.tan(c.slope*SC.math.DEG),r=SC.math.clamp(z-2,0,7);switch(c.terrain){case'uphill':return r*t;case'downhill':return-r*t;case'rolling':return t*Math.max(0,Math.min(z-1,5,11-z));case'stairs':return z<4?0:Math.min(6,Math.floor((z-4)/.32)+1)*.17;default:return 0;}}
  slopeAt(x,z){if(this.config.terrain==='stairs')return 0;return(this.height(x,z+.04)-this.height(x,z-.04))/.08;}
  /** Known traversability map, NOT an output of the two forward ToF sensors. */
  allowed(x,z,padding=0){if(x<this.xMin+padding||x>this.xMax-padding||z<this.zMin+padding||z>this.zMax-padding)return false;if(this.config.terrain==='stairs'&&z>4-padding)return false;if(this.config.slope>8&&['uphill','downhill','rolling'].includes(this.config.terrain)&&z> (this.config.terrain==='rolling'?1:2)-padding)return false;return true;}
  barrierZ(){if(this.config.terrain==='stairs')return 4;if(this.config.slope>8&&['uphill','downhill','rolling'].includes(this.config.terrain))return this.config.terrain==='rolling'?1:2;return Infinity;}
  generate(){this.objects.length=0;let n={none:0,few:9,many:27}[this.config.density]??9;const types=['pillar','person','box'].filter(t=>this.config[t==='person'?'people':t==='pillar'?'pillars':'boxes']);if(!types.length)return;
    for(let i=0;i<n;i++){let type=types[i%types.length],x,z,tries=0;do{x=this.rng.between(-7.4,7.4);z=this.rng.between(-.8,15.5);tries++;}while(tries<80&&(this.objects.some(o=>Math.hypot(x-o.x,z-o.z)<1.8)||(Math.abs(x)<1.05&&z<.4)));
      // A near-centre column gives the default interactive scene a useful avoidance test.
      if(i===0&&type==='pillar'){x=.15;z=2.1;}
      let o={id:'obstacle-'+i,type,x,z,y:0,vx:0,vz:0,yaw:this.rng.between(-Math.PI,Math.PI),phase:this.rng.between(0,6.28),color:i%4,mass:this.config.boxMass};
      if(type==='pillar'){o.r=.32+(i%3)*.06;o.h=2.45;o.w=o.d=o.r*2;}else if(type==='person'){o.r=.28;o.h=1.73;o.w=o.d=.56;o.goal={x:-x,z:this.rng.between(-1,15)};o.preferredSpeed=this.config.peopleSpeed*this.rng.between(.7,1.25);}else{o.w=this.rng.between(.43,.70);o.d=this.rng.between(.43,.65);o.h=i%2?.40:.72;o.r=Math.hypot(o.w,o.d)/2;}
      o.y=this.height(x,z);this.objects.push(o);
    }this.revision++;
  }
  localRectDistance(x,z,cart){let dx=x-cart.x,dz=z-cart.z,co=Math.cos(cart.yaw),si=Math.sin(cart.yaw),lx=dx*co-dz*si,lz=dx*si+dz*co-SC.constants.bodyOffset;return Math.hypot(Math.max(0,Math.abs(lx)-SC.constants.halfWidth),Math.max(0,Math.abs(lz)-SC.constants.halfLength));}
  userMove(user,dx,dz,dt){let nx=SC.math.clamp(user.x+dx*dt,this.xMin+.35,this.xMax-.35),nz=SC.math.clamp(user.z+dz*dt,this.zMin+.35,this.zMax-.35);
    for(let k=0;k<2;k++)for(const o of this.objects){if(o.type==='box'){let qx=SC.math.clamp(nx,o.x-o.w/2,o.x+o.w/2),qz=SC.math.clamp(nz,o.z-o.d/2,o.z+o.d/2),dd=Math.hypot(nx-qx,nz-qz);if(dd<.25){let ux=(nx-qx)/(dd||1),uz=(nz-qz)/(dd||1);if(dd<1e-5){ux=nx>=o.x?1:-1;uz=0;}nx+=ux*(.25-dd);nz+=uz*(.25-dd);}}
      else {let ax=nx-o.x,az=nz-o.z,dd=Math.hypot(ax,az),r=o.r+.25;if(dd<r){nx+=ax/(dd||1)*(r-dd);nz+=az/(dd||1)*(r-dd);}}
    }
    user.vx=(nx-user.x)/dt;user.vz=(nz-user.z)/dt;user.x=nx;user.z=nz;if(Math.hypot(user.vx,user.vz)>.03){user.yaw=Math.atan2(user.vx,user.vz);user.phase+=Math.hypot(user.vx,user.vz)*dt*SC.gait.phasePerMeter;}user.y=this.height(nx,nz);
  }
  step(dt,user,cart){for(const o of this.objects){if(o.type==='pillar')continue;
      if(o.type==='person'){let dx=o.goal.x-o.x,dz=o.goal.z-o.z,len=Math.hypot(dx,dz);if(len<.5){o.goal={x:this.rng.between(-7.8,7.8),z:this.rng.between(-1,16)};dx=o.goal.x-o.x;dz=o.goal.z-o.z;len=Math.hypot(dx,dz);}let vx=dx/(len||1)*o.preferredSpeed,vz=dz/(len||1)*o.preferredSpeed;
        for(const other of [...this.objects,user]){if(other===o)continue;let ax=o.x-other.x,az=o.z-other.z,d=Math.hypot(ax,az),r=(other.r||.28)+.28;if(d<r+1&&d>.001){let force=SC.math.clamp((r+.85-d)*1.3,0,1.8);vx+=ax/d*force;vz+=az/d*force;}}
        const cx=cart.x+Math.sin(cart.yaw)*.33,cz=cart.z+Math.cos(cart.yaw)*.33,dc=Math.hypot(o.x-cx,o.z-cz);if(dc<1.65){vx+=(o.x-cx)/(dc||1)*(1.65-dc)*1.5;vz+=(o.z-cz)/(dc||1)*(1.65-dc)*1.5;}
        let cap=o.preferredSpeed*1.25,s=Math.hypot(vx,vz);if(s>cap){vx*=cap/s;vz*=cap/s;}o.vx=SC.math.lerp(o.vx,vx,Math.min(1,dt*3));o.vz=SC.math.lerp(o.vz,vz,Math.min(1,dt*3));
      }else{let v=Math.hypot(o.vx,o.vz);if(v>.002){let drag=Math.max(0,1-2.2*dt/v);o.vx*=drag;o.vz*=drag;}else{o.vx=o.vz=0;}}
      let nx=SC.math.clamp(o.x+o.vx*dt,this.xMin+.6,this.xMax-.6),nz=SC.math.clamp(o.z+o.vz*dt,this.zMin+.6,this.zMax-.6);
      if(o.type==='box'&&Math.abs(this.height(nx,nz)-this.height(o.x,o.z))>.025){o.vx=o.vz=0;continue;}
      for(const p of this.objects){if(p===o||p.type==='person')continue;let rr=(o.type==='person'?.28:o.r)+p.r,dd=Math.hypot(nx-p.x,nz-p.z);if(dd<rr&&dd>.0001){nx+=(nx-p.x)/dd*(rr-dd);nz+=(nz-p.z)/dd*(rr-dd);if(o.type==='box'){o.vx*=.1;o.vz*=.1;}}}
      // Non-penetration for pedestrian contact. The controller still sees unlabelled range returns.
      if(o.type==='person'&&this.localRectDistance(nx,nz,cart)<o.r+.02){nx=o.x;nz=o.z;o.vx=o.vz=0;}
      if(o.type==='person'){
        o.vx=(nx-o.x)/dt;o.vz=(nz-o.z)/dt;
        const actualSpeed=Math.hypot(o.vx,o.vz);
        if(actualSpeed>.03){o.yaw=Math.atan2(o.vx,o.vz);o.phase+=actualSpeed*dt*SC.gait.phasePerMeter;}
      }
      o.x=nx;o.z=nz;o.y=this.height(nx,nz);
    }}
  /** Ray query is used only by the sensor and physics layers, never by the planner. */
  ray(origin,direction,maxRange,includeUser=null){let nearest=maxRange,hit=false;const ox=origin[0],oz=origin[2],dx=direction[0],dz=direction[2];
    for(const o of this.objects.concat(includeUser?[{...includeUser,type:'person',r:.25,h:1.72}]:[])){let t=Infinity;
      if(o.type==='box')t=SC.math.rayBox3(origin,direction,[o.x-o.w/2,o.y,o.z-o.d/2],[o.x+o.w/2,o.y+o.h,o.z+o.d/2]);
      else{let hor=Math.hypot(dx,dz);if(hor>1e-6){let q=SC.math.rayCircle(ox,oz,dx/hor,dz/hor,o.x,o.z,o.r);t=q/hor;let y=origin[1]+direction[1]*t;if(y<o.y||y>o.y+o.h)t=Infinity;}}
      if(t>=.01&&t<nearest){nearest=t;hit=true;}
    }
    // Low perimeter kerbs are real geometry. Most horizontal LiDAR rays pass above them.
    for(const b of [[[-9.16,-3,-10.16],[-9,0.18,18.16]],[[9,-3,-10.16],[9.16,.18,18.16]],[[-9.16,-3,-10.16],[9.16,.18,-10]],[[-9.16,-3,18],[9.16,.18,18.16]]]){const t=SC.math.rayBox3(origin,direction,b[0],b[1]);if(t>.01&&t<nearest){nearest=t;hit=true;}}
    // Heightfield ray marching also intersects risers, inclines and the road surface.
    for(let d=.07;d<nearest;d+=.10){let x=ox+dx*d,z=oz+dz*d;if(x<this.xMin-.2||x>this.xMax+.2||z<this.zMin-.2||z>this.zMax+.2)continue;const y=origin[1]+direction[1]*d;if(y<=this.height(x,z)){let a=Math.max(.01,d-.1),b=d;for(let j=0;j<7;j++){let m=(a+b)/2;if(origin[1]+direction[1]*m<=this.height(ox+dx*m,oz+dz*m))b=m;else a=m;}nearest=b;hit=true;break;}}
    return {distance:nearest,hit,point:origin.map((v,i)=>v+direction[i]*nearest)};
  }
};

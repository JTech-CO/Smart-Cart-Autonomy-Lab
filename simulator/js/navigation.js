'use strict';
(() => {
const {clamp,wrap,dist}=SC.math,C=SC.constants;
class Heap{constructor(){this.a=[];}push(id,score){let a=this.a,n=a.length;a.push({id,score});while(n){let p=(n-1)>>1;if(a[p].score<=score)break;a[n]=a[p];n=p;}a[n]={id,score};}pop(){let a=this.a,r=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(a[c].score>=v.score)break;a[i]=a[c];i=c;}a[i]=v;}return r;}get length(){return this.a.length;}}
SC.Navigation=class Navigation{
  constructor(config,world){this.config=config;this.res=.25;this.xMin=world.xMin;this.zMin=world.zMin;this.nx=Math.ceil((world.xMax-world.xMin)/this.res);this.nz=Math.ceil((world.zMax-world.zMin)/this.res);let n=this.nx*this.nz;this.expiry=new Float64Array(n);this.free=new Uint8Array(n);this.cost=new Float32Array(n);this.path=[];this.points=[];this.lastPlan=-1;this.expanded=0;this.goal=null;this.terrainLimited=false;this.gridVersion=0;this.status='ACQUIRE';this.tracks=[];this.previousClusters=[];this.trackTime=0;this.lastClearance=Infinity;this.planFailures=0;this.motionDirection=1;}
  index(x,z){let ix=Math.floor((x-this.xMin)/this.res),iz=Math.floor((z-this.zMin)/this.res);return ix>=0&&ix<this.nx&&iz>=0&&iz<this.nz?iz*this.nx+ix:-1;}
  point(i){return{x:this.xMin+(i%this.nx+.5)*this.res,z:this.zMin+(Math.floor(i/this.nx)+.5)*this.res};}
  centre(c){return{x:c.x+Math.sin(c.yaw)*C.bodyOffset,z:c.z+Math.cos(c.yaw)*C.bodyOffset};}
  observe(sensors,time,cart){const target=sensors.uwb.fused,pts=[];
    for(const ray of sensors.lidar.rays){if(!ray.valid)continue;let max=ray.distance-(ray.hit?.15:0);for(let d=.3;d<max;d+=this.res*.8){let x=ray.origin[0]+ray.direction[0]*d,z=ray.origin[2]+ray.direction[2]*d,i=this.index(x,z);if(i>=0){this.free[i]=1;this.expiry[i]=Math.min(this.expiry[i],time);}}
      if(ray.hit){let p={x:ray.point[0],z:ray.point[2]};if(target&&dist(p,target)<.52)continue; // Association by estimated location, not world object ID.
        pts.push(p);}
    }
    // Low obstacles missed by the elevated scan are added from the forward single-zone ToF cones.
    for(const tof of sensors.tof.values){if(!tof.valid||tof.distance===null)continue;let p={x:tof.point[0],z:tof.point[2]};if(target&&dist(p,target)<.65)continue;pts.push(p);const spread=Math.min(.30,tof.distance*Math.tan(13.5*SC.math.DEG));for(const sign of [-1,1])pts.push({x:p.x+Math.cos(cart.yaw)*spread*sign,z:p.z-Math.sin(cart.yaw)*spread*sign});}
    for(const p of pts){let i=this.index(p.x,p.z);if(i>=0)this.expiry[i]=time+1.3;}
    this.points=pts;this.track(pts,time);this.gridVersion++;
  }
  track(pts,time){ // Short-lived range clusters approximate dynamic-object motion, without semantic labels.
    const bins=new Map();for(const p of pts){let k=Math.floor(p.x/.65)+','+Math.floor(p.z/.65);let b=bins.get(k)||{x:0,z:0,n:0};b.x+=p.x;b.z+=p.z;b.n++;bins.set(k,b);}const now=[...bins.values()].filter(b=>b.n>=2).map(b=>({x:b.x/b.n,z:b.z/b.n}));let dt=Math.max(.08,time-this.trackTime);
    this.tracks=now.map(p=>{let best=null,bd=.55;for(const q of this.previousClusters){let d=dist(p,q);if(d<bd){bd=d;best=q;}}let vx=best?clamp((p.x-best.x)/dt,-1.2,1.2):0,vz=best?clamp((p.z-best.z)/dt,-1.2,1.2):0;if(Math.hypot(vx,vz)<.18)vx=vz=0;return{...p,vx,vz};});this.previousClusters=now;this.trackTime=time;
  }
  buildCost(world,time){this.cost.fill(1);const radius=.79,soft=1.1,R=Math.ceil(soft/this.res);for(let i=0;i<this.cost.length;i++){let p=this.point(i);if(!world.allowed(p.x,p.z,radius))this.cost[i]=255;else if(!this.free[i])this.cost[i]=1.16;}
    for(let i=0;i<this.expiry.length;i++)if(this.expiry[i]>time){let ix=i%this.nx,iz=Math.floor(i/this.nx);for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++){let x=ix+dx,z=iz+dz;if(x<0||z<0||x>=this.nx||z>=this.nz)continue;let d=Math.hypot(dx,dz)*this.res,j=z*this.nx+x;if(d<radius)this.cost[j]=255;else if(d<soft)this.cost[j]=Math.max(this.cost[j],1+(soft-d)*7);}}
  }
  clearLine(a,b){let d=dist(a,b),n=Math.ceil(d/(this.res*.55));for(let j=1;j<=n;j++){let t=j/n,i=this.index(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(i<0||this.cost[i]>=254)return false;}return true;}
  plan(world,cart,sensors,time){this.lastPlan=time;const target=sensors.uwb.fused;if(!target){this.path=[];return;}this.buildCost(world,time);let start=this.centre(cart),dx=target.x-start.x,dz=target.z-start.z,d=Math.hypot(dx,dz),standoff=this.config.followDistance+.48;
    let goal={x:target.x-dx/(d||1)*standoff,z:target.z-dz/(d||1)*standoff};this.terrainLimited=target.z>world.barrierZ()-.2;goal.x=clamp(goal.x,world.xMin+1.1,world.xMax-1.1);goal.z=clamp(goal.z,world.zMin+1.1,Math.min(world.zMax-1.1,world.barrierZ()-1.05));
    let si=this.index(start.x,start.z),gi=this.index(goal.x,goal.z);if(si<0||gi<0){this.path=[];return;}if(this.cost[gi]>=254){let best=-1,bd=Infinity;for(let i=0;i<this.cost.length;i++)if(this.cost[i]<254){let p=this.point(i),dd=dist(p,goal);if(dd<2.1&&dd<bd&&dist(p,target)>this.config.followDistance){bd=dd;best=i;}}if(best<0){this.path=[];this.planFailures++;return;}gi=best;goal=this.point(gi);}
    this.goal=goal;if(dist(start,goal)<.2){this.path=[goal];return;}
    // Start can touch its own conservative inflation. A small start-only carve does not erase observations.
    this.cost[si]=1;let g=new Float32Array(this.cost.length);g.fill(Infinity);let prev=new Int32Array(g.length);prev.fill(-1);let closed=new Uint8Array(g.length),open=new Heap();g[si]=0;open.push(si,0);let found=false;this.expanded=0;
    const nb=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    while(open.length&&this.expanded<12000){let current=open.pop().id;if(closed[current])continue;closed[current]=1;this.expanded++;if(current===gi){found=true;break;}let x=current%this.nx,z=Math.floor(current/this.nx);
      for(const [dx,dz]of nb){let xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=this.nx||zz>=this.nz)continue;let ni=zz*this.nx+xx;if(this.cost[ni]>=254||closed[ni])continue;if(dx&&dz&&(this.cost[z*this.nx+xx]>=254||this.cost[zz*this.nx+x]>=254))continue;let ng=g[current]+Math.hypot(dx,dz)*this.cost[ni];if(ng<g[ni]){g[ni]=ng;prev[ni]=current;let h=dist(this.point(ni),goal)/this.res;open.push(ni,ng+h);}}
    }
    if(!found){this.path=[];this.planFailures++;return;}let raw=[];for(let i=gi;i!==si&&i>=0;i=prev[i])raw.push(this.point(i));raw.push(start);raw.reverse();let smooth=[raw[0]],i=0;while(i<raw.length-1){let j=Math.min(raw.length-1,i+20);while(j>i+1&&!this.clearLine(raw[i],raw[j]))j--;smooth.push(raw[j]);i=j;}this.path=smooth;this.planFailures=0;
  }
  pointClearance(p,c){let dx=p.x-c.x,dz=p.z-c.z,lx=dx*Math.cos(c.yaw)-dz*Math.sin(c.yaw),lz=dx*Math.sin(c.yaw)+dz*Math.cos(c.yaw)-C.bodyOffset;return Math.hypot(Math.max(0,Math.abs(lx)-C.halfWidth),Math.max(0,Math.abs(lz)-C.halfLength));}
  rollout(cart,v,steer,target,sensors,world,reposition=false){
    let c={x:cart.x,z:cart.z,yaw:cart.yaw},min=Infinity;
    const u=sensors.uwb.fused,initialUser=u?this.pointClearance(u,cart):Infinity;
    const userLimit=Math.max(.29,Math.min(.44,initialUser-.01));
    for(let i=0;i<13;i++){
      const t=(i+1)*.12,w=v*Math.tan(steer)/C.wheelbase;
      c.x+=Math.sin(c.yaw+w*.06)*v*.12;c.z+=Math.cos(c.yaw+w*.06)*v*.12;c.yaw+=w*.12;
      // Both ends of the predicted body must stay in the known drivable map.
      if(world)for(const x of [-C.halfWidth,C.halfWidth])for(const z of [C.bodyOffset-C.halfLength,C.bodyOffset+C.halfLength]){
        if(!world.allowed(c.x+x*Math.cos(c.yaw)+z*Math.sin(c.yaw),c.z-x*Math.sin(c.yaw)+z*Math.cos(c.yaw),.03))return{safe:false,score:Infinity,clearance:0};
      }
      for(const p of this.points){let d=this.pointClearance(p,c);if(d<min)min=d;if(d<.16)return{safe:false,score:Infinity,clearance:d};}
      for(const tr of this.tracks)if(Math.hypot(tr.vx,tr.vz)>.22){
        const d=this.pointClearance({x:tr.x+tr.vx*Math.min(t,.6),z:tr.z+tr.vz*Math.min(t,.6)},c);
        if(d<.20)return{safe:false,score:Infinity,clearance:d};
      }
      if(u&&this.pointClearance({x:u.x+u.vx*Math.min(t,.45),z:u.z+u.vz*Math.min(t,.45)},c)<userLimit)return{safe:false,score:Infinity,clearance:0};
    }
    // A reversing vehicle's direction of travel is yaw + pi. Do not score a
    // valid reverse path as if its nose must point towards the rear waypoint.
    const heading=Math.abs(wrap(Math.atan2(target.x-cart.x,target.z-cart.z)-c.yaw-(v<0?Math.PI:0)));
    let score=dist(c,target)+heading*.30+Math.abs(steer-cart.steer)*.11+(.09/Math.max(.15,min))-Math.abs(v)*2.4;
    if(reposition&&u){
      const end=this.centre(c),bearing=Math.abs(wrap(Math.atan2(u.x-end.x,u.z-end.z)-c.yaw));
      const alignment=Math.min(bearing,Math.PI-bearing),gap=dist(end,u),desired=this.config.followDistance+.48;
      score=Math.abs(gap-desired)*1.45+alignment*1.05+dist(end,target)*.12+Math.abs(steer-cart.steer)*.035+.025/Math.max(.15,min);
      if(Math.sign(v)!==this.motionDirection)score+=.025;
    }
    return{safe:true,score,clearance:min};
  }
  command(world,cart,sensors,time){const target=sensors.uwb.fused,age=time-sensors.uwb.stamp;if(!target||age>.75){this.status=target?'TAG_LOST':'ACQUIRE';return {speed:0,steer:0,brake:true};}
    if(sensors.lidar.quality<.4||time-sensors.lidar.stamp>.35){this.status='SENSOR_HOLD';return{speed:0,steer:0,brake:true};}
    if(sensors.tof.values.length<2||sensors.tof.values.every(x=>!x.valid)){this.status='SENSOR_HOLD';return{speed:0,steer:0,brake:true};}
    const origin=sensors.origin(cart,[0,.858,.824]),tagDist=Math.hypot(target.x-origin[0],target.z-origin[2]),mid=this.centre(cart),edge=world.barrierZ()-mid.z;
    if(this.terrainLimited&&edge<1.20){this.status='TERRAIN_HOLD';return{speed:0,steer:cart.steer,brake:true};}
    const spacing=dist(mid,target),desiredSpacing=this.config.followDistance+.48;
    const tagAngle=wrap(Math.atan2(target.x-mid.x,target.z-mid.z)-cart.yaw);
    const aligned=Math.min(Math.abs(tagAngle),Math.PI-Math.abs(tagAngle))<.36;
    const closing=Math.max(0,((cart.v*Math.sin(cart.yaw)-target.vx)*(target.x-mid.x)+(cart.v*Math.cos(cart.yaw)-target.vz)*(target.z-mid.z))/Math.max(.1,spacing));
    const tooClose=spacing<desiredSpacing-.23;
    const reposition=tooClose||(!aligned&&spacing<desiredSpacing+.5);
    // Distance hold is a front/rear terminal state, not a blanket radial
    // exclusion disc that disables all tracking beside the vehicle.
    if(!tooClose&&aligned&&spacing<desiredSpacing+.10+closing*closing/3.0){this.status='HOLD_DISTANCE';return{speed:0,steer:cart.steer,brake:true};}
    if(time-this.lastPlan>.34||!this.path.length&&time-this.lastPlan>.15)this.plan(world,cart,sensors,time);
    if(!this.path.length){this.status=this.terrainLimited?'TERRAIN_HOLD':'NO_PATH';return{speed:0,steer:cart.steer,brake:true};}
    let look=this.path.at(-1),nearest=0,nd=Infinity;for(let i=0;i<this.path.length;i++){let d=dist(mid,this.path[i]);if(d<nd){nd=d;nearest=i;}}let lookLength=clamp(.75+Math.abs(cart.v)*.5,.75,1.4);
    for(let i=nearest;i<this.path.length-1;i++){let a=this.path[i],b=this.path[i+1],seg=dist(a,b),steps=Math.max(1,Math.ceil(seg/.12));for(let j=0;j<=steps;j++){let p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};if(dist(mid,p)>lookLength){look=p;i=this.path.length;break;}}}
    if(reposition)look=this.goal||look;
    // Grid waypoints describe the body centre. Bicycle steering is defined
    // at the rear axle; neglecting this offset put close reverse goals ahead
    // of the rear axle and caused repeated forward/reverse gear changes.
    if(reposition||Math.abs(tagAngle)>Math.PI/2)look={x:look.x-Math.sin(cart.yaw)*C.bodyOffset,z:look.z-Math.cos(cart.yaw)*C.bodyOffset};
    const tracking=clamp((target.vx*(target.x-mid.x)+target.vz*(target.z-mid.z))/Math.max(.2,dist(target,mid)),0,1.5);
    let angle=wrap(Math.atan2(look.x-cart.x,look.z-cart.z)-cart.yaw),ld=Math.max(.55,dist(cart,look)),k=2*Math.sin(angle)/ld,steer=clamp(Math.atan(C.wheelbase*k),-C.steerMax,C.steerMax),max=Math.min(this.config.maxSpeed,Math.max(.10,(tagDist-this.config.followDistance)*.8+tracking*.9));
    max*=clamp(1-Math.abs(steer)*.62,.38,1);if(age>.2||sensors.uwb.quality<.4)max=Math.min(max,.40);if(world.config.terrain!=='flat')max=Math.min(max,.85);if(isFinite(edge))max=Math.min(max,Math.max(0,(edge-1.05)*.8));
    const reverse=Math.abs(angle)>Math.PI/2+.08;
    const vs=reposition?[.24,-.24,.13,-.13]:reverse?[-.25,-.14]:[max,max*.65,Math.min(.20,max)];
    const choices=[steer,clamp(steer-.20,-C.steerMax,C.steerMax),clamp(steer+.20,-C.steerMax,C.steerMax),-C.steerMax,C.steerMax,0];
    // Geometric curvature = 2*sin(alpha)/L remains signed in BODY axes.
    // Negative velocity already reverses yaw rate; negating steer again was a bug.
    let best=null;
    for(const v of vs)for(const st of choices){
      const q=this.rollout(cart,v,st,look,sensors,world,reposition);
      if(q.safe&&(!best||q.score<best.score))best={...q,speed:v,steer:st};
    }
    if(!best){this.status='OBSTACLE_HOLD';this.lastClearance=0;return{speed:0,steer:cart.steer,brake:true};}
    // Signed front/rear swept-strip check. LiDAR remains a planar sensor:
    // low rear obstacles unseen by any sensor are not magically made observable.
    let clearance=Infinity;const direction=Math.sign(best.speed),rear=C.bodyOffset-C.halfLength;
    for(const p of this.points){
      const dx=p.x-cart.x,dz=p.z-cart.z,x=dx*Math.cos(cart.yaw)-dz*Math.sin(cart.yaw),z=dx*Math.sin(cart.yaw)+dz*Math.cos(cart.yaw);
      if(Math.abs(x)<C.halfWidth+.12){if(direction>0&&z>C.frontOffset)clearance=Math.min(clearance,z-C.frontOffset);if(direction<0&&z<rear)clearance=Math.min(clearance,rear-z);}
    }
    const downhill=Math.max(0,-Math.sin(cart.pitch)*Math.sign(cart.v||best.speed)*9.81);
    const stopA=Math.max(.35,1.65-downhill),stopDistance=.17+cart.v*cart.v/(2*stopA)+Math.abs(cart.v)*.18;
    if(clearance<stopDistance){this.status='BRAKE';return{speed:0,steer:best.steer,brake:true};}
    if(best.speed*cart.v<0&&Math.abs(cart.v)>.035){this.status='GEAR_CHANGE';return{speed:0,steer:best.steer,brake:true};}
    this.lastClearance=best.clearance;this.motionDirection=Math.sign(best.speed);
    this.status=reposition?'REPOSITION':best.speed<0?'REVERSE':(Math.abs(best.steer)>.14?'AVOID':'FOLLOW');
    return{speed:best.speed,steer:best.steer,brake:false};
  }
};
})();

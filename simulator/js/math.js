/* Smart Cart Autonomy Lab. SI units, fixed-step deterministic simulation. */
'use strict';
globalThis.SC = globalThis.SC || {};
SC.math = (() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,s)=>a.map(v=>v*s),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm:a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l);}};
  const M={
    identity:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    mul:(a,b)=>{const o=new Array(16).fill(0);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)o[j*4+i]+=a[k*4+i]*b[j*4+k];return o;},
    translate:(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1],
    scale:(x,y=x,z=x)=>[x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1],
    rx:a=>[1,0,0,0,0,Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1],
    ry:a=>[Math.cos(a),0,-Math.sin(a),0,0,1,0,0,Math.sin(a),0,Math.cos(a),0,0,0,0,1],
    rz:a=>[Math.cos(a),Math.sin(a),0,0,-Math.sin(a),Math.cos(a),0,0,0,0,1,0,0,0,0,1],
    point:(m,p,w=1)=>[0,1,2,3].map(i=>m[i]*p[0]+m[4+i]*p[1]+m[8+i]*p[2]+m[12+i]*w),
    perspective:(f,asp,n,fz)=>{let t=1/Math.tan(f/2);return[t/asp,0,0,0,0,t,0,0,0,0,(fz+n)/(n-fz),-1,0,0,2*fz*n/(n-fz),0];},
    ortho:(l,r,b,t,n,f)=>[2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1],
    look:(e,t,up=[0,1,0])=>{let z=V.norm(V.sub(e,t)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1];},
  };
  M.compose=(p,r=[0,0,0])=>M.mul(M.translate(...p),M.mul(M.ry(r[1]),M.mul(M.rx(r[0]),M.rz(r[2]))));
  M.pivot=(p,r)=>M.mul(M.translate(...p),M.mul(r,M.translate(...p.map(v=>-v))));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  class RNG {
    constructor(seed=4931){this.state=seed>>>0||1;}
    next(){let t=this.state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
    between(a,b){return a+(b-a)*this.next();}
    normal(){return Math.sqrt(-2*Math.log(Math.max(1e-10,this.next())))*Math.cos(2*Math.PI*this.next());}
  }
  const rayCircle=(ox,oz,dx,dz,cx,cz,r)=>{const x=ox-cx,z=oz-cz,b=x*dx+z*dz,cc=x*x+z*z-r*r,d=b*b-cc;if(d<0)return Infinity;const t=-b-Math.sqrt(d);return t>=0?t:(cc<0?0:Infinity);};
  const rayBox3=(o,d,min,max)=>{let lo=0,hi=Infinity;for(let i=0;i<3;i++){if(Math.abs(d[i])<1e-9){if(o[i]<min[i]||o[i]>max[i])return Infinity;continue;}let a=(min[i]-o[i])/d[i],b=(max[i]-o[i])/d[i];if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity;}return lo;};
  return {clamp,lerp,wrap,V,M,RNG,dist,rayCircle,rayBox3,DEG:Math.PI/180};
})();
SC.constants=Object.freeze({wheelbase:.768,rearTrack:.762,frontTrack:.516,rearRadius:.129,frontRadius:.066,halfWidth:.445,halfLength:.64,bodyOffset:.33,frontOffset:.944,motorW:250,noLoadRPM:120,steerMax:38*Math.PI/180,step:1/60});
SC.defaults=Object.freeze({terrain:'flat',slope:5,density:'few',pillars:true,people:true,boxes:true,light:'sun',sunElevation:38,sunAzimuth:135,followDistance:1.8,maxSpeed:1.15,userSpeed:1.05,cargo:15,seed:4931,lidarRange:12,uwbRange:18,uwbFov:180,tofRange:4,noise:1,peopleSpeed:.65,boxMass:6,showLidar:true,showUwb:true,showTof:true,showPath:true,showMap:false,showTruth:false,quality:'high'});

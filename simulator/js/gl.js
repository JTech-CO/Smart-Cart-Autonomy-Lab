/* Native WebGL 2 renderer. Geometry construction adapts Smart-Cart-4's CartGL
   idioms; dynamic matrices, scene renderer and shaders are authored for this lab.
   See SOURCE-NOTICE.md. No CDN, downloaded fonts or runtime network dependencies. */
'use strict';
SC.GL=(()=>{
const {V,M}=SC.math;let matId=1;
const material=(hex,metal=.1,rough=.5,alpha=1,emission=0)=>({id:matId++,color:Array.isArray(hex)?hex:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),metal,rough,alpha,emission,surface:0});
class Builder{
  constructor(){this.items=[];this.batches=new Map();}
  transform(p,r=[0,0,0]){return M.mul(M.translate(...p),M.mul(M.rz(r[2]||0),M.mul(M.ry(r[1]||0),M.rx(r[0]||0))));}
  add(data,mat,id='static',matrix=M.identity()){
    if(!data.length)return;let key=id+'|'+mat.id,item=this.batches.get(key);if(!item){item={id,mat,vertices:[]};this.batches.set(key,item);this.items.push(item);}
    for(let i=0;i<data.length;i+=18){let a=data.slice(i,i+3),b=data.slice(i+6,i+9),c=data.slice(i+12,i+15),n=[data[i+3]+data[i+9]+data[i+15],data[i+4]+data[i+10]+data[i+16],data[i+5]+data[i+11]+data[i+17]];
      let order=V.dot(V.cross(V.sub(b,a),V.sub(c,a)),n)<0?[0,2,1]:[0,1,2];for(let k of order){let j=i+k*6,p=M.point(matrix,data.slice(j,j+3)).slice(0,3),normal=V.norm(M.point(matrix,data.slice(j+3,j+6),0).slice(0,3));item.vertices.push(...p,...normal);}}
  }
  box(size,pos,mat,id='static',radius=0,rot=[0,0,0]){const arr=[];let r=Math.max(0,Math.min(radius,...size.map(v=>v/2-.000001)));
    for(let axis=0;axis<3;axis++)for(let sign of [-1,1]){let u=(axis+1)%3,v=(axis+2)%3,points=k=>r?[-size[k]/2,-size[k]/2+r,size[k]/2-r,size[k]/2]:[-size[k]/2,size[k]/2],us=points(u),vs=points(v);
      const vertex=(i,j)=>{let p=[0,0,0];p[axis]=sign*size[axis]/2;p[u]=us[i];p[v]=vs[j];let n=[0,0,0];n[axis]=sign;if(r){let q=p.map((x,k)=>Math.max(-size[k]/2+r,Math.min(size[k]/2-r,x)));n=V.norm(V.sub(p,q));p=V.add(q,V.mul(n,r));}return[...p,...n];};
      for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){let q=[vertex(i,j),vertex(i+1,j),vertex(i+1,j+1),vertex(i,j+1)];for(let k of [0,1,2,0,2,3])arr.push(...q[k]);}}
    this.add(arr,mat,id,this.transform(pos,rot));}
  cyl(r,h,pos,mat,id='static',rot=[0,0,0],N=24){let a=[];for(let i=0;i<N;i++){let t=i*2*Math.PI/N,u=(i+1)*2*Math.PI/N,c=Math.cos(t),s=Math.sin(t),d=Math.cos(u),f=Math.sin(u),q=[[r*c,-h/2,r*s,c,0,s],[r*d,-h/2,r*f,d,0,f],[r*d,h/2,r*f,d,0,f],[r*c,h/2,r*s,c,0,s]];for(let k of [0,1,2,0,2,3])a.push(...q[k]);a.push(0,h/2,0,0,1,0,r*c,h/2,r*s,0,1,0,r*d,h/2,r*f,0,1,0,0,-h/2,0,0,-1,0,r*d,-h/2,r*f,0,-1,0,r*c,-h/2,r*s,0,-1,0);}this.add(a,mat,id,this.transform(pos,rot));}
  rod(a,b,r,mat,id='static',N=12){const y=V.norm(V.sub(b,a)),x=V.norm(V.cross(Math.abs(y[1])<.9?[0,1,0]:[1,0,0],y)),z=V.cross(x,y),p=V.mul(V.add(a,b),.5),matrix=[...x,0,...y,0,...z,0,...p,1];let temp=new Builder();temp.cyl(r,Math.hypot(...V.sub(b,a)),[0,0,0],mat,id,[0,0,0],N);this.add(temp.items[0].vertices,mat,id,matrix);}
  tube(points,r,mat,id='static',N=10){for(let i=0;i<points.length-1;i++)this.rod(points[i],points[i+1],r,mat,id,N);for(let i=1;i<points.length-1;i++)this.sphere(r,points[i],mat,id,N,6);}
  ring(R,r,pos,mat,id='static',rot=[0,0,0],N=40,n=8){const a=[];for(let i=0;i<N;i++)for(let j=0;j<n;j++){let q=[];for(const [aa,bb]of[[i,j],[i+1,j],[i+1,j+1],[i,j+1]]){let u=aa/N*Math.PI*2,v=bb/n*Math.PI*2,nx=Math.cos(u)*Math.cos(v),ny=Math.sin(v),nz=Math.sin(u)*Math.cos(v);q.push([R*Math.cos(u)+r*nx,r*ny,R*Math.sin(u)+r*nz,nx,ny,nz]);}for(let k of[0,1,2,0,2,3])a.push(...q[k]);}this.add(a,mat,id,this.transform(pos,rot));}
  lathe(profile,pos,mat,id='static',rot=[0,0,0],N=48){const a=[];for(let i=0;i<N;i++)for(let j=0;j<profile.length-1;j++){let q=[];for(let[u,v]of[[i,j],[i+1,j],[i+1,j+1],[i,j+1]]){let t=u/N*Math.PI*2,r=profile[v][0],h=profile[v][1],p0=profile[Math.max(0,v-1)],p1=profile[Math.min(profile.length-1,v+1)],nn=V.norm([p1[1]-p0[1],p0[0]-p1[0]]);q.push([r*Math.cos(t),h,r*Math.sin(t),nn[0]*Math.cos(t),nn[1],nn[0]*Math.sin(t)]);}for(let k of[0,1,2,0,2,3])a.push(...q[k]);}this.add(a,mat,id,this.transform(pos,rot));}
  sphere(r,pos,mat,id='static',N=18,n=12,scale=[1,1,1]){let a=[];for(let i=0;i<N;i++)for(let j=0;j<n;j++){let q=[];for(let[u,v]of[[i,j],[i+1,j],[i+1,j+1],[i,j+1]]){u=u/N*Math.PI*2;v=v/n*Math.PI;let norm=[Math.sin(v)*Math.cos(u),Math.cos(v),Math.sin(v)*Math.sin(u)];q.push([...norm.map((x,k)=>x*r*scale[k]),...V.norm(norm.map((x,k)=>x/scale[k]))]);}for(let k of[0,1,2,0,2,3])a.push(...q[k]);}this.add(a,mat,id,M.translate(...pos));}
  quad(points,mat,id='static'){let n=V.norm(V.cross(V.sub(points[1],points[0]),V.sub(points[2],points[0]))),a=[];for(const k of[0,1,2,0,2,3])a.push(...points[k],...n);this.add(a,mat,id);}
  label(text,sub,size,pos,rot,id='static',bg='#233135',ink='#e1e9e5'){let tr=this.transform(pos,rot),w=size[0]/2,h=size[1]/2,mat=material('#ffffff',.0,.7);mat.label={text,sub,size,origin:pos,right:M.point(tr,[1,0,0],0).slice(0,3),up:M.point(tr,[0,1,0],0).slice(0,3),bg,ink};let q=[[-w,-h,0,0,0,1],[w,-h,0,0,0,1],[w,h,0,0,0,1],[-w,h,0,0,0,1]],a=[];for(let k of[0,1,2,0,2,3])a.push(...q[k]);this.add(a,mat,id,tr);}
}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 p;layout(location=1) in vec3 n;
uniform mat4 uVP,uModel,uLightVP;out vec3 vP,vN,vLocal;out vec4 vShadow;
void main(){vec4 w=uModel*vec4(p,1.0);vP=w.xyz;vN=normalize(mat3(uModel)*n);vLocal=p;vShadow=uLightVP*w;gl_Position=uVP*w;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vP,vN,vLocal;in vec4 vShadow;out vec4 outColor;
uniform vec3 uColor,uEye,uLightDir,uLightColor,uSky,uLabelOrigin,uLabelRight,uLabelUp;
uniform vec2 uLabelSize;uniform float uMetal,uRough,uAlpha,uEmission,uAmbient,uIntensity,uShadows,uExposure;
uniform int uSurface,uHasLabel;uniform sampler2D uShadowMap,uLabel;
const float PI=3.14159265359;
float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float shadow(vec3 N){if(uShadows<.5)return 1.;vec3 q=vShadow.xyz/vShadow.w*.5+.5;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 1.;float bias=max(.00025,.0012*(1.-dot(N,uLightDir))),s=0.;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float d=texture(uShadowMap,q.xy+vec2(float(x),float(y))/2048.).r;s+=q.z-bias>d?0.:1.;}return s/9.;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vP),L=normalize(uLightDir),H=normalize(V+L);vec3 base=pow(uColor,vec3(2.2));float rough=clamp(uRough,.06,1.);
 if(uHasLabel==1){vec3 d=vLocal-uLabelOrigin;vec2 uv=vec2(dot(d,uLabelRight)/uLabelSize.x+.5,dot(d,uLabelUp)/uLabelSize.y+.5);base=pow(texture(uLabel,uv).rgb,vec3(2.2));}
 if(uSurface==1){float a=hash(floor(vP*210.)),b=hash(floor(vP*22.));base*=.94+.09*a+.035*b;vec2 f=abs(fract(vP.xz/2.)-.5);float seam=smoothstep(.493,.499,max(f.x,f.y));base*=1.-seam*.19;rough=.93;}
 if(uSurface==2){float weave=sin(vLocal.y*500.)*sin(vLocal.z*440.);base*=.96+.04*weave;}
 if(uMetal>.5){rough=clamp(rough+(hash(floor(vLocal*380.))-.5)*.035,.07,1.);}
 float nv=max(dot(N,V),.001),nl=max(dot(N,L),0.),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.,D=a2/(PI*den*den+.0001),k=(rough+1.)*(rough+1.)/8.,G=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));vec3 F0=mix(vec3(.04),base,uMetal),F=F0+(1.-F0)*pow(1.-vh,5.),spec=D*G*F/(4.*nv*nl+.0001),diff=(1.-F)*(1.-uMetal)*base/PI;
 vec3 R=reflect(-V,N),env=mix(vec3(.17,.19,.18),vec3(.80,.86,.91),smoothstep(-.1,.8,R.y));float studio=pow(max(dot(R,normalize(vec3(-.4,.7,-.3))),0.),max(3.,100.*(1.-rough)));env+=studio*.8;
 vec3 ambient=base*(1.-uMetal)*mix(.48,1.,N.y*.5+.5)*uAmbient;vec3 reflection=env*F0*(.20+.5*(1.-rough))*uAmbient;
 vec3 col=ambient+reflection+(diff+spec)*uLightColor*nl*uIntensity*shadow(N)+base*uEmission;
 float fog=1.-exp(-length(vP-uEye)*.006);col=mix(col,uSky*.65,fog);outColor=vec4(pow(aces(col*uExposure),vec3(1./2.2)),uAlpha);}`;
const DVS=`#version 300 es
layout(location=0) in vec3 p;uniform mat4 uVP,uModel;void main(){gl_Position=uVP*uModel*vec4(p,1.);}`;
const DFS=`#version 300 es
precision highp float;void main(){}`;
const OVS=`#version 300 es
layout(location=0) in vec3 p;layout(location=1) in vec4 c;uniform mat4 uVP;out vec4 color;void main(){color=c;gl_Position=uVP*vec4(p,1.);}`;
const OFS=`#version 300 es
precision highp float;in vec4 color;out vec4 outColor;void main(){outColor=color;}`;
class Renderer{
  constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!gl)throw new Error('WebGL 2를 사용할 수 없습니다. 브라우저 하드웨어 가속을 켜고 다시 열어 주세요.');this.resources=new Set();this.textures=new Set();this.program=this.makeProgram(VS,FS);this.depthProgram=this.makeProgram(DVS,DFS);this.overlayProgram=this.makeProgram(OVS,OFS);this.uni=new Map();this.shadowSize=2048;
    this.shadowTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.shadowTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,this.shadowSize,this.shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.shadowFB=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,this.shadowFB);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,this.shadowTex,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('그림자 프레임버퍼를 만들 수 없습니다.');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    this.overlayVAO=gl.createVertexArray();this.overlayBuffer=gl.createBuffer();gl.bindVertexArray(this.overlayVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.overlayBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,12);gl.bindVertexArray(null);this.drawCalls=0;this.triangles=0;
  }
  makeProgram(v,f){const g=this.gl,compile=(type,src)=>{let s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));return s;},vs=compile(g.VERTEX_SHADER,v),fs=compile(g.FRAGMENT_SHADER,f),p=g.createProgram();g.attachShader(p,vs);g.attachShader(p,fs);g.linkProgram(p);g.deleteShader(vs);g.deleteShader(fs);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
  loc(p,n){if(!this.uni.has(p))this.uni.set(p,{});let u=this.uni.get(p);if(!(n in u))u[n]=this.gl.getUniformLocation(p,n);return u[n];}
  f(p,n,v){this.gl.uniform1f(this.loc(p,n),v);}i(p,n,v){this.gl.uniform1i(this.loc(p,n),v);}v(p,n,v){this.gl.uniform3fv(this.loc(p,n),v);}m(p,n,m){this.gl.uniformMatrix4fv(this.loc(p,n),false,m);}
  upload(item){if(item.gpu)return;let g=this.gl,vao=g.createVertexArray(),buf=g.createBuffer();g.bindVertexArray(vao);g.bindBuffer(g.ARRAY_BUFFER,buf);g.bufferData(g.ARRAY_BUFFER,new Float32Array(item.vertices),g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,24,0);g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,24,12);item.gpu={vao,buf,count:item.vertices.length/6};this.resources.add(item);}
  labelTexture(mat){if(mat.texture)return mat.texture;const l=mat.label,canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(96,Math.round(512*l.size[1]/l.size[0]));let c=canvas.getContext('2d');c.fillStyle=l.bg;c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle=l.ink;c.textAlign='center';c.textBaseline='middle';let size=Math.min(canvas.height*.42,480/(l.text.length*.63));c.font=`600 ${size}px Arial, sans-serif`;c.fillText(l.text,256,canvas.height*.38,480);c.font=`${Math.min(size*.42,canvas.height*.17)}px Arial, sans-serif`;c.fillText(l.sub||'',256,canvas.height*.77,480);let g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);mat.texture=t;this.textures.add(mat);return t;}
  resize(low=false){let r=this.canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,low?1:1.6),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}return w/h;}
  lighting(config,target){let a=config.sunAzimuth*SC.math.DEG,e=config.sunElevation*SC.math.DEG,dir=[Math.cos(a)*Math.cos(e),Math.sin(e),Math.sin(a)*Math.cos(e)];if(config.light==='artificial')return{dir:[.03,.999,.02],color:[1,.98,.93],sky:[.64,.69,.70],ambient:.88,intensity:1.4,shadow:0,exposure:1.2};if(config.light==='low')return{dir:[-.3,.83,.4],color:[.63,.73,1],sky:[.025,.036,.055],ambient:.06,intensity:.14,shadow:0,exposure:1.25};return{dir,color:config.sunElevation<23?[1,.71,.44]:[1,.96,.86],sky:[.65,.72,.75],ambient:.48,intensity:3.15,shadow:1,exposure:1.05};}
  render(draws,camera,config,overlays={lines:[],faces:[]}){let g=this.gl,asp=this.resize(config.quality==='low'),l=this.lighting(config,camera.target),view=M.look(camera.eye,camera.target),vp=M.mul(M.perspective(43*SC.math.DEG,asp,.04,140),view);this.vp=vp;this.camera=camera;
    let lightTarget=camera.shadowTarget||camera.target,le=V.add(lightTarget,V.mul(l.dir,32)),lightVP=M.mul(M.ortho(-14,14,-14,14,.2,70),M.look(le,lightTarget,Math.abs(l.dir[1])>.97?[0,0,1]:[0,1,0]));this.drawCalls=0;this.triangles=0;g.enable(g.DEPTH_TEST);g.depthMask(true);g.disable(g.BLEND);g.disable(g.CULL_FACE);
    for(let d of draws)this.upload(d.item);
    if(l.shadow){g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFB);g.viewport(0,0,this.shadowSize,this.shadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.useProgram(this.depthProgram);this.m(this.depthProgram,'uVP',lightVP);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(1.8,2.6);for(let d of draws){if(d.item.mat.alpha<.99||d.item.mat.label||d.noShadow)continue;this.m(this.depthProgram,'uModel',d.matrix);g.bindVertexArray(d.item.gpu.vao);g.drawArrays(g.TRIANGLES,0,d.item.gpu.count);}g.disable(g.POLYGON_OFFSET_FILL);}
    g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);g.clearColor(...l.sky,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);let p=this.program;g.useProgram(p);this.m(p,'uVP',vp);this.m(p,'uLightVP',lightVP);this.v(p,'uEye',camera.eye);this.v(p,'uLightDir',l.dir);this.v(p,'uLightColor',l.color);this.v(p,'uSky',l.sky);this.f(p,'uAmbient',l.ambient);this.f(p,'uIntensity',l.intensity);this.f(p,'uShadows',l.shadow);this.f(p,'uExposure',l.exposure);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.shadowTex);this.i(p,'uShadowMap',0);this.i(p,'uLabel',1);
    for(const d of draws){const mat=d.item.mat;if(mat.alpha<1){g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(false);}else{g.disable(g.BLEND);g.depthMask(true);}this.m(p,'uModel',d.matrix);this.v(p,'uColor',mat.color);this.f(p,'uMetal',mat.metal);this.f(p,'uRough',mat.rough);this.f(p,'uAlpha',mat.alpha);this.f(p,'uEmission',mat.emission);this.i(p,'uSurface',mat.surface||0);this.i(p,'uHasLabel',mat.label?1:0);
      if(mat.label){g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.labelTexture(mat));this.v(p,'uLabelOrigin',mat.label.origin);this.v(p,'uLabelRight',mat.label.right);this.v(p,'uLabelUp',mat.label.up);g.uniform2fv(this.loc(p,'uLabelSize'),mat.label.size);}
      g.bindVertexArray(d.item.gpu.vao);g.drawArrays(g.TRIANGLES,0,d.item.gpu.count);this.drawCalls++;this.triangles+=d.item.gpu.count/3;
    }
    g.depthMask(false);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.useProgram(this.overlayProgram);this.m(this.overlayProgram,'uVP',vp);g.bindVertexArray(this.overlayVAO);g.bindBuffer(g.ARRAY_BUFFER,this.overlayBuffer);
    if(overlays.faces.length){g.bufferData(g.ARRAY_BUFFER,new Float32Array(overlays.faces),g.DYNAMIC_DRAW);g.drawArrays(g.TRIANGLES,0,overlays.faces.length/7);}
    if(overlays.lines.length){g.bufferData(g.ARRAY_BUFFER,new Float32Array(overlays.lines),g.DYNAMIC_DRAW);g.drawArrays(g.LINES,0,overlays.lines.length/7);}
    g.depthMask(true);g.disable(g.BLEND);g.bindVertexArray(null);
  }
  project(p){const q=M.point(this.vp,p);if(q[3]<=0)return null;return{x:(q[0]/q[3]*.5+.5)*this.canvas.clientWidth,y:(-.5*q[1]/q[3]+.5)*this.canvas.clientHeight,visible:Math.abs(q[0]/q[3])<1&&Math.abs(q[1]/q[3])<1};}
  disposeGeometry(){let g=this.gl;for(let item of this.resources){g.deleteBuffer(item.gpu.buf);g.deleteVertexArray(item.gpu.vao);delete item.gpu;}this.resources.clear();for(let mat of this.textures){g.deleteTexture(mat.texture);delete mat.texture;}this.textures.clear();}
}
return {Builder,Renderer,material};
})();

/* Source-proportioned reconstruction: JTech-CO/Smart-Cart-4, cart-model.js.
   Metres, +Z forward. These are visual envelopes, not fabrication drawings.
   Steering and wheel meshes are separated for actual kinematic animation. */
'use strict';
SC.buildCart=()=>{
 const {Builder,material:mat}=SC.GL,B=new Builder(),P=Math.PI,XR=[0,0,P/2];
 const p={paint:mat('#343e42',.32,.36),edge:mat('#1b2428',.16,.4),steel:mat('#a8b4bd',.85,.27),chrome:mat('#d4dde3',.95,.18),rubber:mat('#151b20',.01,.86),tread:mat('#2a3035',.02,.78),orange:mat('#d76a34',.22,.35),magenta:mat('#b71354',.56,.26),pcb:mat('#246d56',.16,.5),gold:mat('#cab676',.84,.3),black:mat('#151b22',.06,.65),glass:mat('#153944',.46,.16),white:mat('#e3e8e5',.0,.6),blue:mat('#214e75',.24,.4),red:mat('#d94138',.16,.35),led:mat('#66dac2',.08,.3,1,.45)};
 const bolt=(q,id='body',r=.003,axis='y')=>{let rot=axis==='x'?XR:axis==='z'?[P/2,0,0]:[0,0,0];B.cyl(r,.003,q,p.chrome,id,rot,6);let a=q.slice();a['xyz'.indexOf(axis)]+=.002;B.cyl(r*.42,.0005,a,p.black,id,rot,6);};
 const plate=(s,q,id='body',m=p.paint)=>{B.box(s,q,m,id,.002);for(let a of[-1,1])for(let b of[-1,1])bolt([q[0]+a*(s[0]/2-.008),q[1]+s[1]/2+.001,q[2]+b*(s[2]/2-.008)],id,.0025);};
 for(let s of[-1,1]){plate([.038,.052,.982],[s*.321,.281,0]);B.box([.003,.007,.83],[s*.342,.281,0],p.orange,'body',.0006);for(let z=-.4;z<.42;z+=.1)bolt([s*.343,.293,z],'body',.003,'x');}
 for(let z of[-.475,.475])plate([.67,.052,.04],[0,.281,z]);for(let z of[-.33,-.04,.3])B.box([.612,.025,.032],[0,.246,z],p.steel,'body',.002);
 for(let s of[-1,1])for(let z of[-.444,.444]){plate([.062,.022,.07],[s*.313,.319,z]);B.box([.025,.493,.025],[s*.313,.557,z],p.paint,'body',.002);B.box([.031,.012,.031],[s*.313,.810,z],p.orange,'body',.003);}
 for(let s of[-1,1]){for(let y of[.545,.805])B.box([.026,.026,.914],[s*.313,y,0],p.paint,'body',.002);B.box([.02,.476,.02],[s*.313,.555,-.008],p.paint,'body',.002);B.rod([s*.313,.337,-.425],[s*.313,.785,-.16],.01,p.paint);}
 for(let y of[.545,.805])B.box([.642,.024,.024],[0,y,.445],p.paint,'body',.002);for(let x of[-.16,.16])B.box([.018,.46,.018],[x,.561,.445],p.paint,'body',.002);
 B.box([.17,.064,.006],[0,.68,.461],p.edge,'body',.003);B.label('SMART CART','SENSOR FUSION / D4',[.153,.048],[0,.68,.465],[0,0,0]);
 B.box([.602,.014,.901],[0,.307,0],p.steel,'body',.003);B.box([.562,.004,.849],[0,.317,0],p.rubber,'body',.004);for(let z=-.4;z<=.41;z+=.022)B.box([.55,.0014,.0016],[0,.320,z],p.tread);
 B.box([.734,.045,.044],[0,.282,.506],p.rubber,'body',.006);for(let s of[-1,1])B.box([.06,.01,.003],[s*.287,.288,.530],p.orange,'body',.001);
 for(let s of[-1,1]){plate([.058,.028,.06],[s*.247,.34,-.418]);B.cyl(.018,.054,[s*.247,.359,-.442],p.steel,'body',XR,20);B.tube([[s*.24,.36,-.439],[s*.24,.888,-.606],[s*.235,.958,-.627],[s*.21,.983,-.634]],.012,p.chrome,'body',14);}
 B.rod([-.21,.983,-.634],[.21,.983,-.634],.015,p.chrome,'body',24);B.rod([-.126,.983,-.634],[.126,.983,-.634],.022,p.rubber,'body',24);for(let x=-.12;x<.121;x+=.016)B.cyl(.0226,.002,[x,.983,-.634],p.tread,'body',XR,20);
 B.box([.068,.045,.059],[.18,.903,-.605],p.edge,'body',.005);B.cyl(.018,.012,[.18,.934,-.605],p.red,'body',[0,0,0],28);B.cyl(.008,.004,[-.19,.926,-.60],p.led,'body');
 // Rear wheels: true 0.129 m rolling radius, independent angular velocities.
 for(let s of[-1,1]){const side=s<0?'L':'R',id='rear'+side,x=s*.381,y=.131,z=-.379;
 B.lathe([[.075,-.041],[.095,-.041],[.114,-.037],[.123,-.028],[.129,-.014],[.129,.014],[.123,.028],[.114,.037],[.095,.041],[.075,.041]],[x,y,z],p.rubber,id,XR,64);
 for(let a of[-1,1]){B.cyl(.078,.008,[x+a*.04,y,z],p.steel,id,XR,40);B.ring(.07,.003,[x+a*.046,y,z],p.chrome,id,XR,40,8);B.cyl(.029,.024,[x+a*.05,y,z],p.edge,id,XR,24);B.cyl(.011,.028,[x+a*.053,y,z],p.orange,id,XR,6);for(let j=0;j<6;j++){let t=j*P/3;B.cyl(.012,.001,[x+a*.045,y+.052*Math.cos(t),z+.052*Math.sin(t)],p.black,id,XR,12);bolt([x+a*.046,y+.038*Math.cos(t),z+.038*Math.sin(t)],id,.0033,'x');}}
 for(let j=0;j<40;j++)for(let a of[-1,1]){let t=j/40*P*2;B.box([.030,.004,.011],[x+a*.018,y+.127*Math.cos(t),z+.127*Math.sin(t)],p.tread,id,.0005,[t,a*.27,0]);}
 plate([.10,.009,.085],[s*.34,.268,-.379]);B.box([.036,.142,.103],[s*.308,.172,-.379],p.steel,'body',.014);B.cyl(.025,.009,[s*.332,.131,-.379],p.steel,'body',XR,40);B.cyl(.0085,.044,[s*.348,.131,-.379],p.chrome,'body',XR,32);B.cyl(.045,.104,[s*.238,.180,-.379],p.steel,'body',XR,48);B.cyl(.043,.014,[s*.179,.180,-.379],p.edge,'body',XR,40);for(let xx of[.188,.285])B.cyl(.046,.003,[s*xx,.180,-.379],p.chrome,'body',XR,40);for(let yy of[.12,.23])for(let zz of[-.416,-.342])bolt([s*.331,yy,zz],'body',.004,'x');B.label('MY1016Z','24 V / 250 W',[.075,.023],[s*.234,.226,-.379],[-P/2,0,0],'body','#dae0de','#263038');
 }
 for(let s of[-1,1]){let side=s<0?'L':'R',x=s*.258,z=.364,id='fork'+side,fw='front'+side,sx=s*.319;
 plate([.1,.008,.11],[x,.257,z],'body',p.steel);B.cyl(.034,.018,[x,.244,z],p.steel,'body',[0,0,0],36);B.ring(.029,.0025,[x,.251,z],p.chrome);B.cyl(.023,.027,[x,.220,z],p.edge,id);B.cyl(.015,.05,[x,.210,z],p.chrome,id);B.cyl(.031,.008,[x,.196,z],p.steel,id);
 for(let a of[-1,1]){B.box([.009,.110,.036],[x+a*.033,.129,z+.02],p.steel,id,.003,[.19,0,0]);bolt([x+a*.042,.067,z+.025],id,.007,'x');}B.box([.075,.010,.040],[x,.190,z+.002],p.steel,id,.003);
 B.lathe([[.026,-.027],[.048,-.027],[.060,-.020],[.066,-.01],[.066,.01],[.060,.02],[.048,.027],[.026,.027]],[x,.067,z+.025],p.rubber,fw,XR,48);B.cyl(.028,.054,[x,.067,z+.025],p.steel,fw,XR,36);for(let a of[-1,1]){B.ring(.045,.0015,[x+a*.028,.067,z+.025],p.tread,fw,XR,36);for(let j=0;j<5;j++){let t=j*P*.4;B.cyl(.005,.003,[x+a*.029,.067+Math.cos(t)*.018,z+.025+Math.sin(t)*.018],p.edge,fw,XR,10);}}
 plate([.06,.006,.094],[sx,.25,.288],'body',p.steel);B.box([.030,.0481,.06539],[sx,.198,.288],p.magenta,'body',.0025);for(let yy of[.17895,.21605])B.box([.0306,.01,.0658],[sx,yy,.288],p.edge,'body',.002);for(let dx of[-.011,.011])for(let dz of[-.027,.027])bolt([sx+dx,.223,.288+dz]);B.label('RDS51150','STEERING',[.054,.018],[sx+s*.0154,.199,.288],[0,s*P/2,0],'body','#ba0a50','#ffe3ed');
 B.cyl(.009,.010,[sx,.235,.310],p.gold);B.rod([sx,.239,.310],[sx-s*.01,.239,.347],.0058,p.chrome);B.rod([x,.233,z],[x,.233,z-.039],.008,p.steel,id);B.rod([sx-s*.01,.239,.347],[x,.233,.325],.0032,p.chrome,'link'+side);for(let q of[[sx-s*.01,.239,.347],[x,.233,.325]])B.sphere(.006,q,p.steel,'link'+side,14,8);
 }
 B.box([.292,.124,.294],[0,.178,-.093],p.edge,'body',.006);plate([.303,.01,.304],[0,.246,-.093]);for(let x of[-.108,.108])B.box([.019,.13,.3],[x,.18,-.093],p.rubber,'body',.003);B.label('24 V CLASS','SIMULATION ENVELOPE',[.19,.06],[0,.18,.056],[0,0,0],'body','#c76531','#201e1b');
 // Under-deck compute tray with source-derived board envelopes and locking harnesses.
 B.box([.55,.006,.18],[0,.233,.20],p.steel,'body',.002);
 for(let [x,z,w,d,m]of[[-.16,.21,.089,.056,p.blue],[-.04,.22,.028,.052,p.black],[.11,.20,.05,.05,p.blue],[.21,.20,.05,.05,p.blue]]){B.box([w,.002,d],[x,.239,z],m,'body',.001);B.box([w*.45,.005,d*.35],[x,.244,z],p.chrome,'body',.001);for(let i=-2;i<=2;i++)B.box([.002,.007,d*.3],[x+i*.004,.25,z],p.steel);for(let a of[-1,1])B.box([.008,.012,d*.45],[x+a*w*.36,.246,z],p.pcb,'body',.001);}
 for(let s of[-1,1]){B.tube([[s*.18,.227,-.36],[s*.27,.226,-.25],[s*.27,.237,.15]],.0028,p.red,'body',8);B.tube([[s*.20,.23,-.36],[s*.28,.23,-.25],[s*.28,.241,.15]],.0028,p.black,'body',8);B.tube([[s*.27,.241,.22],[s*.29,.335,.40],[s*.292,.72,.423],[s*.292,.85,.438]],.0018,p.black,'body',8);}
 // C1 at the front upper rail, not an invented mast.
 plate([.074,.005,.074],[0,.828,.489],'body',p.steel);B.box([.0556,.026,.0556],[0,.843,.489],p.edge,'body',.006);B.cyl(.0246,.0153,[0,.86365,.489],p.glass,'lidar',[0,0,0],64);B.cyl(.0251,.003,[0,.8698,.489],p.edge,'lidar',[0,0,0],64);B.box([.014,.001,.003],[0,.872,.489],p.orange,'lidar');B.label('C1','SLAMTEC',[.035,.014],[0,.844,.5171],[0,0,0]);
 for(let s of[-1,1]){let x=s*.313,q=[x,.858,.445];B.box([.046,.052,.0016],q,p.black,'body',.001);B.box([.026,.021,.003],[x,.854,.447],p.chrome,'body',.0005);B.label('BU04',s<0?'ANCHOR L':'ANCHOR R',[.025,.016],[x,.854,.449],[0,0,0],'body','#b7c4c1','#293938');for(let a of[-1,1])B.box([.008,.011,.001],[x+a*.012,.877,.446],p.gold);B.box([.05,.003,.018],[x,.832,.445],p.edge,'body',.001);
 let tx=s*.205;B.box([.045,.005,.054],[tx,.294,.528],p.steel,'body',.002);B.box([.034,.026,.021],[tx,.309,.551],p.edge,'body',.003);B.box([.024,.017,.0015],[tx,.311,.5625],p.pcb);for(let dx of[-.0038,.0038]){B.cyl(.0028,.001,[tx+dx,.312,.5654],p.glass,'body',[P/2,0,0],24);B.ring(.0028,.0005,[tx+dx,.312,.5657],p.chrome,'body',[P/2,0,0],24,6);}B.label(s<0?'TOF L':'TOF R','FORWARD',[.026,.009],[tx,.325,.550],[-P/2,0,0]);}
 return B.items;
};
SC.buildPerson=(color='#637b83',tag=false)=>{
 const {Builder,material:mat}=SC.GL,B=new Builder(),jacket=mat(color,.0,.9),pants=mat('#333d48',0,.98),skin=mat('#bf9680',0,.85),shoe=mat('#20282c',0,.8),sole=mat('#aaaead',0,.88),hair=mat('#302f2c',0,1),zip=mat('#53616a',.4,.5);jacket.surface=pants.surface=2;
 B.sphere(1,[0,1.19,0],jacket,'torso',22,16,[.205,.325,.13]);B.sphere(1,[0,.90,0],pants,'torso',18,12,[.17,.135,.12]);B.rod([0,1.43,0],[0,1.51,0],.064,skin,'torso');B.sphere(1,[0,1.62,.005],skin,'head',24,18,[.102,.134,.098]);B.sphere(1,[0,1.69,-.013],hair,'head',22,14,[.103,.079,.094]);B.sphere(.018,[0,1.62,.10],skin,'head',10,8,[.7,1,1]);for(let s of[-1,1])B.sphere(.019,[s*.098,1.62,0],skin,'head',12,8,[.48,1,.68]);
 B.rod([0,1.05,.13],[0,1.41,.10],.003,zip,'torso',8);for(let s of[-1,1]){let side=s<0?'L':'R';B.rod([s*.198,1.39,0],[s*.265,1.12,.013],.068,jacket,'arm'+side,18);B.rod([s*.265,1.12,.013],[s*.267,.91,.038],.052,jacket,'arm'+side,16);B.sphere(1,[s*.267,.869,.046],skin,'arm'+side,16,10,[.042,.071,.039]);// Independent local bones and shoes; terrain-referenced two-bone IK in humanPose.
 B.rod([0,0,0],[0,-.43,0],.078,pants,'thigh'+side,18);
 B.sphere(.074,[0,-.42,0],pants,'thigh'+side,16,10);
 B.rod([0,0,0],[0,-.40,0],.062,pants,'shin'+side,18);
 B.box([.12,.034,.246],[0,-.083,.058],sole,'foot'+side,.016);
 B.sphere(1,[0,-.030,.062],shoe,'foot'+side,20,12,[.060,.053,.128]);}
 if(tag){B.box([.075,.075,.025],[.17,1.09,.10],mat('#d46b38',.25,.38),'torso',.009);B.box([.024,.02,.003],[.17,1.10,.115],mat('#79e3c7',.1,.3,1,.4),'torso',.002);B.rod([.17,1.44,.087],[.17,1.14,.113],.003,shoe,'torso',8);}return B.items;
};

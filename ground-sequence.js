/**
 * Original presentation scene: an imagined microgravity experiment, proposed
 * ground-test CAD assembly, then a camera departure through the atmosphere.
 * No real laboratory, free-fall facility, flight, or manufacturing capability is
 * asserted. The free-floating target is a visual premise, not Earth-lab physics.
 */
import { createServicer } from './orbital-hardware.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const clamp = (v, a=0, b=1) => Math.min(b,Math.max(a,v));
const smooth = (a,b,v) => {const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const TAU = Math.PI*2;

export async function createGroundSequence(THREE) {
  const group=new THREE.Group();group.name='Illustrative Earth laboratory and camera departure';
  const lab=new THREE.Group();group.add(lab);
  const mats={
    floor:new THREE.MeshStandardMaterial({color:0x111b27,metalness:.45,roughness:.46}),
    wall:new THREE.MeshStandardMaterial({color:0x15212e,metalness:.24,roughness:.65}),
    rail:new THREE.MeshStandardMaterial({color:0x7d909f,metalness:.88,roughness:.28}),
    white:new THREE.MeshStandardMaterial({color:0xc4d4dc,metalness:.32,roughness:.38}),
    dark:new THREE.MeshStandardMaterial({color:0x080f17,metalness:.55,roughness:.46}),
    screen:new THREE.MeshBasicMaterial({color:0x203d4a}),
    blue:new THREE.MeshBasicMaterial({color:0x7fc1de}),
    light:new THREE.MeshBasicMaterial({color:0xd8edff}),
    amber:new THREE.MeshBasicMaterial({color:0xd7b276}),
  };
  const cube=new THREE.BoxGeometry(1,1,1), cylinder=new THREE.CylinderGeometry(1,1,1,24);
  const box=(parent,size,at,material)=>{const m=new THREE.Mesh(cube,material);m.scale.set(...size);m.position.set(...at);parent.add(m);return m;};
  const cyl=(parent,r,h,at,material)=>{const m=new THREE.Mesh(cylinder,material);m.scale.set(r,h,r);m.position.set(...at);parent.add(m);return m;};
  const line=(parent,points,color=0x7699ad,opacity=.32)=>{const m=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(...v))),m);parent.add(l);return l;};

  // A single uncluttered dark cleanroom bay. Its front and roof remain open so
  // the camera can move through the scene without passing through solid walls.
  box(lab,[31,.32,22],[-18,-.2,0],mats.floor);
  box(lab,[31,9,.3],[-18,4.3,-10.8],mats.wall);
  box(lab,[.25,9,22],[-33.4,4.3,0],mats.wall);
  box(lab,[31,.14,.16],[-18,.1,10.8],mats.rail);
  for(let x=-32;x<=-4;x+=2)line(lab,[[x,-.025,-10.5],[x,-.025,10.5]],0x6b8795,.16);
  for(let z=-10;z<=10;z+=2)line(lab,[[-33,-.025,z],[-3,-.025,z]],0x6b8795,.16);
  for(const x of [-31,-24,-17,-10,-4]) {
    box(lab,[.08,8.6,.07],[x,4.3,-10.58],mats.rail);
    box(lab,[5.4,.035,.05],[x+2.5,7.6,-10.56],mats.light);
  }
  // Flush inspection windows and recessed technical cabinetry, rather than
  // floating dashboard graphics competing with the physical experiment.
  for(const x of [-28,-21,-14]) {
    box(lab,[5.8,3.7,.12],[x,4.4,-10.5],mats.dark);
    box(lab,[5.48,3.4,.025],[x,4.4,-10.42],mats.screen);
    box(lab,[.045,3.4,.045],[x,4.4,-10.38],mats.rail);
    box(lab,[5.48,.035,.045],[x,4.4,-10.38],mats.rail);
    for(let i=0;i<3;i++)box(lab,[.72,.022,.05],[x-1.8+i*.95,3.2,-10.36],i===0?mats.blue:mats.rail);
  }
  for(const x of [-30,-8]) {
    box(lab,[2.7,2.4,1.4],[x,1.2,-8.9],mats.dark);
    for(let j=0;j<4;j++){
      box(lab,[2.5,.48,.035],[x,.35+j*.56,-8.16],mats.wall);
      box(lab,[.45,.035,.07],[x,.38+j*.56,-8.1],mats.rail);
    }
  }
  // Thin overhead luminaires give a recognizable cleanroom silhouette without
  // an opaque ceiling, letting the upward departure remain a continuous move.
  const lights=new THREE.Group();lab.add(lights);
  for(const z of [-6,2,8]){
    box(lights,[27,.16,.14],[-18,8.6,z],mats.dark);
    for(const x of [-27,-18,-9]){
      box(lights,[5,.12,1.2],[x,8.45,z],mats.rail);
      box(lights,[4.75,.025,1.0],[x,8.37,z],mats.light);
    }
  }
  const lightMaterials=[];
  lights.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;lightMaterials.push(o.material);}});
  // Main optical table, milled rails and restrained surface details.
  const bench=new THREE.Group();lab.add(bench);
  box(bench,[10,.22,5.8],[-18,1.8,0],mats.rail);
  box(bench,[9.8,.08,5.6],[-18,1.95,0],mats.dark);
  for(const x of [-22.2,-13.8])for(const z of [-2.3,2.3]){
    box(bench,[.27,1.8,.27],[x,.9,z],mats.rail);
    cyl(bench,.26,.12,[x,.06,z],mats.dark);
  }
  box(bench,[9.1,.16,.16],[-18,.7,-2.3],mats.rail);
  box(bench,[9.1,.16,.16],[-18,.7,2.3],mats.rail);
  // Shallow optical-table perforations are a single compact point cloud.
  const holes=[];
  for(let x=-22;x<=-14;x+=.45)for(let z=-2.25;z<=2.25;z+=.45)holes.push(x,2.002,z);
  const holeGeometry=new THREE.BufferGeometry();holeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(holes,3));
  bench.add(new THREE.Points(holeGeometry,new THREE.PointsMaterial({color:0x5f7688,size:.035,sizeAttenuation:true,transparent:true,opacity:.75})));
  // Instrument console and tooling are deliberately kept behind the experiment.
  const consoleBase=box(lab,[1.2,.08,.8],[-12.5,2.1,-2.2],mats.dark);
  const consoleScreen=box(lab,[1.35,.8,.08],[-12.5,2.57,-2.48],mats.screen);consoleScreen.rotation.x=-.15;
  for(let i=0;i<5;i++)box(lab,[.2+.12*i,.018,.015],[-12.72,2.37+i*.09,-2.43],i===4?mats.blue:mats.rail);
  box(lab,[1.25,.14,.65],[-22.2,2.1,-1.8],mats.white);
  for(let i=0;i<3;i++)cyl(lab,.11,.11,[-22.55+i*.32,2.21,-1.8],mats.rail);

  // Use the supplied original arm geometry. The orbital carrier is omitted
  // here, leaving the proposed arm on the laboratory table.
  const armRig=await createServicer(THREE);
  armRig.group.children[0].visible=false;
  armRig.arm.parent.rotation.z=0;
  armRig.arm.parent.position.y=0;
  armRig.group.position.set(-20.4,2.06,0);
  lab.add(armRig.group);
  armRig.setArmPose(1);
  const componentNames=['ARM_L1_TURRET','ARM_L2_UPPER','ARM_L3_FOREARM','ARM_L4_FORK','ARM_L5_HEAD','ARM_L6_ROTOR'];
  const prototype=new THREE.Group();prototype.name='Supplied proposed ground-test target assembly';
  prototype.rotation.x=-Math.PI/2;prototype.scale.setScalar(.0038);prototype.position.copy(armRig.group.position);lab.add(prototype);
  const extraNames=['TARGET_STAND','TARGET_YOKE','TARGET_RING','TARGET_BOX','CAMERA_MAST','CONTROLLER'];
  const loader=new GLTFLoader(),cadRoot=new URL('./assets/viper/cad/',import.meta.url);
  const conversion=new THREE.Matrix4().set(1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1);
  const extraParts=[];
  await Promise.all(extraNames.map(async name=>{
    const gltf=await loader.loadAsync(new URL(name+'.glb',cadRoot).href);
    gltf.scene.updateMatrixWorld(true);
    const part=new THREE.Group();part.name=name;
    const orientation=new THREE.Group();orientation.matrixAutoUpdate=false;orientation.matrix.copy(conversion);part.add(orientation);
    const batches=new Map(),source=new Set();
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      const material=object.material;
      material.roughness=Math.min(material.roughness??.6,.7);
      if(material.transparent||material.opacity<.99)material.depthWrite=false;
      if(!batches.has(material.uuid))batches.set(material.uuid,{material,geometries:[]});
      batches.get(material.uuid).geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));source.add(object.geometry);
    });
    for(const {material,geometries} of batches.values()){
      const geometry=mergeGeometries(geometries,false);
      if(!geometry)throw new Error('Prototype geometry could not be batched');
      orientation.add(new THREE.Mesh(geometry,material));geometries.forEach(g=>g.dispose());
    }
    source.forEach(g=>g.dispose());prototype.add(part);extraParts.push({part,name});
  }));
  extraParts.sort((a,b)=>extraNames.indexOf(a.name)-extraNames.indexOf(b.name));

  // Deliberately unsupported: no rope, gimbal, stand or magnetic levitation
  // claim. The user-requested free floating body is an illustrative premise.
  const floating=new THREE.Group();floating.name='Illustrative unsupported microgravity target';lab.add(floating);
  const aluminium=new THREE.MeshStandardMaterial({color:0xd2dce1,metalness:.93,roughness:.24});
  const body=cyl(floating,.64,1.45,[0,0,0],aluminium);body.rotation.z=Math.PI/2;
  const ringGeometry=new THREE.TorusGeometry(.643,.024,8,64);
  for(const x of [-.64,.64]){const ring=new THREE.Mesh(ringGeometry,mats.dark);ring.rotation.y=Math.PI/2;ring.position.x=x;floating.add(ring);}
  for(const x of [-.73,.73]){const end=cyl(floating,.62,.035,[x,0,0],mats.rail);end.rotation.z=Math.PI/2;}
  box(floating,[1.35,.04,.18],[0,.636,0],mats.white);
  box(floating,[.34,.012,.18],[.15,.666,0],mats.amber);
  const floatingMaterials=new Set();floating.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;floatingMaterials.add(o.material);}});
  const fieldGroup=new THREE.Group();fieldGroup.name='Schematic rotating magnetic field';lab.add(fieldGroup);
  const fieldMaterials=[];
  for(let i=0;i<3;i++){
    const p=[],phase=i*TAU/3;
    // The pole axis is rotor-local Z, transverse to the motor shaft X.
    // These schematic pole-to-pole loops follow the rotating N/S markers.
    for(let j=0;j<=72;j++){const a=j/72*Math.PI,r=Math.sin(a)**2*1.1;p.push([r*Math.cos(phase),r*Math.sin(phase),.55*Math.cos(a)]);}
    const l=line(fieldGroup,p,0x83c3de,0);fieldMaterials.push(l.material);
  }
  // Compact current loops on the near aluminium surface, only in the experiment
  // close-up. These are explanatory graphics, not a field solution.
  const eddy=new THREE.Group();floating.add(eddy);const currentMaterials=[];
  for(let i=0;i<3;i++){
    const p=[];for(let j=0;j<=60;j++){const a=j/60*TAU;p.push([Math.cos(a)*(.14+i*.1),Math.sin(a)*(.14+i*.1),.65]);}
    const l=line(eddy,p,0x9ed5e6,0);currentMaterials.push(l.material);
  }

  // A gradual sky wash gives the camera ascent an atmospheric bridge. The
  // integrator reveals Earth beneath it; there is no rocket or self-launching
  // spacecraft in this sequence.
  const atmosphereMaterial=new THREE.ShaderMaterial({
    uniforms:{uOpacity:{value:0}},
    vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uOpacity; varying vec3 vPosition; void main(){float h=normalize(vPosition).y;vec3 color=mix(vec3(.18,.32,.45),vec3(.015,.035,.075),smoothstep(-.2,.8,h));gl_FragColor=vec4(color,uOpacity);}',
    side:THREE.BackSide,transparent:true,depthWrite:false,
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(280,40,24),atmosphereMaterial);sky.name='Illustrative atmosphere';sky.renderOrder=-10;group.add(sky);
  const cameraPath=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.5,8.5,19),
    new THREE.Vector3(-11.3,5.7,8.2),
    new THREE.Vector3(-26.4,7.8,11),
    new THREE.Vector3(-27,15.5,18),
    new THREE.Vector3(-4,42,35),
    new THREE.Vector3(18,80,45),
  ],false,'centripetal');
  const focusPath=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-17.1,3.8,0),
    new THREE.Vector3(-16.6,4.55,0),
    new THREE.Vector3(-18.0,3.8,0),
    new THREE.Vector3(-17.6,4.1,0),
    new THREE.Vector3(-17.8,2.4,0),
    new THREE.Vector3(-18,0,0),
  ],false,'centripetal');
  const labMaterials=new Set();
  lab.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){m.userData.originalOpacity=m.opacity;labMaterials.add(m);}});
  let currentT=0,assembly=0,labOpacity=1,floatingOpacity=1,targetAngle=0;
  const tip=new THREE.Vector3();
  const phase=t=>t<.16?'experiment':t<.35?'experiment-detail':t<.59?'prototype':t<.8?'departure':'ascent';
  const cameraPosition=new THREE.Vector3(),cameraFocus=new THREE.Vector3(),mobileOffset=new THREE.Vector3();
  function getCamera(t,mobile=false){
    const p=clamp(t);cameraPath.getPoint(p,cameraPosition);focusPath.getPoint(p,cameraFocus);
    if(mobile){
      // More breathing room around the full assembly in portrait, with the
      // subject high in frame so the compact lower-left caption stays clear.
      const portraitTransition=smooth(.54,.66,p);
      const portraitDistance=(1.3+.65*Math.sin(Math.PI*p/.6))*(1-portraitTransition)+1.08*portraitTransition;
      mobileOffset.copy(cameraPosition).sub(cameraFocus).multiplyScalar(portraitDistance);
      cameraPosition.copy(cameraFocus).add(mobileOffset);
      cameraFocus.x-=1.2*smooth(.05,.15,p)*(1-smooth(.52,.62,p));
      cameraFocus.y-=1.4*(1-portraitTransition);
    }
    return {position:cameraPosition,focus:cameraFocus};
  }
  function update(t,mobile=false){
    currentT=clamp(t);assembly=smooth(.36,.54,currentT);labOpacity=1-smooth(.72,.84,currentT);
    const explode=smooth(.29,.36,currentT)*(1-assembly);
    armRig.setArmPose(1);armRig.updateRotor(currentT*22);
    componentNames.forEach((name,i)=>{
      const part=armRig.components[name];part.matrix.elements[12]+=explode*(i+1)*36;
      part.matrix.elements[14]+=explode*(i+1)*105;part.matrixWorldNeedsUpdate=true;
    });
    prototype.visible=currentT>=.34;
    extraParts.forEach(({part,name},i)=>{
      const amount=(1-assembly);
      part.position.set(amount*(name==='CONTROLLER'?-180:120+i*25),amount*(i%2?200:-200),amount*(80+i*70));
    });
    floatingOpacity=1-smooth(.28,.355,currentT);floating.visible=floatingOpacity>.001;
    armRig.group.updateMatrixWorld(true);armRig.getMagnetWorldPosition(tip);
    floating.position.copy(tip).add(new THREE.Vector3(1.44,.04,0));
    // Apparent slowing is art-directed in scroll space, not a computed stopping
    // time or a physical torque result.
    targetAngle=currentT<=.12?currentT*15:.12*15+15*(1-Math.exp(-(currentT-.12)*12))/12;
    floating.rotation.set(.25+targetAngle*.55,targetAngle,.16+targetAngle*.36);
    fieldGroup.position.copy(tip);armRig.rotor.getWorldQuaternion(fieldGroup.quaternion);
    fieldGroup.visible=currentT>.12&&currentT<.3;
    const fieldOpacity=smooth(.12,.18,currentT)*(1-smooth(.25,.3,currentT))*.35;
    lab.visible=labOpacity>.001;
    for(const m of labMaterials){m.transparent=true;m.opacity=m.userData.originalOpacity*labOpacity;}
    for(const m of floatingMaterials)m.opacity=labOpacity*floatingOpacity;
    for(const m of fieldMaterials)m.opacity=fieldOpacity*labOpacity;
    for(const m of currentMaterials)m.opacity=fieldOpacity*labOpacity;
    const lightOpacity=1-smooth(.27,.42,currentT);
    for(const m of lightMaterials)m.opacity=labOpacity*lightOpacity;
    atmosphereMaterial.uniforms.uOpacity.value=smooth(.55,.76,currentT)*(1-smooth(.82,1,currentT))*.85;
    sky.visible=atmosphereMaterial.uniforms.uOpacity.value>.001;
    lights.visible=lightOpacity>.001;
    getCamera(currentT,mobile);
  }
  function getState(){
    return {stage:phase(currentT),progress:currentT,assembly,labOpacity,floatingOpacity,targetAngle,
      floatingTarget:floating.position.toArray(),floatingQuaternion:floating.quaternion.toArray(),
      prototypePartPoses:{
        ARM_L3_FOREARM:armRig.components.ARM_L3_FOREARM.matrix.elements.slice(12,15),
        TARGET_BOX:extraParts.find(item=>item.name==='TARGET_BOX').part.position.toArray(),
      },
      magnetTip:tip.toArray(),fieldQuaternion:fieldGroup.quaternion.toArray(),
      dipoleDirection:new THREE.Vector3(0,0,1).applyQuaternion(fieldGroup.quaternion).toArray(),
      shaftDirection:new THREE.Vector3(1,0,0).applyQuaternion(fieldGroup.quaternion).toArray(),
      noSupportOnFloatingTarget:true,rocketVisible:false,
      suppliedPrototypeParts:13,camera:cameraPosition.toArray(),focus:cameraFocus.toArray()};
  }
  update(0);
  return {group,update,getCamera,getState};
}

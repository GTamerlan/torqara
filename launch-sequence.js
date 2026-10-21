/**
 * Original generic launch presentation for Vyper Space. Shapes, staging,
 * trajectory and timing are artistic; no launch provider, flight design,
 * real mission, vehicle performance or physical elapsed time is represented.
 */
import { createServicer } from './orbital-hardware.js';

const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const TAU=Math.PI*2;

export async function createLaunchSequence(THREE){
  const group=new THREE.Group();group.name='Original illustrative launch sequence';
  const terrain=new THREE.Group();terrain.name='Generic launch site';group.add(terrain);
  const rocket=new THREE.Group();rocket.name='Unbranded concept launch vehicle';group.add(rocket);
  const materials={
    white:new THREE.MeshStandardMaterial({color:0xe2e7e8,metalness:.32,roughness:.35}),
    metal:new THREE.MeshStandardMaterial({color:0x71838e,metalness:.88,roughness:.28}),
    bright:new THREE.MeshStandardMaterial({color:0xb9c6ce,metalness:.85,roughness:.27}),
    dark:new THREE.MeshStandardMaterial({color:0x111923,metalness:.58,roughness:.43}),
    concrete:new THREE.MeshStandardMaterial({color:0x283640,metalness:.12,roughness:.84}),
    ground:new THREE.MeshStandardMaterial({color:0x0b171e,metalness:.05,roughness:.95}),
    amber:new THREE.MeshBasicMaterial({color:0xe6bd76}),
    strip:new THREE.MeshBasicMaterial({color:0x9eb8c7}),
  };
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const box=(parent,size,at,material)=>{const mesh=new THREE.Mesh(boxGeometry,material);mesh.position.set(...at);mesh.scale.set(...size);parent.add(mesh);return mesh;};
  const cylinder=(parent,top,bottom,height,at,material,segments=48)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,segments),material);mesh.position.set(...at);parent.add(mesh);return mesh;};
  const rod=(parent,a,b,r,material)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=cylinder(parent,r,r,delta.length(),start.clone().add(end).multiplyScalar(.5).toArray(),material,8);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;};
  const ring=(parent,r,tube,y,material)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,64),material);mesh.rotation.x=Math.PI/2;mesh.position.y=y;parent.add(mesh);return mesh;};

  // Restrained ground architecture keeps the rocket as the only foreground
  // subject. A low circular pad and a single service tower establish scale.
  cylinder(terrain,65,65,.3,[0,-.24,0],materials.ground,96);
  cylinder(terrain,17,17,.16,[0,-.04,0],materials.concrete,96);
  box(terrain,[5.6,.65,5.6],[0,.35,0],materials.dark);
  box(terrain,[5.8,.14,5.8],[0,.74,0],materials.metal);
  const padRing=ring(terrain,10.8,.025,.05,materials.strip);
  const innerRing=ring(terrain,5.6,.018,.06,materials.strip);
  for(const x of [-2,2])for(const z of [-2,2]){
    cylinder(terrain,.15,.2,2.1,[x,1.8,z],materials.metal,12);
    box(terrain,[.55,.25,.6],[x,2.85,z],materials.dark);
    rod(terrain,[x,.8,z],[x*.45,2.6,z*.45],.085,materials.bright);
  }
  // Trench opening, quiet approach markings and a few low perimeter lights.
  box(terrain,[1.7,.04,16],[0,.1,8.5],materials.dark);
  for(const x of [-3.7,3.7])box(terrain,[.045,.025,22],[x,.06,8.8],materials.strip);
  for(let i=0;i<10;i++){
    const a=i/10*TAU;const x=Math.cos(a)*15,z=Math.sin(a)*15;
    cylinder(terrain,.06,.1,.55,[x,.3,z],materials.dark,8);
    box(terrain,[.16,.06,.16],[x,.59,z],materials.amber);
  }

  const tower=new THREE.Group();tower.position.set(-4.5,0,-2);terrain.add(tower);
  for(const x of [-.7,.7])for(const z of [-.7,.7])box(tower,[.15,17.3,.15],[x,8.65,z],materials.metal);
  for(let j=0;j<7;j++){
    const y=j*2.45+.2;
    for(const z of [-.7,.7]){
      rod(tower,[-.7,y,z],[.7,y+2.2,z],.055,materials.bright);
      rod(tower,[.7,y,z],[-.7,y+2.2,z],.055,materials.bright);
    }
    for(const x of [-.7,.7])rod(tower,[x,y,-.7],[x,y+2.2,.7],.055,materials.metal);
    box(tower,[2.1,.12,2],[0,y,-.04],materials.dark);
    box(tower,[1.8,.025,.045],[0,y+.78,.94],materials.strip);
    for(const x of [-.85,.85])box(tower,[.035,.8,.035],[x,y+.4,.94],materials.rail||materials.metal);
  }
  box(tower,[1.2,.12,1.2],[0,17.45,0],materials.white);
  rod(tower,[0,17.5,0],[0,20,0],.035,materials.bright);
  const umbilicals=[];
  for(const y of [7.2,12.8]){
    const pivot=new THREE.Group();pivot.position.set(-3.8,y,-1.3);terrain.add(pivot);
    box(pivot,[3.2,.18,.35],[1.6,0,0],materials.metal);
    box(pivot,[.45,.5,.6],[3.1,0,0],materials.dark);
    rod(pivot,[0,.35,0],[3,-.05,0],.055,materials.bright);
    umbilicals.push(pivot);
  }

  // Original generic proportions. The unbranded white shell and dark
  // interstage are intentionally not a replica of a named launch system.
  const booster=new THREE.Group();rocket.add(booster);
  cylinder(booster,.94,.94,7.8,[0,5.02,0],materials.white,64);
  cylinder(booster,.95,.95,.62,[0,1.24,0],materials.dark,64);
  cylinder(booster,.96,.96,.62,[0,8.82,0],materials.dark,64);
  for(const y of [2.1,4.6,6.5,8.45])ring(booster,.945,.014,y,materials.bright);
  for(const a of [0,Math.PI]){
    const conduit=box(booster,[.08,6.5,.08],[Math.cos(a)*.96,5.2,Math.sin(a)*.96],materials.metal);
  }
  const finShape=new THREE.Shape();finShape.moveTo(0,0);finShape.lineTo(.75,-.65);finShape.lineTo(.75,.25);finShape.lineTo(0,1.4);finShape.closePath();
  const finGeometry=new THREE.ExtrudeGeometry(finShape,{depth:.045,bevelEnabled:false});
  for(let i=0;i<4;i++){
    const fin=new THREE.Mesh(finGeometry,materials.white);const holder=new THREE.Group();holder.rotation.y=i*Math.PI/2;holder.position.y=1.6;holder.add(fin);fin.position.x=.92;booster.add(holder);
  }
  const bell=cylinder(booster,.34,.59,.65,[0,.83,0],materials.dark,48);
  ring(booster,.59,.035,.505,materials.metal);
  const upper=new THREE.Group();rocket.add(upper);
  cylinder(upper,.94,.94,2.2,[0,10.2,0],materials.white,64);
  cylinder(upper,.945,.945,.16,[0,9.2,0],materials.bright,64);
  cylinder(upper,.32,.49,.5,[0,8.88,0],materials.dark,32);
  ring(upper,.94,.02,11.2,materials.bright);
  // A small set of vents and access panels rewards the closer camera pass.
  for(const x of [-.18,.18])for(let j=0;j<3;j++)box(upper,[.1,.035,.012],[x,10.5+j*.11,.943],materials.dark);
  box(upper,[.42,.7,.018],[0,9.9,.945],materials.bright);
  box(upper,[.36,.64,.02],[0,9.9,.96],materials.white);

  // Two curved fairing halves open smoothly to reveal the proposed robotic
  // payload; their separation is presentation choreography, not flight data.
  const profile=[new THREE.Vector2(1.18,0),new THREE.Vector2(1.23,.18),new THREE.Vector2(1.23,1.9),new THREE.Vector2(1.18,2.45),new THREE.Vector2(.94,3.05),new THREE.Vector2(.55,3.56),new THREE.Vector2(.05,3.9),new THREE.Vector2(0,3.92)];
  const fairingMaterial=materials.white.clone();fairingMaterial.side=THREE.DoubleSide;
  const fairings=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.position.y=11.3;upper.add(pivot);
    const geometry=new THREE.LatheGeometry(profile,48,side===1?0:Math.PI,Math.PI);
    pivot.add(new THREE.Mesh(geometry,fairingMaterial));fairings.push({pivot,side});
  }
  ring(upper,1.2,.025,11.32,materials.metal);
  const payload=await createServicer(THREE);payload.group.scale.setScalar(.36);payload.setArmPose(0);payload.updateRotor(0);
  payload.group.position.set(0,12,0);upper.add(payload.group);

  const flameMaterial=(tipColor,hotColor)=>new THREE.ShaderMaterial({
    uniforms:{uOpacity:{value:0},uPhase:{value:0},uTip:{value:new THREE.Color(tipColor)},uHot:{value:new THREE.Color(hotColor)}},
    vertexShader:'varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',
    fragmentShader:`uniform float uOpacity;uniform float uPhase;uniform vec3 uTip;uniform vec3 uHot;varying vec2 vUv;varying vec3 vNormal;varying vec3 vView;
      void main(){float facing=pow(abs(dot(normalize(vNormal),normalize(vView))),1.8);
      float endFade=smoothstep(0.,.3,vUv.y)*pow(vUv.y,.38);float ribbons=.8+.2*sin(vUv.y*29.+uPhase+sin(vUv.x*25.)*.5);
      vec3 color=mix(uTip,uHot,smoothstep(.3,.97,vUv.y));float alpha=uOpacity*facing*endFade*ribbons;
      gl_FragColor=vec4(color,alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  });
  const plumeMaterial=flameMaterial(0xff873c,0xb9dfff);
  const coreMaterial=flameMaterial(0x76bdff,0xfff4d9);
  const plume=new THREE.Mesh(new THREE.CylinderGeometry(.19,1.28,1,48,1,true),plumeMaterial);booster.add(plume);
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.12,.42,1,32,1,true),coreMaterial);booster.add(core);
  const upperPlumeMaterial=coreMaterial.clone();
  const upperPlume=new THREE.Mesh(new THREE.CylinderGeometry(.11,.45,1,32,1,true),upperPlumeMaterial);upper.add(upperPlume);
  const engineGlow=new THREE.PointLight(0xffb66a,0,17,1.7);engineGlow.position.set(0,.8,0);rocket.add(engineGlow);

  const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=128;
  const c=smokeCanvas.getContext('2d'),gradient=c.createRadialGradient(64,64,2,64,64,64);
  gradient.addColorStop(0,'rgba(225,236,242,.7)');gradient.addColorStop(.32,'rgba(181,199,213,.45)');gradient.addColorStop(1,'rgba(130,155,179,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);
  const smokeTexture=new THREE.CanvasTexture(smokeCanvas);smokeTexture.colorSpace=THREE.SRGBColorSpace;
  const smokeGroup=new THREE.Group();group.add(smokeGroup);const smoke=[];
  for(let i=0;i<24;i++){
    const material=new THREE.SpriteMaterial({map:smokeTexture,transparent:true,opacity:0,depthWrite:false,color:0xb2c8da});
    const sprite=new THREE.Sprite(material);smokeGroup.add(sprite);smoke.push({sprite,phase:i/24*TAU,seed:((i*17)%23)/23});
  }
  const skyMaterial=new THREE.ShaderMaterial({
    uniforms:{uOpacity:{value:1}},
    vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float uOpacity;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;vec3 col=mix(vec3(.12,.23,.33),vec3(.005,.015,.035),smoothstep(-.25,.8,h));gl_FragColor=vec4(col,uOpacity);}',
    transparent:true,depthWrite:false,side:THREE.BackSide,
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(280,40,24),skyMaterial);sky.renderOrder=-10;group.add(sky);
  const allMaterials=new Map();group.traverse(o=>{for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m&&!allMaterials.has(m)){allMaterials.set(m,m.opacity);m.transparent=true;}});
  const terrainMaterials=new Set();terrain.traverse(o=>{for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m)terrainMaterials.add(m);});
  // Ground and rocket use a few shared material objects; isolate the terrain
  // copies so fading the pad never fades the rocket body.
  terrain.traverse(o=>{if(!o.material)return;const original=o.material;if(Array.isArray(original))return;o.material=original.clone();allMaterials.set(o.material,original.opacity);});
  terrainMaterials.clear();terrain.traverse(o=>{if(o.material)terrainMaterials.add(o.material);});
  let progress=0,opacity=1,lift=0,retraction=0,fairingSeparation=0,plumeOpacity=0,payloadRelease=0,currentMobile=false;
  const position=new THREE.Vector3(),focus=new THREE.Vector3(),endPosition=new THREE.Vector3(32,80,58),endFocus=new THREE.Vector3(0,75,0);
  const phase=t=>t<.24?'launch-pad':t<.35?'ignition':t<.68?'liftoff':t<.85?'ascent':'deployment';
  function getCamera(t,mobile=false){
    const p=clamp(t),rise=smooth(.32,.82,p)*65;
    const angle=.52+p*1.3;
    const radius=36-2*Math.sin(Math.PI*p);
    const detail=smooth(.7,.86,p);
    position.set(Math.sin(angle)*radius,rise+11+Math.sin(p*Math.PI)*1.4,Math.cos(angle)*radius);
    focus.set(-3.8*(1-detail),rise+9+detail*3.2,0);
    const pullback=smooth(.88,1,p);position.lerp(endPosition,pullback);focus.lerp(endFocus,pullback);
    if(mobile){
      const v=position.clone().sub(focus).multiplyScalar(1.3-0.12*pullback);
      position.copy(focus).add(v);focus.y-=1.6*(1-pullback);focus.x+=3.8*(1-detail);
    }
    return {position,focus};
  }
  function update(t,mobile=false){
    currentMobile=mobile;progress=clamp(t);lift=smooth(.32,.82,progress)*65;rocket.position.y=lift+1.4;
    retraction=smooth(.12,.3,progress);umbilicals.forEach((pivot,i)=>{pivot.rotation.y=-(1.05+i*.12)*retraction;});
    const stageSeparation=smooth(.7,.88,progress);
    booster.position.y=-stageSeparation*14;booster.rotation.z=-stageSeparation*.15;
    booster.visible=progress<.96;
    fairingSeparation=smooth(.73,.9,progress);
    fairings.forEach(({pivot,side})=>{pivot.position.set(side*fairingSeparation*2.3,11.3+fairingSeparation*.7,side*fairingSeparation*3.8);pivot.rotation.z=-side*fairingSeparation*.28;pivot.rotation.x=side*fairingSeparation*.24;});
    payloadRelease=smooth(.86,1,progress);payload.group.position.set(payloadRelease*6.5,12+payloadRelease*3,payloadRelease*1.6);
    payload.group.rotation.y=-payloadRelease*.45;payload.setArmPose(payloadRelease*.4);payload.group.visible=fairingSeparation>.12;
    plumeOpacity=smooth(.24,.34,progress)*(1-smooth(.66,.76,progress));
    const plumeLength=(7+Math.sin(progress*110)*.45)*plumeOpacity;
    plume.scale.set(1,Math.max(.001,plumeLength),1);plume.position.y=.5-plumeLength*.5;
    core.scale.set(1,Math.max(.001,plumeLength*.7),1);core.position.y=.5-plumeLength*.35;
    const upperFlame=smooth(.73,.79,progress)*(1-smooth(.88,.96,progress));
    upperPlume.scale.y=2.7;upperPlume.position.y=7.4;
    const terrainOpacity=1-smooth(.58,.74,progress);terrain.visible=terrainOpacity>.001;
    for(const [m,base]of allMaterials)m.opacity=base*opacity;
    for(const m of terrainMaterials)m.opacity=(allMaterials.get(m)??1)*opacity*terrainOpacity;
    plumeMaterial.opacity=plumeOpacity*.36*opacity;coreMaterial.opacity=plumeOpacity*.72*opacity;upperPlumeMaterial.opacity=upperFlame*.7*opacity;
    for(const material of[plumeMaterial,coreMaterial,upperPlumeMaterial]){material.uniforms.uOpacity.value=material.opacity;material.uniforms.uPhase.value=progress*95;}
    plume.visible=core.visible=plumeOpacity>.001;upperPlume.visible=upperFlame>.001;
    engineGlow.intensity=plumeOpacity*8*opacity;
    const smokeAlpha=smooth(.24,.35,progress)*(1-smooth(.48,.68,progress));
    smoke.forEach(({sprite,phase:a,seed},i)=>{
      const expansion=2.5+smooth(.24,.68,progress)*(5+seed*10);
      sprite.position.set(Math.cos(a)*expansion,1.5+seed*3.5+smooth(.28,.68,progress)*seed*5,Math.sin(a)*expansion);
      sprite.scale.setScalar(3+smooth(.24,.68,progress)*(3+seed*5));sprite.material.opacity=smokeAlpha*(.22+seed*.12)*opacity;
      sprite.material.rotation=a+progress*.2;
    });
    smokeGroup.visible=smokeAlpha>.001;
    skyMaterial.uniforms.uOpacity.value=(1-smooth(.8,1,progress))*.95*opacity;sky.visible=skyMaterial.uniforms.uOpacity.value>.001;
    getCamera(progress,mobile);
  }
  function setOpacity(value){opacity=clamp(value);update(progress,currentMobile);}
  function getState(){
    rocket.updateMatrixWorld(true);const payloadPosition=new THREE.Vector3();payload.group.getWorldPosition(payloadPosition);
    return {stage:phase(progress),progress,opacity,rocketPosition:rocket.position.toArray(),rocketQuaternion:rocket.quaternion.toArray(),towerRetraction:retraction,
      plumeOpacity:plumeMaterial.opacity,fairingSeparation,fairingPositions:fairings.map(({pivot})=>pivot.position.toArray()),payloadRelease,payloadPosition:payloadPosition.toArray(),
      camera:position.toArray(),focus:focus.toArray(),genericUnbrandedVehicle:true,illustrativeTrajectory:true};
  }
  update(0);
  return {group,update,getCamera,getState,setOpacity};
}

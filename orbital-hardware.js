/**
 * Vyper Space orbital story hardware.
 * Artistic orbital carriers and derelicts surround the supplied ground-test arm.
 * No flight design or dynamic performance is implied. Original GLB files remain
 * unchanged; ground pedestal / leveling-foot meshes are omitted from the carrier.
 */
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const ARM_NAMES = ['ARM_BASE', 'ARM_L1_TURRET', 'ARM_L2_UPPER', 'ARM_L3_FOREARM', 'ARM_L4_FORK', 'ARM_L5_HEAD', 'ARM_L6_ROTOR'];
const ARM_URL = new URL('./assets/viper/cad/', import.meta.url);
const textureCache = new WeakMap();

function canvasTexture(THREE, w, h, draw) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function textures(THREE) {
  if (textureCache.has(THREE)) return textureCache.get(THREE);
  const solar = canvasTexture(THREE, 512, 512, (c,w,h) => {
    c.fillStyle='#101b2c'; c.fillRect(0,0,w,h);
    for(let y=0;y<8;y++) for(let x=0;x<5;x++) {
      const px=9+x*100, py=6+y*63;
      const gradient=c.createLinearGradient(px,py,px+95,py+58);
      gradient.addColorStop(0, '#23365d'); gradient.addColorStop(.45,'#152c50'); gradient.addColorStop(1,'#0a1730');
      c.fillStyle=gradient;c.fillRect(px,py,94,57);
      c.strokeStyle='#7b8ba155';c.lineWidth=1;c.strokeRect(px+.5,py+.5,93,56);
      c.strokeStyle='#9aabb877';c.beginPath();c.moveTo(px+31,py);c.lineTo(px+31,py+57);c.moveTo(px+62,py);c.lineTo(px+62,py+57);c.stroke();
      c.strokeStyle='#98a7be22';for(let line=1;line<10;line++){c.beginPath();c.moveTo(px,py+line*5.7);c.lineTo(px+94,py+line*5.7);c.stroke();}
    }
  });
  const foil = canvasTexture(THREE, 256, 256, (c,w,h)=>{
    c.fillStyle='#b38e45';c.fillRect(0,0,w,h);
    let s=521;
    const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
    for(let i=0;i<190;i++){
      const x=rnd()*w,y=rnd()*h,r=4+rnd()*42;
      c.fillStyle=`rgba(${rnd()>.5?'255,230,151':'38,25,12'},${.025+rnd()*.09})`;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+r,y+r*.23);c.lineTo(x+r*.3,y+r);c.closePath();c.fill();
    }
    c.strokeStyle='#ede0a866';c.lineWidth=2;c.strokeRect(9,9,w-18,h-18);
  });
  const poleN=canvasTexture(THREE,128,128,(c,w,h)=>{c.fillStyle='#8d3b30';c.fillRect(0,0,w,h);c.fillStyle='#fff8e9';c.font='500 70px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('N',w/2,h/2+3);});
  const poleS=canvasTexture(THREE,128,128,(c,w,h)=>{c.fillStyle='#255c79';c.fillRect(0,0,w,h);c.fillStyle='#ecf8ff';c.font='500 70px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText('S',w/2,h/2+3);});
  const result={solar,foil,poleN,poleS}; textureCache.set(THREE,result);return result;
}
function palette(THREE) {
  const maps=textures(THREE);
  return {
    metal: new THREE.MeshStandardMaterial({color:0x8f9ba6,metalness:.86,roughness:.31}),
    bright: new THREE.MeshStandardMaterial({color:0xc3cad1,metalness:.82,roughness:.32}),
    dark: new THREE.MeshStandardMaterial({color:0x171c24,metalness:.58,roughness:.48}),
    foil: new THREE.MeshStandardMaterial({map:maps.foil,color:0xd7b96b,metalness:.78,roughness:.51}),
    solar: new THREE.MeshStandardMaterial({map:maps.solar,color:0xb2c4e6,metalness:.54,roughness:.36}),
    radiator:new THREE.MeshStandardMaterial({color:0x202630,metalness:.42,roughness:.75}),
    lens:new THREE.MeshStandardMaterial({color:0x244765,metalness:.92,roughness:.13,emissive:0x163048,emissiveIntensity:.16}),
    white:new THREE.MeshStandardMaterial({color:0xd5d7d8,metalness:.15,roughness:.75})
  };
}
function box(THREE, parent, size, at, material) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...at);parent.add(mesh);return mesh;
}
function cylinder(THREE,parent, radius,length,at,material,segments=12) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,segments),material);mesh.position.set(...at);parent.add(mesh);return mesh;
}
function rod(THREE,parent,a,b,radius,material) {
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=cylinder(THREE,parent,radius,delta.length(),start.clone().add(end).multiplyScalar(.5).toArray(),material,8);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;
}
function panel(THREE,parent,width,height,material,frame,damaged=false) {
  const group=new THREE.Group(); parent.add(group);
  box(THREE,group,[width+.05,height+.05,.05],[0,0,0],frame);
  if(damaged) {
    const geometry=new THREE.BufferGeometry();
    const x=width/2,y=height/2;
    // Clipped corner makes a visibly missing portion without loose fragments.
    const points=[[-x,-y],[x,-y],[x,y*.42],[x*.56,y],[-x,y]];
    const positions=[],uvs=[];
    for(let i=1;i<points.length-1;i++) for(const p of [points[0],points[i],points[i+1]]) {positions.push(p[0],p[1],.03);uvs.push(p[0]/width+.5,p[1]/height+.5);}
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
    const cell=new THREE.Mesh(geometry,material);group.add(cell);
    // Missing corner in the cell sheet is backed by damaged dark structure.
  } else box(THREE,group,[width,height,.012],[0,0,.033],material);
  box(THREE,group,[width,.025,.015],[0,0,.045],frame);
  return group;
}
function wings(THREE,parent,m,{damaged=false,axis='x',variant=0,scale=1,compactStubs=false}={}) {
  const root=new THREE.Group(); root.rotation.y=axis==='z'?Math.PI/2:0;parent.add(root);
  for(const side of [-1,1]) {
    const hinge=new THREE.Group();hinge.position.set(side*.72,.05,0);root.add(hinge);
    if(compactStubs) {
      // The selected derelict has lost both broad arrays. Short, bent remnants
      // keep the arm interaction readable throughout its illustrative tumble.
      hinge.rotation.y=side*.42;hinge.rotation.z=side*.19;
      rod(THREE,hinge,[0,0,0],[side*.21,0,0],.035,m.metal);
      const stub=panel(THREE,hinge,side===1?.38:.32,.48,m.solar,m.dark,true);
      stub.position.x=side*.35;
      rod(THREE,hinge,[side*.46,.1,0],[side*.61,.18,.07],.016,m.bright);
      rod(THREE,hinge,[side*.42,-.15,0],[side*.54,-.23,-.06],.012,m.dark);
      continue;
    }
    rod(THREE,hinge,[0,0,0],[side*.35,0,0],.035,m.metal);
    const inner=panel(THREE,hinge,1.18,1.5,m.solar,m.dark,false);inner.position.x=side*.92;
    const joint=new THREE.Group();joint.position.x=side*1.53;hinge.add(joint);
    joint.rotation.y=damaged&&side===1?.48+variant*.07:0;
    joint.rotation.z=damaged&&side===1?-.16:0;
    const outer=panel(THREE,joint,damaged&&side===1?.55:1.03,1.5,m.solar,m.dark,damaged&&side===1);
    outer.position.x=side*(damaged&&side===1?.29:.54);
    if(damaged&&side===-1)hinge.rotation.y=-.11;
  }
  root.scale.setScalar(scale);return root;
}
function batchStatic(THREE,group) {
  group.updateMatrixWorld(true);
  const batches=new Map(), originals=new Set();
  group.traverse(object=>{
    if(!object.isMesh)return;
    const material=object.material;
    if(!batches.has(material.uuid))batches.set(material.uuid,{material,geometries:[]});
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    batches.get(material.uuid).geometries.push(geometry);originals.add(object.geometry);
  });
  group.clear();
  for(const {material,geometries} of batches.values()) {
    const geometry=mergeGeometries(geometries,false);
    if(!geometry)throw new Error('Illustrative spacecraft geometry batching failed');
    group.add(new THREE.Mesh(geometry,material));geometries.forEach(g=>g.dispose());
  }
  originals.forEach(g=>g.dispose());
}
function details(THREE,parent,m,damaged,variant) {
  // Structural corner rails and a conductive radiator face remain readable at a distance.
  for(const x of [-.65,.65]) for(const z of [-.57,.57]) box(THREE,parent,[.045,1.64,.045],[x,0,z],m.bright);
  box(THREE,parent,[1.08,1.24,.035],[0,0,.595],m.bright);
  for(let i=0;i<7;i++)box(THREE,parent,[.026,1.07,.022],[-.45+i*.15,0,.624],m.radiator);
  box(THREE,parent,[.04,1.2,.88],[-.68,0,0],m.bright);
  for(const y of [-.59,.59])for(const x of [-.52,.52]){
    const fastener=cylinder(THREE,parent,.025,.018,[x,y,.635],m.dark,8);fastener.rotation.x=Math.PI/2;
  }
  const feed=new THREE.Group();feed.position.set(-.27,.9,.12);parent.add(feed);
  const dish=new THREE.Mesh(new THREE.SphereGeometry(.32,20,12,0,Math.PI*2,0,Math.PI*.38),m.white);dish.scale.y=.24;feed.add(dish);dish.rotation.z=-.3;
  rod(THREE,feed,[0,0,0],[0,.34,0],.016,m.metal);
  rod(THREE,parent,[.37,.8,-.25],[.4,1.32,-.23],.018,m.bright);
  rod(THREE,parent,[.4,1.32,-.23],[damaged?.77:.4,damaged?1.45:1.9,-.23],.012,m.bright);
  box(THREE,parent,[.3,.3,.035],[.32,.28,-.595],m.dark);
  box(THREE,parent,[.22,.055,.015],[.32,.28,-.621],m.white);
  if(damaged) {
    const flap=box(THREE,parent,[.36,.62,.025],[.61,-.26,.61],m.foil);flap.rotation.y=.72;flap.rotation.z=-.18;
    const scar=box(THREE,parent,[.42,.035,.005],[-.19,-.25,.648],m.dark);scar.rotation.z=.37;
  }
}
/** Original illustrative spacecraft, never claimed to be a measured target. */
export function createSatellite(THREE,{variant=0,damaged=false,scale=1,selected=false}={}) {
  const group=new THREE.Group();group.name=selected?'Selected conductive target':'Illustrative derelict spacecraft';
  const m=palette(THREE);
  box(THREE,group,[1.28,1.58,1.12],[0,0,0],variant%3===1?m.metal:m.foil);
  details(THREE,group,m,damaged,variant);
  const arrays=wings(THREE,group,m,{damaged,axis:selected?'z':'x',variant,compactStubs:selected});
  if(variant%3===2) arrays.rotation.z=.18;
  batchStatic(THREE,group);
  group.scale.setScalar(scale);
  group.userData={kind:'illustrative-spacecraft',damaged,selected,bodyHalfExtents:[.7*scale,.81*scale,.64*scale]};
  return group;
}

async function loadArm(THREE) {
  const loader=new GLTFLoader(), components={};
  const conversion=new THREE.Matrix4().set(1,0,0,0,0,0,-1,0,0,1,0,0,0,0,0,1);
  await Promise.all(ARM_NAMES.map(async name=>{
    const gltf=await loader.loadAsync(new URL(`${name}.glb`,ARM_URL).href);
    gltf.scene.updateMatrixWorld(true);
    const part=new THREE.Group();part.name=name;part.matrixAutoUpdate=false;
    const orientation=new THREE.Group();orientation.matrixAutoUpdate=false;orientation.matrix.copy(conversion);
    const batches=new Map(), originals=new Set();
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      // Original named ground support hardware does not belong on the orbital carrier.
      let ancestor=object, omit=false;
      while(ancestor&&ancestor!==gltf.scene){if(/^(pedestal_|leveling_foot_|plate_to_pedestal)/.test(ancestor.name))omit=true;ancestor=ancestor.parent;}
      if(omit)return;
      const material=object.material;
      if(Array.isArray(material)) throw new Error('Unexpected multi-material CAD surface');
      material.roughness=Math.min(material.roughness??.6,.7);
      if(material.transparent||material.opacity<.99)material.depthWrite=false;
      if(!batches.has(material.uuid))batches.set(material.uuid,{material,geometries:[]});
      batches.get(material.uuid).geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
      originals.add(object.geometry);
    });
    for(const {material,geometries} of batches.values()) {
      const geometry=mergeGeometries(geometries,false);
      if(!geometry)throw new Error('CAD geometry batching failed');
      orientation.add(new THREE.Mesh(geometry,material));geometries.forEach(g=>g.dispose());
    }
    originals.forEach(g=>g.dispose());part.add(orientation);components[name]=part;
  }));
  return components;
}

/**
 * Orbital installation is illustrative. Local Y up; arm reaches +X.
 * Supplied neutral tip is approximately (3.3,2.4,0) in this installation.
 */
export async function createServicer(THREE) {
  const group=new THREE.Group();group.name='Vyper Space illustrative orbital carrier';
  const m=palette(THREE),body=new THREE.Group();group.add(body);
  box(THREE,body,[1.75,1.3,1.45],[0,0,0],m.foil);
  for(const x of [-.86,.86])for(const z of [-.71,.71])box(THREE,body,[.055,1.36,.055],[x,0,z],m.bright);
  box(THREE,body,[1.78,.055,1.47],[0,.66,0],m.bright);
  box(THREE,body,[1.5,.75,.045],[0,-.05,.75],m.radiator);
  for(let i=0;i<8;i++)box(THREE,body,[.035,.65,.016],[-.63+i*.18,-.05,.78],m.metal);
  const arrayRoot=new THREE.Group();arrayRoot.position.y=-.16;body.add(arrayRoot);wings(THREE,arrayRoot,m,{axis:'z',scale:1.18});
  for(const z of [-.5,.5]){
    const thruster=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,.23,12),m.dark);thruster.rotation.z=Math.PI/2;thruster.position.set(-.98,-.4,z);body.add(thruster);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.018,6,18),m.bright);ring.rotation.y=Math.PI/2;ring.position.set(-1.1,-.4,z);body.add(ring);
  }
  rod(THREE,body,[-.65,.62,-.4],[-.8,1.65,-.6],.024,m.bright);
  const antenna=new THREE.Mesh(new THREE.SphereGeometry(.3,20,12,0,Math.PI*2,0,Math.PI*.4),m.white);antenna.scale.y=.3;antenna.position.set(-.8,1.65,-.6);antenna.rotation.z=-.3;body.add(antenna);
  // A simple inspection camera is mounted by the arm base; no tracking performance is implied.
  const cameraBody=box(THREE,body,[.28,.22,.28],[.55,.92,.46],m.dark);
  const lens=cylinder(THREE,body,.07,.12,[.74,.92,.46],m.metal,18);lens.rotation.z=Math.PI/2;
  const glass=cylinder(THREE,body,.055,.012,[.805,.92,.46],m.lens,18);glass.rotation.z=Math.PI/2;
  rod(THREE,body,[.55,.67,.46],[.55,.85,.46],.045,m.metal);
  const installation=new THREE.Group();installation.position.y=.74;installation.rotation.z=-.35;group.add(installation);
  const arm=new THREE.Group();arm.scale.setScalar(.0038);arm.rotation.x=-Math.PI/2;installation.add(arm);
  const components=await loadArm(THREE);
  for(const part of Object.values(components))arm.add(part);
  const tip=new THREE.Object3D();tip.name='Magnet tip reference';tip.position.set(679,0,700);components.ARM_L6_ROTOR.add(tip);
  // Small schematic pole markers sit on opposite transverse faces of the supplied rotor.
  // Their direction rotates around the shaft; it is not an axially symmetric dipole.
  const markers=new THREE.Group();markers.name='Illustrative transverse N/S pole markings';
  const maps=textures(THREE), poleMaterialN=new THREE.MeshStandardMaterial({map:maps.poleN,roughness:.62,metalness:.1,side:THREE.DoubleSide}),poleMaterialS=new THREE.MeshStandardMaterial({map:maps.poleS,roughness:.62,metalness:.1,side:THREE.DoubleSide});
  const north=new THREE.Mesh(new THREE.PlaneGeometry(44,38),poleMaterialN);north.position.set(646,0,731);markers.add(north);
  const south=new THREE.Mesh(new THREE.PlaneGeometry(44,38),poleMaterialS);south.position.set(646,0,669);south.rotation.y=Math.PI;markers.add(south);
  components.ARM_L6_ROTOR.add(markers);
  const axes={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
  const rotation=new THREE.Matrix4(),pivot=new THREE.Vector3(),shifted=new THREE.Vector3();
  const joints=[
    ['ARM_L1_TURRET','ARM_BASE',[0,0,0],'z'],
    ['ARM_L2_UPPER','ARM_L1_TURRET',[0,0,200],'y'],
    ['ARM_L3_FOREARM','ARM_L2_UPPER',[0,0,700],'y'],
    ['ARM_L4_FORK','ARM_L3_FOREARM',[0,0,700],'x'],
    ['ARM_L5_HEAD','ARM_L4_FORK',[400,0,700],'y'],
    ['ARM_L6_ROTOR','ARM_L5_HEAD',[627,0,700],'x']
  ];
  let pose=1,rotorAngle=0;
  function apply() {
    const fold=1-pose;
    const angles=[-.06*fold,-.4*fold,.53*fold,-.1*fold,-.12*fold,rotorAngle];
    joints.forEach(([child,parent,point,axis],i)=>{
      rotation.makeRotationAxis(axes[axis],angles[i]);pivot.fromArray(point);shifted.copy(pivot).applyMatrix4(rotation);rotation.setPosition(pivot.sub(shifted));
      components[child].matrix.copy(components[parent].matrix).multiply(rotation);components[child].matrixWorldNeedsUpdate=true;
    });
    group.updateMatrixWorld(true);
  }
  function setArmPose(t){pose=Math.max(0,Math.min(1,t));apply();}
  function updateRotor(angle){rotorAngle=angle;apply();}
  apply();
  const result={
    group,arm,rotor:components.ARM_L6_ROTOR,magnetRotor:components.ARM_L6_ROTOR,
    tip,magnetTip:tip,components,camera:cameraBody,setArmPose,updateRotor,
    getMagnetWorldPosition(out=new THREE.Vector3()){
      group.updateMatrixWorld(true);return tip.getWorldPosition(out);
    },
    getMagnetWorldDirection(out=new THREE.Vector3()){
      group.updateMatrixWorld(true);return out.set(1,0,0).transformDirection(components.ARM_L6_ROTOR.matrixWorld);
    },
    // South-to-north direction follows the original rotor's transverse +Z face.
    // Unlike the shaft direction above, this vector changes as the magnet rotates.
    getDipoleWorldDirection(out=new THREE.Vector3()){
      group.updateMatrixWorld(true);return out.set(0,0,1).transformDirection(components.ARM_L6_ROTOR.matrixWorld);
    }
  };
  group.userData={kind:'illustrative-orbital-installation',suppliedCadComponents:7,groundSupportOmitted:true,poseIsIllustrative:true};
  return result;
}

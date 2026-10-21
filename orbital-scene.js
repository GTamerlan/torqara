/**
 * Vyper Space: an original, scroll-directed orbital illustration.
 * This is staged animation, not an orbital/attitude dynamics or braking solver.
 * Satellite positions, damage, rotations and the apparent slowdown are artistic.
 * The technical prototype, original CAD files and numerical models are separate.
 */
import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createSatellite, createServicer } from './orbital-hardware.js';
import { createGroundSequence } from './ground-sequence.js';
import { createOrbitalPopulation } from './orbital-population.js';
import { createLaunchSequence } from './launch-sequence.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const ROOT = new URL('./assets/vyper/', import.meta.url);
const STORY_BEATS = [0, .18, .36, .54, .72, .87, 1];
const GLOBAL_BEATS = [0,.08,.16,.24,.32,.40,.48,.56,.64,.73,.82,.91,1];
const GLOBAL_PHASES = ['population','teaser','experiment','experiment-detail','prototype','launchpad','liftoff','ascent','deployment','debris','approach','interaction','settled'];

// Monotone Hermite retiming keeps a reversible story without camera cuts at
// chapter boundaries. All coordinates are illustrative, not mission data.
function retime(value,stops,values) {
  if (value <= stops[0]) return values[0];
  if (value >= stops.at(-1)) return values.at(-1);
  let i = 0;
  while (i < stops.length - 2 && value > stops[i+1]) i++;
  const span = stops[i+1]-stops[i], t = clamp((value-stops[i])/span), t2=t*t,t3=t2*t;
  const secant = k => (values[k+1]-values[k])/(stops[k+1]-stops[k]);
  const slope = k => {
    if (k===0) return secant(0);
    if (k===stops.length-1) return secant(k-1);
    const a=secant(k-1),b=secant(k);
    return a*b<=0 ? 0 : 2*a*b/(a+b);
  };
  return (2*t3-3*t2+1)*values[i] + (t3-2*t2+t)*span*slope(i)
    + (-2*t3+3*t2)*values[i+1] + (t3-t2)*span*slope(i+1);
}

function orbitalStoryProgress(globalProgress) {
  return globalProgress < .36
    ? retime(globalProgress,[0,.08,.105,.135],[.18,.72,.87,.87])
    : retime(globalProgress,[.625,.64,.73,.82,.91,.965,1],[.14,.18,.36,.54,.72,.87,1]);
}

function chapterAt(progress) {
  let index=0;
  while(index<GLOBAL_BEATS.length-1 && progress>=(GLOBAL_BEATS[index]+GLOBAL_BEATS[index+1])/2) index++;
  return GLOBAL_PHASES[index];
}

function makeTransition() {
  const material=new THREE.ShaderMaterial({
    uniforms:{opacity:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'uniform float opacity;varying vec2 vUv;void main(){vec3 c=mix(vec3(.018,.032,.052),vec3(.055,.105,.16),vUv.y);gl_FragColor=vec4(c,opacity);}',
    transparent:true,depthWrite:false,depthTest:false,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);
  mesh.name='Editorial atmospheric transitions';mesh.renderOrder=10000;mesh.frustumCulled=false;
  return mesh;
}

// Keep camera velocity continuous across the unevenly spaced story beats.
function storyPathTime(p) {
  let i = 0;
  while (i < STORY_BEATS.length - 2 && p > STORY_BEATS[i + 1]) i++;
  const a = STORY_BEATS[i], b = STORY_BEATS[i + 1], span = b - a, t = clamp((p - a) / span);
  const slope = k => k === 0 ? 1 / (6 * (STORY_BEATS[1] - STORY_BEATS[0]))
    : k === 6 ? 1 / (6 * (STORY_BEATS[6] - STORY_BEATS[5]))
      : 2 / (6 * (STORY_BEATS[k + 1] - STORY_BEATS[k - 1]));
  const t2 = t * t, t3 = t2 * t;
  return (2*t3-3*t2+1)*i/6 + (t3-2*t2+t)*span*slope(i)
    + (-2*t3+3*t2)*(i+1)/6 + (t3-t2)*span*slope(i+1);
}

function seededRandom(seed) {
  let n = seed >>> 0;
  return () => { n = (1664525 * n + 1013904223) >>> 0; return n / 4294967296; };
}

function addStars(scene) {
  const random = seededRandom(712093), count = 760;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = random() * TAU, y = random() * 2 - 1, r = 180 + random() * 70;
    const h = Math.sqrt(1 - y * y), light = .28 + random() * .6;
    positions.set([Math.cos(theta) * h * r, y * r, Math.sin(theta) * h * r], i * 3);
    colors.set([light * .84, light * .91, light], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: .19, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: .7, depthWrite: false }));
  stars.name = 'Artistic background stars';
  scene.add(stars);
  return stars;
}

function cloudTexture() {
  // Generated weather-like bands are decorative, not a satellite observation.
  const width = 512, height = 256, canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'), data = context.createImageData(width, height);
  const random = seededRandom(84011), grid = Float32Array.from({ length: 65 * 33 }, random);
  const noise = (x, y) => {
    x = ((x % 64) + 64) % 64; y = clamp(y, 0, 31.999);
    const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
    const sx = u * u * (3 - 2 * u), sy = v * v * (3 - 2 * v);
    const aa = grid[iy * 65 + ix], bb = grid[iy * 65 + ix + 1], cc = grid[(iy + 1) * 65 + ix], dd = grid[(iy + 1) * 65 + ix + 1];
    return (aa + (bb - aa) * sx) * (1 - sy) + (cc + (dd - cc) * sx) * sy;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const u = x / width, v = y / height;
    const warp = Math.sin(v * 28 + u * 19) * .8;
    const field = noise(u * 30 + warp, v * 15) * .57 + noise(u * 61 + warp * 2, v * 31) * .28 + noise(u * 63 + .7, v * 31 + .3) * .15;
    const bands = .07 * Math.sin(v * 33 + Math.sin(u * 19) * .65);
    const alpha = Math.pow(clamp((field + bands - .51) * 4.3), 1.3) * 155;
    const offset = (y * width + x) * 4;
    data.data[offset] = data.data[offset + 1] = data.data[offset + 2] = 255;
    data.data[offset + 3] = alpha;
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

function atmosphere(radius, opacity, power, side) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 80, 48), new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x438dff) }, uOpacity: { value: opacity }, uPower: { value: power } },
    vertexShader: `varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uOpacity;uniform float uPower;varying vec3 vNormal;varying vec3 vView;void main(){float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),uPower);gl_FragColor=vec4(uColor,edge*uOpacity);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,
    transparent: true, blending: THREE.AdditiveBlending, side, depthWrite: false,
  }));
}

function makeField() {
  const group = new THREE.Group(), materials = [];
  for (let i = 0; i < 4; i++) {
    const points = [], phase = i * Math.PI / 2;
    for (let j = 0; j <= 90; j++) {
      const t = j / 90 * Math.PI;
      // Schematic pole-to-pole loops, with the dipole along rotor-local Z.
      // They rotate about the actual shaft X with the transverse N/S markers.
      const r = Math.sin(t) ** 2 * 1.32;
      points.push(new THREE.Vector3(r * Math.cos(phase), r * Math.sin(phase), .55 * Math.cos(t)));
    }
    const material = new THREE.LineBasicMaterial({ color: i % 2 ? 0x91c8ef : 0xd3e5f5, transparent: true, opacity: 0, depthWrite: false });
    materials.push(material);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
  return { group, materials };
}

function makeCurrents(target) {
  const group = new THREE.Group(), materials = [], dots = [];
  for (let i = 0; i < 3; i++) {
    const radius = .2 + i * .12, points = [];
    for (let j = 0; j <= 64; j++) {
      const t = j / 64 * TAU;
      points.push(new THREE.Vector3(-.662, Math.cos(t) * radius, Math.sin(t) * radius * .82));
    }
    const material = new THREE.LineBasicMaterial({ color: 0xa6d8ef, transparent: true, opacity: 0, depthWrite: false });
    materials.push(material);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xd6f1ff, transparent: true, opacity: 0, depthWrite: false });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.016, 8, 6), pointMaterial);
    dot.userData.radius = radius; dot.userData.phase = i * 1.8;
    dots.push(dot); group.add(dot);
  }
  target.add(group);
  return { group, materials, dots };
}

function disposeScene(scene, renderer, environment) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => item.dispose());
  environment?.dispose(); renderer.dispose(); renderer.domElement.remove();
}

export async function mountOrbitalScene(container) {
  container.dataset.sceneState = 'loading';
  const canvas = document.createElement('canvas');
  canvas.className = 'orbital-renderer'; canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x03070d, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  const scene = new THREE.Scene();
  const orbitalWorld = new THREE.Group(); orbitalWorld.name = 'Illustrative orbital environment'; scene.add(orbitalWorld);
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 700);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .34;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xb8d5ff, 0x06101c, 1.05));
  const sunlight = new THREE.DirectionalLight(0xffefdb, 3.3);
  sunlight.position.set(-25, 32, 60); scene.add(sunlight);
  const rim = new THREE.DirectionalLight(0x83b8ff, 1.7); rim.position.set(15, 2, -12); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, .6); fill.position.set(0, 9, 25); scene.add(fill);
  const stars = addStars(scene);
  const atmosphereLayers = [];
  const bridge=makeTransition();scene.add(bridge);
  let earth, cloud, servicer, target, currents, ground, launch;
  try {
    const loader = new THREE.TextureLoader();
    const [day, loadedServicer, loadedGround, loadedLaunch] = await Promise.all([
      loader.loadAsync(new URL('earth-day.jpg', ROOT).href), createServicer(THREE), createGroundSequence(THREE), createLaunchSequence(THREE),
    ]);
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const planet = new THREE.Group(); planet.position.set(0, -27, -32); orbitalWorld.add(planet);
    earth = new THREE.Mesh(new THREE.SphereGeometry(25, 96, 64), new THREE.MeshPhongMaterial({ map: day, shininess: 9, specular: new THREE.Color(0x183447), color: 0xd8e9ff, transparent: true }));
    earth.rotation.y = .7; planet.add(earth);
    cloud = new THREE.Mesh(new THREE.SphereGeometry(25.13, 80, 48), new THREE.MeshPhongMaterial({ map: cloudTexture(), transparent: true, opacity: .055, depthWrite: false, shininess: 2 }));
    cloud.rotation.y = .72; planet.add(cloud);
    atmosphereLayers.push(atmosphere(25.15, .12, 3.5, THREE.FrontSide),atmosphere(25.38, .24, 4.5, THREE.BackSide));
    planet.add(...atmosphereLayers);
    servicer = loadedServicer;
    servicer.group.name = 'Concept servicer with supplied prototype arm';
    orbitalWorld.add(servicer.group);
    target = createSatellite(THREE, { variant: 0, damaged: true, selected: true, scale: 1.25 });
    target.name = 'Selected illustrative conductive target'; orbitalWorld.add(target);
    currents = makeCurrents(target);
    ground = loadedGround; scene.add(ground.group);
    launch = loadedLaunch; scene.add(launch.group);
  } catch (error) {
    container.dataset.sceneState = 'error'; disposeScene(scene, renderer, environment); throw error;
  }
  const fleetSpec = [
    [-12, 8, 15, .9, 1, 1.2], [13, 11, -1, 1.25, 2, .7], [-8, -3, 8, .85, 3, 1.5],
    [16, -5, -13, 1.15, 4, .9], [-18, 5, -5, 1, 5, 1.1], [7, 12, -19, .7, 6, 1.7],
    [25, 7, -6, .8, 7, 1.15], [-20, 13, 24, .7, 8, .8],
  ];
  const fleetWindows = [[.12,.205],[.205,.29],[.29,.375],[.375,.46]];
  const fleet = fleetSpec.map(([x,y,z,scale,variant,speed],index) => {
    const group = createSatellite(THREE, { variant, damaged: true, scale });
    group.position.set(x,y,z); orbitalWorld.add(group);
    const materials = new Set();
    group.traverse(object => {
      for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
        if (material) { material.transparent = true; materials.add(material); }
      }
    });
    return { group, position: new THREE.Vector3(x,y,z), speed, variant, scale, materials, window: fleetWindows[Math.floor(index / 2)], opacity: 0 };
  });
  const field = makeField(); orbitalWorld.add(field.group);
  const tip = new THREE.Vector3(), finalTarget = new THREE.Vector3();
  const finalTargetAngle = .66 * 36 + 36 * (1 - Math.exp(-.34 * 13)) / 13;
  const rotatingQuaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  const cameraPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 16, 72), new THREE.Vector3(43, 15, 28), new THREE.Vector3(18, 10, 23),
    new THREE.Vector3(9.8, 6.3, 17), new THREE.Vector3(6.7, 5.2, 13.2), new THREE.Vector3(-5.4, 7.2, 18.5), new THREE.Vector3(-20, 16, 44),
  ], false, 'centripetal');
  const focusPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,-16,-25), new THREE.Vector3(0,-12,-18), new THREE.Vector3(0,1,4),
    new THREE.Vector3(-.5,1,5), new THREE.Vector3(-1.5,.1,5), new THREE.Vector3(-1.2,.2,5), new THREE.Vector3(-4,-5,-5),
  ], false, 'centripetal');
  // Quiet, successive pairs occupy the camera route. Their positions are fixed;
  // editorial fades reveal each pair before the single selected interaction.
  const stagingCamera = new THREE.Vector3(), stagingFocus = new THREE.Vector3(), stagingForward = new THREE.Vector3(), stagingRight = new THREE.Vector3(), stagingUp = new THREE.Vector3();
  fleet.forEach((item,index) => {
    const pathTime = storyPathTime((item.window[0] + item.window[1]) / 2);
    cameraPath.getPoint(pathTime,stagingCamera); focusPath.getPoint(pathTime,stagingFocus);
    stagingForward.subVectors(stagingFocus,stagingCamera).normalize();
    stagingRight.crossVectors(stagingForward,new THREE.Vector3(0,1,0)).normalize();
    stagingUp.crossVectors(stagingRight,stagingForward).normalize();
    const halfHeight = stagingCamera.distanceTo(stagingFocus) * .54 * Math.tan(THREE.MathUtils.degToRad(43 / 2));
    item.position.copy(stagingCamera).lerp(stagingFocus,.54)
      .addScaledVector(stagingRight,(index % 2 ? 1 : -1) * Math.min(6.2,halfHeight * .72))
      .addScaledVector(stagingUp,index % 2 ? Math.min(5.8,halfHeight * .56) : Math.min(2.8,halfHeight * .28));
    if (index >= 4) item.group.scale.multiplyScalar(.8);
  });
  const cameraPos = new THREE.Vector3(), lookAt = new THREE.Vector3(), delta = new THREE.Vector3();
  const earthCenter = new THREE.Vector3(0,-27,-32);
  const population = createOrbitalPopulation(THREE,{center:earthCenter,radius:25}); orbitalWorld.add(population.group);
  const controls = new OrbitControls(camera,canvas);
  controls.enabled = false; controls.enablePan = false; controls.enableDamping = false;
  controls.rotateSpeed = .55; controls.zoomSpeed = .7;
  controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI * .49;
  canvas.style.touchAction = 'pan-y';
  let destination = 0, progress = 0, paused = false, reduced = false, exploring = false, disposed = false, visible = true, raf = 0, previousTime = 0, lastDraw = -1;
  let phase = 'population', targetAngle = 0, magnetAngle = 0, braking = 0, orbitalProgress = 0, groundProgress = 0, launchProgress = 0, transition = 0, world = 'orbit';
  let size = { width: 1, height: 1 };

  function setPoses(globalProgress) {
    const p = orbitalStoryProgress(globalProgress);
    orbitalProgress = p;
    groundProgress = retime(globalProgress,[.16,.24,.32,.375],[0,.23,.46,.84]);
    launchProgress = retime(globalProgress,[.36,.40,.48,.56,.60],[0,.14,.43,.78,1]);
    const toLab = smooth(.105,.132,globalProgress)*(1-smooth(.14,.165,globalProgress));
    const toLaunch = smooth(.345,.373,globalProgress)*(1-smooth(.38,.405,globalProgress));
    const toOrbit = smooth(.595,.622,globalProgress)*(1-smooth(.63,.655,globalProgress));
    transition=Math.max(toLab,toLaunch,toOrbit);
    bridge.material.uniforms.opacity.value=transition;bridge.visible=transition>.001;
    phase = chapterAt(globalProgress);
    world = globalProgress<.135 || globalProgress>=.625 ? 'orbit' : globalProgress<.375 ? 'ground' : 'launch';
    const mobile = camera.aspect < 1;
    ground.update(groundProgress,mobile);
    launch.update(launchProgress,mobile);
    ground.group.visible = world==='ground';
    launch.group.visible = world==='launch';
    orbitalWorld.visible = world==='orbit';
    earth.material.opacity = 1;
    cloud.material.opacity = .055;
    atmosphereLayers.forEach((layer,index) => { layer.material.uniforms.uOpacity.value = index ? .24 : .12; });
    stars.material.opacity = .7;
    stars.visible = world==='orbit';
    population.update(p);
    const targetReveal = smooth(.305,.38,p);
    target.visible = targetReveal > 0;
    target.scale.setScalar(1.25 * Math.max(.001,targetReveal));
    braking = smooth(.66, .94, p);
    // A smooth artistic spin profile: angular increments shrink as the story advances.
    targetAngle = p < .66 ? p * 36 : .66 * 36 + 36 * (1 - Math.exp(-(p - .66) * 13)) / 13;
    const remainingAngle = targetAngle - finalTargetAngle;
    euler.set(remainingAngle * .61 + .08, remainingAngle * .8 + .16, remainingAngle * .38 - .07);
    rotatingQuaternion.setFromEuler(euler);
    target.quaternion.copy(rotatingQuaternion);
    const approach = smooth(.42,.66,p);
    servicer.group.position.set(-6 + approach * 3.3, -.1 + (1 - approach) * .4, 5 - (1 - approach) * 4);
    // Keep the arm out of the distant establishing scene without a visible pop.
    const entry = .001 + smooth(.43,.53,p) * .999;
    servicer.group.scale.setScalar(entry);
    servicer.group.visible = p > .43;
    servicer.setArmPose?.(approach);
    servicer.group.updateMatrixWorld(true);
    if (servicer.getMagnetWorldPosition) servicer.getMagnetWorldPosition(tip);
    else (servicer.tip || servicer.magnetTip).getWorldPosition(tip);
    finalTarget.copy(tip).add(new THREE.Vector3(2.1, 0, 0));
    const settlePosition = smooth(.53,.74,p);
    target.position.set(2.5,3.2,5).lerp(finalTarget, settlePosition);
    magnetAngle = Math.max(0,p-.59) * 105;
    if (servicer.updateRotor) servicer.updateRotor(magnetAngle);
    else (servicer.rotor || servicer.magnetRotor).rotation.x = magnetAngle;
    // The opening establishes the Earth-relative population shells. The larger
    // camera-staged craft enter only once the camera travels toward encounters.
    const fleetReveal = globalProgress < .135 ? smooth(.022,.042,globalProgress) : 1;
    for (const item of fleet) {
      const [start,end] = item.window;
      item.opacity = smooth(start,start+.025,p) * (1-smooth(end-.025,end,p)) * fleetReveal;
      item.group.visible = item.opacity > .001;
      item.materials.forEach(material => { material.opacity = item.opacity; });
      const angle = p * 9 * item.speed;
      item.group.rotation.set(angle * .61 + item.variant * .4, angle + item.variant, angle * .33);
      item.group.position.copy(item.position);
      item.group.position.x += Math.sin(p * 1.7 + item.variant) * .75;
      item.group.position.y += Math.sin(p * 2.1 + item.variant * .7) * .4;
    }
    earth.rotation.y = .7 + p * .24;
    cloud.rotation.y = .72 + p * .28;
    field.group.position.copy(tip);
    (servicer.rotor || servicer.magnetRotor).getWorldQuaternion(field.group.quaternion);
    const fieldOpacity = smooth(.65,.72,p) * (1 - smooth(.94,1,p)) * .27;
    field.materials.forEach((material,i) => { material.opacity = fieldOpacity * (1 - i * .12); });
    currents.materials.forEach((material,i) => { material.opacity = fieldOpacity * (.8 - i * .13); });
    currents.dots.forEach(dot => {
      const angle = magnetAngle * .65 + dot.userData.phase;
      dot.position.set(-.669, Math.cos(angle) * dot.userData.radius, Math.sin(angle) * dot.userData.radius * .82);
      dot.material.opacity = fieldOpacity * 1.6;
    });
    const pathTime = storyPathTime(p);
    cameraPath.getPoint(pathTime,cameraPos); focusPath.getPoint(pathTime,lookAt);
    // Preserve the complete scene on a phone rather than cropping away the arm.
    const portrait = clamp((1.08 - camera.aspect) / .65);
    lookAt.x += portrait * smooth(.38,.66,p) * (2.5 - smooth(.76,.87,p) * 1.5);
    lookAt.y -= portrait * smooth(.38,.66,p) * 1.7;
    delta.subVectors(cameraPos,lookAt).multiplyScalar(1 + portrait * (.48 + smooth(.42,.72,p) * .42));
    camera.position.copy(lookAt).add(delta);
    if(globalProgress<.165){
      // The opening encounter is a wider mission overview. The final return
      // keeps the closer camera for a distinct view of the physical gap.
      const overview=smooth(.025,.07,globalProgress);
      camera.position.sub(lookAt).multiplyScalar(1+overview*(mobile?.23:.42)).add(lookAt);
      camera.position.x+=overview*3.5;camera.position.y+=overview*1.5;
    }
    const groundCamera = ground.getCamera(groundProgress,mobile);
    const launchCamera = launch.getCamera(launchProgress,mobile);
    if (globalProgress>=.105 && globalProgress<.345) {
      const blend=smooth(.105,.165,globalProgress);
      camera.position.lerp(groundCamera.position,blend);
      lookAt.lerp(groundCamera.focus,blend);
    } else if (globalProgress>=.345 && globalProgress<.595) {
      const blend=smooth(.345,.405,globalProgress);
      camera.position.copy(groundCamera.position).lerp(launchCamera.position,blend);
      lookAt.copy(groundCamera.focus).lerp(launchCamera.focus,blend);
    } else if(globalProgress>=.595 && globalProgress<.655) {
      const blend=smooth(.595,.655,globalProgress);
      camera.position.lerp(launchCamera.position,1-blend);
      lookAt.lerp(launchCamera.focus,1-blend);
    }
    camera.lookAt(lookAt);
    // Neither camera path nor framing adjustment may enter the planet.
    keepOutsideEarth();
    camera.updateMatrixWorld();
    container.dataset.sceneProgress = globalProgress.toFixed(5);
    container.dataset.orbitalProgress = p.toFixed(5);
    container.dataset.scenePhase = phase;
    container.dataset.targetAngle = targetAngle.toFixed(5);
    container.dataset.magnetAngle = magnetAngle.toFixed(5);
  }

  function keepOutsideEarth() {
    if (world!=='orbit') return;
    if (camera.position.distanceTo(earthCenter) < 26.4) {
      camera.position.copy(earthCenter).add(delta.subVectors(camera.position,earthCenter).normalize().multiplyScalar(26.4));
      camera.lookAt(exploring ? controls.target : lookAt);
    }
  }

  function onExploreChange() {
    if (!exploring || disposed || !visible || document.hidden) return;
    keepOutsideEarth(); camera.updateMatrixWorld(); renderer.render(scene,camera);
  }
  controls.addEventListener('change',onExploreChange);
  const keyboardOffset = new THREE.Vector3(), keyboardOrbit = new THREE.Spherical();
  function onExploreKey(event) {
    if (!exploring || disposed || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName || '')) return;
    const orbitKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'];
    if (!orbitKeys.includes(event.key)) return;
    event.preventDefault();
    keyboardOrbit.setFromVector3(keyboardOffset.subVectors(camera.position,controls.target));
    const step = event.shiftKey ? .035 : .085;
    if (event.key === 'ArrowLeft') keyboardOrbit.theta -= step;
    if (event.key === 'ArrowRight') keyboardOrbit.theta += step;
    if (event.key === 'ArrowUp') keyboardOrbit.phi -= step;
    if (event.key === 'ArrowDown') keyboardOrbit.phi += step;
    if (event.key === '+' || event.key === '=') keyboardOrbit.radius *= .9;
    if (event.key === '-' || event.key === '_') keyboardOrbit.radius *= 1.1;
    keyboardOrbit.phi = clamp(keyboardOrbit.phi,controls.minPolarAngle,controls.maxPolarAngle);
    keyboardOrbit.radius = clamp(keyboardOrbit.radius,controls.minDistance,controls.maxDistance);
    camera.position.copy(controls.target).add(keyboardOffset.setFromSpherical(keyboardOrbit));
    controls.update(); onExploreChange();
  }
  document.addEventListener('keydown',onExploreKey);

  function setExplore(value) {
    const next = Boolean(value);
    if (disposed || next === exploring) return;
    exploring = next;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    container.dataset.sceneExploring = String(exploring);
    canvas.style.pointerEvents = exploring ? 'auto' : 'none';
    canvas.style.touchAction = exploring ? 'none' : 'pan-y';
    canvas.style.cursor = exploring ? 'grab' : '';
    if (exploring) {
      bridge.visible=false;
      // Manual inspection has no story caption: center its subject rather than
      // retaining the deliberately offset focus of the guided composition.
      if (world==='ground') controls.target.copy(ground.getExploreFocus?.(groundProgress) || lookAt);
      else if (world==='launch') controls.target.copy(launch.getCamera(launchProgress,camera.aspect<1).focus);
      else if (orbitalProgress < .27) controls.target.copy(earthCenter);
      else if (orbitalProgress >= .45) {
        controls.target.copy(servicer.group.position).lerp(target.position,.5);
        controls.target.y += .65;
      } else controls.target.copy(lookAt);
      const distance = camera.position.distanceTo(controls.target);
      controls.minDistance = Math.max(world==='ground' ? 2.8 : world==='launch' ? 7 : orbitalProgress<.27 ? 32 : 4.8, distance*.45);
      controls.maxDistance = Math.min(200, Math.max(28,distance * 1.85));
      controls.enabled = true; controls.update();
    } else {
      controls.enabled = false;
      draw(true); wake();
    }
  }

  function draw(force = false) {
    const p = progress;
    if (!force && Math.abs(lastDraw - p) < .000001) return;
    if (!exploring) setPoses(p);
    renderer.render(scene,camera); lastDraw = p;
  }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden || paused || reduced || exploring) return;
    const dt = previousTime ? Math.min(.05,(now - previousTime) / 1000) : 1/60;
    previousTime = now;
    progress += (destination - progress) * (1 - Math.exp(-dt * 7.6));
    if (Math.abs(destination - progress) < .000015) progress = destination;
    draw();
    if (Math.abs(destination - progress) > .000001) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (disposed || raf || !visible || document.hidden || paused || reduced || exploring) return;
    previousTime = 0; raf = requestAnimationFrame(frame);
  }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect();
    size = { width: Math.max(1,rect.width), height: Math.max(1,rect.height) };
    camera.aspect = size.width / size.height; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, size.width < 760 ? 1.25 : 1.6));
    renderer.setSize(size.width,size.height,false);
    draw(true);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (visible) wake();
  }, { threshold: .001 });
  const onVisibility = () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    if (!document.hidden) wake();
  };
  const onContextLost = event => { event.preventDefault(); container.dataset.sceneState = 'context-lost'; if (raf) cancelAnimationFrame(raf); raf = 0; };
  const onContextRestored = () => { if (!disposed) { container.dataset.sceneState = 'ready'; resize(); wake(); } };
  canvas.addEventListener('webglcontextlost',onContextLost);
  canvas.addEventListener('webglcontextrestored',onContextRestored);
  document.addEventListener('visibilitychange',onVisibility);
  observer.observe(container);
  container.append(canvas); resize();
  container.dataset.sceneState = 'ready';
  container.dataset.sceneKind = 'illustrative-scroll-animation';
  container.dataset.sceneExploring = 'false';
  return {
    setProgress(value) { destination = clamp(Number.isFinite(value) ? value : 0); if (exploring) return; if (reduced) { progress = destination; draw(true); } else wake(); },
    setPaused(value) { paused = Boolean(value); if (paused && raf) { cancelAnimationFrame(raf); raf = 0; } if (!paused) wake(); },
    setReducedMotion(value) { reduced = Boolean(value); if (raf) { cancelAnimationFrame(raf); raf = 0; } if (reduced && !exploring) progress = destination; draw(true); if (!reduced) wake(); },
    setExplore,
    resize,
    getState() { return { progress, targetProgress: destination, phase, paused, reduced, exploring, orbitalProgress, groundProgress, launchProgress, transition, world, worldVisibility: {orbit:orbitalWorld.visible,ground:ground.group.visible,launch:launch.group.visible}, ground: {...ground.getState(),visible:ground.group.visible}, launch: {...launch.getState(),visible:launch.group.visible}, population: {...population.getState(),visible:orbitalWorld.visible&&population.group.visible}, targetAngle, magnetAngle, braking, fleetVisible: fleet.filter(item => item.opacity > .1).length, fleet: fleet.map(item => ({variant:item.variant,opacity:item.opacity,visible:orbitalWorld.visible&&item.group.visible,position:item.group.position.toArray()})), targetQuaternion: target.quaternion.toArray(), camera: camera.position.toArray(), focus: (exploring ? controls.target : lookAt).toArray(), magnetPosition: tip.toArray(), targetPosition: target.position.toArray(), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, viewport: size }; },
    dispose() {
      if (disposed) return; disposed = true; if (raf) cancelAnimationFrame(raf);
      observer.disconnect(); document.removeEventListener('visibilitychange',onVisibility);
      controls.removeEventListener('change',onExploreChange); controls.dispose();
      document.removeEventListener('keydown',onExploreKey);
      canvas.removeEventListener('webglcontextlost',onContextLost); canvas.removeEventListener('webglcontextrestored',onContextRestored);
      disposeScene(scene,renderer,environment); container.dataset.sceneState = 'disposed';
    },
  };
}

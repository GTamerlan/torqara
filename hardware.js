import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';

/** Homepage concept geometry only. No dynamics, braking or tracking model. */
export function mountHardware() {
  const canvas = document.getElementById('hardware-canvas');
  const stage = document.getElementById('hardware-stage');
  if (!canvas || !stage || canvas.dataset.hardwareMounted === 'true') return null;
  canvas.dataset.hardwareMounted = 'true';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    stage.dataset.ready = 'false';
    stage.dataset.hardwareError = 'webgl-unavailable';
    const fallback = document.createElement('p');
    fallback.textContent = 'Hardware concept preview unavailable on this device.';
    fallback.className = 'hardware-fallback';
    stage.appendChild(fallback);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.48;
  controls.zoomSpeed = 0.55;
  controls.minDistance = 5.8;
  controls.maxDistance = 16;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = Math.PI * 0.7;
  canvas.style.touchAction = 'pan-y';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Concept hardware assembly. Drag to orbit; click then scroll to zoom. Illustrative geometry only.');

  const resources = [];
  let seed = 83127;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const makeCanvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
  const texture = (element, color = false) => {
    const result = new THREE.CanvasTexture(element);
    if (color) result.colorSpace = THREE.SRGBColorSpace;
    resources.push(result);
    return result;
  };

  // Broad softboxes become reflections on the metal, without external assets.
  const environmentCanvas = makeCanvas(1024, 512);
  const ec = environmentCanvas.getContext('2d');
  const wash = ec.createLinearGradient(0, 0, 0, 512);
  wash.addColorStop(0, '#6c7278'); wash.addColorStop(0.47, '#20252b'); wash.addColorStop(0.6, '#070b10'); wash.addColorStop(1, '#25211e');
  ec.fillStyle = wash; ec.fillRect(0, 0, 1024, 512);
  const softbox = (x, y, w, h, rgb) => {
    const gradient = ec.createRadialGradient(x, y, 0, x, y, w);
    gradient.addColorStop(0, `rgba(${rgb},.96)`);
    gradient.addColorStop(0.35, `rgba(${rgb},.6)`);
    gradient.addColorStop(1, `rgba(${rgb},0)`);
    ec.save(); ec.translate(0, y); ec.scale(1, h / w); ec.translate(0, -y);
    ec.fillStyle = gradient; ec.fillRect(x - w, y - w, w * 2, w * 2); ec.restore();
  };
  softbox(180, 165, 160, 90, '242,248,255');
  softbox(690, 180, 110, 180, '195,214,230');
  ec.fillStyle = '#d5dce0'; ec.fillRect(820, 100, 21, 245);
  ec.fillStyle = '#6b7f8e'; ec.fillRect(410, 220, 70, 58);
  const environment = texture(environmentCanvas, true);
  environment.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentTarget = pmrem.fromEquirectangular(environment);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = 1.4;
  pmrem.dispose();

  const brushedCanvas = makeCanvas(128, 512);
  const bc = brushedCanvas.getContext('2d');
  bc.fillStyle = '#9e9e9e'; bc.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y++) {
    const shade = Math.round(135 + random() * 55);
    bc.fillStyle = `rgb(${shade},${shade},${shade})`;
    bc.fillRect(0, y, 128, 1);
  }
  const brushing = texture(brushedCanvas);
  brushing.wrapS = brushing.wrapT = THREE.RepeatWrapping;
  brushing.repeat.set(2, 3);
  brushing.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced0, metalness: 0.93, roughness: 0.28, roughnessMap: brushing });
  const brightMetal = new THREE.MeshStandardMaterial({ color: 0xe1e2da, metalness: 0.92, roughness: 0.19 });
  const satin = new THREE.MeshStandardMaterial({ color: 0x919b9e, metalness: 0.85, roughness: 0.37 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x222a31, metalness: 0.7, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0a1017, metalness: 0.25, roughness: 0.5 });
  const ivory = new THREE.MeshStandardMaterial({ color: 0xd1cbbd, metalness: 0.42, roughness: 0.4 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x7e929e, metalness: 0.88, roughness: 0.3 });
  const foil = new THREE.MeshStandardMaterial({ color: 0x84704e, metalness: 0.87, roughness: 0.45 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x182b35, metalness: 0.55, roughness: 0.1, clearcoat: 1 });
  const beacon = new THREE.MeshBasicMaterial({ color: 0xa6ccba });
  const root = new THREE.Group(); scene.add(root);
  const mesh = (geometry, material, parent = root, position = [0, 0, 0]) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.fromArray(position); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  };
  const box = (size, material, parent, position) => mesh(new THREE.BoxGeometry(...size), material, parent, position);
  const rounded = (w, h, d, material, parent, position, radius = 0.06) => {
    const r = Math.min(radius, w / 4, h / 4, d / 3), x = -w / 2, y = -h / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
    shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - r, bevelEnabled: true, bevelSize: r / 2, bevelThickness: r / 2, bevelSegments: 3, curveSegments: 6 });
    geometry.translate(0, 0, -d / 2 + r / 2);
    return mesh(geometry, material, parent, position);
  };
  const cylinder = (radius, length, material, parent, position, axis = 'y', radial = 48) => {
    const object = mesh(new THREE.CylinderGeometry(radius, radius, length, radial), material, parent, position);
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    return object;
  };
  const ring = (radius, tube, material, parent, position, axis = 'y') => {
    const object = mesh(new THREE.TorusGeometry(radius, tube, 8, 64), material, parent, position);
    if (axis === 'y') object.rotation.x = Math.PI / 2;
    if (axis === 'x') object.rotation.y = Math.PI / 2;
    return object;
  };
  const bar = (a, b, width, depth, material, parent = root) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const object = box([width, delta.length(), depth], material, parent, start.clone().add(end).multiplyScalar(0.5).toArray());
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  };
  const pipe = (points, radius, material, parent = root) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 30, radius, 7, false), material, parent);
  const screwGeometry = new THREE.CylinderGeometry(0.026, 0.026, 0.018, 12);
  const screw = (parent, x, y, z) => {
    const head = mesh(screwGeometry, graphite, parent, [x, y, z]); head.rotation.x = Math.PI / 2; head.castShadow = false;
    const slot = box([0.025, 0.004, 0.002], satin, parent, [x, y, z + 0.01]); slot.rotation.z = Math.PI / 4; slot.castShadow = false;
  };
  const decal = (text, width, height, foreground, background = 'transparent') => {
    const c = makeCanvas(512, 128), ctx = c.getContext('2d');
    if (background !== 'transparent') { ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128); }
    ctx.fillStyle = foreground; ctx.font = '600 76px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 66);
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture(c, true), transparent: true, depthWrite: false }));
  };

  // A compact service craft gives the arm an intelligible mechanical root.
  const craft = new THREE.Group(); craft.position.set(-2.57, -0.72, -0.1); root.add(craft);
  rounded(1.72, 1.05, 1.25, graphite, craft, [0, 0, 0], 0.09);
  rounded(1.57, 0.9, 0.055, ivory, craft, [0, 0, 0.66], 0.035);
  box([1.49, 0.2, 0.04], graphite, craft, [0, -0.21, 0.705]);
  for (let i = 0; i < 13; i++) box([0.058, 0.13, 0.018], dark, craft, [-0.65 + i * 0.109, -0.21, 0.733]);
  const brand = decal('TORQARA', 0.83, 0.2, '#293139'); brand.position.set(-0.16, 0.15, 0.7); craft.add(brand);
  for (const x of [-0.71, 0.71]) for (const y of [-0.36, 0.36]) screw(craft, x, y, 0.71);
  box([1.37, 0.04, 1.02], foil, craft, [0, 0.555, -0.02]);
  for (const x of [-0.63, 0.63]) box([0.07, 0.055, 1.03], metal, craft, [x, 0.585, -0.02]);
  for (let i = 0; i < 7; i++) box([1.2, 0.008, 0.025], satin, craft, [0, 0.585, -0.43 + i * 0.14]);
  for (const x of [-0.75, 0.75]) {
    cylinder(0.15, 0.13, satin, craft, [x, -0.58, 0.17]);
    mesh(new THREE.CylinderGeometry(0.08, 0.17, 0.2, 32), graphite, craft, [x, -0.73, 0.17]);
    cylinder(0.064, 0.012, dark, craft, [x, -0.84, 0.17]);
  }
  // Two small radiator / array wings, subdued so the working hardware leads.
  for (const side of [-1, 1]) {
    const panel = new THREE.Group(); panel.position.set(side * 1.08, -0.04, -0.5); panel.rotation.y = side * 0.2; craft.add(panel);
    bar([0, 0, 0], [side * 0.65, 0, 0], 0.05, 0.06, satin, panel);
    const wing = box([0.64, 0.76, 0.055], graphite, panel, [side * 0.43, 0, 0]);
    for (let x = 0; x < 3; x++) for (let y = 0; y < 4; y++) {
      box([0.173, 0.153, 0.012], glass, panel, [side * 0.43 - 0.2 + x * 0.2, -0.268 + y * 0.18, 0.036]);
    }
    wing.castShadow = false;
  }
  // Base camera: a real lens assembly, without a claimed perception system.
  const cameraPod = new THREE.Group(); cameraPod.position.set(0.64, 0.36, 0.68); cameraPod.rotation.y = 0.35; craft.add(cameraPod);
  rounded(0.38, 0.3, 0.25, graphite, cameraPod, [0, 0, 0]);
  cylinder(0.105, 0.14, satin, cameraPod, [0, 0, 0.19], 'z');
  cylinder(0.083, 0.015, dark, cameraPod, [0, 0, 0.267], 'z');
  cylinder(0.061, 0.018, glass, cameraPod, [0, 0, 0.28], 'z');
  cylinder(0.014, 0.012, beacon, cameraPod, [0.145, 0.07, 0.14], 'z', 16);

  // Two structural links, independent joint housings, wiring and motor flange.
  const shoulder = [-2.14, 0.14, 0.05], elbow = [-1.37, 1.62, 0.02], wrist = [0.16, 1.16, 0.04];
  cylinder(0.34, 0.14, metal, root, [-2.14, -0.08, 0.05]);
  cylinder(0.26, 0.21, graphite, root, [-2.14, 0.03, 0.05]);
  const joint = (point, radius) => {
    cylinder(radius, 0.41, graphite, root, point, 'z');
    cylinder(radius * 0.9, 0.045, brightMetal, root, [point[0], point[1], point[2] + 0.225], 'z');
    cylinder(radius * 0.59, 0.055, copper, root, [point[0], point[1], point[2] + 0.255], 'z');
    cylinder(radius * 0.37, 0.064, graphite, root, [point[0], point[1], point[2] + 0.286], 'z');
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; screw(root, point[0] + Math.cos(a) * radius * 0.74, point[1] + Math.sin(a) * radius * 0.74, point[2] + 0.254); }
  };
  const link = (a, b, width) => {
    bar(a, b, width, 0.27, graphite);
    for (const side of [-1, 1]) bar([a[0], a[1], a[2] + side * 0.18], [b[0], b[1], b[2] + side * 0.18], width * 0.78, 0.07, ivory);
    const aa = new THREE.Vector3(...a), bb = new THREE.Vector3(...b);
    for (const t of [0.25, 0.72]) {
      const p = aa.clone().lerp(bb, t); const band = box([width + 0.035, 0.075, 0.46], metal, root, p.toArray());
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bb.clone().sub(aa).normalize());
    }
  };
  link(shoulder, elbow, 0.26); link(elbow, wrist, 0.23);
  joint(shoulder, 0.27); joint(elbow, 0.25); joint(wrist, 0.2);
  pipe([[-2.3, 0.1, -0.16], [-2.16, 0.6, -0.19], [-1.67, 1.51, -0.2], [-1.38, 1.79, -0.17], [-0.82, 1.58, -0.18], [0.04, 1.32, -0.15]], 0.034, dark);
  pipe([[-2.29, 0.13, -0.2], [-1.97, 0.82, -0.22], [-1.57, 1.5, -0.23], [-1.34, 1.7, -0.21], [-0.69, 1.43, -0.22], [0.11, 1.28, -0.19]], 0.011, copper);

  const motor = new THREE.Group(); motor.position.set(0.39, 1.16, 0.04); root.add(motor);
  rounded(0.32, 0.5, 0.48, graphite, motor, [-0.08, 0, 0], 0.045);
  cylinder(0.23, 0.5, metal, motor, [0.17, 0, 0], 'x');
  for (let i = 0; i < 7; i++) ring(0.235, 0.014, graphite, motor, [-0.02 + i * 0.062, 0, 0], 'x');
  cylinder(0.26, 0.075, brightMetal, motor, [0.43, 0, 0], 'x');
  cylinder(0.115, 0.1, graphite, motor, [0.49, 0, 0], 'x');
  cylinder(0.061, 0.28, brightMetal, motor, [0.64, 0, 0], 'x');
  ring(0.078, 0.018, copper, motor, [0.61, 0, 0], 'x');
  box([0.22, 0.08, 0.15], dark, motor, [0.04, 0.265, 0]);
  pipe([[0.04, 0.3, 0], [-0.19, 0.3, -0.1], [-0.27, 0.18, -0.18]], 0.021, dark, motor);
  // Shaft = X; permanent dipole = Y. This bar is transverse, never axial.
  const magnet = new THREE.Group(); magnet.position.set(0.81, 0, 0); motor.add(magnet);
  rounded(0.17, 0.82, 0.37, brightMetal, magnet, [0, 0, 0], 0.024);
  rounded(0.176, 0.27, 0.376, copper, magnet, [0, 0.276, 0], 0.015);
  rounded(0.176, 0.27, 0.376, ivory, magnet, [0, -0.276, 0], 0.015);
  box([0.19, 0.095, 0.395], graphite, magnet, [0, 0, 0]);
  for (const [letter, y, color] of [['N', 0.278, '#f0e9d9'], ['S', -0.278, '#31343a']]) {
    const mark = decal(letter, 0.13, 0.12, color); mark.position.set(0, y, 0.195); magnet.add(mark);
  }

  // A separate conductive canister: bare metal, end rings, seams and fittings.
  const target = new THREE.Group(); target.position.set(2.48, 0.54, -0.1); target.rotation.set(0.23, -0.22, -0.19); root.add(target);
  cylinder(0.79, 1.57, metal, target, [0, 0, 0], 'y', 96);
  for (const y of [-0.74, -0.63, 0.64, 0.75]) ring(0.79, y === 0.75 || y === -0.74 ? 0.035 : 0.016, y > 0.7 ? brightMetal : satin, target, [0, y, 0]);
  cylinder(0.75, 0.04, satin, target, [0, 0.8, 0]);
  cylinder(0.62, 0.055, brightMetal, target, [0, 0.83, 0]);
  cylinder(0.31, 0.07, graphite, target, [0, 0.88, 0]);
  cylinder(0.18, 0.11, metal, target, [0, 0.94, 0]);
  cylinder(0.08, 0.018, dark, target, [0, 1.005, 0]);
  cylinder(0.72, 0.035, graphite, target, [0, -0.81, 0]);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6, x = Math.sin(angle), z = Math.cos(angle);
    const seam = box([0.012, 1.27, 0.008], graphite, target, [x * 0.794, 0, z * 0.794]); seam.rotation.y = angle;
    const head = cylinder(0.027, 0.018, graphite, target, [x * 0.66, 0.87, z * 0.66], 'y', 12); head.castShadow = false;
  }
  const hatch = new THREE.Group(); hatch.position.set(0, -0.09, 0.79); target.add(hatch);
  rounded(0.39, 0.51, 0.026, satin, hatch, [0, 0, 0], 0.025);
  rounded(0.29, 0.39, 0.018, brightMetal, hatch, [0, 0, 0.026], 0.015);
  for (const x of [-0.145, 0.145]) for (const y of [-0.2, 0.2]) screw(hatch, x, y, 0.046);
  for (const y of [-0.45, 0.43]) {
    const strap = mesh(new THREE.CylinderGeometry(0.798, 0.798, 0.045, 96, 1, true), copper, target, [0, y, 0]); strap.castShadow = false;
  }
  for (const x of [-0.58, 0.58]) {
    box([0.13, 0.21, 0.18], graphite, target, [x, 0.85, -0.22]);
    cylinder(0.036, 0.1, brightMetal, target, [x, 1.0, -0.22]);
  }

  const key = new THREE.DirectionalLight(0xf3f7ff, 4.8); key.position.set(-3, 6, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 5; key.shadow.camera.bottom = -4; key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
  key.shadow.normalBias = 0.025; key.shadow.bias = -0.0001; scene.add(key);
  const rim = new THREE.DirectionalLight(0xa7c7e1, 3.0); rim.position.set(2, 3, -5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc0d4e1, 1.0); fill.position.set(5, -1, 4); scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xc1d0df, 0x181511, 1.15));

  const stars = new Float32Array(100 * 3);
  for (let i = 0; i < stars.length; i += 3) { stars[i] = (random() - 0.5) * 32; stars[i + 1] = (random() - 0.5) * 21; stars[i + 2] = -7 - random() * 12; }
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  const starfield = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc6d0d6, size: 0.022, transparent: true, opacity: 0.48, depthWrite: false })); scene.add(starfield);

  // A faint decorative Earth horizon supplies orbital context, not orbit data.
  const earthCanvas = makeCanvas(2048, 1024), earthContext = earthCanvas.getContext('2d');
  const earthX = 1300, earthY = 2280, earthRadius = 1610;
  const earthWash = earthContext.createRadialGradient(earthX, earthY, earthRadius * 0.68, earthX, earthY, earthRadius);
  earthWash.addColorStop(0, 'rgba(4,10,17,.04)');
  earthWash.addColorStop(0.94, 'rgba(9,23,35,.31)');
  earthWash.addColorStop(1, 'rgba(27,47,61,.35)');
  earthContext.fillStyle = earthWash;
  earthContext.beginPath(); earthContext.arc(earthX, earthY, earthRadius, 0, Math.PI * 2); earthContext.fill();
  for (const [width, opacity] of [[34, .012], [16, .025], [6, .055], [2, .12]]) {
    earthContext.strokeStyle = `rgba(151,181,200,${opacity})`; earthContext.lineWidth = width;
    earthContext.beginPath(); earthContext.arc(earthX, earthY, earthRadius, Math.PI, Math.PI * 2); earthContext.stroke();
  }
  const earthLimb = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture(earthCanvas, true), transparent: true, depthWrite: false, toneMapped: false }));
  earthLimb.position.z = -50; earthLimb.renderOrder = -10; camera.add(earthLimb); scene.add(camera);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let interacted = false, visible = true, disposed = false, frame = 0, renderedFrames = 0;
  const initialCamera = new THREE.Vector3();
  const render = () => { if (!disposed) { renderer.render(scene, camera); renderedFrames++; } };
  // Wheel zoom updates the camera inside OrbitControls' event handler.
  // Render that change immediately, even when the next update reports no change.
  controls.addEventListener('change', render);
  const resize = () => {
    const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height;
    if (!interacted) {
      const narrow = width / height < 1.05;
      controls.target.set(narrow ? -0.1 : -1.0, narrow ? 0.5 : 0.05, 0);
      camera.position.set(narrow ? 6.0 : 5.8, narrow ? 3.6 : 3.25, narrow ? 13.0 : 10.8);
      camera.fov = narrow ? 39 : 32;
      if (width / height < 0.7) camera.position.multiplyScalar(1.16);
      initialCamera.copy(camera.position);
    }
    const backgroundHeight = 100 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    earthLimb.scale.set(backgroundHeight * camera.aspect, backgroundHeight, 1);
    camera.updateProjectionMatrix(); controls.update(); render();
  };
  const activate = () => { interacted = true; controls.enableZoom = true; };
  const leave = () => { if (document.activeElement !== canvas) controls.enableZoom = false; };
  const blur = () => { controls.enableZoom = false; };
  canvas.addEventListener('pointerdown', activate);
  canvas.addEventListener('focus', activate);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('blur', blur);
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; if (visible) render(); }, { rootMargin: '100px' });
  visibilityObserver.observe(stage);
  const startTime = performance.now();
  const animate = now => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    if (!visible || document.hidden) return;
    const drift = !reducedMotion.matches && !interacted;
    if (drift) {
      const time = (now - startTime) / 1000;
      camera.position.copy(initialCamera);
      camera.position.x += Math.sin(time * 0.13) * 0.065;
      camera.position.y += Math.sin(time * 0.1) * 0.035;
      camera.lookAt(controls.target);
    }
    const changed = controls.update();
    if (drift && !changed) render();
  };
  resize();
  stage.dataset.ready = canvas.dataset.ready = 'true';
  stage.dataset.hardwareModel = 'illustrative-static-geometry';
  frame = requestAnimationFrame(animate);
  const api = {
    getState: () => ({ ready: !disposed, renderedFrames, reducedMotion: reducedMotion.matches, interacted,
      model: 'illustrative-static-geometry', width: canvas.width, height: canvas.height }),
    dispose() {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); visibilityObserver.disconnect(); controls.removeEventListener('change', render); controls.dispose();
      canvas.removeEventListener('pointerdown', activate); canvas.removeEventListener('focus', activate);
      canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('blur', blur);
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); resources.forEach(t => t.dispose()); environmentTarget.dispose(); renderer.dispose();
      stage.dataset.ready = canvas.dataset.ready = 'false'; delete canvas.dataset.hardwareMounted;
    },
  };
  window.torqaraHardware = api;
  return api;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountHardware, { once: true });
else mountHardware();

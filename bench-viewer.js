/**
 * Vyper Space: the bench rig in 3D, for bench-test.html.
 * Geometry: the bench rig CAD (rev 0.2), made light for the web; the parts sealed inside the magnet head are left out.
 * "Run the test" plays a simple simulated spin-down to show what the rig is for. It is not a measurement.
 */
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GLOW = new THREE.Color('#9fd6ff');
const CREASE = Math.cos(THREE.MathUtils.degToRad(38));
const FLY_MS = REDUCED ? 0 : 950;
const GLOW_MAX = 0.3;
const DIM = 0.42;      // how much the other tested parts darken while one point is chosen
const GHOST = 0.9;     // how far the frame fades while a point is chosen or the test runs

// Each view: the point the camera looks at (a place, or a test point moved part of the way toward the centre),
// the direction it looks from, and how far away it sits (metres).
const VIEWS = {
  home: { target: [0.04, 0.46, -0.04], dir: [0.6, 0.4, 0.69], dist: 3.75 },
  braking: { target: ['braking', 0.5], dir: [0.45, 0.32, 0.83], dist: 0.84 },
  gap: { target: ['gap', 0.35], dir: [0.4, 0.55, 0.73], dist: 1.0 },
  angle: { target: [0.04, 0.47, -0.08], dir: [0.86, 0.36, 0.36], dist: 2.55 },
  tumble: { target: ['tumble', 0], dir: [0.36, 0.32, 0.88], dist: 1.2 },
  rate: { target: ['rate', 0.3], dir: [0.83, 0.41, 0.39], dist: 0.8 },
  track: { target: ['track', 0.55], dir: [-0.28, 0.55, 0.79], dist: 1.2 },
  run: { target: ['braking', 0.6], dir: [0.4, 0.34, 0.85], dist: 1.5 },
};

// The simulated run, in seconds and radians per second.
const TUMBLE = { outer: 2.4, middle: 1.7, inner: 3.1 };
const ROTOR = 15;
const RAMP = 1.2, MAGNET_AT = 2.4, BRAKE_AT = 3.4, TAU = 1.55;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);

/** Non-indexed geometry with normals smoothed only across edges flatter than the crease angle. */
function creased(geometry) {
  const pos = geometry.attributes.position;
  const n = pos.count;
  const v = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v[3 * i] = pos.getX(i); v[3 * i + 1] = pos.getY(i); v[3 * i + 2] = pos.getZ(i); }
  const idx = geometry.index ? geometry.index.array : Uint32Array.from({ length: n }, (_, i) => i);
  const fc = idx.length / 3;
  const fu = new Float32Array(fc * 3); // unit face normals
  const fw = new Float32Array(fc * 3); // area-weighted face normals
  for (let f = 0; f < fc; f++) {
    const a = 3 * idx[3 * f], b = 3 * idx[3 * f + 1], c = 3 * idx[3 * f + 2];
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    fw[3 * f] = nx; fw[3 * f + 1] = ny; fw[3 * f + 2] = nz;
    fu[3 * f] = nx / len; fu[3 * f + 1] = ny / len; fu[3 * f + 2] = nz / len;
  }
  const start = new Uint32Array(n + 1);
  for (let k = 0; k < idx.length; k++) start[idx[k] + 1]++;
  for (let i = 0; i < n; i++) start[i + 1] += start[i];
  const fill = start.slice(0, n);
  const adj = new Uint32Array(idx.length);
  for (let k = 0; k < idx.length; k++) adj[fill[idx[k]]++] = (k / 3) | 0;
  const P = new Float32Array(fc * 9), N = new Float32Array(fc * 9);
  for (let f = 0; f < fc; f++) {
    const fx = fu[3 * f], fy = fu[3 * f + 1], fz = fu[3 * f + 2];
    for (let j = 0; j < 3; j++) {
      const vi = idx[3 * f + j], o = 9 * f + 3 * j;
      let sx = 0, sy = 0, sz = 0;
      for (let k = start[vi]; k < start[vi + 1]; k++) {
        const g = adj[k];
        if (fu[3 * g] * fx + fu[3 * g + 1] * fy + fu[3 * g + 2] * fz >= CREASE) {
          sx += fw[3 * g]; sy += fw[3 * g + 1]; sz += fw[3 * g + 2];
        }
      }
      const l = Math.hypot(sx, sy, sz) || 1;
      N[o] = sx / l; N[o + 1] = sy / l; N[o + 2] = sz / l;
      P[o] = v[3 * vi]; P[o + 1] = v[3 * vi + 1]; P[o + 2] = v[3 * vi + 2];
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

function tune(material) {
  const m = material.clone();
  const name = (material.name || '').toLowerCase();
  m.metalness = 0; m.roughness = 0.62;
  if (/stainless|steel/.test(name)) { m.metalness = 0.9; m.roughness = 0.3; }
  else if (/aluminium/.test(name)) {
    if (/natural|silver/.test(name)) { m.metalness = 0.82; m.roughness = 0.33; }
    else if (/blue/.test(name)) { m.metalness = 0.55; m.roughness = 0.36; }
    else { m.metalness = 0.5; m.roughness = 0.44; }
  } else if (/^metal/.test(name)) { m.metalness = 0.6; m.roughness = 0.4; }
  else if (/rubber/.test(name)) m.roughness = 0.88;
  else if (/g10|fr4/.test(name)) m.roughness = 0.5;
  else if (/polycarbonate/.test(name)) {
    m.transparent = true; m.opacity = 0.22; m.roughness = 0.08; m.depthWrite = false; m.side = THREE.DoubleSide;
  }
  m.emissive = GLOW.clone();
  m.emissiveIntensity = 0;
  return m;
}

function floorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(0,0,0,0.62)');
  r.addColorStop(0.45, 'rgba(0,0,0,0.38)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch { return false; }
}

async function mount(root) {
  if (root.dataset.bvMounted) return;
  root.dataset.bvMounted = 'true';
  const stage = root.querySelector('.bv-stage');
  const layer = root.querySelector('.bv-markers');
  const status = root.querySelector('.bv-status');
  const phaseEl = root.querySelector('.bv-phase');
  const meter = root.querySelector('.bv-meter span');
  const runBtn = root.querySelector('[data-bv-run]');
  const resetBtn = root.querySelector('[data-bv-reset]');
  const items = [...root.querySelectorAll('[data-point]')];

  if (!webglOK()) { root.dataset.state = 'error'; status.textContent = ''; return; }

  // loop state (declared first: resize() and flyTo() wake the loop)
  let raf = 0, last = 0, frame = 0, idleUntil = 0, visible = true;
  let W = 0, H = 0;
  let fly = null;
  let active = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.className = 'bv-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The bench rig in 3D, from our CAD. Drag to turn it, pinch or scroll to zoom.');
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe2efff, 0x0a0f16, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-1.1, 3.3, 1.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.05, right: 1.05, top: 1.05, bottom: -1.05, near: 1.2, far: 7 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.012;
  key.target.position.set(0, 0.45, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xb3d1ff, 0.75);
  rim.position.set(2.0, 1.5, -2.4);
  scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64),
    new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.032;
  floor.renderOrder = -1;
  scene.add(floor);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.26 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.029;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 40);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.3;
  controls.maxDistance = 4.6;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.autoRotate = !REDUCED;
  controls.autoRotateSpeed = 0.5;
  controls.enabled = false;
  canvas.style.touchAction = 'pan-y';

  // ----- load -----
  root.dataset.state = 'loading';
  status.textContent = 'Loading the model';
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(root.dataset.src, (e) => {
      if (e.lengthComputable && e.total) status.textContent = `Loading the model ${Math.round((100 * e.loaded) / e.total)}%`;
    });
  } catch (err) {
    root.dataset.state = 'error';
    status.textContent = '';
    renderer.dispose();
    canvas.remove();
    return;
  }
  const model = gltf.scene;
  const info = model.userData || {};
  const V = (a) => new THREE.Vector3().fromArray(a);
  const centre = V(info.centre || [0, 0.49, 0]);

  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const m of meshes) {
    const old = m.geometry;
    m.geometry = creased(old);
    old.dispose();
    m.material = tune(m.material);
    m.userData.tp = m.userData.tp || 'frame';
    m.userData.kin = m.userData.kin || 'static';
    m.userData.glow = 0;
    m.userData.fade = 0;
    m.userData.base = m.material.color.clone();
    m.userData.opacity = m.material.opacity;
    if (m.userData.tp === 'frame') m.material.transparent = true;
    m.castShadow = true;
    // the control box stays clean: the arc's shadow on its face reads as a stain
    m.receiveShadow = !(m.userData.parts || []).some((n) => String(n).startsWith('control-box'));
  }
  scene.add(model);
  model.updateMatrixWorld(true);

  // gimbal and rotor pivots (the CAD's pose is their zero)
  const pivot = (parent, point) => {
    const g = new THREE.Group();
    parent.add(g);
    g.position.copy(parent === model ? point : new THREE.Vector3());
    g.updateMatrixWorld(true);
    return g;
  };
  const outer = pivot(model, centre);
  const middle = pivot(outer, centre);
  const inner = pivot(middle, centre);
  const rotor = pivot(model, V(info.rotorPoint || [0, 0, 0]));
  const piv = { gout: outer, gmid: middle, gbox: inner, rotor };
  for (const m of meshes) if (piv[m.userData.kin]) piv[m.userData.kin].attach(m);
  const axes = {
    outer: V(info.outerAxis || [0, 1, 0]).normalize(),
    middle: V(info.middleAxis || [1, 0, 0]).normalize(),
    inner: V(info.innerAxis || [0, 0, 1]).normalize(),
    rotor: V(info.rotorAxis || [1, 0, 0]).normalize(),
  };

  // anchors for the numbered points; 'rate' rides on the middle ring
  const anchors = {};
  for (const [id, a] of Object.entries(info.anchors || {})) {
    const kin = (info.anchorKin || {})[id];
    const host = kin && piv[kin] ? piv[kin] : null;
    const w = V(a);
    anchors[id] = { host, local: host ? host.worldToLocal(w.clone()) : w };
  }
  const anchorWorld = (id, out = new THREE.Vector3()) => {
    const a = anchors[id];
    if (!a) return out.copy(centre);
    return a.host ? a.host.localToWorld(out.copy(a.local)) : out.copy(a.local);
  };

  // ----- markers -----
  const markers = items.map((btn) => {
    const id = btn.dataset.point;
    const mk = document.createElement('button');
    mk.type = 'button';
    mk.className = 'bv-marker';
    mk.tabIndex = -1;
    mk.dataset.point = id;
    mk.textContent = btn.querySelector('.bv-n')?.textContent || '';
    mk.addEventListener('click', () => select(id));
    layer.append(mk);
    return { id, el: mk, behind: false };
  });

  // ----- views -----
  const tmp = new THREE.Vector3();
  function viewFor(name) {
    const v = VIEWS[name] || VIEWS.home;
    const target = typeof v.target[0] === 'number'
      ? V(v.target)
      : anchorWorld(v.target[0], new THREE.Vector3()).lerp(centre, v.target[1]);
    const pos = target.clone().addScaledVector(V(v.dir).normalize(), v.dist * fitScale());
    return { target, pos };
  }
  function fitScale() {
    // a stage narrower than square moves the camera back, so the rig keeps its width in frame
    const a = camera.aspect || 1;
    return a >= 0.95 ? 1 : 0.95 / a;
  }

  function flyTo(name) {
    const { target, pos } = viewFor(name);
    if (!FLY_MS) {
      camera.position.copy(pos); controls.target.copy(target); controls.update(); wake(); return;
    }
    fly = { t0: performance.now(), p0: camera.position.clone(), q0: controls.target.clone(), p1: pos, q1: target };
    wake();
  }

  // ----- selection -----
  function select(id) {
    if (active === id) id = null;
    active = id;
    controls.autoRotate = false;
    for (const btn of items) btn.setAttribute('aria-pressed', String(btn.dataset.point === id));
    for (const m of markers) m.el.classList.toggle('is-active', m.id === id);
    root.dataset.active = id || '';
    if (!sim.on) setPhase('');
    flyTo(id || 'home');
    wake();
  }
  items.forEach((btn) => btn.addEventListener('click', () => select(btn.dataset.point)));
  resetBtn.addEventListener('click', () => { active = 'x'; select(null); });

  // ----- simulated run -----
  const sim = { on: false, t: 0, w: 0, r: 0, ao: 0, am: 0, ai: 0, ar: 0, phase: '' };
  function setPhase(p) {
    if (sim.phase === p) return;
    sim.phase = p;
    phaseEl.textContent = p;
    root.dataset.phase = p ? p.toLowerCase().replace(/\s+/g, '-') : '';
  }
  runBtn.addEventListener('click', () => {
    if (sim.on) { stopRun(); return; }
    sim.on = true; sim.t = 0;
    runBtn.textContent = 'Stop';
    root.dataset.running = 'true';
    controls.autoRotate = false;
    if (!active) flyTo('run');
    setPhase('Tumbling');
    wake();
  });
  function stopRun(done) {
    sim.on = false;
    runBtn.textContent = done ? 'Run again' : 'Run the test';
    root.dataset.running = '';
    if (!done) setPhase('');
  }
  function stepSim(dt) {
    const was = sim.on || sim.w > 0 || sim.r > 0;
    if (sim.on) {
      sim.t += dt;
      const t = sim.t;
      if (t < BRAKE_AT) sim.w = smooth(Math.min(1, t / RAMP));
      else sim.w *= Math.exp(-dt / TAU);
      sim.r = t < MAGNET_AT ? 0 : smooth(Math.min(1, (t - MAGNET_AT) / 0.8));
      if (t >= MAGNET_AT && t < BRAKE_AT) setPhase('Magnet on');
      else if (t >= BRAKE_AT && sim.w > 0.012) setPhase('Braking');
      if (t >= BRAKE_AT && sim.w <= 0.012) { sim.w = 0; setPhase('Stopped'); stopRun(true); }
    } else if (sim.r > 0) {
      sim.r = Math.max(0, sim.r - dt / 1.6);
    }
    if (!sim.on && sim.w > 0 && sim.phase !== 'Stopped') sim.w = Math.max(0, sim.w - dt * 1.5);
    sim.ao += TUMBLE.outer * sim.w * dt;
    sim.am += TUMBLE.middle * sim.w * dt;
    sim.ai += TUMBLE.inner * sim.w * dt;
    sim.ar += ROTOR * sim.r * dt;
    outer.quaternion.setFromAxisAngle(axes.outer, sim.ao);
    middle.quaternion.setFromAxisAngle(axes.middle, sim.am);
    inner.quaternion.setFromAxisAngle(axes.inner, sim.ai);
    rotor.quaternion.setFromAxisAngle(axes.rotor, sim.ar);
    if (was) renderer.shadowMap.needsUpdate = true;
    meter.style.transform = `scaleX(${sim.w.toFixed(3)})`;
    return sim.on || sim.w > 0 || sim.r > 0;
  }

  // ----- size -----
  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h || (w === W && h === H)) return;
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wake();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // ----- markers each frame -----
  const ray = new THREE.Raycaster();
  const solid = () => meshes.filter((m) => m.material.opacity > 0.5);
  let probe = 0;
  function placeMarkers(frame) {
    const showIds = new Set(items.map((b) => b.dataset.point));
    markers.forEach((m, i) => {
      if (!showIds.has(m.id)) return;
      const w = anchorWorld(m.id, tmp);
      const ndc = w.clone().project(camera);
      const off = ndc.z > 1 || Math.abs(ndc.x) > 1.02 || Math.abs(ndc.y) > 1.02;
      m.el.classList.toggle('is-off', off);
      if (off) return;
      const x = (ndc.x + 1) / 2 * W, y = (1 - ndc.y) / 2 * H;
      m.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (frame % 3 === 0 && probe % markers.length === i) {
        const d = w.distanceTo(camera.position);
        ray.set(camera.position, w.clone().sub(camera.position).normalize());
        ray.far = d;
        const hit = ray.intersectObjects(solid(), false)[0];
        m.behind = !!hit && hit.object.userData.tp !== m.id && hit.distance < d - 0.02;
        m.el.classList.toggle('is-behind', m.behind);
      }
    });
    if (frame % 3 === 0) probe++;
  }

  // ----- focus: the chosen point's parts light up, the other tested parts darken, the frame fades back -----
  const ease = (from, to, k) => (Math.abs(to - from) < 0.004 ? to : from + (to - from) * k);
  function stepFocus(dt) {
    let busy = false;
    const k = 1 - Math.exp(-dt * 9);
    const ghost = !!(active || sim.on || sim.phase);
    for (const m of meshes) {
      const tp = m.userData.tp;
      const wantGlow = active ? (tp === active ? 1 : 0) : (tp === 'braking' ? sim.r : 0);
      const wantFade = tp === 'frame' ? (ghost ? 1 : 0) : (active && tp !== active ? 1 : 0);
      if (m.userData.glow === wantGlow && m.userData.fade === wantFade) continue;
      const g = (m.userData.glow = ease(m.userData.glow, wantGlow, k));
      const f = (m.userData.fade = ease(m.userData.fade, wantFade, k));
      m.material.emissiveIntensity = g * GLOW_MAX;
      if (tp === 'frame') {
        const o = m.userData.opacity * (1 - GHOST * f);
        m.material.opacity = o;
        m.material.depthWrite = o > 0.97;
        const cast = f < 0.5;
        if (m.castShadow !== cast) { m.castShadow = cast; renderer.shadowMap.needsUpdate = true; }
      } else {
        m.material.color.copy(m.userData.base).multiplyScalar(1 - DIM * f);
      }
      busy = true;
    }
    return busy;
  }

  // ----- loop -----
  function wake() {
    idleUntil = performance.now() + 1500;
    if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame++;
    if (fly) {
      const k = Math.min(1, (now - fly.t0) / FLY_MS);
      const e = easeInOut(k);
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.q0, fly.q1, e);
      if (k >= 1) fly = null;
    }
    const moving = stepSim(dt);
    const glowing = stepFocus(REDUCED ? 1 : dt);
    controls.update(dt);
    renderer.render(scene, camera);
    placeMarkers(frame);
    const live = moving || glowing || fly || controls.autoRotate || now < idleUntil;
    if (live && visible) raf = requestAnimationFrame(tick);
  }
  controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; wake(); });
  controls.addEventListener('change', () => wake());
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) wake();
  }).observe(root);

  // first frame
  const home = viewFor('home');
  camera.position.copy(home.pos);
  controls.target.copy(home.target);
  controls.update();
  controls.enabled = true;
  runBtn.disabled = false;
  resetBtn.disabled = false;
  status.textContent = '';
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  placeMarkers(0);
  root.dataset.state = 'ready';
  wake();
}

function start() {
  for (const root of document.querySelectorAll('[data-bench-viewer]')) {
    const io = new IntersectionObserver((entries, obs) => {
      if (entries.some((e) => e.isIntersecting)) { obs.disconnect(); mount(root); }
    }, { rootMargin: '600px 0px' });
    io.observe(root);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();

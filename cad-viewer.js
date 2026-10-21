/**
 * Vyper Space — viewer for the supplied, proposed ground-test assembly.
 * Geometry is loaded unmodified from cad/glb in detumbler-arm-v2.
 * OCC -> glTF conversion is reversed exactly as in cad/source/render/render.html.
 * Replay applies the supplied Fusion trajectory to its documented as-built joint
 * axes. This file renders recorded poses; it does not solve physical dynamics.
 */
const ASSET_ROOT = new URL('./assets/viper/', import.meta.url);
const COMPONENTS = [
  'ARM_BASE', 'ARM_L1_TURRET', 'ARM_L2_UPPER', 'ARM_L3_FOREARM',
  'ARM_L4_FORK', 'ARM_L5_HEAD', 'ARM_L6_ROTOR', 'TARGET_STAND',
  'TARGET_YOKE', 'TARGET_RING', 'TARGET_BOX', 'CAMERA_MAST', 'CONTROLLER',
];
// From fusion/DetumblerArmV2/DetumblerArmV2.py. Coordinates in mm, CAD Z up.
const JOINTS = [
  ['J1 base yaw', 'ARM_L1_TURRET', 'ARM_BASE', [0, 0, 0], 'z'],
  ['J2 shoulder', 'ARM_L2_UPPER', 'ARM_L1_TURRET', [0, 0, 200], 'y'],
  ['J3 elbow', 'ARM_L3_FOREARM', 'ARM_L2_UPPER', [0, 0, 700], 'y'],
  ['J4 forearm roll', 'ARM_L4_FORK', 'ARM_L3_FOREARM', [0, 0, 700], 'x'],
  ['J5 wrist pitch', 'ARM_L5_HEAD', 'ARM_L4_FORK', [400, 0, 700], 'y'],
  ['Magnet spin', 'ARM_L6_ROTOR', 'ARM_L5_HEAD', [627, 0, 700], 'x'],
  ['Gimbal yaw', 'TARGET_YOKE', 'TARGET_STAND', [944, 0, 550], 'z'],
  ['Gimbal pitch', 'TARGET_RING', 'TARGET_YOKE', [944, 0, 550], 'y'],
  ['Gimbal roll', 'TARGET_BOX', 'TARGET_RING', [944, 0, 550], 'x'],
];

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}
function button(text, action) {
  const el = node('button', 'cad-button', text);
  el.type = 'button';
  el.dataset.cadAction = action;
  el.disabled = true;
  return el;
}
function timeLabel(value) {
  const seconds = Math.floor(Math.max(0, value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

async function mount(container) {
  if (container.dataset.cadMounted) return;
  container.dataset.cadMounted = 'true';
  container.dataset.cadState = 'poster';
  const replay = container.dataset.cadViewer === 'replay';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const image = node('img', 'cad-poster');
  image.src = container.dataset.poster || new URL('renders/v2_01_hero.png', ASSET_ROOT).href;
  image.alt = 'Supplied CAD render of the proposed Vyper Space ground-test arm and target assembly';
  image.decoding = 'async';
  image.fetchPriority = replay ? 'low' : 'high';
  const stage = node('div', 'cad-stage');
  const overlay = node('div', 'cad-overlay');
  const badge = node('span', 'cad-badge', replay ? 'SUPPLIED SIMULATION REPLAY' : 'PROPOSED GROUND-TEST CAD');
  const status = node('p', 'cad-status', 'Loading interactive CAD…');
  status.setAttribute('role', 'status');
  const controlsBar = node('div', 'cad-controls');
  controlsBar.setAttribute('aria-label', 'CAD view controls');
  const orbitButton = button('Pause orbit', 'orbit');
  const framingButton = button('Full assembly', 'framing');
  const resetButton = button('Reset view', 'reset');
  controlsBar.append(orbitButton, framingButton, resetButton);
  const hint = node('p', 'cad-hint', 'Drag to orbit · scroll or pinch to zoom');
  overlay.append(badge, status, hint, controlsBar);
  container.append(image, stage, overlay);

  let playButton, restartButton, slider, clock, phase;
  if (replay) {
    const transport = node('div', 'cad-transport');
    playButton = button('Play replay', 'play');
    restartButton = button('Restart', 'restart');
    const scrubLabel = node('label', 'cad-scrub-label');
    scrubLabel.append(node('span', 'cad-sr-only', 'Recorded simulation time'));
    slider = node('input', 'cad-scrubber');
    slider.type = 'range'; slider.min = '0'; slider.max = '180'; slider.step = '0.05'; slider.value = '0'; slider.disabled = true;
    scrubLabel.append(slider);
    clock = node('output', 'cad-clock', '0:00 / 3:00');
    clock.setAttribute('aria-label', 'Recorded simulation time');
    phase = node('span', 'cad-phase', 'Recorded standby');
    transport.append(playButton, restartButton, scrubLabel, clock, phase);
    container.append(transport);
  }

  let visible = false;
  let started = false;
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !started) {
      started = true;
      // Show the supplied poster for a paint before requesting the renderer.
      Promise.race([image.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 1500))])
        .then(() => requestAnimationFrame(() => requestAnimationFrame(start)));
    }
  }, { rootMargin: '120px 0px' });
  observer.observe(container);

  async function start() {
    let renderer;
    try {
      container.dataset.cadState = 'loading';
      const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }, { mergeGeometries }] = await Promise.all([
        import('./vendor/three.module.js'), import('./vendor/GLTFLoader.js'),
        import('./vendor/OrbitControls.js'), import('./vendor/RoomEnvironment.js'),
        import('./vendor/BufferGeometryUtils.js'),
      ]);
      const canvas = node('canvas', 'cad-canvas');
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', replay
        ? 'Interactive CAD replay of a supplied simulation. Drag to orbit, pinch to zoom. Arrow keys rotate, plus and minus zoom.'
        : 'Interactive supplied CAD assembly. Drag to orbit, pinch to zoom. Arrow keys rotate, plus and minus zoom.');
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.setClearColor(0x04070b, 0);
      stage.append(canvas);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 5, 30000);
      camera.up.set(0, 0, 1);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = false;
      controls.minDistance = 350;
      controls.maxDistance = 8500;
      controls.minPolarAngle = 0.1;
      controls.maxPolarAngle = Math.PI * 0.62;
      controls.autoRotateSpeed = 0.32;
      controls.autoRotate = !replay && !reducedMotion;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      room.dispose();
      pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xdce9ff, 0x30343e, 1.2));
      const key = new THREE.DirectionalLight(0xf7faff, 3.4);
      key.position.set(-900, -1600, 2000); scene.add(key);
      const rim = new THREE.DirectionalLight(0x91c8ff, 2.0);
      rim.position.set(1700, 700, 1700); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffe5c8, 1.1);
      fill.position.set(-1600, 1100, 700); scene.add(fill);
      // Undo OCC's Y-up conversion, leaving the documented mm / Z-up coordinates.
      const conversion = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
      const components = {};
      const loader = new GLTFLoader();
      let loaded = 0;
      await Promise.all(COMPONENTS.map(async name => {
        const gltf = await loader.loadAsync(new URL(`cad/${name}.glb`, ASSET_ROOT).href);
        const part = new THREE.Group();
        part.name = name; part.matrixAutoUpdate = false;
        const orientation = new THREE.Group();
        orientation.matrixAutoUpdate = false; orientation.matrix.copy(conversion);
        // Batch CAD faces by material for mobile GPUs. No simplification or surface
        // changes: bake each source node transform into a cloned vertex buffer, then
        // concatenate identical-format buffers. Original downloadable GLBs stay intact.
        gltf.scene.updateMatrixWorld(true);
        const batches = new Map();
        const sourceGeometry = new Set();
        gltf.scene.traverse(object => {
          if (!object.isMesh) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            if (!material) continue;
            material.roughness = Math.min(material.roughness ?? 0.6, 0.75);
            if (material.transparent || material.opacity < 0.99) material.depthWrite = false;
          }
          const material = object.material;
          if (!batches.has(material.uuid)) batches.set(material.uuid, { material, geometries: [] });
          batches.get(material.uuid).geometries.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
          sourceGeometry.add(object.geometry);
        });
        for (const { material, geometries } of batches.values()) {
          const geometry = mergeGeometries(geometries, false);
          if (!geometry) throw new Error('CAD display geometry could not be prepared');
          orientation.add(new THREE.Mesh(geometry, material));
          for (const buffer of geometries) buffer.dispose();
        }
        for (const geometry of sourceGeometry) geometry.dispose();
        part.add(orientation); scene.add(part);
        components[name] = part;
        status.textContent = `Loading CAD · ${++loaded} / ${COMPONENTS.length} components`;
      }));
      scene.updateMatrixWorld(true);
      const fullBounds = new THREE.Box3().setFromObject(scene);
      const detailBounds = new THREE.Box3();
      for (const name of COMPONENTS.filter(name => name.startsWith('ARM_L') || ['TARGET_BOX', 'TARGET_RING', 'TARGET_YOKE'].includes(name))) {
        detailBounds.union(new THREE.Box3().setFromObject(components[name]));
      }
      let fullAssembly = false;
      function syncOrbit() {
        orbitButton.textContent = controls.autoRotate ? 'Pause orbit' : 'Auto orbit';
        orbitButton.setAttribute('aria-pressed', String(controls.autoRotate));
      }
      function frameView() {
        // Ancillary rig equipment stays available in the complete assembly view;
        // hide it in the close framing so off-screen pieces do not intrude.
        components.CAMERA_MAST.visible = fullAssembly;
        components.CONTROLLER.visible = fullAssembly;
        const bounds = fullAssembly ? fullBounds : detailBounds;
        const size = bounds.getSize(new THREE.Vector3());
        const target = bounds.getCenter(new THREE.Vector3());
        // Bounding-sphere fit remains robust in the narrow mobile hero.
        const direction = new THREE.Vector3(-1.3, -2.3, 1.15).normalize();
        const radius = size.length() * 0.5;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
        const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * (fullAssembly ? 1.03 : 0.94);
        controls.target.copy(target);
        camera.position.copy(target).addScaledVector(direction, distance);
        camera.lookAt(target);
        controls.update();
        framingButton.textContent = fullAssembly ? 'Arm detail' : 'Full assembly';
        framingButton.setAttribute('aria-pressed', String(fullAssembly));
      }
      let width = 0, height = 0;
      function resize() {
        const rect = stage.getBoundingClientRect();
        const nextWidth = Math.max(1, rect.width), nextHeight = Math.max(1, rect.height);
        const wasPortrait = width < height;
        width = nextWidth; height = nextHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (container.dataset.cadState !== 'ready' || wasPortrait !== (width < height)) frameView();
      }
      const resizer = new ResizeObserver(resize);
      resizer.observe(stage); resize(); frameView(); syncOrbit();
      controls.addEventListener('start', () => { controls.autoRotate = false; syncOrbit(); });
      orbitButton.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; syncOrbit(); });
      framingButton.addEventListener('click', () => { fullAssembly = !fullAssembly; frameView(); });
      resetButton.addEventListener('click', () => { fullAssembly = false; frameView(); });
      canvas.addEventListener('keydown', event => {
        const offset = camera.position.clone().sub(controls.target);
        const step = 0.08;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          offset.applyAxisAngle(camera.up, event.key === 'ArrowLeft' ? -step : step);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize();
          offset.applyAxisAngle(right, event.key === 'ArrowUp' ? step : -step);
        } else if (event.key === '+' || event.key === '=') {
          offset.multiplyScalar(0.9);
        } else if (event.key === '-') {
          offset.multiplyScalar(1.1);
        } else if (event.key === 'Home') {
          event.preventDefault(); fullAssembly = false; frameView(); return;
        } else return;
        event.preventDefault(); controls.autoRotate = false; syncOrbit();
        camera.position.copy(controls.target).add(offset); controls.update();
      });

      let playing = false, elapsed = 0, duration = 0, applyReplay;
      if (replay) {
        const response = await fetch(new URL('replay/trajectory.json', ASSET_ROOT));
        if (!response.ok) throw new Error('Trajectory unavailable');
        const data = await response.json();
        const frames = data.frames;
        if (!Array.isArray(frames) || frames.length < 2) throw new Error('Trajectory is incomplete');
        duration = frames[frames.length - 1].t;
        if (!(duration > 0) || frames.some(frame => !Number.isFinite(frame.t) || JOINTS.some(([name]) => !Number.isFinite(frame.joints_deg?.[name])))) {
          throw new Error('Trajectory contains invalid joint data');
        }
        slider.max = String(duration);
        const rotations = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
        const rotation = new THREE.Matrix4();
        const pivot = new THREE.Vector3();
        const shifted = new THREE.Vector3();
        const phaseLabels = { standby: 'Recorded standby', approach: 'Recorded approach', detumble: 'Recorded control phase', stable: 'Recorded hold' };
        applyReplay = value => {
          elapsed = Math.max(0, Math.min(duration, value));
          let lo = 0, hi = frames.length - 1;
          while (lo + 1 < hi) {
            const middle = (lo + hi) >> 1;
            if (frames[middle].t <= elapsed) lo = middle; else hi = middle;
          }
          const a = frames[lo], b = frames[hi];
          const alpha = Math.max(0, Math.min(1, (elapsed - a.t) / (b.t - a.t || 1)));
          for (const [name, child, parent, point, axis] of JOINTS) {
            let delta = b.joints_deg[name] - a.joints_deg[name];
            if (name.startsWith('Gimbal')) delta = ((delta + 540) % 360) - 180;
            const angle = THREE.MathUtils.degToRad(a.joints_deg[name] + alpha * delta);
            rotation.makeRotationAxis(rotations[axis], angle);
            pivot.fromArray(point);
            shifted.copy(pivot).applyMatrix4(rotation);
            rotation.setPosition(pivot.sub(shifted));
            components[child].matrix.copy(components[parent].matrix).multiply(rotation);
            components[child].matrixWorldNeedsUpdate = true;
          }
          slider.value = String(elapsed);
          clock.textContent = `${timeLabel(elapsed)} / ${timeLabel(duration)}`;
          const label = phaseLabels[a.phase] || 'Recorded motion';
          if (phase.textContent !== label) phase.textContent = label;
          container.dataset.replayTime = elapsed.toFixed(2);
          container.dataset.replayPhase = a.phase;
        };
        function syncPlayback() {
          playButton.textContent = playing ? 'Pause replay' : elapsed >= duration ? 'Play again' : 'Play replay';
          playButton.setAttribute('aria-pressed', String(playing));
          container.dataset.replayPlaying = String(playing);
        }
        playButton.addEventListener('click', () => {
          if (elapsed >= duration) applyReplay(0);
          playing = !playing; syncPlayback();
        });
        restartButton.addEventListener('click', () => { playing = false; applyReplay(0); syncPlayback(); });
        slider.addEventListener('input', () => { playing = false; applyReplay(Number(slider.value)); syncPlayback(); });
        applyReplay(0); syncPlayback(); slider.disabled = false;
        // Shared closure lets the render loop stop cleanly at the recorded endpoint.
        playButton.finishReplay = () => { playing = false; syncPlayback(); };
      }
      for (const element of container.querySelectorAll('button')) element.disabled = false;
      status.textContent = replay ? 'Recorded poses · no live physics solver' : '13 supplied CAD components · orbit to inspect';
      renderer.render(scene, camera);
      container.dataset.cadComponents = String(COMPONENTS.length);
      container.dataset.cadState = 'ready';
      let previous = performance.now();
      renderer.setAnimationLoop(now => {
        const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
        previous = now;
        if (!visible || document.hidden) return;
        if (playing && applyReplay) {
          applyReplay(elapsed + delta);
          if (elapsed >= duration) playButton.finishReplay();
        }
        controls.update(delta);
        renderer.render(scene, camera);
      });
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        renderer.setAnimationLoop(null);
        container.dataset.cadState = 'error';
        status.textContent = '3D view paused by this browser. Supplied CAD render shown.';
        for (const element of container.querySelectorAll('button, input')) element.disabled = true;
      });
      window.addEventListener('pagehide', event => {
        // Preserve the live renderer and controls when browser Back/Forward keeps
        // this document in its cache; requestAnimationFrame resumes on restoration.
        if (event.persisted) return;
        renderer.setAnimationLoop(null); resizer.disconnect(); observer.disconnect();
        controls.dispose(); environment.dispose(); renderer.dispose();
      });
    } catch (error) {
      if (renderer) { renderer.setAnimationLoop(null); renderer.dispose(); }
      container.dataset.cadState = 'error';
      status.textContent = 'Interactive view unavailable. Supplied CAD render shown.';
      hint.textContent = 'The supplied video and CAD downloads remain available below.';
      for (const element of container.querySelectorAll('button, input')) element.disabled = true;
    }
  }
}

document.querySelectorAll('[data-cad-viewer]').forEach(mount);

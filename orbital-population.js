/**
 * Vyper Space — an illustrative population view, not a tracking catalogue.
 * The generated samples are not individual real satellites, measured positions,
 * or a one-for-one object count. Marker sizes and orbital spacing are enlarged.
 * All motion is deterministic scroll choreography, not propagated ephemerides.
 */
const TAU = Math.PI * 2;
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
}

export function createOrbitalPopulation(THREE, { center = new THREE.Vector3(0, -27, -32), radius = 25 } = {}) {
  const group = new THREE.Group();
  group.name = 'Illustrative orbital population — enlarged statistical samples';
  group.position.copy(center);
  const satelliteLayer = new THREE.Group(), debrisLayer = new THREE.Group(), hardwareLayer = new THREE.Group();
  group.add(satelliteLayer, debrisLayer, hardwareLayer);
  const random = randomGenerator(438912);
  const materials = [];
  const SATELLITE_SAMPLES = 5200, DEBRIS_SAMPLES = 16400;
  const satelliteCount = 54, fragmentCount = 110, cylinderCount = 12;
  const axis = new THREE.Vector3(0, 1, 0), placement = new THREE.Object3D();
  const sample = new THREE.Vector3();

  // A mixture of inclined shells conveys orbital structure without pretending
  // to reproduce the real distribution. Shell thickness is exaggerated.
  function orbitalPoint(index, debris, out) {
    const ring = index % (debris ? 71 : 49);
    const band = index % 10;
    const node = ring / (debris ? 71 : 49) * TAU;
    const inclination = debris
      ? [53, 70, 83, 97.6, 64, 39, 110, 28, 87, 58][band]
      : [53, 53, 53, 70, 70, 97.6, 97.6, 87, 43, 30][band];
    const phase = random() * TAU;
    const shell = radius * (debris
      ? 1.055 + random() ** 1.65 * .22
      : 1.045 + (band % 4) * .029 + random() * .012);
    out.set(Math.cos(phase) * shell, 0, Math.sin(phase) * shell);
    out.applyAxisAngle(new THREE.Vector3(1, 0, 0), inclination * Math.PI / 180);
    out.applyAxisAngle(axis, node + (debris ? (random() - .5) * .12 : 0));
    return out;
  }

  function markers(count, debris) {
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), sizes = new Float32Array(count);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      orbitalPoint(i, debris, sample);
      positions.set(sample.toArray(), i * 3);
      color.set(debris ? 0xc7b7a1 : 0x7bc5eb).multiplyScalar(.56 + random() * .44);
      colors.set(color.toArray(), i * 3);
      sizes[i] = debris ? .65 + random() * .9 : 1.05 + random() * .7;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('sampleSize', new THREE.BufferAttribute(sizes, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { opacity: { value: 0 }, pointScale: { value: debris ? 1.2 : 1.4 } },
      vertexShader: `attribute vec3 color; attribute float sampleSize; varying vec3 vColor; uniform float pointScale;
        void main(){ vec4 viewPosition = modelViewMatrix * vec4(position,1.); vColor=color;
        gl_PointSize = clamp(sampleSize * pointScale * 90. / max(8., -viewPosition.z), .65, 3.4);
        gl_Position = projectionMatrix * viewPosition; }`,
      fragmentShader: `varying vec3 vColor; uniform float opacity;
        void main(){ float d=length(gl_PointCoord-vec2(.5)); if(d>.5) discard;
        float edge=1.-smoothstep(.28,.5,d); gl_FragColor=vec4(vColor, opacity * edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      transparent: true, depthTest: true, depthWrite: false,
    });
    materials.push(material);
    const points = new THREE.Points(geometry, material);
    points.name = debris ? 'Illustrative debris samples' : 'Illustrative satellite samples';
    (debris ? debrisLayer : satelliteLayer).add(points);
    return material;
  }
  const satelliteMarkers = markers(SATELLITE_SAMPLES, false), debrisMarkers = markers(DEBRIS_SAMPLES, true);

  // Small silhouettes remain legible as the camera crosses the population view.
  // These instanced meshes are illustrations, not identified catalogue objects.
  const busMaterial = new THREE.MeshStandardMaterial({ color: 0xc4bdad, metalness: .75, roughness: .45, transparent: true, opacity: 0 });
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x183451, metalness: .6, roughness: .4, transparent: true, opacity: 0 });
  const fragmentMaterial = new THREE.MeshStandardMaterial({ color: 0x9d9c98, metalness: .8, roughness: .6, transparent: true, opacity: 0, side: THREE.DoubleSide });
  materials.push(busMaterial, panelMaterial, fragmentMaterial);
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(.22, .28, .22), busMaterial, satelliteCount);
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(.42, .2, .025), panelMaterial, satelliteCount * 2);
  const fragments = new THREE.InstancedMesh(new THREE.BoxGeometry(.19, .13, .014), fragmentMaterial, fragmentCount);
  const cylinders = new THREE.InstancedMesh(new THREE.CylinderGeometry(.10, .13, .43, 8), busMaterial, cylinderCount);
  bodies.name = 'Sample satellite bus silhouettes'; panels.name = 'Sample satellite arrays';
  fragments.name = 'Sample fragments'; cylinders.name = 'Sample upper-stage silhouettes';
  hardwareLayer.add(bodies, panels, fragments, cylinders);
  const quat = new THREE.Quaternion(), localOffset = new THREE.Vector3();
  for (let i = 0; i < satelliteCount; i++) {
    orbitalPoint(i * 61 + 3, false, placement.position);
    placement.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    const scale = .9 + random() * 1.2; placement.scale.setScalar(scale); placement.updateMatrix();
    bodies.setMatrixAt(i, placement.matrix);
    quat.copy(placement.quaternion);
    const origin = placement.position.clone();
    for (let side = 0; side < 2; side++) {
      localOffset.set((side ? 1 : -1) * .35 * scale, 0, 0).applyQuaternion(quat);
      placement.position.copy(origin).add(localOffset); placement.updateMatrix(); panels.setMatrixAt(i * 2 + side, placement.matrix);
    }
  }
  for (let i = 0; i < fragmentCount + cylinderCount; i++) {
    orbitalPoint(i * 83 + 8, true, placement.position);
    placement.rotation.set(random() * TAU, random() * TAU, random() * TAU);
    placement.scale.setScalar(.55 + random() * 1.7); placement.updateMatrix();
    if (i < fragmentCount) fragments.setMatrixAt(i, placement.matrix);
    else cylinders.setMatrixAt(i - fragmentCount, placement.matrix);
  }
  for (const mesh of [bodies, panels, fragments, cylinders]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  let progress = 0, opacity = 0, reveal = 1;
  function update(value, revealAmount = 1) {
    progress = clamp(Number.isFinite(value) ? value : 0);
    reveal = clamp(Number.isFinite(revealAmount) ? revealAmount : 1);
    // The global view is allowed to be rich; the subsequent target approach is
    // deliberately clear. Parent choreography can hide this entire group too.
    opacity = reveal * (1 - smooth(.25, .47, progress));
    group.visible = opacity > .002;
    satelliteMarkers.uniforms.opacity.value = opacity * .88;
    debrisMarkers.uniforms.opacity.value = opacity * .62;
    busMaterial.opacity = opacity * .9; panelMaterial.opacity = opacity * .9; fragmentMaterial.opacity = opacity * .72;
    satelliteLayer.rotation.y = progress * .55;
    debrisLayer.rotation.y = -.07 + progress * .37;
    hardwareLayer.rotation.y = progress * .43;
  }
  update(0);
  return {
    group,
    update,
    getState() { return {
      progress, reveal, opacity, visible: group.visible,
      rotations: [satelliteLayer.rotation.y, debrisLayer.rotation.y, hardwareLayer.rotation.y],
      satelliteMarkerSamples: SATELLITE_SAMPLES, debrisMarkerSamples: DEBRIS_SAMPLES,
      satelliteMeshSamples: satelliteCount, fragmentMeshSamples: fragmentCount, rocketBodyMeshSamples: cylinderCount,
      interpretation: 'Illustrative samples, enlarged markers, synthetic positions; not a live catalogue or one-for-one count',
    }; },
  };
}

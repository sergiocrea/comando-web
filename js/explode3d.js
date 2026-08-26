/* ============================================================
   explode3d.js — exploded-view Three.js scene (rewritten)
   Reproduces the original explodeModel behaviour: a plain passive
   scroll listener (no ScrollTrigger) maps 2 viewport-heights of
   scroll to a rotate phase (0->0.32) then a per-layer Y explode
   phase (0.32->0.95); the heading slides left over the first half
   and HTML hotspot labels fade in near full explode.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const ASSETS = 'assets';
const MODEL_URL = `${ASSETS}/models/explode-device.glb`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (x, e0, e1) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const isMobile = () => window.innerWidth <= 767;

// per-layer explode direction (Y axis), matched by keyword
const LAYER_DIRS = [
  { k: ['button'], dir: 1.0 },
  { k: ['upper_case'], dir: 0.8 },
  { k: ['screen'], dir: 0.3333 },
  { k: ['mother_board', 'antenna'], dir: 0.0 },
  { k: ['board_2_with_chips'], dir: -0.3333 },
  { k: ['battery_and_screw_holders'], dir: -0.8 },
  { k: ['bottom_case'], dir: -0.96 },
  { k: ['screw'], dir: -1.0 },
];
function dirFor(name) {
  const n = name.toLowerCase();
  for (const l of LAYER_DIRS) if (l.k.some((k) => n.includes(k))) return l.dir;
  return -1.0;
}

// label definitions (display name + which layer they anchor to + side)
const LABELS = [
  { match: 'screen', name: '3" Touch Display', side: 'left', num: '01' },
  { match: 'mother_board', name: 'Tactile Joystick & Button', side: 'left', num: '02' },
  { match: 'battery', name: 'High-Capacity Battery', side: 'left', num: '06' },
  { match: 'antenna', name: 'Interchangeable SMA Antennas', side: 'right', num: '03', dy: 40 },
  { match: 'bottom_case', name: 'High-speed M.2 slot', side: 'right', num: '05', dy: -44 },
  { match: 'board_2_with_chips', name: 'Expandable GPIO', side: 'right', num: '04' },
];

(function buildExplode() {
  const mount = document.getElementById('canvas-explode');
  const triggerEl = document.querySelector('.section_home-features');
  if (!mount) return;

  // frozen dimensions
  let W = mount.clientWidth || window.innerWidth;
  let H = mount.clientHeight || window.innerHeight;
  if (H > window.innerHeight * 1.5) H = window.innerHeight;
  if (H < 50) { W = window.innerWidth; H = window.innerHeight; }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  mount.appendChild(renderer.domElement);

  // labels overlay
  let labelsContainer = document.getElementById('labels-container');
  if (!labelsContainer) {
    labelsContainer = document.createElement('div');
    labelsContainer.id = 'labels-container';
    labelsContainer.className = 'home-labels-container';
    mount.appendChild(labelsContainer);
  } else {
    labelsContainer.classList.add('home-labels-container');
  }

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.534));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(0.15, 0.2, 0.68); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.36); fill.position.set(0, 0.95, 0.1); scene.add(fill);
  const extExplode = new THREE.PointLight(0xffffff, 0, 9, 1.35); extExplode.position.set(2.8, -1.86, 1.78); scene.add(extExplode);
  const rotLight = new THREE.PointLight(0xffffff, 0, 11.43, 1.14); rotLight.position.set(-3.08, -0.91, 2.74); scene.add(rotLight);
  const cBL = new THREE.PointLight(0xffffff, 0, 20.39, 3); cBL.position.set(-1.64, -1.88, 0.45); scene.add(cBL);
  const cTL = new THREE.PointLight(0xffffff, 0, 25, 1.45); cTL.position.set(-4.83, 1.31, -1.88); scene.add(cTL);
  const cTR = new THREE.PointLight(0xffffff, 0, 25, 1.45); cTR.position.set(3.52, 1.07, -1.88); scene.add(cTR);
  const cBR = new THREE.PointLight(0xffffff, 0, 20.39, 0); cBR.position.set(1.31, -1.27, -0.04); scene.add(cBR);

  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  let model = null;
  const layers = []; // {obj, startY, dir}
  const labelEls = []; // {el, line, obj, def, anchor}
  let lockedScale = 1;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, (gltf) => {
    model = gltf.scene;
    // center
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3(); box.getCenter(center);
    const size = new THREE.Vector3(); box.getSize(size);
    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    let scale = 2.5 / maxDim;
    scale *= isMobile() ? 1.0 : 0.95;
    const w = window.innerWidth;
    if (!isMobile()) {
      if (w < 1440) scale *= 1.12;
      else if (w <= 1920) scale *= 1.224;
    }
    lockedScale = scale;
    modelGroup.scale.setScalar(scale);
    modelGroup.add(model);
    modelGroup.rotation.set(1.55, 0, 0);

    // collect top-level layers
    model.children.forEach((child) => {
      layers.push({ obj: child, startY: child.position.y, dir: dirFor(child.name || '') });
    });

    // screen material roughness tweak
    model.traverse((o) => {
      if (o.isMesh) {
        // brand: recolor the legacy green button/LED materials to the Comando accent
        const m = o.material;
        if (m && m.color) { const { r, g, b } = m.color; if (g > 0.35 && g > r * 1.6 && g > b * 1.6) { m.color.setHex(0x4d7cff); if (m.emissive) m.emissive.setHex(0x1a3fbf); } }
      }
      if (o.isMesh && /group3001_11/i.test(o.parent && o.parent.name || '')) {
        o.material = o.material.clone(); o.material.roughness = 1;
      }
    });

    buildLabels();
    onScroll();
  });

  function buildLabels() {
    LABELS.forEach((def) => {
      const obj = layers.find((l) => (l.obj.name || '').toLowerCase().includes(def.match));
      const el = document.createElement('div');
      el.className = 'hotspot ' + def.side;
      el.innerHTML = `
        <div class="hotspot-content"><div class="hotspot-title">${def.name}</div></div>
        <div class="hotspot-line"></div>
        <div class="hotspot-number">${def.num}</div>`;
      labelsContainer.appendChild(el);
      labelEls.push({ el, obj: obj && obj.obj, def });
    });
  }

  // explode params
  const EXPLODE_SCALE = 0.072;
  const explodeMultiplier = isMobile() ? 0.8 : 1.0;

  function apply(total) {
    if (!model) return;
    const rotP = smoothstep(total, 0, 0.32);
    const expP = smoothstep(total, 0.32, 0.95);

    // rotation
    modelGroup.rotation.x = lerp(1.55, 0.25, rotP);
    modelGroup.rotation.y = lerp(0, -0.7, rotP);

    // model X shift by rotP (desktop)
    if (!isMobile()) modelGroup.position.x = lerp(0, 0.25, rotP);
    else modelGroup.position.x = (W * 0.05 / 100) * rotP;

    // per-layer Y explode
    const amt = EXPLODE_SCALE * explodeMultiplier * 0.7;
    layers.forEach((l) => { l.obj.position.y = l.startY + l.dir * amt * expP; });

    // heading slide-out over first 50%
    const heading = document.querySelector('.home_text-animate');
    if (heading) heading.style.transform = `translateX(${-Math.min(1, total / 0.5) * 105}%)`;

    // lights ramp
    const extRamp = Math.max(smoothstep(rotP, 0.4, 1), smoothstep(total, 0.5, 0.95));
    extExplode.intensity = 8.3 * extRamp;
    rotLight.intensity = 5.5 * smoothstep(rotP, 0.4, 1);
    const cornerRamp = extRamp * smoothstep(rotP, 0.9, 1);
    cBL.intensity = 1.95 * cornerRamp;
    cTL.intensity = 6.56 * cornerRamp;
    cTR.intensity = 6.25 * cornerRamp;
    cBR.intensity = 1.03 * cornerRamp;

    // labels visibility
    const showAt = isMobile() ? 0.78 : 0.88;
    labelEls.forEach((L) => L.el.classList.toggle('visible', expP >= showAt));
    positionLabels();
  }

  const tmp = new THREE.Vector3();
  function positionLabels() {
    if (isMobile()) {
      // numbered circles pinned to edges
      let li = 0, ri = 0;
      labelEls.forEach((L) => {
        const left = L.def.side === 'left';
        const y = 16 + (left ? li++ : ri++) * 42;
        L.el.style.left = left ? '16px' : 'auto';
        L.el.style.right = left ? 'auto' : '16px';
        L.el.style.top = y + 'px';
      });
      return;
    }
    labelEls.forEach((L) => {
      if (!L.obj) return;
      L.obj.getWorldPosition(tmp);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W;
      const y = (-tmp.y * 0.5 + 0.5) * H + (L.def.dy || 0);
      const left = L.def.side === 'left';
      const colX = left ? W * 0.14 : W * 0.86;
      L.el.style.left = colX + 'px';
      L.el.style.top = y + 'px';
      const line = L.el.querySelector('.hotspot-line');
      if (line) {
        if (left) { line.style.left = '0'; line.style.right = 'auto'; line.style.width = Math.max(0, x - colX) + 'px'; }
        else { line.style.right = '0'; line.style.left = 'auto'; line.style.width = Math.max(0, colX - x) + 'px'; }
      }
    });
  }

  // scroll -> progress
  function computeProgress() {
    if (!triggerEl) return 0;
    const rect = triggerEl.getBoundingClientRect();
    const scrolledPast = Math.max(0, -(rect.bottom - window.innerHeight * 0.1));
    return clamp(scrolledPast / (window.innerHeight * 2), 0, 1);
  }
  let progress = 0;
  function onScroll() { progress = computeProgress(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // render loop with viewport culling
  function animate() {
    requestAnimationFrame(animate);
    const rect = mount.getBoundingClientRect();
    if (rect.bottom < -0.25 * window.innerHeight || rect.top > 1.25 * window.innerHeight) return;
    apply(progress);
    renderer.render(scene, camera);
  }
  animate();

  // resize
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return; // ignore mobile url-bar height changes
    lastW = window.innerWidth;
    W = mount.clientWidth || window.innerWidth;
    H = mount.clientHeight || window.innerHeight;
    camera.aspect = W / H; camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  });
})();

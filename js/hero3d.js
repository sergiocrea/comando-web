/* ============================================================
   hero3d.js — preloader + hero Three.js scene (rewritten)
   Reproduces the original heroScript behaviour: a weighted load
   registry driving the preloader counter and its staggered exit,
   then the floating device model that flies from the hero into the
   #target slot as you scroll, with mouse tilt, idle float, a full
   Z spin and a hero->terminal video crossfade on its screen.
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

const R2 = 'https://pub-28ca259d32274e718fe1f5d0e35661bf.r2.dev/3dtest';
const MODEL_URL = `${R2}/neoconda-test/models/neoconda-hero-header.glb`;
const ENV_URL = `${R2}/sunthings-test/hdri/studio_small_08_1k.exr`;
const VIDEO_HERO = `${R2}/neoconda-test/videos/Logo.mp4`;
const VIDEO_TERM = `${R2}/neoconda-test/videos/neoconda-terminal-2.mp4`;

const DEG = Math.PI / 180;
const isMobile = () => window.innerWidth <= 767;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (x, e0, e1) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

/* ============================================================
   Weighted load registry -> preloader
   ============================================================ */
const registry = { tasks: {}, listeners: [] };
function regTask(id, weight) { registry.tasks[id] = { weight, p: 0 }; }
function setTask(id, p) { if (registry.tasks[id]) { registry.tasks[id].p = clamp(p, 0, 1); emit(); } }
function combined() {
  let tw = 0, sum = 0;
  for (const k in registry.tasks) { tw += registry.tasks[k].weight; sum += registry.tasks[k].weight * registry.tasks[k].p; }
  return tw ? (sum / tw) * 100 : 0;
}
function emit() { registry.listeners.forEach((f) => f(combined())); }

regTask('script', 1);
regTask('dom', 1);
regTask('model', 8);
setTask('script', 1);
if (document.readyState !== 'loading') setTask('dom', 1);
else document.addEventListener('DOMContentLoaded', () => setTask('dom', 1));

const heroReleased = { fn: null };
function onHeroRelease(fn) { heroReleased.fn = fn; }

/* ---------- preloader UI ---------- */
(function preloader() {
  const wrap = document.getElementById('preloader');
  const numEl = document.getElementById('preloader-number');
  if (!wrap) { onHeroRelease.ready = true; return; }

  // skip on resize reload
  if (sessionStorage.getItem('__neoconda_resize_reload') === 'true') {
    sessionStorage.removeItem('__neoconda_resize_reload');
    wrap.remove();
    revealAfterPreloader(1);
    return;
  }

  const displayed = { value: 0 };
  let lastShown = 0, done = false;
  if (numEl) numEl.style.transition = 'all 0.3s ease-out';

  registry.listeners.push((pct) => {
    const dur = Math.max(0.35, Math.abs(pct - lastShown) * 0.025);
    lastShown = pct;
    gsap.to(displayed, {
      value: pct, duration: dur, ease: 'power2.out',
      onUpdate: () => { if (numEl) numEl.textContent = `${Math.round(displayed.value)}%`; },
      onComplete: () => { if (pct >= 100 && Math.round(displayed.value) >= 100) finish(); },
    });
  });

  // logo shimmer fallback (SMIL already animates; add GSAP just in case)
  setTimeout(() => { if (!done) finishGuard(); }, 30000); // safety

  function finishGuard() { if (!done) finish(); }
  function finish() {
    if (done) return; done = true;
    const hold = isMobile() ? 250 : 500;
    gsap.delayedCall(hold / 1000, exit);
  }
  function exit() {
    const bg = (id) => document.getElementById(id);
    [document.getElementById('preloader-first'), bg('pre-one'), bg('pre-two'), bg('pre-three'), wrap]
      .forEach((el) => { if (el) { el.style.willChange = 'transform'; el.style.backfaceVisibility = 'hidden'; } });
    const tl = gsap.timeline({ onComplete: () => { wrap.remove(); revealNav(); } });
    tl.to('#preloader-first', { yPercent: -100, duration: 0.6, ease: 'power2.inOut', force3D: true }, 0);
    tl.to('#pre-one', { yPercent: -100, duration: 0.8, ease: 'power2.inOut', force3D: true }, 0.35);
    tl.to('#pre-two', { yPercent: -100, duration: 0.8, ease: 'power2.inOut', force3D: true }, 0.5);
    tl.to('#pre-three', { yPercent: -100, duration: 0.8, ease: 'power2.inOut', force3D: true }, 0.65);
    tl.to('#preloader', { yPercent: -100, duration: 0.8, ease: 'power2.inOut', force3D: true }, 0.8);
    // release hero animations at 70% of the exit
    let released = false;
    tl.eventCallback('onUpdate', () => {
      if (!released && tl.progress() >= 0.7) { released = true; revealAfterPreloader(0); }
    });
  }
})();

function revealNav() {
  const nav = document.querySelector('.nav_component');
  if (!nav) return;
  gsap.set(nav, { yPercent: -100 });
  gsap.delayedCall(0.2, () => gsap.to(nav, { yPercent: 0, duration: 0.9, ease: 'power3.out' }));
}

/* ---------- hero logo reveal + entrance ---------- */
function revealAfterPreloader(instant) {
  const container = document.getElementById('hero-logo-large-to-move') ||
    document.querySelector('.reveal-svg');
  const svg = document.querySelector('.reveal-svg');
  const paths = svg ? svg.querySelectorAll('path') : [];

  if (container) container.style.transition = 'opacity 0.35s cubic-bezier(0.22,1,0.36,1)';
  const REVEAL_DUR = 1.8, STAGGER = 0.06;
  if (paths.length) {
    gsap.fromTo(paths, { y: 300 }, {
      y: 0, duration: REVEAL_DUR, stagger: STAGGER, ease: 'expo.out',
      clearProps: 'transform',
    });
  }
  // start model 1.15s before reveal ends
  const totalReveal = REVEAL_DUR + STAGGER * Math.max(0, paths.length - 1);
  const lead = Math.max(0, totalReveal - 1.15);
  gsap.delayedCall(instant ? 0 : lead, startAllAnimations);

  // hero content entrance
  const ease = 'power2.out';
  gsap.fromTo('.svg-one', { x: -60, scale: 0.9, opacity: 0 }, { x: 0, scale: 1, opacity: 1, duration: 1.4, ease });
  gsap.fromTo('.svg-two', { x: 60, scale: 0.9, opacity: 0 }, { x: 0, scale: 1, opacity: 1, duration: 1.4, ease });
  gsap.fromTo('.logo-outline', { opacity: 0 }, { opacity: 1, duration: 0.8, ease });
  gsap.fromTo('#hero-content', { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease });
}

let heroScene = null;
function startAllAnimations() {
  document.body.style.overflow = 'auto';
  if (heroScene && heroScene.start) heroScene.start();
}

/* ============================================================
   Hero Three.js scene
   ============================================================ */
(function buildHero() {
  const mount = document.getElementById('app');
  if (!mount) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(13, window.innerWidth / window.innerHeight, 0.1, 1000);
  const CAM_Z = 0.25;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.pointerEvents = 'none';
  mount.appendChild(renderer.domElement);

  // group hierarchy
  const pivotGroup = new THREE.Group();       // mouse tilt
  const flipScaleGroup = new THREE.Group();    // position lerp + float
  const finalOffsetGroup = new THREE.Group();  // extra rot/scale on arrival
  const lightsRig = new THREE.Group();
  scene.add(pivotGroup);
  pivotGroup.add(flipScaleGroup);
  flipScaleGroup.add(lightsRig);
  flipScaleGroup.add(finalOffsetGroup);

  // lights (start values; lerped by rotationProgress)
  const ambient = new THREE.AmbientLight(0xffffff, 0.534);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xd1d1d1, 1.45);
  keyLight.position.set(2.12, -0.32, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.72);
  fillLight.position.set(0.58, 0.32, 0.84);
  scene.add(fillLight);
  const rimSpot = new THREE.SpotLight(0xffffff, 1.205, 0, 0.5, 0.581);
  rimSpot.position.set(-13, 3.76, -6.68);
  lightsRig.add(rimSpot);
  const frontTarget = new THREE.DirectionalLight(0x424242, 0.4);
  frontTarget.position.set(0.18, -0.04, 0.06);
  lightsRig.add(frontTarget);
  const LIGHTS = {
    ambient: [0.534, 1.132],
    key: { i: [1.45, 1.311], p0: [2.12, -0.32, 5], p1: [0.22, 0.418, 4.041] },
    fill: { i: [1.72, 1.45], p0: [0.58, 0.32, 0.84], p1: [-1.4, -1.94, 0] },
  };

  // env map
  new EXRLoader().load(ENV_URL, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = tex;
    scene.environmentIntensity = 0.408;
  });

  // videos
  function makeVideo(src) {
    const v = document.createElement('video');
    Object.assign(v, { src, muted: true, loop: true, autoplay: true, playsInline: true, crossOrigin: 'anonymous' });
    v.setAttribute('playsinline', '');
    const tex = new THREE.VideoTexture(v);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return { v, tex };
  }
  const heroVid = makeVideo(VIDEO_HERO);
  const termVid = makeVideo(VIDEO_TERM);

  let model = null;
  let modelHolder = null; // rotates + scales around the model's geometric center
  let screenMat = null, screenMatB = null;
  let targetScale = 1;

  // model load with meshopt + weighted progress
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(MODEL_URL, (gltf) => {
    setTask('model', 1);
    model = gltf.scene;

    // material override + find screen mesh
    let best = null, bestScore = -Infinity;
    model.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      if (m && 'metalness' in m) { m.metalness = 0.053; m.roughness = 0.275; m.envMapIntensity = 0.42; }
      // planarity heuristic for the screen
      o.geometry.computeBoundingBox();
      const s = new THREE.Vector3(); o.geometry.boundingBox.getSize(s);
      const dims = [s.x, s.y, s.z].sort((a, b) => a - b);
      const planarity = dims[0] / (dims[2] || 1);
      let area = dims[1] * dims[2];
      const name = ((o.name || '') + ' ' + (m && m.name || '')).toLowerCase();
      if (/screen|display|appearance-13|part 2/.test(name)) area *= 1.2;
      if (planarity <= 0.06) { if (area > bestScore) { bestScore = area; best = o; } }
    });

    if (best) {
      const emo = isMobile()
        ? new THREE.MeshBasicMaterial({ map: heroVid.tex, side: THREE.FrontSide })
        : new THREE.MeshStandardMaterial({
            map: heroVid.tex, emissive: 0xffffff, emissiveMap: heroVid.tex, emissiveIntensity: 1.0,
            roughness: 1, metalness: 0, envMapIntensity: 0, toneMapped: false,
            transparent: true, side: THREE.DoubleSide,
          });
      screenMat = emo;
      best.material = emo;
      best.renderOrder = 30;
    }

    modelHolder = new THREE.Group();
    modelHolder.add(model);
    finalOffsetGroup.add(modelHolder);
    computeScale();
    modelHolder.rotation.set(77 * DEG, -11 * DEG, 16 * DEG);
    modelHolder.visible = false; // stay hidden until the entrance zoom starts (no flash)
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
  }, (ev) => {
    if (ev.total) setTask('model', ev.loaded / ev.total);
  }, () => setTask('model', 1));

  // Fraction of the visible frame the device should occupy in the hero.
  const HERO_FILL_DESKTOP = 0.42;
  const HERO_FILL_MOBILE = 0.5;
  function computeScale() {
    if (!model || !modelHolder) return;
    // measure the model unrotated/unscaled and center its geometry in the holder
    modelHolder.rotation.set(0, 0, 0);
    modelHolder.scale.setScalar(1);
    model.position.set(0, 0, 0);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    model.position.sub(center); // geometric center now sits at the holder origin
    // visible frame size at the camera distance for fov 13
    const vFov = 13 * DEG;
    const visH = 2 * Math.tan(vFov / 2) * CAM_Z;
    const visW = visH * camera.aspect;
    const fill = isMobile() ? HERO_FILL_MOBILE : HERO_FILL_DESKTOP;
    // scale so the model's largest footprint fills `fill` of the frame
    const maxXY = Math.max(size.x, size.y);
    targetScale = (Math.min(visW, visH) * fill) / maxXY;
    modelHolder.scale.setScalar(targetScale);
  }

  // material apply for screen video swap
  function applyVideoMix(rotP) {
    if (!screenMat) return;
    if (isMobile()) {
      // hard switch handled elsewhere
      return;
    }
    // crossfade hero->terminal around 0.5 +/-0.05
    const band = smoothstep(rotP, 0.45, 0.55);
    const tex = band < 0.5 ? heroVid.tex : termVid.tex;
    if (band >= 0.5 && screenMat.map !== termVid.tex) { termVid.v.currentTime = 0; termVid.v.play(); }
    screenMat.map = tex;
    if ('emissiveMap' in screenMat) screenMat.emissiveMap = tex;
    screenMat.needsUpdate = true;
  }

  // --- scroll state ---
  const scrollState = { progress: 0 };
  const moveState = { progress: 0 };
  const rotationState = { progress: 0 };
  const mobileState = { progress: 0 };
  const SCRUB = isMobile() ? 0.45 : 1.5;

  function initTriggers() {
    gsap.to(scrollState, { progress: 1, ease: 'none', scrollTrigger: {
      trigger: '#hero', start: 'top top', endTrigger: '#target', end: 'top bottom', scrub: 1.5 } });
    gsap.to([document.querySelector('.logo-outline'), document.querySelector('.canvas-wrap')].filter(Boolean),
      { opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=25%', scrub: 1.5 } });
    gsap.to(moveState, { progress: 1, ease: 'none', scrollTrigger: {
      trigger: '.section-relative-wrap', start: 'top 50%', end: 'top top', scrub: 1.5 } });
    gsap.to(rotationState, { progress: 1, ease: 'none', scrollTrigger: {
      trigger: '#hero', start: 'top top', endTrigger: '.section-relative-wrap', end: 'top top', scrub: 1.5 } });
    // hero-content fade over first 5%
    ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: '+=5%', scrub: true,
      onUpdate: (self) => { const c = document.getElementById('hero-content'); if (c) c.style.opacity = String(1 - self.progress); } });
    // canvas kill switch at features
    ScrollTrigger.create({ trigger: '#features-padding', start: 'top top-=2%', end: 'bottom top-=2%',
      onEnter: () => gsap.to(mount, { opacity: 0, duration: 0.2, ease: 'power1.out' }),
      onEnterBack: () => gsap.to(mount, { opacity: 0, duration: 0.2, ease: 'power1.out' }),
      onLeaveBack: () => gsap.to(mount, { opacity: 1, duration: 0.2, ease: 'power1.out' }) });
    if (isMobile()) {
      gsap.to(mobileState, { progress: 1, ease: 'none', scrollTrigger: {
        trigger: '#hero', start: 'top top', endTrigger: '#target', end: 'center center', scrub: 0.45 } });
    }
    ScrollTrigger.refresh();
  }

  // --- final position from #target ---
  const tmp = new THREE.Vector3();
  function targetWorldPos() {
    const el = document.getElementById('target');
    if (!el) return new THREE.Vector3(0, 0, 0);
    const r = el.getBoundingClientRect();
    const ndcX = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
    const ndcY = -((r.top + r.height / 2) / window.innerHeight) * 2 + 1;
    const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(dist));
  }

  // --- mouse tilt ---
  const tilt = { tx: 0, ty: 0, targetX: 0, targetY: 0 };
  window.addEventListener('mousemove', (e) => {
    if (window.innerWidth < 991) return;
    tilt.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    tilt.targetY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // --- render loop ---
  const clock = new THREE.Clock();
  let started = false;
  function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    camera.position.set(0, 0, CAM_Z);
    camera.lookAt(0, 0, 0);

    if (!model || !started) { renderer.render(scene, camera); return; }

    const t = scrollState.progress;
    const rotP = isMobile() ? clamp(mobileState.progress * 1.35, 0, 1) : rotationState.progress;
    const arrival = isMobile()
      ? smoothstep(clamp(mobileState.progress * 1.7, 0, 1), 0, 1)
      : moveState.progress * clamp((t - 0.5) / 0.5, 0, 1);

    // tilt + float (desktop only)
    const strength = 1 - smoothstep(t, 0.02, 0.16);
    if (!isMobile()) {
      tilt.tx += (tilt.targetX - tilt.tx) * 0.05;
      tilt.ty += (tilt.targetY - tilt.ty) * 0.05;
      pivotGroup.rotation.x = -tilt.ty * 0.1 * strength;
      pivotGroup.rotation.y = tilt.tx * 0.1 * strength;
      flipScaleGroup.position.y += Math.sin(elapsed * 0.8) * 0.0015 * strength;
    }

    // position lerp origin -> target
    const finalPos = targetWorldPos();
    flipScaleGroup.position.x = lerp(0.0025, finalPos.x, arrival);
    flipScaleGroup.position.y = lerp(0, finalPos.y, arrival) + (isMobile() ? 0 : 0);

    // rotation
    const rx = lerp(77, isMobile() ? 90 : 85, rotP) * DEG;
    const ry = lerp(-11, isMobile() ? 0 : 1, rotP) * DEG;
    const rz = lerp(16, isMobile() ? 0 : -13.6, rotP) * DEG;
    const extraZ = isMobile() ? 0 : Math.PI * 2 * rotP;
    modelHolder.rotation.set(rx, ry, rz + extraZ);

    // finalOffsetGroup extra rot + scale on arrival (desktop)
    if (!isMobile()) {
      finalOffsetGroup.rotation.set(0.13 * arrival, -0.198 * arrival, -0.005 * arrival);
      finalOffsetGroup.scale.setScalar(lerp(1, 2.47, arrival));
    }

    // lights lerp by rotP
    ambient.intensity = lerp(LIGHTS.ambient[0], LIGHTS.ambient[1], rotP);
    keyLight.intensity = lerp(LIGHTS.key.i[0], LIGHTS.key.i[1], rotP);
    keyLight.position.set(
      lerp(LIGHTS.key.p0[0], LIGHTS.key.p1[0], rotP),
      lerp(LIGHTS.key.p0[1], LIGHTS.key.p1[1], rotP),
      lerp(LIGHTS.key.p0[2], LIGHTS.key.p1[2], rotP));
    fillLight.intensity = lerp(LIGHTS.fill.i[0], LIGHTS.fill.i[1], rotP);
    fillLight.position.set(
      lerp(LIGHTS.fill.p0[0], LIGHTS.fill.p1[0], rotP),
      lerp(LIGHTS.fill.p0[1], LIGHTS.fill.p1[1], rotP),
      lerp(LIGHTS.fill.p0[2], LIGHTS.fill.p1[2], rotP));

    // video mix
    if (isMobile()) {
      if (screenMat && mobileState.progress >= 0.03 && screenMat.map !== termVid.tex) {
        termVid.v.play(); screenMat.map = termVid.tex; screenMat.needsUpdate = true;
      }
    } else {
      applyVideoMix(rotP);
    }

    renderer.render(scene, camera);
  }
  animate();

  // entrance
  heroScene = {
    start() {
      if (started) return;
      started = true;
      heroVid.v.play().catch(() => {});
      initTriggers();
      if (modelHolder) modelHolder.visible = true;
      if (modelHolder && window.scrollY < 100) {
        gsap.fromTo(modelHolder.scale,
          { x: targetScale * 0.18, y: targetScale * 0.18, z: targetScale * 0.18 },
          { x: targetScale, y: targetScale, z: targetScale, duration: 1.35, ease: 'power3.out' });
      }
    },
  };

  // resize -> reload page on width change (matches original)
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (window.innerWidth !== lastW) {
      lastW = window.innerWidth;
      sessionStorage.setItem('__neoconda_resize_reload', 'true');
      location.reload();
    }
  });
})();

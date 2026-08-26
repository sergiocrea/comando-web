/* ============================================================
   hero3d.js — preloader + hero Three.js scene (rewritten)
   Reproduces the original heroScript behaviour: a weighted load
   registry driving the preloader counter and its staggered exit,
   then the floating iPhone (procedural) that flies from the hero into the
   #target slot as you scroll, with mouse tilt, idle float, a full
   Z spin and a logo->terminal crossfade on its (canvas-drawn) screen.
   ============================================================ */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

const ASSETS = 'assets';
const ENV_URL = `${ASSETS}/hdri/studio_small_08_1k.exr`;

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
  if (sessionStorage.getItem('__comando_resize_reload') === 'true') {
    sessionStorage.removeItem('__comando_resize_reload');
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
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

  // device screens: WhatsApp-style chat. Two canvases per screen:
  //  - screen  (720x1476): bezel, wallpaper, header, input bar (typing simulation)
  //  - overlay (1240x1476, transparent): the bubbles, drawn LARGE and allowed to stick out of the phone
  const ACCENT = '#4d7cff';
  // ---- scenarios (edit ACTIVE to choose which ones play in the hero / in Producto) ----
  const SCENARIOS = {
    reasignar: [
      { from: 'me',  text: 'reasigna el deal de la constructora a Renzo' },
      { from: 'bot', text: 'Listo ✓ "Constructora Andina" ahora es de Renzo. Se le notificó por WhatsApp.' },
    ],
    speedToLead: [
      { from: 'me',  text: 'si un lead de Facebook no es contactado en 10 minutos, notifícame' },
      { from: 'bot', text: 'Regla creada:\nlead nuevo (Facebook) → sin contacto 10 min → notificación.\n¿La activo?' },
      { from: 'me',  text: 'sí' },
      { from: 'bot', text: '🟢 Activa. Te notificaré con el primer lead sin atender.' },
    ],
    pipeline: [
      { from: 'me',  text: 'muéstrame el pipeline' },
      { from: 'bot', text: 'Hoy: 14 nuevos · 6 en propuesta · 3 en negociación.\n⚠️ 2 deals sin actividad en 7 días.' },
    ],
    dealGrande: [
      { from: 'me',  text: 'si se pierde un deal de más de 20k, notifica al gerente con el motivo' },
      { from: 'bot', text: 'Listo ✓ deal perdido ≥ $20,000 → notificación al gerente con el motivo.' },
    ],
    lunes: [
      { from: 'me',  text: 'organiza mi lunes' },
      { from: 'bot', text: 'Lunes:\n09:00 Demo · Inmobiliaria Sur\n11:30 Llamar a 4 leads sin respuesta\n15:00 Renovación · Grupo Mesa' },
    ],
    seguimiento: [
      { from: 'me',  text: 'a los leads que no responden, envía seguimientos los días 2, 6 y 12; detente si responden' },
      { from: 'bot', text: 'Secuencia creada: 3 seguimientos por WhatsApp (días 2, 6 y 12). Se detiene con la primera respuesta. 38 leads entran hoy.' },
    ],
    citas: [
      { from: 'me',  text: 'recuerda las citas a los pacientes un día antes' },
      { from: 'bot', text: 'Listo ✓ Recordatorio 24 h antes con la plantilla "recordatorio_cita". Mañana se envían 12.' },
    ],
    leadCaliente: [
      { from: 'bot', text: '🔥 Lead nuevo: María Torres (Facebook · campaña Verano). Solicita cotización hoy.' },
      { from: 'me',  text: 'asígnalo a Ana y envíale la cotización base' },
      { from: 'bot', text: 'Hecho ✓ Asignado a Ana. María ya recibió la cotización por WhatsApp.' },
    ],
  };
  const ACTIVE = { logo: ['reasignar', 'speedToLead'], term: ['pipeline', 'dealGrande', 'lunes'] };
  const SCRIPTS = { logo: ACTIVE.logo.flatMap((k) => SCENARIOS[k]), term: ACTIVE.term.flatMap((k) => SCENARIOS[k]) };

  function buildTimeline(script) {
    let t = 900; const out = [];
    for (const m of script) {
      if (m.from === 'me') { const typing = 50 * m.text.length; out.push({ ...m, tStart: t, tShown: t + typing }); t += typing + 700; }
      else { out.push({ ...m, tStart: t, tShown: t + 1100 }); t += 1100 + 2200; }
    }
    return { items: out, total: t + 2500 };
  }
  function wrapText(ctx, text, maxW) {
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const w of para.split(' ')) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
      }
      lines.push(line);
    }
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function makeTex(c) {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.anisotropy = 4;
    return tex;
  }
  const SCREEN_W = 720, SCREEN_H = 1476, OVER_W = 1240; // OVER_W/SCREEN_W = overlay plane width ratio
  const OVERLAY_RATIO = OVER_W / SCREEN_W;

  function makeScreen(kind) {
    const W = SCREEN_W, H = SCREEN_H;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const oc = document.createElement('canvas'); oc.width = OVER_W; oc.height = H;
    const octx = oc.getContext('2d');
    const tex = makeTex(c), overlayTex = makeTex(oc);
    const tl = buildTimeline(SCRIPTS[kind]);
    let active = false, last = 0;
    const start = { t0: performance.now() };
    const SANS = 'Inter, -apple-system, "Neuehaasunicaw 1 G", Arial, sans-serif';
    const PAD = 22, SR = 96, HEADER_H = 190, INPUT_H = 120, SAFE_TOP = 62, SAFE_BOTTOM = 34;
    const GLASS_R = Math.round((11.5 - 1.7) * (W / (71.6 - 3.4))); // body corner radius minus glass inset, in px
    const OX = (OVER_W - W) / 2; // phone left edge inside the overlay canvas

    function drawMark(x, y, size, color) {
      ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
      ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(4, 4, 56, 56, 12); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(20, 22); ctx.lineTo(32, 32); ctx.lineTo(20, 42); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(34, 44); ctx.lineTo(46, 44); ctx.stroke(); ctx.restore();
    }

    function draw(t) {
      const now = t % tl.total;
      const pendingBot = tl.items.find((m) => m.from === 'bot' && now >= m.tStart && now < m.tShown);
      const typingMe = tl.items.find((m) => m.from === 'me' && now >= m.tStart && now < m.tShown);

      // ================= SCREEN =================
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.save(); roundRect(ctx, PAD, PAD, W - PAD * 2, H - PAD * 2, SR); ctx.clip();
      ctx.fillStyle = '#0b141a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      for (let y = 0; y < H; y += 46) for (let x = (y / 46 % 2) * 23; x < W; x += 46) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.29); ctx.fill(); }
      // header
      ctx.fillStyle = '#1f2c34'; ctx.fillRect(PAD, PAD, W - PAD * 2, HEADER_H);
      ctx.fillStyle = '#e9edef'; ctx.font = `600 26px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText('9:41', PAD + 48, PAD + SAFE_TOP - 8);
      ctx.textAlign = 'right'; ctx.font = `600 22px ${SANS}`; ctx.fillText('●●●  ▲  ▮', W - PAD - 40, PAD + SAFE_TOP - 8);
      const hy = PAD + SAFE_TOP + 64;
      ctx.strokeStyle = '#8696a0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(PAD + 54, hy - 16); ctx.lineTo(PAD + 38, hy); ctx.lineTo(PAD + 54, hy + 16); ctx.stroke();
      ctx.fillStyle = '#111b21'; ctx.beginPath(); ctx.arc(PAD + 118, hy, 40, 0, 6.29); ctx.fill();
      drawMark(PAD + 92, hy - 26, 52, ACCENT);
      ctx.fillStyle = '#e9edef'; ctx.font = `600 34px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText('Comando', PAD + 180, hy - 2);
      ctx.fillStyle = '#8696a0'; ctx.font = `400 24px ${SANS}`;
      ctx.fillText(pendingBot ? 'escribiendo…' : 'en línea', PAD + 180, hy + 32);
      ctx.fillStyle = '#8696a0'; ctx.font = `400 30px ${SANS}`; ctx.textAlign = 'right'; ctx.fillText('⋮', W - PAD - 34, hy + 12);
      ctx.fillStyle = '#000'; roundRect(ctx, W / 2 - 92, PAD + 16, 184, 52, 26); ctx.fill(); // dynamic island
      // input bar
      const iy = H - PAD - SAFE_BOTTOM - INPUT_H;
      ctx.fillStyle = '#1f2c34'; ctx.fillRect(PAD, iy, W - PAD * 2, INPUT_H + SAFE_BOTTOM);
      ctx.fillStyle = '#2a3942'; roundRect(ctx, PAD + 24, iy + 22, W - PAD * 2 - 140, 72, 36); ctx.fill();
      ctx.textAlign = 'left'; ctx.font = `400 30px ${SANS}`;
      if (typingMe) {
        const n = Math.floor((now - typingMe.tStart) / 50);
        let shown = typingMe.text.slice(0, n);
        const maxW = W - PAD * 2 - 220;
        while (ctx.measureText(shown).width > maxW && shown.length) shown = shown.slice(1);
        ctx.fillStyle = '#e9edef'; ctx.fillText(shown, PAD + 52, iy + 68);
        if (Math.floor(now / 450) % 2 === 0) { const cx = PAD + 54 + ctx.measureText(shown).width; ctx.fillRect(cx, iy + 40, 3, 36); }
      } else { ctx.fillStyle = '#8696a0'; ctx.fillText('Escribe un comando…', PAD + 52, iy + 68); }
      ctx.fillStyle = '#00a884'; ctx.beginPath(); ctx.arc(W - PAD - 64, iy + 58, 36, 0, 6.29); ctx.fill();
      const cx = W - PAD - 64, cy = iy + 58;
      if (typingMe) { // send arrow
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(cx - 12, cy - 15); ctx.lineTo(cx + 18, cy); ctx.lineTo(cx - 12, cy + 15); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill();
      } else { // microphone: capsule + pickup arc + stem + base
        ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.roundRect(cx - 7, cy - 20, 14, 26, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 2, 14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy + 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - 9, cy + 20); ctx.lineTo(cx + 9, cy + 20); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(233,237,239,0.9)'; roundRect(ctx, W / 2 - 70, H - PAD - 22, 140, 8, 4); ctx.fill(); // home indicator
      ctx.restore();
      // cut the glass corners to the body's corner radius (the plane is rectangular)
      ctx.save(); ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = '#000';
      roundRect(ctx, 0, 0, W, H, GLASS_R); ctx.fill(); ctx.restore();

      // ================= OVERLAY (bubbles, large, may exceed the phone) =================
      octx.clearRect(0, 0, OVER_W, H);
      const bodyFont = `500 44px ${SANS}`, LH = 56;
      const maxBubbleW = W * 1.0; // wider than the screen on purpose
      octx.font = bodyFont;
      const bubbles = [];
      for (const m of tl.items) {
        if (now < m.tShown) break;
        const lines = wrapText(octx, m.text, maxBubbleW - 56);
        const wText = Math.max(...lines.map((l) => octx.measureText(l).width));
        const w = Math.min(maxBubbleW, wText + 56 + (m.from === 'me' ? 90 : 40));
        const hgt = lines.length * LH + 66;
        const age = Math.min(1, (now - m.tShown) / 260);
        bubbles.push({ m, lines, w, h: hgt, age });
      }
      const listBottom = H - PAD - SAFE_BOTTOM - INPUT_H - 28;
      let y = listBottom;
      if (pendingBot) y -= 96;
      const positions = [];
      for (let i = bubbles.length - 1; i >= 0; i--) { y -= bubbles[i].h; positions[i] = y; y -= 22; }
      const listTop = PAD + HEADER_H + 30;
      const OUT = 70; // how far bubbles stick out past the phone edge
      bubbles.forEach((b, i) => {
        const by = positions[i] + (1 - b.age) * 24;
        if (by + b.h < listTop) return;
        octx.save();
        octx.globalAlpha = b.age * Math.min(1, Math.max(0, (by + b.h - listTop) / 120));
        const me = b.m.from === 'me';
        const bx = me ? OX + W - PAD + OUT - b.w : OX + PAD - OUT;
        octx.shadowColor = 'rgba(0,0,0,0.55)'; octx.shadowBlur = 40; octx.shadowOffsetY = 18;
        octx.fillStyle = me ? '#0a6e5b' : '#26343c';
        roundRect(octx, bx, by, b.w, b.h, 26); octx.fill();
        octx.shadowColor = 'transparent';
        octx.strokeStyle = me ? 'rgba(0,168,132,0.5)' : 'rgba(255,255,255,0.08)'; octx.lineWidth = 2; octx.stroke();
        octx.fillStyle = '#f2f5f6'; octx.font = bodyFont; octx.textAlign = 'left'; octx.textBaseline = 'alphabetic';
        b.lines.forEach((l, k) => octx.fillText(l, bx + 28, by + 52 + k * LH));
        octx.font = `400 24px ${SANS}`; octx.fillStyle = 'rgba(233,237,239,0.65)';
        octx.textAlign = 'right'; octx.fillText('09:4' + (i % 10), bx + b.w - (me ? 60 : 22), by + b.h - 18);
        if (me) { octx.fillStyle = '#53bdeb'; octx.font = `700 24px ${SANS}`; octx.fillText('✓✓', bx + b.w - 18, by + b.h - 18); }
        octx.restore();
      });
      if (pendingBot) {
        const by = listBottom - 80, bx = OX + PAD - OUT;
        octx.save(); octx.shadowColor = 'rgba(0,0,0,0.5)'; octx.shadowBlur = 30; octx.shadowOffsetY = 14;
        octx.fillStyle = '#26343c'; roundRect(octx, bx, by, 150, 76, 26); octx.fill(); octx.restore();
        for (let k = 0; k < 3; k++) { const ph = (now / 220 + k * 0.9) % 3; octx.fillStyle = `rgba(233,237,239,${0.35 + 0.5 * Math.max(0, Math.sin(ph))})`; octx.beginPath(); octx.arc(bx + 40 + k * 35, by + 38, 9, 0, 6.29); octx.fill(); }
      }
    }

    function tick(now) {
      if (active && now - last > 33) { last = now; draw(now - start.t0); tex.needsUpdate = true; overlayTex.needsUpdate = true; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    draw(0); tex.needsUpdate = true; overlayTex.needsUpdate = true;
    const v = { play() { active = true; return Promise.resolve(); }, pause() { active = false; }, set currentTime(x) { start.t0 = performance.now() - x * 1000; }, get currentTime() { return (performance.now() - start.t0) / 1000; } };
    return { v, tex, overlayTex };
  }
  const heroVid = makeScreen('logo');
  const termVid = makeScreen('term');

  let model = null;
  let modelHolder = null; // rotates + scales around the model's geometric center
  let screenMat = null, overlayMat = null;
  let targetScale = 1;

  // procedural iPhone (mm). Lies flat: width X, length Z (top at -Z), thickness Y, screen facing +Y
  // (same orientation convention as the original GLB, so the rotation choreography is unchanged).
  function buildPhone() {
    const W = 71.6, L = 146.7, T = 7.8, R = 11.5;
    const g = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4d, metalness: 0.95, roughness: 0.32 });
    const backMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.2, roughness: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.1, roughness: 0.15 });

    // body: rounded rectangle extruded along thickness with bevel
    const shape = new THREE.Shape();
    const hw = W / 2, hl = L / 2;
    shape.moveTo(-hw + R, -hl);
    shape.lineTo(hw - R, -hl); shape.quadraticCurveTo(hw, -hl, hw, -hl + R);
    shape.lineTo(hw, hl - R); shape.quadraticCurveTo(hw, hl, hw - R, hl);
    shape.lineTo(-hw + R, hl); shape.quadraticCurveTo(-hw, hl, -hw, hl - R);
    shape.lineTo(-hw, -hl + R); shape.quadraticCurveTo(-hw, -hl, -hw + R, -hl);
    const bevel = 1.1;
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: T - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 4, curveSegments: 24 });
    const body = new THREE.Mesh(bodyGeo, frameMat);
    body.rotation.x = -Math.PI / 2; // extrusion +Z -> +Y ; shape +Y -> -Z (top of phone)
    body.position.y = bevel;
    g.add(body);

    // back glass (slightly inset, matte dark)
    const backGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 24 });
    const back = new THREE.Mesh(backGeo, backMat);
    back.rotation.x = -Math.PI / 2; back.position.y = -0.05; back.scale.set(0.985, 0.99, 1);
    g.add(back);

    // camera module (back, top-left) + 3 lenses + flash
    const camMod = new THREE.Mesh(new RoundedBoxGeometry(34, 2.2, 36, 4, 6), frameMat);
    camMod.position.set(-hw + 21, -1.0, -hl + 22);
    g.add(camMod);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, metalness: 0.6, roughness: 0.2 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6e, metalness: 1, roughness: 0.25 });
    [[-7, -7], [-7, 8], [8, 0.5]].forEach(([dx, dz]) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.2, 1.4, 32), ringMat);
      ring.position.set(camMod.position.x + dx, -2.4, camMod.position.z + dz); g.add(ring);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.6, 32), lensMat);
      lens.position.set(ring.position.x, -3.2, ring.position.z); g.add(lens);
    });
    const flash = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.4, 20), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0x443300, roughness: 0.6 }));
    flash.position.set(camMod.position.x + 10, -2.3, camMod.position.z - 10); g.add(flash);

    // side buttons (right: power; left: action + volume)
    const btn = (len, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(1.4, 3.2, len, 2, 0.6), frameMat); m.position.set(x, T / 2, z); g.add(m); };
    btn(20, hw + 0.4, -hl + 46);
    btn(8, -hw - 0.4, -hl + 36); btn(14, -hw - 0.4, -hl + 54); btn(14, -hw - 0.4, -hl + 72);

    // front glass (screen): plane on the +Y face, texture already includes bezel + dynamic island
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 3.4, L - 3.4), glassMat);
    screen.rotation.x = -Math.PI / 2; // faces +Y; plane +Y -> -Z (top)
    screen.position.y = T + 0.4; // clear gap over the cap: avoids z-fighting on mobile GPUs
    g.add(screen);
    // floating bubble layer: wider than the phone, a few mm above the glass, transparent
    const overlay = new THREE.Mesh(new THREE.PlaneGeometry((W - 3.4) * OVERLAY_RATIO, L - 3.4),
      new THREE.MeshBasicMaterial({ map: heroVid.overlayTex, transparent: true, toneMapped: false, depthWrite: false, side: THREE.FrontSide }));
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = T + 4.5;
    overlay.renderOrder = 40;
    g.add(overlay);
    return { group: g, screen, overlay };
  }

  // Fraction of the visible frame the device should occupy in the hero.
  const HERO_FILL_DESKTOP = 0.72;
  const HERO_FILL_MOBILE = 0.47;
  const HERO_Y_OFFSET = 0.004; // lift the device slightly above center at rest
  // Visual size ratio between the device when it lands in #target (About) and
  // in the hero. The original grows an internally tiny base scale by 2.47; our
  // base scale is already calibrated to the hero, so we use the net visual ratio.
  const ARRIVAL_SCALE = 0.92;
  const ARRIVAL_SCALE_MOBILE = 0.9;
  function computeScale() {
    if (!model || !modelHolder) return;
    // measure the model unrotated/unscaled and center its geometry in the holder
    modelHolder.rotation.set(0, 0, 0);
    modelHolder.scale.setScalar(1);
    model.position.set(0, 0, 0);
    const box = new THREE.Box3();
    model.traverse((o) => { if (o.isMesh && o.renderOrder !== 40) box.expandByObject(o); });
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    model.position.sub(center); // geometric center now sits at the holder origin
    // visible frame size at the camera distance for fov 13
    const vFov = 13 * DEG;
    const visH = 2 * Math.tan(vFov / 2) * CAM_Z;
    const visW = visH * camera.aspect;
    const fill = isMobile() ? HERO_FILL_MOBILE : HERO_FILL_DESKTOP;
    // scale so the model's largest footprint fills `fill` of the frame
    const maxDim = Math.max(size.x, size.y, size.z);
    // mobile: size by viewport HEIGHT so the phone fits between the nav and the subtitle on short screens
    targetScale = ((isMobile() ? visH : Math.min(visW, visH)) * fill) / maxDim;
    modelHolder.scale.setScalar(targetScale);
  }

  {
    const built = buildPhone();
    setTask('model', 1);
    model = built.group;
    const best = built.screen;
    overlayMat = built.overlay.material;

    if (best) {
      const emo = isMobile()
        ? new THREE.MeshBasicMaterial({ map: heroVid.tex, side: THREE.FrontSide, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
        : new THREE.MeshStandardMaterial({
            map: heroVid.tex, emissive: 0xffffff, emissiveMap: heroVid.tex, emissiveIntensity: 1.25,
            roughness: 0.35, metalness: 0, envMapIntensity: 0.15, toneMapped: false,
            side: THREE.FrontSide, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
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
    if (overlayMat) { overlayMat.map = band < 0.5 ? heroVid.overlayTex : termVid.overlayTex; overlayMat.needsUpdate = true; }
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
    flipScaleGroup.position.y = lerp(isMobile() ? 0.0012 : HERO_Y_OFFSET, finalPos.y, arrival); // mobile: sit over the wordmark

    // rotation
    const rx = lerp(77, isMobile() ? 90 : 85, rotP) * DEG;
    const ry = lerp(-11, isMobile() ? 0 : 1, rotP) * DEG;
    const rz = lerp(16, isMobile() ? 0 : -13.6, rotP) * DEG;
    const extraZ = isMobile() ? 0 : Math.PI * 2 * rotP;
    modelHolder.rotation.set(rx, ry, rz + extraZ);

    // finalOffsetGroup extra rot + scale on arrival (desktop)
    if (!isMobile()) {
      finalOffsetGroup.rotation.set(0.13 * arrival, -0.198 * arrival, -0.005 * arrival);
      finalOffsetGroup.scale.setScalar(lerp(1, ARRIVAL_SCALE, arrival));
    } else {
      finalOffsetGroup.scale.setScalar(lerp(1, ARRIVAL_SCALE_MOBILE, arrival)); // grow when it lands in Producto
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
        if (overlayMat) { overlayMat.map = termVid.overlayTex; overlayMat.needsUpdate = true; }
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
      sessionStorage.setItem('__comando_resize_reload', 'true');
      location.reload();
    }
  });
})();

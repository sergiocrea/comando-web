/* ============================================================
   hero3d.js — preloader + hero Three.js scene (rewritten)
   Reproduces the original heroScript behaviour: a weighted load
   registry driving the preloader counter and its staggered exit,
   then the floating iPhone (procedural) that flies from the hero into the
   #target slot as you scroll, with mouse tilt, idle float, a full
   Z spin and a logo->terminal crossfade on its (canvas-drawn) screen.
   ============================================================ */

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });


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
regTask('model', 2);
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

/* ============================================================
   2D hero: phone frame + WhatsApp chat + floating bubbles on ONE canvas
   (replaces the Three.js scene; ~10x cheaper, no WebGL)
   ============================================================ */
(function buildHero2D() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) { setTask('model', 1); return; }
  const CW = 1240, CH = 1560, PX = 260, PY = 42; // phone glass (720x1476) sits at PX,PY
  canvas.width = CW; canvas.height = CH;
  const ctx = canvas.getContext('2d');
  let dirty = false;
  // device screens: WhatsApp-style chat. Two canvases per screen:
  //  - screen  (720x1476): bezel, wallpaper, header, input bar (typing simulation)
  //  - overlay (1240x1476, transparent): the bubbles, drawn LARGE and allowed to stick out of the phone
  const ACCENT = '#4d7cff';
  // ---- scenarios (edit ACTIVE to choose which ones play in the hero / in Producto) ----
  const SCENARIOS = {
    reasignar: [
      { from: 'me',  text: 'reasigna el deal de la constructora a Ana' },
      { from: 'bot', text: 'Listo ✓ "Constructora Andina" ahora es de Ana. Se le notificó por WhatsApp.' },
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
  const SCRIPTS = { all: [...ACTIVE.logo, ...ACTIVE.term].flatMap((k) => SCENARIOS[k]) };

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
  const SCREEN_W = 720, SCREEN_H = 1476, OVER_W = 1240; // OVER_W/SCREEN_W = overlay plane width ratio
  const OVERLAY_RATIO = OVER_W / SCREEN_W;

  function makeScreen(kind) {
    const W = SCREEN_W, H = SCREEN_H;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const oc = document.createElement('canvas'); oc.width = OVER_W; oc.height = H;
    const octx = oc.getContext('2d');
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
      if (active && now - last > (isMobile() ? 66 : 40)) { last = now; draw(now - start.t0); dirty = true; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    draw(0); dirty = true;
    const v = { play() { active = true; return Promise.resolve(); }, pause() { active = false; }, set currentTime(x) { start.t0 = performance.now() - x * 1000; }, get currentTime() { return (performance.now() - start.t0) / 1000; } };
    return { v, c, oc };
  }
  const chat = makeScreen('all');

  function drawFrame() {
    const W = 720, L = 1476, R = 118; // glass size; body corner radius (px)
    const T = 22; // frame thickness
    // body
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
    const g = ctx.createLinearGradient(PX, PY, PX + W, PY + L); g.addColorStop(0, '#4a4a4d'); g.addColorStop(0.5, '#2a2a2c'); g.addColorStop(1, '#3a3a3d');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(PX - T, PY - T, W + T * 2, L + T * 2, R + T); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(PX - T + 1, PY - T + 1, W + T * 2 - 2, L + T * 2 - 2, R + T); ctx.stroke();
    // side buttons
    ctx.fillStyle = '#3c3c3f';
    ctx.fillRect(PX + W + T - 2, PY + 330, 8, 150); // power
    ctx.fillRect(PX - T - 6, PY + 250, 8, 60); ctx.fillRect(PX - T - 6, PY + 340, 8, 110); ctx.fillRect(PX - T - 6, PY + 470, 8, 110); // action + volume
  }
  function composite() {
    ctx.clearRect(0, 0, CW, CH);
    drawFrame();
    ctx.drawImage(chat.c, PX, PY);       // screen (already has bezel + rounded corners)
    ctx.drawImage(chat.oc, 0, PY);       // bubbles overlay (wider than the phone)
  }
  (function loop() { requestAnimationFrame(loop); if (dirty) { dirty = false; composite(); } })();
  composite();
  setTask('model', 1);
  heroScene = { start() { chat.v.play(); } };
})();

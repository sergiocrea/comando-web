/* ============================================================
   main.js — site UI logic (rewritten from scratch)
   Replaces the original site script + the page's inline scripts:
   Native scroll, data-reveal engine, divider lines, grid
   canvas spotlight, nav background + hero-logo->nav morph, mobile
   menu, scroll-scrubbed feature video + Lottie, footer
   globe. Uses GSAP/ScrollTrigger/SplitText/ScrambleText from
   the global scope (loaded via <script> in index.html).
   ============================================================ */
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
if (window.SplitText) gsap.registerPlugin(window.SplitText);
if (window.ScrambleTextPlugin) gsap.registerPlugin(window.ScrambleTextPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const mm = window.matchMedia;
const isMobile = () => window.innerWidth <= 767;
const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- run once the preloader has been removed ---------- */
function runAfterPreloader(cb) {
  const pre = document.getElementById('preloader');
  if (!pre) { cb(); return; }
  const obs = new MutationObserver(() => {
    if (!document.getElementById('preloader')) { obs.disconnect(); cb(); }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ============================================================
   1. data-reveal engine (block / text / scramble / fade)
   trigger: top 85%, defaults duration 1, delay 0.25, stagger 0.1
   ============================================================ */
function initReveals() {
  const els = document.querySelectorAll('[data-reveal]');
  els.forEach((el) => {
    if (el.dataset._revealed) return;
    el.dataset._revealed = '1';
    const mode = el.getAttribute('data-reveal');
    const duration = parseFloat(el.getAttribute('data-duration')) || 1;
    const delay = parseFloat(el.getAttribute('data-delay')) || 0.25;
    const stagger = parseFloat(el.getAttribute('data-stagger')) || 0.1;
    const st = { trigger: el, start: 'top 85%', toggleActions: 'play none none none' };

    if (mode === 'fade') {
      gsap.set(el, { opacity: 0, visibility: 'visible' });
      gsap.to(el, { opacity: 1, duration, delay, ease: 'power2.out', scrollTrigger: st });

    } else if (mode === 'block') {
      gsap.set(el, { y: 40, opacity: 0 });
      gsap.to(el, { y: 0, opacity: 1, duration, delay, ease: 'power2.out', scrollTrigger: st });

    } else if (mode === 'text') {
      if (isTouch() || !window.SplitText) {
        gsap.set(el, { opacity: 0 });
        gsap.to(el, { opacity: 1, duration, delay, ease: 'power2.out', scrollTrigger: st });
      } else {
        const run = () => {
          const split = new window.SplitText(el, { type: 'lines', linesClass: 'split-line' });
          gsap.set(split.lines, { yPercent: 100, opacity: 0 });
          gsap.to(split.lines, {
            yPercent: 0, opacity: 1, duration, delay, stagger,
            ease: 'power2.out', scrollTrigger: st,
          });
        };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
        else run();
      }

    } else if (mode === 'scramble') {
      const text = el.innerText;
      gsap.set(el, { opacity: 0 });
      gsap.to(el, {
        opacity: 1, duration, delay, ease: 'power2.out', scrollTrigger: st,
        scrambleText: { text, chars: 'upperCase', revealDelay: 0.1, speed: 0.3 },
      });
    }
  });
}

/* ---------- divider lines: width 0 -> natural ---------- */
function initDividers() {
  document.querySelectorAll('.divider-line').forEach((line) => {
    if (line.dataset._div) return;
    line.dataset._div = '1';
    const target = line.getBoundingClientRect().width || line.offsetWidth;
    gsap.fromTo(line, { width: 0 }, {
      width: target, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: line, start: 'top 85%', toggleActions: 'play none none none' },
    });
  });
}

/* ============================================================
   3. Interactive grid background canvas (>=992px only)
   ============================================================ */
function initGridCanvas() {
  const canvas = document.getElementById('gridCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const CFG = {
    gridSize: 30, baseLineColor: '#0e0e0e', highlightColor: '#FAFAFA',
    highlightOpacity: 0.46, blurAmount: 100, spotlightRadius: 200,
    wobbleSpeed: 0.003, mouseLag: 0.1,
  };
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');
  const ua = navigator.userAgent;
  const needsFallback = /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);

  let W = 0, H = 0, raf = 0, running = false, t = 0;
  const mouse = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  function resize() {
    W = canvas.width = mask.width = window.innerWidth;
    H = canvas.height = mask.height = window.innerHeight;
  }
  function drawGrid(context, color) {
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= W; x += CFG.gridSize) { context.moveTo(x + 0.5, 0); context.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += CFG.gridSize) { context.moveTo(0, y + 0.5); context.lineTo(W, y + 0.5); }
    context.stroke();
  }
  function frame() {
    t += CFG.wobbleSpeed;
    cur.x += (mouse.x - cur.x) * CFG.mouseLag;
    cur.y += (mouse.y - cur.y) * CFG.mouseLag;

    ctx.clearRect(0, 0, W, H);
    drawGrid(ctx, CFG.baseLineColor);

    // spotlight mask
    mctx.clearRect(0, 0, W, H);
    mctx.save();
    if (needsFallback) {
      const wob = { x: Math.sin(3 * t) * 12 + Math.cos(5 * t) * 8, y: Math.cos(3 * t) * 10 };
      const g = mctx.createRadialGradient(cur.x + wob.x, cur.y + wob.y, 0, cur.x + wob.x, cur.y + wob.y, 300);
      g.addColorStop(0, `rgba(255,255,255,${CFG.highlightOpacity})`);
      g.addColorStop(0.45, `rgba(255,255,255,${CFG.highlightOpacity * 0.6})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, W, H);
    } else {
      mctx.filter = `blur(${CFG.blurAmount}px)`;
      mctx.beginPath();
      const steps = 64;
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const r = CFG.spotlightRadius +
          Math.sin(a * 3 + t) * 20 + Math.cos(a * 5 - t) * 15 + Math.sin(2 * t) * 5;
        const px = cur.x + Math.cos(a) * r;
        const py = cur.y + Math.sin(a) * r;
        i === 0 ? mctx.moveTo(px, py) : mctx.lineTo(px, py);
      }
      mctx.closePath();
      mctx.fillStyle = `rgba(255,255,255,${CFG.highlightOpacity})`;
      mctx.fill();
    }
    mctx.restore();

    // composite highlight-colored grid into the mask
    mctx.globalCompositeOperation = 'source-in';
    drawGrid(mctx, CFG.highlightColor);
    mctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(mask, 0, 0);
    raf = requestAnimationFrame(frame);
  }
  function onMove(e) { mouse.x = e.clientX; mouse.y = e.clientY; }
  function start() {
    if (running) return;
    running = true;
    resize();
    mouse.x = cur.x = W / 2; mouse.y = cur.y = H / 2;
    window.addEventListener('mousemove', onMove);
    window.addEventListener('resize', resize);
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, W, H);
  }
  const q = mm('(min-width: 992px)');
  const apply = () => (q.matches ? start() : stop());
  q.addEventListener('change', apply);
  apply();
}

/* ============================================================
   4. Nav: background on scroll + hero logo -> nav morph
   ============================================================ */
function initNav() {
  const nav = document.querySelector('.nav_component');
  if (nav) {
    const syncNavHeight = () => {
      document.documentElement.style.setProperty('--nav-height', `${Math.ceil(nav.getBoundingClientRect().height)}px`);
    };
    syncNavHeight();
    window.addEventListener('resize', syncNavHeight, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(syncNavHeight).observe(nav);
    nav.style.transition = 'background 0.3s ease';
    let menuOpen = false;
    const update = () => {
      nav.classList.toggle('is-open', menuOpen);
      nav.classList.toggle('is-scrolled', window.scrollY > 60);
      nav.style.backgroundImage = 'none';
      nav.style.backgroundColor = menuOpen ? '#f8f7f3' : 'rgba(248,247,243,.94)';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    // watch the Webflow nav button open/close to force solid bg
    const btn = document.querySelector('.w-nav-button');
    if (btn) {
      new MutationObserver(() => {
        menuOpen = btn.classList.contains('w--open');
        update();
      }).observe(btn, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // hero logo -> nav logo morph (desktop >=992px)
  ScrollTrigger.matchMedia({
    '(min-width: 992px)': () => {
      const logo = document.getElementById('hero-logo-large-to-move');
      const source = document.getElementById('hero-logo-source');
      const dest = document.getElementById('nav-logo-destination');
      const dummy = document.getElementById('dummy');
      if (!logo || !source || !dest) return;

      // Measure the logo IN PLACE (real size + document-space position) before detaching.
      const lRect = logo.getBoundingClientRect();
      if (lRect.width < 40 || lRect.height < 8) return; // safety: leave it centered in the hero
      const startW = lRect.width;
      const startH = lRect.height;
      const startLeft = lRect.left;
      const startDocTop = lRect.top + window.scrollY; // where it sits at scrollY = 0

      // Reserve the vacated space so the hero layout doesn't collapse.
      source.style.minHeight = startH + 'px';

      // Detach to <body> as a fixed layer, preserving its rendered size.
      logo.style.width = startW + 'px';
      logo.style.height = startH + 'px';
      document.body.appendChild(logo);
      // z=0 keeps the wordmark above the background grid but BEHIND the 3D
      // device canvas (#app, z=1), matching the original stacking.
      Object.assign(logo.style, {
        position: 'fixed', left: '0', top: '0', margin: '0',
        zIndex: '0', transformOrigin: 'top left', pointerEvents: 'none',
      });

      // The nav logo slot occupies width 0 at rest (so it doesn't push the nav
      // links) and grows to its full width as the hero wordmark morphs in.
      // overflow:visible keeps its image showing while the box is collapsed.
      const destFullW = dest.getBoundingClientRect().width || 192;
      dest.style.overflow = 'visible';
      dest.style.flex = '0 0 auto';

      let prog = 0;
      const place = () => {
        dest.style.width = (destFullW * prog) + 'px';
        const d = dest.getBoundingClientRect();
        const dCenterX = d.left + destFullW / 2; // real image center even when box is collapsed
        const targetScale = Math.min(destFullW / startW, 1);
        const sc = lerp(1, targetScale, prog);
        // start position scrolls with the hero; end position is the fixed nav slot
        const startY = startDocTop - window.scrollY;
        const x = lerp(startLeft, dCenterX - (startW * sc) / 2, prog);
        const y = lerp(startY, d.top, prog);
        logo.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
        // The nav's own logo image stays visible; the morphing wordmark fades
        // out as it lands so the two never both show at full size.
        logo.style.opacity = String(1 - prog);
      };
      if (dummy) dummy.style.opacity = '1';

      const st = ScrollTrigger.create({
        trigger: '#hero', start: 'top top', end: 'center top+=30%', scrub: true,
        onUpdate: (self) => { prog = self.progress; place(); },
        onRefresh: () => place(),
      });
      // keep following the scroll while progress is 0 (logo still scrolling with hero)
      window.addEventListener('scroll', place, { passive: true });
      place();

      // nav link x-shifts scrubbed over the same range
      const links = {
        home: document.querySelector('a[href="#hero"]'),
        about: document.querySelector('a[href="#about"]'),
        features: document.getElementById('nav-logo'),
        spec: document.getElementById('spec'),
        order: document.getElementById('mailing-list'),
      };
      const shift = (el, x) => el && gsap.to(el, {
        x, ease: 'none',
        scrollTrigger: { trigger: '#hero', start: 'top top', end: 'center top+=30%', scrub: true },
      });
      shift(links.about, -40);
      shift(links.features, -80);
      shift(links.spec, 21);
      shift(dest, -50);

      return () => { st.kill(); window.removeEventListener('scroll', place); };
    },
  });
}

/* ============================================================
   5. Mobile menu link stagger (<=991px)
   ============================================================ */
function initMobileMenu() {
  ScrollTrigger.matchMedia; // (no-op guard so treeshakers keep import)
  const links = gsap.utils.toArray('.nav_menu_link');
  const btn = document.querySelector('.w-nav-button');
  if (!btn || !links.length) return;

  const unlockScroll = () => {
    if (document.body.classList.contains('sheet-open')) return;
    document.body.classList.remove('no-scroll');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  };
  unlockScroll();
  window.addEventListener('pageshow', unlockScroll);
  links.forEach((link) => link.addEventListener('click', unlockScroll));
  const desktop = window.matchMedia('(min-width: 992px)');
  const unlockOnDesktop = () => { if (desktop.matches) unlockScroll(); };
  desktop.addEventListener('change', unlockOnDesktop);

  mmGSAP('(max-width: 991px)', () => {
    gsap.set(links, { opacity: 0, y: 50, scale: 0.95, filter: 'blur(10px)' });
    const open = () => {
      document.body.classList.add('no-scroll');
      gsap.to(links, {
        opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
        duration: 0.8, ease: 'expo.out', stagger: { each: 0.08, from: 'start' }, delay: 0.2,
      });
    };
    const close = () => {
      unlockScroll();
      gsap.to(links, {
        opacity: 0, y: 50, scale: 0.95,
        duration: 0.35, ease: 'power2.inOut', stagger: { each: 0.04, from: 'end' },
      });
    };
    new MutationObserver(() => {
      btn.classList.contains('w--open') ? open() : close();
    }).observe(btn, { attributes: true, attributeFilter: ['class'] });
  });
}
function mmGSAP(query, fn) {
  const m = gsap.matchMedia();
  m.add(query, fn);
}

/* ============================================================
   6. Feature video scrub (5 phases) + Lottie sync
   VIDEO_FPS 30; frames driven by ScrollTrigger
   ============================================================ */
function initFeatureVideo() {
  const video = document.getElementById('scroll-video');
  if (!video) return;
  const FPS = 30;
  const target = { frame: 0 };
  let pending = false;
  const isCanvas = video.tagName === 'CANVAS';
  const ctx2d = isCanvas ? video.getContext('2d') : null;
  const applyFrame = () => {
    pending = false;
    if (isCanvas) { if (window.drawFeatureScreen) window.drawFeatureScreen(ctx2d, video.width, video.height, target.frame); }
    else if (video.duration) video.currentTime = Math.min(target.frame / FPS, video.duration - 0.001);
  };
  const setFrame = (f) => { target.frame = f; if (!pending) { pending = true; requestAnimationFrame(applyFrame); } };
  if (isCanvas) applyFrame(); else video.pause();

  // ---- Lottie player control ----
  const lottieEl = document.querySelector('dotlottie-player');
  let lottie = null;
  const grabLottie = () => {
    if (!lottieEl) return;
    const inst = lottieEl.getLottie && lottieEl.getLottie();
    if (inst) { lottie = inst; lottie.pause(); }
  };
  [0, 100, 300, 700, 1200, 2000, 3500, 5000].forEach((d) => setTimeout(grabLottie, d));
  if (lottieEl) {
    lottieEl.addEventListener('ready', grabLottie);
    lottieEl.addEventListener('load', grabLottie);
  }
  const setLottiePct = (pct) => {
    if (!lottie) return;
    const total = lottie.totalFrames || 0;
    lottie.goToAndStop(Math.max(0, (pct / 100) * (total - 1)), true);
  };

  const lottieCont = document.querySelector('.lottie-container');
  const fadeLottie = (o) => lottieCont && gsap.to(lottieCont, { opacity: o, duration: 0.45, ease: 'power2.out' });

  // desktop phase logic
  mmGSAP('(min-width: 767px)', () => {
    // PHASE 1: autoplay 0->50 over 2s when sticky grid hits top 50%
    gsap.to(target, {
      frame: 50, duration: 2, ease: 'power1.inOut', onUpdate: () => setFrame(target.frame),
      scrollTrigger: { trigger: '.sticky-block-grid', start: 'top 50%', once: true },
    });
    // PHASE 2: 50->160
    gsap.to(target, {
      frame: 160, ease: 'none', onUpdate: () => setFrame(target.frame),
      scrollTrigger: { trigger: '.sticky-block-grid', start: 'top 20%', end: 'bottom top', scrub: true },
    });
    // phone: slide from the left column (Funciones) to the center (Modo automático)
    const phoneWrap = document.querySelector('.sticky-block-grid .section_middle-slider');
    if (phoneWrap && document.getElementById('lottiee-section')) {
      gsap.fromTo(phoneWrap, { x: 0 }, {
        x: () => {
          const g = phoneWrap.parentElement.getBoundingClientRect();
          const r = phoneWrap.getBoundingClientRect();
          const curX = Number(gsap.getProperty(phoneWrap, 'x')) || 0;
          return (g.left + g.width / 2) - ((r.left - curX) + r.width / 2);
        },
        ease: 'none',
        scrollTrigger: { trigger: '#lottiee-section', start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true },
      });
    }
    // PHASE 3: 160->200
    if (document.getElementById('lottiee-section')) gsap.to(target, {
      frame: 200, ease: 'none', onUpdate: () => setFrame(target.frame),
      scrollTrigger: { trigger: '#lottiee-section', start: 'top bottom', end: 'top top', scrub: true },
    });
    // PHASE 4: video 200->500 + lottie 0->50%, on #trigger-2 over +2vh
    const t2 = document.getElementById('trigger-2');
    if (t2) {
      const p4 = { v: 200, l: 0 };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: t2, start: 'top bottom', end: () => '+=' + window.innerHeight * 2, scrub: true,
          onEnter: () => fadeLottie(1), onLeaveBack: () => fadeLottie(0),
        },
      });
      tl.to(p4, {
        v: 409, l: 20, ease: 'none', duration: 209 / 300,
        onUpdate: () => { setFrame(p4.v); setLottiePct(p4.l); },
      });
      tl.to(p4, {
        v: 500, l: 50, ease: 'none', duration: 91 / 300,
        onUpdate: () => { setFrame(p4.v); setLottiePct(p4.l); },
      });
    }
    // PHASE 5: 500->680 (only if the section exists)
    if (document.getElementById('router-details')) gsap.to(target, {
      frame: 680, ease: 'none', onUpdate: () => setFrame(target.frame),
      scrollTrigger: { trigger: '#router-details', start: 'top center', end: '70% top', scrub: true },
    });
    // LOTTIE 50->100%
    const lp = { l: 50 };
    if (document.getElementById('router-details')) gsap.to(lp, {
      l: 100, ease: 'none', onUpdate: () => setLottiePct(lp.l),
      scrollTrigger: { trigger: '#router-details', start: 'top 80%', end: 'top top', scrub: true },
    });
    // PHASE 5 GUARD: hide lottie under router
    if (document.getElementById('router-details')) ScrollTrigger.create({
      trigger: '#router-details', start: 'top 92%', end: 'bottom top',
      onEnter: () => fadeLottie(0), onLeaveBack: () => fadeLottie(1),
    });
  });

  // mobile: scrub the whole lottie
  mmGSAP('(max-width: 766px)', () => {
    if (!lottieCont) return;
    const lp = { l: 0 };
    gsap.to(lp, {
      l: 100, ease: 'none', onUpdate: () => setLottiePct(lp.l),
      scrollTrigger: { trigger: '.lottie-container', start: 'top 90%', end: 'bottom 10%', scrub: 0.5 },
    });
  });
}

/* ============================================================
   7. Feature slider parallax (rAF on scroll)
   ============================================================ */
function initSliderParallax() {
  const trigger = document.getElementById('trigger-1');
  const left = document.querySelector('.section_left-slider-wrap');
  const bottom = document.querySelector('.section_bottom-slider');
  const mobRes = document.getElementById('mob-res');
  if (!trigger) return;

  function frame() {
    const rect = trigger.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / window.innerHeight));
    if (window.innerWidth > 767) {
      // desktop: the block stays pinned while #trigger-1 (150svh) scrolls through;
      // spread the movement over that whole pinned range
      const p2 = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / rect.height));
      // row 1 starts just below the top band; the travel adapts to the viewport so the last row is reachable on short screens
      const colH = (left || bottom) ? Math.max(left ? left.offsetHeight : 0, bottom ? bottom.offsetHeight : 0) : 0;
      const startY = 18;
      const endY = colH ? Math.min(-28, -((colH - window.innerHeight * 0.8) / colH) * 100) : -28;
      const y = startY - p2 * (startY - endY);
      if (left) left.style.transform = `translateY(${y}%)`;
      if (bottom) bottom.style.transform = `translateY(${y}%)`;
    } else {
      const y = -p * 50; // 0 -> -50%
      if (left) left.style.transform = `translateY(${y}%)`;
      if (bottom) bottom.style.transform = `translateY(${y}%)`;
      if (mobRes) {
        const wrap = mobRes.parentElement;
        const over = mobRes.offsetHeight - (wrap ? wrap.offsetHeight : 0);
        if (over > 0) mobRes.style.transform = `translateY(${-(over / mobRes.offsetHeight) * 100 * p}%)`;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ============================================================
   9. Footer wireframe globe (2D canvas)
   ============================================================ */
function initGlobe() {
  const canvas = document.getElementById('wf-globe');
  const wrap = canvas && canvas.parentElement;
  if (!canvas || !wrap) return;
  const ctx = canvas.getContext('2d');
  const LAT = 15, LON = 15, SEG = 180, SPEED = 0.005;
  let size = 0, R = 0, rot = 0, raf = 0;
  const rad = (d) => (d * Math.PI) / 180;
  function resize() {
    size = Math.min(wrap.clientWidth, wrap.clientHeight) || 300;
    canvas.width = canvas.height = size;
    R = size * 0.41;
  }
  function project(latDeg, lonDeg) {
    const la = rad(latDeg), lo = rad(lonDeg) + rot;
    const x = R * Math.cos(la) * Math.sin(lo);
    const y = R * Math.sin(la);
    const z = R * Math.cos(la) * Math.cos(lo);
    return { x: size / 2 + x, y: size / 2 - y, z };
  }
  function stroke(pts) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const front = (a.z + b.z) / 2 >= 0;
      ctx.strokeStyle = front ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  function frame() {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(size / 2, size / 2, R, 0, Math.PI * 2); ctx.clip();
    for (let lat = -90 + LAT; lat < 90; lat += LAT) {
      const pts = [];
      for (let i = 0; i <= SEG; i++) pts.push(project(lat, (i / SEG) * 360));
      stroke(pts);
    }
    for (let lon = 0; lon < 360; lon += LON) {
      const pts = [];
      for (let i = 0; i <= SEG; i++) pts.push(project(-90 + (i / SEG) * 180, lon));
      stroke(pts);
    }
    ctx.restore();
    rot += SPEED;
    raf = requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener('resize', resize);
  frame();
  void raf;
}

/* ============================================================
   10. About / hero-canvas fade-out (>=768px)
   ============================================================ */
function initAboutFade() {
  mmGSAP('(min-width: 768px)', () => {
    const about = document.getElementById('about');
    const app = document.getElementById('app');
    const targets = [about, app].filter(Boolean);
    if (!targets.length) return;
    gsap.fromTo(targets, { opacity: 1 }, {
      opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '#features-padding', start: 'top 30%', end: 'top top', scrub: true },
    });
  });

  // router-details content reveal (>=768px)
  mmGSAP('(min-width: 768px)', () => {
    const wrap = document.querySelector('.home_defence-content-wrap');
    if (!wrap || !document.getElementById('router-details')) return;
    const heading = wrap.querySelector('.home_defence-heading') || wrap.children[0];
    const desc = wrap.querySelector('.home_defence-description') || wrap.children[1];
    const targets = [heading, desc].filter(Boolean);
    gsap.to(targets, {
      yPercent: -20, opacity: 0, duration: 0.45, ease: 'power2.out', stagger: 0.2,
      scrollTrigger: { trigger: '#router-details', start: 'top 76%', toggleActions: 'play none none reverse' },
    });
  });
}

/* ============================================================
   Boot
   ============================================================ */
function boot() {
  if (!document.querySelector('.w-nav-button.w--open')) {
    document.body.classList.remove('no-scroll');
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');
  }
  initGridCanvas();
  initNav();
  initMobileMenu();
  initFeatureVideo();
  initSliderParallax();
  initGlobe();
  initAboutFade();
  initReveals();
  initDividers();
  ScrollTrigger.refresh();
  // Segundo refresco cuando el layout ya asentó. Al recargar con la página
  // desplazada, las posiciones se miden antes de las fuentes, el video y el
  // canvas; con medidas viejas el scrub de #about arranca en opacity 0 y la
  // sección se ve negra hasta recargar arriba del todo.
  const settle = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  setTimeout(settle, 700);
}

if (document.readyState === 'complete') runAfterPreloader(boot);
else window.addEventListener('load', () => runAfterPreloader(boot));

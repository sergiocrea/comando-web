/* ============================================================
   atribucion.js — la animación de «Trae más clientes como los que ya compraron».
   Cuatro pasos en bucle (19,5 s):
     1. Los anuncios de Meta traen 10 contactos al CRM.
     2. En el CRM, 3 compran (verde); el resto se apaga.
     3. Comando manda esas ventas de vuelta a Meta.
     4. Meta busca gente parecida: llegan 10 contactos nuevos y compran 5.
   Todo sale de `render(t)`: una función pura del segundo del bucle. Así un clic
   en un paso, la pausa y `prefers-reduced-motion` solo cambian `t`.
   Los textos están en index.html (los traduce tooling/i18n.mjs); aquí solo se
   dibuja. Las cajas HTML se colocan con la misma geometría que el SVG.
   Sin dependencias.
   ============================================================ */
(function () {
  const root = document.querySelector('[data-attr]');
  if (!root) return;
  const stage = root.querySelector('.attr-stage');
  const svg = root.querySelector('[data-attr-svg]');
  const salesOut = root.querySelector('[data-attr-sales]');
  const steps = [...root.querySelectorAll('.attr-step')];
  const pauseBtn = root.querySelector('[data-attr-pause]');
  // En móvil la lista enseña solo los números; el texto del paso activo se copia aquí.
  const caption = root.querySelector('.attr-caption');
  let shownPhase = -1;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');

  const LOOP = 19.5;
  const PHASES = [0, 4.5, 9, 13.5, LOOP];
  const SALES_A = [1, 4, 7];
  const SALES_B = [0, 2, 5, 7, 8];

  // Geometría en unidades del viewBox. Las cajas HTML usan los mismos números.
  const LAYOUTS = {
    wide: {
      w: 1000, h: 500,
      meta: { x: 30, y: 50, w: 250, h: 330 },
      crm: { x: 720, y: 50, w: 250, h: 330 },
      hub: { cx: 500, cy: 432, w: 150, h: 44 },
      chipLead: { cx: 500, cy: 30, w: 170, h: 30 },
      chipSale: { cx: 500, cy: 355, w: 190, h: 30 },
      forward: 'M280 140 C 420 30, 580 30, 720 140',
      back: 'M720 330 C 600 470, 400 470, 280 330',
      slots: { xs: [760, 805, 850, 895, 940], ys: [245, 305], r: 15 },
    },
    tall: {
      w: 360, h: 620,
      meta: { x: 16, y: 12, w: 328, h: 160 },
      crm: { x: 16, y: 420, w: 328, h: 188 },
      hub: { cx: 262, cy: 296, w: 116, h: 38 },
      chipLead: { cx: 104, cy: 296, w: 136, h: 28 },
      chipSale: { cx: 262, cy: 240, w: 150, h: 28 },
      forward: 'M100 172 C 36 250, 36 342, 100 420',
      back: 'M260 420 C 324 342, 324 250, 260 172',
      slots: { xs: [58, 119, 180, 241, 302], ys: [522, 574], r: 18 },
    },
  };

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const el = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    parent.appendChild(node);
    return node;
  };

  let L, pathF, pathB, lenF, lenB, gen, signals, hubPulse;

  function place(node, box) {
    const x = box.x ?? box.cx - box.w / 2;
    const y = box.y ?? box.cy - box.h / 2;
    Object.assign(node.style, {
      left: `${(x / L.w) * 100}%`, top: `${(y / L.h) * 100}%`,
      width: `${(box.w / L.w) * 100}%`, height: `${(box.h / L.h) * 100}%`,
    });
  }

  function person(parent) {
    const g = el('g', { class: 'attr-person' }, parent);
    el('circle', { r: 1, class: 'attr-dot' }, g);
    el('path', { d: 'M-4.5 3.5 -1 7 5.5 -1', class: 'attr-tick' }, g);
    el('circle', { r: 1, class: 'attr-ring' }, g);
    return g;
  }

  function build() {
    L = narrow.matches ? LAYOUTS.tall : LAYOUTS.wide;
    root.classList.toggle('is-tall', L === LAYOUTS.tall);
    stage.style.aspectRatio = `${L.w} / ${L.h}`;
    svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`);
    place(root.querySelector('.attr-meta'), L.meta);
    place(root.querySelector('.attr-crm'), L.crm);
    place(root.querySelector('.attr-hub'), L.hub);
    place(root.querySelector('.attr-chip-lead'), L.chipLead);
    place(root.querySelector('.attr-chip-sale'), L.chipSale);

    svg.textContent = '';
    pathF = el('path', { d: L.forward, class: 'attr-path' }, svg);
    pathB = el('path', { d: L.back, class: 'attr-path is-back' }, svg);
    lenF = pathF.getTotalLength();
    lenB = pathB.getTotalLength();
    const slotLayer = el('g', {}, svg);
    L.slots.ys.forEach((y) => L.slots.xs.forEach((x) => el('circle', { cx: x, cy: y, r: L.slots.r, class: 'attr-slot' }, slotLayer)));
    const people = el('g', {}, svg);
    gen = [0, 1].map(() => Array.from({ length: 10 }, () => person(people)));
    signals = Array.from({ length: SALES_A.length }, () => el('circle', { r: 7, class: 'attr-signal' }, svg));
    hubPulse = root.querySelector('.attr-hub');
  }

  const slotXY = (i) => ({ x: L.slots.xs[i % 5], y: L.slots.ys[Math.floor(i / 5)] });

  // Un contacto: viaja por la ruta de ida y se acomoda en su casilla.
  function drawPerson(g, i, t, start, travel, isSale, saleAt, dimAt, fadeOutAt) {
    const pTravel = prog(t, start, travel);
    const pSettle = prog(t, start + travel, 0.35);
    const visible = t >= start && (fadeOutAt == null || t < fadeOutAt + 0.4);
    g.style.display = visible ? '' : 'none';
    if (!visible) return;
    const end = pathF.getPointAtLength(lenF);
    const slot = slotXY(i);
    let x, y, r;
    if (pTravel < 1) {
      const pt = pathF.getPointAtLength(lenF * ease(pTravel));
      x = pt.x; y = pt.y; r = 7;
    } else {
      const k = ease(pSettle);
      x = end.x + (slot.x - end.x) * k; y = end.y + (slot.y - end.y) * k;
      r = 7 + (L.slots.r - 3 - 7) * k;
    }
    const sold = isSale && t >= saleAt;
    let opacity = 1;
    if (!isSale && dimAt != null) opacity = 1 - 0.65 * prog(t, dimAt, 0.5);
    if (fadeOutAt != null) opacity *= 1 - prog(t, fadeOutAt, 0.4);
    g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.style.opacity = opacity.toFixed(3);
    g.classList.toggle('is-sale', sold);
    g.firstChild.setAttribute('r', r.toFixed(2));
    const ring = g.lastChild;
    const pr = sold ? prog(t, saleAt, 0.7) : 1;
    ring.setAttribute('r', (L.slots.r - 3 + 14 * pr).toFixed(2));
    ring.style.opacity = (sold && pr < 1 ? 1 - pr : 0).toFixed(3);
  }

  function render(t) {
    const phase = PHASES.findIndex((p, i) => t >= p && t < PHASES[i + 1]);
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === phase);
      s.classList.toggle('is-done', i < phase);
      const bar = s.querySelector('.attr-bar i');
      bar.style.transform = `scaleX(${i < phase ? 1 : i === phase ? prog(t, PHASES[i], PHASES[i + 1] - PHASES[i]).toFixed(3) : 0})`;
      s.querySelector('button').setAttribute('aria-current', i === phase ? 'step' : 'false');
    });

    if (phase !== shownPhase) {
      shownPhase = phase;
      const s = steps[phase];
      caption.querySelector('.attr-caption-t').textContent = s.querySelector('.attr-step-t').textContent;
      caption.querySelector('.attr-caption-p').textContent = s.querySelector('p').textContent;
    }
    caption.querySelector('.attr-bar i').style.transform = steps[phase].querySelector('.attr-bar i').style.transform;

    let sales = 0;
    // Generación A: los contactos de siempre.
    gen[0].forEach((g, i) => {
      const isSale = SALES_A.includes(i);
      const saleAt = 5 + SALES_A.indexOf(i) * 0.5;
      if (isSale && t >= saleAt && t < 13.5) sales++;
      drawPerson(g, i, t, 0.2 + i * 0.22, 1.2, isSale, saleAt, 6.6, 13.3);
    });
    // Generación B: después de que Meta aprende.
    gen[1].forEach((g, i) => {
      const start = 13.9 + i * 0.2;
      const isSale = SALES_B.includes(i);
      const saleAt = start + 1.2 + 0.35;
      if (isSale && t >= saleAt) sales++;
      drawPerson(g, i, t, start, 1.2, isSale, saleAt, null, 19);
    });
    salesOut.textContent = String(sales);

    // Las ventas vuelven a Meta pasando por Comando.
    let hubHot = false;
    signals.forEach((c, k) => {
      const start = 9.3 + k * 0.5;
      const from = slotXY(SALES_A[k]);
      const p0 = pathB.getPointAtLength(0);
      const pLift = prog(t, start, 0.35);
      const pBack = prog(t, start + 0.35, 1.9);
      const on = t >= start && pBack < 1;
      c.style.display = on ? '' : 'none';
      if (!on) return;
      let x, y;
      if (pLift < 1) {
        const q = ease(pLift);
        x = from.x + (p0.x - from.x) * q; y = from.y + (p0.y - from.y) * q;
      } else {
        const pt = pathB.getPointAtLength(lenB * ease(pBack));
        x = pt.x; y = pt.y;
        if (pBack > 0.35 && pBack < 0.65) hubHot = true;
      }
      c.setAttribute('cx', x.toFixed(1));
      c.setAttribute('cy', y.toFixed(1));
    });
    hubPulse.classList.toggle('is-hot', hubHot);

    root.classList.toggle('show-lead', t > 0.3 && t < 4.2);
    root.classList.toggle('show-sale', t > 9.3 && t < 13);
    root.classList.toggle('is-back', t >= 9 && t < 13.5);
    root.classList.toggle('meta-learned', t >= 11.6 && t < 19.3);
    root.classList.toggle('is-fading', t >= 19);
  }

  // ---- Reproducción ----
  let t = 0;
  let last = 0;
  let paused = false;
  let visible = false;
  let raf = 0;
  // El cuadro que representa cada paso en pausa: el final, salvo el 3, que se ve mejor con las ventas en camino.
  const STILLS = [PHASES[1] - 0.6, PHASES[2] - 0.6, 11, LOOP - 0.6];
  const still = (i) => STILLS[i];

  function tick(now) {
    raf = 0;
    if (!last) last = now;
    t = (t + Math.min(0.1, (now - last) / 1000)) % LOOP;
    last = now;
    render(t);
    loop();
  }
  function loop() {
    const run = visible && !paused && !reduce.matches && !document.hidden;
    if (run && !raf) raf = requestAnimationFrame(tick);
    if (!run) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  }

  steps.forEach((s, i) => s.querySelector('button').addEventListener('click', () => {
    t = paused || reduce.matches ? still(i) : PHASES[i];
    last = 0;
    render(t);
    loop();
  }));
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    root.classList.toggle('is-paused', paused);
    loop();
  });

  new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    loop();
  }, { threshold: 0.25 }).observe(stage);
  document.addEventListener('visibilitychange', loop);

  function setup() {
    build();
    shownPhase = -1;
    if (reduce.matches) t = still(3);
    root.classList.toggle('is-reduced', reduce.matches);
    render(t);
    loop();
  }
  narrow.addEventListener('change', setup);
  reduce.addEventListener('change', setup);
  setup();
})();

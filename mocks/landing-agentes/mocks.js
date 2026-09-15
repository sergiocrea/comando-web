/* Mocks fase C: chat del hero, scroll horizontal fijado, sliders, semáforos, contador y calculadora.
   Sin JS todo se lee (mensajes visibles, carriles con scroll nativo). */
(function () {
  const d = document;
  const params = new URLSearchParams(location.search);
  const isStatic = params.has('static'); // página completa sin pin ni animaciones (capturas y revisión)
  const reduce = isStatic || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shot = params.get('shot'); // modo captura: fija estados para las capturas
  if (!isStatic) d.documentElement.classList.add('js');

  /* revisión/capturas: ?only=<id de sección> deja solo esa sección; &x=0..100 fija el carril de agentes */
  const only = params.get('only');
  if (only) {
    d.querySelectorAll('main > section').forEach((s) => { if (s.id !== only) s.style.display = 'none'; });
    const x = params.get('x');
    const tr = d.querySelector('.track');
    if (x !== null && tr) requestAnimationFrame(() => { tr.style.transform = `translateX(${-(tr.scrollWidth - innerWidth) * (+x / 100)}px)`; });
  }

  /* ---------- hero: chat que se escribe solo ---------- */
  const steps = [...d.querySelectorAll('.hero .anim, .hero .typing-row')];
  function playChat() {
    const order = d.querySelectorAll('.hero [data-step]');
    const seq = [...order].sort((a, b) => +a.dataset.step - +b.dataset.step);
    if (reduce || shot === 'hero-final') { seq.forEach((el) => !el.classList.contains('typing-row') && el.classList.add('in')); lightUp(d.querySelector('.hero .mcard')); return; }
    let t = 400;
    seq.forEach((el) => {
      const hold = +(el.dataset.hold || 900);
      setTimeout(() => {
        seq.filter((x) => x.classList.contains('typing-row')).forEach((x) => x.classList.remove('in'));
        el.classList.add('in');
        if (el.classList.contains('mcard-row')) lightUp(el.querySelector('.mcard'));
      }, t);
      t += hold;
    });
  }
  function lightUp(card) {
    if (!card) return;
    card.querySelectorAll('.light[data-to]').forEach((l, i) => setTimeout(() => l.classList.add(l.dataset.to), reduce ? 0 : 250 + i * 220));
  }
  if (steps.length) playChat();

  /* ---------- agentes: pin + desplazamiento horizontal ---------- */
  const track = d.querySelector('.track');
  const team = d.querySelector('.team');
  const counter = d.querySelector('.team-progress b');
  const desktop = matchMedia('(min-width: 768px)');
  function agentIndex(progress, n) { return Math.min(n, Math.floor(progress * n) + 1); }
  if (track && team && window.gsap && window.ScrollTrigger && !reduce && desktop.matches) {
    gsap.registerPlugin(ScrollTrigger);
    const distance = () => track.scrollWidth - window.innerWidth;
    const st = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: team, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => { if (counter) counter.textContent = agentIndex(self.progress, 4); },
      },
    });
    if (shot && shot.startsWith('team-')) {
      const p = +shot.split('-')[1] / 100;
      requestAnimationFrame(() => {
        const trig = st.scrollTrigger;
        window.scrollTo(0, trig.start + (trig.end - trig.start) * p);
        ScrollTrigger.update();
      });
    }
  }

  /* ---------- sliders con botones ---------- */
  d.querySelectorAll('[data-slider]').forEach((box) => {
    const rail = box.querySelector('.rail');
    const [prev, next] = box.querySelectorAll('.slider-btns button');
    const stepBy = () => (rail.querySelector(':scope > *')?.getBoundingClientRect().width || 300) + 18;
    const sync = () => { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
    prev.addEventListener('click', () => rail.scrollBy({ left: -stepBy(), behavior: reduce ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: stepBy(), behavior: reduce ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true });
    sync();
  });

  /* ---------- métricas: semáforo y contador al entrar ---------- */
  const fmt = (v, dec) => v.toLocaleString('es', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el) {
    const to = +el.dataset.to, dec = +(el.dataset.dec || 0);
    if (reduce || shot) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(2, -10 * k); el.textContent = fmt(to * (k === 1 ? 1 : e), dec); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const card = en.target;
      card.querySelectorAll('[data-to]:not(.light)').forEach(countUp);
      card.querySelectorAll('.light[data-to]').forEach((l, i) => setTimeout(() => l.classList.add(l.dataset.to), reduce || shot ? 0 : 300 + i * 180));
      card.querySelectorAll('[data-draw]').forEach((p) => p.classList.add('drawn'));
      io.unobserve(card);
    });
  }, { threshold: 0.35 });
  d.querySelectorAll('.metric').forEach((m) => io.observe(m));

  /* ---------- calculadora del módulo CRM (estimación con la tabla de calculadora-crm-meta.xlsx) ---------- */
  const TIERS = [1000, 5000, 10000, 25000, 50000, 100000, 200000];
  // Precio por costo (80 % de margen, sincronizar al pedir) de la calculadora; el mínimo comercial es 9.
  const PRICE = { hubspot: [0.21, 0.46, 0.78, 1.78, 3.41, 6.68, 13.24], salesforce: [0.22, 0.58, 1.03, 2.39, 4.65, 9.18, 18.25], sheets: [0.21, 0.46, 0.78, 1.78, 3.41, 6.68, 13.24] };
  const MIN = 9;
  const calc = d.querySelector('.calc');
  if (calc) {
    const sel = calc.querySelector('select'), range = calc.querySelector('input[type=range]');
    const outC = calc.querySelector('[data-contacts]'), outP = calc.querySelector('[data-price]');
    const update = () => {
      const i = +range.value, key = sel.value;
      outC.textContent = TIERS[i].toLocaleString('es');
      const p = Math.max(MIN, PRICE[key]?.[i] ?? MIN);
      outP.textContent = 'US$ ' + (Number.isInteger(p) ? p : p.toFixed(0));
    };
    sel.addEventListener('change', update); range.addEventListener('input', update); update();
  }

  /* modo captura: ir a una sección */
  if (shot && !shot.startsWith('team-') && shot !== 'hero-final') {
    const el = d.getElementById(shot);
    if (el) requestAnimationFrame(() => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -64); });
  }
})();

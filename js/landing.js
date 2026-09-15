/* landing.js — el movimiento de la landing: chat del hero, agentes en scroll horizontal fijado,
   sliders, semáforos y contadores. Sale de los mocks aprobados en la fase C.
   Sin JS todo se lee (mensajes visibles, carriles con scroll nativo); con `prefers-reduced-motion`
   se queda quieto. Los precios y la calculadora del módulo CRM viven en pricing.js. */
(function () {
  const d = document;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LANG = (d.documentElement.lang || 'es').slice(0, 2);
  d.documentElement.classList.add('js');

  /* ---------- hero: chat que se escribe solo ---------- */
  function lightUp(card) {
    if (!card) return;
    card.querySelectorAll('.light[data-to]').forEach((l, i) => setTimeout(() => l.classList.add(l.dataset.to), reduce ? 0 : 250 + i * 220));
  }
  const seq = [...d.querySelectorAll('.hero [data-step]')].sort((a, b) => +a.dataset.step - +b.dataset.step);
  if (seq.length) {
    if (reduce) {
      seq.forEach((el) => { if (!el.classList.contains('typing-row')) el.classList.add('in'); });
      lightUp(d.querySelector('.hero .mcard'));
    } else {
      let t = 400;
      seq.forEach((el) => {
        setTimeout(() => {
          seq.forEach((x) => { if (x.classList.contains('typing-row')) x.classList.remove('in'); });
          el.classList.add('in');
          if (el.classList.contains('mcard-row')) lightUp(el.querySelector('.mcard'));
        }, t);
        t += +(el.dataset.hold || 900);
      });
    }
  }

  /* ---------- agentes: pin + desplazamiento horizontal (escritorio) ---------- */
  const track = d.querySelector('.track');
  const team = d.querySelector('.team');
  const counter = d.querySelector('.team-progress b');
  if (track && team && window.gsap && window.ScrollTrigger && !reduce && matchMedia('(min-width: 768px)').matches) {
    gsap.registerPlugin(ScrollTrigger);
    team.classList.add('is-pinned');
    const n = track.children.length;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: team, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => { if (counter) counter.textContent = Math.min(n, Math.floor(self.progress * n) + 1); },
      },
    });
    // Las fuentes y las tarjetas de precios cambian la altura de la página después de medir.
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  } else if (track && counter) {
    // Móvil: carrusel nativo con scroll-snap; el contador sigue a la tarjeta centrada.
    const outer = track.parentElement;
    outer.addEventListener('scroll', () => {
      const step = track.children[0].getBoundingClientRect().width + 20;
      counter.textContent = Math.min(track.children.length, Math.round(outer.scrollLeft / step) + 1);
    }, { passive: true });
  }

  /* ---------- sliders con botones ---------- */
  d.querySelectorAll('[data-slider]').forEach((box) => {
    const rail = box.querySelector('.rail');
    const [prev, next] = box.querySelectorAll('.slider-btns button');
    if (!rail || !prev || !next) return;
    const stepBy = () => (rail.firstElementChild?.getBoundingClientRect().width || 300) + 18;
    const sync = () => { prev.disabled = rail.scrollLeft < 8; next.disabled = rail.scrollLeft + rail.clientWidth > rail.scrollWidth - 8; };
    prev.addEventListener('click', () => rail.scrollBy({ left: -stepBy(), behavior: reduce ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => rail.scrollBy({ left: stepBy(), behavior: reduce ? 'auto' : 'smooth' }));
    rail.addEventListener('scroll', sync, { passive: true });
    addEventListener('resize', sync);
    sync();
  });

  /* ---------- métricas: semáforo y contador al entrar ---------- */
  const NUMBERS = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' }[LANG] || 'es-PE';
  const fmt = (v, dec) => v.toLocaleString(NUMBERS, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  function countUp(el) {
    const to = +el.dataset.to, dec = +(el.dataset.dec || 0);
    if (reduce) { el.textContent = fmt(to, dec); return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(k === 1 ? to : to * (1 - Math.pow(2, -10 * k)), dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  const metrics = d.querySelectorAll('.metric');
  const reveal = (card) => {
    card.querySelectorAll('[data-to]:not(.light)').forEach(countUp);
    card.querySelectorAll('.light[data-to]').forEach((l, i) => setTimeout(() => l.classList.add(l.dataset.to), reduce ? 0 : 300 + i * 180));
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.35 });
    metrics.forEach((m) => io.observe(m));
  } else metrics.forEach(reveal);
})();

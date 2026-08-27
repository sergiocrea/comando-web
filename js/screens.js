/* ============================================================
   screens.js — Comando feature "screens" drawn on canvas.
   Replaces the scroll-scrubbed product video: drawFeatureScreen(ctx, w, h, frame)
   renders one frame (0..680 @ 30fps) of a stylised device showing the
   Comando UI: boot -> event log -> automation pipeline -> CRM sync.
   Also drives any <canvas class="screen-loop"> in a 680-frame loop.
   ============================================================ */
(function () {
  const ACCENT = '#4d7cff', ACCENT_DIM = '#3563e9', BG = '#0a0a0a', FG = '#e8e8e8', MUTED = '#8a8a8a';
  const MONO = '"Jetbrainsmono Variable", "JetBrains Mono", monospace';
  const SANS = 'Inter, "Neuehaasunicaw 1 G", Arial, sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const seg = (f, a, b) => clamp((f - a) / (b - a), 0, 1);

  function device(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    // iPhone proportions (71.6 x 146.7) fitted to the canvas height
    const L = h * 0.96, W = L * (71.6 / 146.7), bx = (w - W) / 2, by = (h - L) / 2, r = W * 0.16;
    // frame
    ctx.fillStyle = '#3a3a3d'; ctx.beginPath(); ctx.roundRect(bx - 4, by - 4, W + 8, L + 8, r + 4); ctx.fill();
    const g = ctx.createLinearGradient(0, by, 0, by + L); g.addColorStop(0, '#242426'); g.addColorStop(1, '#141416');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, W, L, r); ctx.fill();
    // glass
    const pad = W * 0.035, sx = bx + pad, sy = by + pad, sw = W - pad * 2, sh = L - pad * 2;
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, r - pad); ctx.fill();
    // dynamic island + home indicator
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(bx + W / 2 - W * 0.13, sy + sh * 0.012, W * 0.26, sh * 0.032, 20); ctx.fill();
    ctx.fillStyle = 'rgba(233,237,239,0.85)'; ctx.beginPath(); ctx.roundRect(bx + W / 2 - W * 0.16, sy + sh - sh * 0.018, W * 0.32, 4, 2); ctx.fill();
    // side buttons
    ctx.fillStyle = '#4a4a4d';
    ctx.fillRect(bx + W + 4, by + L * 0.28, 3, L * 0.13);
    ctx.fillRect(bx - 7, by + L * 0.22, 3, L * 0.05); ctx.fillRect(bx - 7, by + L * 0.31, 3, L * 0.09); ctx.fillRect(bx - 7, by + L * 0.42, 3, L * 0.09);
    // usable screen area (below the island, above the indicator)
    return { sx, sy: sy + sh * 0.06, sw, sh: sh * 0.9, r: r - pad };
  }

  function mark(ctx, x, y, size, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(size / 64, size / 64);
    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(4, 4, 56, 56, 12); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(20, 22); ctx.lineTo(32, 32); ctx.lineTo(20, 42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(34, 44); ctx.lineTo(46, 44); ctx.stroke(); ctx.restore();
  }

  const LOG = [
    ['$', 'comando watch'],
    ['>', 'lead.created  formulario'],
    ['>', 'dedupe        0 match'],
    ['>', 'assign        ana.r'],
    ['>', 'whatsapp      enviado'],
    ['>', 'crm.sync      ok'],
  ];

  function screenBoot(ctx, s, t) {
    const a = ease(seg(t, 0, 0.6));
    mark(ctx, s.sx + s.sw / 2 - s.sw * 0.14, s.sy + s.sh * 0.32, s.sw * 0.28, ACCENT, a);
    ctx.globalAlpha = ease(seg(t, 0.3, 1)); ctx.fillStyle = FG; ctx.textAlign = 'center';
    ctx.font = `600 ${s.sw * 0.11}px ${SANS}`; ctx.fillText('Comando', s.sx + s.sw / 2, s.sy + s.sh * 0.78);
    ctx.globalAlpha = 1;
  }
  function screenLog(ctx, s, t, fade) {
    ctx.save(); ctx.globalAlpha = fade;
    ctx.font = `500 ${s.sw * 0.05}px ${MONO}`; ctx.textAlign = 'left';
    const chars = Math.floor(t * 140); let budget = chars, y = s.sy + s.sh * 0.12;
    for (const [p, txt] of LOG) {
      if (budget <= 0) break;
      ctx.fillStyle = ACCENT; ctx.fillText(p, s.sx + s.sw * 0.07, y);
      ctx.fillStyle = FG; ctx.fillText(txt.slice(0, budget), s.sx + s.sw * 0.14, y);
      budget -= txt.length + 4; y += s.sh * 0.11;
    }
    ctx.restore();
  }
  const PIPE = [
    { n: 'Lead nuevo', d: 'formulario web · anuncio' },
    { n: 'Validar datos', d: 'sin duplicados' },
    { n: 'Asignar', d: 'vendedor disponible', branch: { n: 'Sin asignar', d: 'correo al gerente' } },
    { n: 'Notificar', d: 'WhatsApp al vendedor' },
    { n: 'CRM', d: 'registro actualizado' },
  ];
  function screenPipeline(ctx, s, t, fade) {
    ctx.save(); ctx.globalAlpha = fade;
    const x0 = s.sx + s.sw * 0.07, w = s.sw * 0.86;
    // the operator's command, big, as a WhatsApp bubble
    ctx.fillStyle = MUTED; ctx.font = `500 ${s.sw * 0.04}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('COMANDO DEL OPERADOR', x0, s.sy + s.sh * 0.05);
    const cmd = 'si un lead no es contactado en 10 minutos, avisa por WhatsApp al vendedor';
    ctx.font = `500 ${s.sw * 0.062}px ${SANS}`;
    const lines = []; let line = '';
    for (const wd of cmd.split(' ')) { const tst = line ? line + ' ' + wd : wd; if (ctx.measureText(tst).width > w - s.sw * 0.1 && line) { lines.push(line); line = wd; } else line = tst; }
    lines.push(line);
    const lh = s.sw * 0.08, bh = lines.length * lh + s.sw * 0.09, by = s.sy + s.sh * 0.08;
    ctx.fillStyle = '#0a6e5b'; ctx.beginPath(); ctx.roundRect(x0, by, w, bh, s.sw * 0.05); ctx.fill();
    ctx.fillStyle = '#f2f5f6'; lines.forEach((l, k) => ctx.fillText(l, x0 + s.sw * 0.05, by + s.sw * 0.085 + k * lh));
    // pipeline
    const py0 = by + bh + s.sh * 0.07, gap = (s.sy + s.sh * 0.97 - py0) / PIPE.length, rr = s.sw * 0.035, lx = x0 + rr + 4;
    const lit = t * (PIPE.length - 1);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lx, py0); ctx.lineTo(lx, py0 + gap * (PIPE.length - 1)); ctx.stroke();
    ctx.strokeStyle = ACCENT; ctx.beginPath(); ctx.moveTo(lx, py0); ctx.lineTo(lx, py0 + gap * lit); ctx.stroke();
    PIPE.forEach((st, i) => {
      const on = lit >= i - 0.02, y = py0 + gap * i;
      ctx.fillStyle = on ? ACCENT : '#1c1c1c'; ctx.beginPath(); ctx.arc(lx, y, rr, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.fillStyle = BG; ctx.font = `700 ${rr * 1.2}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', lx, y + 1); ctx.textBaseline = 'alphabetic'; }
      ctx.textAlign = 'left';
      ctx.fillStyle = on ? FG : MUTED; ctx.font = `600 ${s.sw * 0.055}px ${SANS}`; ctx.fillText(st.n, lx + rr * 2, y - s.sw * 0.005);
      ctx.fillStyle = MUTED; ctx.font = `400 ${s.sw * 0.04}px ${MONO}`; ctx.fillText(st.d, lx + rr * 2, y + s.sw * 0.05);
      if (st.branch) { // side branch: fallback action (between this step and the next)
        const bx2 = lx + s.sw * 0.34, by2 = y + gap * 0.56, onB = lit >= i + 0.5;
        ctx.strokeStyle = onB ? '#f5a623' : '#2a2a2a'; ctx.setLineDash([6, 6]); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lx, y + rr); ctx.quadraticCurveTo(lx, by2, bx2 - rr, by2); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = onB ? '#f5a623' : '#1c1c1c'; ctx.beginPath(); ctx.arc(bx2, by2, rr * 0.75, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = onB ? FG : MUTED; ctx.font = `600 ${s.sw * 0.042}px ${SANS}`; ctx.fillText(st.branch.n, bx2 + rr * 1.4, by2 - s.sw * 0.004);
        ctx.fillStyle = MUTED; ctx.font = `400 ${s.sw * 0.034}px ${MONO}`; ctx.fillText('✉ ' + st.branch.d, bx2 + rr * 1.4, by2 + s.sw * 0.04);
      }
    });
    const py = py0 + gap * lit; ctx.fillStyle = '#fff'; ctx.shadowColor = ACCENT; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(lx, py, rr * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.restore();
  }
  function screenSync(ctx, s, t, fade) {
    ctx.save(); ctx.globalAlpha = fade;
    ctx.fillStyle = MUTED; ctx.font = `500 ${s.sw * 0.045}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('SYNC CRM', s.sx + s.sw * 0.08, s.sy + s.sh * 0.1);
    const cols = [['HubSpot', s.sx + s.sw * 0.25], ['Zoho', s.sx + s.sw * 0.75]];
    ctx.font = `600 ${s.sw * 0.06}px ${SANS}`; ctx.textAlign = 'center'; ctx.fillStyle = FG;
    cols.forEach(([n, x]) => ctx.fillText(n, x, s.sy + s.sh * 0.24));
    const rows = 5, y0 = s.sy + s.sh * 0.34, gap = s.sh * 0.1;
    for (let i = 0; i < rows; i++) {
      const y = y0 + gap * i, p = clamp(t * rows * 1.2 - i, 0, 1);
      ctx.fillStyle = '#1c1c1c'; ctx.fillRect(s.sx + s.sw * 0.1, y, s.sw * 0.3, s.sh * 0.05); ctx.fillRect(s.sx + s.sw * 0.6, y, s.sw * 0.3, s.sh * 0.05);
      ctx.fillStyle = ACCENT_DIM; ctx.fillRect(s.sx + s.sw * 0.1, y, s.sw * 0.3 * p, s.sh * 0.05); ctx.fillRect(s.sx + s.sw * 0.6, y, s.sw * 0.3 * p, s.sh * 0.05);
      const dir = i % 2 ? -1 : 1, ax = s.sx + s.sw * 0.5 + dir * (p - 0.5) * s.sw * 0.16;
      ctx.fillStyle = p > 0 ? ACCENT : '#2a2a2a'; ctx.beginPath(); ctx.arc(ax, y + s.sh * 0.025, s.sw * 0.014, 0, Math.PI * 2); ctx.fill();
    }
    const n = Math.floor(ease(t) * 1284);
    ctx.fillStyle = FG; ctx.font = `600 ${s.sw * 0.1}px ${SANS}`; ctx.textAlign = 'center';
    ctx.fillText(n.toLocaleString('es-PE'), s.sx + s.sw / 2, s.sy + s.sh * 0.92);
    ctx.fillStyle = MUTED; ctx.font = `500 ${s.sw * 0.04}px ${MONO}`; ctx.fillText('CAMBIOS SINCRONIZADOS', s.sx + s.sw / 2, s.sy + s.sh * 0.97);
    ctx.restore();
  }

  function drawFeatureScreen(ctx, w, h, frame) {
    const f = clamp(frame, 0, 680);
    const s = device(ctx, w, h);
    ctx.save(); ctx.beginPath(); ctx.roundRect(s.sx, s.sy - s.sh * 0.07, s.sw, s.sh * 1.14, s.r); ctx.clip();
    // 0-200: the automation pipeline builds up while the feature rows scroll; afterwards it stays complete
    screenPipeline(ctx, s, seg(f, 10, 190), 1);
    ctx.restore();
  }
  window.drawFeatureScreen = drawFeatureScreen;

  // looping canvases (responsive/mobile blocks)
  const loops = Array.from(document.querySelectorAll('canvas.screen-loop'));
  if (loops.length) {
    const t0 = performance.now();
    (function tick(now) {
      const frame = ((now - t0) / 1000 * 30) % 680;
      loops.forEach((c) => { if (c.offsetParent !== null) drawFeatureScreen(c.getContext('2d'), c.width, c.height, frame); });
      requestAnimationFrame(tick);
    })(t0);
  }
})();

/* mobile: connector cards show only the logo + name; tap opens a floating sheet with the description */
(function () {
  const mq = window.matchMedia('(max-width: 767px)');
  const cards = document.querySelectorAll('.home_features-card');
  if (!cards.length) return;
  const sheet = document.createElement('div');
  sheet.className = 'connector-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.hidden = true;
  sheet.innerHTML = '<div class="connector-sheet-backdrop" data-close></div><div class="connector-sheet-panel"><button type="button" class="connector-sheet-close" aria-label="Cerrar" data-close>×</button><img class="connector-sheet-logo" alt=""/><div class="connector-sheet-name"></div><div class="connector-sheet-desc"></div><div class="connector-sheet-example"><div class="connector-sheet-example-label">Ejemplo de comando</div><div class="connector-sheet-bubble"></div></div></div>';
  document.body.appendChild(sheet);
  const logo = sheet.querySelector('.connector-sheet-logo'), name = sheet.querySelector('.connector-sheet-name'), desc = sheet.querySelector('.connector-sheet-desc'), ex = sheet.querySelector('.connector-sheet-example'), bubble = sheet.querySelector('.connector-sheet-bubble');
  let last = null;
  const close = () => { sheet.classList.remove('is-open'); setTimeout(() => { sheet.hidden = true; }, 220); document.body.classList.remove('sheet-open'); if (last) last.focus(); };
  const open = (card) => {
    const img = card.querySelector('.connector-logo'); const h = card.querySelector('.card_specification-heading'); const d = card.querySelector('.card_specification-description');
    logo.src = img ? img.src : ''; name.textContent = h ? h.textContent.trim() : ''; desc.textContent = d ? d.textContent.trim() : '';
    const example = card.getAttribute('data-example'); ex.hidden = !example; bubble.textContent = example ? '«' + example + '»' : '';
    last = card; sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('is-open')); document.body.classList.add('sheet-open');
    sheet.querySelector('.connector-sheet-close').focus();
  };
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) close(); });
  cards.forEach((card) => {
    card.setAttribute('role', 'button'); card.setAttribute('tabindex', '0');
    card.addEventListener('click', (e) => { if (!mq.matches || e.target.closest('a')) return; open(card); });
    card.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && mq.matches) { e.preventDefault(); open(card); } });
  });
})();

/* background video: make sure it actually plays (some browsers ignore autoplay until visible) */
(function () {
  const v = document.querySelector('.benefits-video-el'); if (!v) return;
  const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  tryPlay();
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) tryPlay(); }), { threshold: 0.05 }).observe(v);
  document.addEventListener('touchstart', tryPlay, { once: true, passive: true });
  document.addEventListener('click', tryPlay, { once: true });
})();

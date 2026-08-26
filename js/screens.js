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
    // body
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
    const pad = w * 0.06, r = w * 0.09;
    const bx = pad, by = h * 0.06, bw = w - pad * 2, bh = h - by * 2;
    const g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#2a2a2a'); g.addColorStop(1, '#161616');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill();
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.stroke();
    // screen
    const sx = bx + bw * 0.07, sy = by + bh * 0.06, sw = bw * 0.86, sh = bh * 0.66;
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, r * 0.4); ctx.fill();
    // button + led
    ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(bx + bw * 0.2, by + bh * 0.86, bw * 0.075, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(bx + bw * 0.8, by + bh * 0.86, bw * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ACCENT; ctx.lineWidth = 3; ctx.stroke();
    return { sx, sy, sw, sh };
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
    ['>', 'lead.created  facebook'],
    ['>', 'dedupe        0 match'],
    ['>', 'assign        ana.r'],
    ['>', 'whatsapp      enviado'],
    ['>', 'crm.sync      hubspot ok'],
  ];
  const NODES = ['Lead', 'Dedupe', 'Asignar', 'WhatsApp', 'CRM'];

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
  function screenPipeline(ctx, s, t, fade) {
    ctx.save(); ctx.globalAlpha = fade;
    ctx.fillStyle = MUTED; ctx.font = `500 ${s.sw * 0.045}px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText('AUTOMATIZACIÓN', s.sx + s.sw * 0.08, s.sy + s.sh * 0.1);
    const x0 = s.sx + s.sw * 0.14, y0 = s.sy + s.sh * 0.2, gap = s.sh * 0.16, rr = s.sw * 0.045;
    const lit = t * (NODES.length - 1);
    // spine
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + gap * (NODES.length - 1)); ctx.stroke();
    ctx.strokeStyle = ACCENT; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + gap * lit); ctx.stroke();
    NODES.forEach((n, i) => {
      const on = lit >= i - 0.02, y = y0 + gap * i;
      ctx.fillStyle = on ? ACCENT : '#1c1c1c'; ctx.beginPath(); ctx.arc(x0, y, rr, 0, Math.PI * 2); ctx.fill();
      if (on) { ctx.fillStyle = BG; ctx.font = `700 ${rr * 1.1}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', x0, y + 1); ctx.textBaseline = 'alphabetic'; }
      ctx.fillStyle = on ? FG : MUTED; ctx.font = `500 ${s.sw * 0.06}px ${SANS}`; ctx.textAlign = 'left'; ctx.fillText(n, x0 + rr * 2.2, y + rr * 0.5);
    });
    // moving packet
    const py = y0 + gap * lit; ctx.fillStyle = '#fff'; ctx.shadowColor = ACCENT; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x0, py, rr * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
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
    ctx.save(); ctx.beginPath(); ctx.roundRect(s.sx, s.sy, s.sw, s.sh, w * 0.036); ctx.clip();
    if (f < 60) screenBoot(ctx, s, f / 60);
    if (f >= 40 && f < 215) screenLog(ctx, s, seg(f, 50, 160), 1 - seg(f, 185, 215));
    if (f >= 185 && f < 530) screenPipeline(ctx, s, seg(f, 215, 480), seg(f, 185, 215) * (1 - seg(f, 500, 530)));
    if (f >= 500) screenSync(ctx, s, seg(f, 530, 660), seg(f, 500, 530));
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

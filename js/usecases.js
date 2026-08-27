/* ============================================================
   usecases.js — "Un vendedor. Tres veces el resultado."
   Renders docs/usecases.json: role tabs × vertical chips → one chat card
   (3 user/Comando exchanges + result + evidence). No dependencies.
   ============================================================ */
(function () {
  const root = document.getElementById('usecases-root');
  if (!root) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const TIMES = ['8:05', '11:30', '18:40'];
  const state = { rol: 0, vertical: 0 };
  let D = null;

  function current() {
    const rol = D.roles[state.rol], vertical = D.verticales[state.vertical];
    return D.casos.find((x) => x.rol === rol && x.vertical === vertical);
  }
  let step = 0, timer = null, visible = false;
  function msgHtml(m, i, upTo) {
    return `<div class="uc-msg is-user${i < upTo ? ' is-in' : ''}"><div class="uc-bubble">${esc(m.u)}<span class="uc-time">${TIMES[i] || ''} <i>✓✓</i></span></div></div>
      <div class="uc-msg is-bot${i < upTo ? ' is-in' : ''}"><div class="uc-bubble">${esc(m.r)}<span class="uc-time">${TIMES[i] || ''}</span></div></div>`;
  }
  function chatHtml(c) { return c.comandos.map((m, i) => msgHtml(m, i, step + 1)).join(''); }
  function timelineHtml(c) {
    return c.comandos.map((m, i) => `<li><button type="button" class="uc-dot${i === step ? ' is-on' : ''}${i < step ? ' is-past' : ''}" data-step="${i}" aria-label="Enviar el mensaje de las ${TIMES[i] || ''}"><i></i><span>${TIMES[i] || ''}</span></button></li>`).join('');
  }
  function outcomeHtml(c) {
    return `<div class="uc-card-meta">${esc(c.rol)} · ${esc(c.vertical)}</div><h3 class="uc-card-title">${esc(c.titulo)}</h3>
      <ol class="uc-steps">${c.comandos.map((m, i) => `<li><button type="button" class="uc-step${i === step ? ' is-on' : ''}" data-step="${i}"><span class="uc-step-time">${TIMES[i] || ''}</span><span class="uc-step-text">${esc(m.u)}</span></button></li>`).join('')}</ol>
`;
  }
  function showStep(i, fromUser) {
    step = i;
    root.querySelectorAll('.uc-msg').forEach((m, k) => m.classList.toggle('is-in', Math.floor(k / 2) <= step));
    root.querySelectorAll('.uc-step').forEach((b) => b.classList.toggle('is-on', +b.dataset.step === step));
    root.querySelectorAll('.uc-dot').forEach((b) => { const k = +b.dataset.step; b.classList.toggle('is-on', k === step); b.classList.toggle('is-past', k < step); });
    const chat = root.querySelector('.uc-chat');
    requestAnimationFrame(() => chat.scrollTo({ top: chat.scrollHeight, behavior: fromUser === 'init' ? 'auto' : 'smooth' }));
    if (fromUser === true) restartTimer(9000); else restartTimer();
  }
  function restartTimer(delay) {
    clearInterval(timer); timer = null;
    if (!visible) return;
    timer = setInterval(() => { const n = current().comandos.length; showStep((step + 1) % n, false); }, delay || 4200);
  }
  function bindSteps() { root.querySelectorAll('.uc-step, .uc-dot').forEach((b) => b.addEventListener('click', () => showStep(+b.dataset.step, true))); }
  function render() {
    const c = current(); step = 0;
    root.innerHTML = `
      <div class="section_features-header-component"><div class="section_features-eyebrow">EQUIPOS 3× MÁS VELOCES</div>
        <h2 class="section_features-heading">${esc(D.seccion.titulo)}</h2></div>
      <div class="uc-tabs" role="tablist" aria-label="Rol">${D.roles.map((r, i) => `<button type="button" role="tab" class="uc-tab${i === state.rol ? ' is-on' : ''}" aria-selected="${i === state.rol}" data-rol="${i}">${esc(r)}</button>`).join('')}</div>
      <div class="uc-chips" role="group" aria-label="Sector">${D.verticales.map((v, i) => `<button type="button" class="uc-chip${i === state.vertical ? ' is-on' : ''}" aria-pressed="${i === state.vertical}" data-vertical="${i}">${esc(v)}</button>`).join('')}</div>
      <div class="uc-layout">
        <div class="uc-phone" role="img" aria-label="Conversación de WhatsApp con Comando">
          <div class="uc-phone-screen">
            <div class="uc-status"><span>9:41</span><span class="uc-status-icons">●●● ▲ ▮</span></div>
            <div class="uc-wa-head"><span class="uc-wa-back">‹</span><img src="assets/img/comando-mark.svg" alt="" class="uc-wa-avatar"/><div class="uc-wa-name">Comando<small>en línea</small></div><span class="uc-wa-more">⋮</span></div>
            <div class="uc-chat" aria-live="polite">${chatHtml(c)}</div>
            <div class="uc-wa-input"><span>Escribe un comando…</span><i>🎤</i></div>
          </div>
        </div>
        <ol class="uc-timeline" aria-label="Momentos del día">${timelineHtml(c)}</ol>
        <div class="uc-outcome">${outcomeHtml(c)}</div>
      </div>
      <div class="uc-foot"><p class="uc-close">${esc(D.seccion.cierre)}</p><a href="${esc(D.seccion.cta.href)}" class="btn-primary uc-cta">${esc(D.seccion.cta.texto)}<span class="btn-arrow" aria-hidden="true">→</span></a></div>`;
    root.querySelectorAll('[data-rol]').forEach((b) => b.addEventListener('click', () => { state.rol = +b.dataset.rol; update(); }));
    root.querySelectorAll('[data-vertical]').forEach((b) => b.addEventListener('click', () => { state.vertical = +b.dataset.vertical; update(); }));
    bindSteps();
    // play only while the section is on screen
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) restartTimer(); else { clearInterval(timer); timer = null; } }, { threshold: .25 }).observe(root.querySelector('.uc-layout'));
    else { visible = true; restartTimer(); }
  }
  function update() {
    root.querySelectorAll('[data-rol]').forEach((b) => { const on = +b.dataset.rol === state.rol; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
    root.querySelectorAll('[data-vertical]').forEach((b) => { const on = +b.dataset.vertical === state.vertical; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
    const c = current(); step = 0; const chat = root.querySelector('.uc-chat'), out = root.querySelector('.uc-outcome'), layout = root.querySelector('.uc-layout');
    layout.classList.remove('is-in'); chat.innerHTML = chatHtml(c); out.innerHTML = outcomeHtml(c); root.querySelector('.uc-timeline').innerHTML = timelineHtml(c); bindSteps(); chat.scrollTop = 0; showStep(0, 'init');
    requestAnimationFrame(() => requestAnimationFrame(() => layout.classList.add('is-in')));
    restartTimer(6000);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
  fetch('docs/usecases.json?v=1').then((r) => r.json()).then((d) => { D = d; render(); showStep(0, 'init'); requestAnimationFrame(() => root.querySelector('.uc-layout').classList.add('is-in')); if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); }).catch(() => {});
})();

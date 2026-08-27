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
  function chatHtml(c) {
    return c.comandos.map((m, i) => `
      <div class="uc-msg is-user"><div class="uc-bubble">${esc(m.u)}<span class="uc-time">${TIMES[i] || ''} <i>✓✓</i></span></div></div>
      <div class="uc-msg is-bot"><div class="uc-bubble">${esc(m.r)}<span class="uc-time">${TIMES[i] || ''}</span></div></div>`).join('');
  }
  function outcomeHtml(c) {
    return `<div class="uc-card-meta">${esc(c.rol)} · ${esc(c.vertical)}</div><h3 class="uc-card-title">${esc(c.titulo)}</h3>
      <div class="uc-result">${esc(c.resultado)}</div>
      <div class="uc-evidence"><span>Evidencia</span> ${esc(D.evidencias[c.evidencia] || '')}</div>`;
  }
  function render() {
    const c = current();
    root.innerHTML = `
      <div class="section_features-header-component"><div class="section_features-eyebrow">CASOS DE USO</div>
        <h2 class="section_features-heading">${esc(D.seccion.titulo)}</h2><p class="uc-subtitle">${esc(D.seccion.subtitulo)}</p></div>
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
        <div class="uc-outcome">${outcomeHtml(c)}</div>
      </div>
      <div class="uc-foot"><p class="uc-close">${esc(D.seccion.cierre)}</p><a href="${esc(D.seccion.cta.href)}" class="btn-primary uc-cta">${esc(D.seccion.cta.texto)}<span class="btn-arrow" aria-hidden="true">→</span></a></div>`;
    root.querySelectorAll('[data-rol]').forEach((b) => b.addEventListener('click', () => { state.rol = +b.dataset.rol; update(); }));
    root.querySelectorAll('[data-vertical]').forEach((b) => b.addEventListener('click', () => { state.vertical = +b.dataset.vertical; update(); }));
  }
  function update() {
    root.querySelectorAll('[data-rol]').forEach((b) => { const on = +b.dataset.rol === state.rol; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
    root.querySelectorAll('[data-vertical]').forEach((b) => { const on = +b.dataset.vertical === state.vertical; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); });
    const c = current(); const chat = root.querySelector('.uc-chat'), out = root.querySelector('.uc-outcome'), layout = root.querySelector('.uc-layout');
    layout.classList.remove('is-in'); chat.innerHTML = chatHtml(c); out.innerHTML = outcomeHtml(c);
    requestAnimationFrame(() => requestAnimationFrame(() => layout.classList.add('is-in')));
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
  fetch('docs/usecases.json?v=1').then((r) => r.json()).then((d) => { D = d; render(); requestAnimationFrame(() => root.querySelector('.uc-layout').classList.add('is-in')); if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); }).catch(() => {});
})();

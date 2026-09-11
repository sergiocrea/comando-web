/* ============================================================
   usecases.js — las dos secciones de «casos» del home.
   Un solo motor para dos raíces:
     #metaads-root  (Meta Ads: un caso fijo —informe de la mañana y preguntas—,
                     sin pestañas ni columna de sistemas)
     #usecases-root («Así cambia el día»: rol × sector → un caso, con la columna
                     «De tus sistemas» subiendo pegada al teléfono)
   Cada raíz lee su JSON del idioma y pinta teléfono + línea de tiempo + resultado.
   Sin dependencias.
   ============================================================ */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LANG = (document.documentElement.lang || 'es').slice(0, 2);
  // Las etiquetas de la sección: los datos vienen del fichero del idioma, pero
  // estas palabras viven en el markup y también se leen.
  const T = {
    es: { rol: 'Rol', sector: 'Sector', proTag: 'Comando te avisa', proStep: 'Comando te avisa.',
          proAria: (t) => `Aviso de Comando a las ${t}`, sendAria: (t) => `Enviar el mensaje de las ${t}`,
          chat: 'Conversación de WhatsApp con Comando', moments: 'Momentos del día', feed: 'De tus sistemas' },
    en: { rol: 'Role', sector: 'Sector', proTag: 'Comando tells you', proStep: 'Comando tells you.',
          proAria: (t) => `Comando alert at ${t}`, sendAria: (t) => `Send the ${t} message`,
          chat: 'WhatsApp conversation with Comando', moments: 'Moments of the day', feed: 'From your systems' },
    pt: { rol: 'Papel', sector: 'Setor', proTag: 'O Comando te avisa', proStep: 'O Comando te avisa.',
          proAria: (t) => `Aviso do Comando às ${t}`, sendAria: (t) => `Enviar a mensagem das ${t}`,
          chat: 'Conversa de WhatsApp com o Comando', moments: 'Momentos do dia', feed: 'Dos seus sistemas' },
  }[LANG] ?? {
    rol: 'Rol', sector: 'Sector', proTag: 'Comando te avisa', proStep: 'Comando te avisa.',
    proAria: (t) => `Aviso de Comando a las ${t}`, sendAria: (t) => `Enviar el mensaje de las ${t}`,
    chat: 'Conversación de WhatsApp con Comando', moments: 'Momentos del día', feed: 'De tus sistemas',
  };

  // ---- El caudal que alimenta la conversación ----
  // La franja del héroe dice «trabajamos con estos sistemas». Aquí la misma
  // lista dice otra cosa: que de ahí sale lo que el teléfono contesta. Por eso
  // no se repite la tira horizontal —sería la misma frase dos veces— sino que
  // sube en columna pegada al teléfono.
  // La lista se repite en el markup del héroe (index.html, .b2b-hero-band). Se
  // deja explícita en vez de clonar aquel nodo: si el héroe cambia de forma, la
  // sección no se queda muda.
  // El tercer campo es el color de marca. Catorce logos en blanco plano se leen
  // como un menú desplegable: la mirada no distingue una fila de la siguiente y
  // la columna se vuelve gris. En color, cada sistema se reconoce antes de
  // leerlo, que es justo lo que tiene que pasar aquí —el mensaje es «esto viene
  // de TUS herramientas», y sólo funciona si las reconoces—.
  //
  // Los hex son los oficiales de la marca salvo donde no sobrevivirían al fondo
  // #151515 de la tira. Ahí se sube la luminosidad conservando el tono, porque
  // un logo que no se ve no es más fiel por llevar el hex correcto:
  //   TikTok    #000000 → #E7E9EC   (negro sobre casi negro)
  //   Dynamics  #002050 → #3B8CE8   (azul marino sobre casi negro)
  //   Meta      #0467DF → #0081FB
  //   Shopify   #7AB55C → #95BF47
  //   WooCom.   #96588A → #B07FA6
  // Pipedrive, Kommo, Dynamics 365 y Tiendanube no tienen entrada en Simple
  // Icons —de donde salen los demás— y su color aquí es PROVISIONAL: tono de
  // marca aproximado, a confirmar contra su manual.
  const CONECTORES = [
    ['hubspot', 'HubSpot', '#ff7a59'], ['salesforce', 'Salesforce', '#00a1e0'], ['zoho', 'Zoho CRM', '#e42527'],
    ['pipedrive', 'Pipedrive', '#1fa971'], ['kommo', 'Kommo', '#3d8bfd'], ['dynamics', 'Dynamics 365', '#3b8ce8'],
    ['meta', 'Meta Ads', '#0081fb'], ['tiktok', 'TikTok Ads', '#e7e9ec'], ['shopify', 'Shopify', '#95bf47'],
    ['woocommerce', 'WooCommerce', '#b07fa6'], ['tiendanube', 'Tiendanube', '#2c6dea'],
    ['mercadolibre', 'Mercado Libre', '#ffe600'], ['vtex', 'VTEX', '#ed125f'], ['googlesheets', 'Google Sheets', '#34a853'],
  ];
  // Deja de ser <img> y pasa a ser una caja enmascarada por el propio SVG: así
  // el color lo pone el CSS (`background-color`) y no el fichero, que sigue
  // siendo el mismo blanco que usa la franja del héroe. Un solo juego de
  // logotipos para los dos sitios, teñido donde hace falta.
  const feedItems = () => CONECTORES.map(([f, n, c]) => `<li><i class="uc-feed-logo" style="--uc-marca:${c};--uc-logo:url(/assets/img/logos/${f}.svg)"></i><span>${esc(n)}</span></li>`).join('');
  // `aria-hidden`: los mismos catorce nombres ya los anuncia la franja del
  // héroe, en esta misma página. Repetirlos es ruido para quien escucha.
  function feedHtml() {
    return `<div class="uc-feed" aria-hidden="true">
      <div class="uc-feed-label">${esc(T.feed)}</div>
      <div class="uc-feed-track"><ul class="uc-feed-col">${feedItems()}</ul><ul class="uc-feed-col">${feedItems()}</ul></div>
      <div class="uc-wire"><i></i><i></i><i></i></div>
    </div>`;
  }

  /**
   * Monta una sección sobre `root`.
   *   data     nombre base del JSON en /docs (`usecases` → usecases.json, usecases.en.json…)
   *   pickers  si hay pestañas de rol y chips de sector (el JSON trae roles/verticales)
   *   feed     si lleva la columna «De tus sistemas»
   *   anchor   id de un ancla vacía bajo el encabezado (el botón «Cómo funciona» del héroe)
   *   version  el ?v= del JSON, para que el navegador no sirva el viejo
   */
  function mount(root, opts) {
    // Las horas de la línea de tiempo. El JSON puede traer las suyas (`horas`,
    // `proHora`); si no, las de siempre.
    const DEFAULT_TIMES = ['8:05', '11:30', '18:40'];
    const DEFAULT_PRO = '7:30'; // el aviso con el que Comando abre el día, antes de que nadie pregunte
    let TIMES = DEFAULT_TIMES, PRO_TIME = DEFAULT_PRO;

    const state = { rol: 0, vertical: 0 };
    let D = null;

    function current() {
      if (!opts.pickers) return D.casos[0];
      const rol = D.roles[state.rol], vertical = D.verticales[state.vertical];
      return D.casos.find((x) => x.rol === rol && x.vertical === vertical);
    }
    // El aviso de las 7:30 es un paso más (-1): se enciende solo, como los
    // demás. Antes no era pulsable y, al tocarlo, el paso quedaba en NaN y el
    // teléfono se vaciaba.
    const firstStep = (c) => (c.proactivo ? -1 : 0);
    let step = 0, timer = null, visible = false;
    function msgHtml(m, i, upTo) {
      return `<div class="uc-msg is-user${i < upTo ? ' is-in' : ''}"><div class="uc-bubble">${esc(m.u)}<span class="uc-time">${TIMES[i] || ''} <i>✓✓</i></span></div></div>
        <div class="uc-msg is-bot${i < upTo ? ' is-in' : ''}"><div class="uc-bubble">${esc(m.r)}<span class="uc-time">${TIMES[i] || ''}</span></div></div>`;
    }
    function proHtml(c) {
      if (!c.proactivo) return '';
      return `<div class="uc-msg is-bot${step === -1 ? ' is-in' : ''} is-proactive"><div class="uc-bubble"><b class="uc-pro-tag">${esc(T.proTag)}</b>${esc(c.proactivo)}<span class="uc-time">${PRO_TIME}</span></div></div>`;
    }
    function chatHtml(c) { return proHtml(c) + c.comandos.map((m, i) => msgHtml(m, i, step + 1)).join(''); }
    function timelineHtml(c) {
      return (c.proactivo ? `<li class="is-pro"><button type="button" class="uc-dot is-pro${step === -1 ? ' is-on' : ''}${step > -1 ? ' is-past' : ''}" data-step="-1" aria-label="${esc(T.proAria(PRO_TIME))}"><i></i><span>${PRO_TIME}</span></button></li>` : '') + c.comandos.map((m, i) => `<li><button type="button" class="uc-dot${i === step ? ' is-on' : ''}${i < step ? ' is-past' : ''}" data-step="${i}" aria-label="${esc(T.sendAria(TIMES[i] || ''))}"><i></i><span>${TIMES[i] || ''}</span></button></li>`).join('');
    }
    function outcomeHtml(c) {
      return `<div class="uc-card-meta">${esc(c.rol)} · ${esc(c.vertical)}</div><h3 class="uc-card-title">${esc(c.titulo)}</h3>
        <ol class="uc-steps">${c.proactivo ? `<li><button type="button" class="uc-step uc-step-pro${step === -1 ? ' is-on' : ''}" data-step="-1"><span class="uc-step-time">${PRO_TIME}</span><span class="uc-step-text"><b>${esc(T.proStep)}</b> ${esc(c.proactivo)}</span></button></li>` : ''}${c.comandos.map((m, i) => `<li><button type="button" class="uc-step${i === step ? ' is-on' : ''}" data-step="${i}"><span class="uc-step-time">${TIMES[i] || ''}</span><span class="uc-step-text">${esc(m.u)}</span></button></li>`).join('')}</ol>
        <div class="uc-result">${esc(c.resultado)}</div>
  `;
    }
    // El teléfono muestra SOLO el momento que está encendido en la línea de
    // tiempo: el aviso de las 7:30, o una pregunta con su respuesta. Lo de las
    // horas anteriores se borra al cambiar de paso. Acumular la conversación
    // se leía como una pared de texto, y el ojo no sabía cuál era el mensaje
    // «de ahora».
    function showStep(i, fromUser) {
      step = Number.isInteger(i) ? i : firstStep(current());
      const msgs = [...root.querySelectorAll('.uc-msg:not(.is-proactive)')];
      const pro = root.querySelector('.uc-msg.is-proactive');
      msgs.forEach((m, k) => m.classList.toggle('is-in', Math.floor(k / 2) === step));
      if (pro) pro.classList.toggle('is-in', step === -1);
      root.querySelectorAll('.uc-step').forEach((b) => b.classList.toggle('is-on', +b.dataset.step === step));
      root.querySelectorAll('.uc-dot').forEach((b) => { const k = +b.dataset.step; b.classList.toggle('is-on', k === step); b.classList.toggle('is-past', k < step); });

      if (fromUser === true) restartTimer(9000); else restartTimer();
    }
    function restartTimer(delay) {
      clearInterval(timer); timer = null;
      if (!visible) return;
      timer = setInterval(() => { const c = current(); showStep(step + 1 < c.comandos.length ? step + 1 : firstStep(c), false); }, delay || 4200);
    }
    function bindSteps() { root.querySelectorAll('.uc-step, .uc-dot').forEach((b) => b.addEventListener('click', () => showStep(+b.dataset.step, true))); }
    function pickersHtml() {
      if (!opts.pickers) return '';
      return `<div class="uc-tabs" role="tablist" aria-label="${esc(T.rol)}">${D.roles.map((r, i) => `<button type="button" role="tab" class="uc-tab${i === state.rol ? ' is-on' : ''}" aria-selected="${i === state.rol}" data-rol="${i}">${esc(r)}</button>`).join('')}</div>
        <div class="uc-chips" role="group" aria-label="${esc(T.sector)}">${D.verticales.map((v, i) => `<button type="button" class="uc-chip${i === state.vertical ? ' is-on' : ''}" aria-pressed="${i === state.vertical}" data-vertical="${i}">${esc(v)}</button>`).join('')}</div>`;
    }
    function render() {
      const c = current(); step = firstStep(c);
      root.innerHTML = `
        <div class="section_features-header-component"><div class="section_features-eyebrow">${esc(D.seccion.eyebrow || '')}</div>
          ${D.seccion.titulo ? `<h2 class="section_features-heading">${esc(D.seccion.titulo)}</h2>` : ''}
          <p class="uc-subtitle">${esc(D.seccion.subtitulo)}</p></div>
        ${opts.anchor ? `<span id="${esc(opts.anchor)}" class="uc-anchor" aria-hidden="true"></span>` : ''}
        ${pickersHtml()}
        <div class="uc-layout">
          <div class="uc-phone" role="img" aria-label="${esc(T.chat)}">
            <div class="uc-phone-screen">
              <div class="uc-status"><span>9:41</span><span class="uc-status-icons">●●● ▲ ▮</span></div>
              <div class="uc-wa-head"><span class="uc-wa-back">‹</span><img src="/assets/img/comando-mark.svg" alt="" class="uc-wa-avatar"/><div class="uc-wa-name">Comando<small>en línea</small></div><span class="uc-wa-more">⋮</span></div>
              <div class="uc-chat" aria-live="polite">${chatHtml(c)}</div>
              <div class="uc-wa-input"><span>Escribe un comando…</span><i>🎤</i></div>
            </div>
          </div>
          <ol class="uc-timeline" aria-label="${esc(T.moments)}">${timelineHtml(c)}</ol>
          <div class="uc-outcome">${outcomeHtml(c)}</div>
          ${opts.feed ? feedHtml() : ''}
        </div>
        <div class="uc-foot"><p class="uc-close">${esc(D.seccion.cierre)}</p><a href="${esc(D.seccion.cta.href)}" class="btn-primary uc-cta">${esc(D.seccion.cta.texto)}<span class="uc-cta-sufijo">${esc(D.seccion.cta.sufijo || '')}</span><span class="btn-arrow" aria-hidden="true">→</span></a></div>`;
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
      const c = current(); step = firstStep(c); const chat = root.querySelector('.uc-chat'), out = root.querySelector('.uc-outcome'), layout = root.querySelector('.uc-layout');
      layout.classList.remove('is-in'); chat.innerHTML = chatHtml(c); out.innerHTML = outcomeHtml(c); root.querySelector('.uc-timeline').innerHTML = timelineHtml(c); bindSteps(); showStep(step, 'init');
      requestAnimationFrame(() => requestAnimationFrame(() => layout.classList.add('is-in')));
      restartTimer(6000);
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
    // Los datos van por idioma: /docs/<data>.en.json y .pt.json. Si el idioma
    // todavía no tiene su fichero, se usa el castellano en vez de dejar la
    // sección vacía.
    const base = `/docs/${opts.data}`;
    const DATA = LANG === 'es' ? `${base}.json?v=${opts.version}` : `${base}.${LANG}.json?v=${opts.version}`;
    const loadData = () =>
      fetch(DATA)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .catch(() => fetch(`${base}.json?v=${opts.version}`).then((r) => r.json()));
    loadData().then((d) => {
      D = d;
      if (Array.isArray(D.horas) && D.horas.length) TIMES = D.horas;
      if (D.proHora) PRO_TIME = D.proHora;
      render(); showStep(step, 'init');
      requestAnimationFrame(() => root.querySelector('.uc-layout').classList.add('is-in'));
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }).catch(() => {});
  }

  const meta = document.getElementById('metaads-root');
  if (meta) mount(meta, { data: 'metaads', pickers: false, feed: false, version: 3 });
  const dia = document.getElementById('usecases-root');
  if (dia) mount(dia, { data: 'usecases', pickers: true, feed: true, anchor: 'como-funciona', version: 16 });
})();

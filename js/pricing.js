/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, tipo de cambio, comparativa,
   FAQ y textos) vive en PRICING_CONFIG. El markup se genera desde aquí.
   ============================================================ */
const PRICING_CONFIG = {
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  featuredPlan: 'starter',
  cta: { trialBase: '/app/', trialLabel: 'Elegir plan', freeLabel: 'Empezar gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Habla con ventas' },
  title: 'Haz menos trabajo manual desde US$ 3 al mes.',
  subtitle: 'Actualiza el CRM, crea seguimientos y recibe alertas desde WhatsApp. Prueba gratis.',
  // Cada plan muestra solo 4 líneas: contactos, comandos, usuario y un diferencial.
  plans: [
    { id: 'gratis',  name: 'Gratis',  price: 0,  contacts: 20000, commands: 30,   highlight: '1 conexión', note: 'Prueba individual, sin tarjeta. Sin sincronización continua ni automatizaciones; expira a los 30 días sin uso.' },
    { id: 'basico',  name: 'Básico',  price: 3,  contacts: 20000, commands: 200,  highlight: '2 conexiones' },
    { id: 'starter', name: 'Starter', price: 8,  contacts: 70000, commands: 700,  highlight: '5 conexiones' },
    { id: 'pro',     name: 'Pro',     price: 20, contacts: 200000, commands: 2000, highlight: 'Conexiones ilimitadas' },
  ],
  enterpriseLine: '¿Más de 200 000 contactos, integraciones avanzadas o soporte dedicado?',
  commandNote: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones y las respuestas no cuentan.',
  addons: [
    { label: '+20 000 contactos', price: 1 },
    { label: '+500 comandos',    price: 8 },
  ],
  addonsIntro: '¿Te quedas corto? Suma paquetes sin cambiar de plan:',
  overageNote: 'Te avisamos al 80 % de tu límite. Nunca cortamos el servicio sin aviso.',
  includes: [
    'Conexión al CRM en 2 minutos',
    'Nadie cambia nada sin confirmar',
    'Historial auditable de cada acción',
    'Español adaptado al país de tu equipo',
    'Los avisos que quieras, cuando los quieras. Se apagan en un mensaje',
    'Comandos por texto o audio de WhatsApp',
    'Un plan individual con comandos propios',
  ],
  comparison: {
    title: '¿Cuánto es esto frente a tu CRM?',
    intro: 'Comando complementa a tu CRM, no lo sustituye. Referencia: precios de lista de HubSpot 2026, facturación anual.',
    rows: [
      { contacts: 'Hasta 20 000',      hubspot: 'Marketing Hub Starter: $20/asiento/mes (1 000 contactos; +$50 por cada 1 000)', comando: 'Básico: $3/usuario/mes, 20 000 contactos a tu alcance' },
      { contacts: '20 000 – 70 000',  hubspot: 'Marketing Hub Professional: desde $890/mes (2 000 contactos; +$250 por 5 000)', comando: 'Starter: $8/usuario/mes, 70 000 contactos a tu alcance' },
      { contacts: '70 000 – 200 000', hubspot: 'Marketing Hub Enterprise: desde $3 600/mes (10 000 contactos)', comando: 'Pro: $20/mes, 200 000 contactos a tu alcance' },
      { contacts: 'Usuario', hubspot: 'Sales Hub Professional: $90/asiento/mes', comando: 'Plan individual desde $3/mes' },
    ],
    message: 'Actualiza, da seguimiento y recibe alertas sin abrir el CRM.',
    footnote: 'Precios de HubSpot sujetos a cambio. Comando funciona con cualquier plan de HubSpot, incluido el gratuito.',
  },
  faq: [
    { q: '¿Cómo se calcula el precio?', a: 'Cada persona usa un plan según cuántos contactos de su CRM necesita tener a su alcance. Si dos usuarios necesitan hasta 20 000 contactos cada uno, cada uno usa un plan Básico de US$ 3 al mes. Puedes cambiar de plan cuando quieras; se prorratea.' },
    { q: '¿Qué cuenta como comando y qué pasa si me paso?', a: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio; una nota de voz cuenta como 1,5. Las confirmaciones («sí», «ok») y las respuestas de Comando no cuentan. Te avisamos al 80 % del cupo y nunca cortamos el servicio sin aviso: puedes sumar paquetes de 500 comandos por $8 o subir de plan.' },
    { q: '¿Qué incluye el plan Gratis?', a: '30 comandos para una persona, con hasta 20 000 contactos a tu alcance y 1 CRM conectado, sin tarjeta. No incluye sincronización continua ni automatizaciones; al agotar el cupo (o tras 30 días sin uso) deja de ejecutar hasta que elijas un plan.' },
    { q: '¿Cada cuánto se actualiza mi CRM en Comando?', a: 'Cuando tu CRM envía eventos, los cambios llegan en tiempo real. Cuando no los envía, Comando revisa los cambios cada 6 horas en Básico, cada 30 minutos en Starter y cada 5 minutos en Pro.' },
    { q: '¿Comando les escribe a mis clientes?', a: 'No desde tu número personal: Meta bloquea los envíos automáticos desde WhatsApp no oficial. Comando prepara el mensaje y te lo entrega listo para enviarlo con un toque (modo asistido), así que no necesitas contratar la API de WhatsApp Business para empezar. Si conectas un número oficial de WhatsApp Business, los envíos automáticos con plantillas aprobadas quedan disponibles.' },
    { q: '¿Qué pasa si pido algo que mi CRM no permite?', a: 'Comando te lo dice y te propone la alternativa que sí puede hacer (por ejemplo, crear la tarea en vez de llamar, o contar desde hoy si tu CRM no guarda historial de ese campo).' },
    { q: '¿Qué CRM soportan y dónde quedan mis credenciales?', a: 'HubSpot, Salesforce, Zoho CRM, Pipedrive, Dynamics 365, Google Sheets y las tiendas y marketplaces de la lista de conectores. Te conectas con el login del propio sistema, sin copiar claves; las credenciales quedan cifradas en la infraestructura de Comando y nunca en terceros.' },
  ],
};

(function () {
  const C = PRICING_CONFIG;
  const state = { annual: false };
  const fmtN = (n) => n.toLocaleString('es-PE').replace(/,/g, ' ').replace(/\./g, ' ');
  function money(usd) { if (usd == null) return null; const v = Number.isInteger(usd) ? usd : Math.round(usd * 100) / 100; return 'US$ ' + v.toLocaleString('es-PE'); }
  function monthly(p) { if (p == null) return null; return state.annual ? p * (12 - C.billing.annualFreeMonths) / 12 : p; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderHead() {
    return `<div class="pricing-head"><div class="getupdate-eyebrow">PRECIOS</div>
      <h3 class="home_getupdate-heading">${esc(C.title)}</h3>
      <div class="getupdate-text">${esc(C.subtitle)}</div>
      <div class="pricing-toggles" role="group" aria-label="Opciones de precio">
        <div class="pt-group" role="group" aria-label="Facturación">
          <button type="button" class="pt-btn${state.annual ? '' : ' is-on'}" data-set="annual" data-val="0" aria-pressed="${!state.annual}">Mensual</button>
          <button type="button" class="pt-btn${state.annual ? ' is-on' : ''}" data-set="annual" data-val="1" aria-pressed="${state.annual}">Anual <span class="pt-badge">${C.billing.annualFreeMonths} meses gratis</span></button>
        </div>
      </div></div>`;
  }
  function renderCard(p) {
    const featured = p.id === C.featuredPlan;
    const free = p.price === 0;
    const m = monthly(p.price);
    const priceHtml = free ? `<div class="price-amount">US$ 0</div>`
      : `<div class="price-amount">${money(m)}<span>/mes</span></div>${state.annual ? `<div class="price-annual">${money(m * 12)} al año</div>` : ''}`;
    const lines = [p.contacts == null ? 'Contactos según tu plan' : `<b>${fmtN(p.contacts)}</b> contactos a tu alcance`, free ? `<b>${fmtN(p.commands)}</b> comandos para probar` : `<b>${fmtN(p.commands)}</b> comandos al mes`, '<b>Plan individual</b>', esc(p.highlight)];
    const cta = free ? `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.freeLabel)}</a>`
      : `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.trialLabel)}</a>`;
    return `<div class="price-card${featured ? ' is-featured' : ''}${free ? ' is-free' : ''}" data-plan="${p.id}">${featured ? '<div class="price-flag">Más elegido</div>' : ''}
      <div class="price-name">${esc(p.name)}</div>${priceHtml}
      <ul class="price-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${p.note ? `<div class="price-note">${esc(p.note)}</div>` : ''}${cta}</div>`;
  }
  function renderCards() {
    return `<div class="pricing-grid is-four" id="pricing-cards">${C.plans.map(renderCard).join('')}</div>
      <div class="pricing-notes">
        <p class="pricing-note"><b>¿Qué es un comando?</b> ${esc(C.commandNote)}</p>
        <p class="pricing-note"><b>${esc(C.addonsIntro)}</b> ${C.addons.map((a) => `${esc(a.label)} = ${money(a.price)}/mes`).join(' · ')}. ${esc(C.overageNote)}</p>
        <p class="pricing-note">${esc(C.enterpriseLine)} <a href="${C.cta.enterpriseHref}">${esc(C.cta.enterpriseLabel)}</a>.</p>
      </div>`;
  }
  function renderMore() {
    return `<section class="pricing-more" aria-label="Detalles de precios">
      <div class="padding-global"><div class="container-large">
        <div class="pm-block"><h3 class="pm-title">Preguntas frecuentes</h3>
          <div class="pm-faq">${C.faq.map((f) => `<details class="pm-faq-item"><summary>${esc(f.q)}</summary><div class="pm-faq-a">${esc(f.a)}</div></details>`).join('')}</div></div>
      </div></div></section>`;
  }
  function mount() {
    const root = document.getElementById('pricing-root');
    if (!root) return;
    root.innerHTML = renderHead() + renderCards();
    root.querySelectorAll('.pt-btn').forEach((b) => b.addEventListener('click', () => {
      state[b.dataset.set] = b.dataset.val === '1'; mount();
    }));
    // mobile carousel starts at the first card (Gratis)
    const grid = document.getElementById('pricing-cards'); if (grid) grid.scrollLeft = 0;
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
  /* Formulario de interesados. Antes solo redirigía a /empezar/, y de ahí el dato
     dependía de que se abriera el cliente de correo: si no se abría, el interesado
     se perdía sin que nadie lo supiera. Ahora se guarda primero en /api/lead y solo
     después se le pregunta por su CRM. Si la función no está disponible, se
     comporta como antes. */
  const form = document.getElementById('wf-form-Waitlist-form');
  if (form) {
    const wrap = form.closest('.w-form');
    const okBox = wrap && wrap.querySelector('.w-form-done');
    const failBox = wrap && wrap.querySelector('.w-form-fail');
    const input = form.querySelector('input[name="name"]');
    const trap = form.querySelector('input[name="website"]');
    const submit = form.querySelector('input[type="submit"]');
    const valid = (v) => /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v) || (/^[+\d\s()-]+$/.test(v) && v.replace(/\D/g, '').length >= 8);
    const say = (box, msg) => {
      if (failBox) failBox.style.display = 'none';
      if (okBox) okBox.style.display = 'none';
      if (!box) return;
      const slot = box.querySelector('.success_message, .text-block-2');
      if (slot && msg) slot.textContent = msg;
      box.style.display = 'block';
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      const v = ((input && input.value) || '').trim();
      if (!valid(v)) { say(failBox, 'Escribe tu correo o tu WhatsApp para poder responderte.'); if (input) input.focus(); return; }
      const next = '/empezar/?email=' + encodeURIComponent(v);
      if (submit) { submit.disabled = true; submit.value = 'Enviando…'; }
      try {
        const res = await fetch('api/lead', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contact: v, source: 'precios', website: trap ? trap.value : '' }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        say(okBox, 'Listo, ya tenemos tus datos. Dinos cuál es tu CRM y te avisamos primero.');
        setTimeout(() => { window.location.href = next + '&guardado=1'; }, 1200);
      } catch (err) {
        window.location.href = next;   // sin función: el camino de siempre
      }
    }, true);
  }
  const more = document.getElementById('pricing-more');
  if (more) more.innerHTML = renderMore();
  mount();
})();

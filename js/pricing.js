/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, tipo de cambio, comparativa,
   FAQ y textos) vive en PRICING_CONFIG. El markup se genera desde aquí.
   ============================================================ */
const PRICING_CONFIG = {
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  featuredPlan: 'starter',
  cta: { trialBase: '/empezar/', trialLabel: 'Elegir plan', freeLabel: 'Empezar gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Habla con ventas' },
  title: 'Un precio por empresa, no por vendedor.',
  subtitle: 'El precio sube con tu base de clientes, no con tu equipo. Empieza gratis, sin tarjeta.',
  // Cada plan muestra solo 4 líneas: contactos, comandos, vendedores y un diferencial.
  plans: [
    { id: 'gratis',   name: 'Gratis',   price: 0,  contacts: 10000, commands: 50,    highlight: '1 CRM conectado', note: 'Cupo total de prueba, sin tarjeta. Sin sincronización continua ni automatizaciones; expira a los 30 días sin uso.' },
    { id: 'basico',   name: 'Básico',   price: 3,  contacts: 10000, commands: 150,   highlight: '1 CRM conectado' },
    { id: 'starter',  name: 'Starter',  price: 8,  contacts: 30000, commands: 500,  highlight: 'Automatizaciones ilimitadas' },
    { id: 'pro',      name: 'Pro',      price: 19, contacts: 80000, commands: 1500,  highlight: 'Hasta 3 CRM + ecommerce · soporte por WhatsApp' },
  ],
  enterpriseLine: '¿Más de 80 000 contactos? Business: US$ 49/mes con 250 000 contactos y 5 000 comandos al mes. ¿Varios países o requisitos especiales?',
  syncNote: 'Sincronización en tiempo real cuando tu CRM envía eventos (HubSpot, Pipedrive, Zoho, Kommo, Shopify, Tiendanube, WooCommerce, Mercado Libre…). En los demás, Comando revisa cambios cada 6 h en Básico, 30 min en Starter y 5 min en Pro.',
  commandNote: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones y las respuestas no cuentan.',
  addons: [
    { label: '+10 000 contactos', price: 1 },
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
    'Todo tu equipo, sin costo por persona',
  ],
  comparison: {
    title: '¿Cuánto es esto frente a tu CRM?',
    intro: 'Comando complementa a tu CRM, no lo sustituye. Referencia: precios de lista de HubSpot 2026, facturación anual.',
    rows: [
      { contacts: 'Hasta 10 000',     hubspot: 'Marketing Hub Starter: $20/asiento/mes (1 000 contactos; +$50 por cada 1 000)', comando: 'Básico: $3/mes, 10 000 contactos, vendedores ilimitados' },
      { contacts: '10 000 – 30 000', hubspot: 'Marketing Hub Professional: desde $890/mes (2 000 contactos; +$250 por 5 000)', comando: 'Starter: $8/mes, 30 000 contactos' },
      { contacts: '30 000 – 250 000', hubspot: 'Marketing Hub Enterprise: desde $3 600/mes (10 000 contactos)',                  comando: 'Pro $19/mes (80 000) · Business $49/mes (250 000)' },
      { contacts: 'Asiento de ventas', hubspot: 'Sales Hub Professional: $90/asiento/mes',                                      comando: 'Sin costo por asiento' },
    ],
    message: 'Todo tu equipo opera el CRM desde WhatsApp por menos del 5 % de lo que pagas por el CRM. Vendedores ilimitados.',
    footnote: 'Precios de HubSpot sujetos a cambio. Comando funciona con cualquier plan de HubSpot, incluido el gratuito.',
  },
  faq: [
    { q: '¿Cómo se calcula el precio?', a: 'Por el tamaño de tu CRM: los contactos que Comando vigila, medidos una vez al día (no se cobra por leads que entran y salen el mismo día). No cobramos por usuario: conecta a todo tu equipo sin costo por asiento. Puedes cambiar de plan cuando quieras; se prorratea.' },
    { q: '¿Qué cuenta como comando y qué pasa si me paso?', a: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio; una nota de voz cuenta como 1,5. Las confirmaciones («sí», «ok») y las respuestas de Comando no cuentan. Te avisamos al 80 % del cupo y nunca cortamos el servicio sin aviso: puedes sumar paquetes de 500 comandos por $8 o subir de plan.' },
    { q: '¿Qué incluye el plan Gratis?', a: '50 comandos de cupo total con 1 CRM de hasta 10 000 contactos y vendedores ilimitados, sin tarjeta. No incluye sincronización continua ni automatizaciones; al agotar el cupo (o tras 30 días sin uso) deja de ejecutar hasta que elijas un plan.' },
    { q: '¿Cada cuánto se actualiza mi CRM en Comando?', a: 'En tiempo real cuando tu CRM envía eventos (HubSpot, Pipedrive, Zoho, Kommo, Shopify, Tiendanube, WooCommerce, Mercado Libre…). En los que no los envían, Comando revisa los cambios cada 6 h en Básico, cada 30 min en Starter y cada 5 min en Pro.' },
    { q: '¿Comando les escribe a mis clientes?', a: 'No desde tu número personal: Meta bloquea los envíos automáticos desde WhatsApp no oficial. Comando prepara el mensaje y te lo entrega listo para enviarlo con un toque (modo asistido), así que no necesitas contratar la API de WhatsApp Business para empezar. Si conectas un número oficial de WhatsApp Business, los envíos automáticos con plantillas aprobadas quedan disponibles.' },
    { q: '¿Qué pasa si pido algo que mi CRM no permite?', a: 'Comando te lo dice y te propone la alternativa que sí puede hacer (por ejemplo, crear la tarea en vez de llamar, o contar desde hoy si tu CRM no guarda historial de ese campo).' },
    { q: '¿Qué CRM soportan y dónde quedan mis credenciales?', a: 'HubSpot, Pipedrive, Zoho CRM, Salesforce, Kommo y Dynamics 365; en e-commerce, Shopify, Tiendanube, WooCommerce, Mercado Libre y VTEX. Te conectas con el login del propio CRM, sin copiar claves; las credenciales quedan cifradas en infraestructura de Comando, nunca en terceros (en planes a medida, en la tuya).' },
  ],
  finalStrip: { text: 'Tus datos se quedan en tu CRM. Comando no hace nada que no esté autorizado. Y si mañana te vas, no hay nada que exportar: ya está todo en tu CRM.', cta: 'Empezar gratis', href: '/empezar/?plan=gratis' },
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
    const priceHtml = free ? `<div class="price-amount">US$ 0<span>/mes</span></div>`
      : `<div class="price-amount">${money(m)}<span>/mes</span></div>${state.annual ? `<div class="price-annual">${money(m * 12)} al año</div>` : ''}`;
    const lines = [p.contacts == null ? 'Cualquier tamaño de CRM' : `<b>${fmtN(p.contacts)}</b> contactos en tu CRM`, free ? `<b>${fmtN(p.commands)}</b> comandos para probar` : `<b>${fmtN(p.commands)}</b> comandos al mes`, 'Vendedores ilimitados', esc(p.highlight)];
    const cta = free ? `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.freeLabel)}</a>`
      : `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.trialLabel)}</a>`;
    return `<div class="price-card${featured ? ' is-featured' : ''}${free ? ' is-free' : ''}" data-plan="${p.id}">${featured ? '<div class="price-flag">Más elegido</div>' : ''}
      <div class="price-name">${esc(p.name)}</div>${priceHtml}
      <ul class="price-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${p.note ? `<div class="price-note">${esc(p.note)}</div>` : ''}${cta}</div>`;
  }
  function renderCards() {
    return `<div class="pricing-grid is-five" id="pricing-cards">${C.plans.map(renderCard).join('')}</div>
      <div class="pricing-notes">
        <p class="pricing-note"><b>¿Qué es un comando?</b> ${esc(C.commandNote)}</p>
        <p class="pricing-note"><b>${esc(C.addonsIntro)}</b> ${C.addons.map((a) => `${esc(a.label)} = ${money(a.price)}/mes`).join(' · ')}. ${esc(C.overageNote)}</p>
        <p class="pricing-note">${esc(C.enterpriseLine)} <a href="${C.cta.enterpriseHref}">${esc(C.cta.enterpriseLabel)}</a>.</p>
        <p class="pricing-note ob-muted">${esc(C.syncNote)}</p>
      </div>`;
  }
  function renderMore() {
    return `<section class="pricing-more" aria-label="Detalles de precios">
      <div class="padding-global"><div class="container-large">
        <div class="pm-block"><h3 class="pm-title">Preguntas frecuentes</h3>
          <div class="pm-faq">${C.faq.map((f) => `<details class="pm-faq-item"><summary>${esc(f.q)}</summary><div class="pm-faq-a">${esc(f.a)}</div></details>`).join('')}</div></div>
        <div class="pm-strip"><div class="pm-strip-text">${esc(C.finalStrip.text)}</div><a href="${C.finalStrip.href}" class="price-cta">${esc(C.finalStrip.cta)}</a></div>
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
  // contact form: goes to /empezar/ (early access) (no Webflow backend)
  const form = document.getElementById('wf-form-Waitlist-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault(); e.stopImmediatePropagation();
    const v = (form.querySelector('input[name="name"]') || {}).value || '';
    window.location.href = '/empezar/' + (v ? '?email=' + encodeURIComponent(v.trim()) : '');
  }, true);
  const more = document.getElementById('pricing-more');
  if (more) more.innerHTML = renderMore();
  mount();
})();

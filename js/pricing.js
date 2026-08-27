/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, tipo de cambio, comparativa,
   FAQ y textos) vive en PRICING_CONFIG. El markup se genera desde aquí.
   ============================================================ */
const PRICING_CONFIG = {
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  featuredPlan: 'starter',
  cta: { trialBase: 'https://app.comando.pro/registro', trialLabel: 'Elegir plan', freeLabel: 'Empezar gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Habla con ventas' },
  title: 'Desde $3 al mes.',
  subtitle: 'Vendedores ilimitados. Paga según el tamaño de tu CRM. Empieza gratis con 50 comandos, sin tarjeta.',
  // Cada plan muestra solo 4 líneas: contactos, comandos, vendedores y un diferencial.
  plans: [
    { id: 'gratis',   name: 'Gratis',   price: 0,  contacts: null,  commands: 50,    highlight: '1 CRM conectado', note: 'Cupo total de prueba, sin tarjeta. Sin sincronización continua ni automatizaciones; expira a los 30 días sin uso.' },
    { id: 'basico',   name: 'Básico',   price: 3,  contacts: 10000, commands: 300,   highlight: '1 CRM conectado' },
    { id: 'starter',  name: 'Starter',  price: 6,  contacts: 25000, commands: 1000,  highlight: 'Automatizaciones ilimitadas' },
    { id: 'pro',      name: 'Pro',      price: 19, contacts: 75000, commands: 4000,  highlight: 'Hasta 3 CRM + ecommerce · soporte por WhatsApp' },
  ],
  enterpriseLine: '¿Más de 75 000 contactos, varios países o requisitos especiales?',
  commandNote: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones y las respuestas no cuentan.',
  addons: [
    { label: '+10 000 contactos', price: 1 },
    { label: '+1 000 comandos',  price: 2 },
  ],
  addonsIntro: '¿Te quedas corto? Suma paquetes sin cambiar de plan:',
  overageNote: 'Te avisamos al 80 % de tu límite. Nunca cortamos el servicio sin aviso.',
  includes: [
    'Conexión al CRM en 2 minutos',
    'Confirmación antes de ejecutar cualquier cambio',
    'Historial auditable de cada acción',
    'Español adaptado al país de tu equipo',
    'Alertas en tiempo real por eventos del CRM',
    'Comandos por texto o audio de WhatsApp',
    'Vendedores ilimitados, sin costo por asiento',
  ],
  comparison: {
    title: '¿Cuánto es esto frente a tu CRM?',
    intro: 'Comando complementa a tu CRM, no lo sustituye. Referencia: precios de lista de HubSpot 2026, facturación anual.',
    rows: [
      { contacts: 'Hasta 10 000',     hubspot: 'Marketing Hub Starter: $20/asiento/mes (1 000 contactos; +$50 por cada 1 000)', comando: 'Básico: $3/mes, 10 000 contactos, vendedores ilimitados' },
      { contacts: '10 000 – 25 000', hubspot: 'Marketing Hub Professional: desde $890/mes (2 000 contactos; +$250 por 5 000)', comando: 'Starter: $6/mes, 25 000 contactos' },
      { contacts: '25 000 – 200 000', hubspot: 'Marketing Hub Enterprise: desde $3 600/mes (10 000 contactos)',                  comando: 'Pro $19/mes (75 000) · Business $49/mes (200 000)' },
      { contacts: 'Asiento de ventas', hubspot: 'Sales Hub Professional: $90/asiento/mes',                                      comando: 'Sin costo por asiento' },
    ],
    message: 'Todo tu equipo opera el CRM desde WhatsApp por menos del 5 % de lo que pagas por el CRM. Vendedores ilimitados.',
    footnote: 'Precios de HubSpot sujetos a cambio. Comando funciona con cualquier plan de HubSpot, incluido el gratuito.',
  },
  faq: [
    { q: '¿Cobran por usuario?', a: 'No. Conecta a todo tu equipo sin costo por asiento; el plan depende del tamaño de tu CRM.' },
    { q: '¿Qué cuenta como «contacto»?', a: 'Los contactos de tu CRM que Comando vigila. Se mide una vez al día; no se cobra por leads que entran y salen el mismo día.' },
    { q: '¿Cada cuánto se actualiza mi CRM en Comando?', a: 'En tiempo real cuando tu CRM envía eventos (HubSpot, Pipedrive, Zoho, Kommo, Shopify, Tiendanube, WooCommerce, Mercado Libre…). En los que no los envían, Comando revisa los cambios cada 6 h en Básico, cada 30 min en Starter y cada 5 min en Pro.' },
    { q: '¿Qué cuenta como comando?', a: 'Cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones («sí», «ok») y las respuestas de Comando no cuentan.' },
    { q: '¿Qué pasa si uso más comandos de los incluidos?', a: 'Te avisamos al 80 %. Puedes sumar paquetes de 1 000 comandos por $2 o subir de plan.' },
    { q: '¿Qué incluye el plan Gratis?', a: '50 comandos de cupo total con 1 CRM de cualquier tamaño y vendedores ilimitados, sin tarjeta. No incluye sincronización continua ni automatizaciones; al agotar el cupo (o tras 30 días sin uso) deja de ejecutar hasta que elijas un plan.' },
    { q: '¿Qué CRM soportan?', a: 'HubSpot, Salesforce, Zoho, Pipedrive, Dynamics 365 y más.' },
    { q: '¿Necesito contratar la API de WhatsApp Business?', a: 'No para empezar.' },
    { q: '¿Dónde quedan las credenciales de mi CRM?', a: 'En infraestructura de Comando, cifradas; nunca en terceros. En planes a medida, en la tuya.' },
    { q: '¿Puedo cambiar de plan?', a: 'Cuando quieras; se prorratea.' },
  ],
  finalStrip: { text: 'Tus datos no salen de tu CRM. Comando solo ejecuta lo que confirmas.', cta: 'Empezar gratis', href: 'https://app.comando.pro/registro?plan=gratis' },
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
  const more = document.getElementById('pricing-more');
  if (more) more.innerHTML = renderMore();
  mount();
})();

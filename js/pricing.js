/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, tipo de cambio, comparativa,
   FAQ y textos) vive en PRICING_CONFIG. El markup se genera desde aquí.
   ============================================================ */
const PRICING_CONFIG = {
  currency: { base: 'USD', alt: 'PEN', rate: 3.7, altNote: 'aprox., tipo de cambio referencial' },
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  trialDays: 14,
  featuredPlan: 'pro',
  cta: { trialBase: 'https://app.comando.pro/registro', trialLabel: 'Probar 14 días gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Hablar con ventas' },
  title: 'Precios simples. Desde $2 al mes.',
  subtitle: 'Vendedores ilimitados. Paga según el tamaño de tu CRM.',
  plans: [
    { id: 'basico',   name: 'Básico',   price: 2,  contacts: 500,    commands: 300,   crms: '1',           automations: '5 activas',   summaries: 'Diario',                         ecommerce: false, support: 'Email' },
    { id: 'starter',  name: 'Starter',  price: 6,  contacts: 2500,   commands: 1000,  crms: '1',           automations: 'Ilimitadas',  summaries: 'Diario',                         ecommerce: false, support: 'Email' },
    { id: 'pro',      name: 'Pro',      price: 19, contacts: 10000,  commands: 4000,  crms: '3',           automations: 'Ilimitadas',  summaries: 'Diario, semanal y a pedido',     ecommerce: true,  support: 'Prioritario por WhatsApp' },
    { id: 'business', name: 'Business', price: 49, contacts: 50000,  commands: 10000, crms: 'Ilimitados',  automations: 'Ilimitadas',  summaries: 'Personalizados',                 ecommerce: true,  support: 'Prioritario + onboarding' },
    { id: 'enterprise', name: 'Enterprise', price: null, contacts: null, commands: null, crms: 'Ilimitados', automations: 'Ilimitadas', summaries: 'Personalizados', ecommerce: true, support: 'Dedicado + SLA', extra: ['Credenciales del CRM en tu infraestructura', 'SSO y auditoría avanzada', 'Plantillas a medida'] },
  ],
  addons: [
    { label: '+1 000 contactos', price: 1, per: '/mes' },
    { label: '+1 000 comandos',  price: 2, per: '/mes' },
  ],
  overageNote: 'Al superar contactos o comandos te avisamos al 80 %; puedes sumar un paquete o subir de plan. Nunca cortamos el servicio sin aviso.',
  includes: [
    'Conexión al CRM en 2 minutos con login OAuth (sin copiar claves)',
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
      { contacts: '1 000',           hubspot: 'Marketing Hub Starter: $20/asiento/mes (1 000 contactos; +$50 por cada 1 000)', comando: 'Starter: $6/mes, vendedores ilimitados' },
      { contacts: '2 000 – 10 000',  hubspot: 'Marketing Hub Professional: desde $890/mes (2 000 contactos; +$250 por 5 000)', comando: 'Pro: $19/mes' },
      { contacts: '10 000 – 50 000', hubspot: 'Marketing Hub Enterprise: desde $3 600/mes (10 000 contactos)',                  comando: 'Business: $49/mes' },
      { contacts: 'Asiento de ventas', hubspot: 'Sales Hub Professional: $90/asiento/mes',                                      comando: 'Sin costo por asiento' },
    ],
    message: 'Todo tu equipo opera el CRM desde WhatsApp por menos del 5 % de lo que pagas por el CRM. Vendedores ilimitados.',
    footnote: 'Precios de HubSpot sujetos a cambio. Comando funciona con cualquier plan de HubSpot, incluido el gratuito.',
  },
  faq: [
    { q: '¿Cobran por usuario?', a: 'No. Conecta a todo tu equipo sin costo por asiento; el plan depende del tamaño de tu CRM.' },
    { q: '¿Qué cuenta como «contacto»?', a: 'Los contactos de tu CRM que Comando vigila. Se mide una vez al día; no se cobra por leads que entran y salen el mismo día.' },
    { q: '¿Qué cuenta como comando?', a: 'Cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones («sí», «ok») y las respuestas de Comando no cuentan.' },
    { q: '¿Qué pasa si uso más comandos de los incluidos?', a: 'Te avisamos al 80 %. Puedes sumar paquetes de 1 000 comandos por $2 o subir de plan.' },
    { q: '¿Qué CRM soportan?', a: 'HubSpot, Salesforce, Zoho, Pipedrive, Dynamics 365 y más.' },
    { q: '¿Necesito contratar la API de WhatsApp Business?', a: 'No para empezar.' },
    { q: '¿Dónde quedan las credenciales de mi CRM?', a: 'En infraestructura de Comando, cifradas; nunca en terceros. En Enterprise, en la tuya.' },
    { q: '¿Puedo cambiar de plan?', a: 'Cuando quieras; se prorratea.' },
  ],
  finalStrip: { text: 'Tus datos no salen de tu CRM. Comando solo ejecuta lo que confirmas.', cta: 'Probar 14 días gratis', href: 'https://app.comando.pro/registro' },
};

(function () {
  const C = PRICING_CONFIG;
  const state = { annual: false, alt: false };
  const fmtN = (n) => n.toLocaleString('es-PE').replace(/,/g, ' ').replace(/\./g, ' ');
  function money(usd) {
    if (usd == null) return null;
    const v = state.alt ? usd * C.currency.rate : usd;
    const sym = state.alt ? 'S/ ' : 'US$ ';
    const rounded = state.alt ? Math.round(v) : (Number.isInteger(v) ? v : Math.round(v * 100) / 100);
    return sym + rounded.toLocaleString('es-PE');
  }
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
        <div class="pt-group" role="group" aria-label="Moneda">
          <button type="button" class="pt-btn${state.alt ? '' : ' is-on'}" data-set="alt" data-val="0" aria-pressed="${!state.alt}">${C.currency.base}</button>
          <button type="button" class="pt-btn${state.alt ? ' is-on' : ''}" data-set="alt" data-val="1" aria-pressed="${state.alt}">${C.currency.alt}</button>
        </div>
        ${state.alt ? `<div class="pt-note">${esc(C.currency.altNote)}</div>` : ''}
      </div></div>`;
  }
  function renderCard(p) {
    const featured = p.id === C.featuredPlan;
    const ent = p.price == null;
    const m = monthly(p.price);
    const priceHtml = ent ? `<div class="price-amount">A medida</div>`
      : `<div class="price-amount">${money(m)}<span>/mes</span></div>${state.annual ? `<div class="price-annual">${money(m * 12)} al año</div>` : ''}`;
    const lines = ent
      ? ['Contactos ilimitados', 'Comandos negociados', 'Vendedores ilimitados', 'CRM conectados: ilimitados', `Resúmenes ${p.summaries.toLowerCase()}`, 'Integración ecommerce', `Soporte ${p.support.toLowerCase()}`, ...p.extra]
      : [`Hasta ${fmtN(p.contacts)} contactos`, `${fmtN(p.commands)} comandos al mes (texto o audio)`, 'Vendedores ilimitados', `CRM conectados: ${p.crms}`, `Automatizaciones: ${p.automations.toLowerCase()}`, `Resúmenes por WhatsApp: ${p.summaries.toLowerCase()}`, p.ecommerce ? 'Integración ecommerce (Shopify, WooCommerce, VTEX)' : null, `Soporte: ${p.support.toLowerCase()}`].filter(Boolean);
    const cta = ent ? `<a href="${C.cta.enterpriseHref}" class="price-cta">${esc(C.cta.enterpriseLabel)}</a>`
      : `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.trialLabel)}</a>`;
    return `<div class="price-card${featured ? ' is-featured' : ''}" data-plan="${p.id}">${featured ? '<div class="price-flag">Más elegido</div>' : ''}
      <div class="price-name">${esc(p.name)}</div>${priceHtml}
      <ul class="price-list">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>${cta}</div>`;
  }
  function renderCards() {
    return `<div class="pricing-grid is-five" id="pricing-cards">${C.plans.map(renderCard).join('')}</div>
      <div class="pricing-addons"><span>Add-ons en todos los planes:</span> ${C.addons.map((a) => `<b>${esc(a.label)} → ${money(a.price)}${a.per}</b>`).join(' · ')}
      <div class="pricing-overage">${esc(C.overageNote)}</div></div>`;
  }
  function renderMore() {
    const cmp = C.comparison;
    return `<section class="pricing-more" aria-label="Detalles de precios">
      <div class="padding-global"><div class="container-large">
        <div class="pm-block"><h3 class="pm-title">Todos los planes incluyen</h3>
          <ul class="pm-includes">${C.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>
        <div class="pm-block"><h3 class="pm-title">${esc(cmp.title)}</h3><p class="pm-intro">${esc(cmp.intro)}</p>
          <div class="pm-table-wrap"><table class="pm-table"><thead><tr><th scope="col">Contactos</th><th scope="col">HubSpot (referencia)</th><th scope="col">Comando</th></tr></thead>
          <tbody>${cmp.rows.map((r) => `<tr><td>${esc(r.contacts)}</td><td>${esc(r.hubspot)}</td><td class="pm-strong">${esc(r.comando)}</td></tr>`).join('')}</tbody></table></div>
          <p class="pm-message">${esc(cmp.message)}</p><p class="pm-footnote">${esc(cmp.footnote)}</p></div>
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
    // mobile: center the featured card in the carousel
    const grid = document.getElementById('pricing-cards');
    const feat = grid && grid.querySelector('.is-featured');
    if (grid && feat && window.innerWidth < 992) {
      requestAnimationFrame(() => { grid.scrollLeft = feat.offsetLeft - (grid.clientWidth - feat.clientWidth) / 2; });
    }
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
  const more = document.getElementById('pricing-more');
  if (more) more.innerHTML = renderMore();
  mount();
})();

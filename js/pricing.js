/* ============================================================
   pricing.js — Precios de Comando.

   Los números viven UNA vez, aquí abajo (PLAN_LADDER, TRIAL y ADDONS),
   y los tres idiomas solo cambian las palabras (PRICING_TEXT). Un plan de US$ 29
   con 10 cuentas publicitarias es el mismo plan en castellano, inglés y portugués.

   Por qué los números están escritos y no se piden al motor: ver
   `tooling/plans-check.mjs`. En resumen: una página de precios que espera a la
   red puede salir vacía, y salir vacía es peor que salir desactualizada. Lo que
   sí hay es una comprobación que grita cuando esto deja de coincidir con lo que
   se cobra (`node tooling/plans-check.mjs`, o `--fixture` contra el catálogo
   Meta-first mientras el motor de producción sirve el viejo).

   Catálogo del 15-sep-2026 (docs/plan-landing-agentes.md §2.7): el plan lo define
   la cantidad de cuentas publicitarias de Meta; el CRM es un módulo aparte.
   ============================================================ */

/**
 * La escalera de planes: la única copia de cada número en todo el sitio.
 *
 * `code` es el código del plan en el motor (`/v1/public/plans`). Límites con los
 * nombres del catálogo público: `adsAccounts`, `adsRefreshMinutes` (1440 = una
 * vez al día), `commands` (preguntas al mes). Precios en dólares: `month` y
 * `year` (anual = 10 meses).
 *
 * Capacidades: `true` incluido hoy; `'coming_soon'` todavía no existe en el
 * producto y la página lo dice como «Próximamente».
 *
 * EXCEPCIÓN VIVA (16-sep-2026, decisión de Sergio): `tiktokAds` va en `true`
 * mientras el catálogo del motor todavía dice `coming_soon`. El conector de
 * TikTok está construido y desplegado, pero apagado hasta que existan las
 * credenciales de la app de Marketing API, así que hoy la web promete antes de
 * que se pueda conectar. En cuanto las credenciales estén, el motor pasa a
 * publicarlo disponible y esta nota sobra; si la decisión cambia, aquí vuelve
 * `'coming_soon'` y la página entera se corrige sola.
 *
 * EXCEPCIÓN VIVA (16-sep-2026, decisión de Sergio): los planes se presentan por
 * CAPACIDADES, un agente más por plan (`agents`), y el tercero pasa a US$ 19
 * (anual 190) SOLO EN LA WEB. El motor sigue cobrando US$ 29 y dando las mismas
 * capacidades a todos, así que `tooling/plans-check.mjs` (y el flujo diario
 * «Los precios anunciados siguen siendo los que se cobran») queda en rojo hasta
 * que el catálogo se cambie en la consola de administración. Además, la web
 * anuncia reportes por plan (`reports`: avanzados en Growth; avanzados y
 * personalizados en Scale), que el catálogo del motor no distingue, y ya no nombra las notas de voz.
 * Starter anuncia el Media Buyer limitado (`mediaBuyerChanges`: 10 cambios al
 * mes), un límite que el motor todavía no aplica. Gratis incluye Analista y
 * Estratega con 30 preguntas al crear la cuenta, válidas 30 días y sin renovación
 * (`commandsOnceDays`); en el motor el cupo de Gratis todavía se renueva cada mes.
 */
const PLAN_LADDER = [
  {
    id: 'gratis', code: 'free', price: { month: 0, year: 0 }, agents: ['analyst', 'strategist'], commandsOnceDays: 30, metrics: 'basic',
    adsAccounts: 1, adsRefreshMinutes: 1440, commands: 30,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: false, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
  {
    id: 'analista', code: 'analista', price: { month: 9, year: 90 }, agents: ['analyst', 'strategist', 'mediaBuyerLimited'], mediaBuyerChanges: 10, metrics: true,
    adsAccounts: 2, adsRefreshMinutes: 60, commands: 300,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: false, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
  {
    id: 'equipo', code: 'equipo', price: { month: 19, year: 190 }, featured: true, agents: ['analyst', 'strategist', 'mediaBuyer'], reports: ['advanced'], metrics: true,
    adsAccounts: 10, adsRefreshMinutes: 60, commands: 1500,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
  {
    id: 'agencia', code: 'agencia', price: { month: 49, year: 490 }, agents: ['analyst', 'strategist', 'mediaBuyer', 'attribution'], reports: ['advanced', 'custom'], metrics: true,
    adsAccounts: 20, adsRefreshMinutes: 60, commands: 3000,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
];

/** La prueba al registrarse: 14 días del plan Equipo, sin tarjeta; al terminar, Gratis. */
const TRIAL = { days: 14, plan: 'equipo' };

/** Módulos que se suman al plan. El CRM tiene precio variable: desde US$ 9 al mes. */
const ADDONS = {
  crm: { priceFrom: 9, pricing: 'variable' },
};

/* La tabla del módulo CRM (precio y espera por proveedor) se retiró el 16-sep
   con su calculadora: la página deja de anunciar ese precio mientras el CRM
   está fuera del discurso. El motor lo sigue cotizando en
   `GET /v1/public/crm-quote`, y los números vivos están en
   `docs/crm-precios.json` para cuando vuelva. */

/**
 * Paquete de preguntas de pago único: se suma al cupo del MES EN CURSO (no es
 * mensual). En el motor es el add-on de pago único de Stripe; no está en
 * `ADDONS` porque el catálogo público solo publica módulos recurrentes.
 */
const COMMAND_PACK = { commands: 500, price: 8 };

const PRICING_CONFIG = {
  annualMonths: 10,           // anual = 10 meses: 2 gratis
  signup: '/app/',
  // Más cuentas que el plan mayor: sin formulario. No hay número de WhatsApp de ventas publicado; correo del sitio.
  contact: 'mailto:hola@comando.pro?subject=M%C3%A1s%20cuentas%20publicitarias',
};

/* Las palabras, por idioma. Los números entran por función para que cada idioma los
   formatee y los pluralice a su manera. */
const PRICING_TEXT = {
  es: {
    billing: 'Facturación', monthly: 'Mensual', annual: 'Anual', freeMonths: '2 meses gratis',
    perMonth: '/mes', perYear: (a) => `${a} al año`, recommended: 'Recomendado', soon: 'Próximamente',
    trial: () => 'Empiezas gratis, sin tarjeta',
    pack: (n, p) => `¿Te quedaste sin preguntas? Suma ${n} por ${p} para este mes.`,
    more: (n) => `¿Más de ${n} cuentas publicitarias?`, talk: 'Habla con nosotros',
    caps: { analyst: 'Agente Analista', strategist: 'Agente Estratega', mediaBuyer: 'Agente Media Buyer', mediaBuyerLimited: 'Agente Media Buyer', mediaBuyerNote: (n) => `${n} cambios al mes`, attribution: 'Agente de Atribución (CRM)', metrics: 'Métricas & KPIs', metricsBasic: 'básicas', reports: { advanced: 'Reportes Avanzados', custom: 'Reportes Personalizados' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 cuenta publicitaria' : `${f(n)} cuentas publicitarias`),
      refresh: (min) => (min >= 1440 ? 'Datos 1 vez al día' : 'Datos cada hora'),
      questions: (n, f) => `${f(n)} preguntas al mes`,
      questionsOnce: (n, d, f) => `${f(n)} preguntas para empezar (${d} días)`,
    },
    plans: {
      gratis: { name: 'Gratis', result: 'Pregúntale a tus anuncios', cta: 'Empezar gratis' },
      analista: { name: 'Starter', result: 'Te dice qué revisar primero', cta: 'Elegir Starter' },
      equipo: { name: 'Growth', result: 'Pausa y mueve presupuesto con tu CONFIRMAR', cta: 'Elegir Growth' },
      agencia: { name: 'Scale', result: 'Tus ventas del CRM, cruzadas con Meta', cta: 'Elegir Scale' },
    },
  },
  en: {
    billing: 'Billing', monthly: 'Monthly', annual: 'Annual', freeMonths: '2 months free',
    perMonth: '/mo', perYear: (a) => `${a} a year`, recommended: 'Recommended', soon: 'Coming soon',
    trial: () => 'You start free, no card',
    pack: (n, p) => `Out of questions? Add ${n} for ${p} this month.`,
    more: (n) => `More than ${n} ad accounts?`, talk: 'Talk to us',
    caps: { analyst: 'Analyst Agent', strategist: 'Strategist Agent', mediaBuyer: 'Media Buyer Agent', mediaBuyerLimited: 'Media Buyer Agent', mediaBuyerNote: (n) => `${n} changes a month`, attribution: 'Attribution Agent (CRM)', metrics: 'Metrics & KPIs', metricsBasic: 'basic', reports: { advanced: 'Advanced Reports', custom: 'Custom Reports' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 ad account' : `${f(n)} ad accounts`),
      refresh: (min) => (min >= 1440 ? 'Data once a day' : 'Data every hour'),
      questions: (n, f) => `${f(n)} questions a month`,
      questionsOnce: (n, d, f) => `${f(n)} questions to start (${d} days)`,
    },
    plans: {
      gratis: { name: 'Free', result: 'Ask your ads', cta: 'Start free' },
      analista: { name: 'Starter', result: 'Tells you what to check first', cta: 'Choose Starter' },
      equipo: { name: 'Growth', result: 'Pauses and moves budget when you CONFIRM', cta: 'Choose Growth' },
      agencia: { name: 'Scale', result: 'Your CRM sales, matched with Meta', cta: 'Choose Scale' },
    },
  },
  pt: {
    billing: 'Cobrança', monthly: 'Mensal', annual: 'Anual', freeMonths: '2 meses grátis',
    perMonth: '/mês', perYear: (a) => `${a} por ano`, recommended: 'Recomendado', soon: 'Em breve',
    trial: () => 'Você começa grátis, sem cartão',
    pack: (n, p) => `Ficou sem perguntas? Some ${n} por ${p} para este mês.`,
    more: (n) => `Mais de ${n} contas de anúncios?`, talk: 'Fale com a gente',
    caps: { analyst: 'Agente Analista', strategist: 'Agente Estrategista', mediaBuyer: 'Agente Comprador de mídia', mediaBuyerLimited: 'Agente Comprador de mídia', mediaBuyerNote: (n) => `${n} alterações por mês`, attribution: 'Agente de Atribuição (CRM)', metrics: 'Métricas e KPIs', metricsBasic: 'básicas', reports: { advanced: 'Relatórios Avançados', custom: 'Relatórios Personalizados' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 conta de anúncios' : `${f(n)} contas de anúncios`),
      refresh: (min) => (min >= 1440 ? 'Dados 1 vez por dia' : 'Dados a cada hora'),
      questions: (n, f) => `${f(n)} perguntas por mês`,
      questionsOnce: (n, d, f) => `${f(n)} perguntas para começar (${d} dias)`,
    },
    plans: {
      gratis: { name: 'Grátis', result: 'Pergunte aos seus anúncios', cta: 'Começar grátis' },
      analista: { name: 'Starter', result: 'Diz o que revisar primeiro', cta: 'Escolher Starter' },
      equipo: { name: 'Growth', result: 'Pausa e move orçamento com o seu CONFIRMAR', cta: 'Escolher Growth' },
      agencia: { name: 'Scale', result: 'Suas vendas do CRM, cruzadas com a Meta', cta: 'Escolher Scale' },
    },
  },
};

(function () {
  // El idioma lo declara la página: /en/ y /pt/ son copias generadas con `lang`.
  const LANG = (document.documentElement.lang || 'es').slice(0, 2);
  const T = PRICING_TEXT[LANG] || PRICING_TEXT.es;
  const DECIMAL = LANG === 'en' ? '.' : ',';
  const GROUP = LANG === 'en' ? ',' : '.';
  const int = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  const money = (usd) => {
    const cents = Math.round(usd * 100);
    const whole = int(Math.floor(cents / 100));
    return 'US$ ' + (cents % 100 ? whole + DECIMAL + String(cents % 100).padStart(2, '0') : whole);
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const state = { annual: false };

  function renderPlan(plan, index) {
    // En negrita lo que el plan suma respecto del anterior.
    const prev = index > 0 ? PLAN_LADDER[index - 1] : null;
    const words = T.plans[plan.id];
    const free = plan.price.month === 0;
    const perMonth = state.annual ? plan.price.year / 12 : plan.price.month;
    const price = free ? money(0) : `${money(perMonth)}<small>${esc(T.perMonth)}</small>`;
    const year = !free && state.annual ? esc(T.perYear(money(plan.price.year))) : '';
    const href = free
      ? `${PRICING_CONFIG.signup}?plan=${plan.code}`
      : `${PRICING_CONFIG.signup}?plan=${plan.code}&interval=${state.annual ? 'annual' : 'monthly'}`;
    return `<article class="plan${plan.featured ? ' star' : ''}" data-plan="${plan.code}">
      ${plan.featured ? `<span class="plan-tag">${esc(T.recommended)}</span>` : ''}
      <h3 class="plan-name">${esc(words.name)}</h3>
      <p class="plan-result">${esc(words.result)}</p>
      <p class="plan-price">${price}</p>
      <p class="plan-year">${year}</p>
      <ul>
        ${plan.agents.map((a) => `<li class="${prev && !prev.agents.includes(a) ? 'is-new' : ''}">${icon('i-check')}<span>${esc(T.caps[a])}${a === 'mediaBuyerLimited' ? `<small class="plan-note">${esc(T.caps.mediaBuyerNote(plan.mediaBuyerChanges))}</small>` : ''}</span></li>`).join('')}
        ${plan.metrics ? `<li>${icon('i-check')}<span>${esc(T.caps.metrics)}${plan.metrics === 'basic' ? `<small class="plan-note">${esc(T.caps.metricsBasic)}</small>` : ''}</span></li>` : ''}
        ${(plan.reports || []).map((r) => `<li>${icon('i-check')}<span>${esc(T.caps.reports[r])}</span></li>`).join('')}
      </ul>
      <p class="plan-limits">${esc(T.limits.accounts(plan.adsAccounts, int))}<br />${esc(T.limits.refresh(plan.adsRefreshMinutes))}<br />${esc(plan.commandsOnceDays ? T.limits.questionsOnce(plan.commands, plan.commandsOnceDays, int) : T.limits.questions(plan.commands, int))}</p>
      <a class="btn btn-dark" href="${href}">${esc(words.cta)}</a>
    </article>`;
  }

  function mountPlans() {
    const root = document.getElementById('pricing-root');
    if (!root) return;
    root.innerHTML = `<div class="pricing-bar">
        <p class="trial-line">${icon('i-check')}${esc(T.trial(TRIAL.days))}</p>
        <div class="billing" role="group" aria-label="${esc(T.billing)}">
          <button type="button" data-annual="0" aria-pressed="${!state.annual}">${esc(T.monthly)}</button>
          <button type="button" data-annual="1" aria-pressed="${state.annual}">${esc(T.annual)}<span>${esc(T.freeMonths)}</span></button>
        </div>
      </div>
      <div class="plans">${PLAN_LADDER.map((plan, i) => renderPlan(plan, i)).join('')}</div>
      <div class="pricing-extras">
        <p>${esc(T.pack(int(COMMAND_PACK.commands), money(COMMAND_PACK.price)))}</p>
        <p>${esc(T.more(int(PLAN_LADDER[PLAN_LADDER.length - 1].adsAccounts)))} <a href="${PRICING_CONFIG.contact}">${esc(T.talk)}</a></p>
      </div>`;
    root.querySelectorAll('.billing button').forEach((button) => button.addEventListener('click', () => {
      state.annual = button.dataset.annual === '1';
      mountPlans();
      root.querySelector(`.billing button[data-annual="${state.annual ? 1 : 0}"]`)?.focus();
    }));
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  mountPlans();
})();

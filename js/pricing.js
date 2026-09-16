/* ============================================================
   pricing.js — Precios de Comando y calculadora del módulo «Conversa con tu CRM».

   Los números viven UNA vez, aquí abajo (PLAN_LADDER, TRIAL, ADDONS y CRM_QUOTE),
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
 * producto y la página lo dice como «Próximamente». Nada se marca `true` si el
 * motor no lo hace hoy. `earlyAccess` = «primero en recibir» lo próximo.
 */
const PLAN_LADDER = [
  {
    id: 'gratis', code: 'free', price: { month: 0, year: 0 },
    adsAccounts: 1, adsRefreshMinutes: 1440, commands: 30,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: 'coming_soon' },
  },
  {
    id: 'analista', code: 'analista', price: { month: 9, year: 90 },
    adsAccounts: 2, adsRefreshMinutes: 60, commands: 300,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: 'coming_soon' },
  },
  {
    id: 'equipo', code: 'equipo', price: { month: 29, year: 290 }, featured: true, earlyAccess: true,
    adsAccounts: 10, adsRefreshMinutes: 60, commands: 1500,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: 'coming_soon' },
  },
  {
    id: 'agencia', code: 'agencia', price: { month: 49, year: 490 }, earlyAccess: true,
    adsAccounts: 20, adsRefreshMinutes: 60, commands: 3000,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: true, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: 'coming_soon' },
  },
];

/** La prueba al registrarse: 14 días del plan Equipo, sin tarjeta; al terminar, Gratis. */
const TRIAL = { days: 14, plan: 'equipo' };

/** Módulos que se suman al plan. El CRM tiene precio variable: desde US$ 9 al mes. */
const ADDONS = {
  crm: { priceFrom: 9, pricing: 'variable' },
};

/**
 * El módulo CRM, con lo único que de verdad cambia: la ESPERA.
 *
 * Había un deslizador de contactos y prometía una precisión que no existe: el
 * precio es US$ 9 en los siete tramos y con los tres CRM —lo confirma el motor
 * en `GET /v1/public/crm-quote`, que cotiza 900 céntimos siempre—, porque con
 * la estrategia 3 el costo real es de centavos y todo queda en el mínimo
 * comercial. Mover el deslizador no movía el número, y la nota insinuaba
 * subidas que no llegan.
 *
 * Lo que sí cambia con el CRM es cuánto tarda en contestarte, y por mucho:
 * Salesforce responde en segundos y una hoja de Google puede tardar minutos.
 * Los minutos salen de `docs/crm-precios.json` (mismo origen que los precios).
 */
const CRM_QUOTE = {
  price: 9,
  maxContacts: 200000,
  providers: {
    hubspot: { waitMinutes: 0.12 },
    salesforce: { waitMinutes: 0.07 },
    sheets: { waitMinutes: 11.25 },
  },
};

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
    trial: (days) => `Empiezas con ${days} días del plan Equipo, sin tarjeta`,
    pack: (n, p) => `¿Te quedaste sin preguntas? Suma ${n} por ${p} para este mes.`,
    more: (n) => `¿Más de ${n} cuentas publicitarias?`, talk: 'Habla con nosotros',
    caps: { team: 'Analista y estratega', voice: 'Notas de voz', soon: 'Comprador de medios y atribución', soonFirst: 'Primero en recibir comprador de medios y atribución' },
    calc: {
      seconds: (n) => (n === 1 ? '1 segundo' : `${n} segundos`),
      minutes: (n) => (n === 1 ? '1 minuto' : `${n} minutos`),
    },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 cuenta publicitaria' : `${f(n)} cuentas publicitarias`),
      refresh: (min) => (min >= 1440 ? 'Datos 1 vez al día' : 'Datos cada hora'),
      questions: (n, f) => `${f(n)} preguntas al mes`,
    },
    plans: {
      gratis: { name: 'Gratis', result: 'Pregúntale a tus anuncios', cta: 'Empezar gratis' },
      analista: { name: 'Analista', result: 'Tu analista y estratega cada día', cta: 'Elegir Analista' },
      equipo: { name: 'Equipo', result: 'Todo tu marketing en un chat', cta: 'Elegir Equipo' },
      agencia: { name: 'Agencia', result: 'Todos tus clientes en un chat', cta: 'Elegir Agencia' },
    },
  },
  en: {
    billing: 'Billing', monthly: 'Monthly', annual: 'Annual', freeMonths: '2 months free',
    perMonth: '/mo', perYear: (a) => `${a} a year`, recommended: 'Recommended', soon: 'Coming soon',
    trial: (days) => `You start with ${days} days of the Team plan, no card`,
    pack: (n, p) => `Out of questions? Add ${n} for ${p} this month.`,
    more: (n) => `More than ${n} ad accounts?`, talk: 'Talk to us',
    caps: { team: 'Analyst and strategist', voice: 'Voice notes', soon: 'Media buyer and attribution', soonFirst: 'First to get media buyer and attribution' },
    calc: {
      seconds: (n) => (n === 1 ? '1 second' : `${n} seconds`),
      minutes: (n) => (n === 1 ? '1 minute' : `${n} minutes`),
    },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 ad account' : `${f(n)} ad accounts`),
      refresh: (min) => (min >= 1440 ? 'Data once a day' : 'Data every hour'),
      questions: (n, f) => `${f(n)} questions a month`,
    },
    plans: {
      gratis: { name: 'Free', result: 'Ask your ads', cta: 'Start free' },
      analista: { name: 'Analyst', result: 'Your analyst and strategist every day', cta: 'Choose Analyst' },
      equipo: { name: 'Team', result: 'All your marketing in one chat', cta: 'Choose Team' },
      agencia: { name: 'Agency', result: 'All your clients in one chat', cta: 'Choose Agency' },
    },
  },
  pt: {
    billing: 'Cobrança', monthly: 'Mensal', annual: 'Anual', freeMonths: '2 meses grátis',
    perMonth: '/mês', perYear: (a) => `${a} por ano`, recommended: 'Recomendado', soon: 'Em breve',
    trial: (days) => `Você começa com ${days} dias do plano Equipe, sem cartão`,
    pack: (n, p) => `Ficou sem perguntas? Some ${n} por ${p} para este mês.`,
    more: (n) => `Mais de ${n} contas de anúncios?`, talk: 'Fale com a gente',
    caps: { team: 'Analista e estrategista', voice: 'Notas de voz', soon: 'Comprador de mídia e atribuição', soonFirst: 'Primeiro a receber comprador de mídia e atribuição' },
    calc: {
      seconds: (n) => (n === 1 ? '1 segundo' : `${n} segundos`),
      minutes: (n) => (n === 1 ? '1 minuto' : `${n} minutos`),
    },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 conta de anúncios' : `${f(n)} contas de anúncios`),
      refresh: (min) => (min >= 1440 ? 'Dados 1 vez por dia' : 'Dados a cada hora'),
      questions: (n, f) => `${f(n)} perguntas por mês`,
    },
    plans: {
      gratis: { name: 'Grátis', result: 'Pergunte aos seus anúncios', cta: 'Começar grátis' },
      analista: { name: 'Analista', result: 'Seu analista e estrategista todo dia', cta: 'Escolher Analista' },
      equipo: { name: 'Equipe', result: 'Todo o seu marketing em um chat', cta: 'Escolher Equipe' },
      agencia: { name: 'Agência', result: 'Todos os seus clientes em um chat', cta: 'Escolher Agência' },
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

  function renderPlan(plan) {
    const words = T.plans[plan.id];
    const free = plan.price.month === 0;
    const perMonth = state.annual ? plan.price.year / 12 : plan.price.month;
    const price = free ? money(0) : `${money(perMonth)}<small>${esc(T.perMonth)}</small>`;
    const year = !free && state.annual ? esc(T.perYear(money(plan.price.year))) : '';
    const soonText = plan.earlyAccess ? T.caps.soonFirst : T.caps.soon;
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
        <li>${icon('i-check')}<span>${esc(T.caps.team)}</span></li>
        <li>${icon('i-check')}<span>${esc(T.caps.voice)}</span></li>
        <li class="soon">${icon('i-clock')}<span>${esc(soonText)}<br /><span class="badge soon">${esc(T.soon)}</span></span></li>
      </ul>
      <p class="plan-limits">${esc(T.limits.accounts(plan.adsAccounts, int))}<br />${esc(T.limits.refresh(plan.adsRefreshMinutes))}<br />${esc(T.limits.questions(plan.commands, int))}</p>
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
      <div class="plans">${PLAN_LADDER.map(renderPlan).join('')}</div>
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

  /* El módulo CRM: precio fijo y, según el CRM, cuánto tarda en contestar. */
  function mountCalc() {
    const calc = document.querySelector('[data-crm-calc]');
    if (!calc) return;
    const select = calc.querySelector('select');
    const out = calc.querySelector('[data-price]');
    const espera = calc.querySelector('[data-wait]');
    calc.querySelectorAll('[data-max-contacts]').forEach((el) => { el.textContent = int(CRM_QUOTE.maxContacts); });
    /* Por debajo del minuto se dice en segundos: «0,1 minutos» no se lee como
       una espera, y es justo el caso de los CRM rápidos. */
    const enPalabras = (minutos) => (minutos < 1
      ? T.calc.seconds(Math.max(1, Math.round(minutos * 60)))
      : T.calc.minutes(Math.round(minutos)));
    const update = () => {
      out.textContent = money(CRM_QUOTE.price);
      const proveedor = CRM_QUOTE.providers[select.value];
      if (espera) espera.textContent = proveedor ? enPalabras(proveedor.waitMinutes) : '';
    };
    select.addEventListener('change', update);
    calc.addEventListener('submit', (event) => event.preventDefault());
    update();
  }

  mountPlans();
  mountCalc();
})();

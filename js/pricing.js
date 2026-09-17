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
 * vez al día), `commands` (comandos al mes). Precios en dólares: `month` y
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
 * CAPACIDADES, un agente más por plan (`agents`). Growth vuelve a US$ 29 (anual
 * 290), el precio del motor, pero el motor sigue dando las mismas capacidades a
 * todos y otros cupos, así que `tooling/plans-check.mjs` (y el flujo diario
 * «Los precios anunciados siguen siendo los que se cobran») queda en rojo hasta
 * que el catálogo se cambie en la consola de administración. Además, la web
 * anuncia reportes por plan (`reports`), que el catálogo del motor no distingue,
 * y ya no nombra las notas de voz.
 * El Media Buyer no anuncia límite de cambios (17-sep): ejecutar un cambio ya
 * decidido no llama a la IA ni descuenta cupo (`OperatorCommandPipeline.confirm`),
 * así que el tope real es el de comandos; los reportes con IA descuentan del
 * mismo cupo.
 * CUPOS (17-sep, tarde): Esencial 100 comandos y Comando Pro 250 (antes 150 y 300).
 *
 * NOMBRES (17-sep): Gratis · Esencial (`analista`) · Comando Pro (`equipo`) · Empresas;
 * antes Starter y Growth. El motor sigue diciendo Analista y Equipo.
 *
 * TRES PLANES + EMPRESAS (17-sep): Scale (`agencia`) deja de publicarse y Growth
 * absorbe lo suyo —Atribución y reportes personalizados— a US$ 29 (anual 290, lo
 * que ya cobra el motor por `equipo`) con 3 cuentas, 300 comandos y 2 usuarios
 * (`users`: personas que le escriben a Comando desde su WhatsApp). En su lugar va la tarjeta «Empresas»
 * (`ENTERPRISE`), sin precio: se cotiza con margen ≥ 55 % en el peor caso.
 * Starter: 2 cuentas y 150 comandos. El motor sigue con los cupos y cuentas del
 * catálogo del 15-sep, un solo usuario por cuenta y `agencia` activo. Gratis incluye Analista y
 * Estratega con 30 comandos al crear la cuenta, válidas 30 días y sin renovación
 * (`commandsOnceDays`); en el motor el cupo de Gratis todavía se renueva cada mes.
 */
const PLAN_LADDER = [
  {
    id: 'gratis', code: 'free', price: { month: 0, year: 0 }, agents: ['analystStrategist'], commandsOnceDays: 30, metrics: 'basic',
    adsAccounts: 1, adsRefreshMinutes: 1440, commands: 30,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: false, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
  {
    id: 'analista', code: 'analista', price: { month: 9, year: 90 }, agents: ['analystStrategist', 'mediaBuyer'], metrics: true,
    adsAccounts: 2, adsRefreshMinutes: 60, commands: 100,
    capabilities: { adsRead: true, adsDiagnosis: true, voice: false, mediaBuyer: 'coming_soon', attribution: 'coming_soon', googleAds: 'coming_soon', tiktokAds: true },
  },
  {
    id: 'equipo', code: 'equipo', price: { month: 29, year: 290 }, featured: true, agents: ['analystStrategist', 'mediaBuyer', 'attribution'], reports: ['advanced'], metrics: true,
    adsAccounts: 3, adsRefreshMinutes: 60, commands: 250, users: 2,
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

/* El paquete de preguntas («+500 por US$ 8») se retiró de la página el 16-sep:
   con los cupos nuevos rompía la escalera (Starter + paquete salía mejor que
   Growth) y dejaba 18 % de margen. El add-on sigue en el motor
   (`extra_commands_500`) hasta que se publiquen los paquetes nuevos. */

/** La cuarta tarjeta: planes a medida para empresas. Sin precio ni cupos publicados. */
const ENTERPRISE = { from: 'equipo' };

const PRICING_CONFIG = {
  annualMonths: 10,           // anual = 10 meses: 2 gratis
  signup: '/app/',
  // Plan Empresas (más que el plan mayor): sin formulario. No hay número de WhatsApp de ventas publicado; correo del sitio.
  contact: 'mailto:hola@comando.pro?subject=Plan%20personalizado',
};

/* Las palabras, por idioma. Los números entran por función para que cada idioma los
   formatee y los pluralice a su manera. */
const PRICING_TEXT = {
  es: {
    billing: 'Facturación', monthly: 'Mensual', annual: 'Anual', freeMonths: '2 meses gratis',
    perMonth: '/mes', perYear: (a) => `${a} al año`, recommended: 'Recomendado', soon: 'Próximamente',
    trial: () => 'Empiezas gratis, sin tarjeta',
    talk: 'Habla con nosotros',
    enterprise: { name: 'Empresas', result: 'A la medida de tu operación', items: (plan, n) => [`Todo lo de ${plan}`, `Más de ${n} cuentas publicitarias`, 'Comandos y usuarios a medida', 'Reportes Personalizados', 'Soporte prioritario'], limits: 'Precio según cuentas y uso' },
    caps: { analystStrategist: 'Agentes Analista y Estratega', mediaBuyer: 'Agente Media Buyer', attribution: 'Agente de Atribución (CRM)', metrics: 'Métricas & KPIs', metricsBasic: 'básicas', metricsTipLabel: '¿Cada cuánto se actualizan los datos?', metricsTip: (min) => (min >= 1440 ? 'Los datos de Meta se sincronizan 1 vez al día.' : 'Los datos de Meta se sincronizan cada hora.'), reports: { advanced: 'Reportes Avanzados', custom: 'Reportes Personalizados' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 cuenta publicitaria' : `${f(n)} cuentas publicitarias`),
      questions: (n, f) => `${f(n)} comandos al mes`,
      questionsOnce: (n, d, f) => `${f(n)} comandos para empezar`,
    },
    plans: {
      gratis: { name: 'Gratis', result: 'Pregúntale a tus anuncios', cta: 'Empezar gratis' },
      analista: { name: 'Esencial', result: 'Te dice qué revisar primero', cta: 'Elegir Esencial' },
      equipo: { name: 'Comando Pro', result: 'Pausa y mueve presupuesto', cta: 'Elegir Comando Pro' },
    },
  },
  en: {
    billing: 'Billing', monthly: 'Monthly', annual: 'Annual', freeMonths: '2 months free',
    perMonth: '/mo', perYear: (a) => `${a} a year`, recommended: 'Recommended', soon: 'Coming soon',
    trial: () => 'You start free, no card',
    talk: 'Talk to us',
    enterprise: { name: 'Enterprise', result: 'Built around your operation', items: (plan, n) => [`Everything in ${plan}`, `More than ${n} ad accounts`, 'Commands and users to fit', 'Custom Reports', 'Priority support'], limits: 'Priced by accounts and usage' },
    caps: { analystStrategist: 'Analyst & Strategist Agents', mediaBuyer: 'Media Buyer Agent', attribution: 'Attribution Agent (CRM)', metrics: 'Metrics & KPIs', metricsBasic: 'basic', metricsTipLabel: 'How often is the data updated?', metricsTip: (min) => (min >= 1440 ? 'Meta data syncs once a day.' : 'Meta data syncs every hour.'), reports: { advanced: 'Advanced Reports', custom: 'Custom Reports' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 ad account' : `${f(n)} ad accounts`),
      questions: (n, f) => `${f(n)} commands a month`,
      questionsOnce: (n, d, f) => `${f(n)} commands to start`,
    },
    plans: {
      gratis: { name: 'Free', result: 'Ask your ads', cta: 'Start free' },
      analista: { name: 'Essential', result: 'Tells you what to check first', cta: 'Choose Essential' },
      equipo: { name: 'Comando Pro', result: 'Pauses and moves budget', cta: 'Choose Comando Pro' },
    },
  },
  pt: {
    billing: 'Cobrança', monthly: 'Mensal', annual: 'Anual', freeMonths: '2 meses grátis',
    perMonth: '/mês', perYear: (a) => `${a} por ano`, recommended: 'Recomendado', soon: 'Em breve',
    trial: () => 'Você começa grátis, sem cartão',
    talk: 'Fale com a gente',
    enterprise: { name: 'Empresas', result: 'Sob medida para a sua operação', items: (plan, n) => [`Tudo do ${plan}`, `Mais de ${n} contas de anúncios`, 'Comandos e usuários sob medida', 'Relatórios Personalizados', 'Suporte prioritário'], limits: 'Preço conforme contas e uso' },
    caps: { analystStrategist: 'Agentes Analista e Estrategista', mediaBuyer: 'Agente Comprador de mídia', attribution: 'Agente de Atribuição (CRM)', metrics: 'Métricas e KPIs', metricsBasic: 'básicas', metricsTipLabel: 'Com que frequência os dados são atualizados?', metricsTip: (min) => (min >= 1440 ? 'Os dados da Meta são sincronizados 1 vez por dia.' : 'Os dados da Meta são sincronizados a cada hora.'), reports: { advanced: 'Relatórios Avançados', custom: 'Relatórios Personalizados' } },
    limits: {
      accounts: (n, f) => (n === 1 ? '1 conta de anúncios' : `${f(n)} contas de anúncios`),
      questions: (n, f) => `${f(n)} comandos por mês`,
      questionsOnce: (n, d, f) => `${f(n)} comandos para começar`,
    },
    plans: {
      gratis: { name: 'Grátis', result: 'Pergunte aos seus anúncios', cta: 'Começar grátis' },
      analista: { name: 'Essencial', result: 'Diz o que revisar primeiro', cta: 'Escolher Essencial' },
      equipo: { name: 'Comando Pro', result: 'Pausa e move orçamento', cta: 'Escolher Comando Pro' },
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
        ${plan.agents.map((a) => `<li class="${prev && !prev.agents.includes(a) ? 'is-new' : ''}">${icon('i-check')}<span>${esc(T.caps[a])}</span></li>`).join('')}
        ${plan.metrics ? `<li>${icon('i-check')}<span>${esc(T.caps.metrics)}<span class="plan-tip"><button type="button" aria-label="${esc(T.caps.metricsTipLabel)}" aria-describedby="tip-metrics-${plan.code}">?</button><span class="plan-tip-text" role="tooltip" id="tip-metrics-${plan.code}">${esc(T.caps.metricsTip(plan.adsRefreshMinutes))}</span></span>${plan.metrics === 'basic' ? `<small class="plan-note">${esc(T.caps.metricsBasic)}</small>` : ''}</span></li>` : ''}
        ${(plan.reports || []).map((r) => `<li>${icon('i-check')}<span>${esc(T.caps.reports[r])}</span></li>`).join('')}
      </ul>
      <p class="plan-limits">${esc(T.limits.accounts(plan.adsAccounts, int))}<br />${esc(plan.commandsOnceDays ? T.limits.questionsOnce(plan.commands, plan.commandsOnceDays, int) : T.limits.questions(plan.commands, int))}</p>
      <a class="btn btn-dark" href="${href}">${esc(words.cta)}</a>
    </article>`;
  }

  function renderEnterprise() {
    const base = PLAN_LADDER.find((p) => p.id === ENTERPRISE.from);
    const words = T.enterprise;
    return `<article class="plan plan-enterprise" data-plan="enterprise">
      <h3 class="plan-name">${esc(words.name)}</h3>
      <p class="plan-result">${esc(words.result)}</p>
      <ul>
        ${words.items(T.plans[base.id].name, int(base.adsAccounts)).map((item) => `<li>${icon('i-check')}<span>${esc(item)}</span></li>`).join('')}
      </ul>
      <p class="plan-limits">${esc(words.limits)}</p>
      <a class="btn btn-dark" href="${PRICING_CONFIG.contact}">${esc(T.talk)}</a>
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
      <div class="plans">${PLAN_LADDER.map((plan, i) => renderPlan(plan, i)).join('')}${renderEnterprise()}</div>`;
    root.querySelectorAll('.billing button').forEach((button) => button.addEventListener('click', () => {
      state.annual = button.dataset.annual === '1';
      mountPlans();
      root.querySelector(`.billing button[data-annual="${state.annual ? 1 : 0}"]`)?.focus();
    }));
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  mountPlans();
})();

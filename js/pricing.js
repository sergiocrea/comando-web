/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, comparativa, FAQ y textos) vive
   en PRICING_CONFIG. El markup se genera desde aquí.

   Los tres idiomas: PRICING_CONFIG es el castellano y PRICING_I18N trae lo que
   cambia en inglés y portugués. Lo que NO cambia son los números: un plan de
   US$ 29 con 50 000 registros es el mismo plan en los tres, y tenerlo escrito
   una sola vez es lo que impide que un precio se quede viejo en un idioma.

   Y por qué los números están escritos y no se piden al motor: ver
   `tooling/plans-check.mjs`. En resumen: una página de precios que espera a la
   red puede salir vacía, y salir vacía es peor que salir desactualizada. Lo que
   sí hay es UNA copia de cada número —PLAN_LADDER, TRIAL y ADDONS, aquí abajo—
   y una comprobación que grita cuando deja de coincidir con lo que se cobra.

   Jerarquía de cada tarjeta: RESULTADO (la promesa del plan) → CAPACIDADES (lo
   que Comando puede hacer por ti) → LÍMITES (en pequeño, al pie). Los límites
   importan, pero no son lo que se compra.
   ============================================================ */

/**
 * La escalera de planes: la única copia de cada número en todo el archivo.
 *
 * `code` es el código del plan en el motor: es lo que permite a
 * `tooling/plans-check.mjs` comparar esto con `/v1/public/plans`. Los nombres de
 * los campos siguen a los del catálogo público (`limits.*`, `capabilities.*`).
 *
 * `null` en un límite = sin límite. En las capacidades: `true` incluido,
 * `'limited'` incluido con tope, `false` no incluido, `'soon'` todavía no existe
 * en el producto y la página lo dice como «Próximamente». Nada se marca `true`
 * si el motor no lo hace hoy.
 */
const PLAN_LADDER = [
  {
    id: 'gratis', code: 'free', price: 0,
    mirrorRecords: 1000, commands: 30, crmAccounts: 1, adsAccounts: 1, bulkMaxRecords: 10,
    capabilities: { crmWrites: 'limited', undo: true, reports: true, approvals: true, automations: false, agent: false, dailyBriefing: false, adsRead: true, adsDiagnosis: false, adsExecution: 'soon', googleAds: 'soon', tiktokAds: 'soon' },
  },
  {
    id: 'asistente', code: 'asistente', price: 9,
    mirrorRecords: 10000, commands: 300, crmAccounts: 1, adsAccounts: 1, bulkMaxRecords: 100,
    capabilities: { crmWrites: true, undo: true, reports: true, approvals: true, automations: false, agent: false, dailyBriefing: false, adsRead: true, adsDiagnosis: false, adsExecution: 'soon', googleAds: 'soon', tiktokAds: 'soon' },
  },
  {
    id: 'operador', code: 'operador', price: 29, featured: true,
    mirrorRecords: 50000, commands: 1500, crmAccounts: 2, adsAccounts: 3, bulkMaxRecords: null,
    capabilities: { crmWrites: true, undo: true, reports: true, approvals: true, automations: true, agent: true, dailyBriefing: true, adsRead: true, adsDiagnosis: true, adsExecution: 'soon', googleAds: 'soon', tiktokAds: 'soon' },
  },
  {
    id: 'escala', code: 'escala', price: 79,
    mirrorRecords: 200000, commands: 5000, crmAccounts: null, adsAccounts: null, bulkMaxRecords: null,
    capabilities: { crmWrites: true, undo: true, reports: true, approvals: true, automations: true, agent: true, dailyBriefing: true, adsRead: true, adsDiagnosis: true, adsExecution: 'soon', googleAds: 'soon', tiktokAds: 'soon' },
  },
];

/** La prueba al registrarse: todas las cuentas empiezan con Operador. */
const TRIAL = { days: 14, plan: 'operador' };

/** Los paquetes que se suman sin cambiar de plan. Un pago único para el mes en curso. */
const ADDONS = {
  commands: { amount: 500, price: 8 },
};

const PRICING_CONFIG = {
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  cta: { trialBase: '/app/', trialLabel: 'Elegir plan', freeLabel: 'Empezar gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Habla con ventas' },
  title: '', // sin titular: PRECIOS y esta línea bastan
  subtitle: 'Pagas por el trabajo que Comando hace por tu equipo. Todas las cuentas empiezan con {trial.dias} días de Operador, sin tarjeta.',
  // Lo que es presentación; los números salen de PLAN_LADDER por `id`.
  plans: [
    {
      id: 'gratis', name: 'Gratis', promise: 'Pregúntale a tu CRM',
      caps: [
        'Preguntas y reportes sobre tu CRM',
        'Cambios en tu CRM con vista previa y CONFIRMAR, hasta {gratis.masivo} registros por vez',
        'Deshacer y aprobaciones',
        'Gasto y resultados de tu cuenta de Meta Ads',
      ],
      note: 'Empiezas con {trial.dias} días de Operador. Después sigues aquí, sin tarjeta.',
    },
    {
      id: 'asistente', name: 'Asistente', promise: 'Ejecuta el trabajo por ti', intro: 'Todo lo de Gratis, más:',
      caps: [
        'Cambios de hasta {asistente.masivo} registros a la vez',
        'Tu cartera completa al día, hasta {asistente.registros} registros',
      ],
    },
    {
      id: 'operador', name: 'Operador', promise: 'Vigila y actúa', intro: 'Todo lo de Asistente, más:',
      caps: [
        'Un agente que vigila tu CRM y te avisa',
        'Resumen del día por WhatsApp',
        'Reglas que actúan solas en tu CRM',
        'Diagnóstico de tus campañas de Meta Ads',
        'Cambios masivos con aprobación',
      ],
    },
    {
      id: 'escala', name: 'Escala', promise: 'Opera a todo el equipo', intro: 'Todo lo de Operador, más:',
      caps: [
        'CRM y cuentas de Meta Ads sin límite',
        'Hasta {escala.registros} registros al día',
        '{escala.comandos} comandos al mes para todo el equipo',
      ],
    },
  ],
  soonLine: 'Próximamente, en todos los planes: pausar campañas y ajustar presupuestos de Meta Ads, y Google Ads y TikTok Ads.',
  enterpriseLine: '¿Más de {escala.registros} registros, varios equipos o soporte dedicado?',
  commandNote: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio. Las confirmaciones y las respuestas no cuentan.',
  addons: [
    { id: 'commands', label: '+{addon.comandos} comandos' },
  ],
  addonsIntro: '¿Te quedas corto? Suma un paquete sin cambiar de plan, para el mes en curso:',
  overageNote: 'Te avisamos al 80 % y al 100 % de tus comandos. En los planes de pago el servicio no se corta.',
  faq: [
    { q: '¿Qué incluyen los {trial.dias} días de Operador?', a: 'Al crear tu cuenta tienes Operador completo durante {trial.dias} días, sin tarjeta: el agente que vigila tu CRM, el resumen del día, las reglas y el diagnóstico de Meta Ads. Al terminar sigues en Gratis, con {gratis.registros} registros y {gratis.comandos} comandos al mes, o eliges un plan. Tu cuenta y tus conexiones se quedan como estaban.' },
    { q: '¿Qué cuenta como comando y qué pasa si me paso?', a: 'Un comando es cada pedido que le haces a Comando por WhatsApp, por texto o por audio: un audio cuenta como un comando. Las confirmaciones («sí», «ok») y las respuestas de Comando no cuentan. Te avisamos al 80 % y al 100 %. En los planes de pago no cortamos el servicio: puedes sumar {addon.comandos} comandos por {addon.comandosPrecio} o subir de plan. En Gratis, al llegar al límite esperas al mes siguiente o eliges un plan.' },
    { q: '¿Qué son los registros al día?', a: 'Son los contactos y registros de tu CRM que Comando mantiene listos para responderte al instante y para vigilar. Si tu CRM tiene más de los que incluye tu plan, no se borra nada ni se toca nada en tu CRM: te avisamos y decides si subir de plan.' },
    { q: '¿Comando cambia mis campañas de Meta Ads?', a: 'Hoy no. Comando lee tus campañas de Meta Ads —gasto, resultados, costo por resultado, ROAS y alcance— y desde Operador te dice por qué rinden así y qué revisar. Pausar campañas y ajustar presupuestos desde Comando llega pronto, igual que Google Ads y TikTok Ads.' },
    { q: '¿Puedo deshacer lo que hizo Comando?', a: 'Sí, en un mensaje: los cambios de etapa, dueño, campos, importe, descuento y etiquetas se revierten con «deshacer». Las notas, los registros nuevos y los mensajes ya enviados no se pueden deshacer, y por eso Comando te los enseña antes de confirmar.' },
    { q: '¿Cada cuánto se actualiza mi CRM en Comando?', a: 'Cuando tu CRM avisa de los cambios, llegan en el momento. Cuando no avisa, Comando revisa los cambios varias veces al día y se pone al día cuando le preguntas. Si un dato es demasiado viejo para responder, te lo dice antes de contestar.' },
  ],
};

/* Lo que cambia con el idioma: los textos. Los números, los ids de plan y los
   enlaces viven arriba, una sola vez. */
const PRICING_I18N = {
  en: {
    words: {
      eyebrow: 'PRICING', priceOptions: 'Price options', billing: 'Billing',
      monthly: 'Monthly', annual: 'Annual', freeMonths: (n) => `${n} months free`,
      perMonth: '/mo', perYear: (amount) => `${amount} a year`, off: (p) => `${p} % off`,
      recommended: 'Recommended', unlimited: 'Unlimited',
      limits: { mirrorRecords: 'Records kept current', crmAccounts: 'Connected CRMs', adsAccounts: 'Meta Ads accounts', commands: 'Commands a month' },
      limitsLabel: 'Plan limits',
      whatIsACommand: 'What is a command?',
      moreInfo: 'More about commands, packs and enterprise',
      pricingDetails: 'Pricing details', faqTitle: 'Frequently asked questions',
      formInvalid: 'Write your email or your WhatsApp so we can reply.',
      formSubmit: 'Send',
      formSending: 'Sending…',
      formSaved: 'Done, we have your details. Tell us which CRM you use and we will let you know first.',
    },
    cta: { trialLabel: 'Choose plan', freeLabel: 'Start free', enterpriseLabel: 'Talk to sales' },
    title: '',
    subtitle: 'You pay for the work Comando does for your team. Every account starts with {trial.dias} days of Operator, no card.',
    plans: {
      gratis: {
        name: 'Free', promise: 'Ask your CRM',
        caps: [
          'Questions and reports on your CRM',
          'Changes to your CRM with a preview and CONFIRM, up to {gratis.masivo} records at a time',
          'Undo and approvals',
          'Spend and results from your Meta Ads account',
        ],
        note: 'You start with {trial.dias} days of Operator. Then you stay here, no card.',
      },
      asistente: {
        name: 'Assistant', promise: 'Does the work for you', intro: 'Everything in Free, plus:',
        caps: ['Changes to up to {asistente.masivo} records at once', 'Your whole book of business kept current, up to {asistente.registros} records'],
      },
      operador: {
        name: 'Operator', promise: 'Watches and acts', intro: 'Everything in Assistant, plus:',
        caps: ['An agent that watches your CRM and tells you', 'Daily summary on WhatsApp', 'Rules that act on their own in your CRM', 'Diagnosis of your Meta Ads campaigns', 'Bulk changes with approval'],
      },
      escala: {
        name: 'Scale', promise: 'Runs the whole team', intro: 'Everything in Operator, plus:',
        caps: ['Unlimited CRMs and Meta Ads accounts', 'Up to {escala.registros} records kept current', '{escala.comandos} commands a month for the whole team'],
      },
    },
    soonLine: 'Coming soon, on every plan: pausing campaigns and adjusting Meta Ads budgets, plus Google Ads and TikTok Ads.',
    enterpriseLine: 'More than {escala.registros} records, several teams or dedicated support?',
    commandNote: 'A command is every request you make to Comando on WhatsApp, by text or by voice. Confirmations and replies do not count.',
    addonLabels: { commands: '+{addon.comandos} commands' },
    addonsIntro: 'Running short? Add a pack without changing plan, for the current month:',
    overageNote: 'We tell you at 80 % and at 100 % of your commands. On paid plans the service is never cut.',
    faq: [
      { q: 'What do the {trial.dias} days of Operator include?', a: 'When you create your account you get the full Operator plan for {trial.dias} days, no card: the agent that watches your CRM, the daily summary, rules and the Meta Ads diagnosis. When it ends you stay on Free, with {gratis.registros} records and {gratis.comandos} commands a month, or you pick a plan. Your account and your connections stay as they were.' },
      { q: 'What counts as a command and what happens if I go over?', a: 'A command is every request you make to Comando on WhatsApp, by text or by voice: a voice note counts as one command. Confirmations ("yes", "ok") and Comando\'s replies do not count. We tell you at 80 % and at 100 %. On paid plans we never cut the service: you can add {addon.comandos} commands for {addon.comandosPrecio} or move up a plan. On Free, when you reach the limit you wait for next month or pick a plan.' },
      { q: 'What are records kept current?', a: 'They are the contacts and records from your CRM that Comando keeps ready to answer you instantly and to watch. If your CRM has more than your plan includes, nothing is deleted and nothing changes in your CRM: we tell you and you decide whether to move up a plan.' },
      { q: 'Does Comando change my Meta Ads campaigns?', a: 'Not today. Comando reads your Meta Ads campaigns —spend, results, cost per result, ROAS and reach— and from Operator it tells you why they perform that way and what to check. Pausing campaigns and adjusting budgets from Comando is coming soon, as are Google Ads and TikTok Ads.' },
      { q: 'Can I undo what Comando did?', a: 'Yes, with one message: changes to stage, owner, fields, amount, discount and tags are reverted with "undo". Notes, new records and messages already sent cannot be undone, which is why Comando shows them to you before you confirm.' },
      { q: 'How often is my CRM refreshed in Comando?', a: 'When your CRM reports its changes, they arrive right away. When it does not, Comando checks for changes several times a day and catches up when you ask. If a figure is too old to answer with, it tells you before replying.' },
    ],
  },
  pt: {
    words: {
      eyebrow: 'PREÇO', priceOptions: 'Opções de preço', billing: 'Cobrança',
      monthly: 'Mensal', annual: 'Anual', freeMonths: (n) => `${n} meses grátis`,
      perMonth: '/mês', perYear: (amount) => `${amount} por ano`, off: (p) => `${p} % de desconto`,
      recommended: 'Recomendado', unlimited: 'Sem limite',
      limits: { mirrorRecords: 'Registros em dia', crmAccounts: 'CRMs conectados', adsAccounts: 'Contas de Meta Ads', commands: 'Comandos por mês' },
      limitsLabel: 'Limites do plano',
      whatIsACommand: 'O que é um comando?',
      moreInfo: 'Mais sobre comandos, pacotes e enterprise',
      pricingDetails: 'Detalhes de preços', faqTitle: 'Perguntas frequentes',
      formInvalid: 'Escreva seu e-mail ou seu WhatsApp para a gente responder.',
      formSubmit: 'Enviar',
      formSending: 'Enviando…',
      formSaved: 'Pronto, já temos seus dados. Diga qual é o seu CRM e a gente avisa você primeiro.',
    },
    cta: { trialLabel: 'Escolher plano', freeLabel: 'Começar grátis', enterpriseLabel: 'Falar com vendas' },
    title: '',
    subtitle: 'Você paga pelo trabalho que o Comando faz pelo seu time. Toda conta começa com {trial.dias} dias de Operador, sem cartão.',
    plans: {
      gratis: {
        name: 'Grátis', promise: 'Pergunte ao seu CRM',
        caps: [
          'Perguntas e relatórios sobre seu CRM',
          'Mudanças no seu CRM com prévia e CONFIRMAR, até {gratis.masivo} registros por vez',
          'Desfazer e aprovações',
          'Investimento e resultados da sua conta de Meta Ads',
        ],
        note: 'Você começa com {trial.dias} dias de Operador. Depois continua aqui, sem cartão.',
      },
      asistente: {
        name: 'Assistente', promise: 'Faz o trabalho por você', intro: 'Tudo do Grátis, mais:',
        caps: ['Mudanças em até {asistente.masivo} registros de uma vez', 'Sua carteira inteira em dia, até {asistente.registros} registros'],
      },
      operador: {
        name: 'Operador', promise: 'Vigia e age', intro: 'Tudo do Assistente, mais:',
        caps: ['Um agente que vigia seu CRM e te avisa', 'Resumo do dia pelo WhatsApp', 'Regras que agem sozinhas no seu CRM', 'Diagnóstico das suas campanhas de Meta Ads', 'Mudanças em massa com aprovação'],
      },
      escala: {
        name: 'Escala', promise: 'Opera o time inteiro', intro: 'Tudo do Operador, mais:',
        caps: ['CRMs e contas de Meta Ads sem limite', 'Até {escala.registros} registros em dia', '{escala.comandos} comandos por mês para o time todo'],
      },
    },
    soonLine: 'Em breve, em todos os planos: pausar campanhas e ajustar orçamentos de Meta Ads, além de Google Ads e TikTok Ads.',
    enterpriseLine: 'Mais de {escala.registros} registros, vários times ou suporte dedicado?',
    commandNote: 'Um comando é cada pedido que você faz ao Comando pelo WhatsApp, por texto ou por áudio. As confirmações e as respostas não contam.',
    addonLabels: { commands: '+{addon.comandos} comandos' },
    addonsIntro: 'Ficou curto? Some um pacote sem trocar de plano, para o mês em curso:',
    overageNote: 'A gente avisa a 80 % e a 100 % dos seus comandos. Nos planos pagos o serviço não é cortado.',
    faq: [
      { q: 'O que incluem os {trial.dias} dias de Operador?', a: 'Ao criar sua conta você tem o Operador completo por {trial.dias} dias, sem cartão: o agente que vigia seu CRM, o resumo do dia, as regras e o diagnóstico de Meta Ads. Ao terminar você continua no Grátis, com {gratis.registros} registros e {gratis.comandos} comandos por mês, ou escolhe um plano. Sua conta e suas conexões ficam como estavam.' },
      { q: 'O que conta como comando e o que acontece se eu passar?', a: 'Um comando é cada pedido que você faz ao Comando pelo WhatsApp, por texto ou por áudio: um áudio conta como um comando. As confirmações («sim», «ok») e as respostas do Comando não contam. A gente avisa a 80 % e a 100 %. Nos planos pagos não cortamos o serviço: você pode somar {addon.comandos} comandos por {addon.comandosPrecio} ou subir de plano. No Grátis, ao chegar ao limite você espera o mês seguinte ou escolhe um plano.' },
      { q: 'O que são os registros em dia?', a: 'São os contatos e registros do seu CRM que o Comando mantém prontos para te responder na hora e para vigiar. Se o seu CRM tiver mais do que o plano inclui, nada é apagado e nada muda no seu CRM: a gente avisa e você decide se sobe de plano.' },
      { q: 'O Comando muda minhas campanhas de Meta Ads?', a: 'Hoje não. O Comando lê suas campanhas de Meta Ads —investimento, resultados, custo por resultado, ROAS e alcance— e a partir do Operador te diz por que rendem assim e o que revisar. Pausar campanhas e ajustar orçamentos pelo Comando chega em breve, assim como Google Ads e TikTok Ads.' },
      { q: 'Posso desfazer o que o Comando fez?', a: 'Sim, com uma mensagem: mudanças de etapa, responsável, campos, valor, desconto e etiquetas se revertem com «desfazer». Notas, registros novos e mensagens já enviadas não podem ser desfeitos, e por isso o Comando mostra tudo antes de você confirmar.' },
      { q: 'De quanto em quanto tempo meu CRM é atualizado no Comando?', a: 'Quando seu CRM avisa das mudanças, elas chegam na hora. Quando não avisa, o Comando verifica as mudanças várias vezes ao dia e se atualiza quando você pergunta. Se um dado estiver velho demais para responder, ele avisa antes de responder.' },
    ],
  },
};

(function () {
  // El idioma lo declara la página: /en/ y /pt/ son copias generadas con
  // `lang` puesto, así que el mismo fichero sirve a las tres sin preguntar
  // nada al navegador ni parpadear en castellano antes de traducirse.
  const LANG = (document.documentElement.lang || 'es').slice(0, 2);
  const L = PRICING_I18N[LANG];
  const W = L ? L.words : {
    eyebrow: 'PRECIO', priceOptions: 'Opciones de precio', billing: 'Facturación',
    monthly: 'Mensual', annual: 'Anual', freeMonths: (n) => `${n} meses gratis`,
    perMonth: '/mes', perYear: (amount) => `${amount} al año`, off: (p) => `${p} % de descuento`,
    recommended: 'Recomendado', unlimited: 'Sin límite',
    limits: { mirrorRecords: 'Registros al día', crmAccounts: 'CRM conectados', adsAccounts: 'Cuentas de Meta Ads', commands: 'Comandos al mes' },
    limitsLabel: 'Límites del plan',
    whatIsACommand: '¿Qué es un comando?',
    moreInfo: 'Más sobre comandos, paquetes y enterprise',
    pricingDetails: 'Detalles de precios', faqTitle: 'Preguntas frecuentes',
    formInvalid: 'Escribe tu correo o tu WhatsApp para poder responderte.',
    formSubmit: 'Enviar',
    formSending: 'Enviando…',
    formSaved: 'Listo, ya tenemos tus datos. Dinos cuál es tu CRM y te avisamos primero.',
  };
  const state = { annual: false };
  const NUMBERS = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' }[LANG] ?? 'es-PE';
  // Separador de miles: espacio que no se parte, o «10 000» se rompía en dos líneas.
  const fmtN = (n) => n.toLocaleString(NUMBERS).replace(/[,.\s]/g, ' ');
  function money(usd) { if (usd == null) return null; const v = Number.isInteger(usd) ? usd : Math.round(usd * 100) / 100; return 'US$ ' + v.toLocaleString(NUMBERS); }
  function monthly(p) { if (p == null) return null; return state.annual ? p * (12 - C.billing.annualFreeMonths) / 12 : p; }
  const limit = (n) => (n == null ? W.unlimited : fmtN(n));

  /**
   * Las marcas `{plan.campo}` de los textos, resueltas contra PLAN_LADDER.
   *
   * Se resuelven aquí y no al escribirlas porque el número también se formatea
   * según el idioma: la misma frase dice «50 000» y «50,000» sin que nadie
   * tenga que acordarse de las dos.
   */
  const TOKENS = (() => {
    const map = {};
    for (const plan of PLAN_LADDER) {
      map[plan.id + '.comandos'] = fmtN(plan.commands);
      map[plan.id + '.registros'] = limit(plan.mirrorRecords);
      map[plan.id + '.crm'] = limit(plan.crmAccounts);
      map[plan.id + '.ads'] = limit(plan.adsAccounts);
      map[plan.id + '.masivo'] = limit(plan.bulkMaxRecords);
      map[plan.id + '.precio'] = money(plan.price);
    }
    map['trial.dias'] = fmtN(TRIAL.days);
    map['addon.comandos'] = fmtN(ADDONS.commands.amount);
    map['addon.comandosPrecio'] = money(ADDONS.commands.price);
    return map;
  })();
  /* Una marca sin valor se queda escrita tal cual en la página. Es feo a
     propósito: un hueco vacío pasa desapercibido y una frase a la que le falta
     el número se lee como si el plan no tuviera límite. */
  const fill = (value) => {
    if (typeof value === 'string') return value.replace(/\{([a-z]+\.[a-zA-Z]+)\}/g, (whole, key) => TOKENS[key] ?? whole);
    if (Array.isArray(value)) return value.map(fill);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === 'function' ? v : fill(v)]));
    return value;
  };

  // Los números y los enlaces son los mismos en los tres idiomas; solo las
  // palabras cambian. Así un precio nuevo no puede quedarse viejo en un idioma.
  const LADDER = Object.fromEntries(PLAN_LADDER.map((plan) => [plan.id, plan]));
  const BASE = {
    ...PRICING_CONFIG,
    plans: PRICING_CONFIG.plans.map((plan) => ({ ...LADDER[plan.id], ...plan })),
    addons: PRICING_CONFIG.addons.map((addon) => ({ ...addon, price: ADDONS[addon.id].price })),
  };
  const C = fill(L
    ? {
        ...BASE,
        cta: { ...BASE.cta, ...L.cta },
        title: L.title,
        subtitle: L.subtitle,
        plans: BASE.plans.map((plan) => ({ ...plan, ...(L.plans[plan.id] || {}) })),
        soonLine: L.soonLine,
        enterpriseLine: L.enterpriseLine,
        commandNote: L.commandNote,
        addons: BASE.addons.map((addon) => ({ ...addon, label: L.addonLabels[addon.id] ?? addon.label })),
        addonsIntro: L.addonsIntro,
        overageNote: L.overageNote,
        faq: L.faq,
      }
    : BASE);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderHead() {
    /* El rótulo y el selector van en la MISMA fila: la sección ya era alta y el
       selector se llevaba una línea entera para decir dos palabras. Y en el
       botón anual «2 meses gratis» se sube encima de «Anual», en pequeño: al
       lado alargaba el grupo hasta no caber en un móvil junto al rótulo. */
    return `<div class="pricing-head">
      <div class="pricing-head-row">
        <div class="getupdate-eyebrow">${esc(W.eyebrow)}</div>
        <div class="pricing-toggles" role="group" aria-label="${esc(W.priceOptions)}">
          <div class="pt-group" role="group" aria-label="${esc(W.billing)}">
            <button type="button" class="pt-btn${state.annual ? '' : ' is-on'}" data-set="annual" data-val="0" aria-pressed="${!state.annual}">${esc(W.monthly)}</button>
            <button type="button" class="pt-btn is-anual${state.annual ? ' is-on' : ''}" data-set="annual" data-val="1" aria-pressed="${state.annual}"><span class="pt-badge">${esc(W.freeMonths(C.billing.annualFreeMonths))}</span><span class="pt-label">${esc(W.annual)}</span></button>
          </div>
        </div>
      </div>
      ${C.title ? `<h3 class="home_getupdate-heading">${esc(C.title)}</h3>` : ''}
      ${C.subtitle ? `<div class="getupdate-text">${esc(C.subtitle)}</div>` : ''}</div>`;
  }
  function renderCard(p) {
    const free = p.price === 0;
    const m = monthly(p.price);
    const priceHtml = free ? `<div class="price-amount">US$ 0</div>`
      : `<div class="price-amount">${money(m)}<span>${esc(W.perMonth)}</span></div>${state.annual ? `<div class="price-annual">${esc(W.perYear(money(m * 12)))}</div>` : ''}`;
    /* Resultado → capacidades → límites. Las capacidades acumulan («Todo lo
       de Asistente, más:»): así cada tarjeta dice qué GANAS al subir, no la
       lista entera repetida con una línea distinta escondida en medio. */
    const caps = (p.caps || []).map((c) => `<li>${esc(c)}</li>`).join('');
    const limits = [
      ['mirrorRecords', limit(p.mirrorRecords)], ['crmAccounts', limit(p.crmAccounts)],
      ['adsAccounts', limit(p.adsAccounts)], ['commands', fmtN(p.commands)],
    ].map(([key, value]) => `<div><dt>${esc(W.limits[key])}</dt><dd>${esc(value)}</dd></div>`).join('');
    /* El enlace lleva el CÓDIGO del plan (el que cobra el motor) y el
       intervalo que se está viendo: al entrar, el panel abre el pago de ese
       plan. El gratuito solo registra. */
    const cta = free ? `<a href="${C.cta.trialBase}?plan=${p.code}" class="price-cta">${esc(C.cta.freeLabel)}</a>`
      : `<a href="${C.cta.trialBase}?plan=${p.code}&interval=${state.annual ? 'annual' : 'monthly'}" class="price-cta">${esc(C.cta.trialLabel)}</a>`;
    return `<div class="price-card${free ? ' is-free' : ''}${p.featured ? ' is-featured' : ''}" data-plan="${p.id}">
      <div class="price-top"><div class="price-name">${esc(p.name)}</div>${p.featured ? `<span class="price-badge">${esc(W.recommended)}</span>` : ''}</div>
      <div class="price-promise">${esc(p.promise)}</div>${priceHtml}
      ${p.intro ? `<div class="price-caps-intro">${esc(p.intro)}</div>` : ''}<ul class="price-list">${caps}</ul>
      <dl class="price-limits" aria-label="${esc(W.limitsLabel)}">${limits}</dl>${p.note ? `<div class="price-note">${esc(p.note)}</div>` : ''}${cta}</div>`;
  }
  function renderCards() {
    return `<div class="pricing-grid is-four" id="pricing-cards">${C.plans.map(renderCard).join('')}</div>
      <p class="pricing-soon">${esc(C.soonLine)}</p>
      <details class="pricing-notes">
        <summary class="pricing-notes-toggle">${esc(W.moreInfo)}</summary>
        <div class="pricing-notes-body">
          <p class="pricing-note"><b>${esc(W.whatIsACommand)}</b> ${esc(C.commandNote)}</p>
          <p class="pricing-note"><b>${esc(C.addonsIntro)}</b> ${C.addons.map((a) => `${esc(a.label)} = ${money(a.price)}`).join(' · ')}. ${esc(C.overageNote)}</p>
          <p class="pricing-note">${esc(C.enterpriseLine)} <a href="${C.cta.enterpriseHref}">${esc(C.cta.enterpriseLabel)}</a>.</p>
        </div>
      </details>`;
  }
  function renderMore() {
    return `<section class="pricing-more" aria-label="${esc(W.pricingDetails)}">
      <div class="padding-global"><div class="container-large">
        <div class="pm-block"><h3 class="pm-title">${esc(W.faqTitle)}</h3>
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
    /* La etiqueta del botón se pone aquí y no en el HTML: el `value` de un input
       no entra en el catálogo de traducciones —sólo alt, placeholder, aria-label,
       title y data-label—, así que en inglés y portugués se quedaría en
       castellano. El HTML ya trae «Enviar» para que no parpadee. */
    if (submit) submit.value = W.formSubmit;
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
      if (!valid(v)) { say(failBox, W.formInvalid); if (input) input.focus(); return; }
      const next = '/empezar/?email=' + encodeURIComponent(v);
      if (submit) { submit.disabled = true; submit.value = W.formSending; }
      try {
        const res = await fetch('/api/lead', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contact: v, source: 'precios', website: trap ? trap.value : '' }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        say(okBox, W.formSaved);
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

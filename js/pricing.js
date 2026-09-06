/* ============================================================
   pricing.js — Sección de precios de Comando.
   Todo lo editable (planes, límites, add-ons, tipo de cambio, comparativa,
   FAQ y textos) vive en PRICING_CONFIG. El markup se genera desde aquí.

   Los tres idiomas: PRICING_CONFIG es el castellano y PRICING_I18N trae lo que
   cambia en inglés y portugués. Lo que NO cambia son los números: un plan de
   US$ 8 con 70 000 contactos es el mismo plan en los tres, y tenerlo escrito
   una sola vez es lo que impide que un precio se quede viejo en un idioma.
   ============================================================ */
const PRICING_CONFIG = {
  billing: { annualFreeMonths: 2 },          // anual = precio mensual × 10 / 12
  featuredPlan: 'starter',
  cta: { trialBase: '/app/', trialLabel: 'Elegir plan', freeLabel: 'Empezar gratis', enterpriseHref: '#pricing-form', enterpriseLabel: 'Habla con ventas' },
  title: 'Haz menos trabajo manual desde US$ 3 al mes.',
  subtitle: 'Actualiza el CRM, crea seguimientos y recibe alertas desde WhatsApp. Prueba gratis.',
  // Cada plan muestra solo 4 líneas: contactos, comandos, usuario y un diferencial.
  plans: [
    { id: 'gratis',  name: 'Gratis',  price: 0,  contacts: 20000, commands: 30,   crms: '<b>1</b> CRM conectado', note: 'Prueba individual, sin tarjeta.' },
    { id: 'basico',  name: 'Básico',  price: 3,  listPrice: 6, contacts: 20000, commands: 200,  crms: '<b>2</b> CRM conectados', ads: '<b>1</b> cuenta de Meta Ads' },
    { id: 'starter', name: 'Starter', price: 8,  contacts: 70000, commands: 700,  crms: '<b>5</b> CRM conectados', ads: '<b>3</b> cuentas de anuncios' },
    { id: 'pro',     name: 'Pro',     price: 20, contacts: 200000, commands: 2000, crms: '<b>CRM ilimitados</b>', ads: '<b>Anuncios ilimitados</b>' },
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
    { q: '¿Qué incluye el plan Gratis?', a: '30 comandos para una persona, con hasta 20 000 contactos a tu alcance y 1 CRM conectado, sin tarjeta. Cuando se te acaben, eliges un plan y sigues donde ibas.' },
    { q: '¿Cada cuánto se actualiza mi CRM en Comando?', a: 'Cuando tu CRM envía eventos, los cambios llegan en tiempo real. Cuando no los envía, Comando revisa los cambios cada 6 horas en Básico, cada 30 minutos en Starter y cada 5 minutos en Pro.' },
    { q: '¿Comando les escribe a mis clientes?', a: 'No desde tu número personal: Meta bloquea los envíos automáticos desde WhatsApp no oficial. Comando prepara el mensaje y te lo entrega listo para enviarlo con un toque (modo asistido), así que no necesitas contratar la API de WhatsApp Business para empezar. Si conectas un número oficial de WhatsApp Business, los envíos automáticos con plantillas aprobadas quedan disponibles.' },
    { q: '¿Qué pasa si pido algo que mi CRM no permite?', a: 'Comando te lo dice y te propone la alternativa que sí puede hacer (por ejemplo, crear la tarea en vez de llamar, o contar desde hoy si tu CRM no guarda historial de ese campo).' },
    { q: '¿Qué CRM soportan y dónde quedan mis credenciales?', a: 'HubSpot, Salesforce, Zoho CRM, Pipedrive, Dynamics 365, Google Sheets y las tiendas y marketplaces de la lista de conectores. Te conectas con el login del propio sistema, sin copiar claves; las credenciales quedan cifradas en la infraestructura de Comando y nunca en terceros.' },
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
      contactsInReach: (n) => `<b>${n}</b> contacts within reach`,
      contactsByPlan: 'Contacts as per your plan',
      commandsToTry: (n) => `<b>${n}</b> commands to try it out`,
      commandsPerMonth: (n) => `<b>${n}</b> commands a month`,
      individualPlan: '<b>Individual plan</b>',
      whatIsACommand: 'What is a command?',
      pricingDetails: 'Pricing details', faqTitle: 'Frequently asked questions',
      formInvalid: 'Write your email or your WhatsApp so we can reply.',
      formSending: 'Sending…',
      formSaved: 'Done, we have your details. Tell us which CRM you use and we will let you know first.',
    },
    cta: { trialLabel: 'Choose plan', freeLabel: 'Start free', enterpriseLabel: 'Talk to sales' },
    title: 'Do less manual work from US$ 3 a month.',
    subtitle: 'Update the CRM, create follow-ups and get alerts from WhatsApp. Free to try.',
    planNames: { gratis: 'Free', basico: 'Basic', starter: 'Starter', pro: 'Pro' },
    planCrms: {
      gratis: '<b>1</b> CRM connected', basico: '<b>2</b> CRMs connected',
      starter: '<b>5</b> CRMs connected', pro: '<b>Unlimited CRMs</b>',
    },
    planAds: {
      basico: '<b>1</b> Meta Ads account', starter: '<b>3</b> ad accounts',
      pro: '<b>Unlimited ads</b>',
    },
    planNotes: { gratis: 'Individual trial, no card.' },
    enterpriseLine: 'More than 200,000 contacts, advanced integrations or dedicated support?',
    commandNote: 'A command is every request you make to Comando on WhatsApp, by text or by voice. Confirmations and replies do not count.',
    addonLabels: { '+20 000 contactos': '+20,000 contacts', '+500 comandos': '+500 commands' },
    addonsIntro: 'Running short? Add packs without changing plan:',
    overageNote: 'We warn you at 80 % of your limit. We never cut the service without telling you.',
    faq: [
      { q: 'How is the price calculated?', a: 'Each person uses a plan based on how many CRM contacts they need within reach. If two users each need up to 20,000 contacts, each uses a Basic plan at US$ 3 a month. You can change plan whenever you want; it is prorated.' },
      { q: 'What counts as a command and what happens if I go over?', a: 'A command is every request you make to Comando on WhatsApp, by text or by voice; a voice note counts as 1.5. Confirmations ("yes", "ok") and Comando\'s replies do not count. We warn you at 80 % of your quota and never cut the service without telling you: you can add packs of 500 commands for $8 or move up a plan.' },
      { q: 'What does the Free plan include?', a: '30 commands for one person, with up to 20,000 contacts within reach and 1 CRM connected, no card. When they run out, you pick a plan and carry on where you were.' },
      { q: 'How often is my CRM refreshed in Comando?', a: 'When your CRM sends events, changes arrive in real time. When it does not, Comando checks for changes every 6 hours on Basic, every 30 minutes on Starter and every 5 minutes on Pro.' },
      { q: 'Does Comando message my customers?', a: 'Not from your personal number: Meta blocks automated sends from unofficial WhatsApp. Comando prepares the message and hands it to you ready to send with one tap (assisted mode), so you do not need the WhatsApp Business API to start. If you connect an official WhatsApp Business number, automated sends with approved templates become available.' },
      { q: 'What if I ask for something my CRM does not allow?', a: 'Comando tells you and offers the alternative it can do (for example, creating the task instead of calling, or counting from today if your CRM keeps no history of that field).' },
      { q: 'Which CRMs do you support and where do my credentials live?', a: 'HubSpot, Salesforce, Zoho CRM, Pipedrive, Dynamics 365, Google Sheets and the stores and marketplaces in the connector list. You connect with the system\'s own login, without copying keys; credentials are encrypted inside Comando\'s infrastructure and never with third parties.' },
    ],
  },
  pt: {
    words: {
      eyebrow: 'PREÇOS', priceOptions: 'Opções de preço', billing: 'Cobrança',
      monthly: 'Mensal', annual: 'Anual', freeMonths: (n) => `${n} meses grátis`,
      perMonth: '/mês', perYear: (amount) => `${amount} por ano`, off: (p) => `${p} % de desconto`,
      contactsInReach: (n) => `<b>${n}</b> contatos ao seu alcance`,
      contactsByPlan: 'Contatos conforme seu plano',
      commandsToTry: (n) => `<b>${n}</b> comandos para testar`,
      commandsPerMonth: (n) => `<b>${n}</b> comandos por mês`,
      individualPlan: '<b>Plano individual</b>',
      whatIsACommand: 'O que é um comando?',
      pricingDetails: 'Detalhes de preços', faqTitle: 'Perguntas frequentes',
      formInvalid: 'Escreva seu e-mail ou seu WhatsApp para a gente responder.',
      formSending: 'Enviando…',
      formSaved: 'Pronto, já temos seus dados. Diga qual é o seu CRM e a gente avisa você primeiro.',
    },
    cta: { trialLabel: 'Escolher plano', freeLabel: 'Começar grátis', enterpriseLabel: 'Falar com vendas' },
    title: 'Faça menos trabalho manual a partir de US$ 3 por mês.',
    subtitle: 'Atualize o CRM, crie acompanhamentos e receba alertas pelo WhatsApp. Teste grátis.',
    planNames: { gratis: 'Grátis', basico: 'Básico', starter: 'Starter', pro: 'Pro' },
    planCrms: {
      gratis: '<b>1</b> CRM conectado', basico: '<b>2</b> CRMs conectados',
      starter: '<b>5</b> CRMs conectados', pro: '<b>CRMs ilimitados</b>',
    },
    planAds: {
      basico: '<b>1</b> conta de Meta Ads', starter: '<b>3</b> contas de anúncios',
      pro: '<b>Anúncios ilimitados</b>',
    },
    planNotes: { gratis: 'Teste individual, sem cartão.' },
    enterpriseLine: 'Mais de 200 000 contatos, integrações avançadas ou suporte dedicado?',
    commandNote: 'Um comando é cada pedido que você faz ao Comando pelo WhatsApp, por texto ou por áudio. As confirmações e as respostas não contam.',
    addonLabels: { '+20 000 contactos': '+20 000 contatos', '+500 comandos': '+500 comandos' },
    addonsIntro: 'Ficou curto? Some pacotes sem trocar de plano:',
    overageNote: 'A gente avisa a 80 % do seu limite. Nunca cortamos o serviço sem avisar.',
    faq: [
      { q: 'Como o preço é calculado?', a: 'Cada pessoa usa um plano conforme quantos contatos do CRM precisa ter ao alcance. Se dois usuários precisam de até 20 000 contatos cada, cada um usa um plano Básico de US$ 3 por mês. Você pode trocar de plano quando quiser; é proporcional.' },
      { q: 'O que conta como comando e o que acontece se eu passar?', a: 'Um comando é cada pedido que você faz ao Comando pelo WhatsApp, por texto ou por áudio; um áudio conta como 1,5. As confirmações («sim», «ok») e as respostas do Comando não contam. A gente avisa a 80 % da cota e nunca corta o serviço sem avisar: você pode somar pacotes de 500 comandos por $8 ou subir de plano.' },
      { q: 'O que inclui o plano Grátis?', a: '30 comandos para uma pessoa, com até 20 000 contatos ao alcance e 1 CRM conectado, sem cartão. Quando acabarem, você escolhe um plano e continua de onde parou.' },
      { q: 'De quanto em quanto tempo meu CRM é atualizado no Comando?', a: 'Quando seu CRM envia eventos, as mudanças chegam em tempo real. Quando não envia, o Comando verifica as mudanças a cada 6 horas no Básico, a cada 30 minutos no Starter e a cada 5 minutos no Pro.' },
      { q: 'O Comando escreve para os meus clientes?', a: 'Não pelo seu número pessoal: a Meta bloqueia envios automáticos pelo WhatsApp não oficial. O Comando prepara a mensagem e entrega pronta para você enviar com um toque (modo assistido), então não precisa contratar a API do WhatsApp Business para começar. Se conectar um número oficial do WhatsApp Business, os envios automáticos com modelos aprovados ficam disponíveis.' },
      { q: 'E se eu pedir algo que meu CRM não permite?', a: 'O Comando diz isso e propõe a alternativa que ele consegue fazer (por exemplo, criar a tarefa em vez de ligar, ou contar a partir de hoje se seu CRM não guarda histórico desse campo).' },
      { q: 'Quais CRMs vocês suportam e onde ficam minhas credenciais?', a: 'HubSpot, Salesforce, Zoho CRM, Pipedrive, Dynamics 365, Google Sheets e as lojas e marketplaces da lista de conectores. Você conecta com o login do próprio sistema, sem copiar chaves; as credenciais ficam criptografadas na infraestrutura do Comando e nunca em terceiros.' },
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
    eyebrow: 'PRECIOS', priceOptions: 'Opciones de precio', billing: 'Facturación',
    monthly: 'Mensual', annual: 'Anual', freeMonths: (n) => `${n} meses gratis`,
    perMonth: '/mes', perYear: (amount) => `${amount} al año`, off: (p) => `${p} % de descuento`,
    contactsInReach: (n) => `<b>${n}</b> contactos a tu alcance`,
    contactsByPlan: 'Contactos según tu plan',
    commandsToTry: (n) => `<b>${n}</b> comandos para probar`,
    commandsPerMonth: (n) => `<b>${n}</b> comandos al mes`,
    individualPlan: '<b>Plan individual</b>',
    whatIsACommand: '¿Qué es un comando?',
    pricingDetails: 'Detalles de precios', faqTitle: 'Preguntas frecuentes',
    formInvalid: 'Escribe tu correo o tu WhatsApp para poder responderte.',
    formSending: 'Enviando…',
    formSaved: 'Listo, ya tenemos tus datos. Dinos cuál es tu CRM y te avisamos primero.',
  };
  // Los números y los enlaces son los mismos en los tres idiomas; solo las
  // palabras cambian. Así un precio nuevo no puede quedarse viejo en un idioma.
  const C = L
    ? {
        ...PRICING_CONFIG,
        cta: { ...PRICING_CONFIG.cta, ...L.cta },
        title: L.title,
        subtitle: L.subtitle,
        plans: PRICING_CONFIG.plans.map((plan) => ({
          ...plan,
          name: L.planNames[plan.id] ?? plan.name,
          ...(plan.crms ? { crms: L.planCrms[plan.id] ?? plan.crms } : {}),
          ...(plan.ads ? { ads: L.planAds[plan.id] ?? plan.ads } : {}),
          ...(plan.note ? { note: L.planNotes[plan.id] ?? plan.note } : {}),
        })),
        enterpriseLine: L.enterpriseLine,
        commandNote: L.commandNote,
        addons: PRICING_CONFIG.addons.map((addon) => ({ ...addon, label: L.addonLabels[addon.label] ?? addon.label })),
        addonsIntro: L.addonsIntro,
        overageNote: L.overageNote,
        faq: L.faq,
      }
    : PRICING_CONFIG;
  const state = { annual: false };
  const NUMBERS = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' }[LANG] ?? 'es-PE';
  const fmtN = (n) => n.toLocaleString(NUMBERS).replace(/,/g, ' ').replace(/\./g, ' ');
  function money(usd) { if (usd == null) return null; const v = Number.isInteger(usd) ? usd : Math.round(usd * 100) / 100; return 'US$ ' + v.toLocaleString(NUMBERS); }
  function monthly(p) { if (p == null) return null; return state.annual ? p * (12 - C.billing.annualFreeMonths) / 12 : p; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function renderHead() {
    return `<div class="pricing-head"><div class="getupdate-eyebrow">${esc(W.eyebrow)}</div>
      <h3 class="home_getupdate-heading">${esc(C.title)}</h3>
      <div class="getupdate-text">${esc(C.subtitle)}</div>
      <div class="pricing-toggles" role="group" aria-label="${esc(W.priceOptions)}">
        <div class="pt-group" role="group" aria-label="${esc(W.billing)}">
          <button type="button" class="pt-btn${state.annual ? '' : ' is-on'}" data-set="annual" data-val="0" aria-pressed="${!state.annual}">${esc(W.monthly)}</button>
          <button type="button" class="pt-btn${state.annual ? ' is-on' : ''}" data-set="annual" data-val="1" aria-pressed="${state.annual}">${esc(W.annual)} <span class="pt-badge">${esc(W.freeMonths(C.billing.annualFreeMonths))}</span></button>
        </div>
      </div></div>`;
  }
  function renderCard(p) {
    const featured = p.id === C.featuredPlan;
    const free = p.price === 0;
    const m = monthly(p.price);
    // Con `listPrice` la tarjeta muestra el precio de lista tachado y cuánto se ahorra.
    const list = !free && p.listPrice ? monthly(p.listPrice) : null;
    const off = list ? Math.round((1 - p.price / p.listPrice) * 100) : 0;
    const priceHtml = free ? `<div class="price-amount">US$ 0</div>`
      : `<div class="price-amount">${money(m)}<span>${esc(W.perMonth)}</span>${list ? `<s>${money(list)}</s>` : ''}</div>${off ? `<div class="price-off">${esc(W.off(off))}</div>` : ''}${state.annual ? `<div class="price-annual">${esc(W.perYear(money(m * 12)))}</div>` : ''}`;
    const lines = [p.contacts == null ? W.contactsByPlan : W.contactsInReach(fmtN(p.contacts)), free ? W.commandsToTry(fmtN(p.commands)) : W.commandsPerMonth(fmtN(p.commands)), W.individualPlan, p.crms, p.ads].filter(Boolean);
    const cta = free ? `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.freeLabel)}</a>`
      : `<a href="${C.cta.trialBase}?plan=${p.id}" class="price-cta">${esc(C.cta.trialLabel)}</a>`;
    return `<div class="price-card${featured ? ' is-featured' : ''}${free ? ' is-free' : ''}" data-plan="${p.id}">
      <div class="price-name">${esc(p.name)}</div>${priceHtml}
      <ul class="price-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${p.note ? `<div class="price-note">${esc(p.note)}</div>` : ''}${cta}</div>`;
  }
  function renderCards() {
    return `<div class="pricing-grid is-four" id="pricing-cards">${C.plans.map(renderCard).join('')}</div>
      <div class="pricing-notes">
        <p class="pricing-note"><b>${esc(W.whatIsACommand)}</b> ${esc(C.commandNote)}</p>
        <p class="pricing-note"><b>${esc(C.addonsIntro)}</b> ${C.addons.map((a) => `${esc(a.label)} = ${money(a.price)}/mes`).join(' · ')}. ${esc(C.overageNote)}</p>
        <p class="pricing-note">${esc(C.enterpriseLine)} <a href="${C.cta.enterpriseHref}">${esc(C.cta.enterpriseLabel)}</a>.</p>
      </div>`;
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

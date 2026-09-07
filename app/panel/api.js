/* Capa de datos del panel.
   - `createApi(cfg, getToken)` habla con el engine con la sesión de Clerk (mismo patrón
     que /app/ y /app/dashboard/: Bearer, reintento único si el JWT de un minuto venció,
     `x-request-id` en cada mutación).
   - Cada método devuelve datos o `{ pending: true, reason }` cuando el endpoint aún no
     existe en el engine. La UI muestra entonces el estado «se activa pronto» con la frase
     equivalente para pedirlo por WhatsApp. Ver README.md: tabla de endpoints.
   - `createMockApi()` sirve los datos de mock-data.js con una pequeña latencia. */

import { MOCK, MOCK_DELAY_MS } from './mock-data.js?v=7';

const PENDING = (reason) => ({ pending: true, reason });

export function createApi(cfg, getToken) {
  const base = String(cfg.engineUrl || '').replace(/\/$/, '');
  const root = /\/api$/.test(base) ? base : base + '/api';

  async function call(path, options = {}) {
    const request = async (skipCache) => {
      const t = await getToken(skipCache);
      if (!t) throw Object.assign(new Error('Sesión no disponible'), { status: 401 });
      return fetch(root + path, {
        ...options,
        headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json', ...(options.headers || {}) },
      });
    };
    let res = await request(false);
    if (res.status === 401) res = await request(true);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.message || 'Error ' + res.status), { status: res.status, body });
    return body;
  }
  /* `idem` se pasa desde fuera cuando quien llama quiere poder REINTENTAR sin
     duplicar: el engine deriva el id del turno de la `idempotency-key` (con el
     tenant y el operador), así que repetir la misma clave convierte el reintento
     en duplicado en vez de en un segundo comando. Sin ella, una clave nueva por
     intento es lo correcto: cada clic es una orden distinta. */
  const mutate = (path, method, body, idem) => call(path, {
    method, headers: { 'x-request-id': crypto.randomUUID(), 'idempotency-key': idem || crypto.randomUUID() },
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
  /** Un 404/501 significa «todavía no está en el engine», no un fallo. */
  const optional = async (fn, reason) => {
    try { return await fn(); }
    catch (e) { if (e && (e.status === 404 || e.status === 501)) return PENDING(reason); throw e; }
  };

  return {
    mode: 'live',
    /** Llamada directa (la usa setup.js para el flujo de WhatsApp y de conexión). */
    raw: (path, options = {}) => call(path, options),
    me: () => call('/auth/me'),
    /* La moneda de la cuenta, no una preferencia personal: decide con qué
       símbolo ve la plata TODO el equipo, y por eso el engine solo la deja
       escribir a `owner` y `admin` (403 para los demás). El tenant sale de la
       sesión: mandarlo en el cuerpo sería un 400, porque el esquema es
       `.strict()`. Va por `optional()` porque la ruta todavía no está
       publicada: mientras tanto es «se activa pronto» y no un fallo. */
    setCurrency: (currency) => optional(() => mutate('/tenant/currency', 'PUT', { currency }), 'currency'),
    connections: async () => (await call('/integrations/connections')).connections || [],
    sheets: () => optional(async () => (await call('/integrations/google-sheets/sources')).sources || [], 'sheets'),
    agent: () => call('/operator-agent'),
    recommendations: async (status = 'pending,snoozed') => {
      const r = await call('/sales-intelligence/recommendations?status=' + encodeURIComponent(status) + '&limit=50');
      return Array.isArray(r) ? r : r.recommendations || r.items || [];
    },
    recommendationAction: (id, action, body) => mutate('/sales-intelligence/recommendations/' + id + '/' + action, 'POST', body),
    ruleStatus: (id, status) => mutate('/operator-agent/rules/' + id + '/status', 'PATCH', { status }),
    savePreferences: (prefs) => mutate('/operator-agent/preferences', 'PUT', prefs),
    saveProfile: (profile) => mutate('/operator-agent/profile', 'PUT', profile),
    addMemory: (memory) => mutate('/operator-agent/memories', 'POST', memory),
    feedback: (body) => mutate('/operator-agent/feedback', 'POST', body),
    decideApproval: (id, decision, reason) => mutate('/approvals/' + id + '/decision', 'POST', reason ? { decision, reason } : { decision }),
    publicPlans: async () => { try { return (await fetch(root + '/v1/public/plans').then((r) => r.json())).plans || []; } catch (e) { return []; } },
    fieldsSummary: () => optional(() => call('/crm/fields'), 'fields'),
    /* ---- pendientes en el engine (README.md § Endpoints propuestos) ---- */
    tasks: () => optional(() => call('/operator/tasks?status=open,completed&limit=100'), 'tasks'),
    completeTask: (id) => mutate('/operator/tasks/' + id + '/complete', 'POST'),
    calendar: (from, to) => optional(() => call('/operator/calendar?from=' + from + '&to=' + to), 'calendar'),
    health: () => optional(() => call('/crm/health'), 'health'),
    pipeline: () => optional(() => call('/crm/pipeline/summary'), 'pipeline'),
    history: () => optional(() => call('/operator/commands?limit=50'), 'history'),
    /* La consola (plan 15): el panel ENCOLA por la misma puerta que WhatsApp y
       después consulta el diálogo. No ejecuta: si ejecutara por su cuenta, la
       vista previa, el CONFIRMAR, el cupo y el historial tendrían dos caminos
       que empiezan iguales y divergen solos. */
    sendCommand: (utterance, idem) => optional(() => mutate('/operator/commands', 'POST', { utterance }, idem), 'console'),
    commands: (limit = 20) => optional(() => call('/operator/commands?limit=' + limit), 'console'),
    approvals: () => optional(() => call('/approvals?status=pending,approved,rejected&limit=50'), 'approvals'),
    eventRules: () => optional(() => call('/automation-rules'), 'eventRules'),
    policy: () => optional(() => call('/sales-intelligence/policy'), 'policy'),
    quota: () => optional(() => call('/billing/quota'), 'quota'),
    team: () => optional(() => call('/team'), 'team'),
    marketing: () => optional(() => call('/marketing/overview'), 'marketing'),
    playbooks: () => optional(() => call('/automation-rules/playbooks'), 'playbooks'),
    /* ---- Meta Ads: la conexión, no las campañas (plan 14) ---- */
    metaStatus: () => optional(() => call('/integrations/meta/status'), 'meta'),
    metaConnect: () => mutate('/integrations/meta/connect', 'POST'),
    metaRefreshAccounts: () => mutate('/integrations/meta/accounts/refresh', 'POST'),
    metaSelectAccounts: (accountRefs) => mutate('/integrations/meta/accounts', 'POST', { accountRefs }),
    metaDisconnect: () => mutate('/integrations/meta/connection', 'DELETE'),
  };
}

export function createMockApi() {
  const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), MOCK_DELAY_MS));
  const log = (what, payload) => { console.info('[comando panel mock]', what, payload || ''); return wait({ ok: true }); };
  const a = MOCK.agent;
  /* Los tres estados de la moneda se pueden mirar sin engine, que es la única
     forma de revisar que la pregunta aparece cuando toca y calla cuando no:
     `?mock=1&moneda=crm` (la trajo el CRM), `&moneda=account` (la declararon),
     `&moneda=none` (nadie la sabe: es el único caso en que se pregunta), y
     `&rol=agent` para ver la pantalla de quien no puede cambiarla. */
  const me = structuredClone(MOCK.me);
  const params = new URLSearchParams(location.search);
  const source = params.get('moneda');
  if (source === 'none') { me.currency = null; me.currencySource = null; }
  else if (source === 'account') { me.currency = 'USD'; me.currencySource = 'account'; }
  else if (source === 'crm') { me.currency = 'PEN'; me.currencySource = 'crm'; }
  if (params.get('rol')) me.role = params.get('rol');
  /* El «worker» de mentira, para poder ver el ciclo entero de la consola sin
     engine: encola, tarda un par de segundos en planear, y una pregunta se
     responde sola mientras que una escritura queda esperando el CONFIRMAR. */
  const feed = structuredClone(MOCK.history);
  const ASKS = /^(qu[eé]|cu[aá]nt|qui[eé]n|cu[aá]l|what|how|who|which|o que|quanto|quem|qual)/i;
  const CONFIRM = /^(confirmar|confirm)$/i;
  /* El turno aparece PRIMERO en `pending` y sin `note` —eso es «pensando…»— y
     un momento después con su `kind`, como hace el engine de verdad. */
  function mockEnqueue(utterance) {
    const text = String(utterance).trim();
    const id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (CONFIRM.test(text) || /^\d{4,8}$/.test(text)) {
      const waiting = feed.find((x) => x.kind === 'PLAN_PREVIEW' || x.kind === 'PIN_REQUIRED');
      if (waiting) setTimeout(() => { waiting.status = 'executed'; waiting.kind = 'EXECUTED'; waiting.note = 'Listo: etiqueta VIP en 12 registros.'; }, 1200);
      return id;
    }
    /* Qué gesto sale, por el texto, para poder ver los cuatro sin engine:
       pregunta → hecho; envío masivo → lo aprueba un administrador; dinero →
       segundo factor; lo demás → vista previa esperando la palabra. */
    const expiresAt = new Date(Date.now() + 9e5).toISOString();
    const outcome = ASKS.test(text)
      ? { status: 'executed', kind: 'EXECUTED', note: 'Tienes S/ 9.870.000 en 41 negocios abiertos.', records: 41 }
      : /promo|masiv|broadcast|plantilla/i.test(text)
        ? { status: 'awaiting_approval', kind: 'APPROVAL_CREATED', note: 'Envío masivo con costo S/ 120: excede tu límite.', records: 120, expiresAt }
        : /descuento|precio|monto|discount|price|desconto/i.test(text)
          ? { status: 'pending', kind: 'PIN_REQUIRED', note: 'Esto toca dinero. Te mandé el código por WhatsApp.', records: 15, expiresAt }
          : { status: 'pending', kind: 'PLAN_PREVIEW', plan: '📋 *Plan*\nEtiquetar VIP → 12 contactos\nVence en 15 minutos', records: 12, expiresAt };
    const turn = { id, at: new Date().toISOString(), utterance: text, plan: null, status: 'pending', types: [], records: 0, ref: null, kind: 'QUEUED' };
    setTimeout(() => feed.unshift(turn), 900);
    setTimeout(() => Object.assign(turn, outcome), 2600);
    return id;
  }
  return {
    mode: 'mock',
    raw: (path, options) => { log('raw ' + path, options && options.body); return wait(path.includes('whatsapp/start') ? { comandoNumber: '+51 912 000 000', code: 'K7Q2ZP', waLink: 'https://wa.me/51912000000?text=VERIFICAR%20K7Q2ZP' } : path.includes('/auth/language') ? { status: 'ok' } : path.includes('reconcile') ? { status: 'connected' } : path.includes('connect-sessions') ? { token: 'mock', connectionId: 'mock-conn' } : { ok: true, purged: true, purgeAfter: new Date(Date.now() + 7 * 864e5).toISOString() }); },
    me: () => wait(me),
    /* Igual que el engine: pasa a `account` y ya no se puede volver atrás.
       Con `&pendiente=moneda` responde como el engine de hoy, que todavía no
       publica la ruta: es la única forma de mirar la degradación a «se activa
       pronto» sin desplegar. */
    setCurrency: (currency) => {
      if (params.get('pendiente') === 'moneda') return wait(PENDING('currency'));
      me.currency = String(currency).toUpperCase(); me.currencySource = 'account';
      return log('PUT /tenant/currency', me.currency).then(() => ({ currency: me.currency, source: 'account' }));
    },
    connections: () => wait(MOCK.connections),
    sheets: () => wait(MOCK.connections[1].sources),
    agent: () => wait({ profile: a.profile, preferences: a.preferences, memories: a.memories, rules: a.rules, notifications: a.notifications, aliases: a.aliases, kpis: a.kpis }),
    recommendations: () => wait(MOCK.recommendations),
    recommendationAction: (id, action, body) => log('recommendation ' + action + ' ' + id, body),
    ruleStatus: (id, status) => log('rule ' + id + ' → ' + status),
    savePreferences: (p) => log('PUT /operator-agent/preferences', p),
    saveProfile: (p) => log('PUT /operator-agent/profile', p),
    addMemory: (m) => log('POST /operator-agent/memories', m),
    feedback: (b) => log('POST /operator-agent/feedback', b),
    decideApproval: (id, decision, reason) => log('approval ' + id + ' → ' + decision, reason),
    publicPlans: () => wait(MOCK.plans),
    fieldsSummary: () => wait({ counts: { contact: { total: 96, active: 14 }, deal: { total: 48, active: 11 }, company: { total: 32, active: 6 } } }),
    tasks: () => wait(MOCK.tasks),
    completeTask: (id) => log('POST /operator/tasks/' + id + '/complete'),
    calendar: () => wait(MOCK.calendar),
    health: () => wait(MOCK.health),
    pipeline: () => wait(MOCK.pipeline),
    history: () => wait(feed),
    sendCommand: (utterance) => wait({ id: mockEnqueue(utterance), status: 'accepted' }),
    commands: () => wait(feed),
    approvals: () => wait(MOCK.approvals),
    eventRules: () => wait(a.eventRules),
    policy: () => wait(a.policy),
    quota: () => wait(MOCK.quota),
    team: () => wait(MOCK.team),
    marketing: () => wait(MOCK.marketing),
    playbooks: () => wait(MOCK.playbooks),
    metaStatus: () => wait(MOCK.meta),
    metaConnect: () => log('POST /integrations/meta/connect'),
    metaRefreshAccounts: () => wait(MOCK.meta),
    metaSelectAccounts: (refs) => log('POST /integrations/meta/accounts', refs),
    metaDisconnect: () => log('DELETE /integrations/meta/connection'),
  };
}

export const isPending = (v) => Boolean(v && v.pending === true);

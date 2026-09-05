/* Capa de datos del panel.
   - `createApi(cfg, getToken)` habla con el engine con la sesión de Clerk (mismo patrón
     que /app/ y /app/dashboard/: Bearer, reintento único si el JWT de un minuto venció,
     `x-request-id` en cada mutación).
   - Cada método devuelve datos o `{ pending: true, reason }` cuando el endpoint aún no
     existe en el engine. La UI muestra entonces el estado «se activa pronto» con la frase
     equivalente para pedirlo por WhatsApp. Ver README.md: tabla de endpoints.
   - `createMockApi()` sirve los datos de mock-data.js con una pequeña latencia. */

import { MOCK, MOCK_DELAY_MS } from './mock-data.js?v=2';

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
  const mutate = (path, method, body) => call(path, {
    method, headers: { 'x-request-id': crypto.randomUUID(), 'idempotency-key': crypto.randomUUID() },
    body: body === undefined ? '{}' : JSON.stringify(body),
  });
  /** Un 404/501 significa «todavía no está en el engine», no un fallo. */
  const optional = async (fn, reason) => {
    try { return await fn(); }
    catch (e) { if (e && (e.status === 404 || e.status === 501)) return PENDING(reason); throw e; }
  };

  return {
    mode: 'live',
    me: () => call('/auth/me'),
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
    approvals: () => optional(() => call('/approvals?status=pending,approved,rejected&limit=50'), 'approvals'),
    eventRules: () => optional(() => call('/automation-rules'), 'eventRules'),
    policy: () => optional(() => call('/sales-intelligence/policy'), 'policy'),
    quota: () => optional(() => call('/billing/quota'), 'quota'),
    team: () => optional(() => call('/team'), 'team'),
    marketing: () => optional(() => call('/marketing/overview'), 'marketing'),
    playbooks: () => optional(() => call('/automation-rules/playbooks'), 'playbooks'),
  };
}

export function createMockApi() {
  const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), MOCK_DELAY_MS));
  const log = (what, payload) => { console.info('[comando panel mock]', what, payload || ''); return wait({ ok: true }); };
  const a = MOCK.agent;
  return {
    mode: 'mock',
    me: () => wait(MOCK.me),
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
    history: () => wait(MOCK.history),
    approvals: () => wait(MOCK.approvals),
    eventRules: () => wait(a.eventRules),
    policy: () => wait(a.policy),
    quota: () => wait(MOCK.quota),
    team: () => wait(MOCK.team),
    marketing: () => wait(MOCK.marketing),
    playbooks: () => wait(MOCK.playbooks),
  };
}

export const isPending = (v) => Boolean(v && v.pending === true);

/* Cliente del engine para el catálogo de campos del CRM.
   Esta página SOLO habla con dos endpoints:
     GET   {engine}/api/crm/fields
     PATCH {engine}/api/crm/fields/{objectType}/{propertyName}
   Nunca pide registros (contactos, negocios, informes): aquí no se muestran datos de clientes. */

/** engineUrl puede venir con o sin el sufijo /api (en /app/ ya lo trae). */
export function apiUrl(engineUrl, path) {
  const base = String(engineUrl || '').replace(/\/+$/, '');
  const prefix = /\/api$/.test(base) ? base : base + '/api';
  return prefix + path;
}

/** Error con el status HTTP y el cuerpo, para distinguir "sin CRM" de "caído". */
export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status || 0;
    this.body = body || {};
  }
}

const NO_CRM_CODES = ['crm_not_connected', 'no_crm', 'integration_not_connected', 'not_connected'];

/** ¿El backend nos está diciendo que todavía no hay CRM conectado? */
export function isNoCrmError(err) {
  if (!err || !(err instanceof ApiError)) return false;
  const code = String((err.body && (err.body.code || err.body.error)) || '').toLowerCase();
  if (NO_CRM_CODES.includes(code)) return true;
  return (err.status === 404 || err.status === 409 || err.status === 412) && /crm|integraci|connect/i.test(err.message || '');
}

export function createApi(cfg, getToken) {
  async function request(path, options) {
    const opts = options || {};
    const headers = { accept: 'application/json', ...(opts.headers || {}) };
    if (opts.body) headers['content-type'] = 'application/json';
    if (getToken) {
      const token = await getToken();
      if (!token) throw new ApiError('Tu sesión expiró. Vuelve a entrar.', 401, {});
      headers.authorization = 'Bearer ' + token;
    }
    let res;
    try {
      res = await fetch(apiUrl(cfg.engineUrl, path), { ...opts, headers });
    } catch (e) {
      throw new ApiError('No pudimos conectarnos con Comando. Revisa tu conexión.', 0, {});
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body.message || body.error || ('Error ' + res.status), res.status, body);
    return body;
  }

  return {
    listFields: () => request('/crm/fields'),
    patchField: (objectType, propertyName, patch) => request(
      '/crm/fields/' + encodeURIComponent(objectType) + '/' + encodeURIComponent(propertyName),
      { method: 'PATCH', body: JSON.stringify(patch) },
    ),
  };
}

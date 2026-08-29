/* Entrada de /app/dashboard/: sesión de Clerk (la misma de /app/) + catálogo de campos.
   Modos de revisión sin backend:  ?mock=1  ?mock=error  ?mock=nocrm  */
import { createApi, isNoCrmError } from './fields-api.js?v=1';
import { createMockApi } from './mock-fields.js?v=1';
import { mountFields } from './fields-ui.js?v=1';

const cfg = window.COMANDO_CONFIG || {};
const $ = (id) => document.getElementById(id);
const STATES = ['state-loading', 'state-signin', 'state-nocrm', 'state-error'];
const mock = new URLSearchParams(location.search).get('mock');

function show(id) {
  STATES.forEach((s) => { const el = $(s); if (el) el.hidden = s !== id; });
  $('fields-app').hidden = id !== 'fields-app';
}

function fail(message) {
  $('error-detail').textContent = message || 'Vuelve a intentarlo en unos segundos.';
  show('state-error');
}

/** Carga ClerkJS desde el Frontend API de la instancia, igual que /app/. */
async function loadClerk() {
  const s = document.createElement('script');
  s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
  s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
  s.async = true;
  s.crossOrigin = 'anonymous';
  await new Promise((res, rej) => {
    s.onload = res;
    s.onerror = () => rej(new Error('No se pudo cargar la sesión.'));
    document.head.appendChild(s);
  });
  await window.Clerk.load({ localization: { locale: 'es-ES' } });
  return window.Clerk;
}

async function buildApi() {
  if (mock) return createMockApi(mock);
  const clerk = await loadClerk();
  if (!clerk.user) return null; // sin sesión
  return createApi(cfg, () => clerk.session.getToken({ template: cfg.clerkJwtTemplate }));
}

/** Etiquetas de cada objeto del CRM; el engine devuelve la clave técnica. */
const OBJECT_LABELS = {
  contact: 'Contactos',
  contacts: 'Contactos',
  opportunity: 'Negocios',
  deal: 'Negocios',
  deals: 'Negocios',
  company: 'Empresas',
  companies: 'Empresas',
  order: 'Pedidos',
};

/**
 * El engine responde `{fields: {contact: [...], deal: [...]}, counts: {...}}`.
 * Aceptamos también la forma `{objects: [...]}` por si el contrato vuelve a ella.
 */
function usableObjects(payload) {
  if (!payload) return [];
  const clean = (fields) => (Array.isArray(fields) ? fields : []).filter((f) => f && f.propertyName);
  if (Array.isArray(payload.objects)) {
    return payload.objects
      .filter((o) => o && o.objectType)
      .map((o) => ({ ...o, label: o.label || OBJECT_LABELS[o.objectType] || o.objectType, fields: clean(o.fields) }));
  }
  const grouped = payload.fields;
  if (!grouped || typeof grouped !== 'object' || Array.isArray(grouped)) return [];
  const counts = payload.counts || {};
  return Object.keys(grouped)
    .map((objectType) => ({
      objectType,
      label: OBJECT_LABELS[objectType] || objectType,
      total: (counts[objectType] && counts[objectType].total) || clean(grouped[objectType]).length,
      fields: clean(grouped[objectType]),
    }))
    .filter((o) => o.fields.length || o.total);
}

async function start() {
  show('state-loading');
  let api;
  try {
    api = await buildApi();
  } catch (e) {
    fail(e.message);
    return;
  }
  if (!api) { show('state-signin'); return; }

  try {
    const payload = await api.listFields();
    const objects = usableObjects(payload);
    // Sin CRM conectado el engine no tiene catálogo que devolver.
    if (!objects.length || objects.every((o) => !o.fields.length)) { show('state-nocrm'); return; }
    mountFields({
      objects,
      api,
      tabsEl: document.querySelector('.db-tabs'),
      panelsEl: $('panels'),
      liveEl: $('live'),
    });
    show('fields-app');
  } catch (e) {
    if (isNoCrmError(e)) { show('state-nocrm'); return; }
    if (e && (e.status === 404 || e.status === 501)) {
      fail('Esta función todavía no está habilitada en tu cuenta. Escríbenos a hola@comando.pro si la necesitas ya.');
      return;
    }
    fail((e && e.message) || 'No pudimos leer los campos de tu CRM.');
  }
}

$('retry').addEventListener('click', () => {
  document.querySelector('.db-tabs').replaceChildren();
  $('panels').replaceChildren();
  start();
});

start();

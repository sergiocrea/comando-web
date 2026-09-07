/* Entrada de /app/dashboard/: sesión de Clerk (la misma de /app/) + catálogo de campos.
   Modos de revisión sin backend:  ?mock=1  ?mock=error  ?mock=nocrm
   Idioma: `?lang=en` para verla en otro. */
import { createApi, isNoCrmError } from './fields-api.js?v=2';
import { createMockApi } from './mock-fields.js?v=2';
import { mountFields, objectLabel } from './fields-ui.js?v=4';
import './strings.js?v=1';
import { initLocale, locale, t } from '../i18n.js?v=1';

/* El idioma se resuelve ANTES del primer pintado, y sale de lo que el operador
   eligió en el panel (mismo `localStorage`): esta pantalla se abre desde un
   botón del panel, y cambiar de idioma al cambiar de pantalla es exactamente
   el fallo que esto viene a arreglar. Sin selector propio a propósito: el de
   aquí no podría guardar la elección en la cuenta —esta página solo habla con
   los dos endpoints de campos— y dejaría el panel y WhatsApp en desacuerdo. */
initLocale();

const cfg = window.COMANDO_CONFIG || {};
const $ = (id) => document.getElementById(id);
const STATES = ['state-loading', 'state-signin', 'state-nocrm', 'state-error'];
const mock = new URLSearchParams(location.search).get('mock');

function show(id) {
  STATES.forEach((s) => { const el = $(s); if (el) el.hidden = s !== id; });
  $('fields-app').hidden = id !== 'fields-app';
}

function fail(message) {
  $('error-detail').textContent = message || t('db.error.generic');
  show('state-error');
}

/** El texto que vive en el HTML, en el idioma resuelto. */
function paintChrome() {
  document.title = t('db.title');
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const tabs = document.querySelector('.db-tabs');
  if (tabs) tabs.setAttribute('aria-label', t('db.tabs'));
  // La única frase con una palabra en negrita. Las dos partes salen del
  // diccionario, no del usuario, así que se pueden componer como HTML.
  const foot = document.querySelector('.db-foot');
  if (foot) foot.innerHTML = t('db.foot', { what: '<strong>' + t('db.footSensitive') + '</strong>' });
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
    s.onerror = () => rej(new Error(t('db.error.session')));
    document.head.appendChild(s);
  });
  await window.Clerk.load({ localization: { locale: { es: 'es-ES', en: 'en-US', pt: 'pt-BR' }[locale()] || 'es-ES' } });
  return window.Clerk;
}

async function buildApi() {
  if (mock) return createMockApi(mock);
  const clerk = await loadClerk();
  if (!clerk.user) return null; // sin sesión
  return createApi(cfg, () => clerk.session.getToken({ template: cfg.clerkJwtTemplate }));
}

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
      .map((o) => ({ ...o, label: objectLabel(o.objectType, o.label), fields: clean(o.fields) }));
  }
  const grouped = payload.fields;
  if (!grouped || typeof grouped !== 'object' || Array.isArray(grouped)) return [];
  const counts = payload.counts || {};
  return Object.keys(grouped)
    .map((objectType) => ({
      objectType,
      label: objectLabel(objectType),
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
    // Un fallo de API no es "sin CRM": deja rastro para poder diagnosticarlo.
    console.error('[comando] /crm/fields', e && e.status, e && e.message, e && e.body);
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
      fail(t('db.error.notEnabled'));
      return;
    }
    fail((e && e.message) || t('db.error.read'));
  }
}

$('retry').addEventListener('click', () => {
  document.querySelector('.db-tabs').replaceChildren();
  $('panels').replaceChildren();
  start();
});

paintChrome();
start();

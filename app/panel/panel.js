/* Panel del operador (SPA sin framework).
   - Sesión con Clerk (misma clave publishable que /app/), JWT con plantilla `comando`.
   - Rutas por hash (#/hoja, #/hoy, #/agenda, #/crm, #/avisos, #/marketing, #/cuenta).
   - `?mock=1` sirve datos de ejemplo sin backend (mock-data.js).
   - Cada sección carga sus datos con Promise.allSettled: una parte que falle o que
     aún no exista en el engine no tumba la página.
   - Tres piezas fijas: el menú arriba, la página en el centro y el chat con
     Comando a la derecha (en móvil, un cajón que se abre desde la barra de abajo). */
import { createApi, createMockApi } from './api.js?v=15';
import { SECTIONS, globalActions } from './sections.js?v=24';
import { chatView, paintChat, loadHistory, openChat, closeChat, chatPreference } from './chat.js?v=1';
import { whatsappStep, resumePendingConnection } from './setup.js?v=11';
import { esc, setWaBase, setAccountCurrency, wa, skeleton, toast, ICON, personName, isToday, isPast } from './ui.js?v=11';
import '../strings.js?v=17';
import { initLocale, adoptAccountLocale, mountLanguagePicker, onLocaleChange, locale, t } from '../i18n.js?v=1';

initLocale();
const cfg = window.COMANDO_CONFIG || {};
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const mock = params.get('mock');
const ctx = { api: null, clerk: null, user: null, me: null, tabs: {}, cal: null, cache: {} };

async function loadClerk() {
  const s = document.createElement('script');
  s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
  s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
  s.async = true; s.crossOrigin = 'anonymous';
  await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error(t('boot.sessionLoadFailed'))); document.head.appendChild(s); });
  await window.Clerk.load({ localization: { locale: { es: 'es-ES', en: 'en-US', pt: 'pt-BR' }[locale()] || 'es-ES' } });
  return window.Clerk;
}
async function buildApi() {
  if (mock) { $('mock-banner').hidden = false; return createMockApi(); }
  const clerk = await loadClerk();
  ctx.clerk = clerk;
  if (!clerk.user) return null;
  ctx.user = clerk.user;
  return createApi(cfg, (skipCache) => clerk.session.getToken({ template: cfg.clerkJwtTemplate, skipCache: skipCache === true }));
}

/* ---------------------------------------------------------------- el menú
   Arriba, como en una hoja de cálculo: todas las secciones a un clic, sin
   barra lateral. En móvil caben tres (Hoja, Hoy y el chat) y el resto va en
   «Más». La hoja es la portada. */
function currentId() { const m = location.hash.match(/^#\/([a-z]+)/); return m && SECTIONS.some((s) => s.id === m[1]) ? m[1] : 'hoja'; }
const MOBILE_TABS = ['hoja', 'hoy'];
let navBadges = {};
function renderNav(badges) {
  if (badges) navBadges = badges;
  const badge = (s) => (navBadges[s.id] ? `<span class="nav-badge" title="${esc(t('nav.badgeTitle', { section: s.title }))}">${esc(String(navBadges[s.id]))}</span>` : '');
  const item = (s, cls) => `<a href="#/${s.id}" data-nav="${s.id}" class="${cls}"><span class="nav-ico">${ICON[s.icon] || ''}</span><span class="nav-label">${esc(s.title)}</span>${badge(s)}</a>`;
  $('menu').innerHTML = SECTIONS.map((s) => item(s, 'topmenu-item')).join('');
  $('tabbar').innerHTML = SECTIONS.filter((s) => MOBILE_TABS.includes(s.id)).map((s) => item(s, 'tab')).join('')
    + `<button type="button" class="tab" data-act="chat:open"><span class="nav-ico">${ICON.chat}</span><span class="nav-label">${esc(t('chat.title'))}</span></button>`
    + `<button type="button" class="tab" data-act="menu:more"><span class="nav-ico">${ICON.more}</span><span class="nav-label">${esc(t('nav.more'))}</span></button>`;
  $('mas').innerHTML = `<div class="modal-caja mas-caja"><div class="consola-cabecera"><h3>${esc(t('nav.more'))}</h3><button class="btn sm ghost" type="button" data-act="menu:close">${esc(t('row.cancel'))}</button></div>
    <nav class="mas-lista">${SECTIONS.filter((s) => !MOBILE_TABS.includes(s.id)).map((s) => item(s, 'mas-item')).join('')}</nav></div>`;
  markNav();
}
function markNav() { const id = currentId(); document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === id)); }

async function loadSection(section, force) {
  if (!force && ctx.cache[section.id]) return ctx.cache[section.id];
  const spec = section.load(ctx.api, ctx);
  const keys = Object.keys(spec);
  const settled = await Promise.allSettled(keys.map((k) => spec[k]));
  const data = {};
  keys.forEach((k, i) => { data[k] = settled[i].status === 'fulfilled' ? settled[i].value : (settled[i].reason instanceof Error ? settled[i].reason : new Error(String(settled[i].reason))); });
  ctx.cache[section.id] = data;
  return data;
}

let renderToken = 0;
async function route(force) {
  const section = SECTIONS.find((s) => s.id === currentId());
  const page = $('page');
  const token = ++renderToken;
  document.title = t('boot.title', { section: section.title });
  document.body.dataset.section = section.id;
  markNav();
  $('mas')?.close?.();
  if (!ctx.cache[section.id] || force) page.innerHTML = `<div class="stack"><div class="page-head"><div><h1>${esc(section.title)}</h1><p>${esc(section.sub)}</p></div></div>${skeleton(6)}</div>`;
  try {
    const data = await loadSection(section, force);
    if (token !== renderToken) return;
    page.innerHTML = section.view(data, ctx);
    page.dataset.section = section.id;
    window.scrollTo({ top: 0 });
  } catch (e) {
    if (token !== renderToken) return;
    page.innerHTML = `<div class="state"><h2>${esc(t('common.loadFailed'))}</h2><p>${esc(e.message)}</p><button class="btn primary" data-reload>${esc(t('common.retry'))}</button></div>`;
  }
}
const rerender = () => { const section = SECTIONS.find((s) => s.id === currentId()); $('page').innerHTML = section.view(ctx.cache[section.id], ctx); };
const reload = () => route(true);

/* ------------------------------------------------------------ despachador
   Un solo despachador para la página, el chat y las barras: la acción se
   busca primero en la sección y, si no la conoce, en las globales (el chat y
   el menú), que valen desde cualquier sitio. */
const GLOBALES = { ...globalActions(), 'menu:more': () => $('mas').showModal(), 'menu:close': () => $('mas').close() };
const actionFor = (name) => { const section = SECTIONS.find((s) => s.id === currentId()); return (section.act && section.act[name]) || GLOBALES[name]; };
async function onClick(ev) {
  const el = ev.target.closest('[data-tab],[data-cal],[data-act],[data-reload],[data-nav]');
  if (!el) return;
  if (el.dataset.nav !== undefined) { $('mas')?.close?.(); return; }
  const section = SECTIONS.find((s) => s.id === currentId());
  if (el.dataset.reload !== undefined) return reload();
  if (el.dataset.tab) { ctx.tabs[section.id] = el.dataset.tab; rerender(); return; }
  if (el.dataset.cal) { section.act.cal(el, ctx, ctx.cache[section.id], reload, rerender); return; }
  if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  /* Un clic dentro de una fila de la hoja que cae sobre un enlace o un botón es
     de ese enlace, no de la fila. */
  if (el.tagName === 'TR' && ev.target.closest('a,button')) return;
  const fn = actionFor(el.dataset.act);
  if (!fn) return;
  try { await fn(el, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); }
}
async function onChange(ev) {
  const el = ev.target.closest('select[data-act],input[data-act]');
  if (!el) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  const fn = actionFor(el.dataset.act);
  if (!fn) return;
  try { await fn(el, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); }
}
async function onSubmit(ev) {
  const form = ev.target.closest('form');
  if (!form) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  if (form.dataset.send) {
    ev.preventDefault();
    const run = actionFor(form.dataset.send);
    if (run) { try { await run(form, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); } }
    return;
  }
  if (!form.dataset.form) return;
  /* El diálogo de columnas de la hoja se cierra solo (method="dialog"); si se
     aplicó, la sección recoge las casillas. */
  if (form.dataset.form === 'hoja:columns') { if (ev.submitter && ev.submitter.value === 'ok') actionFor('hoja:columnsApply')?.(form, ctx, ctx.cache[section.id], reload, rerender); return; }
  ev.preventDefault();
  const fn = section.forms && section.forms[form.dataset.form];
  if (!fn) return;
  const msg = form.querySelector('.form-msg'); const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; msg.className = 'form-msg'; msg.textContent = t('common.saving');
  try { const ok = await fn(form, ctx, ctx.cache[section.id], reload); msg.className = 'form-msg ok'; msg.textContent = ok || t('common.saved'); }
  catch (e) { msg.className = 'form-msg bad'; msg.textContent = e.message || t('common.saveFailed'); }
  finally { btn.disabled = false; }
}
for (const host of ['page', 'chat', 'tabbar', 'mas', 'hoja-columnas', 'top']) {
  const el = $(host); if (!el) continue;
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  el.addEventListener('submit', onSubmit);
}
window.addEventListener('hashchange', () => route(false));

/* ---------------------------------------------------------------- el chat
   Se pinta una vez y se queda: su estado vive en `ctx`, así que cambiar de
   sección no se lleva la conversación. En escritorio es una columna; si el
   operador la cerró, se recuerda. En móvil arranca plegado. */
function mountChat() {
  $('chat').innerHTML = chatView(ctx);
  if (chatPreference() === 'closed') closeChat();
  loadHistory(ctx);
}

async function start() {
  renderNav();
  document.body.classList.add('is-booting');
  try {
    ctx.api = await buildApi();
  } catch (e) {
    $('page').innerHTML = `<div class="state"><h2>${esc(t('boot.noSession'))}</h2><p>${esc(e.message)}</p><a class="btn primary" href="../">${esc(t('boot.goToAccount'))}</a></div>`;
    return;
  }
  if (!ctx.api) {
    $('page').innerHTML = `<div class="state"><h2>${esc(t('boot.signIn'))}</h2><p>${esc(t('boot.signInSub'))}</p><a class="btn primary" href="../">${esc(t('boot.goToAccount'))}</a></div>`;
    return;
  }
  let me = null;
  for (let i = 0; i < 6; i += 1) {
    try { me = await ctx.api.me(); break; }
    catch (e) {
      const retryable = e.status === 503 || (e.status === 401 && i === 0);
      if (!retryable || mock) { console.warn('[panel] /auth/me', e); break; }
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  document.body.classList.remove('is-booting');
  if (me) {
    ctx.me = me;
    adoptAccountLocale(me.locale);
    setAccountCurrency(me.currency);
    if (me.waLink || me.comandoNumber) setWaBase(me.waLink || 'https://wa.me/' + String(me.comandoNumber).replace(/\D/g, ''));
    $('wa-top').href = wa(t('wa.whatMattersToday'));
    const name = personName(me, ctx);
    $('user-button').innerHTML = `<span class="avatar" title="${esc(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
    const needsWa = !me.whatsapp || me.whatsapp.status !== 'verified' || params.get('wa') === 'pending';
    if (needsWa) {
      document.body.classList.add('is-setup');
      whatsappStep($('page'), ctx, (s) => {
        document.body.classList.remove('is-setup');
        if (s.waLink || s.comandoNumber) setWaBase(s.waLink || 'https://wa.me/' + String(s.comandoNumber).replace(/\D/g, ''));
        toast(t('boot.waLinked'), 'ok');
        ctx.cache = {};
        mountChat();
        location.hash = s.crmConnected ? '#/hoja' : '#/cuenta';
        route(true);
      });
      return;
    }
    resumePendingConnection(ctx, () => { ctx.cache = {}; route(true); });
  } else if (!mock) {
    $('page').innerHTML = `<div class="state"><h2>${esc(t('boot.notReady'))}</h2><p>${esc(t('boot.reloadSoon'))}</p><button class="btn primary" data-reload>${esc(t('common.retry'))}</button></div>`;
    return;
  }
  mountChat();
  // La vuelta del diálogo de Meta: el engine redirige aquí con ?meta=... El
  // parámetro se limpia de la URL para que recargar no repita el aviso.
  const metaOutcome = params.get('meta');
  if (metaOutcome) {
    toast(metaOutcome === 'connected' ? t('mk.metaOk') : t('mk.metaFailed', { reason: params.get('reason') || '—' }),
      metaOutcome === 'connected' ? 'ok' : 'bad');
    const clean = new URL(location.href);
    clean.searchParams.delete('meta'); clean.searchParams.delete('reason');
    history.replaceState(null, '', clean.toString());
    if (!location.hash) location.hash = '#/marketing';
  }
  // Llegó desde el landing con un plan elegido: se abre el pago sin más
  // pantallas. Solo planes de pago; el gratuito ya lo tiene. Si la pasarela no
  // está lista (503) o el plan no tiene precio (409), se dice y se queda en
  // Cuenta, que es donde se ve el plan actual.
  const planElegido = params.get('plan');
  if (planElegido && !/^(free|gratis)$/i.test(planElegido)) {
    const intervalo = params.get('interval') === 'annual' ? 'annual' : 'monthly';
    const clean = new URL(location.href);
    clean.searchParams.delete('plan'); clean.searchParams.delete('interval');
    history.replaceState(null, '', clean.toString());
    location.hash = '#/cuenta';
    ctx.api.checkout(planElegido, intervalo)
      .then((r) => { if (r && r.url) location.assign(r.url); else toast(t('pago.noDisponible'), 'bad'); })
      .catch((e) => {
        if (e.status === 503) toast(t('pago.noDisponible'));
        else if (e.status === 409) toast(t('pago.sinPrecio'));
        else if (e.status === 403) toast(t('pago.soloDueno'), 'bad');
        else toast(e.message || t('common.failed'), 'bad');
      });
  }
  // La vuelta del pago: la pasarela redirige aquí con ?checkout=ok|cancel.
  const vueltaPago = params.get('checkout');
  if (vueltaPago) {
    toast(vueltaPago === 'ok' ? t('pago.gracias') : t('pago.cancelado'), vueltaPago === 'ok' ? 'ok' : '');
    const clean = new URL(location.href);
    clean.searchParams.delete('checkout');
    history.replaceState(null, '', clean.toString());
    if (!location.hash) location.hash = '#/cuenta';
  }
  // Insignia de Hoy: cuántas cosas esperan al operador (sin bloquear la carga).
  Promise.allSettled([ctx.api.tasks(), ctx.api.approvals(), ctx.api.recommendations(), ctx.api.history()]).then(([tk, a, r, h]) => {
    const arr = (x) => (x.status === 'fulfilled' && Array.isArray(x.value) ? x.value : []);
    const n = arr(tk).filter((x) => x.status === 'open' && (isToday(x.dueAt) || isPast(x.dueAt))).length
      + arr(a).filter((x) => x.status === 'pending').length
      + arr(r).filter((x) => x.status === 'pending').length
      + arr(h).filter((x) => x.status === 'pending').length;
    renderNav(n ? { hoy: n } : {});
  });
  route(true);
}

/**
 * El selector de idioma, arriba a la derecha.
 *
 * Cambia la pantalla al instante y guarda la elección en la cuenta, para que
 * la próxima respuesta de Comando por WhatsApp llegue en el mismo idioma: sería
 * raro leer el panel en portugués y recibir el aviso en castellano.
 */
function mountLanguage() {
  const host = $('lang-host');
  if (!host) return;
  mountLanguagePicker(host, {
    compact: true,
    onChange: (next) => {
      if (!ctx.api || ctx.api.mode === 'mock') return;
      ctx.api
        .raw('/auth/language', { method: 'POST', body: JSON.stringify({ locale: next }) })
        .then(() => { if (ctx.me) ctx.me.locale = next; })
        .catch(() => toast(t('setup.wa.localeFailed'), 'bad'));
    },
  });
}
/** El texto que vive en el HTML de la barra, en el idioma resuelto. */
function paintChrome() {
  const waTop = $('wa-top');
  const label = waTop && waTop.querySelector('span');
  if (label) label.textContent = t('common.writeToComando');
  $('user-button')?.setAttribute('aria-label', t('common.myAccount'));
  const toggle = $('chat-toggle'); if (toggle) { toggle.setAttribute('aria-label', t('chat.title')); toggle.innerHTML = ICON.chat; }
  const banner = $('mock-banner');
  if (banner) banner.innerHTML = `${esc(t('common.mockBanner'))} <a href="./">${esc(t('common.exit'))}</a>`;
  document.querySelectorAll('[aria-label="Secciones"]').forEach((el) => el.setAttribute('aria-label', t('common.sections')));
}
// Un cambio de idioma repinta lo que se ve: el menú, la sección y el chat. Los
// datos ya están en memoria, así que no se vuelve a pedir nada.
onLocaleChange(() => {
  renderNav();
  const section = SECTIONS.find((x) => x.id === currentId());
  if (section) document.title = t('boot.title', { section: section.title });
  if (ctx.me) $('wa-top').href = wa(t('wa.whatMattersToday'));
  paintChrome();
  mountLanguage();
  if ($('chat').innerHTML) { $('chat').innerHTML = chatView(ctx); paintChat(ctx); if (chatPreference() === 'closed') closeChat(); }
  if (ctx.cache[currentId()]) rerender();
});
$('chat-toggle')?.addEventListener('click', () => { if (document.body.classList.contains('chat-hidden')) openChat(true); else closeChat(); });

mountLanguage();
paintChrome();
start();

/* Entrada de /app/panel/: sesión de Clerk (la misma de /app/), datos y navegación.
   - Rutas por hash (#/hoy, #/agenda, #/crm, #/avisos, #/marketing, #/cuenta).
   - `?mock=1` sirve datos de ejemplo sin backend (mock-data.js).
   - Cada sección carga sus datos con Promise.allSettled: una parte que falle o que
     aún no exista en el engine no tumba la página. */

import { createApi, createMockApi } from './api.js?v=10';
import { SECTIONS } from './sections.js?v=12';
import { whatsappStep, resumePendingConnection } from './setup.js?v=7';
import { esc, setWaBase, setAccountCurrency, wa, skeleton, toast, ICON, isToday, isPast, personName } from './ui.js?v=7';
import '../strings.js?v=6';
import { initLocale, adoptAccountLocale, mountLanguagePicker, onLocaleChange, locale, t } from '../i18n.js?v=1';

// El idioma se resuelve ANTES del primer pintado: si se resolviera después, la
// primera pantalla saldría en castellano y cambiaría delante del operador.
initLocale();

const cfg = window.COMANDO_CONFIG || {};
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const mock = params.get('mock');
const ctx = { api: null, clerk: null, user: null, me: null, tabs: {}, cal: null, cache: {} };

/* ---------- sesión ---------- */
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

/* ---------- navegación ---------- */
function currentId() { const m = location.hash.match(/^#\/([a-z]+)/); return m && SECTIONS.some((s) => s.id === m[1]) ? m[1] : 'hoy'; }

function renderNav(badges = {}) {
  const item = (s, cls) => `<a href="#/${s.id}" data-nav="${s.id}" class="${cls}"><span class="nav-ico">${ICON[s.icon] || ''}</span><span class="nav-label">${esc(s.title)}</span>${badges[s.id] ? `<span class="nav-badge" title="${esc(t('nav.badgeTitle', { section: s.title }))}" aria-label="${esc(t('nav.badgeTitle', { section: s.title }))}">${esc(badges[s.id])}</span>` : ''}</a>`;
  $('nav').innerHTML = SECTIONS.map((s) => item(s, '')).join('');
  $('tabbar').innerHTML = SECTIONS.map((s) => item(s, 'tab')).join('');
  markNav();
}
function markNav() { const id = currentId(); document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === id)); }

/* ---------- carga y pintado de una sección ---------- */
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
  $('top-title').textContent = section.title;
  document.title = t('boot.title', { section: section.title });
  markNav();
  if (!ctx.cache[section.id] || force) page.innerHTML = `<div class="stack"><div class="page-head"><div><h1>${esc(section.title)}</h1><p>${esc(section.sub)}</p></div></div>${skeleton(4)}</div>`;
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

/* ---------- interacción: delegación en la página ---------- */
$('page').addEventListener('click', async (ev) => {
  // `el`, no `t`: `t` es la función de traducción y aquí conviven las dos.
  const el = ev.target.closest('[data-tab],[data-cal],[data-act],[data-reload]');
  if (!el) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  if (el.dataset.reload !== undefined) return reload();
  if (el.dataset.tab) { ctx.tabs[section.id] = el.dataset.tab; rerender(); return; }
  if (el.dataset.cal) { section.act.cal(el, ctx, ctx.cache[section.id], reload, rerender); return; }
  // Un desplegable se atiende en `change`, no aquí: al pulsarlo para ABRIRLO el
  // valor todavía es el viejo, así que despacharlo desde el `click` pediría el
  // periodo anterior al elegido.
  if (el.tagName === 'SELECT') return;
  const fn = section.act && section.act[el.dataset.act];
  if (!fn) return;
  if (el.type === 'checkbox') ev.preventDefault();
  try { await fn(el, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); }
});
/*
 * Un `<select>` no se «pulsa»: cambia.
 *
 * La delegación de arriba es por `click`, y con un desplegable eso dispara al
 * abrirlo —cuando el valor todavía es el viejo— y no al elegir. El selector de
 * periodo de Marketing habría quedado inerte o, peor, pidiendo el periodo
 * anterior. Se despacha al mismo sitio, por `change`.
 */
$('page').addEventListener('change', async (ev) => {
  const el = ev.target.closest('select[data-act]');
  if (!el) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  const fn = section.act && section.act[el.dataset.act];
  if (!fn) return;
  try { await fn(el, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); }
});
$('page').addEventListener('submit', async (ev) => {
  const form = ev.target.closest('form');
  if (!form) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  // La consola de comandos no «guarda» nada: encola una frase y espera la
  // respuesta. Por eso lleva `data-send` y no `data-form`: el ciclo de abajo
  // (Guardando… / Guardado) mentiría sobre lo que está pasando.
  if (form.dataset.send) {
    ev.preventDefault();
    const run = section.act && section.act[form.dataset.send];
    if (run) { try { await run(form, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || t('common.failed'), 'bad'); } }
    return;
  }
  if (!form.dataset.form) return;
  ev.preventDefault();
  const fn = section.forms && section.forms[form.dataset.form];
  if (!fn) return;
  const msg = form.querySelector('.form-msg'); const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; msg.className = 'form-msg'; msg.textContent = t('common.saving');
  try { const ok = await fn(form, ctx, ctx.cache[section.id], reload); msg.className = 'form-msg ok'; msg.textContent = ok || t('common.saved'); }
  catch (e) { msg.className = 'form-msg bad'; msg.textContent = e.message || t('common.saveFailed'); }
  finally { btn.disabled = false; }
});
window.addEventListener('hashchange', () => route(false));

/* ---------- arranque ---------- */
async function start() {
  renderNav();
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
  // Datos de cabecera: número de Comando (para los enlaces a WhatsApp) y nombre.
  // Tras crear la cuenta, el webhook de Clerk tarda unos segundos en aprovisionar el
  // tenant; hasta entonces /auth/me responde 401. Se reintenta en vez de fallar.
  let me = null;
  for (let i = 0; i < 20; i += 1) {
    try { me = await ctx.api.me(); break; }
    catch (e) { if (e.status !== 401 || mock) { console.warn('[panel] /auth/me', e); break; } await new Promise((r) => setTimeout(r, 1500)); }
  }
  if (me) {
    ctx.me = me;
    // El idioma que eligió al registrarse manda sobre el del navegador, pero no
    // sobre lo que haya tocado en el selector en esta sesión.
    adoptAccountLocale(me.locale);
    // La moneda de la cuenta, antes del primer pintado y para todo el panel: sin
    // esto solo el resumen de cartera sabía con qué símbolo escribir la plata, y
    // el resto de las pantallas caía en «S/» daba igual dónde estuviera el
    // cliente. Cuando el engine no la sabe llega `null` y no se pinta símbolo.
    setAccountCurrency(me.currency);
    if (me.waLink || me.comandoNumber) setWaBase(me.waLink || 'https://wa.me/' + String(me.comandoNumber).replace(/\D/g, ''));
    $('wa-top').href = wa(t('wa.whatMattersToday'));
    const name = personName(me, ctx);
    $('user-button').innerHTML = `<span class="avatar" title="${esc(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
    $('side-foot').innerHTML = `<b>${esc(name)}</b>${esc(me.whatsapp?.phone || '')}`;
    // Sin WhatsApp verificado no hay nada que mostrar: el paso 2 vive aquí mismo.
    const needsWa = !me.whatsapp || me.whatsapp.status !== 'verified' || params.get('wa') === 'pending';
    if (needsWa) {
      document.body.classList.add('is-setup');
      $('top-title').textContent = t('boot.linkWa');
      whatsappStep($('page'), ctx, (s) => {
        document.body.classList.remove('is-setup');
        if (s.waLink || s.comandoNumber) setWaBase(s.waLink || 'https://wa.me/' + String(s.comandoNumber).replace(/\D/g, ''));
        $('side-foot').innerHTML = `<b>${esc(name)}</b>${esc(s.whatsapp?.phone || '')}`;
        toast(t('boot.waLinked'), 'ok');
        ctx.cache = {};
        location.hash = s.crmConnected ? '#/hoy' : '#/cuenta';
        route(true);
      });
      return;
    }
    // Una conexión de CRM a medio autorizar (OAuth en otra pestaña) se retoma sola.
    resumePendingConnection(ctx, () => { ctx.cache = {}; route(true); });
  } else if (!mock) {
    $('page').innerHTML = `<div class="state"><h2>${esc(t('boot.notReady'))}</h2><p>${esc(t('boot.reloadSoon'))}</p><button class="btn primary" data-reload>${esc(t('common.retry'))}</button></div>`;
    return;
  }
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
  // Insignia de Hoy: cuántas cosas esperan al operador (sin bloquear la carga).
  Promise.allSettled([ctx.api.tasks(), ctx.api.approvals(), ctx.api.recommendations(), ctx.api.history()]).then(([t, a, r, h]) => {
    const arr = (x) => (x.status === 'fulfilled' && Array.isArray(x.value) ? x.value : []);
    const n = arr(t).filter((x) => x.status === 'open' && (isToday(x.dueAt) || isPast(x.dueAt))).length
      + arr(a).filter((x) => x.status === 'pending').length
      + arr(r).filter((x) => x.status === 'pending').length
      + arr(h).filter((x) => x.status === 'pending').length;
    renderNav(n ? { hoy: n } : {});
  });
  route(false);
}

/**
 * El selector de idioma, arriba a la derecha.
 *
 * Cambia la pantalla al instante y guarda la elección en la cuenta, para que
 * la próxima respuesta de Comando por WhatsApp llegue en el mismo idioma: sería
 * raro leer el panel en portugués y recibir el aviso en castellano.
 */
function mountLanguage() {
  const host = document.getElementById('lang-host');
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

// Un cambio de idioma repinta lo que se ve: la navegación, el título y la
// sección. Los datos ya están en memoria, así que no se vuelve a pedir nada.
onLocaleChange(() => {
  renderNav();
  const section = SECTIONS.find((x) => x.id === currentId());
  if (section) {
    $('top-title').textContent = section.title;
    document.title = t('boot.title', { section: section.title });
  }
  const waTop = $('wa-top');
  if (waTop) waTop.href = wa(t('wa.whatMattersToday'));
  paintChrome();
  mountLanguage();
  if (ctx.cache[currentId()]) rerender();
});

/** El texto que vive en el HTML de la barra, en el idioma resuelto. */
function paintChrome() {
  const waTop = $('wa-top');
  const label = waTop && waTop.querySelector('span');
  if (label) label.textContent = t('common.writeToComando');
  const userBtn = $('user-button');
  if (userBtn) userBtn.setAttribute('aria-label', t('common.myAccount'));
  const banner = $('mock-banner');
  if (banner) banner.innerHTML = `${esc(t('common.mockBanner'))} <a href="./">${esc(t('common.exit'))}</a>`;
  document.querySelectorAll('[aria-label="Secciones"]').forEach((el) => el.setAttribute('aria-label', t('common.sections')));
}

mountLanguage();
paintChrome();
start();

/* Entrada de /app/panel/: sesión de Clerk (la misma de /app/), datos y navegación.
   - Rutas por hash (#/hoy, #/agenda, #/crm, #/avisos, #/marketing, #/cuenta).
   - `?mock=1` sirve datos de ejemplo sin backend (mock-data.js).
   - Cada sección carga sus datos con Promise.allSettled: una parte que falle o que
     aún no exista en el engine no tumba la página. */

import { createApi, createMockApi } from './api.js?v=2';
import { SECTIONS } from './sections.js?v=2';
import { esc, setWaBase, wa, skeleton, toast, ICON, isToday, isPast } from './ui.js?v=2';

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
  await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar la sesión.')); document.head.appendChild(s); });
  await window.Clerk.load({ localization: { locale: 'es-ES' } });
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
  const item = (s, cls) => `<a href="#/${s.id}" data-nav="${s.id}" class="${cls}"><span class="nav-ico">${ICON[s.icon] || ''}</span><span class="nav-label">${esc(s.title)}</span>${badges[s.id] ? `<span class="nav-badge">${esc(badges[s.id])}</span>` : ''}</a>`;
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
  document.title = 'Comando — ' + section.title;
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
    page.innerHTML = `<div class="state"><h2>No pudimos cargar esta parte</h2><p>${esc(e.message)}</p><button class="btn primary" data-reload>Reintentar</button></div>`;
  }
}
const rerender = () => { const section = SECTIONS.find((s) => s.id === currentId()); $('page').innerHTML = section.view(ctx.cache[section.id], ctx); };
const reload = () => route(true);

/* ---------- interacción: delegación en la página ---------- */
$('page').addEventListener('click', async (ev) => {
  const t = ev.target.closest('[data-tab],[data-cal],[data-act],[data-reload]');
  if (!t) return;
  const section = SECTIONS.find((s) => s.id === currentId());
  if (t.dataset.reload !== undefined) return reload();
  if (t.dataset.tab) { ctx.tabs[section.id] = t.dataset.tab; rerender(); return; }
  if (t.dataset.cal) { section.act.cal(t, ctx, ctx.cache[section.id], reload, rerender); return; }
  const fn = section.act && section.act[t.dataset.act];
  if (!fn) return;
  if (t.type === 'checkbox') ev.preventDefault();
  try { await fn(t, ctx, ctx.cache[section.id], reload, rerender); } catch (e) { toast(e.message || 'No se pudo', 'bad'); }
});
$('page').addEventListener('submit', async (ev) => {
  const form = ev.target.closest('form[data-form]');
  if (!form) return;
  ev.preventDefault();
  const section = SECTIONS.find((s) => s.id === currentId());
  const fn = section.forms && section.forms[form.dataset.form];
  if (!fn) return;
  const msg = form.querySelector('.form-msg'); const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; msg.className = 'form-msg'; msg.textContent = 'Guardando…';
  try { const ok = await fn(form, ctx, ctx.cache[section.id], reload); msg.className = 'form-msg ok'; msg.textContent = ok || 'Guardado.'; }
  catch (e) { msg.className = 'form-msg bad'; msg.textContent = e.message || 'No se pudo guardar.'; }
  finally { btn.disabled = false; }
});
window.addEventListener('hashchange', () => route(false));

/* ---------- arranque ---------- */
async function start() {
  renderNav();
  try {
    ctx.api = await buildApi();
  } catch (e) {
    $('page').innerHTML = `<div class="state"><h2>No pudimos cargar tu sesión</h2><p>${esc(e.message)}</p><a class="btn primary" href="../">Ir a mi cuenta</a></div>`;
    return;
  }
  if (!ctx.api) {
    $('page').innerHTML = `<div class="state"><h2>Inicia sesión para ver tu panel</h2><p>Usa la misma cuenta con la que registraste tu WhatsApp.</p><a class="btn primary" href="../">Ir a mi cuenta</a></div>`;
    return;
  }
  // Datos de cabecera: número de Comando (para los enlaces a WhatsApp) y nombre.
  try {
    const me = await ctx.api.me();
    ctx.me = me;
    if (me.waLink || me.comandoNumber) setWaBase(me.waLink || 'https://wa.me/' + String(me.comandoNumber).replace(/\D/g, ''));
    $('wa-top').href = wa('qué merece mi atención hoy');
    if (me.whatsapp && me.whatsapp.status !== 'verified' && !mock) {
      $('page').innerHTML = `<div class="state"><h2>Primero vincula tu WhatsApp</h2><p>El panel muestra lo que Comando hace por ti desde WhatsApp; sin número vinculado no hay nada que mostrar todavía.</p><a class="btn primary" href="../">Vincular WhatsApp</a></div>`;
      return;
    }
    const name = me.name || ctx.user?.firstName || 'Tu cuenta';
    $('user-button').innerHTML = `<span class="avatar" title="${esc(name)}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
    $('side-foot').innerHTML = `<b>${esc(name)}</b>${esc(me.whatsapp?.phone || '')}`;
  } catch (e) { console.warn('[panel] /auth/me', e); }
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

start();

/* Entrada de /app/panel/: sesión de Clerk (la misma de /app/), datos y navegación.
   - Rutas por hash (#/hoy, #/recordatorios, …) para que cada sección tenga enlace.
   - `?mock=1` sirve datos de ejemplo sin backend (mock-data.js).
   - Cada sección carga sus datos con Promise.allSettled: una parte que falle o que
     aún no exista en el engine no tumba la página. */

import { createApi, createMockApi } from './api.js?v=1';
import { SECTIONS, GROUPS } from './sections.js?v=1';
import { esc, setWaBase, wa, skeleton, toast, ICON } from './ui.js?v=1';

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
  try { clerk.mountUserButton($('user-button'), { afterSignOutUrl: '../' }); } catch (e) { /* sin botón */ }
  return createApi(cfg, (skipCache) => clerk.session.getToken({ template: cfg.clerkJwtTemplate, skipCache: skipCache === true }));
}

/* ---------- navegación ---------- */
function currentId() { const m = location.hash.match(/^#\/([a-z]+)/); return m && SECTIONS.some((s) => s.id === m[1]) ? m[1] : 'hoy'; }

function renderNav(badges = {}) {
  const nav = $('nav');
  nav.innerHTML = GROUPS.map((g) => `<div class="nav-group">${esc(g)}</div>` + SECTIONS.filter((s) => s.group === g).map((s) => `<a href="#/${s.id}" data-nav="${s.id}"><span class="nav-ico">${ICON[s.icon] || ''}</span><span>${esc(s.title)}</span>${badges[s.id] ? `<span class="nav-badge ${badges[s.id].red ? 'is-red' : ''}">${esc(badges[s.id].n)}</span>` : s.isNew ? '<span class="nav-new">NUEVO</span>' : ''}</a>`).join('')).join('');
  markNav();
}
function markNav() { const id = currentId(); document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('is-on', a.dataset.nav === id)); }
function openSide(open) { $('side').classList.toggle('is-open', open); $('scrim').hidden = !open; }

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
  markNav(); openSide(false);
  if (!ctx.cache[section.id] || force) page.innerHTML = `<div class="stack"><div class="page-head"><div><h1>${esc(section.title)}</h1><p>${esc(section.sub)}</p></div></div>${skeleton(5)}</div>`;
  try {
    const data = await loadSection(section, force);
    if (token !== renderToken) return;
    page.innerHTML = section.view(data, ctx);
    page.dataset.section = section.id;
    window.scrollTo({ top: 0 });
  } catch (e) {
    if (token !== renderToken) return;
    page.innerHTML = `<div class="state"><h2>No pudimos cargar esta sección</h2><p>${esc(e.message)}</p><button class="btn primary" data-reload>Reintentar</button></div>`;
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

$('top-menu').addEventListener('click', () => openSide(true));
/* búsqueda de secciones (⌘K) */
const sInput = $('search-input'); const sList = $('search-list');
function searchRender() {
  const q = sInput.value.trim().toLowerCase();
  const hits = SECTIONS.filter((s) => !q || (s.title + ' ' + s.sub).toLowerCase().includes(q)).slice(0, 8);
  sList.innerHTML = hits.map((s, i) => `<a href="#/${s.id}" class="${i === 0 ? 'is-on' : ''}">${esc(s.title)}</a>`).join('') || '<a>Sin resultados</a>';
  sList.hidden = !document.activeElement || document.activeElement !== sInput;
}
sInput.addEventListener('input', searchRender);
sInput.addEventListener('focus', searchRender);
sInput.addEventListener('blur', () => setTimeout(() => { sList.hidden = true; }, 150));
sInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = sList.querySelector('a[href]'); if (a) { location.hash = a.getAttribute('href'); sInput.value = ''; sInput.blur(); } } if (e.key === 'Escape') sInput.blur(); });
window.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); sInput.focus(); } });
$('side-close').addEventListener('click', () => openSide(false));
$('scrim').addEventListener('click', () => openSide(false));
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
  // Datos de cabecera: plan, número de Comando (para los enlaces a WhatsApp), pendientes.
  try {
    const me = await ctx.api.me();
    ctx.me = me;
    if (me.waLink || me.comandoNumber) setWaBase(me.waLink || 'https://wa.me/' + String(me.comandoNumber).replace(/\D/g, ''));
    const PLAN = { gratis: 'Gratis', free: 'Gratis', basico: 'Básico', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    $('plan-chip').innerHTML = `Plan <b>${esc(PLAN[String(me.plan || '').toLowerCase()] || me.plan || '—')}</b>`;
    $('plan-chip').hidden = false;
    $('wa-top').href = wa('qué merece mi atención hoy');
    if (me.whatsapp && me.whatsapp.status !== 'verified' && !mock) {
      $('page').innerHTML = `<div class="state"><h2>Primero vincula tu WhatsApp</h2><p>El panel muestra lo que Comando hace por ti desde WhatsApp; sin número vinculado no hay nada que mostrar todavía.</p><a class="btn primary" href="../">Vincular WhatsApp</a></div>`;
      return;
    }
    if (mock) { $('user-button').innerHTML = `<div class="avatar" title="${esc(me.name)}">${esc((me.name || 'C').slice(0, 1))}</div>`; }
    $('side-foot').innerHTML = `<b>${esc(me.name || ctx.user?.firstName || 'Tu cuenta')}</b><br>${esc(me.whatsapp?.phone || '')}`;
  } catch (e) { console.warn('[panel] /auth/me', e); }
  // Insignias de la barra lateral: tareas de hoy y aprobaciones pendientes (sin bloquear).
  Promise.allSettled([ctx.api.tasks(), ctx.api.approvals(), ctx.api.recommendations()]).then(([t, a, r]) => {
    const badges = {};
    const tasks = t.status === 'fulfilled' && Array.isArray(t.value) ? t.value : [];
    const dueToday = tasks.filter((x) => x.status === 'open' && new Date(x.dueAt).toDateString() === new Date().toDateString()).length;
    if (dueToday) badges.recordatorios = { n: dueToday };
    const aps = a.status === 'fulfilled' && Array.isArray(a.value) ? a.value.filter((x) => x.status === 'pending').length : 0;
    if (aps) badges.aprobaciones = { n: aps, red: true };
    const recs = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value.filter((x) => x.status === 'pending').length : 0;
    if (recs) badges.hoy = { n: recs };
    if (recs) { $('bell-badge').textContent = recs; $('bell-badge').hidden = false; }
    renderNav(badges);
  });
  route(false);
}

start();

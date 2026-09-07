/* Utilidades de presentación del panel: escape, formatos por idioma, chips,
   enlaces a WhatsApp con la frase lista para pedirle a Comando, toasts.
   Lo único que importa: el diccionario. */
import { t, locale, localeTag } from '../i18n.js?v=1';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const SYMBOL = { PEN: 'S/', USD: '$', MXN: 'MX$', COP: 'COP$', CLP: 'CLP$', ARS: 'AR$', BRL: 'R$', UYU: '$U', BOB: 'Bs', PYG: '₲', CRC: '₡', GTQ: 'Q', DOP: 'RD$', EUR: '€' };
export function num(n) { if (n == null || Number.isNaN(Number(n))) return t('common.dash'); return Number(n).toLocaleString(localeTag()); }

/* ---------- la moneda de la cuenta ----------
   `/auth/me` la trae resuelta (declarada por el cliente o traída por el CRM) y
   panel.js la deja aquí una vez, igual que el número de WhatsApp con
   `setWaBase()`. Es el RESPALDO de todo el panel: sin ella, media pantalla se
   quedaba sin símbolo porque solo el resumen de cartera sabía la moneda, y las
   demás partes (salud del CRM, umbrales de aviso) traen importes a secas. */
let account = null;
export function setAccountCurrency(code) {
  account = /^[A-Za-z]{3}$/.test(String(code || '')) ? String(code).toUpperCase() : null;
}
export const accountCurrency = () => account;

/**
 * Un importe con su moneda.
 *
 * Primero la que traiga el dato (la cartera dice en qué moneda están sus
 * negocios), y si no la de la cuenta. Antes esto tenía `PEN` por defecto: un
 * cliente en dólares veía «S/ 12.000» sobre cifras que su CRM guarda en USD, y
 * no hay nada peor que una cifra bien traída con la moneda equivocada. Cuando
 * no se sabe ninguna de las dos NO se inventa símbolo: se enseña la cifra sola,
 * que es incompleto pero no es mentira.
 */
export function money(n, currency) {
  if (n == null) return t('common.dash');
  const code = currency || account;
  const amount = num(Math.round(n));
  return code ? (SYMBOL[code] || code) + ' ' + amount : amount;
}
export function pct(x, digits = 0) { if (x == null) return t('common.dash'); return (x * 100).toLocaleString(localeTag(), { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' %'; }
export function compact(n) {
  if (n == null) return t('common.dash');
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString(localeTag(), { maximumFractionDigits: 1 }) + ' ' + t('ui.million');
  if (a >= 1e3) return Math.round(n / 1e3) + ' ' + t('ui.thousand');
  return num(n);
}

const dow = () => t('ui.dow').split(',');
const months = () => t('ui.months').split(',');
export function fmtTime(iso) { const d = new Date(iso); return d.toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit', hour12: locale() === 'en' }); }
export function fmtDate(iso, withYear) {
  const d = new Date(iso);
  const month = months()[d.getMonth()].slice(0, 3);
  // En inglés el mes va delante; en castellano y portugués, detrás.
  const core = locale() === 'en' ? `${month} ${d.getDate()}` : `${d.getDate()} ${month}`;
  return `${core}${withYear ? ' ' + d.getFullYear() : ''}`;
}
export function fmtDateTime(iso) { return `${dow()[new Date(iso).getDay()]} ${fmtDate(iso)} · ${fmtTime(iso)}`; }
export function monthName(d) { return `${months()[d.getMonth()]} ${d.getFullYear()}`; }
export function dayLabel(d) { return t('ui.dayLabel', { dow: dow()[d.getDay()], day: d.getDate(), month: months()[d.getMonth()] }); }
export function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function rel(iso) {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff); const past = diff < 0;
  const unit = abs < 3.6e6 ? [Math.round(abs / 6e4), t('ui.min')] : abs < 8.64e7 ? [Math.round(abs / 3.6e6), t('ui.hour')] : [Math.round(abs / 8.64e7), t('ui.day')];
  const when = unit[0] + ' ' + unit[1];
  return past ? t('ui.ago', { t: when }) : t('ui.in', { t: when });
}
export function isToday(iso) { return sameDay(new Date(iso), new Date()); }
export function isPast(iso) { return new Date(iso).getTime() < Date.now(); }
export function isoDay(d) { return d.toISOString().slice(0, 10); }

/* ---------- quién es el cliente ----------
   Una sola forma de resolver el nombre para TODO el panel. Hoy `/auth/me` no
   devuelve `name` ni `email` (el engine sirve `signup_status`, que solo trae
   plan, WhatsApp y locale), así que sin este orden cada pantalla se inventaba
   el suyo: la barra lateral caía en Clerk y ponía «Sergio», y el saludo de Hoy
   caía en un literal y ponía «Buenas tardes, operador» al mismo cliente. */
export const personName = (me, ctx) => (me && me.name) || (ctx && ctx.user && (ctx.user.fullName || ctx.user.firstName)) || t('boot.yourAccount');
export const personEmail = (me, ctx) => (me && me.email) || (ctx && ctx.user && ctx.user.primaryEmailAddress && ctx.user.primaryEmailAddress.emailAddress) || '';

/* ---------- WhatsApp: cada widget puede pedir lo mismo por chat ---------- */
let waBase = 'https://wa.me/';
export function setWaBase(link) { if (link) waBase = link.replace(/\?.*$/, ''); }
export const wa = (phrase) => waBase + (phrase ? '?text=' + encodeURIComponent(phrase) : '');
export function waBtn(phrase, label, cls = 'btn sm wa') {
  label = label ?? t('common.askOnWhatsApp');
  return `<a class="${cls}" href="${wa(phrase)}" target="_blank" rel="noopener" title="${esc(phrase)}">${ICON.wa}${esc(label)}</a>`;
}
export function askLine(phrase, prefix) {
  prefix = prefix ?? t('common.onWhatsApp');
  return `<div class="ask-line">${esc(prefix)} <q>${esc(phrase)}</q> <a href="${wa(phrase)}" target="_blank" rel="noopener">${esc(t('common.send'))}</a></div>`;
}

/* ---------- piezas ---------- */
export const chip = (text, kind = '') => `<span class="chip ${kind}">${esc(text)}</span>`;
const SEVERITY_KIND = { critical: 'bad', high: 'bad', warning: 'warn', info: 'info', ok: 'ok' };
export const sevChip = (s) => chip(SEVERITY_KIND[s] ? t('sev.' + s) : s, SEVERITY_KIND[s] || '');
const SIGNAL_TYPES = new Set([
  'deal_inactive', 'close_date_approaching', 'close_date_overdue', 'missing_next_step', 'overdue_task',
  'stage_stalled', 'high_value_attention', 'missing_owner', 'missing_critical_data', 'reconcile_age_hours',
  'duplicate_records', 'stale_records', 'unassigned_records', 'open_tasks', 'signal_count',
]);
export const signalLabel = (type) => (SIGNAL_TYPES.has(type) ? t('signal.' + type) : type);
/** Cómo se lee cada señal como frase «te avisa cuando…» (sin la palabra «señal»). */
export const SIGNAL_PHRASE = {
  deal_inactive: (th) => t('phrase.deal_inactive', { days: th.inactiveDays }),
  close_date_approaching: (th) => t('phrase.close_date_approaching', { days: th.closeDateApproachingDays }),
  close_date_overdue: () => t('phrase.close_date_overdue'),
  missing_next_step: () => t('phrase.missing_next_step'),
  overdue_task: () => t('phrase.overdue_task'),
  stage_stalled: (th) => t('phrase.stage_stalled', { days: th.stageStalledDays }),
  high_value_attention: (th, amount) => t('phrase.high_value_attention', { amount }),
  missing_owner: () => t('phrase.missing_owner'),
  missing_critical_data: () => t('phrase.missing_critical_data'),
};
/**
 * El umbral de «negocio grande», en la moneda de la cuenta.
 *
 * `thresholds.highValue` es un mapa por moneda (`{mode, PEN: …, USD: …}`), y
 * antes se leía siempre la clave `PEN`: a un cliente en dólares le salía «desde
 * —» porque su umbral está bajo `USD`. Se busca su moneda —la del dato, y si no
 * la de la cuenta— y, si no se sabe cuál es, se usa la única que el engine
 * tenga para ese tenant.
 */
export function highValueAmount(thresholds, currency) {
  const hv = (thresholds && thresholds.highValue) || {};
  const currencies = Object.keys(hv).filter((k) => /^[A-Z]{3}$/.test(k) && typeof hv[k] === 'number');
  const mine = currency || account;
  const key = mine && currencies.includes(mine) ? mine : currencies[0];
  return key ? money(hv[key], key) : money(null);
}

const COMMAND_TYPES = new Set([
  'TAG', 'UNTAG', 'UPDATE_FIELD', 'BROADCAST', 'NOTE', 'ASSIGN', 'MOVE_STAGE', 'CREATE_TASK', 'CANCEL_TASK',
  'NOTIFY', 'GENERATE_REPORT', 'CREATE_AUTOMATION_RULE', 'CREATE_AGENT_RULE', 'PAUSE_AUTOMATION',
  'RESUME_AUTOMATION', 'UPDATE_MONEY', 'APPLY_DISCOUNT', 'CREATE_RECORD',
]);
export const commandLabel = (type) => (COMMAND_TYPES.has(type) ? t('cmd.' + type) : type);
const STATUS_KIND = {
  executed: 'ok', pending: 'warn', awaiting_approval: 'warn', cancelled: '', failed: 'bad', declined: '',
  expired: '', approved: 'ok', rejected: 'bad', active: 'ok', paused: 'warn', sent: 'ok', deferred: 'info',
  suppressed: '', open: '', completed: 'ok', snoozed: 'info', verified: 'ok', soon: 'soon',
};
export const statusLabel = (s) => (s in STATUS_KIND ? t('status.' + s) : s);
export const statusChip = (s) => chip(statusLabel(s), STATUS_KIND[s] || '');

export function bar(label, value, max, opts = {}) {
  const w = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `<div class="bar"><span title="${esc(label)}">${esc(label)}</span><div class="bar-track"><div class="bar-fill ${opts.cls || ''}" style="width:${w}%"></div></div><span class="bar-val">${opts.text || `<b>${num(value)}</b>`}</span></div>`;
}
export function spark(values, cls = '') {
  const max = Math.max(...values, 1);
  return `<div class="spark ${cls}" aria-hidden="true">${values.map((v) => `<i style="height:${Math.max(8, Math.round((v / max) * 100))}%"></i>`).join('')}</div>`;
}
export function kpi(label, value, sub, opts = {}) {
  return `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-row"><div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-sub ${opts.subCls || ''}">${sub}</div>` : ''}</div>${opts.spark || ''}</div></div>`;
}
export function card(title, body, opts = {}) {
  return `<section class="card ${opts.cls || ''}"><div class="card-head"><div><h2>${esc(title)}</h2>${opts.sub ? `<p>${opts.sub}</p>` : ''}</div>${opts.more ? `<a class="more" href="${opts.moreHref || '#'}">${esc(opts.more)}</a>` : ''}${opts.right || ''}</div>${body}</section>`;
}
/** Un elemento de lista: icono, texto, UNA acción principal y lo demás plegado en «más». */
export function row({ ico = '•', cls = '', title = '', sub = '', meta = '', side = '', primary = '', more = '', attrs = '', done = false }) {
  return `<div class="row ${done ? 'is-done' : ''}" ${attrs}><div class="row-ico ${cls}">${ico}</div><div class="row-body"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}${meta ? `<div class="row-meta">${meta}</div>` : ''}</div>${side || primary ? `<div class="row-actions">${side}${primary}</div>` : ''}${more ? moreBox(more) : ''}</div>`;
}
export const moreBox = (html, label) => `<details class="more"><summary>${esc(label ?? t('common.more'))}</summary><div class="more-body">${html}</div></details>`;
export function empty(title, text) { return `<div class="empty"><b>${esc(title ?? t('common.none'))}</b>${esc(text || '')}</div>`; }
/** Estado de una parte del panel cuyo endpoint aún no está en el engine. */
export function soon(what, phrase, extra = '') {
  const line = t('common.comingSoon', { what: '\u0000' }).split('\u0000');
  return `<div class="soon-box">${esc(line[0] || '')}<b>${esc(what ?? t('common.thisPart'))}</b>${esc(line[1] || '')}${extra ? ' ' + esc(extra) : ''}${phrase ? `<div class="ask">${askLine(phrase, t('common.meanwhileAsk'))}</div>` : ''}</div>`;
}
export function skeleton(n = 4) { return `<div class="skel">${'<i></i>'.repeat(n)}</div>`; }

export function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg; el.setAttribute('role', 'status');
  document.body.appendChild(el); setTimeout(() => el.remove(), 3200);
}

export const ICON = {
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 3.9A10 10 0 0 0 3.2 16.2L2 22l5.9-1.5A10 10 0 0 0 20 3.9zm-8 16.4a8.3 8.3 0 0 1-4.2-1.2l-.3-.2-3.5.9.9-3.4-.2-.3A8.3 8.3 0 1 1 12 20.3zm4.6-6.2c-.3-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.8 6.8 0 0 1-3.4-3c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  funnel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.5V19l4 2v-8.5z"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z"/></svg>',
  history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  mega: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12"/></svg>',
  bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4M8 4h8M8 14h.01M16 14h.01M9 17h6"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
};

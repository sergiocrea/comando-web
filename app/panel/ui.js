/* Utilidades de presentación del panel: escape, formatos LatAm, chips, enlaces a
   WhatsApp con la frase lista para pedirle a Comando, toasts. Sin dependencias. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SYMBOL = { PEN: 'S/', USD: '$', MXN: 'MX$', COP: 'COP$', CLP: 'CLP$', ARS: 'AR$', BRL: 'R$' };
export function num(n) { if (n == null || Number.isNaN(Number(n))) return '—'; return Number(n).toLocaleString('es-PE').replace(/,/g, '.'); }
export function money(n, currency = 'PEN') { if (n == null) return '—'; return (SYMBOL[currency] || currency) + ' ' + num(Math.round(n)); }
export function pct(x, digits = 0) { if (x == null) return '—'; return (x * 100).toFixed(digits).replace('.', ',') + ' %'; }
export function compact(n) { if (n == null) return '—'; const a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' M'; if (a >= 1e3) return Math.round(n / 1e3) + ' k'; return num(n); }

const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fmtTime(iso) { const d = new Date(iso); return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }); }
export function fmtDate(iso, withYear) { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}${withYear ? ' ' + d.getFullYear() : ''}`; }
export function fmtDateTime(iso) { return `${DOW[new Date(iso).getDay()]} ${fmtDate(iso)} · ${fmtTime(iso)}`; }
export function monthName(d) { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
export function dayLabel(d) { return `${DOW[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
export function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
export function rel(iso) {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff); const past = diff < 0;
  const unit = abs < 3.6e6 ? [Math.round(abs / 6e4), 'min'] : abs < 8.64e7 ? [Math.round(abs / 3.6e6), 'h'] : [Math.round(abs / 8.64e7), 'd'];
  const t = unit[0] + ' ' + unit[1];
  return past ? 'hace ' + t : 'en ' + t;
}
export function isToday(iso) { return sameDay(new Date(iso), new Date()); }
export function isPast(iso) { return new Date(iso).getTime() < Date.now(); }
export function isoDay(d) { return d.toISOString().slice(0, 10); }

/* ---------- WhatsApp: cada widget puede pedir lo mismo por chat ---------- */
let waBase = 'https://wa.me/';
export function setWaBase(link) { if (link) waBase = link.replace(/\?.*$/, ''); }
export const wa = (phrase) => waBase + (phrase ? '?text=' + encodeURIComponent(phrase) : '');
export function waBtn(phrase, label = 'Pedir por WhatsApp', cls = 'btn sm wa') {
  return `<a class="${cls}" href="${wa(phrase)}" target="_blank" rel="noopener" title="${esc(phrase)}">${ICON.wa}${esc(label)}</a>`;
}
export function askLine(phrase, prefix = 'Por WhatsApp:') {
  return `<div class="ask-line">${esc(prefix)} <q>${esc(phrase)}</q> <a href="${wa(phrase)}" target="_blank" rel="noopener">enviar</a></div>`;
}

/* ---------- piezas ---------- */
export const chip = (text, kind = '') => `<span class="chip ${kind}">${esc(text)}</span>`;
export const SEVERITY = { critical: ['Crítico', 'bad'], high: ['Alta', 'bad'], warning: ['Media', 'warn'], info: ['Baja', 'info'], ok: ['Bien', 'ok'] };
export const sevChip = (s) => { const [t, k] = SEVERITY[s] || [s, '']; return chip(t, k); };
export const SIGNALS = {
  deal_inactive: 'Negocio inactivo', close_date_approaching: 'Cierre próximo', close_date_overdue: 'Cierre vencido', missing_next_step: 'Sin siguiente paso',
  overdue_task: 'Tarea vencida', stage_stalled: 'Estancado en etapa', high_value_attention: 'Alto valor', missing_owner: 'Sin dueño', missing_critical_data: 'Datos incompletos',
  reconcile_age_hours: 'Sincronización', duplicate_records: 'Duplicados', stale_records: 'Sin actividad', unassigned_records: 'Sin dueño', open_tasks: 'Tareas abiertas', signal_count: 'Señal',
};
export const signalLabel = (t) => SIGNALS[t] || t;
/** Cómo se lee cada señal como frase «te avisa cuando…» (sin la palabra «señal»). */
export const SIGNAL_PHRASE = {
  deal_inactive: (th) => `un negocio lleva ${th.inactiveDays} días sin que nadie lo toque`,
  close_date_approaching: (th) => `un negocio cierra en menos de ${th.closeDateApproachingDays} días`,
  close_date_overdue: () => 'pasó la fecha de cierre y el negocio sigue abierto',
  missing_next_step: () => 'un negocio se queda sin siguiente paso',
  overdue_task: () => 'se te vence una tarea',
  stage_stalled: (th) => `un negocio lleva ${th.stageStalledDays} días en la misma etapa`,
  high_value_attention: (th, cur) => `un negocio grande (desde ${cur}) necesita atención`,
  missing_owner: () => 'entra un contacto o negocio sin dueño',
  missing_critical_data: () => 'un negocio está sin monto, etapa o fecha de cierre',
};
export const COMMAND_LABELS = {
  TAG: 'Etiquetar', UNTAG: 'Quitar etiqueta', UPDATE_FIELD: 'Actualizar campo', BROADCAST: 'Enviar plantilla', NOTE: 'Nota', ASSIGN: 'Asignar', MOVE_STAGE: 'Mover etapa',
  CREATE_TASK: 'Crear tarea', CANCEL_TASK: 'Cancelar tarea', NOTIFY: 'Aviso', GENERATE_REPORT: 'Reporte', CREATE_AUTOMATION_RULE: 'Regla por evento', CREATE_AGENT_RULE: 'Aviso con cadencia',
  PAUSE_AUTOMATION: 'Pausar', RESUME_AUTOMATION: 'Reanudar', UPDATE_MONEY: 'Montos', APPLY_DISCOUNT: 'Descuento', CREATE_RECORD: 'Crear registro',
};
export const STATUS = {
  executed: ['Ejecutado', 'ok'], pending: ['Esperando CONFIRMAR', 'warn'], awaiting_approval: ['Esperando aprobación', 'warn'], cancelled: ['Cancelado', ''],
  failed: ['Falló · revertido', 'bad'], declined: ['No se pudo', ''], expired: ['Venció', ''], approved: ['Aprobado', 'ok'], rejected: ['Rechazado', 'bad'],
  active: ['Activa', 'ok'], paused: ['Pausada', 'warn'], sent: ['Enviado', 'ok'], deferred: ['Diferido', 'info'], suppressed: ['No enviado', ''],
  open: ['Abierta', ''], completed: ['Hecha', 'ok'], snoozed: ['Pospuesta', 'info'], verified: ['Verificado', 'ok'], soon: ['Próximamente', 'soon'],
};
export const statusChip = (s) => { const [t, k] = STATUS[s] || [s, '']; return chip(t, k); };

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
export const moreBox = (html, label = 'más') => `<details class="more"><summary>${esc(label)}</summary><div class="more-body">${html}</div></details>`;
export function empty(title, text) { return `<div class="empty"><b>${esc(title)}</b>${esc(text || '')}</div>`; }
/** Estado de una parte del panel cuyo endpoint aún no está en el engine. */
export function soon(what, phrase, extra = '') {
  return `<div class="soon-box"><b>${esc(what)}</b> se activa en tu cuenta muy pronto.${extra ? ' ' + esc(extra) : ''}${phrase ? `<div class="ask">${askLine(phrase, 'Mientras tanto, pídelo por WhatsApp:')}</div>` : ''}</div>`;
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

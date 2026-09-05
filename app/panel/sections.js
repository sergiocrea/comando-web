/* Secciones del panel (seis). Cada una declara: qué carga (`load`), cómo se ve (`view`) y qué
   hace al hacer clic (`act`). Los datos llegan resueltos por panel.js: cada clave es el
   valor, un Error, o `{pending:true}` si el endpoint todavía no existe en el engine.
   Reglas de producto:
   - todo lo que el panel muestra se puede pedir también por WhatsApp, y cualquier escritura
     en el CRM sigue pasando por la vista previa y CONFIRMAR;
   - una sola acción principal por fila; lo demás va dentro de «más»;
   - vocabulario del operador (plata en juego, parado, sin dueño, repetidos), nunca del sistema. */

import { isPending } from './api.js?v=4';
import { crmBlock, crmActions, whatsappStep } from './setup.js?v=4';
import {
  esc, num, money, pct, fmtTime, fmtDate, fmtDateTime, monthName, dayLabel, sameDay, rel, isToday, isPast, isoDay,
  wa, waBtn, askLine, chip, statusChip, bar, spark, kpi, card, row, moreBox, empty, soon, toast, ICON, SIGNAL_PHRASE,
} from './ui.js?v=4';

/** Renderiza una parte según el estado de su dato. */
function part(v, fn, opts = {}) {
  if (v instanceof Error) return `<div class="empty"><b>No se pudo cargar</b>${esc(v.message)}</div>`;
  if (isPending(v)) return soon(opts.what || 'Esta parte', opts.phrase, opts.extra);
  if (v == null) return empty('Sin datos');
  return fn(v);
}
const list = (items, fn, emptyMsg) => (items && items.length ? `<div class="list">${items.map(fn).join('')}</div>` : empty(emptyMsg || 'Nada por aquí'));
const val = (v, fallback) => (v instanceof Error || isPending(v) || v == null ? fallback : v);
const phoneLink = (phone, label) => `<a class="btn sm primary" href="https://wa.me/${esc(String(phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${ICON.wa}${esc(label)}</a>`;
const head = (title, sub, actions = '') => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
const syncLine = (s) => {
  if (!s) return '';
  const age = s.reconcileAgeHours < 1 ? Math.round(s.reconcileAgeHours * 60) + ' min' : Math.round(s.reconcileAgeHours) + ' h';
  return s.reconcileAgeHours > 30 ? chip(`${s.provider} sin actualizar hace ${age}`, 'bad') : chip(`${s.provider} al día · hace ${age}`, 'ok');
};

/* ------------------------------------------------------------- filas comunes */
function taskRow(t) {
  const late = t.status === 'open' && isPast(t.dueAt) && !isToday(t.dueAt);
  const open = t.status === 'open';
  return row({
    ico: t.kind === 'visit' ? '📍' : '⏰', cls: late ? 'warning' : t.kind === 'visit' ? 'info' : '',
    title: esc(t.title), done: !open, attrs: `data-task="${esc(t.id)}"`,
    sub: `${esc(isToday(t.dueAt) ? 'Hoy ' + fmtTime(t.dueAt) : fmtDateTime(t.dueAt))}${t.recordName ? ` · ${esc(t.recordName)}` : ''}${late ? ` · <span class="sev-warning">vencida ${esc(rel(t.dueAt))}</span>` : ''}`,
    primary: open ? `<button class="btn sm primary" data-act="task:done" data-id="${esc(t.id)}">Hecha</button>` : statusChip(t.status),
    more: open ? `${waBtn('mueve «' + t.title + '» para ', 'Mover')}${waBtn('cancela la tarea «' + t.title + '»', 'Cancelar', 'btn sm ghost')}` : '',
  });
}
function recRow(r) {
  const sev = r.signals && r.signals[0] ? r.signals[0].severity : 'info';
  const name = r.subject && r.subject.name ? r.subject.name : r.title;
  const primary = r.subject && r.subject.phone ? phoneLink(r.subject.phone, 'Escribirle a ' + (r.subject.contact || 'cliente')) : waBtn('muéstrame ' + name, 'Ver detalle', 'btn sm primary');
  return row({
    ico: sev === 'high' || sev === 'critical' ? '🔥' : sev === 'warning' ? '⚠️' : 'ℹ️', cls: sev,
    title: esc(r.title), sub: esc(r.summary || ''), attrs: `data-rec="${esc(r.id)}"`, primary,
    more: `${(r.availableActions || []).includes('create_task') ? waBtn('créame una tarea para ' + name, 'Crear tarea') : ''}<button class="btn sm ghost" data-act="rec:snooze" data-id="${esc(r.id)}">Luego</button><button class="btn sm ghost" data-act="rec:dismiss" data-id="${esc(r.id)}">Basta</button>${waBtn('por qué me avisaste de ' + name, 'Por qué', 'btn sm ghost')}`,
  });
}
function approvalRow(a) {
  return row({
    ico: '🔒', cls: 'warning', attrs: `data-ap="${esc(a.id)}"`,
    title: `${esc(a.requester)} pide: ${esc(a.plan)}`, sub: `${esc(a.reason)} · vence ${esc(rel(a.expiresAt))}`,
    primary: `<button class="btn sm primary" data-act="ap:approve" data-id="${esc(a.id)}">Aprobar</button>`,
    more: `<div class="wa-preview">📋 <b>Plan</b>\n${(a.preview || []).map(esc).join('\n')}</div><div class="inline-list" style="margin-top:8px"><button class="btn sm danger" data-act="ap:reject" data-id="${esc(a.id)}">Rechazar</button></div>`,
  });
}
function histRow(h) {
  const st = { executed: ['Hecho', 'ok'], pending: ['Espera tu CONFIRMAR', 'warn'], awaiting_approval: ['Esperando al dueño', 'warn'], cancelled: ['Cancelado', ''], failed: ['No se pudo · revertido', 'bad'], declined: ['No se pudo', ''], expired: ['Venció', ''] }[h.status] || [h.status, ''];
  return row({
    ico: h.voice ? '🎤' : '💬', title: `<q>${esc(h.utterance)}</q>`,
    sub: `${esc(h.plan && h.plan !== '—' ? h.plan : (h.note || ''))} · ${esc(rel(h.at))}`,
    primary: h.status === 'pending' ? waBtn('CONFIRMAR', 'Confirmar', 'btn sm primary') : chip(st[0], st[1]),
  });
}
const recActions = () => {
  const run = async (el, ctx, action, body, msg) => {
    el.disabled = true;
    try { await ctx.api.recommendationAction(el.dataset.id, action, body); toast(msg, 'ok'); el.closest('[data-rec]')?.remove(); }
    catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  };
  return {
    'rec:snooze': (el, ctx) => run(el, ctx, 'snooze', { snoozedUntil: new Date(Date.now() + 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z') }, 'Te lo recuerdo mañana.'),
    'rec:dismiss': (el, ctx) => run(el, ctx, 'dismiss', undefined, 'Listo, no te lo vuelvo a mostrar.'),
  };
};
const taskActions = () => ({
  'task:done': async (el, ctx, d, reload) => {
    el.disabled = true;
    try { await ctx.api.completeTask(el.dataset.id); toast('Hecha.', 'ok'); reload(); }
    catch (e) {
      if (e.status === 404 || e.status === 501) { toast('Ciérrala por WhatsApp: «hecha»'); window.open(wa('hecha ' + el.closest('[data-task]').querySelector('.row-title').textContent.trim()), '_blank'); }
      else toast(e.message, 'bad');
      el.disabled = false;
    }
  },
});
const approvalActions = () => ({
  'ap:approve': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'approve'); toast('Aprobado. Se ejecuta en unos segundos.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
  'ap:reject': async (el, ctx, d, reload) => { const reason = window.prompt('¿Por qué no? (le llega a quien lo pidió)'); if (!reason) return; el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'reject', reason); toast('Rechazado.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
});

/* ===================================================================== HOY */
const hoy = {
  id: 'hoy', title: 'Hoy', sub: 'Qué hago ahora.', icon: 'home',
  load: (api) => ({ me: api.me(), recs: api.recommendations(), tasks: api.tasks(), health: api.health(), pipeline: api.pipeline(), history: api.history(), approvals: api.approvals() }),
  view(d) {
    const me = val(d.me, {});
    const recs = val(d.recs, []).filter((r) => r.status === 'pending').sort((a, b) => b.priority - a.priority);
    const tasks = val(d.tasks, []).filter((t) => t.status === 'open');
    const today = tasks.filter((t) => isToday(t.dueAt)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const overdue = tasks.filter((t) => isPast(t.dueAt) && !isToday(t.dueAt)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const hist = val(d.history, []);
    const pendingPlan = hist.find((x) => x.status === 'pending');
    const waiting = hist.filter((x) => x.status === 'awaiting_approval');
    const approvals = val(d.approvals, []).filter((a) => a.status === 'pending');
    const pipe = val(d.pipeline, null);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

    /* La bandeja: una sola lista, ordenada por urgencia. */
    const items = [
      pendingPlan ? row({ ico: '📋', cls: 'warning', title: 'Un plan espera tu <b>CONFIRMAR</b>', sub: `${esc(pendingPlan.plan)} · vence ${esc(rel(pendingPlan.expiresAt))}`, primary: waBtn('CONFIRMAR', 'Confirmar', 'btn sm primary'), more: waBtn('cancela', 'Cancelar', 'btn sm ghost') }) : '',
      ...approvals.map(approvalRow),
      ...overdue.map(taskRow),
      ...today.map(taskRow),
      ...recs.map(recRow),
    ].filter(Boolean);
    const count = items.length;
    waiting.forEach((x) => items.push(row({ ico: '⏳', title: esc(x.plan), sub: 'Esperando que el dueño lo apruebe · ' + esc(rel(x.expiresAt)) })));
    const allPending = isPending(d.tasks) && isPending(d.recs);
    const tray = card('Qué hago ahora', allPending ? soon('La bandeja', 'qué merece mi atención hoy') : (items.length ? `<div class="list">${items.join('')}</div>` : empty('Nada pendiente', 'El silencio es la buena noticia.')),
      { sub: count ? `${count} cosa${count === 1 ? '' : 's'} que dependen de ti. Toca una y sigue.` : 'Cuando algo dependa de ti, aparece aquí.' });

    const kpis = `<div class="grid c3">
      ${kpi('Plata en juego', pipe ? money(pipe.open.amount, pipe.currency) : '—', pipe ? `${num(pipe.open.count)} negocios abiertos` : (isPending(d.pipeline) ? 'Se activa pronto' : ''), { spark: pipe ? spark(pipe.stages.map((s) => s.count)) : '' })}
      ${kpi('Para hoy', `${num(today.length)}<small>tarea${today.length === 1 ? '' : 's'}</small>`, overdue.length ? `<span class="sev-warning">${overdue.length} vencida${overdue.length === 1 ? '' : 's'}</span>` : 'Ninguna vencida')}
      ${kpi('Te esperan', `${num(count)}<small>pendiente${count === 1 ? '' : 's'}</small>`, recs.length ? `${recs.length} merece${recs.length === 1 ? '' : 'n'} tu atención` : 'Nada urgente')}
    </div>`;

    const art = `<svg viewBox="0 0 360 260" fill="none" aria-hidden="true">
      <rect x="120" y="20" width="120" height="220" rx="22" fill="#0F1A1F" stroke="#2E4A3E" stroke-width="3"/><rect x="132" y="42" width="96" height="176" rx="12" fill="#0B1416"/>
      <rect x="140" y="56" width="62" height="22" rx="11" fill="#1F3A2E"/><rect x="158" y="86" width="62" height="22" rx="11" fill="#00A76F"/><rect x="140" y="116" width="74" height="22" rx="11" fill="#1F3A2E"/><rect x="148" y="146" width="72" height="22" rx="11" fill="#00A76F"/>
      <rect x="20" y="60" width="130" height="44" rx="14" fill="#fff"/><rect x="34" y="74" width="70" height="8" rx="4" fill="#C4CDD5"/><rect x="34" y="88" width="46" height="8" rx="4" fill="#DFE3E8"/>
      <rect x="215" y="150" width="125" height="44" rx="14" fill="#5BE49B"/><rect x="229" y="164" width="60" height="8" rx="4" fill="#0B2E24"/><rect x="229" y="178" width="84" height="8" rx="4" fill="#118D57"/>
      <circle cx="300" cy="70" r="26" fill="#00A76F"/><path d="M288 70l8 8 16-16" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const welcome = `<div class="welcome"><div class="welcome-body"><h2>${greet}, ${esc(me.name || 'operador')} 👋</h2>
      <p>${count ? `Tienes <b>${count} cosa${count === 1 ? '' : 's'}</b> que dependen de ti.` : 'Nada urgente por ahora.'} Lo que necesites, pídelo por WhatsApp con una frase.</p>
      ${waBtn('qué merece mi atención hoy', 'Escribir a Comando', 'btn primary')}</div><div class="welcome-art">${art}</div></div>`;

    const review = card('Qué revisar en tu CRM', part(d.health, (hh) => {
      const top = hh.metrics.filter((m) => m.severity === 'high' || m.severity === 'warning').slice(0, 3);
      return `<div class="bars">${top.map((m) => bar(m.label, m.value, m.of || Math.max(m.value, 1), { cls: m.severity === 'high' ? 'warn' : 'blue', text: `<b>${num(m.value)}</b>${m.of ? ' / ' + num(m.of) : ''}` })).join('')}</div><div class="status-line" style="margin-top:14px">${syncLine(hh.sync)}</div>`;
    }, { what: 'Qué revisar en tu CRM', phrase: 'qué debería revisar en mi CRM esta semana' }), { more: 'Ver todo', moreHref: '#/crm' });
    const last = card('Lo último que pediste', part(d.history, (hs) => list(hs.filter((h) => h.status !== 'pending').slice(0, 5), histRow, 'Todavía no le has escrito a Comando.'), { what: 'Lo último que pediste', phrase: 'qué fue lo último que hice' }),
      { right: waBtn('deshacer', 'Deshacer lo último', 'btn sm ghost') });

    const noCrm = me.status === 'ok' && me.crmConnected === false ? `<div class="card setup-nudge"><div class="row"><div class="row-ico ok">🔌</div><div class="row-body"><div class="row-title">Conecta tu CRM y Comando empieza a trabajar</div><div class="row-sub">HubSpot, Salesforce o una hoja de Google, con el login del propio sistema. Sin CRM ya puedes escribirle por WhatsApp; con CRM ve tu embudo, te avisa y ejecuta.</div></div><div class="row-actions"><a class="btn sm primary" href="#/cuenta">Conectar mi CRM</a></div></div></div>` : '';
    return `<div class="stack">${welcome}${noCrm}${kpis}${tray}<div class="two">${review}${last}</div></div>`;
  },
  act: { ...recActions(), ...taskActions(), ...approvalActions() },
};

/* ================================================================== AGENDA */
const agenda = {
  id: 'agenda', title: 'Agenda', sub: 'Tus recordatorios, visitas y cierres por día.', icon: 'cal',
  load: (api) => {
    const from = new Date(); from.setDate(1); from.setMonth(from.getMonth() - 1);
    const to = new Date(); to.setMonth(to.getMonth() + 2);
    return { tasks: api.tasks(), cal: api.calendar(isoDay(from), isoDay(to)) };
  },
  view(d, ctx) {
    const mode = ctx.tabs.agenda || 'lista';
    const tasks = val(d.tasks, []);
    /* Solo lo que es del vendedor: tareas, visitas, reuniones y cierres esperados. Nada del sistema. */
    const OWN = ['close', 'meeting'];
    const events = [
      ...tasks.filter((t) => t.status === 'open').map((t) => ({ id: t.id, kind: t.kind === 'visit' ? 'meeting' : 'task', title: t.title, at: t.dueAt, sub: t.recordName, task: t })),
      ...val(d.cal, []).filter((e) => OWN.includes(e.kind) || (e.kind === 'marketing' && !e.repeat)).map((e) => ({ ...e, kind: e.kind === 'marketing' ? 'meeting' : e.kind })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const evRow = (e) => {
      if (e.task) return taskRow(e.task);
      const clean = e.title.replace(/^Cierre esperado · /, '').replace(/ \(.*\)$/, '');
      return row({
        ico: e.kind === 'close' ? '💰' : '📍', cls: e.kind === 'close' ? 'warning' : 'info', title: esc(e.title),
        sub: `${e.allDay ? 'Todo el día' : esc(fmtTime(e.at))} · ${e.kind === 'close' ? 'cierre esperado' : 'reunión'}`,
        primary: e.kind === 'close' ? waBtn('cuál es el siguiente paso de ' + clean, 'Siguiente paso', 'btn sm primary') : waBtn('recuérdame «' + e.title + '» 2 horas antes', 'Recordarme', 'btn sm primary'),
      });
    };
    const actions = waBtn('recuérdame mañana a las 10 llamar a ', 'Nuevo recordatorio', 'btn primary');
    const toggle = `<div class="seg"><button data-tab="lista" class="${mode === 'lista' ? 'is-on' : ''}">Lista</button><button data-tab="mes" class="${mode === 'mes' ? 'is-on' : ''}">Mes</button></div>`;
    const pendingNote = isPending(d.cal) ? `<p class="note">Por ahora ves tus recordatorios. Los cierres esperados y las reuniones de tu CRM se suman pronto. ${askLine('qué tengo esta semana', 'Mientras tanto:')}</p>` : '';

    if (mode === 'lista') {
      const now = new Date(); const dayMs = 86_400_000;
      const tomorrow = new Date(now.getTime() + dayMs); const week = new Date(now.getTime() + 7 * dayMs); const month = new Date(now.getTime() + 31 * dayMs);
      const groups = [
        ['Vencidas', events.filter((e) => e.task && isPast(e.at) && !isToday(e.at))],
        ['Hoy', events.filter((e) => isToday(e.at))],
        ['Mañana', events.filter((e) => sameDay(new Date(e.at), tomorrow))],
        ['Esta semana', events.filter((e) => { const t = new Date(e.at); return t > tomorrow && !sameDay(t, tomorrow) && t <= week; })],
        ['Más adelante', events.filter((e) => { const t = new Date(e.at); return t > week && t <= month; })],
      ].filter(([, xs]) => xs.length);
      const done = tasks.filter((t) => t.status !== 'open');
      const body = groups.length ? groups.map(([t, xs]) => `<h3 class="group-title">${t} <span>${xs.length}</span></h3><div class="list">${xs.map(evRow).join('')}</div>`).join('') : empty('Nada en los próximos 30 días', 'Pídele a Comando «recuérdame…» y aparece aquí.');
      return `<div class="stack">${head(this.title, this.sub, actions)}${pendingNote}
        <div class="card">${toggle}${part(d.tasks, () => body, { what: 'La agenda', phrase: 'qué tengo esta semana' })}
        ${done.length ? moreBox(`<div class="list">${done.map(taskRow).join('')}</div>`, `Hechas · ${done.length}`) : ''}</div></div>`;
    }

    const st = ctx.cal || (ctx.cal = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), sel: new Date() });
    const first = new Date(st.month); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const cells = []; for (let i = 0; i < 42; i += 1) { const day = new Date(start); day.setDate(start.getDate() + i); cells.push(day); }
    const today = new Date();
    const dayEvents = (day) => events.filter((e) => sameDay(new Date(e.at), day));
    const grid = `<div class="cal">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}
      ${cells.map((day) => { const evs = dayEvents(day); return `<button class="cal-day ${day.getMonth() !== first.getMonth() ? 'is-other' : ''} ${sameDay(day, today) ? 'is-today' : ''} ${sameDay(day, st.sel) ? 'is-sel' : ''}" data-cal="sel" data-day="${day.toISOString()}">
        <span class="cal-num">${day.getDate()}</span><span class="cal-dots">${evs.slice(0, 4).map((e) => `<i class="ev-${e.kind}"></i>`).join('')}</span>
        ${evs.slice(0, 3).map((e) => `<span class="cal-ev ev-${e.kind}">${e.allDay ? '' : esc(fmtTime(e.at)) + ' '}${esc(e.title)}</span>`).join('')}${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3}</span>` : ''}</button>`; }).join('')}</div>`;
    const sel = dayEvents(st.sel);
    return `<div class="stack">${head(this.title, this.sub, actions)}${pendingNote}
      <div class="two wide"><div class="card">${toggle}<div class="cal-head"><button class="btn sm" data-cal="prev" aria-label="Mes anterior">‹</button><h2>${esc(monthName(first))}</h2><div><button class="btn sm" data-cal="today">Hoy</button> <button class="btn sm" data-cal="next" aria-label="Mes siguiente">›</button></div></div>${grid}
        <div class="legend"><span><i class="ev-task"></i>Recordatorio</span><span><i class="ev-meeting"></i>Visita o reunión</span><span><i class="ev-close"></i>Cierre esperado</span></div></div>
      ${card(dayLabel(st.sel), list(sel, evRow, 'Nada ese día.'))}</div></div>`;
  },
  act: {
    ...taskActions(),
    cal: (el, ctx, d, reload, rerender) => {
      const st = ctx.cal; const k = el.dataset.cal;
      if (k === 'prev') st.month = new Date(st.month.getFullYear(), st.month.getMonth() - 1, 1);
      if (k === 'next') st.month = new Date(st.month.getFullYear(), st.month.getMonth() + 1, 1);
      if (k === 'today') { st.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1); st.sel = new Date(); }
      if (k === 'sel') { st.sel = new Date(el.dataset.day); st.month = new Date(st.sel.getFullYear(), st.sel.getMonth(), 1); }
      rerender();
    },
  },
};

/* ==================================================================== MI CRM */
const crm = {
  id: 'crm', title: 'Mi CRM', sub: 'Cuánta plata hay en juego y qué está viejo, vacío, repetido o sin dueño.', icon: 'funnel',
  load: (api) => ({ pipeline: api.pipeline(), health: api.health() }),
  view(d) {
    const plata = part(d.pipeline, (p) => {
      const stages = [...p.stages].sort((a, b) => a.order - b.order); const maxStage = Math.max(...stages.map((s) => s.amount));
      return `<div class="grid c3">${kpi('Plata en juego', money(p.open.amount, p.currency), `${num(p.open.count)} negocios abiertos`)}${kpi('Ganado este mes', money(p.wonMonth.amount, p.currency), `${num(p.wonMonth.count)} negocios`, { subCls: 'up' })}${kpi('Perdido este mes', money(p.lostMonth.amount, p.currency), `${num(p.lostMonth.count)} negocios`, { subCls: 'down' })}</div>
        <div class="two">${card('Por etapa', `<div class="bars">${stages.map((s) => bar(s.name, s.amount, maxStage, { text: `<b>${num(s.count)}</b> · ${money(s.amount, p.currency)}` })).join('')}</div>`, { sub: `Al día ${esc(rel(p.computedAt))}`, right: waBtn('dame los negocios por etapa con monto', 'Pedir la lista') })}
        ${card('Por ' + p.byField.label, `<div class="bars">${p.byField.rows.map((r) => bar(r.value, r.count, Math.max(...p.byField.rows.map((x) => x.count)), { cls: 'blue', text: `<b>${num(r.count)}</b> · ${money(r.amount, p.currency)}` })).join('')}</div>`, { sub: 'Pide cualquier otro corte: «por distrito», «por tipo de inmueble».', right: waBtn('dame los negocios por etapa pero partido por ' + p.byField.label, 'Pedir el cruce') })}</div>`;
    }, { what: 'La plata en juego', phrase: 'cuánta plata hay en juego ahorita' });

    const revisar = part(d.health, (h) => {
      const ownersNote = h.owners.crmOwners <= 1 && h.owners.comandoPeople > 1 ? `<p class="note warn">Tu CRM tiene <b>${h.owners.crmOwners} dueño</b> cargado y en Comando son <b>${h.owners.comandoPeople} personas</b>: mientras no pongan el dueño en cada registro, nada va a distinguir quién lleva qué.</p>` : '';
      const sevOrder = { high: 0, warning: 1, info: 2 };
      const rows = [...h.metrics].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).map((m) => row({
        ico: { opportunity: '💼', contact: '👤', company: '🏢', task: '⏰' }[m.entity] || '•', cls: m.severity,
        title: esc(m.label.replace(/^Registros/, 'Contactos')),
        sub: `<b>${num(m.value)}</b>${m.unit ? ' ' + esc(m.unit) : ''}${m.of ? ` de ${num(m.of)} (${Math.round((m.value / m.of) * 100)} %)` : ''}${m.amount ? ` · ${money(m.amount)}` : ''}`,
        primary: waBtn(m.ask, 'Ver la lista', 'btn sm primary'),
        more: `${waBtn(m.weekly, 'Avisarme cada semana')}${m.reproduce ? `<p class="hint" style="margin-top:8px"><b>Cómo lo sacas en tu CRM:</b> ${esc(m.reproduce)}</p>` : ''}`,
      })).join('');
      return `${ownersNote}<div class="card"><div class="card-head"><div><h2>Qué revisar</h2><p>Comando detecta; nunca borra ni fusiona por su cuenta.</p></div>${syncLine(h.sync)}</div><div class="list">${rows}</div></div>`;
    }, { what: 'Qué revisar en tu CRM', phrase: 'qué negocios abiertos llevan más de 15 días sin que nadie los toque' });

    return `<div class="stack">${head(this.title, this.sub, waBtn('cuánta plata hay en juego ahorita', 'Pedir por WhatsApp', 'btn primary'))}${plata}${revisar}</div>`;
  },
};

/* ==================================================================== AVISOS */
const avisos = {
  id: 'avisos', title: 'Avisos', sub: 'De qué te avisa Comando, cuándo te escribe y qué más puede vigilar.', icon: 'bell',
  load: (api) => ({ agent: api.agent(), eventRules: api.eventRules(), policy: api.policy(), pipeline: api.pipeline(), playbooks: api.playbooks() }),
  view(d) {
    const ag = val(d.agent, null); const p = (ag && ag.preferences) || {};
    const pol = val(d.policy, null); const ev = val(d.eventRules, []); const pipe = val(d.pipeline, null);

    /* Una sola lista «Comando te avisa cuando…», en tres bloques con palabras del operador. */
    const siempre = []; const cuandoPase = []; const cadaTanto = [];
    if (pol) pol.enabledSignals.forEach((s) => { const f = SIGNAL_PHRASE[s]; if (!f) return; const text = f(pol.thresholds, money(pol.thresholds.highValue.PEN)); siempre.push(row({ ico: '🔔', title: esc(text), primary: waBtn('no me avises más cuando ' + text, 'Apagar') })); });
    ev.forEach((r) => cuandoPase.push(row({ ico: '⚡', cls: r.status === 'active' ? 'warning' : '', title: esc(r.name) + (r.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: `${esc(r.condition)} → ${esc(r.action)}${r.firedWeek ? ` · ${r.firedWeek === 1 ? '1 vez' : num(r.firedWeek) + ' veces'} esta semana` : ''}`,
      primary: r.status === 'active' ? waBtn('pausa la regla «' + r.name + '»', 'Pausar') : waBtn('reanuda la regla «' + r.name + '»', 'Reanudar', 'btn sm primary'), more: waBtn('cámbiame la regla «' + r.name + '»: ', 'Cambiar') })));
    ((ag && ag.rules) || []).forEach((r) => cadaTanto.push(row({ ico: r.critical ? '🚨' : '🔁', title: esc(r.name) + (r.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: `${esc(r.every || '')}${r.lastValue != null && !r.critical ? ` · la última vez: <b>${num(r.lastValue)}</b>` : ''}${r.lastFiredAt ? ` · te avisó ${esc(rel(r.lastFiredAt))}` : ''}`,
      primary: `<button class="btn sm ${r.status === 'active' ? '' : 'primary'}" data-act="rule:toggle" data-id="${esc(r.id)}" data-status="${r.status === 'active' ? 'paused' : 'active'}">${r.status === 'active' ? 'Pausar' : 'Reanudar'}</button>`, more: waBtn('cámbiame el aviso «' + r.name + '» a ', 'Cambiar día u hora') })));
    ((pipe && pipe.scheduledReports) || []).forEach((r) => cadaTanto.push(row({ ico: '📊', title: `Te manda «${esc(r.title)}»`, sub: `${esc(r.cadence)} · por WhatsApp`, primary: waBtn('pausa el reporte «' + r.title + '»', 'Pausar') })));
    const blocks = [['Siempre', siempre], ['Cuando pasa algo', cuandoPase], ['Cada cierto tiempo', cadaTanto]].filter(([, xs]) => xs.length);
    const missing = [d.policy, d.eventRules, d.pipeline].some(isPending);
    const lista = card('Comando te avisa cuando…', `${blocks.length ? blocks.map(([t, xs]) => `<h3 class="group-title">${t} <span>${xs.length}</span></h3><div class="list">${xs.join('')}</div>`).join('') : empty('Todavía no vigila nada', 'Dile «avísame cuando…» o «cada lunes…».')}${missing ? `<p class="hint" style="margin-top:12px">Algunos avisos todavía no se listan aquí. ${askLine('qué avisos tengo activos', 'Pregúntale:')}</p>` : ''}`,
      { sub: 'Cada aviso acepta respuesta por WhatsApp: VER, OK, LUEGO, BASTA, POR QUÉ.', right: waBtn('avísame cuando ', 'Nuevo aviso', 'btn sm primary') });

    const horario = part(d.agent, (a) => { const pr = a.preferences || {}; return `<div class="two">
      <form class="form" data-form="prefs"><h3>Horario</h3>
        <div class="inline"><label>No me escribas desde<input name="quietStart" type="time" value="${esc(pr.quietStart || '21:00')}"></label><label>hasta<input name="quietEnd" type="time" value="${esc(pr.quietEnd || '08:00')}"></label></div>
        <label>Máximo de avisos por día<input name="dailyMessageLimit" type="number" min="0" max="100" value="${esc(pr.dailyMessageLimit ?? 5)}"></label>
        <label class="sw"><input type="checkbox" name="proactiveEnabled" ${pr.proactiveEnabled !== false ? 'checked' : ''}><span class="sw-track"></span><span>Comando puede escribirme sin que le pregunte</span></label>
        <div class="form-foot"><button class="btn primary" type="submit">Guardar</button><span class="form-msg"></span></div></form>
      <form class="form" data-form="briefing"><h3>Resumen de la mañana</h3>
        <label>Cada<select name="briefingCadence"><option value="daily" ${pr.briefingCadence === 'daily' ? 'selected' : ''}>día (lunes a sábado)</option><option value="weekly" ${pr.briefingCadence === 'weekly' ? 'selected' : ''}>lunes</option><option value="monthly" ${pr.briefingCadence === 'monthly' ? 'selected' : ''}>mes, el primer día hábil</option></select></label>
        <label>A las<input name="briefingAt" type="time" value="${esc(pr.briefingAt || '07:30')}"></label>
        <div class="form-foot"><button class="btn primary" type="submit">Guardar</button><span class="form-msg"></span></div>
        <p class="hint">Nunca llega vacío: si no hay nada, no te escribe.</p></form></div>
      <p class="hint" style="margin-top:12px">${askLine('no me escribas hoy', '¿Un día sin avisos?')}</p>`; }, { what: 'El horario', phrase: 'no me escribas después de las 9 de la noche' });

    const ideas = part(d.playbooks, (pb) => list(pb.filter((x) => !x.active).slice(0, 8), (x) => row({ ico: '💡', title: esc(x.name) + (x.needs ? ' ' + chip(x.needs, 'soon') : ''), sub: `<q>${esc(x.ask)}</q>${x.evidence ? ` · ${esc(x.evidence)}` : ''}`, primary: waBtn(x.ask, 'Activar', 'btn sm primary') }), 'Ya activaste todas las ideas.'),
      { what: 'Las ideas', phrase: 'qué automatizaciones me recomiendas' });

    return `<div class="stack">${head(this.title, this.sub)}${lista}${card('Cuándo te escribe', horario, { sub: `Lo que cae fuera del horario llega a primera hora, marcado como «de anoche».` })}${card('Ideas para activar con una frase', ideas, { sub: 'Comando la convierte en aviso, te muestra la vista previa y espera tu CONFIRMAR.' })}</div>`;
  },
  act: {
    'rule:toggle': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.ruleStatus(el.dataset.id, el.dataset.status); toast(el.dataset.status === 'paused' ? 'Pausado.' : 'Reanudado.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
  },
  forms: {
    prefs: async (form, ctx, d) => {
      const f = new FormData(form); const prev = (val(d.agent, {}).preferences) || {};
      await ctx.api.savePreferences({ timezone: prev.timezone || 'America/Lima', quietStart: f.get('quietStart'), quietEnd: f.get('quietEnd'), dailyMessageLimit: Number(f.get('dailyMessageLimit')), minimumPriority: prev.minimumPriority ?? 50, proactiveEnabled: f.get('proactiveEnabled') === 'on' });
      return 'Listo. Aplica desde el próximo aviso.';
    },
    briefing: async (form, ctx) => {
      const f = new FormData(form);
      await ctx.api.savePreferences({ briefingCadence: f.get('briefingCadence'), briefingAt: f.get('briefingAt') }).catch((e) => { if (e.status === 400) { window.open(wa('mándame el resumen ' + { daily: 'cada mañana', weekly: 'cada lunes', monthly: 'cada mes' }[f.get('briefingCadence')] + ' a las ' + f.get('briefingAt')), '_blank'); return; } throw e; });
      return 'Listo.';
    },
  },
};

/* ================================================================= MARKETING */
const marketing = {
  id: 'marketing', title: 'Marketing', sub: 'Qué te traen tus anuncios de Facebook, Instagram y TikTok, y qué dice tu analista.', icon: 'mega',
  load: (api) => ({ mk: api.marketing() }),
  view(d) {
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${p === 'google-ads' ? 'automation' : esc(p)}.svg" alt="">`;
    const body = part(d.mk, (m) => {
      const cur = m.period.currency;
      const delta = (a, b, inverse) => { if (!b) return ''; const x = (a - b) / b; const good = inverse ? x < 0 : x > 0; return `<span class="${good ? 'sev-ok' : 'sev-warning'}">${x > 0 ? '+' : ''}${Math.round(x * 100)} % vs. el periodo anterior</span>`; };
      const accounts = `<div class="inline-list" style="margin-bottom:16px">${m.accounts.map((a) => `<span class="chip ${a.status === 'active' ? 'ok' : a.status === 'pending' ? 'warn' : 'soon'}">${logo(a.provider)} ${esc(a.name)} · ${a.status === 'active' ? 'conectada' : a.status === 'pending' ? 'falta autorizar' : 'pronto'}</span>`).join('')}<button class="btn sm ghost" data-act="mk:connect">Conectar otra</button></div>`;
      const kpis = `<div class="grid c4">${kpi('Inversión · ' + m.period.label, money(m.period.spend, cur), delta(m.period.spend, m.period.prevSpend, true))}${kpi('Leads que entraron', num(m.period.leads), delta(m.period.leads, m.period.prevLeads))}${kpi('Costo por lead', money(m.period.cpl, cur), delta(m.period.cpl, m.period.prevCpl, true))}${kpi('Costo por venta', money(m.period.won ? m.period.spend / m.period.won : 0, cur), `${num(m.period.won)} venta${m.period.won === 1 ? '' : 's'} · ${money(m.period.revenue, cur)}`)}</div>`;
      const camps = card('Campañas', accounts + list(m.campaigns, (c) => row({
        ico: logo(/tiktok/i.test(c.channel) ? 'tiktok' : 'meta'), title: esc(c.name) + (c.status !== 'active' ? ' ' + statusChip('paused') : ''),
        sub: `${esc(c.channel)} · gastó <b>${money(c.spend, cur)}</b> · <b>${num(c.leads)}</b> leads a ${money(c.cpl, cur)} · ${num(c.crmWon)} ganado${c.crmWon === 1 ? '' : 's'}${c.pausedReason ? `<br><span class="sev-warning">${esc(c.pausedReason)}</span>` : ''}`,
        primary: c.status === 'active' ? waBtn('pausa la campaña «' + c.name + '»', 'Pausar') : waBtn('reanuda la campaña «' + c.name + '»', 'Reanudar', 'btn sm primary'),
        more: `${waBtn('súbele 20 % al presupuesto de «' + c.name + '»', 'Subir presupuesto')}${waBtn('cuántos leads de «' + c.name + '» ya son negocios', 'Ver sus leads')}`,
      })), { sub: 'Pausar o cambiar presupuesto pasa por vista previa y CONFIRMAR, como todo.' });
      const an = m.analyst;
      const analyst = card('Tu analista', `<div class="person"><div class="avatar">${esc(an.avatar)}</div><div><b>${esc(an.name)}</b><div class="hint">Revisa tus campañas cada semana · próxima: ${esc(fmtDateTime(an.nextReviewAt))}</div></div></div>
        <h3 class="group-title" style="margin-top:16px">Te recomienda</h3>
        ${list(an.recommendations.filter((r) => r.status === 'pending'), (r) => row({ ico: '💡', cls: 'warning', title: esc(r.text), sub: `${esc(fmtDate(r.at))} · impacto ${esc(r.impact)}`, primary: waBtn('aplica la recomendación de mi analista: ' + r.text, 'Aplicar', 'btn sm primary'), more: `<button class="btn sm ghost" data-act="mk:later" data-id="${esc(r.id)}">Luego</button>` }), 'Nada pendiente. Lo anterior ya está aplicado.')}
        ${an.requests.length ? moreBox(list(an.requests, (q) => row({ ico: '❓', title: esc(q.topic), sub: esc(q.answer || 'En revisión') })), 'Lo que ya le preguntaste') : ''}`,
        { right: waBtn('pregúntale a mi analista de marketing: ', 'Preguntarle', 'btn sm primary') });
      const funnel = card('Del anuncio a la venta', `<div class="funnel">${m.funnel.map((s, i) => `<div class="funnel-step"><span>${esc(s.label)}</span><div class="bar-track"><div class="bar-fill ${i < 2 ? 'blue' : i < 5 ? '' : 'warn'}" style="width:${Math.max(2, Math.round((Math.log10(s.value + 1) / Math.log10(m.funnel[0].value + 1)) * 100))}%"></div></div><span class="bar-val"><b>${num(s.value)}</b>${i ? ` · ${Math.round((s.value / m.funnel[i - 1].value) * 100)} %` : ''}</span></div>`).join('')}</div>`, { sub: m.period.label });
      const autos = card('Lo que se hace solo', list(m.automations, (a) => row({ ico: { budget: '💸', speed: '⚡', audience: '🎯', report: '📊' }[a.kind] || '🔁', title: esc(a.name) + (a.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: a.firedMonth === 1 ? '1 vez este mes' : `${num(a.firedMonth)} veces este mes`, primary: a.status === 'active' ? waBtn('pausa la automatización «' + a.name + '»', 'Pausar') : waBtn('reanuda la automatización «' + a.name + '»', 'Reanudar', 'btn sm primary') })),
        { right: waBtn('si el costo por lead de una campaña pasa de 60 soles tres días seguidos, pausala y avísame', 'Nueva', 'btn sm primary') });
      const reports = card('Reportes', list(m.reports, (r) => row({ ico: '📈', title: esc(r.title), sub: r.highlights.map(esc).join(' · '), primary: waBtn('mándame el reporte «' + r.title + '»', 'Al WhatsApp', 'btn sm primary') })), { sub: 'Semanal los lunes, mensual el primer día hábil.', right: waBtn('mándame el reporte de campañas de esta semana', 'Pedir ahora') });
      return `${kpis}${camps}<div class="two">${analyst}${funnel}</div><div class="two">${autos}${reports}</div>`;
    }, { what: 'Marketing', phrase: 'quiero conectar mis campañas de Facebook e Instagram', extra: 'Conecta tu cuenta de anuncios y Comando empieza a seguir cada lead hasta la venta.' });
    return `<div class="stack">${head(this.title, this.sub, waBtn('cuántos leads trajo cada campaña esta semana', 'Preguntar por WhatsApp', 'btn primary'))}${body}</div>`;
  },
  act: {
    'mk:connect': () => toast('La conexión de cuentas de anuncios se activa pronto. Escríbenos: hola@comando.pro'),
    'mk:later': (el) => { el.closest('.row').style.opacity = '.5'; toast('Lo verás en la próxima revisión.'); },
  },
};

/* ==================================================================== CUENTA */
const cuenta = {
  id: 'cuenta', title: 'Cuenta', sub: 'Tu plan, tu CRM, tu equipo y lo que Comando sabe de ti.', icon: 'user',
  load: (api) => ({ me: api.me(), quota: api.quota(), connections: api.connections(), sheets: api.sheets(), mk: api.marketing(), team: api.team(), agent: api.agent(), health: api.health() }),
  view(d, ctx) {
    const me = val(d.me, {});
    const PLAN = { gratis: 'Gratis', free: 'Gratis', basico: 'Básico', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    const NAMES = { hubspot: 'HubSpot', salesforce: 'Salesforce', 'google-sheets': 'Google Sheets', pipedrive: 'Pipedrive', zoho: 'Zoho CRM', kommo: 'Kommo', meta: 'Meta Ads', tiktok: 'TikTok Ads', 'google-ads': 'Google Ads' };
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${p === 'google-ads' ? 'automation' : esc(p)}.svg" alt="">`;

    const plan = part(d.quota, (q) => { const total = q.commands.allowance + q.commands.addons + q.commands.adjustments; const share = total ? q.commands.used / total : 0; const cls = share >= 1 ? 'bad' : share >= 0.8 ? 'warn' : '';
      return `<div class="kpi"><div class="kpi-label">Plan ${esc(q.plan.name)} · US$ ${q.plan.priceUsd}/${q.plan.interval === 'month' ? 'mes' : 'año'}</div><div class="kpi-value">${num(q.commands.used)}<small>de ${num(total)} comandos este mes</small></div><div class="progress ${cls}"><i style="width:${Math.min(100, Math.round(share * 100))}%"></i></div><div class="kpi-sub">${share >= 0.8 ? '<span class="sev-warning">Pasaste el 80 %.</span> ' : ''}Se renueva el ${esc(fmtDate(q.period.resetAt))}${q.blockedReason ? ` · <span class="sev-warning">${esc(q.blockedReason)}</span>` : ''}</div></div>`; },
      { what: 'El consumo', phrase: 'cuántos comandos me quedan', extra: `Tu plan: ${PLAN[String(me.plan || '').toLowerCase()] || me.plan || '—'}.` });
    const cuentaCard = card('Tu cuenta', `<div class="list">
      ${row({ ico: '👤', title: esc(ctx.user?.fullName || me.name || '—'), sub: esc(ctx.user?.primaryEmailAddress?.emailAddress || me.email || ''), primary: `<button class="btn sm" data-act="acc:profile">Editar</button>` })}
      ${row({ ico: ICON.wa, title: `WhatsApp ${me.whatsapp ? statusChip(me.whatsapp.status) : ''}`, sub: `${esc(me.whatsapp?.phone || 'Sin vincular')} · le escribes a Comando al ${esc(me.comandoNumber || '')}`, primary: `<button class="btn sm ghost" data-act="wa:change">Cambiar número</button>` })}
      <div id="wa-change-box"></div>
      <div class="row"><div class="row-ico">💳</div><div class="row-body">${plan}</div><div class="row-actions"><a class="btn sm" href="../../#precios">Cambiar de plan</a></div></div>
    </div>`);

    const conns = val(d.connections, []); const active = conns.find((c) => c.bound && c.status === 'active'); const recoverable = conns.find((c) => c.recoverable);
    const h = val(d.health, null); const mk = val(d.mk, null);
    const adRows = mk ? mk.accounts.filter((a) => a.status !== 'soon').map((a) => row({ ico: logo(a.provider), title: `${esc(a.name)} ${a.status === 'active' ? chip('conectada', 'ok') : chip('falta autorizar', 'warn')}`, sub: esc(a.channels.join(' · ')), primary: a.status === 'pending' ? '<button class="btn sm primary" data-act="mk:connect">Autorizar</button>' : '<a class="btn sm ghost" href="#/marketing">Ver campañas</a>' })).join('') : '';
    const conexiones = card('Tu CRM', `${active && h ? `<p class="status-line" style="margin-bottom:12px">${syncLine(h.sync)}${active.mirror ? `<span class="hint">${num(active.mirror.contacts)} contactos · ${num(active.mirror.deals)} negocios en tu espejo</span>` : ''}</p>` : ''}${crmBlock(ctx, conns, val(d.sheets, []))}`,
      { sub: 'Se conecta con el login del propio CRM, sin copiar claves. Solo el CRM activo se consulta cuando hablas con Comando.' });
    const anuncios = card('Tus cuentas de anuncios', adRows ? `<div class="list">${adRows}</div>` : `<div class="empty"><b>Sin cuentas conectadas</b>Meta (Facebook e Instagram) y TikTok Ads, con el mismo login seguro.</div>`, { sub: 'Para la sección Marketing.', right: '<button class="btn sm" data-act="mk:connect">Conectar</button>' });

    const equipo = card('Tu equipo', part(d.team, (t) => { const ROLE = { owner: ['Dueño', 'ok'], admin: ['Admin', 'ok'], supervisor: ['Supervisor', 'info'], agent: ['Vendedor', ''], analyst: ['Analista', 'info'] };
      const owners = (h && h.owners) || { crmOwners: t.crmOwners, comandoPeople: t.people.length };
      return `<div class="list">${t.people.map((p) => { const [rl, rc] = ROLE[p.role] || [p.role, '']; return row({ ico: `<span class="avatar">${esc(p.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`, title: `${esc(p.name)} ${chip(rl, rc)}`, sub: `${esc(p.team || '')}${p.whatsapp !== 'verified' ? ' · <span class="sev-warning">WhatsApp sin verificar</span>' : ''}`, primary: waBtn('cambia el rol de ' + p.name + ' a ', 'Cambiar rol', 'btn sm ghost') }); }).join('')}</div>
        ${owners.crmOwners <= 1 && owners.comandoPeople > 1 ? `<p class="note warn" style="margin-top:12px">Tu CRM tiene <b>${num(owners.crmOwners)} dueño</b> cargado y aquí son <b>${num(owners.comandoPeople)}</b>. Hasta que pongan el dueño en cada registro, «mis negocios» no distingue personas.</p>` : ''}`; },
      { what: 'Tu equipo', phrase: 'quiénes usan Comando en mi cuenta', extra: 'Cada persona se registra con su propio WhatsApp en comando.pro/app.' }),
      { sub: 'Cada persona tiene su propio WhatsApp y su propio cupo.', right: '<button class="btn sm" data-act="team:invite">Invitar</button>' });

    const sabe = card('Lo que Comando sabe de ti', part(d.agent, (a) => list(a.memories || [], (m) => row({ ico: '🧠', title: esc(m.content), sub: esc(fmtDate(m.createdAt, true)), primary: waBtn('olvida que ' + m.content, 'Olvidar', 'btn sm ghost') }), 'Todavía nada. Dile «para mí un negocio grande es desde 300 mil».'),
      { what: 'Lo que Comando sabe de ti', phrase: 'para mí un negocio grande es desde 300 mil' }),
      { sub: 'Solo aprende lo que le dices explícitamente; nunca en silencio.', right: waBtn('para mí ', 'Enseñarle algo', 'btn sm primary') });

    const privacidad = card('Privacidad y salida', `<ul class="plain"><li>Tus datos se quedan en tu CRM; Comando guarda solo los campos que activaste.</li><li>Lo que le escribes se conserva 90 días para poder diagnosticar fallos; nadie lo lee sin tu pedido.</li><li>Nunca le escribe a tus clientes desde tu número: prepara el mensaje y lo mandas tú.</li></ul>
      <div class="inline-list" style="margin-top:12px"><a class="btn sm ghost" href="../../privacidad.html">Política de privacidad</a><a class="btn sm ghost" href="mailto:hola@comando.pro">Pedir el borrado de mi cuenta</a><button class="btn sm danger" data-act="acc:signout">Cerrar sesión</button></div>`);

    return `<div class="stack">${head(this.title, this.sub)}${cuentaCard}${conexiones}${anuncios}<div class="two">${equipo}${sabe}</div>${privacidad}</div>`;
  },
  act: {
    'acc:profile': (el, ctx) => (ctx.clerk ? ctx.clerk.openUserProfile() : toast('En modo de prueba no hay sesión.')),
    'acc:signout': async (el, ctx) => { if (!ctx.clerk) return toast('En modo de prueba no hay sesión.'); await ctx.clerk.signOut(); location.href = '../'; },
    'team:invite': () => { toast('Cada persona se registra con su propio WhatsApp en comando.pro/app. Te copiamos el enlace.'); navigator.clipboard?.writeText(location.origin + '/app/'); },
    'mk:connect': marketing.act['mk:connect'],
    'wa:change': (el, ctx, d, reload) => { const box = document.getElementById('wa-change-box'); if (!box) return; el.disabled = true; whatsappStep(box, ctx, (s) => { toast('WhatsApp vinculado.', 'ok'); ctx.cache = {}; reload(); }); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    ...crmActions,
  },
};

export const SECTIONS = [hoy, agenda, crm, avisos, marketing, cuenta];

/* Secciones del panel. Cada una declara: qué carga (`load`), cómo se ve (`view`) y qué
   hace al hacer clic (`act`). Los datos llegan resueltos por panel.js: cada clave es el
   valor, un Error, o `{pending:true}` si el endpoint todavía no existe en el engine.
   Regla de producto: todo lo que el panel muestra se puede pedir también por WhatsApp,
   y cualquier escritura en el CRM sigue pasando por la vista previa y CONFIRMAR. */

import { isPending } from './api.js?v=1';
import {
  esc, num, money, pct, compact, fmtTime, fmtDate, fmtDateTime, monthName, dayLabel, sameDay, rel, isToday, isPast, isoDay,
  wa, waBtn, askLine, chip, sevChip, signalLabel, COMMAND_LABELS, statusChip, bar, spark, kpi, card, empty, soon, toast, ICON,
} from './ui.js?v=1';

/** Renderiza una parte según el estado de su dato. */
function part(v, fn, opts = {}) {
  if (v instanceof Error) return `<div class="empty"><b>No se pudo cargar</b>${esc(v.message)}</div>`;
  if (isPending(v)) return soon(opts.what || 'Esta sección', opts.phrase, opts.extra);
  if (v == null) return empty('Sin datos');
  return fn(v);
}
const list = (items, fn, emptyMsg) => (items && items.length ? `<div class="list">${items.map(fn).join('')}</div>` : empty(emptyMsg || 'Nada por aquí'));
const val = (v, fallback) => (v instanceof Error || isPending(v) || v == null ? fallback : v);
const LAYER = { signal: ['Señal', 'bad'], briefing: ['Briefing', 'info'], event: ['Regla por evento', 'warn'], agent: ['Aviso con cadencia', ''], task: ['Recordatorio', 'ok'], marketing: ['Marketing', 'info'] };

/* ===================================================================== HOY */
const hoy = {
  id: 'hoy', title: 'Hoy', sub: 'Lo que merece tu atención, tus recordatorios y el estado de tu CRM.', icon: 'home', group: 'Hoy',
  load: (api) => ({ me: api.me(), recs: api.recommendations(), tasks: api.tasks(), health: api.health(), pipeline: api.pipeline(), quota: api.quota(), agent: api.agent(), history: api.history() }),
  view(d, ctx) {
    const me = val(d.me, {});
    const recs = val(d.recs, []).filter((r) => r.status === 'pending').sort((a, b) => b.priority - a.priority);
    const tasks = val(d.tasks, []);
    const todayTasks = tasks.filter((t) => t.status === 'open' && isToday(t.dueAt));
    const overdue = tasks.filter((t) => t.status === 'open' && isPast(t.dueAt) && !isToday(t.dueAt));
    const pipe = val(d.pipeline, null); const q = val(d.quota, null); const h = val(d.health, null); const ag = val(d.agent, null);
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    const hist = val(d.history, []);
    const pendingPlan = hist.find((x) => x.status === 'pending');

    const kpis = `<div class="grid c4">
      ${kpi('Negocios abiertos', pipe ? `${num(pipe.open.count)}<small>${money(pipe.open.amount, pipe.currency)}</small>` : '—', pipe ? `${num(pipe.wonMonth.count)} ganados este mes · ${money(pipe.wonMonth.amount, pipe.currency)}` : (isPending(d.pipeline) ? 'Se activa pronto' : ''), { spark: pipe ? spark(pipe.stages.map((s) => s.count)) : '' })}
      ${kpi('Para hoy', `${num(todayTasks.length)}<small>tareas</small>`, overdue.length ? `<span class="sev-warning">${overdue.length} vencidas</span>` : 'Ninguna vencida', {})}
      ${kpi('Requieren atención', `${num(recs.length)}<small>tarjetas</small>`, recs.filter((r) => r.priority >= 80).length + ' de prioridad alta', { spark: spark(recs.slice(0, 7).map((r) => r.priority), 'warn') })}
      ${kpi('Comandos este mes', q ? `${num(q.commands.used)}<small>de ${num(q.commands.allowance + q.commands.addons)}</small>` : '—', q ? (q.commands.used / (q.commands.allowance + q.commands.addons) >= 0.8 ? `<span class="sev-warning">Pasaste el 80 %</span>` : `Se renueva ${fmtDate(q.period.resetAt)}`) : (isPending(d.quota) ? 'Se activa pronto' : ''), { spark: spark([3, 5, 9, 7, 12, 8, 11], 'blue') })}
    </div>`;

    const pendingBox = pendingPlan ? `<div class="card" style="border-color:rgba(240,180,41,.45)"><div class="row"><div class="row-ico warning">📋</div><div class="row-body"><div class="row-title">Tienes un plan esperando <b>CONFIRMAR</b></div><div class="row-sub">${esc(pendingPlan.plan)} · vence ${rel(pendingPlan.expiresAt)}</div></div><div class="row-actions">${waBtn('CONFIRMAR', 'Confirmar en WhatsApp', 'btn sm primary')}${waBtn('cancela', 'Cancelar')}</div></div></div>` : '';

    const attention = card('Qué merece tu atención hoy', part(d.recs, () => list(recs.slice(0, 5), recCard, 'Nada pendiente. El silencio es la buena noticia.'), { what: 'El briefing', phrase: 'qué merece mi atención hoy' }),
      { sub: 'Las mismas tarjetas del briefing de WhatsApp. Ninguna escribe en el CRM sin que confirmes.', more: 'Ver todas', moreHref: '#/avisos' });

    const todayList = card('Recordatorios de hoy', part(d.tasks, () => list(todayTasks, taskRow, 'Sin tareas para hoy.'), { what: 'La lista de tareas', phrase: 'qué tengo para hoy' }),
      { sub: 'Comando te escribe a la hora de cada una.', more: 'Todas', moreHref: '#/recordatorios' });

    const healthBox = card('Qué revisar en tu CRM', part(d.health, (hh) => {
      const top = hh.metrics.filter((m) => m.severity === 'high' || m.severity === 'warning').slice(0, 4);
      return `<div class="bars">${top.map((m) => bar(m.label, m.value, m.of || Math.max(m.value, 1), { cls: m.severity === 'high' ? 'warn' : 'blue', text: `<b>${num(m.value)}</b>${m.of ? ' / ' + num(m.of) : ''}` })).join('')}</div>
        <div class="status-line" style="margin-top:12px">${syncChip(hh.sync)}<span class="hint">Dueños en el CRM: <b>${hh.owners.crmOwners}</b> · personas en Comando: <b>${hh.owners.comandoPeople}</b></span></div>`;
    }, { what: 'La salud del CRM', phrase: 'qué negocios abiertos llevan más de 15 días sin que nadie los toque' }), { more: 'Ver todo', moreHref: '#/salud' });

    const activity = card('Últimos comandos', part(d.history, (hs) => list(hs.slice(0, 5), histRow, 'Todavía no le has escrito a Comando.'), { what: 'El historial', phrase: 'qué fue lo último que hice' }), { more: 'Historial', moreHref: '#/historial' });

    const notif = ag ? card('Avisos', `<div class="grid c3">
        <div class="kpi"><div class="kpi-label">Enviados esta semana</div><div class="kpi-value">${num(ag.kpis?.sentWeek ?? ag.notifications?.length ?? 0)}</div></div>
        <div class="kpi"><div class="kpi-label">Respondidos en 24 h</div><div class="kpi-value">${ag.kpis ? pct(ag.kpis.responseRate24h) : '—'}</div></div>
        <div class="kpi"><div class="kpi-label">Presupuesto de hoy</div><div class="kpi-value">${ag.kpis ? `${ag.kpis.budgetUsedToday}<small>de ${ag.kpis.budgetToday}</small>` : `<small>${ag.preferences?.dailyMessageLimit ?? '—'} por día</small>`}</div></div>
      </div>`, { sub: `Horario silencioso ${esc(ag.preferences?.quietStart || '')}–${esc(ag.preferences?.quietEnd || '')} · ${ag.preferences?.proactiveEnabled === false ? 'proactividad apagada' : 'proactividad encendida'}`, more: 'Configurar', moreHref: '#/avisos' }) : '';

    return `<div class="stack">
      <div class="page-head"><div><h1>${greet}, ${esc(me.name || 'operador')}</h1><p>${esc(fmtDateTime(new Date().toISOString()))}. Escríbele a Comando por WhatsApp para pedir o cambiar cualquier cosa que veas aquí.</p></div>
        <div class="page-actions">${waBtn('qué merece mi atención hoy', 'Escribir a Comando', 'btn primary')}</div></div>
      ${kpis}${pendingBox}
      <div class="two wide">${attention}${todayList}</div>
      <div class="two">${healthBox}${notif}</div>
      ${activity}
    </div>`;
  },
  act: recActions(),
};

function syncChip(s) {
  if (!s) return '';
  if (s.reconcileAgeHours > 30) return chip(`${s.provider}: sin sincronizar hace ${Math.round(s.reconcileAgeHours)} h`, 'bad');
  return chip(`${s.provider} sincronizado hace ${s.reconcileAgeHours < 1 ? Math.round(s.reconcileAgeHours * 60) + ' min' : Math.round(s.reconcileAgeHours) + ' h'}`, 'ok');
}
function recCard(r) {
  const sev = r.signals && r.signals[0] ? r.signals[0].severity : 'info';
  const phone = r.subject && r.subject.phone ? `<a class="btn sm" href="https://wa.me/${esc(String(r.subject.phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${ICON.wa}${esc(r.subject.contact || 'Cliente')}</a>` : '';
  return `<div class="row" data-rec="${esc(r.id)}"><div class="row-ico ${sev}">${sev === 'high' || sev === 'critical' ? '🔥' : sev === 'warning' ? '⚠️' : 'ℹ️'}</div>
    <div class="row-body"><div class="row-title">${esc(r.title)} ${r.status === 'snoozed' ? statusChip('snoozed') : ''}</div><div class="row-sub">${esc(r.summary || '')}</div>
      <div class="row-meta">${(r.signals || []).map((s) => `<span>${esc(signalLabel(s.type))}</span>`).join('')}<span>prioridad ${esc(r.priority)}</span><span>${esc(rel(r.createdAt))}</span></div>
      <div class="row-actions" style="justify-content:flex-start;margin-top:8px">${phone}
        ${(r.availableActions || []).includes('create_task') ? `<button class="btn sm" data-act="rec:create_task" data-id="${esc(r.id)}">Crear tarea</button>` : ''}
        ${(r.availableActions || []).includes('accept') ? `<button class="btn sm" data-act="rec:accept" data-id="${esc(r.id)}">OK</button>` : ''}
        <button class="btn sm ghost" data-act="rec:snooze" data-id="${esc(r.id)}">Luego</button>
        <button class="btn sm ghost" data-act="rec:dismiss" data-id="${esc(r.id)}">Basta</button>
        ${waBtn('por qué me avisaste de ' + (r.subject && r.subject.name ? r.subject.name : r.title), 'Por qué', 'btn sm ghost')}
      </div></div></div>`;
}
function recActions() {
  const run = async (el, ctx, action, body, msg) => {
    el.disabled = true;
    try { await ctx.api.recommendationAction(el.dataset.id, action, body); toast(msg, 'ok'); el.closest('[data-rec]')?.remove(); }
    catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  };
  return {
    'rec:accept': (el, ctx) => run(el, ctx, 'accept', undefined, 'Anotado. Comando lo tendrá en cuenta.'),
    'rec:create_task': (el, ctx) => run(el, ctx, 'accept', undefined, 'Te creo la tarea: confírmala en WhatsApp.').then(() => window.open(wa('créame la tarea de la recomendación que acepté'), '_blank')),
    'rec:snooze': (el, ctx) => run(el, ctx, 'snooze', { snoozedUntil: new Date(Date.now() + 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z') }, 'Pospuesto hasta mañana.'),
    'rec:dismiss': (el, ctx) => run(el, ctx, 'dismiss', undefined, 'No te lo vuelvo a mostrar.'),
  };
}
function taskRow(t) {
  const late = t.status === 'open' && isPast(t.dueAt);
  return `<div class="row ${t.status === 'completed' ? 'is-done' : ''}" data-task="${esc(t.id)}"><div class="row-ico ${late ? 'warning' : t.kind === 'visit' ? 'info' : ''}">${t.kind === 'visit' ? '📍' : '⏰'}</div>
    <div class="row-body"><div class="row-title">${esc(t.title)}</div><div class="row-sub">${t.recordName ? `Con: <b>${esc(t.recordName)}</b> · ` : ''}${esc(fmtDateTime(t.dueAt))}${late ? ` · <span class="sev-warning">vencida ${esc(rel(t.dueAt))}</span>` : ''}</div>
      <div class="row-meta"><span>origen: ${esc({ whatsapp: 'WhatsApp', recommendation: 'tarjeta', automation: 'regla' }[t.source] || t.source || '—')}</span>${t.remindedAt ? `<span>recordatorio enviado ${esc(rel(t.remindedAt))}</span>` : ''}</div></div>
    <div class="row-actions">${t.status === 'open' ? `<button class="btn sm" data-act="task:done" data-id="${esc(t.id)}">Hecha</button>${waBtn('cancela la tarea «' + t.title + '»', 'Cancelar', 'btn sm ghost')}` : statusChip(t.status)}</div></div>`;
}
function histRow(h) {
  return `<div class="row"><div class="row-ico">${h.voice ? '🎤' : '💬'}</div><div class="row-body"><div class="row-title"><q style="font-weight:500">${esc(h.utterance)}</q></div>
    <div class="row-sub">${esc(h.plan)}${h.note ? ` · <i>${esc(h.note)}</i>` : ''}</div>
    <div class="row-meta">${(h.types || []).map((t) => `<span>${esc(COMMAND_LABELS[t] || t)}</span>`).join('')}${h.records ? `<span>${num(h.records)} registros</span>` : ''}${h.ref ? `<span class="mono">Ref: ${esc(h.ref)}</span>` : ''}<span>${esc(fmtDateTime(h.at))}</span></div></div>
    <div class="row-side">${statusChip(h.status)}${h.status === 'pending' ? `<div style="margin-top:6px">${waBtn('CONFIRMAR', 'Confirmar', 'btn sm primary')}</div>` : ''}</div></div>`;
}

/* ============================================================ RECORDATORIOS */
const recordatorios = {
  id: 'recordatorios', title: 'Recordatorios y tareas', sub: 'Lo que le pediste a Comando que te recuerde, con la hora y el registro del CRM al que pertenece.', icon: 'check', group: 'Hoy',
  load: (api) => ({ tasks: api.tasks() }),
  view(d, ctx) {
    const tab = ctx.tabs.recordatorios || 'hoy';
    return `<div class="stack">
      <div class="page-head"><div><h1>Recordatorios y tareas</h1><p>${esc(this.sub)}</p></div>
        <div class="page-actions">${waBtn('recuérdame mañana a las 10 llamar a ', 'Nuevo recordatorio', 'btn primary')}${waBtn('qué tareas tengo pendientes', 'Pedir la lista')}</div></div>
      ${part(d.tasks, (tasks) => {
        const open = tasks.filter((t) => t.status === 'open');
        const groups = {
          hoy: open.filter((t) => isToday(t.dueAt)),
          vencidas: open.filter((t) => isPast(t.dueAt) && !isToday(t.dueAt)),
          proximas: open.filter((t) => !isPast(t.dueAt) && !isToday(t.dueAt)).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
          hechas: tasks.filter((t) => t.status !== 'open'),
        };
        const tabs = [['hoy', 'Hoy', groups.hoy.length], ['vencidas', 'Vencidas', groups.vencidas.length], ['proximas', 'Próximas', groups.proximas.length], ['hechas', 'Hechas', groups.hechas.length]];
        return `<div class="card"><div class="tabs">${tabs.map(([k, l, n]) => `<button data-tab="${k}" class="${tab === k ? 'is-on' : ''}">${l} · ${n}</button>`).join('')}</div>
          ${list(groups[tab], taskRow, tab === 'vencidas' ? 'Nada vencido.' : tab === 'hoy' ? 'Sin tareas para hoy.' : 'Nada por aquí.')}
          <p class="note" style="margin-top:14px">Las tareas viven en Comando y, cuando el CRM lo permite, también se crean allí. «Hecha» la cierra en Comando; cancelar la retira de los dos lados.</p></div>`;
      }, { what: 'La lista de tareas', phrase: 'qué tareas tengo pendientes', extra: 'Comando ya te las recuerda por WhatsApp a la hora.' })}
      <div class="two">${card('Cómo se crean', `<ul class="big-list" style="margin:0;padding-left:18px;color:var(--muted)">
          <li><q>recuérdame llamar mañana a las 10 a Ana</q> → tarea con hora y aviso.</li>
          <li><q>créame tarea de seguimiento para los que no respondieron la cotización</q> → una por contacto.</li>
          <li>Desde una tarjeta de atención: «Crear tarea».</li>
          <li>Desde una regla: «después de cada visita créame tarea para el día siguiente».</li></ul>`)}
        ${card('Recordatorios de visita', `<p class="hint">Aviso 30 minutos antes de cada visita o reunión anotada como tarea con lugar.</p>${askLine('recuérdame cada visita 30 minutos antes')}`)}</div>
    </div>`;
  },
  act: {
    'task:done': async (el, ctx, d, reload) => {
      el.disabled = true;
      try { await ctx.api.completeTask(el.dataset.id); toast('Tarea cerrada.', 'ok'); reload(); }
      catch (e) { if (e.status === 404 || e.status === 501) { toast('Ciérrala por WhatsApp: «hecha»', ''); window.open(wa('hecha ' + el.closest('[data-task]').querySelector('.row-title').textContent.trim()), '_blank'); } else toast(e.message, 'bad'); el.disabled = false; }
    },
  },
};

/* ================================================================ CALENDARIO */
const calendario = {
  id: 'calendario', title: 'Calendario', sub: 'Tareas con hora, visitas, cierres esperados, briefings y avisos programados en un solo lugar.', icon: 'cal', group: 'Hoy',
  load: (api) => {
    const from = new Date(); from.setDate(1); from.setMonth(from.getMonth() - 1);
    const to = new Date(); to.setMonth(to.getMonth() + 2);
    return { tasks: api.tasks(), cal: api.calendar(isoDay(from), isoDay(to)) };
  },
  view(d, ctx) {
    const st = ctx.cal || (ctx.cal = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), sel: new Date() });
    const events = [
      ...val(d.tasks, []).filter((t) => t.status === 'open').map((t) => ({ id: t.id, kind: t.kind === 'visit' ? 'meeting' : 'task', title: t.title, at: t.dueAt, sub: t.recordName })),
      ...val(d.cal, []),
    ].sort((a, b) => a.at.localeCompare(b.at));
    const first = new Date(st.month); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const cells = [];
    for (let i = 0; i < 42; i += 1) { const day = new Date(start); day.setDate(start.getDate() + i); cells.push(day); }
    const today = new Date();
    const dayEvents = (day) => events.filter((e) => sameDay(new Date(e.at), day));
    const grid = `<div class="cal">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}
      ${cells.map((day) => { const evs = dayEvents(day); return `<button class="cal-day ${day.getMonth() !== first.getMonth() ? 'is-other' : ''} ${sameDay(day, today) ? 'is-today' : ''} ${sameDay(day, st.sel) ? 'is-sel' : ''}" data-cal="sel" data-day="${day.toISOString()}">
        <span class="cal-num">${day.getDate()}</span><span class="cal-dots">${evs.slice(0, 4).map((e) => `<i class="ev-${e.kind}"></i>`).join('')}</span>
        ${evs.slice(0, 3).map((e) => `<span class="cal-ev ev-${e.kind}" style="border-color:currentColor;color:var(--text)">${e.allDay ? '' : esc(fmtTime(e.at)) + ' '}${esc(e.title)}</span>`).join('')}${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3}</span>` : ''}</button>`; }).join('')}</div>`;
    const sel = dayEvents(st.sel);
    const KIND = { task: ['⏰', 'Tarea'], meeting: ['📍', 'Visita / reunión'], close: ['💰', 'Cierre esperado'], briefing: ['📊', 'Briefing'], rule: ['🔁', 'Aviso programado'], sync: ['🔄', 'Sincronización'], report: ['📈', 'Reporte'], marketing: ['📣', 'Marketing'] };
    const selList = list(sel, (e) => `<div class="row"><div class="row-ico">${KIND[e.kind]?.[0] || '•'}</div><div class="row-body"><div class="row-title">${esc(e.title)}</div><div class="row-sub">${e.allDay ? 'Todo el día' : esc(fmtTime(e.at))} · ${esc(KIND[e.kind]?.[1] || e.kind)}${e.repeat ? ` · se repite: ${esc(e.repeat)}` : ''}${e.sub ? ` · ${esc(e.sub)}` : ''}</div></div>
      <div class="row-actions">${e.kind === 'task' || e.kind === 'meeting' ? waBtn('mueve «' + e.title + '» para ', 'Mover') : e.kind === 'rule' || e.kind === 'briefing' ? waBtn('cámbiame el aviso «' + e.title + '» a ', 'Cambiar hora') : e.kind === 'close' ? waBtn('cuál es el siguiente paso de ' + e.title.replace(/^Cierre esperado · /, '').replace(/ \(.*\)$/, ''), 'Siguiente paso') : ''}</div></div>`, 'Nada ese día.');
    return `<div class="stack">
      <div class="page-head"><div><h1>Calendario</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('qué tengo esta semana', 'Pedir la semana', 'btn primary')}</div></div>
      ${isPending(d.cal) ? soon('El calendario completo', 'qué tengo esta semana', 'Por ahora ves tus tareas; los cierres esperados, visitas y avisos programados se suman pronto.') : ''}
      <div class="two wide"><div class="card"><div class="cal-head"><button class="btn sm" data-cal="prev">‹</button><h2>${esc(monthName(first))}</h2><div><button class="btn sm" data-cal="today">Hoy</button> <button class="btn sm" data-cal="next">›</button></div></div>${grid}
        <div class="legend">${Object.entries(KIND).map(([k, [, l]]) => `<span><i class="ev-${k}"></i>${l}</span>`).join('')}</div></div>
        ${card(dayLabel(st.sel), selList, { sub: `${sel.length} elemento${sel.length === 1 ? '' : 's'}` })}</div>
      ${card('Conectar tu agenda', `<p class="hint">Las reuniones de HubSpot y Google Calendar aparecerán aquí y en el briefing. Comando no agenda por ti: te avisa y te prepara el mensaje de confirmación.</p><div class="inline-list" style="margin-top:10px">${chip('HubSpot Meetings · próximamente', 'soon')}${chip('Google Calendar · próximamente', 'soon')}</div>`)}
    </div>`;
  },
  act: {
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

/* ================================================================= SALUD CRM */
const salud = {
  id: 'salud', title: 'Qué revisar en tu CRM', sub: 'Lo que está viejo, vacío, repetido o sin dueño. Cada número se puede reproducir en tu CRM en menos de 5 minutos, y cada uno se puede pedir o vigilar por WhatsApp.', icon: 'pulse', group: 'CRM',
  load: (api) => ({ health: api.health(), connections: api.connections() }),
  view(d, ctx) {
    return `<div class="stack"><div class="page-head"><div><h1>Qué revisar en tu CRM</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('qué debería revisar en mi CRM esta semana', 'Pedir el resumen', 'btn primary')}</div></div>
      ${part(d.health, (h) => {
        const sync = h.sync;
        const syncCard = card('Sincronización', `<div class="grid c3">
            <div class="kpi"><div class="kpi-label">Última reconciliación</div><div class="kpi-value ${sync.reconcileAgeHours > 30 ? 'sev-critical' : ''}">${sync.reconcileAgeHours < 1 ? Math.round(sync.reconcileAgeHours * 60) + '<small>min</small>' : Math.round(sync.reconcileAgeHours) + '<small>h</small>'}</div><div class="kpi-sub">umbral 30 h · única alerta que atraviesa el silencio</div></div>
            <div class="kpi"><div class="kpi-label">Último evento recibido</div><div class="kpi-value">${sync.inboundAgeHours < 1 ? Math.round(sync.inboundAgeHours * 60) + '<small>min</small>' : Math.round(sync.inboundAgeHours) + '<small>h</small>'}</div><div class="kpi-sub">se evalúa solo en horario comercial</div></div>
            <div class="kpi"><div class="kpi-label">Diferencias detectadas</div><div class="kpi-value ${sync.driftCount ? 'sev-warning' : ''}">${num(sync.driftCount)}</div><div class="kpi-sub">${sync.pendingWrites ? `${sync.pendingWrites} anotaciones guardadas esperando salir` : 'Nada pendiente de escribir'}</div></div></div>
          <div style="margin-top:10px">${askLine('avísame si HubSpot pasa más de un día sin sincronizar', 'Vigilarlo:')}</div>`, { right: syncChip(sync) });
        const ownersNote = h.owners.crmOwners <= 1 ? `<div class="note warn" style="margin-bottom:12px">Tu CRM tiene <b>${h.owners.crmOwners} dueño</b> cargado y en Comando hay <b>${h.owners.comandoPeople} personas</b>. Ninguna vista «por vendedor» va a distinguir personas hasta que se cargue el dueño en cada registro. La fila «Sin responsable» siempre se muestra.</div>` : '';
        const sevOrder = { high: 0, warning: 1, info: 2 };
        const rows = [...h.metrics].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).map((m) => `<div class="row"><div class="row-ico ${m.severity}">${{ opportunity: '💼', contact: '👤', company: '🏢', task: '⏰' }[m.entity] || '•'}</div>
          <div class="row-body"><div class="row-title">${esc(m.label)} ${sevChip(m.severity)}</div><div class="row-sub">${esc(m.why)}</div>
            <details style="margin-top:6px"><summary class="hint" style="cursor:pointer">Cómo reproducirlo en tu CRM</summary><p class="hint" style="margin-top:4px">${esc(m.reproduce)}</p></details>
            <div class="row-actions" style="justify-content:flex-start;margin-top:8px">${waBtn(m.ask, 'Ver la lista')}${waBtn(m.weekly, 'Vigilarlo', 'btn sm ghost')}</div></div>
          <div class="row-side"><b>${num(m.value)}${m.unit ? ` <small style="font-size:12px;font-weight:500">${esc(m.unit)}</small>` : ''}</b>${m.of ? `de ${num(m.of)} (${Math.round((m.value / m.of) * 100)} %)` : ''}${m.amount ? `<div>${money(m.amount)}</div>` : ''}</div></div>`).join('');
        return `${syncCard}<div class="card">${ownersNote}<div class="card-head"><div><h2>Métricas</h2><p>Calculadas ${esc(rel(h.computedAt))}. Detectar no es fusionar ni borrar: Comando nunca escribe por su cuenta.</p></div></div><div class="list">${rows}</div></div>`;
      }, { what: 'La salud del CRM', phrase: 'qué negocios abiertos llevan más de 15 días sin que nadie los toque', extra: 'Las mismas métricas ya se pueden pedir y vigilar por WhatsApp.' })}
    </div>`;
  },
};

/* ===================================================================== EMBUDO */
const embudo = {
  id: 'embudo', title: 'Embudo y reportes', sub: 'Tus negocios por etapa, dueño y campo propio; lo que se movió esta semana; los reportes que Comando te manda solo.', icon: 'funnel', group: 'CRM',
  load: (api) => ({ pipeline: api.pipeline() }),
  view(d) {
    return `<div class="stack"><div class="page-head"><div><h1>Embudo y reportes</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('dame los negocios por etapa con monto', 'Pedir el pipeline', 'btn primary')}${waBtn('mándame todos los lunes el pipeline por etapa', 'Programar')}</div></div>
      ${part(d.pipeline, (p) => {
        const maxStage = Math.max(...p.stages.map((s) => s.amount));
        const stages = `<div class="bars">${p.stages.sort((a, b) => a.order - b.order).map((s) => bar(s.name, s.amount, maxStage, { text: `<b>${num(s.count)}</b> · ${money(s.amount, p.currency)}` })).join('')}</div>`;
        const owners = `<div class="bars">${p.byOwner.map((o) => bar(o.owner, o.amount, Math.max(...p.byOwner.map((x) => x.amount)), { cls: o.owner === 'Sin responsable' ? 'muted' : 'blue', text: `<b>${num(o.count)}</b> · ${money(o.amount, p.currency)}` })).join('')}</div>`;
        const field = `<div class="bars">${p.byField.rows.map((r) => bar(r.value, r.count, Math.max(...p.byField.rows.map((x) => x.count)), { text: `<b>${num(r.count)}</b> · ${money(r.amount, p.currency)}` })).join('')}</div>`;
        const source = `<div class="bars">${p.bySource.map((r) => bar(r.value, r.count, Math.max(...p.bySource.map((x) => x.count)), { cls: r.value === 'Sin fuente' ? 'muted' : 'warn' })).join('')}</div>`;
        const temporal = `<div class="grid c3"><div class="kpi"><div class="kpi-label">Cambios de etapa · 7 días</div><div class="kpi-value">${num(p.temporal.moved)}</div></div><div class="kpi"><div class="kpi-label">Retrocesos</div><div class="kpi-value ${p.temporal.backward ? 'sev-warning' : ''}">${num(p.temporal.backward)}</div></div><div class="kpi"><div class="kpi-label">Días promedio en Negociación</div><div class="kpi-value">${num(p.temporal.avgDaysByStage.find((s) => s.name === 'Negociación')?.days ?? '—')}</div></div></div>
          <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Negocio</th><th>De</th><th>A</th><th>Cuándo</th></tr></thead><tbody>${p.temporal.moves.map((m) => `<tr><td>${esc(m.name)}</td><td class="dim">${esc(m.from)}</td><td>${esc(m.to)} ${m.backward ? chip('retroceso', 'warn') : ''}</td><td class="dim">${esc(rel(m.at))}</td></tr>`).join('')}</tbody></table></div>
          <div style="margin-top:10px">${askLine('cuántos negocios se movieron de etapa la semana pasada')}</div>`;
        const seps = list(p.separations, (s) => `<div class="row"><div class="row-ico warning">💰</div><div class="row-body"><div class="row-title">${esc(s.name)}</div><div class="row-sub">En Separación hace <b>${s.days} días</b>${s.days >= 15 ? ' · <span class="sev-warning">más de 15 días sin cerrar</span>' : ''}</div></div><div class="row-side"><b>${money(s.amount, p.currency)}</b></div></div>`, 'Nada en Separación.');
        const sched = list(p.scheduledReports, (r) => `<div class="row"><div class="row-ico">📊</div><div class="row-body"><div class="row-title">${esc(r.title)}</div><div class="row-sub">${esc(r.cadence)} · ${esc(r.channel)}</div></div><div class="row-actions">${statusChip(r.status)}${waBtn('pausa el reporte «' + r.title + '»', 'Pausar', 'btn sm ghost')}</div></div>`, 'Ningún reporte programado.');
        const recent = list(p.recent, (r) => `<div class="row"><div class="row-ico">💬</div><div class="row-body"><div class="row-title"><q style="font-weight:500">${esc(r.ask)}</q></div><div class="row-sub">${esc(r.answer)} · ${esc(rel(r.at))}</div></div><div class="row-actions">${waBtn(r.ask, 'Repetir', 'btn sm ghost')}</div></div>`);
        return `<div class="grid c4">${kpi('Plata abierta', `${money(p.open.amount, p.currency)}`, `${num(p.open.count)} negocios abiertos`)}${kpi('Ganado este mes', money(p.wonMonth.amount, p.currency), `${num(p.wonMonth.count)} negocios`, { subCls: 'up' })}${kpi('Perdido este mes', money(p.lostMonth.amount, p.currency), `${num(p.lostMonth.count)} negocios`, { subCls: 'down' })}${kpi('En Separación', money(p.separations.reduce((a, s) => a + s.amount, 0), p.currency), 'la plata que entró y se puede caer')}</div>
          <div class="two">${card('Por etapa', stages, { sub: `Actualizado ${esc(rel(p.computedAt))}` })}${card('Por responsable', owners, { sub: 'La fila «Sin responsable» siempre se muestra.' })}</div>
          <div class="two">${card('Por ' + p.byField.label, field, { sub: 'Campo propio de tu CRM. Pide cualquier otro: «por tipo de inmueble», «por distrito».' })}${card('Contactos por fuente', source)}</div>
          <div class="two wide">${card('Movimiento de etapas', temporal, { sub: 'Historial real de etapas, no una estimación.' })}${card('Separaciones', seps, { sub: 'Aviso si retrocede o pasa 15 días sin cerrar.' })}</div>
          <div class="two">${card('Reportes programados', sched, { sub: 'Se crean con una frase: «mándame cada lunes…».' })}${card('Últimas consultas', recent)}</div>
          <p class="note">Comando no proyecta ni pronostica: muestra lo que hay en el CRM y lo que cambió. Una regla de tres con dos decimales no es un forecast.</p>`;
      }, { what: 'El embudo', phrase: 'dame los negocios por etapa con monto', extra: 'Todos los reportes ya se pueden pedir por WhatsApp; aquí los verás en pantalla.' })}
    </div>`;
  },
};

/* ===================================================================== AVISOS */
const avisos = {
  id: 'avisos', title: 'Avisos y automatizaciones', sub: 'Las tres capas que hablan sin que preguntes: señales del embudo, reglas por evento y avisos con cadencia. Todo se responde y se apaga desde WhatsApp.', icon: 'bell', group: 'CRM',
  load: (api) => ({ agent: api.agent(), eventRules: api.eventRules(), policy: api.policy(), playbooks: api.playbooks() }),
  view(d, ctx) {
    const tab = ctx.tabs.avisos || 'recibidos';
    const tabs = [['recibidos', 'Recibidos'], ['senales', 'Señales'], ['eventos', 'Reglas por evento'], ['cadencia', 'Avisos con cadencia'], ['preferencias', 'Horario y briefing'], ['playbooks', 'Galería']];
    const ag = val(d.agent, null);
    let body = '';
    if (tab === 'recibidos') body = part(d.agent, (a) => {
      const k = a.kpis;
      const kp = k ? `<div class="grid c4">${kpi('Respondidos en 24 h', pct(k.responseRate24h), 'el único KPI de proactividad')}${kpi('Respondieron BASTA', pct(k.bastaShare), 'si sube, el umbral está mal')}${kpi('Diferidos por horario', num(k.deferredWeek), 'llegan a primera hora como «de anoche»')}${kpi('Presupuesto de hoy', `${k.budgetUsedToday}<small>de ${k.budgetToday}</small>`, 'mensajes proactivos')}</div>` : '';
      const rows = list(a.notifications || [], (n) => { const [l, c] = LAYER[n.layer] || [n.layer || 'Aviso', '']; return `<div class="row"><div class="row-ico">${{ signal: '🔥', briefing: '📊', event: '⚡', agent: '🔁', task: '⏰' }[n.layer] || '🔔'}</div>
        <div class="row-body"><div class="row-title">${chip(l, c)} ${statusChip(n.status)} ${n.response ? chip('respondiste: ' + n.response, 'ok') : ''}</div><div class="wa-preview" style="margin-top:6px">${esc(n.text || n.reason || '')}</div>
          <div class="row-meta"><span>${esc(fmtDateTime(n.createdAt))}</span><span>prioridad ${esc(n.priority)}</span>${n.note ? `<span>${esc(n.note)}</span>` : ''}</div></div>
        <div class="row-actions">${!n.response && n.status === 'sent' ? `${waBtn('VER', 'VER')}${waBtn('LUEGO', 'LUEGO', 'btn sm ghost')}${waBtn('BASTA', 'BASTA', 'btn sm ghost')}` : ''}${waBtn('POR QUÉ', 'POR QUÉ', 'btn sm ghost')}
          <button class="btn sm ghost" data-act="fb:up" data-id="${esc(n.id)}" title="Útil">👍</button><button class="btn sm ghost" data-act="fb:down" data-id="${esc(n.id)}" title="Ruido">👎</button></div></div>`; }, 'Todavía no te ha llegado ningún aviso.');
      return `${kp}${card('Últimos avisos', rows, { sub: 'Cada aviso acepta respuesta: VER, OK, LUEGO, BASTA, POR QUÉ. Lo suprimido también responde a POR QUÉ.' })}`;
    }, { what: 'El historial de avisos', phrase: 'por qué me avisaste' });

    if (tab === 'senales') body = part(d.policy, (p) => {
      const ALL = ['deal_inactive', 'close_date_approaching', 'close_date_overdue', 'missing_next_step', 'overdue_task', 'stage_stalled', 'high_value_attention', 'missing_owner', 'missing_critical_data'];
      const DESC = { deal_inactive: `sin actividad ${p.thresholds.inactiveDays} días`, close_date_approaching: `cierra en menos de ${p.thresholds.closeDateApproachingDays} días`, close_date_overdue: 'fecha de cierre pasada y sigue abierto', missing_next_step: 'sin tarea ni siguiente paso', overdue_task: 'tarea vencida', stage_stalled: `más de ${p.thresholds.stageStalledDays} días en la misma etapa`, high_value_attention: `monto ≥ ${money(p.thresholds.highValue.PEN)} (${p.thresholds.highValue.mode === 'p75' ? 'p75 de tu embudo' : 'definido por ti'})`, missing_owner: 'sin dueño', missing_critical_data: `falta ${p.criticalFields.map((f) => ({ amountMinor: 'monto', stageRef: 'etapa', expectedCloseDate: 'fecha de cierre', name: 'nombre', currency: 'moneda', pipelineRef: 'embudo' }[f] || f)).join(', ')}` };
      return `${card('Señales del embudo', `<div class="list">${ALL.map((s) => `<div class="row"><div class="row-ico ${p.enabledSignals.includes(s) ? 'ok' : ''}">${p.enabledSignals.includes(s) ? '●' : '○'}</div><div class="row-body"><div class="row-title">${esc(signalLabel(s))}</div><div class="row-sub">${esc(DESC[s])}</div></div><div class="row-actions"><label class="sw"><input type="checkbox" ${p.enabledSignals.includes(s) ? 'checked' : ''} data-act="policy:toggle" data-id="${s}"><span class="sw-track"></span></label></div></div>`).join('')}</div>`, { sub: 'Se calculan con código cada 30 segundos, sin modelo. La severidad decide el canal: baja → panel · media → briefing · alta → briefing y WhatsApp · crítica → WhatsApp al instante.' })}
        ${card('Umbrales', `<div class="grid c4">${kpi('Inactivo', `${p.thresholds.inactiveDays}<small>días</small>`)}${kpi('Cierre próximo', `${p.thresholds.closeDateApproachingDays}<small>días</small>`)}${kpi('Estancado', `${p.thresholds.stageStalledDays}<small>días</small>`)}${kpi('Alto valor', money(p.thresholds.highValue.PEN), p.thresholds.highValue.mode === 'p75' ? 'p75 de tus negocios abiertos, recalculado a diario' : 'lo definiste tú')}</div><div style="margin-top:10px">${askLine('para mí un negocio grande es desde 300 mil', 'Cámbialos con una frase:')} ${askLine('para mí parado son 5 días', '')}</div>`)}`;
    }, { what: 'La configuración de señales', phrase: 'qué avisos tengo activos' });

    if (tab === 'eventos') body = part(d.eventRules, (rules) => card('Reglas por evento', list(rules, (r) => `<div class="row"><div class="row-ico ${r.status === 'active' ? 'warning' : ''}">⚡</div><div class="row-body"><div class="row-title">${esc(r.name)} ${statusChip(r.status)}</div>
        <div class="row-sub">Cuando <b>${esc({ RECORD_CREATED: 'se crea', RECORD_UPDATED: 'se actualiza', RECORD_DELETED: 'se borra', FIELD_CHANGED: 'cambia un campo de', STAGE_CHANGED: 'cambia de etapa' }[r.event] || r.event)} ${esc({ contact: 'un contacto', opportunity: 'un negocio', company: 'una empresa' }[r.entity] || r.entity)}</b> y ${esc(r.condition)} → ${esc(r.action)}</div>
        <div class="row-meta"><span>${num(r.firedWeek)} veces esta semana</span>${r.groupWindow ? `<span>agrupa eventos de ${r.groupWindow} min en un mensaje</span>` : ''}<span>creada ${esc(fmtDate(r.createdAt))}</span></div></div>
        <div class="row-actions">${r.status === 'active' ? waBtn('pausa la regla «' + r.name + '»', 'Pausar', 'btn sm ghost') : waBtn('reanuda la regla «' + r.name + '»', 'Reanudar')}${waBtn('cámbiame la regla «' + r.name + '»: ', 'Cambiar', 'btn sm ghost')}</div></div>`, 'Sin reglas por evento. Crea una con una frase.'),
      { sub: 'Se crean diciendo «cuando…» o «si…». Los eventos de una importación se agrupan en un solo mensaje. «Retrocedió de etapa» es un evento de primera clase.', right: waBtn('cuando entre un lead sin teléfono, avísame', 'Nueva regla', 'btn sm primary') }),
      { what: 'La lista de reglas por evento', phrase: 'qué reglas automáticas tengo' });

    if (tab === 'cadencia') body = part(d.agent, (a) => card('Avisos con cadencia', list(a.rules || [], (r) => { const cond = r.condition || {}; const metric = r.metric || cond.metric; const params = r.params || cond; return `<div class="row"><div class="row-ico ${r.status === 'active' ? '' : ''}">${r.critical ? '🚨' : '🔁'}</div><div class="row-body"><div class="row-title">${esc(r.name)} ${statusChip(r.status)} ${r.critical ? chip('atraviesa el silencio', 'bad') : ''}</div>
        <div class="row-sub">${esc(signalLabel(metric))}${params.entity ? ` · ${esc({ contact: 'contactos', opportunity: 'negocios', company: 'empresas' }[params.entity] || params.entity)}` : ''}${params.days ? ` · ${params.days} días` : ''}${params.key ? ` · por ${esc({ phone: 'teléfono', email: 'correo' }[params.key] || params.key)}` : ''} · avisa si ${esc({ gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' }[r.operator || cond.operator] || '≥')} ${esc(r.threshold ?? cond.threshold ?? 1)}</div>
        <div class="row-meta"><span>${esc(r.every || (r.intervalSeconds ? 'cada ' + Math.round(r.intervalSeconds / 3600) + ' h' : ''))}</span>${r.lastValue != null ? `<span>último valor: <b>${num(r.lastValue)}</b></span>` : ''}${r.lastFiredAt ? `<span>último aviso ${esc(rel(r.lastFiredAt))}</span>` : '<span>nunca disparó</span>'}${r.nextEvaluationAt ? `<span>próxima revisión ${esc(rel(r.nextEvaluationAt))}</span>` : ''}</div></div>
        <div class="row-actions"><button class="btn sm ${r.status === 'active' ? 'ghost' : ''}" data-act="rule:toggle" data-id="${esc(r.id)}" data-status="${r.status === 'active' ? 'paused' : 'active'}">${r.status === 'active' ? 'Pausar' : 'Reanudar'}</button>${waBtn('cámbiame el aviso «' + r.name + '» a ', 'Cambiar día u hora', 'btn sm ghost')}</div></div>`; }, 'Sin avisos con cadencia. Di «cada lunes…» o «cada mañana…».'),
      { sub: 'Se crean diciendo «cada lunes», «cada mañana», «una vez por semana». Tres avisos seguidos sin respuesta bajan solos a semanal y te lo dicen.', right: waBtn('avísame cada lunes qué negocios llevan 15 días sin movimiento', 'Nuevo aviso', 'btn sm primary') }),
      { what: 'Los avisos con cadencia', phrase: 'qué avisos programados tengo' });

    if (tab === 'preferencias') body = part(d.agent, (a) => { const p = a.preferences || {}; return `<div class="two">${card('Horario silencioso y presupuesto', `<form class="form" data-form="prefs">
        <div class="inline"><label>No me escribas desde<input name="quietStart" type="time" value="${esc(p.quietStart || '22:00')}"></label><label>hasta<input name="quietEnd" type="time" value="${esc(p.quietEnd || '07:00')}"></label></div>
        <label>Zona horaria<select name="timezone">${['America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/Guayaquil', 'America/Caracas', 'America/Montevideo', 'America/La_Paz', 'America/Asuncion', 'America/Costa_Rica', 'America/Guatemala'].map((z) => `<option ${p.timezone === z ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
        <div class="inline"><label>Máximo de avisos por día<input name="dailyMessageLimit" type="number" min="0" max="100" value="${esc(p.dailyMessageLimit ?? 5)}"></label><label>Prioridad mínima (0–100)<input name="minimumPriority" type="number" min="0" max="100" value="${esc(p.minimumPriority ?? 50)}"></label></div>
        <label class="sw" style="margin-top:4px"><input type="checkbox" name="proactiveEnabled" ${p.proactiveEnabled !== false ? 'checked' : ''}><span class="sw-track"></span><span>Comando puede escribirme sin que le pregunte</span></label>
        <label class="sw"><input type="checkbox" name="sundays" ${p.sundays ? 'checked' : ''}><span class="sw-track"></span><span>También los domingos (solo prioridad alta)</span></label>
        <div class="form-foot"><button class="btn primary" type="submit">Guardar</button><span class="form-msg"></span></div></form>
        <p class="note" style="margin-top:12px">Lo que cae en horario silencioso no se pierde: llega agrupado en el primer mensaje del día, marcado como «de anoche». La única excepción es el CRM sin sincronizar más de 30 horas.</p>`)}
      ${card('Briefing', `<form class="form" data-form="briefing">
        <label>Cadencia<select name="briefingCadence"><option value="daily" ${p.briefingCadence === 'daily' ? 'selected' : ''}>Diario (lunes a sábado)</option><option value="weekly" ${p.briefingCadence === 'weekly' ? 'selected' : ''}>Semanal, los lunes</option><option value="monthly" ${p.briefingCadence === 'monthly' ? 'selected' : ''}>Mensual, primer día hábil</option></select></label>
        <label>Hora<input name="briefingAt" type="time" value="${esc(p.briefingAt || '07:30')}"></label>
        <div class="form-foot"><button class="btn primary" type="submit">Guardar</button><span class="form-msg"></span></div></form>
        <div class="wa-preview" style="margin-top:12px">📊 <b>Qué merece tu atención hoy</b>
1️⃣ Torres del Parque 402 · S/ 610.000 · 19 días sin actividad
2️⃣ Miraflores Sky 1502 · cierre vencido hace 4 días
3️⃣ 6 leads de Urbania sin dueño desde anoche
Responde con el número, <b>LUEGO</b> o <b>BASTA</b>.</div>
        <p class="hint" style="margin-top:8px">Nunca llega vacío. El lunes incluye «la semana pasada moviste 4 de los 6 que te mostré». El contenido cambia por rol: nombres y celular para quien vende; agregado por dueño para quien dirige; duplicados e incompletos para quien cuida los datos.</p>`)}</div>`; },
      { what: 'Las preferencias', phrase: 'no me escribas después de las 9 de la noche' });

    if (tab === 'playbooks') body = part(d.playbooks, (pb) => { const groups = {}; pb.forEach((p) => { (groups[p.group] = groups[p.group] || []).push(p); }); const G = { 'speed-to-lead': 'Velocidad de respuesta', pipeline: 'Embudo', 'follow-up': 'Seguimiento', 'citas-tareas': 'Citas y tareas', datos: 'Calidad de datos', digest: 'Resúmenes', ecommerce: 'Tienda online' };
      return `<p class="hint" style="margin-bottom:12px">43 automatizaciones probadas, cada una con su evidencia. Se activan con la frase: Comando la convierte en regla, te muestra la vista previa y espera tu CONFIRMAR.</p>${Object.entries(groups).map(([g, items]) => card(G[g] || g, `<div class="list">${items.map((p) => `<div class="row"><div class="row-ico ${p.active ? 'ok' : ''}">${p.active ? '✓' : '＋'}</div><div class="row-body"><div class="row-title">${esc(p.name)} ${p.active ? chip('activa', 'ok') : ''} ${p.needs ? chip(p.needs, 'soon') : ''}</div>${p.evidence ? `<div class="row-sub">${esc(p.evidence)}</div>` : ''}<div class="ask-line" style="margin-top:4px"><q>${esc(p.ask)}</q></div></div><div class="row-actions">${p.active ? waBtn('cámbiame la regla «' + p.name + '»: ', 'Ajustar', 'btn sm ghost') : waBtn(p.ask, 'Activar')}</div></div>`).join('')}</div>`)).join('')}`; },
      { what: 'La galería de automatizaciones', phrase: 'qué automatizaciones me recomiendas' });

    return `<div class="stack"><div class="page-head"><div><h1>Avisos y automatizaciones</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('BASTA', 'Silenciar el último aviso')}${waBtn('no me escribas hoy', 'Silencio por hoy', 'btn')}</div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'is-on' : ''}">${l}</button>`).join('')}</div>${body}
      ${ag ? '' : ''}</div>`;
  },
  act: {
    'rule:toggle': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.ruleStatus(el.dataset.id, el.dataset.status); toast(el.dataset.status === 'paused' ? 'Aviso pausado.' : 'Aviso reanudado.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
    'policy:toggle': (el) => { el.checked = !el.checked; toast('Las señales se cambian por WhatsApp: «no me avises más de cierres próximos».'); window.open(wa(`${el.checked ? 'avísame' : 'no me avises más'} de ${signalLabel(el.dataset.id).toLowerCase()}`), '_blank'); },
    'fb:up': (el, ctx) => ctx.api.feedback({ notificationId: el.dataset.id, rating: 1 }).then(() => toast('Gracias. Más como este.', 'ok')).catch((e) => toast(e.message, 'bad')),
    'fb:down': (el, ctx) => ctx.api.feedback({ notificationId: el.dataset.id, rating: -1 }).then(() => toast('Anotado como ruido.', 'ok')).catch((e) => toast(e.message, 'bad')),
  },
  forms: {
    prefs: async (form, ctx) => {
      const f = new FormData(form);
      const body = { timezone: f.get('timezone'), quietStart: f.get('quietStart'), quietEnd: f.get('quietEnd'), dailyMessageLimit: Number(f.get('dailyMessageLimit')), minimumPriority: Number(f.get('minimumPriority')), proactiveEnabled: f.get('proactiveEnabled') === 'on' };
      await ctx.api.savePreferences(body); return 'Guardado. Aplica desde el próximo aviso.';
    },
    briefing: async (form, ctx) => { const f = new FormData(form); await ctx.api.savePreferences({ briefingCadence: f.get('briefingCadence'), briefingAt: f.get('briefingAt') }).catch((e) => { if (e.status === 400) { window.open(wa('mándame el briefing ' + { daily: 'cada mañana', weekly: 'cada lunes', monthly: 'cada mes' }[f.get('briefingCadence')] + ' a las ' + f.get('briefingAt')), '_blank'); return; } throw e; }); return 'Cadencia guardada.'; },
  },
};

/* ================================================================== HISTORIAL */
const historial = {
  id: 'historial', title: 'Historial de comandos', sub: 'Cada cosa que le pediste a Comando, qué plan armó, si lo confirmaste y qué pasó. 90 días de conversación; las ejecuciones quedan para siempre en el CRM.', icon: 'history', group: 'CRM',
  load: (api) => ({ history: api.history() }),
  view(d, ctx) {
    const f = ctx.tabs.historial || 'todos';
    const F = [['todos', 'Todos'], ['pending', 'Esperando'], ['executed', 'Ejecutados'], ['awaiting_approval', 'En aprobación'], ['failed', 'Fallidos'], ['cancelled', 'Cancelados']];
    return `<div class="stack"><div class="page-head"><div><h1>Historial de comandos</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('deshacer', 'Deshacer lo último')}${waBtn('qué fue lo último que hice', 'Pedir resumen', 'btn')}</div></div>
      ${part(d.history, (hs) => { const items = f === 'todos' ? hs : hs.filter((h) => h.status === f); return `<div class="card"><div class="tabs">${F.map(([k, l]) => `<button data-tab="${k}" class="${f === k ? 'is-on' : ''}">${l}${k === 'todos' ? '' : ' · ' + hs.filter((h) => h.status === k).length}</button>`).join('')}</div>${list(items, histRow, 'Nada con ese estado.')}</div>
        <div class="grid c3">${card('Cómo leerlo', `<p class="hint">Un plan «esperando» vence en 15 minutos. Uno «en aprobación» espera hasta 14 días a que el dueño lo apruebe. Uno «fallido» ya fue revertido: el CRM queda como estaba.</p>`)}${card('Deshacer', `<p class="hint">«deshacer» revierte el último plan ejecutado sobre el mismo conjunto de registros. Lo que ya escribió otra persona en el CRM no se toca.</p>`)}${card('Privacidad', `<p class="hint">El texto de la conversación se guarda 90 días para poder diagnosticar «mandé el sí y no pasó nada». Nadie de Comando lo lee sin tu pedido.</p>`)}</div>`; },
      { what: 'El historial en pantalla', phrase: 'qué fue lo último que hice', extra: 'La conversación completa sigue en tu WhatsApp.' })}</div>`;
  },
};

/* =============================================================== APROBACIONES */
const aprobaciones = {
  id: 'aprobaciones', title: 'Aprobaciones', sub: 'Planes de tu equipo que exceden un límite y esperan tu decisión: reasignaciones grandes, envíos con costo, descuentos, cambios masivos.', icon: 'shield', group: 'CRM',
  load: (api) => ({ approvals: api.approvals(), team: api.team() }),
  view(d) {
    const limits = val(d.team, {}).limits;
    return `<div class="stack"><div class="page-head"><div><h1>Aprobaciones</h1><p>${esc(this.sub)}</p></div></div>
      ${part(d.approvals, (aps) => { const pend = aps.filter((a) => a.status === 'pending'); const done = aps.filter((a) => a.status !== 'pending');
        const row = (a) => `<div class="row" data-ap="${esc(a.id)}"><div class="row-ico ${a.status === 'pending' ? 'warning' : a.status === 'approved' ? 'ok' : ''}">🔒</div><div class="row-body"><div class="row-title">${esc(a.plan)} ${statusChip(a.status)}</div><div class="row-sub">Pidió <b>${esc(a.requester)}</b> ${esc(rel(a.createdAt))} · ${esc(a.reason)}</div>
          <div class="wa-preview" style="margin-top:8px">📋 <b>Plan</b>\n${a.preview.map(esc).join('\n')}\nRef: ${esc(a.ref)}</div>
          ${a.status !== 'pending' ? `<div class="row-meta"><span>${a.status === 'approved' ? 'Aprobó' : 'Rechazó'} ${esc(a.decidedBy)} ${esc(rel(a.decidedAt))}</span>${a.decisionReason ? `<span>«${esc(a.decisionReason)}»</span>` : ''}</div>` : `<div class="row-meta"><span>vence ${esc(rel(a.expiresAt))}</span></div>`}</div>
          <div class="row-actions">${a.status === 'pending' ? `<button class="btn sm primary" data-act="ap:approve" data-id="${esc(a.id)}">Aprobar</button><button class="btn sm danger" data-act="ap:reject" data-id="${esc(a.id)}">Rechazar</button>` : ''}</div></div>`;
        return `${card('Esperando tu decisión', list(pend, row, 'Nada pendiente.'), { sub: 'Al aprobar, el plan se ejecuta con los mismos controles que si lo hubieras pedido tú. Rechazar exige un motivo, que le llega a quien lo pidió.' })}${card('Decididas', list(done, row, 'Todavía nada.'))}`; },
      { what: 'La bandeja de aprobaciones', phrase: 'qué aprobaciones tengo pendientes', extra: 'Hoy los pedidos de aprobación te llegan por WhatsApp con su referencia.' })}
      ${limits ? card('Límites de tu equipo', `<div class="grid c4">${kpi('Reasignar sin aprobar', `${limits.assignMax}<small>registros</small>`)}${kpi('Envíos con costo', money(limits.broadcastMaxCost), 'máximo autorizado por plan')}${kpi('Descuento sin aprobar', `${limits.discountMaxPct}<small>%</small>`)}${kpi('Segundo factor', `>${limits.stepUpAbove}<small>registros</small>`, 'PIN de 6 dígitos')}</div><p class="hint" style="margin-top:10px">Los límites por rol se definen con Comando: «Ale puede reasignar hasta 20 sin preguntarme».</p>`) : ''}</div>`;
  },
  act: {
    'ap:approve': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'approve'); toast('Aprobado. Se ejecuta en unos segundos.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
    'ap:reject': async (el, ctx, d, reload) => { const reason = window.prompt('Motivo del rechazo (le llega a quien lo pidió):'); if (!reason) return; el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'reject', reason); toast('Rechazado.', 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
  },
};

/* ================================================================== MARKETING */
const marketing = {
  id: 'marketing', title: 'Marketing', sub: 'Campañas de Facebook, Instagram y TikTok conectadas a tu CRM: qué leads trajo cada una, cuánto costaron y en qué terminaron. Con automatizaciones, reportes y un analista humano.', icon: 'mega', group: 'Marketing', isNew: true,
  load: (api) => ({ mk: api.marketing() }),
  view(d, ctx) {
    const tab = ctx.tabs.marketing || 'campanas';
    const tabs = [['campanas', 'Campañas'], ['automatizaciones', 'Automatizaciones'], ['reportes', 'Reportes'], ['analista', 'Tu analista']];
    const body = part(d.mk, (m) => {
      const cur = m.period.currency;
      if (tab === 'campanas') {
        const delta = (a, b, inverse) => { if (!b) return ''; const x = (a - b) / b; const good = inverse ? x < 0 : x > 0; return `<span class="${good ? 'sev-ok' : 'sev-warning'}">${x > 0 ? '+' : ''}${Math.round(x * 100)} % vs periodo anterior</span>`; };
        const accounts = `<div class="inline-list">${m.accounts.map((a) => `<span class="chip ${a.status === 'active' ? 'ok' : a.status === 'pending' ? 'warn' : 'soon'}"><img class="logo-sm" style="height:14px" src="../../assets/img/logos/${a.provider === 'google-ads' ? 'automation' : a.provider}.svg" alt=""> ${esc(a.name)} · ${a.status === 'active' ? 'conectada' : a.status === 'pending' ? 'falta autorizar' : 'próximamente'}</span>`).join('')}<button class="btn sm" data-act="mk:connect">Conectar cuenta</button></div>`;
        const table = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Campaña</th><th>Canal</th><th>Estado</th><th class="num">Diario</th><th class="num">Gasto</th><th class="num">Leads</th><th class="num">CPL</th><th class="num">CTR</th><th class="num">Calif. · Ganados</th><th></th></tr></thead><tbody>
          ${m.campaigns.map((c) => `<tr><td><b>${esc(c.name)}</b><div class="dim" style="font-size:12px">${esc(c.objective)}${c.pausedReason ? ` · <span class="sev-warning">${esc(c.pausedReason)}</span>` : ''}</div></td><td class="dim">${esc(c.channel)}</td><td>${statusChip(c.status)}</td><td class="num">${money(c.dailyBudget, cur)}</td><td class="num">${money(c.spend, cur)}</td><td class="num"><b>${num(c.leads)}</b></td><td class="num">${money(c.cpl, cur)} ${c.trend === 'up' ? '<span class="sev-ok">↓</span>' : c.trend === 'down' ? '<span class="sev-warning">↑</span>' : ''}</td><td class="num">${String(c.ctr).replace('.', ',')} %</td><td class="num">${num(c.crmQualified)} · ${num(c.crmWon)}</td><td>${c.status === 'active' ? waBtn('pausa la campaña «' + c.name + '»', 'Pausar', 'btn sm ghost') : waBtn('reanuda la campaña «' + c.name + '»', 'Reanudar')}</td></tr>`).join('')}</tbody></table></div>`;
        const funnel = `<div class="funnel">${m.funnel.map((s, i) => `<div class="funnel-step"><span>${esc(s.label)}</span><div class="bar-track"><div class="bar-fill ${i < 2 ? 'blue' : i < 5 ? '' : 'warn'}" style="width:${Math.max(2, Math.round((Math.log10(s.value + 1) / Math.log10(m.funnel[0].value + 1)) * 100))}%"></div></div><span class="bar-val"><b>${num(s.value)}</b>${i ? ` · ${Math.round((s.value / m.funnel[i - 1].value) * 100)} %` : ''}</span></div>`).join('')}</div><p class="hint" style="margin-top:8px">Del anuncio al CRM: el lead se atribuye a la campaña al entrar y se sigue hasta ganado. «Contactados en menos de 5 min» viene de las reglas de velocidad de respuesta.</p>`;
        return `<div class="card">${accounts}</div>
          <div class="grid c4">${kpi('Inversión · ' + m.period.label, money(m.period.spend, cur), delta(m.period.spend, m.period.prevSpend, true))}${kpi('Leads en el CRM', num(m.period.leads), delta(m.period.leads, m.period.prevLeads))}${kpi('Costo por lead', money(m.period.cpl, cur), delta(m.period.cpl, m.period.prevCpl, true))}${kpi('Costo por venta', money(m.period.won ? m.period.spend / m.period.won : 0, cur), `${num(m.period.won)} ventas · ${money(m.period.revenue, cur)}`)}</div>
          ${card('Campañas', table, { sub: 'Pausar o cambiar presupuesto pasa por vista previa y CONFIRMAR, como cualquier escritura.' })}
          <div class="two">${card('Del anuncio a la venta', funnel)}${card('Cómo se atribuye', `<div class="stack">${['El lead entra al CRM con su fuente y su campaña (formulario de Meta o TikTok, o el parámetro de la landing).', 'Comando lo sigue por el embudo: contactado, calificado, visita, ganado. Nada se recalcula a mano.', 'El costo por venta usa la inversión real de la cuenta de anuncios y el monto del negocio en el CRM.', 'Los leads sin teléfono, duplicados o sin fuente aparecen en «Qué revisar en tu CRM» porque rompen la atribución.'].map((x) => `<div class="note">${esc(x)}</div>`).join('')}</div>`)}</div>`;
      }
      if (tab === 'automatizaciones') return `${card('Automatizaciones de marketing', list(m.automations, (a) => `<div class="row"><div class="row-ico ${a.status === 'active' ? 'ok' : ''}">${{ budget: '💸', speed: '⚡', audience: '🎯', report: '📊' }[a.kind] || '🔁'}</div><div class="row-body"><div class="row-title">${esc(a.name)} ${statusChip(a.status)}</div><div class="row-meta"><span>${num(a.firedMonth)} veces este mes</span><span>${esc({ budget: 'presupuesto', speed: 'velocidad de respuesta', audience: 'audiencias desde el CRM', report: 'reporte' }[a.kind] || a.kind)}</span></div></div><div class="row-actions">${a.status === 'active' ? waBtn('pausa la automatización «' + a.name + '»', 'Pausar', 'btn sm ghost') : waBtn('reanuda la automatización «' + a.name + '»', 'Reanudar')}</div></div>`), { sub: 'Las mismas reglas del CRM, con dos piezas nuevas: el presupuesto de las campañas y las audiencias que se arman desde tus etapas.', right: waBtn('si el costo por lead de una campaña pasa de 60 soles tres días seguidos, pausala y avísame', 'Nueva', 'btn sm primary') })}
        ${card('Qué puedes automatizar', `<div class="grid c3">${[['💸 Presupuesto', 'Pausar o bajar el presupuesto cuando el costo por lead se dispara; subirlo con confirmación cuando rinde.', 'si el CPL pasa de 60 soles tres días seguidos, pausa la campaña'], ['⚡ Velocidad', 'Avisar al dueño cuando un lead de campaña lleva 5 minutos sin contacto. Responder en menos de 5 minutos multiplica por 21 la calificación.', 'si un lead de Meta Ads pasa 5 minutos sin contacto, avísale al dueño'], ['🎯 Audiencias', 'Los que ya compraron salen de las campañas; los que están en Negociación entran al retargeting. Sin subir listas a mano.', 'saca de las campañas a los que ya están en Cerrado ganado'], ['📊 Reportes', 'Cada lunes: gasto, leads, CPL por campaña y cuántos ya son negocios.', 'mándame cada lunes el reporte de campañas'], ['🧾 Formularios', 'Cuando un lead llega sin teléfono desde el formulario del anuncio, avisar y crear tarea de completar.', 'si entra un lead de campaña sin teléfono, avísame y créame tarea'], ['🔁 Reactivación', 'Los perdidos por «Fuera de presupuesto» vuelven a una audiencia a los 90 días.', 'a los perdidos por fuera de presupuesto ponlos en retargeting a los 90 días']].map(([t, s, q]) => `<div class="card" style="background:var(--card-2)"><b>${t}</b><p class="hint" style="margin:6px 0 8px">${esc(s)}</p>${waBtn(q, 'Activar')}</div>`).join('')}</div>`)}`;
      if (tab === 'reportes') return `${card('Reportes entregados', list(m.reports, (r) => `<div class="row"><div class="row-ico">📈</div><div class="row-body"><div class="row-title">${esc(r.title)} ${chip(r.kind === 'weekly' ? 'semanal' : 'mensual', 'info')}</div><ul style="margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:13px">${r.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul><div class="row-meta"><span>${esc(fmtDate(r.at, true))}</span></div></div><div class="row-actions"><button class="btn sm" data-act="mk:report" data-id="${esc(r.id)}">Ver</button>${waBtn('mándame el reporte «' + r.title + '»', 'Al WhatsApp', 'btn sm ghost')}</div></div>`), { sub: 'Semanal los lunes, mensual el primer día hábil. Con lo que cambió, no con todo.', right: waBtn('mándame el reporte de campañas de esta semana', 'Pedir ahora', 'btn sm primary') })}
        ${card('Qué incluye cada reporte', `<div class="grid c3">${['Inversión y leads por canal y campaña, contra el periodo anterior', 'Embudo: impresiones → clics → leads → contactados → calificados → visitas → ganados', 'Costo por lead, por calificado y por venta; ingresos atribuidos desde el CRM', 'Velocidad de respuesta a leads de campaña por persona', 'Leads sin teléfono, duplicados o sin fuente que rompen la atribución', 'Recomendaciones del analista y qué pasó con las anteriores'].map((x) => `<div class="note">${esc(x)}</div>`).join('')}</div>`)}`;
      if (tab === 'analista') { const an = m.analyst; return `<div class="two wide">${card('Tu analista', `<div class="person"><div class="avatar">${esc(an.avatar)}</div><div><b>${esc(an.name)}</b><div class="hint">${esc(an.title)}</div></div></div>
          <div class="grid c3" style="margin-top:14px"><div class="kpi"><div class="kpi-label">Próxima revisión</div><div class="kpi-value" style="font-size:16px">${esc(fmtDateTime(an.nextReviewAt))}</div></div><div class="kpi"><div class="kpi-label">Última entrega</div><div class="kpi-value" style="font-size:16px">${esc(rel(an.lastDeliveryAt))}</div></div><div class="kpi"><div class="kpi-label">Responde en</div><div class="kpi-value" style="font-size:16px">${esc(an.responseSla)}</div></div></div>
          <form class="form" data-form="analyst" style="margin-top:14px"><label>Pídele un análisis<textarea name="topic" rows="3" placeholder="Ej.: ¿Conviene mover presupuesto de TikTok a Instagram para San Isidro Prime?"></textarea></label><div class="inline"><label>Urgencia<select name="urgency"><option value="normal">Normal (1 día hábil)</option><option value="alta">Alta (hoy)</option></select></label><label>Sobre<select name="scope"><option>Todas las campañas</option>${m.campaigns.map((c) => `<option>${esc(c.name)}</option>`).join('')}</select></label></div><div class="form-foot"><button class="btn primary" type="submit">Enviar</button><span class="form-msg"></span></div></form>`)}
        ${card('Recomendaciones', list(an.recommendations, (r) => `<div class="row"><div class="row-ico ${r.status === 'applied' ? 'ok' : 'warning'}">${r.status === 'applied' ? '✓' : '💡'}</div><div class="row-body"><div class="row-title">${esc(r.text)}</div><div class="row-meta"><span>${esc(fmtDate(r.at))}</span><span>impacto ${esc(r.impact)}</span><span>${r.status === 'applied' ? 'aplicada' : 'pendiente'}</span></div></div><div class="row-actions">${r.status === 'pending' ? `${waBtn('aplica la recomendación de mi analista: ' + r.text, 'Aplicar')}<button class="btn sm ghost" data-act="mk:later" data-id="${esc(r.id)}">Luego</button>` : ''}</div></div>`), { sub: 'Tu analista revisa las campañas y el CRM cada semana. Aplicar una recomendación pasa por Comando con vista previa y CONFIRMAR.' })}</div>
        ${card('Preguntas anteriores', list(an.requests, (q) => `<div class="row"><div class="row-ico">❓</div><div class="row-body"><div class="row-title">${esc(q.topic)}</div><div class="row-sub">${esc(q.answer || 'En revisión')}</div><div class="row-meta"><span>${esc(fmtDate(q.at))}</span><span>${q.status === 'answered' ? 'respondida' : 'en revisión'}</span></div></div></div>`))}`; }
      return '';
    }, { what: 'Marketing', phrase: 'quiero conectar mis campañas de Facebook e Instagram', extra: 'Conecta tu cuenta de anuncios y Comando empezará a atribuir cada lead a su campaña.' });
    return `<div class="stack"><div class="page-head"><div><h1>Marketing ${chip('nuevo', 'info')}</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('cuántos leads trajo cada campaña esta semana', 'Preguntar por WhatsApp', 'btn primary')}</div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-tab="${k}" class="${tab === k ? 'is-on' : ''}">${l}</button>`).join('')}</div>${body}</div>`;
  },
  act: {
    'mk:connect': () => toast('La conexión de cuentas de anuncios se activa pronto. Mientras tanto, escríbenos: hola@comando.pro'),
    'mk:report': () => toast('El visor de reportes se activa pronto. Pídelo por WhatsApp para recibirlo en PDF.'),
    'mk:later': (el) => { el.closest('.row').style.opacity = '.5'; toast('Lo verás en la próxima revisión.'); },
  },
  forms: { analyst: async (form, ctx) => { const f = new FormData(form); if (!String(f.get('topic') || '').trim()) throw new Error('Escribe qué quieres analizar.'); console.info('[panel] pedido al analista', Object.fromEntries(f)); await new Promise((r) => setTimeout(r, 400)); form.reset(); return 'Enviado. Te responde por aquí y por WhatsApp.'; } },
};

/* ==================================================================== COMANDO */
const comando = {
  id: 'comando', title: 'Mi Comando', sub: 'Cómo se llama, qué sabe de tu negocio y qué le has enseñado: definiciones, correcciones y alias que aprendió de tus mensajes.', icon: 'bot', group: 'Cuenta',
  load: (api) => ({ agent: api.agent() }),
  view(d) {
    return `<div class="stack"><div class="page-head"><div><h1>Mi Comando</h1><p>${esc(this.sub)}</p></div></div>
      ${part(d.agent, (a) => { const p = a.profile || {}; const bc = p.businessContext || {}; const KIND = { definition: ['Definición', 'info'], business_fact: ['Dato del negocio', ''], preference: ['Preferencia', 'ok'], decision: ['Decisión', ''], correction: ['Corrección', 'warn'] };
        return `<div class="two">${card('Perfil', `<form class="form" data-form="profile"><label>Nombre<input name="name" value="${esc(p.name || 'Comando')}" maxlength="120"></label>
          <label>Instrucciones (cómo quieres que priorice y hable)<textarea name="instructions" rows="4" maxlength="12000">${esc(p.instructions || '')}</textarea></label>
          <div class="inline"><label>Rubro<input name="industry" value="${esc(bc.industry || '')}"></label><label>Productos (separados por coma)<input name="products" value="${esc((bc.products || []).join(', '))}"></label></div>
          <label>Qué es un lead calificado para ti<input name="qualifiedLeadDefinition" value="${esc(bc.qualifiedLeadDefinition || '')}"></label>
          <label class="sw"><input type="checkbox" name="active" ${p.status !== 'paused' ? 'checked' : ''}><span class="sw-track"></span><span>Activo</span></label>
          <div class="form-foot"><button class="btn primary" type="submit">Guardar</button><span class="form-msg"></span></div></form>
          <p class="note" style="margin-top:12px">Este contexto ayuda a Comando a entender «VIP» o «proyecto». Nunca concede permisos ni evita la vista previa, la política ni el CONFIRMAR.</p>`)}
        ${card('Lo que le enseñaste', `${list(a.memories || [], (m) => { const [l, c] = KIND[m.kind] || [m.kind, '']; return `<div class="row"><div class="row-ico">🧠</div><div class="row-body"><div class="row-title">${chip(l, c)}</div><div class="row-sub" style="color:var(--text)">${esc(m.content)}</div><div class="row-meta"><span>${esc(fmtDate(m.createdAt, true))}</span>${m.expiresAt ? `<span>vence ${esc(fmtDate(m.expiresAt))}</span>` : ''}</div></div><div class="row-actions">${waBtn('olvida que ' + m.content, 'Olvidar', 'btn sm ghost')}</div></div>`; }, 'Todavía no le has enseñado nada.')}
          <form class="form" data-form="memory" style="margin-top:12px"><div class="inline"><label>Tipo<select name="kind"><option value="definition">Definición</option><option value="business_fact">Dato del negocio</option><option value="preference">Preferencia</option><option value="decision">Decisión</option><option value="correction">Corrección</option></select></label><label>Vence<input name="expiresAt" type="date"></label></div><label>Qué debe recordar<input name="content" placeholder="Ej.: Un lead parado lleva 5 días sin actividad" maxlength="4000" required></label><div class="form-foot"><button class="btn primary" type="submit">Enseñar</button><span class="form-msg"></span></div></form>
          <p class="hint" style="margin-top:8px">Comando no aprende en silencio de una conversación: solo lo que le dices explícitamente («para mí parado son 5 días») o agregas aquí.</p>`)}</div>
        ${card('Alias que aprendió', (a.aliases && a.aliases.length) ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cuando dices</th><th>Comando entiende</th><th>Campo</th></tr></thead><tbody>${a.aliases.map((x) => `<tr><td><q>${esc(x.term)}</q></td><td><b>${esc(x.value)}</b></td><td class="dim">${esc(x.field)}</td></tr>`).join('')}</tbody></table></div>` : empty('Sin alias todavía', 'Cuando Comando te pregunte «¿cuál de estas opciones?» y respondas con el número, aprende el alias y no vuelve a preguntar.'), { sub: 'Los valores de listas (etapas, dueños, fuentes) siempre pasan por el catálogo de tu CRM: Comando nunca inventa una opción.' })}`; },
      { what: 'El perfil del agente', phrase: 'para mí un negocio grande es desde 300 mil' })}</div>`;
  },
  forms: {
    profile: async (form, ctx, d) => { const f = new FormData(form); const prev = val(d.agent, {}).profile || {}; await ctx.api.saveProfile({ name: f.get('name'), instructions: f.get('instructions') || '', businessContext: { ...(prev.businessContext || {}), industry: f.get('industry') || undefined, products: String(f.get('products') || '').split(',').map((s) => s.trim()).filter(Boolean), qualifiedLeadDefinition: f.get('qualifiedLeadDefinition') || undefined }, status: f.get('active') === 'on' ? 'active' : 'paused' }); return 'Perfil guardado.'; },
    memory: async (form, ctx, d, reload) => { const f = new FormData(form); const body = { kind: f.get('kind'), content: f.get('content') }; if (f.get('expiresAt')) body.expiresAt = new Date(f.get('expiresAt') + 'T23:59:59Z').toISOString(); await ctx.api.addMemory(body); form.reset(); setTimeout(reload, 600); return 'Aprendido.'; },
  },
};

/* ============================================================== INTEGRACIONES */
const integraciones = {
  id: 'integraciones', title: 'Integraciones', sub: 'Tu CRM, tus hojas y tus cuentas de anuncios. Solo el CRM activo se consulta cuando hablas con Comando.', icon: 'plug', group: 'Cuenta',
  load: (api) => ({ connections: api.connections(), sheets: api.sheets(), fields: api.fieldsSummary(), mk: api.marketing() }),
  view(d) {
    const NAMES = { hubspot: 'HubSpot', salesforce: 'Salesforce', 'google-sheets': 'Google Sheets', pipedrive: 'Pipedrive', zoho: 'Zoho CRM', kommo: 'Kommo', shopify: 'Shopify', tiendanube: 'Tiendanube', woocommerce: 'WooCommerce', mercadolibre: 'Mercado Libre', vtex: 'VTEX', dynamics: 'Dynamics 365', highlevel: 'GoHighLevel', meta: 'Meta Ads', tiktok: 'TikTok Ads' };
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${esc(p)}.svg" alt="">`;
    const conns = val(d.connections, []); const active = conns.find((c) => c.bound && c.status === 'active'); const recoverable = conns.find((c) => c.recoverable);
    const fields = val(d.fields, null);
    const crmCard = card('CRM activo', active ? `<div class="row"><div class="row-ico">${logo(active.provider)}</div><div class="row-body"><div class="row-title">${esc(NAMES[active.provider] || active.name)} ${chip('conectado', 'ok')}</div><div class="row-sub">${active.mirror ? `Espejo: <b>${num(active.mirror.contacts)}</b> contactos · <b>${num(active.mirror.companies)}</b> empresas · <b>${num(active.mirror.deals)}</b> negocios · ${active.mirror.owners} dueño${active.mirror.owners === 1 ? '' : 's'} cargado${active.mirror.owners === 1 ? '' : 's'}` : 'Conexión activa'}${active.lastReconciledAt ? ` · sincronizado ${esc(rel(active.lastReconciledAt))}` : ''}</div>
        ${active.capabilities ? `<div class="row-meta"><span>escribe: ${Object.entries(active.capabilities.writes).filter(([, v]) => v).map(([k]) => ({ tags: 'etiquetas', fields: 'campos', notes: 'notas', tasks: 'tareas', records: 'altas' }[k])).join(', ')}</span>${active.capabilities.hiddenFields.length ? `<span class="sev-warning">campos ocultos por permisos: ${active.capabilities.hiddenFields.join(', ')}</span>` : '<span>sin campos ocultos</span>'}${active.capabilities.tagField ? `<span>etiquetas en <code>${esc(active.capabilities.tagField)}</code></span>` : '<span class="sev-warning">sin campo de etiquetas</span>'}</div>` : ''}</div>
        <div class="row-actions"><a class="btn sm" href="../dashboard/">Qué puede consultar</a><a class="btn sm ghost" href="../#step-crm">Cambiar o desconectar</a></div></div>
        ${fields && fields.counts ? `<div class="grid c3" style="margin-top:10px">${Object.entries(fields.counts).map(([k, v]) => `<div class="kpi"><div class="kpi-label">${esc({ contact: 'Contactos', deal: 'Negocios', opportunity: 'Negocios', company: 'Empresas' }[k] || k)}</div><div class="kpi-value">${num(v.active ?? v.queryable ?? 0)}<small>de ${num(v.total)} campos activos</small></div></div>`).join('')}</div>` : ''}`
      : recoverable ? `<div class="note warn"><b>${esc(NAMES[recoverable.provider] || recoverable.name)} está desvinculado.</b> Conservamos la copia hasta ${esc(fmtDate(recoverable.purgeAfter, true))}. <a href="../#step-crm">Volver a vincular</a></div>` : `<div class="empty"><b>Sin CRM conectado</b>Comando ya responde sobre tus hojas; conecta un CRM para el embudo, las señales y las automatizaciones.</div><div class="inline-list" style="justify-content:center"><a class="btn primary" href="../#step-crm">Conectar CRM</a></div>`,
      { sub: 'Conectado con el login del propio CRM, sin copiar claves. Credenciales cifradas en Comando; nunca en terceros.' });
    const sheets = part(d.sheets, (ss) => list(ss, (s) => `<div class="row"><div class="row-ico">${logo('googlesheets')}</div><div class="row-body"><div class="row-title">${esc(s.displayName || s.spreadsheetId)}</div><div class="row-sub">Pestaña «${esc(s.sheetTitle)}» · identidad por columna <code>comando_id</code> · nunca sobre fórmulas</div></div><div class="row-actions">${waBtn('cuántas filas tiene ' + (s.displayName || 'la hoja'), 'Consultar', 'btn sm ghost')}</div></div>`, 'Ninguna hoja conectada.'), { what: 'Las hojas conectadas' });
    const mk = val(d.mk, null);
    const ads = mk ? list(mk.accounts, (a) => `<div class="row"><div class="row-ico">${logo(a.provider === 'google-ads' ? 'automation' : a.provider)}</div><div class="row-body"><div class="row-title">${esc(a.name)} ${a.status === 'active' ? chip('conectada', 'ok') : a.status === 'pending' ? chip('falta autorizar', 'warn') : chip('próximamente', 'soon')}</div><div class="row-sub">${esc(a.channels.join(' · '))}${a.lastSyncAt ? ` · sincronizada ${esc(rel(a.lastSyncAt))}` : ''}</div></div><div class="row-actions">${a.status === 'pending' ? '<button class="btn sm primary" data-act="mk:connect">Autorizar</button>' : a.status === 'active' ? '<a class="btn sm ghost" href="#/marketing">Ver campañas</a>' : ''}</div></div>`) : soon('Las cuentas de anuncios', null, 'Meta (Facebook e Instagram) y TikTok Ads se conectan con el mismo login seguro que tu CRM.');
    const catalog = ['pipedrive', 'zoho', 'kommo', 'dynamics', 'highlevel', 'shopify', 'tiendanube', 'woocommerce', 'mercadolibre', 'vtex'];
    return `<div class="stack"><div class="page-head"><div><h1>Integraciones</h1><p>${esc(this.sub)}</p></div><div class="page-actions">${waBtn('qué CRM tengo conectado', 'Preguntar por WhatsApp')}</div></div>
      ${crmCard}<div class="two">${card('Hojas de Google', sheets, { sub: 'Solo los archivos que elegiste en el selector. Comando revisa cambios según tu plan; una hoja no avisa cuando cambia.', right: '<a class="btn sm" href="../#step-crm">Agregar hoja</a>' })}${card('Cuentas de anuncios', ads, { sub: 'Para la sección Marketing.' })}</div>
      ${card('En preparación', `<div class="inline-list">${catalog.map((p) => `<span class="chip soon">${logo(p)} ${esc(NAMES[p])}</span>`).join('')}<span class="chip soon">${logo('webhook')} Webhook genérico</span></div><p class="hint" style="margin-top:10px">«Soportado» significa certificado para objetos y operaciones concretas, no un logo. Cuando un conector se active, Comando te dirá qué escrituras implementa y qué campos esconden tus permisos.</p>`)}
    </div>`;
  },
  act: { 'mk:connect': marketing.act['mk:connect'] },
};

/* ====================================================================== EQUIPO */
const equipo = {
  id: 'equipo', title: 'Equipo', sub: 'Quién usa Comando en tu cuenta, con qué rol, y cómo se corresponde con los dueños de tu CRM.', icon: 'users', group: 'Cuenta',
  load: (api) => ({ team: api.team(), health: api.health() }),
  view(d) {
    return `<div class="stack"><div class="page-head"><div><h1>Equipo</h1><p>${esc(this.sub)}</p></div><div class="page-actions"><button class="btn primary" data-act="team:invite">Invitar persona</button></div></div>
      ${part(d.team, (t) => { const ROLE = { owner: ['Dueño', 'ok'], admin: ['Admin', 'ok'], supervisor: ['Supervisor', 'info'], agent: ['Vendedor', ''], analyst: ['Analista', 'info'] };
        const rows = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Persona</th><th>Rol</th><th>Equipo</th><th>WhatsApp</th><th>Dueño en el CRM</th><th class="num">Comandos · mes</th><th>Última actividad</th><th></th></tr></thead><tbody>${t.people.map((p) => { const [rl, rc] = ROLE[p.role] || [p.role, '']; return `<tr><td><div class="person"><div class="avatar">${esc(p.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div><b>${esc(p.name)}</b></div></td><td>${chip(rl, rc)}</td><td class="dim">${esc(p.team || '—')}</td><td>${statusChip(p.whatsapp)}</td><td>${p.crmOwner ? esc(p.crmOwner) : '<span class="sev-warning">sin vincular</span>'}</td><td class="num">${num(p.commandsMonth)}</td><td class="dim">${p.lastActive ? esc(rel(p.lastActive)) : '—'}</td><td>${waBtn('cambia el rol de ' + p.name + ' a ', 'Cambiar rol', 'btn sm ghost')}</td></tr>`; }).join('')}</tbody></table></div>`;
        const owners = val(d.health, null)?.owners || { crmOwners: t.crmOwners, comandoPeople: t.people.length };
        return `${card('Personas', rows, { sub: 'Cada persona tiene su propio plan, su cupo de comandos y su espejo del CRM.' })}
          <div class="two">${card('Dueños en el CRM', `<div class="grid c2"><div class="kpi"><div class="kpi-label">Dueños cargados en el CRM</div><div class="kpi-value ${owners.crmOwners <= 1 && owners.comandoPeople > 1 ? 'sev-warning' : ''}">${num(owners.crmOwners)}</div></div><div class="kpi"><div class="kpi-label">Personas en Comando</div><div class="kpi-value">${num(owners.comandoPeople)}</div></div></div>${owners.crmOwners <= 1 && owners.comandoPeople > 1 ? '<p class="note warn" style="margin-top:10px">Mientras el CRM tenga un solo dueño, «mis negocios» y las vistas por vendedor no distinguen personas. Carga el propietario en cada registro (o pídele a Comando: «pásale a Ale todos los de Miraflores»).</p>' : '<p class="hint" style="margin-top:10px">Comando une a cada persona con su usuario del CRM por correo; así «mis negocios» significa los suyos.</p>'}`)}
          ${card('Roles', `<div class="list">${Object.entries(t.roles).map(([r, desc]) => { const [rl, rc] = ROLE[r] || [r, '']; return `<div class="row"><div class="row-ico">${{ owner: '👑', admin: '🛠', supervisor: '👀', agent: '🏃', analyst: '📐' }[r] || '•'}</div><div class="row-body"><div class="row-title">${chip(rl, rc)}</div><div class="row-sub">${esc(desc)}</div></div></div>`; }).join('')}</div>`)}</div>
          ${card('Lo que Comando nunca hace con tu equipo', `<div class="grid c3">${['Un aviso sobre una persona le llega primero a la persona; al gerente, después o nunca. Sin adjetivos.', 'Nunca rankings al grupo. Eso lo hace el gerente, en persona, con contexto.', 'Nunca el uso de Comando como métrica de nadie.', 'Nunca tu nombre en un mensaje que no escribiste: Comando habla por Comando.', 'Nunca sugiere reasignar a nadie. Puede decir que Diego tiene 7 sin monto; la decisión es tuya.', 'Nunca proyecciones ni felicitaciones automáticas en nombre de nadie.'].map((x) => `<div class="note">${esc(x)}</div>`).join('')}</div>`, { sub: 'Política anti-vigilancia. Pedida por dueños, vendedores, gerentes y analistas por caminos distintos.' })}`; },
      { what: 'La gestión del equipo', phrase: 'quiénes usan Comando en mi cuenta', extra: 'Hoy cada persona se registra en comando.pro/app con su propio WhatsApp.' })}</div>`;
  },
  act: { 'team:invite': () => { toast('Cada persona se registra con su propio WhatsApp en comando.pro/app. Te copiamos el enlace.'); navigator.clipboard?.writeText(location.origin + '/app/'); } },
};

/* ========================================================================= PLAN */
const plan = {
  id: 'plan', title: 'Plan y consumo', sub: 'Tu plan individual, los comandos que llevas este mes, el tamaño de tu espejo y tus conexiones.', icon: 'card', group: 'Cuenta',
  load: (api) => ({ me: api.me(), quota: api.quota(), plans: api.publicPlans() }),
  view(d) {
    const me = val(d.me, {}); const plans = val(d.plans, []);
    const PLAN = { gratis: 'Gratis', free: 'Gratis', basico: 'Básico', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    const current = (me.plan || '').toLowerCase();
    return `<div class="stack"><div class="page-head"><div><h1>Plan y consumo</h1><p>${esc(this.sub)}</p></div><div class="page-actions"><a class="btn primary" href="../../#precios">Cambiar de plan</a></div></div>
      ${part(d.quota, (q) => { const total = q.commands.allowance + q.commands.addons + q.commands.adjustments; const share = total ? q.commands.used / total : 0; const cls = share >= 1 ? 'bad' : share >= 0.8 ? 'warn' : '';
        return `<div class="grid c4">${kpi('Plan', `${esc(q.plan.name)}<small>US$ ${q.plan.priceUsd}/${q.plan.interval === 'month' ? 'mes' : 'año'}</small>`, `Se renueva ${fmtDate(q.period.resetAt, true)}`)}
          ${kpi('Comandos', `${num(q.commands.used)}<small>de ${num(total)}</small>`, `<div class="progress ${cls}"><i style="width:${Math.min(100, Math.round(share * 100))}%"></i></div>${share >= 0.8 ? '<span class="sev-warning">Pasaste el 80 %: te avisamos, nunca cortamos sin aviso.</span>' : `${num(q.commands.balance)} disponibles · ${pct(q.audioShare)} por audio`}`)}
          ${kpi('Contactos en tu espejo', `${num(q.contacts.used)}<small>de ${num(q.contacts.limit)}</small>`, `<div class="progress"><i style="width:${Math.max(1, Math.round((q.contacts.used / q.contacts.limit) * 100))}%"></i></div>se mide una vez al día`)}
          ${kpi('Conexiones', `${num(q.connections.used)}<small>de ${q.connections.limit == null ? '∞' : num(q.connections.limit)}</small>`)}</div>
          ${q.blockedReason ? `<div class="note warn"><b>Servicio en pausa:</b> ${esc(q.blockedReason)}</div>` : ''}
          <div class="two">${card('Paquetes', `<p class="hint">¿Te quedas corto? Suma sin cambiar de plan.</p><div class="list" style="margin-top:8px"><div class="row"><div class="row-ico">💬</div><div class="row-body"><div class="row-title">+500 comandos</div><div class="row-sub">US$ 8 · válidos este periodo</div></div><div class="row-actions"><a class="btn sm" href="../../#precios">Sumar</a></div></div><div class="row"><div class="row-ico">👥</div><div class="row-body"><div class="row-title">+10 000 contactos</div><div class="row-sub">US$ 1/mes</div></div><div class="row-actions"><a class="btn sm" href="../../#precios">Sumar</a></div></div></div><p class="hint" style="margin-top:8px">Siempre conviene más subir de plan que acumular paquetes.</p>`)}
          ${card('Facturas', list(q.invoices, (i) => `<div class="row"><div class="row-ico">🧾</div><div class="row-body"><div class="row-title">US$ ${i.amount}</div><div class="row-sub">${esc(fmtDate(i.date, true))}</div></div><div class="row-actions">${statusChip(i.status === 'paid' ? 'executed' : i.status)}</div></div>`, 'Sin facturas todavía.'))}</div>`; },
      { what: 'El detalle de consumo', phrase: 'cuántos comandos me quedan', extra: `Tu plan actual: ${PLAN[current] || me.plan || '—'}.` })}
      ${plans.length ? card('Planes', `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Plan</th><th class="num">Precio</th><th class="num">Contactos</th><th class="num">Comandos</th><th class="num">Conexiones</th></tr></thead><tbody>${plans.map((p) => `<tr ${(p.code || p.id) === current ? 'style="background:var(--accent-soft)"' : ''}><td><b>${esc(p.name)}</b>${(p.code || p.id) === current ? ' ' + chip('tu plan', 'ok') : ''}</td><td class="num">US$ ${esc(p.priceUsd ?? p.price ?? 0)}/mes</td><td class="num">${num(p.contacts)}</td><td class="num">${num(p.commands)}${p.code === 'gratis' ? ' en total' : '/mes'}</td><td class="num">${p.connections == null ? 'Ilimitadas' : num(p.connections)}</td></tr>`).join('')}</tbody></table></div><p class="hint" style="margin-top:8px">Anual: 2 meses gratis. Cambias cuando quieras; se prorratea.</p>`) : ''}
    </div>`;
  },
};

/* ====================================================================== AJUSTES */
const ajustes = {
  id: 'ajustes', title: 'Ajustes', sub: 'Tu cuenta, tu WhatsApp, tu privacidad y tu seguridad.', icon: 'gear', group: 'Cuenta',
  load: (api) => ({ me: api.me(), agent: api.agent() }),
  view(d, ctx) {
    const me = val(d.me, {}); const prefs = val(d.agent, {}).preferences || {};
    return `<div class="stack"><div class="page-head"><div><h1>Ajustes</h1><p>${esc(this.sub)}</p></div></div>
      <div class="two">${card('Cuenta', `<div class="list"><div class="row"><div class="row-ico">👤</div><div class="row-body"><div class="row-title">${esc(ctx.user?.fullName || me.name || '—')}</div><div class="row-sub">${esc(ctx.user?.primaryEmailAddress?.emailAddress || me.email || '')}</div></div><div class="row-actions"><button class="btn sm" data-act="acc:profile">Editar</button></div></div>
        <div class="row"><div class="row-ico">${ICON.wa}</div><div class="row-body"><div class="row-title">WhatsApp ${me.whatsapp ? statusChip(me.whatsapp.status) : ''}</div><div class="row-sub">${esc(me.whatsapp?.phone || 'Sin vincular')} · escribes a Comando al ${esc(me.comandoNumber || '')}</div></div><div class="row-actions"><a class="btn sm ghost" href="../">Cambiar número</a></div></div>
        <div class="row"><div class="row-ico">🌎</div><div class="row-body"><div class="row-title">Zona horaria y español</div><div class="row-sub">${esc(prefs.timezone || me.timezone || 'America/Lima')} · español de ${esc({ PE: 'Perú', MX: 'México', CO: 'Colombia', AR: 'Argentina', CL: 'Chile' }[me.country] || 'tu país')}</div></div><div class="row-actions"><a class="btn sm ghost" href="#/avisos">Cambiar</a></div></div></div>`)}
      ${card('Seguridad', `<div class="list"><div class="row"><div class="row-ico">🔐</div><div class="row-body"><div class="row-title">Segundo factor para planes grandes</div><div class="row-sub">Comando te manda un PIN de 6 dígitos cuando un plan excede el umbral. Respondes CONFIRMAR seguido del PIN.</div></div><div class="row-actions">${chip('activo', 'ok')}</div></div>
        <div class="row"><div class="row-ico">🔑</div><div class="row-body"><div class="row-title">Inicio de sesión</div><div class="row-sub">Google o correo, con Clerk. Las sesiones de esta web duran lo que dure tu navegador.</div></div><div class="row-actions"><button class="btn sm" data-act="acc:security">Gestionar</button></div></div>
        <div class="row"><div class="row-ico">🚪</div><div class="row-body"><div class="row-title">Cerrar sesión</div><div class="row-sub">Solo en este navegador. Tu WhatsApp sigue vinculado.</div></div><div class="row-actions"><button class="btn sm danger" data-act="acc:signout">Cerrar sesión</button></div></div></div>`)}</div>
      ${card('Privacidad y datos', `<div class="grid c3">${[['Tus datos se quedan en tu CRM', 'Comando guarda un espejo de los campos que tú activaste en «Qué puede consultar». Los campos sensibles se consultan en vivo y nunca se copian.'], ['90 días de conversación', 'El texto de lo que le escribes a Comando y lo que responde se conserva 90 días para diagnosticar fallos. La aplicación puede escribirlo, no borrarlo.'], ['7 días tras desconectar', 'Si desconectas el CRM, la copia se conserva 7 días por si vuelves a vincularlo. Puedes borrarla al instante desde Integraciones.'], ['Nunca a tus clientes desde tu número', 'Meta bloquea los envíos automáticos desde WhatsApp no oficial. Comando prepara el mensaje y lo mandas tú con un toque.'], ['Credenciales cifradas', 'El acceso a tu CRM vive cifrado en infraestructura de Comando; nunca en terceros. En Enterprise, en la tuya.'], ['Si te vas, no hay nada que exportar', 'Todo lo que Comando escribió ya está en tu CRM.']].map(([t, s]) => `<div class="note"><b style="color:var(--text)">${esc(t)}</b><br>${esc(s)}</div>`).join('')}</div>
        <div class="inline-list" style="margin-top:12px"><a class="btn sm ghost" href="../../privacidad.html">Política de privacidad</a><a class="btn sm ghost" href="../../terminos.html">Términos</a><a class="btn sm ghost" href="mailto:hola@comando.pro">Pedir el borrado de mi cuenta</a></div>`)}
    </div>`;
  },
  act: {
    'acc:profile': (el, ctx) => (ctx.clerk ? ctx.clerk.openUserProfile() : toast('En modo de prueba no hay sesión.')),
    'acc:security': (el, ctx) => (ctx.clerk ? ctx.clerk.openUserProfile() : toast('En modo de prueba no hay sesión.')),
    'acc:signout': async (el, ctx) => { if (!ctx.clerk) return toast('En modo de prueba no hay sesión.'); await ctx.clerk.signOut(); location.href = '../'; },
  },
};

export const SECTIONS = [hoy, recordatorios, calendario, salud, embudo, avisos, historial, aprobaciones, marketing, comando, integraciones, equipo, plan, ajustes];
export const GROUPS = ['Hoy', 'CRM', 'Marketing', 'Cuenta'];

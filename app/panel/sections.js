/* Secciones del panel (seis). Cada una declara: qué carga (`load`), cómo se ve (`view`) y qué
   hace al hacer clic (`act`). Los datos llegan resueltos por panel.js: cada clave es el
   valor, un Error, o `{pending:true}` si el endpoint todavía no existe en el engine.
   Reglas de producto:
   - todo lo que el panel muestra se puede pedir también por WhatsApp, y cualquier escritura
     en el CRM sigue pasando por la vista previa y CONFIRMAR;
   - una sola acción principal por fila; lo demás va dentro de «más»;
   - vocabulario del operador (plata en juego, parado, sin dueño, repetidos), nunca del sistema. */

import { isPending } from './api.js?v=6';
import { crmBlock, crmActions, whatsappStep } from './setup.js?v=6';
import {
  esc, num, money, pct, fmtTime, fmtDate, fmtDateTime, monthName, dayLabel, sameDay, rel, isToday, isPast, isoDay,
  wa, waBtn, askLine, chip, statusChip, bar, spark, kpi, card, row, moreBox, empty, soon, toast, ICON, SIGNAL_PHRASE,
  personName, personEmail, highValueAmount,
} from './ui.js?v=6';
import { t, tn } from '../i18n.js?v=1';

/** Renderiza una parte según el estado de su dato. */
function part(v, fn, opts = {}) {
  if (v instanceof Error) return `<div class="empty"><b>${esc(t('common.notLoaded'))}</b>${esc(v.message)}</div>`;
  if (isPending(v)) return soon(opts.what || t('common.thisPart'), opts.phrase, opts.extra);
  if (v == null) return empty(t('common.noData'));
  return fn(v);
}
const list = (items, fn, emptyMsg) => (items && items.length ? `<div class="list">${items.map(fn).join('')}</div>` : empty(emptyMsg || t('common.none')));
const val = (v, fallback) => (v instanceof Error || isPending(v) || v == null ? fallback : v);
const phoneLink = (phone, label) => `<a class="btn sm primary" href="https://wa.me/${esc(String(phone).replace(/\D/g, ''))}" target="_blank" rel="noopener">${ICON.wa}${esc(label)}</a>`;
const head = (title, sub, actions = '') => `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>${actions ? `<div class="page-actions">${actions}</div>` : ''}</div>`;
const syncLine = (s) => {
  if (!s) return '';
  const age = s.reconcileAgeHours < 1 ? Math.round(s.reconcileAgeHours * 60) + ' min' : Math.round(s.reconcileAgeHours) + ' h';
  return s.reconcileAgeHours > 30
    ? chip(t('sync.stale', { provider: s.provider, age }), 'bad')
    : chip(t('sync.fresh', { provider: s.provider, age }), 'ok');
};

/* ------------------------------------------------------------- filas comunes */
function taskRow(task) {
  const late = task.status === 'open' && isPast(task.dueAt) && !isToday(task.dueAt);
  const open = task.status === 'open';
  return row({
    ico: task.kind === 'visit' ? '📍' : '⏰', cls: late ? 'warning' : task.kind === 'visit' ? 'info' : '',
    title: esc(task.title), done: !open, attrs: `data-task="${esc(task.id)}"`,
    sub: `${esc(isToday(task.dueAt) ? t('row.today', { time: fmtTime(task.dueAt) }) : fmtDateTime(task.dueAt))}${task.recordName ? ` · ${esc(task.recordName)}` : ''}${late ? ` · <span class="sev-warning">${esc(t('row.overdue', { when: rel(task.dueAt) }))}</span>` : ''}`,
    primary: open ? `<button class="btn sm primary" data-act="task:done" data-id="${esc(task.id)}">${esc(t('row.taskDone'))}</button>` : statusChip(task.status),
    more: open ? `${waBtn(t('wa.moveTask', { title: task.title }), t('row.move'))}${waBtn(t('wa.cancelTask', { title: task.title }), t('row.cancel'), 'btn sm ghost')}` : '',
  });
}
function recRow(r) {
  const sev = r.signals && r.signals[0] ? r.signals[0].severity : 'info';
  const name = r.subject && r.subject.name ? r.subject.name : r.title;
  const primary = r.subject && r.subject.phone
    ? phoneLink(r.subject.phone, t('row.writeTo', { who: r.subject.contact || t('row.customer') }))
    : waBtn(t('wa.show', { name }), t('row.seeDetail'), 'btn sm primary');
  return row({
    ico: sev === 'high' || sev === 'critical' ? '🔥' : sev === 'warning' ? '⚠️' : 'ℹ️', cls: sev,
    title: esc(r.title), sub: esc(r.summary || ''), attrs: `data-rec="${esc(r.id)}"`, primary,
    more: `${(r.availableActions || []).includes('create_task') ? waBtn(t('wa.createTaskFor', { name }), t('row.createTask')) : ''}<button class="btn sm ghost" data-act="rec:snooze" data-id="${esc(r.id)}">${esc(t('row.later'))}</button><button class="btn sm ghost" data-act="rec:dismiss" data-id="${esc(r.id)}">${esc(t('row.enough'))}</button>${waBtn(t('wa.whyAlert', { name }), t('row.why'), 'btn sm ghost')}`,
  });
}
function approvalRow(a) {
  return row({
    ico: '🔒', cls: 'warning', attrs: `data-ap="${esc(a.id)}"`,
    title: esc(t('row.asks', { who: a.requester, plan: a.plan })), sub: esc(t('row.expires', { reason: a.reason, when: rel(a.expiresAt) })),
    primary: `<button class="btn sm primary" data-act="ap:approve" data-id="${esc(a.id)}">${esc(t('row.approve'))}</button>`,
    more: `<div class="wa-preview">📋 <b>${esc(t('row.plan'))}</b>\n${(a.preview || []).map(esc).join('\n')}</div><div class="inline-list" style="margin-top:8px"><button class="btn sm danger" data-act="ap:reject" data-id="${esc(a.id)}">${esc(t('row.reject'))}</button></div>`,
  });
}
const HIST_KIND = { executed: 'ok', pending: 'warn', awaiting_approval: 'warn', cancelled: '', failed: 'bad', declined: '', expired: '' };
function histRow(h) {
  const kind = HIST_KIND[h.status];
  return row({
    ico: h.voice ? '🎤' : '💬', title: `<q>${esc(h.utterance)}</q>`,
    sub: `${esc(h.plan && h.plan !== '—' ? h.plan : (h.note || ''))} · ${esc(rel(h.at))}`,
    primary: h.status === 'pending'
      ? waBtn(t('wa.confirm'), t('hist.confirm'), 'btn sm primary')
      : chip(kind === undefined ? h.status : t('hist.' + h.status), kind || ''),
  });
}
const recActions = () => {
  const run = async (el, ctx, action, body, msg) => {
    el.disabled = true;
    try { await ctx.api.recommendationAction(el.dataset.id, action, body); toast(msg, 'ok'); el.closest('[data-rec]')?.remove(); }
    catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  };
  return {
    'rec:snooze': (el, ctx) => run(el, ctx, 'snooze', { snoozedUntil: new Date(Date.now() + 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z') }, t('toast.remindTomorrow')),
    'rec:dismiss': (el, ctx) => run(el, ctx, 'dismiss', undefined, t('toast.dismissed')),
  };
};
const taskActions = () => ({
  'task:done': async (el, ctx, d, reload) => {
    el.disabled = true;
    try { await ctx.api.completeTask(el.dataset.id); toast(t('toast.taskDone'), 'ok'); reload(); }
    catch (e) {
      if (e.status === 404 || e.status === 501) { toast(t('toast.closeOnWhatsApp')); window.open(wa(t('wa.taskDone', { title: el.closest('[data-task]').querySelector('.row-title').textContent.trim() })), '_blank'); }
      else toast(e.message, 'bad');
      el.disabled = false;
    }
  },
});
const approvalActions = () => ({
  'ap:approve': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'approve'); toast(t('toast.approved'), 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
  'ap:reject': async (el, ctx, d, reload) => { const reason = window.prompt(t('prompt.rejectReason')); if (!reason) return; el.disabled = true; try { await ctx.api.decideApproval(el.dataset.id, 'reject', reason); toast(t('toast.rejected'), 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
});

/* ===================================================================== HOY */
const hoy = {
  id: 'hoy', get title() { return t('nav.hoy'); }, get sub() { return t('sub.hoy'); }, icon: 'home',
  load: (api) => ({ me: api.me(), recs: api.recommendations(), tasks: api.tasks(), health: api.health(), pipeline: api.pipeline(), history: api.history(), approvals: api.approvals() }),
  view(d, ctx) {
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
    const greet = t(hour < 12 ? 'hoy.greet.morning' : hour < 19 ? 'hoy.greet.afternoon' : 'hoy.greet.evening');

    /* La bandeja: una sola lista, ordenada por urgencia. */
    const items = [
      pendingPlan ? row({ ico: '📋', cls: 'warning', title: t('hoy.planWaiting'), sub: esc(t('hoy.planExpires', { plan: pendingPlan.plan, when: rel(pendingPlan.expiresAt) })), primary: waBtn(t('wa.confirm'), t('hist.confirm'), 'btn sm primary'), more: waBtn(t('wa.cancel'), t('row.cancel'), 'btn sm ghost') }) : '',
      ...approvals.map(approvalRow),
      ...overdue.map(taskRow),
      ...today.map(taskRow),
      ...recs.map(recRow),
    ].filter(Boolean);
    const count = items.length;
    waiting.forEach((x) => items.push(row({ ico: '⏳', title: esc(x.plan), sub: esc(t('hoy.waitingOwner', { when: rel(x.expiresAt) })) })));
    const allPending = isPending(d.tasks) && isPending(d.recs);
    const tray = card(t('hoy.tray'), allPending ? soon(t('hoy.trayWhat'), t('wa.whatMattersToday')) : (items.length ? `<div class="list">${items.join('')}</div>` : empty(t('hoy.nothingPending'), t('hoy.silenceIsGood'))),
      { sub: count ? tn('hoy.dependOnYou', count) : t('hoy.whenSomething') });

    const kpis = `<div class="grid c3">
      ${kpi(t('hoy.moneyInPlay'), pipe ? money(pipe.open.amount, pipe.currency) : t('common.dash'), pipe ? t('hoy.openDeals', { n: num(pipe.open.count) }) : (isPending(d.pipeline) ? t('hoy.soonInAccount') : ''), { spark: pipe ? spark(pipe.stages.map((s) => s.count)) : '' })}
      ${kpi(t('hoy.forToday'), `${num(today.length)}<small>${esc(tn('hoy.task', today.length))}</small>`, overdue.length ? `<span class="sev-warning">${esc(tn('hoy.overdue', overdue.length))}</span>` : t('hoy.noneOverdue'))}
      ${kpi(t('hoy.waitingForYou'), `${num(count)}<small>${esc(tn('hoy.pending', count))}</small>`, recs.length ? esc(tn('hoy.deserve', recs.length)) : t('hoy.nothingUrgent'))}
    </div>`;

    const art = `<svg viewBox="0 0 360 260" fill="none" aria-hidden="true">
      <rect x="120" y="20" width="120" height="220" rx="22" fill="#0F1A1F" stroke="#2E4A3E" stroke-width="3"/><rect x="132" y="42" width="96" height="176" rx="12" fill="#0B1416"/>
      <rect x="140" y="56" width="62" height="22" rx="11" fill="#1F3A2E"/><rect x="158" y="86" width="62" height="22" rx="11" fill="#00A76F"/><rect x="140" y="116" width="74" height="22" rx="11" fill="#1F3A2E"/><rect x="148" y="146" width="72" height="22" rx="11" fill="#00A76F"/>
      <rect x="20" y="60" width="130" height="44" rx="14" fill="#fff"/><rect x="34" y="74" width="70" height="8" rx="4" fill="#C4CDD5"/><rect x="34" y="88" width="46" height="8" rx="4" fill="#DFE3E8"/>
      <rect x="215" y="150" width="125" height="44" rx="14" fill="#5BE49B"/><rect x="229" y="164" width="60" height="8" rx="4" fill="#0B2E24"/><rect x="229" y="178" width="84" height="8" rx="4" fill="#118D57"/>
      <circle cx="300" cy="70" r="26" fill="#00A76F"/><path d="M288 70l8 8 16-16" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const welcome = `<div class="welcome"><div class="welcome-body"><h2>${esc(t('hoy.hello', { greet, name: personName(me, ctx) }))}</h2>
      <p>${count ? tn('hoy.youHave', count) : esc(t('hoy.nothingUrgentNow'))} ${esc(t('hoy.askByPhrase'))}</p>
      ${waBtn(t('wa.whatMattersToday'), t('common.writeToComando'), 'btn primary')}</div><div class="welcome-art">${art}</div></div>`;

    const review = card(t('hoy.review'), part(d.health, (hh) => {
      const top = hh.metrics.filter((m) => m.severity === 'high' || m.severity === 'warning').slice(0, 3);
      return `<div class="bars">${top.map((m) => bar(m.label, m.value, m.of || Math.max(m.value, 1), { cls: m.severity === 'high' ? 'warn' : 'blue', text: `<b>${num(m.value)}</b>${m.of ? ' / ' + num(m.of) : ''}` })).join('')}</div><div class="status-line" style="margin-top:14px">${syncLine(hh.sync)}</div>`;
    }, { what: t('hoy.review'), phrase: t('wa.whatToReview') }), { more: t('hoy.seeAll'), moreHref: '#/crm' });
    const last = card(t('hoy.last'), part(d.history, (hs) => list(hs.filter((h) => h.status !== 'pending').slice(0, 5), histRow, t('hoy.neverWrote')), { what: t('hoy.last'), phrase: t('wa.lastThing') }),
      { right: waBtn(t('wa.undo'), t('hoy.undoLast'), 'btn sm ghost') });

    const noCrm = me.status === 'ok' && me.crmConnected === false ? `<div class="card setup-nudge"><div class="row"><div class="row-ico ok">🔌</div><div class="row-body"><div class="row-title">${esc(t('hoy.connectCrm'))}</div><div class="row-sub">${esc(t('hoy.connectCrmSub'))}</div></div><div class="row-actions"><a class="btn sm primary" href="#/cuenta">${esc(t('hoy.connectCrmBtn'))}</a></div></div></div>` : '';
    return `<div class="stack">${welcome}${noCrm}${kpis}${tray}<div class="two">${review}${last}</div></div>`;
  },
  act: { ...recActions(), ...taskActions(), ...approvalActions() },
};

/* ================================================================== AGENDA */
const agenda = {
  id: 'agenda', get title() { return t('nav.agenda'); }, get sub() { return t('sub.agenda'); }, icon: 'cal',
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
        sub: `${e.allDay ? esc(t('agenda.allDay')) : esc(fmtTime(e.at))} · ${esc(t(e.kind === 'close' ? 'agenda.expectedClose' : 'agenda.meeting'))}`,
        primary: e.kind === 'close'
          ? waBtn(t('wa.nextStepOf', { name: clean }), t('agenda.nextStep'), 'btn sm primary')
          : waBtn(t('wa.remindBefore', { title: e.title }), t('agenda.remindMe'), 'btn sm primary'),
      });
    };
    const actions = waBtn(t('wa.newReminder'), t('agenda.newReminder'), 'btn primary');
    const toggle = `<div class="seg"><button data-tab="lista" class="${mode === 'lista' ? 'is-on' : ''}">${esc(t('agenda.list'))}</button><button data-tab="mes" class="${mode === 'mes' ? 'is-on' : ''}">${esc(t('agenda.month'))}</button></div>`;
    const pendingNote = isPending(d.cal) ? `<p class="note">${esc(t('agenda.pendingNote'))} ${askLine(t('wa.thisWeek'), t('agenda.meanwhile'))}</p>` : '';

    if (mode === 'lista') {
      const now = new Date(); const dayMs = 86_400_000;
      const tomorrow = new Date(now.getTime() + dayMs); const week = new Date(now.getTime() + 7 * dayMs); const month = new Date(now.getTime() + 31 * dayMs);
      const groups = [
        [t('agenda.overdue'), events.filter((e) => e.task && isPast(e.at) && !isToday(e.at))],
        [t('agenda.today'), events.filter((e) => isToday(e.at))],
        [t('agenda.tomorrow'), events.filter((e) => sameDay(new Date(e.at), tomorrow))],
        [t('agenda.thisWeek'), events.filter((e) => { const at = new Date(e.at); return at > tomorrow && !sameDay(at, tomorrow) && at <= week; })],
        [t('agenda.later'), events.filter((e) => { const at = new Date(e.at); return at > week && at <= month; })],
      ].filter(([, xs]) => xs.length);
      const done = tasks.filter((x) => x.status !== 'open');
      const body = groups.length ? groups.map(([label, xs]) => `<h3 class="group-title">${esc(label)} <span>${xs.length}</span></h3><div class="list">${xs.map(evRow).join('')}</div>`).join('') : empty(t('agenda.nothing30'), t('agenda.nothing30Sub'));
      return `<div class="stack">${head(this.title, this.sub, actions)}${pendingNote}
        <div class="card">${toggle}${part(d.tasks, () => body, { what: t('agenda.what'), phrase: t('wa.thisWeek') })}
        ${done.length ? moreBox(`<div class="list">${done.map(taskRow).join('')}</div>`, t('agenda.done', { n: done.length })) : ''}</div></div>`;
    }

    const st = ctx.cal || (ctx.cal = { month: new Date(new Date().getFullYear(), new Date().getMonth(), 1), sel: new Date() });
    const first = new Date(st.month); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const cells = []; for (let i = 0; i < 42; i += 1) { const day = new Date(start); day.setDate(start.getDate() + i); cells.push(day); }
    const today = new Date();
    const dayEvents = (day) => events.filter((e) => sameDay(new Date(e.at), day));
    const grid = `<div class="cal">${t('agenda.calDow').split(',').map((x) => `<div class="cal-dow">${esc(x)}</div>`).join('')}
      ${cells.map((day) => { const evs = dayEvents(day); return `<button class="cal-day ${day.getMonth() !== first.getMonth() ? 'is-other' : ''} ${sameDay(day, today) ? 'is-today' : ''} ${sameDay(day, st.sel) ? 'is-sel' : ''}" data-cal="sel" data-day="${day.toISOString()}">
        <span class="cal-num">${day.getDate()}</span><span class="cal-dots">${evs.slice(0, 4).map((e) => `<i class="ev-${e.kind}"></i>`).join('')}</span>
        ${evs.slice(0, 3).map((e) => `<span class="cal-ev ev-${e.kind}">${e.allDay ? '' : esc(fmtTime(e.at)) + ' '}${esc(e.title)}</span>`).join('')}${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3}</span>` : ''}</button>`; }).join('')}</div>`;
    const sel = dayEvents(st.sel);
    return `<div class="stack">${head(this.title, this.sub, actions)}${pendingNote}
      <div class="two wide"><div class="card">${toggle}<div class="cal-head"><button class="btn sm" data-cal="prev" aria-label="${esc(t('agenda.prevMonth'))}">‹</button><h2>${esc(monthName(first))}</h2><div><button class="btn sm" data-cal="today">${esc(t('agenda.todayBtn'))}</button> <button class="btn sm" data-cal="next" aria-label="${esc(t('agenda.nextMonth'))}">›</button></div></div>${grid}
        <div class="legend"><span><i class="ev-task"></i>${esc(t('agenda.legendTask'))}</span><span><i class="ev-meeting"></i>${esc(t('agenda.legendMeeting'))}</span><span><i class="ev-close"></i>${esc(t('agenda.legendClose'))}</span></div></div>
      ${card(dayLabel(st.sel), list(sel, evRow, t('agenda.nothingThatDay')))}</div></div>`;
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
  id: 'crm', get title() { return t('nav.crm'); }, get sub() { return t('sub.crm'); }, icon: 'funnel',
  load: (api) => ({ pipeline: api.pipeline(), health: api.health() }),
  view(d) {
    // La moneda sale del resumen de cartera, que es quien la sabe: las métricas
    // de salud traen importes sin decir de qué moneda son.
    const currency = (val(d.pipeline, null) || {}).currency;
    const plata = part(d.pipeline, (p) => {
      const stages = [...p.stages].sort((a, b) => a.order - b.order); const maxStage = Math.max(...stages.map((s) => s.amount));
      return `<div class="grid c3">${kpi(t('hoy.moneyInPlay'), money(p.open.amount, p.currency), t('hoy.openDeals', { n: num(p.open.count) }))}${kpi(t('crm.wonMonth'), money(p.wonMonth.amount, p.currency), t('crm.deals', { n: num(p.wonMonth.count) }), { subCls: 'up' })}${kpi(t('crm.lostMonth'), money(p.lostMonth.amount, p.currency), t('crm.deals', { n: num(p.lostMonth.count) }), { subCls: 'down' })}</div>
        <div class="two">${card(t('crm.byStage'), `<div class="bars">${stages.map((s) => bar(s.name, s.amount, maxStage, { text: `<b>${num(s.count)}</b> · ${money(s.amount, p.currency)}` })).join('')}</div>`, { sub: esc(t('crm.upToDate', { when: rel(p.computedAt) })), right: waBtn(t('wa.dealsByStage'), t('crm.askList')) })}
        ${card(t('crm.by', { field: p.byField.label }), `<div class="bars">${p.byField.rows.map((r) => bar(r.value, r.count, Math.max(...p.byField.rows.map((x) => x.count)), { cls: 'blue', text: `<b>${num(r.count)}</b> · ${money(r.amount, p.currency)}` })).join('')}</div>`, { sub: t('crm.anyCut'), right: waBtn(t('wa.dealsByStageAnd', { field: p.byField.label }), t('crm.askCross')) })}</div>`;
    }, { what: t('crm.whatMoney'), phrase: t('wa.moneyInPlay') });

    const revisar = part(d.health, (h) => {
      const ownersNote = h.owners.crmOwners <= 1 && h.owners.comandoPeople > 1 ? `<p class="note warn">${t('crm.ownersNote', { crmOwners: h.owners.crmOwners, people: h.owners.comandoPeople })}</p>` : '';
      const sevOrder = { high: 0, warning: 1, info: 2 };
      const rows = [...h.metrics].sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).map((m) => row({
        ico: { opportunity: '💼', contact: '👤', company: '🏢', task: '⏰' }[m.entity] || '•', cls: m.severity,
        title: esc(m.label.replace(/^Registros/, t('crm.contacts'))),
        sub: `<b>${num(m.value)}</b>${m.unit ? ' ' + esc(m.unit) : ''}${m.of ? ` ${esc(t('crm.of', { of: num(m.of), pct: Math.round((m.value / m.of) * 100) }))}` : ''}${m.amount ? ` · ${money(m.amount, currency)}` : ''}`,
        primary: waBtn(m.ask, t('crm.seeList'), 'btn sm primary'),
        more: `${waBtn(m.weekly, t('crm.alertWeekly'))}${m.reproduce ? `<p class="hint" style="margin-top:8px"><b>${esc(t('crm.howInCrm'))}</b> ${esc(m.reproduce)}</p>` : ''}`,
      })).join('');
      return `${ownersNote}<div class="card"><div class="card-head"><div><h2>${esc(t('crm.whatToReview'))}</h2><p>${esc(t('crm.neverDeletes'))}</p></div>${syncLine(h.sync)}</div><div class="list">${rows}</div></div>`;
    }, { what: t('hoy.review'), phrase: t('wa.stalledDeals') });

    return `<div class="stack">${head(this.title, this.sub, waBtn(t('wa.moneyInPlay'), t('common.askOnWhatsApp'), 'btn primary'))}${plata}${revisar}</div>`;
  },
};

/* ==================================================================== AVISOS */
const avisos = {
  id: 'avisos', get title() { return t('nav.avisos'); }, get sub() { return t('sub.avisos'); }, icon: 'bell',
  load: (api) => ({ agent: api.agent(), eventRules: api.eventRules(), policy: api.policy(), pipeline: api.pipeline(), playbooks: api.playbooks() }),
  view(d) {
    const ag = val(d.agent, null); const p = (ag && ag.preferences) || {};
    const pol = val(d.policy, null); const ev = val(d.eventRules, []); const pipe = val(d.pipeline, null);

    /* Una sola lista «Comando te avisa cuando…», en tres bloques con palabras del operador. */
    const siempre = []; const cuandoPase = []; const cadaTanto = [];
    if (pol) pol.enabledSignals.forEach((s) => { const f = SIGNAL_PHRASE[s]; if (!f) return; const text = f(pol.thresholds, highValueAmount(pol.thresholds, pipe && pipe.currency)); siempre.push(row({ ico: '🔔', title: esc(text), primary: waBtn(t('wa.stopAlert', { what: text }), t('avisos.turnOff')) })); });
    ev.forEach((r) => cuandoPase.push(row({ ico: '⚡', cls: r.status === 'active' ? 'warning' : '', title: esc(r.name) + (r.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: `${esc(r.condition)} → ${esc(r.action)}${r.firedWeek ? ` · ${esc(tn('avisos.times', r.firedWeek, { n: num(r.firedWeek) }))}` : ''}`,
      primary: r.status === 'active' ? waBtn(t('wa.pauseRule', { name: r.name }), t('avisos.pause')) : waBtn(t('wa.resumeRule', { name: r.name }), t('avisos.resume'), 'btn sm primary'), more: waBtn(t('wa.changeRule', { name: r.name }), t('avisos.change')) })));
    ((ag && ag.rules) || []).forEach((r) => cadaTanto.push(row({ ico: r.critical ? '🚨' : '🔁', title: esc(r.name) + (r.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: `${esc(r.every || '')}${r.lastValue != null && !r.critical ? ` · ${t('avisos.lastValue', { value: num(r.lastValue) })}` : ''}${r.lastFiredAt ? ` · ${esc(t('avisos.alertedYou', { when: rel(r.lastFiredAt) }))}` : ''}`,
      primary: `<button class="btn sm ${r.status === 'active' ? '' : 'primary'}" data-act="rule:toggle" data-id="${esc(r.id)}" data-status="${r.status === 'active' ? 'paused' : 'active'}">${esc(t(r.status === 'active' ? 'avisos.pause' : 'avisos.resume'))}</button>`, more: waBtn(t('wa.changeAlert', { name: r.name }), t('avisos.changeDayHour')) })));
    ((pipe && pipe.scheduledReports) || []).forEach((r) => cadaTanto.push(row({ ico: '📊', title: esc(t('avisos.sendsYou', { title: r.title })), sub: `${esc(r.cadence)} · ${esc(t('avisos.byWhatsApp'))}`, primary: waBtn(t('wa.pauseReport', { title: r.title }), t('avisos.pause')) })));
    const blocks = [[t('avisos.always'), siempre], [t('avisos.whenSomething'), cuandoPase], [t('avisos.everySoOften'), cadaTanto]].filter(([, xs]) => xs.length);
    const missing = [d.policy, d.eventRules, d.pipeline].some(isPending);
    const lista = card(t('avisos.title'), `${blocks.length ? blocks.map(([label, xs]) => `<h3 class="group-title">${esc(label)} <span>${xs.length}</span></h3><div class="list">${xs.join('')}</div>`).join('') : empty(t('avisos.watchesNothing'), t('avisos.watchesNothingSub'))}${missing ? `<p class="hint" style="margin-top:12px">${esc(t('avisos.notListed'))} ${askLine(t('wa.myAlerts'), t('avisos.askHim'))}</p>` : ''}`,
      { sub: t('avisos.replyWords'), right: waBtn(t('wa.newAlert'), t('avisos.newAlert'), 'btn sm primary') });

    const horario = part(d.agent, (a) => { const pr = a.preferences || {}; return `<div class="two">
      <form class="form" data-form="prefs"><h3>${esc(t('avisos.schedule'))}</h3>
        <div class="inline"><label>${esc(t('avisos.dontWriteFrom'))}<input name="quietStart" type="time" value="${esc(pr.quietStart || '21:00')}"></label><label>${esc(t('avisos.until'))}<input name="quietEnd" type="time" value="${esc(pr.quietEnd || '08:00')}"></label></div>
        <label>${esc(t('avisos.dailyLimit'))}<input name="dailyMessageLimit" type="number" min="0" max="100" value="${esc(pr.dailyMessageLimit ?? 5)}"></label>
        <label class="sw"><input type="checkbox" name="proactiveEnabled" ${pr.proactiveEnabled !== false ? 'checked' : ''}><span class="sw-track"></span><span>${esc(t('avisos.proactive'))}</span></label>
        <div class="form-foot"><button class="btn primary" type="submit">${esc(t('common.save'))}</button><span class="form-msg"></span></div></form>
      <form class="form" data-form="briefing"><h3>${esc(t('avisos.briefing'))}</h3>
        <label>${esc(t('avisos.every'))}<select name="briefingCadence"><option value="daily" ${pr.briefingCadence === 'daily' ? 'selected' : ''}>${esc(t('avisos.daily'))}</option><option value="weekly" ${pr.briefingCadence === 'weekly' ? 'selected' : ''}>${esc(t('avisos.weekly'))}</option><option value="monthly" ${pr.briefingCadence === 'monthly' ? 'selected' : ''}>${esc(t('avisos.monthly'))}</option></select></label>
        <label>${esc(t('avisos.at'))}<input name="briefingAt" type="time" value="${esc(pr.briefingAt || '07:30')}"></label>
        <div class="form-foot"><button class="btn primary" type="submit">${esc(t('common.save'))}</button><span class="form-msg"></span></div>
        <p class="hint">${esc(t('avisos.neverEmpty'))}</p></form></div>
      <p class="hint" style="margin-top:12px">${askLine(t('wa.noMessagesToday'), t('avisos.dayOff'))}</p>`; }, { what: t('avisos.scheduleWhat'), phrase: t('wa.quietHours') });

    const ideas = part(d.playbooks, (pb) => list(pb.filter((x) => !x.active).slice(0, 8), (x) => row({ ico: '💡', title: esc(x.name) + (x.needs ? ' ' + chip(x.needs, 'soon') : ''), sub: `<q>${esc(x.ask)}</q>${x.evidence ? ` · ${esc(x.evidence)}` : ''}`, primary: waBtn(x.ask, t('avisos.activate'), 'btn sm primary') }), t('avisos.allActivated')),
      { what: t('avisos.ideasWhat'), phrase: t('wa.whichAutomations') });

    return `<div class="stack">${head(this.title, this.sub)}${lista}${card(t('avisos.whenWrites'), horario, { sub: t('avisos.outsideHours') })}${card(t('avisos.ideas'), ideas, { sub: t('avisos.ideasSub') })}</div>`;
  },
  act: {
    'rule:toggle': async (el, ctx, d, reload) => { el.disabled = true; try { await ctx.api.ruleStatus(el.dataset.id, el.dataset.status); toast(t(el.dataset.status === 'paused' ? 'toast.paused' : 'toast.resumed'), 'ok'); reload(); } catch (e) { toast(e.message, 'bad'); el.disabled = false; } },
  },
  forms: {
    /**
     * El engine reescribe TODAS las preferencias en cada guardado, así que las
     * que este formulario no toca hay que devolvérselas tal cual vinieron.
     *
     * Antes, cuando la cuenta todavía no tenía preferencias guardadas, este
     * formulario escribía `America/Lima` a mano: un cliente en Bogotá abría los
     * horarios, pulsaba Guardar y se llevaba una hora de silencio corrida. Si no
     * se sabe la zona, se usa la del propio dispositivo del operador, que es la
     * suya de verdad; y la prioridad mínima, si no se sabe, no se manda: el
     * engine tiene su propio valor y no hay por qué duplicarlo aquí.
     */
    prefs: async (form, ctx, d) => {
      const f = new FormData(form); const prev = (val(d.agent, {}).preferences) || {};
      let timezone = prev.timezone;
      if (!timezone) { try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { timezone = undefined; } }
      const prefs = { quietStart: f.get('quietStart'), quietEnd: f.get('quietEnd'), dailyMessageLimit: Number(f.get('dailyMessageLimit')), proactiveEnabled: f.get('proactiveEnabled') === 'on' };
      if (timezone) prefs.timezone = timezone;
      if (prev.minimumPriority != null) prefs.minimumPriority = prev.minimumPriority;
      await ctx.api.savePreferences(prefs);
      return t('avisos.prefsSaved');
    },
    briefing: async (form, ctx) => {
      const f = new FormData(form);
      await ctx.api.savePreferences({ briefingCadence: f.get('briefingCadence'), briefingAt: f.get('briefingAt') }).catch((e) => {
        if (e.status === 400) {
          const cadence = t({ daily: 'wa.briefingDaily', weekly: 'wa.briefingWeekly', monthly: 'wa.briefingMonthly' }[f.get('briefingCadence')]);
          window.open(wa(t('wa.briefing', { cadence, time: f.get('briefingAt') })), '_blank');
          return;
        }
        throw e;
      });
      return t('avisos.done');
    },
  },
};

/* ================================================================= MARKETING */
const marketing = {
  id: 'marketing', get title() { return t('nav.marketing'); }, get sub() { return t('sub.marketing'); }, icon: 'mega',
  load: (api) => ({ mk: api.marketing(), meta: api.metaStatus() }),
  view(d) {
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${p === 'google-ads' ? 'automation' : esc(p)}.svg" alt="">`;
    const body = part(d.mk, (m) => {
      const cur = m.period.currency;
      const delta = (a, b, inverse) => { if (!b) return ''; const x = (a - b) / b; const good = inverse ? x < 0 : x > 0; return `<span class="${good ? 'sev-ok' : 'sev-warning'}">${esc(t('mk.vsPrev', { sign: x > 0 ? '+' : '', pct: Math.round(x * 100) }))}</span>`; };
      const accounts = `<div class="inline-list" style="margin-bottom:16px">${m.accounts.map((a) => `<span class="chip ${a.status === 'active' ? 'ok' : a.status === 'pending' ? 'warn' : 'soon'}">${logo(a.provider)} ${esc(a.name)} · ${esc(t(a.status === 'active' ? 'mk.connected' : a.status === 'pending' ? 'mk.needsAuth' : 'mk.soon'))}</span>`).join('')}<button class="btn sm ghost" data-act="mk:connect">${esc(t('mk.connectAnother'))}</button></div>`;
      const kpis = `<div class="grid c4">${kpi(t('mk.spend', { period: m.period.label }), money(m.period.spend, cur), delta(m.period.spend, m.period.prevSpend, true))}${kpi(t('mk.leadsIn'), num(m.period.leads), delta(m.period.leads, m.period.prevLeads))}${kpi(t('mk.cpl'), money(m.period.cpl, cur), delta(m.period.cpl, m.period.prevCpl, true))}${kpi(t('mk.cpa'), money(m.period.won ? m.period.spend / m.period.won : 0, cur), `${esc(tn('mk.sale', m.period.won, { n: num(m.period.won) }))} · ${money(m.period.revenue, cur)}`)}</div>`;
      const camps = card(t('mk.campaigns'), accounts + list(m.campaigns, (c) => row({
        ico: logo(/tiktok/i.test(c.channel) ? 'tiktok' : 'meta'), title: esc(c.name) + (c.status !== 'active' ? ' ' + statusChip('paused') : ''),
        sub: `${esc(c.channel)} · ${t('mk.spent', { spend: money(c.spend, cur) })} · ${t('mk.leadsAt', { leads: num(c.leads), cpl: money(c.cpl, cur) })} · ${esc(tn('mk.won', c.crmWon, { n: num(c.crmWon) }))}${c.pausedReason ? `<br><span class="sev-warning">${esc(c.pausedReason)}</span>` : ''}`,
        primary: c.status === 'active' ? waBtn(t('wa.pauseCampaign', { name: c.name }), t('avisos.pause')) : waBtn(t('wa.resumeCampaign', { name: c.name }), t('avisos.resume'), 'btn sm primary'),
        more: `${waBtn(t('wa.raiseBudget', { name: c.name }), t('mk.raiseBudget'))}${waBtn(t('wa.campaignLeads', { name: c.name }), t('mk.seeLeads'))}`,
      })), { sub: t('mk.campaignsSub') });
      const an = m.analyst;
      const analyst = card(t('mk.analyst'), `<div class="person"><div class="avatar">${esc(an.avatar)}</div><div><b>${esc(an.name)}</b><div class="hint">${esc(t('mk.reviewsWeekly', { when: fmtDateTime(an.nextReviewAt) }))}</div></div></div>
        <h3 class="group-title" style="margin-top:16px">${esc(t('mk.recommends'))}</h3>
        ${list(an.recommendations.filter((r) => r.status === 'pending'), (r) => row({ ico: '💡', cls: 'warning', title: esc(r.text), sub: esc(t('mk.impact', { date: fmtDate(r.at), impact: r.impact })), primary: waBtn(t('wa.applyRecommendation', { text: r.text }), t('mk.apply'), 'btn sm primary'), more: `<button class="btn sm ghost" data-act="mk:later" data-id="${esc(r.id)}">${esc(t('row.later'))}</button>` }), t('mk.nothingPending'))}
        ${an.requests.length ? moreBox(list(an.requests, (q) => row({ ico: '❓', title: esc(q.topic), sub: esc(q.answer || t('mk.underReview')) })), t('mk.alreadyAsked')) : ''}`,
        { right: waBtn(t('wa.askAnalyst'), t('mk.askHim'), 'btn sm primary') });
      const funnel = card(t('mk.funnel'), `<div class="funnel">${m.funnel.map((s, i) => `<div class="funnel-step"><span>${esc(s.label)}</span><div class="bar-track"><div class="bar-fill ${i < 2 ? 'blue' : i < 5 ? '' : 'warn'}" style="width:${Math.max(2, Math.round((Math.log10(s.value + 1) / Math.log10(m.funnel[0].value + 1)) * 100))}%"></div></div><span class="bar-val"><b>${num(s.value)}</b>${i ? ` · ${Math.round((s.value / m.funnel[i - 1].value) * 100)} %` : ''}</span></div>`).join('')}</div>`, { sub: m.period.label });
      const autos = card(t('mk.automations'), list(m.automations, (a) => row({ ico: { budget: '💸', speed: '⚡', audience: '🎯', report: '📊' }[a.kind] || '🔁', title: esc(a.name) + (a.status !== 'active' ? ' ' + statusChip('paused') : ''), sub: esc(tn('mk.timesMonth', a.firedMonth, { n: num(a.firedMonth) })), primary: a.status === 'active' ? waBtn(t('wa.pauseAutomation', { name: a.name }), t('avisos.pause')) : waBtn(t('wa.resumeAutomation', { name: a.name }), t('avisos.resume'), 'btn sm primary') })),
        { right: waBtn(t('wa.newBudgetRule'), t('mk.new'), 'btn sm primary') });
      const reports = card(t('mk.reports'), list(m.reports, (r) => row({ ico: '📈', title: esc(r.title), sub: r.highlights.map(esc).join(' · '), primary: waBtn(t('wa.sendReport', { title: r.title }), t('mk.toWhatsApp'), 'btn sm primary') })), { sub: t('mk.reportsSub'), right: waBtn(t('wa.weeklyReport'), t('mk.askNow')) });
      return `${kpis}${camps}<div class="two">${analyst}${funnel}</div><div class="two">${autos}${reports}</div>`;
    }, { what: t('mk.what'), phrase: t('wa.connectAds'), extra: t('mk.extra') });
    return `<div class="stack">${head(this.title, this.sub, waBtn(t('wa.leadsPerCampaign'), t('mk.askOnWhatsApp'), 'btn primary'))}${metaCard(d.meta)}${body}</div>`;
  },
  act: {
    /**
     * El diálogo de Meta se abre en la MISMA pestaña: vuelve a este panel por
     * el callback del engine, y una pestaña nueva dejaría al operador mirando
     * la vieja sin enterarse de nada.
     */
    'mk:connect': async (el, ctx) => {
      if (el) el.disabled = true;
      try {
        const r = await ctx.api.metaConnect();
        if (r && r.authorizationUrl) { location.href = r.authorizationUrl; return; }
        toast(t('mk.connectSoon'));
      } catch (e) {
        // 404/501: el engine todavía no trae el conector. No es culpa suya.
        toast(e.status === 404 || e.status === 501 ? t('mk.connectSoon') : e.message, 'bad');
      } finally { if (el) el.disabled = false; }
    },
    'meta:refresh': async (el, ctx, d, reload) => {
      el.disabled = true;
      try { await ctx.api.metaRefreshAccounts(); ctx.cache = {}; reload(); }
      catch (e) { toast(e.message, 'bad'); el.disabled = false; }
    },
    'meta:save': async (el, ctx, d, reload) => {
      const refs = [...document.querySelectorAll('input.meta-acc:checked')].map((i) => i.value);
      el.disabled = true;
      try { await ctx.api.metaSelectAccounts(refs); toast(t('mk.metaSaved'), 'ok'); ctx.cache = {}; reload(); }
      catch (e) { toast(e.message, 'bad'); el.disabled = false; }
    },
    'meta:disconnect': async (el, ctx, d, reload) => {
      if (!window.confirm(t('mk.metaConfirmOff'))) return;
      el.disabled = true;
      try { await ctx.api.metaDisconnect(); toast(t('mk.metaRemoved'), 'ok'); ctx.cache = {}; reload(); }
      catch (e) { toast(e.message, 'bad'); el.disabled = false; }
    },
    'mk:later': (el) => { el.closest('.row').style.opacity = '.5'; toast(t('mk.nextReview')); },
  },
};

/**
 * Meta Ads: el estado de la conexión y la elección de cuentas.
 *
 * Es la única tarjeta del panel que ESCRIBE en un proveedor externo, y por eso
 * enseña siempre las tres cosas que el cliente puede querer: en qué estado
 * está, qué cuentas concedió, y cómo salirse.
 */
function metaCard(value) {
  const logo = '<img class="logo-sm" src="../../assets/img/logos/meta.svg" alt="">';
  return part(value, (s) => {
    if (s.status !== 'active')
      return card(t('mk.meta'), `<div class="empty"><b>${esc(t('mk.metaOff'))}</b>${esc(t('mk.metaOffSub'))}</div>
        ${s.status === 'error' ? `<p class="note warn">${esc(t('mk.metaErrorNote', { code: s.lastErrorCode || '—' }))}</p>` : ''}
        ${s.status === 'pending' ? `<p class="note warn">${esc(t('mk.metaPendingNote'))}</p>` : ''}
        <div class="inline-list" style="margin-top:12px"><button class="btn primary" data-act="mk:connect">${esc(t(s.status === 'disconnected' ? 'mk.metaConnect' : 'mk.metaRetry'))}</button></div>`,
        { sub: t('mk.metaSub'), right: logo });
    // Agrupadas por portfolio: es como el cliente las tiene en su cabeza y en
    // el Business Manager, no como se las devuelve Graph.
    const groups = new Map();
    (s.accounts || []).forEach((a) => {
      const key = a.businessName || t('mk.metaNoPortfolio');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    });
    const accounts = groups.size
      ? [...groups].map(([name, items]) => `<h3 class="group-title">${esc(name)}</h3>${list(items, (a) => row({
        ico: logo,
        title: `<label><input type="checkbox" class="meta-acc" value="${esc(a.accountRef)}"${a.selected ? ' checked' : ''}> ${esc(a.name)}</label>`,
        sub: `${esc(a.accountRef)}${a.currency ? ` · ${esc(a.currency)}` : ''}${a.timezoneName ? ` · ${esc(a.timezoneName)}` : ''}${a.accountStatus && a.accountStatus !== 1 ? ` · <span class="sev-warning">${esc(t('mk.metaDisabled'))}</span>` : ''}`,
      }))}`).join('')
      : `<div class="empty"><b>${esc(t('mk.metaNoAccounts'))}</b></div>`;
    return card(t('mk.meta'), `
      <h3 class="group-title">${esc(t('mk.metaAccounts'))}</h3>${accounts}
      ${s.tokenExpiresAt ? `<p class="note warn" style="margin-top:12px">${esc(t('mk.metaExpires', { date: fmtDate(s.tokenExpiresAt) }))}</p>` : ''}
      <div class="inline-list" style="margin-top:16px">
        <button class="btn sm primary" data-act="meta:save">${esc(t('mk.metaSave'))}</button>
        <button class="btn sm ghost" data-act="meta:refresh">${esc(t('mk.metaRefresh'))}</button>
        <button class="btn sm danger" data-act="meta:disconnect">${esc(t('mk.metaDisconnect'))}</button>
      </div>`,
      { sub: s.connectedAt ? t('mk.metaSince', { date: fmtDate(s.connectedAt) }) : t('mk.metaSub'),
        right: `${logo}${chip(t('mk.connected'), 'ok')}` });
  }, { what: t('mk.meta'), phrase: t('wa.connectAds'), extra: t('mk.metaOffSub') });
}

/* ==================================================================== CUENTA */
const cuenta = {
  id: 'cuenta', get title() { return t('nav.cuenta'); }, get sub() { return t('sub.cuenta'); }, icon: 'user',
  load: (api) => ({ me: api.me(), quota: api.quota(), connections: api.connections(), sheets: api.sheets(), mk: api.marketing(), meta: api.metaStatus(), team: api.team(), agent: api.agent(), health: api.health() }),
  view(d, ctx) {
    const me = val(d.me, {});
    const PLAN = { gratis: 'plan.gratis', free: 'plan.gratis', basico: 'plan.basico', starter: 'plan.starter', pro: 'plan.pro', enterprise: 'plan.enterprise' };
    const planName = (raw) => { const key = PLAN[String(raw || '').toLowerCase()]; return key ? t(key) : raw || t('common.dash'); };
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${p === 'google-ads' ? 'automation' : esc(p)}.svg" alt="">`;

    const plan = part(d.quota, (q) => { const total = q.commands.allowance + q.commands.addons + q.commands.adjustments; const share = total ? q.commands.used / total : 0; const cls = share >= 1 ? 'bad' : share >= 0.8 ? 'warn' : '';
      return `<div class="kpi"><div class="kpi-label">${esc(t('cuenta.plan', { name: q.plan.name, price: q.plan.priceUsd, interval: t(q.plan.interval === 'month' ? 'cuenta.month' : 'cuenta.year') }))}</div><div class="kpi-value">${num(q.commands.used)}<small>${esc(t('cuenta.ofCommands', { n: num(total) }))}</small></div><div class="progress ${cls}"><i style="width:${Math.min(100, Math.round(share * 100))}%"></i></div><div class="kpi-sub">${share >= 0.8 ? `<span class="sev-warning">${esc(t('cuenta.over80'))}</span> ` : ''}${esc(t('cuenta.renews', { date: fmtDate(q.period.resetAt) }))}${q.blockedReason ? ` · <span class="sev-warning">${esc(q.blockedReason)}</span>` : ''}</div></div>`; },
      { what: t('cuenta.usageWhat'), phrase: t('wa.commandsLeft'), extra: t('cuenta.yourPlan', { plan: planName(me.plan) }) });
    const cuentaCard = card(t('cuenta.yourAccount'), `<div class="list">
      ${row({ ico: '👤', title: esc(personName(me, ctx)), sub: esc(personEmail(me, ctx)), primary: `<button class="btn sm" data-act="acc:profile">${esc(t('cuenta.edit'))}</button>` })}
      ${row({ ico: ICON.wa, title: `WhatsApp ${me.whatsapp ? statusChip(me.whatsapp.status) : ''}`, sub: `${esc(me.whatsapp?.phone || t('cuenta.notLinked'))}${me.comandoNumber ? ` · ${esc(t('cuenta.youWriteTo', { number: me.comandoNumber }))}` : ''}`, primary: `<button class="btn sm ghost" data-act="wa:change">${esc(t('cuenta.changeNumber'))}</button>` })}
      <div id="wa-change-box"></div>
      <div class="row"><div class="row-ico">💳</div><div class="row-body">${plan}</div><div class="row-actions"><a class="btn sm" href="../../#precios">${esc(t('cuenta.changePlan'))}</a></div></div>
    </div>`);

    const conns = val(d.connections, []); const active = conns.find((c) => c.bound && c.status === 'active'); const recoverable = conns.find((c) => c.recoverable);
    const h = val(d.health, null); const mk = val(d.mk, null);
    // Las cuentas de anuncios salen del MISMO sitio que la tarjeta de Marketing.
    // Antes se leían del resumen de marketing, que todavía es de mentira: la
    // tarjeta decía «sin cuentas conectadas» con Meta conectado de verdad, y una
    // pantalla que se contradice con otra del mismo panel no se cree ninguna.
    // Aquí solo se muestra el estado; gestionar sigue siendo cosa de Marketing.
    const meta = val(d.meta, null);
    const adRows = meta && meta.status === 'active'
      ? (meta.accounts || []).map((a) => row({
          ico: logo('meta'),
          title: `${esc(a.name)} ${a.selected ? chip(t('cuenta.adAccountInUse'), 'ok') : ''}`,
          sub: `${esc(a.accountRef)}${a.currency ? ` · ${esc(a.currency)}` : ''}`,
          primary: `<a class="btn sm ghost" href="#/marketing">${esc(t('cuenta.seeCampaigns'))}</a>`,
        })).join('')
      : '';
    const conexiones = card(t('cuenta.yourCrm'), `${active && h ? `<p class="status-line" style="margin-bottom:12px">${syncLine(h.sync)}${active.mirror ? `<span class="hint">${esc(t('cuenta.mirror', { contacts: num(active.mirror.contacts), deals: num(active.mirror.deals) }))}</span>` : ''}</p>` : ''}${crmBlock(ctx, conns, val(d.sheets, []))}`,
      { sub: t('cuenta.crmSub') });
    const anuncios = card(t('cuenta.adAccounts'), adRows ? `<div class="list">${adRows}</div>` : `<div class="empty"><b>${esc(t('cuenta.noAdAccounts'))}</b>${esc(t('cuenta.noAdAccountsSub'))}</div>`, { sub: t('cuenta.forMarketing'), right: `<button class="btn sm" data-act="mk:connect">${esc(t('cuenta.connect'))}</button>` });

    const ROLE_KIND = { owner: 'ok', admin: 'ok', supervisor: 'info', agent: '', analyst: 'info' };
    const equipo = card(t('cuenta.team'), part(d.team, (team) => {
      const owners = (h && h.owners) || { crmOwners: team.crmOwners, comandoPeople: team.people.length };
      return `<div class="list">${team.people.map((p) => row({ ico: `<span class="avatar">${esc(p.name.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`, title: `${esc(p.name)} ${chip(p.role in ROLE_KIND ? t('role.' + p.role) : p.role, ROLE_KIND[p.role] || '')}`, sub: `${esc(p.team || '')}${p.whatsapp !== 'verified' ? ` · <span class="sev-warning">${esc(t('cuenta.waUnverified'))}</span>` : ''}`, primary: waBtn(t('wa.changeRole', { name: p.name }), t('cuenta.changeRole'), 'btn sm ghost') })).join('')}</div>
        ${owners.crmOwners <= 1 && owners.comandoPeople > 1 ? `<p class="note warn" style="margin-top:12px">${t('cuenta.ownersNote', { crmOwners: num(owners.crmOwners), people: num(owners.comandoPeople) })}</p>` : ''}`; },
      { what: t('cuenta.teamWhat'), phrase: t('wa.whoUses'), extra: t('cuenta.teamExtra') }),
      { sub: t('cuenta.teamSub'), right: `<button class="btn sm" data-act="team:invite">${esc(t('cuenta.invite'))}</button>` });

    const sabe = card(t('cuenta.knows'), part(d.agent, (a) => list(a.memories || [], (m) => row({ ico: '🧠', title: esc(m.content), sub: esc(fmtDate(m.createdAt, true)), primary: waBtn(t('wa.forget', { what: m.content }), t('cuenta.forget'), 'btn sm ghost') }), t('cuenta.knowsNothing')),
      { what: t('cuenta.knows'), phrase: t('wa.teachExample') }),
      { sub: t('cuenta.knowsSub'), right: waBtn(t('wa.teach'), t('cuenta.teachHim'), 'btn sm primary') });

    const privacidad = card(t('cuenta.privacy'), `<ul class="plain"><li>${esc(t('cuenta.privacy1'))}</li><li>${esc(t('cuenta.privacy2'))}</li><li>${esc(t('cuenta.privacy3'))}</li></ul>
      <div class="inline-list" style="margin-top:12px"><a class="btn sm ghost" href="../../privacidad.html">${esc(t('cuenta.privacyPolicy'))}</a><a class="btn sm ghost" href="mailto:hola@comando.pro">${esc(t('cuenta.deleteAccount'))}</a><button class="btn sm danger" data-act="acc:signout">${esc(t('cuenta.signOut'))}</button></div>`);

    return `<div class="stack">${head(this.title, this.sub)}${cuentaCard}${conexiones}${anuncios}<div class="two">${equipo}${sabe}</div>${privacidad}</div>`;
  },
  act: {
    'acc:profile': (el, ctx) => (ctx.clerk ? ctx.clerk.openUserProfile() : toast(t('cuenta.noSessionInMock'))),
    'acc:signout': async (el, ctx) => { if (!ctx.clerk) return toast(t('cuenta.noSessionInMock')); await ctx.clerk.signOut(); location.href = '../'; },
    'team:invite': () => { toast(t('cuenta.inviteToast')); navigator.clipboard?.writeText(location.origin + '/app/'); },
    'mk:connect': marketing.act['mk:connect'],
    'wa:change': (el, ctx, d, reload) => { const box = document.getElementById('wa-change-box'); if (!box) return; el.disabled = true; whatsappStep(box, ctx, () => { toast(t('cuenta.waLinked'), 'ok'); ctx.cache = {}; reload(); }); box.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    ...crmActions,
  },
};

export const SECTIONS = [hoy, agenda, crm, avisos, marketing, cuenta];

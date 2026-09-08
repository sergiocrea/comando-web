/* Secciones del panel (seis). Cada una declara: qué carga (`load`), cómo se ve (`view`) y qué
   hace al hacer clic (`act`). Los datos llegan resueltos por panel.js: cada clave es el
   valor, un Error, o `{pending:true}` si el endpoint todavía no existe en el engine.
   Reglas de producto:
   - todo lo que el panel muestra se puede pedir también por WhatsApp, y cualquier escritura
     en el CRM sigue pasando por la vista previa y CONFIRMAR;
   - una sola acción principal por fila; lo demás va dentro de «más»;
   - vocabulario del operador (plata en juego, parado, sin dueño, repetidos), nunca del sistema. */

import { isPending } from './api.js?v=11';
import { crmBlock, crmActions, whatsappStep, NAMES as PROVIDER_NAMES } from './setup.js?v=7';
import {
  esc, num, money, pct, fmtTime, fmtDate, fmtDateTime, monthName, dayLabel, sameDay, rel, isToday, isPast, isoDay,
  wa, waBtn, askLine, chip, statusChip, bar, spark, kpi, card, row, moreBox, empty, soon, toast, ICON, SIGNAL_PHRASE,
  personName, personEmail, highValueAmount, SYMBOL, setAccountCurrency,
} from './ui.js?v=7';
import { t, tn, localeTag } from '../i18n.js?v=1';

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
/* Un turno recién registrado también llega en `pending`, y eso NO es un plan
   esperando la palabra: es Comando pensando. Lo que distingue una cosa de la
   otra es `kind` (`PLAN_PREVIEW`). Se conserva el camino por `status` para el
   diálogo antiguo, que no traía `kind`. */
const awaitsWord = (x) => x.kind === 'PLAN_PREVIEW' || (!x.kind && x.status === 'pending');
function histRow(h) {
  const kind = HIST_KIND[h.status];
  return row({
    ico: '💬', title: `<q>${esc(h.utterance)}</q>`,
    sub: `${esc(h.plan && h.plan !== '—' ? h.plan : (h.note || ''))} · ${esc(rel(h.at))}`,
    primary: awaitsWord(h)
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

/* ======================================================== CONSOLA DE COMANDOS
   Escribir aquí es exactamente lo mismo que escribirle por WhatsApp: el panel
   ENCOLA la frase por la misma puerta y luego consulta el diálogo. No ejecuta
   nada por su cuenta (plan 15 §1) —la vista previa, el CONFIRMAR, el cupo, las
   aprobaciones y el historial viven en ese único camino, y un atajo desde el
   navegador los duplicaría hasta que un día dejaran de coincidir—.

   La consola va ENCIMA de la bandeja, no en su lugar: un cuadro de texto vacío
   no le dice nada a quien entra por primera vez, y la lista de pendientes es
   lo que hace que valga la pena abrir el panel.

   Cuando el origen es el panel, el engine NO manda la respuesta por WhatsApp:
   esta pantalla es el único sitio donde aparece. Por eso la consola se queda
   mirando y por eso el aviso de los 30 s dice dónde buscarla después. */
const POLL_MS = 1500;
const POLL_UNTIL_MS = 30_000;
/**
 * El gesto que toca en cada turno sale de `kind`, no del texto ni del estado:
 * un turno recién registrado llega con `status: 'pending'` y sin `note`, y eso
 * es «pensando…», no un plan esperando el CONFIRMAR.
 */
const GESTURE = {
  PLAN_PREVIEW: 'confirm',   // vista previa lista: falta la palabra
  PIN_REQUIRED: 'pin',       // segundo factor; el código llega por WhatsApp
  APPROVAL_CREATED: 'wait',  // le toca a un administrador, no al operador
};
const gestureOf = (e) => (/^CLARIFICATION/.test(e.kind || '') ? 'reply' : GESTURE[e.kind] || '');
/** Mientras no haya ni plan, ni respuesta, ni desenlace, sigue pensando. */
const stillThinking = (x) => x.status === 'pending' && !x.note && !x.plan;

const consoleState = (ctx) => (ctx.console || (ctx.console = { entries: [] }));
/* El plan viene escrito para WhatsApp, con *negritas* de asterisco. Aquí se
   leerían como asteriscos sueltos; se traducen después de escapar, que es
   cuando ya no puede colarse nada del texto. */
const waMarkup = (text) => esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');

function consoleRow(e) {
  const q = `<q>${esc(e.utterance)}</q>`;
  if (e.status === 'thinking') return row({ ico: '<span class="spinner"></span>', title: q, sub: esc(t('console.thinking')) });
  if (e.status === 'soon') return row({ ico: '🔌', title: q, sub: `<div class="ask">${askLine(e.utterance, t('console.soonAsk'))}</div>` });
  if (e.status === 'slow') return row({ ico: '⏳', title: q, sub: esc(t('console.slow')) });
  if (e.status === 'error') return row({ ico: '⚠️', cls: 'critical', title: q, sub: esc(e.note || t('common.failed')) });

  const gesture = gestureOf(e);
  /* El plan es una vista previa con saltos de línea: va en el bloque que ya usan
     las aprobaciones, no aplastado en una línea de subtítulo. */
  const preview = gesture === 'confirm' && e.plan ? `<div class="wa-preview">${waMarkup(e.plan)}</div>` : '';
  const said = e.note || (gesture === 'confirm' ? '' : e.plan) || '';
  const sub = `${esc(said)}${e.expiresAt && gesture ? `${said ? ' · ' : ''}${esc(t('console.expires', { when: rel(e.expiresAt) }))}` : ''}${preview}`;
  /* La palabra exacta, no un sinónimo: «OK» ejecuta pero «dale» y 👍 piden la
     palabra (plan 10). El botón manda lo que el worker espera leer. */
  const primary = gesture === 'confirm'
    ? `<button class="btn sm primary" data-act="cmd:confirm" data-key="${esc(e.key)}">${esc(t('wa.confirm'))}</button>`
    : gesture === 'wait' || gesture === 'pin' || gesture === 'reply'
      ? ''
      : chip(HIST_KIND[e.status] === undefined ? e.status : t('hist.' + e.status), HIST_KIND[e.status] || '');
  const ico = gesture === 'confirm' ? '📋' : gesture === 'pin' ? '🔑' : gesture === 'wait' ? '⏳' : gesture === 'reply' ? '❓' : e.status === 'executed' ? '✅' : '💬';
  const main = row({ ico, cls: gesture === 'confirm' || gesture === 'pin' ? 'warning' : '', title: q, sub, primary });

  if (gesture === 'wait') return main + `<div class="console-note">${esc(t('console.waitingAdmin'))}</div>`;
  if (gesture === 'pin') return main + `<div class="console-note">${esc(t('console.pinNote'))}</div>` + replyForm(e, t('console.pin'), true);
  if (gesture === 'reply') return main + replyForm(e, t('console.reply'), false);
  return main;
}
const replyForm = (e, placeholder, numeric) => `<form class="console-reply" data-send="cmd:reply" data-key="${esc(e.key)}" autocomplete="off">
  <input class="console-input" name="reply" type="text"${numeric ? ' inputmode="numeric" maxlength="8"' : ''} placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}">
  <button class="btn sm primary" type="submit">${esc(t('console.send'))}</button></form>`;

const consoleLog = (ctx) => {
  const entries = consoleState(ctx).entries;
  return entries.length ? `<div class="list">${entries.map(consoleRow).join('')}</div>` : '';
};
function paintLog(ctx) {
  const host = document.getElementById('console-log');
  if (host) host.innerHTML = consoleLog(ctx);
}

/**
 * Consulta el diálogo hasta que el turno `entry` tiene algo que enseñar.
 * `was` es el `kind` anterior cuando se está esperando a que CAMBIE (después
 * de un CONFIRMAR o de un código): sin eso, la primera consulta encontraría el
 * mismo turno de siempre y diría que ya terminó.
 */
async function followUp(entry, ctx, was) {
  const deadline = Date.now() + POLL_UNTIL_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    let dialogue;
    try { dialogue = await ctx.api.commands(20); } catch (e) { continue; }
    if (isPending(dialogue)) { entry.status = 'soon'; paintLog(ctx); return; }
    const items = Array.isArray(dialogue) ? dialogue : (dialogue.entries || dialogue.items || []);
    const found = items.find((x) => x.id === entry.id);
    if (!found || stillThinking(found) || (was && found.kind === was)) continue;
    Object.assign(entry, { status: found.status, kind: found.kind, plan: found.plan, note: found.note, expiresAt: found.expiresAt });
    paintLog(ctx);
    return;
  }
  /* Pasados los 30 s se deja de mirar: la frase ya está encolada y su respuesta
     aparecerá abajo, en «Lo último que pediste». Insistir más tiempo gasta
     batería para no enterarse antes. */
  entry.status = 'slow';
  paintLog(ctx);
}

/** Encola una frase y se queda mirando el turno que crea. */
async function sendUtterance(utterance, ctx) {
  const text = String(utterance || '').trim().slice(0, 1000);
  if (!text) return;
  const entry = { key: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), utterance: text, at: new Date().toISOString(), status: 'thinking' };
  consoleState(ctx).entries.unshift(entry);
  paintLog(ctx);
  await enqueue(entry, text, ctx);
}

/**
 * La parte que habla con el engine, separada porque también la usan el botón
 * de CONFIRMAR y la caja del código: los tres encolan por la misma ruta.
 * `idem` se guarda en el turno para que un reintento sea un duplicado y no un
 * segundo comando: el engine deriva el id de esa clave.
 */
async function enqueue(entry, text, ctx, was) {
  entry.idem = entry.idem || crypto.randomUUID();
  try {
    const r = await ctx.api.sendCommand(text, entry.idem);
    /* Mientras la ruta no esté publicada esto es un 404, que no es un fallo:
       es «se activa pronto», con la misma frase lista para WhatsApp. */
    if (isPending(r)) { entry.status = 'soon'; paintLog(ctx); return; }
    if (r && r.id && !entry.id) entry.id = r.id;
    /* Sin id no hay a qué mirar. Se dice y se para, en vez de sondear 30 s
       una respuesta que no se va a poder reconocer. */
    if (!entry.id) { entry.status = 'slow'; paintLog(ctx); return; }
    await followUp(entry, ctx, was);
  } catch (e) {
    entry.status = 'error'; entry.note = e.message;
    paintLog(ctx);
  }
}

/* ---------------------------------------------------- el catálogo de skills
   Las frases que Comando ya entiende, agrupadas y con nombre. La frase ES el
   nombre, en las palabras del operador: así no hay una etiqueta aparte que se
   pueda desincronizar de lo que realmente se ejecuta.
   Aquí solo van las frases que se sostienen solas. Las que llevan el nombre de
   un registro («muéstrame {name}») siguen viviendo en su fila, que es donde el
   nombre existe. Una frase que acaba en espacio o en dos puntos está
   incompleta a propósito («avísame cuando ») y se escribe en el campo. */
const SKILLS = [
  ['skills.crm', ['wa.moneyInPlay', 'wa.dealsByStage', 'wa.stalledDeals', 'wa.whatToReview']],
  ['skills.agenda', ['wa.whatMattersToday', 'wa.thisWeek', 'wa.newReminder']],
  ['skills.autos', ['wa.myAlerts', 'wa.whichAutomations', 'wa.newAlert', 'wa.quietHours', 'wa.noMessagesToday']],
  ['skills.marketing', ['wa.leadsPerCampaign', 'wa.weeklyReport', 'wa.newBudgetRule', 'wa.connectAds']],
  ['skills.cuenta', ['wa.commandsLeft', 'wa.whoUses', 'wa.lastThing', 'wa.teach']],
];
const isPartial = (phrase) => /[\s:]$/.test(phrase);
function skillsView() {
  const groups = SKILLS.map(([group, keys]) => `<div class="skills-group"><h4>${esc(t(group))}</h4><div class="skills-row">${keys.map((k) => {
    const phrase = t(k);
    const partial = isPartial(phrase);
    return `<button type="button" class="skill${partial ? ' is-partial' : ''}" data-act="${partial ? 'cmd:fill' : 'cmd:run'}" data-phrase="${esc(phrase)}" title="${esc(phrase)}">${esc(partial ? phrase.trim() + '…' : phrase)}</button>`;
  }).join('')}</div></div>`).join('');
  return `<details class="skills"><summary>${esc(t('skills.title'))}</summary><div class="skills-body"><p class="skills-sub">${esc(t('skills.sub'))}</p>${groups}</div></details>`;
}

function consoleView(ctx) {
  return card(t('console.title'), `<form class="console-form" data-send="cmd:send" autocomplete="off">
      <input class="console-input" name="utterance" type="text" maxlength="1000" enterkeyhint="send" placeholder="${esc(t('console.placeholder'))}" aria-label="${esc(t('console.title'))}">
      <button class="btn primary" type="submit">${esc(t('console.send'))}</button>
    </form>
    <div class="console-log" id="console-log">${consoleLog(ctx)}</div>
    ${skillsView()}`, { sub: esc(t('console.sub')), cls: 'console' });
}

const consoleActions = () => {
  /* Responder a un turno (el CONFIRMAR, el código, una aclaración) encola texto
     por la MISMA ruta y luego espera a que ese mismo turno cambie de `kind`. */
  const answer = async (entry, text, ctx) => {
    if (!entry || !text) return;
    const was = entry.kind;
    /* Clave nueva: el CONFIRMAR es OTRO mensaje, no un reintento del primero.
       Reusar la clave haría que el engine lo tomara por duplicado y no pasara
       nada. Dentro de `enqueue` sí se conserva, para que un reintento del
       mismo mensaje siga siendo el mismo mensaje. */
    entry.idem = crypto.randomUUID();
    entry.status = 'thinking'; entry.note = ''; paintLog(ctx);
    await enqueue(entry, text, ctx, was);
  };
  const find = (ctx, key) => consoleState(ctx).entries.find((x) => x.key === key);
  return {
    'cmd:send': async (form, ctx) => {
      const input = form.querySelector('.console-input');
      const text = input.value;
      input.value = '';
      await sendUtterance(text, ctx);
    },
    'cmd:run': async (el, ctx) => { el.blur(); await sendUtterance(el.dataset.phrase, ctx); },
    'cmd:fill': (el) => {
      const input = document.querySelector('.console-form .console-input');
      if (!input) return;
      input.value = el.dataset.phrase;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    },
    'cmd:confirm': async (el, ctx) => { el.disabled = true; await answer(find(ctx, el.dataset.key), t('wa.confirm'), ctx); },
    'cmd:reply': async (form, ctx) => {
      const input = form.querySelector('.console-input');
      const text = input.value.trim();
      input.value = '';
      await answer(find(ctx, form.dataset.key), text, ctx);
    },
  };
};

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
    const pendingPlan = hist.find(awaitsWord);
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
    const last = card(t('hoy.last'), part(d.history, (hs) => list(hs.filter((h) => !awaitsWord(h) && !(h.status === 'pending' && !h.note && !h.plan)).slice(0, 5), histRow, t('hoy.neverWrote')), { what: t('hoy.last'), phrase: t('wa.lastThing') }),
      { right: waBtn(t('wa.undo'), t('hoy.undoLast'), 'btn sm ghost') });

    const noCrm = me.status === 'ok' && me.crmConnected === false ? `<div class="card setup-nudge"><div class="row"><div class="row-ico ok">🔌</div><div class="row-body"><div class="row-title">${esc(t('hoy.connectCrm'))}</div><div class="row-sub">${esc(t('hoy.connectCrmSub'))}</div></div><div class="row-actions"><a class="btn sm primary" href="#/cuenta">${esc(t('hoy.connectCrmBtn'))}</a></div></div></div>` : '';
    return `<div class="stack">${welcome}${noCrm}${kpis}${consoleView(ctx)}${tray}<div class="two">${review}${last}</div></div>`;
  },
  act: { ...recActions(), ...taskActions(), ...approvalActions(), ...consoleActions() },
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

/* ================================================================= MARKETING
   Las métricas reales de Meta Ads (plan 16 §6). Tres decisiones del contrato
   mandan sobre todo lo que se ve aquí:

   - **`totals` es una LISTA, un bloque por moneda, y no existe un gasto
     único.** Las cuentas de un mismo cliente están en soles y en dólares a la
     vez; un total que las mezclara sería un número que parece información y no
     lo es. Por eso ni el resumen ni las campañas suman entre monedas, y cada
     importe se pinta con la suya al lado.
   - **El ROAS solo se enseña donde existe.** Una inmobiliaria no tiene valor
     de conversión —su resultado es un lead, no una venta—, así que Meta no
     devuelve ingresos y no hay ROAS que calcular. En su lugar va el costo por
     resultado. Un `roas: 0` inventado haría parecer fracasada una campaña que
     va bien; un `roas: 0` de verdad sí se enseña, porque es una mala noticia
     real.
   - **Los números son una copia local, así que la pantalla dice de cuándo
     son.** Una copia que no dice su edad se lee como si fuera de ahora mismo. */

/** Los siete tipos de resultado del contrato. El motor manda el `kind`; la
    etiqueta que lee el cliente («leads», «conversaciones», «compras») la pone
    el panel, en sus tres idiomas. Un lead y una compra no son lo mismo. */
const RESULT_KINDS = new Set(['lead', 'mensaje', 'compra', 'instalacion', 'clic', 'alcance', 'interaccion']);
const RESULT_ICO = { lead: '🧲', mensaje: '💬', compra: '🛒', instalacion: '📲', clic: '👆', alcance: '📣', interaccion: '👍' };
/* Meta estrena objetivos cada año: un `kind` que todavía no conocemos se
   enseña tal cual en vez de como ⟨clave⟩. */
const resultLabel = (kind, n) => (RESULT_KINDS.has(kind) ? t('mk.kind.' + kind + (n === 1 ? '_one' : '_other')) : String(kind || ''));

/**
 * Un costo por resultado con sus céntimos.
 *
 * `money()` redondea a la unidad, que está bien para un gasto de cuatro cifras
 * y no para la cifra que ocupa el sitio del ROAS: entre «S/ 29,66 por lead» y
 * «S/ 30 por lead» hay justo la diferencia que el cliente mira. La moneda
 * siempre viene pegada al dato, así que aquí no hay respaldo de cuenta.
 */
function moneyExact(n, currency) {
  if (n == null) return t('common.dash');
  const amount = Number(n).toLocaleString(localeTag(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${SYMBOL[currency] || currency} ${amount}` : amount;
}

/** Un día suelto («2026-08-07») en la fecha corta del idioma. Se le pega la
    hora local a propósito: `new Date('2026-08-07')` es medianoche UTC y en
    Lima se leería como el día anterior. */
const dayOf = (iso) => (iso ? fmtDate(`${iso}T00:00:00`) : '');

/** «hace 40 min», desde la edad en segundos que manda el motor. */
function ageAgo(seconds) {
  if (seconds == null) return '';
  const s = Math.max(0, Math.round(seconds));
  const [n, unit] = s < 3600 ? [Math.max(1, Math.round(s / 60)), t('ui.min')]
    : s < 86_400 ? [Math.round(s / 3600), t('ui.hour')]
      : [Math.round(s / 86_400), t('ui.day')];
  return t('ui.ago', { t: `${n} ${unit}` });
}
/** La espera del botón, en la unidad que se entiende sin hacer cuentas. */
function waitText(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return s >= 60 ? `${Math.ceil(s / 60)} ${t('ui.min')}` : `${s} ${t('mk.sec')}`;
}
/** El ROAS con dos decimales: «5,2×» dice más que «5,2000000001». */
const roasText = (roas) => t('mk.roasValue', { x: num(Math.round(roas * 100) / 100) });

/**
 * La columna que cambia: ROAS donde existe y, donde no, el costo por resultado.
 *
 * El hueco y el cero son las dos formas de mentir aquí. `roas: 0` se enseña
 * —gasto sin ingreso medido—; la AUSENCIA de valor de conversión no se enseña
 * como cero, sino que cede el sitio al costo por resultado, que es la cifra que
 * el cliente sí puede usar. Y una campaña con cero resultados no tiene costo
 * por resultado: dividir entre cero no es un costo altísimo, es que no existe.
 */
function roasOrCost(currency, result, roas, roasUnavailable) {
  if (roas != null) return chip(roasText(roas), roas >= 1 ? 'ok' : 'warn');
  if (result && result.costPerResult != null) return chip(t('mk.costPer', { amount: moneyExact(result.costPerResult, currency), kind: resultLabel(result.kind, 1) }), 'info');
  if (roasUnavailable === 'sin_gasto') return chip(t('mk.noSpend'), 'soon');
  if (result) return chip(t('mk.noCostYet'), 'soon');
  // Sin `result` no hay nada que poner aquí: el porqué ya lo dice la fila.
  return '';
}

/** Lo que consiguió una campaña: el número, su tipo, y el «no sabemos». */
function resultText(result) {
  if (!result) return `<span class="hint">${esc(t('mk.resultUnknown'))}</span>`;
  return `<b>${num(result.results)}</b> ${esc(resultLabel(result.kind, result.results))}`;
}

/**
 * Un bloque de resumen POR MONEDA.
 *
 * Nunca hay uno solo con todo dentro: con dos monedas salen dos tarjetas y no
 * se suman. Dentro, los resultados van separados por tipo por la misma razón:
 * leads y compras en la misma columna mienten igual que soles con dólares.
 */
function totalsCard(total, alone) {
  const accounts = (total.accounts || []).length;
  const label = SYMBOL[total.currency] ? `${total.currency} · ${SYMBOL[total.currency]}` : total.currency;
  const kpis = `<div class="grid c3">
    ${kpi(t('mk.spendLabel'), money(total.spend, total.currency), esc(tn('mk.fromAccounts', accounts, { n: num(accounts) })))}
    ${kpi(t('mk.impressions'), num(total.impressions))}
    ${kpi(t('mk.clicks'), num(total.clicks), total.impressions ? esc(t('mk.ctrIs', { pct: pct(total.clicks / total.impressions, 2) })) : '')}
  </div>`;
  const results = list(total.byResult || [], (b) => row({
    ico: RESULT_ICO[b.kind] || '🎯',
    title: `<b>${num(b.results)}</b> ${esc(resultLabel(b.kind, b.results))}`,
    sub: `${esc(t('mk.ofSpend', { spend: money(b.spend, total.currency) }))}${b.costPerResult != null ? ` · ${esc(t('mk.costPer', { amount: moneyExact(b.costPerResult, total.currency), kind: resultLabel(b.kind, 1) }))}` : ''}`,
    primary: b.roas != null ? chip(roasText(b.roas), b.roas >= 1 ? 'ok' : 'warn') : '',
  }), t('mk.noResults'));
  // El recordatorio de que esta moneda va sola solo tiene sentido si hay otra.
  return card(t('mk.totalsIn', { currency: label }), kpis + results, alone ? {} : { sub: t('mk.totalsSub') });
}

/** Una campaña: su gasto con su moneda, lo que consiguió, y ROAS o costo. */
const campaignRow = (c) => row({
  ico: '<img class="logo-sm" src="../../assets/img/logos/meta.svg" alt="">',
  title: esc(c.name),
  sub: `${esc(c.accountName || c.accountRef)} · ${esc(t('mk.spent', { spend: money(c.spend, c.currency) }))} · ${resultText(c.result)}${c.ctr != null ? ` · ${esc(t('mk.ctrIs', { pct: pct(c.ctr, 2) }))}` : ''}`,
  primary: roasOrCost(c.currency, c.result, c.roas, c.roasUnavailable),
  more: waBtn(t('wa.campaignLeads', { name: c.name }), t('mk.seeLeads')),
});

const ACCOUNT_STATE_KIND = { pendiente: 'soon', con_datos: 'ok', sin_datos: '', error: 'bad' };
/**
 * El estado de cada cuenta publicitaria.
 *
 * `sin_datos` y `error` se ven iguales desde una tabla vacía y no son lo mismo:
 * una cuenta recién conectada que todavía no gastó no es un fallo, y decírselo
 * al cliente como si lo fuera le manda a arreglar algo que no está roto.
 */
const accountRow = (a) => row({
  ico: '<img class="logo-sm" src="../../assets/img/logos/meta.svg" alt="">',
  title: `${esc(a.name || a.adAccount)} ${chip(t('mk.state.' + (a.state in ACCOUNT_STATE_KIND ? a.state : 'pendiente')), ACCOUNT_STATE_KIND[a.state] || '')}`,
  sub: [
    esc(a.adAccount || a.id),
    a.currency ? esc(a.currency) : '',
    a.campaigns != null ? esc(tn('mk.nCampaigns', a.campaigns, { n: num(a.campaigns) })) : '',
    a.refreshedAt && a.ageSeconds != null ? esc(t('mk.updated', { age: ageAgo(a.ageSeconds) })) : esc(t('mk.neverUpdated')),
  ].filter(Boolean).join(' · '),
  meta: [
    a.state === 'sin_datos' ? `<span class="hint">${esc(t('mk.stateNoDataNote'))}</span>` : '',
    a.state === 'error' ? `<span class="sev-warning">${esc(t('mk.stateErrorNote', { code: a.lastErrorCode || '—' }))}</span>` : '',
    a.nextManualRefreshAt ? `<span class="hint">${esc(t('mk.nextRefresh', { when: rel(a.nextManualRefreshAt) }))}</span>` : '',
  ].filter(Boolean).join(''),
});

/**
 * De cuándo son los números, y el botón para pedirlos otra vez.
 *
 * La edad es la del dato MÁS VIEJO: enseñar la del más reciente haría parecer
 * la pantalla más fresca de lo que es. Sin ninguna copia todavía no hay edad
 * que enseñar, y eso no es un error: es que la primera copia viene en camino.
 */
function freshnessLine(m) {
  const f = m.freshness || {};
  const r = m.refresh || {};
  const age = f.refreshedAt && f.ageSeconds != null
    ? chip(t('mk.dataFrom', { age: ageAgo(f.ageSeconds) }), f.stale ? 'warn' : 'ok')
    : chip(t('mk.firstCopy'), 'soon');
  const pending = f.pending ? `<span class="hint">${esc(tn('mk.pendingAccounts', f.pending, { n: num(f.pending) }))}</span>` : '';
  const failing = f.failing ? `<span class="sev-warning">${esc(tn('mk.failingAccounts', f.failing, { n: num(f.failing) }))}</span>` : '';
  // Cuando el límite de cinco minutos está en curso el botón no se puede
  // pulsar, y a su lado va CUÁNDO se podrá: un botón apagado sin explicación
  // se lee como una avería.
  const blocked = r.allowed === false && r.retryAfterSeconds > 0;
  return `<p class="status-line">${age}${pending}${failing}
    <button class="btn sm ghost" data-act="mk:refresh"${blocked ? ' disabled' : ''}>${esc(t('mk.refresh'))}</button>
    ${blocked ? `<span class="hint">${esc(t('mk.refreshWait', { t: waitText(r.retryAfterSeconds) }))}</span>` : ''}
    </p>`;
}

/**
 * Atenuar los números mientras llegan los del filtro nuevo.
 *
 * No es decoración: sin esto, cambiar de periodo deja los números VIEJOS en
 * pantalla el segundo que tarda la respuesta, y se leen como los nuevos. En una
 * pantalla sobre dinero, ese segundo basta para creerse una cifra que no es.
 */
function cargando(si) {
  const cuerpo = document.getElementById('mk-cuerpo');
  if (cuerpo) cuerpo.classList.toggle('cargando', Boolean(si));
}

/**
 * Las cuentas publicitarias que el cliente eligió, sacadas del estado de la
 * conexión. Van al filtro para que «qué periodo» y «qué cuentas» se elijan en
 * el mismo sitio, que es donde el operador los piensa juntos.
 */
function cuentasDe(meta) {
  if (!meta || meta instanceof Error || isPending(meta)) return [];
  return (meta.accounts || []).map((a) => ({
    id: a.id || a.accountRef || a.account_ref,
    name: a.name,
    currency: a.currency,
    selected: Boolean(a.selected),
  }));
}

/**
 * La barra de filtros de Marketing.
 *
 * Dos filtros sobre lo mismo —qué periodo y qué cuentas— que hasta ahora vivían
 * en sitios distintos: el periodo arriba y las cuentas abajo, dentro de la
 * tarjeta de conexión. Verlos juntos es lo que hace evidente que son dos ejes
 * de la misma pregunta.
 *
 * **No hay botón de aplicar.** Elegir ES la acción; un «aplicar» detrás de un
 * desplegable obliga a decir dos veces lo mismo. Lo que sí queda como botón es
 * «Actualizar», que no es un filtro: llama a Meta, gasta cupo y está limitado a
 * una vez cada cinco minutos, así que tiene que seguir siendo deliberado.
 */
function filterBar(m, cuentas) {
  const hoy = new Date();
  const anio = hoy.getUTCFullYear();
  const p = m.period || {};
  // Cuando se pidió un tramo, el motor lo devuelve TAL CUAL y calza con una
  // opción. Cuando no, `since`/`until` salen de los datos y no calzan con
  // ninguna, así que el navegador enseña la primera: «últimos 30 días». Sin
  // repetir aquí el 30, que lo decide `windowDays` en el servidor y puede
  // cambiar sin que este fichero se entere.
  const elegido = p.since && p.until ? `${p.since}|${p.until}` : '';
  const periodos = [
    { v: '', l: t('mk.periodLast30') },
    { v: `${anio}-01-01|${anio}-12-31`, l: t('mk.periodThisYear', { y: anio }) },
    { v: `${anio - 1}-01-01|${anio - 1}-12-31`, l: t('mk.periodYear', { y: anio - 1 }) },
    { v: `${anio - 2}-01-01|${anio - 2}-12-31`, l: t('mk.periodYear', { y: anio - 2 }) },
  ];
  const opciones = periodos
    .map((o) => `<option value="${esc(o.v)}"${o.v === elegido ? ' selected' : ''}>${esc(o.l)}</option>`)
    .join('');
  // Las cuentas: cuántas de cuántas, y el desplegable con las casillas. Se
  // guarda al marcar, sin botón — y se dice que se guardó, porque una elección
  // que persiste sin decirlo deja al operador sin saber si quedó.
  const elegidas = (cuentas || []).filter((c) => c.selected).length;
  const total = (cuentas || []).length;
  const casillas = (cuentas || [])
    .map((c) => `<label class="filtro-opcion"><input type="checkbox" class="mk-cuenta" data-act="mk:accounts" value="${esc(c.id)}"${c.selected ? ' checked' : ''}> ${esc(c.name)} <span class="hint">${esc(c.currency || '')}</span></label>`)
    .join('');
  const cuentasFiltro = total
    ? `<details class="filtro">
         <summary>${esc(tn('mk.filterAccounts', elegidas, { n: num(elegidas), total: num(total) }))}</summary>
         <div class="filtro-panel">${casillas}</div>
       </details>`
    : '';
  return `<div class="filtros" role="group" aria-label="${esc(t('mk.filtersLabel'))}">
    <select class="sel sm" data-act="mk:period" aria-label="${esc(t('mk.periodLabel'))}">${opciones}</select>
    ${cuentasFiltro}
    <button class="btn sm ghost" data-act="mk:import">${esc(t('mk.importHistory'))}</button>
  </div>`;
}


/** Qué contarle al operador después de pulsar el botón. Nunca «falló». */
function refreshMessage(r) {
  if (r.reason === 'conexion_marcada') return t('mk.refreshMarked');
  if (r.reason === 'sin_conexion') return t('mk.refreshNoConnection');
  if (r.reason === 'sin_cuentas') return t('mk.refreshNoAccounts');
  if (r.reason === 'cupo_de_meta') return t('mk.refreshQuota');
  if (r.reason === 'limitado') return t('mk.refreshLimited', { t: waitText(r.retryAfterSeconds) });
  const done = (r.refreshed || []).length;
  const waited = (r.throttled || []).length;
  const failed = (r.failed || []).length;
  const parts = [];
  if (done) parts.push(tn('mk.refreshDone', done, { n: num(done) }));
  // El límite es POR CUENTA: refrescar unas y esperar por otras es lo normal.
  if (waited) parts.push(tn('mk.refreshWaited', waited, { n: num(waited) }));
  if (failed) parts.push(tn('mk.refreshFailed', failed, { n: num(failed) }));
  return parts.length ? parts.join(' · ') : t('mk.refreshNothing');
}

const marketing = {
  id: 'marketing', get title() { return t('nav.marketing'); }, get sub() { return t('sub.marketing'); }, icon: 'mega',
  load: (api) => ({ mk: api.marketing(), meta: api.metaStatus() }),
  view(d) {
    const body = part(d.mk, (m) => {
      const conn = m.connection || {};
      // Sin conexión no hay métricas que pintar, y decirlo es mejor que una
      // tabla vacía: lo que falta es un clic en la tarjeta de aquí al lado.
      if (conn.status === 'disconnected') return empty(t('mk.notConnected'), t('mk.notConnectedSub'));
      const period = m.period || {};
      // El motor manda `period.label` en castellano; la pantalla habla tres
      // idiomas, así que el rótulo se arma con `days` y solo se cae al del
      // motor si algún día dejara de venir.
      const periodLabel = period.days ? tn('mk.lastDays', period.days, { n: num(period.days) }) : (period.label || '');
      const range = period.since && period.until ? `<span class="hint">${esc(t('mk.range', { since: dayOf(period.since), until: dayOf(period.until) }))}</span>` : '';
      // Un token retirado desde Facebook no se arregla insistiendo: se dice que
      // hay que volver a conectar, y los últimos números se quedan donde están.
      const marked = conn.status === 'error' || conn.status === 'revoked'
        ? `<p class="note warn">${esc(t('mk.connectionMarked', { code: conn.lastErrorCode || '—' }))}</p>` : '';
      // El título del bloque va fuera de las tarjetas —hay una por moneda— así
      // que el vacío tampoco lo repite: sería el mismo rótulo dos veces.
      const totals = (m.totals || []).length
        ? m.totals.map((x) => totalsCard(x, m.totals.length === 1)).join('')
        : `<section class="card">${empty(t('mk.noTotals'), t('mk.noTotalsSub'))}</section>`;
      /* Con más de una moneda se dice POR QUÉ no hay un total único: si no, la
         ausencia se lee como un dato que falta y alguien acaba sumándolo a
         mano. */
      const noSum = (m.totals || []).length > 1 ? `<p class="note">${esc(t('mk.noSum'))}</p>` : '';
      /* Las campañas se agrupan por moneda y NO se ordenan entre grupos: una
         lista ordenada por gasto con soles y dólares mezclados invita a leer
         «1.720 > 300» como si significara algo. */
      const byCurrency = new Map();
      (m.campaigns || []).forEach((c) => {
        if (!byCurrency.has(c.currency)) byCurrency.set(c.currency, []);
        byCurrency.get(c.currency).push(c);
      });
      const camps = byCurrency.size
        ? [...byCurrency].map(([currency, items]) => {
          const heading = byCurrency.size > 1 ? `<h3 class="group-title">${esc(SYMBOL[currency] ? `${currency} · ${SYMBOL[currency]}` : currency)}</h3>` : '';
          return heading + list([...items].sort((a, b) => (b.spend || 0) - (a.spend || 0)), campaignRow);
        }).join('')
        : empty(t('mk.noCampaigns'), t('mk.noCampaignsSub'));
      /* Por qué a estas campañas no se les enseña ROAS, dicho UNA vez y no en
         cada fila: para una inmobiliaria el motivo es el mismo en todas. */
      const roasNote = (m.campaigns || []).some((c) => c.roas == null && c.roasUnavailable === 'sin_valor_de_conversion')
        ? `<p class="note">${esc(t('mk.roasNote'))}</p>` : '';
      const accounts = card(t('mk.accountsCard'), list(m.accounts || [], accountRow, t('mk.noAccounts')), { sub: t('mk.accountsSub') });
      // `mk-cuerpo` es lo que se atenúa mientras se cargan otros filtros: sin
      // marcarlo, cambiar de periodo deja los números VIEJOS en pantalla unos
      // segundos y se leen como los nuevos.
      return `${marked}${freshnessLine(m)}${filterBar(m, cuentasDe(d.meta))}
        <div id="mk-cuerpo"><div class="page-head" style="margin:0"><div><h2>${esc(t('mk.totals'))}</h2><p>${esc(periodLabel)} ${range}</p></div></div>${totals}${noSum}
        ${card(t('mk.campaigns'), camps + roasNote, { sub: t('mk.campaignsSub') })}${accounts}</div>`;
    }, { what: t('mk.what'), phrase: t('wa.connectAds'), extra: t('mk.extra') });
    /* La tarjeta de Meta Ads (plan 14) va DEBAJO cuando hay números que
       enseñar, y encima cuando lo que toca es conectar: lo primero que se ve
       tiene que ser lo que el operador vino a hacer. */
    const connected = !(d.mk instanceof Error) && !isPending(d.mk) && d.mk && d.mk.connection && d.mk.connection.status === 'active';
    const meta = metaCard(d.meta);
    return `<div class="stack">${head(this.title, this.sub, waBtn(t('wa.leadsPerCampaign'), t('mk.askOnWhatsApp'), 'btn primary'))}${connected ? body + meta : meta + body}</div>`;
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
    /**
     * Pedirle a Meta los números otra vez.
     *
     * Nunca es un error: la ruta devuelve 200 también cuando el límite de cinco
     * minutos deja la petición fuera, y entonces lo que hay que enseñar es
     * CUÁNDO se podrá volver a pedir, no un fallo. La respuesta trae el
     * overview dentro, así que se repinta con lo que ya vino en vez de pedirlo
     * por segunda vez.
     */
    'mk:refresh': async (el, ctx, d, reload, rerender) => {
      if (el) el.disabled = true;
      try {
        const r = await ctx.api.marketingRefresh();
        if (isPending(r)) { toast(t('common.comingSoon', { what: t('mk.what') })); return; }
        if (r && r.overview) { d.mk = r.overview; rerender(); }
        toast(refreshMessage(r || {}), r && r.accepted ? 'ok' : '');
        // El permiso retirado se arregla reconectando, y eso vive en la tarjeta
        // de Meta Ads: se vuelve a pedir su estado para que lo diga ella.
        if (r && r.reason === 'conexion_marcada') { ctx.cache = {}; reload(); }
      } catch (e) {
        toast(e.message, 'bad');
      } finally { if (el) el.disabled = false; }
    },
    /**
     * Mirar otro periodo.
     *
     * No recarga la sección entera: pide SOLO el overview de ese tramo y
     * repinta. Recargar traería otra vez el CRM, la agenda y los avisos para
     * cambiar un desplegable.
     */
    'mk:period': async (el, ctx, d, reload, rerender) => {
      const [since, until] = String(el.value || '').split('|');
      // Elegir ES la acción: no hay «aplicar». Lo que sí hace falta es DECIR
      // que está cargando — sin eso, los números viejos se quedan en pantalla
      // unos segundos y se leen como los del periodo nuevo.
      cargando(true);
      if (el) el.disabled = true;
      try {
        const r = since && until
          ? await ctx.api.marketingOverviewBetween(since, until)
          : await ctx.api.marketing();
        if (isPending(r)) { toast(t('common.comingSoon', { what: t('mk.what') })); return; }
        if (r) { d.mk = r; rerender(); }
      } catch (e) {
        toast(e.message, 'bad');
      } finally { cargando(false); if (el) el.disabled = false; }
    },
    /**
     * Marcar o desmarcar una cuenta.
     *
     * Se guarda al instante, sin «Guardar la elección»: es un filtro más y
     * pedir un segundo clic para confirmar lo que ya se dijo sobra.
     *
     * Pero NO es solo una vista: cambia lo que el trabajo horario sincroniza.
     * Por eso se avisa de que quedó guardado —una elección que persiste en
     * silencio deja al operador sin saber si tomó— y por eso desmarcar la
     * ÚLTIMA se rechaza: sin ninguna cuenta no hay nada que copiar, y eso se
     * dice en vez de dejarlo pasar y que el panel se vacíe sin explicación.
     */
    'mk:accounts': async (el, ctx, d, reload, rerender) => {
      const refs = [...document.querySelectorAll('input.mk-cuenta:checked')].map((i) => i.value);
      if (!refs.length) {
        el.checked = true;
        toast(t('mk.accountsAtLeastOne'));
        return;
      }
      cargando(true);
      try {
        await ctx.api.metaSelectAccounts(refs);
        toast(t('mk.metaSaved'), 'ok');
        ctx.cache = {};
        reload();
      } catch (e) {
        el.checked = !el.checked;
        toast(e.message, 'bad');
        cargando(false);
      }
    },
    /**
     * Traer de Meta lo anterior a la ventana.
     *
     * Puede tardar: son hasta 37 meses pedidos mes a mes. Se avisa antes de
     * empezar, porque un botón que se queda apagado medio minuto sin decir
     * nada se lee como una avería.
     *
     * Meta no da nada de hace más de 37 meses, y eso NO es un fallo nuestro:
     * se dice tal cual en vez de dejar creer que faltan datos por traer.
     */
    'mk:import': async (el, ctx, d, reload, rerender) => {
      if (el) el.disabled = true;
      toast(t('mk.importStarted'));
      try {
        const r = await ctx.api.marketingImportHistory();
        if (isPending(r)) { toast(t('common.comingSoon', { what: t('mk.what') })); return; }
        if (r && r.overview) { d.mk = r.overview; rerender(); }
        const dias = (r && r.days) || 0;
        toast(
          dias
            ? tn('mk.importDone', dias, { n: num(dias), c: num((r && r.campaigns) || 0) })
            : t('mk.importEmpty'),
          dias ? 'ok' : '',
        );
      } catch (e) {
        toast(e.message, 'bad');
      } finally { if (el) el.disabled = false; }
    },
    'meta:refresh': async (el, ctx, d, reload) => {
      el.disabled = true;
      try { await ctx.api.metaRefreshAccounts(); ctx.cache = {}; reload(); }
      catch (e) { toast(e.message, 'bad'); el.disabled = false; }
    },
    'meta:disconnect': async (el, ctx, d, reload) => {
      if (!window.confirm(t('mk.metaConfirmOff'))) return;
      el.disabled = true;
      try { await ctx.api.metaDisconnect(); toast(t('mk.metaRemoved'), 'ok'); ctx.cache = {}; reload(); }
      catch (e) { toast(e.message, 'bad'); el.disabled = false; }
    },
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
        title: `${a.selected ? `${chip(t('mk.metaInUse'), 'ok')} ` : ''}${esc(a.name)}`,
        sub: `${esc(a.accountRef)}${a.currency ? ` · ${esc(a.currency)}` : ''}${a.timezoneName ? ` · ${esc(a.timezoneName)}` : ''}${a.accountStatus && a.accountStatus !== 1 ? ` · <span class="sev-warning">${esc(t('mk.metaDisabled'))}</span>` : ''}`,
      }))}`).join('')
      : `<div class="empty"><b>${esc(t('mk.metaNoAccounts'))}</b></div>`;
    return card(t('mk.meta'), `
      <h3 class="group-title">${esc(t('mk.metaAccounts'))}</h3>${accounts}
      ${s.tokenExpiresAt ? `<p class="note warn" style="margin-top:12px">${esc(t('mk.metaExpires', { date: fmtDate(s.tokenExpiresAt) }))}</p>` : ''}
      <p class="note">${esc(t('mk.metaPickAbove'))}</p>
      <div class="inline-list" style="margin-top:16px">
        <button class="btn sm ghost" data-act="meta:refresh">${esc(t('mk.metaRefresh'))}</button>
        <button class="btn sm danger" data-act="meta:disconnect">${esc(t('mk.metaDisconnect'))}</button>
      </div>`,
      { sub: s.connectedAt ? t('mk.metaSince', { date: fmtDate(s.connectedAt) }) : t('mk.metaSub'),
        right: `${logo}${chip(t('mk.connected'), 'ok')}` });
  }, { what: t('mk.meta'), phrase: t('wa.connectAds'), extra: t('mk.metaOffSub') });
}

/* ------------------------------------------------- la moneda de la cuenta
   Se pregunta UNA vez y solo cuando de verdad no la sabe nadie
   (`currencySource === null`) y ya hay un CRM conectado: si la declaró alguien
   de la cuenta, o si la trajo el CRM al autorizar, volver a preguntarla es
   pedirle al cliente un dato que ya tenemos. Editable siempre desde aquí,
   porque el CRM también se equivoca y quien la declaró pudo teclear mal.

   Solo `owner` y `admin`: no es una preferencia personal —decide con qué
   símbolo ve la plata TODO el equipo— y el engine devuelve 403 al resto. A
   quien no puede se le dice quién puede, en vez de enseñarle un campo que va a
   fallar. Cuando `/auth/me` no trae `role` (engine anterior) se enseña igual:
   en ese engine la ruta tampoco existe, así que lo que sale es «se activa
   pronto» y no un error. */
const canSetCurrency = (me) => !me.role || me.role === 'owner' || me.role === 'admin';

/* Un campo con lista de sugerencias en vez de un desplegable cerrado: el engine
   acepta cualquier ISO 4217 de tres letras y un desplegable dejaría fuera al
   cliente en guaraníes. La lista lleva código y símbolo, que no se traducen. */
function currencyForm(me) {
  const options = Object.keys(SYMBOL).map((c) => `<option value="${c}">${c} · ${esc(SYMBOL[c])}</option>`).join('');
  return `<form class="form currency-form" data-form="currency" autocomplete="off">
    <label for="cur-input">${esc(t('cuenta.currencyLabel'))}
      <input id="cur-input" name="currency" list="cur-codes" required maxlength="3" pattern="[A-Za-z]{3}" placeholder="PEN" value="${esc(me.currency || '')}">
    </label>
    <datalist id="cur-codes">${options}</datalist>
    <div class="form-foot"><button class="btn primary" type="submit">${esc(t('common.save'))}</button><span class="form-msg"></span></div>
    <p class="hint">${esc(t('cuenta.currencyForever'))}</p>
  </form>`;
}

function currencyRow(me, active) {
  const crm = (active && (PROVIDER_NAMES[active.provider] || active.name)) || t('cuenta.currencyTheCrm');
  const can = canSetCurrency(me);
  const src = me.currencySource;
  // Preguntar en cuanto hay CRM y sigue sin saberse: es el momento en que el
  // dato hace falta, y el operador acaba de mirar esta misma tarjeta.
  const ask = !src && can && Boolean(active);
  const value = me.currency
    ? chip(SYMBOL[me.currency] ? `${me.currency} · ${SYMBOL[me.currency]}` : me.currency, 'ok')
    : chip(t('cuenta.currencyUnset'), 'warn');
  const sub = ask ? t('cuenta.currencyAskSub', { crm })
    : src === 'account' ? t('cuenta.currencyFromAccount')
      : src === 'crm' ? t('cuenta.currencyFromCrm', { crm })
        : `${t('cuenta.currencyUnknown')}${can ? '' : ' ' + t('cuenta.currencyOnlyOwner')}`;
  return row({
    ico: '💱', title: `${esc(t('cuenta.currency'))} ${value}`, sub: esc(sub),
    primary: can && !ask ? `<button class="btn sm ghost" data-act="acc:currency">${esc(t(me.currency ? 'cuenta.currencyChange' : 'cuenta.currencySet'))}</button>` : '',
  }) + `<div id="currency-box">${ask ? currencyForm(me) : ''}</div>`;
}

/* ==================================================================== CUENTA */
const cuenta = {
  id: 'cuenta', get title() { return t('nav.cuenta'); }, get sub() { return t('sub.cuenta'); }, icon: 'user',
  load: (api) => ({ me: api.me(), quota: api.quota(), connections: api.connections(), sheets: api.sheets(), meta: api.metaStatus(), team: api.team(), agent: api.agent(), health: api.health() }),
  view(d, ctx) {
    const me = val(d.me, {});
    const PLAN = { gratis: 'plan.gratis', free: 'plan.gratis', basico: 'plan.basico', starter: 'plan.starter', pro: 'plan.pro', enterprise: 'plan.enterprise' };
    const planName = (raw) => { const key = PLAN[String(raw || '').toLowerCase()]; return key ? t(key) : raw || t('common.dash'); };
    const logo = (p) => `<img class="logo-sm" src="../../assets/img/logos/${p === 'google-ads' ? 'automation' : esc(p)}.svg" alt="">`;

    const plan = part(d.quota, (q) => { const total = q.commands.allowance + q.commands.addons + q.commands.adjustments; const share = total ? q.commands.used / total : 0; const cls = share >= 1 ? 'bad' : share >= 0.8 ? 'warn' : '';
      return `<div class="kpi"><div class="kpi-label">${esc(t('cuenta.plan', { name: q.plan.name, price: q.plan.priceUsd, interval: t(q.plan.interval === 'month' ? 'cuenta.month' : 'cuenta.year') }))}</div><div class="kpi-value">${num(q.commands.used)}<small>${esc(t('cuenta.ofCommands', { n: num(total) }))}</small></div><div class="progress ${cls}"><i style="width:${Math.min(100, Math.round(share * 100))}%"></i></div><div class="kpi-sub">${share >= 0.8 ? `<span class="sev-warning">${esc(t('cuenta.over80'))}</span> ` : ''}${esc(t('cuenta.renews', { date: fmtDate(q.period.resetAt) }))}${q.blockedReason ? ` · <span class="sev-warning">${esc(q.blockedReason)}</span>` : ''}</div></div>`; },
      { what: t('cuenta.usageWhat'), phrase: t('wa.commandsLeft'), extra: t('cuenta.yourPlan', { plan: planName(me.plan) }) });
    // El CRM activo se resuelve antes de la tarjeta de cuenta: la moneda dice de
    // dónde salió («la sacamos de tu HubSpot») y necesita su nombre.
    const conns = val(d.connections, []); const active = conns.find((c) => c.bound && c.status === 'active'); const recoverable = conns.find((c) => c.recoverable);
    const cuentaCard = card(t('cuenta.yourAccount'), `<div class="list">
      ${row({ ico: '👤', title: esc(personName(me, ctx)), sub: esc(personEmail(me, ctx)), primary: `<button class="btn sm" data-act="acc:profile">${esc(t('cuenta.edit'))}</button>` })}
      ${row({ ico: ICON.wa, title: `WhatsApp ${me.whatsapp ? statusChip(me.whatsapp.status) : ''}`, sub: `${esc(me.whatsapp?.phone || t('cuenta.notLinked'))}${me.comandoNumber ? ` · ${esc(t('cuenta.youWriteTo', { number: me.comandoNumber }))}` : ''}`, primary: `<button class="btn sm ghost" data-act="wa:change">${esc(t('cuenta.changeNumber'))}</button>` })}
      <div id="wa-change-box"></div>
      ${currencyRow(me, active)}
      <div class="row"><div class="row-ico">💳</div><div class="row-body">${plan}</div><div class="row-actions"><a class="btn sm" href="../../#precios">${esc(t('cuenta.changePlan'))}</a></div></div>
    </div>`);

    const h = val(d.health, null);
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
    'acc:currency': (el, ctx, d) => {
      const box = document.getElementById('currency-box');
      if (!box) return;
      el.disabled = true;
      box.innerHTML = currencyForm(val(d.me, {}));
      const input = box.querySelector('input');
      if (input) { input.focus(); input.select(); }
    },
    ...crmActions,
  },
  forms: {
    /**
     * Guardar la moneda cambia el símbolo de TODA la plata del panel, no solo
     * de esta tarjeta: se actualiza el respaldo que lee `money()`, el `me` que
     * ya está en memoria, y se recarga para que la fila deje de preguntar. El
     * aviso va por toast además de por el mensaje del formulario, porque el
     * repintado se lleva por delante el formulario y con él su mensaje.
     */
    currency: async (form, ctx, d, reload) => {
      const code = String(new FormData(form).get('currency') || '').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) throw new Error(t('cuenta.currencyInvalid'));
      const saved = await ctx.api.setCurrency(code);
      // La ruta todavía no está publicada: 404 es «se activa pronto», no un fallo.
      if (isPending(saved)) return t('common.comingSoon', { what: t('cuenta.currencyWhat') });
      const value = (saved && saved.currency) || code;
      const source = (saved && saved.source) || 'account';
      setAccountCurrency(value);
      const me = val(d.me, null);
      if (me) { me.currency = value; me.currencySource = source; }
      if (ctx.me) { ctx.me.currency = value; ctx.me.currencySource = source; }
      const done = t('cuenta.currencySaved', { currency: value });
      toast(done, 'ok');
      ctx.cache = {};
      reload();
      return done;
    },
  },
};

/* El orden del menú es una decisión de producto, no del código:
   Hoy (qué hago ahora) · Resumen (cómo va la cosa) · Agenda (qué viene) ·
   Automatizaciones · Marketing · Cuenta. Agenda baja al tercer puesto porque
   se mira una vez al día; el Resumen se mira de pasada muchas veces.
   Los `id` NO cambian con los rótulos: son las rutas (#/crm, #/avisos) que la
   gente ya tiene guardadas y las claves que dicen dónde se lee cada texto. */
export const SECTIONS = [hoy, crm, agenda, avisos, marketing, cuenta];

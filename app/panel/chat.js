/* El chat con Comando: la barra lateral del panel.
   Escribir aquí es exactamente lo mismo que escribirle por WhatsApp: el panel
   ENCOLA la frase por la misma puerta (`POST /operator/commands`) y luego
   consulta el diálogo hasta que el turno tiene algo que enseñar. No ejecuta
   nada por su cuenta: la vista previa, el CONFIRMAR, el cupo, las aprobaciones
   y el historial viven en ese único camino, y un atajo desde el navegador los
   duplicaría hasta que un día dejaran de coincidir.

   Antes esto era «la consola»: una tarjeta dentro de «Hoy» y un diálogo modal
   en el resto. Ahora es una conversación siempre a la vista, al lado de la
   hoja, con las burbujas de un chat: lo que tú dijiste a la derecha, lo que
   Comando contestó a la izquierda. Cuando el origen es el panel, el engine NO
   manda la respuesta por WhatsApp: esta columna es el único sitio donde
   aparece, y por eso se queda mirando. */

import { isPending } from './api.js?v=14';
import { esc, rel, fmtTime, askLine, toast } from './ui.js?v=10';
import { t, tn } from '../i18n.js?v=1';

const POLL_MS = 1500;
const POLL_UNTIL_MS = 30_000;
const HISTORY_LIMIT = 20;

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
/* Un turno recién registrado también llega en `pending`, y eso NO es un plan
   esperando la palabra: es Comando pensando. Lo que distingue una cosa de la
   otra es `kind` (`PLAN_PREVIEW`). Se conserva el camino por `status` para el
   diálogo antiguo, que no traía `kind`. */
export const awaitsWord = (x) => x.kind === 'PLAN_PREVIEW' || (!x.kind && x.status === 'pending');

export const chatState = (ctx) => (ctx.chat || (ctx.chat = { entries: [], loaded: false }));

/* El plan viene escrito para WhatsApp, con *negritas* de asterisco. Aquí se
   leerían como asteriscos sueltos; se traducen después de escapar, que es
   cuando ya no puede colarse nada del texto. */
const waMarkup = (text) => esc(text).replace(/\*([^*\n]+)\*/g, '<b>$1</b>');

const STATUS_CHIP = { executed: 'ok', pending: 'warn', awaiting_approval: 'warn', cancelled: '', failed: 'bad', declined: '', expired: '' };

/* ------------------------------------------------------------------ pintar */

/** Lo que dijo el operador: una burbuja a la derecha. */
const mine = (e) => `<div class="bub me"><div class="bub-body">${esc(e.utterance)}</div><time class="bub-time" datetime="${esc(e.at || '')}">${esc(e.at ? fmtTime(e.at) : '')}</time></div>`;

/** Lo que contestó Comando: una burbuja a la izquierda, con su gesto. */
function theirs(e) {
  if (e.status === 'thinking') return bot(`<span class="spinner"></span> ${esc(t('console.thinking'))}`, 'is-thinking');
  if (e.status === 'soon') return bot(`<div class="ask">${askLine(e.utterance, t('console.soonAsk'))}</div>`);
  if (e.status === 'slow') return bot(esc(t('console.slow')));
  if (e.status === 'error') return bot(esc(e.note || t('common.failed')), 'is-bad');

  const gesture = gestureOf(e);
  const preview = gesture === 'confirm' && e.plan ? `<div class="wa-preview">${waMarkup(e.plan)}</div>` : '';
  const said = e.note || (gesture === 'confirm' ? '' : e.plan) || '';
  const expires = e.expiresAt && gesture ? `<div class="bub-meta">${esc(t('console.expires', { when: rel(e.expiresAt) }))}</div>` : '';
  const body = `${said ? `<div class="bub-said">${waMarkup(said)}</div>` : ''}${preview}${expires}`;

  if (gesture === 'confirm')
    return bot(`${body}<div class="bub-actions"><button class="btn sm primary" data-act="cmd:confirm" data-key="${esc(e.key)}">${esc(t('wa.confirm'))}</button></div>`, 'is-plan');
  if (gesture === 'pin')
    return bot(`${body}<div class="bub-note">${esc(t('console.pinNote'))}</div>${replyForm(e, t('console.pin'), true)}`, 'is-plan');
  if (gesture === 'reply') return bot(`${body}${replyForm(e, t('console.reply'), false)}`);
  if (gesture === 'wait') return bot(`${body}<div class="bub-note">${esc(t('console.waitingAdmin'))}</div>`);

  /* Un turno terminado: el desenlace como chip y, si tocó registros, el
     enlace a verlos en la hoja. El id es el del turno en el engine; sin él
     (una respuesta que no llegó a registrarse) no hay nada que buscar. */
  const chipKind = STATUS_CHIP[e.status];
  const chip = e.status && e.status !== 'executed'
    ? `<span class="chip ${chipKind || ''}">${esc(chipKind === undefined ? e.status : t('hist.' + e.status))}</span>`
    : '';
  const sheet = e.id && e.records > 0
    ? `<button class="btn sm ghost" data-act="chat:sheet" data-id="${esc(e.id)}" data-utterance="${esc(e.utterance)}">${esc(t('chat.seeInSheet'))} · ${esc(tn('chat.records', e.records))}</button>`
    : '';
  const foot = chip || sheet ? `<div class="bub-actions">${chip}${sheet}</div>` : '';
  return bot(`${body || `<div class="bub-said">${esc(t('chat.done'))}</div>`}${foot}`, e.status === 'failed' ? 'is-bad' : '');
}
const bot = (inner, cls = '') => `<div class="bub bot ${cls}"><div class="bub-body">${inner}</div></div>`;
const replyForm = (e, placeholder, numeric) => `<form class="bub-reply" data-send="cmd:reply" data-key="${esc(e.key)}" autocomplete="off">
  <input class="chat-input" name="reply" type="text"${numeric ? ' inputmode="numeric" maxlength="8"' : ''} placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}">
  <button class="btn sm primary" type="submit">${esc(t('console.send'))}</button></form>`;

/** El hilo entero, del más viejo al más nuevo (como un chat). */
export function chatLog(ctx) {
  const entries = chatState(ctx).entries;
  if (!entries.length) return `<div class="chat-empty"><b>${esc(t('chat.emptyTitle'))}</b>${esc(t('chat.emptySub'))}</div>`;
  return [...entries].reverse().map((e) => mine(e) + theirs(e)).join('');
}

/* ---------------------------------------------------- el catálogo de skills
   Las frases que Comando ya entiende, agrupadas y con nombre. La frase ES el
   nombre, en las palabras del operador: así no hay una etiqueta aparte que se
   pueda desincronizar de lo que realmente se ejecuta. Una frase que acaba en
   espacio o en dos puntos está incompleta a propósito («avísame cuando ») y se
   escribe en el campo. */
const SKILLS = [
  ['skills.crm', ['wa.moneyInPlay', 'wa.dealsByStage', 'wa.stalledDeals', 'wa.whatToReview']],
  ['skills.agenda', ['wa.whatMattersToday', 'wa.thisWeek', 'wa.newReminder']],
  ['skills.autos', ['wa.myAlerts', 'wa.whichAutomations', 'wa.newAlert', 'wa.quietHours', 'wa.noMessagesToday']],
  ['skills.marketing', ['wa.leadsPerCampaign', 'wa.weeklyReport', 'wa.newBudgetRule', 'wa.connectAds']],
  ['skills.cuenta', ['wa.commandsLeft', 'wa.whoUses', 'wa.lastThing', 'wa.teach']],
];
const isPartial = (phrase) => /[\s:]$/.test(phrase);
export function skillsView() {
  const groups = SKILLS.map(([group, keys]) => `<div class="skills-group"><h4>${esc(t(group))}</h4><div class="skills-row">${keys.map((k) => {
    const phrase = t(k);
    const partial = isPartial(phrase);
    return `<button type="button" class="skill${partial ? ' is-partial' : ''}" data-act="${partial ? 'cmd:fill' : 'cmd:run'}" data-phrase="${esc(phrase)}" title="${esc(phrase)}">${esc(phrase.trim())}${partial ? '…' : ''}</button>`;
  }).join('')}</div></div>`).join('');
  return `<details class="skills"><summary>${esc(t('skills.title'))}</summary><div class="skills-body"><p class="skills-sub">${esc(t('skills.sub'))}</p>${groups}</div></details>`;
}

/** La columna entera: cabecera, hilo, sugerencias y el campo de escribir. */
export function chatView(ctx) {
  return `<div class="chat-head">
      <div class="chat-who"><span class="chat-avatar" aria-hidden="true">C</span><div><b>${esc(t('chat.title'))}</b><small>${esc(t('chat.sub'))}</small></div></div>
      <button class="btn sm ghost chat-close" type="button" data-act="chat:close" aria-label="${esc(t('chat.close'))}">✕</button>
    </div>
    <div class="chat-log" id="chat-log">${chatLog(ctx)}</div>
    <div class="chat-foot">
      ${skillsView()}
      <form class="chat-form" data-send="cmd:send" autocomplete="off">
        <input class="chat-input" id="chat-input" name="utterance" type="text" maxlength="1000" enterkeyhint="send" placeholder="${esc(t('console.placeholder'))}" aria-label="${esc(t('console.placeholder'))}">
        <button class="btn primary chat-send" type="submit" aria-label="${esc(t('console.send'))}">${esc(t('console.send'))}</button>
      </form>
    </div>`;
}

/** Repinta solo el hilo y lo deja abajo del todo, que es donde está lo nuevo. */
export function paintChat(ctx) {
  const host = document.getElementById('chat-log');
  if (!host) return;
  host.innerHTML = chatLog(ctx);
  host.scrollTop = host.scrollHeight;
}

/** Abre la columna (en móvil es un cajón) y deja el foco en el campo. */
export function openChat(focus = true) {
  document.body.classList.add('chat-open');
  document.body.classList.remove('chat-hidden');
  try { localStorage.setItem('comando.chat', 'open'); } catch (e) { /* sin almacenamiento */ }
  if (focus) document.getElementById('chat-input')?.focus();
}
export function closeChat() {
  document.body.classList.remove('chat-open');
  document.body.classList.add('chat-hidden');
  try { localStorage.setItem('comando.chat', 'closed'); } catch (e) { /* sin almacenamiento */ }
}
export function chatPreference() {
  try { return localStorage.getItem('comando.chat'); } catch (e) { return null; }
}

/* ---------------------------------------------------------------- historial
   Lo último que el operador pidió, para que la columna no arranque vacía: un
   chat sin pasado parece roto. Se pide UNA vez; lo que pase después ya lo trae
   el sondeo de cada turno. */
export async function loadHistory(ctx) {
  const state = chatState(ctx);
  if (state.loaded || !ctx.api) return;
  state.loaded = true;
  let dialogue;
  try { dialogue = await ctx.api.commands(HISTORY_LIMIT); } catch (e) { return; }
  if (!dialogue || isPending(dialogue)) return;
  const items = Array.isArray(dialogue) ? dialogue : (dialogue.entries || dialogue.items || []);
  const known = new Set(state.entries.map((e) => e.id).filter(Boolean));
  const older = items
    .filter((x) => x && x.utterance && !known.has(x.id))
    .map((x) => ({
      key: 'h' + (x.id || Math.random().toString(36).slice(2)),
      id: x.id, utterance: x.utterance, at: x.at,
      status: stillThinking(x) ? 'thinking' : x.status,
      kind: x.kind, plan: x.plan, note: x.note, expiresAt: x.expiresAt, records: x.records || 0,
    }));
  /* Las entradas van del más nuevo al más viejo (`unshift` al enviar); el
     historial llega igual, así que se pega detrás. */
  state.entries.push(...older);
  paintChat(ctx);
}

/* ------------------------------------------------------------------ enviar */

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
    if (isPending(dialogue)) { entry.status = 'soon'; paintChat(ctx); return; }
    const items = Array.isArray(dialogue) ? dialogue : (dialogue.entries || dialogue.items || []);
    const found = items.find((x) => x.id === entry.id);
    if (!found || stillThinking(found) || (was && found.kind === was)) continue;
    Object.assign(entry, { status: found.status, kind: found.kind, plan: found.plan, note: found.note, expiresAt: found.expiresAt, records: found.records || 0 });
    paintChat(ctx);
    return;
  }
  /* Pasados los 30 s se deja de mirar: la frase ya está encolada y su respuesta
     aparecerá al recargar. Insistir más tiempo gasta batería para no
     enterarse antes. */
  entry.status = 'slow';
  paintChat(ctx);
}

/** Encola una frase y se queda mirando el turno que crea. */
export async function sendUtterance(utterance, ctx) {
  const text = String(utterance || '').trim().slice(0, 1000);
  if (!text) return;
  const entry = { key: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), utterance: text, at: new Date().toISOString(), status: 'thinking', records: 0 };
  chatState(ctx).entries.unshift(entry);
  paintChat(ctx);
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
    if (isPending(r)) { entry.status = 'soon'; paintChat(ctx); return; }
    if (r && r.id && !entry.id) entry.id = r.id;
    /* Sin id no hay a qué mirar. Se dice y se para, en vez de sondear 30 s
       una respuesta que no se va a poder reconocer. */
    if (!entry.id) { entry.status = 'slow'; paintChat(ctx); return; }
    await followUp(entry, ctx, was);
  } catch (e) {
    entry.status = 'error'; entry.note = e.message;
    paintChat(ctx);
  }
}

/* ---------------------------------------------------------------- acciones */

/** Las acciones del chat, válidas desde cualquier sección. */
export function chatActions() {
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
    entry.status = 'thinking'; entry.note = ''; paintChat(ctx);
    await enqueue(entry, text, ctx, was);
  };
  const find = (ctx, key) => chatState(ctx).entries.find((x) => x.key === key);
  return {
    'cmd:send': async (form, ctx) => {
      const input = form.querySelector('.chat-input');
      const text = input.value;
      input.value = '';
      openChat(false);
      await sendUtterance(text, ctx);
    },
    /* Ejecutar aquí en vez de irse a WhatsApp. En móvil el chat está plegado:
       se abre ANTES de mandar, o la respuesta se pinta donde nadie la ve. */
    'cmd:run': async (el, ctx) => {
      el.blur();
      openChat(false);
      await sendUtterance(el.dataset.phrase, ctx);
    },
    'cmd:fill': (el) => {
      openChat(false);
      const input = document.getElementById('chat-input');
      if (!input) return;
      input.value = el.dataset.phrase;
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    },
    'cmd:confirm': async (el, ctx) => { el.disabled = true; await answer(find(ctx, el.dataset.key), t('wa.confirm'), ctx); },
    'cmd:reply': async (form, ctx) => {
      const input = form.querySelector('.chat-input');
      const text = input.value.trim();
      input.value = '';
      await answer(find(ctx, form.dataset.key), text, ctx);
    },
    'chat:open': () => openChat(true),
    'chat:close': () => closeChat(),
    /* Los registros sobre los que cayó un turno, en la hoja: se piden al engine
       por el id del turno y la hoja se abre filtrada por esos ids. */
    'chat:sheet': async (el, ctx) => {
      el.disabled = true;
      try {
        const found = await ctx.api.commandRecords(el.dataset.id);
        if (!found || isPending(found) || !found.ids || !found.ids.length) { toast(t('chat.noRecords')); return; }
        ctx.hoja = ctx.hoja || {};
        ctx.hoja.filter = { ids: found.ids, label: el.dataset.utterance || '', truncated: Boolean(found.truncated) };
        if (found.objectType) ctx.hoja.objectType = found.objectType;
        ctx.hoja.offset = 0;
        ctx.cache.hoja = null;
        if (location.hash === '#/hoja') window.dispatchEvent(new HashChangeEvent('hashchange'));
        else location.hash = '#/hoja';
      } catch (e) { toast(e.message || t('common.failed'), 'bad'); }
      finally { el.disabled = false; }
    },
  };
}

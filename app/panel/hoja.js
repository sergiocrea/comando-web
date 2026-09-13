/* La hoja: el CRM del operador como una tabla, con pestañas abajo como en una
   hoja de cálculo. Es la portada del panel y el sitio donde se MIRA; lo que se
   quiere cambiar se le dice a Comando en el chat de al lado, que es el mismo
   camino que WhatsApp (vista previa y CONFIRMAR).

   Lo que sabe hacer: cambiar de pestaña (contactos, negocios, empresas,
   tareas), buscar por texto, ordenar por una columna, elegir columnas —las
   canónicas más las que el catálogo del CRM conoce—, cargar más filas, y
   enseñar SOLO los registros sobre los que cayó un turno del chat («ver en la
   hoja»). Nada de esto escribe en el CRM. */

import { isPending } from './api.js?v=16';
import { esc, num, money, fmtDate, rel, toast, ICON } from './ui.js?v=12';
import { t, tn } from '../i18n.js?v=1';

export const OBJECT_TYPES = ['contact', 'deal', 'company', 'task'];
const PAGE = 200;

/* Las columnas canónicas: las resuelve el engine sin importar el CRM. `key`
   es la propiedad de la fila; `kind` dice cómo se pinta; `sort` es el nombre
   con el que el engine ordena (las que no lo tienen no ordenan). */
const CANONICAL = {
  name: { kind: 'name', sort: 'name' },
  phone: { kind: 'phone' },
  email: { kind: 'email' },
  stage: { kind: 'text', sort: 'stage' },
  amount: { kind: 'money', sort: 'amount' },
  closeDate: { kind: 'date', sort: 'closeDate' },
  owner: { kind: 'text' },
  source: { kind: 'text' },
  pipeline: { kind: 'text' },
  lastActivityAt: { kind: 'when', sort: 'lastActivityAt' },
  createdAt: { kind: 'when', sort: 'createdAt' },
  updatedAt: { kind: 'when', sort: 'updatedAt' },
};
/* Qué se ve por defecto en cada pestaña. Lo demás se activa en «Columnas». */
const DEFAULTS = {
  contact: ['name', 'phone', 'email', 'source', 'owner', 'lastActivityAt', 'createdAt'],
  deal: ['name', 'stage', 'amount', 'closeDate', 'owner', 'lastActivityAt'],
  company: ['name', 'owner', 'lastActivityAt', 'createdAt'],
  task: ['name', 'owner', 'createdAt', 'updatedAt'],
};
/* Propiedades del CRM que casi todo el mundo quiere ver aunque no sean
   canónicas: se añaden por defecto si la página las trae. */
const HANDY = {
  contact: ['distrito', 'lifecyclestage', 'city', 'estado_matricula'],
  deal: ['proyecto', 'tipo_inmueble', 'pipeline'],
  company: ['domain', 'city', 'country', 'industry'],
  task: ['hs_task_status', 'hs_task_priority', 'hs_timestamp', 'Status', 'Priority', 'ActivityDate'],
};
/* Propiedades que duplican una canónica: no se ofrecen dos veces. */
const SHADOWED = new Set([
  'name', 'Name', 'dealname', 'firstname', 'lastname', 'FirstName', 'LastName', 'fullname',
  'phone', 'mobilephone', 'hs_whatsapp_phone_number', 'Phone', 'MobilePhone', 'whatsapp',
  'email', 'Email', 'dealstage', 'StageName', 'stageRef', 'pipelineRef', 'amount', 'amountMinor',
  'closedate', 'CloseDate', 'hubspot_owner_id', 'OwnerId', 'fuente_lead', 'LeadSource',
  'createdate', 'CreatedDate', 'createdAt', 'hs_lastmodifieddate', 'lastmodifieddate',
  'LastModifiedDate', 'lastActivityAt', 'hs_object_id', 'deal_currency_code', '__comando_stage_history',
]);

export const hojaState = (ctx) => {
  if (!ctx.hoja) {
    ctx.hoja = { objectType: 'contact', sort: 'updatedAt', dir: 'desc', q: '', offset: 0, filter: null, columns: {}, selected: null };
    try {
      const saved = JSON.parse(localStorage.getItem('comando.hoja') || 'null');
      if (saved && OBJECT_TYPES.includes(saved.objectType)) ctx.hoja.objectType = saved.objectType;
      if (saved && saved.columns) ctx.hoja.columns = saved.columns;
    } catch (e) { /* sin almacenamiento: se arranca con lo de siempre */ }
  }
  return ctx.hoja;
};
const remember = (s) => { try { localStorage.setItem('comando.hoja', JSON.stringify({ objectType: s.objectType, columns: s.columns })); } catch (e) { /* nada */ } };

/** Lo que se le pide al engine para el estado actual. */
export function requestFor(s) {
  return {
    objectType: s.objectType, limit: PAGE, offset: s.offset, sort: s.sort, dir: s.dir,
    ...(s.q ? { q: s.q } : {}),
    ...(s.filter && s.filter.ids ? { ids: s.filter.ids.slice(0, 500) } : {}),
  };
}

/* ------------------------------------------------------------------ columnas */

/** Las columnas visibles ahora: las elegidas, o las de siempre para esta pestaña. */
function visibleColumns(s, page) {
  const chosen = s.columns[s.objectType];
  if (chosen && chosen.length) return chosen;
  const handy = (page && page.columns ? page.columns.map((c) => c.name) : []).filter((n) => HANDY[s.objectType].includes(n));
  return [...DEFAULTS[s.objectType], ...handy];
}
/** Todo lo que se puede enseñar: canónicas y las del catálogo que la página trae. */
function availableColumns(s, page) {
  const catalog = (page && page.columns ? page.columns : []).filter((c) => !SHADOWED.has(c.name));
  return [
    ...Object.keys(CANONICAL).map((key) => ({ name: key, label: t('hoja.col.' + key), canonical: true })),
    ...catalog.map((c) => ({ name: c.name, label: c.label || c.name, canonical: false, type: c.type, options: c.options })),
  ];
}
const labelOf = (name, page) => {
  if (CANONICAL[name]) return t('hoja.col.' + name);
  const col = page && page.columns ? page.columns.find((c) => c.name === name) : null;
  return col && col.label ? col.label : name;
};

/* --------------------------------------------------------------------- celdas */

const digits = (phone) => String(phone || '').replace(/\D/g, '');
function cell(row, name, page, ctx) {
  const c = CANONICAL[name];
  const raw = c ? row[name] : (row.fields || {})[name];
  if (raw == null || raw === '') return '<td class="is-empty">—</td>';
  const kind = c ? c.kind : typeOf(name, page);
  if (kind === 'name') return `<td class="is-name"><b>${esc(raw)}</b></td>`;
  if (kind === 'money') return `<td class="is-num">${esc(money(raw.amountMinor / 100, raw.currency || (ctx.me && ctx.me.currency) || undefined))}</td>`;
  if (kind === 'phone') return `<td class="is-phone"><a href="https://wa.me/${esc(digits(raw))}" target="_blank" rel="noopener" title="${esc(t('hoja.writeOnWhatsApp'))}">${ICON.wa}${esc(raw)}</a></td>`;
  if (kind === 'email') return `<td><a href="mailto:${esc(raw)}">${esc(raw)}</a></td>`;
  if (kind === 'date') return `<td class="is-date">${esc(safeDate(raw))}</td>`;
  if (kind === 'when') return `<td class="is-date" title="${esc(safeDate(raw, true))}">${esc(rel(raw))}</td>`;
  if (kind === 'datetime') return `<td class="is-date">${esc(safeDate(raw, true))}</td>`;
  if (kind === 'number') return `<td class="is-num">${esc(num(raw))}</td>`;
  if (kind === 'bool') return `<td>${raw === true || raw === 'true' ? '✓' : '—'}</td>`;
  if (kind === 'enumeration') return `<td>${esc(optionLabel(name, raw, page))}</td>`;
  const text = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
  return `<td title="${esc(text)}">${esc(text.length > 80 ? text.slice(0, 77) + '…' : text)}</td>`;
}
function typeOf(name, page) {
  const col = page && page.columns ? page.columns.find((c) => c.name === name) : null;
  const type = col ? col.type : 'string';
  if (type === 'number' || type === 'currency') return 'number';
  if (type === 'datetime' || type === 'date') return 'datetime';
  if (type === 'bool' || type === 'boolean') return 'bool';
  if (type === 'enumeration' || type === 'stage' || type === 'owner') return 'enumeration';
  return 'text';
}
function optionLabel(name, value, page) {
  const col = page && page.columns ? page.columns.find((c) => c.name === name) : null;
  const option = col && col.options ? col.options.find((o) => o.value === String(value)) : null;
  return option ? option.label : value;
}
function safeDate(value, withTime) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime ? `${fmtDate(d.toISOString(), true)} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : fmtDate(d.toISOString(), true);
}

/* ---------------------------------------------------------------------- vista */

export const hoja = {
  id: 'hoja', get title() { return t('nav.hoja'); }, get sub() { return t('sub.hoja'); }, icon: 'grid',
  load: (api, ctx) => ({ me: api.me(), sheet: api.records(requestFor(hojaState(ctx))) }),
  view(d, ctx) {
    const s = hojaState(ctx);
    const sheet = d.sheet;
    const tabs = `<nav class="sheet-tabs" aria-label="${esc(t('hoja.tabs'))}">${OBJECT_TYPES.map((type) =>
      `<button type="button" class="sheet-tab${type === s.objectType ? ' is-on' : ''}" data-act="hoja:tab" data-type="${type}">${esc(t('hoja.tab.' + type))}</button>`).join('')}</nav>`;

    if (sheet instanceof Error) return `<div class="sheet">${bar(s, null)}<div class="state"><h2>${esc(t('common.notLoaded'))}</h2><p>${esc(sheet.message)}</p><button class="btn primary" data-reload>${esc(t('common.retry'))}</button></div>${tabs}</div>`;
    if (isPending(sheet)) return `<div class="sheet">${bar(s, null)}<div class="state"><h2>${esc(t('hoja.soonTitle'))}</h2><p>${esc(t('hoja.soonSub'))}</p></div>${tabs}</div>`;
    if (sheet == null) return `<div class="sheet">${bar(s, null)}<div class="state"><h2>${esc(t('common.none'))}</h2></div>${tabs}</div>`;

    const rows = sheet.rows || [];
    const cols = visibleColumns(s, sheet);
    const head = cols.map((name) => {
      const c = CANONICAL[name];
      const sortable = c && c.sort;
      const on = sortable && s.sort === c.sort;
      const arrow = on ? (s.dir === 'asc' ? ' ▲' : ' ▼') : '';
      return sortable
        ? `<th scope="col" class="${on ? 'is-sorted' : ''}"><button type="button" class="th-sort" data-act="hoja:sort" data-sort="${c.sort}" title="${esc(t('hoja.sortBy', { col: labelOf(name, sheet) }))}">${esc(labelOf(name, sheet))}${arrow}</button></th>`
        : `<th scope="col">${esc(labelOf(name, sheet))}</th>`;
    }).join('');
    const body = rows.length
      ? rows.map((r, i) => `<tr data-act="hoja:pick" data-id="${esc(r.id)}" class="${s.selected === r.id ? 'is-selected' : ''}"><td class="is-n">${num(s.offset + i + 1)}</td>${cols.map((name) => cell(r, name, sheet, ctx)).join('')}</tr>`).join('')
      : `<tr><td class="is-empty-row" colspan="${cols.length + 1}">${esc(s.q || s.filter ? t('hoja.noneSearch') : t('hoja.none'))}</td></tr>`;

    const shown = s.offset + rows.length;
    const more = sheet.next != null && sheet.next > shown - 1 && rows.length >= PAGE
      ? `<button class="btn" data-act="hoja:more">${esc(t('hoja.more'))}</button>` : '';
    const foot = `<div class="sheet-foot"><span>${esc(t('hoja.showing', { shown: num(shown), total: num(sheet.total || 0) }))}${sheet.computedAt ? ` · ${esc(t('hoja.asOf', { when: rel(sheet.computedAt) }))}` : ''}</span>${more}</div>`;

    const selected = s.selected ? rows.find((r) => r.id === s.selected) : null;
    const pick = selected ? `<div class="sheet-pick"><b>${esc(selected.name || t('common.dash'))}</b>
        <button class="btn sm primary" data-act="hoja:ask" data-name="${esc(selected.name || '')}">${esc(t('hoja.ask'))}</button>
        ${selected.phone ? `<a class="btn sm wa" href="https://wa.me/${esc(digits(selected.phone))}" target="_blank" rel="noopener">${ICON.wa}${esc(t('hoja.writeOnWhatsApp'))}</a>` : ''}
        <button class="btn sm ghost" data-act="hoja:unpick">${esc(t('row.cancel'))}</button></div>` : '';

    return `<div class="sheet">${bar(s, sheet)}${pick}
      <div class="sheet-wrap"><table class="sheet-table"><thead><tr><th scope="col" class="is-n">#</th>${head}</tr></thead><tbody>${body}</tbody></table></div>
      ${foot}${tabs}</div>`;
  },
  act: {
    'hoja:tab': (el, ctx, d, reload) => { const s = hojaState(ctx); if (s.objectType === el.dataset.type) return; s.objectType = el.dataset.type; s.offset = 0; s.selected = null; s.filter = null; remember(s); reload(); },
    'hoja:sort': (el, ctx, d, reload) => { const s = hojaState(ctx); if (s.sort === el.dataset.sort) s.dir = s.dir === 'asc' ? 'desc' : 'asc'; else { s.sort = el.dataset.sort; s.dir = el.dataset.sort === 'name' ? 'asc' : 'desc'; } s.offset = 0; reload(); },
    'hoja:search': (form, ctx, d, reload) => { const s = hojaState(ctx); s.q = form.querySelector('input').value.trim().slice(0, 120); s.offset = 0; reload(); },
    'hoja:clear': (el, ctx, d, reload) => { const s = hojaState(ctx); s.q = ''; s.filter = null; s.offset = 0; reload(); },
    'hoja:refresh': (el, ctx, d, reload) => reload(),
    'hoja:more': async (el, ctx, d, reload, rerender) => {
      const s = hojaState(ctx); const sheet = d.sheet;
      if (!sheet || isPending(sheet) || sheet instanceof Error) return;
      el.disabled = true;
      try {
        const next = await ctx.api.records({ ...requestFor(s), offset: sheet.next });
        if (next && !isPending(next)) { sheet.rows = [...sheet.rows, ...next.rows]; sheet.next = next.next; sheet.total = next.total; sheet.columns = mergeColumns(sheet.columns, next.columns); }
        rerender();
      } catch (e) { toast(e.message || t('common.failed'), 'bad'); el.disabled = false; }
    },
    'hoja:pick': (el, ctx, d, reload, rerender) => { const s = hojaState(ctx); s.selected = s.selected === el.dataset.id ? null : el.dataset.id; rerender(); },
    'hoja:unpick': (el, ctx, d, reload, rerender) => { hojaState(ctx).selected = null; rerender(); },
    /* Preguntar por un registro: la frase va al chat, que es el mismo camino que
       WhatsApp. No se envía sola: el operador la ve y la manda (o la cambia). */
    'hoja:ask': (el, ctx) => {
      const input = document.getElementById('chat-input');
      document.body.classList.add('chat-open'); document.body.classList.remove('chat-hidden');
      if (!input) return;
      input.value = t('wa.show', { name: el.dataset.name });
      input.focus(); input.setSelectionRange(input.value.length, input.value.length);
    },
    'hoja:columns': (el, ctx, d, reload, rerender) => {
      const s = hojaState(ctx); const sheet = d.sheet && !isPending(d.sheet) && !(d.sheet instanceof Error) ? d.sheet : null;
      const visible = new Set(visibleColumns(s, sheet));
      const options = availableColumns(s, sheet);
      const dlg = document.getElementById('hoja-columnas');
      if (!dlg) return;
      dlg.innerHTML = `<form class="modal-caja columnas" method="dialog" data-form="hoja:columns">
        <div class="consola-cabecera"><h3>${esc(t('hoja.columns'))}</h3><button class="btn sm ghost" type="submit" value="cancel">${esc(t('row.cancel'))}</button></div>
        <p class="skills-sub">${esc(t('hoja.columnsSub'))}</p>
        <div class="columnas-lista">${options.map((o) => `<label class="columnas-item${o.canonical ? ' is-canonical' : ''}"><input type="checkbox" name="col" value="${esc(o.name)}"${visible.has(o.name) ? ' checked' : ''}> <span>${esc(o.label)}</span>${o.canonical ? '' : `<small>${esc(o.name)}</small>`}</label>`).join('')}</div>
        <div class="columnas-pie"><button class="btn ghost" type="button" data-act="hoja:columnsReset">${esc(t('hoja.columnsReset'))}</button><button class="btn primary" type="submit" value="ok">${esc(t('common.apply'))}</button></div></form>`;
      dlg.showModal();
    },
    'hoja:columnsReset': (el, ctx, d, reload, rerender) => { const s = hojaState(ctx); delete s.columns[s.objectType]; remember(s); document.getElementById('hoja-columnas')?.close(); rerender(); },
    'hoja:columnsApply': (form, ctx, d, reload, rerender) => {
      const s = hojaState(ctx);
      const chosen = [...form.querySelectorAll('input[name=col]:checked')].map((i) => i.value);
      if (chosen.length) s.columns[s.objectType] = chosen; else delete s.columns[s.objectType];
      remember(s); rerender();
    },
  },
};

function mergeColumns(a, b) {
  const seen = new Set((a || []).map((c) => c.name));
  return [...(a || []), ...(b || []).filter((c) => !seen.has(c.name))];
}

/** La barra de arriba: buscar, cuántas filas, columnas y actualizar; y el filtro del chat si lo hay. */
function bar(s, sheet) {
  const filter = s.filter
    ? `<div class="sheet-filter">${esc(t('hoja.filterFrom'))} <q>${esc(s.filter.label || '')}</q>${s.filter.truncated ? ` · ${esc(t('hoja.filterTruncated'))}` : ''} <button class="btn sm ghost" data-act="hoja:clear">${esc(t('hoja.clearFilter'))}</button></div>`
    : '';
  return `<div class="sheet-bar">
      <form class="sheet-search" data-send="hoja:search" role="search"><input type="search" name="q" value="${esc(s.q)}" placeholder="${esc(t('hoja.search'))}" aria-label="${esc(t('hoja.search'))}" maxlength="120"><button class="btn sm" type="submit">${esc(t('hoja.searchGo'))}</button></form>
      <div class="sheet-tools">
        <button class="btn sm" data-act="hoja:columns">${esc(t('hoja.columns'))}</button>
        <button class="btn sm ghost" data-act="hoja:refresh" title="${esc(t('hoja.refresh'))}">↻ ${esc(t('hoja.refresh'))}</button>
      </div>
    </div>${filter}`;
}

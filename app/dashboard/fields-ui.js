/* Interfaz de "Qué puede consultar Comando".
   Muestra SOLO metadatos de campos: etiqueta, nombre interno, tipo, cuántas veces
   lo pediste y qué porcentaje de tus registros lo tiene lleno. Nunca valores reales:
   ni nombres, ni teléfonos, ni correos, ni ejemplos de contenido. */

const OBJECT_LABELS = { contact: 'Contactos', opportunity: 'Negocios', deal: 'Negocios', company: 'Empresas' };
const OBJECT_ORDER = ['contact', 'opportunity', 'deal', 'company'];

const TYPE_LABELS = {
  string: 'texto', text: 'texto', textarea: 'texto largo', richtext: 'texto largo', html: 'texto largo',
  enumeration: 'lista desplegable', enum: 'lista desplegable', select: 'lista desplegable',
  picklist: 'lista desplegable', radio: 'lista desplegable', multiselect: 'lista de opciones',
  checkbox: 'lista de opciones', multienum: 'lista de opciones',
  number: 'número', numeric: 'número', int: 'número', integer: 'número', float: 'número',
  double: 'número', currency: 'número', percent: 'número',
  date: 'fecha', datetime: 'fecha y hora', timestamp: 'fecha y hora',
  bool: 'sí / no', boolean: 'sí / no', booleancheckbox: 'sí / no',
  phone: 'teléfono', phone_number: 'teléfono', tel: 'teléfono',
  email: 'correo', url: 'enlace', file: 'archivo', json: 'datos',
};

const MAX_SUGGESTED = 8;
const PAGE = 40;

/* ---------- helpers de lectura tolerante (la API puede omitir campos) ---------- */
const labelOf = (f) => (f.label && String(f.label).trim()) || f.propertyName || 'Campo sin nombre';
const mentionsOf = (f) => {
  const n = f.usage && Number(f.usage.mentions);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
/** Devuelve 0..1 o null si la API no lo mandó. Acepta 0..1 y 0..100. */
const fillOf = (f) => {
  const n = Number(f.fillRate);
  if (!Number.isFinite(n) || n < 0) return null;
  return n > 1 ? Math.min(n / 100, 1) : n;
};
const optionsOf = (f) => {
  const n = Number(f.optionCount);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const typeLabel = (f) => TYPE_LABELS[String(f.fieldType || '').toLowerCase()] || (f.fieldType ? String(f.fieldType) : 'otro');
const isActive = (f) => Boolean(f.core || f.queryable);
const pct = (v) => Math.round(v * 100);

const strip = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function relative(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return 'hace ' + days + ' días';
  const months = Math.round(days / 30);
  return months <= 1 ? 'hace un mes' : 'hace ' + months + ' meses';
}

/** Una línea que explica por qué sugerimos el campo. */
export function reasonFor(f) {
  const m = mentionsOf(f);
  if (m > 0) {
    const when = relative(f.usage && f.usage.lastMentionedAt);
    return 'lo pediste ' + m + (m === 1 ? ' vez' : ' veces') + (when ? ', la última ' + when : '');
  }
  const fill = fillOf(f);
  if (fill !== null && fill >= 0.5) return 'está lleno en el ' + pct(fill) + '% de tus registros';
  const opts = optionsOf(f);
  if (opts) return 'lista con ' + opts + ' opciones en tu CRM';
  if (fill !== null) return 'está lleno en el ' + pct(fill) + '% de tus registros';
  return 'campo estándar de tu CRM';
}

/** Sugeridos: lo que aún no está activo, por menciones y luego por qué tan lleno está. */
export function rankSuggested(fields) {
  return fields
    .filter((f) => !isActive(f))
    .sort((a, b) => (mentionsOf(b) - mentionsOf(a))
      || ((fillOf(b) || 0) - (fillOf(a) || 0))
      || labelOf(a).localeCompare(labelOf(b), 'es'))
    .slice(0, MAX_SUGGESTED);
}

export function sortActive(fields) {
  return fields
    .filter(isActive)
    .sort((a, b) => (Number(Boolean(b.core)) - Number(Boolean(a.core)))
      || (mentionsOf(b) - mentionsOf(a))
      || labelOf(a).localeCompare(labelOf(b), 'es'));
}

const byLabel = (a, b) => labelOf(a).localeCompare(labelOf(b), 'es');

export function filterFields(fields, query) {
  const q = strip(query).trim();
  if (!q) return fields.slice().sort(byLabel);
  const terms = q.split(/\s+/);
  return fields
    .filter((f) => {
      const hay = strip(labelOf(f)) + ' ' + strip(f.propertyName);
      return terms.every((t) => hay.includes(t));
    })
    .sort(byLabel);
}

/* ---------------------------- montaje ---------------------------- */

export function mountFields(opts) {
  const { objects, api, tabsEl, panelsEl, liveEl } = opts;
  const rows = new Map(); // "objectType|propertyName" -> [elementos]
  const saving = new Set(); // campos con un PATCH en vuelo
  const view = new Map(); // objectType -> { query, limit }
  let current = null;

  const key = (objectType, propertyName) => objectType + '|' + propertyName;
  const say = (msg) => { if (liveEl) liveEl.textContent = msg; };

  const ordered = objects.slice().sort(
    (a, b) => OBJECT_ORDER.indexOf(a.objectType) - OBJECT_ORDER.indexOf(b.objectType),
  );

  /* ---- pestañas ---- */
  const tabs = ordered.map((obj) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'db-tab';
    btn.id = 'tab-' + obj.objectType;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'panel-' + obj.objectType);
    const name = document.createElement('span');
    name.className = 'db-tab-name';
    name.textContent = obj.label || OBJECT_LABELS[obj.objectType] || obj.objectType;
    const count = document.createElement('span');
    count.className = 'db-tab-count';
    btn.append(name, count);
    btn.addEventListener('click', () => select(obj.objectType));
    tabsEl.appendChild(btn);
    return { obj, btn, count };
  });

  tabsEl.addEventListener('keydown', (ev) => {
    const i = tabs.findIndex((t) => t.btn === document.activeElement);
    if (i < 0) return;
    let next = null;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = (i + 1) % tabs.length;
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = (i - 1 + tabs.length) % tabs.length;
    else if (ev.key === 'Home') next = 0;
    else if (ev.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    ev.preventDefault();
    select(tabs[next].obj.objectType);
    tabs[next].btn.focus();
  });

  function refreshCounts() {
    tabs.forEach(({ obj, count }) => {
      const total = obj.fields.length;
      const on = obj.fields.filter(isActive).length;
      count.textContent = on + ' activos de ' + total;
    });
  }

  function select(objectType) {
    current = objectType;
    tabs.forEach(({ obj, btn }) => {
      const on = obj.objectType === objectType;
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    });
    renderPanel(objectType);
  }

  /* ---- una fila ---- */
  function makeRow(obj, field, opts2) {
    const showReason = Boolean(opts2 && opts2.reason);
    const row = document.createElement('div');
    row.className = 'fld';

    const info = document.createElement('div');
    info.className = 'fld-info';

    const title = document.createElement('div');
    title.className = 'fld-title';
    const strong = document.createElement('strong');
    strong.textContent = labelOf(field);
    title.appendChild(strong);
    if (field.core) {
      const tag = document.createElement('span');
      tag.className = 'fld-tag is-core';
      tag.textContent = 'siempre disponible';
      title.appendChild(tag);
    }
    if (field.sensitive) {
      const tag = document.createElement('span');
      tag.className = 'fld-tag is-sensitive';
      tag.textContent = 'sensible — se consulta en vivo, no se copia';
      title.appendChild(tag);
    }

    const meta = document.createElement('div');
    meta.className = 'fld-meta';
    const code = document.createElement('code');
    code.textContent = field.propertyName || '';
    meta.appendChild(code);
    const bits = [typeLabel(field)];
    const opts3 = optionsOf(field);
    if (opts3) bits.push(opts3 + ' opciones');
    bits.forEach((b) => {
      const s = document.createElement('span');
      s.textContent = b;
      meta.appendChild(s);
    });

    info.append(title, meta);

    if (showReason) {
      const why = document.createElement('p');
      why.className = 'fld-why';
      why.textContent = reasonFor(field);
      info.appendChild(why);
    }

    const note = document.createElement('p');
    note.className = 'fld-note';
    note.hidden = true;
    const err = document.createElement('p');
    err.className = 'fld-err';
    err.setAttribute('role', 'alert');
    err.hidden = true;
    info.append(note, err);

    const switches = document.createElement('div');
    switches.className = 'fld-switches';
    const q = makeSwitch('Consultar', 'queryable', field);
    const e = makeSwitch('Editar', 'editable', field);
    switches.append(q.wrap, e.wrap);

    row.append(info, switches);

    const rec = { row, note, err, q: q.input, e: e.input, field, obj };
    const k = key(obj.objectType, field.propertyName);
    if (!rows.has(k)) rows.set(k, []);
    rows.get(k).push(rec);

    q.input.addEventListener('change', () => onToggle(rec, 'queryable', q.input.checked));
    e.input.addEventListener('change', () => onToggle(rec, 'editable', e.input.checked));

    syncOne(rec);
    return row;
  }

  function makeSwitch(text, name, field) {
    const wrap = document.createElement('label');
    wrap.className = 'sw';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'sw-input';
    input.dataset.toggle = name;
    input.setAttribute('aria-label', text + ' ' + labelOf(field));
    const track = document.createElement('span');
    track.className = 'sw-track';
    track.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'sw-text';
    label.textContent = text;
    wrap.append(input, track, label);
    return { wrap, input };
  }

  /** Refleja el estado del campo en una fila concreta. */
  function syncOne(rec) {
    const f = rec.field;
    const active = isActive(f);
    rec.q.checked = active;
    rec.q.disabled = Boolean(f.core);
    rec.e.checked = Boolean(f.editable);
    rec.e.disabled = !active;
    rec.row.classList.toggle('is-active', active);
    rec.row.classList.toggle('is-locked', Boolean(f.core));
    rec.q.closest('.sw').classList.toggle('is-locked', Boolean(f.core));
    rec.e.closest('.sw').classList.toggle('is-off', !active);
  }

  function syncField(objectType, propertyName) {
    (rows.get(key(objectType, propertyName)) || []).forEach(syncOne);
    refreshCounts();
  }

  // Solo estado visual: los interruptores siguen enfocables para no perder el foco del teclado.
  function setSaving(objectType, propertyName, on) {
    (rows.get(key(objectType, propertyName)) || []).forEach((rec) => {
      rec.row.classList.toggle('is-saving', on);
      rec.row.setAttribute('aria-busy', on ? 'true' : 'false');
    });
  }

  function setNote(objectType, propertyName, text) {
    (rows.get(key(objectType, propertyName)) || []).forEach((rec) => {
      rec.note.textContent = text || '';
      rec.note.hidden = !text;
    });
  }

  function setError(objectType, propertyName, text) {
    (rows.get(key(objectType, propertyName)) || []).forEach((rec) => {
      rec.err.textContent = text || '';
      rec.err.hidden = !text;
    });
  }

  /* ---- guardado optimista ---- */
  async function onToggle(rec, what, value) {
    const f = rec.field;
    const objectType = rec.obj.objectType;
    const prop = f.propertyName;
    const k = key(objectType, prop);
    if (f.core && what === 'queryable') { syncOne(rec); return; }
    if (saving.has(k)) { syncOne(rec); return; } // ya hay un cambio en vuelo
    saving.add(k);

    const before = { queryable: f.queryable, editable: f.editable, mirrored: f.mirrored };
    const patch = {};
    if (what === 'queryable') {
      patch.queryable = value;
      // El espejo sigue a "Consultar", salvo en campos sensibles: esos se leen en vivo.
      patch.mirrored = value && !f.sensitive;
      if (!value) patch.editable = false;
    } else {
      patch.editable = value;
    }

    Object.assign(f, patch);
    setError(objectType, prop, '');
    setNote(objectType, prop, '');
    setSaving(objectType, prop, true);

    try {
      const saved = await api.patchField(objectType, prop, patch);
      if (saved && typeof saved === 'object' && saved.propertyName) Object.assign(f, saved);
      saving.delete(k);
      setSaving(objectType, prop, false);
      syncField(objectType, prop);
      if (what === 'queryable' && value) {
        setNote(objectType, prop, f.sensitive
          ? 'Comando lo consultará en vivo en tu CRM cuando lo necesite; no guardamos una copia.'
          : 'Comando ya puede consultarlo; los datos históricos se completan en unos minutos.');
        say(labelOf(f) + ': activado.');
        window.setTimeout(() => setNote(objectType, prop, ''), 15000);
      } else {
        say(labelOf(f) + ': ' + (value ? 'activado' : 'desactivado') + '.');
      }
    } catch (e) {
      Object.assign(f, before);
      saving.delete(k);
      setSaving(objectType, prop, false);
      syncField(objectType, prop);
      const msg = (e && e.message) || 'No se pudo guardar.';
      setError(objectType, prop, 'No se guardó: ' + msg + ' Inténtalo de nuevo.');
      say('No se pudo guardar ' + labelOf(f) + '.');
    }
  }

  /* ---- panel de un objeto ---- */
  function section(titleText, hintText) {
    const sec = document.createElement('section');
    sec.className = 'db-sec';
    const h = document.createElement('h2');
    h.textContent = titleText;
    sec.appendChild(h);
    if (hintText) {
      const p = document.createElement('p');
      p.className = 'db-sec-hint';
      p.textContent = hintText;
      sec.appendChild(p);
    }
    return sec;
  }

  function renderPanel(objectType) {
    const entry = tabs.find((t) => t.obj.objectType === objectType);
    if (!entry) return;
    const obj = entry.obj;
    if (!view.has(objectType)) view.set(objectType, { query: '', limit: PAGE, open: false });
    const st = view.get(objectType);

    // Las filas de este panel se reconstruyen: olvida las referencias viejas.
    obj.fields.forEach((f) => rows.delete(key(objectType, f.propertyName)));

    const panel = document.createElement('div');
    panel.className = 'db-panel';
    panel.id = 'panel-' + objectType;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tab-' + objectType);
    panel.tabIndex = 0;

    if (!obj.fields.length) {
      const empty = document.createElement('div');
      empty.className = 'ob-card db-empty';
      empty.textContent = 'Todavía no leímos campos de este tipo en tu CRM.';
      panel.appendChild(empty);
      panelsEl.replaceChildren(panel);
      return;
    }

    /* Activos */
    const active = sortActive(obj.fields);
    const secA = section('Activos', 'Lo que Comando puede consultar hoy. Los marcados como "siempre disponible" no se pueden apagar: sin ellos no podría identificar un registro.');
    const listA = document.createElement('div');
    listA.className = 'db-list';
    if (active.length) active.forEach((f) => listA.appendChild(makeRow(obj, f)));
    else listA.appendChild(emptyLine('Todavía no activaste ningún campo.'));
    secA.appendChild(listA);

    /* Sugeridos */
    const suggested = rankSuggested(obj.fields);
    const secS = section('Sugeridos', 'Los que más te harían falta, según lo que ya le pediste y qué tan llenos están.');
    const listS = document.createElement('div');
    listS.className = 'db-list';
    if (suggested.length) suggested.forEach((f) => listS.appendChild(makeRow(obj, f, { reason: true })));
    else listS.appendChild(emptyLine('Ya activaste todo lo que teníamos para sugerirte.'));
    secS.appendChild(listS);

    /* Todos los campos */
    const details = document.createElement('details');
    details.className = 'db-all';
    details.open = st.open;
    details.addEventListener('toggle', () => { st.open = details.open; });
    const summary = document.createElement('summary');
    summary.innerHTML = '<span>Todos los campos</span>';
    const badge = document.createElement('span');
    badge.className = 'db-all-count';
    badge.textContent = obj.fields.length;
    summary.appendChild(badge);
    details.appendChild(summary);

    const search = document.createElement('div');
    search.className = 'db-search';
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'db-search-input';
    input.placeholder = 'Buscar por nombre o nombre interno…';
    input.setAttribute('aria-label', 'Buscar campos');
    input.value = st.query;
    search.appendChild(input);
    details.appendChild(search);

    const listAll = document.createElement('div');
    listAll.className = 'db-list';
    details.appendChild(listAll);

    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'ob-btn ob-btn-secondary db-more';
    details.appendChild(more);

    function paintAll() {
      const found = filterFields(obj.fields, st.query);
      // olvida las filas del listado completo antes de repintarlo
      obj.fields.forEach((f) => {
        const k = key(objectType, f.propertyName);
        const list = rows.get(k);
        if (list) rows.set(k, list.filter((rec) => !listAll.contains(rec.row)));
      });
      listAll.replaceChildren();
      if (!found.length) {
        const none = document.createElement('div');
        none.className = 'db-none';
        const p = document.createElement('p');
        p.textContent = 'No encontramos ningún campo que coincida con “' + st.query + '”.';
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'ob-link';
        clear.textContent = 'Borrar la búsqueda';
        clear.addEventListener('click', () => { st.query = ''; input.value = ''; st.limit = PAGE; paintAll(); input.focus(); });
        none.append(p, clear);
        listAll.appendChild(none);
        more.hidden = true;
        return;
      }
      found.slice(0, st.limit).forEach((f) => listAll.appendChild(makeRow(obj, f)));
      const rest = found.length - st.limit;
      more.hidden = rest <= 0;
      more.textContent = rest > 0 ? 'Mostrar ' + Math.min(rest, PAGE) + ' más (quedan ' + rest + ')' : '';
    }

    let timer = 0;
    input.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { st.query = input.value; st.limit = PAGE; paintAll(); }, 120);
    });
    more.addEventListener('click', () => { st.limit += PAGE; paintAll(); more.focus(); });
    paintAll();

    panel.append(secA, secS, details);
    panelsEl.replaceChildren(panel);
  }

  function emptyLine(text) {
    const p = document.createElement('p');
    p.className = 'db-none';
    p.textContent = text;
    return p;
  }

  refreshCounts();
  select(ordered[0].objectType);
  return { select };
}

/* Puesta en marcha dentro del panel: vincular WhatsApp y conectar el CRM.
   Es el antiguo onboarding de /app/ (pasos 2 y 3) viviendo en el panel, para que el
   operador no aprenda dos pantallas distintas. El paso 1 (cuenta) es /app/ con Clerk.

   - `whatsappStep(root, ctx, onVerified)`: número → código VERIFICAR → sondeo hasta verificado.
   - `crmBlock(ctx, connections, sheets)`: rejilla de conectores con estado (HubSpot,
     Google Sheets, Salesforce listos; el resto «próximamente»), desconectar, recuperar, purgar.
   - `crmActions`: los manejadores de esos botones (OAuth por Nango en ventana emergente,
     confirmación por sondeo, selector de hojas de Google). */

import { esc, toast, preguntar, ICON, fmtDate } from './ui.js?v=12';
import { t, tn } from '../i18n.js?v=1';

const cfg = () => window.COMANDO_CONFIG || {};
/* Exportado porque no solo lo usa la rejilla: la tarjeta de Cuenta necesita
   decir «la sacamos de tu HubSpot», con el nombre del proveedor y no con la
   clave técnica. Los nombres de producto no se traducen. */
export const NAMES = { hubspot: 'HubSpot', salesforce: 'Salesforce', 'google-sheets': 'Google Sheets', pipedrive: 'Pipedrive', zoho: 'Zoho CRM', kommo: 'Kommo', shopify: 'Shopify', tiendanube: 'Tiendanube', woocommerce: 'WooCommerce', mercadolibre: 'Mercado Libre', vtex: 'VTEX' };
const READY = ['hubspot', 'google-sheets', 'salesforce'];
const SOON = ['pipedrive', 'zoho', 'kommo', 'shopify', 'tiendanube', 'woocommerce', 'mercadolibre', 'vtex'];
const logo = (p) => `<img src="../../assets/img/logos/${p === 'google-sheets' ? 'googlesheets' : esc(p)}.svg" alt="">`;
const rid = () => ({ 'x-request-id': crypto.randomUUID() });

/* ============================================================== WhatsApp */
export function whatsappStep(root, ctx, onVerified) {
  const me = ctx.me || {};
  root.innerHTML = `<div class="setup">
    <div class="card setup-card">
      <div class="setup-steps"><span class="is-done">${esc(t('setup.step1'))}</span><span class="is-on">${esc(t('setup.step2'))}</span><span>${esc(t('setup.step3'))}</span></div>
      <h2>${esc(t('setup.wa.title'))}</h2>
      <p class="hint">${esc(t('setup.wa.hint'))}</p>
      <form id="wa-form" class="form" style="margin-top:16px">
        <label for="wa-locale">${esc(t('setup.wa.locale'))}
          <select id="wa-locale" name="locale">
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
          </select>
        </label>
        <div id="wa-picker"></div>
        <div class="form-foot"><button type="submit" class="btn primary">${esc(t('common.continue'))}</button><span class="form-msg bad" id="wa-error"></span></div>
      </form>
      <div id="wa-verify" hidden>
        <p>${t('setup.wa.sendThis', { number: '<span id="wa-number"></span>' })}</p>
        <div class="setup-code" id="wa-code"></div>
        <a id="wa-link" class="btn primary" target="_blank" rel="noopener">${ICON.wa} ${esc(t('setup.wa.open'))}</a>
        <p class="hint" style="margin-top:12px">${esc(t('setup.wa.waiting'))} <span class="spinner"></span></p>
        <button type="button" id="wa-change" class="btn ghost sm">${esc(t('setup.wa.change'))}</button>
      </div>
    </div>
    <p class="hint" style="text-align:center">${esc(t('setup.wa.foot'))}</p>
  </div>`;
  const $ = (id) => root.querySelector('#' + id);
  const picker = window.ComandoPhonePicker ? window.ComandoPhonePicker.mount($('wa-picker')) : null;
  if (!picker) { $('wa-error').textContent = t('setup.wa.noPicker'); return; }
  if (me.whatsapp && me.whatsapp.pending && me.whatsapp.pending.phone) picker.set(me.whatsapp.pending.phone);
  // El idioma se guarda al elegirlo, no al enviar el formulario: si alguien
  // abandona en el paso del teléfono, Comando ya sabe en qué idioma
  // contestarle cuando vuelva.
  const locale = $('wa-locale');
  if (locale) {
    locale.value = me.locale || 'es';
    locale.addEventListener('change', () => {
      ctx.api
        .raw('/auth/language', { method: 'POST', body: JSON.stringify({ locale: locale.value }) })
        .then(() => { ctx.me = { ...(ctx.me || {}), locale: locale.value }; })
        .catch(() => { $('wa-error').textContent = t('setup.wa.localeFailed'); });
    });
  }
  let timer = null;
  const stop = () => { if (timer) clearInterval(timer); timer = null; };
  const poll = () => {
    stop();
    timer = setInterval(async () => {
      try {
        const s = await ctx.api.me();
        if (s.whatsapp && s.whatsapp.status === 'verified') { stop(); ctx.me = s; onVerified(s); }
      } catch (e) { /* transitorio */ }
    }, 4000);
  };
  $('wa-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = $('wa-error'); err.textContent = '';
    const btn = ev.target.querySelector('button'); btn.disabled = true;
    try {
      const parsed = picker.value();
      if (parsed.error) { err.textContent = parsed.error; return; }
      const r = await ctx.api.raw('/auth/whatsapp/start', { method: 'POST', body: JSON.stringify({ phone: parsed.e164 }) });
      $('wa-number').textContent = r.comandoNumber || '';
      $('wa-code').textContent = 'VERIFICAR ' + r.code;
      $('wa-link').href = r.waLink || '#';
      $('wa-form').hidden = true; $('wa-verify').hidden = false;
      poll();
    } catch (e) { err.textContent = e.message; }
    finally { btn.disabled = false; }
  });
  $('wa-change').addEventListener('click', () => { stop(); $('wa-verify').hidden = true; $('wa-form').hidden = false; });
  return stop;
}

/* =================================================================== CRM */
function pendingConnection() {
  try { const raw = localStorage.getItem('comando.pendingCrmConnection'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function setPending(v) { try { if (v) localStorage.setItem('comando.pendingCrmConnection', JSON.stringify(v)); else localStorage.removeItem('comando.pendingCrmConnection'); } catch (e) { /* sin storage */ } }

/** Rejilla de conectores + estado. `connections` viene de GET /integrations/connections. */
export function crmBlock(ctx, connections, sheets) {
  const conns = Array.isArray(connections) ? connections : [];
  const active = conns.find((c) => c.bound && c.status === 'active') || null;
  const recoverable = !active ? conns.find((c) => c.recoverable && NAMES[c.provider]) : null;
  const pending = pendingConnection();
  const cardFor = (p) => {
    const ready = READY.includes(p);
    const isActive = active && active.provider === p;
    const hasSheets = p === 'google-sheets' && Array.isArray(sheets) && sheets.length > 0;
    let small = t('crm.soon'); let cls = ''; let disabled = !ready; let act = '';
    if (ready) {
      if (isActive || hasSheets) { small = t('crm.connected'); cls = 'is-connected'; disabled = p !== 'google-sheets'; act = p === 'google-sheets' ? 'crm:sheets' : ''; }
      else if (active && p !== 'google-sheets') { small = t('crm.disconnectActive'); disabled = true; }
      else { small = recoverable && recoverable.provider === p ? t('crm.connectFromScratch') : t('crm.connect'); cls = 'is-ready'; act = p === 'google-sheets' ? 'crm:sheets' : 'crm:connect'; }
    }
    return `<button type="button" class="crm-card ${cls}" data-crm="${p}" ${act ? `data-act="${act}"` : ''} ${disabled ? 'disabled' : ''}>${logo(p)}<span>${esc(NAMES[p])}</span><small>${esc(small)}</small></button>`;
  };
  const status = pending ? t('crm.confirming', { name: esc(NAMES[pending.provider] || pending.provider) })
    : active ? t('crm.onlyThis', { name: esc(NAMES[active.provider] || active.name) })
      : recoverable ? t('crm.noneConnected') : '';
  const recovery = recoverable ? `<div class="note warn" style="margin-top:12px">${t('crm.unlinked', { name: esc(NAMES[recoverable.provider] || recoverable.name), date: esc(fmtDate(recoverable.purgeAfter, true)) })}
      <div class="inline-list" style="margin-top:10px"><button type="button" class="btn sm primary" data-act="crm:recover" data-id="${esc(recoverable.id)}" data-provider="${esc(recoverable.provider)}">${esc(t('crm.relink'))}</button><button type="button" class="btn sm danger" data-act="crm:purge" data-id="${esc(recoverable.id)}" data-provider="${esc(recoverable.provider)}">${esc(t('crm.purgeNow'))}</button></div></div>` : '';
  const sheetList = Array.isArray(sheets) && sheets.length ? `<ul class="sheet-list">${sheets.map((s) => `<li>${logo('google-sheets')}<b>${esc(s.displayName || s.spreadsheetId)}</b><span>${esc(s.sheetTitle)}</span></li>`).join('')}</ul>` : '';
  const foot = active ? `<div class="inline-list" style="margin-top:12px"><a class="btn sm" href="../dashboard/">${esc(t('crm.whatCanSee'))}</a><button type="button" class="btn sm danger" data-act="crm:disconnect" data-id="${esc(active.id)}" data-provider="${esc(active.provider)}">${esc(t('crm.disconnect', { name: NAMES[active.provider] || '' }))}</button></div>` : '';
  /* Los que todavía no se pueden conectar van plegados: once fichas con nueve
     apagadas eran pantalla y media en móvil y prometían un catálogo que el
     panel decidió no enseñar (auditoría del 12-sep-2026). */
  const proximos = SOON.length ? `<details class="crm-more"><summary>${esc(tn('crm.moreSoon', SOON.length))}</summary><div class="crm-grid" role="list">${SOON.map(cardFor).join('')}</div></details>` : '';
  return `<div class="crm-grid" role="list">${READY.map(cardFor).join('')}</div>${proximos}${sheetList}<p class="hint crm-status" id="crm-status" style="margin-top:10px">${status}</p>${recovery}${foot}`;
}

const status = (msg) => { const el = document.getElementById('crm-status'); if (el) el.textContent = msg; };

function beginOauth(ctx, provider, session, recovering, reload) {
  if (ctx.api.mode === 'mock') { toast(t('crm.mockOauth', { name: NAMES[provider] || provider })); return; }
  if (!session.token || !session.connectionId) throw new Error(t('crm.noSession'));
  const url = String(cfg().nangoUrl || '').replace(/\/$/, '') + '/oauth/connect/' + encodeURIComponent(provider) + '?connect_session_token=' + encodeURIComponent(session.token);
  const popup = window.open(url, 'comando-oauth', 'width=720,height=800');
  if (!popup) window.location.href = url;
  status(t('crm.authorizeIn', { name: NAMES[provider] || provider }));
  setPending({ connectionId: session.connectionId, provider, recovering });
  pollReconcile(ctx, session.connectionId, provider, recovering, popup, reload);
}

/** El OAuth vuelve a Nango, no a esta página: se confirma por sondeo (también tras recargar). */
export function pollReconcile(ctx, connectionId, provider, recovering, popup, reload) {
  const started = Date.now();
  const poll = async () => {
    if (Date.now() - started > 6 * 60 * 1000) { status(t('crm.authTimeout')); setPending(null); reload(); return; }
    try {
      const res = await ctx.api.raw('/integrations/nango/connections/' + connectionId + '/reconcile', { method: 'POST', headers: rid(), body: JSON.stringify({ integrationId: provider }) });
      if (res.status === 'connected') {
        if (popup && !popup.closed) popup.close();
        setPending(null);
        toast(t(recovering ? 'crm.recovered' : 'crm.connectedToast', { name: NAMES[provider] || provider }), 'ok');
        reload(); return;
      }
    } catch (e) { /* transitorio */ }
    setTimeout(poll, 3000);
  };
  setTimeout(poll, 1000);
}

/* ---------- Google Sheets: Nango para el refresh token, Picker para elegir hojas ---------- */
function waitForGoogle(isReady, what, timeoutMs) {
  if (isReady()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + (timeoutMs || 10000);
    const timer = setInterval(() => {
      if (isReady()) { clearInterval(timer); resolve(); return; }
      if (Date.now() >= deadline) { clearInterval(timer); reject(new Error(t('crm.googleLoadFailed', { what }))); }
    }, 100);
  });
}
async function googleAccessToken() {
  await waitForGoogle(() => Boolean(window.google && window.google.accounts && window.google.accounts.oauth2), 'Google');
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: cfg().googleClientId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (r) => (r && r.access_token ? resolve(r.access_token) : reject(new Error(t('crm.googleNoGrant')))),
      error_callback: () => reject(new Error(t('crm.googleCancelled'))),
    });
    client.requestAccessToken({ prompt: '' });
  });
}
async function loadPicker() {
  if (window.google && window.google.picker) return;
  await waitForGoogle(() => Boolean(window.gapi), t('crm.googlePicker'));
  await new Promise((resolve, reject) => window.gapi.load('picker', { callback: resolve, onerror: () => reject(new Error(t('crm.googleLoadFailed', { what: t('crm.googlePicker') }))) }));
}
function pickSpreadsheets(accessToken) {
  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS).setIncludeFolders(true).setSelectFolderEnabled(false);
    new window.google.picker.PickerBuilder().setAppId(cfg().googleProjectNumber).setOAuthToken(accessToken).setDeveloperKey(cfg().googlePickerApiKey).addView(view)
      .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data) => { if (data.action === window.google.picker.Action.PICKED) resolve(data.docs || []); else if (data.action === window.google.picker.Action.CANCEL) resolve([]); })
      .build().setVisible(true);
  });
}
async function sheetTabs(accessToken, spreadsheetId) {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId) + '?fields=sheets.properties.title', { headers: { authorization: 'Bearer ' + accessToken } });
  if (!res.ok) return [];
  const body = await res.json();
  return (body.sheets || []).map((s) => s.properties && s.properties.title).filter(Boolean);
}
function waitForConnection(ctx, connectionId, popup) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() - started > 6 * 60 * 1000) { reject(new Error(t('crm.authTimeout'))); return; }
      try {
        const res = await ctx.api.raw('/integrations/nango/connections/' + connectionId + '/reconcile', { method: 'POST', headers: rid(), body: JSON.stringify({ integrationId: 'google-sheets' }) });
        if (res.status === 'connected') { if (popup && !popup.closed) popup.close(); resolve(); return; }
      } catch (e) { /* transitorio */ }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 1000);
  });
}

export const crmActions = {
  'crm:connect': async (el, ctx, d, reload) => {
    const provider = el.dataset.crm; el.disabled = true;
    try {
      const r = await ctx.api.raw('/integrations/nango/connect-sessions', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID(), ...rid() }, body: JSON.stringify({ integrationId: provider }) });
      beginOauth(ctx, provider, r, false, reload);
    } catch (e) { status(e.message); el.disabled = false; }
  },
  'crm:recover': async (el, ctx, d, reload) => {
    el.disabled = true;
    try {
      const session = await ctx.api.raw('/integrations/connections/' + el.dataset.id + '/recovery-session', { method: 'POST', headers: rid(), body: '{}' });
      beginOauth(ctx, el.dataset.provider, session, true, reload);
    } catch (e) { status(e.message); el.disabled = false; }
  },
  'crm:disconnect': async (el, ctx, d, reload) => {
    const name = NAMES[el.dataset.provider] || t('crm.theCrm');
    if (!(await preguntar({ titulo: t('crm.confirmDisconnectTitle', { name }), texto: t('crm.confirmDisconnect'), si: t('crm.disconnectYes'), peligro: true }))) return;
    el.disabled = true;
    try {
      const result = await ctx.api.raw('/integrations/connections/' + el.dataset.id, { method: 'DELETE', headers: rid(), body: JSON.stringify({ purgeMode: 'after-grace', reason: 'onboarding_crm_switch' }) });
      toast(t('crm.disconnectedToast', { name, date: fmtDate(result.purgeAfter, true) }), 'ok'); reload();
    } catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  },
  'crm:purge': async (el, ctx, d, reload) => {
    const name = NAMES[el.dataset.provider] || t('crm.theCrm');
    if (!(await preguntar({ titulo: t('crm.confirmPurgeTitle', { name }), texto: t('crm.confirmPurge'), si: t('crm.purgeYes'), peligro: true }))) return;
    el.disabled = true;
    try {
      const result = await ctx.api.raw('/integrations/connections/' + el.dataset.id, { method: 'DELETE', headers: rid(), body: JSON.stringify({ purgeMode: 'immediate', reason: 'operator_delete_now' }) });
      toast(result.purged ? t('crm.purged', { name }) : t('crm.purgeBlocked'), result.purged ? 'ok' : 'bad'); reload();
    } catch (e) { toast(e.message, 'bad'); el.disabled = false; }
  },
  'crm:sheets': async (el, ctx, d, reload) => {
    el.disabled = true;
    try {
      let connectionId = null;
      try { connectionId = localStorage.getItem('comando.sheetsConnection'); } catch (e) { /* sin storage */ }
      if (!connectionId) {
        const r = await ctx.api.raw('/integrations/nango/connect-sessions', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID(), ...rid() }, body: JSON.stringify({ integrationId: 'google-sheets' }) });
        if (!r.token || !r.connectionId) throw new Error(t('crm.noSession'));
        const url = String(cfg().nangoUrl || '').replace(/\/$/, '') + '/oauth/connect/google-sheets?connect_session_token=' + encodeURIComponent(r.token);
        const popup = window.open(url, 'comando-oauth', 'width=720,height=800');
        if (!popup) window.location.href = url;
        status(t('crm.authorizeIn', { name: 'Google' }));
        await waitForConnection(ctx, r.connectionId, popup);
        connectionId = r.connectionId;
        try { localStorage.setItem('comando.sheetsConnection', connectionId); } catch (e) { /* sin storage */ }
      }
      status(t('crm.pickSheets'));
      const token = await googleAccessToken();
      await loadPicker();
      const docs = await pickSpreadsheets(token);
      if (!docs.length) { status(t('crm.noSheetPicked')); el.disabled = false; return; }
      const sheets = [];
      for (const doc of docs) { const tabs = await sheetTabs(token, doc.id); sheets.push({ spreadsheetId: doc.id, sheetTitle: tabs[0] || 'Hoja 1', displayName: doc.name || undefined }); }
      await ctx.api.raw('/integrations/google-sheets/sources', { method: 'POST', headers: rid(), body: JSON.stringify({ connectionId, sheets }) });
      toast(docs.length === 1 ? t('crm.sheetConnected') : t('crm.sheetsConnected', { n: docs.length }), 'ok');
      reload();
    } catch (e) { status(e.message); el.disabled = false; }
  },
};

/** Si el OAuth quedó a medias (otra pestaña, recarga), retoma la confirmación. */
export function resumePendingConnection(ctx, reload) {
  const p = pendingConnection();
  if (p && p.connectionId && p.provider) pollReconcile(ctx, p.connectionId, p.provider, p.recovering === true, null, reload);
}

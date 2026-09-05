/* Onboarding de Comando: Clerk (cuenta) → WhatsApp (verificación por código) → CRM (opcional).
   Sin build: ClerkJS se carga desde el Frontend API de la instancia. */
(function () {
  const cfg = window.COMANDO_CONFIG;
  const $ = (id) => document.getElementById(id);
  const steps = { cuenta: $('step-cuenta'), whatsapp: $('step-whatsapp'), crm: $('step-crm') };
  let clerk, pollTimer, picker;
  let activeCrmConnection = null;
  let recoverableCrmConnection = null;
  const crmNames = { hubspot: 'HubSpot', salesforce: 'Salesforce' };

  function show(step) {
    Object.entries(steps).forEach(([k, el]) => { el.hidden = k !== step; });
    const order = ['cuenta', 'whatsapp', 'crm'];
    document.querySelectorAll('.ob-steps li').forEach((li) => {
      const i = order.indexOf(li.dataset.step), j = order.indexOf(step);
      li.classList.toggle('active', i === j); li.classList.toggle('done', i < j);
    });
  }
  function fatal(msg) { const el = $('fatal'); el.textContent = msg; el.hidden = false; }
  // Con el CRM conectado ya tiene sentido elegir qué campos puede consultar Comando.
  function showFieldsLink() { const el = $('fields-next'); if (el) el.hidden = false; }

  async function token(skipCache) {
    // El template "comando" añade tenant_id (public_metadata) y el audience del engine.
    return clerk.session.getToken({ template: cfg.clerkJwtTemplate, skipCache: skipCache === true });
  }
  async function api(path, options) {
    const request = async (skipCache) => {
      const t = await token(skipCache);
      if (!t) throw new Error('Sesión no disponible');
      return fetch(cfg.engineUrl + path, {
        ...options,
        headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json', ...(options && options.headers) },
      });
    };
    // Los JWT de plantilla de Clerk duran un minuto. Si uno vence entre
    // getToken() y la validación del engine, fuerza uno nuevo y repite una vez.
    // Se conservan los headers originales (incluido x-request-id), por lo que
    // las mutaciones siguen siendo idempotentes en el backend.
    let res = await request(false);
    if (res.status === 401) res = await request(true);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.message || ('Error ' + res.status)), { status: res.status, body });
    return body;
  }

  async function refreshStatus() {
    // Tras el registro, el webhook de Clerk tarda unos segundos en crear el tenant y
    // publicar tenant_id; hasta entonces el token no lleva la claim y /auth/me da 401.
    let status;
    for (let i = 0; i < 20; i += 1) {
      try { status = await api('/auth/me'); break; }
      catch (e) { if (e.status !== 401) throw e; await new Promise((r) => setTimeout(r, 1500)); }
    }
    if (!status) throw new Error('No pudimos preparar tu cuenta. Recarga la página en unos segundos.');
    return status;
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      try {
        const s = await api('/auth/me');
        if (s.whatsapp && s.whatsapp.status === 'verified') { clearInterval(pollTimer); route(s); }
      } catch (e) { /* transitorio */ }
    }, 4000);
  }

  function route(status) {
    if (!status || status.status !== 'ok') return show('cuenta');
    const wa = status.whatsapp || {};
    if (wa.status === 'verified') {
      show('crm');
      const comandoDigits = String(status.comandoNumber || window.COMANDO_NUMBER || '').replace(/\D/g, '');
      const whatsappLink = status.waLink || (comandoDigits ? 'https://wa.me/' + comandoDigits : '');
      $('open-whatsapp').href = whatsappLink;
      $('open-whatsapp').hidden = !whatsappLink;
      refreshConnections(status.crmConnected).catch(() => undefined);
      let pending = null;
      try {
        const current = localStorage.getItem('comando.pendingCrmConnection');
        if (current) pending = JSON.parse(current);
        else {
          const legacy = localStorage.getItem('comando.pendingHubspotConnection');
          if (legacy) pending = { connectionId: legacy, provider: 'hubspot' };
        }
      } catch (e) { /* sin storage */ }
      if (pending && pending.connectionId && pending.provider) {
        $('crm-status').textContent = 'Confirmando la conexión con ' + (crmNames[pending.provider] || pending.provider) + '…';
        pollReconcile(pending.connectionId, null, null, pending.provider, pending.recovering === true);
      }
      return;
    }
    show('whatsapp');
    if (wa.pending && picker) { picker.set(wa.pending.phone); }
  }

  async function onPhoneSubmit(ev) {
    ev.preventDefault();
    const err = $('phone-error'); err.hidden = true;
    const btn = ev.target.querySelector('button'); btn.disabled = true;
    try {
      const parsed = picker.value();
      if (parsed.error) { err.textContent = parsed.error; err.hidden = false; btn.disabled = false; return; }
      const r = await api('/auth/whatsapp/start', { method: 'POST', body: JSON.stringify({ phone: parsed.e164 }) });
      window.COMANDO_NUMBER = (r.comandoNumber || '').replace(/\D/g, '');
      $('comando-number').textContent = r.comandoNumber;
      $('verify-message').textContent = 'VERIFICAR ' + r.code;
      $('wa-link').href = r.waLink;
      $('phone-form').hidden = true; $('phone-verify').hidden = false;
      startPolling();
    } catch (e) {
      err.textContent = e.message; err.hidden = false;
    } finally { btn.disabled = false; }
  }

  function resetCrmCards() {
    Object.keys(crmNames).forEach((provider) => {
      const card = document.querySelector('.crm-card[data-crm="' + provider + '"]');
      if (!card) return;
      card.classList.remove('is-connected'); card.disabled = false;
      card.querySelector('small').textContent = 'Conectar';
    });
  }

  function hideRecovery() {
    recoverableCrmConnection = null;
    $('crm-recovery').hidden = true;
  }

  function showRecovery(connection) {
    recoverableCrmConnection = connection;
    const name = crmNames[connection.provider] || connection.name;
    const card = document.querySelector('.crm-card[data-crm="' + connection.provider + '"]');
    if (card) card.querySelector('small').textContent = 'Conectar desde cero';
    const deadline = new Date(connection.purgeAfter).toLocaleString();
    $('crm-recovery-name').textContent = name;
    $('crm-recovery-copy').textContent =
      'Comando no puede consultar este CRM. Conservaremos su copia sincronizada hasta ' +
      deadline + '. Si vuelves a autorizarlo antes, recuperaremos la configuración y los datos existentes.';
    $('recover-crm').textContent = 'Volver a vincular ' + name + ' y recuperar';
    $('crm-recovery').hidden = false;
  }

  async function refreshConnections(fallbackConnected) {
    resetCrmCards(); activeCrmConnection = null; hideRecovery(); $('disconnect-crm').hidden = true;
    $('fields-next').hidden = true;
    try {
      const result = await api('/integrations/connections');
      activeCrmConnection = (result.connections || []).find((item) => item.bound && item.status === 'active') || null;
      if (activeCrmConnection) {
        const name = crmNames[activeCrmConnection.provider] || activeCrmConnection.name;
        $('crm-status').textContent = name + ' conectado. Comando solo consultará este CRM.';
        Object.keys(crmNames).forEach((provider) => {
          const candidate = document.querySelector('.crm-card[data-crm="' + provider + '"]');
          if (candidate) { candidate.disabled = true; candidate.querySelector('small').textContent = 'Desconecta el CRM activo'; }
        });
        const card = document.querySelector('.crm-card[data-crm="' + activeCrmConnection.provider + '"]');
        if (card) { card.classList.add('is-connected'); card.disabled = true; card.querySelector('small').textContent = 'Conectado'; }
        $('disconnect-crm').hidden = false; showFieldsLink();
      } else {
        const retained = (result.connections || []).find((item) => item.recoverable && crmNames[item.provider]);
        if (retained) {
          showRecovery(retained);
          $('crm-status').textContent = 'No hay un CRM conectado. Puedes recuperar el anterior o vincular uno nuevo.';
        } else if (!fallbackConnected) $('crm-status').textContent = '';
      }
    } catch (e) {
      if (fallbackConnected) $('crm-status').textContent = 'CRM conectado. Comando ya sincroniza tus contactos.';
    }
  }

  async function onConnectCrm(provider) {
    const btn = document.querySelector('.crm-card[data-crm="' + provider + '"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const status = $('crm-status');
    try {
      const r = await api('/integrations/nango/connect-sessions', {
        method: 'POST',
        headers: { 'idempotency-key': crypto.randomUUID(), 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ integrationId: provider }),
      });
      beginCrmOauth(provider, r, btn, false);
    } catch (e) { status.textContent = e.message; btn.disabled = false; }
  }

  function beginCrmOauth(provider, session, btn, recovering) {
    if (!session.token || !session.connectionId) throw new Error('No recibimos la sesión de conexión');
    const url = cfg.nangoUrl.replace(/\/$/, '') + '/oauth/connect/' + encodeURIComponent(provider) + '?connect_session_token=' + encodeURIComponent(session.token);
    const popup = window.open(url, 'comando-oauth', 'width=720,height=800');
    if (!popup) window.location.href = url;
    $('crm-status').textContent = 'Autoriza el acceso en la ventana de ' + crmNames[provider] + '… (esta página se actualiza sola)';
    try {
      localStorage.setItem('comando.pendingCrmConnection', JSON.stringify({
        connectionId: session.connectionId, provider, recovering,
      }));
    } catch (e) { /* sin storage */ }
    pollReconcile(session.connectionId, popup, btn, provider, recovering);
  }

  async function onRecoverCrm() {
    if (!recoverableCrmConnection) return;
    const retained = recoverableCrmConnection;
    const btn = $('recover-crm'); btn.disabled = true;
    try {
      const session = await api('/integrations/connections/' + retained.id + '/recovery-session', {
        method: 'POST', headers: { 'x-request-id': crypto.randomUUID() }, body: '{}',
      });
      beginCrmOauth(retained.provider, session, btn, true);
    } catch (e) {
      $('crm-status').textContent = e.message;
      btn.disabled = false;
    }
  }

  // Confirma la conexión con el backend. Se retoma en cualquier pestaña/recarga
  // porque el OAuth vuelve a Nango, no a esta página.
  function pollReconcile(connectionId, popup, btn, provider, recovering) {
    const status = $('crm-status');
    const started = Date.now();
    const done = () => { try { localStorage.removeItem('comando.pendingCrmConnection'); localStorage.removeItem('comando.pendingHubspotConnection'); } catch (e) { /* sin storage */ } };
    const poll = async () => {
      if (Date.now() - started > 6 * 60 * 1000) { status.textContent = 'No se completó la autorización. Vuelve a intentarlo.'; if (btn) btn.disabled = false; done(); return; }
      try {
        const res = await api('/integrations/nango/connections/' + connectionId + '/reconcile', {
          method: 'POST', headers: { 'x-request-id': crypto.randomUUID() }, body: JSON.stringify({ integrationId: provider }),
        });
        if (res.status === 'connected') {
          if (popup && !popup.closed) popup.close();
          status.textContent = recovering
            ? crmNames[provider] + ' recuperado. Comando reactivó la copia retenida y actualizará los cambios recientes.'
            : crmNames[provider] + ' conectado. Comando está importando tus datos; en unos minutos podrás preguntar por ellos desde WhatsApp.';
          const hb = btn || document.querySelector('.crm-card[data-crm="' + provider + '"]');
          if (hb) { hb.classList.add('is-connected'); hb.disabled = true; hb.querySelector('small').textContent = 'Conectado'; }
          showFieldsLink(); await refreshConnections(true);
          done(); return;
        }
      } catch (e) { /* transitorio */ }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 1000);
  }

  async function onDisconnectCrm() {
    if (!activeCrmConnection) return;
    const name = crmNames[activeCrmConnection.provider] || activeCrmConnection.name;
    if (!window.confirm('¿Desconectar ' + name + '? Comando dejará de consultarlo inmediatamente. La copia sincronizada se borrará automáticamente en 7 días.')) return;
    const btn = $('disconnect-crm'); btn.disabled = true;
    try {
      const result = await api('/integrations/connections/' + activeCrmConnection.id, {
        method: 'DELETE', headers: { 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ purgeMode: 'after-grace', reason: 'onboarding_crm_switch' }),
      });
      const when = new Date(result.purgeAfter).toLocaleString();
      $('crm-status').textContent = name + ' desconectado. Comando ya no lo consulta; la copia local se eliminará el ' + when + '.';
      await refreshConnections(false);
    } catch (e) { $('crm-status').textContent = e.message; }
    finally { btn.disabled = false; }
  }

  async function onPurgeCrm() {
    if (!recoverableCrmConnection) return;
    const retained = recoverableCrmConnection;
    const name = crmNames[retained.provider] || retained.name;
    if (!window.confirm('¿Eliminar ahora la copia de ' + name + '? Esta acción es irreversible y ya no podrás recuperarla.')) return;
    const btn = $('purge-crm'); btn.disabled = true;
    try {
      const result = await api('/integrations/connections/' + retained.id, {
        method: 'DELETE', headers: { 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ purgeMode: 'immediate', reason: 'operator_delete_now' }),
      });
      await refreshConnections(false);
      $('crm-status').textContent = result.purged
        ? 'La copia local de ' + name + ' fue eliminada definitivamente.'
        : 'La eliminación no se completó porque existe una retención legal activa.';
    } catch (e) { $('crm-status').textContent = e.message; }
    finally { btn.disabled = false; }
  }

  /* ---------- Google Sheets: Nango para el refresh token, Picker para elegir hojas ---------- */

  /**
   * Espera a que un SDK de Google esté disponible.
   *
   * Los dos <script> de Google se cargan con `async`, así que en una red lenta
   * —o si el operador hace clic apenas abre la página— todavía no existen
   * cuando el flujo los necesita. Antes eso salía como «No se pudo cargar
   * Google» sin que nada estuviera roto: bastaba reintentar. Ahora espera, y
   * solo se rinde si de verdad no llegan.
   */
  function waitForGoogle(isReady, what, timeoutMs) {
    if (isReady()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + (timeoutMs || 10000);
      const timer = setInterval(() => {
        if (isReady()) { clearInterval(timer); resolve(); return; }
        if (Date.now() >= deadline) {
          clearInterval(timer);
          reject(new Error('No se pudo cargar ' + what + '. Revisa tu conexión y vuelve a intentar.'));
        }
      }, 100);
    });
  }

  // El Picker necesita un token en el navegador. En vez de sacarlo de Nango y
  // exponerlo, lo pedimos con Google Identity Services usando el MISMO client id:
  // como el consentimiento de drive.file ya se dio en el paso anterior, Google lo
  // devuelve sin volver a preguntar.
  async function googleAccessToken() {
    await waitForGoogle(
      () => Boolean(window.google && window.google.accounts && window.google.accounts.oauth2),
      'Google',
    );
    return new Promise((resolve, reject) => {
      const gis = window.google.accounts.oauth2;
      const client = gis.initTokenClient({
        client_id: cfg.googleClientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (r) => (r && r.access_token ? resolve(r.access_token) : reject(new Error('Google no devolvió el permiso'))),
        error_callback: () => reject(new Error('Se canceló el permiso de Google')),
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  async function loadPicker() {
    if (window.google && window.google.picker) return;
    await waitForGoogle(() => Boolean(window.gapi), 'el selector de Google');
    await new Promise((resolve, reject) => {
      window.gapi.load('picker', {
        callback: resolve,
        onerror: () => reject(new Error('No se pudo cargar el selector de Google')),
      });
    });
  }

  // Devuelve los archivos elegidos. Cada seleccion es lo que concede el acceso
  // per-archivo de drive.file: sin esto Comando no ve nada del Drive del usuario.
  function pickSpreadsheets(accessToken) {
    return new Promise((resolve) => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);
      new window.google.picker.PickerBuilder()
        .setAppId(cfg.googleProjectNumber)
        .setOAuthToken(accessToken)
        .setDeveloperKey(cfg.googlePickerApiKey)
        .addView(view)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback((data) => {
          if (data.action === window.google.picker.Action.PICKED) resolve(data.docs || []);
          else if (data.action === window.google.picker.Action.CANCEL) resolve([]);
        })
        .build()
        .setVisible(true);
    });
  }

  // Lee los nombres de las pestañas para no adivinar cual sincronizar.
  async function sheetTabs(accessToken, spreadsheetId) {
    const res = await fetch(
      'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId) + '?fields=sheets.properties.title',
      { headers: { authorization: 'Bearer ' + accessToken } },
    );
    if (!res.ok) return [];
    const body = await res.json();
    return (body.sheets || []).map((s) => s.properties && s.properties.title).filter(Boolean);
  }

  async function registerSheets(connectionId, accessToken, docs) {
    const sheets = [];
    for (const doc of docs) {
      const tabs = await sheetTabs(accessToken, doc.id);
      // La primera pestaña es la que ve el usuario al abrir la hoja; puede cambiarla luego.
      sheets.push({ spreadsheetId: doc.id, sheetTitle: tabs[0] || 'Hoja 1', displayName: doc.name || undefined });
    }
    if (!sheets.length) return { sources: [] };
    return api('/integrations/google-sheets/sources', {
      method: 'POST', headers: { 'x-request-id': crypto.randomUUID() },
      body: JSON.stringify({ connectionId, sheets }),
    });
  }

  function renderSheets(sources) {
    const list = $('sheet-list'); if (!list) return;
    list.innerHTML = (sources || []).map((s) =>
      '<li><strong>' + escapeHtml(s.displayName || s.spreadsheetId) + '</strong><span>' + escapeHtml(s.sheetTitle) + '</span></li>').join('');
    list.hidden = !(sources || []).length;
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  async function onConnectSheets() {
    const btn = document.querySelector('.crm-card[data-crm="google-sheets"]');
    const status = $('crm-status');
    if (btn) btn.disabled = true;
    try {
      let connectionId = null;
      try { connectionId = localStorage.getItem('comando.sheetsConnection'); } catch (e) { /* sin storage */ }
      if (!connectionId) {
        const r = await api('/integrations/nango/connect-sessions', {
          method: 'POST',
          headers: { 'idempotency-key': crypto.randomUUID(), 'x-request-id': crypto.randomUUID() },
          body: JSON.stringify({ integrationId: 'google-sheets' }),
        });
        if (!r.token || !r.connectionId) throw new Error('No recibimos la sesión de conexión');
        const url = cfg.nangoUrl.replace(/\/$/, '') + '/oauth/connect/google-sheets?connect_session_token=' + encodeURIComponent(r.token);
        const popup = window.open(url, 'comando-oauth', 'width=720,height=800');
        if (!popup) window.location.href = url;
        status.textContent = 'Autoriza el acceso en la ventana de Google…';
        await waitForConnection(r.connectionId, popup);
        connectionId = r.connectionId;
        try { localStorage.setItem('comando.sheetsConnection', connectionId); } catch (e) { /* sin storage */ }
      }
      status.textContent = 'Elige las hojas que quieres conectar…';
      const token = await googleAccessToken();
      await loadPicker();
      const docs = await pickSpreadsheets(token);
      if (!docs.length) { status.textContent = 'No elegiste ninguna hoja. Puedes intentarlo de nuevo cuando quieras.'; if (btn) btn.disabled = false; return; }
      const result = await registerSheets(connectionId, token, docs);
      renderSheets(result.sources);
      status.textContent = docs.length === 1
        ? 'Hoja conectada. Comando la está leyendo; en unos minutos podrás preguntarle por ella desde WhatsApp.'
        : docs.length + ' hojas conectadas. Comando las está leyendo.';
      if (btn) { btn.classList.add('is-connected'); btn.querySelector('small').textContent = 'Conectado'; btn.disabled = false; }
      showFieldsLink();
    } catch (e) {
      status.textContent = e.message;
      if (btn) btn.disabled = false;
    }
  }

  // Igual que HubSpot: el OAuth vuelve a Nango, así que confirmamos por sondeo.
  function waitForConnection(connectionId, popup) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const poll = async () => {
        if (Date.now() - started > 6 * 60 * 1000) { reject(new Error('No se completó la autorización. Vuelve a intentarlo.')); return; }
        try {
          const res = await api('/integrations/nango/connections/' + connectionId + '/reconcile', {
            method: 'POST', headers: { 'x-request-id': crypto.randomUUID() },
            body: JSON.stringify({ integrationId: 'google-sheets' }),
          });
          if (res.status === 'connected') { if (popup && !popup.closed) popup.close(); resolve(); return; }
        } catch (e) { /* transitorio */ }
        setTimeout(poll, 3000);
      };
      setTimeout(poll, 1000);
    });
  }

  async function boot() {
    try {
      const s = document.createElement('script');
      s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
      s.async = true; s.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar Clerk')); document.head.appendChild(s); });
      clerk = window.Clerk;
      await clerk.load({
        localization: {
          locale: 'es-ES',
          socialButtonsBlockButton: 'Continuar con {{provider|titleize}}',
          dividerText: 'o',
          formButtonPrimary: 'Continuar',
          formFieldLabel__emailAddress: 'Correo electrónico',
          formFieldInputPlaceholder__emailAddress: 'tu@correo.com',
          formFieldLabel__firstName: 'Nombre',
          formFieldLabel__lastName: 'Apellido',
          formFieldInputPlaceholder__firstName: 'Nombre',
          formFieldInputPlaceholder__lastName: 'Apellido',
          formFieldHintText__optional: 'Opcional',
          formFieldLabel__emailAddress_username: 'Correo',
          backButton: 'Volver',
          signUp: {
            start: { title: 'Crea tu cuenta gratis', subtitle: '30 comandos de prueba, sin tarjeta. Tu CRM se conecta después, si quieres.', actionText: '¿Ya tienes cuenta?', actionLink: 'Inicia sesión' },
            emailCode: { title: 'Revisa tu correo', subtitle: 'Escribe el código que te enviamos', formTitle: 'Código de verificación', formSubtitle: 'Escribe el código enviado a tu correo', resendButton: '¿No llegó? Reenviar' },
            continue: { title: 'Completa tus datos', subtitle: 'Un último paso para crear tu cuenta' },
          },
          signIn: {
            start: { title: 'Inicia sesión', subtitle: 'Bienvenido de vuelta a Comando', actionText: '¿Aún no tienes cuenta?', actionLink: 'Crear cuenta' },
            emailCode: { title: 'Revisa tu correo', subtitle: 'Escribe el código que te enviamos', formTitle: 'Código de verificación', formSubtitle: 'Escribe el código enviado a tu correo', resendButton: '¿No llegó? Reenviar' },
          },
        },
      });
      picker = window.ComandoPhonePicker.mount($('phone-picker'));
      $('phone-form').addEventListener('submit', onPhoneSubmit);
      $('phone-change').addEventListener('click', () => { clearInterval(pollTimer); $('phone-verify').hidden = true; $('phone-form').hidden = false; });
      document.querySelectorAll('.crm-card.is-ready[data-crm="hubspot"], .crm-card.is-ready[data-crm="salesforce"]').forEach((b) => b.addEventListener('click', () => onConnectCrm(b.dataset.crm)));
      $('disconnect-crm').addEventListener('click', onDisconnectCrm);
      $('recover-crm').addEventListener('click', onRecoverCrm);
      $('purge-crm').addEventListener('click', onPurgeCrm);
      document.querySelectorAll('.crm-card.is-ready[data-crm="google-sheets"]').forEach((b) => b.addEventListener('click', onConnectSheets));
      if (!clerk.user) {
        show('cuenta');
        clerk.mountSignUp($('clerk-signup'), {
          appearance: {
            variables: { colorPrimary: '#2fd28f', colorBackground: '#101c1f', colorText: '#e6f0f1', colorInputBackground: '#0c1719', colorInputText: '#e6f0f1', borderRadius: '12px' },
            elements: {
              rootBox: { width: '100%' }, cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none' }, card: { width: '100%', maxWidth: '100%', padding: '20px 18px' },
              headerTitle: { fontSize: '22px', fontWeight: 700 }, headerSubtitle: { color: '#8fa5a9' },
              socialButtonsBlockButton: { backgroundColor: '#ffffff', color: '#0b1416', border: '1px solid #ffffff', fontWeight: 600, '&:hover': { backgroundColor: '#e9eef0' } },
              socialButtonsBlockButtonText: { color: '#0b1416', fontWeight: 600 },
              dividerLine: { backgroundColor: '#1e2f33' }, dividerText: { color: '#8fa5a9' },
              formFieldInput: { backgroundColor: '#0c1719', borderColor: '#1e2f33' },
              formButtonPrimary: { backgroundColor: '#2fd28f', color: '#06261a', fontWeight: 700, textTransform: 'none', fontSize: '15px', '&:hover': { backgroundColor: '#29bd80' } },
              footerActionLink: { color: '#2fd28f' },
            },
          },
          forceRedirectUrl: window.location.href,
        });
        clerk.addListener(({ user }) => { if (user) refreshStatus().then(route).catch((e) => fatal(e.message)); });
        return;
      }
      route(await refreshStatus());
    } catch (e) { fatal(e.message); }
  }
  boot();
})();

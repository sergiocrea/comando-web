/* Onboarding de Comando: Clerk (cuenta) → WhatsApp (verificación por código) → CRM (opcional).
   Sin build: ClerkJS se carga desde el Frontend API de la instancia. */
(function () {
  const cfg = window.COMANDO_CONFIG;
  const $ = (id) => document.getElementById(id);
  const steps = { cuenta: $('step-cuenta'), whatsapp: $('step-whatsapp'), crm: $('step-crm') };
  let clerk, pollTimer, picker;

  function show(step) {
    Object.entries(steps).forEach(([k, el]) => { el.hidden = k !== step; });
    const order = ['cuenta', 'whatsapp', 'crm'];
    document.querySelectorAll('.ob-steps li').forEach((li) => {
      const i = order.indexOf(li.dataset.step), j = order.indexOf(step);
      li.classList.toggle('active', i === j); li.classList.toggle('done', i < j);
    });
  }
  function fatal(msg) { const el = $('fatal'); el.textContent = msg; el.hidden = false; }

  async function token() {
    // El template "comando" añade tenant_id (public_metadata) y el audience del engine.
    return clerk.session.getToken({ template: cfg.clerkJwtTemplate });
  }
  async function api(path, options) {
    const t = await token();
    if (!t) throw new Error('Sesión no disponible');
    const res = await fetch(cfg.engineUrl + path, {
      ...options,
      headers: { authorization: 'Bearer ' + t, 'content-type': 'application/json', ...(options && options.headers) },
    });
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
      $('open-whatsapp').href = 'https://wa.me/' + (window.COMANDO_NUMBER || '');
      $('crm-status').textContent = status.crmConnected ? 'CRM conectado. Comando ya sincroniza tus contactos.' : '';
      if (status.crmConnected) { const hb = document.querySelector('.crm-card[data-crm="hubspot"]'); if (hb) { hb.classList.add('is-connected'); hb.disabled = true; hb.querySelector('small').textContent = 'Conectado'; } }
      else {
        let pending = null; try { pending = localStorage.getItem('comando.pendingHubspotConnection'); } catch (e) { /* sin storage */ }
        if (pending) { $('crm-status').textContent = 'Confirmando la conexión con HubSpot…'; pollReconcile(pending, null, null); }
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

  async function onConnectHubspot() {
    const btn = document.querySelector('.crm-card[data-crm="hubspot"]') || $('connect-hubspot'); btn.disabled = true;
    const status = $('crm-status');
    try {
      const r = await api('/integrations/nango/connect-sessions', {
        method: 'POST',
        headers: { 'idempotency-key': crypto.randomUUID(), 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ integrationId: 'hubspot' }),
      });
      if (!r.token || !r.connectionId) throw new Error('No recibimos la sesión de conexión');
      // OAuth directo (sin ventana de Nango): el proveedor pide autorización y vuelve a Nango.
      const url = cfg.nangoUrl.replace(/\/$/, '') + '/oauth/connect/hubspot?connect_session_token=' + encodeURIComponent(r.token);
      const popup = window.open(url, 'comando-oauth', 'width=720,height=800');
      if (!popup) window.location.href = url;
      status.textContent = 'Autoriza el acceso en la ventana de HubSpot… (esta página se actualiza sola)';
      try { localStorage.setItem('comando.pendingHubspotConnection', r.connectionId); } catch (e) { /* sin storage */ }
      pollReconcile(r.connectionId, popup, btn);
    } catch (e) { status.textContent = e.message; btn.disabled = false; }
  }

  // Confirma la conexión con el backend. Se retoma en cualquier pestaña/recarga
  // porque el OAuth vuelve a Nango, no a esta página.
  function pollReconcile(connectionId, popup, btn) {
    const status = $('crm-status');
    const started = Date.now();
    const done = () => { try { localStorage.removeItem('comando.pendingHubspotConnection'); } catch (e) { /* sin storage */ } };
    const poll = async () => {
      if (Date.now() - started > 6 * 60 * 1000) { status.textContent = 'No se completó la autorización. Vuelve a intentarlo.'; if (btn) btn.disabled = false; done(); return; }
      try {
        const res = await api('/integrations/nango/connections/' + connectionId + '/reconcile', {
          method: 'POST', headers: { 'x-request-id': crypto.randomUUID() }, body: JSON.stringify({ integrationId: 'hubspot' }),
        });
        if (res.status === 'connected') {
          if (popup && !popup.closed) popup.close();
          status.textContent = 'HubSpot conectado. Comando está importando tus contactos; en unos minutos podrás preguntar por ellos desde WhatsApp.';
          const hb = btn || document.querySelector('.crm-card[data-crm="hubspot"]');
          if (hb) { hb.classList.add('is-connected'); hb.disabled = true; hb.querySelector('small').textContent = 'Conectado'; }
          done(); return;
        }
      } catch (e) { /* transitorio */ }
      setTimeout(poll, 3000);
    };
    setTimeout(poll, 1000);
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
            start: { title: 'Crea tu cuenta gratis', subtitle: '50 comandos de prueba, sin tarjeta. Tu CRM se conecta después, si quieres.', actionText: '¿Ya tienes cuenta?', actionLink: 'Inicia sesión' },
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
      $('connect-hubspot').addEventListener('click', onConnectHubspot);
      document.querySelectorAll('.crm-card.is-ready[data-crm="hubspot"]').forEach((b) => b.addEventListener('click', onConnectHubspot));
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

/* Onboarding de Comando: Clerk (cuenta) → WhatsApp (verificación por código) → CRM (opcional).
   Sin build: ClerkJS se carga desde el Frontend API de la instancia. */
(function () {
  const cfg = window.COMANDO_CONFIG;
  const $ = (id) => document.getElementById(id);
  const steps = { cuenta: $('step-cuenta'), whatsapp: $('step-whatsapp'), crm: $('step-crm') };
  let clerk, pollTimer;

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
      return;
    }
    show('whatsapp');
    if (wa.pending) { $('phone').value = wa.pending.phone; }
  }

  async function onPhoneSubmit(ev) {
    ev.preventDefault();
    const err = $('phone-error'); err.hidden = true;
    const btn = ev.target.querySelector('button'); btn.disabled = true;
    try {
      const r = await api('/auth/whatsapp/start', { method: 'POST', body: JSON.stringify({ phone: $('phone').value.trim() }) });
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
    const btn = $('connect-hubspot'); btn.disabled = true;
    try {
      const r = await api('/integrations/nango/connect-sessions', {
        method: 'POST',
        headers: { 'idempotency-key': crypto.randomUUID(), 'x-request-id': crypto.randomUUID() },
        body: JSON.stringify({ integrationId: 'hubspot' }),
      });
      // Autenticación headless de Nango: redirige al OAuth de HubSpot con el token de sesión.
      const url = r.connectUrl || r.url || (r.data && r.data.connectUrl);
      if (!url) throw new Error('No recibimos la URL de conexión');
      window.location.href = url;
    } catch (e) { $('crm-status').textContent = e.message; btn.disabled = false; }
  }

  async function boot() {
    try {
      const s = document.createElement('script');
      s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
      s.async = true; s.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar Clerk')); document.head.appendChild(s); });
      clerk = window.Clerk; await clerk.load();
      $('phone-form').addEventListener('submit', onPhoneSubmit);
      $('phone-change').addEventListener('click', () => { clearInterval(pollTimer); $('phone-verify').hidden = true; $('phone-form').hidden = false; });
      $('connect-hubspot').addEventListener('click', onConnectHubspot);
      if (!clerk.user) {
        show('cuenta');
        clerk.mountSignUp($('clerk-signup'), { appearance: { baseTheme: undefined, variables: { colorPrimary: '#2fd28f', colorBackground: '#101c1f', colorText: '#e6f0f1', colorInputBackground: '#0c1719', colorInputText: '#e6f0f1' } }, forceRedirectUrl: window.location.href });
        clerk.addListener(({ user }) => { if (user) refreshStatus().then(route).catch((e) => fatal(e.message)); });
        return;
      }
      route(await refreshStatus());
    } catch (e) { fatal(e.message); }
  }
  boot();
})();

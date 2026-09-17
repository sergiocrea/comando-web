/* Acceso a Comando (/app): correo y contraseña contra el motor, y pasar al panel.
   Los pasos siguientes (vincular WhatsApp, conectar Meta Ads) viven dentro de /app/panel/.

   Desde el 17-sep no se usa Clerk: Sergio crea la cuenta y manda por correo el
   usuario y una contraseña temporal, así que esta pantalla solo entra (no
   registra). Contrato del motor:
     POST /v1/auth/login            { email, password } → cookie de sesión
     POST /v1/auth/password/forgot  { email } → siempre 202
   La contraseña nueva se pone en /app/nueva-contrasena/ con el token del correo.
   Sin build. */
import '/app/strings.js?v=26';
import { initLocale, mountLanguagePicker, onLocaleChange, t } from '/app/i18n.js?v=1';

initLocale();

/** El texto de la página, en el idioma resuelto. Se llama al cargar y al cambiarlo. */
function paint() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const [attr, key] = el.dataset.i18nAttr.split(':');
    el.setAttribute(attr, t(key));
  });
  const terms = document.getElementById('auth-terms');
  if (terms) {
    terms.innerHTML = t('auth.foot', {
      terms: `<a href="/terminos.html">${t('auth.terms')}</a>`,
      privacy: `<a href="/privacidad.html">${t('auth.privacy')}</a>`,
    });
  }
}

(function () {
  const cfg = window.COMANDO_CONFIG || {};
  const api = String(cfg.engineUrl || '').replace(/\/$/, '');
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const plan = params.get('plan');
  const interval = params.get('interval');
  const dest = new URL('/app/panel/', location.href);
  if (plan) dest.searchParams.set('plan', plan);
  if (plan && interval) dest.searchParams.set('interval', interval);

  const err = (msg) => { const el = $('auth-error'); el.textContent = msg || ''; el.hidden = !msg; };
  const ok = (msg) => { const el = $('auth-ok'); el.textContent = msg || ''; el.hidden = !msg; };

  /** Un POST de JSON al motor, con la cookie de sesión. */
  async function post(path, body) {
    const res = await fetch(api + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    return { status: res.status, data };
  }

  /** El mensaje que ve quien no pudo entrar. El motor no dice si el correo existe. */
  function loginError(status, data) {
    if (status === 429) return t('auth.tooMany');
    if (status === 401 || (data && data.error === 'credenciales')) return t('auth.badCreds');
    return t('auth.netFail');
  }

  function busy(button, on, labelKey) {
    button.disabled = on;
    button.textContent = t(on ? labelKey : button.dataset.i18n);
  }

  // Ver u ocultar la contraseña: quien la recibe por correo la copia a mano.
  $('login-eye').addEventListener('click', () => {
    const input = $('login-password');
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    const eye = $('login-eye');
    eye.dataset.i18n = shown ? 'auth.show' : 'auth.hide';
    eye.textContent = t(eye.dataset.i18n);
    input.focus();
  });

  $('login-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err(''); ok('');
    const email = $('login-email').value.trim();
    const password = $('login-password').value;
    if (!email || !password) { err(t('auth.missing')); return; }
    const button = $('login-submit');
    busy(button, true, 'auth.entering');
    try {
      const { status, data } = await post('/v1/auth/login', { email, password });
      if (status === 200 && data && data.ok) {
        // Con contraseña temporal, el panel pide cambiarla antes de seguir.
        if (data.user && data.user.mustChangePassword) dest.searchParams.set('cambiar', '1');
        location.replace(dest.href);
        return;
      }
      err(loginError(status, data));
    } catch (e) {
      err(t('auth.netFail'));
    }
    busy(button, false);
  });

  const show = (which) => {
    $('login-form').hidden = which !== 'login';
    $('forgot-form').hidden = which !== 'forgot';
    err(''); ok('');
    ($(which === 'login' ? 'login-email' : 'forgot-email')).focus();
  };
  $('forgot-open').addEventListener('click', () => {
    $('forgot-email').value = $('login-email').value.trim();
    show('forgot');
  });
  $('forgot-back').addEventListener('click', () => show('login'));

  $('forgot-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err(''); ok('');
    const email = $('forgot-email').value.trim();
    if (!email) { err(t('auth.missing')); return; }
    const button = $('forgot-submit');
    busy(button, true, 'auth.sending');
    try {
      const { status } = await post('/v1/auth/password/forgot', { email });
      // 202 siempre que el motor recibió la petición: no revela si el correo existe.
      if (status === 202 || status === 200) ok(t('auth.forgotSent'));
      else err(status === 429 ? t('auth.tooMany') : t('auth.netFail'));
    } catch (e) {
      err(t('auth.netFail'));
    }
    busy(button, false);
  });

  mountLanguagePicker(document.getElementById('lang-host'), { compact: true });
  paint();
  onLocaleChange(paint);
  $('login-email').focus();
})();

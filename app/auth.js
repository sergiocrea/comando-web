/* Acceso a Comando (/app/): iniciar sesión o crear cuenta con Clerk y pasar al panel.
   Los pasos siguientes (vincular WhatsApp, conectar el CRM) viven dentro de /app/panel/.
   Sin build: ClerkJS se carga desde el Frontend API de la instancia. */
import './strings.js?v=18';
import { initLocale, mountLanguagePicker, onLocaleChange, locale, t } from './i18n.js?v=1';

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
      terms: `<a href="../terminos.html">${t('auth.terms')}</a>`,
      privacy: `<a href="../privacidad.html">${t('auth.privacy')}</a>`,
    });
  }
}

/**
 * Cuántos comandos regala el plan gratis, según el catálogo publicado.
 *
 * El número estaba escrito en el diccionario, en tres idiomas. Coincidía con la
 * base, pero el día que se cambie el plan la pantalla de registro seguiría
 * prometiendo lo de antes, y una promesa comercial equivocada es la peor clase
 * de dato en duro. `GET /v1/public/plans` sirve la misma vista que manda en el
 * cobro, es pública y viene cacheada cinco minutos.
 *
 * Si no llega, NO se inventa un número: el subtítulo se queda sin cifra. Y no
 * se espera indefinidamente: esto va en paralelo con la carga de ClerkJS, así
 * que en la práctica no añade espera, pero si el motor no contesta la pantalla
 * de acceso no se queda colgada por un adorno.
 */
async function freeCommandLimit(engineUrl) {
  if (!engineUrl) return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 2500);
    const res = await fetch(String(engineUrl).replace(/\/$/, '') + '/v1/public/plans', { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const plans = (await res.json()).plans || [];
    const free = plans.find((x) => x.code === 'free' || x.code === 'gratis');
    return free && typeof free.commandLimit === 'number' ? free.commandLimit : null;
  } catch (e) { return null; }
}

(function () {
  const cfg = window.COMANDO_CONFIG;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const plan = params.get('plan');
  const interval = params.get('interval');
  const mode = params.get('mode') || (plan ? 'signup' : 'signin');
  const dest = new URL('panel/', location.href);
  if (plan) dest.searchParams.set('plan', plan);
  if (plan && interval) dest.searchParams.set('interval', interval);
  const planQ = plan ? '&plan=' + encodeURIComponent(plan) + (interval ? '&interval=' + encodeURIComponent(interval) : '') : '';

  function fatal(msg) { const el = $('auth-error'); el.textContent = msg; el.hidden = false; $('auth-loading').hidden = true; }

  async function boot() {
    try {
      const s = document.createElement('script');
      s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
      s.async = true; s.crossOrigin = 'anonymous';
      // Las dos peticiones van juntas: el catálogo no le suma espera a nadie.
      const [, freeCommands] = await Promise.all([
        new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error(t('auth.loadFailed'))); document.head.appendChild(s); }),
        freeCommandLimit(cfg.engineUrl),
      ]);
      const signUpSub = () => (freeCommands == null ? t('clerk.signUpSubNoLimit') : t('clerk.signUpSub', { n: freeCommands }));
      const clerk = window.Clerk;
      const emailCode = () => ({
        title: t('clerk.checkEmail'), subtitle: t('clerk.codeSent'),
        formTitle: t('clerk.codeTitle'), formSubtitle: t('clerk.codeSub'), resendButton: t('clerk.resend'),
      });
      await clerk.load({
        localization: {
          locale: { es: 'es-ES', en: 'en-US', pt: 'pt-BR' }[locale()] || 'es-ES',
          socialButtonsBlockButton: t('clerk.social'),
          dividerText: t('clerk.or'),
          formButtonPrimary: t('clerk.continue'),
          formFieldLabel__emailAddress: t('clerk.email'),
          formFieldInputPlaceholder__emailAddress: t('clerk.emailPlaceholder'),
          formFieldLabel__firstName: t('clerk.firstName'),
          formFieldLabel__lastName: t('clerk.lastName'),
          formFieldInputPlaceholder__firstName: t('clerk.firstName'),
          formFieldInputPlaceholder__lastName: t('clerk.lastName'),
          formFieldHintText__optional: t('clerk.optional'),
          formFieldLabel__emailAddress_username: t('clerk.emailShort'),
          backButton: t('clerk.back'),
          signUp: {
            start: { title: t('clerk.signUpTitle'), subtitle: signUpSub(), actionText: t('clerk.haveAccount'), actionLink: t('clerk.signInLink') },
            emailCode: emailCode(),
            continue: { title: t('clerk.completeData'), subtitle: t('clerk.completeSub') },
          },
          signIn: {
            start: { title: t('clerk.signInTitle'), subtitle: t('clerk.signInSub'), actionText: t('clerk.noAccount'), actionLink: t('clerk.signUpLink') },
            emailCode: emailCode(),
          },
        },
      });
      if (clerk.user) { location.replace(dest.href); return; }
      $('auth-loading').hidden = true;
      const appearance = {
        variables: { colorPrimary: '#00A76F', colorBackground: '#ffffff', colorText: '#1C252E', colorTextSecondary: '#637381', colorInputBackground: '#ffffff', colorInputText: '#1C252E', borderRadius: '8px', fontFamily: '"Public Sans", Inter, system-ui, sans-serif' },
        elements: {
          rootBox: { width: '100%' }, cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none' }, card: { width: '100%', maxWidth: '100%', padding: '0', boxShadow: 'none', border: '0' },
          headerTitle: { fontSize: '26px', fontWeight: 700 }, headerSubtitle: { color: '#637381' },
          socialButtonsBlockButton: { border: '1px solid rgba(145,158,171,.32)', fontWeight: 600, height: '44px' },
          formFieldInput: { height: '44px', borderColor: 'rgba(145,158,171,.32)' },
          formButtonPrimary: { backgroundColor: '#00A76F', fontWeight: 700, textTransform: 'none', fontSize: '15px', height: '46px', boxShadow: 'none', '&:hover': { backgroundColor: '#007867' } },
          footerActionLink: { color: '#007867', fontWeight: 600 },
          footer: { background: 'transparent' }, footerAction: { background: 'transparent' },
        },
      };
      const common = { appearance, forceRedirectUrl: dest.href, signInUrl: './?mode=signin' + planQ, signUpUrl: './?mode=signup' + planQ };
      if (mode === 'signup') clerk.mountSignUp($('clerk-root'), common); else clerk.mountSignIn($('clerk-root'), common);
      clerk.addListener(({ user }) => { if (user) location.replace(dest.href); });
    } catch (e) { fatal(e.message); }
  }
  // El formulario de Clerk se monta con su idioma dentro: cambiarlo recarga la
  // página, que es lo único que garantiza que su copia también cambie.
  mountLanguagePicker(document.getElementById('lang-host'), { compact: true, onChange: () => location.reload() });
  paint();
  onLocaleChange(paint);
  boot();
})();

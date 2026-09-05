/* Acceso a Comando (/app/): iniciar sesión o crear cuenta con Clerk y pasar al panel.
   Los pasos siguientes (vincular WhatsApp, conectar el CRM) viven dentro de /app/panel/.
   Sin build: ClerkJS se carga desde el Frontend API de la instancia. */
(function () {
  const cfg = window.COMANDO_CONFIG;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const plan = params.get('plan');
  const mode = params.get('mode') || (plan ? 'signup' : 'signin');
  const dest = new URL('panel/', location.href);
  if (plan) dest.searchParams.set('plan', plan);
  const planQ = plan ? '&plan=' + encodeURIComponent(plan) : '';

  function fatal(msg) { const el = $('auth-error'); el.textContent = msg; el.hidden = false; $('auth-loading').hidden = true; }

  async function boot() {
    try {
      const s = document.createElement('script');
      s.src = 'https://' + cfg.clerkFrontendApi + '/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
      s.setAttribute('data-clerk-publishable-key', cfg.clerkPublishableKey);
      s.async = true; s.crossOrigin = 'anonymous';
      await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el inicio de sesión. Revisa tu conexión.')); document.head.appendChild(s); });
      const clerk = window.Clerk;
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
  boot();
})();

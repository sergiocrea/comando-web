/* Contraseña nueva (/app/nueva-contrasena/?token=…): el enlace del correo de
   Postmark trae el token. Contrato del motor:
     POST /v1/auth/password/reset { token, password }
   Al guardar, el motor invalida el token y las sesiones abiertas, así que se
   vuelve a /app/ para entrar con la contraseña nueva. Sin build. */
import '../strings.js?v=25';
import { initLocale, mountLanguagePicker, onLocaleChange, t } from '../i18n.js?v=1';

initLocale();

function paint() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

(function () {
  const api = String((window.COMANDO_CONFIG || {}).engineUrl || '').replace(/\/$/, '');
  const $ = (id) => document.getElementById(id);
  const token = new URLSearchParams(location.search).get('token') || '';
  const err = (msg) => { const el = $('auth-error'); el.textContent = msg || ''; el.hidden = !msg; };
  const ok = (msg) => { const el = $('auth-ok'); el.textContent = msg || ''; el.hidden = !msg; };

  $('eye').addEventListener('click', () => {
    const input = $('p1');
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    const eye = $('eye');
    eye.dataset.i18n = shown ? 'auth.show' : 'auth.hide';
    eye.textContent = t(eye.dataset.i18n);
    input.focus();
  });

  $('reset-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    err(''); ok('');
    const p1 = $('p1').value;
    const p2 = $('p2').value;
    if (!token) { err(t('auth.tokenBad')); return; }
    if (p1.length < 10) { err(t('auth.weak')); return; }
    if (p1 !== p2) { err(t('auth.mismatch')); return; }
    const button = $('reset-submit');
    button.disabled = true;
    button.textContent = t('common.saving');
    try {
      const res = await fetch(api + '/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password: p1 }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.ok) {
        $('reset-form').hidden = true;
        ok(t('auth.passwordSaved'));
        setTimeout(() => location.replace('../'), 1800);
        return;
      }
      err(data && data.error === 'password_debil' ? t('auth.weak') : t('auth.tokenBad'));
    } catch (e) {
      err(t('auth.netFail'));
    }
    button.disabled = false;
    button.textContent = t('auth.savePassword');
  });

  mountLanguagePicker(document.getElementById('lang-host'), { compact: true });
  paint();
  onLocaleChange(paint);
  if (!token) err(t('auth.tokenBad'));
  else $('p1').focus();
})();

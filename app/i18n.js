/**
 * El idioma de las pantallas del usuario: castellano, inglés y portugués.
 *
 * Un diccionario plano de clave/valor por idioma. `t('clave')` devuelve el
 * texto; `t('clave', { n: 3 })` sustituye `{n}`. Una clave que falte devuelve
 * la clave misma, visible y fea a propósito: un hueco que se ve se arregla, y
 * uno que cae al castellano no lo nota nadie hasta que lo lee un cliente.
 *
 * De dónde sale el idioma, en orden:
 *   1. `?lang=en` en la URL, para poder enseñar una pantalla en un idioma.
 *   2. Lo que el usuario eligió aquí antes (localStorage).
 *   3. Lo que eligió al registrarse, cuando llega su cuenta (`adoptAccount`).
 *   4. El idioma del navegador.
 *   5. Castellano.
 *
 * La cuenta manda sobre el navegador pero no sobre una elección explícita de
 * esta sesión: quien acaba de tocar el selector no quiere que se lo cambien.
 */
export const LOCALES = ['es', 'en', 'pt'];
export const LOCALE_NAMES = { es: 'Español', en: 'English', pt: 'Português' };
/** Etiqueta corta para el selector, la que cabe en una barra. */
export const LOCALE_SHORT = { es: 'ES', en: 'EN', pt: 'PT' };
/** Cómo se formatean números y fechas en cada idioma. */
export const LOCALE_TAGS = { es: 'es-PE', en: 'en-US', pt: 'pt-BR' };

const STORAGE_KEY = 'comando.locale';
const listeners = new Set();
let current = 'es';
/** El usuario tocó el selector en esta sesión: la cuenta ya no lo pisa. */
let chosenHere = false;

const normalize = (value) => {
  const base = String(value || '').trim().toLowerCase().split(/[-_]/)[0];
  return LOCALES.includes(base) ? base : undefined;
};

function stored() {
  try { return normalize(localStorage.getItem(STORAGE_KEY)); } catch (e) { return undefined; }
}
function remember(value) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* sin storage: vale para esta sesión */ }
}

/** Resuelve el idioma de arranque. Se llama una vez, antes del primer pintado. */
export function initLocale() {
  const fromUrl = normalize(new URLSearchParams(location.search).get('lang'));
  const fromBrowser = normalize(navigator.language) || normalize((navigator.languages || [])[0]);
  current = fromUrl || stored() || fromBrowser || 'es';
  if (fromUrl) { chosenHere = true; remember(fromUrl); }
  applyToDocument();
  return current;
}

/**
 * El idioma que el operador eligió al registrarse, cuando llega su cuenta.
 * No pisa una elección hecha aquí en esta sesión.
 */
export function adoptAccountLocale(value) {
  const next = normalize(value);
  if (!next || chosenHere || next === current) return false;
  current = next;
  remember(next);
  applyToDocument();
  notify();
  return true;
}

/** El usuario eligió en el selector. Devuelve `true` si de verdad cambió. */
export function setLocale(value) {
  const next = normalize(value);
  if (!next || next === current) return false;
  current = next;
  chosenHere = true;
  remember(next);
  applyToDocument();
  notify();
  return true;
}

export const locale = () => current;
export const localeTag = () => LOCALE_TAGS[current] || 'es-PE';
export function onLocaleChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { for (const fn of [...listeners]) { try { fn(current); } catch (e) { /* un oyente roto no rompe a los demás */ } } }
function applyToDocument() { document.documentElement.lang = current; }

/**
 * El texto de una clave. `{algo}` se sustituye por `params.algo`.
 *
 * Una clave que no existe se devuelve tal cual, con un `⟨⟩` alrededor: en
 * pantalla se ve raro y se arregla; devolver el castellano lo escondería.
 */
export function t(key, params) {
  const table = DICT[current] || DICT.es;
  const raw = table[key] ?? DICT.es[key];
  if (raw === undefined) return `⟨${key}⟩`;
  if (!params) return raw;
  return String(raw).replace(/\{(\w+)\}/g, (whole, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

/**
 * Plural sencillo: `tn('tareas', 3)` usa `tareas_one` con 1 y `tareas_other`
 * con el resto. Los tres idiomas parten el plural en el mismo sitio.
 */
export function tn(key, n, params) {
  return t(`${key}_${n === 1 ? 'one' : 'other'}`, { n, ...(params || {}) });
}

/**
 * El selector de idioma. Se pinta donde se le diga y avisa por `onChange`
 * ANTES de repintar, para que quien lo monta pueda guardar la elección en la
 * cuenta del operador.
 */
export function mountLanguagePicker(host, { onChange, compact = false } = {}) {
  if (!host) return;
  const id = 'lang-picker-' + Math.random().toString(36).slice(2, 8);
  host.innerHTML = `<label class="lang-picker${compact ? ' is-compact' : ''}" for="${id}">
    <span class="lang-picker-label">${t('common.language')}</span>
    <select id="${id}" aria-label="${t('common.language')}">
      ${LOCALES.map((code) => `<option value="${code}"${code === current ? ' selected' : ''}>${compact ? LOCALE_SHORT[code] : LOCALE_NAMES[code]}</option>`).join('')}
    </select>
  </label>`;
  const select = host.querySelector('select');
  select.addEventListener('change', () => {
    const next = select.value;
    if (!setLocale(next)) return;
    if (typeof onChange === 'function') onChange(next);
  });
  return select;
}

/* =========================================================== diccionarios */
const DICT = { es: {}, en: {}, pt: {} };
export function register(entries) {
  for (const code of LOCALES) Object.assign(DICT[code], entries[code] || {});
}
/** Solo para pruebas y para el aviso de claves que faltan. */
export function keysOf(code) { return Object.keys(DICT[code] || {}); }

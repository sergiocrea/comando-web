/**
 * Pinta las seis secciones del panel en los tres idiomas con un DOM mínimo.
 *
 * No comprueba el diseño: comprueba que ninguna sección explota al cambiar de
 * idioma y que no queda ninguna clave sin traducir —`t()` devuelve `⟨clave⟩`
 * cuando falta, y eso es justo lo que se busca aquí—.
 */
const el = () => ({
  innerHTML: '', textContent: '', dataset: {}, style: {}, hidden: false,
  classList: { add() {}, remove() {}, toggle() {} },
  setAttribute() {}, appendChild() {}, addEventListener() {},
  querySelector: () => null, querySelectorAll: () => [], closest: () => null,
  scrollIntoView() {}, focus() {},
});
globalThis.document = {
  documentElement: {}, body: el(), title: '',
  getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
  createElement: () => el(), head: el(), addEventListener() {},
};
globalThis.location = { search: '', hash: '#/hoy', href: 'https://comando.pro/app/panel/', origin: 'https://comando.pro' };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'es-PE', languages: ['es-PE'] }, configurable: true });
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = { COMANDO_CONFIG: {}, addEventListener() {}, location: globalThis.location, innerWidth: 1200 };
globalThis.setInterval = () => 0;

const { SECTIONS } = await import('../app/panel/sections.js?v=6');
await import('../app/strings.js?v=1');
const i18n = await import('../app/i18n.js?v=1');

/* Datos vacíos: lo que se mide es el texto, no los números. */
const DATA = {
  me: { status: 'ok' }, quota: null, connections: [], sheets: [], mk: null, team: null,
  agent: null, health: null, tasks: [], cal: [], recs: [], pipeline: null, history: [],
  approvals: [], eventRules: [], policy: null, playbooks: [],
};
let bad = 0;
for (const lang of i18n.LOCALES) {
  i18n.setLocale(lang);
  for (const section of SECTIONS) {
    let html;
    try { html = section.view(DATA, { tabs: {}, user: null }); }
    catch (e) { console.error(`${lang} · ${section.id}: ${e.message}`); bad = 1; continue; }
    const missing = [...new Set(String(html).match(/⟨[^⟩]+⟩/g) || [])];
    if (missing.length) { console.error(`${lang} · ${section.id}: sin traducir ${missing.join(' ')}`); bad = 1; }
  }
  console.log(`${lang}: ${SECTIONS.map((s) => s.title).join(' · ')}`);
}
console.log(bad ? '\nPANEL INCOMPLETO' : '\nOK · las seis secciones pintan en los tres idiomas');
process.exit(bad);

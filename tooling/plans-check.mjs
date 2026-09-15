/**
 * ¿Sigue anunciando la página lo que de verdad se cobra?
 *
 *   node tooling/plans-check.mjs                 # contra app.comando.pro
 *   node tooling/plans-check.mjs --url ...       # contra otro motor
 *   node tooling/plans-check.mjs --fixture       # contra tooling/fixtures/public-plans-meta.json
 *   node tooling/plans-check.mjs --fixture x.json
 *
 * `--fixture` existe porque la página ya anuncia el catálogo Meta-first
 * (Gratis/Analista/Equipo/Agencia por cuentas publicitarias + módulo CRM) y el
 * motor de producción todavía sirve el viejo hasta que se despliegue la fase E:
 * así se comprueba la página contra la forma que va a publicar el motor, sin
 * esperar al despliegue.
 *
 * Por qué esto y no una página de precios que pida los planes al motor:
 *
 * La escalera de planes vive en la base de datos del motor y se publica desde
 * la consola de administración; `GET /v1/public/plans` la sirve. Lo evidente
 * sería que `js/pricing.js` la pidiera y pintara lo que llegue. No se hizo, por
 * dos razones que pesan más que la elegancia:
 *
 * 1. Una página de precios que espera a la red puede salir VACÍA. Un visitante
 *    con la red mala, un motor caído o un despliegue a medias vería el bloque
 *    que decide la compra en blanco. Una página desactualizada vende de menos;
 *    una página vacía no vende nada, y encima parece rota.
 * 2. Los números están tejidos en la prosa en tres idiomas. Repintar las
 *    tarjetas y no el resto deja una página que se contradice consigo misma.
 *
 * Así que los números se quedan escritos, pero en UN solo sitio (`PLAN_LADDER`,
 * `TRIAL` y `ADDONS` en `js/pricing.js`) y con alguien vigilando: este script
 * compara ese sitio con lo que sirve el motor y falla cuando dejan de coincidir.
 * El aviso llega por el flujo de `.github/workflows/precios.yml`, que lo corre a
 * diario.
 *
 * Qué compara, campo a campo, cuando el motor lo publica:
 *   - límites: preguntas al mes (y su periodo), cuentas publicitarias, cada
 *     cuánto se actualizan los datos de Meta; y, si la página los anuncia, los
 *     del catálogo anterior (registros, CRM conectados, operación masiva);
 *   - capacidades: lo que la página promete (`true`/`'limited'`) tiene que
 *     estar encendido en el motor, y lo que dice «Próximamente»
 *     (`'coming_soon'`, o `'soon'` en la forma vieja) no puede estar ya
 *     encendido sin que la página lo cuente;
 *   - precios: mensual y anual, solo los que están en `ready`;
 *   - la prueba: días y plan;
 *   - los módulos (`addons`): código, precio «desde» y que el precio sea variable.
 * Con el catálogo viejo (`commandLimit`, `contactLimit`, `connectionLimit`,
 * `amountMinor`, intervalos `monthly`/`annual`) compara lo que puede y avisa de
 * lo que no.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : fallback;
};
const ENGINE = (argument('--url', 'https://app.comando.pro/api') ?? 'https://app.comando.pro/api').replace(/\/$/, '');
const FIXTURE = process.argv.includes('--fixture')
  ? resolve(argument('--fixture', join(root, 'tooling/fixtures/public-plans-meta.json')))
  : null;
const SOURCE = FIXTURE ?? `${ENGINE}/v1/public/plans`;

/**
 * `js/pricing.js` es un script de navegador, sin exportaciones: se carga con
 * `<script src>` y no como módulo. Se lee el trozo declarativo —que es literal
 * puro— y se evalúa. Si alguien mueve esas constantes, esto falla en voz alta.
 */
function ladderFromSource() {
  const source = readFileSync(join(root, 'js/pricing.js'), 'utf8');
  const from = source.indexOf('const PLAN_LADDER');
  const to = source.indexOf('const PRICING_CONFIG');
  if (from === -1 || to === -1 || to < from)
    throw new Error('js/pricing.js: no encuentro PLAN_LADDER/TRIAL/ADDONS antes de PRICING_CONFIG');
  return new Function(`${source.slice(from, to)}\nreturn { PLAN_LADDER, TRIAL, ADDONS };`)();
}

async function catalog() {
  if (FIXTURE) return JSON.parse(readFileSync(FIXTURE, 'utf8'));
  let last;
  // Tres intentos: un motor que parpadea no debe convertir este aviso en ruido diario.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(SOURCE, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      last = error;
      if (attempt < 3) await new Promise((done) => setTimeout(done, attempt * 1000));
    }
  }
  throw last;
}

const same = (a, b) => (a ?? null) === (b ?? null);
const show = (value) => (value == null ? 'ilimitado' : String(value));
/** El valor del motor: primero el contrato nuevo, después el viejo. `undefined` = no lo publica. */
const pick = (...values) => values.find((value) => value !== undefined);
const SOON = /^(soon|coming_soon)$/i;
/** ¿Está encendida una capacidad en el motor? Admite booleano o texto (`'limited'`, `'full'`…). */
const on = (value) => value === true || (typeof value === 'string' && !/^(false|none|off|soon|coming_soon|no)$/i.test(value));
/** Precio de la página en las dos formas: `price: 29` (vieja, anual ×10) o `price: { month, year }`. */
const webPrices = (plan) =>
  typeof plan.price === 'number' ? { month: plan.price, year: plan.price * 10 } : { month: plan.price?.month ?? 0, year: plan.price?.year ?? 0 };
const INTERVAL = { month: 'month', monthly: 'month', year: 'year', annual: 'year', yearly: 'year' };

const { PLAN_LADDER, TRIAL, ADDONS } = ladderFromSource();
let body;
try {
  body = await catalog();
} catch (error) {
  console.error(`no se pudo consultar ${SOURCE}: ${error.message}`);
  console.error('esto NO dice que los precios estén mal: dice que no se pudieron comparar.');
  process.exit(2);
}
const plans = body.plans ?? [];

const byCode = new Map(plans.map((plan) => [plan.code, plan]));
const problems = [];
const warnings = [];

for (const plan of PLAN_LADDER) {
  const served = byCode.get(plan.code);
  if (!served) {
    problems.push(`${plan.id}: la página lo anuncia y el motor no lo publica (código «${plan.code}»)`);
    continue;
  }
  const limits = served.limits ?? {};
  const checks = [
    ['preguntas al mes', plan.commands, pick(limits.commands?.limit, served.commandLimit)],
    ['cuentas publicitarias', plan.adsAccounts, limits.adsAccounts],
    ['minutos entre actualizaciones de Meta', plan.adsRefreshMinutes, pick(limits.adsRefreshMinutes, served.capabilities?.adsRefreshMinutes, served.adsRefreshMinutes)],
    // Del catálogo anterior: solo si la página todavía los anuncia.
    ['registros al día', plan.mirrorRecords, pick(limits.mirrorRecords, served.contactLimit)],
    ['CRM conectados', plan.crmAccounts, pick(limits.crmAccounts, served.connectionLimit)],
    ['registros por operación masiva', plan.bulkMaxRecords, limits.bulkMaxRecords],
  ];
  for (const [what, web, engine] of checks) {
    if (web === undefined) continue;
    if (engine === undefined) { warnings.push(`${plan.id}: el motor no publica «${what}»; la página anuncia ${show(web)}`); continue; }
    if (!same(web, engine)) problems.push(`${plan.id}: ${what} — la página dice ${show(web)}, el motor ${show(engine)}`);
  }
  if (limits.commands?.period && limits.commands.period !== 'monthly')
    problems.push(`${plan.id}: la página dice preguntas «al mes» y el motor las cuenta por «${limits.commands.period}»`);

  // Capacidades: lo prometido tiene que existir, y lo que dice «Próximamente» no puede estar ya encendido sin que la página lo cuente.
  if (served.capabilities) {
    for (const [key, web] of Object.entries(plan.capabilities ?? {})) {
      const engine = served.capabilities[key];
      if (engine === undefined) { warnings.push(`${plan.id}: el motor no publica la capacidad «${key}»`); continue; }
      const promised = web === true || web === 'limited' || web === 'full';
      if (promised && !on(engine)) problems.push(`${plan.id}: «${key}» — la página lo promete y el motor no lo incluye (${JSON.stringify(engine)})`);
      if (!promised && on(engine)) warnings.push(`${plan.id}: «${key}» — el motor ya lo incluye y la página dice ${SOON.test(String(web)) ? '«Próximamente»' : 'que no'}`);
      if (SOON.test(String(web)) && engine === false) warnings.push(`${plan.id}: «${key}» — la página dice «Próximamente» y el motor lo publica como no incluido`);
    }
  } else warnings.push(`${plan.id}: el motor no publica capacidades; no se pudieron comparar`);

  // Precios. Solo se comparan los que están en `ready`: mientras sigan en borrador no hay nada que comparar.
  const expected = webPrices(plan);
  const prices = (Array.isArray(served.prices)
    ? served.prices
    : served.amountMinor != null ? [{ interval: served.billingInterval ?? 'monthly', currency: served.currency, amountMinor: served.amountMinor, status: 'ready' }] : []
  ).map((price) => ({ ...price, interval: INTERVAL[price.interval] ?? price.interval }));
  const ready = prices.filter((price) => price.status == null || price.status === 'ready');
  if (expected.month === 0) {
    const charged = ready.find((price) => price.amountMinor > 0);
    if (charged) problems.push(`${plan.id}: la página lo anuncia gratis y el motor cobra US$ ${charged.amountMinor / 100}`);
  } else if (!ready.length) {
    warnings.push(`${plan.id}: el motor no publica precio listo todavía; la página anuncia US$ ${expected.month}/mes`);
  } else {
    for (const [interval, amount] of [['month', expected.month], ['year', expected.year]]) {
      const price = ready.find((p) => p.interval === interval);
      if (!price) { warnings.push(`${plan.id}: el motor no publica precio ${interval === 'month' ? 'mensual' : 'anual'}`); continue; }
      if (price.currency && price.currency.toUpperCase() !== 'USD')
        problems.push(`${plan.id}: el motor cobra en ${price.currency} y la página anuncia dólares`);
      if (price.amountMinor / 100 !== amount)
        problems.push(`${plan.id}: precio ${interval === 'month' ? 'mensual' : 'anual'} — la página dice US$ ${amount}, el motor US$ ${price.amountMinor / 100}`);
    }
  }

  if (served.trial !== undefined && expected.month === 0) {
    const trial = served.trial;
    if (!trial || trial.days !== TRIAL.days || trial.plan !== TRIAL.plan)
      problems.push(`${plan.id}: la página promete ${TRIAL.days} días de ${TRIAL.plan} y el motor publica ${JSON.stringify(trial)}`);
  }
}

// Módulos. La forma vieja de ADDONS (`commands: { amount, price }`) era un paquete de pago único que el motor no publica.
const servedAddons = Array.isArray(body.addons) ? new Map(body.addons.map((addon) => [addon.code, addon])) : null;
for (const [code, addon] of Object.entries(ADDONS ?? {})) {
  if (addon.priceFrom === undefined) { warnings.push(`módulo «${code}»: la página no anuncia precio «desde»; no hay nada que comparar`); continue; }
  if (!servedAddons) { warnings.push(`el motor no publica módulos; la página anuncia «${code}» desde US$ ${addon.priceFrom}`); continue; }
  const served = servedAddons.get(code);
  if (!served) { problems.push(`módulo «${code}»: la página lo anuncia y el motor no lo publica`); continue; }
  const from = served.priceFrom?.amountMinor;
  if (from === undefined) warnings.push(`módulo «${code}»: el motor no publica precio «desde»`);
  else if (from / 100 !== addon.priceFrom) problems.push(`módulo «${code}»: la página dice desde US$ ${addon.priceFrom}, el motor desde US$ ${from / 100}`);
  if (served.priceFrom?.currency && served.priceFrom.currency.toUpperCase() !== 'USD')
    problems.push(`módulo «${code}»: el motor cobra en ${served.priceFrom.currency} y la página anuncia dólares`);
  if (addon.pricing && served.pricing && addon.pricing !== served.pricing)
    problems.push(`módulo «${code}»: la página dice precio «${addon.pricing}» y el motor «${served.pricing}»`);
}

// Un plan público que la página no enseña no es necesariamente un error, pero conviene enterarse el día que aparezca uno nuevo.
const anunciados = new Set(PLAN_LADDER.map((plan) => plan.code));
for (const plan of plans)
  if (!anunciados.has(plan.code)) warnings.push(`el motor publica «${plan.code}» y la página no lo enseña como plan`);

console.log(`escalera anunciada: ${PLAN_LADDER.map((p) => `${p.id} US$ ${webPrices(p).month}/${show(p.adsAccounts)} cuentas/${p.commands} preguntas`).join(' · ')}`);
console.log(`prueba: ${TRIAL.days} días de ${TRIAL.plan} · módulos: ${Object.entries(ADDONS ?? {}).map(([code, a]) => `${code} desde US$ ${a.priceFrom ?? a.price}`).join(', ') || 'ninguno'}`);
for (const warning of warnings) console.log(`aviso: ${warning}`);
if (problems.length) {
  console.error(`\nla página de precios anuncia algo distinto de lo que se cobra (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\narréglalo en PLAN_LADDER de js/pricing.js (y sube el ?v= de pricing.js en index.html).');
  process.exit(1);
}
console.log(`\ntodo cuadra con ${SOURCE}`);

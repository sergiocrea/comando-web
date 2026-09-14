/**
 * ¿Sigue anunciando la página lo que de verdad se cobra?
 *
 *   node tooling/plans-check.mjs            # contra app.comando.pro
 *   node tooling/plans-check.mjs --url ...  # contra otro motor
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
 * 2. Los números están tejidos en la prosa —«Gratis, con 1 000 registros y 30
 *    comandos al mes»— en tres idiomas. Repintar las tarjetas y no el FAQ deja
 *    una página que se contradice consigo misma, que es peor que estar
 *    desfasada.
 *
 * Así que los números se quedan escritos, pero en UN solo sitio (`PLAN_LADDER`,
 * `TRIAL` y `ADDONS` en `js/pricing.js`) y con alguien vigilando: este script
 * compara ese sitio con lo que sirve el motor y falla cuando dejan de coincidir.
 * El aviso llega por el flujo de `.github/workflows/precios.yml`, que lo corre a
 * diario: un precio que se cambia en la consola un martes se descubre el
 * miércoles, no cuando lo suma un cliente.
 *
 * Qué compara, campo a campo, cuando el motor lo publica:
 *   - límites: comandos (y su periodo), registros al día, CRM conectados,
 *     cuentas de Ads, tope de registros por operación masiva;
 *   - capacidades: lo que la página promete como incluido (`true`/`'limited'`)
 *     tiene que estar encendido en el motor, y lo que dice «Próximamente»
 *     (`'soon'`) o «no incluido» (`false`) tiene que estar apagado;
 *   - precios: mensual y anual (×10), solo los que están en `ready`;
 *   - la prueba: días y plan.
 * Con el catálogo viejo (`commandLimit`, `contactLimit`, `connectionLimit`,
 * `amountMinor`) compara lo que puede y avisa de lo que no.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const ENGINE = (argument('--url', 'https://app.comando.pro/api')).replace(/\/$/, '');

/**
 * `js/pricing.js` es un script de navegador, sin exportaciones: se carga con
 * `<script src>` y no como módulo. Convertirlo en módulo para que Node pudiera
 * importarlo cambiaría cómo carga la página por la comodidad de este script, y
 * la página manda. Así que se lee el trozo declarativo —que es literal puro— y
 * se evalúa. Si alguien mueve esas constantes, esto falla en voz alta.
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
  let last;
  // Tres intentos: un motor que parpadea no debe convertir este aviso en ruido
  // diario, porque un aviso que se ignora es lo mismo que no tenerlo.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${ENGINE}/v1/public/plans`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()).plans ?? [];
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
/** ¿Está encendida una capacidad en el motor? Admite booleano o texto (`'limited'`, `'full'`…). */
const on = (value) => value === true || (typeof value === 'string' && !/^(false|none|off|soon|no)$/i.test(value));

const { PLAN_LADDER, TRIAL, ADDONS } = ladderFromSource();
let plans;
try {
  plans = await catalog();
} catch (error) {
  console.error(`no se pudo consultar ${ENGINE}/v1/public/plans: ${error.message}`);
  console.error('esto NO dice que los precios estén mal: dice que no se pudieron comparar.');
  process.exit(2);
}

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
    ['comandos', plan.commands, pick(limits.commands?.limit, served.commandLimit)],
    ['registros al día', plan.mirrorRecords, pick(limits.mirrorRecords, served.contactLimit)],
    ['CRM conectados', plan.crmAccounts, pick(limits.crmAccounts, served.connectionLimit)],
    ['cuentas de Ads', plan.adsAccounts, limits.adsAccounts],
    ['registros por operación masiva', plan.bulkMaxRecords, limits.bulkMaxRecords],
  ];
  for (const [what, web, engine] of checks) {
    if (engine === undefined) { warnings.push(`${plan.id}: el motor no publica «${what}»; la página anuncia ${show(web)}`); continue; }
    if (!same(web, engine)) problems.push(`${plan.id}: ${what} — la página dice ${show(web)}, el motor ${show(engine)}`);
  }
  if (limits.commands?.period && limits.commands.period !== 'monthly')
    problems.push(`${plan.id}: la página dice comandos «al mes» y el motor los cuenta por «${limits.commands.period}»`);

  // Capacidades: lo prometido tiene que existir, y lo que dice «Próximamente» no puede estar ya encendido sin que la página lo cuente.
  if (served.capabilities) {
    for (const [key, web] of Object.entries(plan.capabilities)) {
      const engine = served.capabilities[key];
      if (engine === undefined) { warnings.push(`${plan.id}: el motor no publica la capacidad «${key}»`); continue; }
      const promised = web === true || web === 'limited';
      if (promised && !on(engine)) problems.push(`${plan.id}: «${key}» — la página lo promete y el motor no lo incluye (${JSON.stringify(engine)})`);
      if (!promised && on(engine)) warnings.push(`${plan.id}: «${key}» — el motor ya lo incluye y la página dice ${web === 'soon' ? '«Próximamente»' : 'que no'}`);
    }
  } else warnings.push(`${plan.id}: el motor no publica capacidades; no se pudieron comparar`);

  // Precios. Solo se comparan los que están en `ready`: mientras sigan en borrador no hay nada que comparar.
  const prices = Array.isArray(served.prices)
    ? served.prices
    : served.amountMinor != null ? [{ interval: served.billingInterval ?? 'monthly', currency: served.currency, amountMinor: served.amountMinor, status: 'ready' }] : [];
  const ready = prices.filter((price) => price.status == null || price.status === 'ready');
  if (plan.price === 0) {
    const charged = ready.find((price) => price.amountMinor > 0);
    if (charged) problems.push(`${plan.id}: la página lo anuncia gratis y el motor cobra US$ ${charged.amountMinor / 100}`);
  } else if (!ready.length) {
    warnings.push(`${plan.id}: el motor no publica precio listo todavía; la página anuncia US$ ${plan.price}/mes`);
  } else {
    for (const [interval, expected] of [['monthly', plan.price], ['annual', plan.price * 10]]) {
      const price = ready.find((p) => p.interval === interval);
      if (!price) { warnings.push(`${plan.id}: el motor no publica precio ${interval === 'monthly' ? 'mensual' : 'anual'}`); continue; }
      if (price.currency && price.currency.toUpperCase() !== 'USD')
        problems.push(`${plan.id}: el motor cobra en ${price.currency} y la página anuncia dólares`);
      if (price.amountMinor / 100 !== expected)
        problems.push(`${plan.id}: precio ${interval} — la página dice US$ ${expected}, el motor US$ ${price.amountMinor / 100}`);
    }
  }

  if (served.trial !== undefined && plan.price === 0) {
    const trial = served.trial;
    if (!trial || trial.days !== TRIAL.days || trial.plan !== TRIAL.plan)
      problems.push(`${plan.id}: la página promete ${TRIAL.days} días de ${TRIAL.plan} y el motor publica ${JSON.stringify(trial)}`);
  }
}

// Un plan público que la página no enseña no es necesariamente un error
// («enterprise» se anuncia como una línea, no como una tarjeta), pero conviene
// enterarse el día que aparezca uno nuevo.
const anunciados = new Set(PLAN_LADDER.map((plan) => plan.code));
for (const plan of plans)
  if (!anunciados.has(plan.code)) warnings.push(`el motor publica «${plan.code}» y la página no lo enseña como plan`);

console.log(`escalera anunciada: ${PLAN_LADDER.map((p) => `${p.id} US$ ${p.price}/${p.commands} comandos/${show(p.mirrorRecords)} registros`).join(' · ')}`);
console.log(`prueba: ${TRIAL.days} días de ${TRIAL.plan} · paquete: +${ADDONS.commands.amount} comandos US$ ${ADDONS.commands.price} (el motor no publica paquetes: no hay con qué compararlos)`);
for (const warning of warnings) console.log(`aviso: ${warning}`);
if (problems.length) {
  console.error(`\nla página de precios anuncia algo distinto de lo que se cobra (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\narréglalo en PLAN_LADDER de js/pricing.js (y sube el ?v= de pricing.js en index.html).');
  process.exit(1);
}
console.log(`\ntodo cuadra con ${ENGINE}/v1/public/plans`);

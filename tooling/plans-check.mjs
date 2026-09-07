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
 * tres razones que pesan más que la elegancia:
 *
 * 1. Una página de precios que espera a la red puede salir VACÍA. Un visitante
 *    con la red mala, un motor caído o un despliegue a medias vería el bloque
 *    que decide la compra en blanco. Una página desactualizada vende de menos;
 *    una página vacía no vende nada, y encima parece rota.
 * 2. Hoy la ruta ni siquiera trae los precios: la vista `public_plan_catalog`
 *    solo une precios en estado `ready`, y la escalera del 6-sep-2026 los dejó
 *    en `draft` hasta aprovisionarlos en la pasarela. `amountMinor` viene en
 *    `null` para los cuatro planes. Un precio dinámico que no puede traer el
 *    precio es decorado.
 * 3. Los números están tejidos en la prosa —«30 comandos para una persona, con
 *    hasta 20 000 contactos»— en tres idiomas. Repintar las tarjetas y no el
 *    FAQ deja una página que se contradice consigo misma, que es peor que estar
 *    desfasada.
 *
 * Así que los números se quedan escritos, pero en UN solo sitio (`PLAN_LADDER`
 * en `js/pricing.js`) y con alguien vigilando: este script compara ese sitio
 * con lo que sirve el motor y falla cuando dejan de coincidir. El aviso llega
 * por el flujo de `.github/workflows/precios.yml`, que lo corre a diario: un
 * precio que se cambia en la consola un martes se descubre el miércoles, no
 * cuando lo suma un cliente.
 *
 * Si algún día la ruta sirve precios y hace falta que la página los siga al
 * minuto, el trabajo ya está hecho a medias: las frases llevan marcas
 * (`{gratis.comandos}`) y basta con rellenar `PLAN_LADDER` desde la respuesta
 * antes de pintar, dejando lo escrito como respaldo.
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
    throw new Error('js/pricing.js: no encuentro PLAN_LADDER/ADDONS antes de PRICING_CONFIG');
  return new Function(`${source.slice(from, to)}\nreturn { PLAN_LADDER, ADDONS };`)();
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

const { PLAN_LADDER, ADDONS } = ladderFromSource();
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
  const checks = [
    ['comandos', plan.commands, served.commandLimit],
    ['contactos', plan.contacts, served.contactLimit],
    ['conexiones', plan.connections, served.connectionLimit],
  ];
  for (const [what, web, engine] of checks)
    if (!same(web, engine)) problems.push(`${plan.id}: ${what} — la página dice ${show(web)}, el motor ${show(engine)}`);

  // El precio solo se compara cuando el motor lo publica. Mientras siga en
  // `draft` no hay nada que comparar, y decir «no coincide» sería mentira.
  if (served.amountMinor == null) {
    warnings.push(`${plan.id}: el motor no publica precio todavía (precio en borrador); la página anuncia US$ ${plan.price}`);
  } else {
    const engineUsd = served.amountMinor / 100;
    if (served.currency && served.currency.toUpperCase() !== 'USD')
      problems.push(`${plan.id}: el motor cobra en ${served.currency} y la página anuncia dólares`);
    if (engineUsd !== plan.price)
      problems.push(`${plan.id}: precio — la página dice US$ ${plan.price}, el motor US$ ${engineUsd}`);
  }
}

// Un plan público que la página no enseña no es necesariamente un error
// («enterprise» se anuncia como una línea, no como una tarjeta), pero conviene
// enterarse el día que aparezca uno nuevo.
const anunciados = new Set(PLAN_LADDER.map((plan) => plan.code));
for (const plan of plans)
  if (!anunciados.has(plan.code)) warnings.push(`el motor publica «${plan.code}» y la página no lo enseña como plan`);

console.log(`escalera anunciada: ${PLAN_LADDER.map((p) => `${p.id} US$ ${p.price}/${p.commands} comandos/${show(p.contacts)} contactos`).join(' · ')}`);
console.log(`paquetes: +${ADDONS.contacts.amount} contactos US$ ${ADDONS.contacts.price} · +${ADDONS.commands.amount} comandos US$ ${ADDONS.commands.price} (el motor no los publica: no hay con qué compararlos)`);
for (const warning of warnings) console.log(`aviso: ${warning}`);
if (problems.length) {
  console.error(`\nla página de precios anuncia algo distinto de lo que se cobra (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\narréglalo en PLAN_LADDER de js/pricing.js (y sube el ?v= de pricing.js en index.html).');
  process.exit(1);
}
console.log(`\ntodo cuadra con ${ENGINE}/v1/public/plans`);

/**
 * El navegador sirve lo viejo si nadie sube el `?v=`.
 *
 * Cloudflare Pages cachea por URL completa, así que un fichero cambiado y
 * publicado con la misma versión sigue llegando viejo al operador. Ha pasado
 * dos veces: la pantalla se subió, el despliegue salió verde, y el cliente
 * seguía viendo la de antes.
 *
 * Y no basta con subir la hoja. Los módulos se importan con la versión escrita
 * DENTRO del importador: si `panel.js?v=13` está en caché, el navegador no lo
 * vuelve a pedir y sigue importando `sections.js?v=13` aunque el HTML apunte a
 * una versión nueva de la hoja. Hay que subir toda la cadena hasta el HTML.
 *
 * Aquí eso sale gratis: se guarda la huella del contenido junto a la versión
 * con la que se publicó. Cambiar `sections.js` rompe su huella y obliga a
 * subirle la versión; subírsela cambia los bytes de `panel.js`, que rompe la
 * suya y obliga a subirla también. La cadena se enrosca sola hasta el HTML.
 *
 *   node tooling/check-versiones.mjs              comprueba (falla con 1)
 *   node tooling/check-versiones.mjs --registrar  asienta el estado actual
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

const RAIZ = resolve(import.meta.dirname, '..');
const MANIFIESTO = join(RAIZ, 'tooling', 'versiones.json');
/* `tooling/` no lo sirve nadie: sus `?v=` son ruido para node, no caché. */
const FUERA = new Set(['node_modules', '.git', '.github', 'tooling', 'docs']);
const ORIGEN = 'https://comando.pro/';

function ficheros(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    if (FUERA.has(nombre)) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta));
    else if (/\.(html|js)$/.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/* href="x?v=1" · src="x?v=1" · from 'x?v=1' · import 'x?v=1' · fetch('x?v=1') */
const REFERENCIA = /(?:href|src|from|import|fetch\(|content)\s*[=(]?\s*["']([^"']+?)\?v=(\d+)["']/g;

/** Dónde vive de verdad lo que se referencia, o `null` si no es de este repo. */
function resolver(desde, ref) {
  let r = ref;
  if (r.startsWith(ORIGEN)) r = `/${r.slice(ORIGEN.length)}`;
  else if (/^https?:\/\//.test(r)) return null;
  const abs = r.startsWith('/') ? join(RAIZ, r.slice(1)) : resolve(dirname(desde), r);
  return existsSync(abs) ? relative(RAIZ, abs) : { roto: relative(RAIZ, abs) };
}

const usos = new Map(); // ruta -> { versiones:Set, desde:[] }
const rotas = [];
for (const fichero of ficheros(RAIZ)) {
  const texto = readFileSync(fichero, 'utf8');
  for (const [, ref, version] of texto.matchAll(REFERENCIA)) {
    const destino = resolver(fichero, ref);
    if (destino === null) continue;
    if (typeof destino === 'object') { rotas.push(`${relative(RAIZ, fichero)} → ${ref}`); continue; }
    if (!usos.has(destino)) usos.set(destino, { versiones: new Set(), desde: [] });
    const u = usos.get(destino);
    u.versiones.add(version);
    u.desde.push(`${relative(RAIZ, fichero)} (v=${version})`);
  }
}

const huella = (ruta) => createHash('sha256').update(readFileSync(join(RAIZ, ruta))).digest('hex').slice(0, 16);
const previo = existsSync(MANIFIESTO) ? JSON.parse(readFileSync(MANIFIESTO, 'utf8')) : {};

if (process.argv.includes('--registrar')) {
  const nuevo = {};
  for (const ruta of [...usos.keys()].sort()) {
    nuevo[ruta] = { v: [...usos.get(ruta).versiones].sort((a, b) => b - a)[0], sha: huella(ruta) };
  }
  writeFileSync(MANIFIESTO, `${JSON.stringify(nuevo, null, 2)}\n`);
  console.log(`asentadas ${Object.keys(nuevo).length} referencias en tooling/versiones.json`);
  process.exit(0);
}

const viejas = [];
const dispares = [];
for (const [ruta, uso] of [...usos].sort()) {
  const v = [...uso.versiones].sort((a, b) => b - a)[0];
  if (uso.versiones.size > 1) dispares.push(`${ruta}: ${uso.desde.join(', ')}`);
  const antes = previo[ruta];
  if (antes && antes.v === v && antes.sha !== huella(ruta)) {
    viejas.push(`${ruta} cambió y sigue en ?v=${v} — súbelo en: ${uso.desde.join(', ')}`);
  }
}

for (const d of dispares) console.log(`aviso · dos versiones a la vez → ${d}`);
for (const r of rotas) console.log(`aviso · apunta a un fichero que no existe → ${r}`);
if (viejas.length) {
  console.error('\nFALLO · el navegador servirá lo viejo:');
  for (const v of viejas) console.error(`  ${v}`);
  console.error('\nDespués de subirlas: node tooling/check-versiones.mjs --registrar');
  process.exit(1);
}
console.log(`\nOK · ${usos.size} referencias con ?v=, ninguna cambiada sin subir la versión`);

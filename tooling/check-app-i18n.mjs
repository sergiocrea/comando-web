/* Comprueba que ninguna clave falte en un idioma y que ninguna clave usada en
   el código esté sin definir. Un hueco visible se arregla; uno escondido, no. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Relativa al script: con una ruta absoluta, ejecutarlo desde otro árbol de
// trabajo leía el diccionario de OTRA copia y decía «OK» sin mirar el archivo.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const src = readFileSync(join(root, 'strings.js'), 'utf8');

// Se extraen las claves de cada bloque register({ es: {...}, en: {...}, pt: {...} })
const dict = { es: new Set(), en: new Set(), pt: new Set() };
const blockRe = /register\(\{([\s\S]*?)\n\}\);/g;
let block;
while ((block = blockRe.exec(src))) {
  const body = block[1];
  for (const lang of ['es', 'en', 'pt']) {
    const langRe = new RegExp(`\\n  ${lang}: \\{([\\s\\S]*?)\\n  \\},`);
    const m = langRe.exec(body);
    if (!m) continue;
    for (const k of m[1].matchAll(/'([^']+)':/g)) dict[lang].add(k[1]);
  }
}
console.log('claves:', Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, v.size])));

let bad = 0;
for (const lang of ['en', 'pt']) {
  const missing = [...dict.es].filter((k) => !dict[lang].has(k));
  const extra = [...dict[lang]].filter((k) => !dict.es.has(k));
  if (missing.length) { console.error(`\n${lang}: faltan ${missing.length}:`, missing.join(', ')); bad = 1; }
  if (extra.length) { console.error(`\n${lang}: sobran ${extra.length}:`, extra.join(', ')); bad = 1; }
}

// Claves usadas en el código que no existen en el diccionario.
const used = new Set();
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) { walk(p); continue; }
    // `i18n.js` documenta el uso con ejemplos; `strings.js` ES el diccionario.
    if (!entry.name.endsWith('.js') || ['strings.js', 'mock-data.js', 'i18n.js'].includes(entry.name)) continue;
    const code = readFileSync(p, 'utf8');
    for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z][\w.]+)'/g)) used.add(m[1]);
    for (const m of code.matchAll(/\btn\(\s*'([a-zA-Z][\w.]+)'/g)) { used.add(m[1] + '_one'); used.add(m[1] + '_other'); }
  }
};
walk(root);
// Una clave que acaba en punto se compone en tiempo de ejecución
// (`t('hist.' + estado)`): su familia se comprueba entera más abajo.
const dynamic = [...used].filter((k) => k.endsWith('.'));
const undefined_ = [...used].filter((k) => !k.endsWith('.') && !dict.es.has(k));
for (const prefix of dynamic) {
  const family = [...dict.es].filter((k) => k.startsWith(prefix));
  if (!family.length) { console.error(`\nprefijo usado sin ninguna clave: ${prefix}`); bad = 1; }
}
if (undefined_.length) { console.error(`\nusadas y sin definir (${undefined_.length}):`, undefined_.join(', ')); bad = 1; }
console.log(bad ? '\nDICCIONARIO INCOMPLETO' : `\nOK · ${dict.es.size} claves × 3 idiomas · ${used.size} usadas en el código`);
process.exit(bad);

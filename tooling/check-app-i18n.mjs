/* Comprueba que ninguna clave falte en un idioma y que ninguna clave usada en
   el código esté sin definir. Un hueco visible se arregla; uno escondido, no.

   Hay MÁS DE UN diccionario: el del panel (`app/strings.js`, 609 claves) y el
   de `/app/dashboard/` (77). Se comprueban por separado a propósito, porque
   cada página carga el suyo: una clave del panel usada en el dashboard
   saldría en pantalla como ⟨clave⟩ aunque exista, y sumarlos en una bolsa
   común dejaría pasar justo ese fallo. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Relativa al script: con una ruta absoluta, ejecutarlo desde otro árbol de
// trabajo leía el diccionario de OTRA copia y decía «OK» sin mirar el archivo.
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');

/* Qué diccionario carga cada archivo de código, por su carpeta. `/app/` y
   `/app/panel/` comparten `app/strings.js`; `/app/dashboard/` tiene el suyo. */
const AREAS = [
  { name: 'panel y registro', dict: 'strings.js', code: (rel) => !rel.startsWith('dashboard' + sep) },
  { name: 'dashboard', dict: join('dashboard', 'strings.js'), code: (rel) => rel.startsWith('dashboard' + sep) },
];

/** Las claves de cada bloque `register({ es: {…}, en: {…}, pt: {…} })`. */
function dictionaryOf(file) {
  const src = readFileSync(join(root, file), 'utf8');
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
  return dict;
}

/** Las claves que pide el código de un área. */
function usedIn(belongs) {
  const used = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      // `i18n.js` documenta el uso con ejemplos; `strings.js` ES el diccionario.
      const isCode = entry.name.endsWith('.js') && !['strings.js', 'mock-data.js', 'mock-fields.js', 'i18n.js'].includes(entry.name);
      const isPage = entry.name.endsWith('.html');
      if (!isCode && !isPage) continue;
      if (!belongs(relative(root, p))) continue;
      const code = readFileSync(p, 'utf8');
      // El HTML declara sus textos con `data-i18n`, y los pinta `paintChrome()`.
      // Sin mirarlo aquí, una clave mal escrita ahí saldría en pantalla como
      // ⟨clave⟩ y ningún control la habría visto.
      for (const m of code.matchAll(/data-i18n="([a-zA-Z][\w.]+)"/g)) used.add(m[1]);
      if (!isCode) continue;
      for (const m of code.matchAll(/\bt\(\s*'([a-zA-Z][\w.]+)'/g)) used.add(m[1]);
      for (const m of code.matchAll(/\btn\(\s*'([a-zA-Z][\w.]+)'/g)) { used.add(m[1] + '_one'); used.add(m[1] + '_other'); }
    }
  };
  walk(root);
  return used;
}

let bad = 0;
for (const area of AREAS) {
  const dict = dictionaryOf(area.dict);
  const used = usedIn(area.code);
  console.log(`${area.name} (${area.dict}):`, Object.fromEntries(Object.entries(dict).map(([k, v]) => [k, v.size])));

  for (const lang of ['en', 'pt']) {
    const missing = [...dict.es].filter((k) => !dict[lang].has(k));
    const extra = [...dict[lang]].filter((k) => !dict.es.has(k));
    if (missing.length) { console.error(`\n${area.name} · ${lang}: faltan ${missing.length}:`, missing.join(', ')); bad = 1; }
    if (extra.length) { console.error(`\n${area.name} · ${lang}: sobran ${extra.length}:`, extra.join(', ')); bad = 1; }
  }

  // Una clave que acaba en punto se compone en tiempo de ejecución
  // (`t('hist.' + estado)`): se comprueba que su familia exista.
  const dynamic = [...used].filter((k) => k.endsWith('.'));
  for (const prefix of dynamic) {
    if (![...dict.es].some((k) => k.startsWith(prefix))) { console.error(`\n${area.name}: prefijo usado sin ninguna clave: ${prefix}`); bad = 1; }
  }
  const undefined_ = [...used].filter((k) => !k.endsWith('.') && !dict.es.has(k));
  if (undefined_.length) { console.error(`\n${area.name}: usadas y sin definir (${undefined_.length}):`, undefined_.join(', ')); bad = 1; }

  // Claves definidas que ya no lee nadie: no rompen nada, pero se acumulan.
  const unused = [...dict.es].filter((k) => !used.has(k) && ![...dynamic].some((p) => k.startsWith(p)));
  if (unused.length) console.log(`  (${unused.length} definidas sin uso directo; muchas se componen en tiempo de ejecución)`);
}
console.log(bad ? '\nDICCIONARIO INCOMPLETO' : '\nOK · cada pantalla tiene sus claves en los tres idiomas');
process.exit(bad);

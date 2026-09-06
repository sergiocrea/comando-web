/**
 * El landing en castellano, inglés y portugués desde UNA sola fuente.
 *
 * `index.html` se escribe en castellano y sigue siendo la página que se edita.
 * Este script saca de ahí cada texto que un visitante lee —el contenido entre
 * etiquetas y los atributos que se leen: title, description, alt, placeholder—
 * y escribe `/en/index.html` y `/pt/index.html` sustituyéndolos.
 *
 *   node tooling/i18n.mjs extract   # actualiza i18n/es.json con lo que hay hoy
 *   node tooling/i18n.mjs build     # genera en/ y pt/
 *   node tooling/i18n.mjs check     # falla si a un idioma le falta un texto
 *
 * `build` FALLA si a un idioma le falta una cadena, en vez de dejarla en
 * castellano: media página traducida se lee como un descuido y hace dudar del
 * producto entero. Traducir de más no rompe nada; traducir de menos, sí.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(root, 'index.html');
const LOCALES = ['en', 'pt'];

/** Atributos que un visitante lee (o le lee su lector de pantalla). */
const TEXT_ATTRIBUTES = new Set(['alt', 'placeholder', 'aria-label', 'title', 'data-label']);
/** Etiquetas cuyo contenido es código, no texto. */
const OPAQUE_TAGS = new Set(['script', 'style', 'svg']);

/** Un texto que no vale la pena traducir: números, símbolos, marcas. */
function translatable(text) {
  const trimmed = text.trim();
  if (trimmed.length < 2) return false;
  if (trimmed === '@@LANG_SWITCH@@') return false;
  if (!/\p{L}{2}/u.test(trimmed)) return false;
  // «Comando», «WhatsApp», «HubSpot»: nombres propios, iguales en los tres.
  if (/^(?:Comando|WhatsApp|HubSpot|Salesforce|CRM|Pipedrive|Zoho|S\/|US\$)$/i.test(trimmed)) return false;
  return true;
}

/**
 * Recorre el HTML sin reescribirlo: devuelve los trozos y marca cuáles son
 * texto que se lee. Todo lo demás vuelve byte a byte como estaba, que es lo
 * que hace que la página generada sea la misma página.
 */
/** El conmutador de idioma lo genera este script; no entra en el catálogo. */
function withoutSwitcher(html) {
  return html.replace(/<div class="lang-switch"[\s\S]*?<\/div>/, '');
}

function segments(html) {
  const parts = [];
  const tag = /<[^>]*>/g;
  let index = 0;
  let opaque = null;
  let match;
  while ((match = tag.exec(html))) {
    if (match.index > index)
      parts.push({ kind: opaque ? 'raw' : 'text', value: html.slice(index, match.index) });
    const raw = match[0];
    const name = /^<\/?\s*([a-zA-Z][\w-]*)/.exec(raw)?.[1]?.toLowerCase();
    if (opaque && name === opaque && raw.startsWith('</')) opaque = null;
    else if (!opaque && name && OPAQUE_TAGS.has(name) && !raw.startsWith('</') && !raw.endsWith('/>'))
      opaque = name;
    parts.push({ kind: 'tag', value: raw });
    index = tag.lastIndex;
  }
  if (index < html.length) parts.push({ kind: 'text', value: html.slice(index) });
  return parts;
}

/** Los textos de un atributo dentro de una etiqueta, con su posición exacta. */
function attributeStrings(tagText) {
  const found = [];
  const attribute = /([a-zA-Z-]+)\s*=\s*"([^"]*)"/g;
  let match;
  const isMeta = /^<\s*meta\b/i.test(tagText);
  const metaName = isMeta
    ? (/\b(?:name|property)\s*=\s*"([^"]*)"/i.exec(tagText)?.[1] ?? '').toLowerCase()
    : '';
  const metaTranslatable = new Set([
    'description',
    'og:title',
    'og:description',
    'og:image:alt',
    'twitter:title',
    'twitter:description',
  ]);
  while ((match = attribute.exec(tagText))) {
    const [, name, value] = match;
    const key = name.toLowerCase();
    const wanted =
      TEXT_ATTRIBUTES.has(key) || (isMeta && key === 'content' && metaTranslatable.has(metaName));
    if (wanted && translatable(value)) found.push({ value, start: match.index + match[0].indexOf(value) });
  }
  return found;
}

function catalog(rawHtml) {
  const html = withoutSwitcher(rawHtml);
  const strings = [];
  const seen = new Set();
  const add = (value) => {
    const key = value.trim();
    if (!seen.has(key)) {
      seen.add(key);
      strings.push(key);
    }
  };
  for (const part of segments(html)) {
    if (part.kind === 'text' && translatable(part.value)) add(part.value);
    if (part.kind === 'tag') for (const found of attributeStrings(part.value)) add(found.value);
  }
  return strings;
}

function translate(rawHtml, dictionary, missing) {
  const html = rawHtml;
  const swap = (value) => {
    const key = value.trim();
    const replacement = dictionary[key];
    if (replacement === undefined) {
      missing.add(key);
      return value;
    }
    return value.replace(key, replacement);
  };
  return segments(html)
    .map((part) => {
      if (part.kind === 'text') return translatable(part.value) ? swap(part.value) : part.value;
      if (part.kind !== 'tag') return part.value;
      const found = attributeStrings(part.value);
      if (!found.length) return part.value;
      let out = part.value;
      // De atrás hacia delante: así una sustitución no mueve la siguiente.
      for (const item of [...found].reverse())
        out = out.slice(0, item.start) + swap(item.value) + out.slice(item.start + item.value.length);
      return out;
    })
    .join('');
}

const SWITCHER = (current) => {
  const label = { es: 'ES', en: 'EN', pt: 'PT' };
  const href = { es: '/', en: '/en/', pt: '/pt/' };
  const links = ['es', 'en', 'pt']
    .map((locale) =>
      locale === current
        ? `<span class="lang-switch-current" aria-current="true">${label[locale]}</span>`
        : `<a href="${href[locale]}" hreflang="${locale}">${label[locale]}</a>`,
    )
    .join('');
  return `<div class="lang-switch" role="navigation" aria-label="Idioma">${links}</div>`;
};

const HREFLANG = `    <link rel="alternate" hreflang="es" href="https://comando.pro/" />
    <link rel="alternate" hreflang="en" href="https://comando.pro/en/" />
    <link rel="alternate" hreflang="pt" href="https://comando.pro/pt/" />
    <link rel="alternate" hreflang="x-default" href="https://comando.pro/" />
`;

/** La copia vive en /en/ o /pt/: lo relativo dejaría de resolver. */
function absolutePaths(html) {
  return html
    .replace(/(\b(?:href|src)=")(?!https?:|\/|#|mailto:|tel:|data:)/g, '$1/')
    .replace(/(\bcontent=")(assets\/)/g, '$1/$2');
}

function head(html, locale) {
  const ogLocale = { en: 'en_US', pt: 'pt_BR' }[locale];
  return html
    .replace(/<html lang="es"/, `<html lang="${locale}"`)
    .replace(/<link rel="canonical" href="https:\/\/comando\.pro\/"\s*\/>/, `<link rel="canonical" href="https://comando.pro/${locale}/" />`)
    .replace(/<meta property="og:locale" content="es_LA" \/>/, `<meta property="og:locale" content="${ogLocale}" />`)
    .replace(/<meta property="og:url" content="https:\/\/comando\.pro\/" \/>/, `<meta property="og:url" content="https://comando.pro/${locale}/" />`);
}

const command = process.argv[2] ?? 'build';
const html = readFileSync(SOURCE, 'utf8');

if (command === 'extract') {
  const strings = catalog(html);
  writeFileSync(join(root, 'i18n/es.json'), `${JSON.stringify(strings, null, 2)}\n`);
  console.log(`i18n/es.json: ${strings.length} textos`);
  process.exit(0);
}

let failed = false;
for (const locale of LOCALES) {
  const path = join(root, `i18n/${locale}.json`);
  if (!existsSync(path)) {
    console.error(`falta i18n/${locale}.json`);
    failed = true;
    continue;
  }
  const dictionary = JSON.parse(readFileSync(path, 'utf8'));
  const missing = new Set();
  // El conmutador vive en la fuente para que la página en castellano también
  // lo tenga. Se quita ANTES de traducir —«ES», «EN», «Idioma» no son textos
  // del catálogo— y se pone el del idioma generado.
  const body = html.replace(/<div class="lang-switch"[\s\S]*?<\/div>/, '@@LANG_SWITCH@@');
  const translated = head(absolutePaths(translate(body, dictionary, missing)), locale).replace(
    '@@LANG_SWITCH@@',
    SWITCHER(locale),
  );
  if (missing.size) {
    console.error(`\n${locale}: faltan ${missing.size} textos`);
    for (const item of [...missing].slice(0, 40)) console.error(`  - ${item.slice(0, 100)}`);
    failed = true;
    continue;
  }
  if (command === 'build') {
    mkdirSync(join(root, locale), { recursive: true });
    writeFileSync(join(root, locale, 'index.html'), translated);
    console.log(`${locale}/index.html escrito`);
  } else console.log(`${locale}: completo`);
}
if (failed) process.exit(1);

# comando-web

Landing de Comando (plataforma de integraciones y automatizaciones para CRM). Estructura y motor de animaciones derivados de una réplica de landing; marca, copy, assets de pantalla y paleta son propios.

## Estructura

- `index.html` — markup de la página (estructura y clases del original, limpio de trackers/analytics/cookie-banner).
- `css/custom.css` — estilos utilitarios y de componentes (grid, botones con clip-path, hotspots del explode). El layout y las fuentes vienen del stylesheet de Webflow enlazado en `<head>`.
- `js/main.js` — lógica de UI reescrita: Lenis (smooth scroll), motor `data-reveal` (fade/block/text/scramble), líneas divisorias, grid canvas con spotlight (≥992px), fondo/morph de la barra de navegación, menú móvil, video de features scrubbeado por scroll en 5 fases + Lottie, countdown y globo del footer.
- `js/hero2d.js` — preloader (contador + salida escalonada) y el hero: teléfono con chat de WhatsApp dibujado en un canvas 2D.
- `js/demo.js` — sección «Pruébalo» (`#demo`): un WhatsApp de mentira donde el visitante escribe y Comando responde con el formato real (📋 plan → CONFIRMAR → ✅, 📊 reporte, aclaración con alternativas). Dos motores: primero `/api/demo` (función de Cloudflare Pages en `functions/api/demo.js` → DeepSeek, con respaldo en OpenAI) para entender cualquier frase; si no está configurada o falla, las reglas locales de `docs/demo-data.json` (intenciones con palabras clave sacadas del banco de comandos de comando-pro; hoy entienden el 100 % de las 245 frases de `operador-variaciones.jsonl`). Los datos son los de una inmobiliaria de ejemplo. Reemplaza de momento a «Radar» (`#radar`) y «Un mensaje. Tres tareas menos.» (`#about`), que siguen en el HTML con `hidden`. Orden del home: hero → casos de uso → demo → conectores → precios.
- `js/explode3d.js` — la vista explosionada: rotación (0→0.32) y explosión por capas en el eje Y (0.32→0.95) dirigidas por scroll, con los labels/hotspots que aparecen cerca del final.
- `app/` — zona con sesión (`noindex`, no se enlaza desde el footer público): `app/index.html` es el acceso (Clerk: iniciar sesión o crear cuenta) con la sección «Lo que puedes pedirle» al lado, que antes vivía en la landing; al entrar manda a `app/panel/`, el panel interno del operador (Hoy, Agenda, Mi CRM, Avisos, Marketing, Cuenta), donde también viven vincular WhatsApp y conectar el CRM (`app/panel/setup.js`). `app/dashboard/` es "Qué puede consultar Comando", donde el operador elige qué campos de su CRM puede consultar y editar (ver `app/dashboard/README.md`, mock en `/app/dashboard/?mock=1`). `app/panel/README.md` es el contrato con el engine: qué endpoints existen y cuáles faltan; se revisa sin backend en `/app/panel/?mock=1` (y el paso de WhatsApp con `&wa=pending`).

## Cómo correrlo

Todos los assets y librerías están en `assets/` (no hay dependencias de CDN externos; funciona offline). Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000/
```

Debe servirse por HTTP (no abrir el `index.html` con `file://`), porque usa módulos ES e `importmap`.

## La demo «Pruébalo»: cómo alimentarla

- **Modelo (`functions/api/demo.js`).** Secretos en Cloudflare Pages → Settings → Variables and Secrets: `DEEPSEEK_API_KEY` (primer proveedor; modelo `deepseek-v4-flash`, cambiable con `DEEPSEEK_MODEL`) y `OPENAI_API_KEY` (respaldo; `gpt-4.1-mini`, cambiable con `OPENAI_MODEL`). Sin secretos, `GET /api/demo` responde `ok:false` y el navegador usa solo las reglas locales. El prompt de sistema se arma desde `docs/demo-data.json` (el CRM de ejemplo) más las reglas del catálogo de respuestas de comando-pro: para cambiar datos o comportamiento se edita ese JSON o `buildSystemPrompt`.
- **Registro y límite (opcional).** Un enlace KV llamado `DEMO_KV` (Settings → Functions → KV namespace bindings) activa el límite de 60 mensajes por IP y hora y guarda cada frase con `localMatched` (si las reglas locales la habrían entendido). Leer esas claves `log:*` es la forma de descubrir qué preguntan los visitantes y no cubre el modo local.
- **Reglas locales (`docs/demo-data.json` → `intents`).** Cada intención tiene `kw` (palabras clave normalizadas: minúsculas, sin tildes), opcionalmente `re` (expresión regular) y `needs` (al menos una de estas palabras). Se evalúan en orden; la primera que coincide gana. Para enseñarle una frase nueva, añade la palabra clave a la intención correcta y comprueba con `node tooling/demo-coverage.mjs "la frase"`; sin argumentos mide la cobertura contra el banco real de comando-pro.
- **Probar en local con la función:** crea `.dev.vars` (ignorado por git) con las dos claves y corre `npx wrangler pages dev . --port 8788`; `python3 -m http.server 8000` sirve la página sin función y la demo cae al modo local.

## Interesados: el formulario de precios y `/empezar/`

Quien deja su correo o su WhatsApp en el bloque de precios, o elige su CRM en `/empezar/`,
queda guardado en `functions/api/lead.js` (`POST /api/lead`). Antes el dato dependía de
que se abriera el cliente de correo del visitante: si no se abría, el interesado se perdía
sin que nadie lo supiera.

- **Para que guarde**: crear un KV y enlazarlo como `LEADS_KV` en Cloudflare Pages →
  Settings → Functions → KV namespace bindings. Es lo único imprescindible; sin él la
  función responde 503 y las dos páginas vuelven al `mailto:` de siempre, así que se puede
  desplegar sin configurar nada.
- **Para que avise** (opcional, cualquiera de los dos): `LEAD_WEBHOOK_URL` recibe un POST
  con el lead (Slack, n8n, Zapier); o `RESEND_API_KEY` más `LEAD_EMAIL_TO` y
  `LEAD_EMAIL_FROM` mandan el aviso por correo con Resend.
- **Para leerlos**: `npx wrangler kv key list --binding LEADS_KV --prefix lead:` y
  `npx wrangler kv key get "<clave>" --binding LEADS_KV`. Cada registro trae contacto, si
  es correo o WhatsApp, CRM, plan, desde qué página llegó, país y ciudad.
- **Protección**: campo trampa invisible (`website`) y límite de 8 envíos por IP y hora.
- **Probar en local**: `npx wrangler pages dev . --port 8788 --kv LEADS_KV`. Con
  `python3 -m http.server 8000` no hay función y se ve el camino de respaldo.

## Los precios que anuncia la página

La escalera de planes (comandos, contactos, CRM conectados y precio) no se
decide aquí: vive en la base del motor y se publica desde la consola de
administración de `comando-pro`. En la landing está escrita, en un solo sitio
—`PLAN_LADDER` y `ADDONS`, arriba de `js/pricing.js`—, y las frases que la
mencionan llevan marcas (`{gratis.comandos}`, `{basico.precio}`) que se rellenan
al pintar, en los tres idiomas.

Está escrita a propósito y no pedida al motor: una página de precios que espera
a la red puede salir vacía, y una página de precios vacía no vende nada y encima
parece rota. El razonamiento completo —y por qué hoy `GET /v1/public/plans` ni
siquiera trae los precios— está en la cabecera de `tooling/plans-check.mjs`.

Lo que evita que se quede vieja es esa comprobación:

```bash
node tooling/plans-check.mjs            # contra app.comando.pro
node tooling/plans-check.mjs --url http://localhost:3000/api
```

Compara lo escrito con lo que sirve el motor y falla si dejan de coincidir. El
flujo `.github/workflows/precios.yml` la corre a diario, no solo al desplegar:
entre dos despliegues de la landing pueden pasar semanas y el precio pudo
cambiar en cualquiera de ellas.

## Assets (`assets/`)

- `videos/benefits-v2.mp4` (+ `img/benefits-poster-v1.jpg`) — video de fondo de la sección "Modo automático" (personas usando Comando: gimnasio, auto, etc.). **Pendiente de aportar**: mientras no exista, se ve un fondo degradado. Recomendado: 1920×1080, H.264, sin audio, 10–20 s en loop, < 6 MB.
- `img/` — `comando-mark.svg` / `comando-logo.svg` (marca), favicon/webclip/og generados, íconos de features, marcos/fondos.
- `fonts/` — Inter y Space Grotesk (libres; sustituyen a Neue Haas Unica / Neue Machina bajo los mismos nombres de `font-family`), Digital 7 Mono, JetBrains Mono.
- `css/webflow.css` — stylesheet base exportado de Webflow.
- `vendor/` — GSAP 3.12.5 + Flip + ScrollTrigger, SplitText, ScrambleText, Lenis 0.2.28, dotLottie player, jQuery + webflow.js.

## Pantallas dibujadas en canvas (sin video)

- `js/hero2d.js` — preloader + hero en un solo `<canvas>` 2D: marco del iPhone, chat de WhatsApp (modo oscuro) y burbujas flotantes que sobresalen del teléfono. El operador tipea comandos en lenguaje natural (tomados de `comando-pro/docs/research/command-training-dataset`) y Comando responde; los guiones están en `SCENARIOS`/`ACTIVE`. La inclinación 3D es CSS (`perspective` + `rotateY`). Sin Three.js ni WebGL.
- `js/screens.js` — `window.drawFeatureScreen(ctx, w, h, frame)` dibuja la UI de features por frame (0–680 @30fps: boot → log de eventos → pipeline de automatización → sync CRM). los `<canvas class="screen-loop">` lo reproducen en loop; hoy se usa en el teléfono de la pantalla de acceso (`app/index.html`). La sección «Lo que puedes pedirle» (scrub por scroll en `#scroll-video`) se retiró de la landing y vive en `/app/`.

## Pendientes de marca

- El modelo `.glb` de la vista explosionada sigue siendo el hardware del sitio original (solo se recoloreó el botón verde al acento). Reemplazarlo por un visual propio.
- Links de redes del footer apuntan a `https://comando.pro`; el botón de acceso a `https://app.comando.pro`. Ajustar handles reales.
- `og:image` es ruta relativa; ponerla absoluta al desplegar.

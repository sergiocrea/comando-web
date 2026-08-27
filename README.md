# comando-web

Landing de Comando (plataforma de integraciones y automatizaciones para CRM). Estructura y motor de animaciones derivados de una réplica de landing; marca, copy, assets de pantalla y paleta son propios.

## Estructura

- `index.html` — markup de la página (estructura y clases del original, limpio de trackers/analytics/cookie-banner).
- `css/custom.css` — estilos utilitarios y de componentes (grid, botones con clip-path, hotspots del explode). El layout y las fuentes vienen del stylesheet de Webflow enlazado en `<head>`.
- `js/main.js` — lógica de UI reescrita: Lenis (smooth scroll), motor `data-reveal` (fade/block/text/scramble), líneas divisorias, grid canvas con spotlight (≥992px), fondo/morph de la barra de navegación, menú móvil, video de features scrubbeado por scroll en 5 fases + Lottie, countdown y globo del footer.
- `js/hero2d.js` — preloader (contador + salida escalonada) y el hero: teléfono con chat de WhatsApp dibujado en un canvas 2D.
- `js/explode3d.js` — la vista explosionada: rotación (0→0.32) y explosión por capas en el eje Y (0.32→0.95) dirigidas por scroll, con los labels/hotspots que aparecen cerca del final.

## Cómo correrlo

Todos los assets y librerías están en `assets/` (no hay dependencias de CDN externos; funciona offline). Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000/
```

Debe servirse por HTTP (no abrir el `index.html` con `file://`), porque usa módulos ES e `importmap`.

## Assets (`assets/`)

- `videos/benefits-v2.mp4` (+ `img/benefits-poster-v1.jpg`) — video de fondo de la sección "Modo automático" (personas usando Comando: gimnasio, auto, etc.). **Pendiente de aportar**: mientras no exista, se ve un fondo degradado. Recomendado: 1920×1080, H.264, sin audio, 10–20 s en loop, < 6 MB.
- `img/` — `comando-mark.svg` / `comando-logo.svg` (marca), favicon/webclip/og generados, íconos de features, marcos/fondos.
- `fonts/` — Inter y Space Grotesk (libres; sustituyen a Neue Haas Unica / Neue Machina bajo los mismos nombres de `font-family`), Digital 7 Mono, JetBrains Mono.
- `css/webflow.css` — stylesheet base exportado de Webflow.
- `vendor/` — GSAP 3.12.5 + Flip + ScrollTrigger, SplitText, ScrambleText, Lenis 0.2.28, dotLottie player, jQuery + webflow.js.

## Pantallas dibujadas en canvas (sin video)

- `js/hero2d.js` — preloader + hero en un solo `<canvas>` 2D: marco del iPhone, chat de WhatsApp (modo oscuro) y burbujas flotantes que sobresalen del teléfono. El operador tipea comandos en lenguaje natural (tomados de `comando-pro/docs/research/command-training-dataset`) y Comando responde; los guiones están en `SCENARIOS`/`ACTIVE`. La inclinación 3D es CSS (`perspective` + `rotateY`). Sin Three.js ni WebGL.
- `js/screens.js` — `window.drawFeatureScreen(ctx, w, h, frame)` dibuja la UI de features por frame (0–680 @30fps: boot → log de eventos → pipeline de automatización → sync CRM). `main.js` lo scrubbea por scroll en `#scroll-video` y los `<canvas class="screen-loop">` (bloques responsive) lo reproducen en loop.

## Pendientes de marca

- El modelo `.glb` de la vista explosionada sigue siendo el hardware del sitio original (solo se recoloreó el botón verde al acento). Reemplazarlo por un visual propio.
- Links de redes del footer apuntan a `https://comando.pro`; el botón de acceso a `https://app.comando.pro`. Ajustar handles reales.
- `og:image` es ruta relativa; ponerla absoluta al desplegar.

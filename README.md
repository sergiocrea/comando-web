# comando-web

Réplica de la landing de neoconda.com con las mismas animaciones y efectos.

## Estructura

- `index.html` — markup de la página (estructura y clases del original, limpio de trackers/analytics/cookie-banner).
- `css/custom.css` — estilos utilitarios y de componentes (grid, botones con clip-path, hotspots del explode). El layout y las fuentes vienen del stylesheet de Webflow enlazado en `<head>`.
- `js/main.js` — lógica de UI reescrita: Lenis (smooth scroll), motor `data-reveal` (fade/block/text/scramble), líneas divisorias, grid canvas con spotlight (≥992px), fondo/morph de la barra de navegación, menú móvil, video de features scrubbeado por scroll en 5 fases + Lottie, countdown y globo del footer.
- `js/hero3d.js` — preloader (contador ponderado por la carga del modelo + salida escalonada) y la escena Three.js del héroe: el dispositivo que flota, hace tilt/float con el mouse, gira y "vuela" hacia la sección About al hacer scroll, con crossfade de video (logo → terminal) en su pantalla.
- `js/explode3d.js` — la vista explosionada: rotación (0→0.32) y explosión por capas en el eje Y (0.32→0.95) dirigidas por scroll, con los labels/hotspots que aparecen cerca del final.

## Cómo correrlo

Los assets pesados (fuentes, imágenes, videos, modelos `.glb`, HDRI, Lottie) se enlazan desde los CDN públicos originales, así que hace falta conexión a internet. Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# luego abrir http://localhost:8000/
```

Debe servirse por HTTP (no abrir el `index.html` con `file://`), porque usa módulos ES e `importmap`.

## Librerías (desde CDN)

GSAP 3.12.5 + Flip + ScrollTrigger, SplitText, ScrambleText, Lenis 0.2.28, Three.js 0.160.0 (+ addons: GLTFLoader, MeshoptDecoder, EXRLoader), dotLottie player, y el runtime de Webflow (jQuery + webflow.js) para el layout base y el nav.

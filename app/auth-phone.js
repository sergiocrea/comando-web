/**
 * El teléfono de la pantalla de acceso: un día de anuncios, contado por WhatsApp.
 *
 * Dibuja en un canvas 2D una conversación real: Comando avisa el gasto de ayer,
 * el operador pregunta qué campaña gasta sin traer, Comando señala la campaña en
 * rojo, propone pausarla y mover su presupuesto, espera el CONFIRMAR y enseña el
 * resultado. Es la misma historia que cuenta la columna de al lado, pero vista
 * como la ve el operador: burbujas, horas y doble visto.
 *
 * Tres cosas a tener en cuenta si se toca:
 *
 * 1. Aquí no hay ni una frase escrita. El guion es un parámetro: `guionAnuncios()`
 *    lo arma con `t()` desde `app/strings.js` (claves `screens.*`, en es/en/pt) y
 *    los datos del ejemplo —nombres de campaña, montos— son datos, no texto, así
 *    que se formatean con `Intl` y no se traducen. Otra pantalla puede pasar su
 *    propio guion con la misma forma.
 * 2. El negrita se escribe como en WhatsApp, con `*asteriscos*`, y se dibuja con
 *    peso 700. Así el texto en `strings.js` se lee igual que el mensaje real.
 * 3. Con `prefers-reduced-motion: reduce` no hay bucle ni rAF: se pinta un solo
 *    fotograma con la conversación terminada, que es la que se entiende sola.
 */
import { t, localeTag } from '/app/i18n.js?v=1';

/* --------------------------------------------------------------- el guion */

/* Los datos del ejemplo. No se traducen: un nombre de campaña y un monto son
   datos del operador, no texto de la pantalla. */
const EJEMPLO = {
  quema: 'Remarketing',
  gana: 'Leads Lima',
  gasto: 84,
  leads: 12,
  costo: 7,
  gastoQuema: 26,
  frecuencia: 4.8,
  costoGana: 4.9,
  costoNuevo: 5.4,
};

/** El guion de anuncios, en el idioma vigente. Se vuelve a pedir al cambiarlo. */
export function guionAnuncios() {
  const num = (n, d) => new Intl.NumberFormat(localeTag(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  /* El signo lo pone el idioma («US$ 84» en castellano, «$84» en inglés). */
  const usd = (n, d = 0) => t('screens.usd', { n: num(n, d) });
  const v = {
    quema: EJEMPLO.quema,
    gana: EJEMPLO.gana,
    gasto: usd(EJEMPLO.gasto),
    leads: EJEMPLO.leads,
    costo: usd(EJEMPLO.costo, 2),
    gastoQuema: usd(EJEMPLO.gastoQuema),
    frecuencia: num(EJEMPLO.frecuencia, 1),
    costoGana: usd(EJEMPLO.costoGana, 2),
    costoNuevo: usd(EJEMPLO.costoNuevo, 2),
  };
  return {
    nombre: 'Comando',
    estado: t('screens.status'),
    dia: t('screens.today'),
    entrada: t('screens.input'),
    alt: t('screens.alt'),
    mensajes: [
      { de: 'comando', hora: '8:02', texto: t('screens.m1', v) },
      { de: 'operador', hora: '8:03', texto: t('screens.m2') },
      { de: 'comando', hora: '8:03', texto: t('screens.m3', v) },
      { de: 'comando', hora: '8:04', texto: t('screens.m4', v) },
      { de: 'operador', hora: '8:04', texto: t('screens.m5') },
      { de: 'comando', hora: '8:05', texto: t('screens.m6', v) },
    ],
  };
}

/* ------------------------------------------------------------------ pintar */

const C = {
  borde: '#3a3a3d', cuerpoA: '#242426', cuerpoB: '#141416',
  fondo: '#0B141A', barra: '#1F2C34', linea: 'rgba(233,237,239,.08)',
  entra: '#202C33', sale: '#005C4B',
  texto: '#E9EDEF', suave: '#8696A0', clave: '#5BE49B', visto: '#53BDEB',
  marca: '#00A76F',
};
const SANS = '"Public Sans", Inter, system-ui, -apple-system, sans-serif';

/* Tiempos, en segundos. */
const APARECE = 0.28;  // la burbuja entra
const PIENSA = 0.8;    // los tres puntos de Comando
const ESCRIBE = 0.8;   // el operador escribiendo en la barra
const ESPERA = 2.2;    // el final se queda quieto para poder leerlo
const FUNDE = 0.7;     // y se va

const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = (p) => 1 - (1 - p) * (1 - p);

/** `*negrita*` → trozos con peso. Igual que lo escribe WhatsApp. */
function trozos(texto) {
  const salida = [];
  const re = /\*([^*]+)\*/g;
  let i = 0, m;
  while ((m = re.exec(texto))) {
    if (m.index > i) salida.push({ s: texto.slice(i, m.index), n: false });
    salida.push({ s: m[1], n: true });
    i = m.index + m[0].length;
  }
  if (i < texto.length) salida.push({ s: texto.slice(i), n: false });
  return salida;
}

/* Un punto o una coma nunca abren línea: se quedan pegados a su palabra. */
const PEGA = /^[.,;:!?…·)\]»”"']+$/;

/** Parte el texto en líneas de trozos que caben en `ancho`. */
function lineas(ctx, texto, ancho, fuente) {
  const salida = [];
  for (const parrafo of texto.split('\n')) {
    let linea = [], ancho0 = 0;
    const cierra = () => {
      while (linea.length && /^[ \t]+$/.test(linea[linea.length - 1].s)) { ancho0 -= linea.pop().w; }
      salida.push({ trozos: linea, w: ancho0 });
    };
    for (const trozo of trozos(parrafo)) {
      ctx.font = fuente(trozo.n);
      for (const parte of trozo.s.split(/([ \t]+)/)) {
        if (!parte) continue;
        const w = ctx.measureText(parte).width;
        if (/^[ \t]+$/.test(parte)) { if (linea.length) { linea.push({ s: parte, n: trozo.n, w }); ancho0 += w; } continue; }
        if (ancho0 + w > ancho && linea.length && !PEGA.test(parte)) { cierra(); linea = []; ancho0 = 0; }
        linea.push({ s: parte, n: trozo.n, w });
        ancho0 += w;
      }
    }
    cierra();
  }
  return salida;
}

/** El aparato: marco, cristal, isla y barra de inicio. Devuelve el cristal. */
function aparato(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const L = h * 0.965, W = L * (71.6 / 146.7), bx = (w - W) / 2, by = (h - L) / 2, r = W * 0.16;
  ctx.fillStyle = C.borde; ctx.beginPath(); ctx.roundRect(bx - 3, by - 3, W + 6, L + 6, r + 3); ctx.fill();
  const g = ctx.createLinearGradient(0, by, 0, by + L);
  g.addColorStop(0, C.cuerpoA); g.addColorStop(1, C.cuerpoB);
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx, by, W, L, r); ctx.fill();
  const p = W * 0.032, sx = bx + p, sy = by + p, sw = W - p * 2, sh = L - p * 2, sr = r - p;
  ctx.fillStyle = C.fondo; ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, sr); ctx.fill();
  // botones laterales
  ctx.fillStyle = '#4a4a4d';
  ctx.fillRect(bx + W + 3, by + L * 0.28, 2.5, L * 0.13);
  ctx.fillRect(bx - 5.5, by + L * 0.22, 2.5, L * 0.05);
  ctx.fillRect(bx - 5.5, by + L * 0.31, 2.5, L * 0.09);
  ctx.fillRect(bx - 5.5, by + L * 0.42, 2.5, L * 0.09);
  return { sx, sy, sw, sh, sr };
}

/** El sello de Comando, en pequeño, para la foto de la conversación. */
function sello(ctx, x, y, d) {
  ctx.save();
  ctx.translate(x - d / 2, y - d / 2); ctx.scale(d / 64, d / 64);
  ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(22, 20); ctx.lineTo(36, 32); ctx.lineTo(22, 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 45); ctx.lineTo(50, 45); ctx.stroke();
  ctx.restore();
}

/** Doble visto de WhatsApp. */
function visto(ctx, x, y, s, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = s * 0.16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const dx of [0, s * 0.34]) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + s * 0.3); ctx.lineTo(x + dx + s * 0.24, y + s * 0.56); ctx.lineTo(x + dx + s * 0.62, y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Mide el guion para un cristal dado: burbujas, alturas y tiempos.
 * Se calcula una vez por tamaño, no en cada fotograma.
 */
function medir(ctx, s, guion) {
  const fs = s.sw * 0.068;                       // el cuerpo del mensaje
  const fsMeta = Math.max(s.sw * 0.044, 8);      // hora y estado
  const fuente = (n) => `${n ? 700 : 400} ${fs}px ${SANS}`;
  const lh = fs * 1.32;
  const pad = s.sw * 0.035;
  const gap = s.sw * 0.028;
  const maxT = s.sw * 0.90 - pad * 2;            // el texto más ancho posible
  const items = [];
  let y = 0, t0 = 0.5;
  for (const m of guion.mensajes) {
    const ls = lineas(ctx, m.texto, maxT, fuente);
    const anchoT = Math.max(...ls.map((l) => l.w));
    ctx.font = `400 ${fsMeta}px ${SANS}`;
    const anchoHora = ctx.measureText(m.hora).width + (m.de === 'operador' ? fsMeta * 1.4 : 0);
    const bw = Math.min(s.sw * 0.90, Math.max(anchoT, anchoHora + fs) + pad * 2);
    const bh = ls.length * lh + pad * 1.9 + fsMeta;
    const piensa = m.de === 'comando' ? PIENSA : ESCRIBE;
    const letras = m.texto.replace(/\*/g, '').length;
    const lee = lim(1.1 + letras / 32, 1.4, 2.8);
    items.push({ ...m, ls, bw, bh, y, tPiensa: t0, tEntra: t0 + piensa, pad });
    t0 += piensa + lee;
    y += bh + gap;
  }
  return {
    fs, fsMeta, fuente, lh, pad, items,
    alturaPuntos: fs * 2.4,          // la burbuja de los tres puntos
    fin: t0 + ESPERA,                // la conversación completa, quieta
    total: t0 + ESPERA + FUNDE,      // y el bucle vuelve a empezar
  };
}

/** La barra de arriba: con quién habla. */
function barraArriba(ctx, s, L, guion, h) {
  const y = s.sy;
  ctx.save();
  ctx.fillStyle = C.barra;
  ctx.beginPath(); ctx.roundRect(s.sx, y, s.sw, h, [s.sr, s.sr, 0, 0]); ctx.fill();
  ctx.fillStyle = C.linea; ctx.fillRect(s.sx, y + h - 0.6, s.sw, 0.6);
  // isla dinámica, dentro de la barra
  ctx.fillStyle = '#000'; ctx.beginPath();
  ctx.roundRect(s.sx + s.sw / 2 - s.sw * 0.15, y + h * 0.12, s.sw * 0.3, h * 0.23, 20); ctx.fill();
  const cy = y + h * 0.68;
  // flecha de volver
  ctx.strokeStyle = C.texto; ctx.lineWidth = s.sw * 0.009; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const fx = s.sx + s.sw * 0.055;
  ctx.beginPath(); ctx.moveTo(fx + s.sw * 0.014, cy - s.sw * 0.018); ctx.lineTo(fx, cy); ctx.lineTo(fx + s.sw * 0.014, cy + s.sw * 0.018); ctx.stroke();
  // foto
  const d = s.sw * 0.1, ax = s.sx + s.sw * 0.14;
  ctx.fillStyle = C.marca; ctx.beginPath(); ctx.arc(ax, cy, d / 2, 0, Math.PI * 2); ctx.fill();
  sello(ctx, ax, cy, d * 0.92);
  // nombre y estado
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.texto; ctx.font = `700 ${L.fs * 0.94}px ${SANS}`;
  ctx.fillText(guion.nombre, ax + d * 0.78, cy - L.fsMeta * 0.25);
  ctx.fillStyle = C.suave; ctx.font = `400 ${L.fsMeta}px ${SANS}`;
  ctx.fillText(guion.estado, ax + d * 0.78, cy + L.fsMeta * 1.15);
  // los tres puntitos del menú
  ctx.fillStyle = C.suave;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(s.sx + s.sw * 0.93, cy - s.sw * 0.022 + i * s.sw * 0.022, s.sw * 0.007, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/** La barra de abajo: lo que el operador está escribiendo. */
function barraAbajo(ctx, s, L, guion, escribiendo, h) {
  const y = s.sy + s.sh - h;
  ctx.save();
  ctx.fillStyle = C.fondo; ctx.beginPath(); ctx.roundRect(s.sx, y - 1, s.sw, h + 1, [0, 0, s.sr, s.sr]); ctx.fill();
  const ph = h * 0.5, px = s.sx + s.sw * 0.05, pw = s.sw * 0.72, py = y + h * 0.16;
  ctx.fillStyle = C.barra; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = `400 ${L.fs * 0.92}px ${SANS}`;
  ctx.fillStyle = escribiendo ? C.texto : C.suave;
  const texto = escribiendo || guion.entrada;
  let corte = texto;
  if (ctx.measureText(corte).width > pw - ph * 0.9) {
    while (ctx.measureText(corte + '…').width > pw - ph * 0.9 && corte.length > 1) corte = corte.slice(0, -1);
    corte += '…';
  }
  ctx.fillText(corte, px + ph * 0.45, py + ph / 2 + 0.5);
  if (escribiendo) { // el cursor, al final de lo escrito
    const cx = px + ph * 0.45 + ctx.measureText(corte).width + 1.5;
    ctx.fillStyle = C.clave; ctx.fillRect(cx, py + ph * 0.24, 1.4, ph * 0.52);
  }
  // enviar
  const bd = h * 0.56, bx = s.sx + s.sw * 0.875, by = y + h * 0.16 + ph / 2;
  ctx.fillStyle = C.marca; ctx.beginPath(); ctx.arc(bx, by, bd / 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath();
  ctx.moveTo(bx - bd * 0.17, by - bd * 0.2); ctx.lineTo(bx + bd * 0.22, by); ctx.lineTo(bx - bd * 0.17, by + bd * 0.2);
  ctx.closePath(); ctx.fill();
  // barra de inicio
  ctx.fillStyle = 'rgba(233,237,239,.6)';
  ctx.beginPath(); ctx.roundRect(s.sx + s.sw / 2 - s.sw * 0.17, s.sy + s.sh - s.sh * 0.014, s.sw * 0.34, 2.2, 2); ctx.fill();
  ctx.restore();
}

/** Una burbuja con su texto, su hora y, si sale, su doble visto. */
function burbuja(ctx, L, it, x, y, alfa) {
  const sale = it.de === 'operador';
  const r = L.fs * 0.62;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.fillStyle = sale ? C.sale : C.entra;
  ctx.beginPath();
  ctx.roundRect(x, y, it.bw, it.bh, sale ? [r, r, r * 0.25, r] : [r, r, r, r * 0.25]);
  ctx.fill();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let ty = y + it.pad + L.fs * 0.92;
  for (const linea of it.ls) {
    let tx = x + it.pad;
    for (const trozo of linea.trozos) {
      ctx.font = L.fuente(trozo.n);
      ctx.fillStyle = trozo.n ? (sale ? '#fff' : C.clave) : C.texto;
      ctx.fillText(trozo.s, tx, ty);
      tx += trozo.w;
    }
    ty += L.lh;
  }
  ctx.font = `400 ${L.fsMeta}px ${SANS}`;
  ctx.fillStyle = sale ? 'rgba(233,237,239,.6)' : C.suave;
  const anchoHora = ctx.measureText(it.hora).width;
  const hx = x + it.bw - it.pad - anchoHora - (sale ? L.fsMeta * 1.35 : 0);
  const hy = y + it.bh - it.pad * 0.75;
  ctx.fillText(it.hora, hx, hy);
  if (sale) visto(ctx, hx + anchoHora + L.fsMeta * 0.35, hy - L.fsMeta * 0.62, L.fsMeta, C.visto);
  ctx.restore();
}

/** Los tres puntos de «está escribiendo». */
function puntos(ctx, L, x, y, tiempo, alfa) {
  const w = L.fs * 3.1, h = L.alturaPuntos, r = L.fs * 0.62;
  ctx.save(); ctx.globalAlpha = alfa;
  ctx.fillStyle = C.entra; ctx.beginPath(); ctx.roundRect(x, y, w, h, [r, r, r, r * 0.25]); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const p = (Math.sin(tiempo * 6 - i * 0.7) + 1) / 2;
    ctx.globalAlpha = alfa * (0.35 + p * 0.55);
    ctx.fillStyle = C.suave;
    ctx.beginPath(); ctx.arc(x + w * 0.28 + i * L.fs * 0.62, y + h / 2, L.fs * 0.17, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Un fotograma. `tiempo` en segundos dentro del bucle; `est` guarda el
 * desplazamiento de la conversación para que suba con suavidad.
 */
function fotograma(ctx, guion, L, s, tiempo, est, dt) {
  const hArriba = s.sh * 0.082, hAbajo = s.sh * 0.085;
  const aire = s.sh * 0.008; // un poco de fondo antes de que el chat pase por debajo
  const vista = { x: s.sx, y: s.sy + hArriba + aire, w: s.sw, h: s.sh - hArriba - hAbajo - aire };

  // Qué se ve, hasta dónde llega la conversación y quién está escribiendo.
  let fondo = 0, pensando = null, escribiendo = '';
  for (const it of L.items) {
    if (tiempo >= it.tEntra) { fondo = it.y + it.bh; continue; }
    if (tiempo >= it.tPiensa) {
      if (it.de === 'comando') { pensando = it; fondo = it.y + L.alturaPuntos; }
      else { // el operador escribe en la barra de abajo, no en una burbuja
        const p = lim((tiempo - it.tPiensa) / (it.tEntra - it.tPiensa), 0, 1);
        const limpio = it.texto.replace(/\*/g, '');
        escribiendo = limpio.slice(0, Math.ceil(limpio.length * p));
      }
    }
    break;
  }

  barraArriba(ctx, s, L, guion, hArriba);
  barraAbajo(ctx, s, L, guion, escribiendo, hAbajo);

  ctx.save();
  ctx.beginPath(); ctx.rect(vista.x, vista.y, vista.w, vista.h); ctx.clip();

  const chip = L.fs * 2.1;
  const meta = fondo + chip - vista.h;
  if (est.t !== undefined && tiempo < est.t) est.off = null; // vuelta al inicio
  est.t = tiempo;
  if (est.off === null || dt === null) est.off = meta;
  else est.off += (meta - est.off) * (1 - Math.exp(-dt * 9));

  const y0 = vista.y + chip - est.off;
  const fin = tiempo > L.fin ? lim((L.total - tiempo) / FUNDE, 0, 1) : 1;

  // el chip del día viaja con la conversación
  ctx.globalAlpha = fin * lim(tiempo / 0.5, 0, 1);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${L.fsMeta}px ${SANS}`;
  const anchoChip = ctx.measureText(guion.dia).width + L.fs * 1.4;
  ctx.fillStyle = C.barra;
  ctx.beginPath(); ctx.roundRect(vista.x + vista.w / 2 - anchoChip / 2, y0 - chip * 0.82, anchoChip, chip * 0.6, chip * 0.3); ctx.fill();
  ctx.fillStyle = C.suave;
  ctx.fillText(guion.dia, vista.x + vista.w / 2, y0 - chip * 0.5);

  for (const it of L.items) {
    const sale = it.de === 'operador';
    const x = sale ? vista.x + vista.w - it.bw - vista.w * 0.05 : vista.x + vista.w * 0.05;
    if (tiempo >= it.tEntra) {
      const p = suave(lim((tiempo - it.tEntra) / APARECE, 0, 1));
      burbuja(ctx, L, it, x, y0 + it.y + (1 - p) * L.fs * 0.9, p * fin);
    } else if (it === pensando) {
      const p = suave(lim((tiempo - it.tPiensa) / 0.25, 0, 1));
      puntos(ctx, L, vista.x + vista.w * 0.05, y0 + it.y, tiempo, p * fin);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ montar */

/**
 * Pone el teléfono dentro de `host` y lo anima. Devuelve `{ repintar, parar }`.
 * El canvas se crea aquí: sin JS el hueco no existe y la columna se cierra sola.
 */
export function montarTelefono(host, guion) {
  if (!host) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'auth-phone-canvas';
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  host.removeAttribute('hidden');
  const ctx = canvas.getContext('2d');
  if (!ctx) { host.setAttribute('hidden', ''); return null; }

  const quieto = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const RAZON = 684 / 360; // el alto del dibujo respecto a su ancho
  let L = null, s = null, ancho = 0, alto = 0;
  const est = { off: null };

  function tamano() {
    const w = Math.round(host.clientWidth || 0);
    if (!w) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const h = Math.round(w * RAZON);
    if (w !== ancho || h !== alto || !L) {
      ancho = w; alto = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      // Los atributos van en píxeles de pantalla; el tamaño en la página lo pone
      // la hoja, y esto lo repite para que no se vea al doble si tarda en llegar.
      canvas.style.width = '100%'; canvas.style.height = 'auto';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s = null;
    }
    return true;
  }

  function preparar() {
    s = aparato(ctx, ancho, alto);
    L = medir(ctx, s, guion);
    est.off = null;
  }

  function pinta(tiempo, dt) {
    if (!tamano()) return;
    if (!s || !L) preparar();
    aparato(ctx, ancho, alto);
    fotograma(ctx, guion, L, s, tiempo, est, dt);
  }

  /** El fotograma quieto: la conversación entera, ya terminada. */
  function quietoPinta() {
    if (!tamano()) return;
    preparar();
    pinta(L.fin - 0.2, null);
  }

  let rafId = 0, t0 = 0, ultimo = 0;
  function bucle(ahora) {
    rafId = requestAnimationFrame(bucle);
    if (host.clientWidth === 0) return;
    if (ahora - ultimo < 48) return; // ~20 fps: de sobra para un chat
    const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 0.25) : null;
    ultimo = ahora;
    if (!t0) t0 = ahora;
    if (!L) { if (!tamano()) return; preparar(); }
    pinta(((ahora - t0) / 1000) % L.total, dt);
  }

  function arranca() {
    if (quieto && quieto.matches) { quietoPinta(); return; }
    if (!rafId) rafId = requestAnimationFrame(bucle);
  }
  function para() { if (rafId) { cancelAnimationFrame(rafId); rafId = 0; ultimo = 0; t0 = 0; } }

  // Fuera de pantalla no se anima nada: ni un fotograma ni un rAF. En móvil el
  // teléfono no se muestra (`display: none`) y esto no arranca nunca.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) arranca(); else para(); }), { threshold: 0.01 }).observe(canvas);
  }
  if ('ResizeObserver' in window) {
    let pendiente = 0;
    new ResizeObserver(() => {
      clearTimeout(pendiente);
      pendiente = setTimeout(() => { if (tamano()) { preparar(); if (quieto && quieto.matches) quietoPinta(); } }, 150);
    }).observe(host);
  }
  if (quieto && quieto.addEventListener) {
    quieto.addEventListener('change', () => { para(); arranca(); });
  }

  const salida = {
    /** Otro guion (otro idioma) sobre el mismo teléfono: vuelve a empezar. */
    repintar(nuevo) {
      if (nuevo) guion = nuevo;
      canvas.setAttribute('aria-label', guion.alt || '');
      t0 = 0; ultimo = 0;
      if (!tamano()) return;
      preparar();
      if (quieto && quieto.matches) quietoPinta();
    },
    parar: para,
  };
  salida.repintar(guion);
  // Las fuentes del texto llegan por red: medir antes las haría con otra.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (L) { preparar(); if (quieto && quieto.matches) quietoPinta(); } });
  arranca();
  return salida;
}

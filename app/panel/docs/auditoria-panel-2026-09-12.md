# Auditoría UX/UI del panel del operador — 12 de septiembre de 2026

**Qué se auditó.** El panel tal como está publicado en el commit `a21ca29` de `comando-web`
(HEAD del 12-sep: «panel(marketing): las 3 Q's y el objetivo del negocio»), servido como
instantánea estática y abierto con Chrome real (Playwright, `channel: 'chrome'`) en modo
mock (`?mock=1`), a 1440×900 y 390×844. Variantes: `wa=pending`, `moneda=none`,
`rol=agent`, `mk=sin|primera|bloqueado|limitado|marcada`, idiomas EN y PT. Se pulsó cada
acción distinta de cada sección (113 acciones, con los «más» abiertos), se capturó consola y
`pageerror`, y se midieron posiciones, tamaños de toque y contraste.

**Contexto.** Mientras se auditaba, el árbol de trabajo ya estaba siendo reescrito hacia la
hoja + chat + menú arriba (`hoja.js`, `chat.js`, `index.html` con `id="menu"`). Este documento
describe el estado anterior a ese cambio, que es el que hoy ve un operador.

**Capturas.** `/Users/sergiomini/.claude/jobs/f1c51a93/tmp/audit-panel/` (`<sección>-desk-full.png`,
`<sección>-mob-full.png`, `<sección>-<viewport>-vp.png` = primer pantallazo, más las de
estados al pulsar que se citan abajo). Métricas en `metrics.json`; recorrido de clics en
`interaccion.log` e `interaccion-cuenta.log`.

**Lo que está bien y conviene conservar.** Cero errores de JavaScript y cero peticiones fallidas
en 18 cargas; ningún «undefined», «NaN» ni «[object Object]»; sin scroll horizontal salvo un
caso (H2); estados vacíos honestos («Todavía sin conectar», «Trayendo la primera copia»,
«Facebook retiró el permiso (META_190)»); el flujo de la consola funciona de punta a punta
(frase → «Pensando…» → plan en verde → CONFIRMAR → «Listo: etiqueta VIP en 12 registros»,
y el segundo factor con caja de código); foco de teclado visible; `prefers-reduced-motion`
respetado; la vista Mes de Agenda es correcta.

---

## 1. Inventario

### 1.1 Números por sección (escritorio 1440×900; móvil 390×844)

| Sección | Tarjetas | Filas | Controles¹ | Palabras | Alto escritorio | Alto móvil | Formularios / campos |
|---|---:|---:|---:|---:|---:|---:|---|
| Hoy | 8 | 19 | 81 | 647 | 3 138 px (3,5 pantallas) | 5 151 px (6,1) | 1 (consola) / 1 |
| Resumen (`#/crm`) | 6 | 12 | 39 | 443 | 2 363 px (2,6) | 3 744 px (4,4) | 0 |
| Agenda | 1 (+ vista Mes) | 15 | 42 | 204 | 1 882 px (2,1) | 2 806 px (3,3) | 0 |
| Automatizaciones (`#/avisos`) | 3 | 30 | 53 | 522 | 3 781 px (4,2) | 6 011 px (7,1) | 2 / 6 |
| Marketing | 13 | 15 | 32 | 1 045 | 4 110 px (4,6) | 6 013 px (7,1) | 1 (objetivo) / 10 |
| Cuenta | 6 | 17 | 36 | 329 | 2 490 px (2,8) | 4 587 px (5,4) | 0 (+2 en línea: moneda, número) |
| **Total** | **37** | **108** | **283** | **3 190** | | | |

¹ Botones, enlaces-botón, `data-act`, pestañas y `summary`, contando los plegados en «más».
De los 283: **141 son `cmd:run`** (mandan una frase a la consola), **49 son «más»**
(`<details>`) que esconden otras 100 acciones, 12 van a `wa.me`.

### 1.2 Pantallas y estados que hay que aprender

- 6 secciones + 1 vista (Agenda › Mes) + 1 diálogo global (la consola como `<dialog>` en
  las 5 secciones que no son Hoy) + 3 pantallas de puesta en marcha (Cuenta · WhatsApp · CRM)
  + 2 formularios en línea (moneda, cambiar número) + 3 diálogos de confirmación de tres
  tipos distintos (Meta: propio; HubSpot: `window.confirm`; Rechazar: `window.prompt`)
  = **16 estados**.
- Cromo fijo: barra lateral de 280 px (6 entradas + insignia «13»), cabecera de 80 px
  (idioma, «Escribir a Comando» → `wa.me`, avatar), banner de mock de 36 px. En móvil: barra
  inferior de 68 px con **6 pestañas de 64×55 px** («Automatizaciones» sale truncado como
  «Automatiz…»).
- Tipografía: Public Sans 14 px; h1 24 px; h2 de tarjeta 18 px; fila 14/13 px; chips 12 px;
  11 px en la cuadrícula de conectores y en los rótulos del filtro de Marketing.
- Fila media: 77–115 px en escritorio, 122–170 px en móvil (icono emoji + título + subtítulo
  + botón + «más»). Una hoja de cálculo mete 3–5 filas en ese espacio.

### 1.3 Lo que aparece dos (o tres) veces

| Dato | Dónde |
|---|---|
| «Plata en juego · S/ 9 870 000 · 41 negocios» | Hoy (KPI) y Resumen (KPI) |
| «Qué revisar en tu CRM» | Hoy (3 barras + «Ver todo») y Resumen (12 filas) |
| Tareas vencidas y de hoy | Hoy (5 filas), Agenda (las mismas 5), KPI «Para hoy» |
| El número 13 | Insignia del menú, KPI «Te esperan», banner («Tienes 13 cosas»), subtítulo de la bandeja |
| «Escribir a Comando» (mismo `wa.me` con frase) | Cabecera y banner de Hoy; + «Pedir por WhatsApp», «Nuevo recordatorio», «Preguntar por WhatsApp» |
| Plan esperando CONFIRMAR | Log de la consola (botón CONFIRMAR) y fila de la bandeja (botón «Confirmar») |
| Aviso «1 dueño en el CRM, 4 personas en Comando» | Resumen y Cuenta › Tu equipo |
| Las 4 cuentas publicitarias | Cuenta (4 filas «Ver campañas»), Marketing › filtro (4 casillas con ficha completa), Marketing › «Tus cuentas publicitarias» (4 filas) |
| «No se suman monedas» | Subtítulo de cada bloque por moneda, nota entre bloques, subtítulo de Campañas |

---

## 2. Hallazgos

Severidad: **alta** = impide o falsea la tarea principal; **media** = cuesta, confunde o
contradice un principio del propio README; **baja** = fricción o ruido.

| # | Sev. | Sección | Qué pasa | Cómo reproducirlo | Captura |
|---|---|---|---|---|---|
| H1 | alta | Hoy, Agenda, Automatizaciones, Cuenta | **29 botones mandan una frase incompleta como comando.** `waBtn` usa `cmd:run` (envía al instante) con frases que terminan en «para », «a », «: », «avísame cuando », «para mí »: Mover ×13, Cambiar ×6, Cambiar día u hora ×4, Cambiar rol ×4, Nuevo aviso, Enseñarle algo. El catálogo de skills sí distingue frase parcial (`cmd:fill`, la deja en el input); las filas no. En real gasta un comando del cupo y obliga al motor a preguntar. | Agenda › cualquier fila › más › **Mover** → se abre la consola con «mueve «Mandar contrato a Familia Torres» para» ya enviado y «Pensando…». | `interaccion.log` (Agenda, Automatizaciones); `hoy-mob-mas-abierto.png` |
| H2 | alta | Marketing (móvil) | **El desplegable de cuentas se sale de la pantalla** (panel de 340 px anclado a x = 158 en un viewport de 390 px): las fichas se cortan y aparece scroll horizontal. | 390 px › Marketing › pulsar «4 de 4 cuentas». | `mk-cuentas-mob.png` |
| H3 | alta | Hoy | **La bandeja «Qué hago ahora» —la razón de ser de la portada— queda bajo el pliegue.** Empieza a 825 px en escritorio (solo asoma el título) y a 1 188 px en móvil (1,4 pantallas). Antes van: banner oscuro de 239 px con ilustración y CTA repetido, 3 KPI y la consola. En móvil las 14 filas ocupan otros 2 200 px. | Abrir `#/hoy` y no hacer scroll. | `hoy-desk-vp.png`, `hoy-mob-vp.png`, `hoy-mob-full.png` |
| H4 | alta | Marketing, consola (modo demo) | **El modo `?mock=1` miente.** Cambiar el periodo («Últimos 90 días», «Todo 2026…»), «Traer historial» y «Quitar este objetivo» revientan con un toast crudo: «ctx.api.marketingOverviewBetween is not a function», «…marketingImportHistory…», «…marketingTarget…» (el mock no implementa tres métodos que el cliente real sí tiene). Y **toda frase** que no sea «cuánta plata hay» devuelve el mismo plan enlatado «Etiquetar VIP → 12 contactos»: «Deshacer lo último», «Por qué», «Ver la lista» → PIN de seguridad porque la frase contiene «monto». Es la superficie con la que se demuestra y prueba el panel; y el patrón `toast(e.message)` enseña excepciones sin traducir también en real. | Marketing › «Últimos 30 días» › «Últimos 90 días». Resumen › «Pedir la lista». | `consola-global-desk.png` (muestra el PIN pedido para una pregunta de solo lectura) |
| M1 | media | Hoy | **Dos «Confirmar» para dos planes distintos a la vez.** El del log de la consola está ligado a su turno; el de la fila de la bandeja manda el texto «CONFIRMAR» suelto, que confirma el último plan pendiente del motor, no necesariamente el que la fila describe («Etiquetar VIP → 23 contactos»). | Hoy › escribir «etiqueta VIP a los contactos de Torres del Parque» › Enviar: quedan dos botones de confirmar a 300 px de distancia. | `hoy-consola-plan-desk.png` |
| M2 | media | Todas menos Hoy | **141 botones abren un modal con la consola encima de la sección.** «Ver la lista», «Pedir la lista», «Apagar», «Activar», «Ver sus leads», «Olvidar»… El resultado (una lista de negocios, por ejemplo) se lee dentro de un `<dialog>` de 720 px sin relación visual con la pantalla de atrás, con un botón «Cancelar» que no cancela nada (cierra) y en móvil tapa toda la sección. Es exactamente lo que resuelve un chat lateral persistente. | Resumen › «Ver la lista». | `consola-global-desk.png`, `consola-global-mob.png` |
| M3 | media | Cuenta › Tu CRM | **Cuadrícula de 11 conectores con 9 deshabilitados** («Próximamente» ×8, «Desconecta el CRM activo»); en móvil ocupa 1,5 pantallas. Contradice README §7 y la eliminación decidida el 5-sep («catálogo de 11 conectores futuros: información del ingeniero»). El azulejo «Google Sheets · Conectado», al pulsarlo, **abre el OAuth de Nango** en vez de mostrar la hoja conectada. | Cuenta › pulsar «Google Sheets». | `cuenta-mob-crm.png`, `cuenta-desk-full.png` |
| M4 | media | Cuenta, Hoy, Marketing | **Tres patrones de confirmación.** Meta: diálogo propio (bien). «Desconectar HubSpot»: `window.confirm()` nativo (el README lo prohíbe para Meta con buen criterio). «Rechazar» una aprobación: `window.prompt()` para el motivo. | Cuenta › «Desconectar HubSpot»; Hoy › aprobación › más › «Rechazar». | `mk-desconectar-desk.png` (el bueno) |
| M5 | media | Marketing › filtro de cuentas | **Marcar una casilla cierra el desplegable y repinta** la página: elegir tres cuentas exige abrirlo tres veces. En mock, el toast dice «Elección guardada» pero la casilla vuelve a marcada (siempre 4 de 4), así que el rechazo de «desmarcar la última» no se puede ni ver. | Marketing › «4 de 4 cuentas» › desmarcar una. | `mk-cuentas-desk.png` |
| M6 | media | Cuenta (`rol=agent`) | **El rol casi no cambia nada.** Un vendedor ve «Cambiar de plan», «Invitar», «Cambiar rol» (incluido sobre sí mismo), «Desconectar HubSpot» y «Pedir el borrado de mi cuenta»; solo desaparece «Cambiar» moneda (35 controles frente a 36), y aun así el texto sigue diciendo «Si no es en la que trabajas, cámbiala». | `?mock=1&rol=agent#/cuenta`. | `rol-agent-desk-full.png` |
| M7 | media | Cuenta | **Tres salidas del panel sin aviso y en la misma pestaña:** «Cambiar de plan» → landing `/#precios`; «Política de privacidad» → `/privacidad.html`; «Qué puede consultar Comando» → `/app/dashboard/` (otra app con su propia sesión; en mock muestra «No se pudo cargar la sesión»). | Cuenta › pulsar cada uno. | `interaccion-cuenta.log` |
| M8 | media | Todas | **Contraste bajo AA en 17–35 textos por pantalla.** Blanco sobre el verde `#00A76F` = 3,1:1 en todos los botones primarios de 13 px (Hecha, Aprobar, Ver la lista, Enviar…); gris `#919EAB` sobre blanco = 2,7:1 (rótulos del catálogo, títulos de tareas hechas, celdas «Sin dato» de la tabla 3 Q's); ámbar `#B76E00` sobre blanco = 4,0:1 («2 vencidas», «vencida hace 3 d»); chips verdes 3,7:1. | `metrics.json` › `contrast`. | `hoy-desk-full.png` |
| M9 | media | Todas (móvil) | **Tamaños de toque bajo 44 px:** 81 controles en Hoy, 59 en Automatizaciones, 44 en Resumen. Los botones «sm» miden 32 px, los «más» 24 px, «Salir» y «enviar» 15 px, el selector de idioma 29 px. | `metrics.json` › `smallTargets`. | `avisos-mob-vp.png` |
| M10 | media | Automatizaciones | **22 filas + 2 formularios + 8 ideas = 7 pantallas en móvil.** Nueve «Apagar» fantasma (sin borde, a la derecha de cada señal) que mandan «no me avises más cuando…» por consola; «Pausar» significa dos cosas: en reglas es `rule:toggle` (instantáneo, toast «Pausado.»), en reportes es una frase que pasa por CONFIRMAR. Dos «Guardar» dentro de la misma tarjeta «Cuándo te escribe». | `#/avisos`. | `avisos-desk-full.png`, `avisos-mob-forms.png` |
| M11 | media | Marketing | **13 tarjetas, 1 045 palabras, 4,6 pantallas.** «Tu objetivo» tiene placeholders «25» y «4» que parecen valores (al guardar vacío: «Escribe un costo o un ROAS mayor que cero») y debajo repite los objetivos ya guardados; «Tus cuentas publicitarias» repite las cuatro cuentas del filtro; la nota «no se suman monedas» va tres veces; la tarjeta de Meta con «Qué implica desconectar» es permanente aunque se desconecte una vez al año. | `#/marketing`. | `marketing-desk-full.png`, `marketing-mob-full.png` |
| B1 | baja | Hoy, Agenda, Resumen, Marketing | Dos caminos para la misma frase: «Nuevo recordatorio», «Pedir por WhatsApp», «Preguntar por WhatsApp» y el banner abren `wa.me`; las mismas frases desde una fila van a la consola. «Nuevo recordatorio» no nombra WhatsApp y sin embargo se va a WhatsApp (la regla del README §6). | Agenda › «Nuevo recordatorio». | `agenda-desk-full.png` |
| B2 | baja | Móvil | Barra inferior con 6 pestañas de 64 px y el rótulo «Automatiz…» truncado. | 390 px, cualquier sección. | `tabbar-mob.png` |
| B3 | baja | Hoy, Cuenta | Frases generadas que suenan a máquina: «muéstrame 6 contactos · fuente Urbania», «olvida que Un negocio grande es desde S/ 300.000.», «cambia el rol de Sergio Saavedra a » (sobre uno mismo). | Hoy › «Ver detalle»; Cuenta › «Olvidar». | `interaccion.log` |
| B4 | baja | Hoy | Banner de bienvenida oscuro (239 px) con una ilustración decorativa de un teléfono y un CTA que ya está en la cabecera; el número 13 aparece cuatro veces en la misma pantalla. | `#/hoy`. | `hoy-desk-vp.png` |
| B5 | baja | Cuenta | La moneda se pide como «Código de tres letras» (ISO 4217) a un vendedor; el botón «Cambiar» queda gris mientras el formulario está abierto. | Cuenta › Moneda › «Cambiar». | `cuenta-moneda-desk.png`, `moneda-none-desk-full.png` |
| B6 | baja | Cuenta | Botones sin salida: «Conectar» (cuentas de anuncios) → toast «se activa pronto, escríbenos a hola@comando.pro»; «Invitar» → copia un enlace y lo explica por toast; «Editar» y «Cerrar sesión» en mock → «En modo de prueba no hay sesión». | Cuenta. | `interaccion-cuenta.log` |
| B7 | baja | Agenda › Mes | Celdas de 96 px con hasta tres eventos truncados («11:00 Mand…») y una leyenda de colores al pie; no aporta nada que la lista no diga. | Agenda › «Mes». | `agenda-mes-desk.png` |
| B8 | baja | Resumen | Cada una de las 12 comprobaciones lleva «Ver la lista» + «más» (con «Avisarme cada semana» y «cómo lo sacas en tu CRM»): 36 controles para 12 datos que son, en realidad, 12 filtros sobre la misma tabla. | `#/crm`. | `crm-desk-full.png` |

Lo que **no** es un hallazgo aunque lo parezca: los `<input type="time">` salen «09:00 PM» por
la configuración regional del navegador, no del panel; los restos en castellano en EN/PT
(«negocios», «Últimos 30 dias») son datos del mock o portugués correcto, no claves sin traducir.

---

## 3. Sección por sección: qué sobrevive, qué se elimina, qué se mueve

Destinos posibles: **hoja** (la tabla central con pestañas abajo), **chat** (barra lateral
derecha), **menú superior**, **vista secundaria** (una pantalla a la que se llega desde el menú
y que no compite con la hoja).

### Hoy

| Elemento | Veredicto | Dónde |
|---|---|---|
| La consola (input, log, plan en verde, CONFIRMAR, caja de código, aclaraciones) | sobrevive | **chat**, tal cual: es el mejor componente del panel |
| «Lo último que pediste» + «Deshacer lo último» | sobrevive | **chat**: es el propio historial; «deshacer» como acción del último turno |
| Tareas vencidas y de hoy (con «Hecha») | sobrevive | **hoja › pestaña Tareas**, ordenadas por «Cuándo» con las vencidas arriba |
| Aprobaciones (Aprobar / Rechazar con motivo) | sobrevive | **chat**, como mensaje de Comando con los dos botones y un enlace «ver los 14 negocios en la hoja» |
| Lo que merece atención (tarjetas del briefing: Crear tarea / Luego / Basta / Por qué / Escribirle) | sobrevive | **chat**, como mensajes proactivos con esos botones; «Escribirle a X» abre `wa.me` del contacto desde la fila de la hoja |
| Plan esperando CONFIRMAR / esperando al dueño | sobrevive | **chat**, una sola vez, ligado a su turno (resuelve M1) |
| Insignia «13» | sobrevive | **menú superior**, junto a «Pendientes» (o en el icono del chat) |
| Catálogo «Qué le puedes pedir» (20 frases en 5 grupos) | se mueve | **chat**: 3 sugerencias rotativas sobre el input y el resto tras «/» o «?»; las parciales rellenan, nunca envían |
| KPI «Plata en juego» | se mueve | **hoja › Negocios**: total de la columna Monto en el pie (como la SUMA de Sheets) |
| KPI «Para hoy» y «Te esperan» | se elimina | ya están en la insignia y en la pestaña Tareas |
| «Qué revisar en tu CRM» (3 barras + Ver todo) | se elimina | duplicado del Resumen; ver abajo |
| Banner de bienvenida + ilustración + CTA | se elimina | el saludo cabe en una línea del chat («Buenas tardes, Sergio. Tienes 13 cosas.») |

### Resumen (`#/crm`)

| Elemento | Veredicto | Dónde |
|---|---|---|
| Plata en juego / ganado / perdido este mes | sobrevive | **hoja › Negocios**: pie con el total de la vista y dos vistas guardadas («Ganados este mes», «Perdidos este mes») |
| Por etapa (5 barras) | sobrevive | **hoja › Negocios › agrupar por Etapa** (subtotal por grupo); las barras no hacen falta |
| Por proyecto (campo propio) | sobrevive | **hoja**: agrupar por el campo propio del catálogo |
| Las 12 comprobaciones («sin actividad 15 días», «sin dueño», «duplicados por teléfono», «sin monto»…) con su conteo | sobrevive | **hoja**: **vistas guardadas / filtros** en un desplegable sobre la tabla, con el número como chip. «Ver la lista» deja de ser una frase a la consola y pasa a aplicar el filtro |
| «Avisarme cada semana», «Pedir el cruce» | se mueve | **chat** (frases; ya lo son) |
| «cómo lo sacas en tu CRM» | se mueve | tooltip del filtro, o se elimina |
| Estado «HubSpot al día · hace 6 h» | se mueve | **menú superior** (chip de estado del CRM) |
| Aviso de dueños (1 en el CRM / 4 personas) | se mueve | una sola vez, en Cuenta › Equipo, o como nota del filtro «sin dueño» |
| Sección entera | se elimina | queda absorbida por la hoja |

### Agenda

| Elemento | Veredicto | Dónde |
|---|---|---|
| Lista por día (Vencidas · Hoy · Mañana · Esta semana · Más adelante · Hechas) | sobrevive | **hoja › Tareas**, agrupada por día, «Hecha» como casilla en la fila |
| Cierres esperados | sobrevive | **hoja › Negocios**: columna «Cierre esperado» (ordenable) y vista guardada «Cierra esta semana» |
| Visitas y reuniones del CRM | sobrevive | **hoja › Tareas** con tipo «visita/reunión» |
| «Nuevo recordatorio», «Mover», «Cancelar», «Recordarme», «Siguiente paso» | se mueve | **chat**, con el registro elegido en la hoja ya puesto en la frase (y sin enviar hasta que el operador complete «para cuándo») |
| Vista Mes | se mueve | **vista secundaria** desde la pestaña Tareas, opcional |
| Leyenda de colores, sección propia | se elimina | |

### Automatizaciones (`#/avisos`)

| Elemento | Veredicto | Dónde |
|---|---|---|
| «Comando te avisa cuando…» (Siempre / Cuando pasa algo / Cada cierto tiempo) con Pausar / Reanudar | sobrevive | **vista secundaria** «Automatizaciones» en el menú superior; una lista densa (una línea por regla, estado como chip), no tarjetas |
| «Cuándo te escribe» (horario, tope diario, interruptor, resumen de la mañana) | sobrevive | la misma vista, un solo formulario con un solo «Guardar» (o Cuenta › Preferencias) |
| Apagar / Activar / Cambiar / Nuevo aviso | se mueve | **chat** (frases; H1 obliga a que las parciales solo rellenen) |
| «Ideas para activar con una frase» (8) | se mueve | **chat**, como sugerencias contextuales («prueba: cuando entre un lead nuevo avísame al toque»), no como tarjeta permanente |
| Los 9 «Apagar» visibles | se elimina | pasan al menú de fila |

### Marketing

| Elemento | Veredicto | Dónde |
|---|---|---|
| Barra de filtros (periodo, cuentas, «Actualizar») | sobrevive | **vista secundaria** «Marketing» (menú superior); en móvil los desplegables pasan a hojas inferiores (resuelve H2) |
| Inversión y resultados por moneda | sobrevive | cabecera de esa vista, una fila de números por moneda, sin tarjetas anidadas |
| Campañas (gasto, resultados, costo por resultado / ROAS) | sobrevive | **hoja › pestaña Campañas**: una fila por campaña, agrupada por moneda, con las columnas como columnas; el «más › Ver sus leads» pasa al chat |
| Diagnóstico 3 Q's y «Tu objetivo» | sobrevive | panel de detalle al elegir una campaña en la hoja (o plegado bajo la fila); el objetivo como formulario corto sin lista de «objetivos guardados» debajo |
| «Preguntar por WhatsApp», «Ver sus leads» | se mueve | **chat** |
| Conexión de Meta (estado, desde cuándo, desconectar con su diálogo) | se mueve | **Cuenta › Conexiones** |
| «Tus cuentas publicitarias» (salud del dato) | se elimina | el estado de cada cuenta va como chip dentro del filtro de cuentas, que ya lleva la ficha completa |
| Notas repetidas («no se suman monedas» ×3, «Antes de tocar nada», «Lo que Meta no da») | se elimina | una sola nota corta junto a los totales |

### Cuenta

| Elemento | Veredicto | Dónde |
|---|---|---|
| Plan y cupo (barra 212/500, «Cambiar de plan»), WhatsApp, moneda, idioma | sobrevive | **vista secundaria** desde el avatar del menú superior; «Cambiar de plan» abre en pestaña nueva o dentro del panel (M7) |
| Tu CRM: «HubSpot · conectado · al día · 174 contactos · 73 negocios» + «Cambiar» | sobrevive | Cuenta › Conexiones, una fila por conexión (HubSpot, Google Sheets, Meta Ads) |
| Tu equipo (roles, WhatsApp verificado) | sobrevive | Cuenta; «Cambiar rol» como frase que rellena el chat, solo para owner/admin (M6) |
| «Lo que Comando sabe de ti» + Olvidar + Enseñarle algo | sobrevive | Cuenta; las acciones al **chat** |
| Privacidad y salida | sobrevive | Cuenta, al pie |
| Cuadrícula de 11 conectores | se elimina | (M3) queda un botón «Conectar otro CRM» que abre la lista solo cuando se necesita |
| «Tus cuentas de anuncios» + «Ver campañas» ×4 + «Conectar» sin salida | se elimina | duplicado de Marketing; la conexión de Meta vive en Conexiones |
| «Qué puede consultar Comando» (enlace a `/app/dashboard/`) | se elimina | o se convierte en una fila plegable con los objetos y campos, dentro de Conexiones |
| Aviso de dueños duplicado | se elimina | una sola vez |

### Cromo global

| Elemento | Veredicto | Dónde |
|---|---|---|
| Barra lateral de 280 px | se elimina | **menú superior**: Hoja · Pendientes (insignia) · Automatizaciones · Marketing · avatar (Cuenta) |
| «Escribir a Comando» (`wa.me`) en cabecera y banner | se mueve | enlace secundario dentro del chat («seguir en WhatsApp»), una sola vez |
| Selector de idioma, estado del CRM | se mueve | derecha del menú superior |
| Barra inferior de 6 pestañas | se elimina | en móvil 3: Hoja · Pendientes · Chat, y «Más» para el resto (B2) |
| Banner de mock (36–57 px) | se reduce | un chip en el menú |
| Consola como `<dialog>` global | se elimina | sustituida por el chat lateral persistente (M2) |

---

## 4. Recomendaciones para la hoja + chat + menú superior

### 4.1 Densidad de la hoja

- Filas de **32–36 px** (hoy 77–115 px), texto de 13 px con números tabulares, cabecera fija,
  rejilla de líneas finas, sin sombra ni radio 16 por fila: en 1440×900 caben **20–24 registros**
  (hoy caben 6–8). Sin emoji por fila; el tipo de registro lo dice la pestaña.
- Columnas redimensionables y ordenables por cabecera; agrupar por (Etapa, Dueño, campo
  propio) con subtotal por grupo; pie con **cuenta y suma** de la vista actual (esto sustituye a
  los KPI de Hoy y Resumen sin recalcular nada: son los mismos datos del espejo).
- Fila seleccionable (clic) con dos acciones fijas: «Preguntar a Comando» (rellena el chat con
  el registro) y «Escribirle» (`wa.me` del contacto). Todo lo demás se pide en el chat.
- «Cargar más» a partir de 100 filas; buscar como filtro instantáneo sobre la pestaña.
- Las 12 comprobaciones del Resumen y los cortes de Agenda son **vistas guardadas** (filtros
  con nombre y conteo) en un desplegable a la izquierda de la barra de la hoja.

### 4.2 Columnas por defecto

- **Contactos**: Nombre · Teléfono (icono WhatsApp = acción) · Empresa / proyecto · Dueño ·
  Fuente del lead · Última actividad · Etiquetas (`comando_tags`). Ocultas pero disponibles:
  correo, creado, los campos del catálogo. Orden: última actividad, descendente.
- **Negocios**: Nombre · Etapa (chip) · Monto (moneda de la cuenta, alineado a la derecha,
  suma en el pie) · Contacto · Dueño · Cierre esperado · Última actividad · Siguiente paso.
  Orden: última actividad, descendente. Vistas guardadas de fábrica: «Por etapa» (agrupada),
  «Sin actividad 15 días», «Sin monto», «Sin dueño», «Cierra esta semana», «Ganados este mes».
- **Tareas**: Hecha (casilla) · Tarea · Cuándo · Registro · Origen. Agrupada por día
  (Vencidas · Hoy · Mañana · Esta semana). Sustituye a Agenda y a la bandeja de tareas de Hoy.
- **Empresas**: Nombre · Contactos · Negocios abiertos · Dueño · Última actividad.
- **Campañas** (si Marketing entra en la hoja): Campaña · Cuenta · Moneda · Gasto ·
  Resultados · Costo por resultado · ROAS · CTR, agrupada por moneda.

### 4.3 Cómo debería verse el chat

- Barra derecha de **360–400 px**, plegable, **persistente entre secciones** (no un modal): el
  mismo log que hoy pinta la consola, con la frase del operador a la derecha y la respuesta de
  Comando a la izquierda, el plan en la caja verde y **CONFIRMAR / Cancelar** como botones del
  propio mensaje; la caja de código del segundo factor y las aclaraciones, igual. Input fijo
  abajo con «Enviar» y `Enter`.
- **Lo proactivo entra como mensajes de Comando**: recomendaciones (Luego · Basta · Por qué ·
  Crear tarea), aprobaciones (Aprobar · Rechazar con motivo en línea, no `prompt`), planes en
  espera y el saludo del día. Cada mensaje que toca registros lleva «ver en la hoja», que filtra
  o selecciona esas filas. Así la bandeja de Hoy deja de ser una pantalla.
- Sugerencias: 3 chips rotativos sobre el input tomados del catálogo actual (20 frases), y el
  catálogo completo tras «?». Las frases parciales **rellenan** el input, nunca se envían (H1).
- Con una fila elegida en la hoja, el input muestra el registro como chip («Torres del Parque
  402 ×») para que «recuérdame llamarlo mañana» no tenga que nombrarlo.
- Un enlace secundario «seguir en WhatsApp» (`wa.me` con la frase) en el pie del chat
  sustituye a los 12 enlaces `wa.me` repartidos hoy por el panel.
- Historial: el mismo `GET /operator/commands`; «Lo último que pediste» y «Deshacer» son el
  propio scroll del chat.

### 4.4 Qué pasa en móvil (390 px)

- La hoja se vuelve **lista de una columna**: nombre en negrita + dos datos secundarios
  elegidos por pestaña (Negocios: etapa y monto; Contactos: teléfono y última actividad; Tareas:
  cuándo y registro); las vistas guardadas como chips horizontales bajo la barra; buscar arriba.
- El chat es un **cajón a pantalla completa** con transición desde abajo, abierto desde la barra
  inferior o desde «Preguntar a Comando» en una fila; no un modal sobre la hoja. El input queda
  pegado al teclado.
- Barra inferior de **3 pestañas** (Hoja · Pendientes con insignia · Chat) y «Más» para
  Automatizaciones, Marketing y Cuenta. Menú superior reducido a título de pestaña + selector de
  vista + avatar.
- Ningún desplegable posicionado: periodo, cuentas y filtros se abren como **hojas inferiores**
  (resuelve H2). Todo control ≥ 44 px (resuelve M9). Sin tarjetas: separadores de 1 px.
- Contraste: subir el verde de los botones a `--primary-dark` (`#007867`, 4,9:1 con blanco) o
  usar texto oscuro sobre `--primary-light`; el gris de apoyo a `--g600` como mínimo (M8).

### 4.5 Menú superior

Hoja · Pendientes (insignia con lo que espera: planes, aprobaciones, vencidas) · Automatizaciones
· Marketing · a la derecha: chip «HubSpot · al día · hace 6 h», idioma, avatar → Cuenta. Las
rutas `#/crm`, `#/avisos` se conservan como redirecciones (README §2).

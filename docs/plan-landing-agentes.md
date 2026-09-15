# Plan — landing de Comando como equipo de agentes de marketing y revenue

Iniciado el 15-sep-2026. Documento vivo: cada iteración marca lo decidido en §8.
Rama: `operador/landing-agentes` (desde `operador/web`). Nada se empuja a `main` (= producción) sin OK.

**Estado:** fase A aprobada · fase B cerrada · fase C aprobada · fase D **lista para revisión en local** (§D) · fase E (motor) en curso en `operador/catalogo-meta`.

---

## 0. Principios

1. **Corta:** 8 secciones + pie. Problema → ejemplo en WhatsApp → resultado.
2. **WhatsApp es el protagonista.** Diferencial en LATAM: conversas, recibes el análisis y decides sin abrir un dashboard.
3. **Precio bajo visible desde arriba.**
4. **Honestidad con sellos de estado:**
   - **Disponible:** métricas y diagnóstico de Meta (metodología 3 Q's), acciones recomendadas por la metodología, conversación por WhatsApp y notas de voz, operar el CRM con CONFIRMAR, deshacer, alertas y resumen del CRM.
   - **Próximamente:** ejecutar cambios en Meta, recomendaciones de presupuesto con IA, ROI real cruzado con el CRM (CAPI), reporte de Meta programado por WhatsApp, Google Ads, TikTok Ads, CRM distintos de HubSpot/Salesforce/Google Sheets en el panel.
5. **Meta primero, CRM después:** «Conversa con tu CRM» va en su propia sección debajo de precios, con precio variable.
6. **Sin comparación con competidores** (decisión del 15-sep).

Referencia: adadvisor.ai («Autopilot for all your paid advertising», agentes con rol que ejecutan cambios). Se toma la narrativa de equipo, no la promesa de autopiloto.

---

## 1. Orden final

| # | Sección | Formato visual | Estado |
|---|---|---|---|
| 1 | Hero | Teléfono con chat de WhatsApp animado (SVG + GSAP) | Disponible |
| 2 | El problema | 3 tarjetas | — |
| 3 | Tu equipo | 4 agentes en scroll horizontal fijado (escritorio) / slider táctil (móvil) | 2 disponibles, 2 próximamente |
| 4 | Métricas | Slider de 7 tarjetas con semáforo animado | Disponible (ROI próximamente) |
| 5 | En la práctica | Slider de 3 casos (mini chats) | Disponible |
| 6 | Por qué WhatsApp | 4 bloques + franja de confianza | Disponible (reporte programado y cambios en Meta: próximamente) |
| 7 | Precios | Tarjetas | Fase B |
| 8 | Conversa con tu CRM | Texto + mini calculadora (CRM + contactos → «desde US$ X») | Disponible / variable |
| 9 | FAQ + CTA final + pie | Acordeón | — |

**Sale o se fusiona desde `operador/web`:** «Cómo trabaja» (ciclo de 5 verbos) → hero y agentes · «Supervisión/radar» → sección CRM ·
«Confianza» → franja de §6 · página de conectores → enlace desde la sección CRM.

---

## 2. Textos finales (es) — fase A

> Los ejemplos con cifras son **ilustrativos** (no son clientes reales) y salen de preguntas que el producto ya contesta.
> Donde dice «Desde US$ 9» depende de la fase B.

### 2.1 Hero
- **Eyebrow:** META ADS · WHATSAPP
- **H1:** Un analista de Meta Ads en tu WhatsApp.
- **Bajada:** Pregúntale cómo van tus anuncios. Te responde con ROAS, costo por resultado y qué cambiar, en segundos. Desde US$ 9 al mes.
- **CTA principal:** Pruébalo gratis en WhatsApp
- **CTA secundario:** Mira un ejemplo ↓
- **Nota:** Sin tarjeta · Conecta Meta en 2 minutos · En español y portugués
- **Chat animado:**
  1. Tú: «¿Qué campaña me está haciendo perder plata?»
  2. Tarjeta: Remarketing · CTR 🔴 0,6 % · Frecuencia 🔴 4,8
  3. Comando: «Remarketing gastó US$ 96 sin leads. Tu audiencia ya vio el anuncio casi 5 veces: cambia el creativo antes de subir presupuesto.»

### 2.2 El problema
- **Eyebrow:** EL PROBLEMA
- **Título:** Pautar en Meta no debería tomarte la semana.
- **Tarjetas:**
  1. **Horas en el Ads Manager.** Exportar, cruzar y adivinar qué pasó.
  2. **Decisiones a ojo.** Subes o pausas sin saber por qué cambió el costo.
  3. **Una agencia cara.** 15–20 % de tu inversión para alguien que no conoce tu negocio.
- **Cierre:** Comando lee tus campañas por ti y te las explica por WhatsApp.

### 2.3 Tu equipo
- **Eyebrow:** TU EQUIPO
- **Título:** Un equipo de marketing que trabaja en tu WhatsApp.
- **Bajada:** Empieza hoy con tu analista y tu estratega. El resto del equipo llega pronto.

| Agente | Sello | Qué hace | Tú | Comando |
|---|---|---|---|---|
| **Analista** | Disponible | Lee tus campañas y te da los números que importan. | «¿Cuánto gasté este mes y cuántos leads traje?» | «US$ 3.120 y 571 leads: US$ 5,46 cada uno. «Leads septiembre» se lleva el 48 % del gasto y trae el 61 % de los leads.» |
| **Estratega** | Disponible | Diagnostica cada campaña y te dice qué revisar primero. | «¿Por qué subió mi costo por lead?» | «Pagaste más por cada mil impresiones (+22 %) y bajaron los clics (1,4 % → 0,9 %). Revisa el creativo antes que el presupuesto.» |
| **Comprador de medios** | Próximamente | Pausa campañas y mueve presupuesto cuando tú confirmas. | «Baja Remarketing a US$ 10 al día.» | «Ahora está en US$ 32 al día. ¿Lo aplico? Responde CONFIRMAR.» |
| **Atribución** | Próximamente | Cruza tus ventas del CRM con Meta para que te traiga más compradores como los tuyos. | «¿Cuántas ventas trajo Meta este mes?» | «18 ventas de 240 leads: US$ 72 por venta. Se las envié a Meta para que busque gente parecida.» |

- **Franja al final:** Próximamente también: Google Ads y TikTok Ads.

### 2.4 Métricas
- **Eyebrow:** MÉTRICAS
- **Título:** Las métricas que importan, con semáforo.
- **Bajada:** Comando compara cada campaña con tu objetivo y te dice en qué va bien y en qué no.
- **Tarjetas:**
  1. **ROAS** — Cuánto vuelve por cada dólar invertido (en campañas de venta).
  2. **Costo por resultado** — Lo que pagas por cada lead, mensaje o compra, contra tu objetivo.
  3. **CTR** — Si tu anuncio consigue clics.
  4. **CPM** — Cuánto cuesta que te vean mil personas.
  5. **Frecuencia** — Si tu audiencia ya se cansó del anuncio.
  6. **Embudo** — Dónde se pierde la gente: clic, visita, carrito, compra.
  7. **ROI con tu CRM** · *Próximamente* — Ventas reales, no solo leads.

### 2.5 En la práctica
- **Eyebrow:** EN LA PRÁCTICA
- **Título:** De la pregunta a la decisión, en un chat.
- **Casos:**
  1. **¿Pauso o espero?**
     - Tú: «¿Pauso Remarketing?»
     - Comando: «Gastó US$ 96 en 3 días sin leads y la frecuencia es 4,8. Con 3 días aún es pronto para pausar: cambia la audiencia y revísala el lunes.»
     - **Decisión:** no pausaste a ciegas.
  2. **¿Vamos mejor que la semana pasada?**
     - Tú: «Compara esta semana con la anterior.»
     - Comando: «Inversión +6 %, leads +19 %, costo por lead −11 %. El salto viene de «Leads septiembre».»
     - **Decisión:** sabes qué campaña escalar.
  3. **Desde el auto.**
     - Tú: 🎤 nota de voz «¿qué campaña trajo más leads ayer?»
     - Comando: «Leads septiembre: 21 leads a US$ 4,10 cada uno.»
     - **Decisión:** la respuesta sin abrir la laptop.

### 2.6 Por qué WhatsApp
- **Eyebrow:** POR QUÉ COMANDO
- **Título:** Todo pasa donde ya trabajas: WhatsApp.
- **Bloques:**
  1. **Conversa.** Escribe o manda una nota de voz. Sin dashboards ni capacitaciones.
  2. **Recibe tu reporte.** Pídelo cuando lo necesites y llega en segundos. *Próximamente:* todos los lunes sin pedirlo.
  3. **Decide ahí mismo.** En tu CRM, cada cambio te pide CONFIRMAR y se puede deshacer. *Próximamente* también en Meta.
  4. **Hecho para LATAM.** En español y portugués, en la moneda de tu cuenta y como hablas tú.
- **Franja de confianza:** Solo lectura en tus anuncios · Nada cambia sin tu CONFIRMAR · Tus datos siguen siendo tuyos.

### 2.7 Precios — fase B
- **Eyebrow:** PRECIOS
- **Título:** Menos de lo que cuesta un almuerzo.
- **Bajada:** Una agencia te cobra el 15 % de lo que inviertes. Comando, un precio fijo.
- **Tarjetas (fase B cerrada el 15-sep; el plan lo define la cantidad de cuentas publicitarias de Meta, no las campañas):**

| | **Gratis** | **Analista** | **Equipo** ★ | **Agencia** |
|---|---|---|---|---|
| Precio | 0 | **US$ 9/mes** | **US$ 29/mes** | **US$ 49/mes** |
| Para quién | Probar con tu cuenta | Un negocio que pauta | Varias marcas o equipo | Agencia con clientes |
| Resultado | Pregúntale a tus anuncios | Tu analista y estratega cada día | Todo tu marketing en un chat | Todos tus clientes en un chat |
| Cuentas publicitarias de Meta | 1 | 2 | 10 | 20 |
| Datos actualizados | 1 vez al día | Cada hora | Cada hora | Cada hora |
| Preguntas al mes | 30 | 300 | 1.500 | 3.000 |
| Analista (métricas) | ✓ | ✓ | ✓ | ✓ |
| Estratega (diagnóstico con semáforo) | ✓ | ✓ | ✓ | ✓ |
| Notas de voz | ✓ | ✓ | ✓ | ✓ |
| Comprador de medios / Atribución | Próximamente | Próximamente | Próximamente (primero) | Próximamente (primero) |
| Costo estimado / margen | ≈ 0,02 USD | 2,01 · **78 %** | 5,65 · **81 %** | 9,32 · **81 %** |

Costos de `modelo-meta-simple.xlsx` (sincronización cada hora sin Temporal, capas 2 y 3 incluidas como estimado, Stripe e impuestos; uso del 60 % del cupo).
Una cuenta publicitaria extra cuesta ≈ 0,014 USD/mes; de 15 a 100 campañas por cuenta, ≈ 0,09 USD/mes.
- **Debajo de las tarjetas:** «¿Tienes CRM? Suma *Conversa con tu CRM* desde US$ 9 al mes.» (enlace a §2.8)

### 2.8 Conversa con tu CRM
- **Eyebrow:** ¿TIENES CRM?
- **Título:** Conversa también con tu CRM.
- **Bajada:** Consulta tus negocios, actualiza etapas y recibe alertas, todo por WhatsApp.
- **Viñetas:**
  - Pregunta: «¿Qué negocios llevan 15 días parados?»
  - Actualiza con CONFIRMAR y deshaz si te equivocas.
  - Resumen del día y alertas de lo que se enfría.
  - *Próximamente:* conecta tus ventas con Meta para medir el ROI real.
- **Precio:** Desde US$ X al mes, según tu CRM y tus contactos. Mini calculadora: CRM (HubSpot, Salesforce, Google Sheets disponibles; el resto *próximamente*) + contactos → «US$ Y al mes». Precio mínimo: fase B.
- **CTA:** Calcular mi precio · Ver conectores →

### 2.9 FAQ
1. **¿Tengo que instalar algo?** No. Usas tu WhatsApp y conectas tu cuenta de Meta en 2 minutos.
2. **¿Comando cambia mis campañas?** Hoy las lee, las analiza y te recomienda. Hacer cambios llega pronto, y siempre te pedirá CONFIRMAR.
3. **¿Qué pasa con mis datos?** Comando solo lee tus anuncios. Tu cuenta sigue siendo tuya y puedes desconectarla cuando quieras.
4. **¿Sirve para Google Ads o TikTok Ads?** Próximamente. Hoy funciona con Meta (Facebook e Instagram).
5. **¿Qué cuenta como pregunta?** Cada mensaje en el que le pides algo a Comando. Las confirmaciones no cuentan.

### 2.10 CTA final y pie
- **CTA final:** Tu analista de Meta Ads te espera en WhatsApp. → **Pruébalo gratis**
- **Pie:** Comando · Tu equipo de marketing en WhatsApp.

---

## 3. Animaciones y sliders (técnico)
- GSAP + Lenis + CSS de Webflow (ya en la web), sin librerías nuevas pesadas.
- Scroll horizontal fijado con ScrollTrigger (agentes, escritorio); `scroll-snap` en móvil (≤ 767 px) y en los sliders de métricas y casos.
- Arte 2D en SVG inline: chats que se escriben, tarjetas con semáforo, números que suben. Sin video.
- `prefers-reduced-motion` → estático; legible sin JS; ≤ 150 kB de JS nuevo; LCP del hero sin esperar animación.
- es fuente; en/pt con `tooling/i18n.mjs`; cadena `?v=` + `check-versiones.mjs --registrar`.
- Mocks con la skill `impeccable` antes de programar (fase C).

---

## 4. Dependencias fuera de la web

| Tema | Por qué bloquea | Acción |
|---|---|---|
| ~~App Review Meta (`ads_read`)~~ | **Resuelto 15-sep:** la app ya tiene `ads_read` aprobado | — (`ads_management` solo para el Comprador de medios, más adelante) |
| Planes Meta-first en el motor | `operador/planes` tiene planes centrados en CRM | Nueva versión del catálogo |
| Módulo CRM variable | No existe cobro de add-ons recurrentes | Módulo en catálogo y Stripe |
| Alta Meta-first | El panel pide CRM en el paso 3 | Meta primero, CRM opcional |
| Diagnóstico en Gratis | Hoy Gratis solo da números; el Estratega aparece como disponible | Decidir en fase B |
| Reporte programado de Meta | Las reglas no incluyen MARKETING_REPORT | Próximamente (así va en §2.6) o construir |
| Notas de voz | Costeo supuso solo pago; la web las muestra | Decidir en fase B |
| Conectores CRM del panel | Solo HubSpot, Salesforce y Google Sheets conectables | La calculadora marca el resto como próximamente |

---

## 5. Fases

| Fase | Entregable | Revisión de Sergio | Estado |
|---|---|---|---|
| A · Mensaje y estructura | Textos finales y orden (§1–§2) | Titular, agentes, competencia, Google/TikTok | **Aprobada 15-sep** |
| B · Precios | Planes Meta + precio mínimo del módulo CRM + diagnóstico en Gratis + voz | Precios | **Cerrada 15-sep** |
| C · Diseño | Mocks de hero, agentes, métricas y casos (móvil y escritorio) | Estilo visual | **Aprobada 15-sep** (§C) |
| D · Implementación | Rama `operador/landing-agentes`, es/en/pt, comprobaciones | Revisión en local | **Lista para revisión en local** (§D) |
| E · Motor | Catálogo Meta-first, alta Meta primero, diagnóstico en Gratis, reporte programado | Despliegue del motor | **Catálogo listo** en `operador/catalogo-meta` (sin desplegar); alta Meta primero y reporte programado pendientes |
| F · Lanzamiento | Motor → Stripe → web (App Review `ads_read` ya aprobado) | OK final | Pendiente |

---

## 6. Verificado en el código (15-sep)

- Reglas programadas: acciones `TAG, UNTAG, UPDATE_FIELD, NOTE, ASSIGN, MOVE_STAGE, CREATE_TASK, NOTIFY, GENERATE_REPORT, PAUSE/RESUME_AUTOMATION, BROADCAST, UPDATE_MONEY, APPLY_DISCOUNT` (`comando-pro/apps/worker-temporal/src/automation-rule-effects.ts:16-31`): **no hay reporte de Meta programado**.
- Meta: solo lectura; diagnóstico 3 Q's con acciones por urgencia (`libs/application/src/lib/marketing-3qs.ts`); «nunca pausar con menos de 7 días» es consejo, no bloqueo.
- Panel: solo HubSpot, Google Sheets y Salesforce conectables (`comando-web/app/panel/setup.js:19`).
- Google Ads / TikTok Ads: sin código (solo webhooks de formularios de leads).
- Referencia adadvisor.ai (15-sep): problema/solución, agentes con rol, modo sugerir o autopiloto, sin precios públicos.

---

## 7. Preguntas abiertas para la revisión de la fase A

1. ¿Los textos de §2 van bien de tono (tú, neutro LATAM)?
2. Agentes: ¿cuatro tarjetas (Analista, Estratega, Comprador de medios, Atribución) es lo que querías con «los tres con todo y atribución»?
3. Hero: ¿mantener «Desde US$ 9 al mes» en la bajada o esperar a la fase B?
4. ¿Algún caso de §2.5 que prefieras cambiar por uno de tu negocio o sector (inmobiliaria, educación, tienda online)?

---

## 8. Registro de decisiones

| Fecha | Tema | Decisión |
|---|---|---|
| 15-sep | Enfoque | Equipo de agentes de marketing y revenue; WhatsApp como diferencial LATAM; web corta problema/solución; CRM como sección aparte debajo de precios con precio variable |
| 15-sep | Titular | **E — «Un analista de Meta Ads en tu WhatsApp.»** |
| 15-sep | Agentes | **Analista, Estratega, Comprador de medios y Atribución**, por rol; los dos últimos con sello «Próximamente» (interpretación de «los tres con todo y atribución», por confirmar) |
| 15-sep | Competencia | **Sin comparación** |
| 15-sep | Google / TikTok | **Visibles como «Próximamente»** |
| 15-sep | Fase A | **Aprobada:** textos de §2 y tono; cuatro agentes confirmados; se mantiene «Desde US$ 9 al mes» en el hero; casos de §2.5 sin cambios |
| 15-sep | Precios Meta | **Por cuentas publicitarias de Meta: Gratis (1) · Analista US$ 9 (2) · Equipo US$ 29 (10) · Agencia US$ 49 (20).** Aclarado: son cuentas publicitarias, no campañas; el costo casi no depende de ellas (≈ 0,014 USD por cuenta), la escalera es por valor |
| 15-sep | Motor | Los nombres y precios Meta-first **no coinciden** con el catálogo de `operador/planes` (Asistente/Operador/Escala 9/29/79 centrados en CRM): hay que rehacer esa versión del catálogo en la fase E |
| 15-sep | Diagnóstico (Estratega) en Gratis | **Sí** (sin IA, casi no cuesta; es el «aha») |
| 15-sep | Notas de voz | **En todos los planes** (≈ 0,003 USD por gratis al mes) |
| 15-sep | Módulo «Conversa con tu CRM» | **Desde US$ 9 al mes**; la calculadora sube el precio en CRM lentos o muy grandes |
| 15-sep | Diseño (fase C) | **Aprobado:** botones de acción en **verde WhatsApp** (`#00a884`); **7 tarjetas de métricas**; agentes con **iconos simples** (estilo producto real, sin personajes); **precios y CRM en fondo claro**. Se mantienen sin eyebrows |
| 15-sep | Calculadora del módulo CRM (fase D) | **Se queda** en la landing aunque hoy todos los tramos salgan en el mínimo de US$ 9 (estrategia 3) |
| 15-sep | Automatizaciones (conectores) | **Disponible con el módulo CRM** (las reglas avisan y actúan en el CRM hoy). Los otros 14 conectores siguen «Próximamente» |
| 15-sep | Paquete de comandos y enterprise | **Paquete +500 comandos por US$ 8 (para el mes en curso, pago único) vuelve** debajo de los planes; **enterprise como enlace, sin formulario** («¿Más de 20 cuentas publicitarias? Habla con nosotros»). No hay número de WhatsApp de ventas publicado: el enlace va a `hola@comando.pro` hasta tenerlo |
| 15-sep | Prueba de 14 días | **Del plan Equipo** («Equipo, déjalo así»); al terminar, Gratis. «Operador» ya no es un plan. Propuesta para la web (pendiente de revisión en fase C): nota del hero «14 días de Equipo gratis · Sin tarjeta · Conecta Meta en 2 minutos» y una línea sobre las tarjetas de precios «Empiezas con 14 días del plan Equipo, sin tarjeta» |

---

## C. Mocks de diseño (fase C, 15-sep)

**Dónde:** `mocks/landing-agentes/` (`index.html`, `mocks.css`, `mocks.js`, arte SVG inline) · capturas en `mocks/landing-agentes/capturas/`.
No toca las páginas de producción (`index.html`, `en/`, `pt/`, `js/`, `css/`).
**Quitados del repo en la fase D:** la carpeta `mocks/` ya no existe; los mocks y sus capturas siguen en el historial (commit `5910a8c`).

**Cómo abrirlo en local:**

```sh
cd ~/Documents/comando/comando-web && python3 -m http.server 8765
# http://127.0.0.1:8765/mocks/landing-agentes/                      → con animaciones y scroll horizontal
# http://127.0.0.1:8765/mocks/landing-agentes/?static=1             → página completa sin pin ni animación
# http://127.0.0.1:8765/mocks/landing-agentes/?static=1&only=equipo&x=50 → una sección aislada (capturas)
```

**Qué incluye (en el orden de §1):** hero con chat de WhatsApp animado (pregunta → «escribiendo» → tarjeta con semáforo →
respuesta) · problema · «Tu equipo» con 4 agentes en scroll horizontal fijado (GSAP ScrollTrigger del repo) y carrusel con
scroll-snap en móvil · métricas (7 tarjetas con semáforo, contador y mini-visualización propia de cada métrica) · casos (3 mini chats
con «Decisión») · por qué WhatsApp + franja de confianza · precios §2.7 · módulo CRM con calculadora de ejemplo (CRM + contactos →
«desde US$ 9») · FAQ · CTA final.

**Decisiones de diseño:**
- Mismo mundo que la landing actual: fondo casi negro, azul `#4d7cff`, Space Grotesk (títulos), Inter (texto), JetBrains Mono solo para datos.
- **Verde de WhatsApp (`#00a884`) como color de acción** (botones «Pruébalo gratis») para anclar el diferencial; el azul queda para marca y elementos de producto.
- **Sin eyebrows** («META ADS · WHATSAPP», «EL PROBLEMA»…): se quitaron por la regla de oficio de la skill de diseño; cada título carga el mensaje solo.
- Precios y módulo CRM sobre fondo claro («papel»), como la sección de precios actual: cambia el ritmo y separa lo comercial.
- Sellos: «Disponible» verde sólido; «Próximamente» violeta con punto discontinuo y tarjetas rayadas para que se lea como futuro sin esconderlo.
- Iconos SVG propios con un solo trazo (1,7) y peso; nada de emoji como iconos.
- Números ilustrativos marcados como «Ejemplo ilustrativo» / «Valores de ejemplo».
- `prefers-reduced-motion`: sin pin ni animación; sin JS se lee todo (mensajes visibles, carriles con scroll nativo). JS nuevo ≈ 6 kB.

**Capturas:** `escritorio-pagina-completa`, `escritorio-hero`, `escritorio-hero-animacion-1` y `-2` (fotogramas del chat),
`escritorio-equipo-00` / `-50` / `-100` (scroll horizontal), `escritorio-metricas`, `escritorio-casos`, `escritorio-porque`,
`escritorio-precios`, `escritorio-crm`; `movil-pagina-completa`, `movil-hero`, `movil-equipo`, `movil-metricas`, `movil-casos`,
`movil-porque`, `movil-precios`, `movil-crm` (móvil a 390 px dentro de un marco, porque Chrome de escritorio no baja de ~500 px).

**Preguntas de diseño para Sergio:**
1. ¿Verde de WhatsApp como color de acción o volver al azul de la marca en los botones?
2. Ilustración: ¿se queda el estilo «producto real» (teléfono y chats) o suma personajes/ilustración para los agentes?
3. Iconos de agentes (barras, brújula, deslizadores, nodos): ¿van o prefieres avatares con nombre?
4. Precios en fondo claro: ¿mantener el contraste o todo oscuro?
5. Métricas: ¿7 tarjetas en slider o reducir a 4 (ROAS, costo por resultado, frecuencia, embudo) para acortar la página?
6. La prueba de 14 días del plan Equipo (decidida después de la fase B) aún no aparece en el hero ni en precios: ¿dónde se dice?

**Desvíos respecto a §2:** sin eyebrows (ver arriba); los títulos de sección y textos son los de §2 sin cambios.

---

## D. Implementación (fase D, 15-sep)

**Rama:** `operador/landing-agentes`, sin empujar. **Estado:** lista para revisión en local.

**Cómo verla en local:**

```sh
cd ~/Documents/comando/comando-web && python3 -m http.server 8765
# http://127.0.0.1:8765/      castellano (fuente)
# http://127.0.0.1:8765/en/   inglés (generado)   · http://127.0.0.1:8765/pt/  portugués (generado)
# http://127.0.0.1:8765/conectores.html  conectores con «Próximamente»
```

**Qué hay:**
- `index.html` nueva en el orden de §1 (hero con chat animado, problema, equipo con scroll horizontal fijado, 7 métricas, 3 casos, por qué WhatsApp + confianza, precios, «Conversa con tu CRM» con calculadora, FAQ, CTA final, pie). Hojas y JS propios: `css/landing.css`, `js/landing.js`; GSAP + ScrollTrigger del repo. Sin Webflow ni preloader en la landing (conectores y legales siguen con los suyos).
- Hero: nota «14 días de Equipo gratis · Sin tarjeta · Conecta Meta en 2 minutos». Precios: línea «Empiezas con 14 días del plan Equipo, sin tarjeta» y selector mensual/anual (anual = 10 meses).
- `js/pricing.js`: única copia de los números (`PLAN_LADDER` free/analista/equipo/agencia, `TRIAL {14, equipo}`, `ADDONS.crm` desde US$ 9 variable, `CRM_QUOTE`), textos en es/en/pt. Enlaces de compra `/app/?plan=<código>&interval=monthly|annual`.
- Calculadora CRM: tabla estática `docs/crm-precios.json` generada con la calculadora CRM → Meta (estrategia 3, mínimo US$ 9); con esa estrategia el costo es de centavos y todos los tramos dan US$ 9. Gancho marcado para `GET /v1/public/crm-quote`.
- `tooling/plans-check.mjs`: contrato Meta-first (cuentas publicitarias, minutos de actualización, precios `month`/`year`, capacidades `coming_soon`, prueba, módulos) y forma vieja; `--fixture` contra `tooling/fixtures/public-plans-meta.json`.
- Panel/registro: nombres Analista/Equipo/Agencia en es/en/pt (los códigos viejos siguen con su nombre), subtítulo del registro con la prueba de Equipo, datos de ejemplo del panel con la escalera nueva.
- `conectores.html`: solo HubSpot, Salesforce y Google Sheets sin sello; el resto «Próximamente».
- `tooling/i18n.mjs`: arreglado un fallo que duplicaba texto cuando una traducción llevaba «US$&nbsp;» (`$&` en el reemplazo).

**Desvíos:**
- Sin Lenis: el scroll fijado va con ScrollTrigger solo, como en los mocks aprobados.
- Google Sheets no está en la tabla de proveedores de la calculadora: se aproxima con Pipedrive (dato conservador). Da US$ 9 igual.
- Se quitó el formulario de interesados «enterprise». El paquete de +500 preguntas por US$ 8 **volvió** (decisión del 15-sep) y enterprise quedó como enlace «¿Más de 20 cuentas publicitarias? Habla con nosotros» (`mailto:hola@comando.pro`; no hay número de WhatsApp de ventas).
- Sin JS, las tarjetas de precios se reemplazan por una línea `<noscript>` con los cuatro precios (segunda copia de los números, solo para ese caso).
- Las cifras dentro de las mini-visualizaciones de métricas pasaron de texto SVG a leyendas HTML para que se traduzcan.

**Pendiente para lanzar (fase F):**
1. Desplegar el motor de la fase E (catálogo Meta-first, módulo CRM, `GET /v1/public/crm-quote`) y que `node tooling/plans-check.mjs` cuadre contra producción (hoy falla: el motor no publica analista/equipo/agencia).
2. Precios de Stripe para Analista, Equipo y Agencia (mensual y anual) y para el módulo CRM.
3. ~~App Review de Meta con `ads_read`~~ — resuelto: la app ya lo tiene (15-sep).
4. Alta Meta primero en el panel (hoy pide CRM en el paso 3; fuera del alcance de la fase D).
5. Reporte de Meta programado por WhatsApp (en la web va como «Próximamente»).
6. Revisión de Sergio en local; después, empujar con la cadena `?v=` registrada.

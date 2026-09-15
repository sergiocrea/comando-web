# Plan — landing de Comando como equipo de agentes de marketing y revenue

Iniciado el 15-sep-2026. Documento vivo: cada iteración marca lo decidido en §8.
Rama: `operador/landing-agentes` (desde `operador/web`). Nada se empuja a `main` (= producción) sin OK.

**Estado:** fase A (mensaje y estructura) con textos cerrados para revisión · fase B (precios) pendiente.

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
- **Tarjetas:** _se cierran en la fase B_ (punto de partida: Gratis · Analista 9 USD · Equipo 19–29 USD).

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
| App Review Meta (`ads_read`) | Sin él, clientes externos no conectan | Enviar (borrador del 9-sep) |
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
| A · Mensaje y estructura | Textos finales y orden (§1–§2) | Titular, agentes, competencia, Google/TikTok | **Textos listos para revisión** |
| B · Precios | Planes Meta + precio mínimo del módulo CRM + diagnóstico en Gratis + voz | Precios | Pendiente |
| C · Diseño | Mocks de hero, agentes, métricas y casos (móvil y escritorio) | Estilo visual | Pendiente |
| D · Implementación | Rama `operador/landing-agentes`, es/en/pt, comprobaciones | Revisión en local | Pendiente |
| E · Motor | Catálogo Meta-first, alta Meta primero, diagnóstico en Gratis, reporte programado | Despliegue del motor | Pendiente |
| F · Lanzamiento | Motor → web; App Review aprobado | OK final | Pendiente |

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
| — | Precios Meta | _pendiente (fase B)_ |
| — | Precio mínimo módulo CRM | _pendiente (fase B)_ |
| — | Diagnóstico en Gratis / voz solo pago | _pendiente (fase B)_ |

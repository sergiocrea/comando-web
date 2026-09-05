# `/app/panel/` — Panel interno del operador de Comando

Lo que el operador ve cuando entra a `comando.pro/app/panel/`: sus recordatorios, qué merece
su atención, qué debe revisar en su CRM, su calendario, sus avisos y automatizaciones, su
historial, las aprobaciones de su equipo, la sección de marketing y su cuenta.

Este documento es **el contrato entre el panel y el engine**. El panel se construyó a partir del
inventario completo de capacidades de `comando-pro` (banco de comandos, tres capas proactivas,
sales intelligence, planes 09 y 06, catálogo de conectores, precios) e **incluye lo que aún no
está implementado en el backend**: cada parte que depende de un endpoint inexistente se
degrada a un estado «se activa pronto» con la frase equivalente para pedirlo por WhatsApp.
La tabla de la sección 4 dice qué existe hoy y qué hay que construir.

## 1. Principios de producto que el panel respeta

1. **WhatsApp sigue siendo la superficie de mando.** El panel muestra, ordena y lanza; cada
   widget tiene un botón que abre WhatsApp con la frase lista (`wa.me/<Comando>?text=…`).
   Ninguna escritura en el CRM ocurre desde el panel sin pasar por vista previa y `CONFIRMAR`.
2. **Una definición por concepto.** El panel no recalcula nada: pinta lo que devuelven las
   métricas del agente, las señales de sales intelligence y los reportes del planner. Si un
   número no se puede reproducir en el CRM en menos de 5 minutos, no se muestra como hecho.
3. **Tres capas proactivas, visibles como tres.** Señales del embudo (9), reglas por evento
   (5 eventos) y avisos con cadencia (métricas del agente). Cada notificación acepta respuesta
   (`VER`, `OK`, `LUEGO`, `BASTA`, `POR QUÉ`) y el panel expone el KPI único: tasa de respuesta a 24 h.
4. **El silencio es un mensaje.** Nada de «hoy no hay novedades». Un briefing vacío no se envía.
5. **Anti-vigilancia (plan 09 §9).** Sin rankings, sin uso de Comando como métrica de nadie,
   sin sugerencias sobre personas, sin proyecciones. La sección Equipo lo dice en pantalla.
6. **Privacidad por diseño.** El panel solo consulta endpoints del engine con la sesión del
   operador (RLS por tenant y operador). A diferencia de `/app/dashboard/` (solo esquema), el
   panel sí muestra registros del CRM: son los del propio operador.

## 2. Secciones

| Ruta | Sección | Qué muestra | De dónde sale |
|---|---|---|---|
| `#/hoy` | **Hoy** | Saludo; KPIs (negocios abiertos y plata, tareas de hoy, tarjetas de atención, comandos usados); plan esperando `CONFIRMAR`; «Qué merece tu atención hoy» (briefing) con acciones; recordatorios de hoy; salud del CRM resumida; KPIs de avisos; últimos comandos | `daily_briefing` + recomendaciones, tareas, salud, pipeline, cuota, agente, historial |
| `#/recordatorios` | **Recordatorios y tareas** | Hoy · Vencidas · Próximas · Hechas; origen (WhatsApp, tarjeta, regla); recordatorio enviado; «Hecha» y «Cancelar» | `operator_task`, `task-reminder-dispatcher` |
| `#/calendario` | **Calendario** | Mes con tareas, visitas, cierres esperados, briefing, avisos con cadencia, reconciliación, reportes y marketing; detalle del día | tareas + `expectedCloseDate` + `briefing_cadence` + `operator_agent_rule.next_evaluation_at` + reportes programados |
| `#/salud` | **Qué revisar en tu CRM** | Dos relojes de sync (`reconcile_age_hours`, `inbound_age_hours`, `drift_count`, escrituras pendientes); aviso de dueños (D5); 12 métricas con valor, denominador, severidad, «por qué importa», «cómo reproducirlo en el CRM», «Ver la lista» y «Vigilarlo» | métricas del agente (`stale_records`, `unassigned_records`, `duplicate_records`, `signal_count(missing_critical_data)`, `orphan_records`, `open_tasks`, `field_value_out_of_list`) |
| `#/embudo` | **Embudo y reportes** | Plata abierta, ganado/perdido del mes, Separación; por etapa, por responsable (con «Sin responsable»), por campo propio, por fuente; movimiento de etapas (historial real, retrocesos, días por etapa); reportes programados; últimas consultas | `GENERATE_REPORT` (incl. temporal), catálogo de etapas, digests |
| `#/avisos` | **Avisos y automatizaciones** | Pestañas: Recibidos (notificaciones con respuesta, feedback 👍👎, KPIs); Señales (9 señales, umbrales, p75); Reglas por evento (`group_window`, `direction`); Avisos con cadencia (pausar/reanudar); Horario y briefing (preferencias, cadencia, vista previa del briefing); Galería (43 playbooks con evidencia y frase de activación) | `operator-agent`, `sales-intelligence` policy, `automation_rule`, `patterns.json` |
| `#/historial` | **Historial de comandos** | Cada comando: frase, plan, estado (esperando, ejecutado, en aprobación, fallido-revertido, cancelado, no se pudo), tipos, registros, Ref; filtros; «deshacer» | `operator_dialogue_entry` (90 días) + `command_plan` + journal |
| `#/aprobaciones` | **Aprobaciones** | Planes del equipo que exceden límites: vista previa, quién, motivo, vencimiento (14 días); aprobar/rechazar con motivo; decididas; límites del equipo | approvals + policy |
| `#/marketing` | **Marketing** (nuevo) | Cuentas (Meta: Facebook + Instagram; TikTok; Google Ads próximamente); KPIs del periodo; tabla de campañas con estado, presupuesto, gasto, leads, CPL, CTR, calificados y ganados en el CRM; embudo anuncio→venta; automatizaciones (presupuesto, velocidad, audiencias, reportes, formularios, reactivación); reportes semanal/mensual; **analista humano** (asignado, próxima revisión, recomendaciones, pedir análisis) | nuevo módulo, ver §5 |
| `#/comando` | **Mi Comando** | Perfil del agente (nombre, instrucciones, contexto de negocio); memoria explícita por tipo con alta; alias de campos aprendidos | `operator-agent` profile/memories, `tenant_field_alias` |
| `#/integraciones` | **Integraciones** | CRM activo con espejo, capacidades (`crmCapabilities`: escrituras, campos ocultos, campo de etiquetas), campos activos; hojas de Google; cuentas de anuncios; conectores en preparación; recuperación de conexión | connections, sheets sources, `crm/fields`, catálogo |
| `#/equipo` | **Equipo** | Personas con rol, equipo, WhatsApp, dueño del CRM vinculado, comandos del mes; dueños en el CRM vs personas en Comando (D5); roles; política anti-vigilancia | `operator_identity`, roles, `resolve_operator_crm_owner` |
| `#/plan` | **Plan y consumo** | Plan, comandos (cupo, add-ons, ajustes, usados, saldo, reset, aviso al 80 %), contactos del espejo, conexiones, paquetes, facturas, tabla de planes | cuota efectiva (UC-006), `v1/public/plans` |
| `#/ajustes` | **Ajustes** | Cuenta (Clerk), WhatsApp, zona horaria, seguridad (PIN, sesión), privacidad (90 días, 7 días, campos sensibles), cerrar sesión | `auth/me`, Clerk |

## 3. Archivos

| archivo | qué es |
|---|---|
| `index.html` | shell: barra lateral, cabecera (plan, botón de WhatsApp, usuario), `COMANDO_CONFIG` |
| `panel.js` | sesión de Clerk (misma que `/app/`), rutas por hash, carga con `Promise.allSettled`, delegación de clics y formularios, insignias |
| `sections.js` | las 14 secciones: `load` (qué pide), `view` (cómo se ve), `act` (clics), `forms` (envíos) |
| `api.js` | cliente del engine (Bearer, reintento si el JWT venció, `x-request-id`); cada método devuelve datos o `{pending:true}` si el endpoint aún no existe (404/501); `createMockApi` para `?mock=1` |
| `mock-data.js` | fixtures de un tenant inmobiliario con el vocabulario del portal de pruebas |
| `ui.js` | escape, formatos LatAm (`S/ 9.870.000`, `71 %`), chips, `wa()` con la frase, toasts, iconos |
| `panel.css` | tokens de `../onboarding.css`, layout con barra lateral (cajón bajo 960 px), componentes |

Sin build ni dependencias: módulos ES nativos. Servir por HTTP:

```bash
cd comando-web && python3 -m http.server 8000
# http://localhost:8000/app/panel/?mock=1   ← sin backend, todas las secciones con datos
# http://localhost:8000/app/panel/          ← sesión de Clerk + engine real
```

Verificación rápida (sintaxis) como en `/app/dashboard/`:

```bash
for f in app/panel/*.js; do cp "$f" "/tmp/$(basename $f .js).mjs" && node --check "/tmp/$(basename $f .js).mjs"; done
```

## 4. Endpoints: lo que existe y lo que falta

Base `COMANDO_CONFIG.engineUrl` (`https://app.comando.pro/api`). Autenticación: JWT de Clerk
(plantilla `comando`) en `Authorization: Bearer`; mutaciones con `x-request-id` (y
`idempotency-key` donde el engine lo exige). El panel trata **404 y 501 como «todavía no»**,
no como error: así se puede desplegar antes de que el backend termine.

### 4.1 Ya existen en `engine-intelligence` (el panel los usa hoy)

| método y ruta | usado en | notas |
|---|---|---|
| `GET /auth/me` | cabecera, Hoy, Plan, Ajustes | `SignupStatus`: `plan`, `whatsapp`, `comandoNumber`, `waLink`, `crmConnected`. **Falta** `name`, `role`, `timezone`, `country` (el panel los toma de Clerk si no vienen) |
| `GET /integrations/connections` | Integraciones, Salud | **Pedido**: incluir `settings.crmCapabilities` (writes, hiddenFields, deniedObjects, tagField), `lastReconciledAt`, `lastInboundAt`, `driftCount` y conteos del espejo por objeto |
| `GET /integrations/google-sheets/sources` | Integraciones | |
| `GET /crm/fields` | Integraciones (conteo de campos activos) | ya lo usa `/app/dashboard/` |
| `GET /operator-agent` | Hoy, Avisos, Mi Comando, Ajustes | devuelve profile, preferences, memories, rules, notifications, budget. **Pedido**: `briefing_cadence` en preferences (migración 000131 ya la tiene), `aliases` (de `tenant_field_alias`), y en cada notificación `text`, `layer` (`signal|event|agent|briefing|task`) y `response` (la palabra con la que respondió el operador) |
| `PUT /operator-agent/preferences` | Avisos › Horario | **Pedido**: aceptar `briefingCadence` y `briefingAt` (hoy el esquema es `.strict()` y los rechazaría; el panel cae a WhatsApp si recibe 400) |
| `PUT /operator-agent/profile` · `POST /operator-agent/memories` · `POST /operator-agent/feedback` | Mi Comando, Avisos | |
| `PATCH /operator-agent/rules/:id/status` | Avisos › cadencia | `{status:'active'|'paused'}` |
| `GET /sales-intelligence/recommendations?status=&limit=` | Hoy | **Pedido**: incluir en `subject` el nombre del registro, el contacto y su teléfono (hoy solo `externalId`) |
| `POST /sales-intelligence/recommendations/:id/{accept|dismiss|snooze}` | Hoy | `snooze` con `{snoozedUntil}` sin milisegundos |
| `POST /approvals/:id/decision` | Aprobaciones | `{decision:'approve'|'reject', reason?}` |
| `GET /v1/public/plans` | Plan | sin auth |

### 4.2 Propuestos (el panel ya los llama; devuelven 404 hasta que existan)

Todos bajo la misma auth. Formas mínimas que el panel espera; se pueden extender.

| método y ruta | sección | respuesta esperada | fuente en el backend |
|---|---|---|---|
| `GET /operator/tasks?status=open,completed&limit=` | Recordatorios, Hoy, Calendario | `[{id,title,dueAt,status:'open'|'completed'|'cancelled',recordName?,recordType?,remindedAt?,source:'whatsapp'|'recommendation'|'automation',kind?:'visit'}]` | `tenant.operator_task` (+ nombre del `crm_record`) |
| `POST /operator/tasks/:id/complete` | Recordatorios | `{ok:true}` | el verbo «hecha» del plan 09 §8 (CV11); mientras no exista, el panel abre WhatsApp con «hecha …» |
| `GET /operator/calendar?from=&to=` | Calendario | `[{id,kind:'close'|'briefing'|'rule'|'meeting'|'sync'|'report'|'marketing',title,at,allDay?,repeat?}]` | `expectedCloseDate` de negocios abiertos, `briefing_cadence`, `operator_agent_rule.next_evaluation_at`, reconciliación programada, reportes con cadencia, meetings del CRM |
| `GET /crm/health` | Salud, Hoy, Equipo | `{computedAt, owners:{crmOwners,comandoPeople}, sync:{provider,reconcileAgeHours,inboundAgeHours,driftCount,pendingWrites,healthy}, metrics:[{id,label,value,of?,unit?,severity:'high'|'warning'|'info',entity,why,reproduce,ask,weekly,amount?}]}` | métricas del agente ya implementadas (`stale_records(entity,days,open_only)`, `unassigned_records(entity)`, `duplicate_records(entity,key)`, `signal_count(missing_critical_data)`, `reconcile_age_hours`) + pendientes del plan 09 (`orphan_records`, `field_value_out_of_list`, `inbound_age_hours`, `drift_count`). `ask`/`weekly` son las frases que el planner ya entiende |
| `GET /crm/pipeline/summary` | Embudo, Hoy | `{computedAt,currency,open:{count,amount},wonMonth,lostMonth,stages:[{name,count,amount,order}],byOwner:[{owner,count,amount}] (siempre con «Sin responsable»),byField:{label,rows:[{value,count,amount}]},bySource:[{value,count}],temporal:{since,moved,backward,avgDaysByStage:[{name,days}],moves:[{name,from,to,at,backward?}]},separations:[{name,amount,days}],scheduledReports:[{id,title,cadence,channel,status}],recent:[{id,ask,at,answer}]}` | los mismos `GENERATE_REPORT` del banco (por etapa, por dueño, por campo propio, temporal) ejecutados sobre el espejo; montos en unidades mayores |
| `GET /operator/commands?limit=` | Historial, Hoy | `[{id,at,utterance,plan,status:'pending'|'executed'|'awaiting_approval'|'failed'|'cancelled'|'declined'|'expired',types:[CommandType],records,ref,expiresAt?,note?,voice?}]` | `operator_dialogue_entry` + `command_plan` + journal de ejecución (el mensaje final debe salir del journal, no del plan) |
| `GET /approvals?status=&limit=` | Aprobaciones, insignia | `[{id,createdAt,expiresAt,requester,plan,reason,preview:[líneas],ref,status,decidedBy?,decidedAt?,decisionReason?}]` | approvals existentes (hoy solo hay `POST decision`) |
| `GET /automation-rules` | Avisos › eventos | `[{id,name,event,entity,condition (en palabras),action (en palabras),groupWindow?,status,firedWeek,createdAt}]` | `automation_rule` del `automation-rule-evaluator` |
| `GET /automation-rules/playbooks` | Avisos › galería | `[{group,id,name,ask,evidence,active,needs?}]` | `docs/research/command-training-dataset/patterns.json` + qué reglas del tenant coinciden |
| `GET /sales-intelligence/policy` | Avisos › señales | `{enabledSignals:[…9],thresholds:{inactiveDays,closeDateApproachingDays,stageStalledDays,highValue:{mode:'p75'|'absolute',<CUR>:mayor}},criticalFields,routes}` | `policy-schema.ts`; el cambio de señales sigue siendo por WhatsApp («no me avises más de…») |
| `GET /billing/quota` | Plan, Hoy | `{plan:{code,name,priceUsd,interval},period:{start,end,resetAt},commands:{allowance,addons,adjustments,used,balance},contacts:{used,limit},connections:{used,limit|null},audioShare,blockedReason|null,invoices:[{id,date,amount,status}]}` | UC-006 «cuota efectiva» del control plane, expuesto al propio tenant |
| `GET /team` | Equipo, Aprobaciones | `{people:[{id,name,role,whatsapp:'verified'|'pending',team,crmOwner|null,commandsMonth,lastActive}],roles:{owner,admin,supervisor,agent,analyst},crmOwners,limits:{assignMax,broadcastMaxCost,discountMaxPct,stepUpAbove}}` | `operator_identity`, `resolve_operator_crm_owner`, policy por rol |
| `GET /marketing/overview` | Marketing, Integraciones | ver §5 | módulo nuevo |

### 4.3 Reglas para el backend

- Toda ruta respeta RLS por `tenant_id`/`operator_id`; un `agent` ve lo suyo, un `owner` ve el tenant.
- Los montos vienen en unidades mayores y con `currency` ISO; el panel formatea (`S/ 9.870.000`).
- Nunca ids internos de etapa/dueño en las respuestas: etiquetas del catálogo (`crm_property_catalog`).
- Fechas en ISO 8601 con zona; el panel las muestra en la zona del operador.
- `404`/`501` significan «no implementado» y el panel lo muestra como «se activa pronto».

## 5. Marketing: alcance del módulo nuevo

Encargo: automatizar campañas de Facebook, Instagram y TikTok de las empresas, con reportería
y un analista humano. El panel lo modela así; el backend no existe todavía.

**Cuentas.** Conexión por Nango (misma frontera de credenciales que los CRM):
`POST /integrations/nango/connect-sessions {integrationId:'meta-ads'|'tiktok-ads'}`. Objetos:
cuenta publicitaria, campaña, conjunto, anuncio, formulario de leads, audiencia. Logos ya
existen en `assets/img/logos/meta.svg` y `tiktok.svg`.

**Atribución al CRM.** El lead entra con `fuente_lead` y `campaña` (formulario de Meta/TikTok o
parámetro de la landing) y se sigue por el embudo con los mismos eventos del espejo. El endpoint
`POST /attribution/qualified` ya existe para marcar calificado/convertido. «Contactados en
menos de 5 minutos» sale de las reglas de velocidad de respuesta (`speed.*`).

**Automatizaciones (reglas nuevas del mismo motor).** Presupuesto (`pausar si CPL > X durante N
días`, `subir 20 % con confirmación`), velocidad (`lead de campaña sin contacto en 5 min →
avisar al dueño`), audiencias desde etapas (`Cerrado ganado → excluir`, `Negociación →
retargeting`), formularios (`lead sin teléfono → aviso + tarea`), reactivación (`perdido por
fuera de presupuesto → audiencia a los 90 días`), reporte semanal. Pausar o cambiar presupuesto
es una **escritura** y pasa por vista previa y `CONFIRMAR`.

**Reportes.** Semanal (lunes) y mensual (primer día hábil): inversión y leads por canal y
campaña vs periodo anterior; embudo impresiones → clics → leads → contactados → calificados →
visitas → ganados; costo por lead, por calificado y por venta; velocidad de respuesta por
persona; leads que rompen la atribución; recomendaciones del analista y qué pasó con las
anteriores. Entrega por WhatsApp (resumen) y PDF (visor pendiente).

**Analista humano.** Un analista de Comando asignado al tenant, con revisión semanal.
Entidades: `marketing_analyst_assignment` (analista, tenant, próxima revisión, SLA),
`marketing_recommendation` (texto, impacto, estado pendiente/aplicada/descartada, fecha),
`marketing_request` (pregunta del operador, urgencia, alcance, respuesta, estado). Aplicar una
recomendación es un comando normal por WhatsApp. **Pendiente de decidir**: si el servicio va
incluido en Pro/Enterprise o se contrata aparte (no está en `prompt-precios.md`).

**`GET /marketing/overview`** devuelve `{accounts:[{id,provider:'meta'|'tiktok'|'google-ads',name,status:'active'|'pending'|'soon',channels,lastSyncAt,adAccount}], period:{label,spend,currency,impressions,clicks,leads,cpl,contacted5min,qualified,won,revenue,prevSpend,prevLeads,prevCpl}, campaigns:[{id,name,channel,objective,status,dailyBudget,spend,leads,cpl,ctr,trend,crmQualified,crmWon,pausedReason?}], funnel:[{label,value}], automations:[{id,name,status,firedMonth,kind:'budget'|'speed'|'audience'|'report'}], reports:[{id,title,at,kind,highlights}], analyst:{name,title,avatar,nextReviewAt,lastDeliveryAt,responseSla,recommendations:[…],requests:[…]}}`.
Mutaciones previstas: `POST /marketing/requests`, `POST /marketing/recommendations/:id/{apply|dismiss}`.

## 6. Lo que el panel deja explícitamente fuera

- Editar campos del CRM registro por registro (eso es WhatsApp con vista previa).
- Crear reglas con formularios: las reglas nacen de una frase; el panel las lista, pausa y reanuda.
- Cualquier forecast o proyección (plan 09 §9).
- Rankings de personas o métricas de uso de Comando por persona visibles al grupo.
- Enviar mensajes a clientes: el panel abre `wa.me` del contacto para que el operador lo mande él.

## 7. Fuentes en `comando-pro` de las que sale cada decisión

- `docs/research/capabilities/capabilities.json` y `catalogo-respuestas.md` — capacidades, degradaciones, textos de WhatsApp.
- `docs/research/capabilities/banks/dolores-crm.README.md` — vocabulario del portal, 12 familias de dolor, distribución del banco.
- `docs/plans/09-PROACTIVIDAD-Y-BANCO-POR-DOLOR.md` y `docs/research/panel-2026-09-05/panel-consolidado.md` — tres capas, 9 señales, respuestas a notificaciones, silencio que difiere, dueños al conectar, anti-vigilancia, KPIs.
- `docs/runbooks/operator-agents.md` — perfil, preferencias, memoria, reglas y métricas del agente.
- `docs/runbooks/crm-capabilities.md` — snapshot `crmCapabilities` por conexión.
- `docs/research/command-training-dataset/patterns.json` — los 43 playbooks de la galería.
- `docs/plans/06-ADMIN-CONTROL-PLANE-USE-CASES.md` — cuota efectiva (UC-006), conexiones, purga.
- `docs/comando-sales-intelligence-architecture.md` — skills `deal_health`, `next_best_action`, `daily_briefing`, acciones de las tarjetas.
- `comando-web/docs/prompt-precios.md` y `js/pricing.js` — planes, cupos, aviso al 80 %.
- `libs/contracts/src/lib/command-plan.ts` — los 18 tipos de comando del historial.

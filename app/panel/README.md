# `/app/panel/` — Panel interno del operador de Comando

Lenguaje visual tomado del dashboard de Minimals (fondo claro, tarjetas blancas con sombra suave y radio 16, Public Sans, verde `#00A76F`, barra lateral clara, banner de bienvenida oscuro y tarjeta destacada).

Lo que el operador ve cuando entra a `comando.pro/app/panel/`: una bandeja con lo que
depende de él ahora, su agenda, la plata en juego y qué revisar en su CRM, de qué le avisa
Comando, sus campañas con un analista humano, y su cuenta. **Seis secciones, cero pestañas.**

Este documento es **el contrato entre el panel y el engine**. El panel se construyó a partir del
inventario completo de capacidades de `comando-pro` e **incluye lo que aún no está implementado
en el backend**: cada parte que depende de un endpoint inexistente se degrada a un estado «se
activa pronto» con la frase equivalente para pedirlo por WhatsApp. La tabla de la sección 4 dice
qué existe hoy y qué hay que construir. El rediseño del 5-sep-2026 (diagnóstico, propuesta,
qué se eliminó y por qué) está en [`docs/rediseno-2026-09-05.md`](docs/rediseno-2026-09-05.md).

## 1. Principios de producto que el panel respeta

1. **WhatsApp sigue siendo la superficie de mando.** El panel muestra, ordena y lanza; cada
   fila tiene una sola acción principal y, cuando escribe en el CRM, abre WhatsApp con la frase
   lista (`wa.me/<Comando>?text=…`). Ninguna escritura ocurre sin vista previa y `CONFIRMAR`.
2. **Nada que aprender.** Seis secciones que responden una pregunta cada una («¿qué hago
   ahora?», «¿qué tengo esta semana?», «¿cuánta plata hay?», «¿de qué me avisa?», «¿qué me
   traen los anuncios?», «¿cómo está mi cuenta?»). Sin pestañas, sin buscador, sin jerga del
   sistema (señal, métrica, cadencia, regla, briefing, reconciliación, espejo, prioridad, Ref).
3. **Una definición por concepto.** El panel no recalcula nada: pinta lo que devuelven las
   métricas del agente, las señales de sales intelligence y los reportes del planner. Si un
   número no se puede reproducir en el CRM en menos de 5 minutos, no se muestra como hecho.
4. **Las tres capas proactivas se ven como una sola lista** «Comando te avisa cuando…»,
   agrupada en «Siempre», «Cuando pasa algo» y «Cada cierto tiempo». Cada aviso acepta respuesta
   (`VER`, `OK`, `LUEGO`, `BASTA`, `POR QUÉ`). Los KPI de proactividad (plan 09 §7) se miden en
   el backend y **no** se muestran al operador.
5. **El silencio es un mensaje.** Nada de «hoy no hay novedades». Una bandeja vacía dice «el
   silencio es la buena noticia».
6. **Anti-vigilancia (plan 09 §9).** Sin rankings, sin uso de Comando como métrica de nadie,
   sin sugerencias sobre personas, sin proyecciones. El panel no muestra comandos por persona.
7. **Privacidad por diseño.** El panel solo consulta endpoints del engine con la sesión del
   operador (RLS por tenant y operador). A diferencia de `/app/dashboard/` (solo esquema), el
   panel sí muestra registros del CRM: son los del propio operador.
8. **Móvil primero.** Barra inferior con las seis secciones bajo 1200 px, filas de una columna,
   sin tablas anchas, lista por día en vez de cuadrícula de mes.

## 2. Secciones

| Ruta | Sección | La pregunta que responde | Qué muestra | De dónde sale |
|---|---|---|---|---|
| `#/hoy` | **Hoy** | ¿Qué hago ahora? | Saludo; 3 números (plata en juego, para hoy, te esperan); **la bandeja**: una sola lista ordenada por urgencia —plan esperando `CONFIRMAR`, aprobaciones pendientes (dueño), tareas vencidas, tareas de hoy, lo que merece atención (tarjetas del briefing), planes esperando al dueño— con una acción principal por fila y lo demás en «más»; «Qué revisar en tu CRM» (3 barras); «Lo último que pediste» (5 filas, «Deshacer») | tareas, approvals, recomendaciones, `daily_briefing`, pipeline, salud, historial |
| `#/agenda` | **Agenda** | ¿Qué tengo esta semana? | Lista por día (Vencidas · Hoy · Mañana · Esta semana · Más adelante; Hechas plegadas) con «Hecha» como acción principal; vista de mes opcional. Solo lo del vendedor: recordatorios, visitas, reuniones y cierres esperados. Nada del sistema. | `operator_task`, `expectedCloseDate`, meetings del CRM |
| `#/crm` | **Mi CRM** | ¿Cuánta plata hay y qué está mal? | «Plata en juego»: 3 números (abierta, ganado, perdido), por etapa, por campo propio. «Qué revisar»: estado del CRM en una línea («al día · hace 6 h»), aviso de dueños (D5) solo si aplica, 12 filas (viejo, vacío, repetido, sin dueño) con «Ver la lista» y, en «más», «Avisarme cada semana» y «cómo lo sacas en tu CRM» | `GET /crm/pipeline/summary`, `GET /crm/health` |
| `#/avisos` | **Avisos** | ¿De qué me avisa Comando? | «Comando te avisa cuando…» en tres bloques: Siempre (señales activas como frases, «Apagar»), Cuando pasa algo (reglas por evento, «Pausar»), Cada cierto tiempo (avisos con cadencia y reportes programados, «Pausar»). «Cuándo te escribe» (horario, máximo por día, interruptor; resumen de la mañana: cadencia y hora). «Ideas para activar con una frase» (8 playbooks no activos) | `operator-agent`, `sales-intelligence/policy`, `automation-rules`, `pipeline.scheduledReports`, `playbooks` |
| `#/marketing` | **Marketing** | ¿Qué me traen los anuncios y qué dice mi analista? | 4 números (inversión, leads, costo por lead, costo por venta); campañas como filas (canal, gasto, leads, CPL, ganados; «Pausar» / «Reanudar», en «más» subir presupuesto y ver sus leads) con las cuentas conectadas; **analista humano** (próxima revisión, recomendaciones con «Aplicar», «Preguntarle» por WhatsApp, preguntas anteriores plegadas); embudo anuncio→venta; «Lo que se hace solo» (automatizaciones); reportes semanal/mensual («Al WhatsApp») | `GET /marketing/overview` (§5) |
| `#/cuenta` | **Cuenta** | ¿Cómo está mi cuenta? | Tu cuenta (nombre, WhatsApp, plan con barra de comandos usados, cambiar de plan); Tu CRM y tus cuentas (CRM activo con estado en una línea, hojas, cuentas de anuncios; conectar / cambiar); Tu equipo (personas con rol y WhatsApp, sin métricas de uso; aviso de dueños); Lo que Comando sabe de ti (memoria explícita con «Olvidar», «Enseñarle algo» por WhatsApp); Privacidad y salida | `auth/me`, `billing/quota`, connections, sheets, `team`, `operator-agent`, Clerk |

Lo que ya no tiene sección propia y dónde quedó: Recordatorios → Agenda; Calendario → Agenda
(vista Mes); Qué revisar en tu CRM y Embudo → Mi CRM; Historial → «Lo último que pediste» en
Hoy; Aprobaciones → la bandeja de Hoy; Mi Comando, Integraciones, Equipo, Plan y Ajustes →
Cuenta. La lista completa de eliminaciones con su motivo está en `docs/rediseno-2026-09-05.md`.

## 3. Archivos

| archivo | qué es |
|---|---|
| `index.html` | shell: barra lateral (escritorio), barra inferior (móvil), cabecera con el botón de WhatsApp y la cuenta, `COMANDO_CONFIG` |
| `panel.js` | sesión de Clerk (misma que `/app/`), rutas por hash, carga con `Promise.allSettled`, delegación de clics y formularios, insignia de Hoy (cuántas cosas esperan) |
| `sections.js` | las 6 secciones: `load` (qué pide), `view` (cómo se ve), `act` (clics), `forms` (envíos) |
| `setup.js` | puesta en marcha dentro del panel: vincular WhatsApp (número → código VERIFICAR → sondeo) y conectar el CRM (HubSpot/Salesforce por Nango, Google Sheets con el selector de Google, desconectar, recuperar, purgar). Antes era el onboarding de `/app/`; ahora `/app/` solo es el acceso con Clerk |
| `api.js` | cliente del engine (Bearer, reintento si el JWT venció, `x-request-id`); cada método devuelve datos o `{pending:true}` si el endpoint aún no existe (404/501); `createMockApi` para `?mock=1` |
| `mock-data.js` | fixtures de un tenant inmobiliario con el vocabulario del portal de pruebas |
| `ui.js` | escape, formatos LatAm (`S/ 9.870.000`), chips, `row()` (una acción principal + «más»), `wa()` con la frase, frases «te avisa cuando…» por señal, toasts, iconos |
| `panel.css` | tema claro estilo Minimals (tokens, sombras, Public Sans), barra lateral ≥ 1200 px y barra inferior debajo, componentes |
| `docs/rediseno-2026-09-05.md` | diagnóstico del panel anterior, propuesta, qué se eliminó, fusionó y renombró, dudas para el dueño |

Sin build ni dependencias: módulos ES nativos. Servir por HTTP:

```bash
cd comando-web && python3 -m http.server 8000
# http://localhost:8000/app/panel/?mock=1   ← sin backend, todas las secciones con datos
# http://localhost:8000/app/panel/?mock=1&wa=pending   ← el paso «Vincula tu WhatsApp» dentro del panel
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
| `GET /auth/me` | cabecera, Hoy, Cuenta | `SignupStatus`: `plan`, `whatsapp`, `comandoNumber`, `waLink`, `crmConnected`. **Falta** `name`, `role`, `timezone`, `country` (el panel los toma de Clerk si no vienen) |
| `GET /integrations/connections` | Cuenta | **Pedido**: incluir `settings.crmCapabilities` (writes, hiddenFields, deniedObjects, tagField), `lastReconciledAt`, `lastInboundAt`, `driftCount` y conteos del espejo por objeto |
| `GET /integrations/google-sheets/sources` | Cuenta | |
| `GET /crm/fields` | (ya no se muestra; `api.fieldsSummary` sigue disponible) | ya lo usa `/app/dashboard/` |
| `GET /operator-agent` | Avisos (reglas con cadencia, preferencias), Cuenta (memoria) | devuelve profile, preferences, memories, rules, notifications, budget. **Pedido**: `briefing_cadence` en preferences (migración 000131 ya la tiene), `aliases` (de `tenant_field_alias`), y en cada notificación `text`, `layer` (`signal|event|agent|briefing|task`) y `response` (la palabra con la que respondió el operador) |
| `PUT /operator-agent/preferences` | Avisos › Cuándo te escribe | **Pedido**: aceptar `briefingCadence` y `briefingAt` (hoy el esquema es `.strict()` y los rechazaría; el panel cae a WhatsApp si recibe 400) |
| `PUT /operator-agent/profile` · `POST /operator-agent/memories` · `POST /operator-agent/feedback` | (el panel ya no tiene formularios para esto: perfil y memoria se enseñan por WhatsApp; los métodos siguen en `api.js`) | |
| `PATCH /operator-agent/rules/:id/status` | Avisos (Pausar / Reanudar) | `{status:'active'|'paused'}` |
| `GET /sales-intelligence/recommendations?status=&limit=` | Hoy (bandeja) | **Pedido**: incluir en `subject` el nombre del registro, el contacto y su teléfono (hoy solo `externalId`) |
| `POST /sales-intelligence/recommendations/:id/{accept|dismiss|snooze}` | Hoy («Luego» = snooze, «Basta» = dismiss; «Crear tarea» y «Por qué» van por WhatsApp) | `snooze` con `{snoozedUntil}` sin milisegundos |
| `POST /approvals/:id/decision` | Hoy (bandeja: Aprobar / Rechazar) | `{decision:'approve'|'reject', reason?}` |
| `GET /v1/public/plans` | (ya no se muestra la tabla de planes; enlace a `/#precios`) | sin auth |

### 4.2 Propuestos (el panel ya los llama; devuelven 404 hasta que existan)

Todos bajo la misma auth. Formas mínimas que el panel espera; se pueden extender.

| método y ruta | sección | respuesta esperada | fuente en el backend |
|---|---|---|---|
| `GET /operator/tasks?status=open,completed&limit=` | Hoy, Agenda | `[{id,title,dueAt,status:'open'|'completed'|'cancelled',recordName?,recordType?,remindedAt?,source:'whatsapp'|'recommendation'|'automation',kind?:'visit'}]` | `tenant.operator_task` (+ nombre del `crm_record`) |
| `POST /operator/tasks/:id/complete` | Hoy, Agenda («Hecha») | `{ok:true}` | el verbo «hecha» del plan 09 §8 (CV11); mientras no exista, el panel abre WhatsApp con «hecha …» |
| `GET /operator/calendar?from=&to=` | Agenda (solo pinta `close`, `meeting` y `marketing` sin `repeat`; `briefing`, `rule`, `sync` y `report` se ignoran: son del sistema) | `[{id,kind:'close'|'briefing'|'rule'|'meeting'|'sync'|'report'|'marketing',title,at,allDay?,repeat?}]` | `expectedCloseDate` de negocios abiertos, `briefing_cadence`, `operator_agent_rule.next_evaluation_at`, reconciliación programada, reportes con cadencia, meetings del CRM |
| `GET /crm/health` | Mi CRM, Hoy, Cuenta | `{computedAt, owners:{crmOwners,comandoPeople}, sync:{provider,reconcileAgeHours,inboundAgeHours,driftCount,pendingWrites,healthy}, metrics:[{id,label,value,of?,unit?,severity:'high'|'warning'|'info',entity,why,reproduce,ask,weekly,amount?}]}` | métricas del agente ya implementadas (`stale_records(entity,days,open_only)`, `unassigned_records(entity)`, `duplicate_records(entity,key)`, `signal_count(missing_critical_data)`, `reconcile_age_hours`) + pendientes del plan 09 (`orphan_records`, `field_value_out_of_list`, `inbound_age_hours`, `drift_count`). `ask`/`weekly` son las frases que el planner ya entiende |
| `GET /crm/pipeline/summary` | Mi CRM, Hoy, Avisos (`scheduledReports`) | `{computedAt,currency,open:{count,amount},wonMonth,lostMonth,stages:[{name,count,amount,order}],byOwner:[{owner,count,amount}] (siempre con «Sin responsable»),byField:{label,rows:[{value,count,amount}]},bySource:[{value,count}],temporal:{since,moved,backward,avgDaysByStage:[{name,days}],moves:[{name,from,to,at,backward?}]},separations:[{name,amount,days}],scheduledReports:[{id,title,cadence,channel,status}],recent:[{id,ask,at,answer}]}` | los mismos `GENERATE_REPORT` del banco (por etapa, por dueño, por campo propio, temporal) ejecutados sobre el espejo; montos en unidades mayores |
| `GET /operator/commands?limit=` | Hoy (plan pendiente en la bandeja, «Lo último que pediste») | `[{id,at,utterance,plan,status:'pending'|'executed'|'awaiting_approval'|'failed'|'cancelled'|'declined'|'expired',types:[CommandType],records,ref,expiresAt?,note?,voice?}]` | `operator_dialogue_entry` + `command_plan` + journal de ejecución (el mensaje final debe salir del journal, no del plan) |
| `GET /approvals?status=&limit=` | Hoy (bandeja e insignia) | `[{id,createdAt,expiresAt,requester,plan,reason,preview:[líneas],ref,status,decidedBy?,decidedAt?,decisionReason?}]` | approvals existentes (hoy solo hay `POST decision`) |
| `GET /automation-rules` | Avisos › Cuando pasa algo | `[{id,name,event,entity,condition (en palabras),action (en palabras),groupWindow?,status,firedWeek,createdAt}]` | `automation_rule` del `automation-rule-evaluator` |
| `GET /automation-rules/playbooks` | Avisos › Ideas | `[{group,id,name,ask,evidence,active,needs?}]` | `docs/research/command-training-dataset/patterns.json` + qué reglas del tenant coinciden |
| `GET /sales-intelligence/policy` | Avisos › Siempre (cada señal activa como frase «te avisa cuando…»; «Apagar» abre WhatsApp) | `{enabledSignals:[…9],thresholds:{inactiveDays,closeDateApproachingDays,stageStalledDays,highValue:{mode:'p75'|'absolute',<CUR>:mayor}},criticalFields,routes}` | `policy-schema.ts`; el cambio de señales sigue siendo por WhatsApp («no me avises más de…») |
| `GET /billing/quota` | Cuenta | `{plan:{code,name,priceUsd,interval},period:{start,end,resetAt},commands:{allowance,addons,adjustments,used,balance},contacts:{used,limit},connections:{used,limit|null},audioShare,blockedReason|null,invoices:[{id,date,amount,status}]}` | UC-006 «cuota efectiva» del control plane, expuesto al propio tenant |
| `GET /team` | Cuenta (sin mostrar `commandsMonth`: política anti-vigilancia) | `{people:[{id,name,role,whatsapp:'verified'|'pending',team,crmOwner|null,commandsMonth,lastActive}],roles:{owner,admin,supervisor,agent,analyst},crmOwners,limits:{assignMax,broadcastMaxCost,discountMaxPct,stepUpAbove}}` | `operator_identity`, `resolve_operator_crm_owner`, policy por rol |
| `GET /marketing/overview` | Marketing, Cuenta (cuentas de anuncios) | ver §5 | módulo nuevo |

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
Mutaciones previstas: `POST /marketing/requests` (opcional: hoy el panel pregunta al analista por WhatsApp con la frase lista), `POST /marketing/recommendations/:id/{apply|dismiss}` (hoy «Aplicar» abre WhatsApp).

## 6. Lo que el panel deja explícitamente fuera

- Editar campos del CRM registro por registro (eso es WhatsApp con vista previa).
- Crear reglas con formularios: las reglas nacen de una frase; el panel las lista, pausa y reanuda.
- Perfil y memoria del agente por formulario; pedidos al analista con urgencia y alcance: se dicen por WhatsApp.
- Historial completo de comandos, aprobaciones decididas, KPI de proactividad, ficha técnica del conector, tabla de planes, catálogo de conectores futuros.
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

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

1. **El panel encola, no ejecuta.** Da igual si la frase entra por WhatsApp o por la consola de
   Hoy: va a la misma bandeja de Redis y la responde el mismo worker, con vista previa,
   `CONFIRMAR`, aprobaciones, segundo factor, cupo e historial. Un camino aparte que llamara al
   handler desde el navegador empezaría idéntico y divergiría solo, y entonces habría dos
   productos. Cada fila tiene una sola acción principal y, mientras la ruta no exista en el
   engine, cae a WhatsApp con la frase lista (`wa.me/<Comando>?text=…`).
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
| `#/hoy` | **Hoy** | ¿Qué hago ahora? | Saludo; 3 números (plata en juego, para hoy, te esperan); **la consola** (escribir una frase, «pensando…», CONFIRMAR como botón, y el catálogo de skills plegado); **la bandeja**: una sola lista ordenada por urgencia —plan esperando `CONFIRMAR`, aprobaciones pendientes (dueño), tareas vencidas, tareas de hoy, lo que merece atención (tarjetas del briefing), planes esperando al dueño— con una acción principal por fila y lo demás en «más»; «Qué revisar en tu CRM» (3 barras); «Lo último que pediste» (5 filas, «Deshacer») | tareas, approvals, recomendaciones, `daily_briefing`, pipeline, salud, historial |
| `#/crm` | **Resumen** | ¿Cuánta plata hay y qué está mal? | «Plata en juego»: 3 números (abierta, ganado, perdido), por etapa, por campo propio. «Qué revisar»: estado del CRM en una línea («al día · hace 6 h»), aviso de dueños (D5) solo si aplica, 12 filas (viejo, vacío, repetido, sin dueño) con «Ver la lista» y, en «más», «Avisarme cada semana» y «cómo lo sacas en tu CRM» | `GET /crm/pipeline/summary`, `GET /crm/health` |
| `#/agenda` | **Agenda** | ¿Qué tengo esta semana? | Lista por día (Vencidas · Hoy · Mañana · Esta semana · Más adelante; Hechas plegadas) con «Hecha» como acción principal; vista de mes opcional. Solo lo del vendedor: recordatorios, visitas, reuniones y cierres esperados. Nada del sistema. | `operator_task`, `expectedCloseDate`, meetings del CRM |
| `#/avisos` | **Automatizaciones** | ¿Qué hace Comando solo? | «Comando te avisa cuando…» en tres bloques: Siempre (señales activas como frases, «Apagar»), Cuando pasa algo (reglas por evento, «Pausar»), Cada cierto tiempo (avisos con cadencia y reportes programados, «Pausar»). «Cuándo te escribe» (horario, máximo por día, interruptor; resumen de la mañana: cadencia y hora). «Ideas para activar con una frase» (8 playbooks no activos) | `operator-agent`, `sales-intelligence/policy`, `automation-rules`, `pipeline.scheduledReports`, `playbooks` |
| `#/marketing` | **Marketing** | ¿Cuánto invertí y qué me trajo? | De cuándo son los datos y el botón de actualizar; **una barra de filtros — periodo y cuentas — que aplica al elegir, sin botón**; **un bloque de inversión y resultados por moneda** (nunca sumados); campañas agrupadas por moneda con **ROAS donde existe y costo por resultado donde no**; estado de cada cuenta publicitaria (`sin_datos` ≠ `error`); debajo, la tarjeta de conexión de Meta Ads | `GET /marketing/overview`, `POST /marketing/refresh` (§5) |
| `#/cuenta` | **Cuenta** | ¿Cómo está mi cuenta? | Tu cuenta (nombre, WhatsApp, plan con barra de comandos usados, cambiar de plan); Tu CRM y tus cuentas (CRM activo con estado en una línea, hojas, cuentas de anuncios; conectar / cambiar); Tu equipo (personas con rol y WhatsApp, sin métricas de uso; aviso de dueños); Lo que Comando sabe de ti (memoria explícita con «Olvidar», «Enseñarle algo» por WhatsApp); Privacidad y salida | `auth/me`, `billing/quota`, connections, sheets, `team`, `operator-agent`, Clerk |

Los rótulos y las rutas no coinciden a propósito: `#/crm` se llama **Resumen** (el nombre
anterior, «Mi CRM», prometía una lista de contactos que no existe y hacía creer que ahí se
actúa; lo accionable está en Hoy) y `#/avisos` se llama **Automatizaciones** (dentro hay
reglas, horarios de silencio, resumen de la mañana, tope diario y playbooks: eso es trabajo
que se hace solo, no notificaciones). Las rutas y las claves `crm.*` / `avisos.*` **no** se
renombran: son enlaces que la gente ya tiene guardados y claves que dicen dónde se lee un
texto, no qué dice.

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
# http://localhost:8000/app/panel/?mock=1&moneda=none   ← moneda sin declarar: es el único caso en que se pregunta
# ...&moneda=crm (la trajo el conector) · &moneda=account (la declaró la cuenta)
# ...&rol=agent (quien no puede cambiarla) · &pendiente=moneda (el 404 de hoy: «se activa pronto»)
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
| `GET /auth/me` | cabecera, Hoy, Cuenta | `SignupStatus`: `plan`, `whatsapp`, `comandoNumber`, `waLink`, `crmConnected`, `name`, `email`, `role`, `timezone`, `currency` y `currencySource` (`account` la declaró la cuenta · `crm` la trajo el conector · `null` no la sabe nadie: **el único caso en que se pregunta**). **Falta** `country` (el panel cae a Clerk para lo que no venga) |
| `PUT /tenant/currency` | Cuenta › Tu cuenta | `{currency:'USD'}` con `x-request-id` obligatorio → `200 {currency, source:'account'}`. `400` si no es ISO 4217 de tres letras, si falta la cabecera o si el cuerpo trae cualquier campo de más (es `.strict()`: **el tenant sale de la sesión, mandarlo es un 400**); `403` si el operador es `agent`, `supervisor` o `analyst`. Acepta minúsculas y normaliza. No se puede volver a «no declarada». Mientras la rama del engine no esté publicada devuelve 404 y el panel muestra «se activa pronto» |
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
| `GET /operator/commands?limit=` (1..100, 50 por defecto) | Hoy (la consola sondea aquí; plan pendiente en la bandeja, «Lo último que pediste») | array pelado, del más nuevo al más viejo: `[{id,at,utterance,plan:'📋 *Plan*…'|null,status:'pending'|'executed'|'awaiting_approval'|'failed'|'cancelled'|'declined'|'expired',types:[CommandType],records,ref:uuid|null,expiresAt?,note?,kind}]`. **`kind` es por lo que se ramifica el gesto**, no el texto ni el estado: `PLAN_PREVIEW` → botón CONFIRMAR, `PIN_REQUIRED` → caja del código, `APPROVAL_CREATED` → le toca a un administrador, `CLARIFICATION_*` → respuesta libre. Un turno recién registrado llega en `pending` **sin `note`**: eso es «pensando…», no un plan esperando la palabra. `note` es lo último que Comando dijo de verdad, no el plan. **No hay `voice`**: el diálogo no registra si la entrada fue audio | `operator_dialogue_entry` + `command_plan` + journal de ejecución |
| `POST /operator/commands` | Hoy › la consola | `{utterance}` (1..1000, recortado) → `200 {id, status:'accepted'|'duplicate'}`; `400` cuerpo mal formado o encolado fallido, `401` sin sesión, `409` sin WhatsApp verificado. `id` es el id del turno: con él se sondea el `GET`, sin correlacionar nada. **La `idempotency-key` no es decorativa**: el engine deriva el `id` de ella (con el tenant y el operador), así que un reintento del MISMO mensaje debe repetirla —es lo que lo vuelve `duplicate` en vez de un segundo comando— y un mensaje nuevo (el CONFIRMAR, el código) debe estrenar una. El panel **encola**, no ejecuta: mismo camino que WhatsApp —vista previa, CONFIRMAR, aprobaciones, segundo factor, cupo, historial— con origen `panel` en la bandeja de Redis (plan 15 de `comando-pro`). Con origen `panel` la respuesta **no** sale por WhatsApp: esta pantalla es el único sitio donde aparece (el código del segundo factor sí llega por WhatsApp). Mientras la rama del engine no esté publicada devuelve 404 y la consola muestra «se activa pronto» con la frase lista para WhatsApp |
| `GET /approvals?status=&limit=` | Hoy (bandeja e insignia) | `[{id,createdAt,expiresAt,requester,plan,reason,preview:[líneas],ref,status,decidedBy?,decidedAt?,decisionReason?}]` | approvals existentes (hoy solo hay `POST decision`) |
| `GET /automation-rules` | Avisos › Cuando pasa algo | `[{id,name,event,entity,condition (en palabras),action (en palabras),groupWindow?,status,firedWeek,createdAt}]` | `automation_rule` del `automation-rule-evaluator` |
| `GET /automation-rules/playbooks` | Avisos › Ideas | `[{group,id,name,ask,evidence,active,needs?}]` | `docs/research/command-training-dataset/patterns.json` + qué reglas del tenant coinciden |
| `GET /sales-intelligence/policy` | Avisos › Siempre (cada señal activa como frase «te avisa cuando…»; «Apagar» abre WhatsApp) | `{enabledSignals:[…9],thresholds:{inactiveDays,closeDateApproachingDays,stageStalledDays,highValue:{mode:'p75'|'absolute',<CUR>:mayor}},criticalFields,routes}` | `policy-schema.ts`; el cambio de señales sigue siendo por WhatsApp («no me avises más de…») |
| `GET /billing/quota` | Cuenta | `{plan:{code,name,interval:'none'|'monthly'|'annual',price:{amountMinor,currency,source:'subscription'|'catalog'}|null}, period:{key,kind:'lifetime'|'monthly',start,end|null,resetAt|null}, commands:{allowance|null,addons,adjustments,used,balance|null}, contacts:{used|null,limit|null}, connections:{used,limit|null}, audioShare:null, blockedReason:'command_quota_exhausted'|null, billingVisible, invoices:[{id,date,periodEnd,amountMinor,currency,status,hostedUrl|null}]}`. **Ya no hay `priceUsd`** ni `amount` a secas: ver §4.4. Mientras la rama del engine no esté publicada devuelve 404 y la tarjeta de plan muestra «se activa pronto» | `resolve_command_balance` (000114) + `tenant_command_usage`, `command_quota_adjustment`, `tenant_entitlement_snapshot`, `commercial_plan*`, `billing_invoice`. Es la MISMA fuente que descuenta el cupo |
| `GET /team` | Cuenta (sin mostrar `commandsMonth`: política anti-vigilancia) | `{people:[{id,name,role,whatsapp:'verified'|'pending',team,crmOwner|null,commandsMonth,lastActive}],roles:{owner,admin,supervisor,agent,analyst},crmOwners,limits:{assignMax,broadcastMaxCost,discountMaxPct,stepUpAbove}}` | `operator_identity`, `resolve_operator_crm_owner`, policy por rol |
| `GET /marketing/overview` | Marketing | ver §5 | plan 16 de `comando-pro`; **ya desplegado** |
| `POST /marketing/refresh` | Marketing (el botón «Actualizar») | ver §5; **siempre 200**, también cuando el límite lo deja fuera | ídem |

### 4.3 Reglas para el backend

- Toda ruta respeta RLS por `tenant_id`/`operator_id`; un `agent` ve lo suyo, un `owner` ve el tenant.
- Los montos vienen en unidades mayores y con `currency` ISO; el panel formatea (`S/ 9.870.000`). **Excepción: facturación** (`/v1/public/plans` y `/billing/quota`) va en unidades **mínimas** (`amountMinor`), porque ahí los céntimos son el dato y una suma con coma acaba descuadrando.
- Cuando una respuesta no trae `currency`, el panel usa la de la cuenta (`/auth/me`). Si tampoco la hay, **escribe la cifra sin símbolo**: nunca inventa uno.
- Nunca ids internos de etapa/dueño en las respuestas: etiquetas del catálogo (`crm_property_catalog`).
- Fechas en ISO 8601 con zona; el panel las muestra en la zona del operador.
- `404`/`501` significan «no implementado» y el panel lo muestra como «se activa pronto».

### 4.4 `GET /billing/quota`: lo que cambió del contrato original y por qué

El cupo se descuenta de verdad desde hace meses (`CommandQuotaPort.consume()`, y en el plan
gratuito además corta), pero no había forma de consultarlo. Esta ruta lo devuelve leyendo las
mismas tablas y la misma función SQL que hace el descuento, para que el número de la pantalla
y el que corta el servicio no puedan divergir. Cuatro apartados se apartaron del contrato que
esta tabla pedía, y ninguno por gusto:

- **`priceUsd` ya no existe.** Suponía dólares, y el catálogo es multimoneda desde la 000110
  (`currency` + `amount_minor`); con un cliente facturado en soles, `priceUsd` mentía. En su
  lugar va `price:{amountMinor,currency,source}` en **unidades mínimas**, igual que
  `GET /v1/public/plans`. `source:'subscription'` es lo que ese cliente aceptó pagar (copiado
  al contratar, inmune a subidas posteriores); `source:'catalog'` es el precio publicado de su
  versión de plan, elegido en la moneda de la cuenta cuando el catálogo la tiene. **Nunca se
  convierte de una moneda a otra.** `price` es `null` cuando no hay precio publicado —hoy es lo
  normal: la 000134 dejó los precios nuevos en borrador— y entonces el panel **omite la cifra**
  en vez de inventarla.
- **`audioShare` es siempre `null`.** El canal distingue `text | audio | other` al recibir el
  mensaje, pero eso se pierde en la transcripción: ni `operator_dialogue_entry` ni
  `tenant_command_usage` guardan de qué tipo era la entrada. Es la misma razón por la que
  `GET /operator/commands` no trae `voice`. Un porcentaje inventado en una pantalla de
  facturación es peor que un hueco.
- **El periodo es el del CUPO, no el de la factura.** `kind:'monthly'` cuenta por mes
  calendario **en UTC**, que es la clave que escribe el descuento; `kind:'lifetime'` es el
  gratuito, cuyo cupo **no se reinicia**, y por eso `end` y `resetAt` vienen `null`: un
  `resetAt` ahí sería prometer una recarga que no va a llegar. `contacts.used` es `null` —no
  cero— cuando el espejo del CRM todavía no está provisionado.
- **El cupo es del tenant y el dinero no lo ve cualquiera.** `commands` es el saldo
  **compartido** de la empresa (`tenant_command_usage` tiene clave `(tenant_id, period_key)` y
  no guarda quién gastó cada comando), así que un vendedor ve el mismo saldo que su dueño: es
  el que le van a cortar a él. El precio y las facturas, en cambio, solo van para `owner` y
  `admin` —el mismo criterio de `PUT /tenant/currency`—; `billingVisible` lo dice, para que el
  panel distinga «no tienes facturas» de «no te toca verlas».

`blockedReason` solo trae `'command_quota_exhausted'`, que es lo único que hoy detiene la
ejecución. Un impago no aparece: la suscripción se guarda, pero nada corta por ella todavía, y
anunciar un corte que no ocurre asusta sin motivo.

## 5. Marketing: alcance del módulo nuevo

Encargo: automatizar campañas de Facebook, Instagram y TikTok de las empresas, con reportería
y un analista humano. **La LECTURA de Meta ya existe** —el plan 16 de `comando-pro` está
desplegado y es lo que pinta la pantalla hoy, ver abajo—; el resto de este alcance (TikTok, la
atribución al CRM, las automatizaciones de campaña, los reportes y el analista) sigue siendo
proyecto y NO se pinta con datos de mentira: lo que no existe no sale.

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

**`GET /marketing/overview`** (plan 16 §6 de `comando-pro`) devuelve
`{connection:{status:'disconnected'|'pending'|'active'|'error'|'revoked',connectedAt,lastErrorCode}, period:{label,days,since,until}, totals:[{currency,spend,impressions,clicks,accounts:[…],byResult:[{kind,results,spend,costPerResult,conversionValue,roas}]}], campaigns:[{id,name,accountRef,accountName,currency,objective,spend,impressions,clicks,ctr,result:{kind,results,costPerResult}|null,conversionValue,roas,roasUnavailable}], accounts:[{id,provider,adAccount,name,businessName,currency,state:'pendiente'|'con_datos'|'sin_datos'|'error',refreshedAt,ageSeconds,campaigns,lastErrorCode,nextManualRefreshAt}], freshness:{refreshedAt,ageSeconds,stale,pending,failing}, refresh:{allowed,retryAfterSeconds,nextAllowedAt}}`.

Lo que el panel **no** puede hacer con esto, y por qué:

- **`totals` es una lista, un bloque por moneda, y no existe un gasto único.** Se quitó a
  propósito del contrato: las cuentas de un mismo cliente están en PEN y USD a la vez y un
  total que las mezclara sería un número que parece información y no lo es. Dentro de cada
  moneda, los resultados van separados por tipo por la misma razón.
- **El ROAS solo se pinta donde existe.** `roas: 0` sí se enseña —gasto sin ingreso medido—;
  cuando es `null`, `roasUnavailable` dice por qué (`sin_valor_de_conversion` · `sin_gasto`) y
  **en su lugar va el costo por resultado**. Una inmobiliaria no tiene valor de conversión y
  un ROAS 0 inventado haría parecer fracasada una campaña que va bien.
- **`result` puede ser `null`** («no sabemos qué cuenta como resultado en este objetivo»),
  `result.results` puede ser `0` —que es un número real— y entonces `costPerResult` es `null`:
  dividir entre cero no es un costo altísimo, es que no existe.
- **`freshness.ageSeconds` es la edad del dato MÁS VIEJO** y la pantalla la dice siempre
  («Datos de hace 40 min»). Con `refreshedAt: null` y `pending > 0` todavía viene la primera
  copia, y eso no es un error.
- **`account.state` distingue `sin_datos` de `error`.** Una cuenta conectada y sin gasto no es
  un fallo; desde una tabla vacía se ven igual y el panel las dice distinto.
- El rótulo del periodo se arma con `period.days` en los tres idiomas: `period.label` viene del
  motor en castellano y se pinta a un cliente que puede estar leyendo en inglés.

**`POST /marketing/refresh`** (sin cuerpo) → `{accepted, reason:'ok'|'sin_conexion'|'conexion_marcada'|'sin_cuentas'|'limitado'|'cupo_de_meta', refreshed:[…], throttled:[{accountRef,retryAfterSeconds}], failed:[{accountRef,code}], retryAfterSeconds, nextAllowedAt, overview:{…}}`.
**Siempre 200**, también cuando el límite de cinco minutos por cuenta lo deja fuera: el panel
nunca lo trata como un error, enseña cuándo se podrá volver a pedir y **no vuelve a pedir el
overview**, que viene dentro. `reason:'conexion_marcada'` es el token retirado desde Facebook:
lleva a reconectar en la tarjeta de Meta Ads, no a reintentar.

Lo que queda fuera a propósito (plan 16 §8): pausar y cambiar presupuesto —van por WhatsApp con
vista previa y `CONFIRMAR`, y todavía no existen—, el estado y el presupuesto de cada campaña,
el desglose por plataforma, la atribución al CRM (`crmQualified`, `crmWon`, el embudo
anuncio→venta), el analista humano y los reportes, y TikTok y Google Ads.

### 5.1 Meta Ads: la conexión (plan 14 de `comando-pro`)

Esto SÍ existe en el engine. Es la fontanería de la conexión, no los verbos de campaña.

- **`GET /integrations/meta/status`** → `{status:'disconnected'|'pending'|'active'|'error'|'revoked', connectedAt, tokenExpiresAt, scopes:[], lastErrorCode, accounts:[{accountRef:'act_…',name,accountStatus,currency,timezoneName,businessId,businessName,selected}]}`.
- **`POST /integrations/meta/connect`** → `{authorizationUrl}`. El panel navega ahí en la MISMA pestaña.
- **`POST /integrations/meta/accounts`** con `{accountRefs:[…]}` — la lista completa de las elegidas, no altas y bajas.
- **`POST /integrations/meta/accounts/refresh`** — vuelve a preguntarle a Graph; la elección no se toca.
- **`DELETE /integrations/meta/connection`** — retira el permiso en Meta y borra el token.

La vuelta del diálogo de Facebook la recibe el engine (`GET /integrations/meta/callback`) y redirige
a `META_PANEL_RETURN_URL` con `?meta=connected` o `?meta=error&reason=…`. `panel.js` lo convierte en
un aviso y limpia la URL. `tokenExpiresAt` es `null` cuando el permiso no caduca, que es el caso
normal con el token de usuario de sistema: si trae fecha, la tarjeta avisa.

### 5.2 La barra de filtros: elegir es la acción

Periodo y cuentas son dos ejes de la misma pregunta —«¿cuánto gasté, cuándo y
dónde?»— y hasta ahora vivían separados: el periodo arriba, las cuentas abajo,
dentro de la tarjeta de conexión de Meta. Ahora están juntos en una barra, y
**no hay botón de aplicar**: elegir ES la acción. Un «aplicar» detrás de un
desplegable obliga a decir dos veces lo mismo.

Tres consecuencias que el código sostiene y conviene no deshacer:

- **Mientras carga, los números se atenúan** (`#mk-cuerpo.cargando`). Sin eso,
  cambiar de periodo deja las cifras VIEJAS en pantalla el segundo que tarda la
  respuesta, y se leen como las nuevas. En una pantalla sobre dinero, ese
  segundo basta para creerse una cifra que no es.
- **Las cuentas se guardan al marcar**, y se avisa de que quedó guardado: no es
  solo una vista, cambia lo que el trabajo horario sincroniza, y una elección
  que persiste en silencio deja al operador sin saber si tomó. Desmarcar la
  ÚLTIMA se rechaza y se dice por qué; sin ninguna cuenta no hay nada que
  copiar.
- **«Actualizar» no es un filtro y por eso sigue siendo un botón.** Llama a
  Meta, gasta cupo y está limitado a una vez cada cinco minutos: tiene que ser
  deliberado. Lo mismo «Traer historial».

Las casillas de cuenta viven **solo** en la barra. La tarjeta de Meta enseña
cuáles están en uso, pero no deja marcarlas: dos juegos de casillas sobre lo
mismo es cómo se acaba con una marcada, la otra no, y nadie sabiendo cuál manda.

## 6. Las versiones (`?v=`), y por qué hay un guardia

Cloudflare Pages cachea por URL completa. Un fichero cambiado y publicado con la
misma versión **sigue llegando viejo al operador**, con el despliegue en verde.

Y no basta con subir la hoja: los módulos se importan con la versión escrita
DENTRO del importador. Si `panel.js?v=13` está en caché, el navegador no lo
vuelve a pedir y sigue importando `sections.js?v=13` aunque el HTML apunte a
otra cosa. **Hay que subir toda la cadena hasta el HTML.**

`node tooling/check-versiones.mjs` lo comprueba guardando la huella del
contenido junto a la versión publicada, y corre en el despliegue. La cadena se
enrosca sola: cambiar `sections.js` rompe su huella y obliga a subirle la
versión; subírsela cambia los bytes de `panel.js`, que rompe la suya. Tras
subirlas, `node tooling/check-versiones.mjs --registrar`.

## 7. Lo que el panel deja explícitamente fuera

- Editar campos del CRM registro por registro (eso es WhatsApp con vista previa).
- Crear reglas con formularios: las reglas nacen de una frase; el panel las lista, pausa y reanuda.
- Perfil y memoria del agente por formulario; pedidos al analista con urgencia y alcance: se dicen por WhatsApp.
- Historial completo de comandos, aprobaciones decididas, KPI de proactividad, ficha técnica del conector, tabla de planes, catálogo de conectores futuros.
- Cualquier forecast o proyección (plan 09 §9).
- Rankings de personas o métricas de uso de Comando por persona visibles al grupo.
- Enviar mensajes a clientes: el panel abre `wa.me` del contacto para que el operador lo mande él.

## 8. Fuentes en `comando-pro` de las que sale cada decisión

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

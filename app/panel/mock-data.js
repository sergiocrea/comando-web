/* Datos de ejemplo del panel (`?mock=1`). Un tenant inmobiliario peruano con el
   vocabulario real del portal de pruebas (distrito, proyecto, estado_matricula,
   fuente_lead, Equipo Comercial Lima/Norte). Solo se usan en modo mock: nunca se
   mezclan con respuestas del engine. */

const DAY = 86_400_000;
const now = new Date();
const at = (days, hh = 9, mm = 0) => {
  const d = new Date(now.getTime() + days * DAY);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
};
const ago = (hours) => new Date(now.getTime() - hours * 3_600_000).toISOString();

export const MOCK = {
  me: {
    status: 'ok',
    tenantId: 'tenant-demo',
    operatorId: 'op-demo',
    plan: 'starter',
    role: 'owner',
    locale: 'es',
    name: 'Sergio',
    email: 'sergio@inmobiliariarojas.pe',
    comandoNumber: '+51 912 000 000',
    waLink: 'https://wa.me/51912000000',
    whatsapp: { status: 'verified', phone: '+51 912 869 617', pending: null },
    crmConnected: true,
    timezone: 'America/Lima',
    country: 'PE',
    // La trajo HubSpot al conectar, que es el caso más común: por eso no se le
    // pregunta nada a este tenant. Con `?moneda=none` se ve el que sí.
    currency: 'PEN',
    currencySource: 'crm',
  },

  connections: [
    { id: 'c-hubspot', provider: 'hubspot', name: 'HubSpot · Inmobiliaria Rojas', status: 'active', bound: true,
      createdAt: ago(24 * 41), lastReconciledAt: ago(5.5), lastInboundAt: ago(0.4), driftCount: 0,
      capabilities: { writes: { tags: true, fields: true, notes: true, tasks: true, records: true }, hiddenFields: [], deniedObjects: [], tagField: 'comando_tags' },
      mirror: { contacts: 174, companies: 33, deals: 73, owners: 1 } },
    { id: 'c-sheets', provider: 'google-sheets', name: 'Google Sheets', status: 'active', bound: false,
      createdAt: ago(24 * 12), sources: [{ spreadsheetId: 'x1', displayName: 'Leads ferias 2026', sheetTitle: 'Hoja 1' }] },
  ],

  quota: {
    plan: { code: 'starter', name: 'Starter', priceUsd: 7, interval: 'month' },
    period: { start: at(-12), end: at(18), resetAt: at(18) },
    commands: { allowance: 500, addons: 0, adjustments: 0, used: 212, balance: 288 },
    contacts: { used: 174, limit: 30_000 },
    connections: { used: 2, limit: 5 },
    audioShare: 0.31,
    blockedReason: null,
    invoices: [
      { id: 'inv-3', date: at(-12), amount: 7, status: 'paid' },
      { id: 'inv-2', date: at(-42), amount: 7, status: 'paid' },
      { id: 'inv-1', date: at(-72), amount: 3, status: 'paid' },
    ],
  },

  plans: [
    { code: 'gratis', name: 'Gratis', priceUsd: 0, contacts: 10_000, commands: 30, connections: 1 },
    { code: 'basico', name: 'Básico', priceUsd: 3, contacts: 10_000, commands: 150, connections: 2 },
    { code: 'starter', name: 'Starter', priceUsd: 7, contacts: 30_000, commands: 500, connections: 5 },
    { code: 'pro', name: 'Pro', priceUsd: 19, contacts: 80_000, commands: 1500, connections: null },
  ],

  /* Sales intelligence: recomendaciones vigentes (skill deal_health / next_best_action). */
  recommendations: [
    { id: 'r1', skillId: 'deal_health', status: 'pending', priority: 92, createdAt: ago(3), title: 'Torres del Parque 402 · S/ 610.000 sin actividad 19 días',
      summary: 'Está en Separación desde el 14 de agosto y nadie lo toca desde el 17.', reason: 'Negocio de alto valor (p75 del embudo) e inactivo 19 días.',
      subject: { entityType: 'opportunity', externalId: '1201', name: 'Torres del Parque 402', contact: 'Familia Rojas', phone: '+51 987 111 222' },
      signals: [{ type: 'high_value_attention', severity: 'high' }, { type: 'deal_inactive', severity: 'high' }, { type: 'stage_stalled', severity: 'warning' }],
      recommendedAction: 'create_task', availableActions: ['accept', 'create_task', 'explain', 'dismiss', 'snooze'] },
    { id: 'r2', skillId: 'deal_health', status: 'pending', priority: 84, createdAt: ago(7), title: 'Miraflores Sky 1502 · fecha de cierre vencida hace 4 días',
      summary: 'Cierre esperado el 1 de septiembre. Sigue en Negociación.', reason: 'close_date_overdue con monto S/ 380.000.',
      subject: { entityType: 'opportunity', externalId: '1187', name: 'Miraflores Sky 1502', contact: 'Carla Mendoza', phone: '+51 986 333 444' },
      signals: [{ type: 'close_date_overdue', severity: 'high' }],
      recommendedAction: 'accept', availableActions: ['accept', 'create_task', 'explain', 'dismiss', 'snooze'] },
    { id: 'r3', skillId: 'next_best_action', status: 'pending', priority: 71, createdAt: ago(20), title: '6 leads de Urbania sin primer contacto desde anoche',
      summary: 'Entraron entre las 21:10 y las 23:40. Ninguno tiene dueño ni nota.', reason: 'missing_owner en registros creados hace más de 9 horas.',
      subject: { entityType: 'contact', externalId: 'seg-1', name: '6 contactos · fuente Urbania' },
      signals: [{ type: 'missing_owner', severity: 'warning' }],
      recommendedAction: 'accept', availableActions: ['accept', 'explain', 'dismiss', 'snooze'] },
    { id: 'r4', skillId: 'deal_health', status: 'pending', priority: 64, createdAt: ago(26), title: '9 de 41 negocios abiertos no tienen monto (22 %)',
      summary: 'Sin monto no entran en el reporte de plata abierta.', reason: 'missing_critical_data: amountMinor vacío o en cero.',
      subject: { entityType: 'opportunity', externalId: 'seg-2', name: '9 negocios sin monto' },
      signals: [{ type: 'missing_critical_data', severity: 'warning' }],
      recommendedAction: 'explain', availableActions: ['accept', 'explain', 'dismiss', 'snooze'] },
    { id: 'r5', skillId: 'deal_health', status: 'pending', priority: 58, createdAt: ago(30), title: 'San Isidro Prime 801 · cierra en 3 días y no tiene siguiente paso',
      summary: 'Negociación · S/ 295.000 · cierre esperado el domingo.', reason: 'close_date_approaching + missing_next_step.',
      subject: { entityType: 'opportunity', externalId: '1190', name: 'San Isidro Prime 801', contact: 'Jorge Paredes', phone: '+51 999 555 666' },
      signals: [{ type: 'close_date_approaching', severity: 'warning' }, { type: 'missing_next_step', severity: 'info' }],
      recommendedAction: 'create_task', availableActions: ['accept', 'create_task', 'explain', 'dismiss', 'snooze'] },
    { id: 'r6', skillId: 'deal_health', status: 'snoozed', snoozedUntil: at(2), priority: 40, createdAt: ago(50), title: 'Surco Garden 305 · 3 tareas vencidas',
      summary: 'La última venció el martes.', reason: 'overdue_task.', subject: { entityType: 'opportunity', externalId: '1150', name: 'Surco Garden 305' },
      signals: [{ type: 'overdue_task', severity: 'warning' }], availableActions: ['accept', 'dismiss'] },
  ],

  tasks: [
    { id: 't1', title: 'Llamar a Familia Rojas por la separación del 402', dueAt: at(0, 10, 0), status: 'open', recordName: 'Torres del Parque 402', recordType: 'opportunity', remindedAt: null, source: 'whatsapp' },
    { id: 't2', title: 'Enviar cotización actualizada a Carla Mendoza', dueAt: at(0, 12, 30), status: 'open', recordName: 'Miraflores Sky 1502', recordType: 'opportunity', remindedAt: null, source: 'whatsapp' },
    { id: 't3', title: 'Visita al piso 8 con Jorge Paredes', dueAt: at(0, 16, 0), status: 'open', recordName: 'San Isidro Prime 801', recordType: 'opportunity', remindedAt: null, source: 'whatsapp', kind: 'visit' },
    { id: 't4', title: 'Confirmar financiamiento con el banco (Quispe)', dueAt: at(1, 9, 30), status: 'open', recordName: 'Ana Quispe', recordType: 'contact', source: 'recommendation' },
    { id: 't5', title: 'Seguimiento cotización día 5 · Torres del Parque 1101', dueAt: at(2, 9, 0), status: 'open', recordName: 'Torres del Parque 1101', recordType: 'opportunity', source: 'automation' },
    { id: 't6', title: 'Revisar duplicados por teléfono antes del cierre de mes', dueAt: at(4, 8, 0), status: 'open', source: 'whatsapp' },
    { id: 't7', title: 'Devolver llamada a Luis Herrera', dueAt: at(-1, 15, 0), status: 'open', recordName: 'Luis Herrera', recordType: 'contact', remindedAt: ago(20), source: 'whatsapp' },
    { id: 't8', title: 'Mandar contrato a Familia Torres', dueAt: at(-3, 11, 0), status: 'open', recordName: 'Surco Garden 305', recordType: 'opportunity', remindedAt: ago(70), source: 'whatsapp' },
    { id: 't9', title: 'Enviar propuesta Sky 1502', dueAt: at(-2, 10, 0), status: 'completed', recordName: 'Miraflores Sky 1502', recordType: 'opportunity', source: 'whatsapp' },
  ],

  /* Eventos del calendario que no son tareas: cierres, citas, briefing, reglas, sync. */
  calendar: [
    { id: 'e1', kind: 'close', title: 'Cierre esperado · San Isidro Prime 801 (S/ 295.000)', at: at(3, 0, 0), allDay: true },
    { id: 'e2', kind: 'close', title: 'Cierre esperado · Torres del Parque 402 (S/ 610.000)', at: at(9, 0, 0), allDay: true },
    { id: 'e3', kind: 'close', title: 'Cierre esperado · Surco Garden 210 (S/ 190.000)', at: at(14, 0, 0), allDay: true },
    { id: 'e4', kind: 'briefing', title: 'Briefing diario por WhatsApp', at: at(1, 7, 30), repeat: 'Lun–Sáb 07:30' },
    { id: 'e5', kind: 'rule', title: 'Aviso semanal: negocios 15 días sin movimiento', at: at((8 - now.getDay()) % 7 || 7, 8, 0), repeat: 'Lunes 08:00' },
    { id: 'e6', kind: 'rule', title: 'Revisión semanal de duplicados', at: at((8 - now.getDay()) % 7 || 7, 8, 5), repeat: 'Lunes 08:05' },
    { id: 'e7', kind: 'meeting', title: 'Reunión con Familia Torres · oficina Surco', at: at(1, 11, 0) },
    { id: 'e8', kind: 'meeting', title: 'Visita modelo Miraflores Sky · Carla Mendoza', at: at(5, 17, 0) },
    { id: 'e9', kind: 'sync', title: 'Reconciliación diaria HubSpot', at: at(1, 6, 0), repeat: 'Diaria 06:00' },
    { id: 'e10', kind: 'report', title: 'Reporte mensual al dueño (último día hábil)', at: at(20, 7, 30) },
    { id: 'e11', kind: 'marketing', title: 'Reporte semanal de campañas', at: at((8 - now.getDay()) % 7 || 7, 8, 30), repeat: 'Lunes 08:30' },
    { id: 'e12', kind: 'marketing', title: 'Revisión con tu analista de marketing', at: at(6, 10, 0) },
  ],

  /* Salud del CRM: métricas del agente + señales, con denominador y reproducibilidad. */
  health: {
    computedAt: ago(0.3),
    owners: { crmOwners: 1, comandoPeople: 4 },
    sync: { reconcileAgeHours: 5.5, inboundAgeHours: 0.4, driftCount: 0, pendingWrites: 0, provider: 'HubSpot', healthy: true },
    metrics: [
      { id: 'stale_deals', label: 'Negocios abiertos sin actividad 15 días', value: 12, of: 41, severity: 'high', entity: 'opportunity',
        why: 'Un negocio que supera 1,5 veces el ciclo promedio tiene menos de la mitad de probabilidad de cerrarse.',
        reproduce: 'HubSpot → Negocios → filtro: Etapa no es Cerrado ganado/perdido · Última actividad hace más de 15 días.',
        ask: 'qué negocios abiertos llevan más de 15 días sin que nadie los toque', weekly: 'avísame cada lunes qué negocios llevan 15 días sin movimiento', amount: 2_140_000 },
      { id: 'stale_contacts', label: 'Contactos sin actividad 90 días', value: 61, of: 174, severity: 'warning', entity: 'contact',
        why: 'Base fría que sigue contando como cartera. Reactivar leads fríos aporta 10–15 % de conversiones extra.',
        reproduce: 'HubSpot → Contactos → Última actividad hace más de 90 días.',
        ask: 'pásame los contactos sin ningún movimiento en los últimos 90 días', weekly: 'cada mes avísame cuántos contactos llevan 90 días sin actividad' },
      { id: 'unassigned', label: 'Registros sin dueño', value: 8, of: 174, severity: 'high', entity: 'contact',
        why: 'Sin dueño nadie responde. La respuesta en menos de 5 minutos multiplica por 21 la calificación.',
        reproduce: 'HubSpot → Contactos → Propietario del contacto está vacío.',
        ask: 'cuáles contactos no tienen dueño', weekly: 'cuando entre un contacto sin propietario, avísame al toque' },
      { id: 'dup_phone', label: 'Duplicados por teléfono', value: 5, unit: 'grupos', severity: 'warning', entity: 'contact',
        why: 'Dos fichas del mismo cliente reparten el historial y confunden a quien llama. Se compara por los últimos 9 dígitos.',
        reproduce: 'No hay filtro nativo: exporta contactos y agrupa por teléfono normalizado.',
        ask: 'tengo contactos repetidos con el mismo teléfono? dime cuántos', weekly: 'revísame cada lunes si hay contactos repetidos y avísame' },
      { id: 'dup_email', label: 'Duplicados por correo', value: 2, unit: 'grupos', severity: 'info', entity: 'contact',
        why: 'Mismo correo, distinta ficha.', reproduce: 'HubSpot → Contactos → herramienta Duplicados (Pro+) o exportar y agrupar por correo.',
        ask: 'hay contactos repetidos con el mismo correo?', weekly: 'revísame cada lunes si hay correos repetidos' },
      { id: 'missing_amount', label: 'Negocios abiertos sin monto', value: 9, of: 41, severity: 'warning', entity: 'opportunity',
        why: 'Sin monto no entran en la plata abierta ni en las alertas de alto valor.', reproduce: 'HubSpot → Negocios → Importe está vacío o es 0 · etapa abierta.',
        ask: 'qué negocios abiertos no tienen monto', weekly: 'una vez por semana avísame qué negocios están incompletos' },
      { id: 'missing_close', label: 'Negocios abiertos sin fecha de cierre', value: 14, of: 41, severity: 'info', entity: 'opportunity',
        why: 'Sin fecha no hay aviso de cierre próximo ni vencido.', reproduce: 'HubSpot → Negocios → Fecha de cierre está vacía.',
        ask: 'qué negocios abiertos no tienen fecha de cierre', weekly: 'cada viernes avísame qué negocios no tienen fecha de cierre' },
      { id: 'missing_next', label: 'Negocios en Negociación sin siguiente paso', value: 6, of: 17, severity: 'warning', entity: 'opportunity',
        why: 'El 80 % de las ventas requiere 5 o más contactos; sin siguiente paso el seguimiento se corta.',
        reproduce: 'HubSpot → Negocios → Etapa Negociación · Siguiente paso vacío.',
        ask: 'qué negocios en negociación no tienen siguiente paso', weekly: 'cada lunes avísame qué negocios en negociación no tienen siguiente paso' },
      { id: 'orphans', label: 'Negocios sin contacto asociado', value: 3, of: 41, severity: 'warning', entity: 'opportunity',
        why: 'Un negocio sin persona no se puede llamar.', reproduce: 'HubSpot → Negocios → Contactos asociados = 0.',
        ask: 'qué negocios no tienen contacto asociado', weekly: 'avísame si aparece un negocio sin contacto' },
      { id: 'overdue_tasks', label: 'Tareas vencidas', value: 2, severity: 'warning', entity: 'task',
        why: 'Tareas de Comando cuya hora pasó y siguen abiertas.', reproduce: 'Comando → Recordatorios → Vencidas.',
        ask: 'qué tareas tengo vencidas', weekly: 'cada mañana dime qué tareas se me vencieron' },
      { id: 'out_of_list', label: 'Valores fuera de lista', value: 4, severity: 'info', entity: 'contact',
        why: '«Miraflres» y «miraflores» no cuentan como Miraflores en ningún reporte.', reproduce: 'HubSpot → Propiedades → distrito → valores no estándar.',
        ask: 'qué valores distintos tengo cargados en distrito', weekly: 'cada mes avísame si hay valores raros en distrito' },
      { id: 'no_source', label: 'Contactos sin fuente del lead', value: 23, of: 174, severity: 'info', entity: 'contact',
        why: 'Sin fuente no se sabe qué campaña funcionó.', reproduce: 'HubSpot → Contactos → fuente_lead está vacío.',
        ask: 'cuántos contactos entraron sin fuente del lead', weekly: 'cada lunes dime cuántos contactos entraron sin fuente' },
    ],
  },

  pipeline: {
    computedAt: ago(0.3),
    currency: 'PEN',
    open: { count: 41, amount: 9_870_000 },
    wonMonth: { count: 3, amount: 1_120_000 },
    lostMonth: { count: 2, amount: 430_000 },
    stages: [
      { name: 'Lead nuevo', count: 9, amount: 1_650_000, order: 1 },
      { name: 'Contactado', count: 7, amount: 1_480_000, order: 2 },
      { name: 'Visita', count: 6, amount: 1_720_000, order: 3 },
      { name: 'Separación', count: 2, amount: 1_000_000, order: 4 },
      { name: 'Negociación', count: 17, amount: 4_020_000, order: 5 },
    ],
    byOwner: [
      { owner: 'Sergio Saavedra', count: 33, amount: 8_120_000 },
      { owner: 'Sin responsable', count: 8, amount: 1_750_000 },
    ],
    byField: { label: 'proyecto', rows: [
      { value: 'Torres del Parque', count: 15, amount: 4_100_000 }, { value: 'Miraflores Sky', count: 11, amount: 2_950_000 },
      { value: 'San Isidro Prime', count: 8, amount: 1_920_000 }, { value: 'Surco Garden', count: 7, amount: 900_000 } ] },
    bySource: [ { value: 'Urbania', count: 61 }, { value: 'Adondevivir', count: 44 }, { value: 'Meta Ads', count: 38 }, { value: 'Referido', count: 8 }, { value: 'Sin fuente', count: 23 } ],
    temporal: {
      since: at(-7), moved: 6, backward: 1, avgDaysByStage: [ { name: 'Lead nuevo', days: 3 }, { name: 'Contactado', days: 6 }, { name: 'Visita', days: 9 }, { name: 'Separación', days: 12 }, { name: 'Negociación', days: 21 } ],
      moves: [
        { name: 'Torres del Parque 1101', from: 'Visita', to: 'Negociación', at: ago(30) },
        { name: 'Miraflores Sky 903', from: 'Contactado', to: 'Visita', at: ago(52) },
        { name: 'Surco Garden 210', from: 'Negociación', to: 'Visita', at: ago(70), backward: true },
        { name: 'San Isidro Prime 404', from: 'Negociación', to: 'Cerrado ganado', at: ago(96) },
      ],
    },
    separations: [ { name: 'Torres del Parque 402', amount: 610_000, days: 22 }, { name: 'Surco Garden 305', amount: 390_000, days: 8 } ],
    scheduledReports: [
      { id: 'sr1', title: 'Pipeline por etapa', cadence: 'Lunes 07:30', channel: 'WhatsApp', status: 'active' },
      { id: 'sr2', title: 'Leads por fuente', cadence: 'Viernes 18:00', channel: 'WhatsApp', status: 'active' },
      { id: 'sr3', title: 'Plata abierta y separaciones', cadence: 'Último día hábil del mes', channel: 'WhatsApp', status: 'active' },
    ],
    recent: [
      { id: 'q1', ask: 'cuánta plata hay en juego ahorita', at: ago(2), answer: '41 negocios abiertos · S/ 9.870.000' },
      { id: 'q2', ask: 'dame los negocios por etapa pero partido por proyecto', at: ago(26), answer: '5 etapas × 4 proyectos' },
      { id: 'q3', ask: 'comparame los negocios creados este mes contra el mes pasado', at: ago(50), answer: '11 vs 14 (−3)' },
    ],
  },

  /* Tres capas de proactividad + preferencias + notificaciones. */
  agent: {
    profile: { name: 'Comando de Sergio', status: 'active', instructions: 'Prioriza velocidad de respuesta y los proyectos de Lima. Para mí un negocio grande es desde S/ 300.000.',
      businessContext: { industry: 'Inmobiliaria', products: ['departamentos', 'estacionamientos'], qualifiedLeadDefinition: 'Presupuesto y distrito confirmados' }, updatedAt: ago(48) },
    preferences: { timezone: 'America/Lima', quietStart: '21:00', quietEnd: '08:00', dailyMessageLimit: 5, minimumPriority: 60, proactiveEnabled: true, briefingCadence: 'daily', briefingAt: '07:30', sundays: false },
    memories: [
      { id: 'm1', kind: 'definition', content: 'Un negocio grande es desde S/ 300.000.', createdAt: ago(48) },
      { id: 'm2', kind: 'definition', content: 'Un lead parado lleva 5 días sin actividad.', createdAt: ago(120) },
      { id: 'm3', kind: 'business_fact', content: 'Los leads de Adondevivir llegan sin teléfono la mitad de las veces.', createdAt: ago(200) },
      { id: 'm4', kind: 'preference', content: 'Los reportes de dinero en soles, sin decimales.', createdAt: ago(300) },
      { id: 'm5', kind: 'correction', content: '«Los del norte» son los del Equipo Comercial Norte, no los de Lima Norte.', createdAt: ago(400) },
    ],
    aliases: [ { term: 'negociación', field: 'Etapa del negocio', value: 'Negociación avanzada' }, { term: 'los de meta', field: 'fuente_lead', value: 'Meta Ads' }, { term: 'vip', field: 'comando_tags', value: 'VIP' } ],
    rules: [
      { id: 'ar1', name: 'Negocios 15 días sin movimiento', metric: 'stale_records', params: { entity: 'opportunity', days: 15, openOnly: true }, operator: 'gte', threshold: 1, every: 'Lunes 08:00', status: 'active', lastFiredAt: ago(24 * 4), nextEvaluationAt: at((8 - now.getDay()) % 7 || 7, 8, 0), lastValue: 12 },
      { id: 'ar2', name: 'Contactos repetidos', metric: 'duplicate_records', params: { entity: 'contact', key: 'phone' }, operator: 'gte', threshold: 1, every: 'Lunes 08:05', status: 'active', lastFiredAt: ago(24 * 4), nextEvaluationAt: at((8 - now.getDay()) % 7 || 7, 8, 5), lastValue: 5 },
      { id: 'ar3', name: 'HubSpot sin sincronizar', metric: 'reconcile_age_hours', params: {}, operator: 'gt', threshold: 30, every: 'Cada hora', status: 'active', lastFiredAt: null, nextEvaluationAt: ago(-0.6), lastValue: 5.5, critical: true },
      { id: 'ar4', name: 'Leads sin dueño de ayer', metric: 'unassigned_records', params: { entity: 'contact' }, operator: 'gte', threshold: 1, every: 'Diario 07:35', status: 'paused', lastFiredAt: ago(24 * 9), nextEvaluationAt: null, lastValue: 8 },
    ],
    eventRules: [
      { id: 'er1', name: 'Lead nuevo de Meta Ads sin teléfono', event: 'RECORD_CREATED', entity: 'contact', condition: 'fuente_lead = Meta Ads y teléfono vacío', action: 'Avisarme por WhatsApp', groupWindow: 120, status: 'active', firedWeek: 4, createdAt: ago(24 * 20) },
      { id: 'er2', name: 'Negocio llega a Separación', event: 'STAGE_CHANGED', entity: 'opportunity', condition: 'etapa → Separación', action: 'Avisarme + crear tarea «Confirmar separación en 15 días»', status: 'active', firedWeek: 1, createdAt: ago(24 * 33) },
      { id: 'er3', name: 'Retroceso de etapa', event: 'STAGE_CHANGED', entity: 'opportunity', condition: 'dirección: hacia atrás', action: 'Avisarme con el motivo', status: 'active', firedWeek: 1, createdAt: ago(24 * 10) },
      { id: 'er4', name: 'Negocio de más de S/ 200.000', event: 'RECORD_CREATED', entity: 'opportunity', condition: 'monto > 200.000', action: 'Avisarme al toque', status: 'active', firedWeek: 2, createdAt: ago(24 * 40) },
      { id: 'er5', name: 'Cerrado ganado', event: 'STAGE_CHANGED', entity: 'opportunity', condition: 'etapa → Cerrado ganado', action: 'Avisarme', status: 'paused', firedWeek: 0, createdAt: ago(24 * 60) },
      { id: 'er6', name: 'Motivo «Sin financiamiento»', event: 'FIELD_CHANGED', entity: 'contact', condition: 'motivo_desestimacion = Sin financiamiento', action: 'Etiquetar «Reactivar Q1» y avisarme', status: 'active', firedWeek: 3, createdAt: ago(24 * 15) },
    ],
    policy: {
      enabledSignals: ['deal_inactive', 'close_date_approaching', 'close_date_overdue', 'missing_next_step', 'overdue_task', 'stage_stalled', 'high_value_attention', 'missing_owner', 'missing_critical_data'],
      thresholds: { inactiveDays: 14, closeDateApproachingDays: 7, stageStalledDays: 21, highValue: { mode: 'p75', PEN: 300_000 } },
      criticalFields: ['amountMinor', 'stageRef', 'expectedCloseDate'],
      routes: { info: 'panel', warning: 'briefing', high: 'briefing + WhatsApp', critical: 'WhatsApp inmediato' },
    },
    notifications: [
      { id: 'n1', createdAt: ago(1.5), layer: 'signal', priority: 92, text: 'Torres del Parque 402 · S/ 610.000 sin actividad 19 días. Responde VER, LUEGO o BASTA.', status: 'sent', response: null },
      { id: 'n2', createdAt: ago(9), layer: 'briefing', priority: 80, text: '📊 Qué merece tu atención hoy · 5 tarjetas. Responde 1..5, LUEGO o BASTA.', status: 'sent', response: '1' },
      { id: 'n3', createdAt: ago(26), layer: 'event', priority: 70, text: 'Entraron 4 leads de Meta Ads sin teléfono entre 20:10 y 22:00.', status: 'deferred', response: 'OK', note: 'Retenido por horario silencioso; entregado 08:00 como «de anoche»' },
      { id: 'n4', createdAt: ago(33), layer: 'agent', priority: 65, text: '12 negocios llevan 15 días sin movimiento. Responde VER para la lista.', status: 'sent', response: 'VER' },
      { id: 'n5', createdAt: ago(58), layer: 'event', priority: 75, text: 'Surco Garden 210 retrocedió de Negociación a Visita.', status: 'sent', response: 'POR QUÉ' },
      { id: 'n6', createdAt: ago(80), layer: 'agent', priority: 40, text: '8 contactos sin dueño desde ayer.', status: 'suppressed', response: null, note: 'Bajo la prioridad mínima (60)' },
      { id: 'n7', createdAt: ago(100), layer: 'task', priority: 60, text: '⏰ Recordatorio · 10:00 · Llamar a Luis Herrera', status: 'sent', response: 'hecha' },
    ],
    kpis: { responseRate24h: 0.71, bastaShare: 0.04, sentWeek: 14, deferredWeek: 3, suppressedWeek: 2, budgetUsedToday: 2, budgetToday: 5 },
  },

  playbooks: [
    { group: 'speed-to-lead', id: 'speed.lead-nuevo-aviso', name: 'Aviso de lead nuevo', ask: 'cuando entre un lead nuevo avísame al toque', evidence: 'Responder en < 5 min = 21× más calificación', active: false },
    { group: 'speed-to-lead', id: 'speed.lead-sin-contacto', name: 'Lead sin primer contacto', ask: 'si un lead pasa 30 minutos sin que nadie lo contacte, avísale al dueño', evidence: 'Promedio B2B real ~42 h; 63 % nunca responde', active: false },
    { group: 'speed-to-lead', id: 'speed.lead-reactivacion', name: 'Reactivación de leads fríos', ask: 'cada mes pásame los leads sin actividad en 90 días para reactivarlos', evidence: 'Reactivar aporta 10–15 % de conversiones extra', active: false },
    { group: 'pipeline', id: 'pipeline.deal-estancado', name: 'Negocio estancado', ask: 'si un negocio se queda 7 días sin moverse avísame, y si sigue igual 7 días más que le llegue al gerente', evidence: 'Playbook más universal: 7/14/21 días', active: true },
    { group: 'pipeline', id: 'pipeline.etapa-retroceso', name: 'Retroceso de etapa', ask: 'avísame cuando un negocio retroceda de etapa', evidence: '', active: true },
    { group: 'pipeline', id: 'pipeline.deal-alto-valor', name: 'Oportunidad de alto valor creada', ask: 'si entra un negocio de más de 200 mil avísame al toque', evidence: '', active: true },
    { group: 'pipeline', id: 'pipeline.propuesta-sin-respuesta', name: 'Propuesta sin respuesta', ask: 'a los que no respondieron la cotización recuérdamelo a los 3, 5 y 7 días', evidence: 'Seguimiento día 3–5 post cotización duplica el cierre', active: false },
    { group: 'follow-up', id: 'followup.post-demo', name: 'Seguimiento post visita', ask: 'después de cada visita créame una tarea de seguimiento para el día siguiente', evidence: '', active: false },
    { group: 'follow-up', id: 'followup.onboarding-ganado', name: 'Bienvenida tras ganar', ask: 'cuando un negocio llegue a Cerrado ganado prepárame el mensaje de bienvenida', evidence: '', active: false },
    { group: 'citas-tareas', id: 'citas.recordatorio', name: 'Recordatorio de cita', ask: 'recuérdame cada visita 24 horas y 2 horas antes', evidence: 'Confirmar + 24 h + 2 h reduce ausencias 40–70 %', active: false },
    { group: 'citas-tareas', id: 'citas.tarea-vencida', name: 'Tareas vencidas', ask: 'cada mañana dime qué tareas se me vencieron', evidence: '', active: true },
    { group: 'datos', id: 'datos.duplicado', name: 'Posible duplicado', ask: 'revísame cada lunes si hay contactos repetidos y avísame', evidence: '', active: true },
    { group: 'datos', id: 'datos.sin-owner', name: 'Registro sin dueño', ask: 'cuando entre un contacto sin propietario avísame', evidence: '', active: false },
    { group: 'datos', id: 'datos.campos-incompletos', name: 'Avance con campos vacíos', ask: 'si un negocio pasa a Negociación sin monto avísame', evidence: '', active: false },
    { group: 'digest', id: 'digest.diario-pipeline', name: 'Resumen diario del embudo', ask: 'mándame cada mañana el pipeline por etapa', evidence: '', active: false },
    { group: 'digest', id: 'digest.semanal-kpis', name: 'KPIs semanales', ask: 'mándame todos los lunes el resumen de la semana', evidence: '', active: true },
    { group: 'digest', id: 'digest.leads-fuente', name: 'Leads por fuente', ask: 'cada viernes dime cuántos leads entraron por fuente', evidence: '', active: true },
    { group: 'ecommerce', id: 'ecom.carrito-abandonado', name: 'Carrito abandonado', ask: 'si alguien deja el carrito avísame para escribirle', evidence: 'Recuperación por WhatsApp 18–23 % vs ~8 % email', active: false, needs: 'Tienda conectada' },
  ],

  history: [
    { id: 'h1', at: ago(0.5), utterance: 'anota en el 402 de rojas: pidieron 30 días para la separación', plan: 'Agregar nota → Torres del Parque 402', status: 'executed', types: ['NOTE'], ref: 'A1B2-3C4D', records: 1 },
    { id: 'h2', at: ago(2), utterance: 'cuanta plata hay en juego ahorita', plan: 'Reporte: negocios abiertos por etapa y monto', status: 'executed', types: ['GENERATE_REPORT'], ref: 'B7F0-11AA', records: 41 },
    { id: 'h3', at: ago(3.2), utterance: 'etiqueta como VIP a los contactos de Miraflores con negocio abierto', plan: 'Etiquetar VIP → 23 contactos', status: 'pending', expiresAt: ago(-0.2), types: ['TAG'], ref: 'C1F9-0AE7', records: 23 },
    { id: 'h4', at: ago(20), utterance: 'pásale los negocios parados de Juan al Equipo Comercial Lima', plan: 'Asignar a Equipo Comercial Lima → 14 negocios', status: 'awaiting_approval', expiresAt: at(13), types: ['ASSIGN'], ref: '0000-0020', records: 14, note: 'Excede tu límite de 10 registros por reasignación. Esperando aprobación del dueño.' },
    { id: 'h5', at: ago(26), utterance: 'mándame cada lunes qué negocios llevan 15 días sin movimiento', plan: 'Crear aviso con cadencia · Lunes 08:00', status: 'executed', types: ['CREATE_AGENT_RULE'], ref: 'D2D2-9F01', records: 0 },
    { id: 'h6', at: ago(30), utterance: 'súbele 10% a los de torres del parque', plan: 'Subir montos 10 % → 15 negocios', status: 'cancelled', types: ['UPDATE_MONEY'], ref: 'E4E4-7788', records: 15, note: 'Cancelaste con «mejor no»' },
    { id: 'h7', at: ago(49), utterance: 'mueve el 1101 a negociación y créame tarea de llamar el jueves', plan: 'Mover a Negociación → 1 negocio · Crear tarea «Llamar» (jue 09:00)', status: 'executed', types: ['MOVE_STAGE', 'CREATE_TASK'], ref: 'F0F0-1234', records: 1 },
    { id: 'h8', at: ago(52), utterance: 'ponle 195 al de mendoza', plan: '—', status: 'declined', types: [], ref: '', note: 'Comando: «Hoy tiene 210; 195 es bajar 7,1 %, ¿dale?» (monto absoluto aún no soportado)' },
    { id: 'h9', at: ago(75), utterance: 'manda promo-v2 a los de surco', plan: 'Enviar plantilla promo-v2 → 3 contactos · Costo S/ 3', status: 'failed', types: ['BROADCAST'], ref: '9A9A-5566', records: 3, note: 'No pude completar la ejecución. Revertí los cambios de este plan.' },
    { id: 'h10', at: ago(98), utterance: '🎤 (nota de voz 14 s) «pásame mis negocios abiertos ordenados por monto»', plan: 'Reporte: mis negocios abiertos por monto', status: 'executed', types: ['GENERATE_REPORT'], ref: '7C7C-0011', records: 33 },
    { id: 'h11', at: ago(120), utterance: 'deshacer', plan: 'Quitar etiqueta «Frío» → 19 contactos', status: 'executed', types: ['UNTAG'], ref: '5E5E-3322', records: 19, note: 'Deshizo el plan anterior' },
  ],

  approvals: [
    { id: 'ap1', createdAt: ago(20), expiresAt: at(13), requester: 'Ale Torres (vendedora)', plan: 'Asignar a Equipo Comercial Lima → 14 negocios', reason: 'Excede el límite de 10 registros por reasignación', preview: ['1️⃣ Asignar a *Equipo Comercial Lima* → 14 negocios', 'Total: 14 registros · S/ 3.210.000'], ref: '0000-0020', status: 'pending' },
    { id: 'ap2', createdAt: ago(60), expiresAt: at(11), requester: 'Ale Torres (vendedora)', plan: 'Enviar plantilla promo-setiembre → 120 contactos', reason: 'Envío masivo con costo S/ 120 (máximo autorizado S/ 50)', preview: ['1️⃣ Enviar plantilla *promo-setiembre* → 120 contactos', '💸 Costo estimado: S/ 120'], ref: '0000-0019', status: 'pending' },
    { id: 'ap3', createdAt: ago(24 * 6), expiresAt: at(8), requester: 'Diego Ramos (vendedor)', plan: 'Aplicar 15 % de descuento → 6 negocios', reason: 'Descuento sobre el 10 % permitido', preview: ['1️⃣ Aplicar 15 % de descuento → 6 negocios'], ref: '0000-0017', status: 'approved', decidedBy: 'Sergio', decidedAt: ago(24 * 5) },
    { id: 'ap4', createdAt: ago(24 * 9), expiresAt: at(5), requester: 'Diego Ramos (vendedor)', plan: 'Mover a Cerrado perdido → 22 negocios', reason: 'Cambio de etapa masivo', preview: ['1️⃣ Mover a *Cerrado perdido* → 22 negocios'], ref: '0000-0015', status: 'rejected', decidedBy: 'Sergio', decidedAt: ago(24 * 8), decisionReason: 'Revisar uno por uno antes de perderlos' },
  ],

  team: {
    people: [
      { id: 'p1', name: 'Sergio Saavedra', role: 'owner', whatsapp: 'verified', team: 'Dirección', crmOwner: 'Sergio Saavedra', commandsMonth: 212, lastActive: ago(0.5) },
      { id: 'p2', name: 'Ale Torres', role: 'agent', whatsapp: 'verified', team: 'Equipo Comercial Lima', crmOwner: null, commandsMonth: 88, lastActive: ago(3) },
      { id: 'p3', name: 'Diego Ramos', role: 'agent', whatsapp: 'verified', team: 'Equipo Comercial Norte', crmOwner: null, commandsMonth: 41, lastActive: ago(26) },
      { id: 'p4', name: 'Rosa Chávez', role: 'analyst', whatsapp: 'pending', team: 'Marketing', crmOwner: null, commandsMonth: 0, lastActive: null },
    ],
    roles: {
      owner: 'Todo: aprueba planes que exceden límites, gestiona el plan, conecta CRM.',
      admin: 'Como owner, sin facturación.',
      supervisor: 'Ve el equipo, aprueba, reasigna.',
      agent: 'Opera su cartera. No reasigna (ASSIGN no es del rol agent).',
      analyst: 'Solo consulta y reportes. No escribe en el CRM.',
    },
    crmOwners: 1,
    limits: { assignMax: 10, broadcastMaxCost: 50, discountMaxPct: 10, stepUpAbove: 20 },
  },

  // La conexión con Meta Ads (plan 14): qué devuelve GET /integrations/meta/status.
  meta: {
    status: 'active',
    connectedAt: ago(3),
    tokenExpiresAt: null,
    scopes: ['ads_management', 'ads_read', 'business_management'],
    lastErrorCode: null,
    accounts: [
      { accountRef: 'act_4471002233', name: 'Inmobiliaria Rojas', accountStatus: 1, currency: 'PEN', timezoneName: 'America/Lima', businessId: '55501', businessName: 'Grupo Rojas', selected: true },
      { accountRef: 'act_7712003344', name: 'Rojas · Miami', accountStatus: 1, currency: 'USD', timezoneName: 'America/Lima', businessId: '55501', businessName: 'Grupo Rojas', selected: true },
      { accountRef: 'act_4471009988', name: 'Rojas · Proyectos nuevos', accountStatus: 1, currency: 'PEN', timezoneName: 'America/Lima', businessId: '55501', businessName: 'Grupo Rojas', selected: true },
      { accountRef: 'act_8890114455', name: 'Pruebas internas', accountStatus: 2, currency: 'USD', timezoneName: 'America/Lima', businessId: null, businessName: null, selected: true },
    ],
  },
};

export const MOCK_DELAY_MS = 350;

/* ------------------------------------------------------- Marketing (plan 16)
   Las métricas de Meta con la forma que devuelve el motor de verdad. El
   endpoint pide sesión, así que esta es la ÚNICA manera de mirar la pantalla
   entera antes de desplegar; por eso el caso normal trae a propósito todo lo
   que se puede torcer: dos monedas a la vez, una campaña con ROAS y otra sin
   valor de conversión, una que gastó y no consiguió ni un lead, un objetivo
   del que no sabemos qué contar, una cuenta sin datos y otra con la última
   consulta fallida.

   `?mock=1&mk=...` cambia el caso: `limitado` (el botón dentro de los cinco
   minutos), `marcada` (Facebook retiró el permiso), `primera` (todavía no hay
   copia) y `sin` (sin conexión). */

const day = (offset) => new Date(now.getTime() + offset * DAY).toISOString().slice(0, 10);
const MIN = 60;

const MK_ACCOUNTS = [
  { id: 'act_4471002233', provider: 'meta', adAccount: 'act_4471002233', name: 'Inmobiliaria Rojas', businessName: 'Grupo Rojas',
    currency: 'PEN', state: 'con_datos', refreshedAt: ago(0.6), ageSeconds: 36 * MIN, campaigns: 3, lastErrorCode: null, nextManualRefreshAt: null },
  { id: 'act_7712003344', provider: 'meta', adAccount: 'act_7712003344', name: 'Rojas · Miami', businessName: 'Grupo Rojas',
    currency: 'USD', state: 'con_datos', refreshedAt: ago(0.62), ageSeconds: 37 * MIN, campaigns: 2, lastErrorCode: null, nextManualRefreshAt: null },
  // Recién conectada y sin gasto en el periodo: un vacío honesto, no un fallo.
  { id: 'act_4471009988', provider: 'meta', adAccount: 'act_4471009988', name: 'Rojas · Proyectos nuevos', businessName: 'Grupo Rojas',
    currency: 'PEN', state: 'sin_datos', refreshedAt: ago(0.6), ageSeconds: 36 * MIN, campaigns: 0, lastErrorCode: null, nextManualRefreshAt: null },
  // La última consulta no salió y la copia buena SIGUE AHÍ, con su fecha.
  { id: 'act_8890114455', provider: 'meta', adAccount: 'act_8890114455', name: 'Pruebas internas', businessName: null,
    currency: 'USD', state: 'error', refreshedAt: ago(0.7), ageSeconds: 42 * MIN, campaigns: 1, lastErrorCode: 'META_4',
    nextManualRefreshAt: new Date(now.getTime() + 212_000).toISOString() },
];

const MK_CAMPAIGNS = [
  /* Inmobiliaria: su resultado es un lead, no una venta, así que Meta no
     devuelve valor de conversión y NO hay ROAS que enseñar. */
  { id: '23851', name: 'Torres del Parque · Lanzamiento', accountRef: 'act_4471002233', accountName: 'Inmobiliaria Rojas',
    currency: 'PEN', objective: 'OUTCOME_LEADS', spend: 1720.5, impressions: 218_000, clicks: 3980, ctr: 0.0183,
    result: { kind: 'lead', results: 58, costPerResult: 29.66 }, conversionValue: null, roas: null, roasUnavailable: 'sin_valor_de_conversion' },
  // Objetivo de leads con destino WhatsApp: lo que se cuenta son conversaciones.
  { id: '23852', name: 'Miraflores Sky · Retargeting visitas', accountRef: 'act_4471002233', accountName: 'Inmobiliaria Rojas',
    currency: 'PEN', objective: 'OUTCOME_LEADS', spend: 1180.2, impressions: 96_000, clicks: 1740, ctr: 0.0181,
    result: { kind: 'mensaje', results: 34, costPerResult: 34.71 }, conversionValue: null, roas: null, roasUnavailable: 'sin_valor_de_conversion' },
  /* Gastó y no consiguió ni uno: `results: 0` es un número real y su costo por
     resultado es `null`, no infinito ni cero. */
  { id: '23853', name: 'Surco Garden · Últimas unidades', accountRef: 'act_4471002233', accountName: 'Inmobiliaria Rojas',
    currency: 'PEN', objective: 'OUTCOME_LEADS', spend: 1949.42, impressions: 98_000, clicks: 1210, ctr: 0.0123,
    result: { kind: 'lead', results: 0, costPerResult: null }, conversionValue: null, roas: null, roasUnavailable: 'sin_valor_de_conversion' },
  // Comercio en dólares: aquí sí hay ingreso medido, y por tanto ROAS.
  { id: '31007', name: 'Rojas Miami · Ventas web', accountRef: 'act_7712003344', accountName: 'Rojas · Miami',
    currency: 'USD', objective: 'OUTCOME_SALES', spend: 300, impressions: 88_000, clicks: 2100, ctr: 0.0239,
    result: { kind: 'compra', results: 12, costPerResult: 25 }, conversionValue: 1560, roas: 5.2, roasUnavailable: null },
  /* ROAS 0: Meta SÍ devolvió el valor y es cero. Gasto sin ingreso es una mala
     noticia de verdad y se enseña, al revés que la ausencia de valor. */
  { id: '31008', name: 'Rojas Miami · Catálogo', accountRef: 'act_7712003344', accountName: 'Rojas · Miami',
    currency: 'USD', objective: 'OUTCOME_SALES', spend: 60, impressions: 21_000, clicks: 410, ctr: 0.0195,
    result: { kind: 'compra', results: 0, costPerResult: null }, conversionValue: 0, roas: 0, roasUnavailable: null },
  /* Objetivo que no está en la tabla: no sabemos qué cuenta como resultado
     aquí, y `result: null` lo dice en vez de inventarse un cero. */
  { id: '90211', name: 'Pruebas internas · Marca', accountRef: 'act_8890114455', accountName: 'Pruebas internas',
    currency: 'USD', objective: 'OUTCOME_LOCAL_AWARENESS', spend: 45.8, impressions: 132_000, clicks: 260, ctr: 0.002,
    result: null, conversionValue: null, roas: null, roasUnavailable: 'sin_valor_de_conversion' },
];

const MK_TOTALS = [
  { currency: 'PEN', spend: 4850.12, impressions: 412_000, clicks: 6930, accounts: ['act_4471002233'],
    byResult: [
      { kind: 'lead', results: 58, spend: 3669.92, costPerResult: 63.27, conversionValue: null, roas: null },
      { kind: 'mensaje', results: 34, spend: 1180.2, costPerResult: 34.71, conversionValue: null, roas: null },
    ] },
  { currency: 'USD', spend: 405.8, impressions: 241_000, clicks: 2770, accounts: ['act_7712003344', 'act_8890114455'],
    byResult: [
      { kind: 'compra', results: 12, spend: 360, costPerResult: 30, conversionValue: 1560, roas: 4.33 },
    ] },
];

const mkPeriod = () => ({ label: 'Últimos 30 días', days: 30, since: day(-29), until: day(0) });

/** El overview del caso pedido. */
export function marketingOverview(scenario) {
  const base = {
    connection: { status: 'active', connectedAt: ago(24 * 6), lastErrorCode: null },
    period: mkPeriod(),
    totals: structuredClone(MK_TOTALS),
    campaigns: structuredClone(MK_CAMPAIGNS),
    accounts: structuredClone(MK_ACCOUNTS),
    // La edad de la pantalla es la del dato MÁS VIEJO (42 min, la cuenta que
    // falló), no la del más reciente: eso la haría parecer más fresca.
    freshness: { refreshedAt: ago(0.7), ageSeconds: 42 * MIN, stale: false, pending: 0, failing: 1 },
    refresh: { allowed: true, retryAfterSeconds: 0, nextAllowedAt: null },
  };
  if (scenario === 'sin') {
    return { connection: { status: 'disconnected', connectedAt: null, lastErrorCode: null }, period: mkPeriod(),
      totals: [], campaigns: [], accounts: [],
      freshness: { refreshedAt: null, ageSeconds: null, stale: false, pending: 0, failing: 0 },
      refresh: { allowed: false, retryAfterSeconds: 0, nextAllowedAt: null } };
  }
  if (scenario === 'primera') {
    // Todavía trayendo la primera copia: no hay edad, y eso NO es un error.
    base.totals = []; base.campaigns = [];
    base.accounts = base.accounts.slice(0, 2).map((a) => ({ ...a, state: 'pendiente', refreshedAt: null, ageSeconds: null, campaigns: 0, lastErrorCode: null }));
    base.freshness = { refreshedAt: null, ageSeconds: null, stale: false, pending: 2, failing: 0 };
    return base;
  }
  if (scenario === 'limitado') {
    base.refresh = { allowed: false, retryAfterSeconds: 212, nextAllowedAt: new Date(now.getTime() + 212_000).toISOString() };
    return base;
  }
  if (scenario === 'marcada') {
    // El permiso retirado desde Facebook: los números de la última copia se
    // conservan —una pantalla en blanco sería peor— y la conexión va marcada.
    base.connection = { status: 'error', connectedAt: ago(24 * 6), lastErrorCode: 'META_190' };
    base.accounts = base.accounts.map((a) => ({ ...a, state: 'error', lastErrorCode: 'META_190', refreshedAt: ago(26), ageSeconds: 26 * 3600 }));
    base.freshness = { refreshedAt: ago(26), ageSeconds: 26 * 3600, stale: true, pending: 0, failing: 4 };
    return base;
  }
  return base;
}

/** La respuesta del botón. Siempre 200, también cuando toca esperar. */
export function marketingRefresh(scenario) {
  const overview = marketingOverview(scenario);
  if (scenario === 'sin') return { accepted: false, reason: 'sin_conexion', refreshed: [], throttled: [], failed: [], retryAfterSeconds: 0, nextAllowedAt: null, overview };
  if (scenario === 'marcada') return { accepted: false, reason: 'conexion_marcada', refreshed: [], throttled: [], failed: [{ accountRef: 'act_4471002233', code: 'META_190' }], retryAfterSeconds: 0, nextAllowedAt: null, overview };
  if (scenario === 'limitado') return { accepted: false, reason: 'limitado', refreshed: [], throttled: MK_ACCOUNTS.map((a) => ({ accountRef: a.id, retryAfterSeconds: 212 })), failed: [], retryAfterSeconds: 212, nextAllowedAt: new Date(now.getTime() + 212_000).toISOString(), overview };
  // El caso normal: dos cuentas al día, una que tuvo que esperar y otra que
  // devolvió el límite de Meta. El límite es POR CUENTA, así que refrescar
  // unas y esperar por otras es lo esperable, no un fallo.
  return { accepted: true, reason: 'ok', refreshed: ['act_4471002233', 'act_7712003344'],
    throttled: [{ accountRef: 'act_4471009988', retryAfterSeconds: 96 }],
    failed: [{ accountRef: 'act_8890114455', code: 'META_4' }],
    retryAfterSeconds: 0, nextAllowedAt: null, overview };
}

/** La conexión, coherente con el caso: sin ella no hay métricas que pedir. */
export function metaStatus(scenario) {
  if (scenario === 'sin') return { ...structuredClone(MOCK.meta), status: 'disconnected', connectedAt: null, accounts: [] };
  if (scenario === 'marcada') return { ...structuredClone(MOCK.meta), status: 'error', lastErrorCode: 'META_190' };
  return structuredClone(MOCK.meta);
}

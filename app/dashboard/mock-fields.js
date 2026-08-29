/* Fixture para revisar la interfaz sin backend (?mock=1).
   IMPORTANTE: aquí SOLO hay metadatos de campos (nombre interno, etiqueta, tipo,
   conteos y porcentajes agregados). Ni un solo dato de cliente: ningún nombre,
   teléfono, correo, ni valores de ejemplo. La página no los muestra nunca. */

const DAY = 86400000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

/** f(propertyName, label, fieldType, extras) */
const f = (propertyName, label, fieldType, extra) => ({
  propertyName,
  label,
  fieldType,
  optionCount: 0,
  mirrored: false,
  queryable: false,
  editable: false,
  sensitive: false,
  core: false,
  usage: { mentions: 0, lastMentionedAt: null },
  fillRate: 0,
  ...(extra || {}),
});

const CONTACT = [
  f('firstname', 'Nombre', 'string', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.99, usage: { mentions: 41, lastMentionedAt: ago(0) } }),
  f('lastname', 'Apellido', 'string', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.97, usage: { mentions: 33, lastMentionedAt: ago(0) } }),
  f('email', 'Correo electrónico', 'string', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.88, usage: { mentions: 27, lastMentionedAt: ago(1) } }),
  f('phone', 'Teléfono', 'phone_number', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.81, usage: { mentions: 22, lastMentionedAt: ago(1) } }),
  f('hs_lead_status', 'Estado del lead', 'enumeration', { optionCount: 6, queryable: true, editable: true, mirrored: true, fillRate: 0.72, usage: { mentions: 18, lastMentionedAt: ago(2) } }),
  f('lifecyclestage', 'Etapa del ciclo de vida', 'enumeration', { optionCount: 8, queryable: true, mirrored: true, fillRate: 0.94, usage: { mentions: 11, lastMentionedAt: ago(3) } }),
  f('hubspot_owner_id', 'Propietario', 'enumeration', { optionCount: 12, queryable: true, editable: true, mirrored: true, fillRate: 0.86, usage: { mentions: 9, lastMentionedAt: ago(1) } }),
  f('mobilephone', 'Celular', 'phone_number', { fillRate: 0.74, usage: { mentions: 7, lastMentionedAt: ago(2) } }),
  f('canal_origen', 'Canal de origen', 'enumeration', { optionCount: 9, fillRate: 0.88, usage: { mentions: 5, lastMentionedAt: ago(4) } }),
  f('puntaje_lead', 'Puntaje del lead', 'number', { fillRate: 0.38, usage: { mentions: 4, lastMentionedAt: ago(6) } }),
  f('ultima_cotizacion', 'Última cotización enviada', 'date', { fillRate: 0.52, usage: { mentions: 3, lastMentionedAt: ago(9) } }),
  f('numero_documento', 'Documento de identidad', 'string', { sensitive: true, fillRate: 0.43, usage: { mentions: 2, lastMentionedAt: ago(12) } }),
  f('whatsapp_opt_in', 'Acepta mensajes por WhatsApp', 'bool', { fillRate: 0.91, usage: { mentions: 2, lastMentionedAt: ago(15) } }),
  f('jobtitle', 'Cargo', 'string', { fillRate: 0.82 }),
  f('city', 'Ciudad', 'string', { fillRate: 0.79 }),
  f('company', 'Empresa donde trabaja', 'string', { fillRate: 0.68 }),
  f('fecha_nacimiento', 'Fecha de nacimiento', 'date', { sensitive: true, fillRate: 0.21, usage: { mentions: 1, lastMentionedAt: ago(30) } }),
  f('direccion', 'Dirección', 'string', { sensitive: true, fillRate: 0.34 }),
  f('notes_last_contacted', 'Último contacto registrado', 'datetime', { fillRate: 0.63 }),
  f('hs_email_optout', 'Se dio de baja del correo', 'bool', { fillRate: 0.12 }),
  f('twitterhandle', 'Usuario de X', 'string', { fillRate: 0.03 }),
  f('falla_demo', 'Campo que falla al guardar (demo)', 'string', { fillRate: 0.5, usage: { mentions: 1, lastMentionedAt: ago(3) } }),
];

const OPPORTUNITY = [
  f('dealname', 'Nombre del negocio', 'string', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 1, usage: { mentions: 38, lastMentionedAt: ago(0) } }),
  f('amount', 'Monto', 'number', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.92, usage: { mentions: 31, lastMentionedAt: ago(0) } }),
  f('dealstage', 'Etapa del negocio', 'enumeration', { core: true, optionCount: 11, queryable: true, editable: true, mirrored: true, fillRate: 1, usage: { mentions: 29, lastMentionedAt: ago(1) } }),
  f('closedate', 'Fecha de cierre', 'date', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 0.84, usage: { mentions: 19, lastMentionedAt: ago(1) } }),
  f('pipeline', 'Embudo', 'enumeration', { optionCount: 3, queryable: true, mirrored: true, fillRate: 1, usage: { mentions: 8, lastMentionedAt: ago(5) } }),
  f('hubspot_owner_id', 'Propietario', 'enumeration', { optionCount: 12, queryable: true, editable: true, mirrored: true, fillRate: 0.9, usage: { mentions: 12, lastMentionedAt: ago(2) } }),
  f('probabilidad_cierre', 'Probabilidad de cierre', 'number', { fillRate: 0.44, usage: { mentions: 6, lastMentionedAt: ago(3) } }),
  f('motivo_perdida', 'Motivo de pérdida', 'enumeration', { optionCount: 7, fillRate: 0.31, usage: { mentions: 5, lastMentionedAt: ago(7) } }),
  f('producto_interes', 'Producto de interés', 'enumeration', { optionCount: 14, fillRate: 0.67, usage: { mentions: 4, lastMentionedAt: ago(4) } }),
  f('margen_estimado', 'Margen estimado', 'number', { sensitive: true, fillRate: 0.29, usage: { mentions: 2, lastMentionedAt: ago(11) } }),
  f('fuente_negocio', 'Fuente del negocio', 'enumeration', { optionCount: 10, fillRate: 0.93 }),
  f('numero_cotizacion', 'Número de cotización', 'string', { fillRate: 0.58 }),
  f('descuento_aplicado', 'Descuento aplicado', 'number', { fillRate: 0.17 }),
  f('dealtype', 'Tipo de negocio', 'enumeration', { optionCount: 4, fillRate: 0.46 }),
  f('notas_internas', 'Notas internas', 'textarea', { fillRate: 0.39 }),
  f('hs_forecast_amount', 'Monto proyectado', 'number', { fillRate: 0.22 }),
];

const COMPANY = [
  f('name', 'Nombre de la empresa', 'string', { core: true, queryable: true, editable: true, mirrored: true, fillRate: 1, usage: { mentions: 16, lastMentionedAt: ago(2) } }),
  f('domain', 'Dominio', 'string', { core: true, queryable: true, mirrored: true, fillRate: 0.87, usage: { mentions: 6, lastMentionedAt: ago(6) } }),
  f('industry', 'Industria', 'enumeration', { optionCount: 24, queryable: true, mirrored: true, fillRate: 0.71, usage: { mentions: 5, lastMentionedAt: ago(8) } }),
  f('numberofemployees', 'Número de empleados', 'number', { fillRate: 0.55, usage: { mentions: 4, lastMentionedAt: ago(10) } }),
  f('annualrevenue', 'Facturación anual', 'number', { fillRate: 0.34, usage: { mentions: 3, lastMentionedAt: ago(14) } }),
  f('ruc', 'RUC / identificación fiscal', 'string', { sensitive: true, fillRate: 0.48, usage: { mentions: 2, lastMentionedAt: ago(18) } }),
  f('telefono_principal', 'Teléfono principal', 'phone_number', { fillRate: 0.69, usage: { mentions: 1, lastMentionedAt: ago(21) } }),
  f('pais', 'País', 'enumeration', { optionCount: 30, fillRate: 0.95 }),
  f('sector_economico', 'Sector económico', 'enumeration', { optionCount: 18, fillRate: 0.77 }),
  f('website', 'Sitio web', 'string', { fillRate: 0.62 }),
  f('linkedin_company_page', 'Página de LinkedIn', 'string', { fillRate: 0.19 }),
  f('descripcion', 'Descripción', 'textarea', { fillRate: 0.28 }),
  f('fecha_alta', 'Fecha de alta', 'datetime', { fillRate: 0.99 }),
];

/* Relleno: un CRM real tiene ~190 propiedades. Son metadatos genéricos,
   sirven para probar la búsqueda y el "mostrar más" con volumen realista. */
const TYPES = ['string', 'number', 'date', 'enumeration', 'bool', 'textarea'];
function filler(prefix, from, to) {
  const out = [];
  for (let i = from; i <= to; i += 1) {
    const t = TYPES[i % TYPES.length];
    out.push(f(prefix + '_' + String(i).padStart(3, '0'), 'Campo personalizado ' + i, t, {
      optionCount: t === 'enumeration' ? 2 + (i % 9) : 0,
      fillRate: Math.round(((i * 37) % 100)) / 100,
    }));
  }
  return out;
}

export function mockPayload() {
  return {
    objects: [
      { objectType: 'contact', label: 'Contactos', fields: CONTACT.concat(filler('contacto', 1, 74)) },
      { objectType: 'opportunity', label: 'Negocios', fields: OPPORTUNITY.concat(filler('negocio', 1, 32)) },
      { objectType: 'company', label: 'Empresas', fields: COMPANY.concat(filler('empresa', 1, 19)) },
    ],
  };
}

/** API falsa con latencia; el campo `falla_demo` siempre falla para ver el rollback. */
export function createMockApi(mode) {
  const state = mockPayload();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    async listFields() {
      await wait(450);
      if (mode === 'error') { const e = new Error('El servicio no responde (simulado).'); e.status = 503; throw e; }
      if (mode === 'nocrm') return { objects: [] };
      return JSON.parse(JSON.stringify(state));
    },
    async patchField(objectType, propertyName, patch) {
      await wait(500);
      const obj = state.objects.find((o) => o.objectType === objectType);
      const field = obj && obj.fields.find((x) => x.propertyName === propertyName);
      if (!field) { const e = new Error('Campo no encontrado'); e.status = 404; throw e; }
      if (/falla_demo/.test(propertyName)) { const e = new Error('Tu CRM rechazó el cambio (simulado).'); e.status = 502; throw e; }
      Object.assign(field, patch);
      // visible en la consola para revisar exactamente qué mandaría la página al engine
      console.info('[mock] PATCH /crm/fields/' + objectType + '/' + propertyName, JSON.stringify(patch));
      return JSON.parse(JSON.stringify(field));
    },
  };
}

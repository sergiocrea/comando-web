/* Cloudflare Pages Function: POST /api/demo
   Le da lenguaje natural a la demo «Pruébalo» de la landing. Recibe el historial corto
   del chat y responde como Comando (mismo formato que el catálogo de respuestas del
   producto) usando DeepSeek; si DeepSeek falla o tarda, cae a OpenAI. Si los dos fallan,
   responde 503 y el navegador usa sus reglas locales (js/demo.js).

   Variables (Cloudflare Pages → Settings → Variables and Secrets; en local, `.dev.vars`):
     DEEPSEEK_API_KEY   obligatoria para el primer proveedor
     DEEPSEEK_MODEL     opcional, por defecto deepseek-v4-flash
     OPENAI_API_KEY     obligatoria para el respaldo
     OPENAI_MODEL       opcional, por defecto gpt-4.1-mini
   Enlace KV opcional `DEMO_KV` (Settings → Functions → KV namespace bindings): límite por
   IP y registro de lo que la gente escribe, para alimentar las reglas locales.

   GET /api/demo devuelve {ok, providers} para que el navegador sepa si hay modelo. */

import data from '../../docs/demo-data.json';

const MAX_TURNS = 12;
const MAX_CHARS = 400;
const LIMIT_PER_HOUR = 60;
const TIMEOUT_MS = 14000;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestGet({ env }) {
  return json({ ok: Boolean(env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY), providers: { deepseek: Boolean(env.DEEPSEEK_API_KEY), openai: Boolean(env.OPENAI_API_KEY) } });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DEEPSEEK_API_KEY && !env.OPENAI_API_KEY) return json({ error: 'sin proveedor configurado' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON inválido' }, 400); }
  const messages = sanitize(body && body.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({ error: 'falta el mensaje del usuario' }, 400);
  const text = messages[messages.length - 1].content;

  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (env.DEMO_KV) {
    const key = 'rl:' + ip + ':' + new Date().toISOString().slice(0, 13);
    const n = Number((await env.DEMO_KV.get(key)) || 0) + 1;
    waitUntil(env.DEMO_KV.put(key, String(n), { expirationTtl: 3700 }));
    if (n > LIMIT_PER_HOUR) return json({ error: 'Demasiados mensajes por ahora. Crea tu cuenta para seguir.' }, 429);
  }

  const system = buildSystemPrompt(data.crm);
  const chat = [{ role: 'system', content: system }, ...messages];
  const attempts = [];
  if (env.DEEPSEEK_API_KEY) attempts.push({ name: 'deepseek', url: 'https://api.deepseek.com/chat/completions', key: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash' });
  if (env.OPENAI_API_KEY) attempts.push({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4.1-mini' });

  let reply = null; let provider = null; const errors = [];
  for (const p of attempts) {
    try {
      reply = await complete(p, chat);
      if (reply) { provider = p.name; break; }
      errors.push(p.name + ': respuesta vacía');
    } catch (e) { errors.push(p.name + ': ' + (e && e.message ? e.message : String(e)).slice(0, 160)); }
  }
  const lastError = errors.join(' | ') || null;

  const entry = { at: new Date().toISOString(), text, localMatched: body && body.localMatched === true, provider, error: reply ? undefined : lastError };
  console.log('[demo]', JSON.stringify(entry));
  if (env.DEMO_KV) waitUntil(env.DEMO_KV.put('log:' + entry.at + ':' + Math.random().toString(36).slice(2, 8), JSON.stringify(entry), { expirationTtl: 60 * 60 * 24 * 30 }));

  if (!reply) return json({ error: 'los proveedores no respondieron', detail: lastError }, 503);
  return json({ reply, provider });
}

function sanitize(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
}

async function complete(p, chat) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(p.url, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + p.key },
      body: JSON.stringify({ model: p.model, messages: chat, temperature: 0.3, max_tokens: 380, stream: false }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const out = await res.json();
    const content = out && out.choices && out.choices[0] && out.choices[0].message && out.choices[0].message.content;
    return typeof content === 'string' ? content.trim() : '';
  } finally { clearTimeout(timer); }
}

/* El prompt: quién es Comando, el CRM de ejemplo y las reglas de formato del producto
   (docs/research/capabilities/catalogo-respuestas.md de comando-pro), resumidas. */
function buildSystemPrompt(c) {
  const etapas = c.etapas.map((e) => `• ${e.nombre}: ${e.n} · ${e.monto}`).join('\n');
  const fuentes = c.fuentes.map((f) => `${f.nombre} ${f.n}`).join(', ');
  const distritos = Object.entries(c.distritos).map(([k, v]) => `${cap(k)} ${v}`).join(', ');
  const proyectos = Object.entries(c.proyectos).map(([k, v]) => `${cap(k)} ${v.n} · ${v.monto}`).join('; ');
  return `Eres Comando, un operador de CRM por WhatsApp para equipos de ventas en Latinoamérica. Estás en una DEMO pública de comando.pro: respondes con los datos de ejemplo de una inmobiliaria y nunca inventas datos que no estén aquí. Habla en español latino, de tú, con frases cortas: una idea por línea, líneas de hasta 60 caracteres, listas con «•», sin tablas, sin JSON, sin ids. Máximo ~700 caracteres por respuesta. Negrita de WhatsApp con *asteriscos* para valores y palabras clave. Un emoji por mensaje según el tipo: 📋 plan, ✅ hecho, 📊 reporte, 🔎 sin resultados, ⚠️ parcial, ❌ error, ⏳ espera, 🔒 aprobación, 🔌 CRM, 💸 costo, ⏰ recordatorio, 🔕 pausado.

REGLAS DE COMPORTAMIENTO
1. Consultas (cuántos, cuánto, dame, pásame, qué negocios…): responde de inmediato con 📊, con los números de abajo. Listas largas: muestra 3 y termina con «…y N más. Responde *MÁS* para ver el resto.».
2. Escrituras (etiquetar, mover de etapa, nota, tarea/recordatorio, asignar, cambiar un campo, crear contacto, subir/bajar montos, descuento): NUNCA ejecutes de una. Responde con una vista previa:
📋 *Plan*
1️⃣ <verbo en infinitivo> *<valor>* → <cuántos y qué registros>
(si son ≤3 registros, nómbralos con su monto)

Responde *CONFIRMAR* para ejecutar.
Vence en 15 minutos.
Guarda ese plan como pendiente. Solo la palabra CONFIRMAR (o confirmo/confirmado/confirma) ejecuta: responde «✅ Confirmado. Ejecutando…» y luego el resultado en pasado («✅ Etiqueté 23 contactos como *VIP*»). «ok», «dale», «sí», «ya», «listo» NO ejecutan: responde «Entiendo que sí. Para ejecutar escribe *CONFIRMAR*.». «cancela», «mejor no», «no», «olvídalo» descartan el plan y lo dices. Si con un plan pendiente llega otro comando distinto, di en una línea que dejas sin hacer el anterior (nombrándolo) y sigue. Si llega una corrección («pero solo los de Surco»), replantea el mismo plan ajustado y muestra la nueva vista previa. «deshacer» revierte el último plan ejecutado y lo dices.
3. Reasignar más de ${c.limites.reasignar_sin_aprobar} registros, envíos con costo mayor a S/ ${c.limites.envio_max_soles} o descuentos mayores a ${c.limites.descuento_max_pct} %: la vista previa es igual, pero al confirmar respondes 🔒 «Este plan excede tus límites. Solicitud enviada para aprobación del dueño. Te aviso cuando respondan; vence en 14 días. Ref: 0000-00NN».
4. Avisos: «cuando / si / apenas entre…» crea una regla por evento; «cada lunes / cada mañana / una vez por semana…» crea un aviso con cadencia. Ambos pasan por vista previa (📋 Crear regla… / 📋 Crear aviso… → cadencia) y CONFIRMAR, y al ejecutar dices que solo escribe si hay algo; si no, silencio, y que BASTA lo apaga. «Cada semana» sin día: pregunta lunes o viernes. «Pausa la regla/aviso de X»: 🔕 y lo dices.
5. Lo que NO haces (dilo y ofrece la alternativa, nunca rechaces en seco): llamar por teléfono (creas la tarea con el número y la recuerdas a la hora), escribirle a clientes desde el número del operador (Meta lo bloquearía: preparas cada mensaje listo para enviarlo con un toque, «modo asistido»), borrar o fusionar registros (detectas duplicados y los listas; fusionar lo hace la persona en el CRM), cobrar, contar llamadas o correos (no hay registro de actividades), crear campos u opciones en el CRM, pronósticos o proyecciones.
6. Ambigüedad real («los buenos», «actualiza ese», «siguiente etapa», nombres que coinciden con varios): no adivines; pregunta con 2 o 3 opciones numeradas y termina con «No ejecuté nada.». Si un valor de lista no existe (una etapa o distrito que no está abajo), di que no existe y ofrece las parecidas.
7. Si no entiendes, di qué puedes hacer con tres ejemplos (consultar / escribir / avisar) y «No ejecuté nada.». Nunca respondas «hoy no hay novedades» como aviso; el silencio es la buena noticia.
8. «POR QUÉ» tras un aviso: explica la regla, el valor y el umbral. «BASTA»: 🔕 pausas ese tipo de aviso. «MÁS»: siguiente página de la última lista. Saludos: preséntate en una línea y da tres ejemplos. Si preguntan si eres una IA o cómo funciona la demo: lo eres, es una demo con datos de ejemplo, y en la versión real respondes con el CRM del cliente.

DATOS DE EJEMPLO (${c.empresa}; CRM conectado: ${c.crm}, sincronizado hace ${c.sincronizado_hace})
Contactos ${c.contactos} · empresas ${c.empresas} · negocios abiertos ${c.negocios_abiertos} · plata en juego ${c.plata_en_juego}
Por etapa:
${etapas}
Ganados este mes: ${c.ganados_mes.n} · ${c.ganados_mes.monto}. Perdidos este mes: ${c.perdidos_mes.n} · ${c.perdidos_mes.monto} (motivo: ${c.perdidos_mes.motivo}).
Negocios sin actividad 15 días: ${c.parados_15d.n} · ${c.parados_15d.monto}: ${c.parados_15d.lista.join('; ')}.
Sin dueño: ${c.sin_dueno.n}: ${c.sin_dueno.lista.join('; ')}.
Leads en espera (sin contacto): ${c.en_espera.n}: ${c.en_espera.lista.join('; ')}.
Leads que entraron anoche: ${c.leads_anoche.n}: ${c.leads_anoche.lista.join('; ')}.
Duplicados por teléfono: ${c.duplicados.grupos} grupos (${c.duplicados.fichas} fichas): ${c.duplicados.lista.join('; ')}.
Sin monto: ${c.sin_monto.n} de ${c.sin_monto.de}. Sin teléfono: ${c.sin_telefono.n} de ${c.sin_telefono.de}. Sin fecha de cierre: ${c.sin_fecha_cierre.n} de ${c.sin_fecha_cierre.de}.
Cierran este mes: ${c.cierran_este_mes.n} · ${c.cierran_este_mes.monto}: ${c.cierran_este_mes.lista.join('; ')}. Cierre vencido: ${c.cierre_vencido.n}: ${c.cierre_vencido.lista.join('; ')}.
En Separación: ${c.separacion.map((s) => `${s.nombre} · ${s.monto} · ${s.dias} días`).join('; ')}.
Tareas de hoy: ${c.tareas_hoy.join('; ')}.
Contactos por fuente: ${fuentes}. Por distrito: ${distritos}. Negocios por proyecto: ${proyectos}.
Top 5 por monto: ${c.top5.join('; ')}.
Mis negocios (del operador): ${c.mis_negocios.n} · ${c.mis_negocios.monto}; los otros 8 abiertos no tienen responsable.
Personas del equipo: ${Object.values(c.personas).join(', ')}. Contactos de ejemplo con teléfono: ${c.contactos_ejemplo.join('; ')}.
Umbral de negocio grande: ${c.umbral_grande}. Etiquetas existentes: VIP, Frío, Reactivar. Etapas válidas: ${c.etapas.map((e) => e.nombre).join(', ')}, Cerrado ganado, Cerrado perdido. Distritos válidos: ${Object.keys(c.distritos).map(cap).join(', ')}. Fuentes válidas: ${c.fuentes.map((f) => f.nombre).join(', ')}.
Para segmentos que no están aquí (otro distrito, otra etiqueta), usa un número plausible pequeño (entre 2 y 12) y márcalo como aproximado en la demo solo si te lo preguntan.`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

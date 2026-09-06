/* ============================================================
   demo.js — «Pruébalo»: un WhatsApp de mentira en la landing.
   El visitante escribe como le escribiría a Comando y recibe la
   respuesta que daría el producto (📋 plan → CONFIRMAR → ✅,
   📊 reporte, aclaración con alternativas).

   Dos motores, uno detrás del otro:
   1. /api/demo (Cloudflare Pages Function → DeepSeek, respaldo
      OpenAI): entiende cualquier frase. Se usa si está disponible.
   2. Reglas locales sobre docs/demo-data.json (intenciones con
      palabras clave sacadas del banco de comandos real): respuesta
      instantánea, sin backend, y respaldo si el modelo falla.
   Los datos son los de una inmobiliaria de ejemplo. Reusa las
   clases del teléfono del radar (.radar-*).
   ============================================================ */
(function () {
  const root = document.getElementById('demo-root');
  if (!root || root.closest('[hidden]')) return; // la sección está oculta de momento

  const API = 'api/demo';
  const SESSION_MAX = 30;
  let D = null;           // docs/demo-data.json
  let useApi = false;     // hay modelo detrás de /api/demo
  let apiFailures = 0;
  const history = [];     // {role, content} para el modelo

  /* ---------- utilidades ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;]/g, ' ').replace(/\s+/g, ' ').trim();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const now = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmt = (text) => esc(text).replace(/\*([^*\n]+)\*/g, '<b style="display:inline;margin:0">$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const has = (t, ...words) => words.some((w) => t.includes(w));
  const list = (arr, more) => arr.map((x) => '• ' + x).join('\n') + (more ? `\n…y ${more} más. Responde *MÁS* para ver el resto.` : '');

  /* ---------- intenciones (modo local) ---------- */
  function intentOf(t) {
    for (const it of D.intents) {
      const reOk = it.re ? new RegExp(it.re).test(t) : true;
      const kwOk = it.kw ? it.kw.some((k) => t.includes(k)) : true;
      const needOk = it.needs ? it.needs.some((k) => t.includes(k)) : true;
      if (reOk && kwOk && needOk && (it.re || it.kw)) return it.id;
    }
    return 'unknown';
  }
  const isControl = (t) => /^(confirmar|confirmo|confirmado|confirma)( \d{6})?$/.test(t) || /^(ok|oka|dale|si|ya|listo|bueno|va)$/.test(t) || /^(cancela|cancelar|olvidalo|dejalo|mejor no|no)$/.test(t) || /^mas$/.test(t) || /^deshace/.test(t) || /^basta$/.test(t) || has(t, 'por que');

  /* ---------- estado del modo local ---------- */
  let pending = null;   // { preview, result, undo }
  let lastDone = null;
  let morePages = null;
  let busy = false;
  let sent = 0;

  function segment(t) {
    const c = D.crm;
    for (const d of Object.keys(c.distritos)) if (t.includes(d)) return { label: 'contactos de ' + cap(d), count: c.distritos[d] };
    for (const p of Object.keys(c.proyectos)) if (t.includes(p)) return { label: 'negocios de ' + cap(p), count: c.proyectos[p].n, amount: c.proyectos[p].monto, project: true };
    if (has(t, 'sin telefono', 'sin celular', 'sin numero')) return { label: 'contactos sin teléfono', count: c.sin_telefono.n };
    if (has(t, 'sin dueno', 'sin responsable', 'sin propietario', 'sin asignar')) return { label: 'registros sin dueño', count: c.sin_dueno.n };
    if (has(t, 'parad', 'sin movimiento', 'sin actividad', 'estancad', 'frio')) return { label: 'negocios sin actividad', count: c.parados_15d.n };
    if (has(t, 'en espera', 'sin contacto', 'sin atender')) return { label: 'leads en espera', count: c.en_espera.n };
    if (has(t, 'negociacion')) return { label: 'negocios en Negociación', count: 17 };
    if (has(t, 'lead nuevo')) return { label: 'contactos en Lead nuevo', count: 9 };
    if (has(t, 'abierto')) return { label: 'negocios abiertos', count: c.negocios_abiertos };
    if (has(t, 'urbania')) return { label: 'contactos de Urbania', count: 61 };
    if (has(t, 'adondevivir')) return { label: 'contactos de Adondevivir', count: 44 };
    if (has(t, 'meta')) return { label: 'contactos de Meta Ads', count: 38 };
    if (has(t, 'vip')) return { label: 'contactos VIP', count: 23 };
    return null;
  }
  const plan = (line, count, result, extra) => ({ preview: `📋 *Plan*\n1️⃣ ${line} → ${count}${extra ? '\n' + extra : ''}\n\nResponde *CONFIRMAR* para ejecutar.\nVence en 15 minutos.`, result });
  const pendingName = () => pending.preview.split('\n')[1].replace(/^1️⃣ /, '');
  const person = (t) => { const k = Object.keys(D.crm.personas).find((p) => new RegExp('\\b' + p + '\\b').test(t)); return k ? D.crm.personas[k] : null; };

  function localReply(raw) {
    const c = D.crm; const t = norm(raw);
    if (!t) return null;

    /* control */
    if (/^(confirmar|confirmo|confirmado|confirma)( \d{6})?$/.test(t)) {
      if (!pending) return 'No hay un plan pendiente.\nEnvíame el comando de nuevo.';
      const p = pending; pending = null; lastDone = p;
      return ['✅ Confirmado. Ejecutando…\nTe aviso con el resultado en unos segundos.', p.result];
    }
    if (/^(ok|oka|dale|si|ya|listo|bueno|va)$/.test(t)) return pending ? 'Entiendo que sí. Para ejecutar escribe *CONFIRMAR*.' : 'No hay nada pendiente. ¿Qué quieres hacer?';
    if (/^(cancela|cancelar|olvidalo|dejalo|mejor no|no)$/.test(t)) { if (!pending) return 'No hay nada pendiente. ¿Qué quieres hacer?'; const n = pendingName(); pending = null; return `Listo, descarté el plan: _${n}_.`; }
    if (/^mas$/.test(t)) { if (!morePages || !morePages.length) return 'No hay más resultados pendientes.'; const page = morePages.shift(); if (!morePages.length) morePages = null; return page; }
    if (/^deshace/.test(t)) { if (!lastDone) return 'No hay nada que deshacer todavía.'; const p = lastDone; lastDone = null; return `↩️ Deshecho: ${p.undo || 'revertí el último plan sobre los mismos registros'}.`; }
    if (/^basta$/.test(t)) return '🔕 Listo. Pausé los avisos de negocios sin actividad. Responde *DIARIO* si los quieres de vuelta.';
    if (has(t, 'por que')) return `Te avisé porque *Torres del Parque 402* lleva *19 días* sin actividad, sobre tu umbral de 14, y es un negocio grande (S/ 610.000, por encima de ${c.umbral_grande}).\nResponde *BASTA* si no quieres más avisos de este tipo.`;

    const intent = intentOf(t);
    let prefix = '';
    if (pending && !['greet', 'thanks', 'voice', 'unknown'].includes(intent)) { prefix = `Dejo sin hacer lo anterior (_${pendingName()}_).\n\n`; pending = null; }
    const seg = segment(t);

    switch (intent) {
      case 'greet': return 'Hola 👋 Soy Comando. Pídeme algo de tu CRM en tus palabras:\n• _cuánta plata hay en juego_\n• _etiqueta VIP a los de Miraflores_\n• _avísame cada lunes qué negocios están parados_';
      case 'thanks': return 'De nada. Aquí sigo 👀';
      case 'voice': return '🎤 En la versión real también puedes mandarme notas de voz: te repito lo que entendí antes de hacer nada.';

      case 'rule_cadence': {
        const when = (t.match(/\b(cada|todos los|todas las|los)\s+(lunes|martes|miercoles|jueves|viernes|sabado|manana|dia|semana|mes)/) || [])[2] || (has(t, 'diario') ? 'dia' : 'semana');
        if (has(t, 'cada semana') && !/lunes|viernes|martes|miercoles|jueves/.test(t)) return prefix + '¿Qué día de la semana?\n1️⃣ Lunes (para planificar)\n2️⃣ Viernes (para cerrar)\nResponde con el número.\nNo ejecuté nada.';
        const what = has(t, 'repetid', 'duplicad') ? 'contactos repetidos' : has(t, 'parad', 'sin movimiento', 'sin actividad', 'estancad') ? 'negocios 15 días sin movimiento' : has(t, 'sin dueno', 'sin responsable') ? 'registros sin dueño' : has(t, 'pipeline', 'etapa', 'embudo') ? 'pipeline por etapa' : has(t, 'kpi', 'resumen', 'semana') ? 'resumen de la semana' : has(t, 'lead', 'contacto') ? 'contactos nuevos del día' : 'resumen del embudo';
        const cad = { lunes: 'Lunes 08:00', martes: 'Martes 08:00', miercoles: 'Miércoles 08:00', jueves: 'Jueves 08:00', viernes: 'Viernes 08:00', sabado: 'Sábado 08:00', manana: 'Diario 07:30', dia: 'Diario 07:30', semana: 'Lunes 08:00', mes: 'Primer día hábil 08:00' }[when] || 'Lunes 08:00';
        const hour = (t.match(/\b(\d{1,2})\s*(am|h|:00|de la manana)?\b/) || [])[1];
        const cadence = hour ? cad.replace(/\d{2}:\d{2}/, String(hour).padStart(2, '0') + ':00') : cad;
        pending = plan(`Crear aviso *${what}*`, cadence, `✅ Creé el aviso «${cap(what)}» · ${cadence}.\nSolo te escribe si hay algo; si no, silencio.\nResponde *BASTA* cuando quieras apagarlo.`);
        pending.undo = 'borré el aviso «' + what + '»';
        return prefix + pending.preview;
      }
      case 'rule_event': {
        const ev = has(t, 'sin telefono') ? 'entre un contacto sin teléfono' : has(t, 'sin dueno', 'sin propietario') ? 'entre un contacto sin dueño' : has(t, 'separacion') ? 'un negocio llegue a Separación' : has(t, 'ganado', 'cerrado') ? 'un negocio llegue a Cerrado ganado' : has(t, 'retroced') ? 'un negocio retroceda de etapa' : /\d{2,3}\s*(mil|k)/.test(t) ? 'entre un negocio de más de ' + t.match(/(\d{2,3})\s*(mil|k)/)[1] + ' mil' : has(t, 'urbania') ? 'entre un lead de Urbania' : has(t, 'meta') ? 'entre un lead de Meta Ads' : has(t, 'cotizacion') ? 'un negocio pase a Cotización enviada' : has(t, 'lead', 'contacto') ? 'entre un lead nuevo' : 'pase eso en tu CRM';
        const who = person(t);
        const act = has(t, 'etiqueta') ? 'etiquetarlo' : has(t, 'asigna', 'que vaya', 'que vayan') ? 'asignarlo a ' + (who || 'Ale Torres') : has(t, 'tarea', 'recuerda') ? 'crearte la tarea' : 'avisarte por WhatsApp';
        pending = plan(`Crear regla: cuando *${ev}* → ${act}`, 'en tiempo real', '✅ Creé la regla automática.\nSi entran muchos a la vez (una importación), te llega *un solo* mensaje agrupado.', 'Agrupa eventos de 2 horas en un mensaje');
        pending.undo = 'pausé la regla nueva';
        return prefix + pending.preview;
      }
      case 'pause_rule': return prefix + '🔕 Listo. Pausé el aviso de Separación.\nResponde *REANUDAR* cuando lo quieras de vuelta.';

      case 'decline_call': return prefix + 'No puedo llamar. Te creo la tarea con el número y te la recuerdo a la hora que digas.\n\n📋 *Plan*\n1️⃣ Crear tarea «Llamar» → ' + (seg ? `${seg.count} ${seg.label}` : '1 contacto') + '\n\nResponde *CONFIRMAR* para ejecutar.';
      case 'decline_delete': return prefix + `Detectar sí, borrar o fusionar no: eso lo decides tú en el CRM.\n📊 *${c.duplicados.grupos} grupos* con el mismo teléfono (${c.duplicados.fichas} fichas)\n${list(c.duplicados.lista, 2)}\nSi quieres, los etiqueto como *Revisar* para que los tengas a mano.`;
      case 'decline_calls_count': return prefix + 'No tengo registro de llamadas: tu CRM no las guarda.\nSí puedo decirte quién no tuvo *actividad* esta semana. ¿Te lo paso?';
      case 'broadcast': {
        const s = seg || { label: 'contactos', count: 3 };
        pending = plan('Preparar mensaje *promo-v2*', `${s.count} ${s.label}`, `✅ Tienes ${s.count} mensajes listos, cada uno con su nombre.\nEmpiezo con Ana Quispe: «Hola Ana, …». Toca para enviarlo.`);
        pending.undo = 'descarté los mensajes preparados';
        return prefix + 'No puedo escribirle a tus clientes desde tu número (Meta lo bloquearía). Lo hago en *modo asistido*: te paso cada mensaje listo para enviarlo con un toque.\n\n' + pending.preview;
      }

      case 'task': {
        const who = person(t) || (t.match(/\b(?:a|con)\s+([a-z]+(?:\s[a-z]+)?)$/) || [])[1];
        const time = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|h)?\b/) || [];
        const when = (has(t, 'manana') ? 'mañana' : has(t, 'lunes') ? 'el lunes' : has(t, 'jueves') ? 'el jueves' : 'hoy') + (time[1] ? ` a las ${String(time[1]).padStart(2, '0')}:${time[2] || '00'}` : ' a las 09:00');
        const title = has(t, 'llamar') ? 'Llamar' : has(t, 'visita') ? 'Visita' : has(t, 'cotiz') ? 'Enviar cotización' : has(t, 'contrato') ? 'Mandar contrato' : 'Seguimiento';
        pending = plan(`Crear tarea «${title}${who ? ' a ' + cap(who) : ''}» · ${when}`, '1 tarea', `✅ Creé la tarea «${title}${who ? ' a ' + cap(who) : ''}» para ${when}.\n⏰ Te escribo a esa hora.`);
        pending.undo = 'cancelé la tarea';
        return prefix + pending.preview;
      }
      case 'tag': {
        const label = (t.match(/\b(?:como|etiqueta|etiquetame|marca|tag|ponles|ponle)\s+([a-z0-9]+)\b/) || [])[1];
        const tag = label && !['a', 'los', 'las', 'de', 'como', 'todos', 'la', 'el'].includes(label) ? label.toUpperCase() : 'VIP';
        const s = seg || { label: 'contactos que coinciden', count: 23 };
        pending = plan(`Etiquetar *${tag}*`, `${s.count} ${s.label}`, `✅ Etiqueté ${s.count} ${s.label} como *${tag}*`);
        pending.undo = `quité la etiqueta ${tag} a ${s.count} ${s.label}`;
        return prefix + pending.preview;
      }
      case 'lost': {
        const which = (t.match(/\b(\d{3,4})\b/) || [])[1] || '402';
        pending = plan('Mover a *Cerrado perdido*', `1 negocio\n   Torres del Parque ${which} (S/ 610.000)`, `✅ Moví *Torres del Parque ${which}* a Cerrado perdido.\n¿Cuál fue el motivo? 1️⃣ Sin financiamiento 2️⃣ Compró en otro proyecto 3️⃣ Fuera de presupuesto`);
        pending.undo = 'devolví el negocio a su etapa anterior';
        return prefix + pending.preview;
      }
      case 'move_stage': {
        const stage = has(t, 'negociacion') ? 'Negociación' : has(t, 'separacion') ? 'Separación' : has(t, 'visita') ? 'Visita' : has(t, 'ganado') ? 'Cerrado ganado' : has(t, 'perdido') ? 'Cerrado perdido' : has(t, 'contactado') ? 'Contactado' : null;
        if (!stage) return prefix + '¿A qué etapa?\n1️⃣ Contactado 2️⃣ Visita 3️⃣ Separación 4️⃣ Negociación\nResponde con el número.\nNo ejecuté nada.';
        const which = (t.match(/\b(\d{3,4})\b/) || [])[1];
        const one = which || !seg || seg.count === 1;
        const name = which ? `Torres del Parque ${which}` : 'Torres del Parque 402';
        pending = plan(`Mover a *${stage}*`, one ? `1 negocio\n   ${name} (S/ 610.000)` : `${seg.count} ${seg.label}`, `✅ Moví ${one ? '1 negocio' : seg.count + ' negocios'} a *${stage}*`);
        pending.undo = 'devolví el negocio a su etapa anterior';
        return prefix + pending.preview;
      }
      case 'note': {
        const which = (t.match(/\b(\d{3,4})\b/) || [])[1] || '402';
        const text = raw.replace(/^[^:]*:\s*/, '').replace(/^(anota|anótame|anotame|apunta|nota)\s+(en\s+el\s+\S+\s+(de\s+\S+\s+)?)?/i, '').trim();
        pending = plan(`Agregar nota «${text.length > 40 ? text.slice(0, 40) + '…' : text}»`, `1 negocio\n   Torres del Parque ${which}`, `✅ Agregué la nota en *Torres del Parque ${which}*`);
        pending.undo = 'borré la nota';
        return prefix + pending.preview;
      }
      case 'assign': {
        const to = person(t) || 'Ale Torres';
        const s = seg || { label: 'negocios sin actividad', count: 12 };
        if (s.count > c.limites.reasignar_sin_aprobar) pending = plan(`Asignar a *${to}*`, `${s.count} ${s.label}`, `🔒 Este plan excede tu límite de ${c.limites.reasignar_sin_aprobar} registros por reasignación.\nSolicitud enviada para aprobación del dueño.\nTe aviso cuando respondan; vence en 14 días.\nRef: 0000-0021`);
        else pending = plan(`Asignar a *${to}*`, `${s.count} ${s.label}`, `✅ Asigné ${s.count} ${s.label} a *${to}*`);
        pending.undo = 'devolví los registros a su dueño anterior';
        return prefix + pending.preview;
      }
      case 'update_field': {
        const d = Object.keys(c.distritos).find((k) => t.includes(k));
        pending = plan(`Actualizar distrito = ${d ? cap(d) : 'Surco'}`, '1 contacto\n   Ana Quispe', `✅ Actualicé distrito en 1 contacto`);
        pending.undo = 'volví el distrito a como estaba';
        return prefix + pending.preview;
      }
      case 'create_record': {
        const phone = (t.match(/\b(9\d{8})\b/) || [])[1];
        const name = (raw.match(/(?:contacto|a|carga a|registra a)\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/) || [])[1] || 'Ernesto Quispe';
        pending = plan(`Crear contacto *${name}*`, `1 contacto${phone ? `\n   cel ${phone}` : ''}`, `✅ Creé el contacto *${name}* en ${c.crm}.\n¿Le pongo dueño y fuente? Responde _Urbania, para Ale_.`);
        pending.undo = 'borré el contacto recién creado';
        return prefix + pending.preview;
      }
      case 'money': {
        const pct = (t.match(/(\d{1,2})\s*(%|por ciento|porciento)/) || [])[1];
        if (!pct) return prefix + 'Por ahora los montos cambian en porcentaje. Dime, por ejemplo: _súbele 10 % a los de Torres del Parque_.';
        const s = seg || { label: 'negocios abiertos', count: c.negocios_abiertos };
        const up = has(t, 'sube', 'aumenta', 'incrementa');
        const disc = has(t, 'descuento', 'rebaja');
        if (disc && Number(pct) > c.limites.descuento_max_pct) { pending = plan(`Aplicar ${pct} % de descuento`, `${s.count} ${s.label}`, `🔒 Este plan excede tu límite de descuento (${c.limites.descuento_max_pct} %).\nSolicitud enviada para aprobación.\nRef: 0000-0022`); }
        else pending = plan(`${disc ? 'Aplicar ' + pct + ' % de descuento' : (up ? 'Subir' : 'Bajar') + ' montos ' + pct + ' %'}`, `${s.count} ${s.label}`, `✅ ${disc ? 'Apliqué ' + pct + ' % de descuento a' : (up ? 'Subí' : 'Bajé') + ' los montos de'} ${s.count} ${s.label}${disc ? '' : ' un ' + pct + ' %'}`);
        pending.undo = 'volví los montos a como estaban';
        return prefix + pending.preview;
      }

      /* consultas */
      case 'report_waiting': return prefix + `📊 *${c.en_espera.n} leads en espera* (sin contacto)\n${list(c.en_espera.lista, c.en_espera.n - 3)}\n\n¿Los tomo para ti o los reparto?`;
      case 'report_stale': morePages = [list(c.parados_15d.lista.slice(3), c.parados_15d.n - 6)]; return prefix + `📊 *${c.parados_15d.n} negocios abiertos* sin actividad 15 días · ${c.parados_15d.monto}\n${list(c.parados_15d.lista.slice(0, 3), c.parados_15d.n - 3)}`;
      case 'report_no_owner': return prefix + `📊 *${c.sin_dueno.n} contactos sin dueño*\n${list(c.sin_dueno.lista, c.sin_dueno.n - 3)}\n\nDime _repártelos a Lima_ o _asígnaselos a Ale_ y lo dejo listo.`;
      case 'report_duplicates': return prefix + `📊 *${c.duplicados.grupos} grupos* de contactos con el mismo teléfono (${c.duplicados.fichas} fichas)\n${list(c.duplicados.lista, 2)}\n\nDetectar no es fusionar: eso lo decides tú en el CRM.`;
      case 'report_separation': return prefix + `📊 *${c.separacion.length} negocios en Separación* · S/ 1.000.000\n${c.separacion.map((s) => `• ${s.nombre} · ${s.monto} · ${s.dias} días`).join('\n')}\n\n⚠️ El 402 lleva más de 15 días sin cerrar.`;
      case 'report_won': return prefix + `📊 *Este mes*: ${c.ganados_mes.n} negocios ganados · ${c.ganados_mes.monto}\n${c.perdidos_mes.n} perdidos · ${c.perdidos_mes.monto} (motivo: ${c.perdidos_mes.motivo})`;
      case 'report_lost': return prefix + `📊 *${c.perdidos_mes.n} negocios perdidos* este mes · ${c.perdidos_mes.monto}\n• Torre Norte 1203 · S/ 250.000 · ${c.perdidos_mes.motivo}\n• Surco Garden 110 · S/ 180.000 · Compró en otro proyecto`;
      case 'report_closing': return has(t, 'vencid', 'se les paso') ? prefix + `📊 *${c.cierre_vencido.n} negocios* abiertos con la fecha de cierre vencida\n${list(c.cierre_vencido.lista)}\n\nDime _muévelos al 30_ o _márcalos perdidos_.` : prefix + `📊 *${c.cierran_este_mes.n} negocios* cierran este mes · ${c.cierran_este_mes.monto}\n${list(c.cierran_este_mes.lista, c.cierran_este_mes.n - 3)}`;
      case 'report_money': return prefix + `📊 *${c.negocios_abiertos} negocios abiertos* · ${c.plata_en_juego}\nPor etapa:\n${c.etapas.map((e) => `• ${e.nombre}: ${e.n} · ${e.monto}`).join('\n')}`;
      case 'report_top': return prefix + `📊 *Los 5 negocios más grandes*\n${list(c.top5)}`;
      case 'report_stage': {
        if (has(t, 'porcentaje', '%')) return prefix + `📊 *${c.negocios_abiertos} negocios abiertos*\n${c.etapas.map((e) => `• ${e.nombre}: ${Math.round((e.n / c.negocios_abiertos) * 100)} % (${e.n})`).join('\n')}`;
        if (seg && seg.project) return prefix + `📊 *${seg.count} ${seg.label}* · ${seg.amount}\nPor etapa:\n• Lead nuevo: 3\n• Visita: 4\n• Negociación: ${seg.count - 7}`;
        return prefix + `📊 *${c.negocios_abiertos} negocios* · ${c.plata_en_juego}\nPor etapa:\n${c.etapas.map((e) => `• ${e.nombre}: ${e.n} · ${e.monto}`).join('\n')}`;
      }
      case 'report_new_leads': return has(t, 'mes') ? prefix + '📊 *38 contactos nuevos* este mes (el mes pasado: 41)\nPor fuente: Urbania 16 · Adondevivir 12 · Meta Ads 9 · Referido 1' : prefix + `📊 *${c.leads_anoche.n} leads nuevos* desde anoche · 2 sin dueño hace 9 h\n${list(c.leads_anoche.lista, c.leads_anoche.n - 3)}\n\n¿Los tomo para ti o los reparto?`;
      case 'report_sources': return prefix + `📊 *${c.contactos} contactos* por fuente:\n${c.fuentes.map((f) => `• ${f.nombre}: ${f.n}`).join('\n')}`;
      case 'report_tasks': return prefix + `⏰ *Hoy tienes ${c.tareas_hoy.length} tareas*\n${list(c.tareas_hoy)}\n\nResponde _hecha 1_ cuando la cierres.`;
      case 'report_mine': return prefix + `📊 *${c.mis_negocios.n} negocios tuyos* abiertos · ${c.mis_negocios.monto}\nEl resto (8) no tiene responsable en el CRM.`;
      case 'report_person': { const who = person(t) || 'Ale Torres'; return prefix + `📊 *${who}*: 14 negocios abiertos · S/ 3.210.000\n2 sin actividad 15 días · 1 cierra esta semana.`; }
      case 'report_missing': {
        if (has(t, 'telefono', 'celular', 'numero')) return prefix + `📊 *${c.sin_telefono.n} contactos sin teléfono* de ${c.sin_telefono.de}\n${list(['Ana Q. · Urbania', 'Marco Díaz · Adondevivir', 'Familia Torres · Meta Ads'], c.sin_telefono.n - 3)}\n\nDime _avísame cuando entre uno sin teléfono_ y no vuelve a pasar.`;
        if (has(t, 'fecha')) return prefix + `📊 *${c.sin_fecha_cierre.n} negocios abiertos sin fecha de cierre* de ${c.sin_fecha_cierre.de}\nSin fecha no hay aviso de cierre próximo ni vencido.`;
        return prefix + `📊 *${c.sin_monto.n} negocios abiertos sin monto* de ${c.sin_monto.de} (${Math.round((c.sin_monto.n / c.sin_monto.de) * 100)} %)\nSin monto no entran en la plata en juego.\nDime _ponle 250 mil al 903_ y lo dejo listo.`;
      }
      case 'report_counts': return prefix + `📊 Tienes *${c.contactos} contactos*, ${c.empresas} empresas y ${c.negocios_abiertos} negocios abiertos.`;
      case 'report_segment': {
        if (!seg) return prefix + `📊 Tienes *${c.contactos} contactos*, ${c.empresas} empresas y ${c.negocios_abiertos} negocios abiertos.\n¿Qué corte quieres? Por distrito, por proyecto, por etapa o por fuente.`;
        if (seg.project) return prefix + `📊 *${seg.count} ${seg.label}* · ${seg.amount}`;
        return prefix + `📊 *${seg.count} ${seg.label}*\n${list(c.contactos_ejemplo, Math.max(0, seg.count - 3))}`;
      }
      case 'crm_status': return prefix + `🔌 Tu CRM conectado es *${c.crm}* (${c.contactos} contactos · ${c.negocios_abiertos} negocios abiertos), sincronizado hace ${c.sincronizado_hace}.\nEscribe: etiquetas, campos, notas y tareas. No borra nada.`;
      case 'ambiguous': return prefix + `¿Qué entiendes por _${raw.trim().slice(0, 40)}_? Elige:\n1️⃣ Los que tuvieron actividad esta semana\n2️⃣ Los que pidieron precio\n3️⃣ Los de monto mayor a ${c.umbral_grande}\nResponde con el número.\nNo ejecuté nada.`;
      default:
        if (seg) return prefix + `📊 *${seg.count} ${seg.label}*${seg.amount ? ' · ' + seg.amount : ''}\n¿Quieres la lista, etiquetarlos o asignarlos?`;
        return prefix + `No estoy seguro de qué quieres hacer con «_${raw.trim().slice(0, 60)}_».\nPuedo:\n• consultar: _cuánta plata hay en juego_\n• escribir: _etiqueta VIP a los de Miraflores_\n• avisarte: _cada lunes dime qué negocios están parados_\nNo ejecuté nada.`;
    }
  }

  /* ---------- modelo detrás de /api/demo ---------- */
  async function probeApi() {
    try {
      const r = await fetch(API, { method: 'GET', cache: 'no-store' });
      if (!r.ok) return false;
      const j = await r.json();
      return Boolean(j && j.ok);
    } catch (e) { return false; }
  }
  /** El idioma de la página: la demo contesta en el idioma en que se lee. */
  const LANG = (document.documentElement.lang || 'es').slice(0, 2);
  /**
   * Las respuestas locales están escritas en castellano y su emparejamiento
   * también. En inglés y portugués contesta el modelo, que sí habla los tres;
   * si no hay modelo, la demo prefiere decir que no puede a contestar en un
   * idioma que el visitante no eligió.
   */
  const LOCAL_OK = LANG === 'es';
  /** El chrome del teléfono del demo: dos palabras que también se leen. */
  const CHROME = {
    es: { online: 'en línea', typing: 'escribiendo…', enough: 'Hasta aquí llega la demo 🙂\nPara seguir, crea tu cuenta gratis en comando.pro/app y conecta tu CRM.' },
    en: { online: 'online', typing: 'typing…', enough: 'That is as far as the demo goes 🙂\nTo carry on, create your free account at comando.pro/app and connect your CRM.' },
    pt: { online: 'on-line', typing: 'digitando…', enough: 'A demo vai até aqui 🙂\nPara continuar, crie sua conta grátis em comando.pro/app e conecte seu CRM.' },
  }[LANG] ?? { online: 'en línea', typing: 'escribiendo…', enough: 'Hasta aquí llega la demo 🙂' };
  const NO_MODEL = {
    en: 'The demo needs its model and it is not answering right now. Try again in a minute, or create your free account and connect your CRM.',
    pt: 'A demo precisa do modelo dela e ele não está respondendo agora. Tente em um minuto, ou crie sua conta grátis e conecte seu CRM.',
  };

  async function apiReply(raw, localMatched) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 16000);
    try {
      const r = await fetch(API, { method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), localMatched, lang: LANG }) });
      if (r.status === 429) { const j = await r.json().catch(() => ({})); return { limit: true, reply: j.error || 'Demasiados mensajes por ahora.' }; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j || typeof j.reply !== 'string' || !j.reply) throw new Error('vacío');
      return { reply: j.reply };
    } finally { clearTimeout(timer); }
  }

  /* ---------- render ---------- */
  function render() {
    root.innerHTML = `
      <div class="radar-layout demo-layout">
        <div class="radar-copy">
          <div class="radar-eyebrow">PRUÉBALO</div>
          <h2 id="demo-title" class="radar-title">Escríbele como le escribes a tu equipo.</h2>
          <p class="radar-lede demo-lede">Esta demo responde con datos de ejemplo de una inmobiliaria. En la versión real responde con tu CRM, y nada se ejecuta sin tu <b>CONFIRMAR</b>.</p>
          <div class="demo-chips" aria-label="Ejemplos">${D.examples.map((e) => `<button type="button" class="demo-chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div>
          <div class="radar-cta-row"><a href="/app/?mode=signup" class="btn-primary">Probar con mi CRM<span class="btn-arrow" aria-hidden="true">→</span></a></div>
        </div>
        <div class="radar-device demo-device">
          <div class="radar-screen">
            <div class="radar-status"><span id="demo-clock">${now()}</span><span>●●● ▲ ▮</span></div>
            <div class="radar-wa-head"><span class="radar-avatar">&gt;_</span><span class="radar-wa-name">Comando<small id="demo-presence">${CHROME.online}</small></span></div>
            <div class="radar-chat demo-chat" id="demo-chat" aria-live="polite"></div>
            <form class="radar-input demo-input" id="demo-form" autocomplete="off">
              <input id="demo-text" type="text" placeholder="Escribe un comando…" maxlength="300" aria-label="Escribe un comando">
              <button type="submit" aria-label="Enviar">➤</button>
            </form>
          </div>
        </div>
      </div>`;
  }
  let chat, input, presence;

  function bubble(text, me) {
    const el = document.createElement('div');
    el.className = 'radar-msg ' + (me ? 'is-me' : 'is-bot');
    el.innerHTML = `<div class="radar-bubble">${fmt(text)}<span class="radar-time">${now()}${me ? ' <i>✓✓</i>' : ''}</span></div>`;
    chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
    history.push({ role: me ? 'user' : 'assistant', content: text });
    return el;
  }
  function typing() {
    const el = document.createElement('div');
    el.className = 'radar-msg is-bot demo-typing-row';
    el.innerHTML = '<div class="radar-bubble demo-typing"><i></i><i></i><i></i></div>';
    chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
    return el;
  }
  async function showParts(parts) {
    for (const [i, p] of parts.entries()) {
      presence.textContent = CHROME.typing;
      const t = typing();
      await wait(Math.min(1400, 450 + p.length * 6));
      t.remove(); presence.textContent = CHROME.online;
      bubble(p, false);
      if (i < parts.length - 1) await wait(500);
    }
  }
  async function send(raw) {
    if (busy || !raw.trim()) return;
    sent += 1;
    if (sent > SESSION_MAX) { bubble(raw, true); await showParts([CHROME.enough]); return; }
    busy = true; input.value = '';
    bubble(raw, true);
    const t = norm(raw);
    const localMatched = LOCAL_OK && (isControl(t) || intentOf(t) !== 'unknown');
    let parts = null;
    if (useApi) {
      presence.textContent = CHROME.typing;
      const ty = typing();
      try {
        const r = await apiReply(raw, localMatched);
        ty.remove(); presence.textContent = CHROME.online;
        apiFailures = 0;
        bubble(r.reply, false);
        if (r.limit) useApi = false;
        busy = false; input.focus({ preventScroll: true }); return;
      } catch (e) {
        ty.remove(); presence.textContent = CHROME.online;
        apiFailures += 1; if (apiFailures >= 2) useApi = false;
      }
    }
    const out = LOCAL_OK ? localReply(raw) : NO_MODEL[LANG];
    parts = Array.isArray(out) ? out : [out];
    await showParts(parts);
    busy = false; input.focus({ preventScroll: true });
  }

  async function boot() {
    try {
      // Igual que en los casos de uso: el guion del demo va por idioma y cae
      // al castellano mientras el idioma no tenga el suyo.
      const lang = (document.documentElement.lang || 'es').slice(0, 2);
      const url = lang === 'es' ? '/docs/demo-data.json?v=1' : `/docs/demo-data.${lang}.json?v=1`;
      D = await fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .catch(() => fetch('/docs/demo-data.json?v=1').then((r) => r.json()));
    } catch (e) { return; }
    render();
    chat = document.getElementById('demo-chat'); input = document.getElementById('demo-text'); presence = document.getElementById('demo-presence');
    document.getElementById('demo-form').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
    root.querySelectorAll('.demo-chip').forEach((b) => b.addEventListener('click', () => {
      if (window.innerWidth < 992) document.querySelector('.demo-device').scrollIntoView({ behavior: 'smooth', block: 'center' });
      send(b.dataset.ex);
    }));
    setInterval(() => { const c = document.getElementById('demo-clock'); if (c) c.textContent = now(); }, 30000);
    probeApi().then((ok) => { useApi = ok; });
    await wait(600);
    bubble('Hola 👋 Soy Comando. Estoy conectado al CRM de una inmobiliaria de ejemplo.\nPídeme algo en tus palabras, o toca un ejemplo.', false);
  }
  boot();
})();

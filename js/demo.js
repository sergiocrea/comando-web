/* ============================================================
   demo.js — «Pruébalo»: un WhatsApp de mentira en la landing.
   El visitante escribe como le escribiría a Comando y recibe la
   respuesta que daría el producto (mismo tono y formato que el
   catálogo de respuestas: 📋 plan → CONFIRMAR → ✅, 📊 reporte,
   🔎 sin resultados). Todo es local: datos de ejemplo de una
   inmobiliaria, sin backend ni modelo. Reusa las clases del
   teléfono del radar (.radar-*).
   ============================================================ */
(function () {
  const root = document.getElementById('demo-root');
  if (!root) return;

  /* ---------- datos de ejemplo ---------- */
  const D = {
    open: 41, openAmount: 'S/ 9.870.000', contacts: 174,
    stages: [['Lead nuevo', 9, 'S/ 1.650.000'], ['Contactado', 7, 'S/ 1.480.000'], ['Visita', 6, 'S/ 1.720.000'], ['Separación', 2, 'S/ 1.000.000'], ['Negociación', 17, 'S/ 4.020.000']],
    stale: ['Torres del Parque 402 (S/ 610.000) · 19 días', 'Miraflores Sky 1502 (S/ 380.000) · 16 días', 'Surco Garden 305 (S/ 390.000) · 15 días'],
    noOwner: ['Ana Quispe · Urbania', 'Luis Herrera · Adondevivir', 'Familia Torres · Meta Ads'],
    leadsLastNight: ['Ana Quispe · Urbania · 21:10', 'Luis Herrera · Adondevivir · 22:05', 'Rosa Chávez · Meta Ads · 23:40'],
    tasks: ['10:00 Llamar a Familia Rojas · Torres del Parque 402', '12:30 Enviar cotización a Carla Mendoza', '16:00 Visita al piso 8 con Jorge Paredes'],
    sources: [['Urbania', 61], ['Adondevivir', 44], ['Meta Ads', 38], ['Referido', 8], ['Sin fuente', 23]],
    districts: { miraflores: 23, 'san isidro': 17, surco: 31, barranco: 6, 'la molina': 9 },
    projects: { 'torres del parque': [15, 'S/ 4.100.000'], 'miraflores sky': [11, 'S/ 2.950.000'], 'san isidro prime': [8, 'S/ 1.920.000'], 'surco garden': [7, 'S/ 900.000'] },
    people: ['ana', 'luis', 'ale', 'diego', 'lima', 'norte'],
  };
  const EXAMPLES = [
    'cuánta plata hay en juego ahorita',
    'qué negocios llevan 15 días sin movimiento',
    'etiqueta VIP a los contactos de Miraflores',
    'recuérdame mañana a las 10 llamar a Ana',
    'avísame cada lunes si hay contactos repetidos',
    'cuando entre un lead sin teléfono, avísame',
  ];

  /* ---------- utilidades ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;]/g, ' ').replace(/\s+/g, ' ').trim();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const now = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmt = (text) => esc(text).replace(/\*([^*\n]+)\*/g, '<b style="display:inline;margin:0">$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const has = (t, ...words) => words.some((w) => t.includes(w));
  const rx = (t, re) => re.test(t);

  /* ---------- estado ---------- */
  let pending = null;   // { preview, result }
  let lastDone = null;  // { undo }
  let morePages = null; // string[]
  let busy = false;

  /* ---------- «planner» de mentira ---------- */
  function segment(t) {
    // devuelve { label, count } del segmento que menciona el texto
    for (const d of Object.keys(D.districts)) if (t.includes(d)) return { label: 'contactos de ' + cap(d), count: D.districts[d] };
    for (const p of Object.keys(D.projects)) if (t.includes(p)) return { label: 'negocios de ' + cap(p), count: D.projects[p][0] };
    if (has(t, 'sin telefono', 'sin celular')) return { label: 'contactos sin teléfono', count: 14 };
    if (has(t, 'sin dueno', 'sin responsable', 'sin propietario')) return { label: 'registros sin dueño', count: 8 };
    if (has(t, 'parado', 'sin movimiento', 'sin actividad', 'estancad', 'frio')) return { label: 'negocios sin actividad', count: 12 };
    if (has(t, 'negociacion')) return { label: 'negocios en Negociación', count: 17 };
    if (has(t, 'abierto')) return { label: 'negocios abiertos', count: 41 };
    if (has(t, 'urbania')) return { label: 'contactos de Urbania', count: 61 };
    if (has(t, 'meta')) return { label: 'contactos de Meta Ads', count: 38 };
    return null;
  }
  const plan = (line, count, result, extra) => ({
    preview: `📋 *Plan*\n1️⃣ ${line} → ${count}${extra ? '\n' + extra : ''}\n\nResponde *CONFIRMAR* para ejecutar.\nVence en 15 minutos.`,
    result,
  });
  const list = (arr, more) => arr.map((x) => '• ' + x).join('\n') + (more ? `\n…y ${more} más. Responde *MÁS* para ver el resto.` : '');

  function reply(raw) {
    const t = norm(raw);
    if (!t) return null;

    /* control */
    if (rx(t, /^(confirmar|confirmo|confirmado|confirma)( \d{6})?$/)) {
      if (!pending) return 'No hay un plan pendiente.\nEnvíame el comando de nuevo.';
      const p = pending; pending = null; lastDone = p;
      return ['✅ Confirmado. Ejecutando…\nTe aviso con el resultado en unos segundos.', p.result];
    }
    if (rx(t, /^(ok|oka|dale|si|sí|ya|listo|bueno|va|👍)$/)) {
      return pending ? 'Entiendo que sí. Para ejecutar escribe *CONFIRMAR*.' : 'No hay nada pendiente. ¿Qué quieres hacer?';
    }
    if (rx(t, /^(cancela|cancelar|olvidalo|dejalo|mejor no|no)$/)) {
      if (!pending) return 'No hay nada pendiente. ¿Qué quieres hacer?';
      const p = pending; pending = null;
      return `Listo, descarté el plan: _${p.preview.split('\n')[1].replace(/^1️⃣ /, '')}_.`;
    }
    if (rx(t, /^mas$/)) {
      if (!morePages || !morePages.length) return 'No hay más resultados pendientes.';
      const page = morePages.shift(); if (!morePages.length) morePages = null;
      return page;
    }
    if (rx(t, /^deshacer|^deshace/)) {
      if (!lastDone) return 'No hay nada que deshacer todavía.';
      const p = lastDone; lastDone = null;
      return `↩️ Deshecho: ${p.undo || 'revertí el último plan sobre los mismos registros'}.`;
    }
    if (has(t, 'por que', 'porque')) return 'Te avisé porque *Torres del Parque 402* lleva *19 días* sin actividad, sobre tu umbral de 14, y es un negocio grande (S/ 610.000, por encima del p75 de tu embudo).\nResponde *BASTA* si no quieres más avisos de este tipo.';
    if (rx(t, /^basta$/)) return '🔕 Listo. Pausé los avisos de negocios sin actividad. Responde *DIARIO* si los quieres de vuelta.';
    if (rx(t, /^(hola|buenas|buenos dias|buenas tardes|hey|que tal)\b/)) return 'Hola 👋 Soy Comando. Pídeme algo de tu CRM en tus palabras:\n• _cuánta plata hay en juego_\n• _etiqueta VIP a los de Miraflores_\n• _avísame cada lunes qué negocios están parados_';
    if (has(t, 'gracias')) return 'De nada. Aquí sigo 👀';

    /* mensaje pendiente + otra cosa → se dice el descarte */
    let prefix = '';
    if (pending) { prefix = `Dejo sin hacer lo anterior (_${pending.preview.split('\n')[1].replace(/^1️⃣ /, '')}_).\n\n`; pending = null; }

    /* automatizaciones: cadencia («cada») o evento («cuando / si …») */
    if (rx(t, /\b(cada|todos los|todas las|una vez por)\b/) && has(t, 'avisa', 'avisame', 'dime', 'manda', 'pasame', 'revisa', 'recuerda', 'envia')) {
      const when = (t.match(/\b(cada|todos los|todas las)\s+(lunes|martes|miercoles|jueves|viernes|sabado|manana|dia|semana|mes|viernes)/) || [])[2] || 'semana';
      const what = has(t, 'repetid', 'duplicad') ? 'contactos repetidos' : has(t, 'parad', 'sin movimiento', 'sin actividad', 'estancad') ? 'negocios 15 días sin movimiento' : has(t, 'sin dueno', 'sin responsable') ? 'registros sin dueño' : has(t, 'pipeline', 'etapa', 'embudo') ? 'pipeline por etapa' : has(t, 'lead', 'contacto') ? 'contactos nuevos del día' : 'resumen del embudo';
      const cad = { lunes: 'Lunes 08:00', martes: 'Martes 08:00', miercoles: 'Miércoles 08:00', jueves: 'Jueves 08:00', viernes: 'Viernes 08:00', sabado: 'Sábado 08:00', manana: 'Diario 07:30', dia: 'Diario 07:30', semana: 'Lunes 08:00', mes: 'Primer día hábil 08:00' }[when] || 'Lunes 08:00';
      pending = plan(`Crear aviso *${what}*`, cad, `✅ Creé el aviso «${cap(what)}» · ${cad}.\nSolo te escribe si hay algo; si no, silencio. Responde *BASTA* cuando quieras apagarlo.`);
      pending.undo = 'borré el aviso «' + what + '»';
      return prefix + pending.preview;
    }
    if (rx(t, /\b(cuando|si|apenas|cada vez que)\b/) && has(t, 'avisa', 'avisame', 'dime', 'etiqueta', 'asigna', 'crea', 'manda')) {
      const ev = has(t, 'sin telefono') ? 'entre un contacto sin teléfono' : has(t, 'sin dueno', 'sin propietario') ? 'entre un contacto sin dueño' : has(t, 'separacion') ? 'un negocio llegue a Separación' : has(t, 'ganado', 'cierre', 'cerrado') ? 'un negocio llegue a Cerrado ganado' : has(t, 'retroced') ? 'un negocio retroceda de etapa' : /\d{2,3}\s*(mil|k)/.test(t) ? 'entre un negocio de más de ' + (t.match(/(\d{2,3})\s*(mil|k)/)[1]) + ' mil' : has(t, 'lead', 'contacto') ? 'entre un lead nuevo' : 'pase eso en tu CRM';
      const act = has(t, 'etiqueta') ? 'etiquetarlo' : has(t, 'asigna') ? 'asignarlo' : has(t, 'tarea') ? 'crearte la tarea' : 'avisarte por WhatsApp';
      pending = plan(`Crear regla: cuando *${ev}* → ${act}`, 'en tiempo real', `✅ Creé la regla automática.\nSi entran muchos a la vez (una importación), te llega *un solo* mensaje agrupado.`, 'Agrupa eventos de 2 horas en un mensaje');
      pending.undo = 'pausé la regla nueva';
      return prefix + pending.preview;
    }

    /* escrituras */
    if (has(t, 'recuerdame', 'recordame', 'recuerda', 'acuerdame') || rx(t, /\b(crea|creame|hazme|ponme)\b.*\btarea/)) {
      const who = (t.match(/\b(?:a|con)\s+([a-z]+(?:\s[a-z]+)?)$/) || [])[1];
      const time = (t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|h)?\b/) || []);
      const when = (has(t, 'manana') ? 'mañana' : has(t, 'lunes') ? 'el lunes' : 'hoy') + (time[1] ? ` a las ${time[1].padStart(2, '0')}:${time[2] || '00'}` : ' a las 09:00');
      const title = has(t, 'llamar') ? 'Llamar' : has(t, 'visita') ? 'Visita' : has(t, 'cotiz') ? 'Enviar cotización' : has(t, 'contrato') ? 'Mandar contrato' : 'Seguimiento';
      pending = plan(`Crear tarea «${title}${who ? ' a ' + cap(who) : ''}» · ${when}`, '1 tarea', `✅ Creé la tarea «${title}${who ? ' a ' + cap(who) : ''}» para ${when}.\n⏰ Te escribo a esa hora.`);
      pending.undo = 'cancelé la tarea';
      return prefix + pending.preview;
    }
    if (has(t, 'etiqueta', 'etiquetame', 'marca', 'ponle la etiqueta', 'tag')) {
      const label = (t.match(/\b(?:como|etiqueta|marca|tag)\s+([a-z0-9]+)\b/) || [])[1];
      const tag = label && !['a', 'los', 'las', 'de', 'como', 'todos'].includes(label) ? label.toUpperCase() : 'VIP';
      const seg = segment(t) || { label: 'contactos que coinciden', count: 23 };
      pending = plan(`Etiquetar *${tag}*`, `${seg.count} ${seg.label}`, `✅ Etiqueté ${seg.count} ${seg.label} como *${tag}*`);
      pending.undo = `quité la etiqueta ${tag} a ${seg.count} ${seg.label}`;
      return prefix + pending.preview;
    }
    if (rx(t, /\b(mueve|mover|move|pasa|pasalo|pasala|cambia)\b/) && has(t, 'etapa', 'negociacion', 'visita', 'separacion', 'cerrado', 'contactado')) {
      const stage = has(t, 'negociacion') ? 'Negociación' : has(t, 'separacion') ? 'Separación' : has(t, 'visita') ? 'Visita' : has(t, 'ganado') ? 'Cerrado ganado' : has(t, 'perdido') ? 'Cerrado perdido' : 'Contactado';
      const which = (t.match(/\b(\d{3,4})\b/) || [])[1];
      const name = which ? `Torres del Parque ${which}` : (segment(t) || {}).label || 'Torres del Parque 402';
      const count = which || !segment(t) ? 1 : segment(t).count;
      pending = plan(`Mover a *${stage}*`, count === 1 ? `1 negocio\n   ${name} (S/ 610.000)` : `${count} ${name}`, `✅ Moví ${count === 1 ? '1 negocio' : count + ' negocios'} a *${stage}*`);
      pending.undo = 'devolví el negocio a su etapa anterior';
      return prefix + pending.preview;
    }
    if (has(t, 'anota', 'nota', 'apunta')) {
      const which = (t.match(/\b(\d{3,4})\b/) || [])[1] || '402';
      const text = raw.replace(/^[^:]*:\s*/, '').trim();
      pending = plan(`Agregar nota «${text.length > 40 ? text.slice(0, 40) + '…' : text}»`, `1 negocio\n   Torres del Parque ${which}`, `✅ Agregué la nota en *Torres del Parque ${which}*`);
      pending.undo = 'borré la nota';
      return prefix + pending.preview;
    }
    if (has(t, 'asigna', 'asignale', 'pasale', 'pasaselo', 'reparte', 'repartelos', 'dale a')) {
      const who = D.people.find((p) => t.includes(p));
      const to = who ? ({ lima: 'Equipo Comercial Lima', norte: 'Equipo Comercial Norte' }[who] || cap(who)) : 'Ale Torres';
      const seg = segment(t) || { label: 'negocios sin actividad', count: 12 };
      if (seg.count > 10) {
        pending = plan(`Asignar a *${to}*`, `${seg.count} ${seg.label}`, `🔒 Este plan excede tu límite de 10 registros por reasignación.\nSolicitud enviada para aprobación del dueño.\nTe aviso cuando respondan; vence en 14 días.\nRef: 0000-0021`);
      } else pending = plan(`Asignar a *${to}*`, `${seg.count} ${seg.label}`, `✅ Asigné ${seg.count} ${seg.label} a *${to}*`);
      pending.undo = 'devolví los registros a su dueño anterior';
      return prefix + pending.preview;
    }
    if (has(t, 'manda', 'mandale', 'envia', 'enviale', 'escribele', 'escribeles') && has(t, 'plantilla', 'promo', 'mensaje', 'todos', 'los de')) {
      const seg = segment(t) || { label: 'contactos', count: 3 };
      pending = plan(`Enviar plantilla *promo-v2*`, `${seg.count} ${seg.label}`, `✅ Envié *promo-v2* a ${seg.count} ${seg.label}`, `💸 Costo estimado: S/ ${seg.count}\nMáximo autorizado: S/ 50`);
      if (seg.count > 50) pending.result = `🔒 Este plan excede tu máximo autorizado (S/ 50).\nSolicitud enviada para aprobación.\nRef: 0000-0022`;
      pending.undo = 'no se puede deshacer un envío; lo anoté en el historial';
      return prefix + pending.preview;
    }
    if (rx(t, /\b(sube|subele|baja|bajale|aumenta|descuento)\b/) && rx(t, /\d/)) {
      const pct = (t.match(/(\d{1,2})\s*(%|por ciento)/) || [])[1];
      if (!pct) return prefix + 'Por ahora los montos cambian en porcentaje. Dime, por ejemplo: _súbele 10 % a los de Torres del Parque_.';
      const seg = segment(t) || { label: 'negocios abiertos', count: 41 };
      const up = has(t, 'sube', 'aumenta');
      pending = plan(`${up ? 'Subir' : 'Bajar'} montos ${pct} %`, `${seg.count} ${seg.label}`, `✅ ${up ? 'Subí' : 'Bajé'} los montos de ${seg.count} ${seg.label} un ${pct} %`);
      pending.undo = 'volví los montos a como estaban';
      return prefix + pending.preview;
    }

    /* consultas */
    if (has(t, 'plata', 'dinero', 'en juego', 'monto total', 'cuanto tengo', 'cuanto hay')) {
      return prefix + `📊 *${D.open} negocios abiertos* · ${D.openAmount}\nPor etapa:\n${D.stages.map(([n, c, a]) => `• ${n}: ${c} · ${a}`).join('\n')}`;
    }
    if (has(t, 'por etapa', 'pipeline', 'embudo')) {
      if (segment(t) && segment(t).label.startsWith('negocios de')) { const p = segment(t); return prefix + `📊 *${p.count} ${p.label}* · ${D.projects[Object.keys(D.projects).find((k) => t.includes(k))][1]}\nPor etapa:\n• Lead nuevo: 3\n• Visita: 4\n• Negociación: ${p.count - 7}`; }
      return prefix + `📊 *${D.open} negocios* · ${D.openAmount}\nPor etapa:\n${D.stages.map(([n, c, a]) => `• ${n}: ${c} · ${a}`).join('\n')}`;
    }
    if (has(t, 'parad', 'sin movimiento', 'sin actividad', 'estancad', 'sin tocar', 'no se han tocado', 'frio')) {
      morePages = ['• Miraflores Sky 903 · 15 días\n• Surco Garden 210 · 15 días\n• San Isidro Prime 404 · 15 días\n…y 6 más. Responde *MÁS* para ver el resto.'];
      return prefix + `📊 *12 negocios abiertos* sin actividad 15 días · S/ 2.140.000\n${list(D.stale, 9)}`;
    }
    if (has(t, 'sin dueno', 'sin responsable', 'sin propietario', 'sin asignar')) return prefix + `📊 *8 contactos sin dueño*\n${list(D.noOwner, 5)}\n\nDime _repártelos a Lima_ o _asígnaselos a Ale_ y lo dejo listo.`;
    if (has(t, 'repetid', 'duplicad')) return prefix + `📊 *5 grupos* de contactos con el mismo teléfono (11 fichas)\n• 999 111 222 · Ana Quispe / Ana Q. (2)\n• 987 333 444 · Luis Herrera (3)\n• 986 555 666 · Familia Torres (2)\n…y 2 más. Responde *MÁS*.\n\nDetectar no es fusionar: eso lo decides tú en el CRM.`;
    if (has(t, 'lead', 'contacto', 'entraron', 'llegaron') && has(t, 'anoche', 'ayer', 'hoy', 'entraron', 'llegaron', 'nuevos', 'semana')) {
      return prefix + `📊 *6 leads nuevos* desde anoche · 2 sin dueño hace 9 h\n${list(D.leadsLastNight, 3)}\n\n¿Los tomo para ti o los reparto?`;
    }
    if (has(t, 'fuente', 'de donde', 'canal', 'campan')) return prefix + `📊 *${D.contacts} contactos* por fuente:\n${D.sources.map(([n, c]) => `• ${n}: ${c}`).join('\n')}`;
    if (has(t, 'tarea', 'pendiente', 'para hoy', 'que tengo', 'agenda')) return prefix + `⏰ *Hoy tienes 3 tareas*\n${list(D.tasks)}\n\nResponde _hecha 1_ cuando la cierres.`;
    if (has(t, 'ganad', 'cerr', 'vend')) return prefix + `📊 *Este mes*: 3 negocios ganados · S/ 1.120.000\n2 perdidos · S/ 430.000 (motivo: sin financiamiento)`;
    if (has(t, 'separacion')) return prefix + `📊 *2 negocios en Separación* · S/ 1.000.000\n• Torres del Parque 402 · S/ 610.000 · 22 días\n• Surco Garden 305 · S/ 390.000 · 8 días\n\n⚠️ El 402 lleva más de 15 días sin cerrar.`;
    if (has(t, 'mis negocios', 'mi cartera', 'mios')) return prefix + `📊 *33 negocios tuyos* abiertos · S/ 8.120.000\nEl resto (8) no tiene responsable en el CRM.`;
    const seg = segment(t);
    if (seg && has(t, 'cuantos', 'cuantas', 'dame', 'pasame', 'muestrame', 'lista', 'quienes', 'tirame', 'ver')) {
      if (seg.label.startsWith('negocios de')) { const p = D.projects[Object.keys(D.projects).find((k) => t.includes(k))]; return prefix + `📊 *${seg.count} ${seg.label}* · ${p[1]}`; }
      return prefix + `📊 *${seg.count} ${seg.label}*\n• Ana Quispe · 987 111 222\n• Carla Mendoza · 986 333 444\n• Jorge Paredes · 999 555 666\n…y ${Math.max(0, seg.count - 3)} más. Responde *MÁS*.`;
    }
    if (has(t, 'cuantos', 'cuantas') && has(t, 'contacto', 'cliente', 'persona')) return prefix + `📊 Tienes *${D.contacts} contactos*, 33 empresas y ${D.open} negocios abiertos.`;
    if (has(t, 'crm', 'hubspot', 'conectado')) return prefix + `🔌 Tu CRM conectado es *HubSpot* (174 contactos · 41 negocios abiertos), sincronizado hace 6 min.\nEscribe: etiquetas, campos, notas y tareas. No borra nada.`;
    if (has(t, 'audio', 'voz')) return prefix + '🎤 En la versión real también puedes mandarme notas de voz: te repito lo que entendí antes de hacer nada.';

    /* no entendido → aclaración con alternativas (nunca en silencio) */
    return prefix + `No estoy seguro de qué quieres hacer con «_${raw.trim().slice(0, 60)}_».\nPuedo:\n• consultar: _cuánta plata hay en juego_\n• escribir: _etiqueta VIP a los de Miraflores_\n• avisarte: _cada lunes dime qué negocios están parados_\nNo ejecuté nada.`;
  }

  /* ---------- render ---------- */
  root.innerHTML = `
    <div class="radar-layout demo-layout">
      <div class="radar-copy">
        <div class="radar-eyebrow">PRUÉBALO</div>
        <h2 id="demo-title" class="radar-title">Escríbele como le escribes a tu equipo.</h2>
        <p class="radar-lede demo-lede">Esta demo responde con datos de ejemplo de una inmobiliaria. En la versión real responde con tu CRM, y nada se ejecuta sin tu <b>CONFIRMAR</b>.</p>
        <div class="demo-chips" aria-label="Ejemplos">${EXAMPLES.map((e) => `<button type="button" class="demo-chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div>
        <div class="radar-cta-row"><a href="/app/?mode=signup" class="btn-primary">Probar con mi CRM<span class="btn-arrow" aria-hidden="true">→</span></a></div>
      </div>
      <div class="radar-device demo-device">
        <div class="radar-screen">
          <div class="radar-status"><span id="demo-clock">${now()}</span><span>●●● ▲ ▮</span></div>
          <div class="radar-wa-head"><span class="radar-avatar">&gt;_</span><span class="radar-wa-name">Comando<small id="demo-presence">en línea</small></span></div>
          <div class="radar-chat demo-chat" id="demo-chat" aria-live="polite"></div>
          <form class="radar-input demo-input" id="demo-form" autocomplete="off">
            <input id="demo-text" type="text" placeholder="Escribe un comando…" maxlength="200" aria-label="Escribe un comando">
            <button type="submit" aria-label="Enviar">➤</button>
          </form>
        </div>
      </div>
    </div>`;
  const chat = document.getElementById('demo-chat');
  const input = document.getElementById('demo-text');
  const presence = document.getElementById('demo-presence');

  function bubble(text, me) {
    const el = document.createElement('div');
    el.className = 'radar-msg ' + (me ? 'is-me' : 'is-bot');
    el.innerHTML = `<div class="radar-bubble">${fmt(text)}<span class="radar-time">${now()}${me ? ' <i>✓✓</i>' : ''}</span></div>`;
    chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
    return el;
  }
  function typing() {
    const el = document.createElement('div');
    el.className = 'radar-msg is-bot demo-typing-row';
    el.innerHTML = '<div class="radar-bubble demo-typing"><i></i><i></i><i></i></div>';
    chat.appendChild(el); chat.scrollTop = chat.scrollHeight;
    return el;
  }
  async function send(raw) {
    if (busy || !raw.trim()) return;
    busy = true; input.value = '';
    bubble(raw, true);
    const out = reply(raw);
    const parts = Array.isArray(out) ? out : [out];
    for (const [i, p] of parts.entries()) {
      presence.textContent = 'escribiendo…';
      const t = typing();
      await wait(Math.min(1400, 450 + p.length * 6));
      t.remove(); presence.textContent = 'en línea';
      bubble(p, false);
      if (i < parts.length - 1) await wait(500);
    }
    busy = false; input.focus({ preventScroll: true });
  }
  document.getElementById('demo-form').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });
  root.querySelectorAll('.demo-chip').forEach((b) => b.addEventListener('click', () => {
    // En móvil los ejemplos quedan debajo del teléfono: que se vea la respuesta.
    if (window.innerWidth < 992) document.querySelector('.demo-device').scrollIntoView({ behavior: 'smooth', block: 'center' });
    send(b.dataset.ex);
  }));
  setInterval(() => { const c = document.getElementById('demo-clock'); if (c) c.textContent = now(); }, 30000);

  /* apertura: dos mensajes de Comando, como un aviso real */
  (async () => {
    await wait(600);
    bubble('Hola 👋 Soy Comando. Estoy conectado al CRM de una inmobiliaria de ejemplo.\nPídeme algo en tus palabras, o toca un ejemplo.', false);
  })();
})();

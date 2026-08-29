/* Selector de teléfono para WhatsApp: país + número nacional → E.164.
   Reglas por país (LatAm primero). Sin dependencias. */
(function () {
  // dial, nombre, bandera, longitudes válidas del número nacional, prefijos móviles, placeholder, ayuda, normalizador
  const C = [
    { cc: 'PE', dial: '51', name: 'Perú', flag: '🇵🇪', len: [9], mobile: /^9/, ph: '912 345 678', help: '9 dígitos, empieza en 9' },
    { cc: 'MX', dial: '52', name: 'México', flag: '🇲🇽', len: [10], ph: '55 1234 5678', help: '10 dígitos con lada (55, 81, 33…)' },
    { cc: 'CO', dial: '57', name: 'Colombia', flag: '🇨🇴', len: [10], mobile: /^3/, ph: '300 123 4567', help: '10 dígitos, empieza en 3' },
    { cc: 'AR', dial: '54', name: 'Argentina', flag: '🇦🇷', len: [10], ph: '11 2345 6789', help: 'código de área + número, sin 0 ni 15 (WhatsApp añade el 9)', norm: (d) => { d = d.replace(/^0/, ''); d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); return d; }, e164: (d) => '+549' + d },
    { cc: 'CL', dial: '56', name: 'Chile', flag: '🇨🇱', len: [9], mobile: /^9/, ph: '9 1234 5678', help: '9 dígitos, empieza en 9' },
    { cc: 'BR', dial: '55', name: 'Brasil', flag: '🇧🇷', len: [11, 10], ph: '11 91234 5678', help: 'DDD de la ciudad (11 São Paulo, 21 Rio…) + celular de 9 dígitos', norm: (d) => { d = d.replace(/^0/, ''); if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = d.slice(0, 2) + '9' + d.slice(2); return d; } },
    { cc: 'EC', dial: '593', name: 'Ecuador', flag: '🇪🇨', len: [9], mobile: /^9/, ph: '99 123 4567', help: '9 dígitos sin el 0 inicial', norm: (d) => d.replace(/^0/, '') },
    { cc: 'BO', dial: '591', name: 'Bolivia', flag: '🇧🇴', len: [8], mobile: /^[67]/, ph: '7123 4567', help: '8 dígitos, empieza en 6 o 7' },
    { cc: 'PY', dial: '595', name: 'Paraguay', flag: '🇵🇾', len: [9], mobile: /^9/, ph: '981 123 456', help: '9 dígitos sin el 0 inicial', norm: (d) => d.replace(/^0/, '') },
    { cc: 'UY', dial: '598', name: 'Uruguay', flag: '🇺🇾', len: [8], mobile: /^9/, ph: '99 123 456', help: '8 dígitos sin el 0 inicial', norm: (d) => d.replace(/^0/, '') },
    { cc: 'VE', dial: '58', name: 'Venezuela', flag: '🇻🇪', len: [10], mobile: /^4/, ph: '412 123 4567', help: '10 dígitos sin el 0 inicial', norm: (d) => d.replace(/^0/, '') },
    { cc: 'GT', dial: '502', name: 'Guatemala', flag: '🇬🇹', len: [8], ph: '5123 4567', help: '8 dígitos' },
    { cc: 'SV', dial: '503', name: 'El Salvador', flag: '🇸🇻', len: [8], ph: '7123 4567', help: '8 dígitos' },
    { cc: 'HN', dial: '504', name: 'Honduras', flag: '🇭🇳', len: [8], ph: '9123 4567', help: '8 dígitos' },
    { cc: 'NI', dial: '505', name: 'Nicaragua', flag: '🇳🇮', len: [8], ph: '8123 4567', help: '8 dígitos' },
    { cc: 'CR', dial: '506', name: 'Costa Rica', flag: '🇨🇷', len: [8], ph: '8123 4567', help: '8 dígitos' },
    { cc: 'PA', dial: '507', name: 'Panamá', flag: '🇵🇦', len: [8], ph: '6123 4567', help: '8 dígitos' },
    { cc: 'DO', dial: '1', name: 'Rep. Dominicana', flag: '🇩🇴', len: [10], mobile: /^(809|829|849)/, ph: '809 123 4567', help: '10 dígitos (809, 829 u 849)' },
    { cc: 'US', dial: '1', name: 'Estados Unidos', flag: '🇺🇸', len: [10], ph: '305 123 4567', help: '10 dígitos con código de área' },
    { cc: 'ES', dial: '34', name: 'España', flag: '🇪🇸', len: [9], mobile: /^[67]/, ph: '612 345 678', help: '9 dígitos, empieza en 6 o 7' },
    { cc: 'XX', dial: '', name: 'Otro país', flag: '🌎', len: [], ph: '+cód. país + número', help: 'escribe el número completo con +' },
  ];
  const byCc = Object.fromEntries(C.map((c) => [c.cc, c]));

  function detectCountry() {
    try {
      const lang = (navigator.language || '').toUpperCase();
      const m = /-([A-Z]{2})$/.exec(lang); if (m && byCc[m[1]]) return m[1];
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const tzMap = { 'America/Lima': 'PE', 'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Argentina': 'AR', 'America/Buenos_Aires': 'AR', 'America/Santiago': 'CL', 'America/Sao_Paulo': 'BR', 'America/Guayaquil': 'EC', 'America/La_Paz': 'BO', 'America/Asuncion': 'PY', 'America/Montevideo': 'UY', 'America/Caracas': 'VE', 'America/Guatemala': 'GT', 'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA', 'America/Santo_Domingo': 'DO', 'Europe/Madrid': 'ES' };
      for (const k in tzMap) if (tz.startsWith(k)) return tzMap[k];
    } catch (e) { /* ignore */ }
    return 'PE';
  }

  // E.164 → {cc, national} para pre-rellenar
  function parseE164(e164) {
    const d = String(e164 || '').replace(/\D/g, '');
    const cands = C.filter((c) => c.dial && d.startsWith(c.dial)).sort((a, b) => b.dial.length - a.dial.length);
    for (const c of cands) {
      let rest = d.slice(c.dial.length);
      if (c.cc === 'AR' && rest.startsWith('9')) rest = rest.slice(1);
      if (c.cc === 'DO' && !/^(809|829|849)/.test(rest)) continue;
      if (c.cc === 'US' && /^(809|829|849)/.test(rest)) continue;
      if (!c.len.length || c.len.includes(rest.length)) return { cc: c.cc, national: rest };
    }
    return { cc: 'XX', national: d ? '+' + d : '' };
  }

  function toE164(cc, raw) {
    const c = byCc[cc]; const digits = String(raw || '').replace(/\D/g, '');
    if (!c) return { error: 'Elige un país' };
    if (c.cc === 'XX') {
      return /^\d{7,15}$/.test(digits) ? { e164: '+' + digits } : { error: 'Escribe el número completo con código de país, p. ej. +44 7123 456789' };
    }
    let d = c.norm ? c.norm(digits) : digits;
    if (!c.len.includes(d.length)) return { error: `Para ${c.name} el número debe tener ${c.len.join(' u ')} dígitos (${c.help}).` };
    if (c.mobile && !c.mobile.test(d)) return { error: `Ese no parece un celular de ${c.name} (${c.help}).` };
    return { e164: c.e164 ? c.e164(d) : '+' + c.dial + d, pretty: '+' + c.dial + ' ' + d };
  }

  function mount(container, opts) {
    opts = opts || {};
    const wrap = document.createElement('div'); wrap.className = 'pp';
    const sel = document.createElement('select'); sel.className = 'pp-country'; sel.setAttribute('aria-label', 'País');
    C.forEach((c) => { const o = document.createElement('option'); o.value = c.cc; o.textContent = `${c.flag} ${c.name}${c.dial ? ' +' + c.dial : ''}`; sel.appendChild(o); });
    const inp = document.createElement('input'); inp.type = 'tel'; inp.inputMode = 'tel'; inp.autocomplete = 'tel-national'; inp.className = 'pp-number'; inp.setAttribute('aria-label', 'Número de WhatsApp');
    const help = document.createElement('div'); help.className = 'pp-help';
    const row = document.createElement('div'); row.className = 'pp-row'; row.appendChild(sel); row.appendChild(inp);
    wrap.appendChild(row); wrap.appendChild(help); container.appendChild(wrap);
    function refresh() { const c = byCc[sel.value]; inp.placeholder = c.ph; help.textContent = c.help; }
    sel.addEventListener('change', refresh);
    sel.value = opts.cc || detectCountry(); refresh();
    if (opts.value) { const p = parseE164(opts.value); sel.value = p.cc; inp.value = p.national; refresh(); }
    return { value: () => toE164(sel.value, inp.value), focus: () => inp.focus(), set: (e164) => { const p = parseE164(e164); sel.value = p.cc; inp.value = p.national; refresh(); } };
  }
  window.ComandoPhonePicker = { mount, toE164, parseE164, countries: C };
})();

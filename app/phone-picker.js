/* Selector de teléfono para WhatsApp: país + número nacional → E.164.
   Reglas por país (LatAm primero). Sin dependencias.

   El idioma lo lee de `document.documentElement.lang`, que ya dejó puesto
   `i18n.js` antes del primer pintado: así este fichero sigue siendo un script
   suelto, sin entrar en el grafo de módulos, y aun así habla los tres. */
(function () {
  const lang = () => (document.documentElement.lang || 'es').slice(0, 2);
  const TABLES = {
    es: {
      country: 'País', number: 'Número de WhatsApp', pickCountry: 'Elige un país',
      full: 'Escribe el número completo con código de país, p. ej. +44 7123 456789',
      wrongLen: 'Para {country} el número debe tener {lens} dígitos ({help}).',
      notMobile: 'Ese no parece un celular de {country} ({help}).',
      or: ' u ',
      digits: '{n} dígitos', startsWith: '{n} dígitos, empieza en {x}', noZero: '{n} dígitos sin el 0 inicial',
      mx: '10 dígitos con lada (55, 81, 33…)',
      ar: 'código de área + número, sin 0 ni 15 (WhatsApp añade el 9)',
      br: 'DDD de la ciudad (11 São Paulo, 21 Rio…) + celular de 9 dígitos',
      do: '10 dígitos (809, 829 u 849)', us: '10 dígitos con código de área',
      other: 'escribe el número completo con +', otherPh: '+cód. país + número',
      names: { PE: 'Perú', MX: 'México', BR: 'Brasil', DO: 'Rep. Dominicana', US: 'Estados Unidos', ES: 'España', PA: 'Panamá', XX: 'Otro país' },
    },
    en: {
      country: 'Country', number: 'WhatsApp number', pickCountry: 'Pick a country',
      full: 'Write the full number with the country code, e.g. +44 7123 456789',
      wrongLen: 'For {country} the number must have {lens} digits ({help}).',
      notMobile: 'That does not look like a {country} mobile ({help}).',
      or: ' or ',
      digits: '{n} digits', startsWith: '{n} digits, starting with {x}', noZero: '{n} digits without the leading 0',
      mx: '10 digits with area code (55, 81, 33…)',
      ar: 'area code + number, without 0 or 15 (WhatsApp adds the 9)',
      br: 'city DDD (11 São Paulo, 21 Rio…) + 9-digit mobile',
      do: '10 digits (809, 829 or 849)', us: '10 digits with area code',
      other: 'write the full number with +', otherPh: '+country code + number',
      names: { PE: 'Peru', MX: 'Mexico', BR: 'Brazil', DO: 'Dominican Rep.', US: 'United States', ES: 'Spain', PA: 'Panama', XX: 'Another country' },
    },
    pt: {
      country: 'País', number: 'Número de WhatsApp', pickCountry: 'Escolha um país',
      full: 'Escreva o número completo com o código do país, por exemplo +44 7123 456789',
      wrongLen: 'Para {country} o número precisa ter {lens} dígitos ({help}).',
      notMobile: 'Isso não parece um celular do {country} ({help}).',
      or: ' ou ',
      digits: '{n} dígitos', startsWith: '{n} dígitos, começa em {x}', noZero: '{n} dígitos sem o 0 inicial',
      mx: '10 dígitos com DDD (55, 81, 33…)',
      ar: 'código de área + número, sem 0 nem 15 (o WhatsApp adiciona o 9)',
      br: 'DDD da cidade (11 São Paulo, 21 Rio…) + celular de 9 dígitos',
      do: '10 dígitos (809, 829 ou 849)', us: '10 dígitos com código de área',
      other: 'escreva o número completo com +', otherPh: '+código do país + número',
      names: { PE: 'Peru', MX: 'México', BR: 'Brasil', DO: 'Rep. Dominicana', US: 'Estados Unidos', ES: 'Espanha', PA: 'Panamá', XX: 'Outro país' },
    },
  };
  const FALLBACK = {
    country: 'País', number: 'Número de WhatsApp', pickCountry: 'Elige un país',
    full: 'Escribe el número completo con código de país, p. ej. +44 7123 456789',
    wrongLen: 'Para {country} el número debe tener {lens} dígitos ({help}).',
    notMobile: 'Ese no parece un celular de {country} ({help}).', or: ' u ',
    digits: '{n} dígitos', startsWith: '{n} dígitos, empieza en {x}', noZero: '{n} dígitos sin el 0 inicial',
    mx: '10 dígitos con lada (55, 81, 33…)', ar: 'código de área + número, sin 0 ni 15',
    br: 'DDD de la ciudad + celular de 9 dígitos', do: '10 dígitos (809, 829 u 849)',
    us: '10 dígitos con código de área', other: 'escribe el número completo con +',
    otherPh: '+cód. país + número', names: {},
  };
  const T = () => TABLES[lang()] || FALLBACK;
  const fill = (text, params) => String(text).replace(/\{(\w+)\}/g, (whole, k) => (k in params ? params[k] : whole));
  /** El nombre del país en el idioma de la pantalla; el del dato si no cambia. */
  const nameOf = (c) => T().names[c.cc] || c.name;
  /** La ayuda de cada país, compuesta o específica. */
  const helpOf = (c) => {
    if (c.helpKey) return T[c.helpKey];
    if (c.startsWith) return fill(T().startsWith, { n: c.len[0], x: c.startsWith });
    if (c.noZero) return fill(T().noZero, { n: c.len[0] });
    return fill(T().digits, { n: c.len.join(T().or) });
  };
  // dial, nombre, bandera, longitudes válidas del número nacional, prefijos móviles, placeholder, ayuda, normalizador
  const C = [
    { cc: 'PE', dial: '51', name: 'Perú', flag: '🇵🇪', len: [9], mobile: /^9/, ph: '912 345 678', startsWith: '9' },
    { cc: 'MX', dial: '52', name: 'México', flag: '🇲🇽', len: [10], ph: '55 1234 5678', helpKey: 'mx' },
    { cc: 'CO', dial: '57', name: 'Colombia', flag: '🇨🇴', len: [10], mobile: /^3/, ph: '300 123 4567', startsWith: '3' },
    { cc: 'AR', dial: '54', name: 'Argentina', flag: '🇦🇷', len: [10], ph: '11 2345 6789', helpKey: 'ar', norm: (d) => { d = d.replace(/^0/, ''); d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); return d; }, e164: (d) => '+549' + d },
    { cc: 'CL', dial: '56', name: 'Chile', flag: '🇨🇱', len: [9], mobile: /^9/, ph: '9 1234 5678', startsWith: '9' },
    { cc: 'BR', dial: '55', name: 'Brasil', flag: '🇧🇷', len: [11, 10], ph: '11 91234 5678', helpKey: 'br', norm: (d) => { d = d.replace(/^0/, ''); if (d.length === 10 && /^[6-9]/.test(d.slice(2))) d = d.slice(0, 2) + '9' + d.slice(2); return d; } },
    { cc: 'EC', dial: '593', name: 'Ecuador', flag: '🇪🇨', len: [9], mobile: /^9/, ph: '99 123 4567', noZero: true, norm: (d) => d.replace(/^0/, '') },
    { cc: 'BO', dial: '591', name: 'Bolivia', flag: '🇧🇴', len: [8], mobile: /^[67]/, ph: '7123 4567', startsWith: '6 / 7' },
    { cc: 'PY', dial: '595', name: 'Paraguay', flag: '🇵🇾', len: [9], mobile: /^9/, ph: '981 123 456', noZero: true, norm: (d) => d.replace(/^0/, '') },
    { cc: 'UY', dial: '598', name: 'Uruguay', flag: '🇺🇾', len: [8], mobile: /^9/, ph: '99 123 456', noZero: true, norm: (d) => d.replace(/^0/, '') },
    { cc: 'VE', dial: '58', name: 'Venezuela', flag: '🇻🇪', len: [10], mobile: /^4/, ph: '412 123 4567', noZero: true, norm: (d) => d.replace(/^0/, '') },
    { cc: 'GT', dial: '502', name: 'Guatemala', flag: '🇬🇹', len: [8], ph: '5123 4567' },
    { cc: 'SV', dial: '503', name: 'El Salvador', flag: '🇸🇻', len: [8], ph: '7123 4567' },
    { cc: 'HN', dial: '504', name: 'Honduras', flag: '🇭🇳', len: [8], ph: '9123 4567' },
    { cc: 'NI', dial: '505', name: 'Nicaragua', flag: '🇳🇮', len: [8], ph: '8123 4567' },
    { cc: 'CR', dial: '506', name: 'Costa Rica', flag: '🇨🇷', len: [8], ph: '8123 4567' },
    { cc: 'PA', dial: '507', name: 'Panamá', flag: '🇵🇦', len: [8], ph: '6123 4567' },
    { cc: 'DO', dial: '1', name: 'Rep. Dominicana', flag: '🇩🇴', len: [10], mobile: /^(809|829|849)/, ph: '809 123 4567', helpKey: 'do' },
    { cc: 'US', dial: '1', name: 'Estados Unidos', flag: '🇺🇸', len: [10], ph: '305 123 4567', helpKey: 'us' },
    { cc: 'ES', dial: '34', name: 'España', flag: '🇪🇸', len: [9], mobile: /^[67]/, ph: '612 345 678', startsWith: '6 / 7' },
    { cc: 'XX', dial: '', name: 'Otro país', flag: '🌎', len: [], ph: '', helpKey: 'other' },
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
    if (!c) return { error: T().pickCountry };
    if (c.cc === 'XX') {
      return /^\d{7,15}$/.test(digits) ? { e164: '+' + digits } : { error: T().full };
    }
    let d = c.norm ? c.norm(digits) : digits;
    if (!c.len.includes(d.length)) return { error: fill(T().wrongLen, { country: nameOf(c), lens: c.len.join(T().or), help: helpOf(c) }) };
    if (c.mobile && !c.mobile.test(d)) return { error: fill(T().notMobile, { country: nameOf(c), help: helpOf(c) }) };
    return { e164: c.e164 ? c.e164(d) : '+' + c.dial + d, pretty: '+' + c.dial + ' ' + d };
  }

  function mount(container, opts) {
    opts = opts || {};
    const wrap = document.createElement('div'); wrap.className = 'pp';
    const sel = document.createElement('select'); sel.className = 'pp-country'; sel.setAttribute('aria-label', T().country);
    C.forEach((c) => { const o = document.createElement('option'); o.value = c.cc; o.textContent = `${c.flag} ${nameOf(c)}${c.dial ? ' +' + c.dial : ''}`; sel.appendChild(o); });
    const inp = document.createElement('input'); inp.type = 'tel'; inp.inputMode = 'tel'; inp.autocomplete = 'tel-national'; inp.className = 'pp-number'; inp.setAttribute('aria-label', T().number);
    const help = document.createElement('div'); help.className = 'pp-help';
    const row = document.createElement('div'); row.className = 'pp-row'; row.appendChild(sel); row.appendChild(inp);
    wrap.appendChild(row); wrap.appendChild(help); container.appendChild(wrap);
    function refresh() { const c = byCc[sel.value]; inp.placeholder = c.ph || T().otherPh; help.textContent = helpOf(c); }
    sel.addEventListener('change', refresh);
    sel.value = opts.cc || detectCountry(); refresh();
    if (opts.value) { const p = parseE164(opts.value); sel.value = p.cc; inp.value = p.national; refresh(); }
    return { value: () => toE164(sel.value, inp.value), focus: () => inp.focus(), set: (e164) => { const p = parseE164(e164); sel.value = p.cc; inp.value = p.national; refresh(); } };
  }
  window.ComandoPhonePicker = { mount, toE164, parseE164, countries: C };
})();

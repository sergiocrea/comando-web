/* Cloudflare Pages Function: POST /api/lead
   Guarda el interesado que deja su correo o su WhatsApp en la landing (bloque de
   precios) o en /empezar/ (acceso anticipado). Antes esto solo abría un `mailto:`:
   si el visitante no tenía cliente de correo, el interesado se perdía en silencio.

   Guarda siempre en KV y, si hay canal configurado, avisa. Si no puede guardar ni
   avisar, responde 503 y la página vuelve al `mailto:` de antes: nunca se pierde
   un dato sin que el visitante lo sepa.

   Enlaces y variables (Cloudflare Pages → Settings):
     LEADS_KV            KV namespace (Functions → KV namespace bindings). Sin él se
                         usa DEMO_KV si existe. Es lo único imprescindible.
     LEAD_WEBHOOK_URL    opcional: recibe un POST JSON con el lead (Slack, n8n, Zapier…).
     RESEND_API_KEY      opcional: envía el aviso por correo con Resend.
     LEAD_EMAIL_TO       destinatario del aviso (por defecto hola@comando.pro).
     LEAD_EMAIL_FROM     remitente verificado en Resend (por defecto web@comando.pro).

   GET /api/lead → {ok} para que la página sepa si puede guardar antes de enviar.
   Las claves quedan como `lead:<fecha ISO>:<id>`; se listan con
   `npx wrangler kv key list --binding LEADS_KV --prefix lead:`. */

const LIMIT_PER_HOUR = 8;
const MAX = { contact: 160, crm: 60, plan: 24, source: 24, note: 400 };

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

const store = (env) => env.LEADS_KV || env.DEMO_KV || null;
const canNotify = (env) => Boolean(env.LEAD_WEBHOOK_URL || env.RESEND_API_KEY);

export function onRequestGet({ env }) {
  return json({ ok: Boolean(store(env)) || canNotify(env) });
}

export async function onRequestPost({ request, env, waitUntil }) {
  const kv = store(env);
  if (!kv && !canNotify(env)) return json({ error: 'sin almacenamiento configurado' }, 503);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'JSON inválido' }, 400); }

  // Trampa para robots: un campo que una persona nunca ve ni rellena.
  if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true, ignored: true });

  const contact = clean(body.contact, MAX.contact);
  const kind = contactKind(contact);
  if (!kind) return json({ error: 'Escribe un correo o un número de WhatsApp válido.' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'anon';
  if (kv) {
    const key = `rl:lead:${ip}:${new Date().toISOString().slice(0, 13)}`;
    const n = Number((await kv.get(key)) || 0) + 1;
    waitUntil(kv.put(key, String(n), { expirationTtl: 3700 }));
    if (n > LIMIT_PER_HOUR) return json({ error: 'Ya recibimos tus datos. Te escribimos en breve.' }, 429);
  }

  const lead = {
    at: new Date().toISOString(),
    contact,
    kind,
    crm: clean(body.crm, MAX.crm),
    plan: clean(body.plan, MAX.plan),
    source: clean(body.source, MAX.source) || 'landing',
    note: clean(body.note, MAX.note),
    pais: request.cf && request.cf.country ? String(request.cf.country) : '',
    ciudad: request.cf && request.cf.city ? String(request.cf.city) : '',
    referer: clean(request.headers.get('referer'), 200),
  };

  const id = crypto.randomUUID().slice(0, 8);
  let saved = false;
  if (kv) {
    try {
      await kv.put(`lead:${lead.at}:${id}`, JSON.stringify(lead));
      saved = true;
    } catch (e) { /* se intenta el aviso igual */ }
  }

  const notified = await notify(env, lead, waitUntil);
  if (!saved && !notified) return json({ error: 'no pudimos guardarlo' }, 503);

  console.log('[lead]', JSON.stringify({ ...lead, saved, notified }));
  return json({ ok: true, saved, notified });
}

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Devuelve 'email', 'whatsapp' o null. Acepta el número como lo escribe LatAm. */
function contactKind(value) {
  if (!value) return null;
  if (/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value)) return 'email';
  const digits = value.replace(/[^\d]/g, '');
  if (digits.length >= 8 && digits.length <= 15 && /^[+\d\s()-]+$/.test(value)) return 'whatsapp';
  return null;
}

async function notify(env, lead, waitUntil) {
  const jobs = [];
  if (env.LEAD_WEBHOOK_URL) {
    jobs.push(fetch(env.LEAD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: summary(lead), lead }),
    }));
  }
  if (env.RESEND_API_KEY) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.RESEND_API_KEY },
      body: JSON.stringify({
        from: env.LEAD_EMAIL_FROM || 'Comando <web@comando.pro>',
        to: [env.LEAD_EMAIL_TO || 'hola@comando.pro'],
        reply_to: lead.kind === 'email' ? lead.contact : undefined,
        subject: `Nuevo interesado: ${lead.crm || lead.source}`,
        text: summary(lead),
      }),
    }));
  }
  if (!jobs.length) return false;
  const results = await Promise.allSettled(jobs);
  const ok = results.some((r) => r.status === 'fulfilled' && r.value && r.value.ok);
  results.forEach((r, i) => { if (r.status === 'rejected') console.log('[lead] aviso falló', i, String(r.reason).slice(0, 120)); });
  return ok;
}

const summary = (l) => [
  `${l.kind === 'email' ? 'Correo' : 'WhatsApp'}: ${l.contact}`,
  l.crm ? `CRM o tienda: ${l.crm}` : '',
  l.plan ? `Plan: ${l.plan}` : '',
  `Desde: ${l.source}`,
  l.pais ? `Ubicación: ${[l.ciudad, l.pais].filter(Boolean).join(', ')}` : '',
  l.note ? `Nota: ${l.note}` : '',
  `Fecha: ${l.at}`,
].filter(Boolean).join('\n');

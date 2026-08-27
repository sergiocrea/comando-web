# Prompt para el desarrollador de la landing (comando.pro) — 2026-08-27

Contexto: Comando es una plataforma para vendedores en LatAm que operan su CRM desde WhatsApp en lenguaje natural. La landing vive en el repo `comando-web` (HTML estático exportado de Webflow + `js/pricing.js`, `js/screens.js`, `css/custom.css`; deploy automático a Cloudflare Pages con cada push a `main`). La fuente de verdad de precios y márgenes es `docs/prompt-precios.md`; el modelo de capacidades está en `comando-pro/docs/research/capabilities/capabilities.json`. No cambies el diseño ni la estructura; solo contenido y datos.

1. Precios (`js/pricing.js`, ya actualizado — verificar): Gratis $0 (cualquier tamaño de CRM, 50 comandos en total, sin sincronización continua, expira a los 30 días sin uso) · Básico $3 → 10,000 contactos, 300 comandos/mes · Starter $6 → 25,000, 1,000 · Pro $19 → 75,000, 4,000 · Business $49 → 200,000, 10,000 (solo en comparativa y línea enterprise). Add-ons: +10,000 contactos $1/mes, +1,000 comandos $2/mes. Anual = 2 meses gratis. Vendedores ilimitados; nunca cobrar por usuario.
2. Letra pequeña bajo las tarjetas: "Sincronización en tiempo real cuando tu CRM envía eventos (HubSpot, Pipedrive, Zoho, Kommo, Shopify, Tiendanube, WooCommerce, Mercado Libre…). En los demás, Comando revisa cambios cada 6 h en Básico, 30 min en Starter y 5 min en Pro."
3. Comparativa con HubSpot por tramos (hasta 10,000 / 10,000–25,000 / 25,000–200,000), tono factual.
4. FAQ: añadir "¿Comando les escribe a mis clientes?" (modo asistido; automático solo con número oficial de WhatsApp Business) y "¿Qué pasa si pido algo que mi CRM no permite?" (Comando lo dice y propone la alternativa).
5. Ejemplos de comandos: avisos/resúmenes al operador; mensajes al cliente en modo asistido salvo en la ficha WhatsApp Business; nunca prometer llamadas, cobros ni sincronizar dos CRM entre sí.
6. Micro-sección "Tú envías, Comando prepara" (3 columnas: detecta el momento → mensaje redactado con datos del CRM → lo envías con un toque y Comando lo registra). Cierre: "Nadie escribe a tus clientes por ti. Tu número, tu voz, tu reputación."
7. CTA de registro: todo apunta a `/app/`. No usar `app.comando.pro/registro`.
8. Conectores ordenados por prioridad (HubSpot, Pipedrive, Zoho, Salesforce, Kommo; Shopify, Tiendanube, WooCommerce, Mercado Libre, VTEX; resto) con chip "Tiempo real" o "Actualización periódica".
9. No tocar: video de fondo y póster, `app/`, textos legales.
10. Validación: sin errores en consola; tarjetas 10,000/25,000/75,000; enlaces `/app/` 200; Lighthouse móvil ≥ 90; ningún texto promete envíos automáticos a clientes fuera de WhatsApp Business. Commit descriptivo y push a `main`.

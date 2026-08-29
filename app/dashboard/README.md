# `/app/dashboard/` — Qué puede consultar Comando

Página donde el operador elige **qué propiedades de su CRM puede consultar y editar Comando**.
Un CRM real tiene ~190 propiedades por objeto; la página evita que eso abrume mostrando
primero lo que ya está activo, después un máximo de 8 sugerencias con su motivo, y dejando
el catálogo completo plegado detrás de un buscador.

## Privacidad (restricción de producto, no la rompas)

**Esta página es de configuración, no un visor de datos: nunca muestra información de leads
ni de clientes.** Solo metadatos y agregados del *esquema* del CRM: etiqueta del campo,
nombre interno, tipo, si es esencial o sensible, cuántas veces se pidió y qué porcentaje de
registros lo tiene lleno. Nada de registros, nombres, teléfonos, correos, listas de valores
reales ni "vistas previas de ejemplo", aunque la API llegara a devolverlos. Por lo mismo, la
página solo habla con los dos endpoints de campos de abajo: no se le añaden llamadas a
endpoints que devuelvan registros (contactos, negocios, informes).

## Qué hace

- **Pestañas** Contactos · Negocios · Empresas, cada una con "N activos de M".
- **Activos**: lo que Comando ya puede consultar. Los `core` llevan la etiqueta
  "siempre disponible" y su interruptor *Consultar* no se puede apagar.
- **Sugeridos**: hasta 8 campos inactivos ordenados por `usage.mentions` desc y luego por
  `fillRate` desc, cada uno con una línea de motivo ("lo pediste 3 veces, la última hace 2 días" /
  "está lleno en el 82% de tus registros" / "lista con 12 opciones en tu CRM").
- **Todos los campos**: plegado, con buscador por etiqueta y por nombre interno (ignora tildes
  y mayúsculas, acepta varias palabras) y paginación de 40 en 40.
- Dos interruptores por fila: **Consultar** y **Editar**. *Editar* queda deshabilitado mientras
  *Consultar* esté apagado.
- Los campos `sensitive` muestran la insignia "sensible — se consulta en vivo, no se copia" y
  nunca se replican: al activarlos se manda `mirrored: false`.
- Guardado **optimista**: el interruptor cambia al instante y, si el `PATCH` falla, vuelve a su
  estado anterior y aparece el error en la propia fila.

## API que consume

Base: `COMANDO_CONFIG.engineUrl` (ya incluye `/api`; si no lo trae, se le añade).
Autenticación: token de sesión de Clerk (plantilla `comando`) en `Authorization: Bearer`,
igual que `/app/`.

```
GET   {engine}/crm/fields
      → { objects: [{ objectType: 'contact'|'opportunity'|'company', label, fields: [{
            propertyName, label, fieldType, optionCount, mirrored, queryable, editable,
            sensitive, core, usage: { mentions, lastMentionedAt }, fillRate }] }] }

PATCH {engine}/crm/fields/{objectType}/{propertyName}
      body { queryable?, editable?, mirrored? }  → el campo actualizado
```

Cuerpos que manda la interfaz:

| acción                       | body                                                |
|------------------------------|-----------------------------------------------------|
| activar Consultar (normal)   | `{queryable: true, mirrored: true}`                 |
| activar Consultar (sensible) | `{queryable: true, mirrored: false}`                |
| apagar Consultar             | `{queryable: false, mirrored: false, editable: false}` |
| Editar                       | `{editable: true \| false}`                          |

Degradación: si falta `label` se usa `propertyName`; si falta `usage` se cuentan 0 menciones;
`fillRate` se acepta en 0–1 o en 0–100; `fieldType` desconocido se muestra tal cual.
Sin CRM conectado (respuesta vacía, o 404/409/412 con código `crm_not_connected`) sale la
pantalla que lleva al paso 3 de `/app/`. Un 404/501 del endpoint muestra "todavía no está
habilitada en tu cuenta" en vez de un error genérico.

## Archivos

| archivo           | qué es                                                        |
|-------------------|---------------------------------------------------------------|
| `index.html`      | markup, `COMANDO_CONFIG` y las cinco pantallas de estado       |
| `dashboard.js`    | entrada: sesión de Clerk, modos de prueba, orquestación        |
| `fields-api.js`   | cliente de los dos endpoints + detección de "sin CRM"          |
| `fields-ui.js`    | orden, motivos, búsqueda, filas, interruptores, guardado       |
| `mock-fields.js`  | fixture y API falsa para `?mock=…` (solo metadatos)            |
| `dashboard.css`   | estilos propios; los tokens y botones vienen de `../onboarding.css` |

Sin build ni dependencias externas: módulos ES nativos y CSS. Por eso hay que servirlo por
HTTP (con `file://` los módulos no cargan).

## Probarlo en local

```bash
cd comando-web
python3 -m http.server 8000
```

- Contra un engine real: `http://localhost:8000/app/dashboard/` — requiere sesión de Clerk.
  Para apuntar a un engine local, cambia `engineUrl` en el `<script>` de `index.html`
  (p. ej. `http://localhost:8080/api`) y habilita CORS en el engine para ese origen.
- Sin backend: `http://localhost:8000/app/dashboard/?mock=1` — 176 campos de mentira
  (96 contactos, 48 negocios, 32 empresas) con esenciales, sensibles y sugeridos.
  Cada `PATCH` simulado se registra en la consola para ver qué mandaría al engine.
  - `?mock=error` → API caída (con botón Reintentar).
  - `?mock=nocrm` → todavía sin CRM conectado.
  - En `?mock=1`, el campo **"Campo que falla al guardar (demo)"** siempre falla:
    sirve para ver el rollback y el error en línea.

## Verificación rápida

```bash
for f in app/dashboard/*.js; do cp "$f" "/tmp/$(basename $f .js).mjs" && node --check "/tmp/$(basename $f .js).mjs"; done
```

(`node --check` trata los `.js` como CommonJS y se atraganta con `import`/`export`; por eso
la copia a `.mjs`.)

## Pendiente / preguntas para el backend

- No hay endpoint para leer varios campos de golpe (`PATCH` en lote): activar 8 sugeridos son
  8 peticiones.
- `usage.mentions` no dice en qué ventana se contó ("lo pediste 3 veces" ¿de siempre? ¿este mes?).
- No sabemos si un campo es de solo lectura en el CRM; hoy se puede encender *Editar* en un
  campo calculado y el error solo aparece al guardar.

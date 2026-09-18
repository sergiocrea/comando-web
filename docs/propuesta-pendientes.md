# /propuesta — lo que la página promete y todavía no existe

`propuesta.html` (se sirve en `comando.pro/propuesta`, con `noindex`) es la versión de
trabajo de la nueva estrategia comercial: diagnóstico gratis como gancho, dos rutas
(distribuidor local y marca con agencia) y capa de control para quien ya tiene agencia.

Se decidió **anunciar el diagnóstico aunque no esté construido**, porque se va a construir.
Esta lista es el contrato con la realidad: antes de llevar cualquiera de estos textos al
home hay que cerrar el punto o cambiar la frase.

## Pendiente de motor

| Promesa en la página | Qué hay hoy | Qué falta |
| --- | --- | --- |
| «Al día siguiente te escribe por WhatsApp con el diagnóstico» | Las tres preguntas de diagnóstico (`libs/application/src/lib/marketing-3qs.ts`) y las tarjetas proactivas contestan **cuando el operador pregunta** o en la cadencia diaria. En Gratis los datos de Meta se sincronizan 1 vez al día (`meta-insights-mirror.ts`). | Una tarea que, tras la primera sincronización de una cuenta recién conectada, arme el diagnóstico del último mes (cuánto se fue sin resultados, en dólares) y lo mande solo. Mientras no exista, **se envía a mano desde la consola**. |
| «Conectar toma 2 minutos» | Conexión de Meta por Nango con `ads_read` aprobado. | Medir el tiempo real de un alta nueva y ajustar la cifra. |

## Verificado y cierto (no tocar sin revisar el código)

- **«Permiso de lectura: mira, no toca»**: la escritura en Meta exige `ads_management`, que no
  está aprobado (`libs/connector-sdk/src/lib/meta-ads-write.client.ts`). **Revisar esta frase el
  día que Meta lo apruebe.**
- **«Cada cambio queda registrado, antes y después»**: migración 000133; la purga borra a los
  7 días. En la web se dice sin el plazo, a propósito.
- **«Tus datos no se mezclan»**: aislamiento por inquilino en la base de datos.
- **«Sin contrato, desconectas cuando quieras»**: existe la desconexión y `eliminar-datos.html`.

## Compromisos comerciales (los confirma Sergio, no el código)

- «Sin llamada de ventas».
- «Una parte del ahorro» en el modelo a medida: el porcentaje se quitó de la página a propósito.
- «No toca la pauta oficial de la marca».

## Huecos de prueba marcados en el HTML (`HUECO DE PRUEBA`)

1. Franja de respaldo al pie del hero.
2. **Captura real de un diagnóstico entregado** (el de mayor impacto).
3. Testimonio de un jefe o jefa de marketing, antes de los planes.
4. Un caso con números reales en `#rutas`.

## Números que están en la página y son de muestra

Cuenta ficticia coherente: mes de **US$ 3.120**, 571 leads, **US$ 5,46** por lead, de los cuales
**US$ 612 (19 %)** sin resultado. «Remarketing»: US$ 96 en 3 días, 0 leads, frecuencia 4,8.
ROAS 3,2× según Meta frente a 2,4× real del CRM. Si cambia uno, cambian todos.

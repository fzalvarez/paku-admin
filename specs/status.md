# Estado — Paku Admin

> Actualizado: 2026-10-04

## Entorno

- Repo activo: `Odyssoft/Paku/paku-admin`. La copia `Odyssoft/paku-admin` está abandonada.
- Despliegue: Vercel. Backend: GCP. Se despliega seguido; un despliegue se puede repetir sin problema.
- Backend de desarrollo: `https://api.paku.com.pe/paku/api/v1` (`.env`). **Ya tiene desplegados los
  cambios C-01 a C-14** de `paku-backend/docs/cambios-api-para-front.md` (verificado en su OpenAPI
  el 2026-10-04: expone `groomer_id`, `skipped`, `/next-step`; ya no `ally_id`).
- Sin tests. Verificación: `pnpm build` + prueba manual contra el backend de desarrollo.

## Qué funciona (según código)

- Login (email/contraseña y Google), solo rol `admin`.
- Usuarios, mascotas, razas, historial clínico, tienda (categorías, productos, addons, reglas de precio),
  fechas/disponibilidad.
- Órdenes: listado con filtro, cambio de estado, cancelar, registrar peso real (recálculo de precio).
- Asignación de órdenes a groomers.

## Compatibilidad con la API nueva — fase 1 (2026-10-04, commit `c3c8a35`)

| Qué estaba roto | Corrección |
|---|---|
| Lista de groomers vacía → no se podía asignar (`?role=ally`, C-09) | `?role=groomer` en Groomers y Asignación |
| Asignar orden → 422 (body con `ally_id`, C-09) | body con `groomer_id` |
| Columna y filtro de groomer en órdenes (`ally_id`, C-09) | `groomer_id` |
| Crear groomer y cambiar rol (`role: "ally"`, C-09) | `role: "groomer"`; tipos en `lib/labels.ts` |
| La página de órdenes se caía con una orden saltada (C-13) | `skipped` reconocido; se puede cancelar |
| Ficha de mascota → 401 (`GET /pets/{id}` sin token, C-04) | Mascotas rehecha en solo lectura (ver Observaciones) |
| Historial de peso → 404 (`/weight-history` no existe) | registros `weight_record` de `/pets/{id}/records` |
| Errores con código se veían como `[object Object]` | `lib/apiHelpers.ts`: un solo parser, mensajes en español |
| El modal de cambio de estado ofrecía "cancelled" (el backend lo rechaza con 409) | cancelar solo con su botón |
| El mensaje "Orden asignada" nunca se mostraba | corregido |
| `/` mostraba la plantilla de create-next-app | redirige a `/dashboard` |

| Una orden sin groomer se podía pasar a "En camino" | bloqueado: primero se asigna |
| El buscador de clientes mostraba "Sin resultados" después de elegir uno | corregido (`OwnerSearch`) |

Verificado (2026-10-04) con sesión de admin contra el backend de desarrollo:
- `pnpm build` pasa; parámetros contrastados con su OpenAPI.
- Lecturas: groomers, usuarios, órdenes (con filtros de estado y groomer), mascotas, ficha y peso.
- Escrituras probadas sin modificar datos (IDs inexistentes / transiciones rechazadas): `/assign` con
  `groomer_id` es aceptado (el viejo `ally_id` da 422); cambio de rol a `groomer` aceptado (`ally` da
  422); `/status` hacia `cancelled` da 409, por eso se quitó del modal.
- Recorrido en navegador (Playwright) de todas las páginas, modales y la ficha de mascota: sin errores
  de consola ni respuestas de la API con error. Rutas viejas redirigen (308).
- Escritura real sobre la orden de prueba `df17f50c`: asignada a "Ally Prueba" para el 06/10 10:00
  (`/assign` → 201, mensaje de éxito visible) y pasada a "En camino" (`/status` → 200).
- `606a1b16`: asignada y llevada En camino → En servicio → Terminada con **cierre a mano** (aviso y
  botón "Cerrar a mano" visibles; `/status` → 200 en cada paso).
- `3b144c8f`: asignada a "Ally Prueba" (06/10 10:00), queda en Creada/Asignada.
- **Órdenes para probar la app Groomer (Ally Prueba):** `3b144c8f` (Asignada, 06/10 10:00) y `df17f50c`
  (saltada en la prueba de la fase 2 y reprogramada: Asignada, 07/10 10:00).
- **No probado con escritura real:** cambiar rol, crear groomer.

## Ajustes por el backend de reservas — C-15 (2026-10-04, commit `b148dcb`)

Según `paku-backend/docs/guia-front-cambios-octubre-2026.md` (commit `7e78250`, **aún no desplegado**):

- Fechas: botón **Reservas** por día → quién reservó (cliente, mascota, estado, vencimiento) con
  `GET /admin/availability/{slot_id}/holds`. Responde 404 hasta que se despliegue el backend.
- Editar capacidad: ya no se puede bajar por debajo de lo reservado (el backend responde 409
  `CAPACITY_BELOW_BOOKED`); se valida antes de enviar y se corrigió el texto que decía lo contrario.
- `SLOT_EXISTS` y `SERVICE_NOT_FOUND` llegan con mensaje en español; el parser los muestra tal cual.
- Cancelar una orden: la confirmación avisa que se libera el cupo y, si estaba pagada, que no hay
  devolución automática.
- "slot" → "día"/"cupos" en la interfaz de Fechas.

## Decisiones de flujo (owner, 2026-10-04)

- **Compatibilidad con la API:** cambio directo a los nombres nuevos, sin capa de compatibilidad
  (los despliegues son frecuentes y repetibles).
- **Cancelar una orden pagada:** debe existir la opción de devolver el pago. Si la orden ya estaba
  programada para recoger y se cancela (p. ej. parada saltada), **no se devuelve**: se reagenda o
  queda como crédito a favor del cliente.
- **Reprogramar:** lo solicita el cliente; el admin lo acepta. El groomer no decide (es un empleado).
- **Un solo groomer:** los primeros 6 meses de operación habrá un único groomer. No invertir en
  selección o reparto entre groomers; por defecto se propone el que ya tenía la orden.
- **Estado `accepted`:** la app Groomer no llama a `/accept` y el backend permite `created → on_the_way`.
  El admin trata "orden `created` con `groomer_id`" como **asignada**; `accepted` se muestra si aparece,
  pero no se usa en el flujo.
- **Ruta del día por groomer:** se hará una vista en el admin (el orden de la ruta es `scheduled_at`).
- **Avisos al admin (saltos, demoras):** campana en el topbar. Sin carga para el servidor: consultar
  `unread-count` cada pocos minutos, solo con la pestaña visible. Push queda para más adelante.

- **Cerrar a mano:** el admin puede pasar una orden de `in_service` a `done` sin los pasos del servicio
  (p. ej. el groomer se quedó sin batería). La interfaz avisa y el botón dice "Cerrar a mano".
- **Idioma:** interfaz y rutas en español (`/dashboard/ordenes`, `/asignaciones`, `/groomers`,
  `/usuarios`, `/mascotas`, `/razas`, `/tienda`; las viejas redirigen en `next.config.ts`). Código y
  valores de la API se quedan como los define el backend. Todo texto para un valor de la API va en
  `lib/labels.ts`; los mensajes de error, en `lib/apiHelpers.ts`.

## Pendiente de confirmar con el owner

- [ ] Mascotas: el backend solo deja editar una mascota a su dueño. ¿El admin necesita editar
      fichas de clientes? Si sí, es un pedido al backend.

## Pedidos al backend (por enviar)

- Devolución del pago de una orden cancelada (hoy `/admin/orders/{id}/cancel` solo cambia el estado).
- Crédito a favor del cliente por una orden cancelada después de programada.
- Solicitud de reprogramación del cliente y aceptación del admin (hoy solo existe `/admin/orders/{id}/assign`).
- Filtro por fecha en `GET /admin/orders` (para la ruta del día).
- Filtro `?parent_order_id=` en `GET /admin/orders` (hoy el detalle trae todas las órdenes para encontrar los cargos extra).
- Nombre del cliente en `OrderOut` (hoy Órdenes trae todos los usuarios para mostrar nombres).
- `POST /notifications/read-all` (marcar todos los avisos como leídos; hoy el admin los marca uno por uno).

## Plan

| # | Fase | Prioridad | Riesgo |
|---|---|---|---|
| 0 | Preparación: entorno, specs, línea base | P0 | Bajo — **hecho** |
| 1 | Compatibilidad con la API nueva + interfaz en español | P0 | Alto — **hecho y probado** |
| 2 | Paradas saltadas: ver, reprogramar, cancelar ([0001](features/0001-paradas-saltadas/spec.md)) | P1 | Medio — **hecho y probado** |
| 3 | Detalle de orden ([0002](features/0002-detalle-orden/spec.md)) | P1 | Bajo — **hecho y probado** (fotos y demoras sin datos aún) |
| 4 | Órdenes legibles ([0003](features/0003-ordenes-legibles/spec.md)) | P2 | Bajo — **hecho y probado** |
| 5 | Campana de avisos ([0004](features/0004-campana-avisos/spec.md)) | P2 | Medio — **hecho y probado** |
| 6 | Ruta del día ([0005](features/0005-ruta-del-dia/spec.md)) | P2 | Medio — **hecho y probado** |
| 7 | Limpieza: un solo cliente HTTP, `Dialog`, lockfile, `middleware` → `proxy` | P3 | Medio — **hecho y probado** |

Las fases 2 a 6 pasaron por spec → plan → tasks en `specs/features/`. La 7 es un refactor sin cambio
de comportamiento (no lleva spec, ver `paku-backend/specs/README.md`).

## Fase 7 — limpieza (2026-10-04)

- **Un solo cliente HTTP:** `lib/apiClient.ts` (`apiFetch`) con tokens en cookies, renovación de sesión
  compartida (varios 401 a la vez → un solo `/auth/refresh`) y salida a `/login` si no se puede
  renovar. `lib/api.ts` (`apiCall`, `ApiError`) se apoya en él. Ya no se guardan tokens en
  localStorage (se borran los que quedaban).
- **Corregido de paso:** con contraseña incorrecta el login recargaba la página sin mensaje (el 401 se
  trataba como sesión vencida). Ahora muestra "Email o contraseña incorrectos." Solo se intenta renovar
  si la petición llevaba token.
- `middleware.ts` → `proxy.ts` (Next 16; el build ya no avisa deprecación).
- Modales hechos a mano → `Dialog` de shadcn en Órdenes (2), Asignación, Groomers y Razas (2): cierran con
  Esc y mantienen el foco. El menú ⋯ de Órdenes es no modal para que abrir un Dialog desde él no deje la
  página bloqueada. "Close" → "Cerrar" en `Dialog` y `Sheet`.
- `pnpm lint`: **0 problemas** (antes 5 errores y 10 warnings).
- `package-lock.json` eliminado (el gestor es pnpm).
- Verificado con Playwright: protección de rutas, login (bien y mal), renovación con token vencido, cada
  modal (abrir, Esc, Cancelar, X), páginas restantes y cerrar sesión.

## Línea base técnica al empezar (2026-10-04, histórico)

- `pnpm build`: **pasa**. Aviso de Next 16: `middleware.ts` está deprecado, usar `proxy`.
- `pnpm lint`: **11 errores, 39 warnings**, todos previos a este plan.
  - `no-explicit-any`: `dashboard/pets/page.tsx` (6), `lib/apiClient.ts` (4).
  - `react-hooks/purity`: `components/ui/sidebar.tsx:611` (generado por shadcn).
  - Warnings: variables sin usar (`catch (_)`), `<img>` en vez de `next/image`.
- Hay dos clientes HTTP: `lib/apiClient.ts` (localStorage) y `lib/api.ts` (cookies + refresh).
- `package-lock.json` obsoleto junto a `pnpm-lock.yaml`.

Después de la fase 1: `pnpm lint` en **5 errores, 10 warnings**. Los 5 errores son previos y quedan
para la fase 7 (`lib/apiClient.ts` y `components/ui/sidebar.tsx`).

## Observaciones

- **Mascotas** antes listaba `GET /pets`, que devuelve las mascotas *del propio admin*, y sus
  formularios de crear/editar solo servían para esas. Ahora se busca un cliente y se ven sus mascotas
  (`GET /admin/users/{id}/pets`) en solo lectura. El peso se registra en Historial clínico.
- El buscador de clientes es un componente compartido: `components/owners/OwnerSearch.tsx`.
- En esta máquina el repo tiene `core.autocrlf=true`: en disco hay archivos CRLF, en git todo es LF.

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

## Roto hoy contra el backend de desarrollo

| Qué | Dónde | Causa |
|---|---|---|
| Lista de groomers vacía → no se puede asignar | `dashboard/assignments`, `dashboard/allies` | `?role=ally` (C-09) |
| Asignar orden → 422 | `dashboard/assignments` | body con `ally_id` (C-09) |
| Columna y filtro de groomer en órdenes | `dashboard/orders` | `ally_id` (C-09) |
| Crear groomer y cambiar rol a groomer | `dashboard/allies`, `dashboard/users` | `role: "ally"` (C-09) |
| La página de órdenes se cae con una orden saltada | `dashboard/orders` | `skipped` no está en `NEXT_STATUSES` (C-13) |
| Editar mascota → 401 | `dashboard/pets` | `GET /pets/{id}` sin token (C-04) |
| Historial de peso → 404 | `dashboard/pets` | `/pets/{id}/weight-history` no existe en el backend |
| Errores con código se ven como `[object Object]` | todas | `parseApiError` no lee `detail.code` / `detail.message` |

## Decisiones de flujo (owner, 2026-10-04)

- **Compatibilidad con la API:** cambio directo a los nombres nuevos, sin capa de compatibilidad
  (los despliegues son frecuentes y repetibles).
- **Cancelar una orden pagada:** debe existir la opción de devolver el pago. Si la orden ya estaba
  programada para recoger y se cancela (p. ej. parada saltada), **no se devuelve**: se reagenda o
  queda como crédito a favor del cliente.
- **Reprogramar:** lo solicita el cliente; el admin lo acepta. El groomer no decide (es un empleado).
- **Estado `accepted`:** la app Groomer no llama a `/accept` y el backend permite `created → on_the_way`.
  El admin trata "orden `created` con `groomer_id`" como **asignada**; `accepted` se muestra si aparece,
  pero no se usa en el flujo.
- **Ruta del día por groomer:** se hará una vista en el admin (el orden de la ruta es `scheduled_at`).
- **Avisos al admin (saltos, demoras):** campana en el topbar. Sin carga para el servidor: consultar
  `unread-count` cada pocos minutos, solo con la pestaña visible. Push queda para más adelante.

## Pendiente de confirmar con el owner

- [ ] Admin pasando una orden de `in_service` a `done` sin los pasos del servicio: ¿se permite?
- [ ] Idioma: textos de la interfaz y rutas en español; código y valores de la API se quedan como los define el backend.

## Pedidos al backend (por enviar)

- Devolución del pago de una orden cancelada (hoy `/admin/orders/{id}/cancel` solo cambia el estado).
- Crédito a favor del cliente por una orden cancelada después de programada.
- Solicitud de reprogramación del cliente y aceptación del admin (hoy solo existe `/admin/orders/{id}/assign`).
- Filtro por fecha en `GET /admin/orders` (para la ruta del día).

## Plan

| # | Fase | Prioridad | Riesgo |
|---|---|---|---|
| 0 | Preparación: entorno, specs, línea base | P0 | Bajo — **hecho** |
| 1 | Compatibilidad con la API nueva (tabla "Roto hoy") | P0 | Alto |
| 2 | Paradas saltadas: ver, reprogramar, cancelar | P1 | Medio |
| 3 | Detalle de orden: mascota, cliente, pasos, fotos, demoras | P1 | Bajo |
| 4 | Órdenes legibles: nombres, estados en español, filtros | P2 | Bajo |
| 5 | Campana de avisos | P2 | Medio |
| 6 | Ruta del día por groomer | P2 | Medio |
| 7 | Limpieza: un solo cliente HTTP, `Dialog`, lockfile, `middleware` → `proxy` | P3 | Medio |

Las fases 2, 3, 5 y 6 pasan por spec → plan → tasks en `specs/features/`.

## Línea base técnica (2026-10-04)

- `pnpm build`: **pasa**. Aviso de Next 16: `middleware.ts` está deprecado, usar `proxy`.
- `pnpm lint`: **11 errores, 39 warnings**, todos previos a este plan.
  - `no-explicit-any`: `dashboard/pets/page.tsx` (6), `lib/apiClient.ts` (4).
  - `react-hooks/purity`: `components/ui/sidebar.tsx:611` (generado por shadcn).
  - Warnings: variables sin usar (`catch (_)`), `<img>` en vez de `next/image`.
- Hay dos clientes HTTP: `lib/apiClient.ts` (localStorage) y `lib/api.ts` (cookies + refresh).
- `package-lock.json` obsoleto junto a `pnpm-lock.yaml`.

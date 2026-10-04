---
feature: 0002-detalle-orden
spec: ./spec.md
---

# Plan — Detalle de orden

## Enfoque

Un componente de panel lateral (`Sheet` de shadcn, ya usado en Usuarios y Mascotas) que recibe el ID
de la orden y carga por su cuenta cada bloque en paralelo, con estado y error propios por bloque: así
una sección que falla no rompe las demás (criterio del spec). Órdenes y Asignación solo lo abren.

Descartado: una página `/dashboard/ordenes/[id]`. El spec pide no perder la lista ni sus filtros; un
panel encima lo resuelve sin tocar la navegación.

## Cambios por repo

### paku-backend
- Ninguno.

### paku-admin
- **Capa API** — `lib/services/orders.ts` (se amplía):
  - `getOrder(id)` → `GET /admin/orders/{id}` (resumen, ítems, dirección, pago, pasos, salto).
  - `getStopDetail(id)` (ya existe) → mascota, cliente, servicio.
  - `getOrderPhotos(id)` → `GET /orders/{id}/photos`.
  - `getDelayReports(id)` → `GET /orders/{id}/delay-reports`.
  - `listAllOrders()` → `GET /admin/orders` (para encontrar ajustes por peso: hijos con
    `parent_order_id` = esta orden).
  - Nuevo `lib/services/geo.ts`: `getDistrictName(id)` → `GET /geo/districts/{id}` (público, con caché
    en memoria por ID).
  - `listGroomers()` → `GET /admin/users?role=groomer` (para el nombre del groomer).
- **Tipos** — `lib/orders.ts`: `OrderItem` (`items_snapshot[]`: kind, ref_id, name, qty, unit_price,
  meta), `DeliveryAddress`, `OrderPhoto`, `DelayReport`; `StopPet` suma los campos de servicio
  (piel sensible, comportamiento en el baño, tolera secado/uñas, shampoo especial).
- **Textos** — `lib/labels.ts`: `PHOTO_KIND_LABELS` (Inicial / Final / Incidente) y
  `PAYMENT_METHOD_LABELS` (Tarjeta / Yape / Efectivo).
- **Componente** — nuevo `components/orders/OrderDetailSheet.tsx`, props `orderId | null` y `onClose`.
  Secciones en este orden: Resumen · Cliente y dirección · Mascota · Servicio · Progreso · Fotos ·
  Demoras · Salto · Cargo extra por peso. Subcomponentes pequeños en el mismo archivo.
  - Dirección: enlace `https://www.google.com/maps?q=<lat>,<lng>` si hay coordenadas.
  - Complementos realizados: cruzar `addons_done[].addon_id` con `items_snapshot[].ref_id` de las
    líneas `service_addon`.
  - Progreso: los 5 pasos de `SERVICE_STEPS`; hora de `service_steps_log`; paso actual resaltado; si
    la orden está terminada y el log está vacío, "Cerrada sin pasos registrados".
  - Fotos: miniaturas por tipo; al tocar, `Dialog` con la imagen grande (URL firmada del backend;
    `<img>` porque `next/image` exige dominios configurados y la URL vence).
  - ID completo con botón Copiar (`navigator.clipboard`).
- **Órdenes** (`app/dashboard/ordenes/page.tsx`): botón **Ver** en cada fila → abre el panel.
- **Asignación** (`app/dashboard/asignaciones/page.tsx`): el ID (en Pendientes y en Saltadas) es un
  botón que abre el panel.

## Contrato

Sin cambios. Lo que se consume:

| Endpoint | Bloque | Notas |
|---|---|---|
| `GET /admin/orders/{id}` | Resumen, servicio, progreso, salto | `OrderOut` |
| `GET /orders/my-assignments/{id}` | Mascota, cliente, servicio | Admin permitido |
| `GET /orders/{id}/photos` | Fotos | `[{id, kind, read_url, note, created_at}]`, URL firmada |
| `GET /orders/{id}/delay-reports` | Demoras | `[{id, delay_minutes, note, created_at, …}]` |
| `GET /geo/districts/{id}` | Distrito | `{name, …}` |
| `GET /admin/orders` | Ajustes por peso | Se filtra en el cliente por `parent_order_id` |
| `GET /admin/users?role=groomer` | Nombre del groomer | — |

## Migraciones de datos

Ninguna.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Hasta 7 llamadas al abrir un detalle | En paralelo; cada bloque independiente; distrito y groomers con caché |
| `GET /admin/orders` completo para ajustes no escala | Hoy hay pocas órdenes. Si crece, pedir al backend un filtro `?parent_order_id=` (anotado en `status.md`) |
| URLs firmadas de fotos vencen | Se piden al abrir el panel; si una vence, se vuelve a abrir |
| No hay fotos ni demoras reales para probar | Se prueba la vista vacía ahora y las fotos cuando el groomer use la app |

## Rompe clientes

- [ ] paku-web — impacto: ninguno.
- [ ] paku-admin — impacto: solo agrega el panel y los accesos.
- [ ] paku-vet-dev — impacto: ninguno.

## Tests

Sin tests automatizados en el admin. Verificación:
- `pnpm build` y `pnpm lint` sin problemas nuevos.
- Playwright contra el backend de desarrollo: `606a1b16` (terminada, cierre a mano), `df17f50c`
  (saltada antes y reprogramada), `3b144c8f` (asignada); abrir desde Órdenes y desde Asignación,
  revisar cada sección, copiar ID, enlace al mapa, cerrar y comprobar que los filtros siguen.

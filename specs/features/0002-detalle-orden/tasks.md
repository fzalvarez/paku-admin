---
feature: 0002-detalle-orden
plan: ./plan.md
---

# Tasks — Detalle de orden

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios.

## Frontend (paku-admin)
- [x] 1. Tipos (`OrderItem`, `DeliveryAddress`, `OrderPhoto`, `DelayReport`, campos de servicio en
      `StopPet`) y textos (`PHOTO_KIND_LABELS`, `PAYMENT_METHOD_LABELS`).
- [x] 2. Capa API: `getOrder`, `getOrderPhotos`, `getDelayReports`, `listAllOrders`, `listGroomers`
      en `lib/services/orders.ts`; `getDistrictName` en `lib/services/geo.ts`.
- [x] 3. `components/orders/OrderDetailSheet.tsx` con las 9 secciones, carga independiente por bloque.
- [x] 4. Órdenes: botón **Ver**. Asignación: ID que abre el panel (Pendientes y Saltadas).
- [x] 5. Verificación: `pnpm build`, `pnpm lint`, Playwright con `606a1b16`, `df17f50c`, `3b144c8f`.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0002-detalle-orden/`

---
feature: 0006-dia-reservado
plan: ./plan.md
---

# Tasks — Día reservado por el cliente al asignar

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios para esta feature. Pedido aparte: C-21 (validar el día al asignar, `reserved_date`,
      `meta.scheduled_time` opcional).

## Frontend (paku-admin)
- [x] 1. `lib/orders.ts`: `reservedDate`, `fmtYmd`, `reserved_date?` en `Order`.
- [x] 2. Asignación: columna "Día reservado" en Pendientes.
- [x] 3. Modal: día elegido por el cliente, día + hora separados, precarga, avisos (día distinto, día
      pasado), reprogramar sin precarga.
- [x] 4. Detalle de la orden: "Día reservado".
- [x] 5. Verificación: `pnpm build`, `pnpm lint`.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0006-dia-reservado/`

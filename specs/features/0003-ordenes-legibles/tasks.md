---
feature: 0003-ordenes-legibles
plan: ./plan.md
---

# Tasks — Órdenes legibles: quién, cuándo y filtros útiles

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios.

## Frontend (paku-admin)
- [x] 1. `lib/dates.ts` (día en hora de Lima, sumar días, semana lunes–domingo) y color de etiqueta de
      pago en `lib/labels.ts`.
- [x] 2. Capa API: `listOrdersFiltered` en `lib/services/orders.ts`; `listClients` en
      `lib/services/users.ts`.
- [x] 3. Órdenes: filtros desde la URL (`useSearchParams` dentro de `Suspense`, `router.replace`),
      filtros al momento, búsqueda con espera.
- [x] 4. Órdenes: columnas Cliente, Pago y Groomer por nombre; etiqueta "Cargo extra"; orden por hora
      con filtro de fecha; contador y "Limpiar filtros".
- [x] 5. Verificación: `pnpm build`, `pnpm lint`, Playwright según el plan.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0003-ordenes-legibles/`

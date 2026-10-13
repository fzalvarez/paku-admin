---
feature: 0007-precios-por-pelaje
plan: ./plan.md
---

# Tasks — Precios por tipo de pelaje

## Backend
- [x] C-25 (`paku-backend` master `f6eac54`): categoría por pelaje con respaldo mestizo, tabla
      completa, configuración y simulador.

## Frontend (paku-admin)
- [x] 1. `lib/services/pricing.ts`.
- [x] 2. `PriceMatrixEditor`.
- [x] 3. `PriceComparison`.
- [x] 4. `PriceSimulator`.
- [x] 5. Página `precios` y botones "Precios" redirigidos; `PriceRulesPanel` eliminado.
- [x] 6. Verificación: `pnpm lint`, `pnpm build`.
- [x] 7. Prueba en navegador con C-25 desplegado.

## Después (negocio)
- [x] Cargar las tablas de Premium, Express y adicionales; desactivar las reglas official/otros
      (2026-10-12, propuesta inicial: Express = Clásico − S/20, Premium = Clásico +30 %, Corte de uñas
      S/15 hasta 25 kg y S/20 desde ahí; el negocio la ajusta en la pantalla).

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0007-precios-por-pelaje/`

---
feature: 0004-campana-avisos
plan: ./plan.md
---

# Tasks — Campana de avisos

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios (pedido `POST /notifications/read-all` anotado en `status.md`).

## Frontend (paku-admin)
- [x] 1. Capa API `lib/services/notifications.ts` (contador, lista, marcar leído, marcar todos,
      destino de cada aviso).
- [x] 2. `components/dashboard/NotificationBell.tsx`: contador con sondeo de 2 min solo con la pestaña
      visible y al volver; lista al abrir; marcar leído y navegar; marcar todo.
- [x] 3. Barra superior con la campana.
- [x] 4. Órdenes: detalle abierto en la URL (`?ver=<id>`).
- [x] 5. Verificación: `pnpm build`, `pnpm lint`, Playwright según el plan.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0004-campana-avisos/`

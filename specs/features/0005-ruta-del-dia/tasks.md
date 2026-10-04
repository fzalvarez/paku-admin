---
feature: 0005-ruta-del-dia
plan: ./plan.md
---

# Tasks — Ruta del día

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios.

## Frontend (paku-admin)
- [x] 1. `lib/maps.ts` (enlace a un punto y a la ruta) y `lib/services/tracking.ts` (última ubicación).
- [x] 2. Página `app/dashboard/ruta/page.tsx`: día y groomer en la URL, navegación de días, resumen,
      paradas con detalle, enlaces a mapa y ruta, ubicación del groomer, vacío.
- [x] 3. Menú: "Ruta del día" en Operaciones.
- [x] 4. Asignación: `?reprogramar=<id>` también para órdenes pendientes ("Cambiar hora").
- [x] 5. Verificación: `pnpm build`, `pnpm lint`, Playwright según el plan.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0005-ruta-del-dia/`

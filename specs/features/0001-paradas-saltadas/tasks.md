---
feature: 0001-paradas-saltadas
plan: ./plan.md
---

# Tasks — Paradas saltadas: ver, reprogramar y cancelar

Orden de ejecución. Cada tarea es verificable y cabe en un commit.

## Backend
- [x] Sin cambios (usa C-10, C-13, C-15).

## Frontend (paku-admin)
- [x] 1. Capa API `lib/services/orders.ts` (listar por estado, detalle de parada, asignar, cancelar) y
      tipos de parada en `lib/orders.ts`.
- [x] 2. Asignación: cargar `skipped` junto a `created`/`accepted`; grupo **Saltadas** con motivo, nota,
      hora del salto, groomer y fecha anteriores, total, mascota y cliente con teléfono.
- [x] 3. Reprogramar: modo del formulario con resumen del salto, groomer anterior, fecha futura
      obligatoria y aviso de cupo; abrir directo con `?reprogramar=<id>`.
- [x] 4. Cancelar saltada con confirmación "el cobro no se devuelve".
- [x] 5. Pendientes: etiqueta "Saltada antes" con el motivo.
- [x] 6. Órdenes: motivo bajo el estado y botón **Reprogramar** en filas saltadas.
- [x] 7. Verificación: `pnpm build`, `pnpm lint`, recorrido con Playwright sobre `df17f50c`.

## Cierre
- [x] Spec a estado `done`
- [x] Índice de `specs/README.md` y `status.md` actualizados
- [x] Commit referencia `specs/features/0001-paradas-saltadas/`

---
feature: 0007-precios-por-pelaje
spec: ./spec.md
---

# Plan — Precios por tipo de pelaje

## Datos (C-25)

- `GET /admin/store/price-config`: filas (`categories`, la última es `mestizo`), `fallback_category`,
  `weight_tiers`.
- `GET /admin/store/price-rules?target_id=`: reglas (se filtran las activas). Una regla entra en la
  tabla si su categoría es válida y su rango coincide con un tramo; si no, queda "fuera de la tabla".
- `PUT /admin/store/price-matrix/{target_id}` `{target_type, cells}`: reemplaza las reglas activas.
- `PATCH /admin/store/price-rules/{id}` `{is_active:false}`: desactivar una regla suelta.
- `GET /admin/store/price-simulation?category_id=&weight=&species=&breed_id=`.

## Cambios

- `lib/services/pricing.ts`: tipos, llamadas y conversión reglas ↔ tabla.
- `components/pricing/PriceMatrixEditor.tsx`: tabla editable, alertas, copiar/ajustar %, guardar.
- `components/pricing/PriceComparison.tsx`: comparación con respaldo y detección de cruces.
- `components/pricing/PriceSimulator.tsx`: raza + peso → precios.
- `app/dashboard/tienda/[categoryId]/precios/page.tsx`: pestañas (`?tab=`), selector de producto o
  adicional (`?target=`), `Suspense` por `useSearchParams`.
- `app/dashboard/tienda/[categoryId]/page.tsx`: botones "Precios" → nueva página; se eliminan
  `PriceRulesPanel` y helpers que solo usaba él (un solo flujo).

## Verificación

- `pnpm lint`, `pnpm build`.
- En navegador con C-25 desplegado: cargar la tabla de Clásico, guardar, comparar y simular.

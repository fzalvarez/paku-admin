---
feature: 0006-dia-reservado
spec: ./spec.md
---

# Plan — Día reservado por el cliente al asignar

## Datos

- Día reservado = `reserved_date` (si el backend lo agrega, C-21) o, si no,
  `items_snapshot[kind="service_base"].meta.scheduled_date` ("YYYY-MM-DD"). Ya viene en `OrderOut`
  (listados y `/admin/orders/{id}`): no hace falta otra llamada.
- `meta.scheduled_time` **no** se muestra: la app de clientes manda un valor de relleno porque el
  carrito lo exige, el cliente no elige hora.

## Cambios

- `lib/orders.ts`: `reservedDate(order)` y `fmtYmd(ymd)` ("jue 08/10/2026"); `reserved_date?` en `Order`.
- `app/dashboard/asignaciones/page.tsx`:
  - Columna "Día reservado" en Pendientes.
  - Modal: línea "Día elegido por el cliente"; `datetime-local` se reemplaza por `date` + `time`.
    Al abrir: día = reservado (si no es reprogramación y no pasó), hora vacía.
  - Aviso (ámbar) si el día elegido ≠ reservado; aviso si el reservado ya pasó.
  - El envío arma `scheduled_at` igual que antes (hora local del navegador → ISO).
- `components/orders/OrderDetailSheet.tsx`: campo "Día reservado" en Resumen.

## Verificación

- `pnpm build` y `pnpm lint` sin problemas.
- En el navegador contra el backend de desarrollo: una orden creada desde la app de clientes muestra el
  día reservado en la tabla, el detalle y el modal; asignar solo con hora deja `scheduled_at` en ese día.

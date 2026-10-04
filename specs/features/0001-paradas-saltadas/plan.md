---
feature: 0001-paradas-saltadas
spec: ./spec.md
---

# Plan — Paradas saltadas: ver, reprogramar y cancelar

## Enfoque

Todo en el admin, sin cambios de backend. La pantalla de Asignación pasa a tener dos grupos: arriba
**Saltadas** (cuando hay) y debajo **Pendientes**. Reprogramar reutiliza el formulario de asignar, que
el backend ya interpreta como reprogramación cuando la orden está `skipped`. Para mostrar mascota y
contacto del cliente se usa el detalle de parada que ya devuelve el backend para el groomer y que
también acepta admin.

Descartado: una pantalla nueva "Saltadas". Con un solo groomer y pocas órdenes, el admin resuelve todo
en Asignación; otra entrada de menú sería ruido.

## Cambios por repo

### paku-backend
- Ninguno. Usa C-10 (detalle de parada), C-13 (skip / reprogramar / cancelar) y C-15 (cupos).

### paku-admin
- **Capa API** — nuevo `lib/services/orders.ts`:
  - `listOrders(status)` → `GET /admin/orders?status=`.
  - `getStopDetail(id)` → `GET /orders/my-assignments/{id}` (admin permitido) con `pet`, `client`, `service`.
  - `assignOrder(id, { groomer_id, scheduled_at, notes })` → `POST /admin/orders/{id}/assign`.
  - `cancelOrder(id)` → `POST /admin/orders/{id}/cancel`.
  - Tipos `StopPet`, `StopClient`, `StopService`, `StopDetail` en `lib/orders.ts`.
- **Asignación** (`app/dashboard/asignaciones/page.tsx`):
  - Cargar `created`, `accepted` y `skipped` en paralelo (el backend filtra un estado por llamada).
  - Grupo **Saltadas** (tarjeta destacada): por orden, motivo (`SKIP_REASON_LABELS`), nota, hora del
    salto, groomer anterior, fecha anterior, total; mascota y cliente + teléfono (`tel:`) traídos con
    `getStopDetail` solo para las saltadas (pocas). Acciones: **Reprogramar** (principal) y
    **Cancelar** (secundaria).
  - Formulario de asignar en modo reprogramar: título "Reprogramar parada", resumen del salto arriba,
    groomer anterior preseleccionado (ya ocurre hoy), fecha con `min` = ahora y validación de fecha
    futura, aviso "No toma un cupo de la fecha nueva; revisa Fechas si hace falta".
  - Cancelar: `confirm` con "El cobro no se devuelve. Si el cliente quiere el servicio, reprográmala."
  - Pendientes: si la orden tiene `skip_reason` (fue saltada y reprogramada), etiqueta
    "Saltada antes" con el motivo en `title`.
  - Grupo vacío: si no hay saltadas, no se muestra la tarjeta.
  - Abrir directo el formulario con `?reprogramar=<id>` (leído en un efecto con
    `window.location.search` para no exigir `Suspense` por `useSearchParams`).
- **Órdenes** (`app/dashboard/ordenes/page.tsx`):
  - En filas `skipped`: motivo bajo el estado y botón **Reprogramar** → `/dashboard/asignaciones?reprogramar=<id>`.
- **Textos**: `SKIP_REASON_LABELS` ya existe en `lib/labels.ts`.

## Contrato

Sin cambios. Lo que se consume:

| Endpoint | Uso | Notas |
|---|---|---|
| `GET /admin/orders?status=skipped` | Lista de saltadas | `OrderOut` con `skip_reason`, `skip_note`, `skipped_at` |
| `GET /orders/my-assignments/{id}` | Mascota, cliente, servicio | Admin permitido (verificado 2026-10-04) |
| `POST /admin/orders/{id}/assign` | Reprogramar | Sobre `skipped` → `created`, reinicia pasos, conserva `skip_*`, no toma cupo |
| `POST /admin/orders/{id}/cancel` | Cancelar | Acepta `skipped`; sin devolución |

Errores: `assign_invalid` (409, orden cancelada o terminada) y `cancel_invalid` (409) llegan con texto
en español; el parser los muestra.

## Migraciones de datos

Ninguna.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Una llamada de detalle por saltada (N+1) | Solo para saltadas, que son pocas; en paralelo; si falla, la fila se muestra sin mascota/cliente |
| `datetime-local` usa la hora del navegador | El admin opera en Lima; se envía en ISO (UTC) como hoy |
| El backend en línea no tiene C-15 | No afecta: la reprogramación y la cancelación de saltadas ya existen (C-13) |
| La página de Asignación crece | Se separa el grupo Saltadas en un componente propio dentro de la misma página |

## Rompe clientes

- [ ] paku-web — impacto: ninguno.
- [ ] paku-admin — impacto: solo cambia Asignación y Órdenes.
- [ ] paku-vet-dev — impacto: ninguno.

## Tests

El admin no tiene tests automatizados. Verificación:
- `pnpm build` y `pnpm lint` sin problemas nuevos.
- Recorrido con Playwright contra el backend en línea usando `df17f50c` (saltada): ver el grupo,
  mascota y cliente; reprogramar con fecha pasada (rechazo) y futura (pasa a Asignada con
  "Saltada antes"); abrir y descartar la confirmación de cancelar (sin cancelar); acceso desde Órdenes.

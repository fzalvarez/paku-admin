---
feature: 0004-campana-avisos
spec: ./spec.md
---

# Plan — Campana de avisos

## Enfoque

Un componente de campana en la barra superior (ya presente en todas las pantallas del dashboard).
Solo el **contador** se consulta periódicamente (`GET /notifications/unread-count`, respuesta mínima):
cada 2 min si `document.visibilityState === "visible"`, y de inmediato al volver a la pestaña
(`visibilitychange`). La **lista** se pide solo al abrir la campana.

Para abrir el detalle de una orden desde un aviso, Órdenes pasa a guardar la orden abierta en la URL
(`?ver=<id>`), igual que sus filtros: el aviso navega a `/dashboard/ordenes?ver=<id>`. De paso, el
detalle abierto queda en la dirección (se puede recargar o compartir).

Descartado: consultar la lista completa cada 2 min (más datos sin necesidad) y WebSocket/SSE (no
existe en el backend; push queda para más adelante).

## Cambios por repo

### paku-backend
- Ninguno. Pedido anotado en `status.md`: `POST /notifications/read-all`.

### paku-admin
- **Capa API** — nuevo `lib/services/notifications.ts`:
  - `getUnreadCount()` → `GET /notifications/unread-count` → número.
  - `listNotifications(limit = 20)` → `GET /notifications?limit=`.
  - `markRead(id)` → `POST /notifications/{id}/read`.
  - `markAllRead(items)` → `markRead` en paralelo para los no leídos de la lista (hasta 20).
  - Tipo `AdminNotification` (`id`, `type`, `title`, `body`, `data`, `is_read`, `created_at`).
  - `noticeTarget(n)` → a dónde lleva un aviso: `data.skip_reason` o `data.status === "skipped"` →
    `/dashboard/asignaciones`; otro con `data.order_id` → `/dashboard/ordenes?ver=<order_id>`;
    sin orden → ninguno (solo se marca leído).
- **Componente** — nuevo `components/dashboard/NotificationBell.tsx`:
  - Botón con ícono `Bell` (lucide) y globo con el número (`9+`); `aria-label` con el número.
  - Sondeo: `setInterval` de 120 000 ms que solo consulta con la pestaña visible; listener de
    `visibilitychange` que consulta al volver; limpieza al desmontar. Errores silenciosos (sin número).
  - Al abrir (`DropdownMenu`): carga la lista; muestra título, texto y "hace X" (`Intl.RelativeTimeFormat`
    en español); no leídos con punto y fondo; "Marcar todo como leído"; "No tienes avisos".
  - Tocar un aviso: `markRead` (optimista: baja el contador) y `router.push(noticeTarget)`.
- **Barra superior** (`app/dashboard/topbar.tsx`): la campana antes del cambio de tema.
- **Órdenes** (`app/dashboard/ordenes/page.tsx`): el panel de detalle se abre con `?ver=<id>`
  (`setParams({ ver })` al abrir, se borra al cerrar), en vez de un estado local.

## Contrato

Sin cambios.

| Endpoint | Uso |
|---|---|
| `GET /notifications/unread-count` | Contador cada 2 min (pestaña visible) → `{ unread_count }` |
| `GET /notifications?limit=20` | Lista al abrir la campana |
| `POST /notifications/{id}/read` | Marcar leído (204) |

## Migraciones de datos

Ninguna.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Carga al servidor | Solo el contador, cada 2 min, solo con la pestaña visible; la lista solo al abrir |
| Varias pestañas abiertas consultan cada una | Solo la visible consulta; las ocultas no |
| Sesión vencida durante el sondeo | `apiFetch` ya renueva el token; si falla, el contador desaparece hasta la siguiente vuelta |
| Avisos sin `order_id` u otros tipos futuros | Se muestran y se marcan leídos; sin navegación |

## Rompe clientes

- [ ] paku-web — impacto: ninguno.
- [ ] paku-admin — impacto: agrega la campana; Órdenes suma `?ver=` a la URL.
- [ ] paku-vet-dev — impacto: ninguno.

## Tests

Sin tests automatizados. Verificación:
- `pnpm build` y `pnpm lint` sin problemas nuevos.
- Playwright: contador con el aviso real de `df17f50c`; con la pestaña oculta no hay llamadas a
  `unread-count` y al volver hay una; abrir la lista; tocar el aviso → marcado leído y va a Asignación;
  `?ver=<id>` en Órdenes abre el detalle y al cerrarlo se borra.

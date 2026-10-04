---
feature: 0005-ruta-del-dia
spec: ./spec.md
---

# Plan — Ruta del día

## Enfoque

Página nueva `/dashboard/ruta`. El backend no ofrece "ruta del día" al admin (`/orders/my-assignments`
es solo para el groomer), así que se arma en el navegador: órdenes del groomer
(`GET /admin/orders?groomer_id=`) → las de ese día en hora de Lima, sin canceladas, por hora → detalle
de cada parada en paralelo (`GET /orders/my-assignments/{id}`, admin permitido). Son pocas por día.

El día (y el groomer, si hay más de uno) viven en la URL como en Órdenes. El enlace de ruta usa la URL
pública de Google Maps (`/maps/dir/?api=1`), sin API key ni costo.

## Cambios por repo

### paku-backend
- Ninguno. Pedido anotado: `GET /admin/orders?date=` (ya estaba) o una ruta del día para admin.

### paku-admin
- **Menú** (`app/dashboard/nav-config.ts`): "Ruta del día" (ícono `Route`) en Operaciones, después
  de Asignación.
- **Capa API**:
  - `lib/services/tracking.ts`: `getGroomerLocation(orderId)` → `GET /tracking/orders/{id}/current`
    (`groomer_location`, `staleness_seconds`).
  - Reusa `listOrdersFiltered`, `getStopDetail`, `listGroomers`, `getDistrictName`.
- **Mapas** — `lib/maps.ts`: `placeUrl(lat, lng)` y `routeUrl(points)` (destino = última, waypoints =
  intermedias; Google acepta hasta 9 intermedias: con más de 10 paradas pendientes se abre la ruta de
  las primeras 10 y se avisa).
- **Página** `app/dashboard/ruta/page.tsx` (`Suspense` + `useSearchParams`):
  - Parámetros `dia` (YYYY-MM-DD, por defecto hoy en Lima) y `groomer` (por defecto el único/primero
    activo; selector visible solo si hay más de uno).
  - Barra: ← · Hoy · → · selector de fecha · Actualizar · "Abrir la ruta en Google Maps".
  - Resumen: total, pendientes (`created`/`accepted`), en camino, en servicio, terminadas, saltadas;
    total en PEN.
  - Paradas (componente en el mismo archivo): número de orden, hora (Lima), estado y paso, mascota
    (nombre, raza, peso), servicio + complementos, cliente + `tel:`, dirección + referencia + distrito +
    "Ver en el mapa". Acciones: Ver detalle (`OrderDetailSheet`), Reprogramar (saltadas), Cambiar hora
    (creadas/aceptadas → Asignación con el formulario abierto).
  - "¿Dónde está el groomer?": visible si hay una parada `on_the_way` o `in_service`; pide la última
    ubicación de esa parada y muestra enlace al mapa y "hace X min" (o "sin ubicación aún").
  - Vacío: "No hay paradas para este día" + enlace a Asignación.
- **Asignación** (`app/dashboard/asignaciones/page.tsx`): el enlace directo `?reprogramar=<id>` también
  abre el formulario para órdenes pendientes (hoy solo saltadas), para "Cambiar hora".

## Contrato

Sin cambios.

| Endpoint | Uso |
|---|---|
| `GET /admin/orders?groomer_id=` | Órdenes del groomer (se filtra el día en el navegador) |
| `GET /orders/my-assignments/{id}` | Mascota, cliente, servicio por parada |
| `GET /tracking/orders/{id}/current` | Última ubicación del groomer (admin permitido) |
| `GET /geo/districts/{id}` | Nombre del distrito (caché) |

## Migraciones de datos

Ninguna.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Todas las órdenes del groomer para filtrar un día | Con un groomer y poco volumen no pesa; pedido de filtro por fecha en backend ya anotado |
| Una llamada de detalle por parada | Solo las del día, en paralelo; si una falla, la parada se ve sin esos datos |
| Ruta de Google Maps limitada a 10 puntos | Aviso en pantalla cuando hay más |
| Dirección sin coordenadas | Esa parada no entra al enlace de ruta; se muestra la dirección en texto |

## Rompe clientes

- [ ] paku-web — impacto: ninguno.
- [ ] paku-admin — impacto: página y entrada de menú nuevas; Asignación amplía `?reprogramar=`.
- [ ] paku-vet-dev — impacto: ninguno.

## Tests

Sin tests automatizados. Verificación:
- `pnpm build` y `pnpm lint` sin problemas nuevos.
- Playwright contra el backend de desarrollo: hoy (vacío), 06/10 (`606a1b16` terminada, `3b144c8f`
  asignada) y 07/10 (`df17f50c`); navegación de días y URL; resumen; enlaces a mapa y ruta; Ver
  detalle; Cambiar hora abre Reasignar en Asignación.

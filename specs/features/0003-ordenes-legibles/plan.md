---
feature: 0003-ordenes-legibles
spec: ./spec.md
---

# Plan — Órdenes legibles: quién, cuándo y filtros útiles

## Enfoque

La URL es la fuente de los filtros: cada cambio de filtro reescribe la dirección
(`router.replace`, sin agregar historial ni mover el scroll) y la lista se deriva de ella. Estado y
groomer se siguen filtrando en el backend (ya lo soporta); fecha, pago y búsqueda se filtran en el
navegador sobre lo que llega. Los nombres de cliente y groomer salen de dos listas que se cargan una
vez (`/admin/users?role=user` y `?role=groomer`).

Los filtros se aplican al momento (sin botón "Aplicar"); la búsqueda espera a que el admin deje de
escribir (~300 ms). Descartado: filtrar todo en el backend — no tiene filtros de fecha, pago ni
cliente (el de fecha ya está pedido en `status.md`).

## Cambios por repo

### paku-backend
- Ninguno.

### paku-admin
- **Página** `app/dashboard/ordenes/page.tsx`:
  - `export default` envuelve la vista en `<Suspense>` (Next 16: `useSearchParams` en una página
    prerenderizada lo exige o el build falla; ver `node_modules/next/dist/docs/.../use-search-params.md`).
  - La vista lee los filtros con `useSearchParams` y los escribe con `router.replace`.
  - Parámetros: `estado`, `groomer`, `fecha` (`hoy` | `manana` | `semana` | `rango`), `desde`, `hasta`
    (YYYY-MM-DD), `pago`, `q`. Valores desconocidos se ignoran.
  - Columnas: ID · Estado · Cliente · Total · Pago · Groomer · Programada · Creada · Acciones. Etiqueta
    "Cargo extra" si la orden tiene `parent_order_id`.
  - Contador "N órdenes" y estado vacío con botón **Limpiar filtros**.
  - Orden: más recientes primero; con filtro de fecha, por `scheduled_at` ascendente.
  - Se conservan las acciones y modales actuales (Ver, Reprogramar, Cambiar estado, Cancelar,
    Registrar peso). Recargar la lista tras una acción respeta los filtros.
- **Fechas en hora de Lima** — nuevo `lib/dates.ts`:
  - `limaDate(iso)` → `YYYY-MM-DD` en `America/Lima` (`Intl.DateTimeFormat`).
  - `limaToday()`, `addDays(ymd, n)`, `weekRange(ymd)` → lunes a domingo.
  - Una orden entra en el filtro si `limaDate(scheduled_at)` está en el rango; sin `scheduled_at`, no.
- **Capa API** — `lib/services/orders.ts`: `listOrdersFiltered({ status?, groomer_id? })`;
  nuevo `listClients()` (`/admin/users?role=user`, solo `id` y nombre) en `lib/services/users.ts`.
- **Textos** — `PAYMENT_STATUS_LABELS` ya existe; se agrega su color de etiqueta en `lib/labels.ts`.

## Contrato

Sin cambios. `GET /admin/orders?status=&groomer_id=`, `GET /admin/users?role=user|groomer`.

## Migraciones de datos

Ninguna.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| `useSearchParams` sin `Suspense` rompe el build de producción | Envolver la vista; se verifica con `pnpm build` |
| Fechas: el navegador puede no estar en Lima | Todo cálculo de día usa `America/Lima` explícito |
| `/admin/users?role=user` trae todos los clientes | Hoy son pocos; si crece, pedir al backend nombres en `OrderOut` o búsqueda por IDs |
| Filtrar en el navegador no escala | Igual que hoy (la lista ya llega completa); el filtro de fecha en backend está pedido |

## Rompe clientes

- [ ] paku-web — impacto: ninguno.
- [ ] paku-admin — impacto: cambia la pantalla de Órdenes; enlaces viejos a `/dashboard/ordenes` siguen
      funcionando (sin parámetros = sin filtros).
- [ ] paku-vet-dev — impacto: ninguno.

## Tests

Sin tests automatizados. Verificación:
- `pnpm build` (confirma el `Suspense`) y `pnpm lint` sin problemas nuevos.
- Playwright contra el backend de desarrollo: nombres de cliente y groomer; cada filtro y su
  combinación; atajos Hoy/Mañana/Esta semana sobre `3b144c8f` (06/10) y `df17f50c` (07/10); búsqueda
  por "Aldo" y por ID; recargar y abrir la URL copiada conserva filtros; Limpiar filtros; abrir el
  detalle y cerrarlo conserva filtros.

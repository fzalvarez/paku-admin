---
feature: 0003-ordenes-legibles
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-04
---

# Órdenes legibles: quién, cuándo y filtros útiles

## Problema

La lista de Órdenes muestra el groomer como un código (`b2dfead2…`), no dice de quién es la orden ni
si está pagada, y el único filtro además del estado es pegar el UUID de un groomer. Para responder
"¿qué tenemos mañana?", "¿qué falta cobrar?" o "¿dónde está la orden de Fernando?" el admin tiene que
abrir orden por orden.

## Objetivo

Que la lista de Órdenes se entienda de un vistazo y se pueda acotar por fecha, pago y cliente.

## Fuera de alcance

- Vista "ruta del día" por groomer (fase 6).
- Paginación (hoy hay pocas órdenes).
- Exportar a Excel/CSV.
- Cambiar acciones de la fila (Ver, Reprogramar, Cambiar estado, Cancelar, Registrar peso).

## Comportamiento esperado

1. **Columnas:** ID corto · Estado · **Cliente** (nombre) · Total · **Pago** (estado) · Groomer
   (**nombre**) · Programada · Creada · Acciones. Una orden de cargo extra por peso se marca como tal.
2. **Filtro de groomer:** una lista con los nombres de los groomers (más "Todos"), en vez de pegar el
   UUID.
3. **Filtro de fecha programada:** atajos **Hoy**, **Mañana**, **Esta semana** y un rango desde/hasta.
   Las órdenes sin fecha programada solo aparecen cuando no hay filtro de fecha.
4. **Filtro de pago:** Todos · Pagado · Pendiente · Verificando · Fallido.
5. **Buscar:** un campo de texto que encuentra por nombre del cliente o por ID corto.
6. **Orden:** por defecto, las más recientes primero (como hoy). Con un filtro de fecha activo, por
   hora programada (la primera del día arriba).
7. **Contador:** "N órdenes" según los filtros activos.
8. **Dado** que no hay resultados, **entonces** dice "No hay órdenes con estos filtros" y ofrece
   limpiarlos.
9. **Dado** un filtro aplicado, **cuando** el admin abre el detalle o cambia un estado, **entonces** la
   lista vuelve con los mismos filtros.
10. **Dado** una lista filtrada, **cuando** el admin recarga la página o abre un enlace guardado con esos
    filtros, **entonces** ve la misma lista filtrada.

## Criterios de aceptación

- [x] Cliente y groomer se ven por nombre; el pago, por estado en español.
- [x] Los cargos extra por peso se distinguen.
- [x] Filtros de groomer (lista), fecha (atajos y rango), pago y búsqueda funcionan juntos.
- [x] Con filtro de fecha, orden por hora programada.
- [x] Contador y estado vacío con "Limpiar filtros".
- [x] Probado contra el backend de desarrollo.

## Impacto en el dominio

Ninguno.

## Preguntas abiertas

- [x] **Semana:** "Esta semana" = de lunes a domingo de la semana actual, hora de Lima (owner, 2026-10-04).
- [x] **Filtros en la URL:** sí (owner, 2026-10-04). Los filtros quedan en la dirección: sobreviven a
      recargar y se pueden guardar o compartir.
- [x] **Groomer con un solo groomer:** el filtro queda visible, pero la pantalla se diseña para operar
      con un solo groomer (owner, 2026-10-04).

## Verificación (2026-10-04)

Playwright contra el backend de desarrollo (hoy = domingo 04/10 en Lima):
- Cliente, pago y groomer por nombre; 17 órdenes sin filtros.
- Hoy / Mañana / Esta semana (28/09–04/10): 0, con "No hay órdenes con estos filtros" y Limpiar.
- Rango 06–07/10: `606a1b16`, `3b144c8f`, `df17f50c` ordenadas por hora; + Pagado + Creada: 2.
- Recargar, abrir y cerrar el detalle, y abrir el enlace guardado conservan los filtros; parámetros
  inválidos se ignoran.
- Buscar "Aldo" (4) y "df17" (1); filtro de groomer por nombre (backend).
- Diseño: a 1280 px y 1500 px la página no se desborda. Para que la fila quepa, Cambiar estado,
  Registrar peso y Cancelar orden pasaron a un menú ⋯; la columna Creada se muestra solo en pantallas
  muy anchas (sigue en el detalle). El layout del dashboard ganó `min-w-0` para que las tablas anchas
  hagan scroll dentro de su tarjeta.

---
feature: 0001-paradas-saltadas
estado: draft   # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-04
---

# Paradas saltadas: ver, reprogramar y cancelar

## Problema

El groomer puede saltar una parada cuando la mascota o el tutor no están, o por otro motivo. La orden
queda **Saltada** con el motivo, una nota opcional y la hora del salto. El backend avisa a los admins,
pero el admin web no muestra esos avisos ni tiene un lugar para ver las paradas saltadas. Resultado: el
cliente pagó, se quedó sin servicio y nadie lo resuelve.

Hoy la única pista es el filtro "Saltada" de Órdenes, que muestra el estado sin el motivo y sin forma
de resolverla. Asignación solo lista las órdenes creadas.

## Objetivo

El admin ve todas las paradas saltadas con su motivo y datos de contacto del cliente, y resuelve cada
una reprogramándola o cancelándola.

## Fuera de alcance

- Devolver el pago o generar crédito a favor (no existe en el backend; ver "Pedidos al backend" en
  `status.md`).
- Solicitud de reprogramación hecha por el cliente desde la app (no existe en el backend).
- Campana de avisos (fase 5), ruta del día (fase 6) y detalle completo de la orden (fase 3).
- Que el admin salte una parada en nombre del groomer.

## Comportamiento esperado

1. **Dado** que hay órdenes saltadas, **cuando** el admin abre Asignación, **entonces** las ve en un
   grupo propio "Saltadas", separado de las pendientes, con: motivo en español, nota del groomer,
   cuándo se saltó, groomer que la tenía, fecha que tenía programada, total, nombre de la mascota y
   nombre y teléfono del cliente (para coordinar la nueva fecha).
2. **Dado** una orden saltada, **cuando** el admin elige **Reprogramar**, **entonces** se le propone el
   mismo groomer que la tenía, elige la nueva fecha y hora y confirma; la orden vuelve a
   **Creada/Asignada** con ese groomer y fecha, sale del grupo "Saltadas" y aparece entre las
   asignadas. El cliente recibe la notificación de siempre. El formulario aclara que reprogramar
   **no toma un cupo** de la fecha nueva (regla del backend, C-15): el admin decide si hay lugar.
3. **Dado** el formulario de reprogramar, **cuando** la fecha elegida ya pasó, **entonces** no se
   permite guardar y se explica por qué.
4. **Dado** una orden saltada, **cuando** el admin elige **Cancelar**, **entonces** ve una confirmación
   que dice que el cobro **no** se devuelve automáticamente; si confirma, la orden queda **Cancelada**
   y sale del grupo. (El cupo del día ya se liberó cuando el groomer saltó la parada.)
5. **Dado** una orden reprogramada después de un salto, **cuando** el admin la ve entre las asignadas,
   **entonces** sigue viendo que se saltó antes y por qué (el backend conserva el motivo).
6. **Dado** que no hay órdenes saltadas, **cuando** el admin abre Asignación, **entonces** el grupo
   "Saltadas" no ocupa espacio o muestra que no hay ninguna.
7. **Dado** una orden saltada en Órdenes, **cuando** el admin la ve, **entonces** tiene un acceso para
   reprogramarla que lo lleva a Asignación.

## Criterios de aceptación

- [ ] Las órdenes saltadas aparecen en Asignación, en su propio grupo, con motivo, nota, hora del
      salto, groomer anterior, fecha anterior, mascota y contacto del cliente.
- [ ] Reprogramar propone al groomer anterior, exige fecha futura y deja la orden asignada.
- [ ] Cancelar pide confirmación avisando que no hay devolución automática.
- [ ] Una orden reprogramada muestra que fue saltada antes, con el motivo.
- [ ] Desde Órdenes se llega a reprogramar una orden saltada.
- [ ] Probado con una orden saltada real en el backend de desarrollo.

## Impacto en el dominio

Ninguno: usa el estado `skipped`, la reprogramación y las reglas de cupo que ya define el backend
(C-13 y C-15 en `paku-backend/docs/cambios-api-para-front.md`). Con C-15, saltar una parada **libera
el cupo** de ese día, cancelar también, y reprogramar **no toma** cupo de la fecha nueva.

## Preguntas abiertas

- [x] **Cupos del día:** resuelto por el backend (C-15): reprogramar no toma cupo; el admin asigna la
      fecha a mano. El formulario lo aclara.
- [x] **Mismo groomer por defecto:** sí (owner, 2026-10-04). Los primeros 6 meses de operación hay un
      solo groomer, así que se propone el que tenía la orden; el admin puede cambiarlo.
- [ ] **Cancelar sin devolución:** hasta que exista el crédito a favor, ¿basta con avisarlo en la
      confirmación, o cancelar una saltada pagada debe quedar bloqueado?
- [ ] **Prueba:** para probarlo hace falta una orden saltada. Se puede saltar con la app Groomer sobre
      `df17f50c` (en camino). ¿La usamos para esto?

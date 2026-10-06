---
feature: 0006-dia-reservado
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-05
---

# Día reservado por el cliente al asignar

## Problema

El cliente elige el **día** del servicio al comprar: la app reserva el cupo de ese día (C-15) y el
backend guarda la fecha en el servicio base de la orden (`items_snapshot[service_base].meta.scheduled_date`;
la orden trae además `hold_id`). La **hora** no la elige el cliente: la define el admin al asignar,
porque ordena la ruta del groomer (`scheduled_at`).

Hoy el admin no ve ese día en ningún lado: ni en Asignación, ni en el modal de asignar, ni en el
detalle de la orden. El modal pide "Fecha programada" con un campo vacío, así que el admin escribe una
fecha a ciegas. Si pone otro día, el servicio queda en una fecha y el cupo reservado en otra.

## Objetivo

El admin ve el día que reservó el cliente y, al asignar, solo elige la hora (y el groomer).

## Fuera de alcance

- Validar en el backend que el día asignado sea el reservado, exponer `reserved_date` en `OrderOut` y
  hacer opcional `meta.scheduled_time` (pedido C-21 al backend).
- Mover el cupo al cambiar el día de una orden.

## Comportamiento esperado

1. **Dado** una orden con día reservado, **cuando** el admin la ve en Asignación (pendientes), **entonces**
   ve el día reservado en su propia columna.
2. **Dado** el detalle de una orden, **cuando** el admin lo abre, **entonces** ve "Día reservado"
   además de "Programada".
3. **Dado** una orden pendiente con día reservado, **cuando** el admin abre Asignar, **entonces** ve
   "Día elegido por el cliente", el día ya viene puesto y solo tiene que elegir la hora.
4. **Dado** el formulario, **cuando** el admin cambia el día a uno distinto del reservado, **entonces**
   ve un aviso: el cliente reservó otro día y el cupo sigue en ese día.
5. **Dado** una orden saltada (reprogramar), **cuando** el admin abre el formulario, **entonces** el día
   no viene puesto (la reprogramación es a una fecha nueva) y ve el día que tenía reservado.
6. **Dado** una orden sin día reservado (órdenes viejas), **cuando** el admin asigna, **entonces** el
   formulario funciona como antes: elige día y hora.
7. **Dado** que el día reservado ya pasó, **cuando** el admin abre Asignar, **entonces** el día no viene
   puesto y se le avisa que el día reservado ya pasó.

## Criterios de aceptación

- [x] Columna "Día reservado" en Pendientes de Asignación.
- [x] "Día reservado" en el detalle de la orden.
- [x] Modal: día reservado visible y precargado; día y hora en campos separados.
- [x] Aviso al cambiar el día respecto del reservado.
- [x] Reprogramar no precarga el día.
- [x] Si el backend agrega `reserved_date` a `OrderOut` (C-21), se usa ese campo primero.

---
feature: 0005-ruta-del-dia
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-04
---

# Ruta del día

## Problema

El orden de las paradas del groomer lo define el admin con la hora programada de cada orden, pero el
admin no tiene una vista del día: para saber qué le toca al groomer, en qué orden, dónde y cómo va,
tiene que filtrar Órdenes y abrir orden por orden. Con un solo groomer (los primeros 6 meses), esa
vista es el tablero de operación diaria.

## Objetivo

Una pantalla que muestre la ruta de un día: las paradas en orden, a dónde ir, a quién atender y cómo
va cada una.

## Fuera de alcance

- Reordenar paradas arrastrando o cambiar horas desde esta pantalla (ver preguntas).
- Mapa dentro del admin y cálculo de tiempos de viaje.
- Seguimiento en vivo continuo del groomer (solo su última ubicación al pedirla).
- Imprimir o exportar la hoja de ruta.

## Comportamiento esperado

1. **Dado** el menú, **cuando** el admin abre **Ruta del día**, **entonces** ve la ruta de **hoy** (hora de
   Lima) del groomer (con uno solo, ya elegido).
2. **Navegación de días:** botones ← día anterior · Hoy · día siguiente → y un selector de fecha. El día
   queda en la URL (se puede recargar o compartir).
3. **Resumen del día:** número de paradas y cuántas están pendientes, en camino, en servicio,
   terminadas y saltadas; total del día.
4. **Paradas en orden de hora:** por cada una, hora, estado (y paso actual si está en servicio),
   mascota (nombre, raza, peso), servicio y complementos, cliente con teléfono, dirección con
   referencia y distrito, y enlace al mapa. Las canceladas no aparecen; las saltadas sí, marcadas.
5. **Abrir en el mapa toda la ruta:** un enlace que abre Google Maps con las paradas pendientes del día
   en orden (sin costo de API).
6. **Dado** una parada, **cuando** el admin la toca, **entonces** se abre el detalle de la orden (el mismo
   panel de Órdenes).
7. **Dado** una parada saltada, **entonces** tiene acceso a **Reprogramar**.
8. **Dónde está el groomer:** con una parada en camino o en servicio, el admin puede pedir la última
   ubicación conocida del groomer y abrirla en el mapa, con "hace cuánto" se reportó.
9. **Dado** que el día no tiene paradas, **entonces** lo dice y ofrece ir a Asignación.
10. **Actualizar:** un botón para recargar la ruta (sin recarga automática).

## Criterios de aceptación

- [x] Entrada "Ruta del día" en el menú (Operaciones).
- [x] Día por defecto hoy en Lima; navegación anterior/siguiente/Hoy/fecha; día en la URL.
- [x] Resumen del día y paradas en orden de hora con mascota, servicio, cliente, dirección y estado.
- [x] Enlace a Google Maps con la ruta del día y por parada.
- [x] Tocar una parada abre su detalle; las saltadas ofrecen Reprogramar.
- [ ] Última ubicación del groomer cuando hay una parada en curso.
- [x] Probado contra el backend de desarrollo con 06/10 (`3b144c8f`, `606a1b16`) y 07/10 (`df17f50c`).

## Impacto en el dominio

Ninguno. Lee órdenes, detalle de parada y la ubicación que ya expone el backend.

## Preguntas abiertas

- [x] **Cambiar el orden o la hora:** hoy se hace en Asignación con Reasignar (cada cambio le avisa al
      cliente). ¿Basta con un acceso "Cambiar hora" que lleve ahí, o quieres reordenar desde esta
      pantalla (sería otra feature, porque mover una parada cambia horas y notifica clientes)? → Acceso
      "Cambiar hora" que abre Reasignar en Asignación (owner aprobó la propuesta, 2026-10-04).
- [x] **Hora de salida y fin del día:** ¿hay una hora de inicio de jornada o una dirección de partida de
      la van que deba ser el punto de inicio de la ruta en el mapa? Si no, la ruta empieza en la
      primera parada. → Sin punto fijo: la ruta empieza en la primera parada (2026-10-04).
- [x] **Paradas terminadas en el enlace del mapa:** propuesta, el enlace "ruta completa" incluye solo
      las paradas **pendientes** (no terminadas ni saltadas). Aprobado (2026-10-04).

## Verificación (2026-10-04)

Playwright contra el backend de desarrollo:
- Menú → Ruta del día: hoy (domingo 04/10) sin paradas, con enlace a Asignación; ← · Hoy · → y el día
  en la URL (recargar lo conserva).
- 06/10: 2 paradas (`606a1b16` terminada, `3b144c8f` creada), resumen y total 174 PEN; dirección con
  distrito y referencia; "Abrir la ruta en Google Maps" solo con la pendiente; Ver detalle abre el
  panel; Cambiar hora abre "Asignar orden" en Asignación.
- 07/10: `df17f50c` con mascota (Max, Basset Hound, 24 kg).
- Agregado al probar: aviso "Misma hora que la parada N" (el 06/10 hay dos paradas a las 10:00; un
  solo groomer no puede cumplirlas).
- **No probado con datos:** "¿Dónde está el groomer?" (necesita una parada en camino o en servicio con
  ubicación reportada desde la app Groomer).

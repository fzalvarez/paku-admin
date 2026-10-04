---
feature: 0002-detalle-orden
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-04
---

# Detalle de orden

## Problema

En Órdenes el admin solo ve ID, estado, total, groomer y fechas. Para saber a quién atender, qué
mascota, qué servicio y complementos, dónde, cómo va el servicio o qué pasó, no tiene dónde mirar:
tiene que preguntarle al groomer o al cliente. El backend ya registra todo eso (pasos del servicio,
complementos realizados, fotos, avisos de demora, salto de parada), pero el admin no lo muestra.

## Objetivo

Desde Órdenes, el admin abre el detalle de cualquier orden y ve en un solo lugar quién, qué, dónde,
cuándo y cómo va o cómo terminó. Solo lectura.

## Fuera de alcance

- Acciones dentro del detalle (cambiar estado, cancelar, reprogramar siguen donde están).
- Mapa en vivo del groomer (tracking) y chat.
- Editar datos de la orden, la mascota o el cliente.
- Subir o borrar fotos.

## Comportamiento esperado

1. **Dado** una orden en Órdenes, **cuando** el admin elige **Ver**, **entonces** se abre un panel
   lateral con el detalle, sin salir de la lista.
2. **Resumen:** estado, pago (estado y medio), total, creada, programada, groomer (nombre) e ID
   completo copiable.
3. **Cliente y dirección:** nombre, teléfono (se puede llamar), dirección (línea, número, depto,
   referencia, distrito) y un enlace para abrirla en un mapa.
4. **Mascota:** nombre, especie, raza, peso, notas y datos útiles para el servicio (piel sensible,
   comportamiento en el baño, tolera secado y corte de uñas, shampoo especial).
5. **Servicio:** servicio base y complementos con su precio; cada complemento indica si el groomer ya
   lo marcó como realizado y a qué hora.
6. **Progreso:** los cinco pasos (Recepción y recojo → Baño → Secado → Corte y acabado → Devolución)
   con la hora en que empezó cada uno y cuál es el actual. Si la orden se cerró a mano sin pasos, se
   ve que no hubo pasos registrados.
7. **Fotos:** las fotos de la orden agrupadas por tipo (inicial, final, incidente) con su nota y hora;
   al tocar una se ve en grande.
8. **Demoras:** cada aviso con minutos, nota y hora.
9. **Salto:** si la orden se saltó (ahora o antes de reprogramarse), motivo, nota y hora.
10. **Cargo extra por peso:** si la orden es un ajuste, a qué orden pertenece; si tiene ajustes, cuáles
    y su estado de pago.
11. **Dado** que una sección no tiene datos (sin fotos, sin demoras), **entonces** lo dice en una línea
    en vez de ocupar espacio; si un bloque no se pudo cargar, el resto del detalle se ve igual.
12. **Dado** el detalle abierto, **cuando** el admin vuelve a la lista, **entonces** la lista conserva
    sus filtros.

## Criterios de aceptación

- [x] Botón **Ver** en cada fila de Órdenes abre el detalle en un panel lateral.
- [x] Se ven resumen, cliente y dirección (con enlace a mapa), mascota, servicio con precios y
      complementos realizados, progreso de pasos, fotos, demoras, salto y ajustes, cuando existan.
- [x] Todo en español; estados, pasos, motivos y tipos de foto traducidos.
- [x] Una sección vacía o que falla no rompe el resto.
- [x] Probado contra el backend de desarrollo con una orden terminada, una saltada/reprogramada y
      una asignada.

## Impacto en el dominio

Ninguno. Lee lo que ya devuelve el backend (C-10 a C-14).

## Preguntas abiertas

- [x] **Desde dónde se abre:** propuesta, desde Órdenes (botón Ver) y también desde Asignación (tocando
      el ID). Aprobado (owner, 2026-10-04).
- [x] **Fotos para probar:** hoy ninguna orden tiene fotos ni demoras. Se puede probar con la vista
      vacía, o esperar a que el groomer use la app con `3b144c8f` / `df17f50c`. Aprobado: se implementa y se verifica
      con datos reales cuando existan.
- [x] **Datos sensibles:** el detalle muestra teléfono y dirección del cliente. El admin ya los ve en
      otras pantallas. Todos los admin los ven (owner, 2026-10-04).

## Verificación (2026-10-04)

Playwright contra el backend de desarrollo, desde Órdenes (Ver) y Asignación (ID):
- `606a1b16` (terminada con cierre a mano): resumen, cliente, dirección con distrito y mapa, servicio
  con precio, "Cerrada sin pasos registrados"; Copiar ID funciona.
- `df17f50c` (saltada y reprogramada): mascota Max con datos para el servicio, sección "Se saltó antes
  de reprogramarse" con motivo y nota.
- `3b144c8f` (asignada): dirección completa con referencia.
- Cerrar el panel conserva el filtro de la lista. Sin errores de página ni de API.
- **Pendiente con datos reales:** fotos, demoras, complementos realizados y pasos con hora (ninguna
  orden los tiene aún). Las mascotas de `606a1b16` y `3b144c8f` fueron eliminadas: el panel lo indica.

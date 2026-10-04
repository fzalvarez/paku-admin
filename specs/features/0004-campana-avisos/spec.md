---
feature: 0004-campana-avisos
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin]
creado: 2026-10-04
---

# Campana de avisos

## Problema

Cuando el groomer salta una parada o avisa que llega tarde, el backend le manda un aviso a cada admin,
pero la web admin no los muestra. El admin se entera tarde o no se entera, y el cliente queda sin
respuesta. Lo ideal sería push, pero no está implementado; por ahora, una campana en la web.

## Objetivo

El admin ve en todo momento cuántos avisos tiene sin leer y llega en un clic a la orden que necesita
atención, sin cargar el servidor.

## Fuera de alcance

- Notificaciones push o del navegador (ventanitas del sistema) y sonidos.
- Configurar qué avisos recibir.
- Avisos nuevos en el backend (se muestran los que ya existen: parada saltada y demora).

## Comportamiento esperado

1. **Dado** cualquier pantalla del admin, **entonces** en la barra superior hay una campana con el
   número de avisos sin leer (nada si son 0; "9+" si son más de 9).
2. **Consulta liviana:** el número se actualiza cada pocos minutos **solo mientras la pestaña está
   visible**, y al volver a la pestaña. Con la pestaña oculta no se consulta.
3. **Dado** que el admin toca la campana, **entonces** ve los últimos 20 avisos (más nuevos arriba) con
   título, texto y hace cuánto llegó; los no leídos se distinguen.
4. **Dado** un aviso de **parada saltada**, **cuando** el admin lo toca, **entonces** se marca como leído
   y va a Asignación, donde está el grupo Saltadas con el contacto del cliente.
5. **Dado** un aviso de **demora**, **cuando** el admin lo toca, **entonces** se marca como leído y se
   abre el detalle de esa orden (pasos, demoras, cliente).
6. **Dado** avisos sin leer, **cuando** el admin elige **Marcar todo como leído**, **entonces** el
   contador queda en 0.
7. **Dado** que no hay avisos, **entonces** la lista dice "No tienes avisos".
8. **Dado** que la consulta falla (red, servidor), **entonces** la campana sigue ahí sin número y lo
   reintenta en la siguiente vuelta; no muestra errores molestos.

## Criterios de aceptación

- [x] Campana con contador en la barra superior de todas las pantallas del dashboard.
- [x] Sin consultas con la pestaña oculta; consulta al volver.
- [x] Lista de los últimos 20 avisos con no leídos destacados.
- [x] Tocar un aviso lo marca leído y lleva a Asignación (salto) o al detalle de la orden (demora).
- [ ] Marcar todo como leído.
- [x] Probado con el aviso real de la parada saltada de `df17f50c`.

## Impacto en el dominio

Ninguno. Usa `GET /notifications`, `GET /notifications/unread-count` y
`POST /notifications/{id}/read`, que ya existen.

## Preguntas abiertas

- [x] **Frecuencia:** cada **2 minutos**, solo con la pestaña visible, y al volver a ella (owner,
      2026-10-04).
- [x] **Marcar todo como leído:** uno por uno (hasta 20) por ahora; pedido al backend un endpoint
      para marcar todos (owner, 2026-10-04).

## Verificación (2026-10-04)

Playwright (reloj simulado) contra el backend de desarrollo:
- Campana con "1 sin leer" (aviso real del salto de `df17f50c`).
- Pestaña oculta 5 min → 0 consultas; al volver → 1; cada 2 min visibles → 1. En desarrollo React
  ejecuta los efectos dos veces, por eso al cargar hay 2 consultas; en producción, 1.
- Lista con el aviso no leído destacado y "hace 2 horas"; tocarlo lo marca leído (contador a 0) y lleva
  a Asignación. El aviso real quedó leído.
- `?ver=<id>` en Órdenes abre el detalle; cerrarlo limpia la URL; "Ver" en la fila la escribe.
- **No probado con datos:** "Marcar todo como leído" con varios avisos y un aviso de demora (no hay;
  usa el mismo `markRead` y lleva a Órdenes con `?ver=`).

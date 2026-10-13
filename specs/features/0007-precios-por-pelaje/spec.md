---
feature: 0007-precios-por-pelaje
estado: done       # draft | approved | in-progress | done | abandoned
repos: [paku-admin, paku-backend]
creado: 2026-10-12
---

# Precios por tipo de pelaje

## Problema

Los precios se cargaban regla por regla con categorías que no coincidían con lo que cotiza el backend:
Clásico tenía 36 reglas por pelaje que nunca se usaban (todos pagaban la fila "otros"), Premium salía
más barato que Clásico para razas del catálogo y Express solo tenía reglas "otros", así que algunas
mascotas no obtenían precio. El panel antiguo no dejaba ver la tabla completa ni comparar productos.

El backend (C-25, `paku-backend/specs/features/0004-precios-por-pelaje`) ahora cotiza por el **tipo de
pelaje de la raza** y usa la fila **«Mestizo u otra raza»** como respaldo.

## Objetivo

El admin ve y edita los precios de cada producto y adicional como una tabla (pelaje × peso), compara
productos y comprueba cuánto paga una mascota antes de publicar.

## Fuera de alcance

- Cambiar los tramos de peso (son fijos, los da `GET /admin/store/price-config`).
- Precios de gatos (sin tipo de pelaje en el catálogo: pagan la fila mestizo).
- Historial de precios.

## Comportamiento esperado

1. **Dado** un producto o adicional, **cuando** el admin abre Precios, **entonces** ve una tabla con
   las 7 filas (6 pelajes + «Mestizo u otra raza») y los 6 tramos de peso, con los precios activos.
2. **Dado** que falta la fila mestizo, **entonces** se avisa en rojo que esas mascotas no podrán comprar;
   si falta un pelaje, aviso ámbar: se cobrará el precio de mestizo (se muestra como sugerencia).
3. **Dado** reglas antiguas (official/otros o tramos distintos), **entonces** se listan aparte con un
   botón para desactivarlas; al guardar la tabla quedan desactivadas (se confirma antes).
4. **Edición rápida:** copiar la tabla de otro producto/adicional con un % de ajuste, ajustar toda la
   tabla o una fila por %; las celdas cambiadas se resaltan y se pueden descartar.
5. **Guardar** reemplaza la tabla completa en una sola operación (`PUT /admin/store/price-matrix`).
6. **Comparar productos:** productos lado a lado por pelaje y tramo con el precio que paga el cliente
   (respaldo incluido); en rojo los casos en que un producto más caro en promedio cuesta menos.
7. **Simulador:** raza (o «Mestizo u otra raza») y peso → precio de cada producto y adicional, la fila
   usada y si fue respaldo.

## Criterios de aceptación

- [x] Página `/dashboard/tienda/[categoryId]/precios` con pestañas Tabla / Comparar / Simulador.
- [x] Los botones "Precios" (producto, adicional y cabecera) llevan a esa página; el panel antiguo se eliminó.
- [x] `pnpm lint` y `pnpm build` sin problemas.
- [x] Probado en navegador contra el backend con C-25 desplegado.

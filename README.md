# Paku Admin

Web de operación interna de Paku: órdenes, asignación y ruta del día del groomer, paradas saltadas,
avisos, catálogo (tienda, razas, fechas con cupos), usuarios, groomers, mascotas e historial clínico.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind + shadcn/ui · pnpm. Se despliega en Vercel.

## Correr en local

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # verificación antes de subir
pnpm lint
```

`.env` define `NEXT_PUBLIC_API_BASE_URL` (backend de desarrollo) y las claves públicas de Firebase
(login con Google). Solo entran usuarios con rol `admin`.

## Dónde está cada cosa

- `app/dashboard/*` — pantallas; `nav-config.ts` es el menú.
- `lib/apiClient.ts` — único cliente HTTP (tokens en cookies, renovación de sesión).
- `lib/services/*` — llamadas a la API por tema; `lib/apiHelpers.ts` — errores en español.
- `lib/labels.ts` — textos en español de los valores de la API (estados, roles, especies…).
- `proxy.ts` — protege las rutas (sin sesión → `/login`).
- `specs/` — estado del repo (`status.md`) y features (spec → plan → tasks).

Antes de trabajar aquí: `AGENTS.md` y `paku-backend/specs/workspace.md`.

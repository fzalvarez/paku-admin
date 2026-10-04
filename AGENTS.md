# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
# Paku Admin — Agentes

## Antes de nada

Lee `paku-backend/specs/workspace.md` (contexto de los repos) y `paku-backend/specs/constitution.md`.
En esta máquina el repo vive en `Odyssoft/Paku/paku-admin`; `paku-backend` está en `Odyssoft/paku-backend`.

## Spec-Driven Development

- **Dominio y API**: el canon está en `paku-backend/specs/domain/` y `paku-backend/specs/api/`. No replicar lógica de negocio aquí.
- **Cambios de API recientes**: `paku-backend/docs/cambios-api-para-front.md`.
- **Features de este repo**: spec → plan → tasks en `specs/` antes de implementar. Ver `specs/README.md`.
- Estado actual del repo, decisiones y plan: `specs/status.md`.

## Convenciones

- Gestor de paquetes: **pnpm**.
- Consumo de API vía capa dedicada (`lib/`), no `fetch` suelto en componentes.
- TypeScript, Tailwind + shadcn/ui.
- Despliegue: Vercel. Backend de desarrollo: `NEXT_PUBLIC_API_BASE_URL` en `.env`.

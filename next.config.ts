import type { NextConfig } from "next";

// Rutas del dashboard antes de pasarlas a español (2026-10-04): se redirigen para no
// romper favoritos ni enlaces guardados.
const RENAMED_ROUTES: Record<string, string> = {
  orders: "ordenes",
  assignments: "asignaciones",
  allies: "groomers",
  users: "usuarios",
  pets: "mascotas",
  breeds: "razas",
  store: "tienda",
};

const nextConfig: NextConfig = {
  async redirects() {
    return Object.entries(RENAMED_ROUTES).map(([from, to]) => ({
      source: `/dashboard/${from}/:path*`,
      destination: `/dashboard/${to}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;

"use client";

// Configuración. Parámetros generales ya usa la API (paku-backend C-35); Roles y permisos e Integraciones
// siguen siendo maquetas. El aviso de demo sale solo en las vistas marcadas `demo` en el menú. Usuarios y
// Groomers son vistas reales y viven en sus propias rutas.

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { findNavItem } from "../nav-config";

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  const demo = findNavItem(usePathname())?.item.demo;
  return (
    <div className="space-y-4">
      {demo && <DemoBanner what="esta configuración" />}
      {children}
    </div>
  );
}

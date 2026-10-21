// Configuración — maquetas (Roles y permisos, Parámetros generales, Integraciones). Usuarios y Groomers
// son vistas reales y viven en sus propias rutas.

import type { ReactNode } from "react";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function ConfiguracionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <DemoBanner what="esta configuración" />
      {children}
    </div>
  );
}

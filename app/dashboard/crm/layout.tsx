"use client";

// CRM. Clientes y Campañas ya usan la API (paku-backend C-36, C-38); Fidelización, Recordatorios e
// Integraciones siguen siendo maquetas (lib/mock/crm.ts). El aviso de demo sale solo en las vistas marcadas
// `demo` en el menú.

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoCrmProvider } from "@/components/crm/DemoCrmProvider";
import { findNavItem } from "../nav-config";

export default function CrmLayout({ children }: { children: ReactNode }) {
  const demo = findNavItem(usePathname())?.item.demo;
  return (
    <DemoCrmProvider>
      <div className="space-y-4">
        {demo && <DemoBanner what="el CRM" />}
        {children}
      </div>
    </DemoCrmProvider>
  );
}

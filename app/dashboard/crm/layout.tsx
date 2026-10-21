// CRM — DEMOSTRACIÓN con datos de ejemplo (sin backend). Ver lib/mock/crm.ts.

import type { ReactNode } from "react";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DemoCrmProvider } from "@/components/crm/DemoCrmProvider";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <DemoCrmProvider>
      <div className="space-y-4">
        <DemoBanner what="el CRM" />
        {children}
      </div>
    </DemoCrmProvider>
  );
}

// Finanzas — DEMOSTRACIÓN con datos de ejemplo (sin backend). Ver lib/mock/finanzas.ts.

import type { ReactNode } from "react";
import { DemoBanner } from "@/components/demo/DemoBanner";

export default function FinanzasLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <DemoBanner what="esta información financiera" />
      {children}
    </div>
  );
}
